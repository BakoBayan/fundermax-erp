import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  PanelMaterial,
  OrderAllocation,
  BackupSnapshot,
  UserAccount,
  UserRole,
  UserModulePermissions,
  PanelTransaction,
  Product,
  Shipment,
  ExchangeRates,
  DropdownPresets,
  InvoiceItem,
  CurrencyCode
} from "../types/inventory";
import { DEFAULT_EXCHANGE_RATES } from "./currency";
import { autoCapitalizeFirstLetter } from "../utils/text";
import {
  runSchemaMigrations,
  writeAuditLog,
  softDeleteMissing,
  restoreSoftDeleted,
  purgeSoftDeleted,
  listSoftDeleted,
  verifyAuditChain,
  withActor,
  currentActor,
  runInTransaction,
  type SoftTable
} from "./dbSafety";
import {
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
  baseUsdFromRate,
  legacyRatePerUsd,
  buildMoneySnapshot,
  isCurrencyCode
} from "./money";
import {
  executeScheduledBackup,
  createPreImportSafetySnapshot,
  listSnapshots,
  getLatestSnapshot,
  copySnapshotToDirectory,
  detectExternalDrives,
  startBackupScheduler,
  getBackupDir,
  isValidSnapshotName,
  extractSnapshotSqlite,
  type SnapshotInfo
} from "./backup";


const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.join(process.cwd(), process.env.DATABASE_PATH);
  }
  try {
    const legacyWarehouseDb = path.join(DATA_DIR, "warehouse.db");
    if (fs.existsSync(legacyWarehouseDb)) {
      return legacyWarehouseDb;
    }
  } catch {}
  return path.join(DATA_DIR, "production.sqlite");
}

const DB_PATH = getDatabasePath();
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const LEGACY_JSON_PATH = path.join(DATA_DIR, "db.json");
const INVENTORY_STORE_JSON_PATH = path.join(DATA_DIR, "inventory_store.json");

const globalForDB = globalThis as unknown as {
  tursoClient?: Client;
  tursoInitPromise?: Promise<void>;
};

export function getDB(): Client {
  if (globalForDB.tursoClient) return globalForDB.tursoClient;

  const url = process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const db = createClient({
    url,
    authToken,
  });

  globalForDB.tursoClient = db;
  return db;
}

