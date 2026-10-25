'use client';

import React, { useState } from 'react';
import { useInventory } from '@/context/InventoryContext';
import {
  Shield,
  Clock,
  Search,
  Download,
  Database,
  RefreshCw,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  PackageCheck,
  ReceiptText,
  Boxes,
  Truck
} from 'lucide-react';
import {
  exportAuditLogsCSV,
  exportPanelsCSV,
  exportOrdersCSV,
  exportTransactionsCSV,
  exportProductsCSV,
  exportShipmentsCSV
} from '@/utils/export';

export const AuditBackupsSection: React.FC = () => {
  const {
    activityLogs,
    materials,
    transactions,
    products,
    shipments,
    language,
    theme,
    createManualBackup,
    backups
  } = useInventory();

  const isKu = language === 'ku';
  const [logFilter, setLogFilter] = useState<'all' | 'sale' | 'inventory' | 'settings' | 'system'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logUserFilter, setLogUserFilter] = useState<string>('all');
  const [logTimeframeFilter, setLogTimeframeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const allFlattenedOrders = materials.flatMap((m) =>
    m.activeOrders.map((ord) => ({ order: ord, material: m }))
  );

  const uniqueLogUsers = React.useMemo(() => {
    const set = new Set<string>();
    activityLogs.forEach((l) => {
      if (l.username && l.username.trim()) set.add(l.username.trim());
    });
    return Array.from(set).sort();
  }, [activityLogs]);

  const filteredLogs = activityLogs.filter((log) => {
    if (logFilter !== 'all' && log.category !== logFilter) return false;
    if (logUserFilter !== 'all' && (log.username || '').toLowerCase() !== logUserFilter.toLowerCase()) return false;
    if (logTimeframeFilter !== 'all') {
      const time = new Date(log.timestamp).getTime();
      if (!isNaN(time) && time > 0) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (logTimeframeFilter === 'today' && now - time > oneDay) return false;
        if (logTimeframeFilter === 'week' && now - time > 7 * oneDay) return false;
      }
    }
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      (log.username && log.username.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.description && log.description.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  const hasActiveLogFilters = Boolean(
    logSearch.trim() ||
    logFilter !== 'all' ||
    logUserFilter !== 'all' ||
    logTimeframeFilter !== 'all'
  );

  const resetAllLogFilters = () => {
    setLogSearch('');
    setLogFilter('all');
    setLogUserFilter('all');
    setLogTimeframeFilter('all');
  };

  const handleInstantBackup = async () => {
    setIsBackingUp(true);
    try {
      await createManualBackup(isKu ? 'باکئەپی دەستی' : 'Manual System Snapshot');
      showToast(isKu ? 'وەشانی باکئەپ بە سەرکەوتوویی پاشەکەوتکرا' : 'Database snapshot created successfully');
    } catch {
      showToast(isKu ? 'هەڵە لە دروستکردنی باکئەپ' : 'Failed to create database snapshot');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* Title & Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isKu ? 'تۆماری چالاکی و باکئەپی سیستەم' : 'System Audit Trail & Backups'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isKu
              ? 'چاودێریکردنی وردی هەموو دەستکارییەکان و یەدەگگرتنی خێرای داتابەیس'
              : 'Verifiable chronological change tracking, instant database snapshots, and 1-tap table exports'}
          </p>
        </div>

        {/* Snapshot trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleInstantBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isKu ? 'دروستکردنی باکئەپی ئێستا' : 'Create Instant Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* 1-Tap CSV Exports Section */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {isKu ? 'دابەزاندنی داتاکان بە فایلی Excel / CSV (یەک کلیک)' : '1-Tap Export to Excel / CSV Utilities'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">UTF-8 BOM • Compatible with Kurdish & English</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => exportPanelsCSV(materials, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Layers className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'تەختەکان' : 'Wood Panels'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{materials.length} records</div>
          </button>

          <button
            onClick={() => exportOrdersCSV(allFlattenedOrders, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'داواکارییەکان' : 'Customer Orders'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{allFlattenedOrders.length} records</div>
          </button>

          <button
            onClick={() => exportTransactionsCSV(transactions, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <ReceiptText className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'وەسڵی فرۆشتن' : 'Sales Invoices'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{transactions.length} records</div>
          </button>

          <button
            onClick={() => exportProductsCSV(products, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Boxes className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'کۆگای کەلوپەل' : 'Warehouse Goods'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{products.length} records</div>
          </button>

          <button
            onClick={() => exportShipmentsCSV(shipments, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Truck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'باری گەیشتوو' : 'Shipments'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{shipments.length} records</div>
          </button>

          <button
            onClick={() => exportAuditLogsCSV(activityLogs, language)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Clock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isKu ? 'تۆماری چالاکی' : 'Audit Logs'}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{activityLogs.length} records</div>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              {isKu ? 'تۆماری کردار و بەکارهێنەران' : 'Activity Trail & User Operations'}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              {(['all', 'sale', 'inventory', 'settings', 'system'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLogFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    logFilter === cat
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat === 'all' ? (isKu ? 'هەمووی' : 'All') : cat}
                </button>
              ))}
            </div>

            {/* User / Operator Filter */}
            {uniqueLogUsers.length > 0 && (
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 h-7.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <select
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                  title="Filter by operator"
                >
                  <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو کارمەندان' : 'All Operators'}</option>
                  {uniqueLogUsers.map((u) => (
                    <option key={u} value={u} className="dark:bg-slate-800">
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Timeframe Filter */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 h-7.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <select
                value={logTimeframeFilter}
                onChange={(e) => setLogTimeframeFilter(e.target.value as 'all' | 'today' | 'week')}
                className="bg-transparent focus:outline-none cursor-pointer"
                title="Filter by Time"
              >
                <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو کات' : 'All Time'}</option>
                <option value="today" className="dark:bg-slate-800">{isKu ? 'ئەمڕۆ' : 'Today'}</option>
                <option value="week" className="dark:bg-slate-800">{isKu ? 'ئەم هەفتەیە' : 'Last 7 Days'}</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative min-w-[140px] sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={isKu ? 'گەڕان لە تۆمارەکان...' : 'Search logs...'}
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Reset Logs Filter Button */}
            {hasActiveLogFilters && (
              <button
                type="button"
                onClick={resetAllLogFilters}
                className="h-7.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Reset log filters"
              >
                <Clock className="w-3 h-3" />
                <span>{isKu ? 'سڕینەوەی فلتەر' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              {isKu ? 'هیچ تۆمارێکی چالاکی بەردەست نییە.' : 'No audit records found matching your filters.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-3.5 sm:px-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{log.action}</span>
                      {log.category && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {log.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {log.description} {log.details ? `— ${log.details}` : ''}
                    </p>
                  </div>
                  <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-slate-400 font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {log.username}
                    </span>
                    <span>
                      {log.formattedTime || new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
