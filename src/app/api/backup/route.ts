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
} from "@/lib/db";

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

    // 1-Click SQLite WAL snapshot via VACUUM INTO ?
    if (action === "create_snapshot" || action === "snapshot") {
      const db = getDB();
      const snapshot = await executeScheduledBackup(db);
      writeAuditLog(db, "BACKUP_CREATED", {
        type: "sqlite_vacuum",
        snapshot: snapshot.name,
        sizeBytes: snapshot.sizeBytes,
      });
      return NextResponse.json({ success: true, snapshot });
    }

    // 1-Click SQLite WAL Truncate, Defrag & VACUUM Optimization
    if (action === "optimize" || action === "vacuum") {
      const db = getDB();
      const dbPath = path.join(process.cwd(), "data", "warehouse.db");
      const sizeBefore = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
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
        message: "Database defragmented and WAL truncated successfully.",
        sizeBefore,
        sizeAfter,
        savedBytes: Math.max(0, sizeBefore - sizeAfter),
      });
    }

    // 1-Click Physical Backup to USB Drive
    if (action === "export_usb") {
      const db = getDB();
      let snapshot = getLatestSnapshot();
      if (!snapshot) {
        snapshot = await executeScheduledBackup(db);
      }

      let targetDir = body.targetDir;
      if (!targetDir) {
        const detected = detectExternalDrives();
        if (detected.length > 0) {
          targetDir = detected[0];
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "No external USB drive detected. Please insert a USB flash drive or specify a target directory path.",
            },
            { status: 404 }
          );
        }
      }

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
