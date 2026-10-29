import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import {
  getUnifiedDataFromDB,
  saveUnifiedDataToDB,
  getDatabaseHealth,
  withActor,
  writeAuditLog,
  getDB,
} from "@/lib/db";
import type { UserModulePermissions, UserRole } from "@/types/inventory";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  noStore();
  try {
    const data = await getUnifiedDataFromDB();
    const health = await getDatabaseHealth();
    return NextResponse.json(
      { ...data, health },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("[API GET /api/sync Error]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = req.headers.get("x-user-name") || "System";
    const role = (req.headers.get("x-user-role") || "Staff") as UserRole;
    let permissions: Partial<UserModulePermissions> = {};
    try {
      const permsHeader = req.headers.get("x-user-permissions");
      if (permsHeader) permissions = JSON.parse(permsHeader);
    } catch {}

    const body = await req.json();

    // Priority 1: Server-Side Enforcement of Granular Permissions
    // Viewer role without explicit permissions is strictly forbidden from mutations
    if (role === "Viewer" && (!permissions || Object.keys(permissions).length === 0)) {
      const db = getDB();
      await writeAuditLog(db, "PERMISSION_VIOLATION", {
        actor,
        role,
        attempt: "Viewer attempted mutation",
        payloadKeys: Object.keys(body),
      });
      return NextResponse.json(
        { success: false, error: "403 Forbidden: View-only accounts cannot modify data." },
        { status: 403 }
      );
    }

    // Check sales permissions
    if (body.transactions && Array.isArray(body.transactions)) {
      if (
        permissions.canEditSales === false &&
        permissions.canCreateSales === false &&
        role !== "Admin"
      ) {
        const db = getDB();
        await writeAuditLog(db, "PERMISSION_VIOLATION", {
          actor,
          role,
          attempt: "Unauthorized sales mutation",
        });
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Account lacks sales edit/create permissions." },
          { status: 403 }
        );
      }
    }

    // Check panels/cutting orders permissions
    if (body.materials && Array.isArray(body.materials)) {
      if (
        permissions.canEditPanels === false &&
        permissions.canCreatePanels === false &&
        role !== "Admin"
      ) {
        const db = getDB();
        await writeAuditLog(db, "PERMISSION_VIOLATION", {
          actor,
          role,
          attempt: "Unauthorized panels mutation",
        });
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Account lacks panel edit/create permissions." },
          { status: 403 }
        );
      }
    }

    // Check warehouse permissions
    if (body.products || body.shipments) {
      if (
        permissions.canManageStock === false &&
        permissions.canManageShipments === false &&
        role !== "Admin"
      ) {
        const db = getDB();
        await writeAuditLog(db, "PERMISSION_VIOLATION", {
          actor,
          role,
          attempt: "Unauthorized warehouse stock mutation",
        });
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Account lacks warehouse management permissions." },
          { status: 403 }
        );
      }
    }

    const result = await withActor(actor, () => saveUnifiedDataToDB(body));
    revalidatePath('/', 'layout');
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[API POST /api/sync Error]", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