export async function initializeDatabase(db: Client = getDB()): Promise<void> {
  if (globalForDB.tursoInitPromise) {
    return globalForDB.tursoInitPromise;
  }

  globalForDB.tursoInitPromise = (async () => {
    try {
      await db.execute("PRAGMA journal_mode = WAL;");
      await db.execute("PRAGMA synchronous = NORMAL;");
      await db.execute("PRAGMA foreign_keys = ON;");
    } catch {}

    await db.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        length REAL NOT NULL,
        width REAL NOT NULL,
        thickness REAL NOT NULL,
        unit TEXT DEFAULT 'mm',
        formatted_dimensions TEXT NOT NULL,
        total_stock INTEGER NOT NULL DEFAULT 0,
        allocated_stock INTEGER NOT NULL DEFAULT 0,
        available_stock INTEGER NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        client TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'reserved',
        image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        job_type TEXT DEFAULT 'generic',
        door_spec_json TEXT,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS custom_types (
        name TEXT PRIMARY KEY
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        username TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_login_at TEXT,
        permissions_json TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        formatted_date TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        user TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        date_key TEXT NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        total_panels INTEGER NOT NULL,
        total_orders INTEGER NOT NULL,
        sha256_checksum TEXT NOT NULL,
        data_json TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        code TEXT,
        timestamp TEXT NOT NULL,
        panel_type TEXT,
        material TEXT,
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT DEFAULT 'sheets',
        selling_type TEXT,
        seller TEXT,
        bank TEXT,
        payment_type TEXT,
        currency TEXT DEFAULT 'USD',
        currency_rate REAL DEFAULT 1,
        selling_amount REAL DEFAULT 0,
        cost_price REAL DEFAULT 0,
        discount_dollars REAL DEFAULT 0,
        discount_percentage REAL DEFAULT 0,
        total_after_discount REAL DEFAULT 0,
        amount_paid_now REAL DEFAULT 0,
        amount_owed REAL DEFAULT 0,
        old_unpaid_debt REAL DEFAULT 0,
        combined_total_debt REAL DEFAULT 0,
        gross_profit REAL DEFAULT 0,
        profit_margin REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        images_json TEXT DEFAULT '[]',
        items_json TEXT DEFAULT '[]',
        status TEXT DEFAULT 'completed',
        client TEXT,
        client_phone TEXT,
        legacy_invoice_ref TEXT,
        fundermax_batch_ref TEXT,
        estimated_cost REAL DEFAULT 0,
        last_updated TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        current_stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        location TEXT DEFAULT '',
        price REAL DEFAULT 0,
        image_url TEXT,
        lane TEXT DEFAULT 'inStock',
        last_updated TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        tracking_code TEXT NOT NULL,
        destination TEXT NOT NULL,
        item_summary TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
    `);

    // Auto-migration check: If orders.updated_at notnull is 1, relax it
    try {
      const ordersInfoRes = await db.execute("PRAGMA table_info(orders)");
      const ordersInfo = ordersInfoRes.rows as unknown as { name: string; notnull: number }[];
      const updatedAtCol = ordersInfo.find((c) => c.name === "updated_at");
      if (updatedAtCol && Number(updatedAtCol.notnull) === 1) {
        await db.execute("PRAGMA foreign_keys = OFF;");
        await db.execute(`
          CREATE TABLE orders_v2 (
            id TEXT PRIMARY KEY,
            material_id TEXT NOT NULL,
            order_number TEXT NOT NULL,
            client TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            date TEXT NOT NULL,
            notes TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'reserved',
            image_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
          );
        `);
        await db.execute("INSERT INTO orders_v2 SELECT * FROM orders;");
        await db.execute("DROP TABLE orders;");
        await db.execute("ALTER TABLE orders_v2 RENAME TO orders;");
        await db.execute("PRAGMA foreign_keys = ON;");
        console.log("[SQLite Migration] orders table updated_at column relaxed.");
      }
    } catch (migErr) {
      console.error("[SQLite Migration Error]", migErr);
    }

    // Initial migration from legacy db.json if materials table is empty
    const countRes = await db.execute("SELECT count(*) as count FROM materials");
    const countRow = countRes.rows[0] as unknown as { count: number } | undefined;
    if (!countRow || Number(countRow.count) === 0) {
      await migrateFromLegacyJSON(db);
    }

    // Initial migration from inventory_store.json if transactions table is empty
    const txCountRes = await db.execute("SELECT count(*) as count FROM transactions");
    const txCountRow = txCountRes.rows[0] as unknown as { count: number } | undefined;
    if (!txCountRow || Number(txCountRow.count) === 0) {
      await migrateFromInventoryStoreJSON(db);
    }

    try {
      const userTableInfoRes = await db.execute("PRAGMA table_info(user_accounts)");
      const userTableInfo = userTableInfoRes.rows as unknown as Array<{ name: string }>;
      const hasPermsCol = userTableInfo.some((col) => col.name === "permissions_json");
      if (!hasPermsCol) {
        await db.execute("ALTER TABLE user_accounts ADD COLUMN permissions_json TEXT;");
        console.log("[SQLite Migration] user_accounts table permissions_json column added.");
      }
    } catch (migErr) {
      console.error("[SQLite Migration Error: permissions_json]", migErr);
    }

    try {
      const ordersColsRes = await db.execute("PRAGMA table_info(orders)");
      const ordersCols = ordersColsRes.rows as unknown as Array<{ name: string }>;
      if (!ordersCols.some((col) => col.name === "job_type")) {
        await db.execute("ALTER TABLE orders ADD COLUMN job_type TEXT DEFAULT 'generic';");
        console.log("[SQLite Migration] orders table job_type column added.");
      }
      if (!ordersCols.some((col) => col.name === "door_spec_json")) {
        await db.execute("ALTER TABLE orders ADD COLUMN door_spec_json TEXT;");
        console.log("[SQLite Migration] orders table door_spec_json column added.");
      }
    } catch (migErr) {
      console.error("[SQLite Migration Error: orders door columns]", migErr);
    }

    await ensureDefaultAccounts(db);
    await runSchemaMigrations(db);
    startBackupScheduler(getDB);
  })();

  return globalForDB.tursoInitPromise;
}

async function ensureDefaultAccounts(db: Client): Promise<void> {
  const insertSql = `
    INSERT OR IGNORE INTO user_accounts (username, display_name, role, password_hash, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const now = new Date().toISOString();
  await db.execute({ sql: insertSql, args: ["bako", "Bako (Administrator)", "Admin", "illcbtfmo1", now, now] });
  await db.execute({ sql: insertSql, args: ["Awat", "Awat (Manager)", "Manager", "awat22", now, now] });
  await db.execute({ sql: insertSql, args: ["viewer", "Viewer (Read-Only)", "Viewer", "1234", now, now] });
}

async function migrateFromLegacyJSON(db: Client): Promise<void> {
  try {
    if (!fs.existsSync(LEGACY_JSON_PATH)) return;
    const raw = fs.readFileSync(LEGACY_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.materials)) return;

    const insertMatSql = `
      INSERT OR REPLACE INTO materials (
        id, code, name, type, length, width, thickness, unit, formatted_dimensions,
        total_stock, allocated_stock, available_stock, notes, image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertOrdSql = `
      INSERT OR REPLACE INTO orders (
        id, material_id, order_number, client, quantity, date, notes, status, image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertTypeSql = `INSERT OR IGNORE INTO custom_types (name) VALUES (?)`;

    for (const mat of data.materials) {
      await db.execute({
        sql: insertMatSql,
        args: [
          mat.id,
          mat.code,
          mat.name,
          mat.type || "HPL",
          mat.dimensions?.length || 0,
          mat.dimensions?.width || 0,
          mat.dimensions?.thickness || 0,
          mat.dimensions?.unit || "mm",
          mat.dimensions?.formatted || "",
          mat.totalStock || 0,
          mat.allocatedStock || 0,
          mat.availableStock || 0,
          mat.notes || "",
          mat.imageUrl || null,
          mat.createdAt ? String(mat.createdAt) : new Date().toISOString(),
          mat.updatedAt || new Date().toISOString(),
        ],
      });

      if (Array.isArray(mat.activeOrders)) {
        for (const ord of mat.activeOrders) {
          await db.execute({
            sql: insertOrdSql,
            args: [
              ord.id,
              mat.id,
              ord.orderNumber,
              ord.client,
              ord.quantity || 1,
              ord.date,
              ord.notes || "",
              ord.status || "reserved",
              ord.imageUrl || null,
              ord.createdAt ? String(ord.createdAt) : new Date().toISOString(),
              ord.finalizedAt || null,
            ],
          });
        }
      }
    }

    if (Array.isArray(data.customTypes)) {
      for (const t of data.customTypes) {
        if (typeof t === "string" && t.trim()) {
          await db.execute({ sql: insertTypeSql, args: [t.trim()] });
        }
      }
    }

    console.log(`[SQLite Migration] Migrated ${data.materials.length} panels from legacy db.json.`);
  } catch (err) {
    console.error("[Legacy JSON Migration Error]", err);
  }
}

async function migrateFromInventoryStoreJSON(db: Client): Promise<void> {
  try {
    const targetPath = path.resolve(process.cwd(), "data", "inventory_store.json");
    if (!fs.existsSync(targetPath)) {
      return;
    }

    const raw = fs.readFileSync(targetPath, "utf8");
    const data = JSON.parse(raw);
    if (!data) return;

    // 1. Transactions
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      const insertTxSql = `
        INSERT OR REPLACE INTO transactions (
          id, code, timestamp, panel_type, material, quantity, unit, selling_type, seller, bank, payment_type,
          currency, currency_rate, selling_amount, cost_price, discount_dollars, discount_percentage,
          total_after_discount, amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt,
          gross_profit, profit_margin, notes, images_json, items_json, status, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const tx of data.transactions) {
        await db.execute({
          sql: insertTxSql,
          args: [
            tx.id,
            tx.code || "",
            tx.timestamp || new Date().toISOString(),
            tx.panelType || "",
            tx.material || "",
            tx.quantity || 1,
            tx.unit || "sheets",
            tx.sellingType || "",
            tx.seller || "",
            tx.bank || "",
            tx.paymentType || "",
            tx.currency || "USD",
            tx.currencyRate || 1,
            tx.sellingAmount || 0,
            tx.costPrice || 0,
            tx.discountDollars || 0,
            tx.discountPercentage || 0,
            tx.totalAfterDiscount || 0,
            tx.amountPaidNow || 0,
            tx.amountOwed || 0,
            tx.oldUnpaidDebt || 0,
            tx.combinedTotalDebt || 0,
            tx.grossProfit || 0,
            tx.profitMargin || 0,
            tx.notes || "",
            JSON.stringify(tx.images || []),
            JSON.stringify(tx.items || []),
            tx.status || "completed",
            tx.lastUpdated || new Date().toISOString(),
          ],
        });
      }
      console.log(`[SQLite Migration] Migrated ${data.transactions.length} sales invoices from inventory_store.json.`);
    }

    // 2. Products
    if (Array.isArray(data.products) && data.products.length > 0) {
      const insertProdSql = `
        INSERT OR REPLACE INTO products (
          id, sku, name, category, current_stock, min_stock, location, price, image_url, lane, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const p of data.products) {
        await db.execute({
          sql: insertProdSql,
          args: [
            p.id,
            p.sku || "",
            p.name || "",
            p.category || "General",
            p.currentStock || 0,
            p.minStock || 0,
            p.location || "",
            p.price || 0,
            p.imageUrl || null,
            p.lane || "inStock",
            p.lastUpdated || new Date().toISOString(),
          ],
        });
      }
    }

    // 3. Shipments
    if (Array.isArray(data.shipments) && data.shipments.length > 0) {
      const insertShipSql = `
        INSERT OR REPLACE INTO shipments (
          id, tracking_code, destination, item_summary, quantity, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      for (const s of data.shipments) {
        await db.execute({
          sql: insertShipSql,
          args: [
            s.id,
            s.trackingCode || "",
            s.destination || "",
            s.itemSummary || "",
            s.quantity || 1,
            s.status || "pending",
            s.createdAt || new Date().toISOString(),
          ],
        });
      }
    }

    // 4. Exchange Rates
    if (data.exchangeRates) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
        args: ["exchange_rates", JSON.stringify(data.exchangeRates)],
      });
    }

    // 5. Dropdown Presets
    const presets: DropdownPresets = {
      savedTypes: Array.isArray(data.savedTypes) ? data.savedTypes : [],
      savedProducts: Array.isArray(data.savedProducts) ? data.savedProducts : [],
      savedSellingTypes: Array.isArray(data.savedSellingTypes) ? data.savedSellingTypes : [],
      savedSellers: Array.isArray(data.savedSellers) ? data.savedSellers : [],
      savedBanks: Array.isArray(data.savedBanks) ? data.savedBanks : [],
      savedPaymentTypes: Array.isArray(data.savedPaymentTypes) ? data.savedPaymentTypes : [],
    };
    await db.execute({
      sql: `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
      args: ["dropdown_presets", JSON.stringify(presets)],
    });

    console.log("[SQLite Migration] Successfully initialized unified datasets from inventory_store.json.");
  } catch (err) {
    console.error("[inventory_store.json Migration Error]", err);
  }
}

// ==========================================
// INVENTORY CRUD OPERATIONS
// ==========================================

export async function getInventoryFromDB(): Promise<{
  materials: PanelMaterial[];
  customTypes: string[];
  users: UserAccount[];
  lastUpdated: number;
}> {
  const db = getDB();

  const matRes = await db.execute(`
    SELECT * FROM materials WHERE is_deleted = 0 ORDER BY CAST(code AS INTEGER) ASC, name ASC
  `);
  const matRows = matRes.rows as unknown as Record<string, unknown>[];

  const ordRes = await db.execute(`
    SELECT * FROM orders WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC
  `);
  const ordRows = ordRes.rows as unknown as Record<string, unknown>[];

  const typeRes = await db.execute(`
    SELECT name FROM custom_types ORDER BY name ASC
  `);
  const typeRows = typeRes.rows as unknown as { name: string }[];

  const metaRes = await db.execute(`SELECT value FROM meta WHERE key = 'last_updated'`);
  const metaRow = metaRes.rows[0] as unknown as { value: string } | undefined;
  const lastUpdated = metaRow ? parseInt(String(metaRow.value), 10) : Date.now();

  const ordersByMat: Record<string, OrderAllocation[]> = {};
  for (const o of ordRows) {
    const matId = String(o.material_id);
    if (!ordersByMat[matId]) ordersByMat[matId] = [];
    const rawJobType = o.job_type ? String(o.job_type) : undefined;
    let doorSpec = undefined;
    if (o.door_spec_json) {
      try {
        doorSpec = JSON.parse(String(o.door_spec_json));
      } catch {}
    }
    ordersByMat[matId].push({
      id: String(o.id),
      orderNumber: String(o.order_number),
      client: String(o.client),
      quantity: Number(o.quantity),
      date: String(o.date),
      notes: o.notes ? String(o.notes) : undefined,
      status: (o.status === "finalized" ? "finalized" : "reserved") as "reserved" | "finalized",
      imageUrl: o.image_url ? String(o.image_url) : undefined,
      createdAt: o.created_at ? Number(o.created_at) : undefined,
      finalizedAt: o.updated_at ? String(o.updated_at) : undefined,
      jobType: (rawJobType === "door" ? "door" : "generic") as "generic" | "door",
      doorSpec,
    });
  }

  const materials: PanelMaterial[] = matRows.map((m) => {
    const matId = String(m.id);
    return {
      id: matId,
      code: String(m.code),
      name: String(m.name),
      type: String(m.type),
      dimensions: {
        length: Number(m.length),
        width: Number(m.width),
        thickness: Number(m.thickness),
        formatted: String(m.formatted_dimensions),
      },
      totalStock: Number(m.total_stock),
      allocatedStock: Number(m.allocated_stock),
      availableStock: Number(m.available_stock),
      notes: m.notes ? String(m.notes) : "",
      imageUrl: m.image_url ? String(m.image_url) : undefined,
      activeOrders: ordersByMat[matId] || [],
      createdAt: m.created_at ? Number(m.created_at) : undefined,
      updatedAt: String(m.updated_at || new Date().toISOString()),
    };
  });

  const customTypes = typeRows.map((r) => String(r.name));
  if (!customTypes.includes("HPL")) {
    customTypes.unshift("HPL");
  }

  const userRes = await db.execute(`
    SELECT username, display_name, role, password_hash, created_at, permissions_json FROM user_accounts ORDER BY created_at ASC
  `);
  const userRows = userRes.rows as unknown as Record<string, unknown>[];

  const users: UserAccount[] = userRows.map((u) => {
    const rawRole = String(u.role || "Staff").toLowerCase();
    let role: UserRole = "Staff";
    if (rawRole === "admin") role = "Admin";
    else if (rawRole === "manager") role = "Manager";
    else if (rawRole === "viewer") role = "Viewer";
    else if (rawRole === "owner") role = "Owner";

    let permissions: UserModulePermissions | undefined = undefined;
    if (u.permissions_json) {
      try {
        permissions = JSON.parse(String(u.permissions_json));
      } catch {}
    }

    return {
      username: String(u.username),
      displayName: String(u.display_name),
      role,
      password: String(u.password_hash),
      isAuthenticated: false,
      createdAt: u.created_at ? new Date(String(u.created_at)).getTime() : Date.now(),
      permissions,
    };
  });

  return { materials, customTypes, users, lastUpdated };
}

function buildUpsertSql(table: string, columns: readonly string[]): string {
  const allCols = ["id", ...columns];
  const placeholders = allCols.map(() => "?").join(", ");
  const updates = columns.map((c) => `${c} = excluded.${c}`).join(", ");
  return `INSERT INTO ${table} (${allCols.join(", ")}, is_deleted, deleted_at) VALUES (${placeholders}, 0, NULL)
    ON CONFLICT(id) DO UPDATE SET ${updates}, is_deleted = 0, deleted_at = NULL`;
}

export async function saveInventoryToDB(
  materials: PanelMaterial[],
  customTypes: string[],
  users?: UserAccount[]
): Promise<{ success: boolean; lastUpdated: number }> {
  const db = getDB();
  const nowTime = Date.now();

  try {
    await runInTransaction(db, async () => {
      const nowIso = new Date().toISOString();
      const incomingMatIds = new Set<string>(materials.map((m) => m.id));
      const incomingOrdIds = new Set<string>();
      for (const mat of materials) {
        for (const ord of mat.activeOrders ?? []) incomingOrdIds.add(ord.id);
      }

      // Panels that disappeared from the list: soft delete the panel and its orders. Never DELETE.
      const liveMatsRes = await db.execute(`SELECT * FROM materials WHERE is_deleted = 0`);
      const liveMats = liveMatsRes.rows as unknown as Record<string, unknown>[];
      for (const m of liveMats) {
        const id = String(m.id);
        if (incomingMatIds.has(id)) continue;
        const archivedOrders = await db.execute({
          sql: `UPDATE orders SET is_deleted = 1, deleted_at = ? WHERE material_id = ? AND is_deleted = 0`,
          args: [nowIso, id],
        });
        await db.execute({
          sql: `UPDATE materials SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
          args: [nowIso, id],
        });
        await writeAuditLog(db, "MATERIAL_DELETED", {
          table: "materials",
          id,
          before: {
            code: m.code,
            name: m.name,
            type: m.type,
            total_stock: m.total_stock,
            allocated_stock: m.allocated_stock,
            available_stock: m.available_stock,
          },
          after: { is_deleted: 1, deleted_at: nowIso },
          ordersArchivedWithPanel: Number(archivedOrders.rowsAffected ?? 0),
        });
      }

      const upsertMatSql = `
        INSERT INTO materials (
          id, code, name, type, length, width, thickness, unit, formatted_dimensions,
          total_stock, allocated_stock, available_stock, notes, image_url, created_at, updated_at,
          is_deleted, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code, name = excluded.name, type = excluded.type, length = excluded.length,
          width = excluded.width, thickness = excluded.thickness, unit = excluded.unit,
          formatted_dimensions = excluded.formatted_dimensions, total_stock = excluded.total_stock,
          allocated_stock = excluded.allocated_stock, available_stock = excluded.available_stock,
          notes = excluded.notes, image_url = excluded.image_url, created_at = excluded.created_at,
          updated_at = excluded.updated_at, is_deleted = 0, deleted_at = NULL
      `;

      const upsertOrdSql = `
        INSERT INTO orders (
          id, material_id, order_number, client, quantity, date, notes, status, image_url, created_at, updated_at,
          job_type, door_spec_json, is_deleted, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
        ON CONFLICT(id) DO UPDATE SET
          material_id = excluded.material_id, order_number = excluded.order_number, client = excluded.client,
          quantity = excluded.quantity, date = excluded.date, notes = excluded.notes, status = excluded.status,
          image_url = excluded.image_url, created_at = excluded.created_at, updated_at = excluded.updated_at,
          job_type = excluded.job_type, door_spec_json = excluded.door_spec_json,
          is_deleted = 0, deleted_at = NULL
      `;

      for (const mat of materials) {
        await db.execute({
          sql: upsertMatSql,
          args: [
            mat.id,
            autoCapitalizeFirstLetter(mat.code),
            autoCapitalizeFirstLetter(mat.name),
            autoCapitalizeFirstLetter(mat.type || "HPL"),
            mat.dimensions?.length ?? 0,
            mat.dimensions?.width ?? 0,
            mat.dimensions?.thickness ?? 0,
            "mm",
            mat.dimensions?.formatted ?? "",
            mat.totalStock ?? 0,
            mat.allocatedStock ?? 0,
            mat.availableStock ?? 0,
            mat.notes ? autoCapitalizeFirstLetter(mat.notes) : "",
            mat.imageUrl || null,
            mat.createdAt ? String(mat.createdAt) : String(Date.now()),
            mat.updatedAt || new Date().toISOString(),
          ],
        });

        if (Array.isArray(mat.activeOrders)) {
          for (const ord of mat.activeOrders) {
            await db.execute({
              sql: upsertOrdSql,
              args: [
                ord.id,
                mat.id,
                ord.orderNumber,
                autoCapitalizeFirstLetter(ord.client),
                ord.quantity ?? 1,
                ord.date,
                ord.notes ? autoCapitalizeFirstLetter(ord.notes) : "",
                ord.status || "reserved",
                ord.imageUrl || null,
                ord.createdAt ? String(ord.createdAt) : String(Date.now()),
                ord.finalizedAt || null,
                ord.jobType || (ord.doorSpec ? "door" : "generic"),
                ord.doorSpec ? JSON.stringify(ord.doorSpec) : null,
              ],
            });
          }
        }
      }

      // Orders removed from an existing panel: soft delete with audit log
      const liveOrdersRes = await db.execute(`SELECT * FROM orders WHERE is_deleted = 0`);
      const liveOrders = liveOrdersRes.rows as unknown as Record<string, unknown>[];
      for (const o of liveOrders) {
        const id = String(o.id);
        if (incomingOrdIds.has(id)) continue;
        await db.execute({
          sql: `UPDATE orders SET is_deleted = 1, deleted_at = ? WHERE id = ?`,
          args: [nowIso, id],
        });
        await writeAuditLog(db, "ORDER_DELETED", {
          table: "orders",
          id,
          orderNumber: o.order_number,
          client: o.client,
          quantity: o.quantity,
          materialId: o.material_id,
          before: { status: o.status, date: o.date },
          after: { is_deleted: 1, deleted_at: nowIso },
        });
      }

      const insertTypeSql = `INSERT OR IGNORE INTO custom_types (name) VALUES (?)`;
      for (const t of customTypes) {
        if (typeof t === "string" && t.trim()) {
          await db.execute({
            sql: insertTypeSql,
            args: [autoCapitalizeFirstLetter(t.trim())],
          });
        }
      }

      if (Array.isArray(users) && users.length > 0) {
        await saveUsersToDB(users);
      }

      await db.execute({
        sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('last_updated', ?)`,
        args: [String(nowTime)],
      });
    });

    // Local file-system backup bypassed for Vercel read-only environment

    return { success: true, lastUpdated: nowTime };
  } catch (err) {
    console.error("[SQLite Save Error]", err);
    throw err;
  }
}

export async function getTransactionsFromDB(): Promise<PanelTransaction[]> {
  const db = getDB();
  const res = await db.execute(`SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY timestamp DESC`);
  const rows = res.rows as unknown as Record<string, unknown>[];

  return rows.map((r) => {
    let images: string[] = [];
    let items: InvoiceItem[] = [];
    try {
      images = r.images_json ? JSON.parse(String(r.images_json)) : [];
    } catch {}
    try {
      items = r.items_json ? JSON.parse(String(r.items_json)) : [];
    } catch {}

    return {
      id: String(r.id),
      code: r.code ? String(r.code) : undefined,
      timestamp: String(r.timestamp),
      panelType: String(r.panel_type || ""),
      material: String(r.material || ""),
      quantity: Number(r.quantity || 1),
      unit: String(r.unit || "sheets"),
      sellingType: String(r.selling_type || ""),
      seller: r.seller ? String(r.seller) : undefined,
      bank: r.bank ? String(r.bank) : undefined,
      paymentType: r.payment_type ? String(r.payment_type) : undefined,
      currency: (r.currency || "USD") as any,
      currencyRate: Number(r.currency_rate || 1),
      sellingAmount: Number(r.selling_amount || 0),
      costPrice: Number(r.cost_price || 0),
      discountDollars: Number(r.discount_dollars || 0),
      discountPercentage: Number(r.discount_percentage || 0),
      totalAfterDiscount: Number(r.total_after_discount || 0),
      amountPaidNow: Number(r.amount_paid_now || 0),
      amountOwed: Number(r.amount_owed || 0),
      oldUnpaidDebt: Number(r.old_unpaid_debt || 0),
      combinedTotalDebt: Number(r.combined_total_debt || 0),
      grossProfit: Number(r.gross_profit || 0),
      profitMargin: Number(r.profit_margin || 0),
      notes: String(r.notes || ""),
      images,
      items,
      status: (r.status || "completed") as any,
      lastUpdated: String(r.last_updated || r.timestamp),
      client: r.client ? String(r.client) : undefined,
      clientPhone: r.client_phone ? String(r.client_phone) : undefined,
      legacyInvoiceRef: r.legacy_invoice_ref ? String(r.legacy_invoice_ref) : undefined,
      fundermaxBatchRef: r.fundermax_batch_ref ? String(r.fundermax_batch_ref) : undefined,
      estimatedCost: r.estimated_cost === null || r.estimated_cost === undefined ? undefined : Number(r.estimated_cost),
      chargedAmount: r.charged_amount === null || r.charged_amount === undefined ? undefined : Number(r.charged_amount),
      chargedCurrency: isCurrencyCode(r.charged_currency) ? r.charged_currency : undefined,
      exchangeRateApplied:
        r.exchange_rate_applied === null || r.exchange_rate_applied === undefined ? undefined : Number(r.exchange_rate_applied),
      baseUsdEquivalent:
        r.base_usd_equivalent === null || r.base_usd_equivalent === undefined ? undefined : Number(r.base_usd_equivalent),
    };
  });
}

const TX_COLUMNS = [
  "code", "timestamp", "panel_type", "material", "quantity", "unit", "selling_type", "seller", "bank", "payment_type",
  "currency", "currency_rate", "selling_amount", "cost_price", "discount_dollars", "discount_percentage",
  "total_after_discount", "amount_paid_now", "amount_owed", "old_unpaid_debt", "combined_total_debt",
  "gross_profit", "profit_margin", "notes", "images_json", "items_json", "status", "last_updated",
  "charged_amount", "charged_currency", "exchange_rate_applied", "base_usd_equivalent",
  "legacy_invoice_ref", "fundermax_batch_ref", "client", "client_phone", "estimated_cost",
] as const;


export async function saveTransactionsToDB(transactions: PanelTransaction[]): Promise<void> {
  const db = getDB();
  try {
    await runInTransaction(db, async () => {
      const existingRes = await db.execute(`SELECT * FROM transactions`);
      const existingRows = existingRes.rows as unknown as Record<string, unknown>[];
      const existingById = new Map<string, Record<string, unknown>>();
      for (const r of existingRows) existingById.set(String(r.id), r);

      const upsertTxSql = buildUpsertSql("transactions", TX_COLUMNS);
      const incomingIds = new Set<string>();

      for (const tx of transactions) {
        incomingIds.add(tx.id);
        const cur: CurrencyCode = isCurrencyCode(tx.currency) ? tx.currency : "USD";
        const m = (n: number | undefined): number => roundMoney(Number(n) || 0, cur);

        const sanitizedItems = Array.isArray(tx.items)
          ? tx.items.map((it) => ({
              ...it,
              price: m(it.price),
              total: m(it.total),
              code: it.code ? autoCapitalizeFirstLetter(it.code) : it.code,
              product: it.product ? autoCapitalizeFirstLetter(it.product) : it.product,
              type: it.type ? autoCapitalizeFirstLetter(it.type) : it.type,
              sellingType: it.sellingType ? autoCapitalizeFirstLetter(it.sellingType) : it.sellingType,
              seller: it.seller ? autoCapitalizeFirstLetter(it.seller) : it.seller,
              bank: it.bank ? autoCapitalizeFirstLetter(it.bank) : it.bank,
              paymentType: it.paymentType ? autoCapitalizeFirstLetter(it.paymentType) : it.paymentType,
            }))
          : [];

        const sellingAmount = m(tx.sellingAmount);
        const discountDollars = m(tx.discountDollars);
        const totalAfterDiscount = m(tx.totalAfterDiscount);

        // Immutable multi-currency snapshot. The rate stored when the invoice was first charged
        // always wins, so later market-rate changes or edits never rewrite history.
        const existing = existingById.get(tx.id);
        const priorRate =
          existing && existing.charged_currency === cur && Number(existing.exchange_rate_applied) > 0
            ? Number(existing.exchange_rate_applied)
            : undefined;
        const clientRate =
          tx.chargedCurrency === cur && tx.exchangeRateApplied && tx.exchangeRateApplied > 0
            ? tx.exchangeRateApplied
            : undefined;
        const rate = priorRate ?? clientRate ?? legacyRatePerUsd(cur, tx.currencyRate);
        const chargedAmount = totalAfterDiscount;
        const baseUsd = baseUsdFromRate(chargedAmount, cur, rate);

        // PRICE_OVERRIDE: an existing live invoice whose price-defining values changed.
        if (existing && Number(existing.is_deleted) === 0) {
          let beforeItems: InvoiceItem[] = [];
          try {
            beforeItems = existing.items_json ? JSON.parse(String(existing.items_json)) : [];
          } catch {}
          const sig = (items: InvoiceItem[]) =>
            JSON.stringify(items.map((i) => [i.product, roundMoney(Number(i.price) || 0, cur), i.quantity]));
          const beforeTotals = {
            sellingAmount: roundMoney(Number(existing.selling_amount) || 0, cur),
            discountDollars: roundMoney(Number(existing.discount_dollars) || 0, cur),
            totalAfterDiscount: roundMoney(Number(existing.total_after_discount) || 0, cur),
          };
          const afterTotals = { sellingAmount, discountDollars, totalAfterDiscount };
          if (
            JSON.stringify(beforeTotals) !== JSON.stringify(afterTotals) ||
            sig(beforeItems) !== sig(sanitizedItems)
          ) {
            await writeAuditLog(db, "PRICE_OVERRIDE", {
              table: "transactions",
              id: tx.id,
              code: tx.code || null,
              currency: cur,
              before: { ...beforeTotals, items: beforeItems.map((i) => ({ product: i.product, price: i.price, quantity: i.quantity })) },
              after: { ...afterTotals, items: sanitizedItems.map((i) => ({ product: i.product, price: i.price, quantity: i.quantity })) },
            });
          }
        }

        await db.execute({
          sql: upsertTxSql,
          args: [
            tx.id,
            tx.code ? autoCapitalizeFirstLetter(tx.code) : "",
            tx.timestamp || new Date().toISOString(),
            tx.panelType ? autoCapitalizeFirstLetter(tx.panelType) : "",
            tx.material ? autoCapitalizeFirstLetter(tx.material) : "",
            tx.quantity || 1,
            tx.unit || "sheets",
            tx.sellingType ? autoCapitalizeFirstLetter(tx.sellingType) : "",
            tx.seller ? autoCapitalizeFirstLetter(tx.seller) : "",
            tx.bank ? autoCapitalizeFirstLetter(tx.bank) : "",
            tx.paymentType ? autoCapitalizeFirstLetter(tx.paymentType) : "",
            cur,
            tx.currencyRate || 1,
            sellingAmount,
            m(tx.costPrice),
            discountDollars,
            tx.discountPercentage || 0,
            totalAfterDiscount,
            m(tx.amountPaidNow),
            m(tx.amountOwed),
            m(tx.oldUnpaidDebt),
            m(tx.combinedTotalDebt),
            m(tx.grossProfit),
            tx.profitMargin || 0,
            tx.notes ? autoCapitalizeFirstLetter(tx.notes) : "",
            JSON.stringify(tx.images || []),
            JSON.stringify(sanitizedItems),
            tx.status || "completed",
            tx.lastUpdated || new Date().toISOString(),
            chargedAmount,
            cur,
            rate,
            baseUsd,
            tx.legacyInvoiceRef ? autoCapitalizeFirstLetter(tx.legacyInvoiceRef) : "",
            tx.fundermaxBatchRef ? autoCapitalizeFirstLetter(tx.fundermaxBatchRef) : "",
            tx.client ? autoCapitalizeFirstLetter(tx.client) : "",
            tx.clientPhone ? tx.clientPhone.trim() : "",
            tx.estimatedCost || 0,
          ],
        });
      }

      await softDeleteMissing(db, "transactions", incomingIds, "INVOICE_DELETED");
    });
  } catch (err) {
    console.error("[saveTransactionsToDB Error]", err);
    throw err;
  }
}



export async function getProductsFromDB(): Promise<Product[]> {
  const db = getDB();
  const res = await db.execute(`SELECT * FROM products WHERE is_deleted = 0 ORDER BY name ASC`);
  const rows = res.rows as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    sku: String(r.sku || ""),
    name: String(r.name || ""),
    category: String(r.category || "General"),
    currentStock: Number(r.current_stock || 0),
    minStock: Number(r.min_stock || 0),
    location: String(r.location || ""),
    price: Number(r.price || 0),
    imageUrl: r.image_url ? String(r.image_url) : undefined,
    lane: (r.lane || "inStock") as any,
    lastUpdated: String(r.last_updated || new Date().toISOString()),
  }));
}

const PRODUCT_COLUMNS = [
  "sku", "name", "category", "current_stock", "min_stock", "location", "price", "image_url", "lane", "last_updated",
] as const;

export async function saveProductsToDB(products: Product[]): Promise<void> {
  const db = getDB();
  await runInTransaction(db, async () => {
    const upsertSql = buildUpsertSql("products", PRODUCT_COLUMNS);
    const incomingIds = new Set<string>();
    for (const p of products) {
      incomingIds.add(p.id);
      await db.execute({
        sql: upsertSql,
        args: [
          p.id,
          p.sku ? autoCapitalizeFirstLetter(p.sku) : "",
          autoCapitalizeFirstLetter(p.name || ""),
          p.category ? autoCapitalizeFirstLetter(p.category) : "General",
          p.currentStock || 0,
          p.minStock || 0,
          p.location ? autoCapitalizeFirstLetter(p.location) : "",
          p.price || 0,
          p.imageUrl || null,
          p.lane || "inStock",
          p.lastUpdated || new Date().toISOString(),
        ],
      });
    }
    await softDeleteMissing(db, "products", incomingIds, "PRODUCT_DELETED");
  });
}

// ==========================================
// SHIPMENTS PIPELINE CRUD
// ==========================================

export async function getShipmentsFromDB(): Promise<Shipment[]> {
  const db = getDB();
  const res = await db.execute(`SELECT * FROM shipments WHERE is_deleted = 0 ORDER BY created_at DESC`);
  const rows = res.rows as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    trackingCode: String(r.tracking_code || ""),
    destination: String(r.destination || ""),
    itemSummary: String(r.item_summary || ""),
    quantity: Number(r.quantity || 1),
    status: (r.status || "pending") as any,
    createdAt: String(r.created_at || new Date().toISOString()),
  }));
}

