/**
 * Crash-safe online backups for the node:sqlite (DatabaseSync) engine.
 *
 * Uses `VACUUM INTO ?`, which writes a consistent, defragmented copy of the live
 * database while it is in WAL mode (no torn writes, no copying of -wal/-shm files).
 * Snapshots are immediately compressed with native GZIP (zlib.createGzip) to minimize disk footprint.
 *
 * Tiered Retention Schedule:
 * - Retain ALL intraday snapshots from the last 48 hours.
 * - Retain 1 daily snapshot per day for the last 30 days.
 * - Retain 1 weekly snapshot per week for up to 90 days.
 * - Automatically purge files outside this retention envelope.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

export type SnapshotTier = 'recent' | 'daily' | 'weekly';

export interface SnapshotInfo {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string; // ISO
  tier: SnapshotTier;
  isCompressed: boolean;
}

const SNAPSHOT_RE = /^backup-[A-Za-z0-9_-]+\.sqlite(\.gz)?$/;
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
  const match = name.match(/^backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z?)/);
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
}

export function getLatestSnapshot(): SnapshotInfo | null {
  return listSnapshots()[0] ?? null;
}

/**
 * Enforces Tiered Retention Schedule:
 * - Retain ALL intraday snapshots from the last 48 hours.
 * - Retain 1 daily snapshot per day for the last 30 days.
 * - Retain 1 weekly snapshot per week for up to 90 days.
 * - Automatically purge files outside this retention envelope.
 */
export function pruneSnapshots(): { kept: number; purged: number } {
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
      // 1. Retain ALL intraday snapshots from the last 48 hours
      shouldKeep = true;
    } else if (ageDays <= 30) {
      // 2. Retain 1 daily snapshot per day for the last 30 days
      const d = new Date(snapTime);
      const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (!seenDailyDays.has(dayKey)) {
        seenDailyDays.add(dayKey);
        shouldKeep = true;
      }
    } else if (ageDays <= 90) {
      // 3. Retain 1 weekly snapshot per week for up to 90 days
      const d = new Date(snapTime);
      const weekBucket = `${d.getUTCFullYear()}-W${Math.floor(d.getTime() / WEEK_MS)}`;
      if (!seenWeeklyWeeks.has(weekBucket)) {
        seenWeeklyWeeks.add(weekBucket);
        shouldKeep = true;
      }
    }
    // 4. Outside 90 days => shouldKeep = false

    if (shouldKeep) {
      kept++;
    } else {
      try {
        fs.unlinkSync(snap.path);
        purged++;
        console.log(`[Backup Prune] Purged snapshot outside retention envelope: ${snap.name}`);
      } catch (err) {
        console.error(`[Backup Prune] Failed to unlink ${snap.name}:`, err);
      }
    }
  }

  return { kept, purged };
}

function verifySnapshot(file: string): void {
  const check = new DatabaseSync(file);
  try {
    const row = check.prepare('PRAGMA quick_check;').get() as { quick_check?: string } | undefined;
    if (!row || String(row.quick_check).toLowerCase() !== 'ok') {
      throw new Error(`Snapshot integrity check failed: ${row?.quick_check ?? 'unknown'}`);
    }
  } finally {
    check.close();
  }
}

/**
 * Creates a timestamped SQLite snapshot with VACUUM INTO,
 * compresses it immediately into `.sqlite.gz` using zlib.createGzip(),
 * removes the uncompressed temp file, and enforces the Tiered Retention Schedule.
 */
export async function executeScheduledBackup(db: DatabaseSync): Promise<SnapshotInfo> {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempTarget = path.join(backupDir, `temp-${timestamp}.sqlite`);
  const gzTarget = path.join(backupDir, `backup-${timestamp}.sqlite.gz`);

  // 1. Write uncompressed snapshot via VACUUM INTO
  db.prepare('VACUUM INTO ?').run(tempTarget);

  // 2. Verify snapshot integrity before compression
  try {
    verifySnapshot(tempTarget);
  } catch (err) {
    try {
      if (fs.existsSync(tempTarget)) fs.unlinkSync(tempTarget);
    } catch {}
    throw err;
  }

  // 3. Built-in GZIP Compression using native zlib.createGzip()
  try {
    const source = fs.createReadStream(tempTarget);
    const destination = fs.createWriteStream(gzTarget);
    const gzip = zlib.createGzip({ level: 9 });
    await pipeline(source, gzip, destination);
  } finally {
    // 4. Clean up the uncompressed temp file immediately
    try {
      if (fs.existsSync(tempTarget)) fs.unlinkSync(tempTarget);
    } catch {}
  }

  // 5. Enforce Tiered Retention Schedule
  pruneSnapshots();

  const st = fs.statSync(gzTarget);
  return {
    name: path.basename(gzTarget),
    path: gzTarget,
    sizeBytes: st.size,
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
    return filePath; // already uncompressed .sqlite file
  }

  const tempUncompressed = path.join(dir, `temp-restore-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.sqlite`);
  const compressedBuffer = fs.readFileSync(filePath);
  const uncompressedBuffer = zlib.gunzipSync(compressedBuffer);
  fs.writeFileSync(tempUncompressed, uncompressedBuffer);
  return tempUncompressed;
}

/** Candidate removable-drive roots on this host (the server PC), excluding the system drive. */
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

interface SchedulerGlobal {
  bakoBackupTimer?: NodeJS.Timeout;
  bakoBackupRunning?: boolean;
}

/**
 * Starts the automatic snapshot loop (once per server process).
 * Runs every hour to check retention and take snapshots.
 */
export function startBackupScheduler(getDb: () => DatabaseSync): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const g = globalThis as unknown as SchedulerGlobal;
  if (g.bakoBackupTimer) return;

  const tick = async () => {
    if (g.bakoBackupRunning) return;
    g.bakoBackupRunning = true;
    try {
      const latest = getLatestSnapshot();
      if (!latest || Date.now() - new Date(latest.createdAt).getTime() > DAY_MS) {
        const info = await executeScheduledBackup(getDb());
        console.log(`[Backup] Automated snapshot written: ${info.name} (${info.sizeBytes} bytes, compressed)`);
      }
    } catch (err) {
      console.error('[Backup] Scheduled backup failed', err);
    } finally {
      g.bakoBackupRunning = false;
    }
  };

  setTimeout(() => void tick(), 30_000).unref();
  g.bakoBackupTimer = setInterval(() => void tick(), 60 * 60 * 1000);
  g.bakoBackupTimer.unref();
}
