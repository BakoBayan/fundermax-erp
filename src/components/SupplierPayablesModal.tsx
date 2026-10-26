'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  X,
  Phone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Coins,
  Receipt,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { InboundShipment } from '../types/warehouse';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import { useInventory } from '../context/InventoryContext';

interface SupplierPayablesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupplierSummary {
  supplier: string;
  phone: string;
  totalInvoiced: number;
  totalPaid: number;
  balanceOwed: number;
  currency: 'USD' | 'EUR';
  shipments: InboundShipment[];
}

export const SupplierPayablesModal: React.FC<SupplierPayablesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { language, logActivity } = useInventory();
  const isKu = language === 'ku';
  const warehouseOps = useWarehouseOps();

  // State for in-place payment drawer
  const [payingSupplier, setPayingSupplier] = useState<SupplierSummary | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [paySuccess, setPaySuccess] = useState<string>('');

  // Group active shipments by supplier
  const supplierLedger = useMemo(() => {
    const map = new Map<string, SupplierSummary>();

    warehouseOps.activeShipments.forEach((s) => {
      if (s.isDeleted === 1) return;
      const supplierName = (s.supplier || s.supplierName || 'Unknown Vendor').trim();
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt =
        s.supplierDebtRemaining !== undefined
          ? Number(s.supplierDebtRemaining)
          : Math.max(0, invoiced - paid);
      const curr = (s.invoiceCurrency || (supplierName.toLowerCase().includes('fundermax') ? 'EUR' : 'USD')) as 'USD' | 'EUR';
      const phone = (s.supplierContact || '').trim();

      const existing = map.get(supplierName);
      if (existing) {
        existing.totalInvoiced += invoiced;
        existing.totalPaid += paid;
        existing.balanceOwed += debt;
        if (!existing.phone && phone) existing.phone = phone;
        existing.shipments.push(s);
      } else {
        map.set(supplierName, {
          supplier: supplierName,
          phone,
          totalInvoiced: invoiced,
          totalPaid: paid,
          balanceOwed: debt,
          currency: curr,
          shipments: [s],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.balanceOwed - a.balanceOwed);
  }, [warehouseOps.activeShipments]);

  // Totals across all suppliers
  const totalBalanceOwed = useMemo(() => {
    return supplierLedger.reduce((sum, s) => sum + s.balanceOwed, 0);
  }, [supplierLedger]);

  const totalPaidToSuppliers = useMemo(() => {
    return supplierLedger.reduce((sum, s) => sum + s.totalPaid, 0);
  }, [supplierLedger]);

  if (!isOpen) return null;

  const handleOpenPayDrawer = (sup: SupplierSummary) => {
    setPayingSupplier(sup);
    setPayError('');
    setPaySuccess('');

    // Select the first shipment that has outstanding debt
    const debtShipments = sup.shipments.filter((s) => {
      const inv = Number(s.totalInvoiceAmount) || 0;
      const pd = Number(s.amountPaidToSupplier) || 0;
      const d = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, inv - pd);
      return d > 0;
    });

    const targetShipment = debtShipments[0] || sup.shipments[0];
    if (targetShipment) {
      setSelectedShipmentId(targetShipment.id);
      const inv = Number(targetShipment.totalInvoiceAmount) || 0;
      const pd = Number(targetShipment.amountPaidToSupplier) || 0;
      const d = targetShipment.supplierDebtRemaining !== undefined ? Number(targetShipment.supplierDebtRemaining) : Math.max(0, inv - pd);
      setPayAmount(d > 0 ? String(d) : '');
    } else {
      setSelectedShipmentId('');
      setPayAmount('');
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayError(isKu ? 'تکایە بڕی دروست دیاری بکە.' : 'Please enter a valid positive payment amount.');
      return;
    }

    if (!selectedShipmentId) {
      setPayError(isKu ? 'هیچ وەجبەیەکی دابینکەر هەڵنەبژێردراوە.' : 'No supplier invoice/batch selected.');
      return;
    }

    const res = warehouseOps.recordSupplierPayment(selectedShipmentId, amt);
    if (!res.ok) {
      setPayError(res.error || (isKu ? 'هەڵەیەک ڕوویدا لە تۆمارکردنی پارەدان.' : 'Error recording payment.'));
      return;
    }

    const targetShipment = payingSupplier?.shipments.find((s) => s.id === selectedShipmentId);
    const currSym = targetShipment?.invoiceCurrency === 'EUR' ? '€' : '$';

    if (logActivity) {
      logActivity(
        'SUPPLIER_PAYMENT',
        `Recorded payment of ${currSym}${amt.toLocaleString()} to ${payingSupplier?.supplier} (${targetShipment?.batchCode || 'Batch'})`,
        undefined,
        'inventory'
      );
    }

    setPaySuccess(
      isKu
        ? `پارەدانی ${currSym}${amt.toLocaleString()} بە سەرکەوتوویی بۆ ${payingSupplier?.supplier} تۆمارکرا.`
        : `Successfully recorded payment of ${currSym}${amt.toLocaleString()} to ${payingSupplier?.supplier}.`
    );

    setTimeout(() => {
      setPayingSupplier(null);
      setPaySuccess('');
      setPayAmount('');
    }, 1200);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-750 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-purple-50/30 dark:from-purple-950/30 dark:via-slate-850 dark:to-purple-950/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {isKu ? 'قەرزی کۆمپانیا بۆ دابینکەران' : 'Company Debt to Suppliers'}
              </h2>
              <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold block mt-0.5">
                {isKu ? 'Company Debt to Suppliers (Accounts Payable Ledger)' : 'قەرزی کۆمپانیا بۆ دابینکەران (Accounts Payable)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKu ? 'داخستن' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 sm:p-6 pb-2 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              {isKu ? 'کۆی قەرزی ماوە' : 'Total Balance Owed'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              ${totalBalanceOwed.toLocaleString()}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              {isKu ? 'کۆی پارەی دراو' : 'Total Paid to Date'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              ${totalPaidToSuppliers.toLocaleString()}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              {isKu ? 'دابینکەرانی قەرزدار' : 'Suppliers with Debt'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-700 dark:text-purple-300 tracking-tight">
              {supplierLedger.filter((s) => s.balanceOwed > 0).length} / {supplierLedger.length}
            </div>
          </div>
        </div>

        {/* Content Body: Scrollable Table of Suppliers */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Quick Pay Drawer Form */}
          {payingSupplier && (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-800 animate-in slide-in-from-top-2 duration-200 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-black text-purple-900 dark:text-purple-200">
                    {isKu ? `پارەدان بە دابینکەر: ${payingSupplier.supplier}` : `Pay Supplier: ${payingSupplier.supplier}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {payError && (
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {paySuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{paySuccess}</span>
                </div>
              )}

              <form onSubmit={handleConfirmPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKu ? 'وەجبە / پسوولە' : 'Invoice Batch'}
                  </label>
                  <select
                    value={selectedShipmentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedShipmentId(id);
                      const sh = payingSupplier.shipments.find((x) => x.id === id);
                      if (sh) {
                        const inv = Number(sh.totalInvoiceAmount) || 0;
                        const pd = Number(sh.amountPaidToSupplier) || 0;
                        const d = sh.supplierDebtRemaining !== undefined ? Number(sh.supplierDebtRemaining) : Math.max(0, inv - pd);
                        setPayAmount(d > 0 ? String(d) : '');
                      }
                    }}
                    className="w-full h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  >
                    {payingSupplier.shipments.map((sh) => {
                      const inv = Number(sh.totalInvoiceAmount) || 0;
                      const pd = Number(sh.amountPaidToSupplier) || 0;
                      const d = sh.supplierDebtRemaining !== undefined ? Number(sh.supplierDebtRemaining) : Math.max(0, inv - pd);
                      const sym = sh.invoiceCurrency === 'EUR' ? '€' : '$';
                      return (
                        <option key={sh.id} value={sh.id}>
                          {sh.batchCode || 'Batch'} (Due: {sym}{d.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKu ? 'بڕی پارەدان' : 'Payment Amount'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 text-sm font-bold font-mono rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 h-10 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isKu ? 'تەئکیدکردنەوە' : 'Confirm'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayingSupplier(null)}
                    className="h-10 px-3.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {supplierLedger.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold">
                {isKu ? 'هیچ دابینکەرێک یان پسوولەی کڕین تۆمار نەکراوە.' : 'No supplier shipments or invoices recorded.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">{isKu ? 'ناوی دابینکەر' : 'Supplier Name'}</th>
                    <th className="py-3 px-4">{isKu ? 'تەلەفۆن' : 'Phone'}</th>
                    <th className="py-3 px-4 text-end">{isKu ? 'کۆی پارەی دراو' : 'Total Paid'}</th>
                    <th className="py-3 px-4 text-end">{isKu ? 'قەرزی ماوە' : 'Current Balance Owed'}</th>
                    <th className="py-3 px-4 text-center">{isKu ? 'کردار' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {supplierLedger.map((sup) => {
                    const sym = sup.currency === 'EUR' ? '€' : '$';
                    const hasDebt = sup.balanceOwed > 0;

                    return (
                      <tr
                        key={sup.supplier}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 font-bold text-xs">
                              {sup.supplier.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {sup.supplier}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {sup.shipments.length} {isKu ? 'وەجبە' : 'batches'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4">
                          {sup.phone ? (
                            <a
                              href={`tel:${sup.phone}`}
                              className="inline-flex items-center gap-1 font-mono text-sky-600 dark:text-sky-400 hover:underline"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{sup.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>

                        {/* Total Paid */}
                        <td className="py-3 px-4 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {sym}{sup.totalPaid.toLocaleString()}
                        </td>

                        {/* Current Balance Owed (In Red) */}
                        <td className="py-3 px-4 text-end font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {hasDebt ? (
                            <span>{sym}{sup.balanceOwed.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                              {isKu ? 'تەواو دراوە' : 'Zero Debt'}
                            </span>
                          )}
                        </td>

                        {/* Quick Action: + Pay Supplier */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPayDrawer(sup)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                            title={isKu ? 'پارەدان بە دابینکەر' : 'Pay Supplier'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isKu ? 'پارەدان بە دابینکەر' : '+ Pay Supplier'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isKu ? 'دەفتەری حیساباتی سەرەکی دابینکەران' : 'Live Accounts Payable Ledger • Real-time Sync'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isKu ? 'داخستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierPayablesModal;