const SHIPMENT_COLUMNS = ["tracking_code", "destination", "item_summary", "quantity", "status", "created_at"] as const;

export async function saveShipmentsToDB(shipments: Shipment[]): Promise<void> {
  const db = getDB();
  await runInTransaction(db, async () => {
    const upsertSql = buildUpsertSql("shipments", SHIPMENT_COLUMNS);
    const incomingIds = new Set<string>();
    for (const s of shipments) {
      incomingIds.add(s.id);
      await db.execute({
        sql: upsertSql,
        args: [
          s.id,
          s.trackingCode ? autoCapitalizeFirstLetter(s.trackingCode) : "",
          s.destination ? autoCapitalizeFirstLetter(s.destination) : "",
          s.itemSummary ? autoCapitalizeFirstLetter(s.itemSummary) : "",
          s.quantity || 1,
          s.status || "pending",
          s.createdAt || new Date().toISOString(),
        ],
      });
    }
    await softDeleteMissing(db, "shipments", incomingIds, "SHIPMENT_DELETED");
  });
}


// ==========================================
// EXCHANGE RATES & DROPDOWN PRESETS
// ==========================================

export async function getExchangeRatesFromDB(): Promise<ExchangeRates> {
  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'exchange_rates'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  if (!row || !row.value) return DEFAULT_EXCHANGE_RATES;
  try {
    return JSON.parse(String(row.value));
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
}

export async function saveExchangeRatesToDB(rates: ExchangeRates): Promise<void> {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('exchange_rates', ?)`,
    args: [JSON.stringify(rates)],
  });
}

const DUMMY_EXAMPLE_PRESETS = new Set([
  'MDF Standard', 'Acoustic Slat Panel', 'Melamine Board', 'Plywood Birch', 'uygjg',
  'Natural Oak Veneer', 'American Walnut', 'Smoked Oak', 'Gloss White', 'Matte Anthracite', 'hfhft',
  'Bako Bayan', 'Cashier Main', 'Showroom Sales',
  'FIB (First Iraqi Bank)', 'RT Bank', 'Trade Bank of Iraq', 'Cash Drawer', 'hghgh',
  'Hardware & Edge Banding', 'Veneer & Laminate', 'PVC Edging', 'Glues & Fasteners', 'Accessories',
  'Bay A-1', 'Bay A-2', 'Bay B-1', 'Bay B-2', 'Bay C-1', 'Warehouse Floor'
]);

export async function getDropdownPresetsFromDB(): Promise<DropdownPresets> {
  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'dropdown_presets'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  const defaultPresets: DropdownPresets = {
    savedTypes: [],
    savedProducts: [],
    savedSellingTypes: [
      'Wholesale (کۆ)',
      'Retail (مفرد)',
      'Per Piece (بە دانە)',
      'Per m² (مەتر)',
      'Project / Contractor (پڕۆژە)',
      'Set (تاقم)',
      'Cash (نەقد)',
      'Debt (قەرز)',
      'Credit (کڕێدیت)',
    ],
    savedSellers: [],
    savedBanks: [],
    savedPaymentTypes: ['کاش (Cash)', 'قەرز (Customer Debt)', 'ڕەسیدی کڕیار / پێشەکی (Store Credit)', 'حەواڵە / بانک (Bank / Transfer)'],
    savedCategories: [],
    savedLocations: [],
    savedClients: [],
  };

  if (!row || !row.value) return defaultPresets;
  try {
    const parsed = JSON.parse(String(row.value));
    const filterExamples = (list: unknown): string[] => {
      if (!Array.isArray(list)) return [];
      return list.filter((item): item is string => typeof item === 'string' && !DUMMY_EXAMPLE_PRESETS.has(item.trim()));
    };

    return {
      savedTypes: filterExamples(parsed.savedTypes),
      savedProducts: filterExamples(parsed.savedProducts),
      savedSellingTypes: Array.isArray(parsed.savedSellingTypes) && parsed.savedSellingTypes.length > 0 ? parsed.savedSellingTypes : defaultPresets.savedSellingTypes,
      savedSellers: filterExamples(parsed.savedSellers),
      savedBanks: filterExamples(parsed.savedBanks),
      savedPaymentTypes: (() => {
        const list = Array.isArray(parsed.savedPaymentTypes) && parsed.savedPaymentTypes.length > 0 ? parsed.savedPaymentTypes : defaultPresets.savedPaymentTypes;
        const out: string[] = [];
        list.forEach((item: unknown) => {
          if (typeof item === 'string') {
            if (item.includes('Debt / Credit') || item.includes('Debt/Credit')) {
              if (!out.includes('Debt (قەرز)')) out.push('Debt (قەرز)');
              if (!out.includes('Credit (کڕێدیت)')) out.push('Credit (کڕێدیت)');
            } else {
              if (!out.includes(item)) out.push(item);
            }
          }
        });
        if (!out.includes('Debt (قەرز)')) out.push('Debt (قەرز)');
        if (!out.includes('Credit (کڕێدیت)')) out.push('Credit (کڕێدیت)');
        return out;
      })(),
      savedCategories: filterExamples(parsed.savedCategories),
      savedLocations: filterExamples(parsed.savedLocations),
      savedClients: Array.isArray(parsed.savedClients) ? parsed.savedClients : [],
    };
  } catch {
    return defaultPresets;
  }
}

export async function saveDropdownPresetsToDB(presets: DropdownPresets): Promise<void> {
  const db = getDB();
  const sanitizedPresets: DropdownPresets = {
    savedTypes: (presets.savedTypes || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedProducts: (presets.savedProducts || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedSellingTypes: (presets.savedSellingTypes || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedSellers: (presets.savedSellers || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedBanks: (presets.savedBanks || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedPaymentTypes: (presets.savedPaymentTypes || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedCategories: (presets.savedCategories || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedLocations: (presets.savedLocations || []).map((x) => autoCapitalizeFirstLetter(x)),
    savedClients: (presets.savedClients || []).map((x) => autoCapitalizeFirstLetter(x)),
  };
  await db.execute({
    sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('dropdown_presets', ?)`,
    args: [JSON.stringify(sanitizedPresets)],
  });
}

