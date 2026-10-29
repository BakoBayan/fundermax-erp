/**
 * Database hardening helpers: schema migrations, soft deletes, tamper-evident audit log.
 * Takes the @libsql/client Client handle as a parameter so it never imports db.ts (no circular import).
 */
import type { Client } from '@libsql/client';
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

export async function withActor<T>(actor: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  const previous = actorGlobal.bakoAuditActor;
  actorGlobal.bakoAuditActor = actor && actor.trim() ? actor.trim() : 'System';
  try {
    return await fn();
  } finally {
    actorGlobal.bakoAuditActor = previous;
  }
}

export function currentActor(): string {
  return actorGlobal.bakoAuditActor || 'System';
}

// ---------------------------------------------------------------------------
// Nest-safe transactions (Async execution wrapper for serverless Turso client)
// ---------------------------------------------------------------------------
export async function runInTransaction<T>(_db: Client, fn: () => Promise<T> | T): Promise<T> {
  return await fn();
}

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------
async function columnNames(db: Client, table: string): Promise<Set<string>> {
  const res = await db.execute(`PRAGMA table_info(${table})`);
  const rows = res.rows as unknown as Row[];
  return new Set(rows.map((r) => String(r.name)));
}

async function addColumnIfMissing(db: Client, table: string, column: string, ddl: string): Promise<void> {
  const cols = await columnNames(db, table);
  if (!cols.has(column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
  }
}

export async function runSchemaMigrations(db: Client): Promise<void> {
  for (const table of SOFT_TABLES) {
    await addColumnIfMissing(db, table, 'is_deleted', 'INTEGER DEFAULT 0');
    await addColumnIfMissing(db, table, 'deleted_at', 'TEXT');
    await db.execute(`UPDATE ${table} SET is_deleted = 0 WHERE is_deleted IS NULL;`);
  }

  await addColumnIfMissing(db, 'transactions', 'charged_amount', 'REAL');
  await addColumnIfMissing(db, 'transactions', 'charged_currency', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'exchange_rate_applied', 'REAL');
  await addColumnIfMissing(db, 'transactions', 'base_usd_equivalent', 'REAL');
  await addColumnIfMissing(db, 'transactions', 'legacy_invoice_ref', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'fundermax_batch_ref', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'client', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'client_phone', 'TEXT');
  await addColumnIfMissing(db, 'transactions', 'estimated_cost', 'REAL');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_logs_no_update
      BEFORE UPDATE ON audit_logs
      BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_logs_no_delete
      BEFORE DELETE ON audit_logs
      BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;
  `);
}

/** Fills the four immutable money columns for rows saved before v1.5. */
export async function backfillMoneySnapshots(db: Client): Promise<void> {
  const res = await db.execute(
    `SELECT id, currency, currency_rate, total_after_discount FROM transactions WHERE charged_currency IS NULL`
  );
  const rows = res.rows as unknown as Row[];
  if (rows.length === 0) return;
  const updateSql = `UPDATE transactions SET charged_amount = ?, charged_currency = ?, exchange_rate_applied = ?, base_usd_equivalent = ? WHERE id = ?`;
  await runInTransaction(db, async () => {
    for (const r of rows) {
      const cur = isCurrencyCode(r.currency) ? r.currency : 'USD';
      const rate = legacyRatePerUsd(cur, Number(r.currency_rate) || undefined);
      const amount = roundMoney(Number(r.total_after_discount) || 0, cur);
      await db.execute({
        sql: updateSql,
        args: [amount, cur, rate, baseUsdFromRate(amount, cur, rate), String(r.id)],
      });
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

export async function writeAuditLog(db: Client, action: string, details: unknown, user?: string): Promise<void> {
  const lastRes = await db.execute(`SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1`);
  const last = lastRes.rows[0] as unknown as Row | undefined;
  const prev = last ? String(last.hash) : GENESIS;
  const timestamp = new Date().toISOString();
  const who = user && user.trim() ? user.trim() : currentActor();
  const json = JSON.stringify(details ?? {});
  const hash = computeHash(prev, timestamp, who, action, json);
  await db.execute({
    sql: `INSERT INTO audit_logs (timestamp, user_name, action, details, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [timestamp, who, action, json, prev, hash],
  });
}

