import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getDB,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  deleteDatabaseBackup,
  saveInventoryToDB,
  executeScheduledBackup,
  listSnapshots,
  getLatestSnapshot,
  detectExternalDrives,
  copySnapshotToDirectory,
  getBackupDir,
  isValidSnapshotName,
  writeAuditLog,
  getDatabasePath,
} from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const downloadFile = searchParams.get("download");

    // Direct physical snapshot download
    if (downloadFile) {
      if (!isValidSnapshotName(downloadFile)) {
        return NextResponse.json({ success: false, error: "Invalid snapshot filename" }, { status: 400 });
      }
      const filePath = path.join(getBackupDir(), downloadFile);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: "Snapshot file not found" }, { status: 404 });
      }
      const fileBuffer = fs.readFileSync(filePath);
      const isGz = downloadFile.endsWith(".gz");
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": isGz ? "application/gzip" : "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${downloadFile}"`,
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (action === "detect_usb") {
      const drives = detectExternalDrives();
      return NextResponse.json({ success: true, drives });
    }

    if (action === "snapshots") {
      const snapshots = listSnapshots();
      return NextResponse.json({ success: true, snapshots });
    }

    const backups = listDatabaseBackups();
    const snapshots = listSnapshots();
    const drives = detectExternalDrives();

    return NextResponse.json({
      success: true,
      backups,
      snapshots,
      drives,
    });
  } catch (error) {
    console.error("[API GET /api/backup Error]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "create";

    // 1-Click SQLite WAL snapshot via VACUUM INTO ? (Strictly read-only against source)
    if (action === "create_snapshot" || action === "snapshot") {
      try {
        const db = getDB();
        const snapshot = await executeScheduledBackup(db);
        writeAuditLog(db, "BACKUP_CREATED", {
          type: "sqlite_vacuum",
          snapshot: snapshot.name,
          sizeBytes: snapshot.sizeBytes,
        });
        return NextResponse.json({ success: true, snapshot });
      } catch (snapErr: any) {
        console.error("[Snapshot Error]", snapErr);
        const errMsg = String(snapErr?.message || snapErr);
        if (errMsg.includes("busy") || errMsg.includes("locked")) {
          return NextResponse.json(
            { success: false, error: "Database Busy: SQLite database is currently locked. Please retry in a moment." },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: `Snapshot creation failed: ${errMsg}` }, { status: 500 });
      }
    }

    // 1-Click SQLite WAL PASSIVE Checkpoint, Defrag & VACUUM Optimization (Safe & Non-Destructive)
    if (action === "optimize" || action === "vacuum") {
      try {
        const db = getDB();
        const dbPath = getDatabasePath();
        const sizeBefore = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

        // Run non-destructive PASSIVE checkpoint first (does not block active concurrent readers/writers)
        try {
          db.exec("PRAGMA wal_checkpoint(PASSIVE);");
        } catch (cpErr) {
          console.warn("[Optimize] PASSIVE checkpoint notice:", cpErr);
        }

        // Execute safe defragmentation and SQLite internal optimizer
        db.exec("VACUUM;");
        db.exec("PRAGMA optimize;");

        const sizeAfter = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
        writeAuditLog(db, "DB_OPTIMIZED", {
          sizeBefore,
          sizeAfter,
          savedBytes: Math.max(0, sizeBefore - sizeAfter),
        });

        return NextResponse.json({
          success: true,
          message: "Database defragmented and optimized successfully.",
          sizeBefore,
          sizeAfter,
          savedBytes: Math.max(0, sizeBefore - sizeAfter),
        });
      } catch (optErr: any) {
        console.error("[Optimize Error]", optErr);
        const errMsg = String(optErr?.message || optErr);
        if (errMsg.includes("busy") || errMsg.includes("locked")) {
          return NextResponse.json(
            { success: false, error: "Database Busy: another process is accessing SQLite. Please retry in a few moments." },
            { status: 503 }
          );
        }
        return NextResponse.json({ success: false, error: `Database optimization error: ${errMsg}` }, { status: 500 });
      }
    }

    // 1-Click Physical Backup to USB Drive with Auto-Fallback Download
    if (action === "export_usb") {
      const db = getDB();
      let snapshot = getLatestSnapshot();
      if (!snapshot) {
        try {
          snapshot = await executeScheduledBackup(db);
        } catch (snapErr: any) {
          return NextResponse.json(
            { success: false, error: `Failed to create snapshot for USB export: ${snapErr?.message || snapErr}` },
            { status: 500 }
          );
        }
      }

      let targetDir = body.targetDir;
      if (!targetDir) {
        const detected = detectExternalDrives();
        if (detected.length > 0) {
          targetDir = detected[0];
        } else {
          // No drive detected -> Fallback to serving browser download
          return NextResponse.json({
            success: false,
            fallbackDownload: true,
            snapshot,
            message: "No external USB drive detected. Downloading backup directly to your device.",
          });
        }
      }

      // Verify drive is writable before copying
      try {
        const resolved = path.resolve(targetDir);
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
          throw new Error("Target folder not found. Drive may be disconnected.");
        }

        // Test writeability
        const testFile = path.join(resolved, `.bako-check-${Date.now()}.tmp`);
        fs.writeFileSync(testFile, "ok");
        try { fs.unlinkSync(testFile); } catch {}

        // Copy snapshot
        const destPath = copySnapshotToDirectory(snapshot, targetDir);
        writeAuditLog(db, "BACKUP_EXPORTED_USB", {
          snapshot: snapshot.name,
          targetDir,
          destination: destPath,
          sizeBytes: snapshot.sizeBytes,
        });

        return NextResponse.json({
          success: true,
          message: `Physical backup snapshot exported successfully to USB: ${destPath}`,
          destination: destPath,
          snapshot,
        });
      } catch (usbErr: any) {
        console.warn("[Export USB Warning] Physical copy failed, initiating browser download fallback:", usbErr);
        return NextResponse.json({
          success: false,
          fallbackDownload: true,
          snapshot,
          error: `Could not write to USB drive (${usbErr?.message || usbErr}). Fallback download initiated.`,
        });
      }
    }

    // Legacy JSON Backups Support
    if (action === "create") {
      const type = body.type || "manual";
      const label = body.label;
      const backup = createDatabaseBackup(type, label);
      return NextResponse.json({ success: true, backup });
    }

    if (action === "restore") {
      const backupId = body.backupId;
      const snapshot = body.snapshot;
      const target = snapshot || backupId;
      if (!target) {
        return NextResponse.json({ success: false, error: "Missing backupId or snapshot" }, { status: 400 });
      }
      const result = restoreDatabaseBackup(target);
      return NextResponse.json(result);
    }

    if (action === "delete") {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ success: false, error: "Missing backupId" }, { status: 400 });
      }
      const success = deleteDatabaseBackup(backupId);
      return NextResponse.json({ success });
    }

    if (action === "wipe") {
      saveInventoryToDB([], ["HPL"]);
      return NextResponse.json({ success: true, message: "Database wiped cleanly." });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[API POST /api/backup Error]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
