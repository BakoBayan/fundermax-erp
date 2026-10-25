import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'inventory_store.json');

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  device?: string;
  action: string;
  details: string;
  category?: 'sale' | 'inventory' | 'settings' | 'system';
  amount?: number;
  currency?: string;
}

export interface ServerStore {
  products: any[];
  shipments: any[];
  auditLogs: AuditLogEntry[];
  users: any[];
  transactions: any[];
  savedTypes: string[];
  savedProducts: string[];
  savedSellingTypes: string[];
  savedSellers: string[];
  savedBanks: string[];
  savedPaymentTypes: string[];
  exchangeRates: {
    USD_IQD: number;
    EUR_IQD: number;
    EUR_USD: number;
  };
  version: number;
  lastModified: string;
}

const defaultStore: ServerStore = {
  products: [],
  shipments: [],
  auditLogs: [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      userName: 'Bako Bayan',
      device: 'Server',
      action: 'System Ready',
      details: "Bako's Sales & Inventory System initialized",
      category: 'system'
    }
  ],
  users: [
    {
      id: 'user-bako',
      username: 'bako',
      name: 'Bako Bayan',
      role: 'admin',
      pin: '1234'
    }
  ],
  transactions: [],
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
    'Credit (کڕێدیت)'
  ],
  savedSellers: [],
  savedBanks: [],
  savedPaymentTypes: ['کاش (Cash)', 'قەرز (Customer Debt)', 'ڕەسیدی کڕیار / پێشەکی (Store Credit)', 'حەواڵە / بانک (Bank / Transfer)'],
  exchangeRates: {
    USD_IQD: 153000,
    EUR_IQD: 165000,
    EUR_USD: 1.08
  },
  version: Date.now(),
  lastModified: new Date().toISOString()
};

function readStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial = { ...defaultStore, version: Date.now(), lastModified: new Date().toISOString() };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw.trim()) {
      return defaultStore;
    }
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      shipments: Array.isArray(parsed.shipments) ? parsed.shipments : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : defaultStore.auditLogs,
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : defaultStore.users,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      savedTypes: Array.isArray(parsed.savedTypes) ? parsed.savedTypes : [],
      savedProducts: Array.isArray(parsed.savedProducts) ? parsed.savedProducts : [],
      savedSellingTypes: Array.isArray(parsed.savedSellingTypes) && parsed.savedSellingTypes.length ? parsed.savedSellingTypes : defaultStore.savedSellingTypes,
      savedSellers: Array.isArray(parsed.savedSellers) && parsed.savedSellers.length ? parsed.savedSellers : defaultStore.savedSellers,
      savedBanks: Array.isArray(parsed.savedBanks) ? parsed.savedBanks : [],
      savedPaymentTypes: Array.isArray(parsed.savedPaymentTypes) && parsed.savedPaymentTypes.length ? parsed.savedPaymentTypes : defaultStore.savedPaymentTypes,
      exchangeRates: parsed.exchangeRates || defaultStore.exchangeRates,
      version: typeof parsed.version === 'number' ? parsed.version : Date.now(),
      lastModified: parsed.lastModified || new Date().toISOString()
    };
  } catch (err) {
    console.error('Error reading store:', err);
    return defaultStore;
  }
}

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
// 90 days retention (approx. 3 months)
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function pruneOldBackups() {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return;
    const files = fs.readdirSync(BACKUPS_DIR);
    const now = Date.now();

    const backupFiles = files
      .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
      .map((f) => {
        const filePath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          filePath,
          mtime: stats.mtimeMs,
          size: stats.size
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Newest first

    // Always keep at least 10 recent backups for safety, prune anything older than 3 months after that
    const candidates = backupFiles.slice(10);
    for (const b of candidates) {
      if (now - b.mtime > RETENTION_MS) {
        fs.unlinkSync(b.filePath);
        console.log(`[Backup Pruned] Removed backup older than 3 months: ${b.filename}`);
      }
    }
  } catch (err) {
    console.error('Error in pruneOldBackups:', err);
  }
}

let lastBackupTime = 0;
function createRollingBackup(data: ServerStore, force = false): string | null {
  try {
    const now = Date.now();
    // Throttle automatic rolling backups to once every 15 minutes unless forced
    if (!force && now - lastBackupTime < 15 * 60 * 1000) {
      return null;
    }

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestampStr}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupName);

    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf-8');
    lastBackupTime = now;

    // Prune backups older than 90 days (3 months)
    pruneOldBackups();
    return backupName;
  } catch (err) {
    console.error('Failed to create rolling backup:', err);
    return null;
  }
}

