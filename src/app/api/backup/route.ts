import { NextResponse } from "next/server";
import {
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  deleteDatabaseBackup,
  saveInventoryToDB,
} from "@/lib/db";

export async function GET() {
  try {
    const backups = listDatabaseBackups();
    return NextResponse.json({ success: true, backups });
  } catch (error) {
    console.error("[API GET /api/backup Error]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "create";

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
      // Factory reset: wipe active inventory
      saveInventoryToDB([], ["HPL"]);
      return NextResponse.json({ success: true, message: "Database wiped cleanly." });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[API POST /api/backup Error]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