// ==========================================
// UNIFIED GET & SAVE (ALL ENTITIES)
// ==========================================

export interface UnifiedDatabasePayload {
  materials: PanelMaterial[];
  customTypes: string[];
  users: UserAccount[];
  transactions: PanelTransaction[];
  products: Product[];
  shipments: Shipment[];
  exchangeRates: ExchangeRates;
  dropdownPresets: DropdownPresets;
  lastUpdated: number;
}

export async function getUnifiedDataFromDB(): Promise<UnifiedDatabasePayload> {
  const inv = await getInventoryFromDB();
  const transactions = await getTransactionsFromDB();
  const products = await getProductsFromDB();
  const shipments = await getShipmentsFromDB();
  const exchangeRates = await getExchangeRatesFromDB();
  const dropdownPresets = await getDropdownPresetsFromDB();

  return {
    materials: inv.materials,
    customTypes: inv.customTypes,
    users: inv.users,
    transactions,
    products,
    shipments,
    exchangeRates,
    dropdownPresets,
    lastUpdated: inv.lastUpdated,
  };
}

export async function saveUsersToDB(users: UserAccount[]): Promise<void> {
  const db = getDB();
  await runInTransaction(db, async () => {
    const upsertUserSql = `
      INSERT INTO user_accounts (username, display_name, role, password_hash, created_at, last_login_at, permissions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        display_name = excluded.display_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        permissions_json = excluded.permissions_json
    `;
    const nowStr = new Date().toISOString();
    const incomingUsernames = new Set<string>();
    for (const u of users) {
      incomingUsernames.add(u.username);
      await db.execute({
        sql: upsertUserSql,
        args: [
          u.username,
          autoCapitalizeFirstLetter(u.displayName),
          u.role,
          u.password || "",
          u.createdAt ? new Date(u.createdAt).toISOString() : nowStr,
          nowStr,
          u.permissions ? JSON.stringify(u.permissions) : null,
        ],
      });
    }
    const existingRes = await db.execute(`SELECT username FROM user_accounts`);
    const existing = existingRes.rows as unknown as { username: string }[];
    for (const row of existing) {
      if (row.username !== 'bako' && !incomingUsernames.has(String(row.username))) {
        await db.execute({
          sql: `DELETE FROM user_accounts WHERE username = ?`,
          args: [String(row.username)],
        });
      }
    }
  });
}

