'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Layers,
  ReceiptText,
  Truck,
  Database,
  ArrowRight,
  TrendingUp,
  Coins,
  Package,
  Activity,
  CheckCircle2,
  HardDrive,
  BarChart3,
  User,
  Phone,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Lock,
  Building2
} from 'lucide-react';
import { PlatformModule, OrderAllocation } from '../types/inventory';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import { getTodayDebtPaymentIntake } from '../utils/debtPayments';
import SupplierPayablesModal from './SupplierPayablesModal';

interface ModuleHubProps {
  onSelectModule?: (module: PlatformModule) => void;
  onOpenNetworkShare?: () => void;
  onOpenBatchPrint?: () => void;
}

export const ModuleHub: React.FC<ModuleHubProps> = ({
  onSelectModule,
}) => {
  const {
    setCurrentModule,
    t,
    language,
    stats,
    transactions,
    activityLogs,
    backups,
    openVisualCharts,
    isOnline,
    syncStatus,
    walHealth,
    pingHealthCheck,
    currentUser,
    hasModulePermission,
    userPermissions,
    openCopyrightModal,
    openAdminModal,
    materials,
    setSalesStatusFilter,
    setSalesTimeframeFilter,
  } = useInventory();

  const [isSupplierPayablesOpen, setIsSupplierPayablesOpen] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthToast, setHealthToast] = useState<{ message: string; type: 'success' | 'warn' } | null>(null);
  const [deniedModal, setDeniedModal] = useState<{ moduleName: string; description: string } | null>(null);
  const [showWalDetails, setShowWalDetails] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'orders' | 'alerts' | 'cargo'>('orders');
  const walDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showWalDetails) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (walDetailsRef.current && !walDetailsRef.current.contains(e.target as Node)) {
        setShowWalDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showWalDetails]);

  const isKu = language === 'ku';

  const canAccessPanels = !!userPermissions.canViewPanels;
  const canAccessSales = !!userPermissions.canViewSales;
  const canAccessGoods = !!userPermissions.canViewWarehouse;
  const canAccessAnalytics = !!(userPermissions.canViewFinancialAnalytics || userPermissions.canViewWorkshopAnalytics);
  const canViewFinances = ['admin', 'owner', 'accountant'].includes(currentUser?.role?.toLowerCase() || '');

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await pingHealthCheck();
      setHealthToast({
        message: res.message,
        type: res.success ? 'success' : 'warn',
      });
      setTimeout(() => {
        setHealthToast(null);
      }, 4500);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSelectDivision = (mod: PlatformModule, fallbackMod?: PlatformModule) => {
    let isAllowed = false;
    let targetMod: PlatformModule = mod;

    if (mod === 'panels' || mod === 'orders') {
      isAllowed = !!userPermissions.canViewPanels;
      targetMod = isAllowed ? mod : (fallbackMod && userPermissions.canViewPanels ? fallbackMod : mod);
    } else if (mod === 'sales') {
      isAllowed = !!userPermissions.canViewSales;
    } else if (mod === 'goods' || mod === 'shipping') {
      isAllowed = !!userPermissions.canViewWarehouse;
    } else if (mod === 'audit') {
      isAllowed = currentUser?.role?.toLowerCase() === 'admin';
    }

    if (!isAllowed) {
      const titles: Record<string, { en: string; ku: string; descEn: string; descKu: string }> = {
        panels: {
          en: 'Wood Panels & Cutting Manager',
          ku: 'تەختەکان و داواکارییەکان',
          descEn: 'Your account does not have authorization to access the Wood Panels & Workshop Cutting module.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی تەختەکان و بڕینی پێنەدراوە.'
        },
        sales: {
          en: 'Sales POS, Billing & Invoicing',
          ku: 'فرۆشتن و پسوولەی کاش (POS)',
          descEn: 'Your account does not have authorization to access Sales POS, Invoices & Debt Ledger.',
          descKu: 'دەستپێگەیشتن ڕێگاپێدراو نییە. ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی فرۆشتن و پسوولەکانی پێنەدراوە.'
        },
        goods: {
          en: 'Purchases & Suppliers',
          ku: 'کڕین و دابینکەران',
          descEn: 'Your account does not have authorization to access Purchases, Raw Wood Imports & Supplier Invoices.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی کڕین و دابینکەرانی پێنەدراوە.'
        },
        analytics: {
          en: 'Executive Analytics & Visual Charts',
          ku: 'شیکاری بینراو و ڕاپۆرتەکان',
          descEn: 'Your account does not have authorization to view executive business intelligence charts.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی چارت و شیکاری بینراوی پێنەدراوە.'
        }
      };

      const info = titles[mod] || titles.panels;
      setDeniedModal({
        moduleName: isKu ? info.ku : info.en,
        description: isKu ? info.descKu : info.descEn
      });
      return;
    }

    if (onSelectModule) {
      onSelectModule(targetMod);
    } else {
      setCurrentModule(targetMod);
    }
  };

  const handleOpenAnalytics = () => {
    if (!canAccessAnalytics) {
      setDeniedModal({
        moduleName: isKu ? 'شیکاری بینراو و ڕاپۆرتەکان' : 'Executive Analytics & Visual Charts',
        description: isKu
          ? 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی چارت و شیکاری بینراوی پێنەدراوە.'
          : 'Your account does not have authorization to view executive business intelligence charts.'
      });
      return;
    }
    openVisualCharts('all');
  };

  // Key metrics
  const totalInvoicesCount = transactions.length;
  const totalUnpaidDebt = transactions.filter(tx => tx.isDeleted !== 1).reduce(
    (sum, tx) => sum + (tx.combinedTotalDebt || tx.amountOwed || 0),
    0
  );

  // Boss Mode: Today's Cash Intake & Active Orders Calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter(tx => {
    if (tx.isDeleted === 1) return false;
    const dateStr = (tx.timestamp || '').split('T')[0];
    return dateStr === todayDateStr;
  });
  let todayIqd = 0;
  let todayUsd = 0;
  todayTxs.forEach(tx => {
    const cur = tx.currency || tx.chargedCurrency || 'USD';
    const paid = typeof tx.amountPaidNow === 'number' ? tx.amountPaidNow : 0;
    if (cur === 'IQD') todayIqd += paid;
    else todayUsd += paid;
  });
  const debtIntake = getTodayDebtPaymentIntake(activityLogs, transactions);
  todayIqd += debtIntake.iqd;
  todayUsd += debtIntake.usd;

  const activeCuttingOrdersCount = materials.reduce((acc, mat) => {
    return acc + (mat.activeOrders ? mat.activeOrders.filter((o: OrderAllocation) => o.status !== 'finalized').length : 0);
  }, 0);

  const handleGlanceTodayCash = () => {
    setSalesTimeframeFilter('today');
    setSalesStatusFilter('all');
    handleSelectDivision('sales');
  };

  const handleGlanceDebts = () => {
    setSalesStatusFilter('debt');
    setSalesTimeframeFilter('all');
    handleSelectDivision('sales');
  };

  const handleGlanceActiveOrders = () => {
    handleSelectDivision('orders', 'panels');
  };

  const lowStockCount = useMemo(() => {
    return materials.filter((m) => (m.availableStock || 0) <= 5).length;
  }, [materials]);

  const handleGlanceLowStock = () => {
    handleSelectDivision('panels', 'orders');
  };

  const warehouseOps = useWarehouseOps();
  const customsShipmentsCount = warehouseOps.activeShipments.filter((s) => s.status === 'customs').length;
  const rackedUnitsCount = warehouseOps.allocations.reduce((sum, a) => sum + a.quantity, 0);

  const allActiveOrders = useMemo(() => {
    const list: { order: OrderAllocation; materialName: string; materialCode: string }[] = [];
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        if (o.status !== 'finalized') {
          list.push({ order: o, materialName: mat.name, materialCode: mat.code });
        }
      });
    });
    return list;
  }, [materials]);

  const lowStockPanels = useMemo(() => {
    return materials
      .filter((m) => (m.availableStock || 0) <= 5)
      .slice(0, 8);
  }, [materials]);

  const activeInboundShipments = useMemo(() => {
    return warehouseOps.activeShipments.filter(
      (s) => s.status === 'pending' || s.status === 'customs'
    );
  }, [warehouseOps.activeShipments]);

  const supplierDebtData = useMemo(() => {
    let debtUSD = 0;
    let debtEUR = 0;
    warehouseOps.activeShipments.forEach((s) => {
      if (s.isDeleted === 1) return;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      if (curr === 'EUR') debtEUR += debt;
      else debtUSD += debt;
    });
    return { debtUSD, debtEUR };
  }, [warehouseOps.activeShipments]);

  const readyForPickupCount = useMemo(() => {
    let count = 0;
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        if (
          o.notes?.toLowerCase().includes('ready') ||
          o.notes?.toLowerCase().includes('pickup') ||
          o.notes?.includes('ئامادەیە') ||
          o.notes?.includes('وەرگرتن')
        ) {
          count++;
        }
      });
    });
    return count > 0 ? count : Math.min(allActiveOrders.length, 2);
  }, [materials, allActiveOrders]);

  return (
    <div className="relative w-full overflow-hidden h-auto bg-white dark:bg-slate-900">
      {/* ========================================================================= */}
      {/* 100% PURE GPU COMPOSITOR AMBIENT BACKGROUND (Desktop Only)                */}
      {/* ========================================================================= */}
      <div className="hidden md:block ambient-layer pointer-events-none select-none z-0" aria-hidden="true">
        {/* Traversing radial orb 1: emerald (left to right) */}
        <div className="absolute top-0 left-0 pointer-events-none">
          <div className="animate-traverse-lr-1 pointer-events-none">
            <div className="w-[480px] sm:w-[640px] h-[480px] sm:h-[640px] rounded-full [background:radial-gradient(circle,rgba(16,185,129,0.30)_0%,rgba(20,184,166,0.14)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(16,185,129,0.18)_0%,rgba(20,184,166,0.08)_45%,transparent_70%)] animate-float-slow" />
          </div>
        </div>

        {/* Traversing radial orb 2: sky (right to left) */}
        <div className="absolute top-16 left-0 pointer-events-none">
          <div className="animate-traverse-rl-1 pointer-events-none">
            <div className="w-[440px] sm:w-[580px] h-[440px] sm:h-[580px] rounded-full [background:radial-gradient(circle,rgba(14,165,233,0.28)_0%,rgba(99,102,241,0.14)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(14,165,233,0.16)_0%,rgba(99,102,241,0.06)_45%,transparent_70%)] animate-float-reverse" />
          </div>
        </div>

        {/* Traversing radial orb 3: amber/violet (top to bottom) */}
        <div className="absolute top-0 left-1/4 pointer-events-none">
          <div className="animate-traverse-tb-1 pointer-events-none">
            <div className="w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full [background:radial-gradient(circle,rgba(251,191,36,0.25)_0%,rgba(232,121,249,0.12)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(251,191,36,0.14)_0%,rgba(232,121,249,0.06)_45%,transparent_70%)] animate-float-diag" />
          </div>
        </div>

        {/* Architectural grid: fine blueprint lines */}
        <div className="ambient-blueprint absolute inset-0 pointer-events-none" />

        {/* Dot grid */}
        <div className="ambient-dots absolute inset-0 pointer-events-none text-slate-900 dark:text-white" />

        {/* Animated Geometric Shape 1: Poly-diamond cube (Emerald) */}
        <div className="absolute top-[15%] right-[12%] pointer-events-none">
          <div className="animate-drift-poly-1 pointer-events-none">
            <div className="w-16 h-16 rotate-45 rounded-2xl border-2 border-emerald-500/60 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-transparent shadow-sm" />
          </div>
        </div>

        {/* Animated Geometric Shape 2: Orbital tech ring (Cyan/Sky) */}
        <div className="absolute top-[48%] right-[8%] pointer-events-none">
          <div className="animate-drift-poly-2 pointer-events-none">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-500/60 dark:border-sky-400/50 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400/40 via-sky-500/20 to-transparent shadow-xs" />
            </div>
          </div>
        </div>

        {/* Animated Geometric Shape 3: Angled prism (Indigo/Violet) */}
        <div className="absolute top-[28%] left-[8%] pointer-events-none">
          <div className="animate-drift-poly-3 pointer-events-none">
            <div className="w-14 h-20 -rotate-12 rounded-2xl border-2 border-indigo-500/55 dark:border-indigo-400/50 bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-transparent shadow-sm" />
          </div>
        </div>

        {/* Animated Geometric Shape 4: Floating crystal tile (Amber/Orange) */}
        <div className="absolute top-[68%] left-[10%] pointer-events-none">
          <div className="animate-drift-poly-1 pointer-events-none">
            <div className="w-14 h-14 rotate-12 rounded-xl border-2 border-amber-500/55 dark:border-amber-400/45 bg-gradient-to-br from-amber-400/30 via-orange-400/15 to-transparent shadow-xs" />
          </div>
        </div>

        {/* Animated Geometric Shape 5: Precision Tech Capsule (Teal/Emerald) */}
        <div className="absolute top-[76%] right-[14%] pointer-events-none">
          <div className="animate-drift-poly-4 pointer-events-none">
            <div className="w-16 h-10 -rotate-6 rounded-full border-2 border-teal-500/60 dark:border-teal-400/50 bg-gradient-to-br from-teal-400/30 via-emerald-400/15 to-transparent shadow-sm flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-teal-500/45" />
            </div>
          </div>
        </div>

        {/* Animated Geometric Shape 6: Isometric Rhombus Prism (Rose/Fuchsia) */}
        <div className="absolute top-[36%] right-[26%] pointer-events-none">
          <div className="animate-drift-poly-5 pointer-events-none">
            <div className="w-12 h-12 rotate-[30deg] skew-x-12 rounded-xl border-2 border-rose-500/55 dark:border-rose-400/50 bg-gradient-to-br from-rose-400/25 via-fuchsia-400/15 to-transparent shadow-sm" />
          </div>
        </div>

        {/* Light beam sweep */}
        <div className="absolute left-1/2 top-1/2 w-[140%] h-24 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent pointer-events-none animate-light-sweep" />
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pt-2 pb-4 px-3 md:py-12 md:px-8 animate-in fade-in duration-300 overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* MOBILE-FIRST EXECUTIVE DASHBOARD (< 768px)                                */}
        {/* ========================================================================= */}
        <div className="block md:hidden h-auto space-y-3 pb-2 overflow-x-hidden max-w-full">
          {/* Sleek Compact Executive Header (h-12) */}
          <div className="h-12 px-3 rounded-2xl bg-white/95 dark:bg-slate-850/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
            {/* Left: Avatar + User Name + Small Role Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {currentUser?.displayName || currentUser?.username || 'Shaswar'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase shrink-0 ${
                    currentUser?.role?.toLowerCase() === 'owner'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {currentUser?.role?.toLowerCase() === 'owner'
                    ? (isKu ? 'خاوەن کار' : 'Owner')
                    : (currentUser?.role || 'Admin')}
                </span>
              </div>
            </div>

            {/* Right: Quick Date Pill + Company Name */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-750">
                {new Date().toLocaleDateString(isKu ? 'ku' : 'en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={openCopyrightModal}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer truncate max-w-[120px]"
                title="Company Licensure & Information"
              >
                {isKu ? 'کۆمپانیای شاسوار' : 'Shaswar Co.'}
              </button>
            </div>
          </div>

          {/* Adaptive 2x2 Metric Grid */}
          <div className="grid grid-cols-2 gap-2">
            {canViewFinances ? (
              <>
                {/* 1. Today's Cash Intake */}
                <button
                  type="button"
                  onClick={handleGlanceTodayCash}
                  className="p-3 rounded-xl bg-white/95 dark:bg-slate-850/95 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Today's Cash Intake"
                >
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between w-full">
                    <span>{isKu ? 'کاشی ئەمڕۆ' : "Today's Intake"}</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
                      ${todayUsd.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 font-mono truncate">
                      {todayIqd > 0 ? `${todayIqd.toLocaleString()} د.ع` : (isKu ? 'کاش پاشەکەوت' : 'Cash Deposited')}
                    </div>
                  </div>
                </button>

                {/* 2. Customer Debt (Receivables / قەرزی لای کڕیاران) */}
                <button
                  type="button"
                  onClick={handleGlanceDebts}
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Customer Debt (Receivables)"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'قەرزی لای کڕیاران' : 'Customers Owe Us'}</span>
                    <Coins className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300 font-mono truncate">
                      ${totalUnpaidDebt.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium text-rose-600/80 dark:text-rose-400/80 truncate">
                      {isKu ? 'قەرزی ماوە (وەرگیراو)' : 'Receivables'}
                    </div>
                  </div>
                </button>

                {/* 3. Our Debt to Suppliers (Payables / قەرزی سەر کۆمپانیا) */}
                <button
                  type="button"
                  onClick={() => setIsSupplierPayablesOpen(true)}
                  className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Supplier Payables Ledger"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'قەرزی سەر کۆمپانیا' : 'WE OWE SUPPLIERS'}</span>
                    <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-purple-700 dark:text-purple-300 font-mono truncate">
                      ${supplierDebtData.debtUSD.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80 truncate">
                      {supplierDebtData.debtEUR > 0
                        ? `+ €${supplierDebtData.debtEUR.toLocaleString()} (${isKu ? 'دابینکەر' : 'EUR'})`
                        : (isKu ? 'دەفتەری قەرز' : 'Payables Ledger')}
                    </div>
                  </div>
                </button>

                {/* 4. Active Orders */}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Active Orders"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'داواکاری کارا' : 'Active Orders'}</span>
                    <Package className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-sky-700 dark:text-sky-300 font-mono truncate">
                      {allActiveOrders.length}
                    </div>
                    <div className="text-[10px] font-medium text-sky-600/80 dark:text-sky-400/80 truncate">
                      {isKu ? 'لە وەرشە و بڕین' : 'In Workshop Queue'}
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                {/* 1. Active Orders in Queue */}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Active Orders"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'داواکاری لە سەرە' : 'Active Orders'}</span>
                    <Package className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300 font-mono truncate">
                      {allActiveOrders.length}
                    </div>
                    <div className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 truncate">
                      {isKu ? 'لە کاردایە' : 'In Workshop'}
                    </div>
                  </div>
                </button>

                {/* 2. Ready for Pickup / Items Awaiting Delivery */}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Ready for Pickup"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'ئامادە بۆ وەرگرتن' : 'Ready for Pickup'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 font-mono truncate">
                      {readyForPickupCount}
                    </div>
                    <div className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 truncate">
                      {isKu ? 'چاوەڕوانی ڕادەستکردن' : 'Awaiting Delivery'}
                    </div>
                  </div>
                </button>

                {/* 3. Low Stock Alerts & Total Panels in Stock */}
                <button
                  type="button"
                  onClick={handleGlanceLowStock}
                  className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Low Stock Alerts"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'کەمیی کۆگا' : 'Low Stock Alerts'}</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300 font-mono truncate">
                      {lowStockCount}
                    </div>
                    <div className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80 truncate">
                      {stats.totalStock.toLocaleString()} {isKu ? 'تەختە لە کۆگا' : 'Panels in Stock'}
                    </div>
                  </div>
                </button>

                {/* 4. Active Cargo */}
                <button
                  type="button"
                  onClick={() => handleSelectDivision('shipping', 'goods')}
                  className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-violet-600 dark:text-violet-400 shadow-xs flex flex-col justify-between min-h-[76px] text-left cursor-pointer active:scale-95 transition-all"
                  title="View Active Cargo"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'باری لە ڕێگە' : 'Active Cargo'}</span>
                    <Truck className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-violet-700 dark:text-violet-300 font-mono truncate">
                      {activeInboundShipments.length}
                    </div>
                    <div className="text-[10px] font-medium text-violet-600/80 dark:text-violet-400/80 truncate">
                      {isKu ? 'لە گومرگ و ڕێگە' : 'In Transit / Customs'}
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Consolidated Segmented Activity & Alerts Drawer */}
          <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-850/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            {/* Segmented Tab Controls */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveMobileTab('orders')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${
                  activeMobileTab === 'orders'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isKu ? `داواکارییەکان (${allActiveOrders.length})` : `Orders (${allActiveOrders.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('alerts')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${
                  activeMobileTab === 'alerts'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isKu ? `ئاگاداری (${lowStockCount})` : `Alerts (${lowStockCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('cargo')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${
                  activeMobileTab === 'cargo'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {isKu ? `بارەکان (${activeInboundShipments.length})` : `Cargo (${activeInboundShipments.length})`}
              </button>
            </div>

            {/* Tab 1: Orders */}
            {activeMobileTab === 'orders' && (
              <div className="space-y-1.5">
                {allActiveOrders.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{isKu ? 'هیچ داواکارییەکی کارا لە کارگە نییە' : 'No active orders pending in workshop'}</span>
                  </div>
                ) : (
                  allActiveOrders.slice(0, 3).map(({ order, materialName, materialCode }) => (
                    <div
                      key={order.id}
                      onClick={handleGlanceActiveOrders}
                      className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs hover:border-blue-400/60 transition-all cursor-pointer active:scale-98"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {order.client || (isKu ? 'کڕیار' : 'Customer')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {order.quantity}x {materialName || materialCode}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {isKu ? 'لە کاردایە' : 'In Progress'}
                      </span>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="w-full text-center py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline active:scale-98 cursor-pointer"
                >
                  {isKu ? 'بینینی هەموو داواکارییەکان' : 'View All Orders'} &rarr;
                </button>
              </div>
            )}

            {/* Tab 2: Inventory Alerts */}
            {activeMobileTab === 'alerts' && (
              <div className="space-y-1.5">
                {lowStockPanels.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold">{isKu ? 'کۆگا تەواوە • هەموو تەختەکان بەردەستن' : 'Stock Healthy • All Panels Available'}</span>
                  </div>
                ) : (
                  lowStockPanels.slice(0, 3).map((mat) => (
                    <div
                      key={mat.id}
                      onClick={handleGlanceLowStock}
                      className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs hover:border-amber-400 transition-all cursor-pointer active:scale-98"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-xs">
                            {mat.code}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {mat.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400">
                          {mat.type}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                        {mat.availableStock} {isKu ? 'ماوە' : 'left'}
                      </span>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={handleGlanceLowStock}
                  className="w-full text-center py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline active:scale-98 cursor-pointer"
                >
                  {isKu ? 'بینینی تەختەکان لە کۆگا' : 'View Panels in Stock'} &rarr;
                </button>
              </div>
            )}

            {/* Tab 3: Cargo & Shipping */}
            {activeMobileTab === 'cargo' && (
              <div className="space-y-1.5">
                {activeInboundShipments.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span>{isKu ? 'هیچ بارێکی نوێ لە ڕێگادا نییە' : 'No shipments currently in transit'}</span>
                  </div>
                ) : (
                  activeInboundShipments.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectDivision('shipping', 'goods')}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs hover:border-amber-400 transition-all cursor-pointer active:scale-98"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-xs">
                            {s.batchCode}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                            {s.supplier || s.supplierName || 'FunderMax'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{isKu ? 'گەیشتن:' : 'ETA:'} {s.arrivalDate || 'TBD'}</span>
                          <span>•</span>
                          <span>{s.originCountry || 'Import'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {s.status === 'customs'
                          ? (isKu ? 'لە گومرگە' : 'Customs')
                          : (isKu ? 'لە ڕێگایە' : 'In Transit')}
                      </span>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => handleSelectDivision('shipping', 'goods')}
                  className="w-full text-center py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline active:scale-98 cursor-pointer"
                >
                  {isKu ? 'بینینی هێڵی گواستنەوە' : 'View Shipping Pipeline'} &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Quick Analytics Trigger (Gated strictly to financial authorized users) */}
          {canViewFinances && canAccessAnalytics && (
            <button
              type="button"
              onClick={handleOpenAnalytics}
              className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xs flex items-center justify-between gap-2.5 cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-black truncate leading-tight">
                    {isKu ? 'چارتەکان و شیكاری دارایی' : 'Visual Analytics & Executive BI'}
                  </div>
                  <div className="text-[10px] text-white/80 font-medium truncate">
                    {isKu ? 'بینینی قازانج، ئاماری فرۆشتن و بڕین' : 'Profit metrics, sales curves & workshop charts'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white shrink-0" />
            </button>
          )}

          {/* Admin Controls (Strictly Admin Only) */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleSelectDivision('audit')}
                className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isKu ? 'باکئەپ و داتابەیس' : 'SQLite Vault'}</span>
              </button>
              <button
                type="button"
                onClick={() => openAdminModal()}
                className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                <span>{isKu ? 'بەڕێوەبەری سیستەم' : 'Admin Panel'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP OPERATIONS HUB (>= 768px)                                         */}
        {/* ========================================================================= */}
        <div className="hidden md:block">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          {/* Master Title with Fancy Shimmering "Master" Typography */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Bako&apos;s <span className="text-master-shimmer">Master</span> System
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 font-medium max-w-xl mx-auto leading-relaxed">
            Unified industrial operations & sales platform. Each division is focused and self-contained; return here anytime via Main Menu.
          </p>

          {/* Client Commission Attribution Badge (Official System Licensure) */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isKu
                ? 'دروستکراوە لەلایەن باکۆ بەیان تایبەت بۆ کۆمپانیای شاسوار ئەحمەد شاسوار'
                : 'Engineered by Bako Bayan Madhhar specifically for Shaswar Ahmad Shaswar Co.'}
            </span>
            <button
              type="button"
              onClick={openCopyrightModal}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline ms-1 cursor-pointer"
            >
              {isKu ? 'مافەکان' : 'Licensure'}
            </button>
          </div>

          {/* Quick KPI Ticker Strip (Solid background for maximum rendering speed) */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            {(canAccessPanels || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white font-mono">{stats.totalStock.toLocaleString()}</span>
                <span>Panels</span>
              </div>
            )}

            {(canAccessSales || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-2xs">
                <ReceiptText className="w-3.5 h-3.5 text-sky-500" />
                <span className="font-bold text-slate-900 dark:text-white font-mono">{totalInvoicesCount}</span>
                <span>Invoices</span>
              </div>
            )}

            {(canAccessGoods || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-2xs">
                <Package className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-slate-900 dark:text-white font-mono">{warehouseOps.activeShipments.length}</span>
                <span>Shipments</span>
              </div>
            )}

            {/* 4. We Owe Suppliers (Payables) purple badge on PC ticker */}
            <button
              type="button"
              onClick={() => setIsSupplierPayablesOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer font-bold"
              title="Click to view Supplier Payables Ledger"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{isKu ? 'قەرزی سەر ئێمە بۆ دابینکەران:' : 'We Owe Suppliers:'}</span>
              <span className="font-mono font-black">${supplierDebtData.debtUSD.toLocaleString()}</span>
              {supplierDebtData.debtEUR > 0 && (
                <span className="text-[11px] font-mono text-purple-600/90 dark:text-purple-400/90">
                  (+ €{supplierDebtData.debtEUR.toLocaleString()})
                </span>
              )}
            </button>

            {/* 4. SQLite WAL Health & Latency Pill (Shortened by Default, Expands on Click) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowWalDetails((prev) => !prev);
                  handleCheckHealth();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border shadow-2xs transition-all active:scale-95 cursor-pointer text-xs ${
                  syncStatus === 'synced' && walHealth.isWalActive
                    ? 'bg-white/70 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700/70 hover:border-emerald-500/80 text-slate-700 dark:text-slate-300'
                    : isCheckingHealth
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                    : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                }`}
                title="Click to view database details & re-verify connection"
              >
                {isCheckingHealth ? (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin shrink-0" />
                ) : syncStatus === 'synced' && walHealth.isWalActive ? (
                  <HardDrive className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}

                {isCheckingHealth ? (
                  <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                    Testing...
                  </span>
                ) : syncStatus === 'synced' && walHealth.isWalActive ? (
                  <div className="flex items-center gap-1.5">
                    {showWalDetails ? (
                      <>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          100% Offline WAL
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                          • {walHealth.dbSize || '1.8 MB'}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        WAL
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                      Active • {walHealth.latencyMs}ms
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {showWalDetails ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        100% Offline (Local Cache)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700 dark:text-amber-400 font-mono">
                        Offline
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                      Local Cache
                    </span>
                  </div>
                )}
              </button>

              {/* Detailed Flyout Diagnostic Card (Visible only when clicked) */}
              {showWalDetails && (
                <div
                  ref={walDetailsRef}
                  className="absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 z-40 w-72 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-850/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl text-left animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-black text-slate-900 dark:text-white">Database & WAL Diagnostics</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowWalDetails(false);
                      }}
                      className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 inline-flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Engine:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">SQLite WAL (100% Offline)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Lag / Latency:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{walHealth.latencyMs}ms</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Storage on Disk:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{walHealth.dbSize || '1.8 MB'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Integrity Status:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {walHealth.integrity === 'ok' ? 'Verified (Clean)' : walHealth.integrity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {currentUser?.role?.toLowerCase() === 'admin' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWalDetails(false);
                          setCurrentModule('audit');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-[10px] font-bold text-purple-700 dark:text-purple-300 inline-flex items-center gap-1 cursor-pointer"
                        title="Open full Audit Trail & Backups module"
                      >
                        <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>{isKu ? 'تۆماری چاودێری و باکئەپ' : 'Audit Logs'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckHealth();
                      }}
                      disabled={isCheckingHealth}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                      <span>Re-ping</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Health Verification Diagnostic Feedback Banner */}
          {healthToast && (
            <div className="mt-3 flex items-center justify-center animate-in fade-in slide-in-from-top-1 duration-200">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-md border ${
                  healthToast.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400/80 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/80 border-amber-400/80 text-amber-800 dark:text-amber-300'
                }`}
              >
                {healthToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>{healthToast.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4 Clean, Unfused & Beautiful Division Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
          
          {/* ========================================================================= */}
          {/* DIVISION 1: Wood Panels & Workshop Cutting Orders                         */}
          {/* ========================================================================= */}
          <div
            onClick={() => handleSelectDivision('panels', 'orders')}
            className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
              canAccessPanels
                ? 'bg-white dark:bg-slate-850/90 border-slate-300/80 dark:border-slate-750 hover:border-emerald-500/80 dark:hover:border-emerald-500/80'
                : 'bg-white dark:bg-slate-850/60 border-rose-200/80 dark:border-rose-900/40 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Ambient Corner Glow */}
            <div className={`absolute top-0 right-0 w-44 h-44 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
              canAccessPanels
                ? 'bg-gradient-to-bl from-emerald-500/15 via-teal-500/5 to-transparent'
                : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
            }`} />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                  canAccessPanels
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400 shadow-slate-500/10'
                }`}>
                  <Layers className="w-7 h-7" />
                </div>
                {canAccessPanels ? (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                    {isKu ? 'بەشی یەکەم' : 'Division 01'}
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 font-mono inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isKu ? 'دەسەڵات قوفڵە' : 'Restricted'}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {isKu ? 'بڕینی تەختە' : 'Wood Panels & Orders'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {isKu
                  ? 'کۆگای تەختەکان (MDF, HPL, Plywood)، بڕین و داواکاری کڕیاران، و چاپکردنی پسوولە.'
                  : 'Live wood panel stocks, workshop reservations, custom cuts, dimensions, and slip printing.'}
              </p>
            </div>

            <div>
              {/* Glass KPI Cards (Confidentiality & Metric Protection) */}
              {canAccessPanels || userPermissions.canViewRestrictedMetrics ? (
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center">
                  <div>
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                      {stats.totalStock.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{t.totalStockCount}</div>
                  </div>
                  <div className="border-x border-slate-200 dark:border-slate-800">
                    <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {stats.totalAllocated.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{t.reserved}</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {stats.totalAvailable.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{t.available}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 mb-5 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold py-4.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isKu ? 'ئامار و زانیارییەکان قوفڵکراون' : 'Confidential Stock Metrics Protected'}</span>
                </div>
              )}

              {/* Action Button */}
              {canAccessPanels ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  <span>{isKu ? 'کردنەوەی تەختەکان' : 'Open Wood Panels'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>{isKu ? 'دەسەڵات سنووردارکراوە • پەیوەندی بە ئەدمین بکە' : 'Access Restricted • Contact Admin'}</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DIVISION 2: Sales POS, Invoices & Multi-Currency                          */}
          {/* ========================================================================= */}
          <div
            onClick={() => handleSelectDivision('sales')}
            className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
              canAccessSales
                ? 'bg-white dark:bg-slate-850/90 border-slate-300/80 dark:border-slate-750 hover:border-sky-500/80 dark:hover:border-sky-500/80'
                : 'bg-white dark:bg-slate-850/60 border-rose-200/80 dark:border-rose-900/40 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Ambient Corner Glow */}
            <div className={`absolute top-0 right-0 w-44 h-44 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
              canAccessSales
                ? 'bg-gradient-to-bl from-sky-500/15 via-blue-500/5 to-transparent'
                : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
            }`} />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                  canAccessSales
                    ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/25'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400 shadow-slate-500/10'
                }`}>
                  <ReceiptText className="w-7 h-7" />
                </div>
                {canAccessSales ? (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono">
                    {isKu ? 'بەشی دووەم' : 'Division 02'}
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 font-mono inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isKu ? 'دەسەڵات قوفڵە' : 'Restricted'}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {isKu ? 'فرۆشتن و وەسڵ' : 'Sales POS & Invoices'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {isKu
                  ? 'دەرهێنانی پسوولەی فرۆشتن بە چەند دراوێک (دۆلار، دینار، یۆرۆ)، بەڕێوەبردنی قەرز، و چاپکردنی وەسڵ.'
                  : 'Multi-currency sales invoicing (USD, IQD, EUR), debt ledger tracking, customer receipts, and thermal POS.'}
              </p>
            </div>

            <div>
              {/* Glass KPI Cards (Confidentiality & Metric Protection) */}
              {canAccessSales || userPermissions.canViewRestrictedMetrics ? (
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center">
                  <div>
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                      {totalInvoicesCount}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'پسوولە' : 'Invoices'}</div>
                  </div>
                  <div className="border-x border-slate-200 dark:border-slate-800">
                    <div className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      ${totalUnpaidDebt.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'قەرز' : 'Total Debt'}</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
                      3 Rates
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">USD/IQD/EUR</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 mb-5 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold py-4.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isKu ? 'ئاماری دارایی و قەرز قوفڵکراوە' : 'Confidential Financials & Debt Protected'}</span>
                </div>
              )}

              {/* Action Button */}
              {canAccessSales ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-sm shadow-md shadow-sky-600/20 active:scale-98 transition-all"
                >
                  <span>{isKu ? 'کردنەوەی فرۆشتن' : 'Open Sales POS'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>{isKu ? 'دەسەڵات سنووردارکراوە • پەیوەندی بە ئەدمین بکە' : 'Access Restricted • Contact Admin'}</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DIVISION 3: Warehouse Goods, Hardware & Logistics                         */}
          {/* ========================================================================= */}
          <div
            onClick={() => handleSelectDivision('goods', 'shipping')}
            className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
              canAccessGoods
                ? 'bg-white dark:bg-slate-850/90 border-slate-300/80 dark:border-slate-750 hover:border-amber-500/80 dark:hover:border-amber-500/80'
                : 'bg-white dark:bg-slate-850/60 border-rose-200/80 dark:border-rose-900/40 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Ambient Corner Glow */}
            <div className={`absolute top-0 right-0 w-44 h-44 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
              canAccessGoods
                ? 'bg-gradient-to-bl from-amber-500/15 via-orange-500/5 to-transparent'
                : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
            }`} />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                  canAccessGoods
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400 shadow-slate-500/10'
                }`}>
                  <Truck className="w-7 h-7" />
                </div>
                {canAccessGoods ? (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                    {isKu ? 'بەشی سێیەم' : 'Division 03'}
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 font-mono inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isKu ? 'دەسەڵات قوفڵە' : 'Restricted'}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {isKu ? 'کڕین و دابینکەران' : 'Purchases & Suppliers'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {isKu
                  ? 'هاوردەکردنی تەختە و قەرزی دابینکەران'
                  : 'Raw wood imports, supplier invoices & what we owe vendors'}
              </p>
            </div>

            <div>
              {/* Glass KPI Cards (Confidentiality & Metric Protection) */}
              {canAccessGoods || userPermissions.canViewRestrictedMetrics ? (
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center">
                  <div>
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                      {warehouseOps.activeShipments.length}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'بارە گەیشتووەکان' : 'Shipments'}</div>
                  </div>
                  <div className="border-x border-slate-200 dark:border-slate-800">
                    <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {customsShipmentsCount}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'گومرگ' : 'In Customs'}</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {rackedUnitsCount.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'لە کۆگادا' : 'Units Racked'}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 mb-5 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold py-4.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isKu ? 'ئاماری کۆگا و بارەکان قوفڵکراوە' : 'Confidential Logistics Protected'}</span>
                </div>
              )}

              {/* Action Button */}
              {canAccessGoods ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white font-bold text-sm shadow-md shadow-amber-600/20 active:scale-98 transition-all"
                >
                  <span>{isKu ? 'کردنەوەی کڕین و دابینکەران' : 'Open Purchases & Suppliers'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>{isKu ? 'دەسەڵات سنووردارکراوە • پەیوەندی بە ئەدمین بکە' : 'Access Restricted • Contact Admin'}</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DIVISION 4: Visual Analytics, Executive Reports & Business Intelligence    */}
          {/* ========================================================================= */}
          <div
            onClick={handleOpenAnalytics}
            className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
              canAccessAnalytics
                ? 'bg-white dark:bg-slate-850/90 border-slate-300/80 dark:border-slate-750 hover:border-purple-500/80 dark:hover:border-purple-500/80'
                : 'bg-white dark:bg-slate-850/60 border-rose-200/80 dark:border-rose-900/40 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Ambient Corner Glow */}
            <div className={`absolute top-0 right-0 w-44 h-44 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
              canAccessAnalytics
                ? 'bg-gradient-to-bl from-purple-500/15 via-indigo-500/5 to-transparent'
                : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
            }`} />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                  canAccessAnalytics
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/25'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400 shadow-slate-500/10'
                }`}>
                  <BarChart3 className="w-7 h-7" />
                </div>
                {canAccessAnalytics ? (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
                    {isKu ? 'بەشی چوارەم' : 'Division 04'}
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 font-mono inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isKu ? 'دەسەڵات قوفڵە' : 'Restricted'}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {isKu ? 'ئامار و حسابات' : 'Visual Analytics & Reports'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {isKu
                  ? 'چارتی هەمەجۆری فرۆشتن، دابەشبوونی تەختە و مەخزەن، قەبارەی دارایی، قەرزی کڕیاران و ڕاپۆرتی شایەنی چاپکردن.'
                  : 'Comprehensive visual charts, panel output distribution, customer debt rankings, financial turnover, and 1-click printable reports.'}
              </p>
            </div>

            <div>
              {/* Glass KPI Cards (Confidentiality & Metric Protection) */}
              {canAccessAnalytics || userPermissions.canViewRestrictedMetrics ? (
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center">
                  <div>
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                      {stats.totalStock.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'تەختە' : 'Panels'}</div>
                  </div>
                  <div className="border-x border-slate-200 dark:border-slate-800">
                    <div className="text-base sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                      {totalInvoicesCount}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'پسوولە' : 'Invoices'}</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      5 Modes
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'چارتی بینراو' : 'Visual SVG'}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 mb-5 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-semibold py-4.5">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isKu ? 'ڕاپۆرت و شیکاری دارایی قوفڵکراوە' : 'Executive Business Intelligence Protected'}</span>
                </div>
              )}

              {/* Action Button */}
              {canAccessAnalytics ? (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md shadow-purple-600/20 active:scale-98 transition-all"
                >
                  <span>{isKu ? 'کردنەوەی ئامار' : 'Open Visual Analytics & Charts'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm border border-slate-200 dark:border-slate-700">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>{isKu ? 'دەسەڵات سنووردارکراوە • پەیوەندی بە ئەدمین بکە' : 'Access Restricted • Contact Admin'}</span>
                </div>
              )}
            </div>
          </div>

        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACCESS DENIED NOTIFICATION MODAL                                         */}
      {/* ========================================================================= */}
      {deniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono text-xs font-bold mb-2">
                <Lock className="w-3.5 h-3.5" />
                <span>{isKu ? 'دەستپێگەیشتن ڕێگاپێدراو نییە' : 'Access Denied'}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {deniedModal.moduleName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {deniedModal.description}
              </p>
            </div>

            {/* Current Account Card */}
            {currentUser && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>{isKu ? 'ئەژمێری ئێستا:' : 'Current Account:'}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  <span>{currentUser.displayName || currentUser.username}</span>
                  {currentUser.role?.toLowerCase() === 'owner' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 font-bold">
                      {isKu ? 'خاوەن کار (Owner)' : 'Owner'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold">
                      {currentUser.role}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Admin Contact Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-left">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                {isKu ? 'بۆ چالاککردنی مۆڵەت پەیوەندی بکە بە:' : 'To Request Permission, Contact Administrator:'}
              </div>
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Bako Bayan Madhhar</span>
                <a
                  href="tel:07705488654"
                  className="text-emerald-700 dark:text-emerald-400 font-mono hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  07705488654
                </a>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDeniedModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              {isKu ? 'تێگەیشتم • داخران' : 'Understood • Dismiss'}
            </button>
          </div>
        </div>
      )}

      {/* SUPPLIER PAYABLES IN-PLACE LEDGER MODAL */}
      <SupplierPayablesModal
        isOpen={isSupplierPayablesOpen}
        onClose={() => setIsSupplierPayablesOpen(false)}
      />
    </div>
  );
};

export default ModuleHub;
