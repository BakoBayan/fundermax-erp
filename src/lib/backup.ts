/**
 * Crash-safe online backups for the node:sqlite (DatabaseSync) engine.
 *
 * Uses `VACUUM INTO ?`, which writes a consistent, defragmented copy of the live
 * database while it is in WAL mode (no torn writes, no copying of -wal/-shm files).
 * Snapshots are written to ./backups and only the newest MAX_SNAPSHOTS are kept.
 *
 * This module intentionally does not import db.ts (avoids a circular import);
 * the scheduler receives a database getter instead.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

export const MAX_SNAPSHOTS = 14;
const SNAPSHOT_RE = /^backup-[A-Za-z0-9_-]+\.sqlite$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SnapshotInfo {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string; // ISO
}

export function getBackupDir(): string {
  return path.join(process.cwd(), 'backups');
}

export function isValidSnapshotName(name: string): boolean {
  return SNAPSHOT_RE.test(name);
}

export function listSnapshots(): SnapshotInfo[] {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => SNAPSHOT_RE.test(f))
    .map((name) => {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      return { name, path: full, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1)); // newest first (ISO timestamps sort lexicographically)
}

export function getLatestSnapshot(): SnapshotInfo | null {
  return listSnapshots()[0] ?? null;
}

function pruneSnapshots(): void {
  const all = listSnapshots();
  for (const old of all.slice(MAX_SNAPSHOTS)) {
    try {
      fs.unlinkSync(old.path);
    } catch (err) {
      console.error('[Backup] Failed to prune', old.name, err);
    }
  }
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

/** Creates a timestamped snapshot with VACUUM INTO and keeps only the last 14. */
export async function executeScheduledBackup(db: DatabaseSync): Promise<SnapshotInfo> {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupDir, `backup-${timestamp}.sqlite`);

  db.prepare('VACUUM INTO ?').run(target);

  try {
    verifySnapshot(target);
  } catch (err) {
    try {
      fs.unlinkSync(target);
    } catch {
      // ignore
    }
    throw err;
  }

  pruneSnapshots();
  const st = fs.statSync(target);
  return { name: path.basename(target), path: target, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
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
 * Starts the automatic daily snapshot loop (once per server process).
 * A snapshot is taken shortly after start-up if the newest one is older than 24 h,
 * then the check repeats every hour.
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
        console.log(`[Backup] Snapshot written: ${info.name}`);
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