export async function saveUnifiedDataToDB(
  payload: Partial<UnifiedDatabasePayload>
): Promise<{ success: boolean; lastUpdated: number }> {
  const now = Date.now();

  if (Array.isArray(payload.materials)) {
    await saveInventoryToDB(payload.materials, payload.customTypes || ["HPL"], payload.users);
  } else if (Array.isArray(payload.users)) {
    await saveUsersToDB(payload.users);
  }
  if (Array.isArray(payload.transactions)) {
    await saveTransactionsToDB(payload.transactions);
  }
  if (Array.isArray(payload.products)) {
    await saveProductsToDB(payload.products);
  }
  if (Array.isArray(payload.shipments)) {
    await saveShipmentsToDB(payload.shipments);
  }
  if (payload.exchangeRates) {
    await saveExchangeRatesToDB(payload.exchangeRates);
  }
  if (payload.dropdownPresets) {
    await saveDropdownPresetsToDB(payload.dropdownPresets);
  }

  // Local file-system backup to inventory_store.json bypassed for Vercel read-only environment

  return { success: true, lastUpdated: now };
}

export interface DatabaseHealthInfo {
  isWalActive: boolean;
  journalMode: string;
  integrity: string;
  dbSizeBytes: number;
  walSizeBytes: number;
  formattedDbSize: string;
  formattedWalSize: string;
  dbFileExists: boolean;
  walFileExists: boolean;
  totalMaterials: number;
  totalOrders: number;
  totalTransactions: number;
  totalProducts: number;
  totalShipments: number;
  serverTimestamp: number;
}

