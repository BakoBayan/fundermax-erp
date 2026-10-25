import { DatabaseSync } from "node:sqlite";
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
  InvoiceItem
} from "../types/inventory";
import { DEFAULT_EXCHANGE_RATES } from "./currency";
import { autoCapitalizeFirstLetter } from "../utils/text";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "warehouse.db");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const LEGACY_JSON_PATH = path.join(DATA_DIR, "db.json");
const INVENTORY_STORE_JSON_PATH = path.join(DATA_DIR, "inventory_store.json");

const globalForDB = globalThis as unknown as { sqliteDB?: DatabaseSync };

export function getDB(): DatabaseSync {
  if (globalForDB.sqliteDB) return globalForDB.sqliteDB;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  
  // Configure SQLite settings for high performance and durability
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Initialize core tables
  db.exec(`
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
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_types (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      username TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT,
      permissions_json TEXT
    );

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

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- UNIFIED MODULE 2: TRANSACTIONS & SALES INVOICES
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
      last_updated TEXT NOT NULL
    );

    -- UNIFIED MODULE 3: WAREHOUSE GENERAL GOODS & PRODUCTS
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

    -- UNIFIED MODULE 3: SHIPPING PIPELINE
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
    const ordersInfo = db.prepare("PRAGMA table_info(orders)").all() as { name: string; notnull: number }[];
    const updatedAtCol = ordersInfo.find((c) => c.name === "updated_at");
    if (updatedAtCol && updatedAtCol.notnull === 1) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        BEGIN IMMEDIATE;
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
        INSERT INTO orders_v2 SELECT * FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_v2 RENAME TO orders;
        COMMIT;
        PRAGMA foreign_keys = ON;
      `);
      console.log("[SQLite Migration] orders table updated_at column relaxed.");
    }
  } catch (migErr) {
    console.error("[SQLite Migration Error]", migErr);
  }

  // Initial migration from legacy db.json if materials table is empty
  const countRow = db.prepare("SELECT count(*) as count FROM materials").get() as { count: number } | undefined;
  if (!countRow || countRow.count === 0) {
    migrateFromLegacyJSON(db);
  }

  // Initial migration from inventory_store.json if transactions table is empty
  const txCountRow = db.prepare("SELECT count(*) as count FROM transactions").get() as { count: number } | undefined;
  if (!txCountRow || txCountRow.count === 0) {
    migrateFromInventoryStoreJSON(db);
  }

  try {
    const userTableInfo = db.prepare("PRAGMA table_info(user_accounts)").all() as Array<{ name: string }>;
    const hasPermsCol = userTableInfo.some((col) => col.name === "permissions_json");
    if (!hasPermsCol) {
      db.exec("ALTER TABLE user_accounts ADD COLUMN permissions_json TEXT;");
      console.log("[SQLite Migration] user_accounts table permissions_json column added.");
    }
  } catch (migErr) {
    console.error("[SQLite Migration Error: permissions_json]", migErr);
  }

  ensureDefaultAccounts(db);

  globalForDB.sqliteDB = db;
  return db;
}

