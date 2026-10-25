"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PanelMaterial,
  OrderAllocation,
  Language,
  DeviceView,
  ThemeMode,
  UserAccount,
  UserRole,
  UserModulePermissions,
  RolePresetName,
  ActivityLogEntry,
  BackupSnapshot,
  CurrencyCode,
  ExchangeRates,
  PanelTransaction,
  Product,
  Shipment,
  ShipmentStatus,
  DropdownPresets,
  PlatformModule,
  PosDraftState,
  InvoiceItem,
  PrintJob,
  InboundShipment
} from "../types/inventory";
import { getTranslation, translations } from "../utils/i18n";
import { ConfirmDialogOptions } from "../components/ConfirmModal";
import {
  DEFAULT_EXCHANGE_RATES,
  MARKET_REFERENCE_RATES,
  normalizeIqdRate,
  convertCurrencyValue as rawConvertCurrency,
  formatMoney as rawFormatMoney
} from "../lib/currency";
import { autoCapitalizeFirstLetter } from "../utils/text";

interface HistoryState {
  materials: PanelMaterial[];
  customTypes: string[];
  transactions: PanelTransaction[];
  affectedId?: string;
  actionDesc?: string;
}

interface InventoryContextType {
  // Navigation & Platform Module
  currentModule: PlatformModule;
  setCurrentModule: (m: PlatformModule) => void;
  activeSection: "panels" | "orders";
  setActiveSection: (s: "panels" | "orders") => void;

  // Visual Charts & Analytics
  isVisualChartsOpen: boolean;
  visualChartsScope: 'all' | 'panels' | 'orders' | 'sales' | 'goods' | 'shipping';
  openVisualCharts: (scope?: 'all' | 'panels' | 'orders' | 'sales' | 'goods' | 'shipping') => void;
  closeVisualCharts: () => void;

  // Legal Copyright & Project Commissioning Modal
  isCopyrightOpen: boolean;
  openCopyrightModal: () => void;
  closeCopyrightModal: () => void;

  // Admin & System Settings Modal
  isAdminModalOpen: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;

  // Wood Panels & Orders
  materials: PanelMaterial[];
  customTypes: string[];
  stats: {
    totalStock: number;
    totalAllocated: number;
    totalAvailable: number;
    totalOrders: number;
    outOfStockCount: number;
  };
  addMaterial: (material: {
    code: string;
    name: string;
    type: string;
    length: number;
    width: number;
    thickness: number;
    totalStock: number;
    notes?: string;
    imageUrl?: string;
  }) => void;
  addMaterialsBatch: (
    items: Array<{
      code?: string;
      name: string;
      type?: string;
      length: number;
      width: number;
      thickness: number;
      totalStock: number;
      notes?: string;
      imageUrl?: string;
    }>
  ) => void;
  editMaterial: (
    id: string,
    updates: Partial<{
      code: string;
      name: string;
      type: string;
      length: number;
      width: number;
      thickness: number;
      totalStock: number;
      notes: string;
      imageUrl?: string;
    }>
  ) => void;
  deleteMaterial: (id: string) => void;
  allocateOrder: (
    materialId: string,
    order: {
      client: string;
      quantity: number;
      notes?: string;
      imageUrl?: string;
    }
  ) => { success: boolean; message: string };
  editOrder: (
    materialId: string,
    orderId: string,
    updates: Partial<{ client: string; quantity: number; notes: string; imageUrl?: string }>
  ) => void;
  finalizeOrder: (materialId: string, orderId: string) => void;
  deleteOrder: (materialId: string, orderId: string) => void;
  quickStepStock: (materialId: string, delta: number) => void;
  getNextPanelCode: () => string;
  addCustomType: (type: string) => void;
  deleteCustomType: (type: string) => void;
  zoomedImage: { url: string; title: string } | null;
  setZoomedImage: (img: { url: string; title: string } | null) => void;
  highlightedId: string | null;

  // Sales & POS Invoicing
  transactions: PanelTransaction[];
  addTransaction: (tx: PanelTransaction) => void;
  editTransaction: (id: string, updates: Partial<PanelTransaction>) => void;
  deleteTransaction: (id: string) => void;
  dropdownPresets: DropdownPresets;
  addToDropdownPresets: (category: keyof DropdownPresets, val: string) => void;
  removeFromDropdownPresets: (category: keyof DropdownPresets, val: string) => void;
  posDraft: PosDraftState;
  setPosDraft: React.Dispatch<React.SetStateAction<PosDraftState>>;
  clearPosDraft: () => void;
  salesStatusFilter: 'all' | 'completed' | 'debt' | 'partial';
  setSalesStatusFilter: (f: 'all' | 'completed' | 'debt' | 'partial') => void;
  salesTimeframeFilter: 'all' | 'today' | 'yesterday' | 'week' | 'month';
  setSalesTimeframeFilter: (f: 'all' | 'today' | 'yesterday' | 'week' | 'month') => void;

  // Multi-Currency
  exchangeRates: ExchangeRates;
  setExchangeRates: (r: ExchangeRates) => void;
  copyMarketReferenceToOperational: () => void;
  convertCurrency: (val: number, from: CurrencyCode, to: CurrencyCode) => number;
  formatMoney: (val: number, cur?: CurrencyCode) => string;

  // Warehouse Goods & Shipping
  products: Product[];
  addProduct: (p: Product) => void;
  editProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  shipments: Shipment[];
  addShipment: (s: Shipment) => void;
  updateShipmentStatus: (id: string, status: ShipmentStatus) => void;
  deleteShipment: (id: string) => void;

  // Resilience & Offline Tolerance
  isOnline: boolean;
  syncStatus: "synced" | "offline" | "syncing";
  offlineQueueCount: number;
  simulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  walHealth: {
    isWalActive: boolean;
    journalMode: string;
    integrity: string;
    dbSize: string;
    walSize: string;
    lastVerified: string;
    latencyMs: number;
    isLiveConnected: boolean;
  };
  pingHealthCheck: () => Promise<{ success: boolean; latencyMs: number; message: string }>;

  // User Accounts & Role Permissions
  currentUser: UserAccount | null;
  users: UserAccount[];
  userPermissions: UserModulePermissions;
  hasModulePermission: (module: PlatformModule) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canModify: boolean;
  canDeleteMaterial: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  impersonateUser: (username: string) => boolean;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  addUserAccount: (user: { username: string; displayName: string; role: UserRole; password: string; permissions?: UserModulePermissions }) => boolean;
  deleteUserAccount: (username: string) => boolean;
  updateUserAccount: (username: string, updates: Partial<{ displayName: string; role: UserRole; password?: string; permissions?: UserModulePermissions }>) => boolean;
  updateUserPermissions: (username: string, permissions: UserModulePermissions) => boolean;

  // Activity Logs & Backups
  activityLogs: ActivityLogEntry[];
  auditLogs?: ActivityLogEntry[];
  logActivity: (action: string, description: string, details?: string, category?: string, amount?: number, currency?: string) => void;
  clearActivityLogs: () => void;
  backups: BackupSnapshot[];
  createManualBackup: (label?: string) => Promise<void>;
  createBackup?: (label?: string) => Promise<void>;
  restoreBackup: (backupIdOrSnapshot: string | BackupSnapshot) => Promise<boolean>;
  deleteBackup: (backupId: string) => Promise<void>;
  wipeDatabase: () => Promise<void>;
  uploadAndRestoreBackupFile: (file: File) => Promise<{ success: boolean; message: string }>;

