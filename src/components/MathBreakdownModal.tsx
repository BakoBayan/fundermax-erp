'use client';

import React, { useState } from 'react';
import { Calculator, X, ArrowUpDown, DollarSign, AlertCircle, Phone, Coins, CheckCircle2 } from 'lucide-react';
import { PanelTransaction, CurrencyCode, ExchangeRates } from '@/types/inventory';
import { DEFAULT_EXCHANGE_RATES, convertCurrencyValue, formatMoney, normalizeIqdRate } from '@/lib/currency';

interface MathBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: PanelTransaction[];
  activeCurrency: CurrencyCode;
  exchangeRates?: ExchangeRates;
  lang: 'en' | 'ku';
  isDark: boolean;
}

export default function MathBreakdownModal({
  isOpen,
  onClose,
  transactions,
  activeCurrency,
  exchangeRates,
  lang,
  isDark
}: MathBreakdownModalProps) {
  // Inspected order selector (can be 'all' for system-wide, or a specific transaction ID)
  const [inspectOrderId, setInspectOrderId] = useState<string>('all');

  if (!isOpen) return null;

  // Robust, zero-crash normalization for exchange rates
  const safeRates = exchangeRates || DEFAULT_EXCHANGE_RATES;
  const rateUsdToIqd = normalizeIqdRate(safeRates?.usdToIqd || safeRates?.USD_IQD || 1500);
  const rateEurToUsd = typeof safeRates?.eurToUsd === 'number' && safeRates.eurToUsd > 0
    ? safeRates.eurToUsd
    : (safeRates?.EUR_USD || 1.08);
  const rateEurToIqd = normalizeIqdRate(safeRates?.eurToIqd || safeRates?.EUR_IQD || Math.round(rateUsdToIqd * rateEurToUsd));

  const effectiveRates: ExchangeRates = {
    usdToIqd: rateUsdToIqd,
    eurToUsd: rateEurToUsd,
    eurToIqd: rateEurToIqd,
    USD_IQD: rateUsdToIqd * 100,
    EUR_IQD: rateEurToIqd * 100,
    EUR_USD: rateEurToUsd,
  };

  // Filter out records that have debt > 0
  const debtorOrders = transactions.filter(t => (t.combinedTotalDebt || t.amountOwed || 0) > 0);

  // Calculate sum with explicit conversion details
  const debtBreakdown = debtorOrders.map(tx => {
    const origDebt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0);
    const origCur = tx.currency || 'USD';
    const convertedDebt = convertCurrencyValue(origDebt, origCur, activeCurrency, effectiveRates);
    return {
      tx,
      origDebt,
      origCur,
      convertedDebt
    };
  });

  const totalCalculatedDebt = debtBreakdown.reduce((sum, item) => sum + item.convertedDebt, 0);

  // Find inspected order if selected
  const inspectedTx = transactions.find(t => t.id === inspectOrderId);

  // Compute numbers depending on whether a specific order or all orders are inspected:
  let numItemsTotal = 0;
  let numDiscount = 0;
  let numNetPayable = 0;
  let numPaid = 0;
  let numOrderDebt = 0;
  let numOldDebt = 0;
  let numFinalDebt = 0;
  let displayCurrency: CurrencyCode = activeCurrency;

  if (inspectedTx) {
    displayCurrency = inspectedTx.currency || 'USD';
    numItemsTotal = inspectedTx.sellingAmount || 0;
    numDiscount = inspectedTx.discountDollars || 0;
    numNetPayable = inspectedTx.totalAfterDiscount || Math.max(0, numItemsTotal - numDiscount);
    numPaid = inspectedTx.amountPaidNow || 0;
    numOrderDebt = inspectedTx.amountOwed !== undefined ? inspectedTx.amountOwed : Math.max(0, numNetPayable - numPaid);
    numOldDebt = inspectedTx.oldUnpaidDebt || 0;
    numFinalDebt = inspectedTx.combinedTotalDebt !== undefined ? inspectedTx.combinedTotalDebt : (numOrderDebt + numOldDebt);
  } else {
    displayCurrency = activeCurrency;
    transactions.forEach(tx => {
      const cur = tx.currency || 'USD';
      numItemsTotal += convertCurrencyValue(tx.sellingAmount || 0, cur, activeCurrency, effectiveRates);
      numDiscount += convertCurrencyValue(tx.discountDollars || 0, cur, activeCurrency, effectiveRates);
      numNetPayable += convertCurrencyValue(tx.totalAfterDiscount || 0, cur, activeCurrency, effectiveRates);
      numPaid += convertCurrencyValue(tx.amountPaidNow || 0, cur, activeCurrency, effectiveRates);
      const oDebt = tx.amountOwed !== undefined ? tx.amountOwed : Math.max(0, (tx.totalAfterDiscount || 0) - (tx.amountPaidNow || 0));
      numOrderDebt += convertCurrencyValue(oDebt, cur, activeCurrency, effectiveRates);
      numOldDebt += convertCurrencyValue(tx.oldUnpaidDebt || 0, cur, activeCurrency, effectiveRates);
      const fDebt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (oDebt + (tx.oldUnpaidDebt || 0));
      numFinalDebt += convertCurrencyValue(fDebt, cur, activeCurrency, effectiveRates);
    });
  }

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-600/20">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base leading-tight">
                  {lang === 'en' ? 'Debt & Math Calculation Inspector' : 'ڕوونکردنەوەی هەژمارکردنی قەرز و نرخ'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  v1.3
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'en' ? 'Transparent formulas, debt aggregation, and multi-currency conversion' : 'ڕوونکردنەوەی وردی یاسای ژمێریاری و دراوەکان'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* ========================================================================= */}
          {/* TOP EXECUTIVE BANNER: TOTAL ACTIVE SYSTEM DEBT HIGHLIGHT                 */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-rose-400/80 dark:border-rose-500/80 bg-rose-50/80 dark:bg-rose-950/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/25 mt-0.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] uppercase font-black text-rose-800 dark:text-rose-300 tracking-wider block">
                  {lang === 'en' ? 'Total Active Customer Debt Highlight' : 'کۆی گشتی قەرزی کڕیاران لە تەواوی سیستەمدا'}
                </span>
                <div className="font-mono font-black text-2xl sm:text-3xl text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatMoney(totalCalculatedDebt, activeCurrency)}
                </div>
                <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium mt-1">
                  {lang === 'en'
                    ? `Unified balance across all ${debtorOrders.length} customer debts converted to ${activeCurrency}`
                    : `کۆی قەرز لەسەر ${debtorOrders.length} کڕیار، گۆڕدراو بۆ دراوی ${activeCurrency}`}
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-200 dark:border-rose-900/60">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white font-mono shadow-xs">
                {debtorOrders.length} {lang === 'en' ? 'Debtor Invoices' : 'وەسڵی قەرزدار'}
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                Converted to {activeCurrency}
              </span>
            </div>
          </div>

          {/* Section 1: Order Financial Formula with Real Numbers */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-black text-xs uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>{lang === 'en' ? 'Financial Calculation Formula' : 'یاسای ژمێریاری و هەژمارکردن'}</span>
              </h4>

              {/* Order selector or All orders switch */}
              {transactions.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-bold">
                    {lang === 'en' ? 'Inspect:' : 'پیشاندان:'}
                  </span>
                  <select
                    value={inspectOrderId}
                    onChange={(e) => setInspectOrderId(e.target.value)}
                    className="h-8 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs outline-none max-w-[220px] truncate bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="all">
                      {lang === 'en' ? 'All Orders (System Total)' : 'کۆی گشتی هەموو وەسڵەکان'}
                    </option>
                    {transactions.map((tx) => (
                      <option key={tx.id} value={tx.id}>
                        #{tx.code || tx.id.slice(-4)} - {tx.panelType || 'Order'} ({formatMoney(tx.totalAfterDiscount || tx.sellingAmount || 0, tx.currency || 'USD')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Formula rows with actual numbers */}
            <div className="space-y-1 text-xs font-mono leading-relaxed divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {/* 1. Line Items Total */}
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="font-bold">1. {lang === 'en' ? 'Line Items Total' : 'کۆی کاڵاکان'}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {inspectedTx ? `(Qty × Unit Price)` : `(Total Gross)`}
                  </span>
                </div>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {formatMoney(numItemsTotal, displayCurrency)}
                </span>
              </div>

              {/* 2. Minus Discount */}
              <div className="flex items-center justify-between py-1.5 text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">2. {lang === 'en' ? 'Minus Discount' : 'داشکاندن'}:</span>
                  <span className="text-[10px] opacity-80 font-normal">
                    {numDiscount > 0 ? `(-)` : `(0)`}
                  </span>
                </div>
                <span className="font-bold font-mono">
                  -{formatMoney(numDiscount, displayCurrency)}
                </span>
              </div>

              {/* 3. Net Payable Total */}
              <div className="flex items-center justify-between py-1.5 font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span>3. {lang === 'en' ? 'Net Payable' : 'کۆی پێویست بۆ دان'}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(= 1 - 2)</span>
                </div>
                <span className="font-black font-mono text-blue-600 dark:text-blue-400">
                  = {formatMoney(numNetPayable, displayCurrency)}
                </span>
              </div>

              {/* 4. Minus Amount Paid */}
              <div className="flex items-center justify-between py-1.5 text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">4. {lang === 'en' ? 'Minus Cash Paid' : 'پارەی دراو'}:</span>
                  <span className="text-[10px] opacity-80 font-normal">
                    {inspectedTx ? `(Received)` : `(Total Paid)`}
                  </span>
                </div>
                <span className="font-bold font-mono">
                  -{formatMoney(numPaid, displayCurrency)}
                </span>
              </div>

              {/* 5. Order Debt */}
              <div className="flex items-center justify-between py-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">5. {lang === 'en' ? 'This Order Debt' : 'قەرزی ئەم کڕینە'}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(= 3 - 4)</span>
                </div>
                <span className="font-bold font-mono">
                  = {formatMoney(numOrderDebt, displayCurrency)}
                </span>
              </div>

              {/* 6. Plus Old Debt */}
              <div className="flex items-center justify-between py-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">6. {lang === 'en' ? 'Plus Previous Debt' : 'قەرزی پێشوو'}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(+)</span>
                </div>
                <span className="font-bold font-mono">
                  +{formatMoney(numOldDebt, displayCurrency)}
                </span>
              </div>

              {/* 7. Final Combined Debt Highlight */}
              <div className="flex items-center justify-between pt-2 font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-950/30 px-3 py-2 rounded-xl border border-rose-500/25">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">7. {lang === 'en' ? 'Final Combined Debt' : 'کۆی گشتی قەرز'}:</span>
                  <span className="text-[10px] opacity-80 font-normal">(= 5 + 6)</span>
                </div>
                <span className="text-sm sm:text-base font-mono font-black">
                  = {formatMoney(numFinalDebt, displayCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Active Exchange Rates Used for Conversion */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-amber-500 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Active Conversion Baseline Rates' : 'نرخی گۆڕینەوەی دراوەکان'}</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Operational Rate Matrix
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono text-center">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">$1 USD =</span>
                <strong className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                  {rateUsdToIqd.toLocaleString()} IQD
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">€1 EUR =</span>
                <strong className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                  ${rateEurToUsd} USD
                </strong>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block">€1 EUR =</span>
                <strong className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">
                  {rateEurToIqd.toLocaleString()} IQD
                </strong>
              </div>
            </div>
          </div>

          {/* Section 3: Itemized Ledger Debtors Contributing to Total */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs uppercase text-slate-500 dark:text-slate-400">
                {lang === 'en' ? 'Itemized Active Debtors Adding to Total:' : 'تۆمارە قەرزدارەکان کە لە کۆی گشتیدا هەژمار دەکرێن:'}
              </h4>
              <span className="text-[11px] font-mono font-bold text-rose-500">
                {debtorOrders.length} records
              </span>
            </div>

            {debtBreakdown.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                {lang === 'en' ? 'No unpaid customer debts in the system.' : 'هیچ قەرزێکی کڕیار تۆمار نەکراوە.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-850 max-h-60 overflow-y-auto">
                {debtBreakdown.map((item) => (
                  <div key={item.tx.id} className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="font-mono text-blue-600 dark:text-blue-400">#{item.tx.code || item.tx.id.slice(-4)}</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.tx.panelType || 'Order Item'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.tx.seller ? `Seller: ${item.tx.seller} • ` : ''}{new Date(item.tx.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      {/* Original Currency Debt */}
                      <span className="font-mono font-bold block text-slate-700 dark:text-slate-200">
                        {formatMoney(item.origDebt, item.origCur)}
                      </span>
                      {/* Converted into Active Currency */}
                      {item.origCur !== activeCurrency ? (
                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold block">
                          → {formatMoney(item.convertedDebt, activeCurrency)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          (Direct {activeCurrency})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Engineered &amp; Maintained by <strong className="text-slate-700 dark:text-slate-200">Bako Bayan Madhhar</strong> • 07705488654
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-95 cursor-pointer"
          >
            {lang === 'en' ? 'Close Inspector' : 'داخستن'}
          </button>
        </div>

      </div>
    </div>
  );
}
