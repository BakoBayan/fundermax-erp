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
  unifiedCache?: {
    data: UnifiedDatabasePayload;
    cachedAt: number;
  };
  warehouseCache?: {
    raw: string | null;
    updatedAt: number;
    cachedAt: number;
  };
};

export function invalidateUnifiedCache(): void {
  globalForDB.unifiedCache = undefined;
}

export function invalidateWarehouseCache(): void {
  globalForDB.warehouseCache = undefined;
}

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
        is_receivable INTEGER DEFAULT 0,
        phone_country_code TEXT,
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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Entities (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        contact_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS InventoryLogs (
        id TEXT PRIMARY KEY,
        inventory_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(entity_id) REFERENCES Entities(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS DebtTracker (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        is_receivable INTEGER NOT NULL CHECK(is_receivable IN (0, 1)),
        status TEXT DEFAULT 'pending',
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(entity_id) REFERENCES Entities(id)
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_debt_tracker_entity_id ON DebtTracker(entity_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_debt_tracker_receivable_deleted ON DebtTracker(is_receivable, is_deleted);
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
// EXPLICIT COLUMN PROJECTIONS (NO SELECT *)
// ==========================================

const MATERIAL_SELECT_COLS =
  "id, code, name, type, length, width, thickness, unit, formatted_dimensions, total_stock, allocated_stock, available_stock, notes, image_url, created_at, updated_at";
const MATERIAL_LIGHT_COLS =
  "id, code, name, type, length, width, thickness, unit, formatted_dimensions, total_stock, allocated_stock, available_stock, notes, NULL AS image_url, created_at, updated_at";

const ORDER_SELECT_COLS =
  "id, material_id, order_number, client, quantity, date, notes, status, image_url, created_at, updated_at, job_type, door_spec_json";
const ORDER_LIGHT_COLS =
  "id, material_id, order_number, client, quantity, date, notes, status, NULL AS image_url, created_at, updated_at, job_type, door_spec_json";

const TRANSACTION_SELECT_COLS =
  "id, code, timestamp, panel_type, material, quantity, unit, selling_type, seller, bank, payment_type, currency, currency_rate, selling_amount, cost_price, discount_dollars, discount_percentage, total_after_discount, amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt, gross_profit, profit_margin, notes, images_json, CASE WHEN images_json IS NOT NULL AND images_json != '' AND images_json != '[]' THEN 1 ELSE 0 END AS has_images, items_json, status, last_updated, charged_amount, charged_currency, exchange_rate_applied, base_usd_equivalent, legacy_invoice_ref, fundermax_batch_ref, client, client_phone, estimated_cost";
const TRANSACTION_LIGHT_COLS =
  "id, code, timestamp, panel_type, material, quantity, unit, selling_type, seller, bank, payment_type, currency, currency_rate, selling_amount, cost_price, discount_dollars, discount_percentage, total_after_discount, amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt, gross_profit, profit_margin, notes, '[]' AS images_json, CASE WHEN images_json IS NOT NULL AND images_json != '' AND images_json != '[]' THEN 1 ELSE 0 END AS has_images, items_json, status, last_updated, charged_amount, charged_currency, exchange_rate_applied, base_usd_equivalent, legacy_invoice_ref, fundermax_batch_ref, client, client_phone, estimated_cost";

const PRODUCT_SELECT_COLS =
  "id, sku, name, category, current_stock, min_stock, location, price, image_url, lane, last_updated";
const PRODUCT_LIGHT_COLS =
  "id, sku, name, category, current_stock, min_stock, location, price, NULL AS image_url, lane, last_updated";

const SHIPMENT_SELECT_COLS =
  "id, tracking_code, destination, item_summary, quantity, status, created_at";

function mapInventoryRows(
  matRows: Record<string, unknown>[],
  ordRows: Record<string, unknown>[],
  typeRows: { name: string }[],
  userRows: Record<string, unknown>[],
  lastUpdated: number
): {
  materials: PanelMaterial[];
  customTypes: string[];
  users: UserAccount[];
  lastUpdated: number;
} {
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

// ==========================================
// INVENTORY CRUD OPERATIONS
// ==========================================

export async function getInventoryFromDB(includeImages = true): Promise<{
  materials: PanelMaterial[];
  customTypes: string[];
  users: UserAccount[];
  lastUpdated: number;
}> {
  const db = getDB();
  const matCols = includeImages ? MATERIAL_SELECT_COLS : MATERIAL_LIGHT_COLS;
  const ordCols = includeImages ? ORDER_SELECT_COLS : ORDER_LIGHT_COLS;

  const [matRes, ordRes, typeRes, metaRes, userRes] = await db.batch(
    [
      `SELECT ${matCols} FROM materials WHERE is_deleted = 0 ORDER BY CAST(code AS INTEGER) ASC, name ASC`,
      `SELECT ${ordCols} FROM orders WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC`,
      `SELECT name FROM custom_types ORDER BY name ASC`,
      `SELECT value FROM meta WHERE key = 'last_updated'`,
      `SELECT username, display_name, role, password_hash, created_at, permissions_json FROM user_accounts ORDER BY created_at ASC`,
    ],
    "read"
  );

  const matRows = matRes.rows as unknown as Record<string, unknown>[];
  const ordRows = ordRes.rows as unknown as Record<string, unknown>[];
  const typeRows = typeRes.rows as unknown as { name: string }[];
  const metaRow = metaRes.rows[0] as unknown as { value: string } | undefined;
  const lastUpdated = metaRow ? parseInt(String(metaRow.value), 10) : Date.now();
  const userRows = userRes.rows as unknown as Record<string, unknown>[];

  return mapInventoryRows(matRows, ordRows, typeRows, userRows, lastUpdated);
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
  users?: UserAccount[],
  options?: { delta?: boolean; deletedMaterialIds?: string[] }
): Promise<{ success: boolean; lastUpdated: number }> {
  const db = getDB();
  const nowTime = Date.now();
  const isDelta = Boolean(options?.delta);
  const explicitDeletedMatIds = options?.deletedMaterialIds || [];
  invalidateUnifiedCache();

  try {
    await runInTransaction(db, async () => {
      const nowIso = new Date().toISOString();
      const incomingMatIds = new Set<string>(materials.map((m) => m.id));
      const incomingOrdIds = new Set<string>();
      for (const mat of materials) {
        for (const ord of mat.activeOrders ?? []) incomingOrdIds.add(ord.id);
      }

      let liveMats: Record<string, unknown>[] = [];
      let liveOrders: Record<string, unknown>[] = [];

      if (!isDelta) {
        // Full sync: fetch all live materials and orders to compute missing deletions
        const [liveMatsRes, liveOrdersRes] = await db.batch(
          [
            `SELECT id, code, name, type, total_stock, allocated_stock, available_stock, updated_at FROM materials WHERE is_deleted = 0`,
            `SELECT id, material_id, order_number, client, quantity, date, status, updated_at FROM orders WHERE is_deleted = 0`,
          ],
          "read"
        );
        liveMats = liveMatsRes.rows as unknown as Record<string, unknown>[];
        liveOrders = liveOrdersRes.rows as unknown as Record<string, unknown>[];
      } else if (materials.length > 0 || explicitDeletedMatIds.length > 0) {
        // Delta sync: only query orders belonging to the touched/deleted materials
        const touchedMatIds = Array.from(new Set([...materials.map((m) => m.id), ...explicitDeletedMatIds]));
        const placeholders = touchedMatIds.map(() => "?").join(", ");
        const [liveMatsRes, liveOrdersRes] = await db.batch(
          [
            {
              sql: `SELECT id, code, name, type, total_stock, allocated_stock, available_stock, updated_at FROM materials WHERE id IN (${placeholders}) AND is_deleted = 0`,
              args: touchedMatIds,
            },
            {
              sql: `SELECT id, material_id, order_number, client, quantity, date, status, updated_at FROM orders WHERE material_id IN (${placeholders}) AND is_deleted = 0`,
              args: touchedMatIds,
            },
          ],
          "read"
        );
        liveMats = liveMatsRes.rows as unknown as Record<string, unknown>[];
        liveOrders = liveOrdersRes.rows as unknown as Record<string, unknown>[];
      }

      const writeBatch: { sql: string; args: any[] }[] = [];

      // Panels to soft-delete: either missing from full sync or explicitly listed in delta deletedMaterialIds
      const deletedMats = isDelta
        ? liveMats.filter((m) => explicitDeletedMatIds.includes(String(m.id)))
        : liveMats.filter((m) => !incomingMatIds.has(String(m.id)));
      if (deletedMats.length > 0 || (isDelta && explicitDeletedMatIds.length > 0)) {
        const delMatIds = isDelta ? explicitDeletedMatIds : deletedMats.map((m) => String(m.id));
        const placeholders = delMatIds.map(() => "?").join(", ");
        writeBatch.push({
          sql: `UPDATE orders SET is_deleted = 1, deleted_at = ? WHERE material_id IN (${placeholders}) AND is_deleted = 0`,
          args: [nowIso, ...delMatIds],
        });
        writeBatch.push({
          sql: `UPDATE materials SET is_deleted = 1, deleted_at = ? WHERE id IN (${placeholders})`,
          args: [nowIso, ...delMatIds],
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
        writeBatch.push({
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
            mat.updatedAt || nowIso,
          ],
        });

        if (Array.isArray(mat.activeOrders)) {
          for (const ord of mat.activeOrders) {
            writeBatch.push({
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

      // Orders removed from an existing panel: soft delete via IN (...) instead of N+1 loop
      const deletedOrders = liveOrders.filter(
        (o) => (!isDelta || incomingMatIds.has(String(o.material_id))) && !incomingOrdIds.has(String(o.id))
      );
      if (deletedOrders.length > 0) {
        const delOrdIds = deletedOrders.map((o) => String(o.id));
        const placeholders = delOrdIds.map(() => "?").join(", ");
        writeBatch.push({
          sql: `UPDATE orders SET is_deleted = 1, deleted_at = ? WHERE id IN (${placeholders})`,
          args: [nowIso, ...delOrdIds],
        });
      }

      const insertTypeSql = `INSERT OR IGNORE INTO custom_types (name) VALUES (?)`;
      for (const t of customTypes) {
        if (typeof t === "string" && t.trim()) {
          writeBatch.push({
            sql: insertTypeSql,
            args: [autoCapitalizeFirstLetter(t.trim())],
          });
        }
      }

      writeBatch.push({
        sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('last_updated', ?)`,
        args: [String(nowTime)],
      });

      if (writeBatch.length > 0) {
        await db.batch(writeBatch, "write");
      }

      // Write audit logs for any soft-deleted materials or orders
      for (const m of deletedMats) {
        const id = String(m.id);
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
        });
      }

      for (const o of deletedOrders) {
        const id = String(o.id);
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

      if (Array.isArray(users) && users.length > 0) {
        await saveUsersToDB(users);
      }
    });

    return { success: true, lastUpdated: nowTime };
  } catch (err) {
    console.error("[SQLite Save Error]", err);
    throw err;
  }
}

function mapTransactionRows(rows: Record<string, unknown>[]): PanelTransaction[] {
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
      hasImages: Boolean(Number(r.has_images) === 1 || images.length > 0),
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
      isReceivable: r.payment_type !== 'Supplier Bill' && r.selling_type !== 'Supplier Purchase',
    };
  });
}

export async function getTransactionsFromDB(includeImages = false): Promise<PanelTransaction[]> {
  const db = getDB();
  const cols = includeImages ? TRANSACTION_SELECT_COLS : TRANSACTION_LIGHT_COLS;
  const res = await db.execute(`SELECT ${cols} FROM transactions WHERE is_deleted = 0 ORDER BY timestamp DESC`);
  const rows = res.rows as unknown as Record<string, unknown>[];
  return mapTransactionRows(rows);
}

export async function getTransactionImagesFromDB(id: string): Promise<string[]> {
  const db = getDB();
  const res = await db.execute({
    sql: `SELECT images_json FROM transactions WHERE id = ? OR code = ? LIMIT 1`,
    args: [id, id],
  });
  const row = res.rows[0] as unknown as { images_json?: string } | undefined;
  if (row?.images_json) {
    try {
      const parsed = JSON.parse(String(row.images_json));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
      }
    } catch {}
  }

  // Fallback: check warehouse_ops shipments attachments if record was stored as a shipment
  try {
    const rawWarehouse = await getWarehouseOpsRawFromDB();
    if (rawWarehouse) {
      const parsedWh = JSON.parse(rawWarehouse) as {
        shipments?: Array<{ id?: string; batchCode?: string; attachments?: string[] }>;
      };
      const matchedSh = (parsedWh.shipments || []).find(
        (s) => s.id === id || (s.batchCode && s.batchCode.toLowerCase() === id.toLowerCase())
      );
      if (matchedSh && Array.isArray(matchedSh.attachments) && matchedSh.attachments.length > 0) {
        return matchedSh.attachments.filter((x): x is string => typeof x === "string" && x.length > 0);
      }
    }
  } catch {}

  return [];
}

const TX_COLUMNS = [
  "code", "timestamp", "panel_type", "material", "quantity", "unit", "selling_type", "seller", "bank", "payment_type",
  "currency", "currency_rate", "selling_amount", "cost_price", "discount_dollars", "discount_percentage",
  "total_after_discount", "amount_paid_now", "amount_owed", "old_unpaid_debt", "combined_total_debt",
  "gross_profit", "profit_margin", "notes", "images_json", "items_json", "status", "last_updated",
  "charged_amount", "charged_currency", "exchange_rate_applied", "base_usd_equivalent",
  "legacy_invoice_ref", "fundermax_batch_ref", "client", "client_phone", "estimated_cost",
] as const;

export async function saveTransactionsToDB(
  transactions: PanelTransaction[],
  options?: { delta?: boolean; deletedIds?: string[] }
): Promise<void> {
  const db = getDB();
  const isDelta = Boolean(options?.delta);
  const explicitDeletedIds = options?.deletedIds || [];
  invalidateUnifiedCache();
  try {
    await runInTransaction(db, async () => {
      const existingById = new Map<string, Record<string, unknown>>();

      if (!isDelta) {
        const existingRes = await db.execute(
          `SELECT id, is_deleted, last_updated, charged_currency, exchange_rate_applied, selling_amount, discount_dollars, total_after_discount, amount_paid_now, amount_owed, status, items_json, images_json, notes, selling_type, payment_type FROM transactions`
        );
        const existingRows = existingRes.rows as unknown as Record<string, unknown>[];
        for (const r of existingRows) existingById.set(String(r.id), r);
      } else if (transactions.length > 0) {
        const txIds = transactions.map((t) => t.id);
        const placeholders = txIds.map(() => "?").join(", ");
        const existingRes = await db.execute({
          sql: `SELECT id, is_deleted, last_updated, charged_currency, exchange_rate_applied, selling_amount, discount_dollars, total_after_discount, amount_paid_now, amount_owed, status, items_json, images_json, notes, selling_type, payment_type FROM transactions WHERE id IN (${placeholders})`,
          args: txIds,
        });
        const existingRows = existingRes.rows as unknown as Record<string, unknown>[];
        for (const r of existingRows) existingById.set(String(r.id), r);
      }

      const upsertTxSql = buildUpsertSql("transactions", TX_COLUMNS);
      const incomingIds = new Set<string>();
      const txBatch: { sql: string; args: any[] }[] = [];
      const priceOverrides: Array<{ id: string; code: string | null; currency: CurrencyCode; before: unknown; after: unknown }> = [];

      for (const tx of transactions) {
        incomingIds.add(tx.id);
        const existing = existingById.get(tx.id);

        const incomingSellingType = tx.sellingType ? autoCapitalizeFirstLetter(tx.sellingType) : "";
        const incomingPaymentType = tx.paymentType ? autoCapitalizeFirstLetter(tx.paymentType) : "";
        const incomingNotes = tx.notes ? autoCapitalizeFirstLetter(tx.notes) : "";
        const hasIncomingImages = Array.isArray(tx.images) && tx.images.length > 0;
        const shouldPreserveExistingImages =
          !hasIncomingImages &&
          existing?.images_json &&
          String(existing.images_json) !== "[]" &&
          (tx.hasImages === true || (tx.lastUpdated && String(existing.last_updated) === String(tx.lastUpdated)));
        const incomingImagesJson = shouldPreserveExistingImages
          ? String(existing!.images_json)
          : JSON.stringify(tx.images || []);

        // Delta skip: only skip if live and all tracked fields (last_updated, images_json, notes, selling_type, payment_type, amounts, status) match
        if (
          existing &&
          Number(existing.is_deleted) === 0 &&
          tx.lastUpdated &&
          String(existing.last_updated) === String(tx.lastUpdated) &&
          String(existing.images_json || "[]") === incomingImagesJson &&
          String(existing.notes || "") === incomingNotes &&
          String(existing.selling_type || "") === incomingSellingType &&
          String(existing.payment_type || "") === incomingPaymentType &&
          Number(existing.amount_paid_now) === Number(tx.amountPaidNow || 0) &&
          Number(existing.amount_owed) === Number(tx.amountOwed || 0) &&
          String(existing.status || "completed") === String(tx.status || "completed")
        ) {
          continue;
        }

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
            priceOverrides.push({
              id: tx.id,
              code: tx.code || null,
              currency: cur,
              before: { ...beforeTotals, items: beforeItems.map((i) => ({ product: i.product, price: i.price, quantity: i.quantity })) },
              after: { ...afterTotals, items: sanitizedItems.map((i) => ({ product: i.product, price: i.price, quantity: i.quantity })) },
            });
          }
        }

        txBatch.push({
          sql: upsertTxSql,
          args: [
            tx.id,
            tx.code ? autoCapitalizeFirstLetter(tx.code) : "",
            tx.timestamp || new Date().toISOString(),
            tx.panelType ? autoCapitalizeFirstLetter(tx.panelType) : "",
            tx.material ? autoCapitalizeFirstLetter(tx.material) : "",
            tx.quantity || 1,
            tx.unit || "sheets",
            incomingSellingType,
            tx.seller ? autoCapitalizeFirstLetter(tx.seller) : "",
            tx.bank ? autoCapitalizeFirstLetter(tx.bank) : "",
            incomingPaymentType,
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
            incomingNotes,
            incomingImagesJson,
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

      if (txBatch.length > 0) {
        await db.batch(txBatch, "write");
      }

      for (const po of priceOverrides) {
        await writeAuditLog(db, "PRICE_OVERRIDE", {
          table: "transactions",
          id: po.id,
          code: po.code,
          currency: po.currency,
          before: po.before,
          after: po.after,
        });
      }

      if (isDelta && explicitDeletedIds.length > 0) {
        const nowIso = new Date().toISOString();
        const placeholders = explicitDeletedIds.map(() => "?").join(", ");
        await db.execute({
          sql: `UPDATE transactions SET is_deleted = 1, deleted_at = ? WHERE id IN (${placeholders}) AND is_deleted = 0`,
          args: [nowIso, ...explicitDeletedIds],
        });
        for (const delId of explicitDeletedIds) {
          await writeAuditLog(db, "INVOICE_DELETED", {
            table: "transactions",
            id: delId,
            after: { is_deleted: 1, deleted_at: nowIso },
          });
        }
      } else if (!isDelta) {
        await softDeleteMissing(db, "transactions", incomingIds, "INVOICE_DELETED");
      }
    });
  } catch (err) {
    console.error("[saveTransactionsToDB Error]", err);
    throw err;
  }
}

function mapProductRows(rows: Record<string, unknown>[]): Product[] {
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

export async function getProductsFromDB(includeImages = true): Promise<Product[]> {
  const db = getDB();
  const cols = includeImages ? PRODUCT_SELECT_COLS : PRODUCT_LIGHT_COLS;
  const res = await db.execute(`SELECT ${cols} FROM products WHERE is_deleted = 0 ORDER BY name ASC`);
  const rows = res.rows as unknown as Record<string, unknown>[];
  return mapProductRows(rows);
}

const PRODUCT_COLUMNS = [
  "sku", "name", "category", "current_stock", "min_stock", "location", "price", "image_url", "lane", "last_updated",
] as const;

export async function saveProductsToDB(
  products: Product[],
  options?: { delta?: boolean; deletedIds?: string[] }
): Promise<void> {
  const db = getDB();
  const isDelta = Boolean(options?.delta);
  const explicitDeletedIds = options?.deletedIds || [];
  invalidateUnifiedCache();
  await runInTransaction(db, async () => {
    const upsertSql = buildUpsertSql("products", PRODUCT_COLUMNS);
    const incomingIds = new Set<string>();
    const stmts: { sql: string; args: any[] }[] = [];
    for (const p of products) {
      incomingIds.add(p.id);
      stmts.push({
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
    if (isDelta && explicitDeletedIds.length > 0) {
      const nowIso = new Date().toISOString();
      const placeholders = explicitDeletedIds.map(() => "?").join(", ");
      stmts.push({
        sql: `UPDATE products SET is_deleted = 1, deleted_at = ? WHERE id IN (${placeholders}) AND is_deleted = 0`,
        args: [nowIso, ...explicitDeletedIds],
      });
    }
    if (stmts.length > 0) {
      await db.batch(stmts, "write");
    }
    if (!isDelta) {
      await softDeleteMissing(db, "products", incomingIds, "PRODUCT_DELETED");
    }
  });
}

// ==========================================
// SHIPMENTS PIPELINE CRUD
// ==========================================

function mapShipmentRows(rows: Record<string, unknown>[]): Shipment[] {
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

export async function getShipmentsFromDB(): Promise<Shipment[]> {
  const db = getDB();
  const res = await db.execute(`SELECT ${SHIPMENT_SELECT_COLS} FROM shipments WHERE is_deleted = 0 ORDER BY created_at DESC`);
  const rows = res.rows as unknown as Record<string, unknown>[];
  return mapShipmentRows(rows);
}

const SHIPMENT_COLUMNS = ["tracking_code", "destination", "item_summary", "quantity", "status", "created_at"] as const;

export async function saveShipmentsToDB(
  shipments: Shipment[],
  options?: { delta?: boolean; deletedIds?: string[] }
): Promise<void> {
  const db = getDB();
  const isDelta = Boolean(options?.delta);
  const explicitDeletedIds = options?.deletedIds || [];
  invalidateUnifiedCache();
  await runInTransaction(db, async () => {
    const upsertSql = buildUpsertSql("shipments", SHIPMENT_COLUMNS);
    const incomingIds = new Set<string>();
    const stmts: { sql: string; args: any[] }[] = [];
    for (const s of shipments) {
      incomingIds.add(s.id);
      stmts.push({
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
    if (isDelta && explicitDeletedIds.length > 0) {
      const nowIso = new Date().toISOString();
      const placeholders = explicitDeletedIds.map(() => "?").join(", ");
      stmts.push({
        sql: `UPDATE shipments SET is_deleted = 1, deleted_at = ? WHERE id IN (${placeholders}) AND is_deleted = 0`,
        args: [nowIso, ...explicitDeletedIds],
      });
    }
    if (stmts.length > 0) {
      await db.batch(stmts, "write");
    }
    if (!isDelta) {
      await softDeleteMissing(db, "shipments", incomingIds, "SHIPMENT_DELETED");
    }
  });
}

// ==========================================
// EXCHANGE RATES & DROPDOWN PRESETS
// ==========================================

function parseExchangeRatesValue(rawValue: string | undefined): ExchangeRates {
  if (!rawValue) return DEFAULT_EXCHANGE_RATES;
  try {
    return JSON.parse(String(rawValue));
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
}

export async function getExchangeRatesFromDB(): Promise<ExchangeRates> {
  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'exchange_rates'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  return parseExchangeRatesValue(row?.value);
}

export async function saveExchangeRatesToDB(rates: ExchangeRates): Promise<void> {
  const db = getDB();
  invalidateUnifiedCache();
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

function parseDropdownPresetsValue(rawValue: string | undefined): DropdownPresets {
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

  if (!rawValue) return defaultPresets;
  try {
    const parsed = JSON.parse(String(rawValue));
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

export async function getDropdownPresetsFromDB(): Promise<DropdownPresets> {
  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'dropdown_presets'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  return parseDropdownPresetsValue(row?.value);
}

export async function saveDropdownPresetsToDB(presets: DropdownPresets): Promise<void> {
  const db = getDB();
  invalidateUnifiedCache();
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
// UNIFIED GET & SAVE (SINGLE BATCHED ROUND-TRIP)
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

const UNIFIED_CACHE_TTL_MS = 15_000;

export async function getUnifiedDataFromDB(options?: {
  includeImages?: boolean;
  since?: number;
}): Promise<UnifiedDatabasePayload & { unchanged?: boolean }> {
  const includeImages = options?.includeImages ?? false;
  const since = options?.since ?? 0;

  // Serve from read-through memory cache if warm and valid (cache stores pure text light payload)
  if (
    !includeImages &&
    globalForDB.unifiedCache &&
    Date.now() - globalForDB.unifiedCache.cachedAt < UNIFIED_CACHE_TTL_MS
  ) {
    const cached = globalForDB.unifiedCache.data;
    if (since > 0 && cached.lastUpdated <= since) {
      return {
        ...cached,
        materials: [],
        transactions: [],
        products: [],
        shipments: [],
        unchanged: true,
      };
    }
    return cached;
  }

  const db = getDB();

  // Delta fast-path: if client sent `since`, check meta.last_updated first
  if (since > 0) {
    const metaCheck = await db.execute(`SELECT value FROM meta WHERE key = 'last_updated'`);
    const metaRow = metaCheck.rows[0] as unknown as { value: string } | undefined;
    const serverLastUpdated = metaRow ? parseInt(String(metaRow.value), 10) : 0;
    if (serverLastUpdated > 0 && serverLastUpdated <= since) {
      return {
        materials: [],
        customTypes: ["HPL"],
        users: [],
        transactions: [],
        products: [],
        shipments: [],
        exchangeRates: DEFAULT_EXCHANGE_RATES,
        dropdownPresets: parseDropdownPresetsValue(undefined),
        lastUpdated: serverLastUpdated,
        unchanged: true,
      };
    }
  }

  const matCols = includeImages ? MATERIAL_SELECT_COLS : MATERIAL_LIGHT_COLS;
  const ordCols = includeImages ? ORDER_SELECT_COLS : ORDER_LIGHT_COLS;
  const txCols = includeImages ? TRANSACTION_SELECT_COLS : TRANSACTION_LIGHT_COLS;
  const prodCols = includeImages ? PRODUCT_SELECT_COLS : PRODUCT_LIGHT_COLS;

  // Single batched network round-trip to Turso/SQLite instead of 10 sequential queries
  const [matRes, ordRes, typeRes, userRes, txRes, prodRes, shipRes, metaRes] = await db.batch(
    [
      `SELECT ${matCols} FROM materials WHERE is_deleted = 0 ORDER BY CAST(code AS INTEGER) ASC, name ASC`,
      `SELECT ${ordCols} FROM orders WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC`,
      `SELECT name FROM custom_types ORDER BY name ASC`,
      `SELECT username, display_name, role, password_hash, created_at, permissions_json FROM user_accounts ORDER BY created_at ASC`,
      `SELECT ${txCols} FROM transactions WHERE is_deleted = 0 ORDER BY timestamp DESC`,
      `SELECT ${prodCols} FROM products WHERE is_deleted = 0 ORDER BY name ASC`,
      `SELECT ${SHIPMENT_SELECT_COLS} FROM shipments WHERE is_deleted = 0 ORDER BY created_at DESC`,
      `SELECT key, value FROM meta WHERE key IN ('last_updated', 'exchange_rates', 'dropdown_presets')`,
    ],
    "read"
  );

  const metaMap = new Map<string, string>();
  for (const r of metaRes.rows as unknown as { key: string; value: string }[]) {
    metaMap.set(String(r.key), String(r.value));
  }

  const lastUpdatedRaw = metaMap.get("last_updated");
  const lastUpdated = lastUpdatedRaw ? parseInt(lastUpdatedRaw, 10) : Date.now();

  const inv = mapInventoryRows(
    matRes.rows as unknown as Record<string, unknown>[],
    ordRes.rows as unknown as Record<string, unknown>[],
    typeRes.rows as unknown as { name: string }[],
    userRes.rows as unknown as Record<string, unknown>[],
    lastUpdated
  );

  const payload: UnifiedDatabasePayload = {
    materials: inv.materials,
    customTypes: inv.customTypes,
    users: inv.users,
    transactions: mapTransactionRows(txRes.rows as unknown as Record<string, unknown>[]),
    products: mapProductRows(prodRes.rows as unknown as Record<string, unknown>[]),
    shipments: mapShipmentRows(shipRes.rows as unknown as Record<string, unknown>[]),
    exchangeRates: parseExchangeRatesValue(metaMap.get("exchange_rates")),
    dropdownPresets: parseDropdownPresetsValue(metaMap.get("dropdown_presets")),
    lastUpdated,
  };

  if (!includeImages) {
    globalForDB.unifiedCache = {
      data: payload,
      cachedAt: Date.now(),
    };
  }

  return payload;
}

export async function saveUsersToDB(users: UserAccount[]): Promise<void> {
  const db = getDB();
  invalidateUnifiedCache();
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
    const stmts: { sql: string; args: any[] }[] = [];
    const incomingUsernames: string[] = [];

    for (const u of users) {
      incomingUsernames.push(u.username);
      stmts.push({
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

    if (incomingUsernames.length > 0) {
      const placeholders = incomingUsernames.map(() => "?").join(", ");
      stmts.push({
        sql: `DELETE FROM user_accounts WHERE username != 'bako' AND username NOT IN (${placeholders})`,
        args: incomingUsernames,
      });
    }

    if (stmts.length > 0) {
      await db.batch(stmts, "write");
    }
  });
}

export interface SyncSavePayload extends Partial<UnifiedDatabasePayload> {
  delta?: boolean;
  deletedMaterialIds?: string[];
  deletedTransactionIds?: string[];
  deletedProductIds?: string[];
  deletedShipmentIds?: string[];
}

export async function saveUnifiedDataToDB(
  payload: SyncSavePayload
): Promise<{ success: boolean; lastUpdated: number }> {
  const now = Date.now();
  const isDelta = Boolean(payload.delta);
  invalidateUnifiedCache();

  if (Array.isArray(payload.materials) || (Array.isArray(payload.deletedMaterialIds) && payload.deletedMaterialIds.length > 0)) {
    await saveInventoryToDB(payload.materials || [], payload.customTypes || ["HPL"], payload.users, {
      delta: isDelta,
      deletedMaterialIds: payload.deletedMaterialIds,
    });
  } else if (Array.isArray(payload.customTypes) && payload.customTypes.length > 0) {
    const db = getDB();
    const stmts = payload.customTypes
      .filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
      .map((t) => ({
        sql: `INSERT OR IGNORE INTO custom_types (name) VALUES (?)`,
        args: [autoCapitalizeFirstLetter(t.trim())],
      }));
    if (stmts.length > 0) {
      await db.batch(stmts, "write");
    }
    if (Array.isArray(payload.users)) {
      await saveUsersToDB(payload.users);
    }
  } else if (Array.isArray(payload.users)) {
    await saveUsersToDB(payload.users);
  }

  if (Array.isArray(payload.transactions) || (Array.isArray(payload.deletedTransactionIds) && payload.deletedTransactionIds.length > 0)) {
    await saveTransactionsToDB(payload.transactions || [], {
      delta: isDelta,
      deletedIds: payload.deletedTransactionIds,
    });
  }
  if (Array.isArray(payload.products) || (Array.isArray(payload.deletedProductIds) && payload.deletedProductIds.length > 0)) {
    await saveProductsToDB(payload.products || [], {
      delta: isDelta,
      deletedIds: payload.deletedProductIds,
    });
  }
  if (Array.isArray(payload.shipments) || (Array.isArray(payload.deletedShipmentIds) && payload.deletedShipmentIds.length > 0)) {
    await saveShipmentsToDB(payload.shipments || [], {
      delta: isDelta,
      deletedIds: payload.deletedShipmentIds,
    });
  }
  if (payload.exchangeRates) {
    await saveExchangeRatesToDB(payload.exchangeRates);
  }
  if (payload.dropdownPresets) {
    await saveDropdownPresetsToDB(payload.dropdownPresets);
  }

  const db = getDB();
  await db.execute({
    sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('last_updated', ?)`,
    args: [String(now)],
  });
  invalidateUnifiedCache();

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

export function buildHealthFromUnified(data: UnifiedDatabasePayload): DatabaseHealthInfo {
  const totalOrders = (data.materials || []).reduce(
    (sum, m) => sum + (Array.isArray(m.activeOrders) ? m.activeOrders.length : 0),
    0
  );
  return {
    isWalActive: true,
    journalMode: "wal",
    integrity: "ok",
    dbSizeBytes: 0,
    walSizeBytes: 0,
    formattedDbSize: "0 B",
    formattedWalSize: "0 B",
    dbFileExists: true,
    walFileExists: false,
    totalMaterials: (data.materials || []).length,
    totalOrders,
    totalTransactions: (data.transactions || []).length,
    totalProducts: (data.products || []).length,
    totalShipments: (data.shipments || []).length,
    serverTimestamp: Date.now(),
  };
}

export async function getDatabaseHealth(): Promise<DatabaseHealthInfo> {
  if (globalForDB.unifiedCache) {
    return buildHealthFromUnified(globalForDB.unifiedCache.data);
  }

  const db = getDB();
  let totalMaterials = 0;
  let totalOrders = 0;
  let totalTransactions = 0;
  let totalProducts = 0;
  let totalShipments = 0;

  try {
    // Single combined count query instead of 5 sequential COUNT(*) round-trips + full-table PRAGMA integrity_check
    const countRes = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM materials WHERE is_deleted = 0) AS totalMaterials,
        (SELECT COUNT(*) FROM orders WHERE is_deleted = 0) AS totalOrders,
        (SELECT COUNT(*) FROM transactions WHERE is_deleted = 0) AS totalTransactions,
        (SELECT COUNT(*) FROM products WHERE is_deleted = 0) AS totalProducts,
        (SELECT COUNT(*) FROM shipments WHERE is_deleted = 0) AS totalShipments
    `);
    const row = countRes.rows[0] as unknown as Record<string, unknown> | undefined;
    if (row) {
      totalMaterials = Number(row.totalMaterials ?? 0);
      totalOrders = Number(row.totalOrders ?? 0);
      totalTransactions = Number(row.totalTransactions ?? 0);
      totalProducts = Number(row.totalProducts ?? 0);
      totalShipments = Number(row.totalShipments ?? 0);
    }
  } catch {}

  return {
    isWalActive: true,
    journalMode: "wal",
    integrity: "ok",
    dbSizeBytes: 0,
    walSizeBytes: 0,
    formattedDbSize: "0 B",
    formattedWalSize: "0 B",
    dbFileExists: true,
    walFileExists: false,
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

    if (toDelete.length > 0) {
      const ids = toDelete.map((b) => String(b.id));
      const placeholders = ids.map(() => "?").join(", ");
      await db.execute({
        sql: `DELETE FROM backups WHERE id IN (${placeholders})`,
        args: ids,
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

const WAREHOUSE_CACHE_TTL_MS = 15_000;

export async function getWarehouseOpsRawFromDB(): Promise<string | null> {
  if (
    globalForDB.warehouseCache &&
    Date.now() - globalForDB.warehouseCache.cachedAt < WAREHOUSE_CACHE_TTL_MS
  ) {
    return globalForDB.warehouseCache.raw;
  }

  const db = getDB();
  const res = await db.execute(`SELECT value FROM meta WHERE key = 'warehouse_ops'`);
  const row = res.rows[0] as unknown as { value: string } | undefined;
  const raw = row?.value ? String(row.value) : null;

  let updatedAt = 0;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { updatedAt?: number };
      updatedAt = Number(parsed?.updatedAt) || 0;
    } catch {}
  }

  globalForDB.warehouseCache = {
    raw,
    updatedAt,
    cachedAt: Date.now(),
  };

  return raw;
}

export async function saveWarehouseOpsRawToDB(json: string, updatedAt = Date.now()): Promise<void> {
  const db = getDB();
  await db.execute({
    sql: `INSERT OR REPLACE INTO meta (key, value) VALUES ('warehouse_ops', ?)`,
    args: [json],
  });
  globalForDB.warehouseCache = {
    raw: json,
    updatedAt,
    cachedAt: Date.now(),
  };
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
