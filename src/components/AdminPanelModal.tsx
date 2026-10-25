'use client';

import { APP_CONFIG } from '@/config/appConfig';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  useInventory,
  ROLE_PRESETS,
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
  RolePresetName,
  UserAccount,
} from '@/types/inventory';
import type { MigrationAuditSummary, MigrationCommitResult } from '@/lib/importer';
import {
  UploadCloud,
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
  ChevronDown,
  ChevronUp,
  TrendingUp,
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
  danger?: boolean;
}> = ({ checked, onChange, disabled, label, description, badge, highlight, danger }) => (
  <div
    onClick={() => !disabled && onChange(!checked)}
    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all select-none ${
      disabled
        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
        : checked
        ? danger
          ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/40 hover:border-rose-500/60 cursor-pointer shadow-xs'
          : highlight
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
                ? danger
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
                  : highlight
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
        checked ? (danger ? 'bg-rose-600' : highlight ? 'bg-amber-500' : 'bg-emerald-600') : 'bg-slate-300 dark:bg-slate-700'
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


interface PresetCardDef {
  id: RolePresetName;
  role: UserRole;
  titleEn: string;
  titleKu: string;
  descEn: string;
  descKu: string;
  badge: string;
  color: string;
  summary: { text: string; allowed: boolean }[];
}

const ROLE_PRESET_CARDS: PresetCardDef[] = [
  {
    id: 'Super Admin',
    role: 'Admin',
    titleEn: 'Super Admin',
    titleKu: 'بەڕێوەبەری باڵا',
    descEn: 'Full executive control across all divisions & databases',
    descKu: 'دەسەڵاتی بێ سنوور لەسەرجەم بەشەکان و داتابەیس',
    badge: 'Executive',
    color: 'emerald',
    summary: [
      { text: '✓ Full System Control & Settings', allowed: true },
      { text: '✓ Financial & Workshop Analytics', allowed: true },
      { text: '✓ Create, Edit, Delete & Restore All', allowed: true },
      { text: '✓ Database Backups & Vault Maintenance', allowed: true },
    ],
  },
  {
    id: 'Accountant',
    role: 'Staff',
    titleEn: 'Accountant',
    titleKu: 'ژمێریاری دارایی',
    descEn: 'Sales POS, receipts, customer debt & multi-currency billing',
    descKu: 'فرۆشتن، پسوولە، قەرزی کڕیاران و دراوەکان',
    badge: 'Finance',
    color: 'sky',
    summary: [
      { text: '✓ POS Invoices, Billing & Receipts', allowed: true },
      { text: '✓ Multi-Currency & Debt Ledgers', allowed: true },
      { text: '✓ Financial Analytics & Revenue Trends', allowed: true },
      { text: '✕ Cannot Delete Wood Panels', allowed: false },
      { text: '✕ No Database Engine Administration', allowed: false },
    ],
  },
  {
    id: 'Sales Representative',
    role: 'Staff',
    titleEn: 'Sales Representative',
    titleKu: 'نوێنەری فرۆشتن',
    descEn: 'POS checkout & customer cutting order booking',
    descKu: 'تۆمارکردنی فرۆشتن و داواکاری کڕیاران',
    badge: 'Commercial',
    color: 'indigo',
    summary: [
      { text: '✓ POS Sales Checkout & Invoices', allowed: true },
      { text: '✓ Book Client Cutting Orders', allowed: true },
      { text: '✕ No Financial Analytics or Margins', allowed: false },
      { text: '✕ Cannot Delete Orders or Materials', allowed: false },
      { text: '✕ General Stock Numbers Shielded', allowed: false },
    ],
  },
  {
    id: 'Workshop Floor',
    role: 'Staff',
    titleEn: 'Machine Operator',
    titleKu: 'وەستای بڕینی کارگە',
    descEn: 'Factory wood dimensions, cutting queue & slip printing',
    descKu: 'ئەندازەی تەختە، تەواوکردنی بڕین و چاپکردنی پسوڵە',
    badge: 'Workshop',
    color: 'amber',
    summary: [
      { text: '✓ Wood Panels & Cut Specifications', allowed: true },
      { text: '✓ Finalize Workshop Cutting Queue', allowed: true },
      { text: '✓ Print Factory Cutting Slips', allowed: true },
      { text: '✓ Workshop Yield & Queue Analytics', allowed: true },
      { text: '✕ No Sales POS or Pricing Visibility', allowed: false },
      { text: '✕ No Financial Charts Access', allowed: false },
    ],
  },
  {
    id: 'Read-Only Viewer',
    role: 'Viewer',
    titleEn: 'Read-Only Viewer',
    titleKu: 'بینەری سنووردار',
    descEn: 'Safe inspection without modification or delete privileges',
    descKu: 'تەنها سەیرکردنی سەلامەت بەبێ دەستکاری یان سڕینەوە',
    badge: 'View-Only',
    color: 'slate',
    summary: [
      { text: '✓ Safe Read-Only Catalog View', allowed: true },
      { text: '✕ Cannot Create or Modify Any Data', allowed: false },
      { text: '✕ Cannot Delete Anything', allowed: false },
      { text: '✕ Confidential Financial Numbers Shielded', allowed: false },
      { text: '✕ All Visual Analytics Charts Blocked', allowed: false },
    ],
  },
];

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
  const [showCustomTuning, setShowCustomTuning] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<RolePresetName>('Super Admin');

  const [restoreConfirmSnapshot, setRestoreConfirmSnapshot] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

  // Legacy Migration Engine State
  const [migrationFile, setMigrationFile] = useState<File | null>(null);
  const [isDraggingMigration, setIsDraggingMigration] = useState(false);
  const [migrationParsing, setMigrationParsing] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationAuditSummary | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationCommitting, setMigrationCommitting] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationCommitResult | null>(null);
  const [migrationPreviewTab, setMigrationPreviewTab] = useState<'materials' | 'shipments' | 'invoices'>('materials');
  const migrationFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Legacy Migration Engine Handlers
  const handleSelectMigrationFile = async (file: File) => {
    setMigrationFile(file);
    setMigrationSummary(null);
    setMigrationResult(null);
    setMigrationParsing(true);
    setShowMigrationModal(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');
      formData.append('actor', currentUser?.displayName || currentUser?.username || 'Super Admin');

      const res = await fetch('/api/migrate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data && data.success && data.summary) {
        setMigrationSummary(data.summary);
      } else {
        onToast(data?.error || (lang === 'en' ? 'Failed to parse legacy file' : 'نەتوانرا فایلی داتای کۆن بخوێنرێتەوە'));
      }
    } catch {
      onToast(lang === 'en' ? 'Error scanning legacy file' : 'هەڵە لە پشکنینی فایلی کۆن');
    } finally {
      setMigrationParsing(false);
    }
  };

  const handleCommitMigration = async () => {
    if (!migrationFile) return;
    setMigrationCommitting(true);

    try {
      const formData = new FormData();
      formData.append('file', migrationFile);
      formData.append('action', 'commit');
      formData.append('actor', currentUser?.displayName || currentUser?.username || 'Super Admin');

      const res = await fetch('/api/migrate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data && data.success && data.result) {
        setMigrationResult(data.result);
        fetchBackupsInfo();
        onToast(
          lang === 'en'
            ? 'Legacy data absorbed and integrated successfully!'
            : 'داتای کۆن بە سەرکەوتوویی تێکەڵ بە سیستەم کرا!'
        );
      } else {
        onToast(data?.error || (lang === 'en' ? 'Migration transaction failed' : 'تێکەڵکردنی داتا سەرکەوتوو نەبوو'));
      }
    } catch {
      onToast(lang === 'en' ? 'Error executing migration transaction' : 'هەڵە لە جێبەجێکردنی هاوردەکردن');
    } finally {
      setMigrationCommitting(false);
    }
  };

  const handleClearMigration = () => {
    setMigrationFile(null);
    setMigrationSummary(null);
    setMigrationResult(null);
    setShowMigrationModal(false);
    if (migrationFileInputRef.current) {
      migrationFileInputRef.current.value = '';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 overflow-hidden select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden box-border">
        
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">

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

                  {/* 5 PROMINENT ROLE PRESET CARDS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span>{lang === 'en' ? 'Select Operational Role Preset:' : 'هەڵبژاردنی پلە و ڕۆڵی بەکارهێنەر:'}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {lang === 'en' ? 'Click to apply instant baseline' : 'کلیک بکە بۆ دیاریکردنی خێرا'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {ROLE_PRESET_CARDS.map((preset) => {
                        const isSelected = selectedPresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedPresetId(preset.id);
                              setActiveUserPerms({
                                ...ROLE_PRESETS[preset.id],
                                canViewRestrictedMetrics: preset.id === 'Super Admin' || preset.id === 'Accountant',
                              });
                              onToast(
                                lang === 'en'
                                  ? `Applied "${preset.titleEn}" baseline. Click "Save Account Permissions" to commit.`
                                  : `داڕشتەی "${preset.titleKu}" دیاریکرا. پاشەکەوت بکە بۆ جێبەجێکردن.`
                              );
                            }}
                            className={`relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[110px] ${
                              isSelected
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-black text-slate-900 dark:text-white block">
                                  {lang === 'en' ? preset.titleEn : preset.titleKu}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {lang === 'en' ? preset.titleKu : preset.titleEn}
                                </span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-750 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {preset.badge}
                              </span>
                            </div>

                            <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-tight">
                              {lang === 'en' ? preset.descEn : preset.descKu}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACTIVE PRESET CAPABILITIES SUMMARY CLUSTER */}
                  {(() => {
                    const activePreset = ROLE_PRESET_CARDS.find((p) => p.id === selectedPresetId) || ROLE_PRESET_CARDS[0];
                    return (
                      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{lang === 'en' ? 'Active Role Capabilities & Access Envelope:' : 'دەسەڵات و سنووری چالاکی ئەم داڕشتەیە:'}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {lang === 'en' ? activePreset.titleEn : activePreset.titleKu}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activePreset.summary.map((item, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                                item.allowed
                                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                                  : 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                              }`}
                            >
                              {item.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* COLLAPSIBLE FINE-TUNING & GRANULAR OVERRIDES ACCORDION */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-850 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setShowCustomTuning((prev) => !prev)}
                      className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {lang === 'en' ? 'Custom Fine-Tuning & Granular Overrides' : 'دەستکاریکردنی وردی دەسەڵاتەکان (Fine-Tuning)'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {lang === 'en'
                              ? 'Override individual module permissions, deletion rights & metric masking'
                              : 'دەستکاری تایبەت بە هەر بەشێک، سڕینەوە، دەرکردنی داتا و قوفڵی ژمارەکان'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>{showCustomTuning ? (lang === 'en' ? 'Hide Details' : 'شاردنەوە') : (lang === 'en' ? 'Configure Overrides' : 'دەستکاریکردن')}</span>
                        {showCustomTuning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {showCustomTuning && (
                      <div className="p-4 sm:p-5 space-y-5 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                        {/* Confidential Numbers & Financials Privacy Protection */}
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
                                label="View Wood Panels Catalog"
                                description="Access materials list, stock balances and active reservation queues"
                                checked={!!activeUserPerms.canViewPanels}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canViewPanels: val }))}
                              />
                              <ToggleSwitch
                                label="Create & Add Materials"
                                description="Can add new wood panels, sheet codes, finishes and dimensions"
                                checked={!!activeUserPerms.canCreatePanels}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canCreatePanels: val }))}
                              />
                              <ToggleSwitch
                                label="Edit Panel Details & Stock"
                                description="Modify dimensions, descriptions, images and manual stock count"
                                checked={!!activeUserPerms.canEditPanels}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canEditPanels: val }))}
                              />
                              <ToggleSwitch
                                danger
                                label="Permanent Panel Deletion"
                                description="Delete materials and historical cuts permanently from SQLite"
                                checked={!!activeUserPerms.canDeletePanels}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canDeletePanels: val }))}
                              />
                            </div>
                          </div>

                          {/* Division 2: Sales POS */}
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                              <ReceiptText className="w-4 h-4 text-sky-600" />
                              <span>{lang === 'en' ? 'Division 02: Sales POS & Invoices' : 'بەشی دووەم: فرۆشتن و دارایی'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <ToggleSwitch
                                label="View Transactions Ledger"
                                description="View POS sales history, transaction receipts, debts and customer balances"
                                checked={!!activeUserPerms.canViewSales}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canViewSales: val }))}
                              />
                              <ToggleSwitch
                                label="Process POS Sales Checkout"
                                description="Create invoices, record payments, apply discounts and print receipts"
                                checked={!!activeUserPerms.canCreateSales}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canCreateSales: val }))}
                              />
                              <ToggleSwitch
                                label="Edit Invoices & Payment Ledger"
                                description="Modify past sales receipts, add installments, and update client debt balances"
                                checked={!!activeUserPerms.canEditSales}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canEditSales: val }))}
                              />
                              <ToggleSwitch
                                danger
                                label="Delete Sales Transactions"
                                description="Permanently delete financial records and receipts from the database"
                                checked={!!activeUserPerms.canDeleteSales}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canDeleteSales: val }))}
                              />
                            </div>
                          </div>

                          {/* Division 3: Warehouse Goods */}
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                              <Boxes className="w-4 h-4 text-amber-600" />
                              <span>{lang === 'en' ? 'Division 03: Warehouse Hardware Goods & Logistics' : 'بەشی سێیەم: کەلوپەلی کۆگا'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <ToggleSwitch
                                label="View Warehouse Stock"
                                description="Access hardware fittings, SKUs, inventory bins, and warehouse locations"
                                checked={!!activeUserPerms.canViewWarehouse}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canViewWarehouse: val }))}
                              />
                              <ToggleSwitch
                                label="Manage Inbound Shipments"
                                description="Receive purchase orders, verify supplier containers, and record manifests"
                                checked={!!activeUserPerms.canManageShipments}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canManageShipments: val }))}
                              />
                              <ToggleSwitch
                                label="Manage Stock Levels & Adjustments"
                                description="Record physical stock counts, location transfers, and write-offs"
                                checked={!!activeUserPerms.canManageStock}
                                onChange={(val) => setActiveUserPerms((prev) => ({ ...prev, canManageStock: val }))}
                              />
                            </div>
                          </div>

                          {/* Executive Analytics & BI Gating */}
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                              <BarChart3 className="w-4 h-4 text-purple-600" />
                              <span>{lang === 'en' ? 'Division 04: Visual Charts & Analytics Gating' : 'بەشی چوارەم: شیکاری چارتەکان'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <ToggleSwitch
                                label="Financial Analytics Access"
                                description="Exposes profit margins, revenue graphs, customer debt ranking, & transaction turnover"
                                checked={!!activeUserPerms.canViewFinancialAnalytics}
                                onChange={(val) =>
                                  setActiveUserPerms((prev) => ({ ...prev, canViewFinancialAnalytics: val }))
                                }
                              />
                              <ToggleSwitch
                                label="Workshop Analytics Access"
                                description="Exposes cutting queue efficiency, sheet allocation, board yield & stock distribution"
                                checked={!!activeUserPerms.canViewWorkshopAnalytics}
                                onChange={(val) =>
                                  setActiveUserPerms((prev) => ({ ...prev, canViewWorkshopAnalytics: val }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                      <span>{lang === 'en' ? 'Physical Flash Drive' : 'کۆپی بۆ فلاش (USB)'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {usbDrives.length > 0
                        ? `Detected: ${usbDrives.join(', ')}`
                        : lang === 'en'
                        ? 'Auto-detects USB flash drives (E:\\, F:\\) for 1-click physical offsite vaulting.'
                        : 'دەستنیشانکردنی خۆکاری فلاش بۆ پاراستنی دەرەکی داتابەیس.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isExportingUsb}
                    onClick={() => handleExportUsb(usbDrives[0])}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Usb className={`w-4 h-4 ${isExportingUsb ? 'animate-pulse' : ''}`} />
                    <span>{isExportingUsb ? 'Copying...' : lang === 'en' ? 'Export to USB' : 'کۆپی بۆ فلاش (USB)'}</span>
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

              {/* ======================================================================= */}
              {/* LEGACY DATA INGESTION & MIGRATION ENGINE (EAT & ABSORB LEGACY DATA)    */}
              {/* ======================================================================= */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {lang === 'en' ? 'Legacy Database Migration & Ingestion' : 'هاوردەکردنی داتای کۆن'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {lang === 'en' ? 'Eat & Absorb' : 'هەڵمژین و تێکەڵکردن'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {lang === 'en' ? 'Atomic Safe Snapshot' : 'باکئەپی سەلامەتی ئۆتۆماتیکی'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang === 'en'
                          ? 'Absorb legacy business records (.sqlite, .db, .json, .csv) into the v1.5 SQLite schema with zero risk to admin accounts.'
                          : 'هەڵمژین و تێکەڵکردنی تۆمارەکانی سیستەمی کۆن (SQLite, DB, JSON, CSV) بۆ ناو سیستەمی نوێ بە شێوازێکی تەواو پارێزراو.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Upload Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingMigration(true);
                  }}
                  onDragLeave={() => setIsDraggingMigration(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingMigration(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleSelectMigrationFile(file);
                  }}
                  onClick={() => migrationFileInputRef.current?.click()}
                  className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                    isDraggingMigration
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 scale-[0.99]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-purple-50/20'
                  }`}
                >
                  <input
                    type="file"
                    ref={migrationFileInputRef}
                    accept=".sqlite,.db,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSelectMigrationFile(file);
                    }}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'en'
                        ? 'Drag & drop legacy database file here, or click to browse'
                        : 'فایلی داتابەیسی کۆن لێرە دابنێ یان کلیک بکە بۆ دیاریکردن'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'en'
                        ? 'Wood Panels Catalog • FunderMax Shipments & Payables • Customer Invoices & Directory'
                        : 'کەتەلۆکی تەختە و مەواد • کاروان و پارەی فاندەرمەکس • پسوولە و قەرزی کڕیاران'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      .SQLITE
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      .DB
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      .JSON
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      .CSV
                    </span>
                  </div>
                </div>

                {/* Pre-Import Safety Guarantee Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      {lang === 'en' ? 'Pre-import safety snapshot (pre-import-*.sqlite.gz)' : 'وێنەی سەلامەتی پێشوەختە (pre-import-*.sqlite.gz)'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      {lang === 'en' ? 'Float-safe sanitization (IQD integers, USD 2 decimals)' : 'ژمێریاری پارێزراو (دینار بێ کەرت، دۆلار بە دوو کەرت)'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      {lang === 'en' ? 'Non-destructive: Zero admin or password changes' : 'پارێزراوە: هیچ دەستکاری هەژماری بەڕێوەبەر ناکات'}
                    </span>
                  </div>
                </div>
              </div>

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

      {/* ======================================================================= */}
      {/* DRY-RUN MIGRATION INSPECTION PREVIEW MODAL                              */}
      {/* ======================================================================= */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200 select-none">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{lang === 'en' ? 'Legacy Migration Inspection Audit' : 'پشکنینی داتای کۆن پێش هاوردەکردن'}</span>
                    {migrationSummary && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {migrationSummary.format}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {migrationFile ? `${migrationFile.name} (${Math.round(migrationFile.size / 1024)} KB)` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearMigration}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Scanning / In-Progress Animation */}
              {migrationParsing && (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'en' ? 'Inspecting legacy file structure...' : 'پشکنین و شیتاڵکردنی فایلی داتابەیسی کۆن...'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md">
                    {lang === 'en'
                      ? 'Verifying table schemas, wood dimensions, supplier balances, and currency precision.'
                      : 'خوێندنەوەی خشتەکانی تەختە، کاروانەکانی فاندەرمەکس، ژمارەی کڕیاران و دراوەکان.'}
                  </p>
                </div>
              )}

              {/* Migration Success Breakdown */}
              {migrationResult && (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black">
                        {lang === 'en' ? 'Legacy Data Ingested & Integrated!' : 'هاوردەکردن و تێکەڵکردن بە سەرکەوتوویی ئەنجامدرا!'}
                      </h5>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {lang === 'en'
                          ? `Processed in ${migrationResult.durationMs}ms inside an atomic SQLite transaction.`
                          : `لە ماوەی ${migrationResult.durationMs}ms بە شێوازی ئەتۆمی جێبەجێکرا.`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                      <span className="text-[10px] text-slate-400 block">{lang === 'en' ? 'Materials Added' : 'مەوادی نوێ'}</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        +{migrationResult.importedCounts.materialsInserted}
                      </span>
                      {migrationResult.importedCounts.materialsUpdated > 0 && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ({migrationResult.importedCounts.materialsUpdated} updated)
                        </span>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                      <span className="text-[10px] text-slate-400 block">{lang === 'en' ? 'Shipments' : 'کاروانی کۆگا'}</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        +{migrationResult.importedCounts.shipmentsInserted}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                      <span className="text-[10px] text-slate-400 block">{lang === 'en' ? 'Invoices' : 'پسوولەی فرۆشتن'}</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        +{migrationResult.importedCounts.invoicesInserted}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20">
                      <span className="text-[10px] text-slate-400 block">{lang === 'en' ? 'Customers' : 'کڕیاری نوێ'}</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        +{migrationResult.importedCounts.customersAdded}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/30 text-xs font-mono flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Safety Snapshot: {migrationResult.snapshotName}</span>
                    </div>
                    <span className="shrink-0 font-bold text-[11px]">
                      {Math.round(migrationResult.snapshotSizeBytes / 1024)} KB
                    </span>
                  </div>
                </div>
              )}

              {/* Inspection Preview Summary */}
              {migrationSummary && !migrationResult && (
                <div className="space-y-4">
                  {/* KPI Detection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Materials */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-bold">{lang === 'en' ? 'Wood Panels Catalog' : 'کەتەلۆکی تەختە و مەواد'}</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {migrationSummary.totalMaterials}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'en' ? 'Panel dimensions, finishes, stock balances' : 'درێژی، پانی، ئەستووری، و باڵانسی مەخزەن'}
                      </p>
                    </div>

                    {/* Shipments & Payables */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                        <Truck className="w-4 h-4" />
                        <span className="text-xs font-bold">{lang === 'en' ? 'FunderMax / Shipments' : 'کاروانی کۆگا و فاندەرمەکس'}</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {migrationSummary.totalShipments}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {migrationSummary.totalFinancials.supplierPayablesEUR > 0
                          ? `Payable: €${migrationSummary.totalFinancials.supplierPayablesEUR.toLocaleString()} EUR`
                          : `Payable: $${migrationSummary.totalFinancials.supplierPayablesUSD.toLocaleString()} USD`}
                      </p>
                    </div>

                    {/* Customer Invoices */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <ReceiptText className="w-4 h-4" />
                        <span className="text-xs font-bold">{lang === 'en' ? 'Sales Invoices & Debt' : 'پسوولە و قەرزی کڕیاران'}</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {migrationSummary.totalInvoices}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'en'
                          ? `${migrationSummary.totalCustomers} Customer Contacts Detected`
                          : `${migrationSummary.totalCustomers} کڕیار تۆمار دەکرێت لە لیست`}
                      </p>
                    </div>
                  </div>

                  {/* Pre-Import Safety Snapshot Guarantee Banner */}
                  <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-500/30 text-purple-900 dark:text-purple-200 flex items-center gap-3 text-xs leading-relaxed">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <span className="font-bold block">
                        {lang === 'en' ? 'Safety Snapshot & Transaction Isolation Guarantee' : 'پارێزراوی تەواو لە ڕێگەی وێنەی سەلامەتی و ترانزاکشن'}
                      </span>
                      <span className="text-[11px] text-purple-700 dark:text-purple-300">
                        {lang === 'en'
                          ? 'An atomic backup (pre-import-<timestamp>.sqlite.gz) will be saved prior to writing. If any query fails, the entire transaction rolls back completely.'
                          : 'پێش دەستپێکردن وێنەیەکی پارێزراو بە ناوی pre-import دەگیرێت، و تەواوی کرداری هاوردەکردن لە یەک ترانزاکشندا بەڕێوەدەچێت بە گەرەنتی پاشگەزبوونەوە لەکاتی هەڵەدا.'}
                      </span>
                    </div>
                  </div>

                  {/* Sample Preview Tabs */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {lang === 'en' ? 'Audit Sample Preview:' : 'نموونەی داتا دۆزراوەکان:'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setMigrationPreviewTab('materials')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            migrationPreviewTab === 'materials'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Materials ({migrationSummary.sampleItems.materials.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setMigrationPreviewTab('shipments')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            migrationPreviewTab === 'shipments'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Shipments ({migrationSummary.sampleItems.shipments.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setMigrationPreviewTab('invoices')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            migrationPreviewTab === 'invoices'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          Invoices ({migrationSummary.sampleItems.invoices.length})
                        </button>
                      </div>
                    </div>

                    {/* Table: Materials */}
                    {migrationPreviewTab === 'materials' && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="p-2.5">Code</th>
                              <th className="p-2.5">Panel Name</th>
                              <th className="p-2.5">Dimensions (mm)</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5 text-right">Stock</th>
                              <th className="p-2.5 text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {migrationSummary.sampleItems.materials.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400">
                                  No material records found in this section
                                </td>
                              </tr>
                            ) : (
                              migrationSummary.sampleItems.materials.map((m, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                  <td className="p-2.5 font-mono text-[11px] text-slate-500">{m.code || 'Auto'}</td>
                                  <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{m.name}</td>
                                  <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                    {m.length} × {m.width} × {m.thickness}
                                  </td>
                                  <td className="p-2.5 text-slate-500">{m.type || 'MDF'}</td>
                                  <td className="p-2.5 text-right font-black text-emerald-600">{m.stockQuantity}</td>
                                  <td className="p-2.5 text-right font-mono">${m.unitPrice || 0}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Table: Shipments */}
                    {migrationPreviewTab === 'shipments' && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="p-2.5">Batch / Ref</th>
                              <th className="p-2.5">Supplier</th>
                              <th className="p-2.5">Currency</th>
                              <th className="p-2.5 text-right">Invoiced</th>
                              <th className="p-2.5 text-right">Paid</th>
                              <th className="p-2.5 text-right">Remaining Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {migrationSummary.sampleItems.shipments.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400">
                                  No supplier shipment records found in this section
                                </td>
                              </tr>
                            ) : (
                              migrationSummary.sampleItems.shipments.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                  <td className="p-2.5 font-mono text-[11px] text-sky-600 font-bold">{s.batchCode}</td>
                                  <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{s.supplier}</td>
                                  <td className="p-2.5 font-mono">{s.currency}</td>
                                  <td className="p-2.5 text-right font-mono">{s.invoicedTotal.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-600">{s.amountPaid.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                    {s.remainingBalance.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Table: Invoices */}
                    {migrationPreviewTab === 'invoices' && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="p-2.5">Client Name</th>
                              <th className="p-2.5">Phone</th>
                              <th className="p-2.5">Currency</th>
                              <th className="p-2.5 text-right">Total</th>
                              <th className="p-2.5 text-right">Paid</th>
                              <th className="p-2.5 text-right">Debt Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {migrationSummary.sampleItems.invoices.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400">
                                  No customer invoice records found in this section
                                </td>
                              </tr>
                            ) : (
                              migrationSummary.sampleItems.invoices.map((inv, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                                  <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{inv.clientName}</td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-500">{inv.clientPhone || '—'}</td>
                                  <td className="p-2.5 font-mono">{inv.currency}</td>
                                  <td className="p-2.5 text-right font-mono">{inv.sellingAmount.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-600">{inv.amountPaidNow.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                    {inv.amountOwed.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850/80">
              <button
                type="button"
                onClick={handleClearMigration}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {migrationResult ? (lang === 'en' ? 'Close' : 'داخستن') : lang === 'en' ? 'Cancel' : 'پەشیمانبوونەوە'}
              </button>

              {migrationResult ? (
                <button
                  type="button"
                  onClick={() => {
                    handleClearMigration();
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Reload System' : 'تەواو و نوێکردنەوەی سیستەم'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!migrationSummary || migrationCommitting || migrationParsing}
                  onClick={handleCommitMigration}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 active:scale-95 text-white font-black text-xs inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${migrationCommitting ? 'animate-spin' : ''}`} />
                  <span>
                    {migrationCommitting
                      ? lang === 'en'
                        ? 'Absorbing Legacy Data...'
                        : 'خەریکی تێکەڵکردنی داتاکانە...'
                      : lang === 'en'
                      ? 'Absorb & Integrate (1-Click)'
                      : 'هاوردەکردن و تێکەڵکردن'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelModal;