function writeStore(data: ServerStore): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `temp_${Date.now()}.json`);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, content, 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);

    // Automatically trigger rolling backup and prune files older than 3 months
    createRollingBackup(data);

    return true;
  } catch (err) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      createRollingBackup(data);
      return true;
    } catch (directErr) {
      console.error('Direct write failed:', directErr);
      return false;
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'backups') {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const files = fs.readdirSync(BACKUPS_DIR);
      const backups = files
        .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
        .map((f) => {
          const stats = fs.statSync(path.join(BACKUPS_DIR, f));
          return {
            filename: f,
            mtime: stats.mtimeMs,
            date: new Date(stats.mtimeMs).toISOString(),
            sizeBytes: stats.size
          };
        })
        .sort((a, b) => b.mtime - a.mtime);

      return NextResponse.json({ backups, count: backups.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const store = readStore();
  return NextResponse.json(store, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // On-demand manual backup action
    if (body.action === 'create_backup') {
      const current = readStore();
      const backupFile = createRollingBackup(current, true);
      return NextResponse.json({ success: true, backupFile });
    }

    // On-demand restore backup action
    if (body.action === 'restore_backup' && body.filename) {
      const targetPath = path.join(BACKUPS_DIR, body.filename);
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ success: false, error: 'Backup file not found' }, { status: 404 });
      }
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      writeStore(parsed);
      return NextResponse.json({ success: true, message: `Restored from ${body.filename}` });
    }

    const current = readStore();
    const nowIso = new Date().toISOString();
    const newVersion = Date.now();

    let updatedLogs = current.auditLogs;
    if (body.newAuditLog && typeof body.newAuditLog === 'object') {
      const entry: AuditLogEntry = {
        id: body.newAuditLog.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: body.newAuditLog.timestamp || nowIso,
        userName: body.newAuditLog.userName || 'Bako Bayan',
        device: body.newAuditLog.device || 'System',
        action: body.newAuditLog.action || 'Data Change',
        details: body.newAuditLog.details || '',
        category: body.newAuditLog.category || 'system',
        amount: body.newAuditLog.amount,
        currency: body.newAuditLog.currency
      };
      updatedLogs = [entry, ...current.auditLogs.slice(0, 499)];
    } else if (Array.isArray(body.auditLogs)) {
      updatedLogs = body.auditLogs.slice(0, 500);
    }

    const updated: ServerStore = {
      products: Array.isArray(body.products) ? body.products : current.products,
      shipments: Array.isArray(body.shipments) ? body.shipments : current.shipments,
      auditLogs: updatedLogs,
      users: Array.isArray(body.users) ? body.users : current.users,
      transactions: Array.isArray(body.transactions) ? body.transactions : current.transactions,
      savedTypes: Array.isArray(body.savedTypes) ? body.savedTypes : current.savedTypes,
      savedProducts: Array.isArray(body.savedProducts) ? body.savedProducts : current.savedProducts,
      savedSellingTypes: Array.isArray(body.savedSellingTypes) ? body.savedSellingTypes : current.savedSellingTypes,
      savedSellers: Array.isArray(body.savedSellers) ? body.savedSellers : current.savedSellers,
      savedBanks: Array.isArray(body.savedBanks) ? body.savedBanks : current.savedBanks,
      savedPaymentTypes: Array.isArray(body.savedPaymentTypes) ? body.savedPaymentTypes : current.savedPaymentTypes,
      exchangeRates: body.exchangeRates || current.exchangeRates,
      version: newVersion,
      lastModified: nowIso
    };

    const saved = writeStore(updated);
    if (!saved) {
      return NextResponse.json({ success: false, error: 'Failed to write data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      version: updated.version,
      lastModified: updated.lastModified
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: any) {
    console.error('API /api/db POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
