'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  DEFAULT_LOCATIONS,
  EMPTY_WAREHOUSE_STATE,
  InboundItem,
  InboundShipment,
  InboundStatus,
  StockAllocation,
  StockTransfer,
  StorageLocation,
  TRANSFER_REASONS,
  TransferReason,
  WarehouseOpsState,
  WORKSHOP_LOCATION_ID,
  formatLocationLabel,
  SupplierPaymentStatus,
} from '../types/warehouse';

const STORAGE_KEY = 'bako_warehouse_ops_v1';
const DIRTY_KEY = 'bako_warehouse_ops_dirty';

type Listener = () => void;

let current: WarehouseOpsState = EMPTY_WAREHOUSE_STATE;
let initialized = false;
let serverReachable = true;
const listeners = new Set<Listener>();

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function normalize(raw: unknown): WarehouseOpsState {
  if (!raw || typeof raw !== 'object') return EMPTY_WAREHOUSE_STATE;
  const r = raw as Partial<WarehouseOpsState>;
  const locations = Array.isArray(r.locations) && r.locations.length > 0 ? r.locations : DEFAULT_LOCATIONS;
  const hasWorkshop = locations.some((l) => l.id === WORKSHOP_LOCATION_ID);
  return {
    shipments: Array.isArray(r.shipments) ? r.shipments : [],
    locations: hasWorkshop ? locations : [...locations, DEFAULT_LOCATIONS[DEFAULT_LOCATIONS.length - 1]],
    allocations: Array.isArray(r.allocations) ? r.allocations : [],
    transfers: Array.isArray(r.transfers) ? r.transfers : [],
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0,
  };
}

function emit(): void {
  listeners.forEach((l) => l());
}

function persistLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // storage full or unavailable: server copy remains the source of truth
  }
}

async function pushToServer(): Promise<void> {
  try {
    localStorage.setItem(DIRTY_KEY, '1');
    const res = await fetch('/api/warehouse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: current }),
    });
    const data = (await res.json()) as { success?: boolean; stale?: boolean; state?: unknown };
    serverReachable = true;
    if (data.stale && data.state) {
      current = normalize(data.state);
      persistLocal();
      emit();
    }
    if (data.success || data.stale) localStorage.removeItem(DIRTY_KEY);
  } catch {
    serverReachable = false; // offline: dirty flag keeps the pending write for the next sync
  }
}

async function syncFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/warehouse', { cache: 'no-store' });
    const data = (await res.json()) as { state?: unknown };
    serverReachable = true;
    const server = data.state ? normalize(data.state) : null;
    const dirty = localStorage.getItem(DIRTY_KEY) === '1';
    if (server && (!dirty || server.updatedAt > current.updatedAt)) {
      if (server.updatedAt >= current.updatedAt) {
        current = server;
        persistLocal();
        emit();
        return;
      }
    }
    if (dirty || (!server && current.updatedAt > 0) || (server && current.updatedAt > server.updatedAt)) {
      await pushToServer();
    }
  } catch {
    serverReachable = false;
  }
}

function init(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) current = normalize(JSON.parse(raw));
  } catch {
    current = EMPTY_WAREHOUSE_STATE;
  }
  emit();
  void syncFromServer();
  window.addEventListener('online', () => void syncFromServer());
  window.addEventListener('focus', () => void syncFromServer());
}

function commit(mutator: (s: WarehouseOpsState) => WarehouseOpsState): void {
  current = { ...mutator(current), updatedAt: Date.now() };
  persistLocal();
  emit();
  void pushToServer();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): WarehouseOpsState => current;
const getServerSnapshot = (): WarehouseOpsState => EMPTY_WAREHOUSE_STATE;

export type OpResult = { ok: true } | { ok: false; error: string };

export interface NewShipmentInput {
  supplier: string;
  supplierContact: string;
  originCountry: string;
  arrivalDate: string;
  status: InboundStatus;
  notes: string;
  items: Array<Omit<InboundItem, 'id'>>;
  invoiceCurrency?: 'EUR' | 'USD';
  totalInvoiceAmount?: number;
  amountPaidToSupplier?: number;
}

