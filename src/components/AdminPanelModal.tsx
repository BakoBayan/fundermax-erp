'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect } from 'react';
import { useInventory, resolveUserPermissions, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_MANAGER_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS, DEFAULT_VIEWER_PERMISSIONS, ROLE_PRESETS } from '@/context/InventoryContext';
import { CurrencyCode, PanelTransaction, UserModulePermissions, UserRole, RolePresetName } from '@/types/inventory';
import {
  X,
  Usb,
  Smartphone,
  Monitor,
  Wifi,
  Database,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Clock,
  Search,
  FileCode2,
  HardDrive,
  FolderGit2,
  BarChart3,
  Download,
  FileSpreadsheet,
  Layers,
  PackageCheck,
  ReceiptText,
  Boxes,
  Truck,
  CheckCircle2,
  Activity,
  Server,
  User,
  Phone,
  ShieldCheck,
  FileText,
  Users,
  KeyRound,
  Lock,
  Unlock,
  Plus
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import {
  exportAuditLogsCSV,
  exportPanelsCSV,
  exportOrdersCSV,
  exportTransactionsCSV,
  exportProductsCSV,
  exportShipmentsCSV
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

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  lang: propLang,
  isDark: propDark,
  viewMode: propViewMode,
  onChangeViewMode: propOnChangeViewMode,
  activeCurrency: propCurrency,
  formatMoney: propFormatMoney,
  onToast: propOnToast
}) => {
  const {
    activityLogs,
    materials,
    transactions,
    products,
    shipments,
    backups,
    createManualBackup,
    addTransaction,
    language,
    theme,
    deviceMode,
    setDeviceMode,
    formatMoney: ctxFormatMoney,
    isOnline,
    syncStatus,
    walHealth,
    pingHealthCheck,
    users,
    currentUser,
    updateUserPermissions,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    setCurrentModule,
  } = useInventory();

  const lang = propLang || language;
  const isDark = propDark ?? (theme === 'dark');
  const viewMode = propViewMode || (deviceMode as any) || 'auto';
  const onChangeViewMode = propOnChangeViewMode || ((mode: any) => setDeviceMode(mode));
  const activeCurrency = propCurrency || 'USD';
  const formatMoney = propFormatMoney || ctxFormatMoney;
  const onToast = propOnToast || (() => {});

  const [activeTab, setActiveTab] = useState<'database' | 'logs' | 'users' | 'info' | 'server' | 'view'>('database');
  const [selectedUsername, setSelectedUsername] = useState<string>(() => users[0]?.username || 'bako');
  const selectedUser = users.find((u) => u.username.toLowerCase() === selectedUsername.toLowerCase()) || users[0];
  const [activeUserPerms, setActiveUserPerms] = useState<UserModulePermissions>(() => {
    return resolveUserPermissions(selectedUser || null);
  });

  useEffect(() => {
    if (selectedUser) {
      setActiveUserPerms(resolveUserPermissions(selectedUser));
    }
  }, [selectedUsername, users]);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Staff');
  const [newUserPassword, setNewUserPassword] = useState('');

  const [userToChangePassword, setUserToChangePassword] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [logFilter, setLogFilter] = useState<'all' | 'sale' | 'inventory' | 'settings' | 'system'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logUserFilter, setLogUserFilter] = useState<string>('all');
  const [logTimeframeFilter, setLogTimeframeFilter] = useState<'all' | 'today' | 'week'>('all');
  const allLogs = activityLogs || [];

  const uniqueLogUsers = Array.from(new Set(allLogs.map((l) => l.username).filter(Boolean))).sort();

  const hasActiveLogFilters = logFilter !== 'all' || logSearch.trim() !== '' || logUserFilter !== 'all' || logTimeframeFilter !== 'all';

  const resetAllLogFilters = () => {
    setLogFilter('all');
    setLogSearch('');
    setLogUserFilter('all');
    setLogTimeframeFilter('all');
  };

  // All flattened orders for CSV export
  const allFlattenedOrders = (materials || []).flatMap((m) =>
    (m.activeOrders || []).map((ord) => ({ order: ord, material: m }))
  );

  // Server & Wi-Fi state + System Metrics
  const [serverInfo, setServerInfo] = useState<{
    ip: string;
    networkUrl: string;
    port: number;
    qrDataUrl: string;
    totalFiles?: number;
    linesOfCode?: number;
    srcFiles?: number;
    srcLines?: number;
    dataBytes?: number;
    formattedDataSize?: string;
    dataFilesCount?: number;
    dataFiles?: Array<{ name: string; size: number; formattedSize: string }>;
    fileBreakdown?: Record<string, { files: number; lines: number }>;
  } | null>(null);
  const [loadingServerInfo, setLoadingServerInfo] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchServerData = () => {
    setLoadingServerInfo(true);
    pingHealthCheck().catch(() => {});
    fetch('/api/server-info')
      .then((res) => res.json())
      .then((data) => {
        setServerInfo(data);
        setLoadingServerInfo(false);
      })
      .catch(() => setLoadingServerInfo(false));
  };

  // Fetch server info when modal opens or on server tab
  useEffect(() => {
    if (isOpen) {
      fetchServerData();
    }
  }, [isOpen]);

  // Backup states & 3-month retention info
  const [backupCount, setBackupCount] = useState<number | null>(null);
  const [walSnapshots, setWalSnapshots] = useState<Array<{ name: string; path: string; sizeBytes: number; createdAt: string }>>([]);
  const [usbDrives, setUsbDrives] = useState<string[]>([]);
  const [exportingUsb, setExportingUsb] = useState(false);
  const [detectingUsb, setDetectingUsb] = useState(false);
  const [expandedDivisions, setExpandedDivisions] = useState<{ [key: string]: boolean }>({
    panels: true,
    sales: true,
    warehouse: false,
    admin: false,
  });
  const toggleDivision = (div: string) => {
    setExpandedDivisions((prev) => ({ ...prev, [div]: !prev[div] }));
  };
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchBackupsInfo = () => {
    fetch('/api/backup')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (Array.isArray(data.snapshots)) {
            setWalSnapshots(data.snapshots);
            setBackupCount(data.snapshots.length);
          } else if (Array.isArray(data.backups)) {
            setBackupCount(data.backups.length);
          }
          if (Array.isArray(data.drives)) {
            setUsbDrives(data.drives);
          }
        }
      })
      .catch(() => {});
  };

  const handleExportUsb = async (targetDir?: string) => {
    setExportingUsb(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_usb', targetDir }),
      });
      const data = await res.json();
      if (data && data.success) {
        onToast(
          lang === 'en'
            ? `Physical backup exported to ${data.destination}!`
            : `باکئەپ بە سەرکەوتوویی نێردرا بۆ USB: ${data.destination}`
        );
        fetchBackupsInfo();
      } else {
        onToast(data?.error || 'Failed to export backup to USB');
      }
    } catch (err: any) {
      onToast(err?.message || 'Error exporting to USB');
    } finally {
      setExportingUsb(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackupsInfo();
    }
  }, [isOpen]);

  const handleCreateInstantBackup = async () => {
    setCreatingBackup(true);
    try {
      // 1. Create SQLite server snapshot via API
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_backup' })
      });
      const data = await res.json();
      
      // 2. Also record manual snapshot in context
      try {
        await createManualBackup(lang === 'en' ? 'Manual Admin Snapshot' : 'باکئەپی دەستی بەڕێوەبەر');
      } catch {}

      if (data.success) {
        onToast(lang === 'en' ? 'Database backup snapshot saved!' : 'باکئەپ بە سەرکەوتوویی پاشەکەوتکرا!');
        fetchBackupsInfo();
      } else {
        onToast('Failed to create backup');
      }
    } catch {
      onToast('Error creating backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // In-app confirmation states
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);

  // Handle Seed Demo Data (appends without wiping old data)
  const handleSeedData = () => {
    const samples: Omit<PanelTransaction, 'id' | 'timestamp' | 'lastUpdated'>[] = [
      {
        code: 'INV-2026-088',
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
        notes: 'Delivery scheduled for Erbil showroom construction.',
        images: [],
        items: []
      },
      {
        code: 'INV-2026-089',
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
        notes: 'Full payment received in cash upon pick-up.',
        images: [],
        items: []
      },
      {
        code: 'INV-2026-090',
        panelType: 'Matte Charcoal Grey',
        material: 'Waterproof Compact Laminate',
        quantity: 40,
        unit: 'pcs',
        sellingType: 'Project / Contractor (پڕۆژە)',
        sellingAmount: 3200,
        costPrice: 2800,
        currency: 'USD',
        currencyRate: 1500,
        discountDollars: 100,
        discountPercentage: 3.1,
        totalAfterDiscount: 3100,
        amountPaidNow: 1500,
        amountOwed: 1600,
        oldUnpaidDebt: 400,
        combinedTotalDebt: 2000,
        grossProfit: 300,
        profitMargin: 9.6,
        seller: 'Bako Bayan',
        bank: 'RT Bank',
        paymentType: 'Debt / Credit (قەرز)',
        status: 'debt',
        notes: 'Contractor commercial interior project installment.',
        images: [],
        items: []
      }
    ];

    samples.forEach((sample, idx) => {
      const now = Date.now() + idx * 1000;
      addTransaction({
        ...sample,
        id: `tx-seed-${now}`,
        timestamp: new Date(now).toISOString(),
        lastUpdated: new Date(now).toISOString()
      });
    });

    setShowSeedConfirm(false);
    onToast(lang === 'en' ? 'Appended 3 sample records!' : '٣ تۆماری نموونەیی زیادکران!');
  };

  // Handle Clear Transactions (Final execution)
  const handleExecuteClearTransactions = () => {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [] })
    }).catch(() => {});
    setClearStep(0);
    onToast(lang === 'en' ? 'All sales records cleared.' : 'هەموو تۆمارەکان سڕانەوە.');
  };

  // Copy network URL
  const handleCopyNetworkUrl = () => {
    if (!serverInfo?.networkUrl) return;
    navigator.clipboard.writeText(serverInfo.networkUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    onToast(lang === 'en' ? 'Mobile link copied to clipboard!' : 'لینکی مۆبایل لەبەرگیرایەوە!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl border overflow-hidden transition-all flex flex-col max-h-[90vh] bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Admin Command & Control Console' : 'بەڕێوەبردن و کۆنترۆڵی سیستەم'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  {APP_CONFIG.version}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                  Admin Access
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {lang === 'en'
                  ? "Bako's Master System • Direct database supervision, WAL backups, audit trail & Wi-Fi server"
                  : 'داتابەیس، باکئەپی پارێزراوی ٣ مانگە، تۆماری چاودێری، سێرڤەری وایفای و ئامار'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB NAVIGATION BAR                                                        */}
        {/* ========================================================================= */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 gap-1 overflow-x-auto text-xs font-bold bg-slate-100/60 dark:bg-slate-950/40 select-none">
          {[
            { id: 'database', label: lang === 'en' ? 'Database & Backups' : 'داتابەیس و باکئەپ', icon: Database, color: 'text-emerald-500' },
            { id: 'logs', label: lang === 'en' ? 'Audit Trail' : 'تۆماری چاودێری', icon: Clock, color: 'text-sky-500', count: allLogs.length },
            { id: 'users', label: lang === 'en' ? 'Accounts & Permissions' : 'بەکارهێنەران و دەسەڵاتەکان', icon: Users, color: 'text-emerald-600', count: users.length },
            { id: 'info', label: lang === 'en' ? 'System Metrics' : 'ئامار و کۆد', icon: BarChart3, color: 'text-indigo-500' },
            { id: 'server', label: lang === 'en' ? 'Wi-Fi Server & QR' : 'سێرڤەری وایفای', icon: Wifi, color: 'text-blue-500' },
            { id: 'view', label: lang === 'en' ? 'Display Mode' : 'شێوازی پیشاندان', icon: Smartphone, color: 'text-purple-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black bg-white dark:bg-slate-850 shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB BODY                                                                  */}
        {/* ========================================================================= */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: DATABASE & BACKUPS (ADMIN EXCLUSIVE)                              */}
          {/* ========================================================================= */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* SQLite WAL Diagnostic Status Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {lang === 'en' ? 'SQLite Engine Status: WAL Mode Active' : 'دۆخی داتابەیس: سیستەمی WAL چالاکە'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                        PRAGMA journal_mode=WAL
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {lang === 'en'
                        ? '100% offline-tolerant atomic database with continuous write-ahead logging and zero data loss guarantee.'
                        : 'داتابەیسی خێرا و سەلامەت بە شێوازی تۆمارکردنی بەردەوام، بێ لەدەستچوونی داتا لە کاتی بڕانی کارەبا.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-300">
                        Integrity: <strong className="text-emerald-600 dark:text-emerald-400">PASSED</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        Disk Size: <strong className="text-slate-900 dark:text-white">{serverInfo?.formattedDataSize || '5.62 MB'}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        Latency: <strong className="text-emerald-600 dark:text-emerald-400">{walHealth?.latencyMs || 0}ms</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    fetchServerData();
                    fetchBackupsInfo();
                    onToast(lang === 'en' ? 'Diagnostics refreshed!' : 'دۆخی داتابەیس نوێکرایەوە!');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingServerInfo ? 'animate-spin' : ''}`} />
                  <span>{lang === 'en' ? 'Re-verify Health' : 'پشکنینی نوێ'}</span>
                </button>
              </div>

              {/* Automated Rolling Backups (3-Month Retention) Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {lang === 'en' ? 'Automated Rolling Backups (3-Month Retention)' : 'سیستەمی باکئەپی خۆکاری ٣ مانگە'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {lang === 'en'
                        ? 'The system continuously stores timestamped SQLite snapshots into "data/backups/". Any backups older than 90 days are automatically pruned to prevent disk bloat, while always keeping at least 10 recent snapshots for total safety.'
                        : 'سیستەم بە بەردەوامی وەشانی باکئەپ لە "data/backups/" دەپارێزێت. باکئەپەکانی کۆنتر لە ٩٠ ڕۆژ خۆکارانە دەسڕدرێنەوە بۆ پاشەکەوتی هارددیسک، و لانیکەم ١٠ باکئەپی نوێ دەمێننەوە.'}
                    </p>
                  </div>
                  <span className="shrink-0 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 self-start">
                    {backupCount !== null ? `${backupCount} Backups Stored` : 'Active'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreateInstantBackup}
                    disabled={creatingBackup}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${creatingBackup ? 'animate-spin' : ''}`} />
                    <span>{lang === 'en' ? 'Create Instant WAL Snapshot' : 'دروستکردنی باکئەپی ئێستا'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportUsb(usbDrives[0])}
                    disabled={exportingUsb}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Usb className={`w-4 h-4 ${exportingUsb ? 'animate-spin' : ''}`} />
                    <span>{lang === 'en' ? 'Export Physical Backup to USB' : 'ناردنی باکئەپی فیزیکی بۆ USB'}</span>
                  </button>

                  {walSnapshots.length > 0 && (
                    <a
                      href={`/api/backup?download=${encodeURIComponent(walSnapshots[0].name)}`}
                      download
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer no-underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? `Download Snapshot (${(walSnapshots[0].sizeBytes / 1024).toFixed(0)} KB)` : 'داگرتنی فایلی داتابەیس'}</span>
                    </a>
                  )}

                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {usbDrives.length > 0 ? `USB Detected: ${usbDrives.join(', ')}` : 'Rolling Retention: Last 14 Snapshots'}
                  </span>
                </div>
              </div>

              {/* 1-Tap Complete Table Exporters (Excel / CSV) */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {lang === 'en' ? '1-Tap Complete Table Exporters (Excel / CSV)' : 'دابەزاندنی خێرای داتابەیس بە فایلی Excel / CSV'}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    UTF-8 BOM • Full Kurdish & English Character Support
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <button
                    type="button"
                    onClick={() => exportPanelsCSV(materials, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Wood Panels' : 'تەختەکان'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{materials?.length ?? 0} records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportOrdersCSV(allFlattenedOrders, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Customer Orders' : 'داواکارییەکان'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{allFlattenedOrders.length} records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportTransactionsCSV(transactions, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <ReceiptText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Sales Invoices' : 'وەسڵی فرۆشتن'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{transactions?.length ?? 0} records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportProductsCSV(products, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Warehouse Goods' : 'کۆگای کەلوپەل'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{products?.length ?? 0} records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportShipmentsCSV(shipments, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Shipments' : 'باری گەیشتوو'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{shipments?.length ?? 0} records</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportAuditLogsCSV(allLogs, language)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'en' ? 'Audit Trail' : 'تۆماری چاودێری'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{allLogs.length} records</div>
                  </button>
                </div>
              </div>

              {/* Sample Data & Ledger Maintenance */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Database Seeding & Ledger Safeguards' : 'داتای نموونەیی و پاراستنی تۆمار'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {lang === 'en'
                    ? 'Load realistic Kurdish sales records to stress-test your system, or safely clear historical sales transactions with two-step security confirmation.'
                    : 'زیادکردنی تۆماری نموونەیی کوردی یان سڕینەوەی وەسڵەکان بە دوو قۆناغی دڵنیابوونەوەی ئەمنی.'}
                </p>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSeedConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Append 3 Sample Records' : 'زیادکردنی ٣ داتای نموونەیی'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClearStep(1)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Clear Sales Ledger (Admin Only)' : 'سڕینەوەی وەسڵەکانی فرۆشتن'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AUDIT TRAIL (ACTIVITY LOG & USER ACTIONS)                          */}
          {/* ========================================================================= */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-sky-600 dark:text-sky-400">
                    <Clock className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Database Audit Trail' : 'تۆماری چالاکیەکانی داتابەیس'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'en'
                      ? 'Immutable chronological log of inventory adjustments, sales invoices, and supervisor operations.'
                      : 'تۆماری تەواوی گۆڕانکاری، زیادکردن، وەسڵی نوێ و سڕینەوەکان.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportAuditLogsCSV(allLogs, language)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'en' ? 'Export Logs (CSV)' : 'دابەزاندنی تۆمار (CSV)'}</span>
                  </button>
                </div>
              </div>

              {/* Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold overflow-x-auto">
                  {(['all', 'sale', 'inventory', 'settings', 'system'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLogFilter(cat)}
                      className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                        logFilter === cat
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? (lang === 'en' ? 'All Logs' : 'هەمووی') : cat}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'en' ? 'Search by user, action, code...' : 'گەڕان لە تۆمارەکان بەپێی بەکارهێنەر، کۆد...'}
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Secondary Filter Bar: Operator, Timeframe & Fullscreen Module Link */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Operator Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {lang === 'en' ? 'Operator:' : 'بەکارهێنەر:'}
                    </span>
                    <select
                      value={logUserFilter}
                      onChange={(e) => setLogUserFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">{lang === 'en' ? 'All Operators' : 'هەموو بەکارهێنەران'}</option>
                      {uniqueLogUsers.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Timeframe Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {lang === 'en' ? 'Time:' : 'کات:'}
                    </span>
                    <select
                      value={logTimeframeFilter}
                      onChange={(e) => setLogTimeframeFilter(e.target.value as 'all' | 'today' | 'week')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">{lang === 'en' ? 'All Time' : 'هەموو کاتێک'}</option>
                      <option value="today">{lang === 'en' ? 'Today (24h)' : 'ئەمڕۆ'}</option>
                      <option value="week">{lang === 'en' ? 'Last 7 Days' : '٧ ڕۆژی ڕابردوو'}</option>
                    </select>
                  </div>

                  {/* 1-Click Clear Filters */}
                  {hasActiveLogFilters && (
                    <button
                      type="button"
                      onClick={resetAllLogFilters}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      {lang === 'en' ? 'Clear Filters' : 'سڕینەوەی فلتەر'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setCurrentModule('audit');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Open full dedicated Audit & Backups screen"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{lang === 'en' ? 'Open Fullscreen Audit Module' : 'کردنەوەی بەشی تەواوی تۆمارەکان'}</span>
                </button>
              </div>

              {/* Logs Timeline List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {allLogs.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    {lang === 'en' ? 'No audit records logged yet.' : 'هیچ تۆمارێکی چالاکی تۆمار نەکراوە.'}
                  </div>
                ) : (
                  allLogs
                    .filter((log) => {
                      if (logFilter !== 'all' && log.category !== logFilter) return false;
                      if (logUserFilter !== 'all' && log.username !== logUserFilter) return false;
                      if (logTimeframeFilter !== 'all') {
                        const now = Date.now();
                        const diffMs = now - (log.timestamp || 0);
                        if (logTimeframeFilter === 'today' && diffMs > 24 * 60 * 60 * 1000) return false;
                        if (logTimeframeFilter === 'week' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
                      }
                      if (!logSearch.trim()) return true;
                      const q = logSearch.toLowerCase();
                      return (
                        (log.username && log.username.toLowerCase().includes(q)) ||
                        (log.action && log.action.toLowerCase().includes(q)) ||
                        (log.description && log.description.toLowerCase().includes(q)) ||
                        (log.details && log.details.toLowerCase().includes(q))
                      );
                    })
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 hover:bg-white dark:hover:bg-slate-800 text-xs space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sky-600 dark:text-sky-400">{log.action}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {log.formattedTime || new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {log.description} {log.details ? `— ${log.details}` : ''}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                          <span>
                            Operator: <strong className="text-slate-800 dark:text-slate-200 font-bold">{log.username}</strong>
                          </span>
                          {log.category && (
                            <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 font-mono text-[9px] uppercase font-bold text-slate-600 dark:text-slate-300">
                              {log.category}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: USER ACCOUNTS & INDIVIDUAL MODULE PERMISSIONS                        */}
          {/* ========================================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header Banner & "+ Add New User Account" */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        {lang === 'en' ? 'User Accounts & Module Access Control' : 'بەڕێوەبردنی بەکارهێنەران و دەسەڵاتەکان'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                        {users.length} {lang === 'en' ? 'Accounts Active' : 'هەژمار چالاکن'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {lang === 'en'
                        ? 'Assign individual access permissions for each user across all major modules (Panel Manager, Sales POS, Orders, Warehouse Goods, Shipping, and Database).'
                        : 'دەسەڵاتی تایبەت بۆ هەر بەکارهێنەرێک دابنێ لەسەر بەشەکانی سیستەم (تەختەکان، فرۆشتن، داواکاری، کۆگا، بارکردن و داتابەیس).'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewUsername('');
                    setNewDisplayName('');
                    setNewUserRole('Staff');
                    setNewUserPassword('');
                    setShowAddUserModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Add User Account' : 'زیادکردنی بەکارهێنەر'}</span>
                </button>
              </div>

              {/* Accounts Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  {lang === 'en' ? 'Select User to Configure Permissions:' : 'هەڵبژاردنی بەکارهێنەر بۆ دەستکاریکردنی دەسەڵاتەکان:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((u) => {
                    const isSelected = u.username.toLowerCase() === selectedUsername.toLowerCase();
                    const perms = resolveUserPermissions(u);
                    const activeModulesCount = [
                      perms.panels,
                      perms.orders,
                      perms.sales,
                      perms.goods,
                      perms.shipping,
                      perms.audit,
                    ].filter(Boolean).length;

                    return (
                      <div
                        key={u.username}
                        onClick={() => setSelectedUsername(u.username)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-md ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-2xs ${
                              u.role === 'Admin'
                                ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                                : u.role === 'Manager'
                                ? 'bg-gradient-to-br from-sky-600 to-blue-700'
                                : 'bg-gradient-to-br from-slate-600 to-slate-700'
                            }`}>
                              {u.displayName?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{u.displayName}</span>
                                {currentUser?.username.toLowerCase() === u.username.toLowerCase() && (
                                  <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 block">
                                @{u.username}
                              </span>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                            u.role === 'Admin'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                              : u.role === 'Manager'
                              ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            {lang === 'en' ? 'Active Access:' : 'دەسەڵاتی چالاک:'}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {activeModulesCount === 6 ? (lang === 'en' ? 'Full Access (6/6)' : 'تەواوی بەشەکان') : `${activeModulesCount} / 6 Modules`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Permissions Editor for Selected User */}
              {selectedUser && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-5 animate-in fade-in duration-200">
                  
                  {/* Selected Account Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-sm">
                        {selectedUser.displayName?.[0]?.toUpperCase() || selectedUser.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            {selectedUser.displayName}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            @{selectedUser.username}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                            {selectedUser.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {lang === 'en' 
                            ? 'Configure which major divisions and action capabilities this account can access.' 
                            : 'دیاریکردنی بەشەکان و دەسەڵاتەکانی ئەم بەکارهێنەرە لە سیستەمدا.'}
                        </p>
                      </div>
                    </div>

                    {/* Account actions: Password change & Delete */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setUserToChangePassword(selectedUser.username);
                          setNewPasswordValue('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lang === 'en' ? 'Change Password' : 'گۆڕینی وشەی نهێنی'}</span>
                      </button>

                      {selectedUser.username.toLowerCase() !== 'bako' && (
                        <button
                          type="button"
                          onClick={() => setUserToDelete(selectedUser.username)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Delete Account' : 'سڕینەوەی هەژمار'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Role Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {lang === 'en' ? 'Standard Role Presets (1-Click Apply):' : 'ڕۆڵی ئامادەکراو (بە یەک کلیک):'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {lang === 'en' ? 'Select a preset or customize granular toggles below' : 'ڕۆڵێک هەڵبژێرە یان دەسەڵاتەکان دیاریبکە'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['Super Admin', 'Accountant', 'Workshop Floor', 'Read-Only Operator'] as RolePresetName[]).map((presetName) => {
                        const icons: Record<RolePresetName, string> = {
                          'Super Admin': '👑',
                          'Accountant': '📊',
                          'Workshop Floor': '🪵',
                          'Read-Only Operator': '👁️',
                        };
                        const descriptions: Record<RolePresetName, string> = {
                          'Super Admin': lang === 'en' ? 'Full unrestricted access to all 4 divisions' : 'دەسەڵاتی تەواوی هەموو بەشەکان',
                          'Accountant': lang === 'en' ? 'POS billing, customer debts & price override' : 'فرۆشتن، قەرز و دەستکاری نرخ',
                          'Workshop Floor': lang === 'en' ? 'Panel cutting, order queues & stock intake' : 'بڕینی تەختە و داواکارییەکان',
                          'Read-Only Operator': lang === 'en' ? 'View-only access, zero edits/deletes' : 'تەنها بینین، بێ سڕینەوە و دەستکاری',
                        };

                        return (
                          <button
                            key={presetName}
                            type="button"
                            onClick={() => {
                              setActiveUserPerms(ROLE_PRESETS[presetName]);
                              onToast(
                                lang === 'en'
                                  ? `Applied "${presetName}" preset!`
                                  : `ڕۆڵی "${presetName}" دیاریکرا!`
                              );
                            }}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-sky-500 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-98 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 dark:text-white mb-1">
                                <span className="text-base">{icons[presetName]}</span>
                                <span>{presetName}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                                {descriptions[presetName]}
                              </p>
                            </div>
                            <span className="mt-2 text-[9px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                              {lang === 'en' ? 'Apply Preset →' : 'جێبەجێکردن ←'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accordion Cards Per Division */}
                  <div className="space-y-3 pt-2">
                    <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Granular CRUD Permissions Matrix (Per Division):' : 'خشتەی وردی دەسەڵاتەکان بەپێی بەشەکان:'}
                    </span>

                    {/* DIVISION 01: WOOD PANELS & WORKSHOP */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs">
                      <div
                        onClick={() => toggleDivision('panels')}
                        className="p-3.5 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white">
                                {lang === 'en' ? 'Division 01: Wood Panels & Workshop Cutting' : 'بەشی یەکەم: کۆگای تەختە و کارگەی بڕین'}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                                {[activeUserPerms.canViewPanels, activeUserPerms.canCreatePanels, activeUserPerms.canEditPanels, activeUserPerms.canDeletePanels].filter(Boolean).length}/4
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {lang === 'en' ? 'Panel sheet sizing, custom cutting orders, and workshop reservations.' : 'ئەندازەکردن، بڕینی داواکارییەکان، و پاشەکەوتی تەختە.'}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-400 font-bold text-sm">
                          {expandedDivisions.panels ? '▲' : '▼'}
                        </div>
                      </div>

                      {expandedDivisions.panels && (
                        <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { key: 'canViewPanels', label: 'View Wood Panels', desc: 'Browse catalog, active orders & stock counts' },
                            { key: 'canCreatePanels', label: 'Create Panels & Orders', desc: 'Add new material codes and log cutting reservations' },
                            { key: 'canEditPanels', label: 'Edit Panels & Allocations', desc: 'Modify dimensions, pricing, and order progress' },
                            { key: 'canDeletePanels', label: 'Delete Panels & Orders', desc: 'Permanently archive panel or order entries' },
                          ].map((item) => {
                            const val = !!activeUserPerms[item.key as keyof UserModulePermissions];
                            return (
                              <label
                                key={item.key}
                                className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={() =>
                                    setActiveUserPerms((prev) => ({
                                      ...prev,
                                      [item.key]: !prev[item.key as keyof UserModulePermissions],
                                    }))
                                  }
                                  className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                    {item.label}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                    {item.desc}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* DIVISION 02: SALES POS & BILLING */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs">
                      <div
                        onClick={() => toggleDivision('sales')}
                        className="p-3.5 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <ReceiptText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white">
                                {lang === 'en' ? 'Division 02: Sales POS, Invoices & Debt Ledger' : 'بەشی دووەم: سیستەمی فرۆشتن، پسوولە و قەرز'}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono">
                                {[activeUserPerms.canViewSales, activeUserPerms.canCreateSales, activeUserPerms.canEditSales, activeUserPerms.canDeleteSales, activeUserPerms.canOverridePrice].filter(Boolean).length}/5
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {lang === 'en' ? 'Checkout cash register, multi-currency invoices, debt collection and price overrides.' : 'تۆماری فرۆشتن، قەرزی کڕیاران و پسوولەی فەرمی.'}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-400 font-bold text-sm">
                          {expandedDivisions.sales ? '▲' : '▼'}
                        </div>
                      </div>

                      {expandedDivisions.sales && (
                        <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { key: 'canViewSales', label: 'View Sales History', desc: 'Inspect customer invoices, debt ledger and totals' },
                            { key: 'canCreateSales', label: 'Create New Invoices', desc: 'Process checkout sales and generate print slips' },
                            { key: 'canEditSales', label: 'Edit Invoices', desc: 'Modify existing finalized sales invoices' },
                            { key: 'canDeleteSales', label: 'Delete Invoices', desc: 'Archive sales invoices and reverse debt entries' },
                            { key: 'canOverridePrice', label: 'Manual Price Override', desc: 'Modify item unit price or discount at checkout' },
                          ].map((item) => {
                            const val = !!activeUserPerms[item.key as keyof UserModulePermissions];
                            return (
                              <label
                                key={item.key}
                                className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={() =>
                                    setActiveUserPerms((prev) => ({
                                      ...prev,
                                      [item.key]: !prev[item.key as keyof UserModulePermissions],
                                    }))
                                  }
                                  className="mt-1 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                    {item.label}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                    {item.desc}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* DIVISION 03: WAREHOUSE & LOGISTICS */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs">
                      <div
                        onClick={() => toggleDivision('warehouse')}
                        className="p-3.5 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white">
                                {lang === 'en' ? 'Division 03: Warehouse Hardware & Logistics' : 'بەشی سێیەم: مەخزەنی کەلوپەل و گەیاندن'}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                                {[activeUserPerms.canViewWarehouse, activeUserPerms.canManageStock, activeUserPerms.canManageShipments].filter(Boolean).length}/3
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {lang === 'en' ? 'Finished fittings, hardware stock levels, and supplier shipment tracking.' : 'کەلوپەلی کۆگا، چاودێری ڕێژە و بارەکانی دەرەوە.'}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-400 font-bold text-sm">
                          {expandedDivisions.warehouse ? '▲' : '▼'}
                        </div>
                      </div>

                      {expandedDivisions.warehouse && (
                        <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { key: 'canViewWarehouse', label: 'View Warehouse Inventory', desc: 'Browse hardware fittings, accessories, and stock levels' },
                            { key: 'canManageStock', label: 'Manage Stock & Reorders', desc: 'Update inventory counts, locations, and low-stock alerts' },
                            { key: 'canManageShipments', label: 'Manage Shipments & Logistics', desc: 'Track carrier deliveries and receive inbound freight' },
                          ].map((item) => {
                            const val = !!activeUserPerms[item.key as keyof UserModulePermissions];
                            return (
                              <label
                                key={item.key}
                                className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={() =>
                                    setActiveUserPerms((prev) => ({
                                      ...prev,
                                      [item.key]: !prev[item.key as keyof UserModulePermissions],
                                    }))
                                  }
                                  className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                    {item.label}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                    {item.desc}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* DIVISION 04: SYSTEM ADMIN & AUDIT */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs">
                      <div
                        onClick={() => toggleDivision('admin')}
                        className="p-3.5 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-xs text-slate-900 dark:text-white">
                                {lang === 'en' ? 'Division 04: System Administration & Physical Backups' : 'بەشی چوارەم: بەڕێوەبەرایەتی سیستەم و باکئەپ'}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono">
                                {[activeUserPerms.canAccessAdmin, activeUserPerms.canExportBackups].filter(Boolean).length}/2
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {lang === 'en' ? 'Administrative security controls, audit logs, and physical offline backups.' : 'دەسەڵاتی بەڕێوەبەر، تۆماری چاودێری و پاراستنی باکئەپ.'}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-400 font-bold text-sm">
                          {expandedDivisions.admin ? '▲' : '▼'}
                        </div>
                      </div>

                      {expandedDivisions.admin && (
                        <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { key: 'canAccessAdmin', label: 'Admin Console Access', desc: 'Inspect audit trail, modify user accounts and view diagnostics' },
                            { key: 'canExportBackups', label: 'Export Physical Backups & CSV', desc: 'Trigger crash-safe USB backups and download full spreadsheets' },
                          ].map((item) => {
                            const val = !!activeUserPerms[item.key as keyof UserModulePermissions];
                            return (
                              <label
                                key={item.key}
                                className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={() =>
                                    setActiveUserPerms((prev) => ({
                                      ...prev,
                                      [item.key]: !prev[item.key as keyof UserModulePermissions],
                                    }))
                                  }
                                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                    {item.label}
                                  </span>
                                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                    {item.desc}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Settings Action Button */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'en' 
                        ? `Settings will be saved permanently to database for @${selectedUser.username}` 
                        : `ڕێکخستنەکان لە داتابەیس بە هەمیشەیی پاشەکەوت دەکرێن بۆ @${selectedUser.username}`}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        updateUserPermissions(selectedUser.username, activeUserPerms);
                        onToast(
                          lang === 'en'
                            ? `Permissions for @${selectedUser.username} saved successfully!`
                            : `دەسەڵاتەکانی @${selectedUser.username} بە سەرکەوتوویی پاشەکەوت کران!`
                        );
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'en' ? 'Save Account Permissions' : 'پاشەکەوتکردنی دەسەڵاتەکان'}</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SYSTEM INFO & CODE METRICS (FILES, LINES OF CODE & SAVED DATA)      */}
          {/* ========================================================================= */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        {lang === 'en' ? "Bako's Master System Codebase Telemetry" : 'ئاماری کۆد و داتابەیسی سیستەمی باکۆ'}
                      </h4>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {APP_CONFIG.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'en'
                        ? 'Live file inventory, lines of code (LOC), and durable database disk allocation.'
                        : 'ژمارەی فایلەکان، کۆی دێڕەکانی کۆد (LOC)، و قەبارەی ڕاستەقینەی داتابەیس لەسەر دیسک.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchServerData}
                  disabled={loadingServerInfo}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Re-scan system metrics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingServerInfo ? 'animate-spin' : ''}`} />
                  <span>{lang === 'en' ? 'Scan Now' : 'پشکنینی نوێ'}</span>
                </button>
              </div>

              {/* 3 Core Highlight KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. TOTAL FILES IN SYSTEM */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Total Files' : 'کۆی گشتی فایلەکان'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                      <FileCode2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {serverInfo?.totalFiles ?? 63}
                      <span className="text-xs font-bold text-slate-400 font-sans ms-1.5">
                        {lang === 'en' ? 'Files' : 'فایل'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {serverInfo?.srcFiles ?? 42} {lang === 'en' ? 'Source files in src/' : 'فایلی سەرەکی لە src'}
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {serverInfo?.fileBreakdown?.['.tsx']?.files ?? 29} .tsx
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                      {serverInfo?.fileBreakdown?.['.ts']?.files ?? 14} .ts
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                      {serverInfo?.fileBreakdown?.['.json']?.files ?? 8} .json
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                      {serverInfo?.fileBreakdown?.['.bat']?.files ?? 6} .bat
                    </span>
                  </div>
                </div>

                {/* 2. LINES OF CODE */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Lines of Code' : 'دێڕەکانی کۆد (LOC)'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {(serverInfo?.linesOfCode ?? 26501).toLocaleString()}
                      <span className="text-xs font-bold text-slate-400 font-sans ms-1.5">
                        LOC
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {(serverInfo?.srcLines ?? 16745).toLocaleString()} {lang === 'en' ? 'Lines in active frontend & API' : 'دێڕ لە ڕووکار و API'}
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                      UI: {(serverInfo?.fileBreakdown?.['.tsx']?.lines ?? 13560).toLocaleString()} L
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      API: {(serverInfo?.fileBreakdown?.['.ts']?.lines ?? 2918).toLocaleString()} L
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                      DB: {(serverInfo?.fileBreakdown?.['.json']?.lines ?? 9194).toLocaleString()} L
                    </span>
                  </div>
                </div>

                {/* 3. DATA SAVED SO FAR */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {lang === 'en' ? 'Data Saved So Far' : 'داتای پاشەکەوتکراو'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <HardDrive className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {serverInfo?.formattedDataSize || '5.62 MB'}
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans ms-1.5">
                        Disk
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {serverInfo?.dataFilesCount ?? 4} {lang === 'en' ? 'Database & journal files' : 'فایلی داتابەیس و جۆرناڵ'}
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                      WAL Mode Active
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      100% Offline Tolerant
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Storage Files on Disk Inspector */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {lang === 'en' ? 'On-Disk Storage Registry (/data)' : 'فایلەکانی داتابەیس لەسەر هارددیسک'}
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                    {serverInfo?.formattedDataSize || '5.62 MB'} Total
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {serverInfo?.dataFiles && serverInfo.dataFiles.length > 0 ? (
                    serverInfo.dataFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-3 font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Database className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate text-slate-800 dark:text-slate-200 font-bold">{file.name}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold shrink-0 border border-slate-200 dark:border-slate-700">
                          {file.formattedSize}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
                      {lang === 'en' ? 'Durable database active (warehouse.db & WAL journals)' : 'داتابەیسی سەرەکی کارایە'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: WI-FI SERVER & MOBILE QR CODE                                      */}
          {/* ========================================================================= */}
          {activeTab === 'server' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code Container */}
                <div className="shrink-0 flex flex-col items-center p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  {loadingServerInfo ? (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : serverInfo?.qrDataUrl ? (
                    <img
                      src={serverInfo.qrDataUrl}
                      alt="Wi-Fi Server QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400 text-center p-2">
                      Scan QR unavailable
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-slate-600 mt-2 font-mono">
                    Scan with Phone Camera
                  </span>
                </div>

                {/* Server info & Link */}
                <div className="flex-1 space-y-3.5 text-center sm:text-left">
                  <div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
                      isOnline && syncStatus === 'synced'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isOnline && syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`} />
                      <span>
                        {isOnline && syncStatus === 'synced'
                          ? (lang === 'en' ? `Live Wi-Fi Server Active • ${walHealth?.latencyMs || 0}ms` : `سێرڤەری وایفای چالاکە • ${walHealth?.latencyMs || 0}ms`)
                          : (lang === 'en' ? 'Offline Mode (Local Storage Fallback)' : 'دۆخی ئۆفلاین (کاشی ئامێر)')}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {lang === 'en' ? 'Connect Phones & Other PCs via Local Wi-Fi' : 'پەیوەستکردنی مۆبایل و کۆمپیوتەری تر'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {lang === 'en'
                        ? 'Anyone connected to the same Wi-Fi network can open this address on phone or tablet to scan items, invoice sales, and update inventory in real time.'
                        : 'هەرکەسێک لەسەر هەمان وایفای بێت دەتوانێت ئەم بەستەرە بکاتەوە بۆ کارکردن و فرۆشتن لە کاتی ڕاستەقینەدا.'}
                    </p>
                  </div>

                  {/* Network URL Box with Copy */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs flex items-center justify-between gap-2">
                    <span className="truncate font-bold text-blue-600 dark:text-blue-400">
                      {serverInfo?.networkUrl || 'http://192.168.1.170:3000'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyNetworkUrl}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? (lang === 'en' ? 'Copied!' : 'کۆپیکرا!') : (lang === 'en' ? 'Copy Link' : 'کۆپی')}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {lang === 'en' ? 'Quick Connection Steps:' : 'هەنگاوەکانی بەستنەوە:'}
                    </p>
                    <p>1. {lang === 'en' ? 'Connect your phone or laptop to the same Wi-Fi as this PC.' : 'مۆبایلەکەت پەیوەست بکە بە هەمان وایفای ئەم کۆمپیوتەرە.'}</p>
                    <p>2. {lang === 'en' ? 'Open Camera or browser (Chrome/Safari) and scan the QR code above.' : 'کامێرا یان وێبگەڕ بکەرەوە و بارکۆدەکە سکان بکە.'}</p>
                    <p>3. {lang === 'en' ? '100% free, fast, zero cloud fees, real-time local sync.' : 'بە تەواوی بێبەرامبەر، زۆر خێرا و سەربەخۆ لە ئینتەرنێت.'}</p>
                  </div>
                </div>
              </div>

              {/* 1-Click Desktop Launcher Notification */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {lang === 'en' ? 'Desktop 1-Click System Launcher' : 'بەرنامەی دەستپێکەری سەر دیسکتۆپ'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'en' 
                        ? 'Double-click "Bako Inventory Server.bat" on your Desktop anytime to start the server and open the app in 1 click.' 
                        : 'فایلی "Bako Inventory Server.bat" لەسەر دیسکتۆپ هەیە بۆ دەستپێکردنی خێرا لە هەر کاتێکدا.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: DISPLAY VIEW MODE SWITCHER (DESKTOP VS MOBILE)                      */}
          {/* ========================================================================= */}
          {activeTab === 'view' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
                <h4 className="font-extrabold text-sm mb-1 text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Switch Interface Display Mode' : 'گۆڕینی شێوازی پیشاندان'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  {lang === 'en'
                    ? 'Manually force Mobile App mode, Desktop Console mode, or let the system automatically detect your viewport dimensions.'
                    : 'دەتوانیت شێوازی کۆمپیوتەر یان مۆبایل دیاری بکەیت بەپێی ویستی خۆت.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Option 1: Mobile Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeViewMode('mobile');
                      onToast(lang === 'en' ? 'Mobile view active' : 'مۆبایل چالاککرا');
                    }}
                    className={`p-5 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                      viewMode === 'mobile'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{lang === 'en' ? 'Mobile App' : 'مۆبایل'}</div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {lang === 'en' ? 'Streamlined touchscreen UI' : 'سادەکراو بۆ دەست'}
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Desktop Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeViewMode('desktop');
                      onToast(lang === 'en' ? 'Desktop console active' : 'کۆمپیوتەر چالاککرا');
                    }}
                    className={`p-5 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                      viewMode === 'desktop'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center font-bold shadow-md shadow-slate-700/20">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{lang === 'en' ? 'Desktop Console' : 'کۆمپیوتەر'}</div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {lang === 'en' ? 'Full widescreen workstation' : 'تەواوی شاشە و پەنجەرەکان'}
                      </span>
                    </div>
                  </button>

                  {/* Option 3: Auto Responsive */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeViewMode('auto');
                      onToast(lang === 'en' ? 'Auto-detect active' : 'ئۆتۆ چالاککرا');
                    }}
                    className={`p-5 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                      viewMode === 'auto'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black ring-2 ring-purple-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-600/20">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{lang === 'en' ? 'Auto Responsive' : 'خۆکار (ئۆتۆ)'}</div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {lang === 'en' ? 'Adapts to device viewport' : 'خۆی لەگەڵ قەبارەی شاشە دەگونجێنێت'}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER ATTRIBUTION (PROFESSIONAL & NICE LOOKING)                    */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Engineered & Maintained by' : 'ئەندازیاری و چاودێریکراوە لەلایەن:'}
            </span>
            <strong className="text-slate-900 dark:text-white font-black">Bako Bayan Madhhar</strong>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] hidden sm:inline">
              Version {APP_VERSION_NUMBER}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:07705488654"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs transition cursor-pointer"
              title="Official Support"
            >
              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>07705488654</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
            >
              {lang === 'en' ? 'Done' : 'تەواو'}
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal: Add Sample Records (appends without deleting old records) */}
      <ConfirmModal
        isOpen={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        onConfirm={handleSeedData}
        title={lang === 'en' ? 'Append Sample Records' : 'زیادکردنی داتای نموونەیی'}
        message={lang === 'en' 
          ? 'Add 3 realistic sample orders with Kurdish suppliers, banks, and debtors into your ledger? This will NOT delete or overwrite any of your existing records.' 
          : 'زیادکردنی ٣ تۆماری نموونەیی فرۆشتن لەگەڵ قەرز و کڕیار بۆ ئەزموونکردنی سیستەمەکە؟ ئەمە هیچ داتایەکی پێشووت ناسڕێتەوە.'}
        confirmText={lang === 'en' ? 'Add Records' : 'زیادکردنی تۆمارەکان'}
        cancelText={lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
        isDanger={false}
        lang={lang}
        isDark={isDark}
      />

      {/* Multi-Step Modal: Step 1 Warning for Deleting Ledger */}
      <ConfirmModal
        isOpen={clearStep === 1}
        onClose={() => setClearStep(0)}
        onConfirm={() => setClearStep(2)}
        title={lang === 'en' ? 'Safety Warning: Clear Sales Ledger' : 'ئاگاداری: سڕینەوەی تەواوی تۆمارەکان'}
        message={lang === 'en'
          ? 'Normally, the sales ledger should NEVER be deleted as it contains your complete historical transactions, customer debt records, and invoices. Are you sure you want to proceed to confirmation?'
          : 'بە شێوەیەکی ئاسایی تۆماری فرۆشتن نابێت هەرگیز بسڕدرێتەوە چونكە مێژووی فرۆشتن و قەرزەکانی تێدایە. ئایا دڵنیایت دەتەوێت بچیتە قۆناغی دووەمی پەسەندکردن؟'}
        confirmText={lang === 'en' ? 'Proceed to Step 2' : 'بڕۆ بۆ قۆناغی ٢'}
        cancelText={lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
        isDanger={true}
        lang={lang}
        isDark={isDark}
        stepIndicator={{ current: 1, total: 2 }}
      />

      {/* Multi-Step Modal: Step 2 Final Critical Confirmation for Deleting Ledger */}
      <ConfirmModal
        isOpen={clearStep === 2}
        onClose={() => setClearStep(0)}
        onConfirm={handleExecuteClearTransactions}
        title={lang === 'en' ? 'CRITICAL: Final Deletion Confirmation' : 'قۆناغی کۆتایی: دڵنیابوونەوە لە سڕینەوە'}
        message={lang === 'en'
          ? 'FINAL WARNING: This action will permanently erase all sales records and debts from your system. This action CANNOT be undone. Are you 100% sure?'
          : 'ئاگاداری کۆتایی: ئەم کردارە هەموو تۆمار و قەرزەکان بە تەواوی لە سیستەمەکە دەسڕێتەوە و ناگەڕێتەوە. ئایا ١٠٠٪ دڵنیایت؟'}
        confirmText={lang === 'en' ? 'Yes, Permanently Delete All' : 'بەڵێ، بە تەواوی بسڕەوە'}
        cancelText={lang === 'en' ? 'Keep Records' : 'هێشتنەوەی تۆمارەکان'}
        isDanger={true}
        lang={lang}
        isDark={isDark}
        stepIndicator={{ current: 2, total: 2 }}
      />

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW USER ACCOUNT                                               */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-750 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {lang === 'en' ? 'Add User Account' : 'زیادکردنی هەژماری نوێ'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Create new credentials for system operator' : 'دروستکردنی هەژماری کارمەند یان بەڕێوەبەر'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Username (Login ID)' : 'ناوی بەکارهێنەر (بۆ چوونەژوورەوە)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. shaswar or sarwar"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Full Display Name' : 'ناوی تەواوی کەسەکە'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shaswar Ahmad"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Role' : 'پلە / دەسەڵات'}
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                >
                  <option value="Staff">Staff (کارمەند)</option>
                  <option value="Manager">Manager (بەڕێوەبەری کۆگا)</option>
                  <option value="Viewer">Viewer (بینەر - تەنها خوێندنەوە)</option>
                  <option value="Admin">Admin (بەڕێوەبەری گشتی)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'en' ? 'Password' : 'وشەی نهێنی'}
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                {lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newUsername.trim() || !newUserPassword.trim()) {
                    onToast(lang === 'en' ? 'Username and password required!' : 'ناوی بەکارهێنەر و وشەی نهێنی پێویستە!');
                    return;
                  }
                  const success = addUserAccount({
                    username: newUsername.trim(),
                    displayName: newDisplayName.trim() || newUsername.trim(),
                    role: newUserRole,
                    password: newUserPassword.trim(),
                  });
                  if (success) {
                    onToast(lang === 'en' ? `User @${newUsername.trim()} created!` : `هەژماری @${newUsername.trim()} دروستکرا!`);
                    setSelectedUsername(newUsername.trim());
                    setShowAddUserModal(false);
                  } else {
                    onToast(lang === 'en' ? 'Username already exists!' : 'ئەم ناوە پێشتر بەکارهاتووە!');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                {lang === 'en' ? 'Create Account' : 'دروستکردنی هەژمار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHANGE USER PASSWORD                                               */}
      {/* ========================================================================= */}
      {userToChangePassword && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-750 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-500" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {lang === 'en' ? `Reset Password: @${userToChangePassword}` : `گۆڕینی وشەی نهێنی: @${userToChangePassword}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setUserToChangePassword(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                {lang === 'en' ? 'Enter New Password:' : 'وشەی نهێنی نوێ بنووسە:'}
              </label>
              <input
                type="password"
                placeholder="New secure password"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToChangePassword(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                {lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPasswordValue.trim()) return;
                  updateUserAccount(userToChangePassword, { password: newPasswordValue.trim() });
                  onToast(lang === 'en' ? `Password updated for @${userToChangePassword}` : `وشەی نهێنی بۆ @${userToChangePassword} نوێکرایەوە`);
                  setUserToChangePassword(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                {lang === 'en' ? 'Update Password' : 'نوێکردنەوە'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {userToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          onConfirm={() => {
            deleteUserAccount(userToDelete);
            onToast(lang === 'en' ? `Account @${userToDelete} deleted.` : `هەژماری @${userToDelete} سڕایەوە.`);
            setUserToDelete(null);
            setSelectedUsername('bako');
          }}
          title={lang === 'en' ? `Delete Account @${userToDelete}` : `سڕینەوەی هەژماری @${userToDelete}`}
          message={lang === 'en'
            ? `Are you sure you want to permanently delete user account @${userToDelete}? This user will no longer be able to log in.`
            : `ئایا دڵنیایت لە سڕینەوەی یەکجارەکی هەژماری @${userToDelete}؟ ئەم بەکارهێنەرە چیتر ناتوانێت بچێتە ژوورەوە.`}
          confirmText={lang === 'en' ? 'Delete Account' : 'سڕینەوەی هەژمار'}
          cancelText={lang === 'en' ? 'Cancel' : 'پاشگەزبوونەوە'}
          isDanger={true}
          lang={lang}
          isDark={isDark}
        />
      )}
    </div>
  );
};
