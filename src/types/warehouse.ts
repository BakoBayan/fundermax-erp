// Division 03: Incoming company shipments, location allocation and stock transfers.

export type InboundStatus = 'pending' | 'customs' | 'received' | 'inspected';

export const INBOUND_STATUS_ORDER: InboundStatus[] = ['pending', 'customs', 'received', 'inspected'];

export type TransferReason = 'Restock' | 'Workshop Transfer' | 'Damage Relocation' | 'Audit Adjustment';

export const TRANSFER_REASONS: TransferReason[] = [
  'Restock',
  'Workshop Transfer',
  'Damage Relocation',
  'Audit Adjustment',
];

export interface InboundItem {
  id: string;
  description: string;
  unit: string;
  expectedQty: number;
  receivedQty: number;
}

export type SupplierPaymentStatus = 'PAID' | 'PARTIAL_DEBT' | 'UNPAID';

export interface InboundShipment {
  id: string;
  batchCode: string; // e.g. SHP-2026-001 or FMAX-2026-01
  supplier: string; // e.g. FunderMax GmbH
  supplierName?: string; // alias/preset to "FunderMax GmbH"
  supplierContact: string;
  originCountry: string;
  arrivalDate: string; // YYYY-MM-DD
  status: InboundStatus;
  items: InboundItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: 0 | 1;
  deletedAt: string | null;

  // v1.6 Supplier Payables (Accounts Payable / FunderMax GmbH)
  invoiceCurrency?: 'EUR' | 'USD';
  totalInvoiceAmount?: number;
  amountPaidToSupplier?: number;
  supplierDebtRemaining?: number;
  paymentStatus?: SupplierPaymentStatus;
}

export function computeSupplierDebtRemaining(shipment: {
  totalInvoiceAmount?: number;
  amountPaidToSupplier?: number;
}): number {
  const total = Number(shipment.totalInvoiceAmount) || 0;
  const paid = Number(shipment.amountPaidToSupplier) || 0;
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

export function computeSupplierPaymentStatus(
  total: number,
  paid: number
): SupplierPaymentStatus {
  if (total <= 0) return 'PAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL_DEBT';
  return 'UNPAID';
}

export type LocationKind = 'storage' | 'workshop';

export interface StorageLocation {
  id: string;
  warehouse: string; // e.g. Warehouse A
  rack: string; // e.g. Rack 04
  row: string; // e.g. Row 2
  kind: LocationKind;
}

export interface StockAllocation {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  locationId: string;
  shipmentId: string | null;
  itemId: string | null;
  batchCode: string | null;
  updatedAt: string;
}

export interface StockTransfer {
  id: string;
  timestamp: string;
  userName: string;
  itemName: string;
  unit: string;
  quantity: number;
  fromLocationId: string | null; // null = initial put-away from a received shipment
  toLocationId: string;
  fromLabel: string; // snapshot so history survives location edits
  toLabel: string;
  reason: TransferReason;
  note: string;
  batchCode: string | null;
}

export interface WarehouseOpsState {
  shipments: InboundShipment[];
  locations: StorageLocation[];
  allocations: StockAllocation[];
  transfers: StockTransfer[];
  updatedAt: number;
}

export const WORKSHOP_LOCATION_ID = 'loc-workshop-cnc';

export const DEFAULT_LOCATIONS: StorageLocation[] = [
  { id: 'loc-wh-a-r01-1', warehouse: 'Warehouse A', rack: 'Rack 01', row: 'Row 1', kind: 'storage' },
  { id: 'loc-wh-a-r01-2', warehouse: 'Warehouse A', rack: 'Rack 01', row: 'Row 2', kind: 'storage' },
  { id: 'loc-wh-b-r01-1', warehouse: 'Warehouse B', rack: 'Rack 01', row: 'Row 1', kind: 'storage' },
  { id: WORKSHOP_LOCATION_ID, warehouse: 'Active Workshop', rack: 'CNC Queue', row: '', kind: 'workshop' },
];

export const EMPTY_WAREHOUSE_STATE: WarehouseOpsState = {
  shipments: [],
  locations: DEFAULT_LOCATIONS,
  allocations: [],
  transfers: [],
  updatedAt: 0,
};

export function formatLocationLabel(loc: Pick<StorageLocation, 'warehouse' | 'rack' | 'row'>): string {
  return [loc.warehouse, loc.rack, loc.row].filter((p) => p && p.trim()).join(' \u2022 ');
}
