'use client';

import { APP_CONFIG } from '@/config/appConfig';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useInventory,
  resolveUserPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_VIEWER_PERMISSIONS,
} from '@/context/InventoryContext';
import {
  CurrencyCode,
  PanelTransaction,
  UserModulePermissions,
  UserRole,
  UserAccount,
} from '@/types/inventory';
import {
  X,
  Usb,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Clock,
  Search,
  HardDrive,
  BarChart3,
  Download,
  FileSpreadsheet,
  Layers,
  ReceiptText,
  Boxes,
  Truck,
  CheckCircle2,
  Server,
  User,
  ShieldCheck,
  FileText,
  Users,
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Eye,
  Sliders,
  Sparkles,
  Zap,
  Info,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import {
  exportAuditLogsCSV,
  exportPanelsCSV,
  exportOrdersCSV,
  exportTransactionsCSV,
  exportProductsCSV,
  exportShipmentsCSV,
} from '@/utils/export';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'ku';
  isDark?: boolean;
  viewMode?: 'auto' | 'desktop' | 'mobile';
  onChangeViewMode?: (mode: 'auto' | 'desktop' | 'mobile') => void;
  activeCurrency?: CurrencyCode;
  formatMoney?: (amount: number, cur?: CurrencyCode) => string;
  onToast?: (msg: string) => void;
}