function ensureDefaultAccounts(db: DatabaseSync) {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO user_accounts (username, display_name, role, password_hash, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  insertStmt.run("bako", "Bako (Administrator)", "Admin", "illcbtfmo1", now, now);
  insertStmt.run("Awat", "Awat (Manager)", "Manager", "awat22", now, now);
  insertStmt.run("viewer", "Viewer (Read-Only)", "Viewer", "1234", now, now);
}

function migrateFromLegacyJSON(db: DatabaseSync) {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return;
  try {
    const raw = fs.readFileSync(LEGACY_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.materials)) return;

    db.exec("BEGIN IMMEDIATE;");
    try {
      const insertMat = db.prepare(`
        INSERT OR REPLACE INTO materials (
          id, code, name, type, length, width, thickness, unit, formatted_dimensions,
          total_stock, allocated_stock, available_stock, notes, image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertOrd = db.prepare(`
        INSERT OR REPLACE INTO orders (
          id, material_id, order_number, client, quantity, date, notes, status, image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertType = db.prepare(`INSERT OR IGNORE INTO custom_types (name) VALUES (?)`);

      for (const mat of data.materials) {
        insertMat.run(
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
          mat.updatedAt || new Date().toISOString()
        );

        if (Array.isArray(mat.activeOrders)) {
          for (const ord of mat.activeOrders) {
            insertOrd.run(
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
              ord.finalizedAt || null
            );
          }
        }
      }

      if (Array.isArray(data.customTypes)) {
        for (const t of data.customTypes) {
          if (typeof t === "string" && t.trim()) {
            insertType.run(t.trim());
          }
        }
      }

      db.exec("COMMIT;");
      console.log(`[SQLite Migration] Migrated ${data.materials.length} panels from legacy db.json.`);
    } catch (err) {
      db.exec("ROLLBACK;");
      console.error("[SQLite Migration Error]", err);
    }
  } catch (err) {
    console.error("[Legacy JSON Read Error]", err);
  }
}

function migrateFromInventoryStoreJSON(db: DatabaseSync) {
  const targetPath = path.resolve(process.cwd(), "data", "inventory_store.json");
  if (!fs.existsSync(targetPath)) {
    return;
  }

  try {
    const raw = fs.readFileSync(targetPath, "utf8");
    const data = JSON.parse(raw);
    if (!data) return;

    db.exec("BEGIN IMMEDIATE;");
    try {
      // 1. Transactions
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        const insertTx = db.prepare(`
          INSERT OR REPLACE INTO transactions (
            id, code, timestamp, panel_type, material, quantity, unit, selling_type, seller, bank, payment_type,
            currency, currency_rate, selling_amount, cost_price, discount_dollars, discount_percentage,
            total_after_discount, amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt,
            gross_profit, profit_margin, notes, images_json, items_json, status, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const tx of data.transactions) {
          insertTx.run(
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
            tx.lastUpdated || new Date().toISOString()
          );
        }
        console.log(`[SQLite Migration] Migrated ${data.transactions.length} sales invoices from inventory_store.json.`);
      }

      // 2. Products
      if (Array.isArray(data.products) && data.products.length > 0) {
        const insertProd = db.prepare(`
          INSERT OR REPLACE INTO products (
            id, sku, name, category, current_stock, min_stock, location, price, image_url, lane, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of data.products) {
          insertProd.run(
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
            p.lastUpdated || new Date().toISOString()
          );
        }
      }

      // 3. Shipments
      if (Array.isArray(data.shipments) && data.shipments.length > 0) {
        const insertShip = db.prepare(`
          INSERT OR REPLACE INTO shipments (
            id, tracking_code, destination, item_summary, quantity, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of data.shipments) {
          insertShip.run(
            s.id,
            s.trackingCode || "",
            s.destination || "",
            s.itemSummary || "",
            s.quantity || 1,
            s.status || "pending",
            s.createdAt || new Date().toISOString()
          );
        }
      }

      // 4. Exchange Rates
      if (data.exchangeRates) {
        const insertMeta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`);
        insertMeta.run("exchange_rates", JSON.stringify(data.exchangeRates));
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
      const insertMeta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`);
      insertMeta.run("dropdown_presets", JSON.stringify(presets));

      db.exec("COMMIT;");
      console.log("[SQLite Migration] Successfully initialized unified datasets from inventory_store.json.");
    } catch (migErr) {
      db.exec("ROLLBACK;");
      console.error("[Migration from inventory_store Error]", migErr);
    }
  } catch (err) {
    console.error("[inventory_store.json Read Error]", err);
  }
}

// ==========================================
// INVENTORY CRUD OPERATIONS
// ==========================================

export function getInventoryFromDB(): {
  materials: PanelMaterial[];
  customTypes: string[];
  users: UserAccount[];
  lastUpdated: number;
} {
  const db = getDB();

  const matRows = db.prepare(`
    SELECT * FROM materials ORDER BY CAST(code AS INTEGER) ASC, name ASC
  `).all() as Record<string, unknown>[];

  const ordRows = db.prepare(`
    SELECT * FROM orders ORDER BY date DESC, created_at DESC
  `).all() as Record<string, unknown>[];

  const typeRows = db.prepare(`
    SELECT name FROM custom_types ORDER BY name ASC
  `).all() as { name: string }[];

  const metaRow = db.prepare(`SELECT value FROM meta WHERE key = 'last_updated'`).get() as { value: string } | undefined;
  const lastUpdated = metaRow ? parseInt(metaRow.value, 10) : Date.now();

  const ordersByMat: Record<string, OrderAllocation[]> = {};
  for (const o of ordRows) {
    const matId = String(o.material_id);
    if (!ordersByMat[matId]) ordersByMat[matId] = [];
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

  const customTypes = typeRows.map((r) => r.name);
  if (!customTypes.includes("HPL")) {
    customTypes.unshift("HPL");
  }

  const userRows = db.prepare(`
    SELECT username, display_name, role, password_hash, created_at, permissions_json FROM user_accounts ORDER BY created_at ASC
  `).all() as Record<string, unknown>[];

  const users: UserAccount[] = userRows.map((u) => {
    const rawRole = String(u.role || "Staff").toLowerCase();
    let role: UserRole = "Staff";
    if (rawRole === "admin") role = "Admin";
    else if (rawRole === "manager") role = "Manager";
    else if (rawRole === "viewer") role = "Viewer";

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

export function saveInventoryToDB(
  materials: PanelMaterial[],
  customTypes: string[],
  users?: UserAccount[]
): { success: boolean; lastUpdated: number } {
  const db = getDB();
  const nowTime = Date.now();

  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM orders;");
    db.exec("DELETE FROM materials;");
    db.exec("DELETE FROM custom_types;");

    const insertMat = db.prepare(`
      INSERT INTO materials (
        id, code, name, type, length, width, thickness, unit, formatted_dimensions,
        total_stock, allocated_stock, available_stock, notes, image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOrd = db.prepare(`
      INSERT INTO orders (
        id, material_id, order_number, client, quantity, date, notes, status, image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertType = db.prepare(`INSERT OR IGNORE INTO custom_types (name) VALUES (?)`);

    for (const mat of materials) {
      insertMat.run(
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
        mat.updatedAt || new Date().toISOString()
      );

      if (Array.isArray(mat.activeOrders)) {
        for (const ord of mat.activeOrders) {
          insertOrd.run(
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
            ord.finalizedAt || null
          );
        }
      }
    }

    for (const t of customTypes) {
      if (typeof t === "string" && t.trim()) {
        insertType.run(autoCapitalizeFirstLetter(t.trim()));
      }
    }

    if (Array.isArray(users) && users.length > 0) {
      db.exec("DELETE FROM user_accounts;");
      const insertUser = db.prepare(`
        INSERT INTO user_accounts (username, display_name, role, password_hash, created_at, last_login_at, permissions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const nowStr = new Date().toISOString();
      for (const u of users) {
        insertUser.run(
          u.username,
          autoCapitalizeFirstLetter(u.displayName),
          u.role,
          u.password || "",
          u.createdAt ? new Date(u.createdAt).toISOString() : nowStr,
          nowStr,
          u.permissions ? JSON.stringify(u.permissions) : null
        );
      }
    }

    const updateMeta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('last_updated', ?)`);
    updateMeta.run(String(nowTime));

    db.exec("COMMIT;");

    try {
      fs.writeFileSync(LEGACY_JSON_PATH, JSON.stringify({ materials, customTypes, users, lastUpdated: nowTime }, null, 2), "utf8");
    } catch {}

    return { success: true, lastUpdated: nowTime };
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[SQLite Save Error]", err);
    throw err;
  }
}

// ==========================================
// TRANSACTIONS (SALES INVOICES) CRUD
// ==========================================

export function getTransactionsFromDB(): PanelTransaction[] {
  const db = getDB();
  const rows = db.prepare(`SELECT * FROM transactions ORDER BY timestamp DESC`).all() as Record<string, unknown>[];

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
    };
  });
}

export function saveTransactionsToDB(transactions: PanelTransaction[]): void {
  const db = getDB();
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM transactions;");
    const insertTx = db.prepare(`
      INSERT INTO transactions (
        id, code, timestamp, panel_type, material, quantity, unit, selling_type, seller, bank, payment_type,
        currency, currency_rate, selling_amount, cost_price, discount_dollars, discount_percentage,
        total_after_discount, amount_paid_now, amount_owed, old_unpaid_debt, combined_total_debt,
        gross_profit, profit_margin, notes, images_json, items_json, status, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tx of transactions) {
      const sanitizedItems = Array.isArray(tx.items)
        ? tx.items.map((it) => ({
            ...it,
            code: it.code ? autoCapitalizeFirstLetter(it.code) : it.code,
            product: it.product ? autoCapitalizeFirstLetter(it.product) : it.product,
            type: it.type ? autoCapitalizeFirstLetter(it.type) : it.type,
            sellingType: it.sellingType ? autoCapitalizeFirstLetter(it.sellingType) : it.sellingType,
            seller: it.seller ? autoCapitalizeFirstLetter(it.seller) : it.seller,
            bank: it.bank ? autoCapitalizeFirstLetter(it.bank) : it.bank,
            paymentType: it.paymentType ? autoCapitalizeFirstLetter(it.paymentType) : it.paymentType,
          }))
        : [];

      insertTx.run(
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
        tx.notes ? autoCapitalizeFirstLetter(tx.notes) : "",
        JSON.stringify(tx.images || []),
        JSON.stringify(sanitizedItems),
        tx.status || "completed",
        tx.lastUpdated || new Date().toISOString()
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[saveTransactionsToDB Error]", err);
    throw err;
  }
}

// ==========================================
// PRODUCTS (WAREHOUSE GOODS) CRUD
// ==========================================

export function getProductsFromDB(): Product[] {
  const db = getDB();
  const rows = db.prepare(`SELECT * FROM products ORDER BY name ASC`).all() as Record<string, unknown>[];
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

export function saveProductsToDB(products: Product[]): void {
  const db = getDB();
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM products;");
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, sku, name, category, current_stock, min_stock, location, price, image_url, lane, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of products) {
      insertProd.run(
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
        p.lastUpdated || new Date().toISOString()
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

// ==========================================
// SHIPMENTS PIPELINE CRUD
// ==========================================

export function getShipmentsFromDB(): Shipment[] {
  const db = getDB();
  const rows = db.prepare(`SELECT * FROM shipments ORDER BY created_at DESC`).all() as Record<string, unknown>[];
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

export function saveShipmentsToDB(shipments: Shipment[]): void {
  const db = getDB();
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM shipments;");
    const insertShip = db.prepare(`
      INSERT INTO shipments (
        id, tracking_code, destination, item_summary, quantity, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of shipments) {
      insertShip.run(
        s.id,
        s.trackingCode ? autoCapitalizeFirstLetter(s.trackingCode) : "",
        s.destination ? autoCapitalizeFirstLetter(s.destination) : "",
        s.itemSummary ? autoCapitalizeFirstLetter(s.itemSummary) : "",
        s.quantity || 1,
        s.status || "pending",
        s.createdAt || new Date().toISOString()
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

// ==========================================
// EXCHANGE RATES & DROPDOWN PRESETS
// ==========================================

export function getExchangeRatesFromDB(): ExchangeRates {
  const db = getDB();
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'exchange_rates'`).get() as { value: string } | undefined;
  if (!row || !row.value) return DEFAULT_EXCHANGE_RATES;
  try {
    return JSON.parse(row.value);
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
}

export function saveExchangeRatesToDB(rates: ExchangeRates): void {
  const db = getDB();
  const insertMeta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('exchange_rates', ?)`);
  insertMeta.run(JSON.stringify(rates));
}

const DUMMY_EXAMPLE_PRESETS = new Set([
  'MDF Standard', 'Acoustic Slat Panel', 'Melamine Board', 'Plywood Birch', 'uygjg',
  'Natural Oak Veneer', 'American Walnut', 'Smoked Oak', 'Gloss White', 'Matte Anthracite', 'hfhft',
  'Bako Bayan', 'Cashier Main', 'Showroom Sales',
  'FIB (First Iraqi Bank)', 'RT Bank', 'Trade Bank of Iraq', 'Cash Drawer', 'hghgh',
  'Hardware & Edge Banding', 'Veneer & Laminate', 'PVC Edging', 'Glues & Fasteners', 'Accessories',
  'Bay A-1', 'Bay A-2', 'Bay B-1', 'Bay B-2', 'Bay C-1', 'Warehouse Floor'
]);

export function getDropdownPresetsFromDB(): DropdownPresets {
  const db = getDB();
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'dropdown_presets'`).get() as { value: string } | undefined;
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
      'Debt / Credit (قەرز)',
    ],
    savedSellers: [],
    savedBanks: [],
    savedPaymentTypes: ['Cash (نەقد)', 'Debt / Credit (قەرز)', 'Installment (قیست)', 'Bank Transfer (حەواڵە)'],
    savedCategories: [],
    savedLocations: [],
    savedClients: [],
  };

  if (!row || !row.value) return defaultPresets;
  try {
    const parsed = JSON.parse(row.value);
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
      savedPaymentTypes: Array.isArray(parsed.savedPaymentTypes) && parsed.savedPaymentTypes.length > 0 ? parsed.savedPaymentTypes : defaultPresets.savedPaymentTypes,
      savedCategories: filterExamples(parsed.savedCategories),
      savedLocations: filterExamples(parsed.savedLocations),
      savedClients: Array.isArray(parsed.savedClients) ? parsed.savedClients : [],
    };
  } catch {
    return defaultPresets;
  }
}

export function saveDropdownPresetsToDB(presets: DropdownPresets): void {
  const db = getDB();
  const insertMeta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('dropdown_presets', ?)`);
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
  insertMeta.run(JSON.stringify(sanitizedPresets));
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

export function getUnifiedDataFromDB(): UnifiedDatabasePayload {
  const inv = getInventoryFromDB();
  const transactions = getTransactionsFromDB();
  const products = getProductsFromDB();
  const shipments = getShipmentsFromDB();
  const exchangeRates = getExchangeRatesFromDB();
  const dropdownPresets = getDropdownPresetsFromDB();

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

export function saveUsersToDB(users: UserAccount[]): void {
  const db = getDB();
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.exec("DELETE FROM user_accounts;");
    const insertUser = db.prepare(`
      INSERT INTO user_accounts (username, display_name, role, password_hash, created_at, last_login_at, permissions_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const nowStr = new Date().toISOString();
    for (const u of users) {
      insertUser.run(
        u.username,
        autoCapitalizeFirstLetter(u.displayName),
        u.role,
        u.password || "",
        u.createdAt ? new Date(u.createdAt).toISOString() : nowStr,
        nowStr,
        u.permissions ? JSON.stringify(u.permissions) : null
      );
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[SQLite saveUsersToDB Error]", err);
  }
}

export function saveUnifiedDataToDB(payload: Partial<UnifiedDatabasePayload>): { success: boolean; lastUpdated: number } {
  const db = getDB();
  const now = Date.now();

  if (Array.isArray(payload.materials)) {
    saveInventoryToDB(payload.materials, payload.customTypes || ["HPL"], payload.users);
  } else if (Array.isArray(payload.users)) {
    saveUsersToDB(payload.users);
  }
  if (Array.isArray(payload.transactions)) {
    saveTransactionsToDB(payload.transactions);
  }
  if (Array.isArray(payload.products)) {
    saveProductsToDB(payload.products);
  }
  if (Array.isArray(payload.shipments)) {
    saveShipmentsToDB(payload.shipments);
  }
  if (payload.exchangeRates) {
    saveExchangeRatesToDB(payload.exchangeRates);
  }
  if (payload.dropdownPresets) {
    saveDropdownPresetsToDB(payload.dropdownPresets);
  }

  // Backup store to inventory_store.json for cross-compatibility
  try {
    const full = getUnifiedDataFromDB();
    fs.writeFileSync(INVENTORY_STORE_JSON_PATH, JSON.stringify(full, null, 2), "utf8");
  } catch {}

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

export function getDatabaseHealth(): DatabaseHealthInfo {
  const db = getDB();
  let journalMode = "unknown";
  let integrity = "unknown";

  try {
    const jmRow = db.prepare("PRAGMA journal_mode;").get() as { journal_mode?: string } | undefined;
    if (jmRow && jmRow.journal_mode) journalMode = String(jmRow.journal_mode).toLowerCase();
  } catch {}

  try {
    const intRow = db.prepare("PRAGMA integrity_check;").get() as { integrity_check?: string } | undefined;
    if (intRow && intRow.integrity_check) integrity = String(intRow.integrity_check).toLowerCase();
  } catch {}

  let dbSizeBytes = 0;
  let walSizeBytes = 0;
  let dbFileExists = false;
  let walFileExists = false;

  try {
    if (fs.existsSync(DB_PATH)) {
      dbFileExists = true;
      dbSizeBytes = fs.statSync(DB_PATH).size;
    }
    const walPath = `${DB_PATH}-wal`;
    if (fs.existsSync(walPath)) {
      walFileExists = true;
      walSizeBytes = fs.statSync(walPath).size;
    }
  } catch {}

  let totalMaterials = 0;
  let totalOrders = 0;
  let totalTransactions = 0;
  let totalProducts = 0;
  let totalShipments = 0;

  try {
    const matCount = db.prepare("SELECT COUNT(*) as count FROM materials").get() as { count: number };
    totalMaterials = matCount?.count ?? 0;
    const ordCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    totalOrders = ordCount?.count ?? 0;
    const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
    totalTransactions = txCount?.count ?? 0;
    const prodCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    totalProducts = prodCount?.count ?? 0;
    const shipCount = db.prepare("SELECT COUNT(*) as count FROM shipments").get() as { count: number };
    totalShipments = shipCount?.count ?? 0;
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

export function createDatabaseBackup(type: "start_of_day" | "yesterday" | "manual", label?: string): BackupSnapshot {
  const db = getDB();
  const unified = getUnifiedDataFromDB();
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

  const insertBackup = db.prepare(`
    INSERT OR REPLACE INTO backups (
      id, timestamp, created_at, date_key, type, label, total_panels, total_orders, sha256_checksum, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBackup.run(
    payload.id,
    payload.timestamp,
    payload.createdAt,
    payload.dateKey,
    payload.type,
    payload.label,
    payload.totalPanels,
    payload.totalOrders,
    sha256Checksum,
    dataJson
  );

  try {
    const backupFilePath = path.join(BACKUPS_DIR, `${id}.json`);
    fs.writeFileSync(backupFilePath, dataJson, "utf8");
  } catch (err) {
    console.error("[Backup File Write Error]", err);
  }

  pruneBackups(db);
  return payload;
}

export function listDatabaseBackups(): BackupSnapshot[] {
  const db = getDB();
  const rows = db.prepare(`
    SELECT id, timestamp, created_at, date_key, type, label, total_panels, total_orders, sha256_checksum
    FROM backups
    ORDER BY timestamp DESC
  `).all() as Record<string, unknown>[];

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

export function restoreDatabaseBackup(backupIdOrPayload: string | BackupSnapshot): { success: boolean; message: string; materialsCount: number } {
  const db = getDB();

  let targetSnapshot: BackupSnapshot | null = null;

  if (typeof backupIdOrPayload === "string") {
    const row = db.prepare(`SELECT * FROM backups WHERE id = ?`).get(backupIdOrPayload) as Record<string, unknown> | undefined;
    if (row && row.data_json) {
      targetSnapshot = JSON.parse(String(row.data_json));
    } else {
      const physicalPath = path.join(BACKUPS_DIR, `${backupIdOrPayload}.json`);
      if (fs.existsSync(physicalPath)) {
        targetSnapshot = JSON.parse(fs.readFileSync(physicalPath, "utf8"));
      }
    }
  } else if (backupIdOrPayload && typeof backupIdOrPayload === "object") {
    targetSnapshot = backupIdOrPayload;
  }

  if (!targetSnapshot || !Array.isArray(targetSnapshot.materials)) {
    throw new Error("Invalid or missing backup data structure. Restore aborted.");
  }

  db.exec("BEGIN IMMEDIATE;");
  try {
    saveInventoryToDB(targetSnapshot.materials, targetSnapshot.customTypes || ["HPL"]);
    if (Array.isArray(targetSnapshot.transactions)) {
      saveTransactionsToDB(targetSnapshot.transactions);
    }
    if (Array.isArray(targetSnapshot.products)) {
      saveProductsToDB(targetSnapshot.products);
    }
    if (Array.isArray(targetSnapshot.shipments)) {
      saveShipmentsToDB(targetSnapshot.shipments);
    }

    const nowTime = Date.now();
    const logStmt = db.prepare(`
      INSERT INTO activity_logs (id, timestamp, formatted_date, action, details, user, target_id, target_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    logStmt.run(
      `log-${Date.now()}`,
      nowTime,
      new Date().toLocaleString(),
      "BACKUP_RESTORED",
      `System successfully restored from backup snapshot: ${targetSnapshot.label || targetSnapshot.id}`,
      "System Administrator",
      targetSnapshot.id,
      "backup"
    );

    db.exec("COMMIT;");

    return {
      success: true,
      message: `Database successfully replaced with backup: ${targetSnapshot.label}`,
      materialsCount: targetSnapshot.materials.length,
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    console.error("[SQLite Restore Failed - Rolled Back Cleanly]", err);
    throw new Error(`Restore failed and was cleanly rolled back: ${String(err)}`);
  }
}

export function deleteDatabaseBackup(backupId: string): boolean {
  const db = getDB();
  db.prepare(`DELETE FROM backups WHERE id = ?`).run(backupId);

  try {
    const physicalPath = path.join(BACKUPS_DIR, `${backupId}.json`);
    if (fs.existsSync(physicalPath)) {
      fs.unlinkSync(physicalPath);
    }
  } catch {}

  return true;
}

function pruneBackups(db: DatabaseSync) {
  try {
    const MAX_BACKUPS = 30;
    const allBackups = db.prepare(`SELECT id, type, timestamp FROM backups ORDER BY timestamp DESC`).all() as { id: string; type: string; timestamp: number }[];
    if (allBackups.length <= MAX_BACKUPS) return;

    const toDelete = allBackups
      .filter((b) => b.type !== "start_of_day" && b.type !== "yesterday")
      .slice(MAX_BACKUPS);

    for (const b of toDelete) {
      db.prepare(`DELETE FROM backups WHERE id = ?`).run(b.id);
      try {
        const p = path.join(BACKUPS_DIR, `${b.id}.json`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
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

export function getWarehouseOpsRawFromDB(): string | null {
  const db = getDB();
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'warehouse_ops'`).get() as { value: string } | undefined;
  return row?.value ?? null;
}

export function saveWarehouseOpsRawToDB(json: string): void {
  const db = getDB();
  db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('warehouse_ops', ?)`).run(json);
}