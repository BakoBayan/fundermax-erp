'use client';

import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Truck,
  Plus,
  Trash2,
  Download,
  Search,
  MapPin,
  X,
  ArrowRightLeft,
  PackageCheck,
  Warehouse,
  ClipboardList,
  Boxes,
  CalendarDays,
  Globe2,
  ShieldAlert,
  Undo2,
  AlertTriangle,
} from 'lucide-react';
import { allocatedQtyForItem, useWarehouseOps } from '../hooks/useWarehouseOps';
import {
  INBOUND_STATUS_ORDER,
  InboundShipment,
  InboundStatus,
  StockAllocation,
  TRANSFER_REASONS,
  TransferReason,
  WORKSHOP_LOCATION_ID,
  formatLocationLabel,
} from '../types/warehouse';
import { autoCapitalizeFirstLetter } from '../utils/text';

type WarehouseTab = 'shipments' | 'stock' | 'transfers';

type ModalState =
  | { type: 'none' }
  | { type: 'newShipment' }
  | { type: 'allocate'; shipmentId: string; itemId: string }
  | { type: 'transfer'; allocationId: string }
  | { type: 'openingStock' };

const STATUS_META: Record<InboundStatus, { label: string; labelKu: string; chip: string; dot: string }> = {
  pending: {
    label: 'Pending',
    labelKu: 'چاوەڕوان',
    chip: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    dot: 'bg-slate-400',
  },
  customs: {
    label: 'Customs',
    labelKu: 'گومرگ',
    chip: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  received: {
    label: 'Received',
    labelKu: 'وەرگیراوە',
    chip: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  inspected: {
    label: 'Inspected',
    labelKu: 'پشکنراوە',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
};

const inputCls =
  'w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const fmtQty = (n: number): string => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 3 }));

const toNum = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
}) => (
  <div
    className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 no-print select-none"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-700 shadow-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 flex flex-col`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Mobile Pull Pill Indicator */}
      <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0">
        <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const FormError: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  ) : null;

export const WarehouseGoodsSection: React.FC = () => {
  const { language, currentUser, isViewer, canModify, isAdmin, logActivity, userPermissions } = useInventory();
  const wh = useWarehouseOps();

  const isKu = language === 'ku';
  const canManageShipments = !!userPermissions.canManageShipments;
  const canManageStock = !!userPermissions.canManageStock;
  const userName = currentUser?.displayName || 'Unknown User';

  const [tab, setTab] = useState<WarehouseTab>('shipments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InboundStatus>('all');
  const [reasonFilter, setReasonFilter] = useState<'all' | TransferReason>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const closeModal = () => setModal({ type: 'none' });

  // ---------- Derived data ----------
  const q = search.trim().toLowerCase();

  const filteredShipments = useMemo(() => {
    const source = showDeleted ? wh.deletedShipments : wh.activeShipments;
    return source
      .filter((s) => (statusFilter === 'all' ? true : s.status === statusFilter))
      .filter((s) => {
        if (!q) return true;
        return (
          s.batchCode.toLowerCase().includes(q) ||
          s.supplier.toLowerCase().includes(q) ||
          s.originCountry.toLowerCase().includes(q) ||
          s.items.some((i) => i.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate) || b.createdAt.localeCompare(a.createdAt));
  }, [wh.activeShipments, wh.deletedShipments, showDeleted, statusFilter, q]);

  const awaitingPutAway = useMemo(() => {
    let total = 0;
    for (const s of wh.activeShipments) {
      if (s.status !== 'received' && s.status !== 'inspected') continue;
      for (const i of s.items) {
        total += Math.max(0, i.receivedQty - allocatedQtyForItem(wh.allocations, s.id, i.id));
      }
    }
    return total;
  }, [wh.activeShipments, wh.allocations]);

  const inCustoms = wh.activeShipments.filter((s) => s.status === 'customs').length;
  const totalRackUnits = wh.allocations
    .filter((a) => a.locationId !== WORKSHOP_LOCATION_ID)
    .reduce((sum, a) => sum + a.quantity, 0);
  const workshopUnits = wh.allocations
    .filter((a) => a.locationId === WORKSHOP_LOCATION_ID)
    .reduce((sum, a) => sum + a.quantity, 0);

  const filteredAllocations = useMemo(
    () =>
      wh.allocations.filter((a) => {
        if (!q) return true;
        return (
          a.itemName.toLowerCase().includes(q) ||
          (a.batchCode || '').toLowerCase().includes(q) ||
          wh.locationLabel(a.locationId).toLowerCase().includes(q)
        );
      }),
    [wh.allocations, wh, q]
  );

  const filteredTransfers = useMemo(
    () =>
      wh.transfers.filter((t) => {
        if (reasonFilter !== 'all' && t.reason !== reasonFilter) return false;
        if (!q) return true;
        return (
          t.itemName.toLowerCase().includes(q) ||
          t.fromLabel.toLowerCase().includes(q) ||
          t.toLabel.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          (t.batchCode || '').toLowerCase().includes(q)
        );
      }),
    [wh.transfers, reasonFilter, q]
  );

  // ---------- Exports ----------
  const exportShipments = () => {
    const rows: Array<Array<string | number>> = [
      ['Batch Code', 'Supplier', 'Origin', 'Arrival Date', 'Status', 'Item', 'Unit', 'Expected', 'Received', 'Allocated'],
    ];
    for (const s of wh.activeShipments) {
      for (const i of s.items) {
        rows.push([
          s.batchCode,
          s.supplier,
          s.originCountry,
          s.arrivalDate,
          STATUS_META[s.status].label,
          i.description,
          i.unit,
          i.expectedQty,
          i.receivedQty,
          allocatedQtyForItem(wh.allocations, s.id, i.id),
        ]);
      }
    }
    downloadCsv(`incoming-shipments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportTransfers = () => {
    const rows: Array<Array<string | number>> = [
      ['Timestamp', 'User', 'Item', 'Qty', 'Unit', 'From', 'To', 'Reason', 'Batch', 'Note'],
      ...wh.transfers.map((t) => [
        t.timestamp,
        t.userName,
        t.itemName,
        t.quantity,
        t.unit,
        t.fromLabel,
        t.toLabel,
        t.reason,
        t.batchCode || '',
        t.note,
      ]),
    ];
    downloadCsv(`stock-transfers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleDeleteShipment = (s: InboundShipment) => {
    const allocated = wh.allocations.some((a) => a.shipmentId === s.id);
    const msg = allocated
      ? `${s.batchCode} already has stock allocated to racks. Archive it anyway? The shipment record is kept for admin review and allocated stock is not touched.`
      : `Archive shipment ${s.batchCode}? It is soft-deleted and kept for admin review.`;
    if (!window.confirm(msg)) return;
    wh.softDeleteShipment(s.id);
    logActivity('SHIPMENT_ARCHIVED', `Inbound shipment ${s.batchCode} archived`, undefined, 'inventory');
  };

  const tabs: Array<{ id: WarehouseTab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'shipments', label: isKu ? 'بارە گەیشتووەکان' : 'Incoming Shipments', icon: <Truck className="w-4 h-4" />, count: wh.activeShipments.length },
    { id: 'stock', label: isKu ? 'شوێنی کۆگا' : 'Locations & Stock', icon: <MapPin className="w-4 h-4" />, count: wh.allocations.length },
    { id: 'transfers', label: isKu ? 'گواستنەوەکان' : 'Transfer Log', icon: <ArrowRightLeft className="w-4 h-4" />, count: wh.transfers.length },
  ];

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isKu ? 'کۆگا و بارە گەیشتووەکان' : 'Warehouse: Shipments, Locations & Transfers'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKu
              ? 'بارە گەیشتووەکانی کۆمپانیا، دابەشکردنی شوێنی کۆگا، و تۆماری گواستنەوە'
              : 'Incoming company shipments, rack and bay allocation, and audited stock movements.'}
          </p>
        </div>
        {canManageShipments && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={() => setModal({ type: 'newShipment' })}>
              <Plus className="w-4 h-4" />
              {isKu ? 'بارێکی نوێ' : 'New Incoming Shipment'}
            </button>
          </div>
        )}
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Shipments', value: wh.activeShipments.length, icon: <Truck className="w-4 h-4" />, tone: 'text-slate-900 dark:text-white' },
          { label: 'In Customs', value: inCustoms, icon: <ShieldAlert className="w-4 h-4" />, tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Awaiting Put-Away', value: fmtQty(awaitingPutAway), icon: <PackageCheck className="w-4 h-4" />, tone: 'text-sky-600 dark:text-sky-400' },
          { label: 'Units Racked / Workshop', value: `${fmtQty(totalRackUnits)} / ${fmtQty(workshopUnits)}`, icon: <Boxes className="w-4 h-4" />, tone: 'text-emerald-600 dark:text-emerald-400' },
        ].map((k) => (
          <div key={k.label} className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-850/90 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {k.icon}
              <span>{k.label}</span>
            </div>
            <div className={`mt-1 text-xl sm:text-2xl font-black font-mono ${k.tone}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABS + SEARCH */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto no-scrollbar" role="tablist">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                tab === tb.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              {tb.icon}
              <span>{tb.label}</span>
              <span className={`px-1.5 rounded-full text-[11px] font-mono ${tab === tb.id ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>{tb.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKu ? 'گەڕان...' : 'Search batch, supplier, item, location...'}
            className={`${inputCls} ps-9`}
            aria-label="Search warehouse"
          />
        </div>
      </div>

      {/* ============ SHIPMENTS TAB ============ */}
      {tab === 'shipments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | InboundStatus)}
              className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {INBOUND_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <button type="button" className={ghostBtn} onClick={exportShipments}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            {isAdmin && (
              <button
                type="button"
                className={ghostBtn}
                onClick={() => setShowDeleted((v) => !v)}
                title="Admin only: review archived (soft-deleted) shipments"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {showDeleted ? 'Show Active' : `Archived (${wh.deletedShipments.length})`}
              </button>
            )}
          </div>

          {filteredShipments.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-850/60">
              <Truck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {showDeleted ? 'No archived shipments.' : 'No incoming shipments yet.'}
              </p>
              {canManageShipments && !showDeleted && (
                <button type="button" className={`${primaryBtn} mt-4`} onClick={() => setModal({ type: 'newShipment' })}>
                  <Plus className="w-4 h-4" /> Register the first shipment
                </button>
              )}
            </div>
          ) : (
            filteredShipments.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-amber-600 text-xs font-mono font-black tracking-wide">{s.batchCode}</span>
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 ${STATUS_META[s.status].chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s.status].dot}`} />
                        {isKu ? STATUS_META[s.status].labelKu : STATUS_META[s.status].label}
                      </span>
                      {s.isDeleted === 1 && <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">Archived</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white truncate">{s.supplier}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" />{s.originCountry || 'Origin not set'}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{s.arrivalDate || 'Date not set'}</span>
                      {s.supplierContact && <span>{s.supplierContact}</span>}
                    </div>
                    {s.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 max-w-2xl">{s.notes}</p>}
                  </div>

                  <div className="flex flex-col items-stretch lg:items-end gap-2 shrink-0">
                    {canManageShipments && s.isDeleted === 0 && (
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1" role="group" aria-label="Customs and arrival status">
                        {INBOUND_STATUS_ORDER.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              if (st !== s.status) {
                                wh.setShipmentStatus(s.id, st);
                                logActivity('SHIPMENT_STATUS', `${s.batchCode} set to ${STATUS_META[st].label}`, undefined, 'inventory');
                              }
                            }}
                            className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              s.status === st
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                            }`}
                          >
                            {STATUS_META[st].label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 lg:justify-end">
                      {isAdmin && s.isDeleted === 1 ? (
                        <button type="button" className={ghostBtn} onClick={() => wh.restoreShipment(s.id)}>
                          <Undo2 className="w-3.5 h-3.5" /> Restore
                        </button>
                      ) : (
                        canManageShipments && (
                          <button type="button" className={`${ghostBtn} text-rose-600 dark:text-rose-400`} onClick={() => handleDeleteShipment(s)}>
                            <Trash2 className="w-3.5 h-3.5" /> Archive
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-sm min-w-[620px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <th className="text-start font-bold px-4 py-2">Item</th>
                        <th className="text-end font-bold px-3 py-2">Expected</th>
                        <th className="text-end font-bold px-3 py-2">Received</th>
                        <th className="text-end font-bold px-3 py-2">Racked</th>
                        <th className="text-end font-bold px-3 py-2">Left</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((it) => {
                        const allocated = allocatedQtyForItem(wh.allocations, s.id, it.id);
                        const left = Math.max(0, it.receivedQty - allocated);
                        const canPutAway = canManageStock && s.isDeleted === 0 && left > 0;
                        return (
                          <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                              {it.description}
                              <span className="ms-1.5 text-[11px] font-mono text-slate-400">{it.unit}</span>
                            </td>
                            <td className="px-3 py-2.5 text-end font-mono text-slate-600 dark:text-slate-300">{fmtQty(it.expectedQty)}</td>
                            <td className="px-3 py-2.5 text-end">
                              {canManageShipments && s.isDeleted === 0 ? (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  pattern="[0-9]*"
                                  min={0}
                                  step="any"
                                  defaultValue={it.receivedQty}
                                  key={`${it.id}-${it.receivedQty}`}
                                  onBlur={(e) => {
                                    const v = toNum(e.target.value);
                                    if (v !== it.receivedQty) wh.setReceivedQty(s.id, it.id, v);
                                  }}
                                  className="w-24 h-9 px-2 rounded-lg text-end font-mono text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                                  aria-label={`Received quantity for ${it.description}`}
                                />
                              ) : (
                                <span className="font-mono">{fmtQty(it.receivedQty)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-end font-mono text-emerald-600 dark:text-emerald-400">{fmtQty(allocated)}</td>
                            <td className={`px-3 py-2.5 text-end font-mono ${left > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>{fmtQty(left)}</td>
                            <td className="px-4 py-2.5 text-end">
                              {canPutAway && canManageStock && (
                                <button
                                  type="button"
                                  className={ghostBtn}
                                  onClick={() => setModal({ type: 'allocate', shipmentId: s.id, itemId: it.id })}
                                >
                                  <MapPin className="w-3.5 h-3.5" /> Allocate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* ============ STOCK & LOCATIONS TAB ============ */}
      {tab === 'stock' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">Stock by Location</h2>
              {canManageStock && (
                <button type="button" className={ghostBtn} onClick={() => setModal({ type: 'openingStock' })}>
                  <ClipboardList className="w-3.5 h-3.5" /> Record Opening Stock
                </button>
              )}
            </div>
            {wh.locations.map((loc) => {
              const rows = filteredAllocations.filter((a) => a.locationId === loc.id);
              const total = wh.allocations.filter((a) => a.locationId === loc.id).reduce((sum, a) => sum + a.quantity, 0);
              if (q && rows.length === 0) return null;
              return (
                <section key={loc.id} className="rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <header className="px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className={`w-4 h-4 shrink-0 ${loc.kind === 'workshop' ? 'text-sky-500' : 'text-amber-600'}`} />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{formatLocationLabel(loc)}</h3>
                      {loc.kind === 'workshop' && <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold">WORKSHOP</span>}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">{fmtQty(total)} units</span>
                  </header>
                  {rows.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-slate-400">Empty.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rows.map((a: StockAllocation) => (
                        <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.itemName}</div>
                            <div className="text-[11px] font-mono text-slate-500">{a.batchCode || 'Opening stock'}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {fmtQty(a.quantity)} <span className="text-[11px] text-slate-400">{a.unit}</span>
                            </span>
                            {canManageStock && (
                              <button type="button" className={ghostBtn} onClick={() => setModal({ type: 'transfer', allocationId: a.id })}>
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Move
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <LocationManager canWrite={canManageStock} />
        </div>
      )}

      {/* ============ TRANSFERS TAB ============ */}
      {tab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as 'all' | TransferReason)}
              className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              aria-label="Filter by reason"
            >
              <option value="all">All reasons</option>
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button type="button" className={ghostBtn} onClick={exportTransfers}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="text-start font-bold px-4 py-2.5">When</th>
                  <th className="text-start font-bold px-3 py-2.5">Item</th>
                  <th className="text-end font-bold px-3 py-2.5">Qty</th>
                  <th className="text-start font-bold px-3 py-2.5">From</th>
                  <th className="text-start font-bold px-3 py-2.5">To</th>
                  <th className="text-start font-bold px-3 py-2.5">Reason</th>
                  <th className="text-start font-bold px-3 py-2.5">By</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      No stock movements recorded.
                    </td>
                  </tr>
                )}
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{t.itemName}</div>
                      {t.note && <div className="text-[11px] text-slate-500 max-w-xs">{t.note}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono font-bold">{fmtQty(t.quantity)} <span className="text-[11px] text-slate-400">{t.unit}</span></td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">{t.fromLabel}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">{t.toLabel}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">{t.reason}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{t.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modal.type === 'newShipment' && (
        <NewShipmentModal
          onClose={closeModal}
          onSave={(input) => {
            const res = wh.addShipment(input);
            if (res.ok) {
              logActivity('SHIPMENT_REGISTERED', `Incoming shipment from ${input.supplier} registered`, undefined, 'inventory');
              closeModal();
            }
            return res;
          }}
        />
      )}

      {modal.type === 'allocate' && (() => {
        const sh = wh.shipments.find((x) => x.id === modal.shipmentId);
        const item = sh?.items.find((i) => i.id === modal.itemId);
        if (!sh || !item) return null;
        const left = Math.max(0, item.receivedQty - allocatedQtyForItem(wh.allocations, sh.id, item.id));
        return (
          <AllocateModal
            title={`Allocate ${item.description}`}
            subtitle={`${sh.batchCode} - ${fmtQty(left)} ${item.unit} left to put away`}
            max={left}
            unit={item.unit}
            locations={wh.locations.filter((l) => l.kind === 'storage')}
            onClose={closeModal}
            onSave={(locationId, qty) => {
              const res = wh.allocateFromShipment(sh.id, item.id, locationId, qty, userName);
              if (res.ok) closeModal();
              return res;
            }}
          />
        );
      })()}

      {modal.type === 'openingStock' && (
        <OpeningStockModal
          locations={wh.locations}
          onClose={closeModal}
          onSave={(name, unit, qty, locationId) => {
            const res = wh.addManualAllocation(name, unit, qty, locationId, userName);
            if (res.ok) closeModal();
            return res;
          }}
        />
      )}

      {modal.type === 'transfer' && (() => {
        const src = wh.allocations.find((a) => a.id === modal.allocationId);
        if (!src) return null;
        return (
          <TransferModal
            source={src}
            fromLabel={wh.locationLabel(src.locationId)}
            locations={wh.locations.filter((l) => l.id !== src.locationId)}
            onClose={closeModal}
            onSave={(toId, qty, reason, note) => {
              const res = wh.transferStock(src.id, toId, qty, reason, note, userName);
              if (res.ok) {
                logActivity('STOCK_TRANSFER', `${fmtQty(qty)} ${src.unit} ${src.itemName}: ${wh.locationLabel(src.locationId)} to ${wh.locationLabel(toId)} (${reason})`, undefined, 'inventory');
                closeModal();
              }
              return res;
            }}
          />
        );
      })()}
    </div>
  );
};

// =====================================================================
// Location manager (add / remove racks and bays)
// =====================================================================
const LocationManager: React.FC<{ canWrite: boolean }> = ({ canWrite }) => {
  const wh = useWarehouseOps();
  const [warehouse, setWarehouse] = useState('');
  const [rack, setRack] = useState('');
  const [row, setRow] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = wh.addLocation(autoCapitalizeFirstLetter(warehouse), autoCapitalizeFirstLetter(rack), autoCapitalizeFirstLetter(row));
    if (res.ok) {
      setRack('');
      setRow('');
      setError('');
    } else {
      setError(res.error);
    }
  };

  const warehouses = useMemo(() => Array.from(new Set(wh.locations.map((l) => l.warehouse))), [wh.locations]);

  return (
    <aside className="space-y-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">Storage Zones</h2>
      {canWrite && (
        <form onSubmit={submit} className="p-4 rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-800 space-y-3">
          <div>
            <label className={labelCls} htmlFor="loc-wh">Warehouse</label>
            <input id="loc-wh" list="loc-wh-list" className={inputCls} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Warehouse A" />
            <datalist id="loc-wh-list">
              {warehouses.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="loc-rack">Rack / Bay</label>
              <input id="loc-rack" className={inputCls} value={rack} onChange={(e) => setRack(e.target.value)} placeholder="Rack 04" />
            </div>
            <div>
              <label className={labelCls} htmlFor="loc-row">Row</label>
              <input id="loc-row" className={inputCls} value={row} onChange={(e) => setRow(e.target.value)} placeholder="Row 2" />
            </div>
          </div>
          <FormError message={error} />
          <button type="submit" className={`${primaryBtn} w-full`}>
            <Plus className="w-4 h-4" /> Add Location
          </button>
        </form>
      )}
      <ul className="rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {wh.locations.map((l) => (
          <li key={l.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{formatLocationLabel(l)}</span>
            {canWrite && l.kind === 'storage' && (
              <button
                type="button"
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                onClick={() => {
                  const res = wh.removeLocation(l.id);
                  if (!res.ok) setError(res.error);
                }}
                aria-label={`Remove ${formatLocationLabel(l)}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
};

// =====================================================================
// Modals
// =====================================================================
interface DraftItem {
  key: number;
  description: string;
  unit: string;
  expectedQty: string;
  receivedQty: string;
}

const NewShipmentModal: React.FC<{
  onClose: () => void;
  onSave: (input: {
    supplier: string;
    supplierContact: string;
    originCountry: string;
    arrivalDate: string;
    status: InboundStatus;
    notes: string;
    items: Array<{ description: string; unit: string; expectedQty: number; receivedQty: number }>;
  }) => { ok: true } | { ok: false; error: string };
}> = ({ onClose, onSave }) => {
  const [supplier, setSupplier] = useState('');
  const [contact, setContact] = useState('');
  const [origin, setOrigin] = useState('');
  const [arrival, setArrival] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<InboundStatus>('pending');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ key: 1, description: '', unit: 'pcs', expectedQty: '', receivedQty: '' }]);
  const [error, setError] = useState('');

  const updateItem = (key: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSave({
      supplier: autoCapitalizeFirstLetter(supplier),
      supplierContact: contact,
      originCountry: autoCapitalizeFirstLetter(origin),
      arrivalDate: arrival,
      status,
      notes,
      items: items.map((i) => {
        const expected = toNum(i.expectedQty);
        const received = i.receivedQty === '' ? (status === 'received' || status === 'inspected' ? expected : 0) : toNum(i.receivedQty);
        return { description: autoCapitalizeFirstLetter(i.description), unit: i.unit, expectedQty: expected, receivedQty: received };
      }),
    });
    if (!res.ok) setError(res.error);
  };

  return (
    <ModalShell title="New Incoming Shipment" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="ns-supplier">Supplier</label>
            <input id="ns-supplier" className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={labelCls} htmlFor="ns-contact">Supplier Contact</label>
            <input id="ns-contact" className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="ns-origin">Origin Country</label>
            <input id="ns-origin" className={inputCls} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Turkey" />
          </div>
          <div>
            <label className={labelCls} htmlFor="ns-arrival">Arrival Date</label>
            <input id="ns-arrival" type="date" className={inputCls} value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="ns-status">Customs / Arrival Status</label>
            <select id="ns-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as InboundStatus)}>
              {INBOUND_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={labelCls}>Items</span>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => setItems((p) => [...p, { key: Math.max(...p.map((x) => x.key)) + 1, description: '', unit: 'pcs', expectedQty: '', receivedQty: '' }])}
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          {items.map((i) => (
            <div key={i.key} className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="col-span-12 sm:col-span-5">
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={i.description} onChange={(e) => updateItem(i.key, { description: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className={labelCls}>Unit</label>
                <input className={inputCls} value={i.unit} onChange={(e) => updateItem(i.key, { unit: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelCls}>Expected</label>
                <input type="number" inputMode="decimal" pattern="[0-9]*" min={0} step="any" className={inputCls} value={i.expectedQty} onChange={(e) => updateItem(i.key, { expectedQty: e.target.value })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className={labelCls}>Received</label>
                <input type="number" inputMode="decimal" pattern="[0-9]*" min={0} step="any" className={inputCls} value={i.receivedQty} onChange={(e) => updateItem(i.key, { receivedQty: e.target.value })} />
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))}
                    className="w-10 h-10 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className={labelCls} htmlFor="ns-notes">Notes</label>
          <textarea id="ns-notes" rows={2} className={`${inputCls} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <FormError message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Register Shipment</button>
        </div>
      </form>
    </ModalShell>
  );
};

type SaveResult = { ok: true } | { ok: false; error: string };

const AllocateModal: React.FC<{
  title: string;
  subtitle: string;
  max: number;
  unit: string;
  locations: Array<{ id: string; warehouse: string; rack: string; row: string }>;
  onClose: () => void;
  onSave: (locationId: string, qty: number) => SaveResult;
}> = ({ title, subtitle, max, unit, locations, onClose, onSave }) => {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [qty, setQty] = useState(String(max));
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSave(locationId, toNum(qty));
    if (!res.ok) setError(res.error);
  };

  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        <div>
          <label className={labelCls} htmlFor="al-loc">Storage Location</label>
          <select id="al-loc" className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {formatLocationLabel(l)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="al-qty">Quantity ({unit})</label>
          <input id="al-qty" type="number" inputMode="decimal" pattern="[0-9]*" min={0} step="any" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Put Away</button>
        </div>
      </form>
    </ModalShell>
  );
};

const OpeningStockModal: React.FC<{
  locations: Array<{ id: string; warehouse: string; rack: string; row: string }>;
  onClose: () => void;
  onSave: (name: string, unit: string, qty: number, locationId: string) => SaveResult;
}> = ({ locations, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [qty, setQty] = useState('');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [error, setError] = useState('');

  return (
    <ModalShell title="Record Opening Stock" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const res = onSave(autoCapitalizeFirstLetter(name), unit, toNum(qty), locationId);
          if (!res.ok) setError(res.error);
        }}
        className="space-y-4"
      >
        <p className="text-xs text-slate-500 dark:text-slate-400">For stock that was in the warehouse before shipment tracking. Logged as an Audit Adjustment.</p>
        <div>
          <label className={labelCls} htmlFor="os-name">Item</label>
          <input id="os-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="os-qty">Quantity</label>
            <input id="os-qty" type="number" inputMode="decimal" pattern="[0-9]*" min={0} step="any" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="os-unit">Unit</label>
            <input id="os-unit" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="os-loc">Location</label>
          <select id="os-loc" className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {formatLocationLabel(l)}
              </option>
            ))}
          </select>
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Record</button>
        </div>
      </form>
    </ModalShell>
  );
};

const TransferModal: React.FC<{
  source: StockAllocation;
  fromLabel: string;
  locations: Array<{ id: string; warehouse: string; rack: string; row: string }>;
  onClose: () => void;
  onSave: (toLocationId: string, qty: number, reason: TransferReason | '', note: string) => SaveResult;
}> = ({ source, fromLabel, locations, onClose, onSave }) => {
  const [toId, setToId] = useState(locations[0]?.id ?? '');
  const [qty, setQty] = useState(String(source.quantity));
  const [reason, setReason] = useState<TransferReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  return (
    <ModalShell title={`Move ${source.itemName}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const res = onSave(toId, toNum(qty), reason, note);
          if (!res.ok) setError(res.error);
        }}
        className="space-y-4"
      >
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
          <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">From</div>
          <div className="font-semibold text-slate-900 dark:text-white">{fromLabel}</div>
          <div className="mt-1 font-mono text-slate-500">{fmtQty(source.quantity)} {source.unit} available</div>
        </div>
        <div>
          <label className={labelCls} htmlFor="tr-to">Destination</label>
          <select id="tr-to" className={inputCls} value={toId} onChange={(e) => setToId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {formatLocationLabel(l)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="tr-qty">Quantity ({source.unit})</label>
            <input id="tr-qty" type="number" inputMode="decimal" pattern="[0-9]*" min={0} step="any" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tr-reason">Reason (required)</label>
            <select id="tr-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as TransferReason | '')} required>
              <option value="">Select reason...</option>
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="tr-note">Note</label>
          <input id="tr-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryBtn}>Confirm Transfer</button>
        </div>
      </form>
    </ModalShell>
  );
};

export default WarehouseGoodsSection;