export async function getDatabaseHealth(): Promise<DatabaseHealthInfo> {
  const db = getDB();
  let journalMode = "wal";
  let integrity = "ok";

  try {
    const jmRes = await db.execute("PRAGMA journal_mode;");
    const jmRow = jmRes.rows[0] as unknown as { journal_mode?: string } | undefined;
    if (jmRow && jmRow.journal_mode) journalMode = String(jmRow.journal_mode).toLowerCase();
  } catch {}

  try {
    const intRes = await db.execute("PRAGMA integrity_check;");
    const intRow = intRes.rows[0] as unknown as { integrity_check?: string } | undefined;
    if (intRow && intRow.integrity_check) integrity = String(intRow.integrity_check).toLowerCase();
  } catch {}

  const dbSizeBytes = 0;
  const walSizeBytes = 0;
  const dbFileExists = true;
  const walFileExists = false;

  let totalMaterials = 0;
  let totalOrders = 0;
  let totalTransactions = 0;
  let totalProducts = 0;
  let totalShipments = 0;

  try {
    const matRes = await db.execute("SELECT COUNT(*) as count FROM materials WHERE is_deleted = 0");
    const matCount = matRes.rows[0] as unknown as { count: number } | undefined;
    totalMaterials = Number(matCount?.count ?? 0);

    const ordRes = await db.execute("SELECT COUNT(*) as count FROM orders WHERE is_deleted = 0");
    const ordCount = ordRes.rows[0] as unknown as { count: number } | undefined;
    totalOrders = Number(ordCount?.count ?? 0);

    const txRes = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0");
    const txCount = txRes.rows[0] as unknown as { count: number } | undefined;
    totalTransactions = Number(txCount?.count ?? 0);

    const prodRes = await db.execute("SELECT COUNT(*) as count FROM products WHERE is_deleted = 0");
    const prodCount = prodRes.rows[0] as unknown as { count: number } | undefined;
    totalProducts = Number(prodCount?.count ?? 0);

    const shipRes = await db.execute("SELECT COUNT(*) as count FROM shipments WHERE is_deleted = 0");
    const shipCount = shipRes.rows[0] as unknown as { count: number } | undefined;
    totalShipments = Number(shipCount?.count ?? 0);
  } catch {}

  const formatB = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    isWalActive: journalMode === "wal",
    journalMode,
    integrity,
    dbSizeBytes,
    walSizeBytes,
    formattedDbSize: formatB(dbSizeBytes),
    formattedWalSize: formatB(walSizeBytes),
    dbFileExists,
    walFileExists,
    totalMaterials,
    totalOrders,
    totalTransactions,
    totalProducts,
    totalShipments,
    serverTimestamp: Date.now(),
  };
}

