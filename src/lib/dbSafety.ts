/**
 * Database hardening helpers: schema migrations, soft deletes, tamper-evident audit log.
 * Takes the DatabaseSync handle as a parameter so it never imports db.ts (no circular import).
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import { legacyRatePerUsd, baseUsdFromRate, roundMoney, isCurrencyCode } from './money';

export const SOFT_TABLES = ['materials', 'orders', 'transactions', 'products', 'shipments'] as const;
export type SoftTable = (typeof SOFT_TABLES)[number];

export function isSoftTable(v: unknown): v is SoftTable {
  return typeof v === 'string' && (SOFT_TABLES as readonly string[]).includes(v);
}

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Actor tracking (who is performing the current save). Stored on globalThis because
// Next.js may bundle this module separately per route.
// ---------------------------------------------------------------------------
interface ActorGlobal {
  bakoAuditActor?: string;
  bakoSavepointSeq?: number;
}
const actorGlobal = globalThis as unknown as ActorGlobal;

export function withActor<T>(actor: string | undefined, fn: () => T): T {
  const previous = actorGlobal.bakoAuditActor;
  actorGlobal.bakoAuditActor = actor && actor.trim() ? actor.trim() : 'System';
  try {
    return fn();
  } finally {
    actorGlobal.bakoAuditActor = previous;
  }
}

export function currentActor(): string {
  return actorGlobal.bakoAuditActor || 'System';
}

// ---------------------------------------------------------------------------
// Nest-safe transactions (SAVEPOINT works both standalone and inside BEGIN)
// ---------------------------------------------------------------------------
export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  const name = `sp_${(actorGlobal.bakoSavepointSeq = (actorGlobal.bakoSavepointSeq ?? 0) + 1)}`;
  db.exec(`SAVEPOINT ${name};`);
  try {
    const result = fn();
    db.exec(`RELEASE ${name};`);
    return result;
  } catch (err) {
    try {
      db.exec(`ROLLBACK TO ${name}; RELEASE ${name};`);
    } catch {
      // connection already rolled back
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------
function columnNames(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Row[];
  return new Set(rows.map((r) => String(r.name)));
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, ddl: string): void {
  if (!columnNames(db, table).has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
  }
}

export function runSchemaMigrations(db: DatabaseSync): void {
  for (const table of SOFT_TABLES) {
    addColumnIfMissing(db, table, 'is_deleted', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, table, 'deleted_at', 'TEXT');
    db.exec(`UPDATE ${table} SET is_deleted = 0 WHERE is_deleted IS NULL;`);
  }

  addColumnIfMissing(db, 'transactions', 'charged_amount', 'REAL');
  addColumnIfMissing(db, 'transactions', 'charged_currency', 'TEXT');
  addColumnIfMissing(db, 'transactions', 'exchange_rate_applied', 'REAL');
  addColumnIfMissing(db, 'transactions', 'base_usd_equivalent', 'REAL');
  addColumnIfMissing(db, 'transactions', 'legacy_invoice_ref', 'TEXT');
  addColumnIfMissing(db, 'transactions', 'fundermax_batch_ref', 'TEXT');
  addColumnIfMissing(db, 'transactions', 'client', 'TEXT');
  addColumnIfMissing(db, 'transactions', 'client_phone', 'TEXT');
  addColumnIfMissing(db, 'transactions', 'estimated_cost', 'REAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );
    CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
      BEFORE UPDATE ON audit_logs
      BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
      BEFORE DELETE ON audit_logs
      BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;
  `);
}

/** Fills the four immutable money columns for rows saved before v1.5. */
export function backfillMoneySnapshots(db: DatabaseSync): void {
  const rows = db
    .prepare(
      `SELECT id, currency, currency_rate, total_after_discount FROM transactions WHERE charged_currency IS NULL`
    )
    .all() as Row[];
  if (rows.length === 0) return;
  const update = db.prepare(
    `UPDATE transactions SET charged_amount = ?, charged_currency = ?, exchange_rate_applied = ?, base_usd_equivalent = ? WHERE id = ?`
  );
  runInTransaction(db, () => {
    for (const r of rows) {
      const cur = isCurrencyCode(r.currency) ? r.currency : 'USD';
      const rate = legacyRatePerUsd(cur, Number(r.currency_rate) || undefined);
      const amount = roundMoney(Number(r.total_after_discount) || 0, cur);
      update.run(amount, cur, rate, baseUsdFromRate(amount, cur, rate), String(r.id));
    }
  });
}

// ---------------------------------------------------------------------------
// Tamper-evident audit log (hash chain + append-only triggers)
// ---------------------------------------------------------------------------
const GENESIS = 'GENESIS';

function computeHash(prev: string, timestamp: string, user: string, action: string, details: string): string {
  return crypto.createHash('sha256').update([prev, timestamp, user, action, details].join('\u241F')).digest('hex');
}

