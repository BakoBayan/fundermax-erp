'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Building2,
  Boxes,
  Combine,
  ChevronRight,
  Check,
  X,
  Ship,
  Paintbrush,
  Tag,
  TagPlus,
  Eye,
  Warehouse,
  ShelvingUnit,
  ChartColumnBig,
  ChessKnight
} from 'lucide-react';
import { PlatformModule, OrderAllocation, CurrencyCode, ExchangeRates } from '../types/inventory';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import { getTodayDebtPaymentIntake } from '../utils/debtPayments';
import SupplierPayablesModal from './SupplierPayablesModal';
import { BakoLogo } from './BakoLogo';
import { DigitScroller, NumberScroller } from './DigitScroller';

interface ModuleHubProps {
  onSelectModule?: (module: PlatformModule) => void;
  onOpenNetworkShare?: () => void;
  onOpenBatchPrint?: () => void;
}

let hasHydratedModuleHubOnce = false;

// Isolated Heavy Ambient Background Layer (Zero re-renders on Hub state changes)
const AmbientBackgroundLayer: React.FC = React.memo(() => (
  <div className="block ambient-layer pointer-events-none select-none -z-10 transform-gpu will-change-transform" aria-hidden="true">
    {/* Traversing radial orb 1: emerald (left to right) */}
    <div className="absolute top-0 left-0 pointer-events-none transform-gpu">
      <div className="animate-traverse-lr-1 pointer-events-none transform-gpu">
        <div className="w-[260px] sm:w-[640px] h-[260px] sm:h-[640px] opacity-35 sm:opacity-100 rounded-full [background:radial-gradient(circle,rgba(16,185,129,0.30)_0%,rgba(20,184,166,0.14)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(16,185,129,0.18)_0%,rgba(20,184,166,0.08)_45%,transparent_70%)] animate-float-slow transform-gpu" />
      </div>
    </div>

    {/* Traversing radial orb 2: sky (right to left) */}
    <div className="absolute top-16 left-0 pointer-events-none transform-gpu">
      <div className="animate-traverse-rl-1 pointer-events-none transform-gpu">
        <div className="w-[240px] sm:w-[580px] h-[240px] sm:h-[580px] opacity-35 sm:opacity-100 rounded-full [background:radial-gradient(circle,rgba(14,165,233,0.28)_0%,rgba(99,102,241,0.14)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(14,165,233,0.16)_0%,rgba(99,102,241,0.06)_45%,transparent_70%)] animate-float-reverse transform-gpu" />
      </div>
    </div>

    {/* Traversing radial orb 3: amber/violet (top to bottom) */}
    <div className="absolute top-0 left-1/4 pointer-events-none transform-gpu">
      <div className="animate-traverse-tb-1 pointer-events-none transform-gpu">
        <div className="w-[220px] sm:w-[500px] h-[220px] sm:h-[500px] opacity-35 sm:opacity-100 rounded-full [background:radial-gradient(circle,rgba(251,191,36,0.25)_0%,rgba(232,121,249,0.12)_45%,transparent_70%)] dark:[background:radial-gradient(circle,rgba(251,191,36,0.14)_0%,rgba(232,121,249,0.06)_45%,transparent_70%)] animate-float-diag transform-gpu" />
      </div>
    </div>

    {/* Architectural grid: fine blueprint lines */}
    <div className="ambient-blueprint absolute inset-0 pointer-events-none" />

    {/* Dot grid */}
    <div className="ambient-dots absolute inset-0 pointer-events-none text-slate-900 dark:text-white" />

    {/* Animated Geometric Shape 0: Top-Left Floating Cyan/Sky Tech Orb */}
    <div className="absolute top-[8%] left-[7%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-4 pointer-events-none transform-gpu">
        <div className="w-8 h-8 sm:w-14 sm:h-14 opacity-35 sm:opacity-100 rounded-xl sm:rounded-2xl border sm:border-2 border-sky-400/55 dark:border-sky-300/45 bg-gradient-to-br from-sky-400/30 via-cyan-400/15 to-transparent shadow-xs rotate-12 flex items-center justify-center transform-gpu">
          <div className="w-3 h-3 sm:w-5 sm:h-5 rounded sm:rounded-lg border border-sky-300/40 bg-sky-400/20" />
        </div>
      </div>
    </div>

    {/* Animated Geometric Shape 1: Poly-diamond cube (Emerald) */}
    <div className="absolute top-[15%] right-[12%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-1 pointer-events-none transform-gpu">
        <div className="w-8 h-8 sm:w-16 sm:h-16 opacity-35 sm:opacity-100 rotate-45 rounded-xl sm:rounded-2xl border sm:border-2 border-emerald-500/60 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-transparent shadow-sm transform-gpu" />
      </div>
    </div>

    {/* Animated Geometric Shape 2: Orbital tech ring (Cyan/Sky) */}
    <div className="absolute top-[48%] right-[8%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-2 pointer-events-none transform-gpu">
        <div className="w-10 h-10 sm:w-20 sm:h-20 opacity-35 sm:opacity-100 rounded-full border sm:border-2 border-dashed border-sky-500/60 dark:border-sky-400/50 flex items-center justify-center transform-gpu">
          <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-sky-400/40 via-sky-500/20 to-transparent shadow-xs" />
        </div>
      </div>
    </div>

    {/* Animated Geometric Shape 3: Angled prism (Indigo/Violet) */}
    <div className="absolute top-[28%] left-[8%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-3 pointer-events-none transform-gpu">
        <div className="w-8 h-12 sm:w-14 sm:h-20 opacity-35 sm:opacity-100 -rotate-12 rounded-xl sm:rounded-2xl border sm:border-2 border-indigo-500/55 dark:border-indigo-400/50 bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-transparent shadow-sm transform-gpu" />
      </div>
    </div>

    {/* Animated Geometric Shape 4: Floating crystal tile (Amber/Orange) */}
    <div className="absolute top-[68%] left-[10%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-1 pointer-events-none transform-gpu">
        <div className="w-8 h-8 sm:w-14 sm:h-14 opacity-35 sm:opacity-100 rotate-12 rounded-lg sm:rounded-xl border sm:border-2 border-amber-500/55 dark:border-amber-400/45 bg-gradient-to-br from-amber-400/30 via-orange-400/15 to-transparent shadow-xs transform-gpu" />
      </div>
    </div>

    {/* Animated Geometric Shape 5: Precision Tech Capsule (Teal/Emerald) */}
    <div className="absolute top-[76%] right-[14%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-4 pointer-events-none transform-gpu">
        <div className="w-10 h-6 sm:w-16 sm:h-10 opacity-35 sm:opacity-100 -rotate-6 rounded-full border sm:border-2 border-teal-500/60 dark:border-teal-400/50 bg-gradient-to-br from-teal-400/30 via-emerald-400/15 to-transparent shadow-sm flex items-center justify-center transform-gpu">
          <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-teal-500/45" />
        </div>
      </div>
    </div>

    {/* Animated Geometric Shape 6: Isometric Rhombus Prism (Rose/Fuchsia) */}
    <div className="absolute top-[36%] right-[26%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-5 pointer-events-none transform-gpu">
        <div className="w-8 h-8 sm:w-12 sm:h-12 opacity-35 sm:opacity-100 rotate-[30deg] skew-x-12 rounded-lg sm:rounded-xl border sm:border-2 border-rose-500/55 dark:border-rose-400/50 bg-gradient-to-br from-rose-400/25 via-fuchsia-400/15 to-transparent shadow-sm transform-gpu" />
      </div>
    </div>

    {/* Animated Geometric Shape 7: Left-side Orbital Gyro Ring (Crimson/Rose) */}
    <div className="absolute top-[44%] left-[6%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-2 pointer-events-none transform-gpu">
        <div className="w-9 h-9 sm:w-16 sm:h-16 opacity-35 sm:opacity-100 rounded-full border sm:border-2 border-dashed border-rose-500/60 dark:border-rose-400/50 flex items-center justify-center transform-gpu">
          <div className="w-3.5 h-3.5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-rose-500/35 via-red-500/20 to-transparent shadow-xs" />
        </div>
      </div>
    </div>

    {/* Animated Geometric Shape 8: Left-side Micro-Cube Prism (Emerald/Mint) */}
    <div className="absolute top-[82%] left-[14%] pointer-events-none transform-gpu">
      <div className="animate-drift-poly-3 pointer-events-none transform-gpu">
        <div className="w-7 h-7 sm:w-11 sm:h-11 opacity-35 sm:opacity-100 rotate-45 rounded-lg sm:rounded-xl border sm:border-2 border-emerald-500/55 dark:border-emerald-400/45 bg-gradient-to-br from-emerald-400/30 via-teal-500/15 to-transparent shadow-xs transform-gpu" />
      </div>
    </div>

    {/* Light beam sweep */}
    <div className="absolute left-1/2 top-1/2 w-[140%] h-14 sm:h-24 bg-gradient-to-r from-transparent via-emerald-400/10 sm:via-emerald-400/15 to-transparent pointer-events-none animate-light-sweep transform-gpu" />
  </div>
));
AmbientBackgroundLayer.displayName = 'AmbientBackgroundLayer';

// Memoized Mobile Row Components
const MobileOrderRow: React.FC<{
  order: OrderAllocation;
  materialName: string;
  materialCode: string;
  isKu: boolean;
  onClick: () => void;
}> = React.memo(({ order, materialName, materialCode, isKu, onClick }) => {
  const isFinalized = order.status === 'finalized' || (order.status as string) === 'completed';

  return (
    <div
      onClick={onClick}
      className={`p-2.5 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 rounded-lg flex items-center justify-between gap-2 text-xs cursor-pointer active:scale-98 ${
        isFinalized ? 'opacity-85' : ''
      }`}
    >
      <div className={`min-w-0 ${isFinalized ? 'opacity-60' : ''}`}>
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
      {isFinalized ? (
        <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md text-xs font-semibold shrink-0">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{isKu ? 'تەواوکراو' : 'Finalized'}</span>
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {isKu ? 'لە کاردایە' : 'In Progress'}
        </span>
      )}
    </div>
  );
});
MobileOrderRow.displayName = 'MobileOrderRow';

const MobileLowStockRow: React.FC<{
  code: string;
  name: string;
  type: string;
  availableStock: number;
  isKu: boolean;
  onClick: () => void;
}> = React.memo(({ code, name, type, availableStock, isKu, onClick }) => (
  <div
    onClick={onClick}
    className="p-2.5 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 rounded-lg flex items-center justify-between gap-2 text-xs cursor-pointer active:scale-98"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
          {code}
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {name}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
        {type}
      </div>
    </div>
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
      {availableStock} {isKu ? 'ماوە' : 'left'}
    </span>
  </div>
));
MobileLowStockRow.displayName = 'MobileLowStockRow';

const MobileShipmentRow: React.FC<{
  batchCode: string;
  supplier: string;
  arrivalDate?: string;
  originCountry?: string;
  status: string;
  isKu: boolean;
  onClick: () => void;
}> = React.memo(({ batchCode, supplier, arrivalDate, originCountry, status, isKu, onClick }) => (
  <div
    onClick={onClick}
    className="p-2.5 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 rounded-lg flex items-center justify-between gap-2 text-xs cursor-pointer active:scale-98"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
          {batchCode}
        </span>
        <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
          {supplier}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
        <span>{isKu ? 'گەیشتن:' : 'ETA:'} {arrivalDate || 'TBD'}</span>
        <span>•</span>
        <span>{originCountry || 'Import'}</span>
      </div>
    </div>
    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
      {status === 'customs'
        ? (isKu ? 'لە گومرگە' : 'Customs')
        : (isKu ? 'لە ڕێگایە' : 'In Transit')}
    </span>
  </div>
));
MobileShipmentRow.displayName = 'MobileShipmentRow';