// ==========================================
// BACKUP & RESTORE
// ==========================================

export async function createDatabaseBackup(
  type: "start_of_day" | "yesterday" | "manual",
  label?: string
): Promise<BackupSnapshot> {
  const db = getDB();
  const unified = await getUnifiedDataFromDB();
  const now = new Date();
  const timestamp = now.getTime();
  const dateKey = now.toISOString().split("T")[0];
  const id = `backup-${type}-${timestamp}`;

  const payload: BackupSnapshot = {
    id,
    timestamp,
    createdAt: now.toISOString(),
    dateKey,
    type,
    label: label || `${type === "manual" ? "Manual Backup" : type} (${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
    materials: unified.materials,
    customTypes: unified.customTypes,
    totalPanels: unified.materials.length,
    totalOrders: unified.materials.reduce((acc, m) => acc + (m.activeOrders ? m.activeOrders.length : 0), 0),
    transactions: unified.transactions,
    products: unified.products,
    shipments: unified.shipments,
  };

  const dataJson = JSON.stringify(payload);
  const sha256Checksum = crypto.createHash("sha256").update(dataJson).digest("hex");

  await db.execute({
    sql: `
      INSERT OR REPLACE INTO backups (
        id, timestamp, created_at, date_key, type, label, total_panels, total_orders, sha256_checksum, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      payload.id,
      payload.timestamp,
      payload.createdAt,
      payload.dateKey,
      payload.type,
      payload.label,
      payload.totalPanels,
      payload.totalOrders,
      sha256Checksum,
      dataJson,
    ],
  });

  // Local file-system backup write bypassed for Vercel read-only environment

  await pruneBackups(db);
  return payload;
}

export async function listDatabaseBackups(): Promise<BackupSnapshot[]> {
  const db = getDB();
  const res = await db.execute(`
    SELECT id, timestamp, created_at, date_key, type, label, total_panels, total_orders, sha256_checksum
    FROM backups
    ORDER BY timestamp DESC
  `);
  const rows = res.rows as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    timestamp: Number(r.timestamp),
    createdAt: String(r.created_at),
    dateKey: String(r.date_key),
    type: String(r.type) as BackupSnapshot["type"],
    label: String(r.label),
    totalPanels: Number(r.total_panels),
    totalOrders: Number(r.total_orders),
    sha256Checksum: String(r.sha256_checksum || ""),
    materials: [],
    customTypes: [],
  }));
}

