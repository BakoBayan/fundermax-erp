import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getWarehouseOpsRawFromDB, saveWarehouseOpsRawToDB } from '@/lib/db';
import { EMPTY_WAREHOUSE_STATE, InboundShipment, WarehouseOpsState } from '@/types/warehouse';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' };

function stripAttachmentsFromState(state: WarehouseOpsState): WarehouseOpsState {
  return {
    ...state,
    shipments: Array.isArray(state.shipments)
      ? state.shipments.map((s) => ({
          ...s,
          hasAttachments: Boolean(s.hasAttachments || (Array.isArray(s.attachments) && s.attachments.length > 0)),
          attachments: [],
        }))
      : [],
  };
}

export async function GET(req: NextRequest) {
  noStore();
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');
    const since = sinceParam ? parseInt(sinceParam, 10) || 0 : 0;

    const raw = await getWarehouseOpsRawFromDB();
    if (!raw) {
      return NextResponse.json({ state: null }, { headers: NO_STORE });
    }

    const parsed = JSON.parse(raw) as WarehouseOpsState;
    if (since > 0 && (parsed?.updatedAt ?? 0) <= since) {
      return NextResponse.json({ state: null, unchanged: true, updatedAt: parsed?.updatedAt ?? 0 }, { headers: NO_STORE });
    }

    // Strictly omit attachments base64 strings from sync payload
    const lightState = stripAttachmentsFromState(parsed);
    return NextResponse.json({ state: lightState }, { headers: NO_STORE });
  } catch (error) {
    console.error('[API GET /api/warehouse Error]', error);
    return NextResponse.json({ state: null, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      delta?: boolean;
      updatedAt?: number;
      upsertedShipments?: InboundShipment[];
      deletedShipmentIds?: string[];
      locations?: WarehouseOpsState['locations'];
      allocations?: WarehouseOpsState['allocations'];
      transfers?: WarehouseOpsState['transfers'];
      state?: WarehouseOpsState;
    };

    const existingRaw = await getWarehouseOpsRawFromDB();
    let existing: WarehouseOpsState = EMPTY_WAREHOUSE_STATE;
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw) as WarehouseOpsState;
      } catch {
        existing = EMPTY_WAREHOUSE_STATE;
      }
    }

    // Granular Delta Push Path
    if (body?.delta) {
      const updatedAt = body.updatedAt ?? Date.now();
      const existingShipments: InboundShipment[] = Array.isArray(existing.shipments) ? [...existing.shipments] : [];
      const existingById = new Map<string, InboundShipment>();
      for (const sh of existingShipments) {
        existingById.set(sh.id, sh);
      }

      if (Array.isArray(body.upsertedShipments)) {
        for (const incoming of body.upsertedShipments) {
          const prev = existingById.get(incoming.id);
          const hasIncomingAttachments = Array.isArray(incoming.attachments) && incoming.attachments.length > 0;
          const preservedAttachments =
            hasIncomingAttachments
              ? incoming.attachments
              : prev?.attachments && prev.attachments.length > 0 && incoming.hasAttachments !== false
              ? prev.attachments
              : incoming.attachments ?? [];

          const merged: InboundShipment = {
            ...(prev || {}),
            ...incoming,
            attachments: preservedAttachments,
            hasAttachments: Boolean(preservedAttachments && preservedAttachments.length > 0),
          };
          existingById.set(incoming.id, merged);
        }
      }

      if (Array.isArray(body.deletedShipmentIds) && body.deletedShipmentIds.length > 0) {
        const nowIso = new Date().toISOString();
        for (const delId of body.deletedShipmentIds) {
          const prev = existingById.get(delId);
          if (prev) {
            existingById.set(delId, {
              ...prev,
              isDeleted: 1,
              deletedAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }
      }

      // Preserve order: newest upserts at front if new, otherwise in-place
      const seen = new Set<string>();
      const finalShipments: InboundShipment[] = [];
      if (Array.isArray(body.upsertedShipments)) {
        for (const incoming of body.upsertedShipments) {
          if (!existingShipments.some((s) => s.id === incoming.id)) {
            const m = existingById.get(incoming.id);
            if (m && !seen.has(m.id)) {
              finalShipments.push(m);
              seen.add(m.id);
            }
          }
        }
      }
      for (const sh of existingShipments) {
        if (!seen.has(sh.id)) {
          const m = existingById.get(sh.id);
          if (m) {
            finalShipments.push(m);
            seen.add(sh.id);
          }
        }
      }

      const nextState: WarehouseOpsState = {
        shipments: finalShipments,
        locations: Array.isArray(body.locations) ? body.locations : existing.locations || EMPTY_WAREHOUSE_STATE.locations,
        allocations: Array.isArray(body.allocations) ? body.allocations : existing.allocations || [],
        transfers: Array.isArray(body.transfers) ? body.transfers : existing.transfers || [],
        updatedAt: Math.max(updatedAt, existing.updatedAt || 0),
      };

      await saveWarehouseOpsRawToDB(JSON.stringify(nextState), nextState.updatedAt);
      return NextResponse.json({ success: true, updatedAt: nextState.updatedAt }, { headers: NO_STORE });
    }

    // Legacy Full State Path
    if (!body || typeof body.state !== 'object' || body.state === null) {
      return NextResponse.json({ success: false, error: 'Missing state' }, { status: 400 });
    }

    if ((existing.updatedAt ?? 0) > (body.state.updatedAt ?? 0)) {
      return NextResponse.json(
        { success: false, stale: true, state: stripAttachmentsFromState(existing) },
        { headers: NO_STORE }
      );
    }

    // Preserve attachments on any shipments whose attachments were stripped in the client
    const prevById = new Map<string, InboundShipment>();
    for (const sh of existing.shipments || []) {
      prevById.set(sh.id, sh);
    }
    const mergedState: WarehouseOpsState = {
      ...body.state,
      shipments: (body.state.shipments || []).map((sh) => {
        const prev = prevById.get(sh.id);
        const hasIncoming = Array.isArray(sh.attachments) && sh.attachments.length > 0;
        const attachments =
          hasIncoming
            ? sh.attachments
            : prev?.attachments && prev.attachments.length > 0
            ? prev.attachments
            : [];
        return {
          ...sh,
          attachments,
          hasAttachments: Boolean(attachments && attachments.length > 0),
        };
      }),
    };

    await saveWarehouseOpsRawToDB(JSON.stringify(mergedState), mergedState.updatedAt ?? Date.now());
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[API POST /api/warehouse Error]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