// Sleek, reusable iOS/macOS-style toggle switch
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  badge?: string;
  highlight?: boolean;
}> = ({ checked, onChange, disabled, label, description, badge, highlight }) => (
  <div
    onClick={() => !disabled && onChange(!checked)}
    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all select-none ${
      disabled
        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
        : checked
        ? highlight
          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 hover:border-amber-500/60 cursor-pointer shadow-xs'
          : 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/40 hover:border-emerald-500/60 cursor-pointer shadow-xs'
        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
    }`}
  >
    <div className="pr-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</span>
        {badge && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              checked
                ? highlight
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>}
    </div>
    <div
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
        checked ? (highlight ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  </div>
);

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  lang: propLang,
  isDark: propDark,
  viewMode: propViewMode,
  onChangeViewMode: propOnChangeViewMode,
  activeCurrency: propCurrency,
  formatMoney: propFormatMoney,
  onToast: propOnToast,
}) => {
  const {
    activityLogs,
    materials,
    transactions,
    products,
    shipments,
    createManualBackup,
    addTransaction,
    language,
    theme,
    deviceMode,
    setDeviceMode,
    formatMoney: ctxFormatMoney,
    isOnline,
    walHealth,
    pingHealthCheck,
    users,
    currentUser,
    simulatedOffline,
    toggleSimulatedOffline,
    updateUserPermissions,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    impersonateUser,
    stopImpersonation,
    isImpersonating,
  } = useInventory();

  const lang = propLang || language;
  const isDark = propDark ?? theme === 'dark';
  const viewMode = propViewMode || (deviceMode as any) || 'auto';
  const onChangeViewMode = propOnChangeViewMode || ((mode: any) => setDeviceMode(mode));
  const onToast = propOnToast || (() => {});

  // 4 Streamlined Executive Pillars
  const [activeTab, setActiveTab] = useState<'users' | 'database' | 'exports' | 'network'>('users');

  // Selected User State
  const [selectedUsername, setSelectedUsername] = useState<string>(() => users[0]?.username || 'bako');
  const selectedUser = useMemo(
    () => users.find((u) => u.username.toLowerCase() === selectedUsername.toLowerCase()) || users[0] || null,
    [users, selectedUsername]
  );

  const [activeUserPerms, setActiveUserPerms] = useState<UserModulePermissions>(() => {
    return resolveUserPermissions(selectedUser || null);
  });

  useEffect(() => {
    if (selectedUser) {
      setActiveUserPerms(resolveUserPermissions(selectedUser));
    }
  }, [selectedUser]);

  // Account Management Modals / Inputs
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Staff');
  const [newUserPassword, setNewUserPassword] = useState('');

  const [userToChangePassword, setUserToChangePassword] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Database & Backup State
  const [walSnapshots, setWalSnapshots] = useState<
    Array<{
      name: string;
      path: string;
      sizeBytes: number;
      createdAt: string;
      tier?: 'recent' | 'daily' | 'weekly';
      isCompressed?: boolean;
    }>
  >([]);
  const [snapshotCategoryFilter, setSnapshotCategoryFilter] = useState<'all' | 'recent' | 'daily' | 'weekly'>('all');
  const [usbDrives, setUsbDrives] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isExportingUsb, setIsExportingUsb] = useState(false);
  const [restoreConfirmSnapshot, setRestoreConfirmSnapshot] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

  // Network & Telemetry State
  const [serverInfo, setServerInfo] = useState<{
    ip: string;
    networkUrl: string;
    port: number;
    qrDataUrl: string;
    formattedDataSize?: string;
  } | null>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Audit Logs State
  const [logFilter, setLogFilter] = useState<'all' | 'sale' | 'inventory' | 'settings' | 'system'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  // Fetch Backups & Health
  const fetchBackupsInfo = async () => {
    try {
      const res = await fetch('/api/backup');
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.snapshots)) setWalSnapshots(data.snapshots);
        if (Array.isArray(data.drives)) setUsbDrives(data.drives);
      }
    } catch {}
  };

  // Fetch Server Network Info
  const fetchServerData = async () => {
    setLoadingServerInfo(true);
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      setServerInfo(data);
    } catch {} finally {
      setLoadingServerInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackupsInfo();
      fetchServerData();
    }
  }, [isOpen]);

  // Handle 1-Click Database Optimization
  const handleOptimizeDatabase = async () => {
    setIsOptimizing(true);
    setOptimizationResult(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize' }),
      });
      const data = await res.json();
      if (data && data.success) {
        const savedKb = Math.round((data.savedBytes || 0) / 1024);
        const msg =
          lang === 'en'
            ? `SQLite optimized! WAL truncated and ${savedKb} KB defragmented.`
            : `داتابەیس بە سەرکەوتوویی خاوێنکرایەوە و خێرایی زیادی کرد! (${savedKb} KB)`;
        setOptimizationResult(msg);
        onToast(msg);
        fetchBackupsInfo();
      } else {
        onToast(data?.error || 'Database optimization failed');
      }
    } catch (err: any) {
      onToast(err?.message || 'Optimization error');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle 1-Click Snapshot
  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_snapshot' }),
      });
      const data = await res.json();
      if (data && data.success) {
        onToast(lang === 'en' ? 'Snapshot saved cleanly to database vault!' : 'باکئەپی وێنەی داتابەیس پاشەکەوتکرا!');
        fetchBackupsInfo();
      } else {
        onToast('Failed to create snapshot');
      }
    } catch {
      onToast('Error creating snapshot');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Handle Physical USB Export + Direct .sqlite.gz Bundle Download
  const handleExportUsb = async (targetDir?: string) => {
    setIsExportingUsb(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_usb', targetDir }),
      });
      const data = await res.json();

      // Ensure the "Export to USB" button downloads the .sqlite.gz bundle directly in browser
      const snapshotName = data?.snapshot?.name || walSnapshots[0]?.name;
      if (snapshotName) {
        const downloadLink = document.createElement('a');
        downloadLink.href = `/api/backup?download=${encodeURIComponent(snapshotName)}`;
        downloadLink.download = snapshotName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }

      if (data && data.success) {
        onToast(
          lang === 'en'
            ? `Backup bundle (${snapshotName || '.sqlite.gz'}) downloaded directly & exported to USB!`
            : `فایلی باکئەپ (${snapshotName || '.sqlite.gz'}) ڕاستەوخۆ دابەزێنرا و نێردرا بۆ میمۆری USB!`
        );
        fetchBackupsInfo();
      } else {
        onToast(
          lang === 'en'
            ? `Latest backup bundle (${snapshotName || '.sqlite.gz'}) downloaded directly to your device!`
            : `نوێترین فایلی باکئەپ (${snapshotName || '.sqlite.gz'}) ڕاستەوخۆ دابەزێنرا بۆ ئامێرەکەت!`
        );
      }
    } catch (err: any) {
      onToast(err?.message || 'Error exporting backup bundle');
    } finally {
      setIsExportingUsb(false);
    }
  };

  // Handle Snapshot Restore
  const handleRestoreSnapshot = async (snapshotName: string) => {
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', snapshot: snapshotName }),
      });
      const data = await res.json();
      if (data && data.success) {
        onToast(lang === 'en' ? 'Database restored successfully! Reloading...' : 'داتابەیس گەڕێندرایەوە!');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        onToast(data?.error || 'Failed to restore snapshot');
      }
    } catch {
      onToast('Error restoring snapshot');
    } finally {
      setRestoreConfirmSnapshot(null);
    }
  };

  // Categorized Snapshots for Tiered Schedule
  const categorizedSnapshots = useMemo(() => {
    const recent: typeof walSnapshots = [];
    const daily: typeof walSnapshots = [];
    const weekly: typeof walSnapshots = [];

    const now = Date.now();
    for (const snap of walSnapshots) {
      const snapTime = new Date(snap.createdAt).getTime();
      const ageHours = Math.max(0, now - snapTime) / (3600 * 1000);
      const ageDays = ageHours / 24;

      if (snap.tier === 'recent' || ageHours <= 48) {
        recent.push(snap);
      } else if (snap.tier === 'daily' || ageDays <= 30) {
        daily.push(snap);
      } else {
        weekly.push(snap);
      }
    }

    return { recent, daily, weekly };
  }, [walSnapshots]);

  // Quick Preset Helper
  const applyRolePreset = (presetRole: UserRole) => {
    let perms: UserModulePermissions;
    switch (presetRole) {
      case 'Admin':
        perms = { ...DEFAULT_ADMIN_PERMISSIONS };
        break;
      case 'Manager':
        perms = { ...DEFAULT_MANAGER_PERMISSIONS, canViewRestrictedMetrics: false };
        break;
      case 'Staff':
        perms = { ...DEFAULT_STAFF_PERMISSIONS, canViewRestrictedMetrics: false };
        break;
      case 'Viewer':
      default:
        perms = { ...DEFAULT_VIEWER_PERMISSIONS, canViewRestrictedMetrics: false };
        break;
    }
    setActiveUserPerms(perms);
    onToast(
      lang === 'en'
        ? `Applied "${presetRole}" template. Click "Save Permissions" to commit.`
        : `داڕشتەی "${presetRole}" دیاریکرا. کلیک لە پاشەکەوتکردن بکە بۆ جێبەجێکردن.`
    );
  };

  // Handle Live Session Impersonation / Preview
  const handleStartLivePreview = () => {
    if (!selectedUser) return;
    if (impersonateUser) {
      impersonateUser(selectedUser.username);
      onToast(
        lang === 'en'
          ? `Preview mode active: viewing system as ${selectedUser.displayName}`
          : `دۆخی تاقیکردنەوە چالاککرا بۆ بەکارهێنەر ${selectedUser.displayName}`
      );
      onClose();
    }
  };

  // Handle Seed Sample Transactions
  const handleSeedDemoData = () => {
    const samples: Omit<PanelTransaction, 'id' | 'timestamp' | 'lastUpdated'>[] = [
      {
        code: 'INV-DEMO-01',
        panelType: 'Gloss White Acrylic',
        material: 'MDF Core Premium High-Gloss',
        quantity: 24,
        unit: 'pcs',
        sellingType: 'Wholesale (کۆ)',
        sellingAmount: 1800,
        costPrice: 1560,
        currency: 'USD',
        currencyRate: 1500,
        discountDollars: 50,
        discountPercentage: 2.7,
        totalAfterDiscount: 1750,
        amountPaidNow: 1200,
        amountOwed: 550,
        oldUnpaidDebt: 0,
        combinedTotalDebt: 550,
        grossProfit: 190,
        profitMargin: 10.8,
        seller: 'Bako Bayan',
        bank: 'FIB (First Iraqi Bank)',
        paymentType: 'Cash (نەقد)',
        status: 'debt',
        notes: 'Delivery scheduled for showroom interior.',
        images: [],
        items: [],
      },
      {
        code: 'INV-DEMO-02',
        panelType: 'Natural Walnut Veneer',
        material: 'European Standard Oak Finish',
        quantity: 12,
        unit: 'pcs',
        sellingType: 'Retail (مفرد)',
        sellingAmount: 1250000,
        costPrice: 1050000,
        currency: 'IQD',
        currencyRate: 1500,
        discountDollars: 0,
        discountPercentage: 0,
        totalAfterDiscount: 1250000,
        amountPaidNow: 1250000,
        amountOwed: 0,
        oldUnpaidDebt: 0,
        combinedTotalDebt: 0,
        grossProfit: 200000,
        profitMargin: 16.0,
        seller: 'Awat',
        bank: 'Cash Drawer',
        paymentType: 'Cash (نەقد)',
        status: 'completed',
        notes: 'Full payment received in cash upon pickup.',
        images: [],
        items: [],
      },
    ];

    samples.forEach((sample, idx) => {
      const now = Date.now() + idx * 1000;
      addTransaction({
        ...sample,
        id: `tx-demo-${now}`,
        timestamp: new Date(now).toISOString(),
        lastUpdated: new Date(now).toISOString(),
      });
    });

    setShowSeedConfirm(false);
    onToast(lang === 'en' ? 'Appended demo sample records!' : 'تۆماری نموونەیی زیادکران!');
  };

  // Flattened Orders for Export
  const allFlattenedOrders = useMemo(
    () => (materials || []).flatMap((m) => (m.activeOrders || []).map((ord) => ({ order: ord, material: m }))),
    [materials]
  );

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return (activityLogs || []).filter((log) => {
      if (logFilter !== 'all' && log.category !== logFilter) return false;
      if (logSearch.trim()) {
        const query = logSearch.toLowerCase();
        const matchesDesc = (log.description || '').toLowerCase().includes(query);
        const matchesUser = (log.username || '').toLowerCase().includes(query);
        const matchesAction = (log.action || '').toLowerCase().includes(query);
        if (!matchesDesc && !matchesUser && !matchesAction) return false;
      }
      return true;
    });
  }, [activityLogs, logFilter, logSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ========================================================================= */}
        {/* HEADER BAR: Executive Title, Quick Status Chips & Close Button            */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  {lang === 'en' ? "Bako's Master Administration" : 'کۆنتڕۆڵ پانێڵی سەرەکی بەڕێوەبەر'}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'en'
                  ? 'Access controls, privacy policies, automated SQLite backups & system telemetry'
                  : 'دەسەڵاتی بەکارهێنەران، پاراستنی داتاکان و باکئەپی پارێزراوی داتابەیس'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Live Indicators */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SQLite WAL</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{users.length} Users</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVIGATION PILLARS: 4 Clean Executive Stations                             */}
        {/* ========================================================================= */}
        <div className="flex items-center px-4 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'en' ? 'Team & Permissions' : 'تیم و دەسەڵاتەکان'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'database'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{lang === 'en' ? 'Database & Backups' : 'داتابەیس و باکئەپ'}</span>
            {walSnapshots.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {walSnapshots.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'exports'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'en' ? 'Data Exports & Logs' : 'دەرکردنی داتا و ڕاپۆرت'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'network'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>{lang === 'en' ? 'Network & Console' : 'تۆڕ و ئامێرەکان'}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CONTENT BODY: Clean, Structured Scrollable Viewport                       */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ======================================================================= */}
          {/* TAB 1: TEAM & ACCESS CONTROL                                            */}
          {/* ======================================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Top User Carousel / Selector Strip */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                    {lang === 'en' ? 'Select Account:' : 'هەڵبژاردنی بەکارهێنەر:'}
                  </span>
                  {users.map((u) => {
                    const isSelected = selectedUser?.username.toLowerCase() === u.username.toLowerCase();
                    return (
                      <button
                        key={u.username}
                        type="button"
                        onClick={() => setSelectedUsername(u.username)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{u.displayName || u.username}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                            isSelected
                              ? 'bg-emerald-700/60 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'en' ? 'New Account' : 'هەژماری نوێ'}</span>
                </button>
              </div>

              {selectedUser && (
                <div className="space-y-6">
                  {/* Account Executive Card */}
                  <div className="bg-white dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20 shrink-0">
                        {selectedUser.displayName?.[0]?.toUpperCase() || selectedUser.username[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {selectedUser.displayName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400">@{selectedUser.username}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            {selectedUser.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {lang === 'en'
                            ? 'Configure division routes, operational rights, and menu metric confidentiality.'
                            : 'دیاریکردنی بەشەکان، دەسەڵاتەکان و پاراستنی ژمارە داراییەکان بۆ ئەم بەکارهێنەرە.'}
                        </p>
                      </div>
                    </div>

                    {/* 1-Click Sandbox: Preview As This User */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleStartLivePreview}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold text-xs inline-flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs"
                        title="Experience the master system exactly as this user sees it (verify hidden numbers and locked modules)"
                      >
                        <Eye className="w-4 h-4 text-amber-500" />
                        <span>{lang === 'en' ? 'Preview As This User' : 'تاقیکردنەوە بەناوی ئەم بەکارهێنەرە'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserToChangePassword(selectedUser.username);
                          setNewPasswordValue('');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Password' : 'وشەی نهێنی'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Role Template Selector */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-2.5">
                      {lang === 'en' ? '1-Click Role Template Presets:' : 'داڕشتەی خێرای دەسەڵاتەکان:'}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['Admin', 'Manager', 'Staff', 'Viewer'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => applyRolePreset(r)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-200 transition-all cursor-pointer text-left flex items-center justify-between"
                        >
                          <span>{r}</span>
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ⭐ NEW HIGHLIGHTED FEATURE: Confidential Numbers & Financials Privacy Protection */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 dark:border-amber-500/20 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {lang === 'en' ? 'Main Menu Metrics & Financial Numbers Privacy' : 'شاردنەوەی ژمارە داراییەکان لە مێنیوی سەرەکی'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {lang === 'en'
                            ? 'When turned OFF (recommended for staff/viewers), this account cannot view any numbers, revenue stats, or unpaid debts on modules they are restricted from entering. Numbers are shielded with a privacy padlock.'
                            : 'کاتێک ئەمە ناچالاک بێت، بەکارهێنەر ناتوانێت هیچ ژمارەیەک، کۆی قەرز یان ئاماری پارە ببینێت لەو بەشانەی ڕێگەی پێنەدراوە بچێتە ژوورەوە.'}
                        </p>

                        <div className="mt-3.5 max-w-md">
                          <ToggleSwitch
                            highlight
                            label={
                              lang === 'en'
                                ? 'Allow Viewing Confidential Menu Metrics'
                                : 'ڕێگەپێدان بە بینینی ژمارە نهێنییەکان لە مێنیو'
                            }
                            description={
                              activeUserPerms.canViewRestrictedMetrics
                                ? lang === 'en'
                                  ? 'Numbers are visible to this account across all cards.'
                                  : 'ژمارەکان دەبینرێن بۆ ئەم بەکارهێنەرە.'
                                : lang === 'en'
                                ? '🛡️ Protected: Numbers & debts are shielded with a privacy padlock.'
                                : '🛡️ پارێزراوە: ژمارەکان و قەرزەکان بە تەواوی شاردراونەتەوە.'
                            }
                            badge={activeUserPerms.canViewRestrictedMetrics ? 'Visible' : 'Shielded'}
                            checked={!!activeUserPerms.canViewRestrictedMetrics}
                            onChange={(val) =>
                              setActiveUserPerms((prev) => ({ ...prev, canViewRestrictedMetrics: val }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Modular Permissions Grid */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {lang === 'en' ? 'Granular Division Rights & Privileges' : 'دەسەڵاتی بەشەکانی سیستەم'}
                    </h5>

                    {/* Division 1: Wood Panels */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'en' ? 'Division 01: Wood Panels & Cutting' : 'بەشی یەکەم: تەختە و مەواد'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ToggleSwitch
                          label="Access & View Panels"
                          description="Can enter Wood Panels module"
                          checked={activeUserPerms.canViewPanels}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canViewPanels: val, panels: val }))
                          }
                        />
                        <ToggleSwitch
                          label="Create & Add Panels"
                          description="Can add new panel stocks"
                          checked={activeUserPerms.canCreatePanels}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canCreatePanels: val }))}
                        />
                        <ToggleSwitch
                          label="Edit & Modify Stock"
                          description="Can change quantities and names"
                          checked={activeUserPerms.canEditPanels}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canEditPanels: val }))}
                        />
                        <ToggleSwitch
                          label="Delete Panel Records"
                          description="Can permanently delete materials"
                          checked={activeUserPerms.canDeletePanels}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canDeletePanels: val, canDelete: val }))
                          }
                        />
                      </div>
                    </div>

                    {/* Division 2: Sales POS & Invoices */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                        <ReceiptText className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'en' ? 'Division 02: Sales POS & Financial Invoicing' : 'بەشی دووەم: فرۆشتن و وەسڵ'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ToggleSwitch
                          label="Access & View Sales POS"
                          description="Can enter Sales billing module"
                          checked={activeUserPerms.canViewSales}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canViewSales: val, sales: val }))
                          }
                        />
                        <ToggleSwitch
                          label="Create Invoices"
                          description="Can issue sales receipts"
                          checked={activeUserPerms.canCreateSales}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canCreateSales: val }))}
                        />
                        <ToggleSwitch
                          label="Edit Past Invoices"
                          description="Can modify debts and line items"
                          checked={activeUserPerms.canEditSales}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canEditSales: val }))}
                        />
                        <ToggleSwitch
                          label="Delete Invoices"
                          description="Can remove transaction records"
                          checked={activeUserPerms.canDeleteSales}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canDeleteSales: val }))}
                        />
                        <ToggleSwitch
                          label="Override Unit Prices"
                          description="Can enter custom selling prices at POS"
                          checked={activeUserPerms.canOverridePrice}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canOverridePrice: val }))}
                        />
                      </div>
                    </div>

                    {/* Division 3: Warehouse & Logistics */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'en' ? 'Division 03: Warehouse Hardware & Shipping' : 'بەشی سێیەم: کاڵا و گەیاندن'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ToggleSwitch
                          label="Access Warehouse Goods"
                          description="Can view hardware catalog"
                          checked={activeUserPerms.canViewWarehouse}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canViewWarehouse: val, goods: val }))
                          }
                        />
                        <ToggleSwitch
                          label="Manage Stock & SKUs"
                          description="Can adjust inventory quantities"
                          checked={activeUserPerms.canManageStock}
                          onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canManageStock: val }))}
                        />
                        <ToggleSwitch
                          label="Logistics & Shipments"
                          description="Can create and track shipments"
                          checked={activeUserPerms.canManageShipments}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canManageShipments: val, shipping: val }))
                          }
                        />
                      </div>
                    </div>

                    {/* System Privileges */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{lang === 'en' ? 'Administrative Privileges' : 'دەسەڵاتی ئیداری سەرەکی'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ToggleSwitch
                          label="Access Admin Panel"
                          description="Can open and configure this administration panel"
                          checked={activeUserPerms.canAccessAdmin}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canAccessAdmin: val, audit: val }))
                          }
                        />
                        <ToggleSwitch
                          label="Export Data & Backups"
                          description="Can download CSVs and database backups"
                          checked={activeUserPerms.canExportBackups}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canExportBackups: val, canExport: val }))
                          }
                        />
                      </div>
                    </div>

                    {/* Analytics & Business Intelligence Isolation */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span>{lang === 'en' ? 'Executive Analytics & BI Gating' : 'شیکاری دارایی و ڕاپۆرتی بینراو'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <ToggleSwitch
                          label="Financial Analytics & Revenue"
                          description="Exposes profit margins, revenue graphs, debt summaries & customer balances"
                          checked={!!activeUserPerms.canViewFinancialAnalytics}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canViewFinancialAnalytics: val }))
                          }
                        />
                        <ToggleSwitch
                          label="Workshop Operations Analytics"
                          description="Exposes cutting queue efficiency, sheet allocation, board yield & stock distribution"
                          checked={!!activeUserPerms.canViewWorkshopAnalytics}
                          onChange={(val) =>
                            setActiveUserPerms((prev) => ({ ...prev, canViewWorkshopAnalytics: val }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Permissions Bottom Action */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'en'
                        ? `Changes are saved directly to SQLite for @${selectedUser.username}`
                        : `گۆڕانکارییەکان ڕاستەوخۆ دەپارێزرێن بۆ @${selectedUser.username}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateUserPermissions(selectedUser.username, activeUserPerms);
                        onToast(
                          lang === 'en'
                            ? `Permissions updated successfully for @${selectedUser.username}!`
                            : `دەسەڵاتەکان نوێکرانەوە بۆ @${selectedUser.username}!`
                        );
                      }}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'en' ? 'Save Account Permissions' : 'پاشەکەوتکردنی دەسەڵاتەکان'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 2: DATABASE HEALTH & SNAPSHOT BACKUPS                                */}
          {/* ======================================================================= */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* SQLite WAL Engine Status Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white">
                        {lang === 'en' ? 'SQLite Enterprise WAL Engine' : 'داتابەیسی خێرای SQLite بە جۆری WAL'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                        Online
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {lang === 'en'
                        ? 'Write-Ahead Logging enabled with atomic checkpointing and rolling 14-snapshot vault'
                        : 'تۆماری خێرا چالاکە لەگەڵ پاراستنی ئۆتۆماتیکی ١٤ وێنەی پاشەکەوتی داتابەیس'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Database Size</span>
                    <span className="font-bold text-white text-sm">{walHealth?.dbSize || 'Active'}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Vault Snapshots</span>
                    <span className="font-bold text-white text-sm">{walSnapshots.length} Files</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1-Click Database Optimization */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'en' ? '1-Click Optimization' : 'خاوێنکردنەوە و خێراکردن'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'en'
                        ? 'Truncates WAL journal, reclaims freed disk space, and defragments B-tree indexes.'
                        : 'فایلی WAL کورت دەکاتەوە و پەڕە بەتاڵەکان دەسڕێتەوە بۆ بەرزکردنەوەی خێرایی.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isOptimizing}
                    onClick={handleOptimizeDatabase}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Zap className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
                    <span>{isOptimizing ? 'Optimizing...' : lang === 'en' ? 'Optimize & VACUUM' : 'خاوێنکردنەوەی ئێستا'}</span>
                  </button>
                </div>

                {/* 1-Click SQLite Snapshot */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      <span>{lang === 'en' ? 'Instant Snapshot' : 'وێنەی خێرای داتابەیس'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'en'
                        ? 'Generates an atomic, zero-lock SQLite binary snapshot in the local backups vault.'
                        : 'وێنەیەکی تەواوی داتابەیس بە هەموو فرۆشتن و مەوادەکانەوە دروست دەکات.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCreatingSnapshot}
                    onClick={handleCreateSnapshot}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
                    <span>{isCreatingSnapshot ? 'Saving...' : lang === 'en' ? 'Create Snapshot' : 'دروستکردنی وێنەی ئێستا'}</span>
                  </button>
                </div>

                {/* Physical USB Backup Export */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                      <Usb className="w-4 h-4 text-blue-500" />
                      <span>{lang === 'en' ? 'Physical Flash Drive' : 'باکئەپ بۆ میمۆری USB'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {usbDrives.length > 0
                        ? `Detected: ${usbDrives.join(', ')}`
                        : lang === 'en'
                        ? 'Auto-detects USB flash drives (E:\\, F:\\) for 1-click physical offsite vaulting.'
                        : 'دەستنیشانکردنی ئۆتۆماتیکی فلاش میمۆری بۆ بردنە دەرەوەی داتاکان.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isExportingUsb}
                    onClick={() => handleExportUsb(usbDrives[0])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Usb className={`w-4 h-4 ${isExportingUsb ? 'animate-pulse' : ''}`} />
                    <span>{isExportingUsb ? 'Copying...' : lang === 'en' ? 'Export to USB' : 'ناردن بۆ USB'}</span>
                  </button>
                </div>
              </div>

              {/* Optimization Feedback */}
              {optimizationResult && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{optimizationResult}</span>
                </div>
              )}

              {/* Tiered Categorized Snapshot History */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {lang === 'en' ? 'Tiered Backup Vault (Recent • Daily • Monthly)' : 'پاشەکەوتی داتابەیس بەپێی کات (نوێ • ڕۆژانە • مانگانە)'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'en'
                        ? '48h intraday snapshots • 30-day daily snapshots • 90-day archive snapshots'
                        : '٤٨ کاتژمێری نوێ • ٣٠ ڕۆژی ڕۆژانە • ٩٠ ڕۆژی ئەرشیف'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBackupsInfo}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'en' ? 'Refresh List' : 'نوێکردنەوە'}</span>
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSnapshotCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      snapshotCategoryFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    All ({walSnapshots.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotCategoryFilter('recent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      snapshotCategoryFilter === 'recent'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>Recent (48h)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      {categorizedSnapshots.recent.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotCategoryFilter('daily')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      snapshotCategoryFilter === 'daily'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>Daily (30d)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                      {categorizedSnapshots.daily.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnapshotCategoryFilter('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      snapshotCategoryFilter === 'weekly'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>Monthly / Archive (90d)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
                      {categorizedSnapshots.weekly.length}
                    </span>
                  </button>
                </div>

                {walSnapshots.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    {lang === 'en' ? 'No snapshot files found. Click "Create Snapshot" above to generate one.' : 'هیچ وێنەیەک نەدۆزرایەوە.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render Category: Recent */}
                    {(snapshotCategoryFilter === 'all' || snapshotCategoryFilter === 'recent') && categorizedSnapshots.recent.length > 0 && (
                      <div className="space-y-2">
                        {snapshotCategoryFilter === 'all' && (
                          <div className="flex items-center gap-2 pt-1 pb-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {lang === 'en' ? 'Recent Intraday Snapshots (Last 48 Hours)' : 'باکئەپە نوێیەکان (٤٨ کاتژمێری ڕابردوو)'}
                            </span>
                            <span className="text-[10px] text-slate-400">({categorizedSnapshots.recent.length} files)</span>
                          </div>
                        )}
                        {categorizedSnapshots.recent.map((snap) => (
                          <div
                            key={snap.name}
                            className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <HardDrive className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">
                                    {snap.name}
                                  </span>
                                  {snap.name.endsWith('.gz') && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                      GZIP
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    Recent (48h)
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                  {new Date(snap.createdAt).toLocaleString()} • {Math.round(snap.sizeBytes / 1024)} KB {snap.name.endsWith('.gz') ? '(compressed)' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/api/backup?download=${encodeURIComponent(snap.name)}`}
                                download={snap.name}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                title="Download .sqlite.gz snapshot"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'en' ? 'Download' : 'دابەزاندن'}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setRestoreConfirmSnapshot(snap.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{lang === 'en' ? 'Restore' : 'گەڕاندنەوە'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render Category: Daily */}
                    {(snapshotCategoryFilter === 'all' || snapshotCategoryFilter === 'daily') && categorizedSnapshots.daily.length > 0 && (
                      <div className="space-y-2">
                        {snapshotCategoryFilter === 'all' && (
                          <div className="flex items-center gap-2 pt-1 pb-0.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {lang === 'en' ? 'Daily Retention Vault (Past 30 Days)' : 'پاشەکەوتی ڕۆژانە (٣٠ ڕۆژی ڕابردوو)'}
                            </span>
                            <span className="text-[10px] text-slate-400">({categorizedSnapshots.daily.length} files)</span>
                          </div>
                        )}
                        {categorizedSnapshots.daily.map((snap) => (
                          <div
                            key={snap.name}
                            className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <HardDrive className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">
                                    {snap.name}
                                  </span>
                                  {snap.name.endsWith('.gz') && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                      GZIP
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                    Daily Vault
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                  {new Date(snap.createdAt).toLocaleString()} • {Math.round(snap.sizeBytes / 1024)} KB {snap.name.endsWith('.gz') ? '(compressed)' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/api/backup?download=${encodeURIComponent(snap.name)}`}
                                download={snap.name}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                title="Download .sqlite.gz snapshot"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'en' ? 'Download' : 'دابەزاندن'}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setRestoreConfirmSnapshot(snap.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{lang === 'en' ? 'Restore' : 'گەڕاندنەوە'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render Category: Weekly Archive */}
                    {(snapshotCategoryFilter === 'all' || snapshotCategoryFilter === 'weekly') && categorizedSnapshots.weekly.length > 0 && (
                      <div className="space-y-2">
                        {snapshotCategoryFilter === 'all' && (
                          <div className="flex items-center gap-2 pt-1 pb-0.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {lang === 'en' ? 'Monthly / Weekly Archive Vault (Up to 90 Days)' : 'ئەرشیفی مانگانە و هەفتانە (تا ٩٠ ڕۆژ)'}
                            </span>
                            <span className="text-[10px] text-slate-400">({categorizedSnapshots.weekly.length} files)</span>
                          </div>
                        )}
                        {categorizedSnapshots.weekly.map((snap) => (
                          <div
                            key={snap.name}
                            className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <HardDrive className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">
                                    {snap.name}
                                  </span>
                                  {snap.name.endsWith('.gz') && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                      GZIP
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                    Archive (90d)
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                  {new Date(snap.createdAt).toLocaleString()} • {Math.round(snap.sizeBytes / 1024)} KB {snap.name.endsWith('.gz') ? '(compressed)' : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/api/backup?download=${encodeURIComponent(snap.name)}`}
                                download={snap.name}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                title="Download .sqlite.gz snapshot"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{lang === 'en' ? 'Download' : 'دابەزاندن'}</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setRestoreConfirmSnapshot(snap.name)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{lang === 'en' ? 'Restore' : 'گەڕاندنەوە'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 3: DATA EXPORTS & AUDIT LOGS                                        */}
          {/* ======================================================================= */}
          {activeTab === 'exports' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* CSV Entity Exporters Grid */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? '1-Click Direct CSV Spreadsheets' : 'دەرکردنی ڕاستەوخۆی فایلەکانی ئێکسڵ (CSV)'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Panels */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Wood Panels</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{materials.length} Stock items</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportPanelsCSV(materials)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  {/* Orders */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Workshop Orders</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{allFlattenedOrders.length} Allocations</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportOrdersCSV(allFlattenedOrders)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  {/* Invoices */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <ReceiptText className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Sales Invoices</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{transactions.length} Invoices</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportTransactionsCSV(transactions)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  {/* Products */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Warehouse Hardware</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{products.length} SKUs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportProductsCSV(products)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  {/* Shipments */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Logistics & Shipments</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{shipments.length} Deliveries</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportShipmentsCSV(shipments)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>

                  {/* Audit Logs */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Audit Logbook</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{activityLogs.length} Events</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportAuditLogsCSV(activityLogs)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Demo Data & Integrity Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'en' ? 'Demo Sample Records' : 'تۆماری نموونەیی بۆ تاقیکردنەوە'}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'en'
                      ? 'Appends 2 sample POS invoices with Kurdish & English metadata for demonstration without wiping existing records.'
                      : 'زیادکردنی ٢ وەسڵی نموونەیی بەبێ سڕینەوەی داتاکانی تر.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeedConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{lang === 'en' ? 'Append Demo Data' : 'زیادکردنی داتای نموونەیی'}</span>
                </button>
              </div>

              {/* Audit Trail Explorer */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'en' ? 'Live System Audit Trail' : 'تۆماری کردارە ئیدارییەکان'}
                  </h5>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        placeholder="Search logs..."
                        className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No matching log records found</div>
                  ) : (
                    filteredLogs.slice(0, 50).map((log) => (
                      <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{log.username}</span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate mt-0.5">{log.description}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{log.formattedTime}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB 4: NETWORK, WI-FI LAN & SYSTEM CONSOLE                              */}
          {/* ======================================================================= */}
          {activeTab === 'network' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Wi-Fi LAN Connection Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center gap-6">
                {/* QR Code */}
                {serverInfo?.qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    <img
                      src={serverInfo.qrDataUrl}
                      alt="Wi-Fi Connection QR Code"
                      className="w-36 h-36 rounded-xl object-contain"
                    />
                    <span className="text-[10px] font-bold text-slate-500 text-center block mt-1.5">
                      Scan with iPad / Phone
                    </span>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs shrink-0">
                    Generating QR...
                  </div>
                )}

                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {lang === 'en' ? 'Shop-Floor Tablet & Mobile Wi-Fi Access' : 'بەستنەوەی تابلێت و مۆبایل بە وایفای'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {lang === 'en'
                        ? 'Connect any iPad, Android tablet, or smartphone on the workshop Wi-Fi to create invoices or check inventory live.'
                        : 'هەر تابلێتێک یاخود مۆبایلێک کە لەسەر هەمان وایفایە دەتوانێت ڕاستەوخۆ دەستی بگات بەم سیستەمە.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <code className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                      {serverInfo?.networkUrl || `http://localhost:3000`}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        if (serverInfo?.networkUrl) {
                          navigator.clipboard.writeText(serverInfo.networkUrl);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulated Offline Mode & Testing Controls */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'en' ? 'Diagnostic & Simulation Controls' : 'ئامرازەکانی تاقیکردنەوە'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ToggleSwitch
                    label={lang === 'en' ? 'Simulate Network Disconnection' : 'تاقیکردنەوەی دۆخی بێ ئینتەرنێت'}
                    description={
                      lang === 'en'
                        ? 'Forces offline local queue mode to verify offline sales and background WAL sync.'
                        : 'دەتوانیت تاقی بکەیتەوە کە سیستەم لە کاتی بێ هێڵیدا چۆن ئۆفلاین کار دەکات.'
                    }
                    badge={simulatedOffline ? 'Simulating Offline' : 'Live Sync'}
                    checked={simulatedOffline}
                    onChange={() => toggleSimulatedOffline()}
                  />

                  {/* Device Viewport Override */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {lang === 'en' ? 'Viewport Display Mode' : 'شێوازی پیشاندان'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === 'en' ? 'Auto adaptive, forced desktop, or mobile tablet' : 'شاشەی گەورە یان تابلێت'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {(['auto', 'desktop', 'mobile'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onChangeViewMode(mode)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                            viewMode === mode
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engineering Credits & Licensure */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Engineered specifically by Bako Bayan Madhhar for Shaswar Ahmad Shaswar Co.
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                  Bako&apos;s Master System • {APP_CONFIG.version} • All Rights Reserved
                </span>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAR: Close Action                                                  */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-md flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {lang === 'en' ? 'Changes take effect immediately across all sessions' : 'گۆڕانکارییەکان دەستبەجێ جێبەجێ دەبن'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {lang === 'en' ? 'Close Admin Panel' : 'داخستن'}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SUB-MODALS: Add User, Change Password, Confirm Restore, Confirm Demo Seed  */}
      {/* ========================================================================= */}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Create New Account</h4>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. karwan"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Karwan Shaswar"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Staff">Staff (POS / Sales)</option>
                  <option value="Manager">Manager</option>
                  <option value="Viewer">Read-Only Viewer</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newUsername.trim() || !newDisplayName.trim() || !newUserPassword.trim()) {
                    onToast('Please fill out all fields');
                    return;
                  }
                  const success = addUserAccount({
                    username: newUsername.trim(),
                    displayName: newDisplayName.trim(),
                    role: newUserRole,
                    password: newUserPassword.trim(),
                  });
                  if (success) {
                    onToast(`Account @${newUsername} created successfully!`);
                    setSelectedUsername(newUsername.trim());
                    setShowAddUserModal(false);
                    setNewUsername('');
                    setNewDisplayName('');
                    setNewUserPassword('');
                  } else {
                    onToast('Username already exists');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {userToChangePassword && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Reset Password for @{userToChangePassword}
            </h4>
            <input
              type="password"
              value={newPasswordValue}
              onChange={(e) => setNewPasswordValue(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToChangePassword(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPasswordValue.trim()) return;
                  updateUserAccount(userToChangePassword, { password: newPasswordValue.trim() });
                  onToast(`Password updated for @${userToChangePassword}`);
                  setUserToChangePassword(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Snapshot Confirmation */}
      <ConfirmModal
        isOpen={!!restoreConfirmSnapshot}
        title={lang === 'en' ? 'Restore Database Snapshot?' : 'گەڕاندنەوەی باکئەپ؟'}
        message={
          lang === 'en'
            ? `Are you sure you want to restore "${restoreConfirmSnapshot}"? The active SQLite database will be replaced with this exact snapshot.`
            : `ئایا دڵنیایت لە گەڕاندنەوەی ئەم باکئەپە؟ داتاکان دەگەڕێنەوە بۆ کاتی دروستکردنی ئەم وێنەیە.`
        }
        confirmText={lang === 'en' ? 'Yes, Restore Now' : 'بەڵێ، ئێستا بگەڕێنەوە'}
        cancelText={lang === 'en' ? 'Cancel' : 'پەشیمانبوونەوە'}
        isDanger
        onConfirm={() => {
          if (restoreConfirmSnapshot) {
            handleRestoreSnapshot(restoreConfirmSnapshot);
          }
        }}
        onClose={() => setRestoreConfirmSnapshot(null)}
      />

      {/* Seed Demo Data Confirmation */}
      <ConfirmModal
        isOpen={showSeedConfirm}
        title={lang === 'en' ? 'Append Demo Sample Records?' : 'زیادکردنی داتای نموونەیی؟'}
        message={
          lang === 'en'
            ? 'This will safely append 2 realistic sample sales invoices for demonstration. Your existing inventory will NOT be deleted.'
            : 'ئەمە ٢ وەسڵی نموونەیی زیاد دەکات بۆ تاقیکردنەوە. هیچ داتایەکی کۆن ناسڕدرێتەوە.'
        }
        confirmText={lang === 'en' ? 'Append Records' : 'زیادکردن'}
        cancelText={lang === 'en' ? 'Cancel' : 'پەشیمانبوونەوە'}
        onConfirm={handleSeedDemoData}
        onClose={() => setShowSeedConfirm(false)}
      />
    </div>
  );
};

export default AdminPanelModal;
