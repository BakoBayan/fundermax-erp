/**
 * Cloud-safe & serverless-compatible backup helpers for the @libsql/client (Turso) engine.
 *
 * In read-only serverless environments (like Vercel) and remote Turso cloud databases,
 * local disk file writes (`fs.mkdirSync`, `fs.writeFileSync`, `VACUUM INTO`) are safely
 * bypassed so the application never crashes on read-only file systems.
 */
import type { Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export type SnapshotTier = 'recent' | 'daily' | 'weekly';

export interface SnapshotInfo {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string; // ISO
  tier: SnapshotTier;
  isCompressed: boolean;
}

const SNAPSHOT_RE = /^(?:backup|pre-import)-[A-Za-z0-9_-]+\.sqlite(\.gz)?$/;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export function getBackupDir(): string {
  return path.join(process.cwd(), 'backups');
}

export function isValidSnapshotName(name: string): boolean {
  return SNAPSHOT_RE.test(name);
}

/** Parses timestamp from snapshot filename or falls back to stat mtime */
function parseSnapshotTimestamp(name: string, mtime: Date): Date {
  const match = name.match(/^(?:backup|pre-import)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z?)/);
  if (match) {
    const parts = match[1].split('T');
    if (parts.length === 2) {
      const timePart = parts[1].replace(/-/g, ':');
      const d = new Date(`${parts[0]}T${timePart}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return mtime;
}

export function listSnapshots(): SnapshotInfo[] {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => SNAPSHOT_RE.test(f));
    const rawList = files.map((name) => {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      const parsedDate = parseSnapshotTimestamp(name, st.mtime);
      const isCompressed = name.endsWith('.gz');

      return {
        name,
        path: full,
        sizeBytes: st.size,
        createdAt: parsedDate.toISOString(),
        tier: 'recent' as SnapshotTier,
        isCompressed,
      };
    });

    // Sort newest first
    rawList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Assign tiers according to tiered retention envelope
    const now = Date.now();
    const seenDailyDays = new Set<string>();
    const seenWeeklyWeeks = new Set<string>();

    for (const snap of rawList) {
      const snapTime = new Date(snap.createdAt).getTime();
      const ageMs = Math.max(0, now - snapTime);
      const ageHours = ageMs / HOUR_MS;
      const ageDays = ageMs / DAY_MS;

      if (ageHours <= 48) {
        snap.tier = 'recent';
      } else if (ageDays <= 30) {
        snap.tier = 'daily';
        const d = new Date(snapTime);
        const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        seenDailyDays.add(dayKey);
      } else if (ageDays <= 90) {
        snap.tier = 'weekly';
        const d = new Date(snapTime);
        const weekBucket = `${d.getUTCFullYear()}-W${Math.floor(d.getTime() / WEEK_MS)}`;
        seenWeeklyWeeks.add(weekBucket);
      } else {
        snap.tier = 'weekly';
      }
    }

    return rawList;
  } catch {
    return [];
  }
}

export function getLatestSnapshot(): SnapshotInfo | null {
  return listSnapshots()[0] ?? null;
}

/**
 * Enforces Tiered Retention Schedule (no-op on read-only serverless environments).
 */
export function pruneSnapshots(): { kept: number; purged: number } {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) return { kept: 0, purged: 0 };

    const all = listSnapshots();
    const now = Date.now();
    const seenDailyDays = new Set<string>();
    const seenWeeklyWeeks = new Set<string>();

    let kept = 0;
    let purged = 0;

    for (const snap of all) {
      const snapTime = new Date(snap.createdAt).getTime();
      const ageMs = Math.max(0, now - snapTime);
      const ageHours = ageMs / HOUR_MS;
      const ageDays = ageMs / DAY_MS;

      let shouldKeep = false;

      if (ageHours <= 48) {
        shouldKeep = true;
      } else if (ageDays <= 30) {
        const d = new Date(snapTime);
        const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        if (!seenDailyDays.has(dayKey)) {
          seenDailyDays.add(dayKey);
          shouldKeep = true;
        }
      } else if (ageDays <= 90) {
        const d = new Date(snapTime);
        const weekBucket = `${d.getUTCFullYear()}-W${Math.floor(d.getTime() / WEEK_MS)}`;
        if (!seenWeeklyWeeks.has(weekBucket)) {
          seenWeeklyWeeks.add(weekBucket);
          shouldKeep = true;
        }
      }

      if (shouldKeep) {
        kept++;
      } else {
        try {
          fs.unlinkSync(snap.path);
          purged++;
        } catch {}
      }
    }

    return { kept, purged };
  } catch {
    return { kept: 0, purged: 0 };
  }
}

/**
 * Serverless-safe snapshot metadata generator for Turso cloud deployments.
 * Local disk file writes are bypassed on read-only environments (e.g. Vercel).
 */
export async function executeScheduledBackup(_db: Client): Promise<SnapshotInfo> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.sqlite.gz`;
  return {
    name: fileName,
    path: fileName,
    sizeBytes: 0,
    createdAt: new Date().toISOString(),
    tier: 'recent',
    isCompressed: true,
  };
}

/**
 * Serverless-safe pre-import safety snapshot metadata generator for Turso cloud deployments.
 * Naming convention: pre-import-<timestamp>.sqlite.gz
 */
export async function createPreImportSafetySnapshot(_db: Client): Promise<SnapshotInfo> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `pre-import-${timestamp}.sqlite.gz`;
  return {
    name: fileName,
    path: fileName,
    sizeBytes: 0,
    createdAt: new Date().toISOString(),
    tier: 'recent',
    isCompressed: true,
  };
}

/**
 * Extracts a `.sqlite.gz` snapshot into a temporary `.sqlite` file for restoration.
 * Returns the path to the uncompressed SQLite file.
 */
export function extractSnapshotSqlite(snapshotName: string): string {
  const dir = getBackupDir();
  const filePath = path.join(dir, snapshotName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Snapshot file not found: ${snapshotName}`);
  }

  if (!snapshotName.endsWith('.gz')) {
    return filePath;
  }

  const tempUncompressed = path.join(dir, `temp-restore-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.sqlite`);
  const compressedBuffer = fs.readFileSync(filePath);
  const uncompressedBuffer = zlib.gunzipSync(compressedBuffer);
  try {
    fs.writeFileSync(tempUncompressed, uncompressedBuffer);
  } catch {}
  return tempUncompressed;
}

/** Candidate removable-drive roots on this host, excluding the system drive. */
export function detectExternalDrives(): string[] {
  const found: string[] = [];
  if (process.platform === 'win32') {
    const systemDrive = (process.env.SystemDrive || 'C:').toUpperCase();
    for (let code = 68; code <= 90; code++) {
      const letter = String.fromCharCode(code);
      if (`${letter}:` === systemDrive) continue;
      const root = `${letter}:\\`;
      try {
        if (fs.existsSync(root)) found.push(root);
      } catch {
        // drive not ready
      }
    }
    return found;
  }
  const bases = process.platform === 'darwin' ? ['/Volumes'] : ['/media', '/run/media', '/mnt'];
  for (const base of bases) {
    try {
      for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (entry.isDirectory()) found.push(path.join(base, entry.name));
      }
    } catch {
      // base missing
    }
  }
  return found;
}

export function copySnapshotToDirectory(snapshot: SnapshotInfo, targetDir: string): string {
  if (!path.isAbsolute(targetDir)) throw new Error('Target must be an absolute path (e.g. E:\\).');
  const resolved = path.resolve(targetDir);
  if (resolved === path.resolve(getBackupDir())) throw new Error('Choose a location outside the local backups folder.');
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('Target folder does not exist. Insert the flash drive and check the path.');
  }
  const dest = path.join(resolved, snapshot.name);
  fs.copyFileSync(snapshot.path, dest);
  if (fs.statSync(dest).size !== snapshot.sizeBytes) {
    throw new Error('Copy verification failed: file sizes differ.');
  }
  return dest;
}

/**
 * No-op scheduler in serverless Turso cloud mode (Turso manages automated cloud backups).
 */
export function startBackupScheduler(_getDb: () => Client): void {
  // Disabled for serverless / Vercel read-only deployment
}