function nextBatchCode(shipments: InboundShipment[], arrivalDate: string): string {
  const year = (arrivalDate && arrivalDate.slice(0, 4)) || String(new Date().getFullYear());
  const prefix = `SHP-${year}-`;
  let max = 0;
  for (const s of shipments) {
    if (s.batchCode.startsWith(prefix)) {
      const n = parseInt(s.batchCode.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export function allocatedQtyForItem(allocations: StockAllocation[], shipmentId: string, itemId: string): number {
  return allocations
    .filter((a) => a.shipmentId === shipmentId && a.itemId === itemId)
    .reduce((sum, a) => sum + a.quantity, 0);
}

export function useWarehouseOps() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    init();
  }, []);

  const locationLabel = useCallback(
    (id: string | null): string => {
      if (!id) return 'Supplier Delivery';
      const loc = state.locations.find((l) => l.id === id);
      return loc ? formatLocationLabel(loc) : 'Unknown Location';
    },
    [state.locations]
  );

  const addShipment = useCallback((input: NewShipmentInput): OpResult => {
    if (!input.supplier.trim()) return { ok: false, error: 'Supplier name is required.' };
    const validItems = input.items.filter((i) => i.description.trim());
    if (validItems.length === 0) return { ok: false, error: 'Add at least one received item.' };
    const now = new Date().toISOString();
    const invTotal = Math.max(0, Number(input.totalInvoiceAmount) || 0);
    const paid = Math.max(0, Number(input.amountPaidToSupplier) || 0);
    const debt = Math.max(0, Math.round((invTotal - paid) * 100) / 100);
    const paymentStatus: SupplierPaymentStatus = invTotal <= 0 ? 'PAID' : debt <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL_DEBT' : 'UNPAID';

    commit((s) => {
      const shipment: InboundShipment = {
        id: uid('inb'),
        batchCode: nextBatchCode(s.shipments, input.arrivalDate),
        supplier: input.supplier.trim(),
        supplierName: input.supplier.trim(),
        supplierContact: input.supplierContact.trim(),
        originCountry: input.originCountry.trim() || 'Austria (EU)',
        arrivalDate: input.arrivalDate,
        status: input.status,
        notes: input.notes.trim(),
        items: validItems.map((i) => ({
          id: uid('itm'),
          description: i.description.trim(),
          unit: i.unit.trim() || 'pcs',
          expectedQty: Math.max(0, i.expectedQty),
          receivedQty: Math.max(0, i.receivedQty),
        })),
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
        deletedAt: null,
        invoiceCurrency: input.invoiceCurrency || 'EUR',
        totalInvoiceAmount: invTotal,
        amountPaidToSupplier: paid,
        supplierDebtRemaining: debt,
        paymentStatus,
      };
      return { ...s, shipments: [shipment, ...s.shipments] };
    });
    return { ok: true };
  }, []);

  const setShipmentStatus = useCallback((id: string, status: InboundStatus): void => {
    commit((s) => ({
      ...s,
      shipments: s.shipments.map((sh) =>
        sh.id === id
          ? {
              ...sh,
              status,
              updatedAt: new Date().toISOString(),
              // When goods are marked received, assume the expected quantity arrived unless counted already.
              items:
                (status === 'received' || status === 'inspected')
                  ? sh.items.map((it) => (it.receivedQty > 0 ? it : { ...it, receivedQty: it.expectedQty }))
                  : sh.items,
            }
          : sh
      ),
    }));
  }, []);

  const setReceivedQty = useCallback((shipmentId: string, itemId: string, qty: number): void => {
    commit((s) => ({
      ...s,
      shipments: s.shipments.map((sh) =>
        sh.id === shipmentId
          ? {
              ...sh,
              updatedAt: new Date().toISOString(),
              items: sh.items.map((it) => (it.id === itemId ? { ...it, receivedQty: Math.max(0, qty) } : it)),
            }
          : sh
      ),
    }));
  }, []);

  /** Soft delete only: the record stays in the store flagged is_deleted for admin review. */
  const softDeleteShipment = useCallback((id: string): void => {
    commit((s) => ({
      ...s,
      shipments: s.shipments.map((sh) =>
        sh.id === id ? { ...sh, isDeleted: 1, deletedAt: new Date().toISOString() } : sh
      ),
    }));
  }, []);

  const restoreShipment = useCallback((id: string): void => {
    commit((s) => ({
      ...s,
      shipments: s.shipments.map((sh) => (sh.id === id ? { ...sh, isDeleted: 0, deletedAt: null } : sh)),
    }));
  }, []);

  const recordSupplierPayment = useCallback((id: string, amount: number): OpResult => {
    if (amount <= 0) return { ok: false, error: 'Payment amount must be greater than zero.' };
    commit((s) => ({
      ...s,
      shipments: s.shipments.map((sh) => {
        if (sh.id !== id) return sh;
        const total = Number(sh.totalInvoiceAmount) || 0;
        const currentPaid = Number(sh.amountPaidToSupplier) || 0;
        const newPaid = Math.round((currentPaid + amount) * 100) / 100;
        const remaining = Math.max(0, Math.round((total - newPaid) * 100) / 100);
        const status: SupplierPaymentStatus = total <= 0 ? 'PAID' : remaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL_DEBT' : 'UNPAID';
        return {
          ...sh,
          amountPaidToSupplier: newPaid,
          supplierDebtRemaining: remaining,
          paymentStatus: status,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    return { ok: true };
  }, []);

  const addLocation = useCallback(
    (warehouse: string, rack: string, row: string): OpResult => {
      if (!warehouse.trim() || !rack.trim()) return { ok: false, error: 'Warehouse and rack are required.' };
      const label = formatLocationLabel({ warehouse: warehouse.trim(), rack: rack.trim(), row: row.trim() });
      if (current.locations.some((l) => formatLocationLabel(l).toLowerCase() === label.toLowerCase())) {
        return { ok: false, error: 'This location already exists.' };
      }
      commit((s) => ({
        ...s,
        locations: [
          ...s.locations,
          { id: uid('loc'), warehouse: warehouse.trim(), rack: rack.trim(), row: row.trim(), kind: 'storage' },
        ],
      }));
      return { ok: true };
    },
    []
  );

  const removeLocation = useCallback((id: string): OpResult => {
    const loc = current.locations.find((l) => l.id === id);
    if (!loc) return { ok: false, error: 'Location not found.' };
    if (loc.kind === 'workshop') return { ok: false, error: 'The workshop queue cannot be removed.' };
    if (current.allocations.some((a) => a.locationId === id && a.quantity > 0)) {
      return { ok: false, error: 'Move all stock out of this location first.' };
    }
    commit((s) => ({ ...s, locations: s.locations.filter((l) => l.id !== id) }));
    return { ok: true };
  }, []);

  const logTransfer = (
    userName: string,
    base: Omit<StockTransfer, 'id' | 'timestamp' | 'userName' | 'fromLabel' | 'toLabel'>,
    s: WarehouseOpsState
  ): StockTransfer => {
    const label = (id: string | null) => {
      if (!id) return 'Supplier Delivery';
      const l = s.locations.find((x) => x.id === id);
      return l ? formatLocationLabel(l) : 'Unknown Location';
    };
    return {
      ...base,
      id: uid('trf'),
      timestamp: new Date().toISOString(),
      userName,
      fromLabel: label(base.fromLocationId),
      toLabel: label(base.toLocationId),
    };
  };

  /** Put-away: place received goods from an inbound shipment into a physical location. */
  const allocateFromShipment = useCallback(
    (shipmentId: string, itemId: string, locationId: string, qty: number, userName: string): OpResult => {
      const sh = current.shipments.find((x) => x.id === shipmentId);
      const item = sh?.items.find((i) => i.id === itemId);
      if (!sh || !item) return { ok: false, error: 'Shipment item not found.' };
      if (!current.locations.some((l) => l.id === locationId)) return { ok: false, error: 'Choose a location.' };
      if (!(qty > 0)) return { ok: false, error: 'Quantity must be greater than zero.' };
      const remaining = item.receivedQty - allocatedQtyForItem(current.allocations, shipmentId, itemId);
      if (qty > remaining) return { ok: false, error: `Only ${remaining} ${item.unit} left to allocate.` };

      commit((s) => {
        const now = new Date().toISOString();
        const existing = s.allocations.find(
          (a) => a.shipmentId === shipmentId && a.itemId === itemId && a.locationId === locationId
        );
        const allocations = existing
          ? s.allocations.map((a) => (a.id === existing.id ? { ...a, quantity: a.quantity + qty, updatedAt: now } : a))
          : [
              ...s.allocations,
              {
                id: uid('alc'),
                itemName: item.description,
                unit: item.unit,
                quantity: qty,
                locationId,
                shipmentId,
                itemId,
                batchCode: sh.batchCode,
                updatedAt: now,
              } satisfies StockAllocation,
            ];
        const entry = logTransfer(
          userName,
          {
            itemName: item.description,
            unit: item.unit,
            quantity: qty,
            fromLocationId: null,
            toLocationId: locationId,
            reason: 'Restock',
            note: `Put-away from ${sh.batchCode}`,
            batchCode: sh.batchCode,
          },
          s
        );
        return { ...s, allocations, transfers: [entry, ...s.transfers] };
      });
      return { ok: true };
    },
    []
  );

  /** Existing stock that predates the shipment log. Always recorded as an audit adjustment. */
  const addManualAllocation = useCallback(
    (itemName: string, unit: string, qty: number, locationId: string, userName: string): OpResult => {
      if (!itemName.trim()) return { ok: false, error: 'Item name is required.' };
      if (!(qty > 0)) return { ok: false, error: 'Quantity must be greater than zero.' };
      if (!current.locations.some((l) => l.id === locationId)) return { ok: false, error: 'Choose a location.' };
      commit((s) => {
        const now = new Date().toISOString();
        const name = itemName.trim();
        const u = unit.trim() || 'pcs';
        const existing = s.allocations.find(
          (a) => a.shipmentId === null && a.itemName.toLowerCase() === name.toLowerCase() && a.unit === u && a.locationId === locationId
        );
        const allocations = existing
          ? s.allocations.map((a) => (a.id === existing.id ? { ...a, quantity: a.quantity + qty, updatedAt: now } : a))
          : [
              ...s.allocations,
              {
                id: uid('alc'),
                itemName: name,
                unit: u,
                quantity: qty,
                locationId,
                shipmentId: null,
                itemId: null,
                batchCode: null,
                updatedAt: now,
              } satisfies StockAllocation,
            ];
        const entry = logTransfer(
          userName,
          {
            itemName: name,
            unit: u,
            quantity: qty,
            fromLocationId: null,
            toLocationId: locationId,
            reason: 'Audit Adjustment',
            note: 'Opening stock recorded manually',
            batchCode: null,
          },
          s
        );
        return { ...s, allocations, transfers: [entry, ...s.transfers] };
      });
      return { ok: true };
    },
    []
  );

  /** Internal transfer between locations. A valid audit reason is mandatory. */
  const transferStock = useCallback(
    (
      allocationId: string,
      toLocationId: string,
      qty: number,
      reason: TransferReason | '',
      note: string,
      userName: string
    ): OpResult => {
      if (!reason || !TRANSFER_REASONS.includes(reason)) return { ok: false, error: 'An audit reason is required.' };
      const src = current.allocations.find((a) => a.id === allocationId);
      if (!src) return { ok: false, error: 'Source stock not found.' };
      if (!current.locations.some((l) => l.id === toLocationId)) return { ok: false, error: 'Choose a destination.' };
      if (toLocationId === src.locationId) return { ok: false, error: 'Destination must differ from the source.' };
      if (!(qty > 0)) return { ok: false, error: 'Quantity must be greater than zero.' };
      if (qty > src.quantity) return { ok: false, error: `Only ${src.quantity} ${src.unit} available at the source.` };

      commit((s) => {
        const now = new Date().toISOString();
        let allocations = s.allocations
          .map((a) => (a.id === src.id ? { ...a, quantity: a.quantity - qty, updatedAt: now } : a))
          .filter((a) => a.quantity > 0);
        const dest = allocations.find(
          (a) =>
            a.locationId === toLocationId &&
            a.itemName === src.itemName &&
            a.unit === src.unit &&
            a.shipmentId === src.shipmentId &&
            a.itemId === src.itemId
        );
        if (dest) {
          allocations = allocations.map((a) => (a.id === dest.id ? { ...a, quantity: a.quantity + qty, updatedAt: now } : a));
        } else {
          allocations = [
            ...allocations,
            { ...src, id: uid('alc'), quantity: qty, locationId: toLocationId, updatedAt: now },
          ];
        }
        const entry = logTransfer(
          userName,
          {
            itemName: src.itemName,
            unit: src.unit,
            quantity: qty,
            fromLocationId: src.locationId,
            toLocationId,
            reason,
            note: note.trim(),
            batchCode: src.batchCode,
          },
          s
        );
        return { ...s, allocations, transfers: [entry, ...s.transfers] };
      });
      return { ok: true };
    },
    []
  );

  const activeShipments = useMemo(() => state.shipments.filter((s) => !s.isDeleted), [state.shipments]);
  const deletedShipments = useMemo(() => state.shipments.filter((s) => s.isDeleted), [state.shipments]);

  return {
    ...state,
    activeShipments,
    deletedShipments,
    serverReachable,
    locationLabel,
    addShipment,
    setShipmentStatus,
    setReceivedQty,
    softDeleteShipment,
    restoreShipment,
    addLocation,
    removeLocation,
    allocateFromShipment,
    addManualAllocation,
    transferStock,
    recordSupplierPayment,
  };
}

export type { StorageLocation };
