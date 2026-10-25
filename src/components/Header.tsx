"use client";

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect, useCallback } from "react";
import { useInventory } from "../context/InventoryContext";
import {
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Globe,
  Printer,
  Wifi,
  Shield,
  Undo2,
  Redo2,
  Home,
  ChevronRight,
  Layers,
  ReceiptText,
  Package,
  Truck,
  ShieldCheck,
  Coins,
  RefreshCw,
  SlidersHorizontal,
  BarChart3
} from "lucide-react";
import { AccountModal } from "./AccountModal";
import { AdminPanelModal } from "./AdminPanelModal";
import { DropdownManagerModal } from "./DropdownManagerModal";
import { BakoLogo } from "./BakoLogo";
import { PlatformModule } from "../types/inventory";

interface HeaderProps {
  onOpenNewOrder?: () => void;
  onPrint?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewOrder, onPrint }) => {
  const {
    language,
    theme,
    deviceMode,
    isMobileDetected,
    setLanguage,
    toggleTheme,
    setDeviceMode,
    t,
    currentModule,
    setCurrentModule,
    activeSection,
    setActiveSection,
    currentUser,
    isAdmin,
    isViewer,
    isImpersonating,
    stopImpersonation,
    canUndo,
    canRedo,
    undo,
    redo,
    syncStatus,
    isOnline,
    walHealth,
    pingHealthCheck,
    exchangeRates,
    openVisualCharts,
    userPermissions,
    isAdminModalOpen,
    openAdminModal,
    closeAdminModal,
  } = useInventory();

  const [mounted, setMounted] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDropdownModalOpen, setIsDropdownModalOpen] = useState(false);
  const [headerToast, setHeaderToast] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setHeaderToast(msg);
    setTimeout(() => {
      setHeaderToast((curr) => (curr === msg ? null : curr));
    }, 2200);
  };

  const handleLogoClick = () => {
    setCurrentModule("hub");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    showToast(`${APP_CONFIG.name} • ${APP_CONFIG.version}`);
  };

  const handleSetLang = (lang: "en" | "ku") => {
    setLanguage(lang);
    showToast(lang === "ku" ? "Language set to Kurdish (Header stays in English)" : "Language set to English");
  };

  const openAdminPanel = useCallback(() => {
    openAdminModal();
  }, [openAdminModal]);

  const openCharts = useCallback(() => {
    openVisualCharts();
  }, [openVisualCharts]);

  const handleToggleTheme = () => {
    // Suspend CSS transitions for a single frame so every surface flips theme at once (no flicker).
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.add("no-theme-transition");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => root.classList.remove("no-theme-transition"));
      });
    }
    toggleTheme();
    showToast(theme === "light" ? "Night Mode Activated" : "Day Mode Activated");
  };

  const handleUndo = () => {
    if (!canUndo) {
      showToast("Nothing to undo");
      return;
    }
    undo();
    showToast("Action Undone");
  };

  const handleRedo = () => {
    if (!canRedo) {
      showToast("Nothing to redo");
      return;
    }
    redo();
    showToast("Action Redone");
  };

  const handleSyncPing = async () => {
    if (typeof window !== "undefined") {
      try {
        const bc = new BroadcastChannel("bako_sync");
        bc.postMessage({ type: "SYNC_UPDATE" });
        bc.close();
      } catch {}
    }
    setIsPinging(true);
    showToast("Verifying SQLite WAL & network connection...");
    try {
      const res = await pingHealthCheck();
      if (res.success) {
        showToast(`Live Synced • SQLite WAL Verified (${res.latencyMs}ms • ${walHealth?.dbSize || "6.2 MB"})`);
      } else {
        showToast(`Offline Mode • Local Cache Active (${res.message})`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  const getModuleTitle = (mod: PlatformModule) => {
    switch (mod) {
      case "panels":
        return "Wood Panels & Cutting";
      case "orders":
        return "Order Allocations & Dispatch";
      case "sales":
        return "Sales POS & Invoices";
      case "goods":
        return "Warehouse Goods & Hardware";
      case "shipping":
        return "Shipping & Logistics";
      case "audit":
        return "Database & Audit Trail";
      default:
        return "Main Operations Hub";
    }
  };

  return (
    <>
      <header dir="ltr" className="sticky top-0 z-[80] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs no-print print:hidden w-full max-w-full pointer-events-auto">
        {/* Admin Preview Session Active Banner */}
        {isImpersonating && (
          <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-inner animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs">👁️</span>
              <span>
                <strong>Admin Live Preview Mode:</strong> Viewing system exactly as account <span className="underline decoration-white/40 font-bold">{currentUser?.displayName || currentUser?.username}</span> (<span className="uppercase text-[11px] font-mono tracking-wider">{currentUser?.role}</span>)
              </span>
            </div>
            <button
              type="button"
              onClick={() => stopImpersonation()}
              className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Exit Preview & Return to Admin</span>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}

        {/* Main Header Bar */}
        <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-3 w-full max-w-full box-border overflow-visible">
          {/* Left: 1-Click Main Menu Return & Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLogoClick}
              className="relative z-20 pointer-events-auto group flex items-center gap-3 h-10 px-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer"
              title="Return to Master Main Menu in 1-Click"
            >
              <BakoLogo size={38} className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200" />
              <div className="text-left hidden xs:flex sm:flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    Bako&apos;s Master System
                  </span>
                  {/* Sleek, Integrated Version Badge */}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/25 tracking-tight leading-none">
                    {APP_CONFIG.version}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-1 leading-none hidden sm:block">
                  Panels • Sales POS • Warehouse
                </span>
              </div>
            </button>

            {/* Persistent 1-Click Return to Main Menu Hub */}
            {currentModule !== "hub" && (
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={handleLogoClick}
                  className="relative z-20 pointer-events-auto h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 shadow-2xs inline-flex items-center gap-2 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                  title="Return to Master Main Menu Hub"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Main Menu</span>
                </button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline truncate max-w-[220px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {getModuleTitle(currentModule)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Status Pill, Undo/Redo, Language, Theme, Presets, Admin & Account */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 relative z-30 pointer-events-auto">
            {/* Resilience Status Pill Badge: Live vs Offline */}
            <button
              type="button"
              onClick={handleSyncPing}
              className={`relative z-20 pointer-events-auto h-9 px-3 rounded-xl text-xs font-bold shadow-2xs select-none border inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                isOnline && syncStatus === "synced"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/80"
                  : syncStatus === "syncing" || isPinging
                  ? "bg-sky-50 dark:bg-sky-950/60 border-sky-400/80 text-sky-700 dark:text-sky-400 hover:bg-sky-100/80"
                  : "bg-amber-50 dark:bg-amber-950/60 border-amber-400/80 text-amber-700 dark:text-amber-400 hover:bg-amber-100/80"
              }`}
              title={
                isOnline && syncStatus === "synced"
                  ? `Live Connected: SQLite WAL Active (${walHealth.latencyMs}ms latency • ${walHealth.dbSize} DB). Click to re-verify.`
                  : syncStatus === "syncing" || isPinging
                  ? "Network restored; flushing cached offline mutations to local SQLite server..."
                  : "Offline Mode: Wi-Fi disconnected; local mutations safely queueing to storage. Click to test reconnect."
              }
            >
              <span className="relative flex h-2 w-2">
                {syncStatus === "syncing" || isPinging ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                  </>
                ) : isOnline && syncStatus === "synced" ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                )}
              </span>
              <span className="hidden sm:inline font-mono">
                {syncStatus === "syncing" || isPinging
                  ? "Syncing..."
                  : isOnline && syncStatus === "synced"
                  ? walHealth.isWalActive
                    ? `WAL Synced (${walHealth.latencyMs}ms)`
                    : `Online / Synced (${walHealth.latencyMs}ms)`
                  : "Offline Mode"}
              </span>
              <span className="sm:hidden font-mono">
                {syncStatus === "syncing" || isPinging
                  ? "Syncing"
                  : isOnline && syncStatus === "synced"
                  ? walHealth.isWalActive
                    ? `WAL (${walHealth.latencyMs}ms)`
                    : "Online"
                  : "Offline"}
              </span>
            </button>

            {/* Undo / Redo Buttons */}
            {!isViewer && (
              <div className="hidden sm:inline-flex items-center h-9 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1 shadow-2xs relative z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                  title={canUndo ? "Undo (Ctrl+Z)" : "Nothing to undo"}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
                  title={canRedo ? "Redo (Ctrl+Y)" : "Nothing to redo"}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* High-Affordance Dual-State Language Switcher */}
            <div
              className="relative z-20 pointer-events-auto h-9 p-0.5 inline-flex items-stretch rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs select-none"
              role="group"
              aria-label="Language selection"
            >
              <button
                type="button"
                aria-pressed={language === "en"}
                onClick={() => handleSetLang("en")}
                className={`min-w-[40px] px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                  language === "en"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black ring-1 ring-slate-300/80 dark:ring-slate-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                }`}
                title="Switch interface to English"
              >
                EN
              </button>
              <button
                type="button"
                aria-pressed={language === "ku"}
                onClick={() => handleSetLang("ku")}
                className={`min-w-[50px] px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                  language === "ku"
                    ? "bg-emerald-600 text-white shadow-xs font-black ring-1 ring-emerald-500"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                }`}
                title="Switch interface to Kurdish"
              >
                کوردی
              </button>
            </div>

            {/* Theme Toggle: Day vs Night */}
            <button
              type="button"
              id="header-theme-toggle"
              aria-label="Toggle dark and light theme"
              onClick={handleToggleTheme}
              className="relative z-20 pointer-events-auto h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              title={theme === "light" ? "Switch to Night Mode (Dark)" : "Switch to Day Mode (Light)"}
            >
              {theme === "light" ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Dropdown Options & Presets Manager */}
            {!isViewer && (
              <button
                type="button"
                onClick={() => setIsDropdownModalOpen(true)}
                className="relative z-20 pointer-events-auto h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750 inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 group"
                title="Manage Dropdown Options & Presets"
              >
                <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            )}

            {/* Visual Charts & Analytics Modal Trigger */}
            {(userPermissions?.canViewFinancialAnalytics || userPermissions?.canViewWorkshopAnalytics) ? (
              <button
                type="button"
                onClick={openCharts}
                id="header-charts-button"
                aria-label="Open visual charts and executive analytics"
                className="relative z-20 pointer-events-auto h-9 px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700/40 text-white inline-flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 group"
                title="View Visual Charts & Executive Analytics"
              >
                <BarChart3 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline">
                  Charts
                </span>
              </button>
            ) : null}

            {/* Persistent Admin Panel Trigger */}
            {isAdmin && (
              <button
                type="button"
                onClick={openAdminPanel}
                className="relative z-20 pointer-events-auto h-9 px-3.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs inline-flex items-center gap-2 text-xs font-bold transition-all cursor-pointer group active:scale-95"
                title="Open Admin Control Panel (Wi-Fi QR Code, Database, Backups & Logs)"
              >
                <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                <span className="hidden sm:inline">
                  Admin Panel
                </span>
                <span className="sm:hidden">
                  Admin
                </span>
              </button>
            )}

            {/* Account / Role Badge */}
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="relative z-20 pointer-events-auto h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95 group"
              title="User Account & Security"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="max-w-[120px] sm:max-w-[170px] truncate">
                {currentUser?.displayName || "Bako Bayan Madhhar"}
              </span>
            </button>
          </div>
        </div>

        {/* Instant Action Feedback Toast */}
        {headerToast && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[54px] z-[60] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold shadow-xl border border-slate-700/40 dark:border-slate-300/40 backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{headerToast}</span>
            </div>
          </div>
        )}
      </header>

      {/* MODALS */}

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onOpenAdminPanel={openAdminPanel}
      />

      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={closeAdminModal}
      />

      <DropdownManagerModal
        isOpen={isDropdownModalOpen}
        onClose={() => setIsDropdownModalOpen(false)}
      />
    </>
  );
};

export default Header;