// Isolated Exchange Rate Popover Form (Prevents re-rendering parent hub on keystroke)
const ExchangeRateSettingsPopover: React.FC<{
  exchangeRates: ExchangeRates;
  setExchangeRates: (rates: ExchangeRates) => void;
  copyMarketReferenceToOperational: () => void;
  onClose: () => void;
  isKu: boolean;
}> = React.memo(({ exchangeRates, setExchangeRates, copyMarketReferenceToOperational, onClose, isKu }) => {
  const [manualUsdToIqd, setManualUsdToIqd] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moduleHub_usdToIqd');
      if (saved) return saved;
    }
    return String(exchangeRates.usdToIqd || exchangeRates.USD_IQD || 1500);
  });
  const [manualEurToUsd, setManualEurToUsd] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moduleHub_eurToUsd');
      if (saved) return saved;
    }
    return String(exchangeRates.eurToUsd || exchangeRates.EUR_USD || 1.08);
  });
  const [manualEurToIqd, setManualEurToIqd] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moduleHub_eurToIqd');
      if (saved) return saved;
    }
    return String(exchangeRates.eurToIqd || exchangeRates.EUR_IQD || 1620);
  });

  useEffect(() => {
    if (exchangeRates.usdToIqd) setManualUsdToIqd(String(exchangeRates.usdToIqd));
    if (exchangeRates.eurToUsd) setManualEurToUsd(String(exchangeRates.eurToUsd));
    if (exchangeRates.eurToIqd) setManualEurToIqd(String(exchangeRates.eurToIqd));
  }, [exchangeRates]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const uIqd = parseFloat(manualUsdToIqd);
    const eUsd = parseFloat(manualEurToUsd);
    const eIqd = parseFloat(manualEurToIqd);
    if (uIqd > 0 && eUsd > 0 && eIqd > 0) {
      const normalizedRates: ExchangeRates = {
        ...exchangeRates,
        usdToIqd: uIqd > 10000 ? uIqd : uIqd * 100,
        USD_IQD: uIqd > 10000 ? uIqd : uIqd * 100,
        eurToUsd: eUsd,
        EUR_USD: eUsd,
        eurToIqd: eIqd > 10000 ? eIqd : eIqd * 100,
        EUR_IQD: eIqd > 10000 ? eIqd : eIqd * 100,
      };
      setExchangeRates(normalizedRates);
      if (typeof window !== 'undefined') {
        localStorage.setItem('moduleHub_usdToIqd', String(uIqd > 10000 ? uIqd : uIqd * 100));
        localStorage.setItem('moduleHub_eurToUsd', String(eUsd));
        localStorage.setItem('moduleHub_eurToIqd', String(eIqd > 10000 ? eIqd : eIqd * 100));
      }
      onClose();
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="p-4 mb-4 rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-750 shadow-md animate-in slide-in-from-top-2 duration-150 space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-750">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {isKu ? 'نرخی ئاڵوگۆڕی کارگێڕی (Manual Baseline)' : 'Operational Exchange Rates (Manual Baseline)'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            $1 USD ➔ IQD Rate
          </label>
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            step="any"
            value={manualUsdToIqd}
            onChange={(e) => setManualUsdToIqd(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            placeholder="1500"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            €1 EUR ➔ USD Rate
          </label>
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            step="any"
            value={manualEurToUsd}
            onChange={(e) => setManualEurToUsd(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            placeholder="1.08"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            €1 EUR ➔ IQD Direct Rate
          </label>
          <input
            type="number"
            inputMode="decimal"
            pattern="[0-9]*"
            step="any"
            value={manualEurToIqd}
            onChange={(e) => setManualEurToIqd(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            placeholder="1620"
            required
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {isKu ? 'نرخەکان ڕاستەوخۆ دەگۆڕدرێن لە دیمەنی سەرەکی بێ دەستکاری داتای ناوەکی پسوولەکان.' : 'Rates convert visual numbers on the fly without modifying invoice records.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              copyMarketReferenceToOperational();
              setManualUsdToIqd('1500');
              setManualEurToUsd('1.08');
              setManualEurToIqd('1620');
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            {isKu ? 'گەڕاندنەوە بۆ نرخی بازاڕ' : 'Reset Market'}
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            {isKu ? 'پاشەکەوتکردن' : 'Save Rates'}
          </button>
        </div>
      </div>
    </form>
  );
});
ExchangeRateSettingsPopover.displayName = 'ExchangeRateSettingsPopover';

const EnterpriseModuleLocked: React.FC<{
  colorClass: string;
  bgClass: string;
  isKu: boolean;
}> = ({ colorClass, bgClass, isKu }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 my-auto z-10">
    <div className={`w-20 h-20 ${colorClass} ${bgClass} p-4 rounded-full flex items-center justify-center shadow-inner`}>
      <Lock className="w-10 h-10" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
        {isKu ? 'دەستپێگەیشتن سنووردارکراوە' : 'Access Restricted'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        {isKu ? 'ڕێپێدانت نییە بۆ بینینی ئەم بەشە.' : 'You do not have clearance to view this module.'}
      </p>
    </div>
  </div>
);

export const ModuleHub: React.FC<ModuleHubProps> = React.memo(({
  onSelectModule,
}) => {
  const {
    setCurrentModule,
    t,
    language,
    stats,
    transactions,
    activityLogs,
    openVisualCharts,
    openMergerModal,
    pingHealthCheck,
    currentUser,
    userPermissions,
    openCopyrightModal,
    openAdminModal,
    materials,
    setSalesStatusFilter,
    setSalesTimeframeFilter,
    pullFromServer,
    exchangeRates,
    setExchangeRates,
    convertCurrency,
    copyMarketReferenceToOperational,
  } = useInventory();

  const [isSupplierPayablesOpen, setIsSupplierPayablesOpen] = useState(false);
  const [isBossModalOpen, setIsBossModalOpen] = useState(false);
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

  // Native mobile hardware back-button listener for Executive Summary Boss Modal
  useEffect(() => {
    if (!isBossModalOpen) return;
    window.history.pushState({ modal: 'executive-summary' }, '');
    const handlePopState = () => {
      setIsBossModalOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal === 'executive-summary') {
        window.history.back();
      }
    };
  }, [isBossModalOpen]);

  // Body & HTML scroll lock when Boss Modal is open
  useEffect(() => {
    if (!isBossModalOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow || '';
      document.documentElement.style.overflow = originalDocOverflow || '';
    };
  }, [isBossModalOpen]);

  const isKu = language === 'ku';

  const canAccessPanels = !!userPermissions.canViewPanels;
  const canAccessSales = !!userPermissions.canViewSales;
  const canAccessGoods = !!userPermissions.canViewWarehouse;
  const canAccessAnalytics = !!(userPermissions.canViewFinancialAnalytics || userPermissions.canViewWorkshopAnalytics);
  const canViewFinances = ['admin', 'owner', 'accountant'].includes(currentUser?.role?.toLowerCase() || '');
  const canShowCurrencyWidget = Boolean(userPermissions.canViewSales || canAccessSales || canViewFinances);

  // Persistent Hub Selected Currency (Strictly visual multi-currency display)
  const [hubCurrency, setHubCurrency] = useState<CurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moduleHub_activeCurrency');
      if (saved === 'USD' || saved === 'IQD' || saved === 'EUR') return saved as CurrencyCode;
    }
    return 'USD';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('moduleHub_activeCurrency', hubCurrency);
    }
  }, [hubCurrency]);

  // Operational Exchange Rates Settings toggle
  const [showRateSettings, setShowRateSettings] = useState(false);

  // Helper to format currency values using NumberScroller for rolling animations
  const renderScrollerCurrency = useCallback((amountUSD: number, targetCur: CurrencyCode = hubCurrency, mode: 'executive' | 'instant' = 'executive') => {
    if (targetCur === 'USD') {
      return <NumberScroller value={amountUSD} prefix="$" mode={mode} />;
    }
    const converted = convertCurrency(amountUSD, 'USD', targetCur);
    if (targetCur === 'IQD') {
      return (
        <span dir="ltr" className="inline-flex flex-col sm:inline-flex sm:flex-row sm:items-baseline sm:gap-1 max-w-full overflow-hidden align-baseline">
          <span className="truncate tracking-tighter"><NumberScroller value={converted} mode={mode} /></span>
          <span className="text-[10px] sm:text-xs font-bold font-sans text-slate-400 shrink-0">IQD</span>
        </span>
      );
    }
    if (targetCur === 'EUR') {
      return <NumberScroller value={converted} prefix="€" mode={mode} />;
    }
    return <NumberScroller value={amountUSD} prefix="$" mode={mode} />;
  }, [hubCurrency, convertCurrency]);

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

  const handleSelectDivision = useCallback((mod: PlatformModule, fallbackMod?: PlatformModule) => {
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
          en: 'Inventory & Orders',
          ku: 'کۆگا و داواکارییەکان',
          descEn: 'Your account does not have authorization to access the Inventory & Orders module.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی کۆگا و داواکارییەکانی پێنەدراوە.'
        },
        sales: {
          en: 'Customer & Suppliers Debts',
          ku: 'قەرزی کڕیاران و دابینکەران',
          descEn: 'Your account does not have authorization to access the Customer & Suppliers Debts module.',
          descKu: 'دەستپێگەیشتن ڕێگاپێدراو نییە. ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی قەرزی کڕیاران و دابینکەرانی پێنەدراوە.'
        },
        goods: {
          en: 'Shipments & Warehouses',
          ku: 'بارەکان و کۆگاکان',
          descEn: 'Your account does not have authorization to access Shipments & Warehouses.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی بارەکان و کۆگاکانی پێنەدراوە.'
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
  }, [userPermissions, currentUser, isKu, onSelectModule, setCurrentModule]);

  const handleOpenAnalytics = useCallback(() => {
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
  }, [canAccessAnalytics, isKu, openVisualCharts]);

  const warehouseOps = useWarehouseOps();

  // Key B2B Supplier metrics fully memoized
  const totalInvoicesCount = useMemo(() => warehouseOps.activeShipments.length, [warehouseOps.activeShipments]);

  const totalSupplierPaid = useMemo(() => {
    return warehouseOps.activeShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      return acc + Math.max(0, Number(s.amountPaidToSupplier) || 0);
    }, 0);
  }, [warehouseOps.activeShipments]);

  const totalSupplierDebt = useMemo(() => {
    return warehouseOps.activeShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt =
        s.supplierDebtRemaining !== undefined
          ? Number(s.supplierDebtRemaining)
          : Math.max(0, invoiced - paid);
      return acc + Math.max(0, debt);
    }, 0);
  }, [warehouseOps.activeShipments]);

  const activeCuttingOrdersCount = useMemo(() => {
    return materials.reduce((acc, mat) => {
      return acc + (mat.activeOrders ? mat.activeOrders.filter((o: OrderAllocation) => o.status !== 'finalized' && (o.status as string) !== 'completed').length : 0);
    }, 0);
  }, [materials]);

  const handleGlanceTodayCash = useCallback(() => {
    setSalesTimeframeFilter('today');
    setSalesStatusFilter('all');
    handleSelectDivision('sales');
  }, [handleSelectDivision, setSalesStatusFilter, setSalesTimeframeFilter]);

  const handleGlanceDebts = useCallback(() => {
    setSalesStatusFilter('debt');
    setSalesTimeframeFilter('all');
    handleSelectDivision('sales');
  }, [handleSelectDivision, setSalesStatusFilter, setSalesTimeframeFilter]);

  const handleGlanceActiveOrders = useCallback(() => {
    handleSelectDivision('orders', 'panels');
  }, [handleSelectDivision]);

  const lowStockCount = useMemo(() => {
    return materials.filter((m) => (m.availableStock || 0) <= 5).length;
  }, [materials]);

  const handleGlanceLowStock = useCallback(() => {
    handleSelectDivision('panels', 'orders');
  }, [handleSelectDivision]);

  const handleGlanceShipping = useCallback(() => {
    handleSelectDivision('shipping', 'goods');
  }, [handleSelectDivision]);

  const customsShipmentsCount = useMemo(() => {
    return warehouseOps.activeShipments.filter((s) => s.status === 'customs').length;
  }, [warehouseOps.activeShipments]);

  const pendingShipmentsCount = useMemo(() => {
    return warehouseOps.activeShipments.filter((s) => s.status === 'pending').length;
  }, [warehouseOps.activeShipments]);

  const rackedUnitsCount = useMemo(() => {
    return warehouseOps.allocations.reduce((sum, a) => sum + a.quantity, 0);
  }, [warehouseOps.allocations]);

  const allOrdersList = useMemo(() => {
    const list: { order: OrderAllocation; materialName: string; materialCode: string }[] = [];
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        list.push({ order: o, materialName: mat.name, materialCode: mat.code });
      });
    });
    list.sort((a, b) => {
      const timeA = a.order.createdAt || (a.order.date ? new Date(a.order.date).getTime() : 0);
      const timeB = b.order.createdAt || (b.order.date ? new Date(b.order.date).getTime() : 0);
      return timeB - timeA;
    });
    return list;
  }, [materials]);

  const completedOrders = useMemo(() => {
    return allOrdersList.filter(
      (item) => item.order.status === 'finalized' || (item.order.status as string) === 'completed'
    );
  }, [allOrdersList]);

  const activeOrders = useMemo(() => {
    return allOrdersList.filter(
      (item) => item.order.status !== 'finalized' && (item.order.status as string) !== 'completed'
    );
  }, [allOrdersList]);

  const allActiveOrders = completedOrders;

  const lowStockPanels = useMemo(() => {
    return materials
      .filter((m) => (m.availableStock || 0) <= 5)
      .slice(0, 8);
  }, [materials]);

  const activeInboundShipments = useMemo(() => {
    return warehouseOps.activeShipments
      .filter((s) => s.status === 'pending' || s.status === 'customs')
      .slice(0, 50);
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

  // Strict RBAC Security: Master Admin or Shaswar Account
  const isShaswarAuthorized = useMemo(() => Boolean(
    currentUser?.role?.toLowerCase() === 'owner' ||
    currentUser?.role?.toLowerCase() === 'admin' ||
    currentUser?.username?.toLowerCase() === 'shaswar' ||
    currentUser?.displayName?.toLowerCase().includes('shaswar')
  ), [currentUser?.role, currentUser?.username, currentUser?.displayName]);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const isOwner = currentUser?.role?.toLowerCase() === 'owner' || isShaswarAuthorized;

  // Customer Receivables (Funds owed to the company by clients)
  const totalCustomerReceivables = useMemo(() => {
    let sum = 0;
    (transactions || []).forEach((tx) => {
      if (tx.isDeleted === 1) return;
      if (tx.isReceivable === false) return;
      const debt = typeof tx.amountOwed === 'number'
        ? tx.amountOwed
        : (typeof tx.combinedTotalDebt === 'number'
          ? tx.combinedTotalDebt
          : Math.max(0, (Number(tx.totalAfterDiscount || tx.sellingAmount) || 0) - (Number(tx.amountPaidNow) || 0)));
      if (debt <= 0) return;
      const isIqd = tx.currency === 'IQD' || tx.chargedCurrency === 'IQD';
      if (isIqd) sum += debt / 1500;
      else sum += debt;
    });
    return Math.round(sum);
  }, [transactions]);

  // Silent Data Hydration Check on Mount:
  // Strictly gated by both module singleton and ref so it can never fire multiple times
  const hasHydratedPayablesRef = useRef(false);
  const syncWarehouseFromServer = warehouseOps.syncFromServer;

  useEffect(() => {
    if (isShaswarAuthorized && !hasHydratedPayablesRef.current && !hasHydratedModuleHubOnce) {
      hasHydratedPayablesRef.current = true;
      hasHydratedModuleHubOnce = true;
      void pullFromServer();
      void syncWarehouseFromServer?.();
    }
  }, [isShaswarAuthorized, pullFromServer, syncWarehouseFromServer]);

  // Window focus & tab visibility tick to re-evaluate snapshot without server polling (debounced via ref)
  const [mountSyncTick, setMountSyncTick] = useState<number>(0);
  const lastSyncTickTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleSyncTrigger = () => {
      const now = Date.now();
      if (now - lastSyncTickTimeRef.current < 1000) return;
      lastSyncTickTimeRef.current = now;
      setMountSyncTick((prev) => prev + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncTrigger();
      }
    };

    window.addEventListener('focus', handleSyncTrigger);
    window.addEventListener('popstate', handleSyncTrigger);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleSyncTrigger);
      window.removeEventListener('popstate', handleSyncTrigger);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Static client-side snapshot evaluating on mount, data updates, and window focus / navigation
  const shaswarMasterSnapshot = useMemo(() => {
    const consignmentsValue = (warehouseOps.activeShipments || []).reduce((sum, s) => {
      if (s.isDeleted === 1) return sum;
      return sum + (Number(s.totalInvoiceAmount) || 0);
    }, 0);
    const panelStockVal = (stats.totalStock || 0) * 38;
    const eurToUsdRate = Number(exchangeRates.eurToUsd || exchangeRates.EUR_USD) || 1.08;

    // Aggregates all remaining supplier debt across active shipments + transaction records
    let debtUSD = 0;
    (warehouseOps.activeShipments || []).forEach((s) => {
      if (s.isDeleted === 1) return;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      if (debt <= 0) return;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      if (curr === 'EUR') {
        debtUSD += debt * eurToUsdRate;
      } else {
        debtUSD += debt;
      }
    });

    // Also include any trade ledger AP supplier transactions not already tracked in shipments
    (transactions || []).forEach((tx) => {
      if (tx.isDeleted === 1) return;
      if (tx.isReceivable === true) return; // AP only
      const debt = typeof tx.amountOwed === 'number'
        ? tx.amountOwed
        : Math.max(0, (Number(tx.totalAfterDiscount || tx.sellingAmount) || 0) - (Number(tx.amountPaidNow || (tx as unknown as { amountPaidToSupplier?: number }).amountPaidToSupplier) || 0));
      if (debt <= 0) return;
      const curr = tx.currency || tx.chargedCurrency || 'USD';
      if (curr === 'EUR') {
        debtUSD += debt * eurToUsdRate;
      } else if (curr === 'IQD') {
        debtUSD += debt / 1500;
      } else {
        debtUSD += debt;
      }
    });

    // Ensure fallback to totalSupplierDebt if positive
    if (debtUSD <= 0 && totalSupplierDebt > 0) {
      debtUSD = totalSupplierDebt;
    }
    let customerRec = 0;
    (transactions || []).forEach((tx) => {
      if (tx.isDeleted === 1) return;
      if (tx.isReceivable === false) return;
      const debt = typeof tx.amountOwed === 'number'
        ? tx.amountOwed
        : (typeof tx.combinedTotalDebt === 'number'
          ? tx.combinedTotalDebt
          : Math.max(0, (Number(tx.totalAfterDiscount || tx.sellingAmount) || 0) - (Number(tx.amountPaidNow) || 0)));
      if (debt <= 0) return;
      const isIqd = tx.currency === 'IQD' || tx.chargedCurrency === 'IQD';
      if (isIqd) customerRec += debt / 1500;
      else customerRec += debt;
    });
    const customsCount = (warehouseOps.activeShipments || []).filter((s) => s.status === 'customs').length;
    const pendingCount = (warehouseOps.activeShipments || []).filter((s) => s.status === 'pending').length;
    let queueLen = 0;
    let pickupCount = 0;
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        if (o.status === 'finalized' || (o.status as string) === 'completed') {
          queueLen++;
          pickupCount++;
        }
      });
    });
    return {
      valuation: consignmentsValue + panelStockVal,
      totalPanels: stats.totalStock || 0,
      totalLoads: (warehouseOps.activeShipments || []).filter((s) => s.isDeleted !== 1).length,
      payablesUSD: debtUSD,
      customerReceivables: Math.round(customerRec),
      customsCount,
      pendingCount,
      workshopQueue: queueLen,
      readyForPickup: pickupCount,
    };
  }, [
    warehouseOps.activeShipments,
    transactions,
    exchangeRates,
    totalSupplierDebt,
    stats.totalStock,
    materials,
    mountSyncTick,
  ]);

  // Today's total cash intake (direct sales payments + debt collections)
  const todayInflow = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let usd = 0;
    let iqd = 0;
    (transactions || []).forEach((tx) => {
      if (tx.isDeleted === 1) return;
      const txDate = (tx.timestamp || '').slice(0, 10);
      if (txDate === todayStr) {
        const paid = Number(tx.amountPaidNow) || 0;
        const isIqd = tx.currency === 'IQD' || tx.chargedCurrency === 'IQD';
        if (isIqd) iqd += paid;
        else usd += paid;
      }
    });
    const debtIntake = getTodayDebtPaymentIntake(activityLogs, transactions);
    usd += debtIntake.usd;
    iqd += debtIntake.iqd;
    return { usd, iqd };
  }, [transactions, activityLogs]);

  // Total enterprise asset valuation (Stock + Inbound Consignments)
  const totalValuation = useMemo(() => {
    const consignmentsValue = (warehouseOps.activeShipments || []).reduce((sum, s) => {
      if (s.isDeleted === 1) return sum;
      return sum + (Number(s.totalInvoiceAmount) || 0);
    }, 0);
    const panelStockValue = (stats.totalStock || 0) * 38;
    return consignmentsValue + panelStockValue;
  }, [warehouseOps.activeShipments, stats.totalStock]);

  const readyForPickupCount = useMemo(() => {
    let count = 0;
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        if (o.status === 'finalized' || (o.status as string) === 'completed') {
          count++;
        }
      });
    });
    return count;
  }, [materials]);

  // Segmented Quick Activity & Alerts Drawer (Orders, Alerts, Cargo) - Desktop 3-Column Side-by-Side
  const renderQuickActivity = () => (
    <div className="p-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-3 md:p-0 md:bg-transparent md:border-none md:shadow-none md:space-y-0 md:backdrop-blur-none transform-gpu">
      {/* Segmented Tab Controls (Mobile only) */}
      <div className="flex md:hidden items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveMobileTab('orders')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${
            activeMobileTab === 'orders'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {isKu ? `داواکارییەکان (${allOrdersList.length})` : `Orders (${allOrdersList.length})`}
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

      {/* Master 3-Column Desktop Grid & Mobile Tabbed Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Orders (Active & Finalized) */}
        <div
          className={`${
            activeMobileTab === 'orders' ? 'block' : 'hidden md:block'
          } md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-emerald-500/10 md:hover:border-emerald-500 md:dark:border-emerald-500/10 md:dark:hover:border-emerald-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] md:rounded-[2rem] md:p-6 relative overflow-hidden text-start group transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01]`}
        >
          {/* Bespoke Icon Watermark (Orders) */}
          <Package className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-emerald-500" />

          {/* Desktop Column Header */}
          <div className="hidden md:flex items-center justify-between pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isKu ? 'داواکارییەکان' : 'Orders'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 font-mono">
                {allOrdersList.length}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {activeOrders.length} {isKu ? 'کارا' : 'Active'} &bull; {completedOrders.length} {isKu ? 'تەواو' : 'Done'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pe-1 touch-pan-y relative z-20">
            {allOrdersList.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{isKu ? 'هیچ داواکارییەک تۆمار نەکراوە' : 'No orders recorded'}</span>
              </div>
            ) : (
              allOrdersList.slice(0, 10).map(({ order, materialName, materialCode }) => (
                <MobileOrderRow
                  key={order.id}
                  order={order}
                  materialName={materialName}
                  materialCode={materialCode}
                  isKu={isKu}
                  onClick={handleGlanceActiveOrders}
                />
              ))
            )}
            <button
              type="button"
              onClick={handleGlanceActiveOrders}
              className="w-full text-center py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline active:scale-98 cursor-pointer mt-1"
            >
              {isKu ? 'بینینی هەموو داواکارییەکان' : 'View All Orders'} &rarr;
            </button>
          </div>
        </div>

        {/* Column 2: Inventory Alerts */}
        <div
          className={`${
            activeMobileTab === 'alerts' ? 'block' : 'hidden md:block'
          } md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-red-500/10 md:hover:border-red-500 md:dark:border-red-500/10 md:dark:hover:border-red-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)] md:rounded-[2rem] md:p-6 relative overflow-hidden text-start group transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01]`}
        >
          {/* Bespoke Icon Watermark (Alerts) */}
          <AlertTriangle className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-red-500" />

          {/* Desktop Column Header */}
          <div className="hidden md:flex items-center justify-between pb-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isKu ? 'ئاگاداری کۆگا' : 'Stock Alerts'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 font-mono">
                {lowStockCount}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {lowStockCount > 0 ? (isKu ? 'پێویستی بە داواکردنە' : 'Requires Reorder') : (isKu ? 'کۆگا تەواوە' : 'Healthy')}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pe-1 touch-pan-y relative z-20">
            {lowStockPanels.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold">{isKu ? 'کۆگا تەواوە • هەموو تەختەکان بەردەستن' : 'Stock Healthy • All Panels Available'}</span>
              </div>
            ) : (
              lowStockPanels.slice(0, 10).map((mat) => (
                <MobileLowStockRow
                  key={mat.id}
                  code={mat.code}
                  name={mat.name}
                  type={mat.type}
                  availableStock={mat.availableStock}
                  isKu={isKu}
                  onClick={handleGlanceLowStock}
                />
              ))
            )}
            <button
              type="button"
              onClick={handleGlanceLowStock}
              className="w-full text-center py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline active:scale-98 cursor-pointer mt-1"
            >
              {isKu ? 'بینینی تەختەکان لە کۆگا' : 'View Panels in Stock'} &rarr;
            </button>
          </div>
        </div>

        {/* Column 3: Cargo & Shipping */}
        <div
          className={`${
            activeMobileTab === 'cargo' ? 'block' : 'hidden md:block'
          } md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-orange-500/10 md:hover:border-orange-500 md:dark:border-orange-500/10 md:dark:hover:border-orange-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] md:rounded-[2rem] md:p-6 relative overflow-hidden text-start group transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01]`}
        >
          {/* Bespoke Icon Watermark (Cargo) */}
          <Tag className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-orange-500" />

          {/* Desktop Column Header */}
          <div className="hidden md:flex items-center justify-between pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isKu ? 'بارەکانی گومرگ' : 'Inbound Cargo'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 font-mono">
                {activeInboundShipments.length}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {shaswarMasterSnapshot.customsCount} {isKu ? 'گومرگ' : 'Customs'} &bull; {shaswarMasterSnapshot.pendingCount} {isKu ? 'کارگە' : 'Factory'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pe-1 touch-pan-y relative z-20">
            {activeInboundShipments.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span>{isKu ? 'هیچ بارێکی نوێ لە ڕێگادا نییە' : 'No shipments currently in transit'}</span>
              </div>
            ) : (
              activeInboundShipments.slice(0, 10).map((s) => (
                <MobileShipmentRow
                  key={s.id}
                  batchCode={s.batchCode}
                  supplier={s.supplier || s.supplierName || 'FunderMax'}
                  arrivalDate={s.arrivalDate}
                  originCountry={s.originCountry}
                  status={s.status}
                  isKu={isKu}
                  onClick={handleGlanceShipping}
                />
              ))
            )}
            <button
              type="button"
              onClick={handleGlanceShipping}
              className="w-full text-center py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline active:scale-98 cursor-pointer mt-1"
            >
              {isKu ? 'بینینی هێڵی گواستنەوە' : 'View Shipping Pipeline'} &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 w-full overflow-hidden h-auto bg-transparent transform-gpu">
      {/* ========================================================================= */}
      {/* 100% PURE GPU COMPOSITOR AMBIENT BACKGROUND (Desktop Only - Memoized)     */}
      {/* ========================================================================= */}
      <AmbientBackgroundLayer />

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pt-2 pb-1 px-3 md:pt-8 md:pb-4 md:px-8 animate-in fade-in duration-300 overflow-x-hidden transform-gpu">

        {/* ========================================================================= */}
        {/* MOBILE-FIRST EXECUTIVE DASHBOARD (< 768px)                                */}
        {/* ========================================================================= */}
        <div className="block md:hidden h-auto space-y-3 pb-0 overflow-x-hidden max-w-full transform-gpu">
          {/* 1. Mobile ERP Branding Header */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl shadow-xs">
                  <ChessKnight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate select-none leading-tight">
                    Bako&apos;s <span className="text-master-shimmer">Master</span> System
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {currentUser?.role || 'ERP User'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {APP_CONFIG.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Badge */}
              <div className="flex items-center shrink-0">
                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  {isKu ? (
                    <span dir="ltr" className="inline-block" style={{ unicodeBidi: 'plaintext' }}>
                      {`${new Date().getDate()} ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date())} ${new Date().getFullYear()}`}
                    </span>
                  ) : (
                    <span dir="ltr" className="inline-block">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Currency Switcher (USD, IQD, EUR) & Exchange Rates Button (Mobile Parity) */}
          {canShowCurrencyWidget && (
            <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-750 flex-1 justify-around">
                {(['USD', 'IQD', 'EUR'] as CurrencyCode[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setHubCurrency(cur)}
                    className={`flex-1 py-1 text-xs font-black rounded-lg transition-all text-center cursor-pointer ${
                      hubCurrency === cur
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cur === 'USD' ? '$ USD' : cur === 'IQD' ? 'IQD' : '€ EUR'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowRateSettings(!showRateSettings)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
                  showRateSettings
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
                title={isKu ? 'نرخی ئاڵوگۆڕ' : 'Exchange Rates'}
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-extrabold">{isKu ? 'نرخی دراو' : 'Rates'}</span>
              </button>
            </div>
          )}

          {/* Operational Exchange Rates Settings Popover on Mobile */}
          {showRateSettings && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-150">
              <ExchangeRateSettingsPopover
                exchangeRates={exchangeRates}
                setExchangeRates={setExchangeRates}
                copyMarketReferenceToOperational={copyMarketReferenceToOperational}
                onClose={() => setShowRateSettings(false)}
                isKu={isKu}
              />
            </div>
          )}

          {/* Consolidated Executive KPI Section */}
          <div className="space-y-3 transform-gpu">
            {canViewFinances ? (
              <>
                {/* 1. The "SHASWAR VIEW" Walled Garden Mega-Card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsBossModalOpen(true)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsBossModalOpen(true)}
                  className="w-full p-4 sm:p-5 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-rose-200/80 dark:border-rose-900/60 shadow-md active:scale-[0.99] transition-all cursor-pointer select-none space-y-4 ring-1 ring-rose-500/20 group text-start"
                >
                  {/* Mega-Card Header: Red Heartbeat Icon + Title */}
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0 border border-rose-400/40 group-hover:scale-105 transition-transform">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                            {isKu ? 'دیمەنی شاسوار' : 'SHASWAR VIEW'}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                            {isKu ? 'کۆکراوە' : 'Executive'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {isKu ? 'کورتەی خێرای دارایی، داواکاری و بارەکان' : 'Tap for Executive Read-Only Summary'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <span>{isKu ? 'بینین' : 'View'}</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* 2x2 Metric Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Metric 1: Customer Receivables */}
                    <div className="p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-h-[96px] min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        <span>{isKu ? 'قەرزی لای کڕیار' : 'Receivables'}</span>
                        <TrendingUp className="w-4 h-4 text-sky-500 shrink-0" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-600 dark:text-sky-400 tracking-tight truncate">
                          {renderScrollerCurrency(shaswarMasterSnapshot.customerReceivables)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'پارەی کۆمپانیا' : 'Money Owed To Us'}
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Supplier Payables */}
                    <div className="p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-h-[96px] min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        <span>{isKu ? 'قەرزی دابینکەر' : 'Payables'}</span>
                        <Coins className="w-4 h-4 text-rose-500 shrink-0" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate">
                          {renderScrollerCurrency(shaswarMasterSnapshot.payablesUSD)}
                        </div>
                        {supplierDebtData.debtEUR > 0 ? (
                          <div className="text-[10px] font-bold font-mono text-amber-500 truncate mt-0.5">
                            <span dir="ltr" className="inline-block">+ €{supplierDebtData.debtEUR.toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {isKu ? 'قەرزی سەر کۆمپانیا' : 'Vendors & Debt'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metric 3: Orders (Green matching PC) */}
                    <div className="p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-h-[96px] min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        <span>{isKu ? 'داواکاری تەواوکراو' : 'Completed Orders'}</span>
                        <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1 truncate">
                          <NumberScroller value={completedOrders.length} mode="executive" />
                          <span className="text-xs font-bold text-slate-400 font-sans">{isKu ? 'تەواوبوو' : 'Completed'}</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate mt-0.5">
                          {isKu ? 'ئامادەی ڕادەستکردن' : 'Ready for Pickup'}
                        </div>
                      </div>
                    </div>

                    {/* Metric 4: Inbound Cargo (Orange matching PC) */}
                    <div className="p-3.5 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-h-[96px] min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                        <span>{isKu ? 'باری لە ڕێگە' : 'Inbound Cargo'}</span>
                        <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tracking-tight flex items-baseline gap-1 truncate">
                          <NumberScroller value={shaswarMasterSnapshot.customsCount} mode="executive" />
                          <span className="text-xs font-bold text-slate-400 font-sans">{isKu ? 'بار' : 'Loads'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {shaswarMasterSnapshot.pendingCount} {isKu ? 'کارگەی دەرەوە' : 'Factory Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mega-Card Sub-footer */}
                  <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isKu ? 'دراوە بە دابینکەر:' : 'Paid to date:'} <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400"><span dir="ltr" className="inline-block">${totalSupplierPaid.toLocaleString()}</span></span>
                    </span>
                    <span className="font-mono font-bold text-slate-400 dark:text-slate-500">
                      {isKu ? 'نوێکراوەتەوە' : 'Live Synced'} &bull;
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Active Orders in Queue */}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="p-4 rounded-2xl bg-gradient-to-b from-white/80 via-white/70 to-white/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/60 backdrop-blur-md border border-white/60 dark:border-slate-750/80 shadow-sm flex flex-col justify-between min-h-[128px] text-start cursor-pointer active:scale-95 transition-all select-none group"
                  title="View Active Orders"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {isKu ? 'داواکاری لە سەرە' : 'Active Orders'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
                      {activeOrders.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {isKu ? 'لە وۆرکشۆپ و بڕین' : 'In Workshop Queue'}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-1.5 flex items-center gap-1.5 pt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{activeOrders.length > 0 ? (isKu ? 'بەرهەمهێنان کارایە' : 'Production Active') : (isKu ? 'سەرە خاڵییە' : 'Queue Clear')}</span>
                    </div>
                  </div>
                </button>

                {/* 2. Ready for Pickup */}
                <button
                  type="button"
                  onClick={handleGlanceActiveOrders}
                  className="p-4 rounded-2xl bg-gradient-to-b from-white/80 via-white/70 to-white/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/60 backdrop-blur-md border border-white/60 dark:border-slate-750/80 shadow-sm flex flex-col justify-between min-h-[128px] text-start cursor-pointer active:scale-95 transition-all select-none group"
                  title="View Ready for Pickup"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {isKu ? 'ئامادە بۆ وەرگرتن' : 'Ready Pickup'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {completedOrders.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {isKu ? 'چاوەڕوانی ڕادەستکردن' : 'Awaiting Delivery'}
                    </div>
                    <div className="text-[10px] font-semibold truncate mt-1.5 flex items-center gap-1.5 pt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{completedOrders.length > 0 ? (isKu ? 'ئامادەی کڕیارە' : 'Staged for Client') : (isKu ? 'هیچ نییە' : 'None Staged')}</span>
                    </div>
                  </div>
                </button>

                {/* 3. Low Stock Alerts */}
                <button
                  type="button"
                  onClick={handleGlanceLowStock}
                  className="p-4 rounded-2xl bg-gradient-to-b from-white/80 via-white/70 to-white/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/60 backdrop-blur-md border border-white/60 dark:border-slate-750/80 shadow-sm flex flex-col justify-between min-h-[128px] text-start cursor-pointer active:scale-95 transition-all select-none group"
                  title="View Low Stock Alerts"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {isKu ? 'کەمیی کۆگا' : 'Stock Alerts'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {lowStockCount}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      <span dir="ltr" className="inline-block">{stats.totalStock.toLocaleString()}</span> {isKu ? 'تەختەی کۆگا' : 'Panels in Stock'}
                    </div>
                    <div className="text-[10px] font-semibold truncate mt-1.5 flex items-center gap-1.5 pt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lowStockCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      {lowStockCount > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                          <span dir="ltr" className="inline-block">{lowStockCount}</span> {isKu ? 'مەترسیدار کەمە' : 'Items Critical'}!
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {isKu ? 'کۆگا تەندروستە' : 'Stock Healthy'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* 4. Active Cargo */}
                <button
                  type="button"
                  onClick={() => handleSelectDivision('shipping', 'goods')}
                  className="p-4 rounded-2xl bg-gradient-to-b from-white/80 via-white/70 to-white/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/60 backdrop-blur-md border border-white/60 dark:border-slate-750/80 shadow-sm flex flex-col justify-between min-h-[128px] text-start cursor-pointer active:scale-95 transition-all select-none group"
                  title="View Active Cargo"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {isKu ? 'باری لە ڕێگە' : 'Inbound Cargo'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Tag className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-violet-600 dark:text-violet-400">
                      {activeInboundShipments.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {isKu ? 'لە گومرگ و کارگە' : 'Customs & Transit'}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-1.5 flex items-center gap-1.5 pt-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      <span dir="ltr" className="inline-block">{shaswarMasterSnapshot.customsCount}</span> {isKu ? 'گومرگ' : 'Customs'} &bull; <span dir="ltr" className="inline-block">{shaswarMasterSnapshot.pendingCount}</span> {isKu ? 'کارگە' : 'Factory'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 4 Core Master Modules (2x2 Desktop Command Grid & Stacked Mobile) */}
          <div className="flex flex-col md:grid md:grid-cols-2 gap-6 my-8">
            {/* Card 1: Inventory & Orders */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectDivision('panels', 'orders')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectDivision('panels', 'orders')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-3xl p-5 md:p-8 md:min-h-[240px] md:bg-white/70 md:dark:bg-slate-900/70 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-emerald-500/10 md:hover:border-emerald-500 md:dark:border-emerald-500/10 md:dark:hover:border-emerald-500 md:hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] md:rounded-[2rem] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Inventory) */}
              <Warehouse className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-emerald-500" />

              {!canAccessPanels ? (
                <EnterpriseModuleLocked colorClass="text-emerald-500" bgClass="bg-emerald-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                    {/* Top Row: Icon & Title on Left, Mobile Chevron on Right */}
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20">
                          <Warehouse className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {isKu ? 'کۆگا و داواکارییەکان' : 'Inventory & Orders'}
                          </h2>
                          <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                            {isKu ? 'بەڕێوەبردنی تەختە و داواکارییەکان' : 'Panels, Materials & Workshop Orders'}
                          </p>
                        </div>
                      </div>
                      {/* Mobile-Only Chevron */}
                      <div className="flex items-center shrink-0 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <ChevronRight className="w-5 h-5 rtl:rotate-180 md:hidden group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Desktop Descriptive Paragraph */}
                    <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {isKu
                        ? 'کۆگای تەختە، حجزکردنەکانی وۆرکشۆپ، ئاگاداری کەمی و ڕادەستکردنی کڕیاران.'
                        : 'Live wood panel stocks, workshop reservations, low-stock alerts, and client dispatches.'}
                    </p>

                    {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Metric 1: Total Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {isKu ? 'کۆی تەختە' : 'Total Stock'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <span dir="ltr" className="inline-block">{stats.totalStock.toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Metric 2: Available Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {isKu ? 'بەردەست' : 'Available'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <span dir="ltr" className="inline-block">{stats.totalAvailable.toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Metric 3: Reserved */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                          {isKu ? 'حجزکراو' : 'Reserved'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                          <span dir="ltr" className="inline-block">{stats.totalAllocated.toLocaleString()}</span>
                        </div>
                      </div>
                      {/* Metric 4: Low Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                          {isKu ? 'کەمیی کۆگا' : 'Low Stock'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 truncate">
                          <span dir="ltr" className="inline-block">{lowStockCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Total Stock */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={stats.totalStock} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.totalStockCount || (isKu ? 'کۆی تەختە' : 'Total Stock')}
                        </div>
                      </div>

                      {/* 2. Available */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={stats.totalAvailable} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.available || (isKu ? 'بەردەست' : 'Available')}
                        </div>
                      </div>

                      {/* 3. Reserved */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={stats.totalAllocated} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.reserved || (isKu ? 'حجزکراو' : 'Reserved')}
                        </div>
                      </div>

                      {/* 4. Low Stock */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className={`text-xl font-bold font-mono truncate ${
                          lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          <NumberScroller value={lowStockCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کەمیی کۆگا' : 'Low Stock'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('panels', 'orders')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی کۆگا و داواکارییەکان' : 'Open Inventory & Orders'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Card 2: Customer & Suppliers Debts */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectDivision('sales')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectDivision('sales')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-3xl p-5 md:p-8 md:min-h-[240px] md:bg-white/70 md:dark:bg-slate-900/70 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-sky-500/10 md:hover:border-sky-500 md:dark:border-sky-500/10 md:dark:hover:border-sky-500 md:hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)] md:rounded-[2rem] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Debts) */}
              <ReceiptText className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-sky-500" />

              {!canAccessSales ? (
                <EnterpriseModuleLocked colorClass="text-sky-500" bgClass="bg-sky-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                    {/* Top Row: Icon & Title on Left, Mobile Chevron on Right */}
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/20">
                          <ReceiptText className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {isKu ? 'قەرزی کڕیاران و دابینکەران' : 'Customer & Suppliers Debts'}
                          </h2>
                          <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                            {isKu ? 'حیساباتی قەرزی کڕیار و دابینکەران' : 'Receivables, Payables & Settlements'}
                          </p>
                        </div>
                      </div>
                      {/* Mobile-Only Chevron */}
                      <div className="flex items-center shrink-0 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        <ChevronRight className="w-5 h-5 rtl:rotate-180 md:hidden group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Desktop Descriptive Paragraph */}
                    <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {isKu
                        ? 'بەڕێوەبردنی قەرزی کارگەی فەندەرمەکس، ژمێریاری دابینکەران و قەرزی لای کڕیاران.'
                        : 'Manage FunderMax factory debt, supplier accounting, and customer accounts receivable.'}
                    </p>

                    {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Metric 1: Customer Receivables */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                          {isKu ? 'قەرزی لای کڕیار' : 'Receivables'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-sky-600 dark:text-sky-400 truncate">
                          {renderScrollerCurrency(totalCustomerReceivables, hubCurrency, 'instant')}
                        </div>
                      </div>
                      {/* Metric 2: Supplier Payables */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                          {isKu ? 'قەرزی دابینکەر' : 'Payables'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 truncate">
                          {renderScrollerCurrency(totalSupplierDebt, hubCurrency, 'instant')}
                        </div>
                      </div>
                      {/* Metric 3: Total Paid */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {isKu ? 'کۆی دراو' : 'Total Paid'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          {renderScrollerCurrency(totalSupplierPaid, hubCurrency, 'instant')}
                        </div>
                      </div>
                      {/* Metric 4: Bills Count */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {isKu ? 'پسوولەکان' : 'Bills'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <span dir="ltr" className="inline-block">{totalInvoicesCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Receivables */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 truncate">
                          {renderScrollerCurrency(totalCustomerReceivables, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'قەرزی کڕیار' : 'Receivables'}
                        </div>
                      </div>

                      {/* 2. Payables */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
                          {renderScrollerCurrency(totalSupplierDebt, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'قەرزی دابینکەر' : 'Payables'}
                        </div>
                      </div>

                      {/* 3. Total Paid */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          {renderScrollerCurrency(totalSupplierPaid, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کۆی دراو' : 'Total Paid'}
                        </div>
                      </div>

                      {/* 4. Bills */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'پسوولەکان' : 'Bills'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('sales')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی قەرزەکان' : 'Open Customer & Suppliers Debts'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Card 3: Shipments & Warehouses */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectDivision('goods', 'shipping')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectDivision('goods', 'shipping')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-3xl p-5 md:p-8 md:min-h-[240px] md:bg-white/70 md:dark:bg-slate-900/70 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-orange-500/10 md:hover:border-orange-500 md:dark:border-orange-500/10 md:dark:hover:border-orange-500 md:hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] md:rounded-[2rem] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Shipments) */}
              <Truck className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-orange-500" />

              {!canAccessGoods ? (
                <EnterpriseModuleLocked colorClass="text-orange-500" bgClass="bg-orange-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                    {/* Top Row: Icon & Title on Left, Mobile Chevron on Right */}
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20">
                          <Truck className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {isKu ? 'بارەکان و کۆگاکان' : 'Shipments & Warehouses'}
                          </h2>
                          <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                            {isKu ? 'بارەکانی گومرگ و کۆگاکردنی تەختە' : 'Inbound Cargo & Inventory Racks'}
                          </p>
                        </div>
                      </div>
                      {/* Mobile-Only Chevron */}
                      <div className="flex items-center shrink-0 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        <ChevronRight className="w-5 h-5 rtl:rotate-180 md:hidden group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Desktop Descriptive Paragraph */}
                    <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {isKu
                        ? 'کۆنتێنەرەکانی هێڵی گواستنەوە، بارەکانی گومرگ و کۆگاکردنی تەختەکان.'
                        : 'Inbound freight consignments, customs clearance loads, and racked panel storage.'}
                    </p>

                    {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Metric 1: Total Shipments */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {isKu ? 'کۆی بارەکان' : 'Total Shipments'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <span dir="ltr" className="inline-block">{totalInvoicesCount}</span>
                        </div>
                      </div>
                      {/* Metric 2: In Customs */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                          {isKu ? 'لە گومرگ' : 'In Customs'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                          <span dir="ltr" className="inline-block">{customsShipmentsCount}</span>
                        </div>
                      </div>
                      {/* Metric 3: Units Racked */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {isKu ? 'لە کۆگادا' : 'Racked'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <span dir="ltr" className="inline-block">{rackedUnitsCount}</span>
                        </div>
                      </div>
                      {/* Metric 4: In Pipeline */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                          {isKu ? 'لە کارگە' : 'In Transit'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-sky-600 dark:text-sky-400 truncate">
                          <span dir="ltr" className="inline-block">{pendingShipmentsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Shipments */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کۆی بارەکان' : 'Shipments'}
                        </div>
                      </div>

                      {/* 2. In Customs */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={customsShipmentsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە گومرگ' : 'In Customs'}
                        </div>
                      </div>

                      {/* 3. Racked */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={rackedUnitsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە کۆگادا' : 'Racked'}
                        </div>
                      </div>

                      {/* 4. In Transit */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 truncate">
                          <NumberScroller value={pendingShipmentsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە کارگە' : 'In Transit'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('goods', 'shipping')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی بارەکان و کۆگاکان' : 'Open Shipments & Warehouses'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Card 4: Image & PDF Merger */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => openMergerModal()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openMergerModal()}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm rounded-3xl p-5 md:p-8 md:min-h-[240px] md:bg-white/70 md:dark:bg-slate-900/70 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-blue-600/10 md:hover:border-blue-600 md:dark:border-blue-600/10 md:dark:hover:border-blue-600 md:hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)] md:rounded-[2rem] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Image Merger) */}
              <Paintbrush className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-indigo-500" />

              <div className="relative z-20">
                {/* Top Row: Icon & Title on Left, Mobile Chevron on Right */}
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/20">
                      <Paintbrush className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {isKu ? 'یەکخستنی وێنە و پسوولەکان (PDF)' : 'Image & PDF Merger'}
                        </h2>
                      </div>
                      <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                        {isKu ? 'کۆکردنەوەی چەند وێنە یان PDF لە یەک پەڕەدا' : 'Combine multiple slips, photos & PDFs into one sheet'}
                      </p>
                    </div>
                  </div>
                  {/* Mobile-Only Chevron */}
                  <div className="flex items-center shrink-0 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <ChevronRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Desktop Descriptive Paragraph */}
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {isKu
                    ? 'کۆکردنەوەی وێنەی پسوولە و دۆکیومێنتەکان، دروستکردنی پەڕەی چاپکراوی ستاندارد و هەناردەکردنی PDF.'
                    : 'Combine multiple slips, invoices, and material receipts into unified, high-resolution printable PDF sheets.'}
                </p>
              </div>

              {/* Desktop Large Action Button */}
              <div className="hidden md:flex mt-6">
                <button
                  type="button"
                  onClick={() => openMergerModal()}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                >
                  <span>{isKu ? 'کردنەوەی ستۆدیۆی یەکخستنی وێنە و PDF' : 'Open Image & PDF Merger Studio'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>

          {/* Panoramic Analytics Banner (Desktop >= 768px) */}
          {canViewFinances && canAccessAnalytics ? (
            <div
              role="button"
              tabIndex={0}
              onClick={handleOpenAnalytics}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenAnalytics()}
              className="hidden md:flex flex-row items-center justify-between w-full min-h-[160px] md:min-h-[160px] md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-violet-500/10 md:hover:border-violet-500 md:dark:border-violet-500/10 md:dark:hover:border-violet-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] md:rounded-[2rem] p-8 md:py-10 my-8 group relative overflow-hidden text-start cursor-pointer active:scale-[0.99] select-none transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01]"
            >
              {/* Bespoke Icon Watermark (Analytics) */}
              <ChartColumnBig className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-violet-500 dark:text-violet-400" />

              <div className="flex items-center gap-5 min-w-0 relative z-20">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                  <ChartColumnBig className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {isKu ? 'چارتەکان و شیكاری دارایی' : 'Charts & Analytics'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {isKu
                      ? 'بینینی قازانج، ئاماری فرۆشتن و بڕین، چارتەکانی کۆگا و نەخشەی دارایی کارگە.'
                      : 'Real-time profit margins, revenue curves, cutting workshop yields, and financial forecasts.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 ms-6 relative z-20">
                <button
                  type="button"
                  onClick={handleOpenAnalytics}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/20 flex items-center gap-2 hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer active:scale-98"
                >
                  <span>{isKu ? 'کردنەوەی ستۆدیۆی شیكاری' : 'Open Analytics Studio'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleOpenAnalytics}
              className="hidden md:flex flex-row items-center justify-center w-full md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-violet-500/10 md:hover:border-violet-500 md:dark:border-violet-500/10 md:dark:hover:border-violet-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] md:rounded-[2rem] md:min-h-[240px] p-8 my-8 group relative overflow-hidden text-start transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] cursor-pointer"
            >
              {/* Bespoke Icon Watermark (Analytics) */}
              <ChartColumnBig className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-violet-500 dark:text-violet-400" />
              <EnterpriseModuleLocked colorClass="text-violet-500" bgClass="bg-violet-500/10" isKu={isKu} />
            </div>
          )}

          {/* Quick Analytics Trigger (Mobile-Only Action Tool) */}
          {canViewFinances && canAccessAnalytics && (
            <button
              type="button"
              onClick={handleOpenAnalytics}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border border-white/50 dark:border-slate-700 shadow-sm rounded-3xl p-5 md:hidden transition-transform active:scale-[0.98] cursor-pointer select-none text-start flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <ChartColumnBig className="w-5 h-5" />
                </div>
                <div className="text-start min-w-0">
                  <div className="text-sm sm:text-base font-black truncate leading-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {isKu ? 'چارتەکان و شیكاری دارایی' : 'Charts & Analytics'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {isKu ? 'بینینی قازانج، ئاماری فرۆشتن و بڕین' : 'Profit metrics, sales curves & workshop charts'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 rtl:rotate-180 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Activity Feed strictly at bottom of main content area for ALL users */}
          <div className="w-full mb-4">
            {renderQuickActivity()}
          </div>

          {/* Admin Controls (Strictly Admin Only) */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSelectDivision('audit')}
                className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-500" />
                <span>{isKu ? 'باکئەپ و داتابەیس' : 'SQLite Vault'}</span>
              </button>
              <button
                type="button"
                onClick={() => openAdminModal()}
                className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-sky-500" />
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
          <div className="text-center max-w-3xl mx-auto mb-5 md:mb-5">
            {/* Master Title with Fancy Shimmering "Master" Typography */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 select-none">
              Bako&apos;s <span className="text-master-shimmer">Master</span> System
            </h1>

            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mt-3 font-medium max-w-2xl mx-auto leading-relaxed">
              {isKu
                ? 'ناوەندی فەرماندەیی دارایی و لۆجستی کۆمپانیا. دروستکراوە و سەرپەرشتی دەکرێت لەلایەن باکۆ بەیان تایبەت بۆ کۆمپانیای شاسوار ئەحمەد شاسوار.'
                : 'Enterprise Logistics & Financial Command Center. Engineered & maintained by Bako Bayan Madhhar specifically for Shaswar Ahmad Shaswar Co.'}
            </p>
          </div>

          {/* Supercharged KPI Ticker Strip */}
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-3 text-xs transform-gpu">
            {(canAccessPanels || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-750/80 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:ring-emerald-500/20 cursor-default">
                <Warehouse className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  <NumberScroller value={stats.totalStock} />
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isKu ? 'تەختە' : 'Panels'}</span>
              </div>
            )}

            {(canAccessSales || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-750/80 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-sky-500/60 dark:hover:border-sky-500/60 hover:ring-sky-500/20 cursor-default">
                <ReceiptText className="w-5 h-5 text-sky-500 shrink-0" />
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  <NumberScroller value={totalInvoicesCount} />
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isKu ? 'پسوولەی دابینکەر' : 'Supplier Bills'}</span>
              </div>
            )}

            {(canAccessGoods || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-750/80 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:ring-amber-500/20 cursor-default">
                <Truck className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  <NumberScroller value={totalInvoicesCount} />
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isKu ? 'بارەکان' : 'Shipments'}</span>
              </div>
            )}

            {/* Currency Switcher Widget for non-Master users with financial access */}
            {!isShaswarAuthorized && canShowCurrencyWidget && (
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-750/70 shadow-xl ring-1 ring-white/50 dark:ring-white/10">
                  {(['USD', 'IQD', 'EUR'] as CurrencyCode[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setHubCurrency(cur)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${hubCurrency === cur
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {cur === 'USD' ? '$ USD' : cur === 'IQD' ? 'IQD' : '€ EUR'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRateSettings(!showRateSettings)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-750/70 text-slate-700 dark:text-slate-200 hover:bg-slate-50/70 dark:hover:bg-slate-750/70 transition-all cursor-pointer shadow-xl ring-1 ring-white/50 dark:ring-white/10"
                  title={isKu ? 'نرخی ئاڵوگۆڕ' : 'Exchange Rates'}
                >
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">{isKu ? 'نرخی دراو' : 'Exchange Rates'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 1. SHASWAR VIEW (Strict RBAC Security & Frosted Glass Depth)             */}
          {/* ========================================================================= */}
          {isShaswarAuthorized && (
            <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-750/80 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-rose-500/50 dark:hover:border-rose-400/50 hover:ring-rose-500/20 rounded-3xl p-6 sm:p-7 mb-8 relative overflow-hidden group">
              {/* Bespoke Icon Watermark (Shaswar View) */}
              <Eye className="hidden md:block absolute -right-8 -top-8 w-72 h-72 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-rose-500" />

              {/* Shaswar View Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 border border-rose-400/40">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono">
                        {isKu ? 'دیمەنی شاسوار' : 'SHASWAR VIEW'}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                        {isKu ? 'تایبەت بە شاسوار ئەحمەد' : 'Exclusively for Shaswar Ahmad'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Currency Switcher Integration (RBAC Guarded: canFinancial / userPermissions.canViewSales) */}
                {canShowCurrencyWidget && (
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Currency Pill Switcher */}
                    <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                      {(['USD', 'IQD', 'EUR'] as CurrencyCode[]).map((cur) => (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setHubCurrency(cur)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${hubCurrency === cur
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          {cur === 'USD' ? '$ USD' : cur === 'IQD' ? 'IQD' : '€ EUR'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRateSettings(!showRateSettings)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-2xs"
                      title={isKu ? 'نرخی ئاڵوگۆڕ' : 'Exchange Rates'}
                    >
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="hidden sm:inline font-bold">{isKu ? 'نرخی دراو' : 'Exchange Rates'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* OPERATIONAL EXCHANGE RATES SETTINGS CARD (Expandable - Memoized) */}
              {showRateSettings && (
                <ExchangeRateSettingsPopover
                  exchangeRates={exchangeRates}
                  setExchangeRates={setExchangeRates}
                  copyMarketReferenceToOperational={copyMarketReferenceToOperational}
                  onClose={() => setShowRateSettings(false)}
                  isKu={isKu}
                />
              )}

              {/* 4 Sovereign Standalone Executive Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transform-gpu relative z-20">
                {/* 1. Customer Receivables */}
                <div className="p-4 flex flex-col justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'قەرزی لای کڕیار' : 'Customer Receivables'}</span>
                      <TrendingUp className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                      {renderScrollerCurrency(shaswarMasterSnapshot.customerReceivables)}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-2 truncate">
                    {isKu ? 'کۆی قەرزی کڕیاران' : 'Active Client Balances'}
                  </div>
                </div>

                {/* 2. Total Outstanding Payables */}
                <div className="p-4 flex flex-col justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'قەرزی سەر کۆمپانیا' : 'Total Outstanding Payables'}</span>
                      <Coins className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                      {renderScrollerCurrency(shaswarMasterSnapshot.payablesUSD)}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-2 truncate">
                    {isKu ? 'قەرزی ماوەی دابینکەران' : 'FunderMax & Supplier Debt'}
                  </div>
                </div>

                {/* 3. Active Customs Shipments */}
                <div className="p-4 flex flex-col justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'باری پشکنینی گومرگ' : 'Active Customs Shipments'}</span>
                      <Truck className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
                      <NumberScroller value={shaswarMasterSnapshot.customsCount} mode="executive" /> <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">{isKu ? 'بار' : 'Loads'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-2 truncate">
                    {shaswarMasterSnapshot.pendingCount} {isKu ? 'لە کارگەی دەرەوە' : 'Factory Pending'}
                  </div>
                </div>

                {/* 4. Completed Orders */}
                <div className="p-4 flex flex-col justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'داواکاری تەواوکراو' : 'Completed Orders'}</span>
                      <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                      <NumberScroller value={shaswarMasterSnapshot.workshopQueue} mode="executive" /> <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">{isKu ? 'تەواوبوو' : 'Orders'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 truncate">
                    {isKu ? 'ئامادەی ڕادەستکردن' : 'Ready for Pickup'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MAIN OPERATIONS MODULES (Desktop Operations >= 768px: 2x2 Command Grid)    */}
        {/* ========================================================================= */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 mt-8 mb-4 transform-gpu">

            {/* ========================================================================= */}
            {/* MODULE 1: Inventory & Orders                                              */}
            {/* ========================================================================= */}
            <div
              onClick={() => handleSelectDivision('panels', 'orders')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-emerald-500/10 md:hover:border-emerald-500 md:dark:border-emerald-500/10 md:dark:hover:border-emerald-500 md:hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] md:rounded-[2rem] p-5 md:p-8 md:min-h-[240px] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Inventory) */}
              <Warehouse className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-emerald-500" />

              {!canAccessPanels ? (
                <EnterpriseModuleLocked colorClass="text-emerald-500" bgClass="bg-emerald-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                {/* Header: Icon + Title + Chevron Link */}
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 ${
                        canAccessPanels
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25'
                          : 'bg-slate-200 dark:bg-slate-750 text-slate-500 dark:text-slate-400 shadow-slate-500/10'
                      }`}
                    >
                      <Warehouse className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {isKu ? 'کۆگا و داواکارییەکان' : 'Inventory & Orders'}
                        </h2>
                      </div>
                      <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                        {isKu ? 'بەڕێوەبردنی تەختە و داواکارییەکان' : 'Panels, Materials & Workshop Orders'}
                      </p>
                    </div>
                  </div>

                  {/* Mobile-Only Chevron */}
                  <div className="flex items-center shrink-0 md:hidden">
                    <ChevronRight className="w-5 h-5 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                  </div>
                </div>

                {/* Desktop Descriptive Paragraph */}
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {isKu
                    ? 'کۆگای تەختە، حجزکردنەکانی وۆرکشۆپ، ئاگاداری کەمی و ڕادەستکردنی کڕیاران.'
                    : 'Live wood panel stocks, workshop reservations, low-stock alerts, and client dispatches.'}
                </p>

                {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                {/* Mobile Data Grid (Compact 2x2) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Primary Metric 1: Total Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {t.totalStockCount || (isKu ? 'کۆی تەختە' : 'Total Stock')}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={stats.totalStock} />
                        </div>
                      </div>

                      {/* Primary Metric 2: Available Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {t.available || (isKu ? 'بەردەست' : 'Available')}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={stats.totalAvailable} />
                        </div>
                      </div>

                      {/* Secondary Metric 1: Reserved Stock */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                          {t.reserved || (isKu ? 'حجزکراو' : 'Reserved')}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={stats.totalAllocated} />
                        </div>
                      </div>

                      {/* Secondary Metric 2: Low Stock Alerts */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                          {isKu ? 'کەمیی کۆگا' : 'Low Stock'}
                        </span>
                        <div className={`text-lg sm:text-xl font-black font-mono truncate ${
                          lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          <NumberScroller value={lowStockCount} />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Total Stock */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={stats.totalStock} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.totalStockCount || (isKu ? 'کۆی تەختە' : 'Total Stock')}
                        </div>
                      </div>

                      {/* 2. Available */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={stats.totalAvailable} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.available || (isKu ? 'بەردەست' : 'Available')}
                        </div>
                      </div>

                      {/* 3. Reserved */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={stats.totalAllocated} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {t.reserved || (isKu ? 'حجزکراو' : 'Reserved')}
                        </div>
                      </div>

                      {/* 4. Low Stock */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className={`text-xl font-bold font-mono truncate ${
                          lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          <NumberScroller value={lowStockCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کەمیی کۆگا' : 'Low Stock'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('panels', 'orders')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی کۆگا و داواکارییەکان' : 'Open Inventory & Orders'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ========================================================================= */}
            {/* MODULE 2: Customer & Suppliers Debts                                       */}
            {/* ========================================================================= */}
            <div
              onClick={() => handleSelectDivision('sales')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-sky-500/10 md:hover:border-sky-500 md:dark:border-sky-500/10 md:dark:hover:border-sky-500 md:hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)] md:rounded-[2rem] p-5 md:p-8 md:min-h-[240px] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Debts) */}
              <ReceiptText className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-sky-500" />

              {!canAccessSales ? (
                <EnterpriseModuleLocked colorClass="text-sky-500" bgClass="bg-sky-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                    {/* Header: Icon + Title + Chevron Link */}
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-500/25"
                        >
                          <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              {isKu ? 'قەرزی کڕیاران و دابینکەران' : 'Customer & Suppliers Debts'}
                            </h2>
                          </div>
                          <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                            {isKu ? 'بەڕێوەبردنی پارەدان و هەژمارەکان' : 'Financial Balances & Ledger Records'}
                          </p>
                        </div>
                      </div>

                      {/* Mobile-Only Chevron */}
                      <div className="flex items-center shrink-0 md:hidden">
                        <ChevronRight className="w-5 h-5 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                      </div>
                    </div>

                {/* Desktop Descriptive Paragraph */}
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {isKu
                    ? 'قەرزی کارگەی فاندەرمەکس، باڵانسی کڕیاران و مێژووی شایستە داراییەکان.'
                    : 'Manage FunderMax factory debt, monitor client receivables, and track settlement records.'}
                </p>

                {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                {/* Mobile Data Grid (Compact 2x2) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Primary Metric 1: Customer Receivables */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                          {isKu ? 'قەرزی کڕیار' : 'Receivables'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-sky-600 dark:text-sky-400 truncate">
                          {renderScrollerCurrency(totalCustomerReceivables, hubCurrency, 'instant')}
                        </div>
                      </div>

                      {/* Primary Metric 2: Supplier Debt */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
                          {isKu ? 'قەرزی دابینکەر' : 'Payables'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400 truncate">
                          {renderScrollerCurrency(totalSupplierDebt, hubCurrency, 'instant')}
                        </div>
                      </div>

                      {/* Secondary Metric 1: Total Paid */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {isKu ? 'کۆی دراو' : 'Total Paid'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          {renderScrollerCurrency(totalSupplierPaid, hubCurrency, 'instant')}
                        </div>
                      </div>

                      {/* Secondary Metric 2: Supplier Bills Count */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {isKu ? 'پسوولەکان' : 'Bills'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Receivables */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 truncate">
                          {renderScrollerCurrency(totalCustomerReceivables, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'قەرزی کڕیار' : 'Receivables'}
                        </div>
                      </div>

                      {/* 2. Payables */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
                          {renderScrollerCurrency(totalSupplierDebt, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'قەرزی دابینکەر' : 'Payables'}
                        </div>
                      </div>

                      {/* 3. Total Paid */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          {renderScrollerCurrency(totalSupplierPaid, hubCurrency, 'instant')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کۆی دراو' : 'Total Paid'}
                        </div>
                      </div>

                      {/* 4. Bills */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'پسوولەکان' : 'Bills'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('sales')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی قەرزی کڕیاران و دابینکەران' : 'Open Debts & Invoices'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ========================================================================= */}
            {/* MODULE 3: Shipments & Warehouses                                          */}
            {/* ========================================================================= */}
            <div
              onClick={() => handleSelectDivision('goods', 'shipping')}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-orange-500/10 md:hover:border-orange-500 md:dark:border-orange-500/10 md:dark:hover:border-orange-500 md:hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] md:rounded-[2rem] p-5 md:p-8 md:min-h-[240px] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Shipments) */}
              <Truck className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-orange-500" />

              {!canAccessGoods ? (
                <EnterpriseModuleLocked colorClass="text-orange-500" bgClass="bg-orange-500/10" isKu={isKu} />
              ) : (
                <>
                  <div className="relative z-20">
                    {/* Header: Icon + Title + Chevron Link */}
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25"
                        >
                          <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {isKu ? 'بارەکان و کۆگاکان' : 'Shipments & Warehouses'}
                            </h2>
                          </div>
                          <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                            {isKu ? 'بەڕێوەبردنی بارەکان و گومرگ' : 'Inbound Cargo & Customs Logistics'}
                          </p>
                        </div>
                      </div>

                      {/* Mobile-Only Chevron */}
                      <div className="flex items-center shrink-0 md:hidden">
                        <ChevronRight className="w-5 h-5 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                      </div>
                    </div>

                {/* Desktop Descriptive Paragraph */}
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {isKu
                    ? 'کۆنتێنەرەکانی هێڵی گواستنەوە، بارەکانی گومرگ و کۆگاکردنی تەختەکان.'
                    : 'Inbound freight consignments, customs clearance loads, and racked panel storage.'}
                </p>

                {/* Responsive Internal Data Grids (Dual-Render: Mobile Compact vs PC 4-Col Grid) */}
                {/* Mobile Data Grid (Compact 2x2) */}
                    <div className="grid grid-cols-2 md:hidden gap-2 mt-3.5">
                      {/* Primary Metric 1: Total Shipments */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                          {isKu ? 'کۆی بارەکان' : 'Shipments'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                      </div>

                      {/* Primary Metric 2: In Customs */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                          {isKu ? 'لە گومرگ' : 'In Customs'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={customsShipmentsCount} />
                        </div>
                      </div>

                      {/* Secondary Metric 1: Units Racked */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                          {isKu ? 'لە کۆگادا' : 'Racked'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={rackedUnitsCount} />
                        </div>
                      </div>

                      {/* Secondary Metric 2: In Pipeline */}
                      <div className="p-2.5 flex flex-col justify-between min-h-[64px] min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
                          {isKu ? 'لە کارگە' : 'In Transit'}
                        </span>
                        <div className="text-lg sm:text-xl font-black font-mono text-sky-600 dark:text-sky-400 truncate">
                          <NumberScroller value={pendingShipmentsCount} />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Block: Directly underneath it, injected exclusively for PC */}
                    <div className="hidden md:grid grid-cols-4 gap-4 mt-4 relative z-20">
                      {/* 1. Shipments */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white truncate">
                          <NumberScroller value={totalInvoicesCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'کۆی بارەکان' : 'Shipments'}
                        </div>
                      </div>

                      {/* 2. In Customs */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 truncate">
                          <NumberScroller value={customsShipmentsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە گومرگ' : 'In Customs'}
                        </div>
                      </div>

                      {/* 3. Racked */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
                          <NumberScroller value={rackedUnitsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە کۆگادا' : 'Racked'}
                        </div>
                      </div>

                      {/* 4. In Transit */}
                      <div className="px-2 py-3 flex flex-col items-center justify-center text-center min-w-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                        <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 truncate">
                          <NumberScroller value={pendingShipmentsCount} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {isKu ? 'لە کارگە' : 'In Transit'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Large Action Button */}
                  <div className="hidden md:flex mt-6 relative z-20">
                    <button
                      type="button"
                      onClick={() => handleSelectDivision('goods', 'shipping')}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20"
                    >
                      <span>{isKu ? 'کردنەوەی بارەکان و کۆگاکان' : 'Open Shipments & Warehouses'}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ========================================================================= */}
            {/* MODULE 4: Image & PDF Merger                                              */}
            {/* ========================================================================= */}
            <div
              onClick={() => openMergerModal()}
              className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:border md:border-blue-600/10 md:hover:border-blue-600 md:dark:border-blue-600/10 md:dark:hover:border-blue-600 md:hover:shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)] md:rounded-[2rem] p-5 md:p-8 md:min-h-[240px] transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] active:scale-[0.98] cursor-pointer select-none group relative overflow-hidden text-start flex flex-col justify-between md:justify-between"
            >
              {/* Bespoke Icon Watermark (Image Merger) */}
              <Paintbrush className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-indigo-500" />

              <div className="relative z-20">
                {/* Header: Icon + Title + Chevron Link */}
                <div className="flex items-center justify-between gap-3 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/25">
                      <Paintbrush className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {isKu ? 'یەکخستنی وێنە و پسوولەکان (PDF)' : 'Image & PDF Merger'}
                        </h2>
                      </div>
                      <p className="text-[10px] md:hidden text-slate-400 dark:text-slate-500 font-medium truncate">
                        {isKu ? 'کۆکردنەوەی چەند وێنە یان PDF لە یەک پەڕەدا' : 'Combine multiple slips, photos & PDFs into one sheet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 md:hidden">
                    <ChevronRight className="w-5 h-5 md:hidden text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                  </div>
                </div>

                {/* Desktop Descriptive Paragraph */}
                <p className="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {isKu
                    ? 'کۆکردنەوەی وێنەی پسوولە و دۆکیومێنتەکان، دروستکردنی پەڕەی چاپکراوی ستاندارد و هەناردەکردنی PDF.'
                    : 'Combine multiple slips, invoices, and material receipts into unified, high-resolution printable PDF sheets.'}
                </p>
              </div>

              {/* Desktop Large Action Button */}
              <div className="hidden md:flex mt-6">
                <button
                  type="button"
                  onClick={() => openMergerModal()}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 hover:opacity-90 hover:-translate-y-0.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                >
                  <span>{isKu ? 'کردنەوەی ستۆدیۆی یەکخستنی وێنە و PDF' : 'Open Image & PDF Merger Studio'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>

            {/* Panoramic Analytics Banner (Desktop >= 768px) */}
            {canViewFinances && canAccessAnalytics ? (
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenAnalytics}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenAnalytics()}
                className="hidden md:flex flex-col w-full min-h-[120px] md:min-h-[120px] md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-violet-500/10 md:hover:border-violet-500 md:dark:border-violet-500/10 md:dark:hover:border-violet-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] md:rounded-[2rem] p-6 md:py-6 my-6 group relative overflow-hidden text-start col-span-1 md:col-span-2 cursor-pointer active:scale-[0.99] select-none transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01]"
              >
                {/* Bespoke Icon Watermark (Analytics) */}
                <ChartColumnBig className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-violet-500 dark:text-violet-400" />

                {/* Main Container */}
                <div className="flex flex-col gap-4 relative z-20 w-full h-full">
                  {/* Top Row (Header & Button) */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                        <ChartColumnBig className="w-7 h-7" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {isKu ? 'چارتەکان و شیكاری دارایی' : 'Charts & Analytics'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                          {isKu
                            ? 'بینینی قازانج، ئاماری فرۆشتن و بڕین، چارتەکانی کۆگا و نەخشەی دارایی کارگە.'
                            : 'Real-time profit margins, revenue curves, cutting workshop yields, and financial forecasts.'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ms-0 md:ms-6">
                      <button
                        type="button"
                        onClick={handleOpenAnalytics}
                        className="px-6 py-3.5 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/20 flex items-center gap-2 hover:opacity-90 hover:-translate-y-0.5 transition-all cursor-pointer active:scale-98"
                      >
                        <span>{isKu ? 'کردنەوەی ستۆدیۆی شیكاری' : 'Open Analytics Studio'}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Data Boxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <div className="flex flex-col items-center justify-center p-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                      <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">$142.5K</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                        {isKu ? 'داهاتی مانگانە' : 'Monthly Revenue'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">32.4%</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                        {isKu ? 'ڕێژەی قازانج' : 'Profit Margin'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                      <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">94.2%</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                        {isKu ? 'تێکڕای بەرهەمی وەرشە' : 'Avg. Workshop Yield'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">12</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                        {isKu ? 'گرێبەستی چالاک' : 'Active Contracts'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={handleOpenAnalytics}
                className="hidden md:flex flex-row items-center justify-center w-full md:bg-white/70 md:dark:bg-slate-900/70 backdrop-blur-xl md:border md:border-violet-500/10 md:hover:border-violet-500 md:dark:border-violet-500/10 md:dark:hover:border-violet-500 md:shadow-xl md:shadow-slate-200/40 md:dark:shadow-none md:hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] md:rounded-[2rem] md:min-h-[240px] p-8 my-8 group relative overflow-hidden text-start col-span-1 md:col-span-2 transition-all duration-300 md:hover:-translate-y-1 md:hover:scale-[1.01] cursor-pointer"
              >
                {/* Bespoke Icon Watermark (Analytics) */}
                <ChartColumnBig className="hidden md:block absolute -right-8 -top-8 w-64 h-64 opacity-10 -rotate-12 pointer-events-none z-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 group-hover:opacity-20 text-violet-500 dark:text-violet-400" />
                <EnterpriseModuleLocked colorClass="text-violet-500" bgClass="bg-violet-500/10" isKu={isKu} />
              </div>
            )}

            {/* Activity Feed for ALL users strictly below operational modules */}
            <div className="col-span-1 md:col-span-2 mt-4 mb-4">
              {renderQuickActivity()}
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
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-start">
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

      {/* EXECUTIVE SUMMARY BOSS MODAL (Read-Only Walled Garden) */}
      {isBossModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden cursor-pointer"
          role="dialog"
          aria-modal="true"
          onPointerDown={(e) => e.target === e.currentTarget && setIsBossModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-rose-200/80 dark:border-rose-900/60 shadow-2xl overflow-hidden backdrop-blur-2xl text-slate-900 dark:text-white cursor-default animate-in zoom-in-95 duration-200"
            dir={isKu ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Locked Header with red heartbeat */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0 border border-rose-400/40">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight uppercase font-mono">
                      {isKu ? 'دیمەنی شاسوار • کورتەی فەرمی' : 'SHASWAR VIEW'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      {isKu ? 'تایبەت' : 'Executive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isKu ? 'کورتەی فەرمیی دارایی و چالاکییەکان' : 'Consolidated Executive Overview (Read-Only)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBossModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 touch-pan-y">
              {/* 4 High-level Consolidated Metric Blocks */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Total Receivables */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 uppercase mb-2">
                    <span>{isKu ? 'قەرزی لای کڕیار' : 'Receivables'}</span>
                    <TrendingUp className="w-4 h-4 text-sky-500 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-sky-700 dark:text-sky-300 truncate tracking-tight sm:tracking-normal min-w-0">
                    <span dir="ltr" className="inline-block">
                      {renderScrollerCurrency(shaswarMasterSnapshot.customerReceivables)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                    {isKu ? 'کۆی قەرزی وەرگیراو' : 'Total Money Owed To Us'}
                  </span>
                </div>

                {/* 2. Total Payables */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-300 uppercase mb-2">
                    <span>{isKu ? 'قەرزی سەر کۆمپانیا' : 'Payables'}</span>
                    <Coins className="w-4 h-4 text-rose-500 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-300 truncate tracking-tight sm:tracking-normal min-w-0">
                    <span dir="ltr" className="inline-block">
                      {renderScrollerCurrency(shaswarMasterSnapshot.payablesUSD)}
                    </span>
                  </div>
                  {supplierDebtData.debtEUR > 0 ? (
                    <span className="text-[10px] font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 truncate">
                      <span dir="ltr" className="inline-block">+ €{supplierDebtData.debtEUR.toLocaleString()}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                      {isKu ? 'قەرزی دابینکەران' : 'Vendor Obligations'}
                    </span>
                  )}
                </div>

                {/* 3. Completed Orders (Green) */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-2">
                    <span>{isKu ? 'داواکاری تەواوکراو' : 'Completed Orders'}</span>
                    <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300 flex items-baseline gap-1.5 truncate min-w-0">
                    <span dir="ltr" className="inline-block">
                      <NumberScroller value={shaswarMasterSnapshot.workshopQueue} mode="executive" />
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-sans">{isKu ? 'تەواوبوو' : 'Completed'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 truncate">
                    {isKu ? 'ئامادەی ڕادەستکردن' : 'Ready for Pickup'}
                  </span>
                </div>

                {/* 4. Inbound Cargo (Orange) */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 uppercase mb-2">
                    <span>{isKu ? 'باری گومرگ' : 'Inbound Cargo'}</span>
                    <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 dark:text-amber-300 flex items-baseline gap-1.5 truncate min-w-0">
                    <span dir="ltr" className="inline-block">
                      <NumberScroller value={shaswarMasterSnapshot.customsCount} mode="executive" />
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-sans">{isKu ? 'بار' : 'Loads'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                    {shaswarMasterSnapshot.pendingCount} {isKu ? 'لە کارگەی دەرەوە' : 'Factory Pending'}
                  </span>
                </div>
              </div>

              {/* Expanded Executive Data Rows (Read-Only) */}
              <div className="space-y-2 pt-0.5">
                {/* Row 1: Paid to Date & Settled Bills */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isKu ? 'کۆی گشتی دراو بە دابینکەر' : 'Total Supplier Paid to Date'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {totalInvoicesCount} {isKu ? 'پسوولەی ژمێریاری پاکتاوکراو' : 'Settled Accounting Bills'}
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0 font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                    <span dir="ltr" className="inline-block">${totalSupplierPaid.toLocaleString()}</span>
                  </div>
                </div>

                {/* Row 2: Factory Shipments & Cargo Pipeline */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isKu ? 'کۆی گشتی بارەکانی کارگە و گومرگ' : 'Total Factory Shipments'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {shaswarMasterSnapshot.pendingCount} {isKu ? 'لە کارگەی دەرەوە لە ئامادەکاریدایە' : 'Inbound from Factory / Customs'}
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0 font-mono font-black text-sm sm:text-base text-indigo-600 dark:text-indigo-400">
                    <span dir="ltr" className="inline-block">{activeInboundShipments.length}</span> {isKu ? 'بار' : 'Loads'}
                  </div>
                </div>

                {/* Row 3: Active Warehouse Catalog & Ready Orders */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isKu ? 'ماتریال و تەختەی کۆگا' : 'Active Catalog & Ready Orders'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {shaswarMasterSnapshot.readyForPickup} {isKu ? 'داواکاری ئامادەی ڕادەستکردن' : 'Orders Finished & Ready for Pickup'}
                      </div>
                    </div>
                  </div>
                  <div className="text-end shrink-0 font-mono font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                    <span dir="ltr" className="inline-block">{materials.length}</span> {isKu ? 'جۆر' : 'Types'}
                  </div>
                </div>
              </div>

              {/* Currency Switcher Integration */}
              {canShowCurrencyWidget && (
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isKu ? 'دراوی پیشاندراو:' : 'Active Display Currency:'}
                  </span>
                  <div className="flex items-center gap-1">
                    {(['USD', 'IQD', 'EUR'] as CurrencyCode[]).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setHubCurrency(cur)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          hubCurrency === cur
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Locked Footer with Close Button */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setIsBossModalOpen(false)}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm transition-all shadow-md active:scale-98 cursor-pointer"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
ModuleHub.displayName = 'ModuleHub';

export default ModuleHub;
