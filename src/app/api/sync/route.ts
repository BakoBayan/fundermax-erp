import { NextResponse } from "next/server";
import { getUnifiedDataFromDB, saveUnifiedDataToDB, getDatabaseHealth } from "@/lib/db";

export async function GET() {
  try {
    const data = getUnifiedDataFromDB();
    const health = getDatabaseHealth();
    return NextResponse.json({ ...data, health }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    console.error("[API GET /api/sync Error]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = saveUnifiedDataToDB(body);
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