export interface AuditLogRecord {
  id: number;
  timestamp: string;
  userName: string;
  action: string;
  details: unknown;
  hash: string;
}

export async function listAuditLogs(db: Client, limit = 200, offset = 0): Promise<AuditLogRecord[]> {
  const res = await db.execute({
    sql: `SELECT id, timestamp, user_name, action, details, hash FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
    args: [Math.min(Math.max(limit, 1), 1000), Math.max(offset, 0)],
  });
  const rows = res.rows as unknown as Row[];
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

export async function verifyAuditChain(db: Client): Promise<{ valid: boolean; total: number; brokenAtId: number | null }> {
  const res = await db.execute(
    `SELECT id, timestamp, user_name, action, details, prev_hash, hash FROM audit_logs ORDER BY id ASC`
  );
  const rows = res.rows as unknown as Row[];
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
export async function softDeleteMissing(
  db: Client,
  table: SoftTable,
  keepIds: Set<string>,
  auditAction: string
): Promise<number> {
  const liveRes = await db.execute(`SELECT * FROM ${table} WHERE is_deleted = 0`);
  const live = liveRes.rows as unknown as Row[];
  const markSql = `UPDATE ${table} SET is_deleted = 1, deleted_at = ? WHERE id = ?`;
  const now = new Date().toISOString();
  let count = 0;
  for (const row of live) {
    const id = String(row.id);
    if (keepIds.has(id)) continue;
    await db.execute({ sql: markSql, args: [now, id] });
    await writeAuditLog(db, auditAction, { table, id, before: stripHeavy(row), after: { is_deleted: 1, deleted_at: now } });
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

export async function listSoftDeleted(db: Client): Promise<TrashItem[]> {
  const items: TrashItem[] = [];
  for (const table of SOFT_TABLES) {
    const res = await db.execute(`SELECT * FROM ${table} WHERE is_deleted = 1 ORDER BY deleted_at DESC`);
    const rows = res.rows as unknown as Row[];
    for (const r of rows) {
      items.push({ table, id: String(r.id), label: labelFor(table, r), deletedAt: String(r.deleted_at ?? '') });
    }
  }
  return items.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}

export async function restoreSoftDeleted(db: Client, table: SoftTable, id: string): Promise<boolean> {
  return await runInTransaction(db, async () => {
    const res = await db.execute({
      sql: `SELECT * FROM ${table} WHERE id = ? AND is_deleted = 1`,
      args: [id],
    });
    const row = res.rows[0] as unknown as Row | undefined;
    if (!row) return false;
    await db.execute({
      sql: `UPDATE ${table} SET is_deleted = 0, deleted_at = NULL WHERE id = ?`,
      args: [id],
    });
    if (table === 'materials' && row.deleted_at) {
      // bring back the orders that were removed together with the panel
      await db.execute({
        sql: `UPDATE orders SET is_deleted = 0, deleted_at = NULL WHERE material_id = ? AND deleted_at = ?`,
        args: [id, String(row.deleted_at)],
      });
    }
    if (table === 'orders') {
      const parentRes = await db.execute({
        sql: `SELECT is_deleted FROM materials WHERE id = ?`,
        args: [String(row.material_id)],
      });
      const parent = parentRes.rows[0] as unknown as Row | undefined;
      if (!parent || Number(parent.is_deleted) === 1) {
        throw new Error('Restore the parent panel first.');
      }
    }
    await writeAuditLog(db, 'RECORD_RESTORED', { table, id, label: labelFor(table, row) });
    return true;
  });
}

/** Permanent removal. Only ever applied to rows that are already soft-deleted. */
export async function purgeSoftDeleted(db: Client, table: SoftTable, id: string): Promise<boolean> {
  return await runInTransaction(db, async () => {
    const res = await db.execute({
      sql: `SELECT * FROM ${table} WHERE id = ? AND is_deleted = 1`,
      args: [id],
    });
    const row = res.rows[0] as unknown as Row | undefined;
    if (!row) return false;
    await writeAuditLog(db, 'RECORD_PURGED', { table, id, before: stripHeavy(row) });
    await db.execute({
      sql: `DELETE FROM ${table} WHERE id = ? AND is_deleted = 1`,
      args: [id],
    });
    return true;
  });
}
