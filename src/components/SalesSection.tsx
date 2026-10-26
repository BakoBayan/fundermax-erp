'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Plus,
  Minus,
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
  BarChart3,
  MessageCircle,
  Mail,
  Phone,
  FileSpreadsheet,
  ArrowRight,
  Tag,
  Hash,
  PackageCheck,
  Wallet,
  Eye,
  Paperclip,
  MoreVertical,
  FileText,
  Clock,
  Truck
} from 'lucide-react';
import { CurrencyCode, PanelTransaction, InvoiceItem, ExchangeRates } from '../types/inventory';
import { openWhatsAppReceipt, openEmailReceipt } from '@/lib/receiptFormatter';
import PrintInvoiceModal from './PrintInvoiceModal';
import MathBreakdownModal from './MathBreakdownModal';
import { SearchableDropdown } from './SearchableDropdown';
import DropdownManagerModal from './DropdownManagerModal';
import { exportTransactionsToCSV } from '../utils/export';
import { roundMoney, buildMoneySnapshot } from '../lib/money';
import { autoCapitalizeFirstLetter } from '../utils/text';
import { readImageFiles } from '../utils/imageUpload';
import { DEBT_PAYMENT_ACTION, buildDebtPaymentDetails, getTodayDebtPaymentIntake } from '../utils/debtPayments';
import { useWarehouseOps } from '../hooks/useWarehouseOps';

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
    salesStatusFilter,
    setSalesStatusFilter,
    salesTimeframeFilter,
    setSalesTimeframeFilter,
    canModify,
    isViewer,
    userPermissions,
    openVisualCharts,
    requestConfirm,
    requestAlert,
    shipments,
    setZoomedImage,
    logActivity,
    activityLogs,
    setCurrentModule,
  } = useInventory();

  const isDark = theme === 'dark';
  const isKu = language === 'ku';

  // Standardized Bilingual Selectors (Requirement 3)
  const BILINGUAL_PAYMENT_PILLS = [
    { label: 'Cash (نەقد)', value: 'Cash (نەقد)' },
    { label: 'Debt Sale (قەرز)', value: 'Debt Sale (قەرز)' },
    { label: 'Store Credit (ڕەسیدی کڕیار)', value: 'Store Credit (ڕەسیدی کڕیار)' },
    { label: 'Bank Transfer (حەواڵە / بانک)', value: 'Bank Transfer (حەواڵە / بانک)' },
  ];

  const BILINGUAL_SELLING_TYPES = [
    'Wholesale (کۆ)',
    'Retail (تاک)',
    'Project / Contractor (پڕۆژە)',
  ];

  // Dropdown options
  const savedTypes = dropdownPresets.savedTypes || [];
  const savedProducts = dropdownPresets.savedProducts || [];
  const savedSellingTypes = dropdownPresets.savedSellingTypes || [];
  const savedSellers = dropdownPresets.savedSellers || [];
  const savedBanks = dropdownPresets.savedBanks || [];
  const savedPaymentTypes = dropdownPresets.savedPaymentTypes || [];
  const savedClients = dropdownPresets.savedClients || [];

  const sellingTypeOptions = useMemo(() => {
    const list = [...BILINGUAL_SELLING_TYPES];
    savedSellingTypes.forEach((st) => {
      if (!list.includes(st) && st !== 'Retail (مفرد)') {
        list.push(st);
      }
    });
    return list;
  }, [savedSellingTypes]);

  const clientOptions = useMemo(() => {
    const defaultClient = 'کڕیاری گشتی (General Customer)';
    const unique = new Set([defaultClient]);
    savedClients.forEach((c) => {
      if (c && c !== 'کڕیاری گشتی' && c !== defaultClient) {
        unique.add(c);
      }
    });
    return Array.from(unique);
  }, [savedClients]);

  // FunderMax Inbound Shipments Presets
  const activeFundermaxBatches = useMemo(() => {
    const defaults = ['FND-AT-2026-01', 'FND-AT-2026-02', 'FND-TR-2026-05', 'FND-DE-2026-03'];
    const fromShipments = (shipments || []).map((s) => s.trackingCode).filter(Boolean);
    const fromTxs = transactions.map((t) => t.fundermaxBatchRef).filter(Boolean) as string[];
    return Array.from(new Set([...defaults, ...fromShipments, ...fromTxs])).sort();
  }, [shipments, transactions]);

  // Boss Mode: Today's Counter Cash Calculation (Mobile Executive Console)
  const { todayCashUSD, todayCashIQD, todayInvoicesCount } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let usd = 0;
    let iqd = 0;
    let count = 0;

    transactions.forEach((tx) => {
      if (tx.isDeleted === 1) return;
      const txDate = (tx.timestamp || '').split('T')[0];
      if (txDate === todayStr) {
        count++;
        const cur = tx.currency || tx.chargedCurrency || 'USD';
        const paid = typeof tx.amountPaidNow === 'number' ? tx.amountPaidNow : 0;
        if (cur === 'IQD') iqd += paid;
        else usd += paid;
      }
    });

    // Cash collected today toward older invoices' existing debt (no fake sale invoice)
    const debtIntake = getTodayDebtPaymentIntake(activityLogs, transactions);
    usd += debtIntake.usd;
    iqd += debtIntake.iqd;

    return { todayCashUSD: usd, todayCashIQD: iqd, todayInvoicesCount: count };
  }, [transactions, activityLogs]);

  // Rapid Desktop Keyboard Navigation Refs
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);
  const addRowBtnRef = useRef<HTMLButtonElement>(null);

  // Local UI state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [inspectingTx, setInspectingTx] = useState<PanelTransaction | null>(null);
  const [receiptShareLang, setReceiptShareLang] = useState<'ku' | 'en'>(language === 'en' ? 'en' : 'ku');
  const [showMoreInvoiceDetails, setShowMoreInvoiceDetails] = useState(false);
  const [showMobileCost, setShowMobileCost] = useState(false);
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!openActionDropdownId) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container')) {
        setOpenActionDropdownId(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [openActionDropdownId]);

  useEffect(() => {
    setReceiptShareLang(language === 'en' ? 'en' : 'ku');
  }, [language]);

  // Auto-calculate Customer Prior Debt (Requirement 4)
  const getCustomerOutstandingDebt = (clientName: string, targetCurrency: CurrencyCode): number => {
    if (
      !clientName ||
      !clientName.trim() ||
      clientName.includes('کڕیاری گشتی') ||
      clientName.toLowerCase().includes('general customer')
    ) {
      return 0;
    }
    const trimmed = clientName.trim().toLowerCase();
    const customerTxs = transactions
      .filter((t) => !t.isDeleted && t.id !== editingTxId && (t.client || '').trim().toLowerCase() === trimmed)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (customerTxs.length === 0) return 0;

    const latestTx = customerTxs[0];
    const latestDebt = latestTx.combinedTotalDebt !== undefined ? latestTx.combinedTotalDebt : (latestTx.amountOwed || 0);
    const txCur = latestTx.currency || 'USD';
    const converted = convertCurrency(latestDebt, txCur, targetCurrency);
    return roundMoney(Math.max(0, converted), targetCurrency);
  };

  const handleCustomerSelect = (clientName: string) => {
    if (!clientName) {
      setPosDraft((prev) => ({ ...prev, client: '', oldUnpaidDebt: '' }));
      return;
    }
    const debt = getCustomerOutstandingDebt(clientName, posDraft.activeCurrency);
    const pastTxWithPhone = transactions.find(
      (t) => !t.isDeleted && (t.client || '').trim().toLowerCase() === clientName.trim().toLowerCase() && t.clientPhone
    );
    setPosDraft((prev) => ({
      ...prev,
      client: clientName,
      clientPhone: prev.clientPhone ? prev.clientPhone : (pastTxWithPhone?.clientPhone || ''),
      oldUnpaidDebt: debt > 0 ? debt : '',
    }));
  };

  // Legacy Attachment Upload Handler (Requirement 2)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setPosDraft((prev) => ({
          ...prev,
          images: [result, ...prev.images],
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [salesSearch, setSalesSearch] = useState('');
  const [salesSellerFilter, setSalesSellerFilter] = useState<string>('all');
  const [salesPaymentMethodFilter, setSalesPaymentMethodFilter] = useState<string>('all');
  const [salesSortBy, setSalesSortBy] = useState<'newest' | 'oldest' | 'highestTotal' | 'highestDebt'>('newest');
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [manualUsdToIqd, setManualUsdToIqd] = useState<string>(String(exchangeRates.usdToIqd || 1500));
  const [manualEurToUsd, setManualEurToUsd] = useState<string>(String(exchangeRates.eurToUsd || 1.08));
  const [manualEurToIqd, setManualEurToIqd] = useState<string>(String(exchangeRates.eurToIqd || 1620));

  // Modals
  const [inspectingTxForMath, setInspectingTxForMath] = useState<boolean>(false);
  const [printingTx, setPrintingTx] = useState<PanelTransaction | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<{ tx: PanelTransaction; isEdit: boolean } | null>(null);
  // Debt settlement (collect cash toward an existing invoice balance)
  const [payingTx, setPayingTx] = useState<PanelTransaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDrawer, setPayDrawer] = useState('');
  const [payImages, setPayImages] = useState<string[]>([]);
  const [payError, setPayError] = useState('');
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [addingDropdownCategory, setAddingDropdownCategory] = useState<
    'savedTypes' | 'savedProducts' | 'savedSellingTypes' | 'savedSellers' | 'savedBanks' | 'savedPaymentTypes' | 'savedClients' | null
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

  // Material Cost & Gross Profit Calculations
  const currentItemEstCost = typeof posDraft.estimatedCost === 'number' ? posDraft.estimatedCost * currentRowQty : 0;
  const itemsEstCost = posDraft.items.reduce((acc, it) => acc + ((it.estimatedCost || it.price) * it.quantity), 0);
  const totalEstimatedCost = itemsEstCost + (activeRowHasData ? currentItemEstCost : 0);
  const costPrice = totalEstimatedCost > 0 ? totalEstimatedCost : effectiveGrandTotal;
  const grossProfit = totalAfterDiscount - costPrice;
  const profitMargin = effectiveGrandTotal > 0 ? parseFloat(((grossProfit / effectiveGrandTotal) * 100).toFixed(1)) : 0;

  // Add line item row to draft with rapid entry and batch tagging
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
      legacyInvoiceRef: posDraft.legacyInvoiceRef.trim() ? autoCapitalizeFirstLetter(posDraft.legacyInvoiceRef.trim()) : undefined,
      fundermaxBatchRef: posDraft.fundermaxBatchRef.trim() ? autoCapitalizeFirstLetter(posDraft.fundermaxBatchRef.trim()) : undefined,
      estimatedCost: typeof posDraft.estimatedCost === 'number' && posDraft.estimatedCost > 0 ? posDraft.estimatedCost : undefined,
    };

    setPosDraft((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      rowType: '',
      rowProduct: '',
      rowQuantity: 1,
      rowSellingType: '',
      rowPrice: '',
      estimatedCost: '',
    }));

    setTimeout(() => {
      quantityInputRef.current?.focus();
    }, 50);
  };

  const handleDeleteLineItem = (id: string) => {
    setPosDraft((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const handleUpdateLineItemQuantity = (id: string, delta: number) => {
    setPosDraft((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id === id) {
          const newQty = Math.max(1, it.quantity + delta);
          return {
            ...it,
            quantity: newQty,
            total: newQty * it.price,
          };
        }
        return it;
      }),
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

  // Distinct Payment Methods handler with checkout behavior
  const handlePaymentMethodSelect = (method: string) => {
    const isDebt = method.includes('قەرز') || method.includes('Debt');
    const isStoreCredit = method.includes('ڕەسیدی کڕیار') || method.includes('Store Credit');
    const isCash = method.includes('کاش') || method.includes('Cash');
    const isBank = method.includes('بانک') || method.includes('Bank') || method.includes('حەواڵە');

    setPosDraft((prev) => {
      let nextPaid = prev.amountPaidNow;
      if (isDebt) {
        // Deferred payment terms: assign to debt by setting cash collected to 0
        nextPaid = 0;
      } else if (isStoreCredit || isCash || isBank) {
        // If switching to Cash or Store Credit, default to full amount if currently 0
        if (nextPaid === 0 || nextPaid === '') {
          nextPaid = totalAfterDiscount;
        }
      }
      return {
        ...prev,
        paymentType: method,
        amountPaidNow: nextPaid,
      };
    });

    if (isStoreCredit && !posDraft.seller.trim()) {
      requestAlert({
        title: isKu ? 'ڕەسیدی کڕیار' : 'Store Credit',
        message: isKu
          ? 'تکایە ناوی کڕیار دیاریبکە بۆ لێدەرکردنی بڕی پارەکە لە ڕەسیدی پێشەکی کڕیار.'
          : 'Please select a customer account to deduct from their prepaid store credit balance.',
        type: 'info',
      });
    }
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

    if ((posDraft.paymentType.includes('ڕەسیدی کڕیار') || posDraft.paymentType.includes('Store Credit')) && !posDraft.seller.trim()) {
      requestAlert({
        title: isKu ? 'دیاریکردنی کڕیار پێویستە' : 'Customer Account Required',
        message: isKu
          ? 'بۆ بەکارهێنانی ڕەسیدی کڕیار، پێویستە ناوی کڕیار لە بەشی سەرەوە دیاریبکەیت بۆ لێدەرکردنی پارەکە.'
          : 'Please select a customer account to validate and deduct from their store credit balance.',
        type: 'warning',
      });
      return;
    }

    if (finalItems.length === 0) {
      requestAlert({
        title: isKu ? 'ئاگاداری پسوولە' : 'Invoice Notice',
        message: isKu ? 'تکایە بەلایەنی کەمەوە یەک بڕگە دیاریبکە' : 'Please enter at least one line item',
        type: 'warning',
      });
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
        requestAlert({
          title: isKu ? 'دەسەڵات سنووردارکراوە' : 'Permission Restricted',
          message: isKu ? 'دەسەڵاتی دەستکاریکردنی ئەم پسوولەیەت نییە' : 'You do not have permission to edit sales invoices.',
          type: 'danger',
        });
        return;
      }
    } else {
      if (!userPermissions.canCreateSales) {
        requestAlert({
          title: isKu ? 'دەسەڵات سنووردارکراوە' : 'Permission Restricted',
          message: isKu ? 'دەسەڵاتی دروستکردنی پسوولەی نوێت نییە' : 'You do not have permission to create sales invoices.',
          type: 'danger',
        });
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
      client: posDraft.client.trim() ? autoCapitalizeFirstLetter(posDraft.client.trim()) : undefined,
      clientPhone: posDraft.clientPhone.trim() || undefined,
      legacyInvoiceRef: posDraft.legacyInvoiceRef.trim() ? autoCapitalizeFirstLetter(posDraft.legacyInvoiceRef.trim()) : undefined,
      fundermaxBatchRef: posDraft.fundermaxBatchRef.trim() ? autoCapitalizeFirstLetter(posDraft.fundermaxBatchRef.trim()) : undefined,
      estimatedCost: typeof posDraft.estimatedCost === 'number' && posDraft.estimatedCost > 0 ? posDraft.estimatedCost : undefined,
      chargedAmount: moneySnap.chargedAmount,
      chargedCurrency: moneySnap.chargedCurrency,
      exchangeRateApplied: moneySnap.exchangeRateApplied,
      baseUsdEquivalent: moneySnap.baseUsdEquivalent,
    };

    const wasEditing = !!editingTxId;
    if (editingTxId) {
      editTransaction(editingTxId, txPayload);
      setEditingTxId(null);
    } else {
      addTransaction(txPayload);
    }

    if (andPrint) {
      setPrintingTx(txPayload);
    } else {
      setCompletedInvoice({ tx: txPayload, isEdit: wasEditing });
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
      client: tx.client || '',
      clientPhone: tx.clientPhone || '',
      legacyInvoiceRef: tx.legacyInvoiceRef || '',
      fundermaxBatchRef: tx.fundermaxBatchRef || '',
      estimatedCost: tx.estimatedCost || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    clearPosDraft();
  };

  const editingTransaction = useMemo(() => {
    return editingTxId ? transactions.find((t) => t.id === editingTxId) : null;
  }, [editingTxId, transactions]);

  const editingInvoiceCode = editingTransaction?.code || posDraft.invoiceCode || (editingTxId ? editingTxId.replace(/^tx-/, '') : '');

  const handleWhatsAppShare = (tx: PanelTransaction) => {
    openWhatsAppReceipt(tx, formatMoney, receiptShareLang);
  };

  const handleEmailShare = (tx: PanelTransaction) => {
    openEmailReceipt(tx, formatMoney, receiptShareLang);
  };

  // Muted live IQD equivalent shown under USD/EUR amounts
  const renderIqdEquivalent = (amount: number, cur: CurrencyCode) => {
    if (cur === 'IQD' || !(amount > 0)) return null;
    const iqd = convertCurrency(amount, cur, 'IQD');
    return (
      <span className="block text-xs text-slate-500 dark:text-slate-400 font-mono font-normal">
        ≈ {Math.round(iqd).toLocaleString()} IQD
      </span>
    );
  };

  const drawerOptions = useMemo(() => {
    const set = new Set<string>(['Cash Register', 'FIB']);
    savedBanks.forEach((b) => b && set.add(b));
    return Array.from(set);
  }, [savedBanks]);

  const openDebtPayment = (tx: PanelTransaction) => {
    const debt = tx.combinedTotalDebt || tx.amountOwed || 0;
    setPayingTx(tx);
    setPayAmount(String(roundMoney(debt, tx.currency || 'USD')));
    setPayDrawer(tx.bank || 'Cash Register');
    setPayImages([]);
    setPayError('');
  };

  const closeDebtPayment = () => {
    setPayingTx(null);
    setPayAmount('');
    setPayImages([]);
    setPayError('');
  };

  const handleRecordDebtPayment = () => {
    if (!payingTx) return;
    const cur: CurrencyCode = payingTx.currency || 'USD';
    const debt = payingTx.combinedTotalDebt || payingTx.amountOwed || 0;
    const amt = roundMoney(parseFloat(payAmount) || 0, cur);
    if (amt <= 0) {
      setPayError(isKu ? 'بڕی پارە دەبێت لە سفر زیاتر بێت.' : 'Payment amount must be greater than zero.');
      return;
    }
    if (amt > debt + 0.0001) {
      setPayError(isKu ? 'بڕی پارە لە قەرزی ماوە زیاترە.' : 'Payment cannot exceed the unpaid balance.');
      return;
    }
    const owed = payingTx.amountOwed || 0;
    const oldDebt = payingTx.oldUnpaidDebt || 0;
    const newPaid = roundMoney((payingTx.amountPaidNow || 0) + amt, cur);
    const newOwed = roundMoney(Math.max(0, owed - amt), cur);
    const newOld = roundMoney(Math.max(0, oldDebt - Math.max(0, amt - owed)), cur);
    const newCombined = roundMoney(Math.max(0, debt - amt), cur);
    const dateStr = new Date().toISOString().split('T')[0];
    const noteLine = `[Debt payment ${dateStr} • ${payDrawer || '-'} • ${formatMoney(amt, cur)}]`;

    editTransaction(payingTx.id, {
      amountPaidNow: newPaid,
      amountOwed: newOwed,
      oldUnpaidDebt: newOld,
      combinedTotalDebt: newCombined,
      status: newOwed <= 0 ? 'completed' : 'partial',
      notes: payingTx.notes ? `${payingTx.notes}\n${noteLine}` : noteLine,
      images: [...payImages, ...(payingTx.images || [])],
    });
    logActivity(
      DEBT_PAYMENT_ACTION,
      `Debt payment on invoice #${payingTx.code || payingTx.id} (${payingTx.client || 'General Customer'}): ${formatMoney(amt, cur)}`,
      buildDebtPaymentDetails(payingTx.id, payDrawer),
      'sale',
      amt,
      cur
    );
    closeDebtPayment();
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

  const warehouseOps = useWarehouseOps();

  const totalSupplierDebt = useMemo(() => {
    return warehouseOps.activeShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      if (debt <= 0) return acc;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      return acc + convertCurrency(debt, curr as CurrencyCode, posDraft.activeCurrency);
    }, 0);
  }, [warehouseOps.activeShipments, convertCurrency, posDraft.activeCurrency]);

  const supplierInvoicesWithDebtCount = useMemo(() => {
    return warehouseOps.activeShipments.filter((s) => {
      if (s.isDeleted === 1) return false;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      return debt > 0;
    }).length;
  }, [warehouseOps.activeShipments]);


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
        <div className="flex flex-wrap items-center gap-2">
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
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKu ? 'نرخی ئاڵوگۆڕ' : 'Exchange Rates'}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Exchange Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectingTxForMath(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t.mathAudit}
          >
            <Calculator className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">{t.mathAudit}</span>
          </button>

          {/* Visual Charts Modal Trigger for Sales */}
          <button
            type="button"
            onClick={() => openVisualCharts('sales')}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title={isKu ? 'چارت و شیکاری دارایی فرۆشتن' : 'Sales Charts'}
          >
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">{isKu ? 'چارتەکانی فرۆشتن' : 'Sales Charts'}</span>
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

      {/* EXECUTIVE SALES POS KPI GRID (CUSTOMER INFLOW ONLY + SUPPLIER PAYABLES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* CARD 1: TOTAL INVOICED VOLUME (GROSS SALES VOLUME) */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                {isKu ? 'کۆی فرۆشراو' : 'Total Invoiced Volume'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                {isKu ? 'کۆی گشتی فرۆشراو (Gross Sales)' : 'Gross sales volume'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatMoney(totalSystemSales, posDraft.activeCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              <span>{transactions.length} {isKu ? 'وەسڵی تۆمارکراو' : 'recorded invoices'}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: CASH RECEIVED FROM CUSTOMERS */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                {isKu ? 'پارەی وەرگیراو لە کڕیاران' : 'Cash Received from Customers'}
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium block mt-0.5">
                {isKu ? 'پارەی نەقدی وەرگیراو لە قاسە/بانک' : 'Actual cash collected into drawer/bank'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {formatMoney(totalSystemPaid, posDraft.activeCurrency)}
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium mt-1.5">
              {totalSystemSales > 0 ? Math.round((totalSystemPaid / totalSystemSales) * 100) : 0}% {isKu ? 'ڕێژەی وەرگیراو' : 'collection rate'}
            </div>
          </div>
        </div>

        {/* CARD 3: CUSTOMER DEBT / RECEIVABLES */}
        <div 
          onClick={() => setInspectingTxForMath(true)}
          className="p-5 rounded-3xl border-2 border-rose-400/90 dark:border-rose-500/80 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/50 dark:from-rose-950/40 dark:via-slate-850 dark:to-rose-950/20 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative overflow-hidden"
          title={isKu ? 'کلیک بکە بۆ بینینی هەموو وردەکاری و یاسای هەژمارکردنی قەرز' : 'Click to inspect full transparent debt calculation & itemized formula'}
        >
          {/* Subtle Ambient Corner Accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                {isKu ? 'قەرزی لای کڕیاران' : 'Customer Debt (Receivables)'}
              </span>
              <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-medium block mt-0.5">
                {isKu ? 'کۆی گشتی ئەو پارەیەی لای کڕیاران ماوەتەوە' : 'Unpaid balances customers owe us'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25 group-hover:scale-110 transition-transform shrink-0">
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

        {/* CARD 4: CURRENT DRAFT DEBT */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition-colors ${
          combinedTotalDebt > 0
            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                {isKu ? 'قەرزی ئەم پسوولەیە' : 'Current Draft Debt'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                {isKu ? 'قەرزی ماوەی سەر ئەم پسوولەیەی ئێستا' : 'Remaining debt on active draft'}
              </span>
            </div>
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

        {/* CARD 5: WE OWE SUPPLIERS (PAYABLES) */}
        <div
          onClick={() => {
            if (setCurrentModule) setCurrentModule('goods');
            else if (typeof window !== 'undefined') window.location.href = '/?module=goods';
          }}
          className="p-5 rounded-3xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          title={isKu ? 'کلیک بکە بۆ چوونە بەشی کڕین و دابینکەران' : 'Click to open Purchases / Warehouse module'}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                {isKu ? 'قەرزی سەر ئێمە بۆ دابینکەران' : 'WE OWE SUPPLIERS (PAYABLES)'}
              </span>
              <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80 font-medium block mt-0.5">
                {isKu ? 'کۆی قەرزی نەدراوی کڕینی کەلوپەل و تەختە' : 'Unpaid supplier payables'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold group-hover:scale-110 transition-transform shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-300 font-mono tracking-tight">
              {formatMoney(totalSupplierDebt, posDraft.activeCurrency)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-purple-700/80 dark:text-purple-400/80 font-medium mt-1.5">
              <span>{supplierInvoicesWithDebtCount} {isKu ? 'پسوولەی دابینکەر' : 'supplier invoices'}</span>
              <span className="font-bold underline group-hover:text-purple-800 dark:group-hover:text-purple-200">
                {isKu ? 'کڕین و کۆگا ←' : 'Purchases / Warehouse ←'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* POS INVOICE CREATOR FORM (Strictly unmounted unless canCreateSales or canEditSales) */}
      {(userPermissions?.canCreateSales || (editingTxId && userPermissions?.canEditSales)) ? (
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-sm space-y-6">
        {/* Prominent Edit Mode Warning Banner */}
        {editingTxId && (
          <div className="w-full bg-amber-500/15 border-2 border-amber-500 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="font-bold text-sm md:text-base">
                  {isKu ? `ئێستا دەستکاری وەسڵی ژمارە #${editingInvoiceCode} دەکەیت` : `Currently Editing Invoice #${editingInvoiceCode}`}
                </p>
                <p className="text-xs opacity-80">
                  {isKu ? 'هەر گۆڕانکارییەک پاشەکەوت دەبێت لەسەر هەمان وەسڵ' : 'Saving will overwrite this existing transaction record.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs md:text-sm font-bold shadow-md transition cursor-pointer shrink-0"
            >
              {isKu ? 'هەڵوەشاندنەوە و وەسڵی نوێ' : 'Cancel & Start New'}
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${editingTxId ? 'bg-amber-500 animate-pulse' : 'bg-sky-500'}`} />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingTxId
                ? (isKu ? `دەستکاریکردنی وەسڵ #${editingInvoiceCode}` : `Edit Invoice #${editingInvoiceCode}`)
                : t.newInvoice}
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
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
              >
                {isKu ? 'هەڵوەشاندنەوە' : 'Cancel Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Workspace Layout (Left: 70%, Right: 30% Sticky) */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* LEFT / MAIN COLUMN (70% width): Business Inputs, Line Items & Notes */}
          <div className="w-full lg:w-[68%] xl:w-[70%] space-y-6">
            {/* Desktop Business Header Inputs: Code, Customer, Phone, Legacy Bridge, Attachment, Seller, Bank */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
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

              {/* Customer / Client Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isKu ? 'کڕیار / پسوولە بۆ (Customer)' : 'Customer / Client'}
                </label>
                <SearchableDropdown
                  options={clientOptions}
                  value={posDraft.client}
                  onChange={handleCustomerSelect}
                  onAddNew={(v) => addToDropdownPresets('savedClients', v)}
                  onDeleteOption={(v) => removeFromDropdownPresets('savedClients', v)}
                  placeholder={isKu ? 'ناوی کڕیار بنووسە یان هەڵبژێرە...' : 'Select or type customer name...'}
                  allowDelete={!isViewer}
                  clearable={true}
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isKu ? 'ژمارەی مۆبایلی کڕیار' : 'Customer Phone'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">WhatsApp Ready</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={posDraft.clientPhone}
                    onChange={(e) => setPosDraft({ ...posDraft, clientPhone: e.target.value })}
                    placeholder="0750 000 0000"
                    className="w-full min-h-[42px] ps-9 pe-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Commercial Reference / PO # (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{isKu ? 'ژمارەی ئاماژە / داواکاری (دڵخواز)' : 'Reference / PO # (Optional)'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{isKu ? 'ئارەزوومەندانە' : 'Optional'}</span>
                </label>
                <input
                  type="text"
                  value={posDraft.legacyInvoiceRef}
                  onChange={(e) => setPosDraft({ ...posDraft, legacyInvoiceRef: e.target.value })}
                  placeholder="e.g. PO-842, Project Villa..."
                  className="w-full min-h-[42px] px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono placeholder:text-slate-400 text-xs"
                  title={isKu ? 'ژمارەی ئاماژە یان کۆدی داواکاری کڕیار' : 'Reference / Purchase Order #'}
                />
              </div>

              {/* Legacy Attachment Upload (Slip / Transfer Photo) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>{isKu ? 'هاوپێچ / Attachment' : 'Attachment (Slip / Photo)'}</span>
                  </span>
                  {posDraft.images && posDraft.images.length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {posDraft.images.length} {isKu ? 'هاوپێچ' : 'attached'}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 min-h-[42px] px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="truncate">
                      {posDraft.images && posDraft.images.length > 0
                        ? (isKu ? 'زیادکردنی تر' : 'Add Photo')
                        : (isKu ? 'هەڵبژاردنی وەسڵ' : 'Upload Slip')}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>
                  {posDraft.images && posDraft.images.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setZoomedImage({ url: posDraft.images[0], title: 'Attachment Slip' })}
                        className="w-[42px] h-[42px] rounded-xl overflow-hidden border border-sky-400 dark:border-sky-600 relative group cursor-pointer shrink-0"
                        title="Preview attachment"
                      >
                        <img src={posDraft.images[0]} alt="Attachment preview" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosDraft((prev) => ({ ...prev, images: [] }))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
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
                  placeholder="Select Seller / فرۆشیار دیاری بکە..."
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
                  placeholder="Select Drawer / قاسە یان بانک..."
                  allowDelete={!isViewer}
                  clearable={true}
                />
              </div>

              {/* Bilingual Payment Method Pills (Desktop) - Replaces redundant dropdown */}
              <div className="md:col-span-2 lg:col-span-3 pt-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  {isKu ? 'شێوازی پارەدان (Bilingual Payment Methods):' : 'Payment Method Selection:'}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {BILINGUAL_PAYMENT_PILLS.map((pill) => {
                    const isSelected =
                      posDraft.paymentType === pill.value ||
                      (pill.value.includes('Cash') && (posDraft.paymentType.includes('Cash') || posDraft.paymentType.includes('نەقد') || posDraft.paymentType.includes('کاش'))) ||
                      (pill.value.includes('Debt') && (posDraft.paymentType.includes('Debt') || posDraft.paymentType.includes('قەرز'))) ||
                      (pill.value.includes('Store Credit') && (posDraft.paymentType.includes('Store Credit') || posDraft.paymentType.includes('ڕەسید'))) ||
                      (pill.value.includes('Bank') && (posDraft.paymentType.includes('Bank') || posDraft.paymentType.includes('حەواڵە')));
                    return (
                      <button
                        key={pill.value}
                        type="button"
                        onClick={() => handlePaymentMethodSelect(isSelected ? '' : pill.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-sky-600 border-sky-700 text-white shadow-xs scale-[1.02]'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

        {/* Mobile Streamlined Business Header Inputs (Progressive Disclosure) */}
        <div className="block md:hidden space-y-3">
          {/* 1. Customer */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isKu ? 'کڕیار' : 'Customer'}
            </label>
            <SearchableDropdown
              options={clientOptions}
              value={posDraft.client}
              onChange={handleCustomerSelect}
              onAddNew={(v) => addToDropdownPresets('savedClients', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedClients', v)}
              placeholder={isKu ? 'ناوی کڕیار بنووسە یان هەڵبژێرە...' : 'Select or type customer name...'}
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>

          {/* 2. Customer Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{isKu ? 'ژمارەی مۆبایل' : 'Customer Phone'}</span>
              <span className="text-[10px] text-slate-400 font-normal">WhatsApp Ready</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                value={posDraft.clientPhone}
                onChange={(e) => setPosDraft({ ...posDraft, clientPhone: e.target.value })}
                placeholder="0750 000 0000"
                className="w-full h-12 ps-10 pe-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* 3. Payment Method (Standardized Bilingual Pills) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isKu ? 'شێوازی پارەدان' : t.paymentType}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {BILINGUAL_PAYMENT_PILLS.map((pill) => {
                const isSelected =
                  posDraft.paymentType === pill.value ||
                  (pill.value.includes('Cash') && (posDraft.paymentType.includes('Cash') || posDraft.paymentType.includes('نەقد') || posDraft.paymentType.includes('کاش'))) ||
                  (pill.value.includes('Debt') && (posDraft.paymentType.includes('Debt') || posDraft.paymentType.includes('قەرز'))) ||
                  (pill.value.includes('Store Credit') && (posDraft.paymentType.includes('Store Credit') || posDraft.paymentType.includes('ڕەسید'))) ||
                  (pill.value.includes('Bank') && (posDraft.paymentType.includes('Bank') || posDraft.paymentType.includes('حەواڵە')));
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => handlePaymentMethodSelect(isSelected ? '' : pill.value)}
                    className={`h-11 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-sky-600 border-sky-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible Accordion for Secondary Fields */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreInvoiceDetails(!showMoreInvoiceDetails)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <span>
                {showMoreInvoiceDetails
                  ? (isKu ? '- شاردنەوەی وردەکاری زیاتر' : '- Hide More Details')
                  : (isKu ? '+ وردەکاری زیاتری وەسڵ (هاوپێچ، ژمارەی دەستی، بانک، فرۆشیار)' : '+ More Invoice Details (Attachment, Legacy Ref)')}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showMoreInvoiceDetails ? 'rotate-180' : ''}`} />
            </button>

            {showMoreInvoiceDetails && (
              <div className="p-3.5 mt-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                {/* Legacy Attachment Upload on Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>{isKu ? 'هاوپێچ / Attachment (Slip / Transfer Photo)' : 'هاوپێچ / Attachment (Slip / Transfer Photo)'}</span>
                    </span>
                    {posDraft.images && posDraft.images.length > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {posDraft.images.length} {isKu ? 'هاوپێچ' : 'attached'}
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 h-11 px-3.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span className="truncate">
                        {posDraft.images && posDraft.images.length > 0
                          ? (isKu ? 'زیادکردنی وێنەی تر' : 'Add Another Photo')
                          : (isKu ? 'هەڵبژاردنی وەسڵی دەستی' : 'Upload Slip / Photo')}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleAttachmentUpload}
                        className="hidden"
                      />
                    </label>
                    {posDraft.images && posDraft.images.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ url: posDraft.images[0], title: 'Attachment Slip' })}
                          className="w-11 h-11 rounded-xl overflow-hidden border border-sky-400 shrink-0 cursor-pointer"
                          title="Preview attachment"
                        >
                          <img src={posDraft.images[0]} alt="Attachment preview" className="w-full h-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosDraft((prev) => ({ ...prev, images: [] }))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.invoiceCode}
                  </label>
                  <input
                    type="text"
                    value={posDraft.invoiceCode}
                    onChange={(e) => setPosDraft({ ...posDraft, invoiceCode: e.target.value })}
                    placeholder="e.g. INV-101"
                    className="w-full h-11 px-3.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Reference / PO # (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{isKu ? 'ژمارەی ئاماژە / داواکاری (دڵخواز)' : 'Reference / PO # (Optional)'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{isKu ? 'ئارەزوومەندانە' : 'Optional'}</span>
                  </label>
                  <input
                    type="text"
                    value={posDraft.legacyInvoiceRef}
                    onChange={(e) => setPosDraft({ ...posDraft, legacyInvoiceRef: e.target.value })}
                    placeholder="e.g. PO-842, Project Villa..."
                    className="w-full h-11 px-3.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>

                {/* Seller */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.seller}
                  </label>
                  <SearchableDropdown
                    options={savedSellers}
                    value={posDraft.seller}
                    onChange={(v) => setPosDraft({ ...posDraft, seller: v })}
                    onAddNew={(v) => addToDropdownPresets('savedSellers', v)}
                    onDeleteOption={(v) => removeFromDropdownPresets('savedSellers', v)}
                    placeholder="Select Seller / فرۆشیار دیاری بکە..."
                    allowDelete={!isViewer}
                    clearable={true}
                  />
                </div>

                {/* Bank / Drawer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.bank}
                  </label>
                  <SearchableDropdown
                    options={savedBanks}
                    value={posDraft.bank}
                    onChange={(v) => setPosDraft({ ...posDraft, bank: v })}
                    onAddNew={(v) => addToDropdownPresets('savedBanks', v)}
                    onDeleteOption={(v) => removeFromDropdownPresets('savedBanks', v)}
                    placeholder="Select Drawer / قاسە یان بانک..."
                    allowDelete={!isViewer}
                    clearable={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP ACTIVE LINE ITEM INPUT ROW (Rapid Entry with Keyboard Flow) */}
        <div className="hidden md:block p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{isKu ? 'تۆمارکردنی کاڵا / دەرگا / پانێڵ' : 'Active Line Item (Panels & Custom Doors)'}</span>
            <span className="text-[11px] font-normal text-sky-600 dark:text-sky-400">
              {isKu ? 'Enter: ڕۆشتن بۆ خانەی دواتر / زیادکردن' : 'Press Enter on Qty/Price to rapid-add'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isKu ? 'جۆر' : 'Type'}
              </label>
              <SearchableDropdown
                options={savedTypes}
                value={posDraft.rowType}
                onChange={(v) => setPosDraft({ ...posDraft, rowType: v })}
                onAddNew={(v) => addToDropdownPresets('savedTypes', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedTypes', v)}
                placeholder="Type..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            {/* Product / Door expanded to 2 columns (Requirement 1) */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isKu ? 'کاڵا / دەرگا' : 'Product / Door'}
              </label>
              <SearchableDropdown
                options={savedProducts}
                value={posDraft.rowProduct}
                onChange={(v) => setPosDraft({ ...posDraft, rowProduct: v })}
                onAddNew={(v) => addToDropdownPresets('savedProducts', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedProducts', v)}
                placeholder="Product..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            {/* Selling Type using standardized bilingual options (Requirement 3) */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isKu ? 'جۆری فرۆشتن' : 'Selling Type'}
              </label>
              <SearchableDropdown
                options={sellingTypeOptions}
                value={posDraft.rowSellingType}
                onChange={(v) => setPosDraft({ ...posDraft, rowSellingType: v })}
                onAddNew={(v) => addToDropdownPresets('savedSellingTypes', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedSellingTypes', v)}
                placeholder="Wholesale..."
                allowDelete={!isViewer}
                compact={true}
                clearable={true}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isKu ? 'بڕ (دانە)' : 'Qty'}
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="1"
                step="any"
                value={posDraft.rowQuantity}
                onChange={(e) => setPosDraft({ ...posDraft, rowQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    priceInputRef.current?.focus();
                  }
                }}
                className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label
                className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                title="Selling Price ($) / نرخی فرۆشتن ($)"
              >
                {isKu ? 'نرخی فرۆشتن ($)' : 'Selling Price ($)'}
              </label>
              <input
                ref={priceInputRef}
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.rowPrice}
                onChange={(e) => setPosDraft({ ...posDraft, rowPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (costInputRef.current) {
                      costInputRef.current.focus();
                    } else {
                      handleAddLineItem();
                    }
                  }
                }}
                placeholder="0.00"
                className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Our Cost + Add Item (expanded cleanly across 2 columns in lg:grid-cols-8) */}
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-2 flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <label
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 truncate"
                  title="Internal wholesale cost for profit tracking (hidden from customer invoice) / تێچووی کڕین بۆ کۆمپانیا"
                >
                  {isKu ? 'تێچووی لەسەرمان ($)' : 'Our Cost ($)'}
                </label>
                <input
                  ref={costInputRef}
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  step="any"
                  value={posDraft.estimatedCost}
                  onChange={(e) => setPosDraft({ ...posDraft, estimatedCost: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLineItem();
                    }
                  }}
                  placeholder="0.00"
                  title="Internal wholesale cost for profit tracking (hidden from customer invoice) / تێچووی کڕین بۆ کۆمپانیا"
                  className="w-full min-h-[38px] px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <button
                ref={addRowBtnRef}
                type="button"
                onClick={handleAddLineItem}
                disabled={!posDraft.rowType && !posDraft.rowProduct && currentRowPrice === 0}
                className="flex items-center justify-center min-h-[38px] px-3.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer shrink-0"
                title={isKu ? 'زیادکردنی بابەت' : 'Add Item'}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xl:inline ml-1">{isKu ? 'زیادکردن' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE ACTIVE LINE ITEM INPUT CARD (Vertical Stack with fat-finger h-12 inputs) */}
        <div className="block md:hidden p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>{isKu ? 'تۆمارکردنی کاڵا' : 'Add Line Item'}</span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-normal">
              {posDraft.activeCurrency}
            </span>
          </div>

          {/* Line 1: Product / Wood Panel Search */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {isKu ? 'کاڵا / تەختە' : 'Product / Wood Panel'}
            </label>
            <SearchableDropdown
              options={savedProducts}
              value={posDraft.rowProduct}
              onChange={(v) => setPosDraft({ ...posDraft, rowProduct: v })}
              onAddNew={(v) => addToDropdownPresets('savedProducts', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedProducts', v)}
              placeholder={isKu ? 'کاڵا هەڵبژێرە یان بنووسە...' : 'Select or type product...'}
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>

          {/* Line 2: Selling Type Dropdown (Bilingual) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {isKu ? 'جۆری فرۆشتن' : 'Selling Type'}
            </label>
            <SearchableDropdown
              options={sellingTypeOptions}
              value={posDraft.rowSellingType}
              onChange={(v) => setPosDraft({ ...posDraft, rowSellingType: v })}
              onAddNew={(v) => addToDropdownPresets('savedSellingTypes', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedSellingTypes', v)}
              placeholder={isKu ? 'جۆری فرۆشتن هەڵبژێرە...' : 'Select selling type...'}
              allowDelete={!isViewer}
              compact={true}
              clearable={true}
            />
          </div>

          {/* Line 3 (Grid 2-col): Quantity + Unit Price with h-12 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isKu ? 'بڕ' : 'Quantity'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="1"
                step="any"
                value={posDraft.rowQuantity}
                onChange={(e) => setPosDraft({ ...posDraft, rowQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full h-12 px-3 text-base rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center font-bold"
                placeholder="1"
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                title="Selling Price ($) / نرخی فرۆشتن ($)"
              >
                {isKu ? 'نرخی فرۆشتن ($)' : 'Selling Price ($)'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.rowPrice}
                onChange={(e) => setPosDraft({ ...posDraft, rowPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full h-12 px-3 text-base rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Optional: Cost toggle for Admin/Owner */}
          {userPermissions?.canAccessAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowMobileCost(!showMobileCost)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                title="Internal wholesale cost for profit tracking (hidden from customer invoice) / تێچووی کڕین بۆ کۆمپانیا"
              >
                {showMobileCost ? (isKu ? '▲ شاردنەوەی تێچووی لەسەرمان' : '▲ Hide Our Cost') : (isKu ? '▼ دیاریکردنی تێچووی لەسەرمان ($)' : '▼ Set Our Cost ($)')}
              </button>
              {showMobileCost && (
                <div className="mt-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    step="any"
                    value={posDraft.estimatedCost}
                    onChange={(e) => setPosDraft({ ...posDraft, estimatedCost: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    title="Internal wholesale cost for profit tracking (hidden from customer invoice) / تێچووی کڕین بۆ کۆمپانیا"
                    placeholder={isKu ? 'تێچووی لەسەرمان ($)' : 'Our Cost ($)'}
                    className="w-full h-11 px-3 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Line 4: Total display + Add Item button */}
          <div className="pt-1 flex items-center gap-2">
            <div className="flex-1 px-3 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">{isKu ? 'کۆی کاڵا:' : 'Line Total:'}</span>
              <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400">
                {formatMoney(
                  (typeof posDraft.rowQuantity === 'number' ? posDraft.rowQuantity : 1) *
                  (typeof posDraft.rowPrice === 'number' ? posDraft.rowPrice : 0),
                  posDraft.activeCurrency
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddLineItem}
              disabled={!posDraft.rowType && !posDraft.rowProduct && currentRowPrice === 0}
              className="h-12 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-sm shadow-sm disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>{isKu ? 'زیادکردن' : 'Add'}</span>
            </button>
          </div>
        </div>

        {/* Real-Time Gross Margin Display (Desktop Only - hidden md:block) */}
        {typeof posDraft.rowPrice === 'number' && posDraft.rowPrice > 0 && typeof posDraft.estimatedCost === 'number' && posDraft.estimatedCost > 0 && (
          <div className="hidden md:flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-800 dark:text-emerald-300">
                {isKu ? 'قازانجی خاوێنی کەرەستە (Gross Margin):' : 'Estimated Gross Margin:'}
              </span>
              <span className={`font-mono font-black text-sm ${
                posDraft.rowPrice >= posDraft.estimatedCost ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatMoney(posDraft.rowPrice - posDraft.estimatedCost, posDraft.activeCurrency)} ({(((posDraft.rowPrice - posDraft.estimatedCost) / posDraft.rowPrice) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px] flex items-center gap-2">
              <span>{isKu ? 'تێچووی لەسەرمان:' : 'Our Cost:'} {formatMoney(posDraft.estimatedCost, posDraft.activeCurrency)}</span>
              <span>•</span>
              <span>{isKu ? 'فرۆشتن:' : 'Selling Price:'} {formatMoney(posDraft.rowPrice, posDraft.activeCurrency)}</span>
            </div>
          </div>
        )}

        {/* ITEMS LIST (Desktop Table + Mobile Cards) */}
        {posDraft.items.length > 0 && (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block w-full max-w-full overflow-x-auto pb-4 border border-slate-200 dark:border-slate-750 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">{isKu ? 'کاڵا' : 'Item'}</th>
                    <th className="px-4 py-2.5">{isKu ? 'جۆر' : 'Type'}</th>
                    <th className="px-4 py-2.5 text-center">{isKu ? 'بڕ' : 'Qty'}</th>
                    <th className="px-4 py-2.5 text-right">{isKu ? 'نرخ' : 'Price'}</th>
                    <th className="px-4 py-2.5 text-right">{isKu ? 'کۆی کاڵا' : 'Line Total'}</th>
                    <th className="px-4 py-2.5 text-center">{isKu ? 'کردار' : 'Action'}</th>
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
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards: Independent card-style line item with rounded borders, a clear quantity stepper (- Qty +), and unit price */}
            <div className="block md:hidden space-y-2.5">
              {posDraft.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {item.product}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {item.type} • {isKu ? 'نرخی یەکە:' : 'Unit:'} <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatMoney(item.price, posDraft.activeCurrency)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLineItem(item.id)}
                      className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                      title={isKu ? 'سڕینەوە' : 'Remove'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-750">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleUpdateLineItemQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer shadow-2xs"
                        title="-1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono font-black text-sm px-2.5 text-slate-900 dark:text-white text-center min-w-[28px]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLineItemQuantity(item.id, 1)}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer shadow-2xs"
                        title="+1"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">{isKu ? 'کۆی کاڵا' : 'Line Total'}</div>
                      <div className="font-mono font-black text-base text-slate-950 dark:text-white">
                        {formatMoney(item.total, posDraft.activeCurrency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLEAR TRANSACTION NOTES AREA (Requirement 3.2) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xs">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{isKu ? 'تێبینییەکانی پسوولە (Notes)' : 'Transaction Notes'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">{isKu ? 'ئارەزوومەندانە' : 'Optional'}</span>
          </label>
          <textarea
            rows={2}
            value={posDraft.notes || ''}
            onChange={(e) => setPosDraft({ ...posDraft, notes: e.target.value })}
            placeholder={isKu ? 'تێبینی بنووسە دەربارەی ئەم پسوولەیە (کڕیار، گەیاندن، ڕێککەوتن)...' : 'Add invoice notes (delivery terms, customer instructions, agreements)...'}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all font-sans"
          />
        </div>
      </div>
      {/* END LEFT COLUMN */}

      {/* RIGHT COLUMN (30% width / Sticky Card): Order Financial Summary & Actions */}
      <div className="w-full lg:w-[32%] xl:w-[30%] lg:sticky lg:top-20 space-y-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-sm space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKu ? 'پوختەی دارایی و حیساب' : 'Order Financial Summary'}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              {posDraft.activeCurrency}
            </span>
          </div>

          {/* Gross Total */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {t.grossTotal}
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
              {formatMoney(effectiveGrandTotal, posDraft.activeCurrency)}
            </span>
          </div>

          {/* Discount (Amount & %) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
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
                className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* Net Payable */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
              {t.netPayable}
            </span>
            <span className="text-xl font-black text-sky-900 dark:text-sky-100 font-mono">
              {formatMoney(totalAfterDiscount, posDraft.activeCurrency)}
            </span>
          </div>

          {/* Cash Received from Customer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {isKu ? 'پارەی وەرگیراو لە کڕیار' : 'Cash Received from Customer'} ({posDraft.activeCurrency})
              </label>
              {typeof posDraft.amountPaidNow === 'number' && posDraft.amountPaidNow > 0 && (
                <button
                  type="button"
                  onClick={() => setPosDraft((prev) => ({ ...prev, amountPaidNow: '' }))}
                  className="text-[10px] text-rose-500 hover:underline font-mono font-bold cursor-pointer"
                >
                  ✕ {isKu ? 'سڕینەوە' : 'Clear'}
                </button>
              )}
            </div>
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
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
            />
            {/* Quick-Cash Shortcut Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPosDraft((prev) => ({ ...prev, amountPaidNow: totalAfterDiscount }))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                title="Set paid amount to full invoice total"
              >
                {isKu ? 'تەواو دراوە' : 'Full Payment'}
              </button>
              {posDraft.activeCurrency === 'IQD' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 10000 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +10k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 25000 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +25k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 50000 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +50k
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 20 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +$20
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 50 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +$50
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = typeof posDraft.amountPaidNow === 'number' ? posDraft.amountPaidNow : 0;
                      setPosDraft((prev) => ({ ...prev, amountPaidNow: cur + 100 }));
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 font-mono shadow-2xs"
                  >
                    +$100
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPosDraft((prev) => ({ ...prev, amountPaidNow: 0 }))}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                title="Reset paid amount to 0"
              >
                ✕ {isKu ? 'سڕینەوە' : 'Clear'}
              </button>
            </div>
          </div>

          {/* Old Debt */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isKu ? 'قەرزی پێشووی کڕیار (وەرگیراو)' : 'Prior Customer Debt (Receivable)'} ({posDraft.activeCurrency})
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
              className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* Prominent Red Remaining Debt Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            combinedTotalDebt > 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 shadow-sm'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
          }`}>
            {combinedTotalDebt > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider block text-rose-800 dark:text-rose-300">
                    {isKu ? 'قەرزی لای کڕیار (وەرگیراو):' : 'Customer Debt (Receivable):'}
                  </span>
                  <span className="text-2xl font-black font-mono text-rose-700 dark:text-rose-200 leading-tight">
                    {formatMoney(combinedTotalDebt, posDraft.activeCurrency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    {isKu ? 'تەواو دراوە (قەرز نییە)' : 'Zero Debt • Paid in Full'}
                  </span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                    {isKu ? 'کۆی پسوولە بێ قەرزە' : 'No outstanding balance'}
                  </span>
                </div>
              </div>
            )}
          </div>

            {/* Large Action Buttons */}
            <div className="space-y-2 pt-2">
              {((editingTxId && userPermissions.canEditSales) || (!editingTxId && userPermissions.canCreateSales)) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveInvoice(false)}
                    className={`w-full py-3.5 px-4 text-sm font-bold rounded-xl active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editingTxId
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 ring-2 ring-amber-400/40'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/25'
                    }`}
                  >
                    <ReceiptText className="w-4 h-4" />
                    <span>
                      {editingTxId
                        ? (isKu ? 'نوێکردنەوەی وەسڵ (Update Existing Invoice)' : 'Update Existing Invoice')
                        : t.saveInvoice}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveInvoice(true)}
                    className={`w-full py-3 px-4 text-xs font-bold rounded-xl border transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                      editingTxId
                        ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 border-amber-300 dark:border-amber-800'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-900 border-sky-200 dark:border-sky-850'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {editingTxId
                        ? (isKu ? 'نوێکردنەوە و چاپ (Update & Print)' : 'Update & Print')
                        : (isKu ? 'تۆمار و چاپ (Save & Print)' : 'Save & Print')}
                    </span>
                  </button>
                </>
              )}
            </div>
        </div>
      </div>
      {/* END RIGHT COLUMN */}
    </div>
    {/* END TWO-COLUMN WORKSPACE */}
      </div>
      ) : null}

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
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
              title={isKu ? 'هەناردەکردنی فایلی Excel / CSV بۆ ژمێریاری و وردبینی' : 'Export filtered sales to Excel / CSV for accountant audit'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>{isKu ? 'هەناردەکردنی Excel / CSV' : 'Export Excel / CSV'}</span>
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

            {/* Receipt Sharing Language Toggle (Kurdish / English) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 h-8 text-xs shrink-0 ms-auto">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 hidden sm:inline">
                {isKu ? 'زمانی ناردن:' : 'Share:'}
              </span>
              <button
                type="button"
                onClick={() => setReceiptShareLang('ku')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  receiptShareLang === 'ku'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Send Receipts in Kurdish (کوردی)"
              >
                کوردی
              </button>
              <button
                type="button"
                onClick={() => setReceiptShareLang('en')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  receiptShareLang === 'en'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Send Receipts in English (ئینگلیزی)"
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Dual Adaptive Layout: Desktop Dense Table (W >= 1024px) */}
        <div className="hidden lg:block w-full max-w-full overflow-x-auto pb-4 rounded-3xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3">{isKu ? 'کۆد / بەروار' : 'Code / Date'}</th>
                <th className="px-3.5 py-3">{isKu ? 'کڕیار' : 'Customer'}</th>
                <th className="px-3.5 py-3">{isKu ? 'ڕوونکردنەوە (Notes)' : 'Notes / ڕوونکردنەوە'}</th>
                <th className="px-3.5 py-3">{isKu ? 'پوختە' : 'Summary'}</th>
                <th className="px-3.5 py-3">{isKu ? 'فرۆشیار / شێواز' : 'Seller / Method'}</th>
                <th className="px-3.5 py-3 text-right">{isKu ? 'کۆی گشتی' : 'Net Total'}</th>
                <th className="px-3.5 py-3 text-right">{isKu ? 'پارەی وەرگیراو' : 'RECEIVED / پارەی وەرگیراو'}</th>
                <th className="px-3.5 py-3 text-right">{isKu ? 'قەرزی ماوە' : 'UNPAID BALANCE / قەرزی ماوە'}</th>
                <th className="px-3.5 py-3 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                <th className="px-3.5 py-3 text-center">{isKu ? 'کردارەکان' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
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
                      <tr
                        onClick={() => toggleExpandTx(tx.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            {tx.images && tx.images.length > 0 ? (
                              <img
                                src={tx.images[0]}
                                alt="Receipt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({ url: tx.images![0], title: `Invoice ${tx.code || tx.id} - Receipt` });
                                }}
                                className="w-9 h-9 rounded border border-slate-200 dark:border-slate-700 object-cover cursor-pointer hover:scale-105 transition shrink-0 shadow-2xs"
                                title={isKu ? 'کرتە بکە بۆ پیشاندانی پسوولە' : 'Click to view receipt'}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white font-mono">
                                {tx.code || tx.id.slice(-6)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {tx.client || 'کڕیاری گشتی (General Customer)'}
                          </div>
                          {tx.clientPhone ? (
                            <a
                              href={`tel:${tx.clientPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              {tx.clientPhone}
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-xs">
                          {tx.notes ? (
                            <span
                              className="max-w-[150px] truncate block text-slate-500 dark:text-slate-400 text-xs cursor-help font-normal"
                              title={tx.notes}
                            >
                              {tx.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="text-slate-900 dark:text-white font-medium">
                            {tx.material || tx.panelType}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.quantity} {tx.unit} • {tx.sellingType}
                            {tx.items && tx.items.length > 1 && (
                              <span className="ms-1.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                {tx.items.length} کاڵا
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-xs text-slate-600 dark:text-slate-400">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{tx.seller || '—'}</div>
                          <div className="text-[11px] text-slate-500">{tx.bank || tx.paymentType || '—'}</div>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatMoney(tx.totalAfterDiscount, txCur)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatMoney(tx.amountPaidNow, txCur)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono">
                          {isDebt ? (
                            <div className="flex flex-col items-end gap-1 min-w-max">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                                {formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur)}
                              </span>
                              {userPermissions?.canEditSales && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDebtPayment(tx);
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-bold font-sans text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition inline-flex items-center gap-1 cursor-pointer"
                                  title={isKu ? 'وەرگرتنی پارە بۆ قەرزی ماوە' : 'Collect payment toward this balance'}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{isKu ? 'پارەدان' : 'Pay'}</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              {isKu ? 'بەتەواوی دراوە' : 'Paid in Full'}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
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
                        <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1 min-w-max">
                            {/* 1. Print */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintingTx(tx);
                              }}
                              className="p-1.5 rounded-md text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={isKu ? 'چاپکردنی وەسڵ (Print Slip)' : 'Print Slip'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* 2. WhatsApp */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsAppShare(tx);
                              }}
                              className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                              title={isKu ? 'ناردن بۆ وەتسئەپ (Share WhatsApp)' : 'Share WhatsApp'}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {/* 3. Email Receipt (Indigo) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmailShare(tx);
                              }}
                              className="p-1.5 rounded-md text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                              title={isKu ? 'ناردنی ئیمەیڵ (Email Receipt)' : 'Email Receipt'}
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {/* 4. Inspect / View Details & Attachment */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandTx(tx.id);
                              }}
                              className={`p-1.5 rounded-md transition cursor-pointer ${
                                isExpanded
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300'
                                  : 'text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50'
                              }`}
                              title={isKu ? 'بینینی تەواوی وردەکاری و هاوپێچ' : 'View Full Details / Attachment'}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* 4. Edit Invoice */}
                            {userPermissions.canEditSales && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTx(tx);
                                }}
                                className="p-1.5 rounded-md text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                                title={isKu ? 'دەستکاری پسوولە (Edit Invoice)' : 'Edit Invoice'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* 5. Delete Invoice */}
                            {userPermissions.canDeleteSales && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestConfirm({
                                    title: isKu ? 'سڕینەوەی پسوولە' : 'Delete Sales Invoice',
                                    message: isKu ? 'ئایا دڵنیایت لە سڕینەوەی ئەم پسوولەیە؟' : `Are you sure you want to delete invoice ${tx.code || tx.id}?`,
                                    type: 'danger',
                                    confirmLabel: isKu ? 'سڕینەوە' : 'Delete',
                                    cancelLabel: isKu ? 'پەشیمانبوونەوە' : 'Cancel',
                                    onConfirm: () => {
                                      deleteTransaction(tx.id);
                                    },
                                  });
                                }}
                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                title={isKu ? 'سڕینەوەی پسوولە (Delete Invoice)' : 'Delete Invoice'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* 6. Expand / Collapse Line Items Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandTx(tx.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={isExpanded ? 'Collapse items' : 'Expand line items'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Line Items & Inspection Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                              {/* Top Meta Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800 text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                                    <span>{isKu ? 'بەروار و کاتی تەواو:' : 'Exact Timestamp:'}</span>
                                    <b className="text-slate-900 dark:text-white font-mono">
                                      {new Date(tx.timestamp).toLocaleString()}
                                    </b>
                                  </span>
                                  {tx.legacyInvoiceRef && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[11px]">
                                      {isKu ? 'ئاماژە / داواکاری:' : 'Ref / PO #:'} <b>{tx.legacyInvoiceRef}</b>
                                    </span>
                                  )}
                                  {tx.seller && (
                                    <span className="text-slate-500">
                                      {isKu ? 'فرۆشیار:' : 'Seller:'} <b className="text-slate-700 dark:text-slate-300">{tx.seller}</b>
                                    </span>
                                  )}
                                  {tx.bank && (
                                    <span className="text-slate-500">
                                      {isKu ? 'قاسە / بانک:' : 'Drawer:'} <b className="text-slate-700 dark:text-slate-300">{tx.bank}</b>
                                    </span>
                                  )}
                                </div>

                                {/* Discount & Net Breakdown */}
                                <div className="flex items-center gap-2">
                                  {((tx.discountDollars && tx.discountDollars > 0) || (tx.discountPercentage && tx.discountPercentage > 0)) && (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold">
                                      {isKu ? 'داشکاندن:' : 'Discount:'}{' '}
                                      {tx.discountDollars ? formatMoney(tx.discountDollars, txCur) : ''}
                                      {tx.discountPercentage ? ` (${tx.discountPercentage}%)` : ''}
                                    </span>
                                  )}
                                  <span className="px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-sm font-mono font-extrabold whitespace-nowrap min-w-fit">
                                    {isKu ? 'کۆی گشتی:' : 'Net Total:'} {formatMoney(tx.totalAfterDiscount, txCur)}
                                  </span>

                                  {renderIqdEquivalent(tx.totalAfterDiscount, txCur)}

                                  {isDebt && (
                                    <span className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm font-mono font-extrabold whitespace-nowrap min-w-fit">
                                      {isKu ? 'قەرزی ماوە:' : 'Unpaid Balance:'} {formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur)}
                                      {renderIqdEquivalent(tx.combinedTotalDebt || tx.amountOwed || 0, txCur)}
                                    </span>
                                  )}

                                  {/* Indigo Email Receipt Action */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEmailShare(tx);
                                    }}
                                    className="px-3 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                    title={isKu ? 'ناردنی پسوولە بە ئیمەیڵ' : 'Email Invoice Receipt'}
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>{isKu ? 'ناردنی ئیمەیڵ' : 'Email Receipt'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Structured 2-Section Grid: Left (Receipt) vs Right (Financials & Notes) */}
                              <div className={`grid gap-5 ${tx.images && tx.images.length > 0 ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                                {/* Left Section (Receipt Image Preview Card) */}
                                {tx.images && tx.images.length > 0 && (
                                  <div className="lg:col-span-4 flex flex-col gap-2">
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <Paperclip className="w-3.5 h-3.5 text-sky-500" />
                                      <span>{isKu ? 'فۆتۆی پسوولە و هاوپێچ:' : 'Attached Receipt / Slip:'}</span>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col items-center justify-center gap-2">
                                      <img
                                        src={tx.images[0]}
                                        alt="Receipt Preview"
                                        onClick={() => setZoomedImage({ url: tx.images![0], title: `Invoice ${tx.code || tx.id} - Receipt` })}
                                        className="max-w-xs max-h-64 object-contain rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-zoom-in hover:opacity-95 transition"
                                        title="Click to view full-resolution image"
                                      />
                                      {tx.images.length > 1 && (
                                        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                                          {tx.images.slice(1).map((extraImg, idx) => (
                                            <img
                                              key={idx}
                                              src={extraImg}
                                              alt={`Extra ${idx}`}
                                              onClick={() => setZoomedImage({ url: extraImg, title: `Invoice ${tx.code || tx.id} - Extra ${idx + 1}` })}
                                              className="w-12 h-12 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:scale-105 transition"
                                            />
                                          ))}
                                        </div>
                                      )}
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        {isKu ? 'کرتە بکە بۆ گەورەکردن' : 'Click to inspect full image'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Right Section (Financials, Line Items & Notes) */}
                                <div className={`${tx.images && tx.images.length > 0 ? 'lg:col-span-8' : 'col-span-1'} space-y-3`}>
                                  {/* Full Line Items Breakdown */}
                                  <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                      {isKu ? 'وردەکاری سەرجەم کاڵاکان (Line Items Breakdown):' : 'Line Items Breakdown:'}
                                    </div>
                                    {tx.items && tx.items.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {tx.items.map((item, idx) => (
                                          <div
                                            key={idx}
                                            className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs flex justify-between gap-3 shadow-2xs"
                                          >
                                            <div className="min-w-0">
                                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                                {item.product}
                                              </div>
                                              <div className="text-slate-500 text-[11px] mt-0.5 whitespace-nowrap min-w-fit">
                                                {item.quantity} units × {formatMoney(item.price, txCur)}
                                              </div>
                                              {item.fundermaxBatchRef && (
                                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                                                  {isKu ? 'وەجبە:' : 'Batch:'} {item.fundermaxBatchRef}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">
                                                {formatMoney(item.total, txCur)}
                                              </div>
                                              {item.estimatedCost ? (
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                  {isKu ? 'تێچوو:' : 'Cost:'} {formatMoney(item.estimatedCost, txCur)}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs text-slate-700 dark:text-slate-300 flex justify-between">
                                        <span>{tx.material || tx.panelType} ({tx.quantity} {tx.unit} • {tx.sellingType})</span>
                                        <span className="font-mono font-bold whitespace-nowrap">{formatMoney(tx.totalAfterDiscount, txCur)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Full Unrestricted Text Notes */}
                                  {tx.notes && (
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>{isKu ? 'تێبینی و ڕوونکردنەوەی تەواو (Full Notes):' : 'Full Invoice Notes:'}</span>
                                      </div>
                                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans text-xs sm:text-sm">
                                        {tx.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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

        {/* Dual Adaptive Layout: Mobile Executive Console (W < 1024px) */}
        <div className="block lg:hidden space-y-3.5">
          {/* Boss Daily Cash Card */}
          <div className="p-4 rounded-3xl bg-linear-to-br from-slate-900 via-slate-850 to-emerald-950 text-white border-2 border-emerald-500/30 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    {isKu ? 'کاشی وەرگیراوی ئەمڕۆ (قاسەی سەرەکی)' : "Today's Received Counter Cash"}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 font-mono">
                    {todayInvoicesCount} {isKu ? 'پسوولەی فرۆشتن لە ئەمڕۆدا' : 'sales invoices today'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {isKu ? 'ئەمڕۆ' : 'TODAY'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-[10px] text-slate-300 font-bold uppercase">{isKu ? 'کاشی دۆلار' : 'Cash USD'}</div>
                <div className="font-mono text-base sm:text-lg font-black text-emerald-400">
                  ${todayCashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-[10px] text-slate-300 font-bold uppercase">{isKu ? 'کاشی دینار' : 'Cash IQD'}</div>
                <div className="font-mono text-base sm:text-lg font-black text-sky-400">
                  {todayCashIQD.toLocaleString()} د.ع
                </div>
              </div>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs">
              {isKu ? 'هیچ پسوولەیەکی فرۆشتن نەدۆزرایەوە.' : 'No sales invoices recorded yet.'}
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const txCur = tx.currency || 'USD';
              const isDebt = (tx.combinedTotalDebt || tx.amountOwed || 0) > 0;

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                >
                  {/* Top row: Invoice #, Date, and Client Name */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-750 pb-2.5">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {tx.client || (isKu ? 'کڕیاری گشتی' : 'General Customer')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <span className="font-bold text-sky-700 dark:text-sky-400">#{tx.code || tx.id.slice(-6)}</span>
                        <span>•</span>
                        <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {tx.clientPhone ? (
                      <a
                        href={`tel:${tx.clientPhone}`}
                        className="h-9 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-mono font-bold flex items-center gap-1 shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{tx.clientPhone}</span>
                      </a>
                    ) : null}
                  </div>

                  {/* Middle row: Net Total and Payment Status badge (Paid, Partial, or Debt) */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                        {isKu ? 'کۆی گشتی' : 'Net Total'}
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                        {formatMoney(tx.totalAfterDiscount, txCur)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : tx.status === 'partial'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {tx.status === 'completed'
                          ? (isKu ? 'دراوە (Paid)' : 'Paid')
                          : tx.status === 'partial'
                          ? (isKu ? 'بەشێک (Partial)' : 'Partial')
                          : (isKu ? 'قەرز (Debt)' : 'Debt')}
                      </span>
                      {isDebt && (
                        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          ({formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur)})
                        </span>
                                             )}
                       {isDebt && userPermissions?.canEditSales && (
                         <button
                           type="button"
                           onClick={() => openDebtPayment(tx)}
                           className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                         >
                           <Plus className="w-3 h-3" />
                           {isKu ? 'پارەدان' : 'Pay'}
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Bottom row: Single tap to open full invoice inspection, with quick-share buttons (WhatsApp, Print) neatly aligned without line-wrapping */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setInspectingTx(tx)}
                      className="flex-1 min-h-[48px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer truncate"
                      title={isKu ? 'وردەکاری پسوولە' : 'Inspect Invoice'}
                    >
                      <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                      <span className="truncate">{isKu ? 'وردەکاری پسوولە' : 'Inspect'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintingTx(tx)}
                      className="min-h-[48px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                      title="Print Invoice Slip"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>{isKu ? 'چاپ' : 'Print'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(tx)}
                      className="min-h-[48px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                      title={receiptShareLang === 'ku' ? 'ناردن بۆ وەتسئەپ' : 'WhatsApp'}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEmailShare(tx)}
                      className="min-h-[48px] px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                      title={receiptShareLang === 'ku' ? 'ناردنی ئیمەیڵ' : 'Email Receipt'}
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>{isKu ? 'ئیمەیڵ' : 'Email'}</span>
                    </button>
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

      {/* INVOICE DETAILS INSPECTION MODAL (Requirement 2) */}
      {inspectingTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setInspectingTx(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isKu ? 'وردەکاری پسوولە' : 'Invoice Details'} (#{inspectingTx.code || inspectingTx.id.slice(-6)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">{isKu ? 'کڕیار:' : 'Customer:'}</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {inspectingTx.client || 'کڕیاری گشتی (General Customer)'}
                </span>
                {inspectingTx.clientPhone && (
                  <div className="font-mono text-sky-600 dark:text-sky-400 text-[11px] mt-0.5">
                    {inspectingTx.clientPhone}
                  </div>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">{isKu ? 'بەروار:' : 'Date:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(inspectingTx.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {inspectingTx.paymentType || inspectingTx.bank || '—'}
                </span>
              </div>
              {inspectingTx.legacyInvoiceRef && (
                <div>
                  <span className="text-slate-400 block">{isKu ? 'تۆماری کۆن / پسوولەی دەستی:' : 'Legacy Invoice Ref:'}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {inspectingTx.legacyInvoiceRef}
                  </span>
                </div>
              )}
              {inspectingTx.seller && (
                <div>
                  <span className="text-slate-400 block">{isKu ? 'فرۆشیار:' : 'Seller:'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingTx.seller}
                  </span>
                </div>
              )}
              {inspectingTx.bank && (
                <div>
                  <span className="text-slate-400 block">{isKu ? 'قاسە / بانک:' : 'Bank / Drawer:'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingTx.bank}
                  </span>
                </div>
              )}
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isKu ? 'کاڵا و بابەتەکان' : 'Purchased Items'}
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">{isKu ? 'کاڵا' : 'Item'}</th>
                      <th className="px-3 py-2 text-center">{isKu ? 'بڕ' : 'Qty'}</th>
                      <th className="px-3 py-2 text-right">{isKu ? 'نرخ' : 'Price'}</th>
                      <th className="px-3 py-2 text-right">{isKu ? 'کۆی کاڵا' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {inspectingTx.items && inspectingTx.items.length > 0 ? (
                      inspectingTx.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                            {it.product}
                            {it.type && <span className="text-slate-400 font-normal ms-1">({it.type})</span>}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatMoney(it.price, inspectingTx.currency || 'USD')}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatMoney(it.total, inspectingTx.currency || 'USD')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                          {inspectingTx.material || inspectingTx.panelType}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{inspectingTx.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatMoney(inspectingTx.sellingAmount, inspectingTx.currency || 'USD')}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatMoney(inspectingTx.totalAfterDiscount || inspectingTx.sellingAmount, inspectingTx.currency || 'USD')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <div className="p-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{isKu ? 'کۆی گشتی' : 'Gross Total'}</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {formatMoney(inspectingTx.sellingAmount, inspectingTx.currency || 'USD')}
                </span>
              </div>
              <div className="p-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{isKu ? 'داشکاندن' : 'Discount'}</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                  {formatMoney(inspectingTx.discountDollars || 0, inspectingTx.currency || 'USD')}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">{isKu ? 'دراوە' : 'Paid Now'}</span>
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                  {formatMoney(inspectingTx.amountPaidNow || 0, inspectingTx.currency || 'USD')}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold block">{isKu ? 'قەرزی ماوە' : 'Order Debt'}</span>
                <span className="font-mono font-black text-xs sm:text-sm text-rose-700 dark:text-rose-400">
                  {formatMoney(inspectingTx.amountOwed || 0, inspectingTx.currency || 'USD')}
                </span>
              </div>
            </div>

            {/* Red Debt Banner if remaining debt exists */}
            {(inspectingTx.combinedTotalDebt || inspectingTx.amountOwed || 0) > 0 && (
              <div className="bg-rose-600 text-white font-bold p-3 rounded-lg text-lg text-center shadow-md">
                {isKu ? 'کۆی قەرز / Total Combined Debt' : 'Total Combined Debt / کۆی قەرز'}: {formatMoney(inspectingTx.combinedTotalDebt || inspectingTx.amountOwed || 0, inspectingTx.currency || 'USD')}
              </div>
            )}

            {/* Attached Slips / Receipts Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-sky-500" />
                  <span>{isKu ? 'هاوپێچەکان (وەسڵی دەستی / پارەدان)' : 'Attached Slips / Photos (هاوپێچ)'}</span>
                </div>
                {inspectingTx.images && inspectingTx.images.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    {inspectingTx.images.length} {isKu ? 'وێنە' : 'slips'}
                  </span>
                )}
              </div>
              {inspectingTx.images && inspectingTx.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {inspectingTx.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setZoomedImage({ url: img, title: 'Attachment Slip' })}
                      className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-sky-500 transition-all cursor-pointer"
                      title="Click to preview fullscreen"
                    >
                      <img src={img} alt={`Slip ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                        {isKu ? 'گەورەکردن' : 'Zoom'}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic pt-1">
                  {isKu ? 'هیچ وێنە یان وەسڵێکی دەستی هاوپێچ نەکراوە.' : 'No attached slips or receipts for this invoice.'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {isKu ? 'داخستن' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => handleWhatsAppShare(inspectingTx)}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isKu ? 'وەتسئەپ' : 'WhatsApp'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleEmailShare(inspectingTx)}
                className="px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <Mail className="w-4 h-4" />
                <span>{isKu ? 'ناردنی ئیمەیڵ' : 'Email Receipt'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintingTx(inspectingTx);
                  setInspectingTx(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{isKu ? 'چاپکردنی وەسڵ' : 'Print Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT CUSTOMER DEBT MODAL */}
      {payingTx && (() => {
        const cur: CurrencyCode = payingTx.currency || 'USD';
        const debt = payingTx.combinedTotalDebt || payingTx.amountOwed || 0;
        const entered = parseFloat(payAmount) || 0;
        const remainingAfter = Math.max(0, debt - entered);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeDebtPayment}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isKu ? 'وەرگرتنی قەرزی کڕیار' : 'Collect Customer Debt'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isKu ? 'بەبێ دروستکردنی وەسڵی فرۆشتنی ساختە' : 'No new sale invoice is created'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDebtPayment}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>{isKu ? 'کڕیار:' : 'Customer:'}</span>
                  <b className="text-slate-900 dark:text-white text-sm">{payingTx.client || (isKu ? 'کڕیاری گشتی' : 'General Customer')}</b>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>{isKu ? 'ژمارەی وەسڵی سەرەکی:' : 'Original Invoice #:'}</span>
                  <b className="text-sky-700 dark:text-sky-400 font-mono">#{payingTx.code || payingTx.id.slice(-6)}</b>
                </div>
                <div className="flex justify-between items-start text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>{isKu ? 'کۆی قەرزی ماوە:' : 'Total Unpaid Debt:'}</span>
                  <span className="text-right">
                    <b className="text-rose-600 dark:text-rose-400 font-mono text-sm">{formatMoney(debt, cur)}</b>
                    {renderIqdEquivalent(debt, cur)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isKu ? 'بڕی پارەی وەرگیراو' : 'Payment Amount'} ({cur})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={payAmount}
                  onChange={(e) => {
                    setPayAmount(e.target.value);
                    setPayError('');
                  }}
                  autoFocus
                  className="w-full px-3 py-2.5 text-base rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(roundMoney(debt, cur)))}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isKu ? 'هەموو قەرز' : 'Pay full balance'}
                  </button>
                  <span className="font-mono">
                    {isKu ? 'دوای پارەدان:' : 'Remaining after:'} {formatMoney(remainingAfter, cur)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isKu ? 'قاسە / هەژمار' : 'Drawer / Account'}
                </label>
                <select
                  value={payDrawer}
                  onChange={(e) => setPayDrawer(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  {drawerOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isKu ? 'هاوپێچ / وێنەی حەواڵە (ئارەزوومەندانە)' : 'Receipt / Slip Photo (optional)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const urls = await readImageFiles(files);
                    setPayImages((prev) => [...urls, ...prev]);
                    e.target.value = '';
                  }}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 file:font-semibold"
                />
                {payImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {payImages.map((src, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Slip ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPayImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl-md cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {payError && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {payError}
                </div>
              )}

              <button
                type="button"
                onClick={handleRecordDebtPayment}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>{isKu ? 'پاشەکەوتکردنی پارەدان' : 'Record Debt Payment'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* INVOICE COMPLETION / SUCCESS CONFIRMATION MODAL */}
      {completedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setCompletedInvoice(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header with success badge */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-mono mb-1">
                  #{completedInvoice.tx.code || completedInvoice.tx.id.slice(-6)} • {completedInvoice.isEdit ? (isKu ? 'نوێکرایەوە' : 'Updated') : (isKu ? 'تۆمارکرا' : 'Recorded')}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {completedInvoice.isEdit
                    ? (isKu ? 'وەسڵ بەسەرکەوتوویی نوێکرایەوە' : 'Invoice Updated Successfully')
                    : (isKu ? 'وەسڵ بەسەرکەوتوویی تۆمارکرا' : 'Invoice Created Successfully')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {completedInvoice.tx.client || (isKu ? 'کڕیاری گشتی' : 'General Customer')} • {formatMoney(completedInvoice.tx.totalAfterDiscount, completedInvoice.tx.currency || 'USD')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>{isKu ? 'کۆی گشتی پسوولە:' : 'Net Total:'}</span>
                <b className="text-slate-900 dark:text-white font-mono text-sm">
                  {formatMoney(completedInvoice.tx.totalAfterDiscount, completedInvoice.tx.currency || 'USD')}
                </b>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>{isKu ? 'پارەی وەرگیراو:' : 'Received:'}</span>
                <b className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatMoney(completedInvoice.tx.amountPaidNow, completedInvoice.tx.currency || 'USD')}
                </b>
              </div>
              {(completedInvoice.tx.combinedTotalDebt || completedInvoice.tx.amountOwed || 0) > 0 && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span>{isKu ? 'قەرزی ماوە:' : 'Unpaid Balance:'}</span>
                  <b className="text-rose-600 dark:text-rose-400 font-mono">
                    {formatMoney(completedInvoice.tx.combinedTotalDebt || completedInvoice.tx.amountOwed || 0, completedInvoice.tx.currency || 'USD')}
                  </b>
                </div>
              )}
            </div>

            {/* Action Buttons: Print Receipt, Send WhatsApp, Email Receipt */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Print Receipt */}
              <button
                type="button"
                onClick={() => {
                  setPrintingTx(completedInvoice.tx);
                  setCompletedInvoice(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isKu ? 'چاپکردنی وەسڵ' : 'Print Receipt'}</span>
              </button>

              {/* Send WhatsApp */}
              <button
                type="button"
                onClick={() => handleWhatsAppShare(completedInvoice.tx)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isKu ? 'ناردن بۆ وەتسئەپ' : 'Send WhatsApp'}</span>
              </button>

              {/* Email Receipt (Indigo) */}
              <button
                type="button"
                onClick={() => handleEmailShare(completedInvoice.tx)}
                className="py-2.5 px-3 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>{isKu ? 'ناردنی ئیمەیڵ' : 'Email Receipt'}</span>
              </button>
            </div>

            {/* Dismiss Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCompletedInvoice(null)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {isKu ? 'داخستن / بەردەوامبوون' : 'Done / Create Another'}
              </button>
            </div>
          </div>
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
