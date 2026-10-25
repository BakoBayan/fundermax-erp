import { DoorOrderSpec } from "./doors";
export type { DoorOrderSpec } from "./doors";

export interface OrderAllocation {
  id: string;
  orderNumber: string;
  client: string;
  quantity: number;
  date: string;
  createdAt?: number;
  notes?: string;
  imageUrl?: string; // Attached order image / blueprint / sketch / photo
  status?: "reserved" | "finalized"; // "reserved" = active pending work; "finalized" = completed, panels permanently consumed
  finalizedAt?: string;
  jobType?: "generic" | "door"; // "generic" = standard panel cutting; "door" = custom door manufacturing
  doorSpec?: DoorOrderSpec; // Specialized Door Order specifications
}

export interface PanelMaterial {
  id: string;
  code: string;               // e.g. 101 or PL-MDF-18
  name: string;               // e.g. Green MR MDF
  type: string;               // e.g. MDF, Plywood, Acrylic
  dimensions: {
    length: number;           // mm
    width: number;            // mm
    thickness: number;        // mm
    formatted: string;        // "2440 × 1220 × 18 mm"
  };
  totalStock: number;         // Total panels physically in stock
  allocatedStock: number;     // Sum of panels reserved for active orders
  availableStock: number;     // Computed: totalStock - allocatedStock
  activeOrders: OrderAllocation[];
  notes?: string;             // Item notes
  imageUrl?: string;          // Attached panel photo / woodgrain finish / blueprint
  createdAt?: number;
  updatedAt: string;
}

export type Language = "en" | "ku";
export type DeviceView = "auto" | "pc" | "mobile";
export type ThemeMode = "light" | "dark";

export type UserRole = "Admin" | "Manager" | "Staff" | "Viewer" | "Owner";

export type RolePresetName =
  | "Executive Owner"
  | "Super Admin"
  | "Accountant"
  | "Sales Representative"
  | "Workshop Floor"
  | "Read-Only Viewer"
  | "Read-Only Operator";

export interface UserModulePermissions {
  // Legacy module access flags
  panels: boolean;      // Wood Panels Manager
  orders: boolean;      // Order Allocations & Workshop Cutting
  sales: boolean;       // Sales POS, Billing & Invoicing
  goods: boolean;       // Warehouse Goods & Inventory
  shipping: boolean;    // Logistics & Shipments
  audit: boolean;       // Database Backups & Audit Trail
  canDelete?: boolean;  // Legacy delete
  canExport?: boolean;  // Legacy export

  // Granular v1.5 CRUD Matrix:
  canViewSales: boolean;
  canCreateSales: boolean;
  canEditSales: boolean;
  canDeleteSales: boolean;
  canOverridePrice: boolean;

  canViewPanels: boolean;
  canCreatePanels: boolean;
  canEditPanels: boolean;
  canDeletePanels: boolean;

  canViewWarehouse: boolean;
  canManageShipments: boolean;
  canManageStock: boolean;

  canAccessAdmin: boolean;
  canExportBackups: boolean;

  // Confidentiality & Metric Privacy:
  canViewRestrictedMetrics?: boolean; // When false (default), restricts accounts from viewing numbers/debts on modules they cannot enter

  // Granular Analytics Isolation & RBAC Gating:
  canViewFinancialAnalytics?: boolean; // Controls profit margins, revenue graphs, debt summaries, and transaction aggregates
  canViewWorkshopAnalytics?: boolean;  // Controls cutting queue efficiency, board yield, scrap rates, and material stock charts
}

export interface UserAccount {
  id?: string;
  username: string;
  displayName: string;
  role: UserRole;
  password?: string;
  isAuthenticated: boolean;
  createdAt?: number;
  permissions?: UserModulePermissions;
  isImpersonated?: boolean;
  originalAdminUsername?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  username: string;
  action: string;
  description: string;
  details?: string;
  category?: 'sale' | 'inventory' | 'settings' | 'system';
  amount?: number;
  currency?: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  createdAt: string; // ISO date
  dateKey: string;   // YYYY-MM-DD
  type: "start_of_day" | "yesterday" | "manual";
  label: string;
  materials: PanelMaterial[];
  customTypes: string[];
  totalPanels: number;
  totalOrders: number;
  transactions?: PanelTransaction[];
  products?: Product[];
  shipments?: Shipment[];
}