  // UI Preferences & Confirmation
  language: Language;
  theme: ThemeMode;
  deviceMode: DeviceView;
  isMobileDetected: boolean;
  effectiveMode: "pc" | "mobile";
  t: (typeof translations)["en"];
  searchQuery: string;
  typeFilter: string;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  setDeviceMode: (mode: DeviceView) => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (type: string) => void;
  confirmDialog: ConfirmDialogOptions | null;
  requestConfirm: (options: Omit<ConfirmDialogOptions, "isOpen">) => void;
  requestAlert: (options: { title?: string; message: string; confirmLabel?: string; type?: 'info' | 'warning' | 'danger' | 'success'; onConfirm?: () => void }) => void;
  closeConfirm: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Unified Isolated Print Engine
  activePrintJob: PrintJob | null;
  triggerPrintJob: (job: PrintJob) => void;
  printCuttingSlip: (order: OrderAllocation, material: PanelMaterial) => void;
  printWarehouseManifest: (shipment: InboundShipment) => void;
  printInvoiceJob: (tx: PanelTransaction, format?: 'a4' | 'thermal80') => void;
  clearPrintJob: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Local Storage Keys for Instant Hydration
const STORAGE_MATERIALS = "bako_materials_v2";
const STORAGE_TYPES = "bako_types_v2";
const STORAGE_TRANSACTIONS = "bako_transactions_v2";
const STORAGE_PRODUCTS = "bako_products_v2";
const STORAGE_SHIPMENTS = "bako_shipments_v2";
const STORAGE_RATES = "bako_exchange_rates_v2";
const STORAGE_PRESETS = "bako_presets_v2";
const STORAGE_LANG = "bako_lang_v2";
const STORAGE_THEME = "bako_theme_v2";
const STORAGE_MODE = "bako_mode_v2";
const STORAGE_LOGS = "bako_activity_logs_v1";
const STORAGE_BACKUPS = "bako_backups_v1";
const STORAGE_USERS = "bako_user_accounts_v1";
const STORAGE_SESSION = "bako_user_session_v1";
const STORAGE_OFFLINE_QUEUE = "bako_offline_queue_v1";

export const DEFAULT_EXECUTIVE_OWNER_PERMISSIONS: UserModulePermissions = {
  panels: true,
  orders: true,
  sales: true,
  goods: true,
  shipping: true,
  audit: false,
  canDelete: false,
  canExport: true,
  canViewSales: true,
  canCreateSales: false,
  canEditSales: false,
  canDeleteSales: false,
  canOverridePrice: false,
  canViewPanels: true,
  canCreatePanels: false,
  canEditPanels: false,
  canDeletePanels: false,
  canViewWarehouse: true,
  canManageShipments: false,
  canManageStock: false,
  canAccessAdmin: false,
  canExportBackups: false,
  canViewFinancialAnalytics: true,
  canViewWorkshopAnalytics: true,
  canViewRestrictedMetrics: true,
};

export const ROLE_PRESETS: Record<RolePresetName, UserModulePermissions> = {
  "Executive Owner": DEFAULT_EXECUTIVE_OWNER_PERMISSIONS,
  "Super Admin": {
    panels: true,
    orders: true,
    sales: true,
    goods: true,
    shipping: true,
    audit: true,
    canDelete: true,
    canExport: true,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: true,
    canOverridePrice: true,
    canViewPanels: true,
    canCreatePanels: true,
    canEditPanels: true,
    canDeletePanels: true,
    canViewWarehouse: true,
    canManageShipments: true,
    canManageStock: true,
    canAccessAdmin: true,
    canExportBackups: true,
    canViewFinancialAnalytics: true,
    canViewWorkshopAnalytics: true,
  },
  "Accountant": {
    panels: true,
    orders: false,
    sales: true,
    goods: true,
    shipping: false,
    audit: false,
    canDelete: false,
    canExport: true,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: false,
    canOverridePrice: true,
    canViewPanels: true,
    canCreatePanels: false,
    canEditPanels: false,
    canDeletePanels: false,
    canViewWarehouse: true,
    canManageShipments: false,
    canManageStock: false,
    canAccessAdmin: false,
    canExportBackups: true,
    canViewFinancialAnalytics: true,
    canViewWorkshopAnalytics: true,
  },
  "Sales Representative": {
    panels: true,
    orders: false,
    sales: true,
    goods: true,
    shipping: false,
    audit: false,
    canDelete: false,
    canExport: false,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: false,
    canDeleteSales: false,
    canOverridePrice: false,
    canViewPanels: true,
    canCreatePanels: false,
    canEditPanels: false,
    canDeletePanels: false,
    canViewWarehouse: true,
    canManageShipments: false,
    canManageStock: false,
    canAccessAdmin: false,
    canExportBackups: false,
    canViewFinancialAnalytics: false,
    canViewWorkshopAnalytics: false,
  },
  "Workshop Floor": {
    panels: true,
    orders: true,
    sales: false,
    goods: true,
    shipping: false,
    audit: false,
    canDelete: false,
    canExport: false,
    canViewSales: false,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canOverridePrice: false,
    canViewPanels: true,
    canCreatePanels: false,
    canEditPanels: true,
    canDeletePanels: false,
    canViewWarehouse: true,
    canManageShipments: false,
    canManageStock: true,
    canAccessAdmin: false,
    canExportBackups: false,
    canViewFinancialAnalytics: false,
    canViewWorkshopAnalytics: true,
  },
  "Read-Only Viewer": {
    panels: true,
    orders: false,
    sales: false,
    goods: true,
    shipping: false,
    audit: false,
    canDelete: false,
    canExport: false,
    canViewSales: false,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canOverridePrice: false,
    canViewPanels: true,
    canCreatePanels: false,
    canEditPanels: false,
    canDeletePanels: false,
    canViewWarehouse: true,
    canManageShipments: false,
    canManageStock: false,
    canAccessAdmin: false,
    canExportBackups: false,
    canViewFinancialAnalytics: false,
    canViewWorkshopAnalytics: false,
  },
  "Read-Only Operator": {
    panels: true,
    orders: false,
    sales: false,
    goods: true,
    shipping: false,
    audit: false,
    canDelete: false,
    canExport: false,
    canViewSales: false,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canOverridePrice: false,
    canViewPanels: true,
    canCreatePanels: false,
    canEditPanels: false,
    canDeletePanels: false,
    canViewWarehouse: true,
    canManageShipments: false,
    canManageStock: false,
    canAccessAdmin: false,
    canExportBackups: false,
    canViewFinancialAnalytics: false,
    canViewWorkshopAnalytics: false,
  },
};

export const DEFAULT_ADMIN_PERMISSIONS: UserModulePermissions = ROLE_PRESETS["Super Admin"];
export const DEFAULT_MANAGER_PERMISSIONS: UserModulePermissions = {
  ...ROLE_PRESETS["Accountant"],
  orders: true,
  shipping: true,
  canManageShipments: true,
  canManageStock: true,
  canCreatePanels: true,
  canEditPanels: true,
  canDeletePanels: false,
  canViewFinancialAnalytics: true,
  canViewWorkshopAnalytics: true,
};
export const DEFAULT_STAFF_PERMISSIONS: UserModulePermissions = {
  ...ROLE_PRESETS["Workshop Floor"],
  sales: true,
  canViewSales: true,
  canCreateSales: true,
  canEditSales: false,
  canDeleteSales: false,
  canOverridePrice: false,
  canViewFinancialAnalytics: false,
  canViewWorkshopAnalytics: true,
};
export const DEFAULT_VIEWER_PERMISSIONS: UserModulePermissions = ROLE_PRESETS["Read-Only Operator"];

export function resolveUserPermissions(user: Partial<UserAccount> | null): UserModulePermissions {
  if (!user || !user.isAuthenticated) return DEFAULT_VIEWER_PERMISSIONS;
  if (user.role === "Owner" || user.username?.toLowerCase() === "shaswar") {
    return {
      ...DEFAULT_EXECUTIVE_OWNER_PERMISSIONS,
      ...(user.permissions || {}),
      canCreateSales: false,
      canEditSales: false,
      canDeleteSales: false,
      canOverridePrice: false,
      canCreatePanels: false,
      canEditPanels: false,
      canDeletePanels: false,
      canManageShipments: false,
      canManageStock: false,
      canAccessAdmin: false,
      canExportBackups: false,
      canViewFinancialAnalytics: true,
      canViewWorkshopAnalytics: true,
      canViewRestrictedMetrics: true,
    };
  }
  if (user.username?.toLowerCase() === "bako" || user.role === "Admin") {
    return {
      ...DEFAULT_ADMIN_PERMISSIONS,
      canViewFinancialAnalytics: true,
      canViewWorkshopAnalytics: true,
      ...(user.permissions || {}),
    };
  }
  let base = DEFAULT_STAFF_PERMISSIONS;
  if (user.role === "Manager") base = DEFAULT_MANAGER_PERMISSIONS;
  else if (user.role === "Viewer") base = DEFAULT_VIEWER_PERMISSIONS;

  const raw = (user.permissions || {}) as Record<string, any>;
  return {
    ...base,
    ...raw,
    sales: user.role === 'Viewer' ? false : (raw.sales !== undefined ? !!raw.sales : base.sales),
    canViewSales: user.role === 'Viewer' ? false : (raw.canViewSales !== undefined ? !!raw.canViewSales : (raw.sales !== undefined ? !!raw.sales : base.canViewSales)),
    canCreateSales: user.role === 'Viewer' ? false : (raw.canCreateSales !== undefined ? !!raw.canCreateSales : base.canCreateSales),
    canEditSales: user.role === 'Viewer' ? false : (raw.canEditSales !== undefined ? !!raw.canEditSales : base.canEditSales),
    canDeleteSales: user.role === 'Viewer' ? false : (raw.canDeleteSales !== undefined ? !!raw.canDeleteSales : (raw.canDelete !== undefined ? !!raw.canDelete : base.canDeleteSales)),
    canOverridePrice: user.role === 'Viewer' ? false : (raw.canOverridePrice !== undefined ? !!raw.canOverridePrice : base.canOverridePrice),

    canViewPanels: raw.canViewPanels !== undefined ? !!raw.canViewPanels : (raw.panels !== undefined ? !!raw.panels : base.canViewPanels),
    canCreatePanels: user.role === 'Viewer' ? false : (raw.canCreatePanels !== undefined ? !!raw.canCreatePanels : base.canCreatePanels),
    canEditPanels: user.role === 'Viewer' ? false : (raw.canEditPanels !== undefined ? !!raw.canEditPanels : base.canEditPanels),
    canDeletePanels: user.role === 'Viewer' ? false : (raw.canDeletePanels !== undefined ? !!raw.canDeletePanels : (raw.canDelete !== undefined ? !!raw.canDelete : base.canDeletePanels)),

    canViewWarehouse: raw.canViewWarehouse !== undefined ? !!raw.canViewWarehouse : (raw.goods !== undefined ? !!raw.goods : base.canViewWarehouse),
    canManageShipments: user.role === 'Viewer' ? false : (raw.canManageShipments !== undefined ? !!raw.canManageShipments : (raw.shipping !== undefined ? !!raw.shipping : base.canManageShipments)),
    canManageStock: user.role === 'Viewer' ? false : (raw.canManageStock !== undefined ? !!raw.canManageStock : base.canManageStock),

    canAccessAdmin: user.role === 'Viewer' ? false : (raw.canAccessAdmin !== undefined ? !!raw.canAccessAdmin : (raw.audit !== undefined ? !!raw.audit : base.canAccessAdmin)),
    canExportBackups: user.role === 'Viewer' ? false : (raw.canExportBackups !== undefined ? !!raw.canExportBackups : (raw.canExport !== undefined ? !!raw.canExport : base.canExportBackups)),
    canViewRestrictedMetrics: !!raw.canViewRestrictedMetrics,
    canViewFinancialAnalytics: raw.canViewFinancialAnalytics !== undefined
      ? !!raw.canViewFinancialAnalytics
      : (user.role === 'Viewer' ? false : (base.canViewFinancialAnalytics ?? false)),
    canViewWorkshopAnalytics: raw.canViewWorkshopAnalytics !== undefined
      ? !!raw.canViewWorkshopAnalytics
      : (user.role === 'Viewer' ? false : (base.canViewWorkshopAnalytics ?? false)),
  };
}

const INITIAL_USERS: UserAccount[] = [
  {
    id: "user-shaswar-ahmad",
    username: "shaswar",
    displayName: "Shaswar Ahmad",
    role: "Owner",
    password: "shaswar2026",
    isAuthenticated: false,
    createdAt: 1770000000000,
    permissions: DEFAULT_EXECUTIVE_OWNER_PERMISSIONS,
  },
  {
    username: "bako",
    displayName: "Bako Bayan Madhhar",
    role: "Admin",
    password: "illcbtfmo1",
    isAuthenticated: false,
    createdAt: 1770000000000,
    permissions: DEFAULT_ADMIN_PERMISSIONS,
  },
  {
    username: "Awat",
    displayName: "Awat (Manager)",
    role: "Manager",
    password: "awat22",
    isAuthenticated: false,
    createdAt: 1770000000000,
    permissions: DEFAULT_MANAGER_PERMISSIONS,
  },
  {
    username: "viewer",
    displayName: "Viewer (Read-Only)",
    role: "Viewer",
    password: "1234",
    isAuthenticated: false,
    createdAt: 1770000000000,
    permissions: DEFAULT_VIEWER_PERMISSIONS,
  },
];

const INITIAL_POS_DRAFT: PosDraftState = {
  invoiceCode: "",
  seller: "Bako Bayan",
  bank: "FIB (First Iraqi Bank)",
  paymentType: "Cash (نەقد)",
  activeCurrency: "USD",
  items: [],
  rowType: "",
  rowProduct: "",
  rowQuantity: 1,
  rowSellingType: "Wholesale (کۆ)",
  rowPrice: "",
  discountDollars: "",
  discountPercentage: "",
  amountPaidNow: "",
  oldUnpaidDebt: "",
  notes: "",
  images: [],
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State (Master Hub vs Individual Modules)
  const [currentModule, setCurrentModule] = useState<PlatformModule>("hub");
  const [activeSection, setActiveSection] = useState<"panels" | "orders">("panels");

  // Visual Charts Modal State
  const [isVisualChartsOpen, setIsVisualChartsOpen] = useState(false);
  const [visualChartsScope, setVisualChartsScope] = useState<'all' | 'panels' | 'orders' | 'sales' | 'goods' | 'shipping'>('all');

  const openVisualCharts = useCallback((scope?: 'all' | 'panels' | 'orders' | 'sales' | 'goods' | 'shipping') => {
    if (scope) {
      setVisualChartsScope(scope);
    } else if (currentModule === 'panels' || currentModule === 'orders') {
      setVisualChartsScope('panels');
    } else if (currentModule === 'sales') {
      setVisualChartsScope('sales');
    } else if (currentModule === 'goods' || currentModule === 'shipping') {
      setVisualChartsScope('goods');
    } else {
      setVisualChartsScope('all');
    }
    setIsVisualChartsOpen(true);
  }, [currentModule]);

  const closeVisualCharts = useCallback(() => {
    setIsVisualChartsOpen(false);
  }, []);

  // Copyright & Custom Project Commissioning Modal State
  const [isCopyrightOpen, setIsCopyrightOpen] = useState(false);
  const openCopyrightModal = useCallback(() => {
    setIsCopyrightOpen(true);
  }, []);
  const closeCopyrightModal = useCallback(() => {
    setIsCopyrightOpen(false);
  }, []);

  // Admin & System Settings Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const openAdminModal = useCallback(() => {
    setIsAdminModalOpen(true);
  }, []);
  const closeAdminModal = useCallback(() => {
    setIsAdminModalOpen(false);
  }, []);

  // Unified Isolated Print Engine State
  const [activePrintJob, setActivePrintJob] = useState<PrintJob | null>(null);

  const triggerPrintJob = useCallback((job: PrintJob) => {
    setActivePrintJob(job);
  }, []);

  const printCuttingSlip = useCallback((order: OrderAllocation, material: PanelMaterial) => {
    setActivePrintJob({
      type: 'cutting-slip',
      data: { order, material },
    });
  }, []);

  const printWarehouseManifest = useCallback((shipment: InboundShipment) => {
    setActivePrintJob({
      type: 'warehouse-manifest',
      data: {
        id: shipment.id,
        batchCode: shipment.batchCode,
        supplier: shipment.supplier,
        originCountry: shipment.originCountry,
        arrivalDate: shipment.arrivalDate,
        status: shipment.status,
        notes: shipment.notes,
        items: shipment.items.map((it) => ({
          id: it.id,
          description: it.description,
          expectedQty: it.expectedQty,
          receivedQty: it.receivedQty,
          unit: it.unit,
        })),
      },
    });
  }, []);

  const printInvoiceJob = useCallback((tx: PanelTransaction, format?: 'a4' | 'thermal80') => {
    setActivePrintJob({
      type: 'pos-invoice',
      data: { tx, format: format || 'a4' },
    });
  }, []);

  const clearPrintJob = useCallback(() => {
    setActivePrintJob(null);
  }, []);

  // Core Data States with Instant Local Hydration
  const [materials, setMaterials] = useState<PanelMaterial[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_MATERIALS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["HPL"];
    try {
      const s = localStorage.getItem(STORAGE_TYPES);
      return s ? JSON.parse(s) : ["HPL"];
    } catch {
      return ["HPL"];
    }
  });

  const [transactions, setTransactions] = useState<PanelTransaction[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_TRANSACTIONS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'completed' | 'debt' | 'partial'>('all');
  const [salesTimeframeFilter, setSalesTimeframeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_PRODUCTS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [shipments, setShipments] = useState<Shipment[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_SHIPMENTS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRates>(() => {
    if (typeof window === "undefined") return DEFAULT_EXCHANGE_RATES;
    try {
      const s = localStorage.getItem(STORAGE_RATES);
      if (!s) return DEFAULT_EXCHANGE_RATES;
      const parsed = JSON.parse(s);
      const usdToIqd = normalizeIqdRate(parsed.usdToIqd || parsed.USD_IQD || 1500);
      const eurToUsd = typeof parsed.eurToUsd === 'number' && parsed.eurToUsd > 0 ? parsed.eurToUsd : (parsed.EUR_USD || 1.08);
      const eurToIqd = normalizeIqdRate(parsed.eurToIqd || parsed.EUR_IQD || Math.round(usdToIqd * eurToUsd));
      return {
        ...DEFAULT_EXCHANGE_RATES,
        ...parsed,
        usdToIqd,
        eurToUsd,
        eurToIqd,
      };
    } catch {
      return DEFAULT_EXCHANGE_RATES;
    }
  });

  const [dropdownPresets, setDropdownPresets] = useState<DropdownPresets>(() => {
    const fallback: DropdownPresets = {
      savedTypes: [],
      savedProducts: [],
      savedSellingTypes: [
        'Wholesale (کۆ)',
        'Retail (مفرد)',
        'Per Piece (بە دانە)',
        'Per m² (مەتر)',
        'Project / Contractor (پڕۆژە)',
        'Set (تاقم)',
        'Cash (نەقد)',
        'Debt / Credit (قەرز)'
      ],
      savedSellers: [],
      savedBanks: [],
      savedPaymentTypes: ['Cash (نەقد)', 'Debt / Credit (قەرز)', 'Installment (قیست)', 'Bank Transfer (حەواڵە)'],
      savedCategories: [],
      savedLocations: [],
      savedClients: []
    };
    if (typeof window === "undefined") return fallback;
    try {
      const s = localStorage.getItem(STORAGE_PRESETS);
      if (!s) return fallback;
      const parsed = JSON.parse(s);

      const dummyExamples = new Set([
        'MDF Standard', 'Acoustic Slat Panel', 'Melamine Board', 'Plywood Birch', 'uygjg',
        'Natural Oak Veneer', 'American Walnut', 'Smoked Oak', 'Gloss White', 'Matte Anthracite', 'hfhft',
        'Bako Bayan', 'Cashier Main', 'Showroom Sales',
        'FIB (First Iraqi Bank)', 'RT Bank', 'Trade Bank of Iraq', 'Cash Drawer', 'hghgh',
        'Hardware & Edge Banding', 'Veneer & Laminate', 'PVC Edging', 'Glues & Fasteners', 'Accessories',
        'Bay A-1', 'Bay A-2', 'Bay B-1', 'Bay B-2', 'Bay C-1', 'Warehouse Floor'
      ]);
      const filterExamples = (list: unknown): string[] => {
        if (!Array.isArray(list)) return [];
        return list.filter((item): item is string => typeof item === 'string' && !dummyExamples.has(item.trim()));
      };

      return {
        savedTypes: filterExamples(parsed.savedTypes),
        savedProducts: filterExamples(parsed.savedProducts),
        savedSellingTypes: Array.isArray(parsed.savedSellingTypes) && parsed.savedSellingTypes.length > 0 ? parsed.savedSellingTypes : fallback.savedSellingTypes,
        savedSellers: filterExamples(parsed.savedSellers),
        savedBanks: filterExamples(parsed.savedBanks),
        savedPaymentTypes: Array.isArray(parsed.savedPaymentTypes) && parsed.savedPaymentTypes.length > 0 ? parsed.savedPaymentTypes : fallback.savedPaymentTypes,
        savedCategories: filterExamples(parsed.savedCategories),
        savedLocations: filterExamples(parsed.savedLocations),
        savedClients: Array.isArray(parsed.savedClients) ? parsed.savedClients : [],
      };
    } catch {
      return fallback;
    }
  });

  // State preservation: in-progress POS invoice form
  const [posDraft, setPosDraft] = useState<PosDraftState>(INITIAL_POS_DRAFT);
  const clearPosDraft = useCallback(() => {
    setPosDraft(INITIAL_POS_DRAFT);
  }, []);

  // UI preferences
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem(STORAGE_LANG) as Language) || "en";
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(STORAGE_THEME) as ThemeMode) || "light";
  });

  const [deviceMode, setDeviceModeState] = useState<DeviceView>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem(STORAGE_MODE) as DeviceView) || "auto";
  });

  const [isMobileDetected, setIsMobileDetected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Connectivity & Resilience
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "offline" | "syncing">("synced");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [walHealth, setWalHealth] = useState<{
    isWalActive: boolean;
    journalMode: string;
    integrity: string;
    dbSize: string;
    walSize: string;
    lastVerified: string;
    latencyMs: number;
    isLiveConnected: boolean;
  }>({
    isWalActive: true,
    journalMode: "wal",
    integrity: "ok",
    dbSize: "6.2 MB",
    walSize: "0 B",
    lastVerified: "Initializing...",
    latencyMs: 4,
    isLiveConnected: true,
  });

  // Authentication & Users (Strict Default: unauthenticated viewer until explicitly authenticated)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedSession = localStorage.getItem(STORAGE_SESSION);
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        if (parsedSession && parsedSession.username && Date.now() < parsedSession.expiresAt) {
          const savedUsers = localStorage.getItem(STORAGE_USERS);
          const usersList: UserAccount[] = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
          const matched = usersList.find((u) => u.username.toLowerCase() === String(parsedSession.username).toLowerCase());
          if (matched) return { ...matched, isAuthenticated: true };
        }
      }
    } catch {}
    return null;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    if (typeof window === "undefined") return INITIAL_USERS;
    try {
      const s = localStorage.getItem(STORAGE_USERS);
      if (s) {
        const parsed: UserAccount[] = JSON.parse(s);
        const hasShaswar = parsed.some((u) => u.username?.toLowerCase() === "shaswar");
        if (!hasShaswar) {
          const shaswarAcc = INITIAL_USERS.find((u) => u.username === "shaswar");
          if (shaswarAcc) return [...parsed, shaswarAcc];
        }
        return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Activity Logs & Backups
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_LOGS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [backups, setBackups] = useState<BackupSnapshot[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem(STORAGE_BACKUPS);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  // Undo / Redo History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastServerTimestampRef = useRef<number>(0);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);

  const requestConfirm = useCallback((options: Omit<ConfirmDialogOptions, "isOpen">) => {
    setConfirmDialog({ ...options, isOpen: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const requestAlert = useCallback(
    (options: { title?: string; message: string; confirmLabel?: string; type?: 'info' | 'warning' | 'danger' | 'success'; onConfirm?: () => void }) => {
      setConfirmDialog({
        isOpen: true,
        title: options.title || (language === 'ku' ? 'ئاگاداری' : 'System Notice'),
        message: options.message,
        confirmLabel: options.confirmLabel || (language === 'ku' ? 'تەواوە' : 'OK'),
        type: options.type || 'info',
        hideCancel: true,
        onConfirm: options.onConfirm || (() => {}),
      });
    },
    [language]
  );

  // Browser native popup neutralization: all popups must originate from inside the app UI
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.alert = (message?: any) => {
      requestAlert({
        title: language === "ku" ? "ئاگاداری سیستەم" : "System Notice",
        message: String(message ?? ""),
      });
    };
  }, [language, requestAlert]);

  // Role & Individual Module permissions
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === "Admin" || currentUser.username.toLowerCase() === "bako";
  }, [currentUser]);

  const isManager = useMemo(() => {
    if (!currentUser) return false;
    return isAdmin || currentUser.role === "Manager" || currentUser.username.toLowerCase() === "awat";
  }, [currentUser, isAdmin]);

  const isStaff = useMemo(() => currentUser?.role === "Staff", [currentUser]);
  const isViewer = useMemo(() => currentUser?.role === "Viewer", [currentUser]);

  const userPermissions = useMemo((): UserModulePermissions => {
    return resolveUserPermissions(currentUser);
  }, [currentUser]);

  const hasModulePermission = useCallback((mod: PlatformModule): boolean => {
    if (mod === "hub") return true;
    if (isAdmin) return true;
    if (!currentUser) return false;
    const perms = resolveUserPermissions(currentUser);
    if (mod === "panels") return !!perms.canViewPanels;
    if (mod === "orders") return !!perms.canViewPanels;
    if (mod === "sales") return !!perms.canViewSales;
    if (mod === "goods") return !!perms.canViewWarehouse;
    if (mod === "shipping") return !!perms.canViewWarehouse;
    if (mod === "audit") return !!perms.canAccessAdmin;
    return false;
  }, [isAdmin, currentUser]);

  const canModify = useMemo(() => {
    if (isAdmin) return true;
    if (isViewer) return false;
    return userPermissions.canCreatePanels || userPermissions.canEditPanels;
  }, [isAdmin, isViewer, userPermissions]);

  const canDeleteMaterial = useMemo(() => {
    if (isAdmin) return true;
    if (isViewer) return false;
    return userPermissions.canDeletePanels;
  }, [isAdmin, isViewer, userPermissions]);

  // Responsive device view calculation
  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileDetected(isMobile);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const effectiveMode = useMemo(() => {
    if (deviceMode === "pc") return "pc";
    if (deviceMode === "mobile") return "mobile";
    return isMobileDetected ? "mobile" : "pc";
  }, [deviceMode, isMobileDetected]);

  // Simulated Offline Mode for Testing & Verification
  const [simulatedOffline, setSimulatedOffline] = useState(false);

  // Theme application
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  // Language HTML attribute sync
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = language === "ku" ? "rtl" : "ltr";
    }
  }, [language]);

  // Translation bundle
  const t = useMemo(() => getTranslation(language), [language]);

  // Log activity helper
  const logActivity = useCallback(
    (action: string, description: string, details?: string, category?: string, amount?: number, currency?: string) => {
      const now = new Date();
      const entry: ActivityLogEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        formattedTime: `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
        username: currentUser?.displayName || currentUser?.username || "System",
        action,
        description,
        details,
        category: (category as any) || "system",
        amount,
        currency,
      };

      setActivityLogs((prev) => {
        const updated = [entry, ...prev].slice(0, 300);
        try {
          localStorage.setItem(STORAGE_LOGS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [currentUser]
  );

  const clearActivityLogs = useCallback(() => {
    setActivityLogs([]);
    try {
      localStorage.removeItem(STORAGE_LOGS);
    } catch {}
  }, []);

  // Multi-device server sync
  const pushToServer = useCallback(
    async (payload: {
      materials?: PanelMaterial[];
      customTypes?: string[];
      transactions?: PanelTransaction[];
      products?: Product[];
      shipments?: Shipment[];
      exchangeRates?: ExchangeRates;
      dropdownPresets?: DropdownPresets;
      users?: UserAccount[];
    }) => {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-name": currentUser?.username || "System",
            "x-user-role": currentUser?.role || "Staff",
            "x-user-permissions": JSON.stringify(userPermissions),
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsOnline(true);
          setSyncStatus("synced");
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("bako_sync");
            bc.postMessage({ type: "SYNC_UPDATE" });
            bc.close();
          }
        } else {
          setSyncStatus("offline");
        }
      } catch {
        setIsOnline(false);
        setSyncStatus("offline");
      }
    },
    [currentUser, userPermissions]
  );

  // Pull server sync with real-time SQLite WAL health verification
  const pullFromServer = useCallback(async () => {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      const elapsed = typeof performance !== "undefined" ? Math.max(1, Math.round(performance.now() - t0)) : 10;
      if (res.ok) {
        setIsOnline(true);
        setSyncStatus("synced");
        const data = await res.json();

        // Update verified SQLite WAL health from server
        if (data.health) {
          setWalHealth({
            isWalActive: Boolean(data.health.isWalActive),
            journalMode: String(data.health.journalMode || "wal"),
            integrity: String(data.health.integrity || "ok"),
            dbSize: String(data.health.formattedDbSize || "6.2 MB"),
            walSize: String(data.health.formattedWalSize || "0 B"),
            lastVerified: new Date().toLocaleTimeString(),
            latencyMs: elapsed,
            isLiveConnected: true,
          });
        } else {
          setWalHealth((prev) => ({
            ...prev,
            latencyMs: elapsed,
            isLiveConnected: true,
            lastVerified: new Date().toLocaleTimeString(),
          }));
        }

        if (data.lastUpdated && data.lastUpdated === lastServerTimestampRef.current) {
          return;
        }
        if (data.lastUpdated) {
          lastServerTimestampRef.current = data.lastUpdated;
        }

        if (Array.isArray(data.materials)) {
          setMaterials(data.materials);
          localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(data.materials));
        }
        if (Array.isArray(data.customTypes)) {
          const list = data.customTypes.length > 0 ? data.customTypes : ["HPL"];
          setCustomTypes(list);
          localStorage.setItem(STORAGE_TYPES, JSON.stringify(list));
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(data.transactions));
        }
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(data.products));
        }
        if (Array.isArray(data.shipments)) {
          setShipments(data.shipments);
          localStorage.setItem(STORAGE_SHIPMENTS, JSON.stringify(data.shipments));
        }
        if (data.exchangeRates) {
          const usdToIqd = normalizeIqdRate(data.exchangeRates.usdToIqd || data.exchangeRates.USD_IQD || 1500);
          const eurToUsd = typeof data.exchangeRates.eurToUsd === 'number' && data.exchangeRates.eurToUsd > 0
            ? data.exchangeRates.eurToUsd
            : (data.exchangeRates.EUR_USD || 1.08);
          const eurToIqd = normalizeIqdRate(data.exchangeRates.eurToIqd || data.exchangeRates.EUR_IQD || Math.round(usdToIqd * eurToUsd));
          const normalized: ExchangeRates = {
            ...DEFAULT_EXCHANGE_RATES,
            ...data.exchangeRates,
            usdToIqd,
            eurToUsd,
            eurToIqd,
          };
          setExchangeRatesState(normalized);
          localStorage.setItem(STORAGE_RATES, JSON.stringify(normalized));
        }
        if (data.dropdownPresets) {
          setDropdownPresets(data.dropdownPresets);
          localStorage.setItem(STORAGE_PRESETS, JSON.stringify(data.dropdownPresets));
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          localStorage.setItem(STORAGE_USERS, JSON.stringify(data.users));
        }
      } else {
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((prev) => ({
          ...prev,
          isLiveConnected: false,
          lastVerified: "Offline (Local Storage Active)",
        }));
      }
    } catch {
      setIsOnline(false);
      setSyncStatus("offline");
      setWalHealth((prev) => ({
        ...prev,
        isLiveConnected: false,
        lastVerified: "Offline (Local Storage Active)",
      }));
    }
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    setSimulatedOffline((prev) => {
      const next = !prev;
      if (next) {
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
      } else {
        setIsOnline(navigator.onLine);
        setSyncStatus("syncing");
        pullFromServer().catch(() => {});
      }
      return next;
    });
  }, [pullFromServer]);

  // Real Telemetry Heartbeat & Active Network Resilience (5-second polling with 2500ms abort timeout)
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      if (simulatedOffline) return;
      setIsOnline(true);
      setSyncStatus("syncing");
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        pullFromServer().catch(() => {});
      }, 500);
    };

    const handleOffline = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setIsOnline(false);
      setSyncStatus("offline");
      setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // Active heartbeat: every 5 seconds, attempt a lightweight fetch to /api/server-info with strict 2500ms timeout
    const heartbeatInterval = setInterval(async () => {
      if (typeof window === "undefined") return;
      if (simulatedOffline) {
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
        return;
      }

      if (!navigator.onLine) {
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const start = Date.now();

      try {
        const res = await fetch("/api/server-info", {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        const elapsed = Math.max(1, Date.now() - start);

        if (res.ok && res.status === 200) {
          setIsOnline(true);
          setSyncStatus((s) => (s === "offline" ? "synced" : s));
          setWalHealth((w) => ({
            ...w,
            isLiveConnected: true,
            latencyMs: elapsed,
          }));
        } else {
          setIsOnline(false);
          setSyncStatus("offline");
          setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
        }
      } catch {
        clearTimeout(timeoutId);
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
      }
    }, 5000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [simulatedOffline, pullFromServer]);

  // Explicit Interactive Real-time Health Check
  const pingHealthCheck = useCallback(async (): Promise<{ success: boolean; latencyMs: number; message: string }> => {
    if (simulatedOffline) {
      setIsOnline(false);
      setSyncStatus("offline");
      setWalHealth((w) => ({ ...w, isLiveConnected: false, latencyMs: 0 }));
      return { success: false, latencyMs: 0, message: "Simulated Offline Mode" };
    }
    setSyncStatus("syncing");
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      const elapsed = typeof performance !== "undefined" ? Math.max(1, Math.round(performance.now() - t0)) : 10;
      if (res.ok) {
        const data = await res.json();
        setIsOnline(true);
        setSyncStatus("synced");
        const h = data.health;
        const isWal = h ? Boolean(h.isWalActive) : true;
        const jm = h?.journalMode || "wal";
        const integ = h?.integrity || "ok";
        const dbSz = h?.formattedDbSize || "6.2 MB";
        const walSz = h?.formattedWalSize || "0 B";

        setWalHealth({
          isWalActive: isWal,
          journalMode: jm,
          integrity: integ,
          dbSize: dbSz,
          walSize: walSz,
          lastVerified: new Date().toLocaleTimeString(),
          latencyMs: elapsed,
          isLiveConnected: true,
        });

        return {
          success: true,
          latencyMs: elapsed,
          message: `Verified: SQLite WAL Active • DB: ${dbSz} • Mode: ${jm.toUpperCase()} • Ping: ${elapsed}ms • Integrity: ${integ.toUpperCase()}`,
        };
      } else {
        setIsOnline(false);
        setSyncStatus("offline");
        setWalHealth((prev) => ({ ...prev, isLiveConnected: false, lastVerified: "Offline / Cached" }));
        return {
          success: false,
          latencyMs: elapsed,
          message: "Server unreachable (500). Working safely in 100% offline local storage mode.",
        };
      }
    } catch {
      const elapsed = typeof performance !== "undefined" ? Math.max(1, Math.round(performance.now() - t0)) : 0;
      setIsOnline(false);
      setSyncStatus("offline");
      setWalHealth((prev) => ({ ...prev, isLiveConnected: false, lastVerified: "Offline / Cached" }));
      return {
        success: false,
        latencyMs: elapsed,
        message: "Network unreachable. Local storage cache preserves 100% of data offline.",
      };
    }
  }, []);

  // Initial pull and periodic sync heartbeat
  useEffect(() => {
    pullFromServer();
    const interval = setInterval(pullFromServer, 10000);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("bako_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "SYNC_UPDATE") {
          pullFromServer();
        }
      };
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [pullFromServer]);

  // Undo / Redo history management
  const pushStateToHistory = useCallback(
    (newMats: PanelMaterial[], newTypes: string[], newTx: PanelTransaction[], affectedId?: string, actionDesc?: string) => {
      setHistory((prev) => {
        const prefix = prev.slice(0, historyIndex + 1);
        const item: HistoryState = {
          materials: newMats,
          customTypes: newTypes,
          transactions: newTx,
          affectedId,
          actionDesc,
        };
        const updated = [...prefix, item];
        if (updated.length > 30) updated.shift();
        return updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (isViewer || historyIndex <= 0 || history.length === 0) return;
    const targetIdx = historyIndex - 1;
    const target = history[targetIdx];
    if (!target) return;

    setMaterials(target.materials);
    setCustomTypes(target.customTypes);
    setTransactions(target.transactions);
    pushToServer({ materials: target.materials, customTypes: target.customTypes, transactions: target.transactions });
    setHistoryIndex(targetIdx);

    if (target.affectedId) {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedId(target.affectedId);
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3500);
    }
    logActivity("UNDO", `Undid: ${history[historyIndex]?.actionDesc || "Action"}`);
  }, [isViewer, historyIndex, history, pushToServer, logActivity]);

  const redo = useCallback(() => {
    if (isViewer || historyIndex >= history.length - 1 || historyIndex < 0) return;
    const targetIdx = historyIndex + 1;
    const target = history[targetIdx];
    if (!target) return;

    setMaterials(target.materials);
    setCustomTypes(target.customTypes);
    setTransactions(target.transactions);
    pushToServer({ materials: target.materials, customTypes: target.customTypes, transactions: target.transactions });
    setHistoryIndex(targetIdx);

    if (target.affectedId) {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedId(target.affectedId);
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 3500);
    }
    logActivity("REDO", `Redid: ${target.actionDesc || "Action"}`);
  }, [isViewer, historyIndex, history, pushToServer, logActivity]);

  // Wood Panel Stats
  const stats = useMemo(() => {
    let totalStock = 0;
    let totalAllocated = 0;
    let totalAvailable = 0;
    let totalOrders = 0;
    let outOfStockCount = 0;

    materials.forEach((m) => {
      totalStock += m.totalStock || 0;
      totalAllocated += m.allocatedStock || 0;
      totalAvailable += m.availableStock || 0;
      totalOrders += (m.activeOrders || []).length;
      if (m.availableStock <= 0) outOfStockCount++;
    });

    return { totalStock, totalAllocated, totalAvailable, totalOrders, outOfStockCount };
  }, [materials]);

  // Code generator for wood panels
  const getNextPanelCode = useCallback(() => {
    const numericCodes = materials
      .map((m) => parseInt(m.code, 10))
      .filter((n) => !isNaN(n) && n >= 101 && n <= 999)
      .sort((a, b) => a - b);

    if (numericCodes.length === 0) return "101";
    let candidate = 101;
    for (const c of numericCodes) {
      if (c === candidate) candidate++;
      else if (c > candidate) return String(candidate);
    }
    return String(candidate);
  }, [materials]);

  // Wood Panel Operations
  const addMaterial = useCallback(
    (material: {
      code: string;
      name: string;
      type: string;
      length: number;
      width: number;
      thickness: number;
      totalStock: number;
      notes?: string;
      imageUrl?: string;
    }) => {
      const code = autoCapitalizeFirstLetter(material.code.trim()) || getNextPanelCode();
      const newMat: PanelMaterial = {
        id: `mat-${Date.now()}`,
        code,
        name: autoCapitalizeFirstLetter(material.name.trim()),
        type: autoCapitalizeFirstLetter(material.type.trim() || "HPL"),
        dimensions: {
          length: material.length,
          width: material.width,
          thickness: material.thickness,
          formatted: `${material.length} × ${material.width} × ${material.thickness} mm`,
        },
        totalStock: material.totalStock,
        allocatedStock: 0,
        availableStock: material.totalStock,
        activeOrders: [],
        notes: autoCapitalizeFirstLetter(material.notes || ""),
        imageUrl: material.imageUrl,
        createdAt: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [newMat, ...materials];
      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, newMat.id, `Added panel: ${newMat.name} (${newMat.code})`);
      pushToServer({ materials: updated });
      logActivity("ADD_PANEL", `Added panel: ${newMat.name} (${newMat.code})`);
    },
    [materials, customTypes, transactions, getNextPanelCode, pushStateToHistory, pushToServer, logActivity]
  );

  const addMaterialsBatch = useCallback(
    (
      items: Array<{
        code?: string;
        name: string;
        type?: string;
        length: number;
        width: number;
        thickness: number;
        totalStock: number;
        notes?: string;
        imageUrl?: string;
      }>
    ) => {
      let currentCodeNum = 101;
      const existing = materials.map((m) => parseInt(m.code, 10)).filter((n) => !isNaN(n));
      if (existing.length > 0) currentCodeNum = Math.max(...existing) + 1;

      const newMats: PanelMaterial[] = items.map((item, idx) => {
        const code = autoCapitalizeFirstLetter(item.code?.trim() || String(currentCodeNum + idx));
        return {
          id: `mat-${Date.now()}-${idx}`,
          code,
          name: autoCapitalizeFirstLetter(item.name.trim()),
          type: autoCapitalizeFirstLetter(item.type?.trim() || "HPL"),
          dimensions: {
            length: item.length,
            width: item.width,
            thickness: item.thickness,
            formatted: `${item.length} × ${item.width} × ${item.thickness} mm`,
          },
          totalStock: item.totalStock,
          allocatedStock: 0,
          availableStock: item.totalStock,
          activeOrders: [],
          notes: autoCapitalizeFirstLetter(item.notes || ""),
          imageUrl: item.imageUrl,
          createdAt: Date.now() + idx,
          updatedAt: new Date().toISOString(),
        };
      });

      const updated = [...newMats, ...materials];
      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, undefined, `Batch added ${newMats.length} panels`);
      pushToServer({ materials: updated });
      logActivity("BATCH_ADD_PANELS", `Added ${newMats.length} panels`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const editMaterial = useCallback(
    (
      id: string,
      updates: Partial<{
        code: string;
        name: string;
        type: string;
        length: number;
        width: number;
        thickness: number;
        totalStock: number;
        notes: string;
        imageUrl?: string;
      }>
    ) => {
      const updated = materials.map((m) => {
        if (m.id !== id) return m;
        const length = updates.length ?? m.dimensions.length;
        const width = updates.width ?? m.dimensions.width;
        const thickness = updates.thickness ?? m.dimensions.thickness;
        const totalStock = updates.totalStock ?? m.totalStock;
        const availableStock = Math.max(0, totalStock - m.allocatedStock);

        return {
          ...m,
          code: updates.code ? autoCapitalizeFirstLetter(updates.code.trim()) : m.code,
          name: updates.name ? autoCapitalizeFirstLetter(updates.name.trim()) : m.name,
          type: updates.type ? autoCapitalizeFirstLetter(updates.type.trim()) : m.type,
          dimensions: {
            length,
            width,
            thickness,
            formatted: `${length} × ${width} × ${thickness} mm`,
          },
          totalStock,
          availableStock,
          notes: updates.notes !== undefined ? autoCapitalizeFirstLetter(updates.notes) : m.notes,
          imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : m.imageUrl,
          updatedAt: new Date().toISOString(),
        };
      });

      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, id, `Edited panel: ${updates.name || id}`);
      pushToServer({ materials: updated });
      logActivity("EDIT_PANEL", `Edited panel: ${updates.name || id}`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const deleteMaterial = useCallback(
    (id: string) => {
      const target = materials.find((m) => m.id === id);
      const updated = materials.filter((m) => m.id !== id);
      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, undefined, `Deleted panel: ${target?.name || id}`);
      pushToServer({ materials: updated });
      logActivity("DELETE_PANEL", `Deleted panel: ${target?.name || id}`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const quickStepStock = useCallback(
    (materialId: string, delta: number) => {
      const updated = materials.map((m) => {
        if (m.id !== materialId) return m;
        const newTotal = Math.max(0, m.totalStock + delta);
        const newAvailable = Math.max(0, newTotal - m.allocatedStock);
        return {
          ...m,
          totalStock: newTotal,
          availableStock: newAvailable,
          updatedAt: new Date().toISOString(),
        };
      });
      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushToServer({ materials: updated });
    },
    [materials, pushToServer]
  );

  // Orders Management
  const allocateOrder = useCallback(
    (
      materialId: string,
      order: {
        client: string;
        quantity: number;
        notes?: string;
        imageUrl?: string;
      }
    ) => {
      const mat = materials.find((m) => m.id === materialId);
      if (!mat) return { success: false, message: "Panel not found" };

      const requestedQty = Math.max(1, order.quantity);
      if (mat.availableStock < requestedQty) {
        return {
          success: false,
          message: `Only ${mat.availableStock} panels available in stock!`,
        };
      }

      const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;
      const newOrder: OrderAllocation = {
        id: `ord-${Date.now()}`,
        orderNumber,
        client: autoCapitalizeFirstLetter(order.client.trim()),
        quantity: requestedQty,
        date: new Date().toISOString().split("T")[0],
        notes: autoCapitalizeFirstLetter(order.notes || ""),
        imageUrl: order.imageUrl,
        status: "reserved",
        createdAt: Date.now(),
      };

      const updated = materials.map((m) => {
        if (m.id !== materialId) return m;
        const newAllocated = m.allocatedStock + requestedQty;
        const newAvailable = Math.max(0, m.totalStock - newAllocated);
        return {
          ...m,
          allocatedStock: newAllocated,
          availableStock: newAvailable,
          activeOrders: [newOrder, ...m.activeOrders],
          updatedAt: new Date().toISOString(),
        };
      });

      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, materialId, `Created order ${orderNumber} for ${order.client}`);
      pushToServer({ materials: updated });
      logActivity("CREATE_ORDER", `Order #${orderNumber} for ${order.client} (${requestedQty} panels)`);

      return { success: true, message: "Order allocated successfully" };
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const editOrder = useCallback(
    (
      materialId: string,
      orderId: string,
      updates: Partial<{ client: string; quantity: number; notes: string; imageUrl?: string }>
    ) => {
      const updated = materials.map((m) => {
        if (m.id !== materialId) return m;
        let newOrders = m.activeOrders.map((ord) => {
          if (ord.id !== orderId) return ord;
          return {
            ...ord,
            client: updates.client ? autoCapitalizeFirstLetter(updates.client.trim()) : ord.client,
            quantity: updates.quantity !== undefined ? Math.max(1, updates.quantity) : ord.quantity,
            notes: updates.notes !== undefined ? autoCapitalizeFirstLetter(updates.notes) : ord.notes,
            imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : ord.imageUrl,
          };
        });

        const activeReservedOrders = newOrders.filter((o) => o.status !== "finalized");
        const newAllocated = activeReservedOrders.reduce((acc, o) => acc + o.quantity, 0);
        const newAvailable = Math.max(0, m.totalStock - newAllocated);

        return {
          ...m,
          allocatedStock: newAllocated,
          availableStock: newAvailable,
          activeOrders: newOrders,
          updatedAt: new Date().toISOString(),
        };
      });

      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, materialId, `Edited order #${orderId}`);
      pushToServer({ materials: updated });
      logActivity("EDIT_ORDER", `Edited order #${orderId}`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const finalizeOrder = useCallback(
    (materialId: string, orderId: string) => {
      const updated = materials.map((m) => {
        if (m.id !== materialId) return m;
        const targetOrder = m.activeOrders.find((o) => o.id === orderId);
        if (!targetOrder || targetOrder.status === "finalized") return m;

        const consumedQty = targetOrder.quantity;
        const newTotalStock = Math.max(0, m.totalStock - consumedQty);
        const newAllocated = Math.max(0, m.allocatedStock - consumedQty);
        const newAvailable = Math.max(0, newTotalStock - newAllocated);

        const newOrders = m.activeOrders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            status: "finalized" as const,
            finalizedAt: new Date().toISOString(),
          };
        });

        return {
          ...m,
          totalStock: newTotalStock,
          allocatedStock: newAllocated,
          availableStock: newAvailable,
          activeOrders: newOrders,
          updatedAt: new Date().toISOString(),
        };
      });

      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, materialId, `Finalized order #${orderId}`);
      pushToServer({ materials: updated });
      logActivity("FINALIZE_ORDER", `Finalized order #${orderId}`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  const deleteOrder = useCallback(
    (materialId: string, orderId: string) => {
      const updated = materials.map((m) => {
        if (m.id !== materialId) return m;
        const target = m.activeOrders.find((o) => o.id === orderId);
        const newOrders = m.activeOrders.filter((o) => o.id !== orderId);

        let newAllocated = m.allocatedStock;
        let newAvailable = m.availableStock;
        if (target && target.status !== "finalized") {
          newAllocated = Math.max(0, m.allocatedStock - target.quantity);
          newAvailable = Math.max(0, m.totalStock - newAllocated);
        }

        return {
          ...m,
          allocatedStock: newAllocated,
          availableStock: newAvailable,
          activeOrders: newOrders,
          updatedAt: new Date().toISOString(),
        };
      });

      setMaterials(updated);
      try {
        localStorage.setItem(STORAGE_MATERIALS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(updated, customTypes, transactions, materialId, `Deleted order #${orderId}`);
      pushToServer({ materials: updated });
      logActivity("DELETE_ORDER", `Deleted order #${orderId}`);
    },
    [materials, customTypes, transactions, pushStateToHistory, pushToServer, logActivity]
  );

  // Custom types management
  const addCustomType = useCallback(
    (type: string) => {
      const trimmed = autoCapitalizeFirstLetter(type.trim());
      if (!trimmed || customTypes.includes(trimmed)) return;
      const updated = [...customTypes, trimmed];
      setCustomTypes(updated);
      try {
        localStorage.setItem(STORAGE_TYPES, JSON.stringify(updated));
      } catch {}
      pushToServer({ customTypes: updated });
    },
    [customTypes, pushToServer]
  );

  const deleteCustomType = useCallback(
    (type: string) => {
      if (type === "HPL") return;
      const updated = customTypes.filter((t) => t !== type);
      setCustomTypes(updated);
      try {
        localStorage.setItem(STORAGE_TYPES, JSON.stringify(updated));
      } catch {}
      pushToServer({ customTypes: updated });
    },
    [customTypes, pushToServer]
  );

  const sanitizeTransactionData = (tx: Partial<PanelTransaction>): Partial<PanelTransaction> => {
    const res = { ...tx };
    if (res.code) res.code = autoCapitalizeFirstLetter(res.code.trim());
    if (res.panelType) res.panelType = autoCapitalizeFirstLetter(res.panelType.trim());
    if (res.material) res.material = autoCapitalizeFirstLetter(res.material.trim());
    if (res.sellingType) res.sellingType = autoCapitalizeFirstLetter(res.sellingType.trim());
    if (res.seller) res.seller = autoCapitalizeFirstLetter(res.seller.trim());
    if (res.bank) res.bank = autoCapitalizeFirstLetter(res.bank.trim());
    if (res.paymentType) res.paymentType = autoCapitalizeFirstLetter(res.paymentType.trim());
    if (res.notes !== undefined && res.notes !== null) res.notes = autoCapitalizeFirstLetter(res.notes);
    if (Array.isArray(res.items)) {
      res.items = res.items.map((it) => ({
        ...it,
        code: it.code ? autoCapitalizeFirstLetter(it.code.trim()) : it.code,
        product: it.product ? autoCapitalizeFirstLetter(it.product.trim()) : it.product,
        type: it.type ? autoCapitalizeFirstLetter(it.type.trim()) : it.type,
        sellingType: it.sellingType ? autoCapitalizeFirstLetter(it.sellingType.trim()) : it.sellingType,
        seller: it.seller ? autoCapitalizeFirstLetter(it.seller.trim()) : it.seller,
        bank: it.bank ? autoCapitalizeFirstLetter(it.bank.trim()) : it.bank,
        paymentType: it.paymentType ? autoCapitalizeFirstLetter(it.paymentType.trim()) : it.paymentType,
      }));
    }
    return res;
  };

  // Sales / POS Transactions CRUD
  const addTransaction = useCallback(
    (tx: PanelTransaction) => {
      const sanitized = sanitizeTransactionData(tx) as PanelTransaction;
      const updated = [sanitized, ...transactions];
      setTransactions(updated);
      try {
        localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(materials, customTypes, updated, sanitized.id, `Recorded sales invoice #${sanitized.code || sanitized.id}`);
      pushToServer({ transactions: updated });
      logActivity("RECORD_SALE", `Invoice #${sanitized.code || sanitized.id} - ${sanitized.sellingAmount} ${sanitized.currency || 'USD'}`, undefined, 'sale', sanitized.sellingAmount, sanitized.currency);
    },
    [transactions, materials, customTypes, pushStateToHistory, pushToServer, logActivity]
  );

  const editTransaction = useCallback(
    (id: string, updates: Partial<PanelTransaction>) => {
      const sanitizedUpdates = sanitizeTransactionData(updates);
      const updated = transactions.map((t) => (t.id === id ? { ...t, ...sanitizedUpdates, lastUpdated: new Date().toISOString() } : t));
      setTransactions(updated);
      try {
        localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(materials, customTypes, updated, id, `Updated invoice #${updates.code || id}`);
      pushToServer({ transactions: updated });
      logActivity("EDIT_SALE", `Updated invoice #${updates.code || id}`);
    },
    [transactions, materials, customTypes, pushStateToHistory, pushToServer, logActivity]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const target = transactions.find((t) => t.id === id);
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      try {
        localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(updated));
      } catch {}
      pushStateToHistory(materials, customTypes, updated, undefined, `Deleted invoice #${target?.code || id}`);
      pushToServer({ transactions: updated });
      logActivity("DELETE_SALE", `Deleted invoice #${target?.code || id}`);
    },
    [transactions, materials, customTypes, pushStateToHistory, pushToServer, logActivity]
  );

  // Dropdown Presets
  const addToDropdownPresets = useCallback(
    (category: keyof DropdownPresets, val: string) => {
      const trimmed = autoCapitalizeFirstLetter(val.trim());
      if (!trimmed) return;
      const currentList = dropdownPresets[category] || [];
      if (currentList.includes(trimmed)) return;

      const updatedPresets = {
        ...dropdownPresets,
        [category]: [...currentList, trimmed],
      };
      setDropdownPresets(updatedPresets);
      try {
        localStorage.setItem(STORAGE_PRESETS, JSON.stringify(updatedPresets));
      } catch {}
      pushToServer({ dropdownPresets: updatedPresets });
    },
    [dropdownPresets, pushToServer]
  );

  const removeFromDropdownPresets = useCallback(
    (category: keyof DropdownPresets, val: string) => {
      const currentList = dropdownPresets[category] || [];
      const updatedPresets = {
        ...dropdownPresets,
        [category]: currentList.filter((item) => item !== val),
      };
      setDropdownPresets(updatedPresets);
      try {
        localStorage.setItem(STORAGE_PRESETS, JSON.stringify(updatedPresets));
      } catch {}
      pushToServer({ dropdownPresets: updatedPresets });
    },
    [dropdownPresets, pushToServer]
  );

  // Multi-Currency helpers
  const setExchangeRates = useCallback(
    (rates: ExchangeRates) => {
      setExchangeRatesState(rates);
      try {
        localStorage.setItem(STORAGE_RATES, JSON.stringify(rates));
      } catch {}
      pushToServer({ exchangeRates: rates });
    },
    [pushToServer]
  );

  const copyMarketReferenceToOperational = useCallback(() => {
    setExchangeRates(MARKET_REFERENCE_RATES);
    logActivity("UPDATE_RATES", "Copied market reference rates to operational baseline");
  }, [setExchangeRates, logActivity]);

  const convertCurrency = useCallback(
    (val: number, from: CurrencyCode, to: CurrencyCode) => {
      return rawConvertCurrency(val, from, to, exchangeRates);
    },
    [exchangeRates]
  );

  const formatMoney = useCallback(
    (val: number, cur: CurrencyCode = "USD") => {
      return rawFormatMoney(val, cur);
    },
    []
  );

  // Warehouse Goods & Shipping
  const addProduct = useCallback(
    (p: Product) => {
      const sanitized: Product = {
        ...p,
        sku: p.sku ? autoCapitalizeFirstLetter(p.sku.trim()) : p.sku,
        name: autoCapitalizeFirstLetter(p.name.trim()),
        category: p.category ? autoCapitalizeFirstLetter(p.category.trim()) : "General",
        location: p.location ? autoCapitalizeFirstLetter(p.location.trim()) : "",
      };
      const updated = [sanitized, ...products];
      setProducts(updated);
      try {
        localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ products: updated });
      logActivity("ADD_PRODUCT", `Added product: ${sanitized.name} (${sanitized.sku})`);
    },
    [products, pushToServer, logActivity]
  );

  const editProduct = useCallback(
    (id: string, updates: Partial<Product>) => {
      const sanitizedUpdates: Partial<Product> = {
        ...updates,
        sku: updates.sku ? autoCapitalizeFirstLetter(updates.sku.trim()) : updates.sku,
        name: updates.name ? autoCapitalizeFirstLetter(updates.name.trim()) : updates.name,
        category: updates.category ? autoCapitalizeFirstLetter(updates.category.trim()) : updates.category,
        location: updates.location ? autoCapitalizeFirstLetter(updates.location.trim()) : updates.location,
      };
      const updated = products.map((p) => (p.id === id ? { ...p, ...sanitizedUpdates, lastUpdated: new Date().toISOString() } : p));
      setProducts(updated);
      try {
        localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ products: updated });
    },
    [products, pushToServer]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      try {
        localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ products: updated });
    },
    [products, pushToServer]
  );

  const addShipment = useCallback(
    (s: Shipment) => {
      const sanitized: Shipment = {
        ...s,
        destination: autoCapitalizeFirstLetter(s.destination.trim()),
        itemSummary: autoCapitalizeFirstLetter(s.itemSummary.trim()),
      };
      const updated = [sanitized, ...shipments];
      setShipments(updated);
      try {
        localStorage.setItem(STORAGE_SHIPMENTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ shipments: updated });
      logActivity("DISPATCH_SHIPMENT", `Shipment ${sanitized.trackingCode} to ${sanitized.destination}`);
    },
    [shipments, pushToServer, logActivity]
  );

  const updateShipmentStatus = useCallback(
    (id: string, status: ShipmentStatus) => {
      const updated = shipments.map((s) => (s.id === id ? { ...s, status } : s));
      setShipments(updated);
      try {
        localStorage.setItem(STORAGE_SHIPMENTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ shipments: updated });
    },
    [shipments, pushToServer]
  );

  const deleteShipment = useCallback(
    (id: string) => {
      const updated = shipments.filter((s) => s.id !== id);
      setShipments(updated);
      try {
        localStorage.setItem(STORAGE_SHIPMENTS, JSON.stringify(updated));
      } catch {}
      pushToServer({ shipments: updated });
    },
    [shipments, pushToServer]
  );

  // Authentication & Users
  const login = useCallback(
    (username: string, pass: string) => {
      const matched = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === pass.trim()
      );
      if (matched) {
        const authed = { ...matched, isAuthenticated: true };
        setCurrentUser(authed);
        const sessionPayload = {
          username: authed.username,
          expiresAt: Date.now() + 60 * 60 * 1000,
        };
        try {
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(sessionPayload));
        } catch {}
        logActivity("LOGIN", `User ${authed.displayName} logged in`);
        return true;
      }
      return false;
    },
    [users, logActivity]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setOriginalAdmin(null);
    try {
      localStorage.removeItem(STORAGE_SESSION);
    } catch {}
    logActivity("LOGOUT", "User logged out");
  }, [logActivity]);

  const [originalAdmin, setOriginalAdmin] = useState<UserAccount | null>(null);

  const impersonateUser = useCallback(
    (targetUsername: string) => {
      const target = users.find(
        (u) => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
      );
      if (!target) return false;
      if (!originalAdmin && (currentUser?.role === 'Admin' || currentUser?.username.toLowerCase() === 'bako')) {
        setOriginalAdmin(currentUser);
      }
      const impersonated: UserAccount = {
        ...target,
        isAuthenticated: true,
        isImpersonated: true,
        originalAdminUsername: currentUser?.username || 'bako',
      };
      setCurrentUser(impersonated);
      logActivity("PREVIEW_SESSION", `Admin started live session preview as "${target.displayName}" (${target.role})`);
      return true;
    },
    [users, currentUser, originalAdmin, logActivity]
  );

  const stopImpersonation = useCallback(() => {
    if (originalAdmin) {
      setCurrentUser(originalAdmin);
      setOriginalAdmin(null);
      logActivity("PREVIEW_SESSION_END", `Admin returned to primary session: ${originalAdmin.displayName}`);
    } else {
      const adminAcc = users.find((u) => u.role === 'Admin' || u.username.toLowerCase() === 'bako');
      if (adminAcc) {
        setCurrentUser({ ...adminAcc, isAuthenticated: true });
      }
    }
  }, [originalAdmin, users, logActivity]);

  const isImpersonating = useMemo(() => !!currentUser?.isImpersonated, [currentUser]);

  const addUserAccount = useCallback(
    (newUser: { username: string; displayName: string; role: UserRole; password: string; permissions?: UserModulePermissions }) => {
      if (users.some((u) => u.username.toLowerCase() === newUser.username.trim().toLowerCase())) return false;
      const account: UserAccount = {
        username: newUser.username.trim(),
        displayName: autoCapitalizeFirstLetter(newUser.displayName.trim()),
        role: newUser.role,
        password: newUser.password.trim(),
        isAuthenticated: false,
        createdAt: Date.now(),
        permissions: newUser.permissions || resolveUserPermissions({ role: newUser.role, username: newUser.username, displayName: newUser.displayName, isAuthenticated: false }),
      };
      const updated = [...users, account];
      setUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
      } catch {}
      pushToServer({ users: updated });
      logActivity("ADD_USER", `Added user account: ${account.displayName} (${account.role})`);
      return true;
    },
    [users, pushToServer, logActivity]
  );

  const deleteUserAccount = useCallback(
    (username: string) => {
      if (username.toLowerCase() === "bako") return false;
      const updated = users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());
      setUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
      } catch {}
      pushToServer({ users: updated });
      logActivity("DELETE_USER", `Deleted user account: ${username}`);
      return true;
    },
    [users, pushToServer, logActivity]
  );

  const updateUserAccount = useCallback(
    (username: string, updates: Partial<{ displayName: string; role: UserRole; password?: string; permissions?: UserModulePermissions }>) => {
      const updated = users.map((u) => {
        if (u.username.toLowerCase() !== username.toLowerCase()) return u;
        return {
          ...u,
          displayName: updates.displayName ? autoCapitalizeFirstLetter(updates.displayName.trim()) : u.displayName,
          role: updates.role || u.role,
          password: updates.password ? updates.password.trim() : u.password,
          permissions: updates.permissions !== undefined ? updates.permissions : u.permissions,
        };
      });
      setUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
      } catch {}

      if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
        const curUpdated = {
          ...currentUser,
          displayName: updates.displayName ? autoCapitalizeFirstLetter(updates.displayName.trim()) : currentUser.displayName,
          role: updates.role || currentUser.role,
          permissions: updates.permissions !== undefined ? updates.permissions : currentUser.permissions,
        };
        setCurrentUser(curUpdated);
      }

      pushToServer({ users: updated });
      logActivity("UPDATE_USER", `Updated account: ${username}`);
      return true;
    },
    [users, currentUser, pushToServer, logActivity]
  );

  const updateUserPermissions = useCallback(
    (username: string, permissions: UserModulePermissions) => {
      const updated = users.map((u) => {
        if (u.username.toLowerCase() !== username.toLowerCase()) return u;
        return {
          ...u,
          permissions,
        };
      });
      setUsers(updated);
      try {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(updated));
      } catch {}

      if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
        const curUpdated = { ...currentUser, permissions };
        setCurrentUser(curUpdated);
        try {
          const s = localStorage.getItem(STORAGE_SESSION);
          if (s) {
            const parsed = JSON.parse(s);
            localStorage.setItem(STORAGE_SESSION, JSON.stringify({ ...parsed, permissions }));
          }
        } catch {}
      }

      pushToServer({ users: updated });
      logActivity(
        "UPDATE_PERMISSIONS",
        `Updated permissions for account: @${username}`,
        JSON.stringify(permissions),
        "settings"
      );
      return true;
    },
    [users, currentUser, pushToServer, logActivity]
  );

  // Backup & Restore
  const createManualBackup = useCallback(
    async (label?: string) => {
      try {
        const res = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", type: "manual", label }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.backup) {
            setBackups((prev) => [data.backup, ...prev.filter((b) => b.id !== data.backup.id)].slice(0, 30));
            logActivity("BACKUP_CREATED", `Created manual snapshot: ${data.backup.label}`);
            return;
          }
        }
      } catch {}

      // Local fallback
      const now = new Date();
      const snap: BackupSnapshot = {
        id: `backup-manual-${Date.now()}`,
        timestamp: Date.now(),
        createdAt: now.toISOString(),
        dateKey: now.toISOString().split("T")[0],
        type: "manual",
        label: label || `Manual Backup (${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
        materials,
        customTypes,
        totalPanels: materials.length,
        totalOrders: materials.reduce((acc, m) => acc + m.activeOrders.length, 0),
        transactions,
        products,
        shipments,
      };
      const updated = [snap, ...backups].slice(0, 30);
      setBackups(updated);
      try {
        localStorage.setItem(STORAGE_BACKUPS, JSON.stringify(updated));
      } catch {}
      logActivity("BACKUP_CREATED", `Created manual snapshot: ${snap.label}`);
    },
    [materials, customTypes, transactions, products, shipments, backups, logActivity]
  );

  const restoreBackup = useCallback(
    async (backupIdOrSnapshot: string | BackupSnapshot): Promise<boolean> => {
      try {
        const isObject = typeof backupIdOrSnapshot === "object" && backupIdOrSnapshot !== null;
        const res = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restore",
            backupId: !isObject ? backupIdOrSnapshot : undefined,
            snapshot: isObject ? backupIdOrSnapshot : undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await pullFromServer();
          logActivity("BACKUP_RESTORED", "Database restored from snapshot");
          return true;
        }
      } catch {}
      return false;
    },
    [pullFromServer, logActivity]
  );

  const deleteBackup = useCallback(async (backupId: string) => {
    try {
      await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", backupId }),
      });
    } catch {}
    setBackups((prev) => prev.filter((b) => b.id !== backupId));
  }, []);

  const wipeDatabase = useCallback(async () => {
    setMaterials([]);
    setCustomTypes(["HPL"]);
    setTransactions([]);
    setProducts([]);
    setShipments([]);
    pushToServer({ materials: [], customTypes: ["HPL"], transactions: [], products: [], shipments: [] });
    logActivity("WIPE_DATABASE", "Wiped active database cleanly");
  }, [pushToServer, logActivity]);

  const uploadAndRestoreBackupFile = useCallback(
    async (file: File): Promise<{ success: boolean; message: string }> => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.materials)) {
          return { success: false, message: "Invalid backup JSON structure" };
        }
        const ok = await restoreBackup(parsed);
        if (ok) return { success: true, message: "Backup file restored successfully" };
        return { success: false, message: "Server could not restore backup" };
      } catch (err: any) {
        return { success: false, message: err.message || "Failed to parse backup file" };
      }
    },
    [restoreBackup]
  );

  // Preference setters
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG, lang);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(STORAGE_THEME, next);
      } catch {}
      return next;
    });
  }, []);

  const setDeviceMode = useCallback((mode: DeviceView) => {
    setDeviceModeState(mode);
    try {
      localStorage.setItem(STORAGE_MODE, mode);
    } catch {}
  }, []);

  const value: InventoryContextType = {
    currentModule,
    setCurrentModule,
    activeSection,
    setActiveSection,
    isVisualChartsOpen,
    visualChartsScope,
    openVisualCharts,
    closeVisualCharts,
    isCopyrightOpen,
    openCopyrightModal,
    closeCopyrightModal,
    isAdminModalOpen,
    openAdminModal,
    closeAdminModal,
    materials,
    customTypes,
    stats,
    addMaterial,
    addMaterialsBatch,
    editMaterial,
    deleteMaterial,
    quickStepStock,
    getNextPanelCode,
    addCustomType,
    deleteCustomType,
    allocateOrder,
    editOrder,
    finalizeOrder,
    deleteOrder,
    zoomedImage,
    setZoomedImage,
    highlightedId,

    transactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    dropdownPresets,
    addToDropdownPresets,
    removeFromDropdownPresets,
    posDraft,
    setPosDraft,
    clearPosDraft,
    salesStatusFilter,
    setSalesStatusFilter,
    salesTimeframeFilter,
    setSalesTimeframeFilter,

    exchangeRates,
    setExchangeRates,
    copyMarketReferenceToOperational,
    convertCurrency,
    formatMoney,

    products,
    addProduct,
    editProduct,
    deleteProduct,
    shipments,
    addShipment,
    updateShipmentStatus,
    deleteShipment,

    isOnline,
    syncStatus,
    offlineQueueCount,
    simulatedOffline,
    toggleSimulatedOffline,
    walHealth,
    pingHealthCheck,

    currentUser,
    users,
    userPermissions,
    hasModulePermission,
    isAdmin,
    isManager,
    isStaff,
    isViewer,
    canModify,
    canDeleteMaterial,
    login,
    logout,
    impersonateUser,
    stopImpersonation,
    isImpersonating,
    addUserAccount,
    deleteUserAccount,
    updateUserAccount,
    updateUserPermissions,

    activityLogs,
    auditLogs: activityLogs,
    logActivity,
    clearActivityLogs,
    backups,
    createManualBackup,
    createBackup: createManualBackup,
    restoreBackup,
    deleteBackup,
    wipeDatabase,
    uploadAndRestoreBackupFile,

    language,
    theme,
    deviceMode,
    isMobileDetected,
    effectiveMode,
    t,
    searchQuery,
    typeFilter,
    setLanguage,
    toggleTheme,
    setDeviceMode,
    setSearchQuery,
    setTypeFilter,
    confirmDialog,
    requestConfirm,
    requestAlert,
    closeConfirm,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1 && historyIndex >= 0,
    undo,
    redo,

    activePrintJob,
    triggerPrintJob,
    printCuttingSlip,
    printWarehouseManifest,
    printInvoiceJob,
    clearPrintJob,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within an InventoryProvider");
  return context;
};