export async function restoreDatabaseBackup(
  backupIdOrPayload: string | BackupSnapshot
): Promise<{ success: boolean; message: string; materialsCount: number }> {
  const db = getDB();

  let targetSnapshot: BackupSnapshot | null = null;

  if (typeof backupIdOrPayload === "string" && (backupIdOrPayload.endsWith(".sqlite") || backupIdOrPayload.endsWith(".sqlite.gz"))) {
    const uncompressedPath = extractSnapshotSqlite(backupIdOrPayload);
    const safePath = uncompressedPath.replace(/'/g, "''");

    try {
      await db.execute(`ATTACH DATABASE '${safePath}' AS snap;`);
      try {
        await db.execute("DELETE FROM materials;");
        await db.execute("INSERT INTO materials SELECT * FROM snap.materials;");
        await db.execute("DELETE FROM orders;");
        await db.execute("INSERT INTO orders SELECT * FROM snap.orders;");
        await db.execute("DELETE FROM transactions;");
        await db.execute("INSERT INTO transactions SELECT * FROM snap.transactions;");
        await db.execute("DELETE FROM products;");
        await db.execute("INSERT INTO products SELECT * FROM snap.products;");
        await db.execute("DELETE FROM shipments;");
        await db.execute("INSERT INTO shipments SELECT * FROM snap.shipments;");
        try {
          await db.execute("DELETE FROM custom_types;");
          await db.execute("INSERT OR IGNORE INTO custom_types SELECT * FROM snap.custom_types;");
        } catch {}

        const countRes = await db.execute("SELECT count(*) as count FROM materials;");
        const countRow = countRes.rows[0] as unknown as { count: number } | undefined;
        await db.execute({
          sql: "INSERT OR REPLACE INTO meta (key, value) VALUES ('last_updated', ?)",
          args: [String(Date.now())],
        });
        await db.execute("DETACH DATABASE snap;");

        return {
          success: true,
          message: `System successfully restored from snapshot: ${backupIdOrPayload}`,
          materialsCount: Number(countRow?.count ?? 0),
        };
      } catch (txErr) {
        try { await db.execute("DETACH DATABASE snap;"); } catch {}
        throw txErr;
      }
    } finally {
      // Local disk cleanup bypassed for serverless environment
    }
  }

  if (typeof backupIdOrPayload === "string") {
    const res = await db.execute({
      sql: `SELECT * FROM backups WHERE id = ?`,
      args: [backupIdOrPayload],
    });
    const row = res.rows[0] as unknown as Record<string, unknown> | undefined;
    if (row && row.data_json) {
      targetSnapshot = JSON.parse(String(row.data_json));
    } else {
      try {
        const physicalPath = path.join(BACKUPS_DIR, `${backupIdOrPayload}.json`);
        if (fs.existsSync(physicalPath)) {
          targetSnapshot = JSON.parse(fs.readFileSync(physicalPath, "utf8"));
        }
      } catch {}
    }
  } else if (backupIdOrPayload && typeof backupIdOrPayload === "object") {
    targetSnapshot = backupIdOrPayload;
  }

  if (!targetSnapshot || !Array.isArray(targetSnapshot.materials)) {
    throw new Error("Invalid or missing backup data structure. Restore aborted.");
  }

  try {
    await saveInventoryToDB(targetSnapshot.materials, targetSnapshot.customTypes || ["HPL"]);
    if (Array.isArray(targetSnapshot.transactions)) {
      await saveTransactionsToDB(targetSnapshot.transactions);
    }
    if (Array.isArray(targetSnapshot.products)) {
      await saveProductsToDB(targetSnapshot.products);
    }
    if (Array.isArray(targetSnapshot.shipments)) {
      await saveShipmentsToDB(targetSnapshot.shipments);
    }

    const nowTime = Date.now();
    await db.execute({
      sql: `
        INSERT INTO activity_logs (id, timestamp, formatted_date, action, details, user, target_id, target_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        `log-${Date.now()}`,
        nowTime,
        new Date().toLocaleString(),
        "BACKUP_RESTORED",
        `System successfully restored from backup snapshot: ${targetSnapshot.label || targetSnapshot.id}`,
        "System Administrator",
        targetSnapshot.id,
        "backup",
      ],
    });

    return {
      success: true,
      message: `Database successfully replaced with backup: ${targetSnapshot.label}`,
      materialsCount: targetSnapshot.materials.length,
    };
  } catch (err) {
    console.error("[SQLite Restore Failed]", err);
    throw new Error(`Restore failed: ${String(err)}`);
  }
}

export async function deleteDatabaseBackup(backupId: string): Promise<boolean> {
  const db = getDB();
  await db.execute({
    sql: `DELETE FROM backups WHERE id = ?`,
    args: [backupId],
  });

  // Local file-system deletion bypassed for Vercel read-only environment

  return true;
}

async function pruneBackups(db: Client): Promise<void> {
  try {
    const MAX_BACKUPS = 30;
    const res = await db.execute(`SELECT id, type, timestamp FROM backups ORDER BY timestamp DESC`);
    const allBackups = res.rows as unknown as { id: string; type: string; timestamp: number }[];
    if (allBackups.length <= MAX_BACKUPS) return;

    const toDelete = allBackups
      .filter((b) => b.type !== "start_of_day" && b.type !== "yesterday")
      .slice(MAX_BACKUPS);

    for (const b of toDelete) {
      await db.execute({
        sql: `DELETE FROM backups WHERE id = ?`,
        args: [String(b.id)],
      });
    }
  } catch (err) {
    console.error("[Prune Backups Error]", err);
  }
}

// Re-export common types for convenience
export type {
  PanelMaterial,
  OrderAllocation,
  BackupSnapshot,
  UserAccount,
  UserRole,
  PanelTransaction,
  Product,
  Shipment,
  ExchangeRates,
  DropdownPresets,
  InvoiceItem,
  CurrencyCode,
  ShipmentStatus
} from "../types/inventory";

// Client-safe compatibility adapter for legacy references
export const db = {
  getState: () => ({
    transactions: [] as PanelTransaction[],
    products: [] as Product[],
    shipments: [] as Shipment[],
    savedTypes: [] as string[],
    savedProducts: [] as string[],
    savedSellingTypes: [] as string[],
    savedSellers: [] as string[],
    savedBanks: [] as string[],
    savedPaymentTypes: [] as string[],
    exchangeRates: DEFAULT_EXCHANGE_RATES
  }),
  getAuditLogs: () => [] as any[],
  subscribe: (_cb: () => void) => () => {},
  addTransaction: (_tx: any) => {},
  updateTransaction: (_id: string, _tx: any) => {},
  deleteTransaction: (_id: string) => {},
  addCustomDropdownItem: (_cat: string, _val: string) => {},
  updateExchangeRates: (_rates: any) => {},
  seedSampleData: () => {},
  clearTransactionsOnly: () => {},
  undo: () => ({ success: false, action: '' }),
  redo: () => ({ success: false, action: '' })
};

// ==========================================
// WAREHOUSE OPERATIONS (Division 03): inbound shipments, allocations, transfers
// Stored as a single JSON document in the meta key/value table.
// ==========================================

export async function getWarehouseOpsRawFromDB(): Promise<string | null> {
  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'warehouse_ops'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  return row?.value ? String(row.value) : null;
}

export async function saveWarehouseOpsRawToDB(json: string): Promise<void> {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('warehouse_ops', ?)`,
    args: [json],
  });
}

export {
  runSchemaMigrations,
  writeAuditLog,
  softDeleteMissing,
  restoreSoftDeleted,
  purgeSoftDeleted,
  listSoftDeleted,
  verifyAuditChain,
  withActor,
  currentActor,
  runInTransaction,
  type SoftTable
} from "./dbSafety";
export {
  roundMoney,
  toMinorUnits,
  fromMinorUnits,
  baseUsdFromRate,
  legacyRatePerUsd,
  buildMoneySnapshot,
  isCurrencyCode
} from "./money";
export {
  executeScheduledBackup,
  createPreImportSafetySnapshot,
  listSnapshots,
  getLatestSnapshot,
  copySnapshotToDirectory,
  detectExternalDrives,
  startBackupScheduler,
  getBackupDir,
  isValidSnapshotName,
  type SnapshotInfo
} from "./backup";