// ==========================================
// UNIFIED EXTENSIONS: SALES, INVOICING & GOODS
// ==========================================

export type CurrencyCode = 'USD' | 'EUR' | 'IQD';

export interface ExchangeRates {
  usdToIqd: number; // e.g. 1500 or 1530 ($1 = 1,500 IQD)
  eurToUsd: number; // e.g. 1.08 (€1 = 1.08 USD)
  eurToIqd: number; // e.g. 1620 (€1 = 1,620 IQD)
  USD_IQD?: number;
  EUR_IQD?: number;
  EUR_USD?: number;
}

export interface InvoiceItem {
  id: string;
  code?: string;
  type: string;
  product: string;
  quantity: number;
  sellingType: string;
  price: number;
  total: number;
  seller?: string;
  bank?: string;
  paymentType?: string;
}

export interface PanelTransaction {
  id: string;
  code?: string;
  timestamp: string;
  panelType: string;
  material: string;
  quantity: number;
  unit: string;
  sellingType: string;
  seller?: string;
  bank?: string;
  paymentType?: string;
  currency?: CurrencyCode;
  currencyRate?: number;
  sellingAmount: number;
  costPrice: number;
  discountDollars: number;
  discountPercentage: number;
  totalAfterDiscount: number;
  amountPaidNow: number;
  amountOwed: number;
  oldUnpaidDebt: number;
  combinedTotalDebt: number;
  grossProfit: number;
  profitMargin: number;
  notes: string;
  images: string[];
  status: 'completed' | 'partial' | 'debt';
  lastUpdated: string;
  items?: InvoiceItem[];
  // v1.5 Immutable Multi-Currency & Soft Delete
  chargedAmount?: number;
  chargedCurrency?: CurrencyCode;
  exchangeRateApplied?: number;
  baseUsdEquivalent?: number;
  isDeleted?: 0 | 1;
  deletedAt?: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  location: string;
  price: number;
  imageUrl?: string;
  lane?: 'inStock' | 'lowStock' | 'outOfStock';
  lastUpdated: string;
}

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered';

export interface Shipment {
  id: string;
  trackingCode: string;
  destination: string;
  itemSummary: string;
  quantity: number;
  status: ShipmentStatus;
  createdAt: string;
}

export interface DropdownPresets {
  savedTypes: string[];
  savedProducts: string[];
  savedSellingTypes: string[];
  savedSellers: string[];
  savedBanks: string[];
  savedPaymentTypes: string[];
  savedCategories?: string[];
  savedLocations?: string[];
  savedClients?: string[];
}

export const STANDARD_PAYMENT_METHODS = [
  'کاش (Cash)',
  'قەرز (Customer Debt)',
  'ڕەسیدی کڕیار / پێشەکی (Store Credit)',
  'حەواڵە / بانک (Bank / Transfer)',
] as const;

export type StandardPaymentMethod = typeof STANDARD_PAYMENT_METHODS[number];

export type PlatformModule = 'hub' | 'panels' | 'orders' | 'sales' | 'goods' | 'shipping' | 'audit' | 'profit';

export interface PosDraftState {
  invoiceCode: string;
  seller: string;
  bank: string;
  paymentType: string;
  activeCurrency: CurrencyCode;
  items: InvoiceItem[];
  rowType: string;
  rowProduct: string;
  rowQuantity: number | '';
  rowSellingType: string;
  rowPrice: number | '';
  discountDollars: number | '';
  discountPercentage: number | '';
  amountPaidNow: number | '';
  oldUnpaidDebt: number | '';
  notes: string;
  images: string[];
}

export interface PrintCuttingSlipData {
  order: OrderAllocation;
  material: PanelMaterial;
}

export interface PrintWarehouseManifestData {
  id: string;
  batchCode: string;
  supplier: string;
  originCountry?: string;
  arrivalDate?: string;
  status: string;
  notes?: string;
  items: Array<{
    id: string;
    description: string;
    expectedQty: number;
    receivedQty: number;
    unit: string;
    location?: string;
    condition?: string;
  }>;
}

export type PrintJob =
  | { type: 'cutting-slip'; data: PrintCuttingSlipData }
  | { type: 'warehouse-manifest'; data: PrintWarehouseManifestData }
  | { type: 'pos-invoice'; data: { tx: PanelTransaction; format?: 'a4' | 'thermal80' } };

export type { InboundShipment, SupplierPaymentStatus } from './warehouse';

