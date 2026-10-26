'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  CheckCircle2,
  Lock,
  Wallet,
  Building2,
  RefreshCw,
  Clock,
  Briefcase
} from 'lucide-react';
import { CurrencyCode } from '../types/inventory';
import { SvgAreaTrendChart } from './VisualChartsModal';

export const ExecutiveProfitSuite: React.FC = () => {
  const {
    transactions,
    materials,
    exchangeRates,
    formatMoney,
    userPermissions,
    language,
    currentUser,
    setCurrentModule,
    openVisualCharts,
  } = useInventory();

  const wh = useWarehouseOps();
  const isKu = language === 'ku';

  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'month'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'USD' | 'IQD' | 'EUR'>('ALL');

  // Strict RBAC Gate: Must be unmounted if user lacks financial analytics privileges
  if (!userPermissions.canViewFinancialAnalytics) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 font-mono text-xs font-bold">
            {isKu ? 'تایبەت بە بەڕێوەبەر' : 'Executive Confidential Gated'}
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {isKu ? 'قازانج و دارایی بەڕێوەبەر' : 'Executive Profit Suite'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {isKu
              ? 'ئەم بەشە زانیارییە نهێنی و داراییەکانی قازانجی پوخت، تێچووی کڕینی تەختە لە فاندەرمەکس، و باڵانسی سەرەکی لەخۆدەگرێت و تەنها بۆ خاوەن کار و بەڕێوەبەرە.'
              : 'This division contains confidential landed cost margins, cash flow solvency, and FunderMax liability accounts. Access is restricted to Executive Owners.'}
          </p>
          <button
            type="button"
            onClick={() => setCurrentModule('hub')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {isKu ? 'گەڕانەوە بۆ مێنیوی سەرەکی' : 'Return to Main Menu'}
          </button>
        </div>
      </div>
    );
  }

  // Filter Transactions by Timeframe
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthPrefix = now.toISOString().slice(0, 7);

    return transactions.filter((tx) => {
      if (tx.isDeleted) return false;
      const txDate = (tx.timestamp || '').slice(0, 10);
      if (timeframe === 'today') return txDate === todayStr;
      if (timeframe === 'month') return txDate.startsWith(monthPrefix);
      return true;
    });
  }, [transactions, timeframe]);

  // Aggregate Sales, Realized Gross Profit & Cash Flow
  const financials = useMemo(() => {
    let revenueUSD = 0;
    let revenueIQD = 0;
    let costUSD = 0;
    let costIQD = 0;
    let cashPaidUSD = 0;
    let cashPaidIQD = 0;
    let customerDebtUSD = 0;
    let customerDebtIQD = 0;

    for (const tx of filteredTransactions) {
      const isIqd = tx.currency === 'IQD' || tx.chargedCurrency === 'IQD';
      const rev = Number(tx.totalAfterDiscount || tx.sellingAmount) || 0;
      const cost = Number(tx.costPrice) || 0;
      const paid = Number(tx.amountPaidNow) || 0;
      const debt = Number(tx.combinedTotalDebt || tx.amountOwed) || 0;

      if (isIqd) {
        revenueIQD += rev;
        costIQD += cost;
        cashPaidIQD += paid;
        customerDebtIQD += debt;
      } else {
        revenueUSD += rev;
        costUSD += cost;
        cashPaidUSD += paid;
        customerDebtUSD += debt;
      }
    }

    const profitUSD = revenueUSD - costUSD;
    const profitIQD = revenueIQD - costIQD;
    const marginUSD = revenueUSD > 0 ? (profitUSD / revenueUSD) * 100 : 0;

    return {
      revenueUSD: Math.round(revenueUSD * 100) / 100,
      revenueIQD: Math.round(revenueIQD),
      costUSD: Math.round(costUSD * 100) / 100,
      costIQD: Math.round(costIQD),
      profitUSD: Math.round(profitUSD * 100) / 100,
      profitIQD: Math.round(profitIQD),
      marginUSD: Math.round(marginUSD * 10) / 10,
      cashPaidUSD: Math.round(cashPaidUSD * 100) / 100,
      cashPaidIQD: Math.round(cashPaidIQD),
      customerDebtUSD: Math.round(customerDebtUSD * 100) / 100,
      customerDebtIQD: Math.round(customerDebtIQD),
    };
  }, [filteredTransactions]);

  // Supplier Payables: FunderMax Liability (Accounts Payable)
  const supplierPayables = useMemo(() => {
    let debtEUR = 0;
    let debtUSD = 0;
    let totalInvoicedEUR = 0;
    let totalInvoicedUSD = 0;
    let totalPaidEUR = 0;
    let totalPaidUSD = 0;
    let activeConsignments = 0;

    for (const s of wh.activeShipments) {
      activeConsignments++;
      const curr = s.invoiceCurrency || (s.supplier.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);

      if (curr === 'EUR') {
        debtEUR += debt;
        totalInvoicedEUR += invoiced;
        totalPaidEUR += paid;
      } else {
        debtUSD += debt;
        totalInvoicedUSD += invoiced;
        totalPaidUSD += paid;
      }
    }

    return {
      debtEUR: Math.round(debtEUR * 100) / 100,
      debtUSD: Math.round(debtUSD * 100) / 100,
      totalInvoicedEUR: Math.round(totalInvoicedEUR * 100) / 100,
      totalInvoicedUSD: Math.round(totalInvoicedUSD * 100) / 100,
      totalPaidEUR: Math.round(totalPaidEUR * 100) / 100,
      totalPaidUSD: Math.round(totalPaidUSD * 100) / 100,
      activeConsignments,
    };
  }, [wh.activeShipments]);

  // Landed Cost vs POS Revenue breakdown by Material
  const materialBreakdown = useMemo(() => {
    const map = new Map<string, {
      name: string;
      code: string;
      type: string;
      sheetsSold: number;
      revenueUSD: number;
      costUSD: number;
      profitUSD: number;
    }>();

    for (const tx of filteredTransactions) {
      const name = tx.material || tx.panelType || 'General Product';
      const key = name.trim().toLowerCase();
      const current = map.get(key) || {
        name,
        code: tx.code || 'MAT',
        type: tx.panelType || 'Panel',
        sheetsSold: 0,
        revenueUSD: 0,
        costUSD: 0,
        profitUSD: 0,
      };

      const isIqd = tx.currency === 'IQD' || tx.chargedCurrency === 'IQD';
      const rev = Number(tx.totalAfterDiscount || tx.sellingAmount) || 0;
      const cost = Number(tx.costPrice) || 0;

      // Approximate USD equivalent if in IQD for ranking purposes
      const revUSD = isIqd ? rev / (exchangeRates.usdToIqd || 1500) : rev;
      const costUSD = isIqd ? cost / (exchangeRates.usdToIqd || 1500) : cost;

      current.sheetsSold += Number(tx.quantity) || 1;
      current.revenueUSD += revUSD;
      current.costUSD += costUSD;
      current.profitUSD += (revUSD - costUSD);

      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => b.profitUSD - a.profitUSD);
  }, [filteredTransactions, exchangeRates]);

  // Executive Balance (Cash Intake vs FunderMax Liability)
  const convertedEurLiabilityInUsd = supplierPayables.debtEUR * (exchangeRates.eurToUsd || 1.08);
  const totalLiabilityUSD = supplierPayables.debtUSD + convertedEurLiabilityInUsd;
  const netOperatingSurplusUSD = financials.cashPaidUSD - totalLiabilityUSD;

  // Daily / Transaction Realized Profit Trajectory Trend Points
  const dailyProfitTrend = useMemo(() => {
    const map = new Map<string, { label: string; profit: number }>();
    const sorted = [...filteredTransactions].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

    sorted.slice(-14).forEach((tx, idx) => {
      const dateLabel = (tx.timestamp || '').slice(5, 10) || `#${idx + 1}`;
      const rev = Number(tx.totalAfterDiscount || tx.sellingAmount) || 0;
      const cost = Number(tx.costPrice) || 0;
      const profit = Math.max(0, rev - cost);

      const prev = map.get(dateLabel) || { label: dateLabel, profit: 0 };
      prev.profit += profit;
      map.set(dateLabel, prev);
    });

    return Array.from(map.values()).map((item) => ({
      label: item.label,
      value: Math.round(item.profit),
    }));
  }, [filteredTransactions]);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* EXECUTIVE HEADER: Confidential Shield, Period Switcher & Company ID      */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isKu ? 'قازانج و دارایی بەڕێوەبەر' : 'Executive Profit Suite'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                👑 Executive Only
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Realized Margins
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {isKu
                ? 'کۆمپانیای شاسوار ئەحمەد شاسوار • شیکاری قازانجی ڕاستەقینە، باڵانسی کاش، و قەرزی فاندەرمەکس'
                : 'Shaswar Ahmad Shaswar Co. • Realized gross profit, net cash flow, and FunderMax supplier solvency'}
            </p>
          </div>
        </div>

        {/* Executive Timeframe Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/80 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'all'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {isKu ? 'تەواوی کات' : 'All Time'}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'month'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {isKu ? 'ئەم مانگە' : 'This Month'}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'today'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {isKu ? 'ئەمڕۆ' : 'Today'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 PRIMARY EXECUTIVE KPI CARDS                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Realized Gross Profit */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isKu ? 'قازانجی پوخت (Gross Profit)' : 'Realized Gross Profit'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${financials.profitUSD.toLocaleString()}
          </div>
          {financials.profitIQD > 0 && (
            <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
              +{financials.profitIQD.toLocaleString()} IQD
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Average Margin:</span>
            <span className="font-bold text-emerald-600 font-mono">
              {financials.marginUSD}%
            </span>
          </div>
        </div>

        {/* KPI 2: Net Cash Intake */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isKu ? 'کاشی وەرگیراو' : 'Collected Cash Intake'}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
            ${financials.cashPaidUSD.toLocaleString()}
          </div>
          {financials.cashPaidIQD > 0 && (
            <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
              {financials.cashPaidIQD.toLocaleString()} IQD
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Customer Debt:</span>
            <span className="font-bold text-rose-500 font-mono">
              ${financials.customerDebtUSD.toLocaleString()}
            </span>
          </div>
        </div>

        {/* KPI 3: Supplier Liability */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isKu ? 'قەرزی کۆمپانیاکان (لەسەرمان)' : 'FunderMax Supplier Payables'}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
            €{supplierPayables.debtEUR.toLocaleString()}
          </div>
          {supplierPayables.debtUSD > 0 && (
            <div className="text-xs font-mono font-bold text-rose-500">
              +${supplierPayables.debtUSD.toLocaleString()} USD
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Active Consignments:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
              {supplierPayables.activeConsignments} batches
            </span>
          </div>
        </div>

        {/* KPI 4: Executive Solvency Health */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isKu ? 'باری دارایی کۆمپانیا' : 'Executive Operating Balance'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${netOperatingSurplusUSD >= 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
            ${Math.round(netOperatingSurplusUSD).toLocaleString()}
          </div>
          <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
            Net Surplus After Payables
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Company Solvency:</span>
            <span className="font-black text-emerald-600">
              {netOperatingSurplusUSD >= 0 ? (isKu ? 'زۆر باشە' : 'Strong') : (isKu ? 'مەترسیدارە' : 'Caution')}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DUAL DEBT LEDGER: RECEIVABLES (CUSTOMER DEBT) VS PAYABLES (SUPPLIER DEBT) */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Coins className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isKu ? 'تەرازووی قەرزەکان: وەرگیراو بەرامبەر دراو (Dual Debt Ledger)' : 'Dual Debt Ledger: Receivables vs. Payables'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isKu
                ? 'جیاکردنەوەی تەواوی قەرزی کڕیاران (ئێمە وەریدەگرینەوە) لە بەرامبەر قەرزی دابینکەران (ئێمە دەبێت بیدەین)'
                : 'Clear accounting separation between customer receivables and company supplier liabilities.'}
            </p>
          </div>

          {/* 3. Net Cash Position / تەرازووی قەرز */}
          <div className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 self-start sm:self-auto shadow-xs ${
            (financials.customerDebtUSD + (financials.customerDebtIQD / (exchangeRates.usdToIqd || 1500)) - totalLiabilityUSD) >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
          }`}>
            <span className="text-base">{(financials.customerDebtUSD + (financials.customerDebtIQD / (exchangeRates.usdToIqd || 1500)) - totalLiabilityUSD) >= 0 ? '📈' : '📉'}</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">
                {isKu ? 'تەرازووی قەرز (Net Balance = Receivables − Payables)' : 'Net Balance = Receivables − Payables'}
              </div>
              <div className="font-mono text-sm font-black">
                {(financials.customerDebtUSD + (financials.customerDebtIQD / (exchangeRates.usdToIqd || 1500)) - totalLiabilityUSD) >= 0 ? '+' : ''}${Math.round(financials.customerDebtUSD + (financials.customerDebtIQD / (exchangeRates.usdToIqd || 1500)) - totalLiabilityUSD).toLocaleString()} USD
                <span className="text-[10px] font-normal ms-1">
                  ({(financials.customerDebtUSD + (financials.customerDebtIQD / (exchangeRates.usdToIqd || 1500)) - totalLiabilityUSD) >= 0
                    ? (isKu ? 'باڵانسی ئەرێنی لە بازاڕ' : 'Net Positive in Street Credit')
                    : (isKu ? 'قەرزی سەر کۆمپانیا زیاترە' : 'Net Negative in Street Credit')})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Money Owed TO Us (قەرزی لای خەڵک / Receivables) */}
          <div className="p-5 rounded-2xl border-2 border-rose-400/90 dark:border-rose-500/80 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-rose-950/20 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  {isKu ? 'Money Owed TO Us (قەرزی لای خەڵک / Receivables)' : 'Money Owed TO Us (قەرزی لای خەڵک / Receivables)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                  {isKu ? 'ئێمە وەریدەگرینەوە' : 'We Collect'}
                </span>
              </div>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80 font-medium mb-3">
                {isKu ? 'پارەی داواکراو لە کڕیاران (ئێمە وەریدەگرینەوە)' : 'پارەی داواکراو لە کڕیاران (ئێمە وەریدەگرینەوە)'}
              </p>
              <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                ${financials.customerDebtUSD.toLocaleString()}
              </div>
              {financials.customerDebtIQD > 0 && (
                <div className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 mt-1">
                  +{financials.customerDebtIQD.toLocaleString()} IQD
                </div>
              )}
            </div>
            <div className="pt-3 mt-4 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
              <span>{isKu ? 'سەرچاوە: فرۆشتن و وەسڵ (POS)' : 'Source: Sales Invoices (POS)'}</span>
              <button
                type="button"
                onClick={() => setCurrentModule('sales')}
                className="font-bold underline hover:text-rose-900 dark:hover:text-white cursor-pointer"
              >
                {isKu ? 'بینینی فرۆشتن ←' : 'View Invoices ←'}
              </button>
            </div>
          </div>

          {/* Card 2: Money Owed BY Us (قەرزی سەر ئێمە / Payables) */}
          <div className="p-5 rounded-2xl border-2 border-amber-400/90 dark:border-amber-500/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  {isKu ? 'Money Owed BY Us (قەرزی سەر ئێمە / Payables)' : 'Money Owed BY Us (قەرزی سەر ئێمە / Payables)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  {isKu ? 'ئێمە دەبێت بیدەین' : 'We Pay Out'}
                </span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium mb-3">
                {isKu ? 'پارەی قەرزی دابینکەران (ئێمە دەبێت بیدەین)' : 'پارەی قەرزی دابینکەران (ئێمە دەبێت بیدەین)'}
              </p>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                €{supplierPayables.debtEUR.toLocaleString()}
              </div>
              {supplierPayables.debtUSD > 0 && (
                <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 mt-1">
                  +${supplierPayables.debtUSD.toLocaleString()} USD
                </div>
              )}
            </div>
            <div className="pt-3 mt-4 border-t border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <span>{isKu ? 'سەرچاوە: کاروانەکانی فاندەرمەکس' : 'Source: FunderMax Shipments'}</span>
              <button
                type="button"
                onClick={() => setCurrentModule('shipping')}
                className="font-bold underline hover:text-amber-900 dark:hover:text-white cursor-pointer"
              >
                {isKu ? 'بینینی گواستنەوە ←' : 'View Shipping ←'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE VISUAL PROFIT TRAJECTORY CHART (Mobile Responsive)              */}
      {/* ========================================================================= */}
      {dailyProfitTrend.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span>{isKu ? 'چارتی گەشەی قازانجی ڕاستەقینە' : 'Realized Profit Trajectory ($)'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKu ? 'شیکاری بینراوی داهات و قازانجی پوخت بەپێی زنجیرەی پسوولەکان' : 'Visual profit trend trajectory over recent operating transactions'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openVisualCharts('sales')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{isKu ? 'بینینی تەواوی چارتەکان' : 'Open Full Analytics Suite'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[500px] sm:min-w-full">
              <SvgAreaTrendChart
                data={dailyProfitTrend}
                lineColor="#10b981"
                fillGradientId="execProfitGrad"
                height={220}
                valuePrefix="$"
                isKu={isKu}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: LANDED MATERIAL COST VS POS REVENUE BREAKDOWN                 */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>{isKu ? 'قازانجی فرۆشتن بەپێی مەواد و تابلۆکان' : 'Landed Material Cost vs. POS Revenue'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isKu
                ? 'بەراوردکردنی تێچووی کڕین لە فاندەرمەکس بەرامبەر نرخی فرۆشتنی ئێستا و قازانجی ڕاستەقینە'
                : 'Realized gross profit and markup margin per panel material category'}
            </p>
          </div>
        </div>

        {/* Mobile View: Distinct Padded Cards (hides secondary technical columns) */}
        <div className="block md:hidden space-y-3">
          {materialBreakdown.length === 0 ? (
            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
              {isKu ? 'هیچ فرۆشتنێک تۆمار نەکراوە لەم ماوەیەدا.' : 'No sales records logged in the selected timeframe.'}
            </div>
          ) : (
            materialBreakdown.map((m, idx) => {
              const margin = m.revenueUSD > 0 ? (m.profitUSD / m.revenueUSD) * 100 : 0;
              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2 p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {m.type}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                      {Math.round(margin * 10) / 10}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isKu ? 'قازانجی پوخت:' : 'Net Profit:'}
                    </span>
                    <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      +${Math.round(m.profitUSD).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Spreadsheet Table */}
        <div className="hidden md:block w-full max-w-full overflow-x-auto pb-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Panel Material</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Units Sold</th>
                <th className="p-3 text-right">Revenue (USD)</th>
                <th className="p-3 text-right">Landed Cost (USD)</th>
                <th className="p-3 text-right">Gross Profit</th>
                <th className="p-3 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {materialBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No sales records logged in the selected timeframe.
                  </td>
                </tr>
              ) : (
                materialBreakdown.map((m, idx) => {
                  const margin = m.revenueUSD > 0 ? (m.profitUSD / m.revenueUSD) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="p-3 text-slate-500">{m.type}</td>
                      <td className="p-3 text-right font-mono font-bold">{m.sheetsSold}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ${Math.round(m.revenueUSD).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        ${Math.round(m.costUSD).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        +${Math.round(m.profitUSD).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {Math.round(margin * 10) / 10}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: FUNDERMAX SUPPLIER CONSIGNMENT PAYABLES LEDGER                 */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <span>{isKu ? 'کاروانەکانی فاندەرمەکس و قەرزی ماوەی دابینکەر' : 'FunderMax GmbH Active Consignments & Payables'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isKu
                ? 'تۆماری قەرزی کۆمپانیا بۆ کارگەی فاندەرمەکس (نەمسا) بەپێی کاروان و کۆنتێنەر'
                : 'Company accounts payable ledger owed to international supplier FunderMax GmbH'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Total EUR Debt: €{supplierPayables.debtEUR.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Mobile View: Distinct Padded Cards (hides secondary technical columns) */}
        <div className="block md:hidden space-y-3">
          {wh.activeShipments.length === 0 ? (
            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
              {isKu ? 'هیچ کاروانێکی دابینکەر چالاک نییە.' : 'No active supplier consignments in warehouse ops.'}
            </div>
          ) : (
            wh.activeShipments.map((s) => {
              const curr = s.invoiceCurrency || (s.supplier.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
              const invoiced = Number(s.totalInvoiceAmount) || 0;
              const paid = Number(s.amountPaidToSupplier) || 0;
              const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
              const isPaid = debt <= 0;

              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 block">
                        {s.batchCode}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block mt-0.5">
                        {s.supplier}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : paid > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {isPaid ? (isKu ? 'دراوە' : 'PAID') : paid > 0 ? (isKu ? 'بەشێک' : 'PARTIAL') : (isKu ? 'نەدراوە' : 'UNPAID')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isKu ? 'قەرزی ماوە:' : 'Remaining Debt:'}
                    </span>
                    <span className="font-black font-mono text-rose-600 dark:text-rose-400 text-sm">
                      {curr === 'EUR' ? '€' : '$'}{debt.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Spreadsheet Table */}
        <div className="hidden md:block w-full max-w-full overflow-x-auto pb-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3">Batch Code</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Arrival Date</th>
                <th className="p-3 text-right">Invoiced Total</th>
                <th className="p-3 text-right">Paid to Supplier</th>
                <th className="p-3 text-right">Remaining Debt</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {wh.activeShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No active supplier consignments in warehouse ops.
                  </td>
                </tr>
              ) : (
                wh.activeShipments.map((s) => {
                  const curr = s.invoiceCurrency || (s.supplier.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
                  const invoiced = Number(s.totalInvoiceAmount) || 0;
                  const paid = Number(s.amountPaidToSupplier) || 0;
                  const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
                  const isPaid = debt <= 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-sky-600">{s.batchCode}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {s.supplier}
                        <span className="text-[10px] text-slate-400 block font-normal">{s.originCountry || 'Austria (EU)'}</span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono">{s.arrivalDate || '—'}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {curr === 'EUR' ? '€' : '$'}{invoiced.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                        {curr === 'EUR' ? '€' : '$'}{paid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        {curr === 'EUR' ? '€' : '$'}{debt.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : paid > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {isPaid ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveProfitSuite;
