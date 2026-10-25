'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Plus,
  Trash2,
  Edit3,
  ReceiptText,
  Printer,
  Calculator,
  Download,
  Search,
  Coins,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  UserCheck,
  SlidersHorizontal,
  BarChart3
} from 'lucide-react';
import { CurrencyCode, PanelTransaction, InvoiceItem, ExchangeRates } from '../types/inventory';
import PrintInvoiceModal from './PrintInvoiceModal';
import MathBreakdownModal from './MathBreakdownModal';
import { SearchableDropdown } from './SearchableDropdown';
import DropdownManagerModal from './DropdownManagerModal';
import { exportTransactionsToCSV } from '../utils/export';
import { roundMoney, buildMoneySnapshot } from '../lib/money';
import { autoCapitalizeFirstLetter } from '../utils/text';

export const SalesSection: React.FC = () => {
  const {
    t,
    language,
    theme,
    transactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    dropdownPresets,
    addToDropdownPresets,
    removeFromDropdownPresets,
    exchangeRates,
    setExchangeRates,
    copyMarketReferenceToOperational,
    convertCurrency,
    formatMoney,
    posDraft,
    setPosDraft,
    clearPosDraft,
    canModify,
    isViewer,
    userPermissions,
    openVisualCharts,
  } = useInventory();

  const isDark = theme === 'dark';
  const isKu = language === 'ku';

  // Dropdown options
  const savedTypes = dropdownPresets.savedTypes || [];
  const savedProducts = dropdownPresets.savedProducts || [];
  const savedSellingTypes = dropdownPresets.savedSellingTypes || [];
  const savedSellers = dropdownPresets.savedSellers || [];
  const savedBanks = dropdownPresets.savedBanks || [];
  const savedPaymentTypes = dropdownPresets.savedPaymentTypes || [];

  // Local UI state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'completed' | 'debt' | 'partial'>('all');
  const [salesSellerFilter, setSalesSellerFilter] = useState<string>('all');
  const [salesPaymentMethodFilter, setSalesPaymentMethodFilter] = useState<string>('all');
  const [salesTimeframeFilter, setSalesTimeframeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [salesSortBy, setSalesSortBy] = useState<'newest' | 'oldest' | 'highestTotal' | 'highestDebt'>('newest');
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [manualUsdToIqd, setManualUsdToIqd] = useState<string>(String(exchangeRates.usdToIqd || 1500));
  const [manualEurToUsd, setManualEurToUsd] = useState<string>(String(exchangeRates.eurToUsd || 1.08));
  const [manualEurToIqd, setManualEurToIqd] = useState<string>(String(exchangeRates.eurToIqd || 1620));

  // Modals
  const [inspectingTxForMath, setInspectingTxForMath] = useState<boolean>(false);
  const [printingTx, setPrintingTx] = useState<PanelTransaction | null>(null);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [addingDropdownCategory, setAddingDropdownCategory] = useState<
    'savedTypes' | 'savedProducts' | 'savedSellingTypes' | 'savedSellers' | 'savedBanks' | 'savedPaymentTypes' | null
  >(null);
  const [newDropdownValue, setNewDropdownValue] = useState('');

  // Expandable row state in ledger
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  const toggleExpandTx = (id: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Active Draft Calculations
  const currentRowQty = typeof posDraft.rowQuantity === 'number' ? posDraft.rowQuantity : 1;
  const currentRowPrice = typeof posDraft.rowPrice === 'number' ? posDraft.rowPrice : 0;
  const currentRowTotal = currentRowQty * currentRowPrice;

  const itemsTotal = posDraft.items.reduce((acc, item) => acc + item.total, 0);
  const activeRowHasData = (posDraft.rowType || posDraft.rowProduct) && currentRowPrice > 0;
  const effectiveGrandTotal =
    posDraft.items.length > 0 ? itemsTotal + (activeRowHasData ? currentRowTotal : 0) : currentRowTotal;

  // Discount Handling
  const numDiscount = typeof posDraft.discountDollars === 'number' ? posDraft.discountDollars : 0;
  const totalAfterDiscount = Math.max(0, effectiveGrandTotal - numDiscount);
  const numPaidNow = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
  const currentOrderDebt = Math.max(0, totalAfterDiscount - numPaidNow);
  const numOldDebt = typeof posDraft.oldUnpaidDebt === 'number' ? posDraft.oldUnpaidDebt : 0;
  const combinedTotalDebt = currentOrderDebt + numOldDebt;

  // Cost and Gross profit
  const costPrice = effectiveGrandTotal; // baseline cost estimation
  const grossProfit = totalAfterDiscount - costPrice;
  const profitMargin = effectiveGrandTotal > 0 ? parseFloat(((grossProfit / effectiveGrandTotal) * 100).toFixed(1)) : 0;

  // Add line item row to draft
  const handleAddLineItem = () => {
    if (!posDraft.rowType && !posDraft.rowProduct && currentRowPrice === 0) return;

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: posDraft.invoiceCode.trim() ? autoCapitalizeFirstLetter(posDraft.invoiceCode.trim()) : undefined,
      type: autoCapitalizeFirstLetter(posDraft.rowType || 'Panel'),
      product: autoCapitalizeFirstLetter(posDraft.rowProduct || 'Wood Panel Item'),
      quantity: currentRowQty,
      sellingType: autoCapitalizeFirstLetter(posDraft.rowSellingType || 'Wholesale (کۆ)'),
      price: currentRowPrice,
      total: currentRowTotal,
      seller: posDraft.seller.trim() ? autoCapitalizeFirstLetter(posDraft.seller.trim()) : undefined,
      bank: posDraft.bank.trim() ? autoCapitalizeFirstLetter(posDraft.bank.trim()) : undefined,
      paymentType: posDraft.paymentType.trim() ? autoCapitalizeFirstLetter(posDraft.paymentType.trim()) : undefined,
    };

    setPosDraft((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      rowType: '',
      rowProduct: '',
      rowQuantity: 1,
      rowSellingType: '',
      rowPrice: '',
    }));
  };

  const handleDeleteLineItem = (id: string) => {
    setPosDraft((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  // Currency change handler for draft
  const handleCurrencyChange = (newCur: CurrencyCode) => {
    if (newCur === posDraft.activeCurrency) return;
    const oldCur = posDraft.activeCurrency;

    setPosDraft((prev) => {
      const convertedItems = prev.items.map((item) => {
        const newPrice = convertCurrency(item.price, oldCur, newCur);
        return {
          ...item,
          price: newPrice,
          total: item.quantity * newPrice,
        };
      });

      const convertedRowPrice =
        typeof prev.rowPrice === 'number' && prev.rowPrice > 0
          ? convertCurrency(prev.rowPrice, oldCur, newCur)
          : prev.rowPrice;

      const convertedDiscount =
        typeof prev.discountDollars === 'number' && prev.discountDollars > 0
          ? convertCurrency(prev.discountDollars, oldCur, newCur)
          : prev.discountDollars;

      const convertedPaid =
        typeof prev.amountPaidNow === 'number' && prev.amountPaidNow > 0
          ? convertCurrency(prev.amountPaidNow, oldCur, newCur)
          : prev.amountPaidNow;

      const convertedOldDebt =
        typeof prev.oldUnpaidDebt === 'number' && prev.oldUnpaidDebt > 0
          ? convertCurrency(prev.oldUnpaidDebt, oldCur, newCur)
          : prev.oldUnpaidDebt;

      return {
        ...prev,
        activeCurrency: newCur,
        items: convertedItems,
        rowPrice: convertedRowPrice,
        discountDollars: convertedDiscount,
        amountPaidNow: convertedPaid,
        oldUnpaidDebt: convertedOldDebt,
      };
    });
  };

  // Discount percentage vs dollars sync
  const handleDiscountDollarsChange = (val: number | '') => {
    setPosDraft((prev) => ({
      ...prev,
      discountDollars: val,
      discountPercentage:
        val === '' || effectiveGrandTotal <= 0
          ? ''
          : parseFloat(((val / effectiveGrandTotal) * 100).toFixed(2)),
    }));
  };

  const handleDiscountPercentChange = (val: number | '') => {
    setPosDraft((prev) => ({
      ...prev,
      discountPercentage: val,
      discountDollars:
        val === '' || effectiveGrandTotal <= 0
          ? ''
          : parseFloat(((effectiveGrandTotal * val) / 100).toFixed(2)),
    }));
  };

  // Save Transaction
  const handleSaveInvoice = (andPrint = false) => {
    let finalItems = [...posDraft.items];
    if (posDraft.rowType || posDraft.rowProduct || currentRowPrice > 0) {
      finalItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: posDraft.invoiceCode.trim() ? autoCapitalizeFirstLetter(posDraft.invoiceCode.trim()) : undefined,
        type: autoCapitalizeFirstLetter(posDraft.rowType || 'Panel'),
        product: autoCapitalizeFirstLetter(posDraft.rowProduct || 'Wood Panel Item'),
        quantity: currentRowQty,
        sellingType: autoCapitalizeFirstLetter(posDraft.rowSellingType || 'Wholesale (کۆ)'),
        price: currentRowPrice,
        total: currentRowTotal,
        seller: posDraft.seller.trim() ? autoCapitalizeFirstLetter(posDraft.seller.trim()) : undefined,
        bank: posDraft.bank.trim() ? autoCapitalizeFirstLetter(posDraft.bank.trim()) : undefined,
        paymentType: posDraft.paymentType.trim() ? autoCapitalizeFirstLetter(posDraft.paymentType.trim()) : undefined,
      });
    }

    if (finalItems.length === 0) {
      alert(isKu ? 'تکایە بەلایەنی کەمەوە یەک بڕگە دیاریبکە' : 'Please enter at least one line item');
      return;
    }

    finalItems = finalItems.map((item) => ({
      ...item,
      code: item.code ? autoCapitalizeFirstLetter(item.code) : (posDraft.invoiceCode.trim() ? autoCapitalizeFirstLetter(posDraft.invoiceCode.trim()) : undefined),
      seller: item.seller ? autoCapitalizeFirstLetter(item.seller) : (posDraft.seller.trim() ? autoCapitalizeFirstLetter(posDraft.seller.trim()) : undefined),
      bank: item.bank ? autoCapitalizeFirstLetter(item.bank) : (posDraft.bank.trim() ? autoCapitalizeFirstLetter(posDraft.bank.trim()) : undefined),
      paymentType: item.paymentType ? autoCapitalizeFirstLetter(item.paymentType) : (posDraft.paymentType.trim() ? autoCapitalizeFirstLetter(posDraft.paymentType.trim()) : undefined),
    }));

    const totalQty = finalItems.reduce((acc, i) => acc + i.quantity, 0);
    const orderTotalAmount = finalItems.reduce((acc, i) => acc + i.total, 0);
    const orderDiscount = typeof posDraft.discountDollars === 'number' ? posDraft.discountDollars : 0;
    const finalNet = Math.max(0, orderTotalAmount - orderDiscount);
    const orderPaid = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
    const orderOwed = Math.max(0, finalNet - orderPaid);
    const orderOldDebt = typeof posDraft.oldUnpaidDebt === 'number' ? posDraft.oldUnpaidDebt : 0;
    const orderCombinedDebt = orderOwed + orderOldDebt;

    const txStatus: 'completed' | 'partial' | 'debt' =
      orderOwed <= 0 ? 'completed' : orderPaid > 0 ? 'partial' : 'debt';

    if (editingTxId) {
      if (!userPermissions.canEditSales) {
        alert(isKu ? 'دەسەڵاتی دەستکاریکردنی ئەم پسوولەیەت نییە' : 'You do not have permission to edit sales invoices.');
        return;
      }
    } else {
      if (!userPermissions.canCreateSales) {
        alert(isKu ? 'دەسەڵاتی دروستکردنی پسوولەی نوێت نییە' : 'You do not have permission to create sales invoices.');
        return;
      }
    }

    const cur = posDraft.activeCurrency;
    const roundedSelling = roundMoney(orderTotalAmount, cur);
    const roundedDiscount = roundMoney(orderDiscount, cur);
    const roundedNet = roundMoney(finalNet, cur);
    const roundedPaid = roundMoney(orderPaid, cur);
    const roundedOwed = roundMoney(orderOwed, cur);
    const roundedOldDebt = roundMoney(orderOldDebt, cur);
    const roundedCombinedDebt = roundMoney(orderCombinedDebt, cur);

    const moneySnap = buildMoneySnapshot(roundedNet, cur, exchangeRates);

    const txPayload: PanelTransaction = {
      id: editingTxId || `tx-${Date.now()}`,
      code: posDraft.invoiceCode.trim() ? autoCapitalizeFirstLetter(posDraft.invoiceCode.trim()) : undefined,
      timestamp: new Date().toISOString(),
      panelType: autoCapitalizeFirstLetter(finalItems[0]?.type || 'Panel'),
      material: finalItems.length === 1 ? autoCapitalizeFirstLetter(finalItems[0].product) : `${finalItems.length} Products (${totalQty} units)`,
      quantity: totalQty,
      unit: isKu ? 'دانە' : 'sheets',
      sellingType: autoCapitalizeFirstLetter(finalItems[0]?.sellingType || 'Wholesale (کۆ)'),
      seller: posDraft.seller.trim() ? autoCapitalizeFirstLetter(posDraft.seller.trim()) : undefined,
      bank: posDraft.bank.trim() ? autoCapitalizeFirstLetter(posDraft.bank.trim()) : undefined,
      paymentType: posDraft.paymentType.trim() ? autoCapitalizeFirstLetter(posDraft.paymentType.trim()) : undefined,
      currency: cur,
      currencyRate:
        cur === 'IQD'
          ? exchangeRates.usdToIqd
          : cur === 'EUR'
          ? exchangeRates.eurToUsd
          : 1,
      sellingAmount: roundedSelling,
      costPrice: roundedSelling,
      discountDollars: roundedDiscount,
      discountPercentage: typeof posDraft.discountPercentage === 'number' ? posDraft.discountPercentage : 0,
      totalAfterDiscount: roundedNet,
      amountPaidNow: roundedPaid,
      amountOwed: roundedOwed,
      oldUnpaidDebt: roundedOldDebt,
      combinedTotalDebt: roundedCombinedDebt,
      grossProfit: 0,
      profitMargin: 0,
      notes: posDraft.notes ? autoCapitalizeFirstLetter(posDraft.notes) : '',
      images: posDraft.images,
      status: txStatus,
      lastUpdated: new Date().toISOString(),
      items: finalItems,
      chargedAmount: moneySnap.chargedAmount,
      chargedCurrency: moneySnap.chargedCurrency,
      exchangeRateApplied: moneySnap.exchangeRateApplied,
      baseUsdEquivalent: moneySnap.baseUsdEquivalent,
    };

    if (editingTxId) {
      editTransaction(editingTxId, txPayload);
      setEditingTxId(null);
    } else {
      addTransaction(txPayload);
    }

    if (andPrint) {
      setPrintingTx(txPayload);
    }

    clearPosDraft();
  };

  const handleEditTx = (tx: PanelTransaction) => {
    setEditingTxId(tx.id);
    setPosDraft({
      invoiceCode: tx.code || '',
      seller: tx.seller || '',
      bank: tx.bank || '',
      paymentType: tx.paymentType || '',
      activeCurrency: tx.currency || 'USD',
      items: tx.items && tx.items.length > 0 ? tx.items : [],
      rowType: '',
      rowProduct: '',
      rowQuantity: 1,
      rowSellingType: '',
      rowPrice: '',
      discountDollars: tx.discountDollars || '',
      discountPercentage: tx.discountPercentage || '',
      amountPaidNow: tx.amountPaidNow || '',
      oldUnpaidDebt: tx.oldUnpaidDebt || '',
      notes: tx.notes || '',
      images: tx.images || [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add custom item to dropdown presets
  const handleAddDropdownItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingDropdownCategory || !newDropdownValue.trim()) return;
    addToDropdownPresets(addingDropdownCategory, autoCapitalizeFirstLetter(newDropdownValue.trim()));
    setAddingDropdownCategory(null);
    setNewDropdownValue('');
  };

  // Save manual exchange rates
  const handleSaveOperationalRates = (e: React.FormEvent) => {
    e.preventDefault();
    const uIqd = parseFloat(manualUsdToIqd);
    const eUsd = parseFloat(manualEurToUsd);
    const eIqd = parseFloat(manualEurToIqd);

    if (!isNaN(uIqd) && uIqd > 0 && !isNaN(eUsd) && eUsd > 0 && !isNaN(eIqd) && eIqd > 0) {
      setExchangeRates({
        usdToIqd: uIqd,
        eurToUsd: eUsd,
        eurToIqd: eIqd,
        USD_IQD: uIqd > 10000 ? uIqd : uIqd * 100,
        EUR_USD: eUsd,
        EUR_IQD: eIqd > 10000 ? eIqd : eIqd * 100,
      });
      setShowRateSettings(false);
    }
  };

  // Dynamically extract unique sellers and payment methods
  const availableSellers = useMemo(() => {
    const set = new Set<string>(savedSellers);
    transactions.forEach((tx) => {
      if (tx.seller && tx.seller.trim()) set.add(tx.seller.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [savedSellers, transactions]);

  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>(savedPaymentTypes);
    transactions.forEach((tx) => {
      if (tx.paymentType && tx.paymentType.trim()) set.add(tx.paymentType.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [savedPaymentTypes, transactions]);

  // Filtered and sorted transactions for the ledger
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((tx) => {
      if (salesSearch.trim()) {
        const q = salesSearch.toLowerCase();
        const match =
          (tx.code && tx.code.toLowerCase().includes(q)) ||
          (tx.panelType && tx.panelType.toLowerCase().includes(q)) ||
          (tx.material && tx.material.toLowerCase().includes(q)) ||
          (tx.seller && tx.seller.toLowerCase().includes(q)) ||
          (tx.bank && tx.bank.toLowerCase().includes(q)) ||
          (tx.paymentType && tx.paymentType.toLowerCase().includes(q)) ||
          (tx.notes && tx.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      const debt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0);
      const isPaidFull = debt <= 0;
      const isDebt = debt > 0;
      const isPartial = (tx.amountPaidNow || 0) > 0 && debt > 0;

      if (salesStatusFilter === 'completed' && !isPaidFull) return false;
      if (salesStatusFilter === 'debt' && !isDebt) return false;
      if (salesStatusFilter === 'partial' && !isPartial) return false;

      if (salesSellerFilter !== 'all' && (tx.seller || '').toLowerCase() !== salesSellerFilter.toLowerCase()) {
        return false;
      }

      if (salesPaymentMethodFilter !== 'all' && (tx.paymentType || '').toLowerCase() !== salesPaymentMethodFilter.toLowerCase()) {
        return false;
      }

      if (salesTimeframeFilter !== 'all') {
        const txTime = new Date(tx.timestamp).getTime();
        if (!isNaN(txTime) && txTime > 0) {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (salesTimeframeFilter === 'today' && now - txTime > oneDay) return false;
          if (salesTimeframeFilter === 'yesterday') {
            const diff = now - txTime;
            if (diff <= oneDay || diff > 2 * oneDay) return false;
          }
          if (salesTimeframeFilter === 'week' && now - txTime > 7 * oneDay) return false;
          if (salesTimeframeFilter === 'month' && now - txTime > 30 * oneDay) return false;
        }
      }

      return true;
    });

    list.sort((a, b) => {
      if (salesSortBy === 'highestTotal') {
        return (b.totalAfterDiscount || b.sellingAmount || 0) - (a.totalAfterDiscount || a.sellingAmount || 0);
      }
      if (salesSortBy === 'highestDebt') {
        const debtA = a.combinedTotalDebt !== undefined ? a.combinedTotalDebt : (a.amountOwed || 0);
        const debtB = b.combinedTotalDebt !== undefined ? b.combinedTotalDebt : (b.amountOwed || 0);
        return debtB - debtA;
      }
      if (salesSortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return list;
  }, [transactions, salesSearch, salesStatusFilter, salesSellerFilter, salesPaymentMethodFilter, salesTimeframeFilter, salesSortBy]);

  const hasActiveSalesFilters = Boolean(
    salesSearch.trim() ||
    salesStatusFilter !== 'all' ||
    salesSellerFilter !== 'all' ||
    salesPaymentMethodFilter !== 'all' ||
    salesTimeframeFilter !== 'all' ||
    salesSortBy !== 'newest'
  );

  const resetAllSalesFilters = () => {
    setSalesSearch('');
    setSalesStatusFilter('all');
    setSalesSellerFilter('all');
    setSalesPaymentMethodFilter('all');
    setSalesTimeframeFilter('all');
    setSalesSortBy('newest');
  };

  // System-wide Total Debt & Sales aggregates in active currency
  const totalSystemDebt = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const debt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0);
      if (debt <= 0) return acc;
      const cur = tx.currency || 'USD';
      return acc + convertCurrency(debt, cur, posDraft.activeCurrency);
    }, 0);
  }, [transactions, convertCurrency, posDraft.activeCurrency]);

  const debtorInvoicesCount = useMemo(() => {
    return transactions.filter(
      (tx) => (tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0)) > 0
    ).length;
  }, [transactions]);

  const totalSystemSales = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const amount = tx.totalAfterDiscount || tx.sellingAmount || 0;
      const cur = tx.currency || 'USD';
      return acc + convertCurrency(amount, cur, posDraft.activeCurrency);
    }, 0);
  }, [transactions, convertCurrency, posDraft.activeCurrency]);

  const totalSystemPaid = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const paid = tx.amountPaidNow || 0;
      const cur = tx.currency || 'USD';
      return acc + convertCurrency(paid, cur, posDraft.activeCurrency);
    }, 0);
  }, [transactions, convertCurrency, posDraft.activeCurrency]);

  const filteredTotalDebt = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const debt = tx.combinedTotalDebt !== undefined ? tx.combinedTotalDebt : (tx.amountOwed || 0);
      if (debt <= 0) return acc;
      const cur = tx.currency || 'USD';
      return acc + convertCurrency(debt, cur, posDraft.activeCurrency);
    }, 0);
  }, [filteredTransactions, convertCurrency, posDraft.activeCurrency]);

  const filteredTotalRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      const amount = tx.totalAfterDiscount || tx.sellingAmount || 0;
      const cur = tx.currency || 'USD';
      return acc + convertCurrency(amount, cur, posDraft.activeCurrency);
    }, 0);
  }, [filteredTransactions, convertCurrency, posDraft.activeCurrency]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      {/* SECTION HEADER & CURRENCY TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t.salesInvoicing}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKu
              ? 'دروستکردنی پسوولەی فرۆشتن، دراوەکان، قەرز و چاپی پسوولەی فەرمی'
              : 'Interactive Point-of-Sale invoicing, multi-currency engine, and debt manager'}
          </p>
        </div>

        {/* Currency & Rate Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Pill Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {(['USD', 'IQD', 'EUR'] as CurrencyCode[]).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => handleCurrencyChange(cur)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  posDraft.activeCurrency === cur
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowRateSettings(!showRateSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Exchange Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectingTxForMath(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-purple-500" />
            <span>{t.mathAudit}</span>
          </button>

          {/* Visual Charts Modal Trigger for Sales */}
          <button
            type="button"
            onClick={() => openVisualCharts('sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title={isKu ? 'چارت و شیکاری دارایی فرۆشتن' : 'View Sales POS & Profit Visual Charts'}
          >
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span>{isKu ? 'چارتەکانی فرۆشتن' : 'Sales Charts'}</span>
          </button>
        </div>
      </div>

      {/* OPERATIONAL EXCHANGE RATES SETTINGS CARD (Expandable) */}
      {showRateSettings && (
        <form
          onSubmit={handleSaveOperationalRates}
          className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-md animate-in slide-in-from-top-2 duration-150 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-750">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Operational Exchange Rates (Manual Baseline)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowRateSettings(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                $1 USD ➔ IQD Rate
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={manualUsdToIqd}
                onChange={(e) => setManualUsdToIqd(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                placeholder="1500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                €1 EUR ➔ USD Rate
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={manualEurToUsd}
                onChange={(e) => setManualEurToUsd(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                placeholder="1.08"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                €1 EUR ➔ IQD Direct Rate
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={manualEurToIqd}
                onChange={(e) => setManualEurToIqd(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                placeholder="1620"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.marketNotice}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyMarketReferenceToOperational}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                {t.copyToOperational}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Save Operational Rates
              </button>
            </div>
          </div>
        </form>
      )}

      {/* EXECUTIVE SALES & TOTAL DEBT HIGHLIGHT KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOTAL OUTSTANDING CUSTOMER DEBT (PRIMARY HIGHLIGHT) */}
        <div 
          onClick={() => setInspectingTxForMath(true)}
          className="p-5 rounded-3xl border-2 border-rose-400/90 dark:border-rose-500/80 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-slate-850 dark:to-rose-950/20 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative overflow-hidden"
          title={isKu ? 'کلیک بکە بۆ بینینی هەموو وردەکاری و یاسای هەژمارکردنی قەرز' : 'Click to inspect full transparent debt calculation & itemized formula'}
        >
          {/* Subtle Ambient Corner Accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
              {isKu ? 'کۆی گشتی قەرزی کڕیاران' : 'Total Customer Debt'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {formatMoney(totalSystemDebt, posDraft.activeCurrency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium mt-1.5">
              <span>{debtorInvoicesCount} {isKu ? 'وەسڵی قەرزدار' : 'debtor invoices'}</span>
              <span className="font-bold underline group-hover:text-rose-600">{isKu ? 'وردەکاری قەرز ←' : 'Inspect Math ←'}</span>
            </div>
          </div>
        </div>

        {/* 2. TOTAL INVOICED TURNOVER */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isKu ? 'کۆی گشتی فرۆشراو' : 'Total Invoiced Volume'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatMoney(totalSystemSales, posDraft.activeCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              {transactions.length} {isKu ? 'پسوولەی تۆمارکراو' : 'invoices recorded'}
            </div>
          </div>
        </div>

        {/* 3. CASH COLLECTED */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isKu ? 'پارەی وەرگیراو (نەقد)' : 'Cash Collected'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {formatMoney(totalSystemPaid, posDraft.activeCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              {totalSystemSales > 0 ? Math.round((totalSystemPaid / totalSystemSales) * 100) : 0}% {isKu ? 'ڕێژەی وەرگیراو' : 'collection rate'}
            </div>
          </div>
        </div>

        {/* 4. ACTIVE DRAFT BALANCE HIGHLIGHT */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition-colors ${
          combinedTotalDebt > 0
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isKu ? 'قەرزی ئەم وەسڵەی ئێستا' : 'Current Draft Debt'}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              combinedTotalDebt > 0
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              combinedTotalDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            }`}>
              {combinedTotalDebt > 0 ? formatMoney(combinedTotalDebt, posDraft.activeCurrency) : formatMoney(0, posDraft.activeCurrency)}
            </div>
            <div className="text-[11px] font-medium mt-1.5">
              {combinedTotalDebt > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-bold">{isKu ? 'قەرز لەسەر ئەم کڕینە' : 'Unpaid balance pending'}</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{isKu ? 'تەواو دراوە (بێ قەرز)' : 'Paid in full (zero debt)'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* POS INVOICE CREATOR FORM */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingTxId ? 'Edit Invoice Record' : t.newInvoice}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDropdownManagerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Manage and clean all saved dropdown presets"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Manage Dropdowns</span>
            </button>
            {editingTxId && (
              <button
                onClick={() => {
                  setEditingTxId(null);
                  clearPosDraft();
                }}
                className="px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Business Header Inputs: Code, Seller, Bank, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.invoiceCode}
            </label>
            <input
              type="text"
              value={posDraft.invoiceCode}
              onChange={(e) => setPosDraft({ ...posDraft, invoiceCode: e.target.value })}
              placeholder="e.g. INV-101"
              className="w-full min-h-[42px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.seller}
            </label>
            <SearchableDropdown
              options={savedSellers}
              value={posDraft.seller}
              onChange={(v) => setPosDraft({ ...posDraft, seller: v })}
              onAddNew={(v) => addToDropdownPresets('savedSellers', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedSellers', v)}
              placeholder="Select or add seller..."
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.bank}
            </label>
            <SearchableDropdown
              options={savedBanks}
              value={posDraft.bank}
              onChange={(v) => setPosDraft({ ...posDraft, bank: v })}
              onAddNew={(v) => addToDropdownPresets('savedBanks', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedBanks', v)}
              placeholder="Select bank / drawer..."
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.paymentType}
            </label>
            <SearchableDropdown
              options={savedPaymentTypes}
              value={posDraft.paymentType}
              onChange={(v) => setPosDraft({ ...posDraft, paymentType: v })}
              onAddNew={(v) => addToDropdownPresets('savedPaymentTypes', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedPaymentTypes', v)}
              placeholder="Select payment method..."
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>
        </div>

        {/* ACTIVE LINE ITEM INPUT ROW */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Line Item
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <SearchableDropdown
                options={savedTypes}
                value={posDraft.rowType}
                onChange={(v) => setPosDraft({ ...posDraft, rowType: v })}
                onAddNew={(v) => addToDropdownPresets('savedTypes', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedTypes', v)}
                placeholder="Filter / select type..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Product / Finish</label>
              <SearchableDropdown
                options={savedProducts}
                value={posDraft.rowProduct}
                onChange={(v) => setPosDraft({ ...posDraft, rowProduct: v })}
                onAddNew={(v) => addToDropdownPresets('savedProducts', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedProducts', v)}
                placeholder="Filter / select finish..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Selling Type</label>
              <SearchableDropdown
                options={savedSellingTypes}
                value={posDraft.rowSellingType}
                onChange={(v) => setPosDraft({ ...posDraft, rowSellingType: v })}
                onAddNew={(v) => addToDropdownPresets('savedSellingTypes', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedSellingTypes', v)}
                placeholder="Wholesale/Retail..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Qty</label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="1"
                step="any"
                value={posDraft.rowQuantity}
                onChange={(e) => setPosDraft({ ...posDraft, rowQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Unit Price ({posDraft.activeCurrency})
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.rowPrice}
                onChange={(e) => setPosDraft({ ...posDraft, rowPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                placeholder="0.00"
                readOnly={!userPermissions.canOverridePrice && !userPermissions.canCreateSales}
                disabled={!userPermissions.canOverridePrice && !userPermissions.canCreateSales}
                className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono disabled:opacity-60"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddLineItem}
                disabled={!posDraft.rowType && !posDraft.rowProduct && currentRowPrice === 0}
                className="w-full flex items-center justify-center gap-1.5 min-h-[34px] py-1.5 px-3 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addRow}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ITEMS LIST TABLE */}
        {posDraft.items.length > 0 && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-750 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5 text-right">Line Total</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {posDraft.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-slate-900 dark:text-white font-semibold">
                      {item.product}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                      {item.type}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatMoney(item.price, posDraft.activeCurrency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatMoney(item.total, posDraft.activeCurrency)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteLineItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCIAL SUMMARY & DEBT INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.grossTotal}
            </label>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {formatMoney(effectiveGrandTotal, posDraft.activeCurrency)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.discount} ({posDraft.activeCurrency} / %)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.discountDollars}
                onChange={(e) =>
                  handleDiscountDollarsChange(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="Amt"
                className="w-full px-2.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.discountPercentage}
                onChange={(e) =>
                  handleDiscountPercentChange(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="%"
                className="w-full px-2.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.paidNow} ({posDraft.activeCurrency})
            </label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              step="any"
              value={posDraft.amountPaidNow}
              onChange={(e) =>
                setPosDraft({
                  ...posDraft,
                  amountPaidNow: e.target.value === '' ? '' : parseFloat(e.target.value),
                })
              }
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.oldDebt} ({posDraft.activeCurrency})
            </label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              step="any"
              value={posDraft.oldUnpaidDebt}
              onChange={(e) =>
                setPosDraft({
                  ...posDraft,
                  oldUnpaidDebt: e.target.value === '' ? '' : parseFloat(e.target.value),
                })
              }
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* NET BALANCES & ACTIONS ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <span className="text-xs font-bold text-sky-800 dark:text-sky-300 block">
                {t.netPayable}:
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-900 dark:text-sky-100 font-mono">
                {formatMoney(totalAfterDiscount, posDraft.activeCurrency)}
              </span>
            </div>

            {/* DRAFT ORDER TOTAL DEBT HIGHLIGHT CARD */}
            <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
              combinedTotalDebt > 0
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-700 dark:text-rose-300 shadow-xs'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
            }`}>
              {combinedTotalDebt > 0 ? (
                <>
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-rose-800 dark:text-rose-300">
                      {t.totalDebt}:
                    </span>
                    <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-300 leading-tight">
                      {formatMoney(combinedTotalDebt, posDraft.activeCurrency)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold">
                    {isKu ? 'تەواو دراوە (قەرز نییە)' : 'Zero Debt • Paid in Full'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={clearPosDraft}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {t.clearForm}
            </button>
            {((editingTxId && userPermissions.canEditSales) || (!editingTxId && userPermissions.canCreateSales)) && (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200 hover:bg-sky-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 inline mr-1" />
                  Save & Print
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInvoice(false)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  {t.saveInvoice}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TRANSACTIONS HISTORY TABLE */}
      <div className="space-y-4">
        {/* Main Header & Aggregate Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.invoiceHistory}
            </h2>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {hasActiveSalesFilters ? `${filteredTransactions.length} / ${transactions.length}` : `${transactions.length} invoices`}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
              {isKu ? 'کۆی داهات:' : 'Sales:'} {formatMoney(filteredTotalRevenue, posDraft.activeCurrency)}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
              {isKu ? 'کۆی قەرز:' : 'Debt:'} {formatMoney(filteredTotalDebt, posDraft.activeCurrency)}
            </span>
          </div>

          {userPermissions?.canExport !== false && (
            <button
              type="button"
              onClick={() => exportTransactionsToCSV(filteredTransactions, language)}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              title="Export filtered sales transactions to CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-750 flex flex-wrap items-center justify-between gap-2.5 select-none text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-5xl flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[160px] flex-1">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder={isKu ? 'گەڕان بەپێی کۆد، فرۆشیار، تێبینی...' : 'Search invoices by code, seller, notes...'}
                className="w-full h-8 ps-8 pe-7 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
              />
              {salesSearch && (
                <button
                  type="button"
                  onClick={() => setSalesSearch('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Debt / Payment Status Filter */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <CreditCard className="w-3.5 h-3.5 me-1.5 text-slate-400" />
              <select
                value={salesStatusFilter}
                onChange={(e) => setSalesStatusFilter(e.target.value as 'all' | 'completed' | 'debt' | 'partial')}
                className="bg-transparent focus:outline-none cursor-pointer"
                title="Filter by Payment / Debt Status"
              >
                <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو دۆخەکان' : 'All Statuses'}</option>
                <option value="completed" className="dark:bg-slate-800">{isKu ? 'تەواودراو (بێ قەرز)' : 'Paid in Full'}</option>
                <option value="debt" className="dark:bg-slate-800">{isKu ? 'قەرزدار (نەدراو)' : 'Has Debt / Unpaid'}</option>
                <option value="partial" className="dark:bg-slate-800">{isKu ? 'پارەدان بەشێکی' : 'Partial Payment'}</option>
              </select>
            </div>

            {/* Seller / Cashier Filter */}
            {availableSellers.length > 0 && (
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <UserCheck className="w-3.5 h-3.5 me-1.5 text-slate-400" />
                <select
                  value={salesSellerFilter}
                  onChange={(e) => setSalesSellerFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                  title="Filter by Seller / Cashier"
                >
                  <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو فرۆشیاران' : 'All Sellers'}</option>
                  {availableSellers.map((seller) => (
                    <option key={seller} value={seller} className="dark:bg-slate-800">
                      {seller}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Method Filter */}
            {availablePaymentMethods.length > 0 && (
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <Building2 className="w-3.5 h-3.5 me-1.5 text-slate-400" />
                <select
                  value={salesPaymentMethodFilter}
                  onChange={(e) => setSalesPaymentMethodFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                  title="Filter by Payment Method"
                >
                  <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو شێوازەکان' : 'All Methods'}</option>
                  {availablePaymentMethods.map((pm) => (
                    <option key={pm} value={pm} className="dark:bg-slate-800">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Timeframe Filter */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <select
                value={salesTimeframeFilter}
                onChange={(e) => setSalesTimeframeFilter(e.target.value as 'all' | 'today' | 'yesterday' | 'week' | 'month')}
                className="bg-transparent focus:outline-none cursor-pointer"
                title="Filter by Date / Period"
              >
                <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو کاتێک' : 'All Time'}</option>
                <option value="today" className="dark:bg-slate-800">{isKu ? 'ئەمڕۆ' : 'Today'}</option>
                <option value="yesterday" className="dark:bg-slate-800">{isKu ? 'دوێنێ' : 'Yesterday'}</option>
                <option value="week" className="dark:bg-slate-800">{isKu ? 'ئەم هەفتەیە' : 'Last 7 Days'}</option>
                <option value="month" className="dark:bg-slate-800">{isKu ? 'ئەم مانگە' : 'This Month'}</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <select
                value={salesSortBy}
                onChange={(e) => setSalesSortBy(e.target.value as 'newest' | 'oldest' | 'highestTotal' | 'highestDebt')}
                className="bg-transparent focus:outline-none cursor-pointer"
                title="Sort Transactions"
              >
                <option value="newest" className="dark:bg-slate-800">{isKu ? 'نوێترین' : 'Newest'}</option>
                <option value="oldest" className="dark:bg-slate-800">{isKu ? 'کۆنترین' : 'Oldest'}</option>
                <option value="highestTotal" className="dark:bg-slate-800">{isKu ? 'بەرزترین بڕ' : 'Highest Amount'}</option>
                <option value="highestDebt" className="dark:bg-slate-800">{isKu ? 'بەرزترین قەرز' : 'Highest Debt'}</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveSalesFilters && (
              <button
                type="button"
                onClick={resetAllSalesFilters}
                className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Reset all active sales filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isKu ? 'سڕینەوەی فلتەر' : 'Clear Filters'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Adaptive Layout: Desktop Dense Table (W >= 1024px) */}
        <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Code / Date</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Seller / Bank</th>
                <th className="px-4 py-3 text-right">Net Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Debt</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No sales invoices recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const txCur = tx.currency || 'USD';
                  const isExpanded = expandedTxIds.has(tx.id);
                  const isDebt = (tx.combinedTotalDebt || tx.amountOwed || 0) > 0;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white font-mono">
                            {tx.code || tx.id.slice(-6)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 dark:text-white font-medium">
                            {tx.material || tx.panelType}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.quantity} {tx.unit} • {tx.sellingType}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          <div>{tx.seller || '—'}</div>
                          <div className="text-[11px] text-slate-500">{tx.bank || tx.paymentType || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatMoney(tx.totalAfterDiscount, txCur)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatMoney(tx.amountPaidNow, txCur)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {isDebt ? formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              tx.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : tx.status === 'partial'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPrintingTx(tx)}
                              className="p-2 text-slate-500 hover:text-sky-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Print Invoice Slip"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpandTx(tx.id)}
                              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Expand line items"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {userPermissions.canEditSales && (
                              <button
                                type="button"
                                onClick={() => handleEditTx(tx)}
                                className="p-2 text-slate-500 hover:text-amber-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Edit Invoice"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {userPermissions.canDeleteSales && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(isKu ? 'ئەم پسوولەیە بسڕدرێتەوە؟' : 'Delete this invoice?')) {
                                    deleteTransaction(tx.id);
                                  }
                                }}
                                className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Line Items Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                          <td colSpan={8} className="p-4 space-y-2">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                              Purchased Items Breakdown:
                            </div>
                            {tx.items && tx.items.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {tx.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs flex justify-between"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {item.product}
                                      </span>
                                      <div className="text-slate-500 text-[11px]">
                                        {item.quantity} units @ {formatMoney(item.price, txCur)}
                                      </div>
                                    </div>
                                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                                      {formatMoney(item.total, txCur)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">Single line item order.</p>
                            )}
                            {tx.notes && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                                Notes: {tx.notes}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dual Adaptive Layout: Mobile Cards (W < 1024px) with Oversized Tap Targets (Min 48px) */}
        <div className="block lg:hidden space-y-3.5">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs">
              No sales invoices recorded yet.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const txCur = tx.currency || 'USD';
              const isExpanded = expandedTxIds.has(tx.id);
              const isDebt = (tx.combinedTotalDebt || tx.amountOwed || 0) > 0;

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-xs space-y-3"
                >
                  {/* Top Bar: Code, Date & Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-750 pb-2.5">
                    <div>
                      <span className="font-mono font-black text-sm text-sky-700 dark:text-sky-400">
                        #{tx.code || tx.id.slice(-6)}
                      </span>
                      <span className="text-xs text-slate-400 ms-2">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                        tx.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : tx.status === 'partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  {/* Customer / Seller Strip */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-1.5">
                    <div>
                      <span className="text-slate-400 me-1">Seller:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{tx.seller || 'Bako Bayan'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 me-1">Pay:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{tx.bank || tx.paymentType || 'Cash'}</span>
                    </div>
                  </div>

                  {/* Summary / Items Preview */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{tx.material || tx.panelType}</span>
                      <span className="font-mono text-slate-500 font-medium">
                        {tx.quantity} {tx.unit} ({tx.sellingType})
                      </span>
                    </div>
                    {tx.items && tx.items.length > 0 && isExpanded && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-750 space-y-1.5">
                        {tx.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{item.product}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {item.quantity} × {formatMoney(item.price, txCur)} = {formatMoney(item.total, txCur)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {tx.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        {tx.notes}
                      </p>
                    )}
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/80">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Net Total</div>
                      <div className="font-mono font-black text-xs sm:text-sm text-slate-950 dark:text-white">
                        {formatMoney(tx.totalAfterDiscount, txCur)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Paid</div>
                      <div className="font-mono font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                        {formatMoney(tx.amountPaidNow, txCur)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Debt</div>
                      <div className={`font-mono font-black text-xs sm:text-sm ${isDebt ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {isDebt ? formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur) : '0'}
                      </div>
                    </div>
                  </div>

                  {/* Oversized Touch Action Buttons (Min 48px x 48px) */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPrintingTx(tx)}
                      className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 flex-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Voucher</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpandTx(tx.id)}
                      className="min-h-[48px] px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="Expand items"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span className="text-[11px]">{isExpanded ? 'Hide' : 'Items'}</span>
                    </button>
                    {userPermissions.canEditSales && (
                      <button
                        type="button"
                        onClick={() => handleEditTx(tx)}
                        className="min-w-[48px] min-h-[48px] rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {userPermissions.canDeleteSales && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(isKu ? 'ئەم پسوولەیە بسڕدرێتەوە؟' : 'Delete this invoice?')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="min-w-[48px] min-h-[48px] rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: ADD CUSTOM DROPDOWN ITEM */}
      {addingDropdownCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setAddingDropdownCategory(null)}
        >
          <form
            onSubmit={handleAddDropdownItem}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Add New Option to {addingDropdownCategory.replace('saved', '')}
            </h3>
            <input
              type="text"
              autoFocus
              value={newDropdownValue}
              onChange={(e) => setNewDropdownValue(e.target.value)}
              placeholder="Type new name..."
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddingDropdownCategory(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
              >
                Add Option
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINT INVOICE MODAL */}
      {printingTx && (
        <PrintInvoiceModal
          tx={printingTx}
          onClose={() => setPrintingTx(null)}
          formatMoney={(amount, cur) => formatMoney(amount, cur || printingTx.currency || 'USD')}
          lang={language}
          isDark={isDark}
        />
      )}

      {/* MATH BREAKDOWN MODAL */}
      {inspectingTxForMath && (
        <MathBreakdownModal
          isOpen={inspectingTxForMath}
          onClose={() => setInspectingTxForMath(false)}
          transactions={transactions}
          activeCurrency={posDraft.activeCurrency}
          exchangeRates={exchangeRates}
          lang={language}
          isDark={isDark}
        />
      )}

      {/* DROPDOWN OPTIONS MANAGER MODAL */}
      <DropdownManagerModal
        isOpen={isDropdownManagerOpen}
        onClose={() => setIsDropdownManagerOpen(false)}
      />
    </div>
  );
};

export default SalesSection;