export function writeAuditLog(db: DatabaseSync, action: string, details: unknown, user?: string): void {
  const last = db.prepare(`SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1`).get() as Row | undefined;
  const prev = last ? String(last.hash) : GENESIS;
  const timestamp = new Date().toISOString();
  const who = user && user.trim() ? user.trim() : currentActor();
  const json = JSON.stringify(details ?? {});
  const hash = computeHash(prev, timestamp, who, action, json);
  db.prepare(
    `INSERT INTO audit_logs (timestamp, user_name, action, details, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(timestamp, who, action, json, prev, hash);
}

export interface AuditLogRecord {
  id: number;
  timestamp: string;
  userName: string;
  action: string;
  details: unknown;
  hash: string;
}

export function listAuditLogs(db: DatabaseSync, limit = 200, offset = 0): AuditLogRecord[] {
  const rows = db
    .prepare(`SELECT id, timestamp, user_name, action, details, hash FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(Math.min(Math.max(limit, 1), 1000), Math.max(offset, 0)) as Row[];
  return rows.map((r) => {
    let details: unknown = r.details;
    try {
      details = JSON.parse(String(r.details));
    } catch {
      // keep raw text
    }
    return {
      id: Number(r.id),
      timestamp: String(r.timestamp),
      userName: String(r.user_name),
      action: String(r.action),
      details,
      hash: String(r.hash),
    };
  });
}

export function verifyAuditChain(db: DatabaseSync): { valid: boolean; total: number; brokenAtId: number | null } {
  const rows = db
    .prepare(`SELECT id, timestamp, user_name, action, details, prev_hash, hash FROM audit_logs ORDER BY id ASC`)
    .all() as Row[];
  let prev = GENESIS;
  for (const r of rows) {
    const expected = computeHash(prev, String(r.timestamp), String(r.user_name), String(r.action), String(r.details));
    if (String(r.prev_hash) !== prev || String(r.hash) !== expected) {
      return { valid: false, total: rows.length, brokenAtId: Number(r.id) };
    }
    prev = String(r.hash);
  }
  return { valid: true, total: rows.length, brokenAtId: null };
}

// ---------------------------------------------------------------------------
// Soft deletes
// ---------------------------------------------------------------------------
function stripHeavy(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'image_url' || k === 'images_json') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Marks every live row of `table` whose id is not in `keepIds` as deleted (never DELETEs).
 * Each removal is written to the audit log with the pre-deletion state.
 */
export function softDeleteMissing(
  db: DatabaseSync,
  table: SoftTable,
  keepIds: Set<string>,
  auditAction: string
): number {
  const live = db.prepare(`SELECT * FROM ${table} WHERE is_deleted = 0`).all() as Row[];
  const mark = db.prepare(`UPDATE ${table} SET is_deleted = 1, deleted_at = ? WHERE id = ?`);
  const now = new Date().toISOString();
  let count = 0;
  for (const row of live) {
    const id = String(row.id);
    if (keepIds.has(id)) continue;
    mark.run(now, id);
    writeAuditLog(db, auditAction, { table, id, before: stripHeavy(row), after: { is_deleted: 1, deleted_at: now } });
    count++;
  }
  return count;
}

export interface TrashItem {
  table: SoftTable;
  id: string;
  label: string;
  deletedAt: string;
}

function labelFor(table: SoftTable, r: Row): string {
  switch (table) {
    case 'materials':
      return `Panel ${r.code ?? ''} ${r.name ?? ''}`.trim();
    case 'orders':
      return `Order ${r.order_number ?? ''} - ${r.client ?? ''}`.trim();
    case 'transactions':
      return `Invoice ${r.code || r.id} - ${r.total_after_discount ?? 0} ${r.currency ?? 'USD'}`;
    case 'products':
      return `Product ${r.sku ?? ''} ${r.name ?? ''}`.trim();
    case 'shipments':
      return `Shipment ${r.tracking_code ?? r.id}`;
  }
}

export function listSoftDeleted(db: DatabaseSync): TrashItem[] {
  const items: TrashItem[] = [];
  for (const table of SOFT_TABLES) {
    const rows = db.prepare(`SELECT * FROM ${table} WHERE is_deleted = 1 ORDER BY deleted_at DESC`).all() as Row[];
    for (const r of rows) {
      items.push({ table, id: String(r.id), label: labelFor(table, r), deletedAt: String(r.deleted_at ?? '') });
    }
  }
  return items.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}

export function restoreSoftDeleted(db: DatabaseSync, table: SoftTable, id: string): boolean {
  return runInTransaction(db, () => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND is_deleted = 1`).get(id) as Row | undefined;
    if (!row) return false;
    db.prepare(`UPDATE ${table} SET is_deleted = 0, deleted_at = NULL WHERE id = ?`).run(id);
    if (table === 'materials' && row.deleted_at) {
      // bring back the orders that were removed together with the panel
      db.prepare(`UPDATE orders SET is_deleted = 0, deleted_at = NULL WHERE material_id = ? AND deleted_at = ?`).run(
        id,
        String(row.deleted_at)
      );
    }
    if (table === 'orders') {
      const parent = db.prepare(`SELECT is_deleted FROM materials WHERE id = ?`).get(String(row.material_id)) as Row | undefined;
      if (!parent || Number(parent.is_deleted) === 1) {
        throw new Error('Restore the parent panel first.');
      }
    }
    writeAuditLog(db, 'RECORD_RESTORED', { table, id, label: labelFor(table, row) });
    return true;
  });
}

/** Permanent removal. Only ever applied to rows that are already soft-deleted. */
export function purgeSoftDeleted(db: DatabaseSync, table: SoftTable, id: string): boolean {
  return runInTransaction(db, () => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND is_deleted = 1`).get(id) as Row | undefined;
    if (!row) return false;
    writeAuditLog(db, 'RECORD_PURGED', { table, id, before: stripHeavy(row) });
    db.prepare(`DELETE FROM ${table} WHERE id = ? AND is_deleted = 1`).run(id);
    return true;
  });
}
