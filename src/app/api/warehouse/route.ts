import { NextResponse } from 'next/server';
import { getWarehouseOpsRawFromDB, saveWarehouseOpsRawToDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' };

export async function GET() {
  try {
    const raw = getWarehouseOpsRawFromDB();
    return NextResponse.json({ state: raw ? JSON.parse(raw) : null }, { headers: NO_STORE });
  } catch (error) {
    console.error('[API GET /api/warehouse Error]', error);
    return NextResponse.json({ state: null, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { state?: { updatedAt?: number } };
    if (!body || typeof body.state !== 'object' || body.state === null) {
      return NextResponse.json({ success: false, error: 'Missing state' }, { status: 400 });
    }

    // Last-write-wins guard: never overwrite a newer server document with an older one.
    const existingRaw = getWarehouseOpsRawFromDB();
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as { updatedAt?: number };
        if ((existing.updatedAt ?? 0) > (body.state.updatedAt ?? 0)) {
          return NextResponse.json({ success: false, stale: true, state: existing }, { headers: NO_STORE });
        }
      } catch {
        // corrupt existing document: allow overwrite
      }
    }

    saveWarehouseOpsRawToDB(JSON.stringify(body.state));
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[API POST /api/warehouse Error]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
