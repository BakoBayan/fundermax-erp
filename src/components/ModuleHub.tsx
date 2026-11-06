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
  Building2,
  Boxes,
  Combine,
  X
} from 'lucide-react';
import { PlatformModule, OrderAllocation, CurrencyCode, ExchangeRates } from '../types/inventory';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import { getTodayDebtPaymentIntake } from '../utils/debtPayments';
import SupplierPayablesModal from './SupplierPayablesModal';

interface ModuleHubProps {
  onSelectModule?: (module: PlatformModule) => void;
  onOpenNetworkShare?: () => void;
  onOpenBatchPrint?: () => void;
}

// Mirage Scroller: Two-node vertical slot-machine rolling effect (startDigit -> targetDigit)
const DigitScroller: React.FC<{
  targetDigit: number;
  durationMs: number;
  delayMs: number;
}> = React.memo(({ targetDigit, durationMs, delayMs }) => {
  // On mount, pick a random startDigit (0-9)
  const [startDigit] = useState<number>(() => Math.floor(Math.random() * 10));
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLocked(true);
    }, delayMs + 20);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <span className="inline-block relative overflow-hidden h-[1.15em] align-top select-none font-mono">
      <span
        className="flex flex-col transform-gpu"
        style={{
          transform: isLocked ? 'translateY(-50%)' : 'translateY(0%)',
          transition: isLocked
            ? `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : 'none',
        }}
      >
        <span className="h-[1.15em] leading-[1.15em] flex items-center justify-center">
          {startDigit}
        </span>
        <span className="h-[1.15em] leading-[1.15em] flex items-center justify-center">
          {targetDigit}
        </span>
      </span>
    </span>
  );
});
DigitScroller.displayName = 'DigitScroller';

const NumberScroller: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  currencyCode?: string;
  formatAsCurrency?: boolean;
}> = React.memo(({ value, prefix = '', suffix = '', currencyCode, formatAsCurrency = false }) => {
  const num = Math.round(Number(value) || 0);

  // Generate randomized duration per metric between 1500ms and 3000ms
  const randomizedDuration = useMemo(() => {
    return 1500 + Math.floor(Math.random() * 1500); // 1.5s to 3s
  }, []);

  const formattedStr = Math.abs(num).toLocaleString('en-US');
  const chars = formattedStr.split('');

  return (
    <span className="inline-flex items-baseline font-mono select-none">
      {num < 0 && <span>-</span>}
      {prefix && <span>{prefix}</span>}
      {chars.map((char, idx) => {
        const isDigit = char >= '0' && char <= '9';
        if (!isDigit) {
          return (
            <span key={idx} className="inline-block">
              {char}
            </span>
          );
        }
        return (
          <DigitScroller
            key={idx}
            targetDigit={parseInt(char, 10)}
            durationMs={randomizedDuration}
            delayMs={idx * 35}
          />
        );
      })}
      {suffix && <span className="ms-1">{suffix}</span>}
    </span>
  );
});
NumberScroller.displayName = 'NumberScroller';

let hasHydratedModuleHubOnce = false;

// Isolated Heavy Ambient Background Layer (Zero re-renders on Hub state changes)
const AmbientBackgroundLayer: React.FC = React.memo(() => (
  <div className="hidden md:block ambient-layer pointer-events-none select-none z-0 transform-gpu will-change-transform" aria-hidden="true">
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

    {/* Animated Geometric Shape 0: Top-Left Floating Cyan/Sky Tech Orb */}
    <div className="absolute top-[8%] left-[7%] pointer-events-none">
      <div className="animate-drift-poly-4 pointer-events-none">
        <div className="w-14 h-14 rounded-2xl border-2 border-sky-400/55 dark:border-sky-300/45 bg-gradient-to-br from-sky-400/30 via-cyan-400/15 to-transparent shadow-xs rotate-12 flex items-center justify-center">
          <div className="w-5 h-5 rounded-lg border border-sky-300/40 bg-sky-400/20" />
        </div>
      </div>
    </div>

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

    {/* Animated Geometric Shape 7: Left-side Orbital Gyro Ring (Crimson/Rose) */}
    <div className="absolute top-[44%] left-[6%] pointer-events-none">
      <div className="animate-drift-poly-2 pointer-events-none">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-rose-500/60 dark:border-rose-400/50 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500/35 via-red-500/20 to-transparent shadow-xs" />
        </div>
      </div>
    </div>

    {/* Animated Geometric Shape 8: Left-side Micro-Cube Prism (Emerald/Mint) */}
    <div className="absolute top-[82%] left-[14%] pointer-events-none">
      <div className="animate-drift-poly-3 pointer-events-none">
        <div className="w-11 h-11 rotate-45 rounded-xl border-2 border-emerald-500/55 dark:border-emerald-400/45 bg-gradient-to-br from-emerald-400/30 via-teal-500/15 to-transparent shadow-xs" />
      </div>
    </div>

    {/* Light beam sweep */}
    <div className="absolute left-1/2 top-1/2 w-[140%] h-24 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent pointer-events-none animate-light-sweep" />
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
}> = React.memo(({ order, materialName, materialCode, isKu, onClick }) => (
  <div
    onClick={onClick}
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
));
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
    className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs hover:border-amber-400 transition-all cursor-pointer active:scale-98"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-amber-900 dark:text-amber-200 text-xs">
          {code}
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
          {name}
        </span>
      </div>
      <div className="text-[10px] text-amber-700 dark:text-amber-400">
        {type}
      </div>
    </div>
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
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
    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs hover:border-amber-400 transition-all cursor-pointer active:scale-98"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-xs">
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
  const renderScrollerCurrency = useCallback((amountUSD: number, targetCur: CurrencyCode = hubCurrency) => {
    if (targetCur === 'USD') {
      return <NumberScroller value={amountUSD} prefix="$" />;
    }
    const converted = convertCurrency(amountUSD, 'USD', targetCur);
    if (targetCur === 'IQD') {
      return <NumberScroller value={converted} suffix="IQD" />;
    }
    if (targetCur === 'EUR') {
      return <NumberScroller value={converted} prefix="€" />;
    }
    return <NumberScroller value={amountUSD} prefix="$" />;
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
          en: 'Wood Panels & Cutting Manager',
          ku: 'تەختەکان و داواکارییەکان',
          descEn: 'Your account does not have authorization to access the Wood Panels & Workshop Cutting module.',
          descKu: 'ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی تەختەکان و بڕینی پێنەدراوە.'
        },
        sales: {
          en: 'B2B Trade & Payables',
          ku: 'بازرگانی B2B و قەرزی دابینکەران',
          descEn: 'Your account does not have authorization to access the B2B Trade Ledger & Supplier Payables module.',
          descKu: 'دەستپێگەیشتن ڕێگاپێدراو نییە. ئەژمێرەکەت لەلایەن بەڕێوەبەر باکۆ بەیان مۆڵەتی دەستپێگەیشتنی بەشی بازرگانی و قەرزی دابینکەرانی پێنەدراوە.'
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
      return acc + (mat.activeOrders ? mat.activeOrders.filter((o: OrderAllocation) => o.status !== 'finalized').length : 0);
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

  const allActiveOrders = useMemo(() => {
    const list: { order: OrderAllocation; materialName: string; materialCode: string }[] = [];
    materials.forEach((mat) => {
      (mat.activeOrders || []).forEach((o: OrderAllocation) => {
        if (o.status !== 'finalized') {
          list.push({ order: o, materialName: mat.name, materialCode: mat.code });
        }
      });
    });
    return list.slice(0, 50);
  }, [materials]);

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
        if (o.status !== 'finalized') queueLen++;
        if (
          o.notes?.toLowerCase().includes('ready') ||
          o.notes?.toLowerCase().includes('pickup') ||
          o.notes?.includes('ئامادەیە') ||
          o.notes?.includes('وەرگرتن')
        ) {
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
      readyForPickup: pickupCount > 0 ? pickupCount : Math.min(queueLen, 2),
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
    <div className="relative w-full overflow-hidden h-auto bg-white dark:bg-slate-900 transform-gpu">
      {/* ========================================================================= */}
      {/* 100% PURE GPU COMPOSITOR AMBIENT BACKGROUND (Desktop Only - Memoized)     */}
      {/* ========================================================================= */}
      <AmbientBackgroundLayer />

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pt-2 pb-4 px-3 md:py-12 md:px-8 animate-in fade-in duration-300 overflow-x-hidden transform-gpu">

        {/* ========================================================================= */}
        {/* MOBILE-FIRST EXECUTIVE DASHBOARD (< 768px)                                */}
        {/* ========================================================================= */}
        <div className="block md:hidden h-auto space-y-3 pb-2 overflow-x-hidden max-w-full transform-gpu">
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
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase shrink-0 ${currentUser?.role?.toLowerCase() === 'owner'
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
          <div className="grid grid-cols-2 gap-2 transform-gpu">
            {canViewFinances ? (
              <>
                {/* 1. Paid to Suppliers */}
                <button
                  type="button"
                  onClick={handleGlanceTodayCash}
                  className="p-3 rounded-xl bg-white/95 dark:bg-slate-850/95 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
                  title="View Supplier Settlements"
                >
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between w-full">
                    <span>{isKu ? 'پارەی دراو بە دابینکەر' : 'Paid to Suppliers'}</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
                      ${totalSupplierPaid.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 font-mono truncate">
                      {totalInvoicesCount} {isKu ? 'پسوولەی دابینکەر' : 'Supplier Bills'}
                    </div>
                  </div>
                </button>

                {/* 2. Total Supplier Debt (Payables) */}
                <button
                  type="button"
                  onClick={handleGlanceDebts}
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
                  title="View Supplier Debt (Payables)"
                >
                  <div className="text-[10px] font-bold flex items-center justify-between w-full">
                    <span>{isKu ? 'قەرزی دابینکەران' : 'Total Supplier Debt'}</span>
                    <Coins className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300 font-mono truncate">
                      ${totalSupplierDebt.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-medium text-rose-600/80 dark:text-rose-400/80 truncate">
                      {isKu ? 'قەرزی ماوە بۆ دابینکەر' : 'Supplier Payables'}
                    </div>
                  </div>
                </button>

                {/* 3. Our Debt to Suppliers (Payables / قەرزی سەر کۆمپانیا) */}
                <button
                  type="button"
                  onClick={() => setIsSupplierPayablesOpen(true)}
                  className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
                  className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
                  className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
                  className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
                  className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
                  className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-violet-600 dark:text-violet-400 shadow-xs flex flex-col justify-between min-h-[76px] text-start cursor-pointer active:scale-95 transition-all"
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
          <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-850/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 transform-gpu">
            {/* Segmented Tab Controls */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveMobileTab('orders')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${activeMobileTab === 'orders'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {isKu ? `داواکارییەکان (${allActiveOrders.length})` : `Orders (${allActiveOrders.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('alerts')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${activeMobileTab === 'alerts'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {isKu ? `ئاگاداری (${lowStockCount})` : `Alerts (${lowStockCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('cargo')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center truncate cursor-pointer ${activeMobileTab === 'cargo'
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
                <div className="text-start min-w-0">
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

          {/* Quick Standalone Image & Document Merger Studio Trigger (Mobile) */}
          <button
            type="button"
            onClick={() => openMergerModal()}
            className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-xs flex items-center justify-between gap-2.5 cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Combine className="w-4 h-4 text-white" />
              </div>
              <div className="text-start min-w-0">
                <div className="text-xs font-black truncate leading-tight">
                  {isKu ? 'یەکخستنی وێنە و پسوولەکان (PDF)' : 'Multi-Asset Image & PDF Merger'}
                </div>
                <div className="text-[10px] text-white/80 font-medium truncate">
                  {isKu ? 'کۆکردنەوەی چەند وێنە یان PDF لە یەک پەڕەدا' : 'Combine multiple slips, photos & PDFs into one sheet'}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white shrink-0" />
          </button>

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
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2 select-none">
              Bako&apos;s <span className="text-master-shimmer">Master</span> System
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 font-medium max-w-2xl mx-auto leading-relaxed">
              {isKu
                ? 'ناوەندی فەرماندەیی دارایی و لۆجستی کۆمپانیا. دروستکراوە و سەرپەرشتی دەکرێت لەلایەن باکۆ بەیان تایبەت بۆ کۆمپانیای شاسوار ئەحمەد شاسوار.'
                : 'Enterprise Logistics & Financial Command Center. Engineered & maintained by Bako Bayan Madhhar specifically for Shaswar Ahmad Shaswar Co.'}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 1. SHASWAR VIEW (Strict RBAC Security & Frosted Glass Depth)             */}
          {/* ========================================================================= */}
          {isShaswarAuthorized && (
            <div className="backdrop-blur-md bg-white/40 dark:bg-slate-850/40 border border-slate-200/70 dark:border-slate-750/70 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-rose-500/50 dark:hover:border-rose-400/50 hover:ring-rose-500/20 rounded-3xl p-6 sm:p-7 mb-8">
              {/* Shaswar View Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200/70 dark:border-slate-750/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 border border-rose-400/40">
                    <Activity className="w-5 h-5 text-white" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transform-gpu">
                {/* 1. Customer Receivables */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-750/70 shadow-xs flex flex-col justify-between">
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
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-750/70 shadow-xs flex flex-col justify-between">
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
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-750/70 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'باری پشکنینی گومرگ' : 'Active Customs Shipments'}</span>
                      <Truck className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
                      <NumberScroller value={shaswarMasterSnapshot.customsCount} /> <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">{isKu ? 'بار' : 'Loads'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-2 truncate">
                    {shaswarMasterSnapshot.pendingCount} {isKu ? 'لە کارگەی دەرەوە' : 'Factory Pending'}
                  </div>
                </div>

                {/* 4. Live Workshop Orders */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-750/70 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{isKu ? 'سەرەی داواکاری وەرشە' : 'Live Workshop Orders'}</span>
                      <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                      <NumberScroller value={shaswarMasterSnapshot.workshopQueue} /> <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">{isKu ? 'داواکاری' : 'Orders'}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 truncate">
                    {shaswarMasterSnapshot.readyForPickup} {isKu ? 'ئامادەی ڕادەستکردن' : 'Ready for Pickup'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supercharged KPI Ticker Strip */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-xs transform-gpu">
            {(canAccessPanels || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-750/70 text-slate-700 dark:text-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:ring-emerald-500/20 cursor-default">
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  <NumberScroller value={stats.totalStock} />
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isKu ? 'تەختە' : 'Panels'}</span>
              </div>
            )}

            {(canAccessSales || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-750/70 text-slate-700 dark:text-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-sky-500/60 dark:hover:border-sky-500/60 hover:ring-sky-500/20 cursor-default">
                <ReceiptText className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                  <NumberScroller value={totalInvoicesCount} />
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isKu ? 'پسوولەی دابینکەر' : 'Supplier Bills'}</span>
              </div>
            )}

            {(canAccessGoods || userPermissions.canViewRestrictedMetrics) && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-750/70 text-slate-700 dark:text-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu ring-1 ring-white/50 dark:ring-white/10 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:ring-amber-500/20 cursor-default">
                <Package className="w-4 h-4 text-amber-500 shrink-0" />
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

          {/* 4 Clean, Unfused & Beautiful Division Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 transform-gpu">

            {/* ========================================================================= */}
            {/* DIVISION 1: Wood Panels & Workshop Cutting Orders                         */}
            {/* ========================================================================= */}
            <div
              onClick={() => handleSelectDivision('panels', 'orders')}
              className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-md border shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-transform duration-300 ease-out transform-gpu ring-1 cursor-pointer overflow-hidden ${canAccessPanels
                  ? 'bg-white/40 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-750/70 ring-white/50 dark:ring-white/10 hover:border-emerald-500/80 dark:hover:border-emerald-500/80 hover:ring-emerald-500/25'
                  : 'bg-white/30 dark:bg-slate-850/30 border-rose-200/70 dark:border-rose-900/40 ring-rose-500/10 opacity-80 hover:opacity-100'
                }`}
            >
              {/* Ambient Corner Glow */}
              <div className={`absolute top-0 end-0 w-44 h-44 rounded-es-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${canAccessPanels
                  ? 'bg-gradient-to-bl from-emerald-500/15 via-teal-500/5 to-transparent'
                  : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
                }`} />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${canAccessPanels
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
                {/* Glass KPI Cards (Confidentiality & Metric Protection - 4 Metrics) */}
                {canAccessPanels || userPermissions.canViewRestrictedMetrics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center transform-gpu">
                    <div>
                      <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                        <NumberScroller value={stats.totalStock} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{t.totalStockCount || (isKu ? 'کۆی تەختە' : 'Total Stock')}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                        <NumberScroller value={stats.totalAllocated} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{t.reserved || (isKu ? 'حجزکراو' : 'Reserved')}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        <NumberScroller value={stats.totalAvailable} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{t.available || (isKu ? 'بەردەست' : 'Available')}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className={`text-base sm:text-xl font-black font-mono ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        <NumberScroller value={lowStockCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'کەمیی کۆگا' : 'Low Stock Alerts'}</div>
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
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform" />
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
              className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-md border shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-transform duration-300 ease-out transform-gpu ring-1 cursor-pointer overflow-hidden ${canAccessSales
                  ? 'bg-white/40 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-750/70 ring-white/50 dark:ring-white/10 hover:border-sky-500/80 dark:hover:border-sky-500/80 hover:ring-sky-500/25'
                  : 'bg-white/30 dark:bg-slate-850/30 border-rose-200/70 dark:border-rose-900/40 ring-rose-500/10 opacity-80 hover:opacity-100'
                }`}
            >
              {/* Ambient Corner Glow */}
              <div className={`absolute top-0 end-0 w-44 h-44 rounded-es-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${canAccessSales
                  ? 'bg-gradient-to-bl from-sky-500/15 via-blue-500/5 to-transparent'
                  : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
                }`} />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${canAccessSales
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
                  {isKu ? 'بازرگانی B2B و قەرزی دابینکەران' : 'B2B Trade & Payables'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  {isKu
                    ? 'بەڕێوەبردنی پسوولەی دابینکەران، قەرزی کارگەی FunderMax، و دەفتەری بازرگانی فرە دراو (USD, IQD, EUR).'
                    : 'Manage FunderMax factory debt, supplier bills, B2B trade ledger entries, and multi-currency settlements (USD, IQD, EUR).'}
                </p>
              </div>

              <div>
                {/* Glass KPI Cards (Confidentiality & Metric Protection - 4 Metrics) */}
                {canAccessSales || userPermissions.canViewRestrictedMetrics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center transform-gpu">
                    <div>
                      <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                        <NumberScroller value={totalInvoicesCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'پسوولەی دابینکەر' : 'Supplier Bills'}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                        {renderScrollerCurrency(totalSupplierDebt)}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {isKu ? 'قەرزی دابینکەر' : 'Supplier Debt'}
                      </div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
                        {renderScrollerCurrency(totalCustomerReceivables)}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {isKu ? 'قەرزی لای کڕیار' : 'Customer Receivables'}
                      </div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {renderScrollerCurrency(totalSupplierPaid)}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {isKu ? 'کۆی پارەی دراو' : 'Total Paid'}
                      </div>
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
                    <span>{isKu ? 'کردنەوەی دەفتەری بازرگانی' : 'Open Trade Ledger'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform" />
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
              className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-md border shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-transform duration-300 ease-out transform-gpu ring-1 cursor-pointer overflow-hidden ${canAccessGoods
                  ? 'bg-white/40 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-750/70 ring-white/50 dark:ring-white/10 hover:border-amber-500/80 dark:hover:border-amber-500/80 hover:ring-amber-500/25'
                  : 'bg-white/30 dark:bg-slate-850/30 border-rose-200/70 dark:border-rose-900/40 ring-rose-500/10 opacity-80 hover:opacity-100'
                }`}
            >
              {/* Ambient Corner Glow */}
              <div className={`absolute top-0 end-0 w-44 h-44 rounded-es-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${canAccessGoods
                  ? 'bg-gradient-to-bl from-amber-500/15 via-orange-500/5 to-transparent'
                  : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
                }`} />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${canAccessGoods
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
                {/* Glass KPI Cards (Confidentiality & Metric Protection - 4 Metrics) */}
                {canAccessGoods || userPermissions.canViewRestrictedMetrics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center transform-gpu">
                    <div>
                      <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                        <NumberScroller value={totalInvoicesCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'بارەکان' : 'Shipments'}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                        <NumberScroller value={customsShipmentsCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'لە گومرگ' : 'In Customs'}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        <NumberScroller value={rackedUnitsCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'لە کۆگادا' : 'Units Racked'}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-sky-600 dark:text-sky-400 font-mono">
                        <NumberScroller value={pendingShipmentsCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'لە کارگە / ڕێگە' : 'In Pipeline'}</div>
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
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform" />
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
              className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl backdrop-blur-md border shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-transform duration-300 ease-out transform-gpu ring-1 cursor-pointer overflow-hidden ${canAccessAnalytics
                  ? 'bg-white/40 dark:bg-slate-850/40 border-slate-200/70 dark:border-slate-750/70 ring-white/50 dark:ring-white/10 hover:border-purple-500/80 dark:hover:border-purple-500/80 hover:ring-purple-500/25'
                  : 'bg-white/30 dark:bg-slate-850/30 border-rose-200/70 dark:border-rose-900/40 ring-rose-500/10 opacity-80 hover:opacity-100'
                }`}
            >
              {/* Ambient Corner Glow */}
              <div className={`absolute top-0 end-0 w-44 h-44 rounded-es-full pointer-events-none group-hover:scale-125 transition-transform duration-500 ${canAccessAnalytics
                  ? 'bg-gradient-to-bl from-purple-500/15 via-indigo-500/5 to-transparent'
                  : 'bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent'
                }`} />

              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ${canAccessAnalytics
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
                {/* Glass KPI Cards (Confidentiality & Metric Protection - 4 Indicators) */}
                {canAccessAnalytics || userPermissions.canViewRestrictedMetrics ? (
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 mb-5 text-center transform-gpu">
                    <div>
                      <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                        <NumberScroller value={stats.totalStock} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'تەختەی بینراو' : 'Panels Tracked'}</div>
                    </div>
                    <div className="border-s border-slate-200 dark:border-slate-800">
                      <div className="text-base sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                        <NumberScroller value={totalInvoicesCount} />
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">{isKu ? 'پسوولەی تۆمارکراو' : 'Invoices Logged'}</div>
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
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform" />
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
            {/* DIVISION 5: Multi-Asset Image & Document Merger Studio (Standalone)       */}
            {/* ========================================================================= */}
            <div
              onClick={() => openMergerModal()}
              className="md:col-span-2 group relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl backdrop-blur-md bg-white/40 dark:bg-slate-850/40 border border-slate-200/70 dark:border-slate-750/70 ring-1 ring-white/50 dark:ring-white/10 hover:border-indigo-500/80 dark:hover:border-indigo-500/80 hover:ring-indigo-500/25 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-transform duration-300 ease-out transform-gpu cursor-pointer overflow-hidden"
            >
              {/* Ambient Corner Glow */}
              <div className="absolute top-0 end-0 w-56 h-56 rounded-es-full pointer-events-none group-hover:scale-125 transition-transform duration-500 bg-gradient-to-bl from-indigo-500/15 via-cyan-500/5 to-transparent" />

              <div className="flex items-start sm:items-center gap-5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Combine className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {isKu ? 'ستۆدیۆی یەکخستنی وێنە و فایلی PDF' : 'Multi-Asset Image & PDF Merger Studio'}
                    </h2>
                    <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                      {isKu ? 'بەشی پێنجەم • زیرەک' : 'Division 05 • Smart Studio'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                    {isKu
                      ? 'کۆکردنەوەی چەندین وێنەی پسوولە، وەسڵی حەواڵە، و پەڕەکانی PDF لە یەک لاپەڕەی ستانداردی (A4 / Letter) بە کۆنتڕۆڵی تەواوی قەبارە و کوالێتی چاپ.'
                      : 'Combine multiple bank transfer slips, invoices, photos, and multi-page PDF documents onto a single A4/Letter sheet with interactive drag-and-resize and <=150KB smart compression.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>{isKu ? 'کردنەوەی یەکخەری وێنە' : 'Open Merger Studio'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform" />
                </button>
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
    </div>
  );
});
ModuleHub.displayName = 'ModuleHub';

export default ModuleHub;
