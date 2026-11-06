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
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle
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
import { readImageFiles, readImageFile, extractClipboardFiles } from '../utils/imageUpload';
import { compressImage } from '../utils/compressImage';
import { DEBT_PAYMENT_ACTION, buildDebtPaymentDetails, getTodayDebtPaymentIntake } from '../utils/debtPayments';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import SupplierPayablesModal from './SupplierPayablesModal';
import { generateMasterPDF } from '@/actions/pdfActions';
import toast, { Toaster } from 'react-hot-toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const WeChatIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Primary speech bubble */}
    <path d="M8.5 3C4.36 3 1 5.91 1 9.5c0 1.96.98 3.73 2.5 4.96L2.5 18l4.08-1.36c.61.23 1.25.36 1.92.36 4.14 0 7.5-2.91 7.5-6.5S12.64 3 8.5 3z" />
    <circle cx="6.5" cy="9" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="9" r="0.75" fill="currentColor" stroke="none" />

    {/* Secondary speech bubble */}
    <path d="M16 11c3.31 0 6 2.24 6 5 0 1.45-.75 2.75-1.94 3.65L21 22.5l-3.08-1.03c-.6.2-1.24.31-1.92.31-1.68 0-3.2-.58-4.28-1.55" />
    <circle cx="14" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

export const TradeLedgerSection: React.FC = () => {
  const pdfCache = useRef<Record<string, { base64: string; fileName: string; downloaded?: boolean }>>({});
  const cachedLogoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cachedLogoRef.current) {
      fetch(`${window.location.origin}/shaswar-ahmad-logo.png`)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            cachedLogoRef.current = reader.result as string;
          };
          reader.readAsDataURL(blob);
        })
        .catch(e => console.warn("Logo preloading failed", e));
    }
  }, []);

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
    isMergerModalOpen,
    openMergerModal,
    requestConfirm,
    requestAlert,
    shipments,
    setZoomedImage,
    logActivity,
    activityLogs,
    setCurrentModule,
    pullFromServer,
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

  const COUNTRY_CODE_OPTIONS = [
    { label: '🇮🇶 Iraq (+964)', value: '+964' },
    { label: '🇨🇳 China (+86)', value: '+86' },
    { label: '🇩🇪 Germany (+49)', value: '+49' },
    { label: '🇦🇹 Austria (+43)', value: '+43' },
    { label: '🇺🇸 US (+1)', value: '+1' },
    { label: '🇬🇧 UK (+44)', value: '+44' },
    { label: '🇦🇪 UAE (+971)', value: '+971' },
    { label: '🇸🇦 Saudi (+966)', value: '+966' },
    { label: '🇹🇷 Turkey (+90)', value: '+90' },
    { label: '🇫🇷 France (+33)', value: '+33' },
    { label: '🇮🇹 Italy (+39)', value: '+39' },
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
  const [receiptShareLang, setReceiptShareLang] = useState<'ku' | 'en' | 'ar'>(language === 'en' ? 'en' : 'ku');
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('+964');
  const [showMoreInvoiceDetails, setShowMoreInvoiceDetails] = useState(false);
  const [showMobileCost, setShowMobileCost] = useState(false);
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);
  const [ledgerTimeFilter, setLedgerTimeFilter] = useState('all');
  const [txFormMode, setTxFormMode] = useState<'AR' | 'AP'>('AP');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'AR' | 'AP'>('all');
  const [arTimeFilter, setArTimeFilter] = useState('all');
  const [apTimeFilter, setApTimeFilter] = useState('all');
  const [isExecutiveAnalyticsOpen, setIsExecutiveAnalyticsOpen] = useState(false);

  // Math calculator local states for line items & summary amounts
  const [rowPriceStr, setRowPriceStr] = useState<string>('');
  const [costPriceStr, setCostPriceStr] = useState<string>('');
  const [discountDollarsStr, setDiscountDollarsStr] = useState<string>('');
  const [amountPaidNowStr, setAmountPaidNowStr] = useState<string>('');
  const [oldUnpaidDebtStr, setOldUnpaidDebtStr] = useState<string>('');

  const evaluateMath = (input: string): number | '' => {
    if (!input || !input.trim()) return '';
    try {
      const sanitized = input.replace(/[^0-9+\-*/.()]/g, '');
      if (!sanitized) return '';
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${sanitized})`)();
      return isNaN(result) || !isFinite(result) ? '' : Math.round(Number(result) * 100) / 100;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    setRowPriceStr(posDraft.rowPrice === '' || posDraft.rowPrice === undefined ? '' : String(posDraft.rowPrice));
  }, [posDraft.rowPrice]);

  useEffect(() => {
    setCostPriceStr(posDraft.estimatedCost === '' || posDraft.estimatedCost === undefined ? '' : String(posDraft.estimatedCost));
  }, [posDraft.estimatedCost]);

  useEffect(() => {
    setDiscountDollarsStr(posDraft.discountDollars === '' || posDraft.discountDollars === undefined ? '' : String(posDraft.discountDollars));
  }, [posDraft.discountDollars]);

  useEffect(() => {
    setAmountPaidNowStr(posDraft.amountPaidNow === '' || posDraft.amountPaidNow === undefined ? '' : String(posDraft.amountPaidNow));
  }, [posDraft.amountPaidNow]);

  useEffect(() => {
    setOldUnpaidDebtStr(posDraft.oldUnpaidDebt === '' || posDraft.oldUnpaidDebt === undefined ? '' : String(posDraft.oldUnpaidDebt));
  }, [posDraft.oldUnpaidDebt]);

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
    if (pastTxWithPhone) {
      let clientPhone = pastTxWithPhone.clientPhone || '';
      let code = pastTxWithPhone.phoneCountryCode;
      if (!code && clientPhone) {
        const trimmed = clientPhone.trim();
        const rawDigits = trimmed.replace(/\D/g, '');
        if (trimmed.startsWith('+86') || rawDigits.startsWith('86') || rawDigits.startsWith('086')) {
          code = '+86';
        } else {
          const matched = COUNTRY_CODE_OPTIONS.find((c) => trimmed.startsWith(c.value));
          if (matched) code = matched.value;
          else if (trimmed.startsWith('+964') || rawDigits.startsWith('964')) code = '+964';
        }
      }
      if (code) {
        setPhoneCountryCode(code);
        if (clientPhone.startsWith(code)) {
          clientPhone = clientPhone.slice(code.length).trim();
        }
      }
      setPosDraft((prev) => ({
        ...prev,
        client: clientName,
        clientPhone: prev.clientPhone ? prev.clientPhone : clientPhone,
        oldUnpaidDebt: debt > 0 ? debt : '',
      }));
    } else {
      setPosDraft((prev) => ({
        ...prev,
        client: clientName,
        oldUnpaidDebt: debt > 0 ? debt : '',
      }));
    }
  };

  // Smart Interceptor Attachment Upload Handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const uploaded = await readImageFiles(files, 'document');
      if (uploaded.length > 0) {
        setPosDraft((prev) => ({
          ...prev,
          images: [...uploaded, ...prev.images],
        }));
      }
    } catch (err) {
      console.warn('[handleAttachmentUpload failed]', err);
    }
  };

  const handleAttachmentFilesDrop = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    try {
      const uploaded = await readImageFiles(files, 'document');
      if (uploaded.length > 0) {
        setPosDraft((prev) => ({
          ...prev,
          images: [...uploaded, ...prev.images],
        }));
      }
    } catch (err) {
      console.warn('[handleAttachmentFilesDrop failed]', err);
    }
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
  const [isSupplierPayablesOpen, setIsSupplierPayablesOpen] = useState<boolean>(false);
  const [inspectingTxForMath, setInspectingTxForMath] = useState<boolean>(false);
  const [printingTx, setPrintingTx] = useState<PanelTransaction | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<{ tx: PanelTransaction; isEdit: boolean } | null>(null);
  // Debt settlement (collect cash toward an existing invoice balance)
  const [payingTx, setPayingTx] = useState<PanelTransaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDrawer, setPayDrawer] = useState('');
  const [payImages, setPayImages] = useState<string[]>([]);
  const [payError, setPayError] = useState('');

  // Global Paste Support for Upload Dropzones in SalesSection
  useEffect(() => {
    if (isMergerModalOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const pastedFiles = extractClipboardFiles(e.clipboardData);
      if (pastedFiles.length === 0) return;
      e.preventDefault();
      if (payingTx) {
        openMergerModal(pastedFiles, (mergedDataUrl) => {
          if (mergedDataUrl) {
            setPayImages((prev) => [mergedDataUrl, ...prev]);
          }
        });
      } else {
        openMergerModal(pastedFiles, (mergedDataUrl) => {
          if (mergedDataUrl) {
            setPosDraft((prev) => ({
              ...prev,
              images: [mergedDataUrl, ...prev.images],
            }));
          }
        });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isMergerModalOpen, openMergerModal, payingTx, setPosDraft]);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [addingDropdownCategory, setAddingDropdownCategory] = useState<
    'savedTypes' | 'savedProducts' | 'savedSellingTypes' | 'savedSellers' | 'savedBanks' | 'savedPaymentTypes' | 'savedClients' | null
  >(null);
  const [newDropdownValue, setNewDropdownValue] = useState('');

  // Expandable row state in ledger
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());
  const [openShareMenuTxId, setOpenShareMenuTxId] = useState<string | null>(null);
  const [lazyImagesByTxId, setLazyImagesByTxId] = useState<Record<string, string[]>>({});
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const handleViewReceipt = async (txId: string, codeLabel?: string, openZoom = true): Promise<string[]> => {
    const existing = lazyImagesByTxId[txId];
    if (existing && existing.length > 0) {
      if (openZoom) {
        setZoomedImage({ url: existing[0], title: `Invoice ${codeLabel || txId} - Receipt` });
      }
      return existing;
    }
    setLoadingReceiptId(txId);
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}/image`, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      const fetched: string[] = Array.isArray(data?.images) ? data.images : [];
      if (fetched.length > 0) {
        setLazyImagesByTxId((prev) => ({ ...prev, [txId]: fetched }));
        setInspectingTx((prev) => (prev && prev.id === txId ? { ...prev, images: fetched, hasImages: true } : prev));
        if (openZoom) {
          setZoomedImage({ url: fetched[0], title: `Invoice ${codeLabel || txId} - Receipt` });
        }
      }
      return fetched;
    } catch (err) {
      console.warn('[handleViewReceipt] Failed to fetch receipt image:', err);
      return [];
    } finally {
      setLoadingReceiptId((prev) => (prev === txId ? null : prev));
    }
  };

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
    setPosDraft((prev) => ({ ...prev, paymentType: method }));
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

    const isAR = txFormMode === 'AR';
    const invoiceId = editingTxId || `tx-${Date.now()}`;
    const autoCode = posDraft.invoiceCode.trim()
      ? autoCapitalizeFirstLetter(posDraft.invoiceCode.trim())
      : `${isAR ? 'INV' : 'BILL'}-${Date.now().toString().slice(-6)}`;

    const txPayload: PanelTransaction = {
      id: invoiceId,
      code: autoCode,
      timestamp: new Date().toISOString(),
      panelType: autoCapitalizeFirstLetter(finalItems[0]?.type || 'Panel'),
      material: finalItems.length === 1 ? autoCapitalizeFirstLetter(finalItems[0].product) : `${finalItems.length} Products (${totalQty} units)`,
      quantity: totalQty,
      unit: isKu ? 'دانە' : 'sheets',
      sellingType: isAR ? 'Customer Sale' : 'Supplier Purchase',
      seller: posDraft.seller.trim() ? autoCapitalizeFirstLetter(posDraft.seller.trim()) : undefined,
      bank: posDraft.bank.trim() ? autoCapitalizeFirstLetter(posDraft.bank.trim()) : undefined,
      paymentType: posDraft.paymentType.trim()
        ? autoCapitalizeFirstLetter(posDraft.paymentType.trim())
        : (isAR ? 'Cash' : 'Supplier Bill'),
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
      clientPhone: (() => {
        const raw = posDraft.clientPhone.trim();
        if (!raw) return undefined;
        if (raw.startsWith('+')) return raw;
        const digits = raw.replace(/\D/g, '');
        const codeDigits = phoneCountryCode.replace(/\D/g, '');
        if (digits.startsWith(codeDigits)) return `+${digits}`;
        return `${phoneCountryCode} ${raw}`;
      })(),
      phoneCountryCode: phoneCountryCode,
      legacyInvoiceRef: posDraft.legacyInvoiceRef.trim() ? autoCapitalizeFirstLetter(posDraft.legacyInvoiceRef.trim()) : undefined,
      fundermaxBatchRef: posDraft.fundermaxBatchRef.trim() ? autoCapitalizeFirstLetter(posDraft.fundermaxBatchRef.trim()) : undefined,
      estimatedCost: typeof posDraft.estimatedCost === 'number' && posDraft.estimatedCost > 0 ? posDraft.estimatedCost : undefined,
      chargedAmount: moneySnap.chargedAmount,
      chargedCurrency: moneySnap.chargedCurrency,
      exchangeRateApplied: moneySnap.exchangeRateApplied,
      baseUsdEquivalent: moneySnap.baseUsdEquivalent,
      isReceivable: isAR,
    };

    const wasEditing = !!editingTxId;
    const shipmentCurrency: 'EUR' | 'USD' = cur === 'EUR' ? 'EUR' : 'USD';
    const shipmentTotalInvoice =
      cur === 'IQD'
        ? roundMoney(convertCurrency(roundedNet + roundedOldDebt, 'IQD', 'USD'), 'USD')
        : roundedNet + roundedOldDebt;
    const shipmentPaidAmount =
      cur === 'IQD'
        ? roundMoney(convertCurrency(roundedPaid, 'IQD', 'USD'), 'USD')
        : roundedPaid;

    const customBatchCode = autoCode;

    const shipmentResult = warehouseOps.addShipment({
      id: invoiceId,
      batchCode: customBatchCode,
      supplier: posDraft.client.trim()
        ? autoCapitalizeFirstLetter(posDraft.client.trim())
        : (isAR ? 'Walk-in Customer' : 'FunderMax GmbH'),
      supplierContact: txPayload.clientPhone || '',
      originCountry: posDraft.legacyInvoiceRef.trim()
        ? autoCapitalizeFirstLetter(posDraft.legacyInvoiceRef.trim())
        : 'Austria (EU)',
      arrivalDate: new Date().toISOString().split('T')[0],
      status: 'received',
      notes: posDraft.notes ? autoCapitalizeFirstLetter(posDraft.notes) : '',
      items: finalItems.map((item) => ({
        description: item.product || item.type || 'Wood Panel Item',
        unit: isKu ? 'دانە' : 'sheets',
        expectedQty: Math.max(1, Number(item.quantity) || 1),
        receivedQty: Math.max(1, Number(item.quantity) || 1),
      })),
      invoiceCurrency: shipmentCurrency,
      totalInvoiceAmount: shipmentTotalInvoice,
      amountPaidToSupplier: shipmentPaidAmount,
      attachments: posDraft.images || [],
    });

    if (!shipmentResult.ok) {
      requestAlert({
        title: isKu ? 'ئاگاداری پسوولەی دابینکەر' : 'Supplier Bill Notice',
        message: shipmentResult.error,
        type: 'warning',
      });
      return;
    }

    if (editingTxId) {
      editTransaction(editingTxId, txPayload);
      setEditingTxId(null);
    } else {
      addTransaction(txPayload);
    }

    if (posDraft.images && posDraft.images.length > 0) {
      setLazyImagesByTxId((prev) => ({ ...prev, [invoiceId]: posDraft.images }));
    } else {
      setLazyImagesByTxId((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });
    }

    void warehouseOps.syncFromServer?.();

    setPrintingTx(txPayload);

    clearPosDraft();
  };

  const handleEditTx = (tx: PanelTransaction) => {
    setEditingTxId(tx.id);
    setTxFormMode(tx.isReceivable ? 'AR' : 'AP');
    const totalSelling = Number(tx.sellingAmount || tx.totalAfterDiscount || 0);
    const rawItems = Array.isArray(tx.items) ? tx.items : [];
    const normalizedItems: InvoiceItem[] = rawItems.map((it, idx) => {
      const qty = Math.max(1, Number(it.quantity) || Number(tx.quantity) || 1);
      const existingTotal = Number(it.total) || 0;
      const existingPrice = Number(it.price) || 0;
      const fallbackTotal =
        existingTotal > 0
          ? existingTotal
          : idx === 0 && rawItems.every((r) => !(Number(r.total) > 0))
          ? totalSelling
          : 0;
      const fallbackPrice =
        existingPrice > 0
          ? existingPrice
          : fallbackTotal > 0
          ? roundMoney(fallbackTotal / qty, tx.currency || 'USD')
          : 0;
      return {
        ...it,
        quantity: qty,
        price: fallbackPrice,
        total: fallbackTotal,
      };
    });

    const singleItem = normalizedItems.length === 1 ? normalizedItems[0] : null;
    const hasMultipleItems = normalizedItems.length > 1;
    const defaultQty = singleItem
      ? singleItem.quantity
      : !hasMultipleItems
      ? Number(tx.quantity) || 1
      : 1;
    const defaultPrice = singleItem
      ? singleItem.price
      : !hasMultipleItems && totalSelling > 0
      ? roundMoney(totalSelling / Math.max(1, defaultQty), tx.currency || 'USD')
      : '';

    let extractedPhone = tx.clientPhone || '';
    let extractedCode = tx.phoneCountryCode || '+964';

    if (tx.phoneCountryCode) {
      extractedCode = tx.phoneCountryCode;
    } else if (tx.clientPhone) {
      const trimmedPhone = tx.clientPhone.trim();
      const rawDigits = trimmedPhone.replace(/\D/g, '');
      if (trimmedPhone.startsWith('+86') || rawDigits.startsWith('86') || rawDigits.startsWith('086')) {
        extractedCode = '+86';
      } else {
        const matched = COUNTRY_CODE_OPTIONS.find((c) => trimmedPhone.startsWith(c.value));
        if (matched) {
          extractedCode = matched.value;
        } else if (trimmedPhone.startsWith('+964') || rawDigits.startsWith('964') || trimmedPhone.startsWith('07')) {
          extractedCode = '+964';
        }
      }
    }

    if (extractedPhone.startsWith(extractedCode)) {
      extractedPhone = extractedPhone.slice(extractedCode.length).trim();
    } else if (extractedPhone.startsWith('+')) {
      const matched = COUNTRY_CODE_OPTIONS.find((c) => extractedPhone.startsWith(c.value));
      if (matched) {
        extractedPhone = extractedPhone.slice(matched.value.length).trim();
      }
    }

    setPhoneCountryCode(extractedCode);

    setPosDraft({
      invoiceCode: tx.code || '',
      seller: tx.seller && tx.seller !== '—' ? tx.seller : '',
      bank: tx.bank || '',
      paymentType: tx.paymentType || '',
      activeCurrency: tx.currency || 'USD',
      items: hasMultipleItems ? normalizedItems : [],
      rowType: singleItem
        ? singleItem.type || tx.panelType || ''
        : !hasMultipleItems
        ? tx.panelType || ''
        : '',
      rowProduct: singleItem
        ? singleItem.product || tx.material || ''
        : !hasMultipleItems
        ? tx.material || ''
        : '',
      rowQuantity: defaultQty,
      rowSellingType: singleItem
        ? singleItem.sellingType || tx.sellingType || ''
        : !hasMultipleItems
        ? tx.sellingType || ''
        : '',
      rowPrice: defaultPrice !== '' ? defaultPrice : '',
      discountDollars: tx.discountDollars ? tx.discountDollars : '',
      discountPercentage: tx.discountPercentage ? tx.discountPercentage : '',
      amountPaidNow:
        tx.amountPaidNow !== undefined && tx.amountPaidNow !== null ? tx.amountPaidNow : '',
      oldUnpaidDebt: tx.oldUnpaidDebt ? tx.oldUnpaidDebt : '',
      notes: tx.notes || '',
      images: tx.images && tx.images.length > 0 ? tx.images : (lazyImagesByTxId[tx.id] || []),
      client: tx.client || '',
      clientPhone: extractedPhone,
      legacyInvoiceRef: tx.legacyInvoiceRef || '',
      fundermaxBatchRef: tx.fundermaxBatchRef || tx.code || '',
      estimatedCost:
        tx.estimatedCost !== undefined && tx.estimatedCost !== null
          ? tx.estimatedCost
          : tx.costPrice !== undefined && tx.costPrice !== null
          ? tx.costPrice
          : '',
    });
    if (tx.hasImages && (!tx.images || tx.images.length === 0) && !lazyImagesByTxId[tx.id]?.length) {
      void handleViewReceipt(tx.id, tx.code, false).then((loaded) => {
        if (loaded.length > 0) {
          setPosDraft((prev) => (prev.images.length === 0 ? { ...prev, images: loaded } : prev));
        }
      });
    }
    document.getElementById('sales-draft-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteTx = (tx: PanelTransaction) => {
    warehouseOps.softDeleteShipment(tx.id);
    deleteTransaction(tx.id);
    void warehouseOps.syncFromServer?.();

    toast(
      (tObj) => (
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span>
            {isKu
              ? `پسوولەی ${tx.code || tx.id} سڕایەوە`
              : `Invoice ${tx.code || tx.id} deleted`}
          </span>
          <button
            type="button"
            onClick={() => {
              warehouseOps.restoreShipment(tx.id);
              void warehouseOps.syncFromServer?.();
              toast.dismiss(tObj.id);
              toast.success(isKu ? 'پسوولەکە گەڕێندرایەوە!' : 'Invoice restored!');
            }}
            className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold uppercase tracking-wider cursor-pointer transition"
          >
            {isKu ? 'گەڕاندنەوە' : 'UNDO'}
          </button>
        </div>
      ),
      { duration: 5000 }
    );
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
    void handleShareInvoice(tx, 'whatsapp');
  };

  const handleEmailShare = (tx: PanelTransaction) => {
    void handleShareInvoice(tx, 'email');
  };

  const handleShareInvoice = async (
    tx: any,
    platform: 'whatsapp' | 'wechat' | 'viber' | 'email' | 'download'
  ) => {
    // Generate multilingual summary text and copy to clipboard immediately
    const invoiceNum = tx.code || (typeof tx.id === 'string' ? tx.id.slice(-6) : 'INV');
    const clientName = tx.client || tx.supplier || (receiptShareLang === 'ku' ? 'کڕیاری بەڕێز' : receiptShareLang === 'ar' ? 'العميل الكريم' : 'Valued Client');
    const txCur = tx.currency || tx.invoiceCurrency || 'USD';
    const netVal = Number(tx.totalAfterDiscount ?? tx.totalInvoiceAmount ?? tx.sellingAmount ?? 0);
    const paidVal = Number(tx.amountPaidNow ?? tx.amountPaidToSupplier ?? 0);
    const debtVal = Number(tx.combinedTotalDebt ?? tx.supplierDebtRemaining ?? tx.amountOwed ?? Math.max(0, netVal - paidVal));
    const netAmount = formatMoney(netVal, txCur);
    const paidAmount = formatMoney(paidVal, txCur);
    const debtAmount = formatMoney(debtVal, txCur);
    const isFullyPaid = debtVal <= 0;

    let summaryText = '';
    if (receiptShareLang === 'ku') {
      const paymentDetails = isFullyPaid
        ? `دۆخی پارەدان: بەتەواوی دراوە (هیچ قەرزێک نەماوە)`
        : `بڕی دراو: ${paidAmount}\nقەرزی ماوە: ${debtAmount}`;
      summaryText = `پسوولەی فەرمی #${invoiceNum}\nبەڕێز: ${clientName}\nکۆی گشتی پسوولە: ${netAmount}\n${paymentDetails}\nکۆمپانیای شاسوار ئەحمەد شاسوار`;
    } else if (receiptShareLang === 'ar') {
      const paymentDetails = isFullyPaid
        ? `حالة الدفع: مدفوع بالكامل (لا يوجد رصيد متبقي)`
        : `المبلغ المدفوع: ${paidAmount}\nالرصيد المتبقي المستحق: ${debtAmount}`;
      summaryText = `فاتورة رسمية #${invoiceNum}\nالعميل / المورد: ${clientName}\nالإجمالي الصافي: ${netAmount}\n${paymentDetails}\nشركة شاسوار أحمد شاسوار`;
    } else {
      const paymentDetails = isFullyPaid
        ? `Payment Status: Fully Paid (0.00 Remaining Balance)`
        : `Amount Paid: ${paidAmount}\nRemaining Balance Due: ${debtAmount}`;
      summaryText = `Official Invoice #${invoiceNum}\nClient: ${clientName}\nNet Total: ${netAmount}\n${paymentDetails}\nIssued by Shaswar Ahmad Shaswar Co. (Bako's Master System ERP)`;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(summaryText).catch(() => {});
    }

    const msg = encodeURIComponent(summaryText);

    const cacheKey = tx?.id || tx?.code || 'draft-tx';

    // 1. Open App / Copy Text
    const txRawPhone = tx?.clientPhone || (tx as any)?.supplierContact || '';
    const storedCode = tx?.phoneCountryCode
      || COUNTRY_CODE_OPTIONS.find((c) => txRawPhone.startsWith(c.value))?.value
      || ((editingTxId === tx?.id || !tx?.id) ? phoneCountryCode : undefined);

    let digits = txRawPhone.replace(/\D/g, '');
    let fullPhone = '';

    if (txRawPhone.startsWith('+')) {
      fullPhone = digits;
    } else if (storedCode) {
      const codeDigits = storedCode.replace(/\D/g, '');
      if (digits.startsWith('0')) digits = digits.substring(1);
      if (digits.startsWith(codeDigits)) {
        fullPhone = digits;
      } else {
        fullPhone = `${codeDigits}${digits}`;
      }
    } else {
      if (digits.startsWith('0')) digits = digits.substring(1);
      const codeDigits = phoneCountryCode.replace(/\D/g, '');
      if (digits.startsWith('86') || digits.startsWith('964')) {
        fullPhone = digits;
      } else {
        fullPhone = `${codeDigits}${digits}`;
      }
    }

    const isTxChina = (storedCode === '+86')
      || digits.startsWith('86')
      || digits.startsWith('086')
      || txRawPhone.startsWith('+86')
      || (!tx?.id && phoneCountryCode === '+86');
    const isChina = platform === 'wechat' || (platform === 'whatsapp' && isTxChina);

    if (platform === 'wechat' || (platform === 'whatsapp' && isChina)) {
      window.open('weixin://', '_blank');
      toast.success(isKu ? 'دەق کۆپی کرا بۆ WeChat!' : 'Summary copied for WeChat!');
    } else if (platform === 'whatsapp') {
      const waUrl = fullPhone ? `https://wa.me/${fullPhone}?text=${msg}` : `https://api.whatsapp.com/send?text=${msg}`;
      window.open(waUrl, '_blank');
      toast.success(isKu ? 'دەق کۆپی کرا و وەتسئەپ کرایەوە!' : 'Text copied & WhatsApp opened!');
    } else if (platform === 'viber') {
      if (fullPhone) {
        window.location.href = `viber://chat?number=${fullPhone}&draft=${msg}`;
      } else {
        window.location.href = `viber://forward?text=${msg}`;
      }
      toast.success(isKu ? 'دەق کۆپی کرا و ڤایبەر کرایەوە!' : 'Text copied & Viber opened!');
    } else if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(`Invoice #${invoiceNum}`)}&body=${msg}`, '_blank');
    }

    const attachments =
      tx.images?.map((img: any) => ({
        name: 'attachment',
        data: typeof img === 'string' ? img : img.data,
        type: typeof img === 'string' && img.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      })) || [];

    // 2. Cache & Generate PDF
    let pdfBase64 = '';
    let pdfFileName = '';
    if (pdfCache.current[cacheKey]) {
      pdfBase64 = pdfCache.current[cacheKey].base64;
      pdfFileName = pdfCache.current[cacheKey].fileName;
    } else {
      const toastId = toast.loading(isKu ? 'ئامادەکردنی فایلی PDF...' : 'Generating PDF...');
      try {
        const brandLogoBase64 = cachedLogoRef.current || '';
        const res = await generateMasterPDF(tx, attachments, brandLogoBase64);
        if (res.success && res.base64) {
          pdfBase64 = res.base64;
          pdfFileName = res.fileName || `Invoice-${invoiceNum}.pdf`;
          pdfCache.current[cacheKey] = { base64: pdfBase64, fileName: pdfFileName, downloaded: false };
          toast.dismiss(toastId);
        }
      } catch (err) {
        toast.dismiss(toastId);
        return;
      }
    }

    // 3. Trigger Download if not already downloaded for this invoice
    if (platform === 'download' || !pdfCache.current[cacheKey]?.downloaded) {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);

      if (pdfCache.current[cacheKey]) {
        pdfCache.current[cacheKey].downloaded = true;
      }
      if (platform === 'download') toast.success(isKu ? 'فایلی PDF داگیرا!' : 'PDF Downloaded!');
    }
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

  const warehouseOps = useWarehouseOps();

  // Dynamically extract unique sellers and payment methods
  const availableSellers = useMemo(() => {
    const set = new Set<string>(savedSellers);
    transactions.forEach((tx) => {
      if (tx.seller && tx.seller.trim()) set.add(tx.seller.trim());
    });
    warehouseOps.activeShipments.forEach((s) => {
      if (s.supplier && s.supplier.trim()) set.add(s.supplier.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [savedSellers, transactions, warehouseOps.activeShipments]);

  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>(savedPaymentTypes);
    BILINGUAL_PAYMENT_PILLS.forEach((p) => set.add(p.value));
    transactions.forEach((tx) => {
      if (tx.paymentType && tx.paymentType.trim()) set.add(tx.paymentType.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [savedPaymentTypes, transactions]);

  useEffect(() => {
    void pullFromServer();
    void warehouseOps.syncFromServer?.();

    // Dynamically set the browser tab title and app logo (favicon)
    document.title = "Bako's Master System ERP";
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    // High-end dynamic SVG favicon matching Bako Master System Chess Knight brandmark
    link.href = '/icon.svg';
  }, []);

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

  const filteredShipments = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const searchLower = salesSearch.trim().toLowerCase();

    const filtered = warehouseOps.activeShipments.filter((s) => {
      if (s.isDeleted === 1) return false;

      const matchedTx = transactions.find(
        (t) => t.id === s.id || (t.code && s.batchCode && t.code.toLowerCase() === s.batchCode.toLowerCase())
      );

      const isReceivableRecord =
        matchedTx?.isReceivable !== undefined
          ? matchedTx.isReceivable
          : matchedTx
          ? matchedTx.paymentType !== 'Supplier Bill' && matchedTx.sellingType !== 'Supplier Purchase'
          : (s.batchCode || '').toUpperCase().startsWith('INV');

      // 0. AR / AP Filter (Customer Sales vs Supplier Bills)
      if (historyTypeFilter === 'AR' && !isReceivableRecord) return false;
      if (historyTypeFilter === 'AP' && isReceivableRecord) return false;

      // 1. Search across code, customer/supplier name, notes, phone, and supplier references
      if (searchLower) {
        const codeStr = `${s.batchCode || ''} ${s.id || ''} ${matchedTx?.code || ''}`.toLowerCase();
        const clientStr = `${s.supplier || ''} ${s.supplierName || ''} ${matchedTx?.client || ''}`.toLowerCase();
        const notesStr = `${s.notes || ''} ${matchedTx?.notes || ''}`.toLowerCase();
        const refStr = `${s.originCountry || ''} ${matchedTx?.legacyInvoiceRef || ''} ${matchedTx?.fundermaxBatchRef || ''}`.toLowerCase();
        const phoneStr = `${s.supplierContact || ''} ${matchedTx?.clientPhone || ''}`.toLowerCase();
        const itemsStr = (s.items || []).map((it) => it.description || '').join(' ').toLowerCase();
        const matchedSearch =
          codeStr.includes(searchLower) ||
          clientStr.includes(searchLower) ||
          notesStr.includes(searchLower) ||
          refStr.includes(searchLower) ||
          phoneStr.includes(searchLower) ||
          itemsStr.includes(searchLower);
        if (!matchedSearch) return false;
      }

      // 2. Status Filter
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt =
        s.supplierDebtRemaining !== undefined
          ? Number(s.supplierDebtRemaining)
          : Math.max(0, invoiced - paid);
      const status: 'completed' | 'partial' | 'debt' =
        debt <= 0 ? 'completed' : paid > 0 ? 'partial' : 'debt';
      if (salesStatusFilter !== 'all' && status !== salesStatusFilter) {
        return false;
      }

      // 3. Seller Filter
      if (salesSellerFilter !== 'all') {
        const sellerVal = matchedTx?.seller || s.supplier || '';
        if (sellerVal !== salesSellerFilter && s.supplier !== salesSellerFilter) {
          return false;
        }
      }

      // 4. Payment Method Filter
      if (salesPaymentMethodFilter !== 'all') {
        const pmVal = matchedTx?.paymentType || matchedTx?.bank || 'Supplier Bill';
        if (pmVal !== salesPaymentMethodFilter) {
          return false;
        }
      }

      // 5. Timeframe Filter
      const activeTimeFilter = salesTimeframeFilter !== 'all' ? salesTimeframeFilter : ledgerTimeFilter;
      if (activeTimeFilter !== 'all') {
        const rawDate = s.createdAt || s.arrivalDate || '';
        const txTime = rawDate ? new Date(rawDate).getTime() : NaN;
        if (isNaN(txTime) || txTime <= 0) return false;
        const diff = now - txTime;

        if (activeTimeFilter === '1day' && diff > oneDay) return false;
        if (activeTimeFilter === '1week' && diff > 7 * oneDay) return false;
        if (activeTimeFilter === '1month' && diff > 30 * oneDay) return false;
        if (activeTimeFilter === '3months' && diff > 90 * oneDay) return false;
        if (activeTimeFilter === '6months' && diff > 180 * oneDay) return false;
        if (activeTimeFilter === '1year' && diff > 365 * oneDay) return false;
        if (activeTimeFilter === '3years' && diff > 3 * 365 * oneDay) return false;
        if (activeTimeFilter === '5years' && diff > 5 * 365 * oneDay) return false;

        // Legacy compatibility
        const txDateStr = rawDate.split('T')[0];
        const todayStr = new Date(now).toISOString().split('T')[0];
        const yesterdayStr = new Date(now - oneDay).toISOString().split('T')[0];
        if (activeTimeFilter === 'today' && txDateStr !== todayStr && diff > oneDay) return false;
        if (activeTimeFilter === 'yesterday' && txDateStr !== yesterdayStr) return false;
        if (activeTimeFilter === 'week' && diff > 7 * oneDay) return false;
        if (activeTimeFilter === 'month' && diff > 30 * oneDay) return false;
        if (activeTimeFilter === 'year' && diff > 365 * oneDay) return false;
      }

      return true;
    });

    // 6. Sort Filter
    return [...filtered].sort((a, b) => {
      const aInvoiced = Number(a.totalInvoiceAmount) || 0;
      const bInvoiced = Number(b.totalInvoiceAmount) || 0;
      const aPaid = Number(a.amountPaidToSupplier) || 0;
      const bPaid = Number(b.amountPaidToSupplier) || 0;
      const aDebt = a.supplierDebtRemaining !== undefined ? Number(a.supplierDebtRemaining) : Math.max(0, aInvoiced - aPaid);
      const bDebt = b.supplierDebtRemaining !== undefined ? Number(b.supplierDebtRemaining) : Math.max(0, bInvoiced - bPaid);
      const aTime = new Date(a.createdAt || a.arrivalDate || 0).getTime() || 0;
      const bTime = new Date(b.createdAt || b.arrivalDate || 0).getTime() || 0;

      if (salesSortBy === 'oldest') return aTime - bTime;
      if (salesSortBy === 'highestTotal') return bInvoiced - aInvoiced;
      if (salesSortBy === 'highestDebt') return bDebt - aDebt;
      return bTime - aTime;
    });
  }, [
    warehouseOps.activeShipments,
    transactions,
    salesSearch,
    salesStatusFilter,
    salesSellerFilter,
    salesPaymentMethodFilter,
    salesTimeframeFilter,
    ledgerTimeFilter,
    salesSortBy,
    historyTypeFilter,
  ]);

  // Derived filtered arrays respecting independent AP & AR time filters
  const filteredSupplierShipments = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return warehouseOps.activeShipments.filter((s) => {
      if (s.isDeleted === 1) return false;
      if (apTimeFilter === 'all') return true;
      const rawDate = s.createdAt || s.arrivalDate || '';
      const txTime = rawDate ? new Date(rawDate).getTime() : NaN;
      if (isNaN(txTime) || txTime <= 0) return false;
      const diff = now - txTime;
      if (apTimeFilter === '1day' && diff > oneDay) return false;
      if (apTimeFilter === '1week' && diff > 7 * oneDay) return false;
      if (apTimeFilter === '1month' && diff > 30 * oneDay) return false;
      if (apTimeFilter === '3months' && diff > 90 * oneDay) return false;
      if (apTimeFilter === '6months' && diff > 180 * oneDay) return false;
      if (apTimeFilter === '1year' && diff > 365 * oneDay) return false;
      return true;
    });
  }, [warehouseOps.activeShipments, apTimeFilter]);

  const totalSupplierInvoiced = useMemo(() => {
    return filteredSupplierShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      if (invoiced <= 0) return acc;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      return acc + convertCurrency(invoiced, curr as CurrencyCode, posDraft.activeCurrency);
    }, 0);
  }, [filteredSupplierShipments, convertCurrency, posDraft.activeCurrency]);

  const totalSupplierPaid = useMemo(() => {
    return filteredSupplierShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const paid = Number(s.amountPaidToSupplier) || 0;
      if (paid <= 0) return acc;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      return acc + convertCurrency(paid, curr as CurrencyCode, posDraft.activeCurrency);
    }, 0);
  }, [filteredSupplierShipments, convertCurrency, posDraft.activeCurrency]);

  const fundermaxSupplierDebt = useMemo(() => {
    return filteredSupplierShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const isFmax = !s.supplier || s.supplier.toLowerCase().includes('fundermax');
      if (!isFmax) return acc;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      if (debt <= 0) return acc;
      const curr = s.invoiceCurrency || 'EUR';
      return acc + convertCurrency(debt, curr as CurrencyCode, posDraft.activeCurrency);
    }, 0);
  }, [filteredSupplierShipments, convertCurrency, posDraft.activeCurrency]);

  const totalSupplierDebt = useMemo(() => {
    return filteredSupplierShipments.reduce((acc, s) => {
      if (s.isDeleted === 1) return acc;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      if (debt <= 0) return acc;
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
      return acc + convertCurrency(debt, curr as CurrencyCode, posDraft.activeCurrency);
    }, 0);
  }, [filteredSupplierShipments, convertCurrency, posDraft.activeCurrency]);

  // Derived arrays for AR (Customer Sales) vs AP (Supplier Payables)
  const activeCustomerSales = useMemo(() => {
    return transactions.filter(tx => tx.isDeleted !== 1 && tx.isReceivable === true);
  }, [transactions]);

  const filteredCustomerSales = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return activeCustomerSales.filter((tx) => {
      if (arTimeFilter === 'all') return true;
      const rawDate = tx.timestamp || tx.lastUpdated || '';
      const txTime = rawDate ? new Date(rawDate).getTime() : NaN;
      if (isNaN(txTime) || txTime <= 0) return false;
      const diff = now - txTime;
      if (arTimeFilter === '1day' && diff > oneDay) return false;
      if (arTimeFilter === '1week' && diff > 7 * oneDay) return false;
      if (arTimeFilter === '1month' && diff > 30 * oneDay) return false;
      if (arTimeFilter === '3months' && diff > 90 * oneDay) return false;
      if (arTimeFilter === '6months' && diff > 180 * oneDay) return false;
      if (arTimeFilter === '1year' && diff > 365 * oneDay) return false;
      return true;
    });
  }, [activeCustomerSales, arTimeFilter]);

  // KPI Calculations for Accounts Receivable (Customer Debt)
  const totalCustomerInvoiced = useMemo(() => {
    return filteredCustomerSales.reduce((acc, tx) => {
      return acc + convertCurrency(tx.sellingAmount || 0, tx.currency || 'USD', posDraft.activeCurrency);
    }, 0);
  }, [filteredCustomerSales, convertCurrency, posDraft.activeCurrency]);

  const totalCustomerPaid = useMemo(() => {
    return filteredCustomerSales.reduce((acc, tx) => {
      return acc + convertCurrency(tx.amountPaidNow || 0, tx.currency || 'USD', posDraft.activeCurrency);
    }, 0);
  }, [filteredCustomerSales, convertCurrency, posDraft.activeCurrency]);

  const totalCustomerDebt = useMemo(() => {
    return filteredCustomerSales.reduce((acc, tx) => {
      const debt = tx.combinedTotalDebt || tx.amountOwed || 0;
      return acc + convertCurrency(debt, tx.currency || 'USD', posDraft.activeCurrency);
    }, 0);
  }, [filteredCustomerSales, convertCurrency, posDraft.activeCurrency]);

  // Executive Analytics aggregated datasets
  const analyticsData = useMemo(() => {
    const dateMap = new Map<string, { date: string; revenue: number; payables: number; rawTime: number }>();

    transactions.forEach((tx) => {
      if (tx.isDeleted === 1 || !tx.isReceivable) return;
      const rawDate = tx.timestamp || tx.lastUpdated || '';
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = rawDate.split('T')[0];
      const rev = convertCurrency(tx.sellingAmount || 0, tx.currency || 'USD', posDraft.activeCurrency);
      const curr = dateMap.get(key) || { date: key, revenue: 0, payables: 0, rawTime: d.getTime() };
      curr.revenue += rev;
      dateMap.set(key, curr);
    });

    warehouseOps.activeShipments.forEach((s) => {
      if (s.isDeleted === 1) return;
      const rawDate = s.createdAt || s.arrivalDate || '';
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = rawDate.split('T')[0];
      const inv = Number(s.totalInvoiceAmount) || 0;
      const currCode = (s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD')) as CurrencyCode;
      const pay = convertCurrency(inv, currCode, posDraft.activeCurrency);
      const curr = dateMap.get(key) || { date: key, revenue: 0, payables: 0, rawTime: d.getTime() };
      curr.payables += pay;
      dateMap.set(key, curr);
    });

    const revenueVsPayables = Array.from(dateMap.values())
      .sort((a, b) => a.rawTime - b.rawTime)
      .slice(-14)
      .map((item) => ({
        date: item.date.slice(5),
        revenue: Math.round(item.revenue),
        payables: Math.round(item.payables),
      }));

    const totalPaidCombined = totalCustomerPaid + totalSupplierPaid;
    const totalUnpaidCombined = totalCustomerDebt + totalSupplierDebt;
    const debtDistribution = [
      { name: isKu ? 'دراو' : 'Paid', value: Math.round(totalPaidCombined) },
      { name: isKu ? 'قەرزی ماوە' : 'Unpaid (Debt)', value: Math.round(totalUnpaidCombined) },
    ].filter((item) => item.value > 0);

    const customerMap = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.isDeleted === 1 || !tx.isReceivable) return;
      const name = (tx.client || 'Unknown Customer').trim();
      const val = convertCurrency(tx.sellingAmount || 0, tx.currency || 'USD', posDraft.activeCurrency);
      customerMap.set(name, (customerMap.get(name) || 0) + val);
    });
    const topCustomers = Array.from(customerMap.entries())
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const supplierMap = new Map<string, number>();
    warehouseOps.activeShipments.forEach((s) => {
      if (s.isDeleted === 1) return;
      const name = (s.supplier || s.supplierName || 'FunderMax GmbH').trim();
      const inv = Number(s.totalInvoiceAmount) || 0;
      const currCode = (s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD')) as CurrencyCode;
      const val = convertCurrency(inv, currCode, posDraft.activeCurrency);
      supplierMap.set(name, (supplierMap.get(name) || 0) + val);
    });
    const topSuppliers = Array.from(supplierMap.entries())
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      revenueVsPayables,
      debtDistribution,
      topCustomers,
      topSuppliers,
    };
  }, [
    transactions,
    warehouseOps.activeShipments,
    totalCustomerPaid,
    totalSupplierPaid,
    totalCustomerDebt,
    totalSupplierDebt,
    convertCurrency,
    posDraft.activeCurrency,
    isKu,
  ]);

  const supplierInvoicesWithDebtCount = useMemo(() => {
    return filteredShipments.filter((s) => {
      if (s.isDeleted === 1) return false;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      return debt > 0;
    }).length;
  }, [filteredShipments]);

  const filteredTotalDebt = totalSupplierDebt;
  const filteredTotalRevenue = totalSupplierInvoiced;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in duration-200">
      <Toaster position="bottom-right" />
      {/* SECTION HEADER & CURRENCY TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isKu ? 'دەفتەری بازرگانی: کڕیاران و دابینکەران' : 'Trade Ledger: Clients & Suppliers'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKu
              ? 'بەڕێوەبردنی یەکگرتووی مامەڵەی بازرگانی، قەرزی کڕیاران و قەرزی دابینکەران (FunderMax)'
              : 'Unified B2B Trade Ledger for client receivables, sales invoicing, and supplier payables'}
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

          {/* Executive Analytics Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsExecutiveAnalyticsOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title={isKu ? 'شیکاری بەڕێوەبردن' : 'Executive Analytics'}
          >
            <BarChart3 className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">{isKu ? 'شیکاری بەڕێوەبردن' : 'Executive Analytics'}</span>
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

      {/* THE "GOD VIEW" EXECUTIVE DASHBOARD (Split AR vs AP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ACCOUNTS RECEIVABLE (MONEY OWED TO US) */}
        <div className="p-5 sm:p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -me-10 -mt-10 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-400">
                  Accounts Receivable
                </h2>
                <p className="text-[11px] text-emerald-700/70 dark:text-emerald-500/70 font-bold mt-0.5">
                  Customer Debt (Owed to Us)
                </p>
              </div>
            </div>
            <select
              value={arTimeFilter}
              onChange={(e) => setArTimeFilter(e.target.value)}
              className="h-8 px-2 text-[11px] font-bold rounded-xl bg-white/90 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-750 text-emerald-800 dark:text-emerald-300 cursor-pointer shadow-xs focus:outline-none"
              title="Filter Accounts Receivable"
            >
              <option value="all">All Time</option>
              <option value="1day">1 Day</option>
              <option value="1week">1 Week</option>
              <option value="1month">1 Month</option>
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Sales</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(totalCustomerInvoiced, posDraft.activeCurrency)}
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-emerald-600 dark:bg-emerald-900/80 border border-emerald-500 dark:border-emerald-700 text-white shadow-md shadow-emerald-600/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block mb-1">Unpaid Receivables</span>
              <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {formatMoney(totalCustomerDebt, posDraft.activeCurrency)}
              </div>
            </div>
          </div>
        </div>

        {/* ACCOUNTS PAYABLE (MONEY WE OWE) */}
        <div className="p-5 sm:p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-3xl -me-10 -mt-10 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-rose-900 dark:text-rose-400">
                  Accounts Payable
                </h2>
                <p className="text-[11px] text-rose-700/70 dark:text-rose-500/70 font-bold mt-0.5">
                  Supplier Debt (We Owe)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={apTimeFilter}
                onChange={(e) => setApTimeFilter(e.target.value)}
                className="h-8 px-2 text-[11px] font-bold rounded-xl bg-white/90 dark:bg-slate-900/90 border border-rose-300 dark:border-rose-750 text-rose-800 dark:text-rose-300 cursor-pointer shadow-xs focus:outline-none"
                title="Filter Accounts Payable"
              >
                <option value="all">All Time</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="1month">1 Month</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
              </select>
              <button
                type="button"
                onClick={() => setIsSupplierPayablesOpen(true)}
                className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 underline underline-offset-4 cursor-pointer"
              >
                Ledger →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Sourced</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatMoney(totalSupplierInvoiced, posDraft.activeCurrency)}
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-rose-600 dark:bg-rose-900/80 border border-rose-500 dark:border-rose-700 text-white shadow-md shadow-rose-600/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 block mb-1">Unpaid Payables</span>
              <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {formatMoney(totalSupplierDebt, posDraft.activeCurrency)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUPPLIER BILL INTAKE FORM */}
      {(userPermissions?.canCreateSales || (editingTxId && userPermissions?.canEditSales)) ? (
      <div id="sales-draft-form" className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-8 relative transition-colors duration-300 ${txFormMode === 'AR' ? 'border-sky-500/50 dark:border-sky-500/30' : 'border-rose-500/50 dark:border-rose-500/30'}`}>
        <div className={`absolute top-0 start-0 end-0 h-2 rounded-t-3xl bg-gradient-to-r ${txFormMode === 'AR' ? 'from-sky-500 to-emerald-500' : 'from-rose-500 to-amber-500'}`} />
        {/* Prominent Edit Mode Warning Banner */}
        {editingTxId && (
          <div className="w-full bg-amber-500/15 border-2 border-amber-500 text-amber-900 dark:text-amber-200 p-4 rounded-xl flex items-center gap-3 mb-4 animate-in fade-in duration-200">
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
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${editingTxId ? 'bg-amber-500 animate-pulse' : 'bg-sky-500'}`} />
              {editingTxId
                ? `Edit Record #${editingInvoiceCode}`
                : (txFormMode === 'AR' ? 'Log Customer Sale (AR)' : 'Log Supplier Purchase (AP)')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!editingTxId ? (
              <>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 me-4">
                  <button type="button" onClick={() => setTxFormMode('AR')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${txFormMode === 'AR' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    Customer Sale
                  </button>
                  <button type="button" onClick={() => setTxFormMode('AP')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${txFormMode === 'AP' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    Supplier Bill
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDropdownManagerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Manage and clean all saved dropdown presets"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Manage Dropdowns</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                title="Cancel editing and start a new transaction"
              >
                <X className="w-4 h-4" />
                <span>{isKu ? 'هەڵوەشاندنەوە و وەسڵی نوێ' : 'Cancel & Start New'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Two-Column Workspace Layout (Left: 70%, Right: 30% Sticky) */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* LEFT / MAIN COLUMN (70% width): Business Inputs, Line Items & Notes */}
          <div className="w-full lg:w-[68%] xl:w-[70%] space-y-6">
            {/* Desktop Business Header Inputs: Code, Customer, Phone, Legacy Bridge, Attachment, Seller, Bank */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-750">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Invoice Code</label>
                <input tabIndex={1} type="text" value={posDraft.invoiceCode} onChange={(e) => setPosDraft((prev) => ({ ...prev, invoiceCode: e.target.value }))} placeholder="e.g. INV-101" className="w-full h-11 px-4 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-shadow" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {txFormMode === 'AR' ? 'Customer' : 'Supplier / Factory'}
                </label>
                <SearchableDropdown options={clientOptions} value={posDraft.client} onChange={handleCustomerSelect} onAddNew={(v) => addToDropdownPresets('savedClients', v)} onDeleteOption={(v) => removeFromDropdownPresets('savedClients', v)} placeholder="Select or type..." allowDelete={!isViewer} clearable={true} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex justify-between items-center">
                  <span>Phone Number</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <HelpCircle className="w-3 h-3" /> {phoneCountryCode === '+86' ? 'WeChat & Viber (Optional)' : 'WhatsApp & Viber (Optional)'}
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <SearchableDropdown
                      options={COUNTRY_CODE_OPTIONS}
                      value={phoneCountryCode}
                      onChange={(v) => setPhoneCountryCode(v || '+964')}
                      placeholder="Country..."
                      allowDelete={false}
                      clearable={false}
                    />
                  </div>
                  <div className="relative sm:col-span-7">
                    <Phone className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      tabIndex={2}
                      type="tel"
                      value={posDraft.clientPhone}
                      onChange={(e) => setPosDraft({ ...posDraft, clientPhone: e.target.value })}
                      placeholder="750 000 0000"
                      className="w-full h-11 ps-10 pe-4 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Drawer / Bank</label>
                <SearchableDropdown options={savedBanks} value={posDraft.bank} onChange={(v) => setPosDraft({ ...posDraft, bank: v })} onAddNew={(v) => addToDropdownPresets('savedBanks', v)} onDeleteOption={(v) => removeFromDropdownPresets('savedBanks', v)} placeholder="Select Drawer..." allowDelete={!isViewer} clearable={true} />
              </div>

              <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Attachment (Slip / Photo)</span>
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    <HelpCircle className="w-3 h-3" /> Optional
                  </span>
                </label>
                <div
                  className="flex items-center gap-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      void handleAttachmentFilesDrop(e.dataTransfer.files);
                    }
                  }}
                >
                  <label className="flex-1 h-12 px-4 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-sky-500 dark:hover:border-sky-400 text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{posDraft.images && posDraft.images.length > 0 ? 'Add Another Photo' : 'Upload File / Photo'}</span>
                    <input type="file" accept="image/*,application/pdf,.pdf" multiple onChange={handleAttachmentUpload} className="hidden" />
                  </label>
                  {posDraft.images && posDraft.images.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setZoomedImage({ url: posDraft.images[0], title: 'Attachment Slip' })} className="w-12 h-12 rounded-xl overflow-hidden border-2 border-sky-400 relative group cursor-pointer shrink-0">
                        <img src={posDraft.images[0]} alt="Attachment preview" className="w-full h-full object-cover" />
                      </button>
                      <button type="button" onClick={() => setPosDraft((prev) => ({ ...prev, images: [] }))} className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl cursor-pointer transition">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
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
                        className={`h-12 px-5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${isSelected ? 'bg-sky-600 border-sky-700 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
          {/* 1. Supplier / Factory */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isKu ? 'دابینکەر / کارگە' : 'Supplier / Factory'}
            </label>
            <SearchableDropdown
              options={clientOptions}
              value={posDraft.client}
              onChange={handleCustomerSelect}
              onAddNew={(v) => addToDropdownPresets('savedClients', v)}
              onDeleteOption={(v) => removeFromDropdownPresets('savedClients', v)}
              placeholder={isKu ? 'ناوی دابینکەر یان کارگە هەڵبژێرە...' : 'Select or type supplier / factory...'}
              allowDelete={!isViewer}
              clearable={true}
            />
          </div>

          {/* 2. Supplier Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>
                {isKu ? 'ژمارەی مۆبایلی دابینکەر' : 'Supplier Phone'}
              </span>
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
                        accept="image/*,.pdf,application/pdf"
                        multiple
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
                    onChange={(e) => setPosDraft((prev) => ({ ...prev, invoiceCode: e.target.value }))}
                    placeholder="e.g. INV-101"
                    className="w-full h-11 px-3.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Reference / PO # (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{isKu ? 'ژمارەی ئاماژە / داواکاری (دڵخواز)' : 'Reference / PO # (Optional)'}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"><HelpCircle className="w-3 h-3" /> Optional</span>
                  </label>
                  <input
                    type="text"
                    value={posDraft.legacyInvoiceRef}
                    onChange={(e) => setPosDraft({ ...posDraft, legacyInvoiceRef: e.target.value })}
                    placeholder="e.g. PO-842, Project Villa..."
                    className="w-full h-11 px-3.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
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

        {/* DESKTOP ACTIVE LINE ITEM INPUT ROW (Clean Command Console) */}
        <div className="hidden md:block p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-750 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              {isKu ? 'تۆمارکردنی کاڵا / دەرگا / پانێڵ' : 'Active Line Item Console'}
            </span>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {isKu ? 'Enter: خێرا تۆمارکردن' : 'Tab/Enter to calculate & add'}
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{isKu ? 'جۆر' : 'Type'}</label>
              <SearchableDropdown options={savedTypes} value={posDraft.rowType} onChange={(v) => setPosDraft({ ...posDraft, rowType: v })} onAddNew={(v) => addToDropdownPresets('savedTypes', v)} onDeleteOption={(v) => removeFromDropdownPresets('savedTypes', v)} placeholder="Type..." allowDelete={!isViewer} compact={true} clearable={true} />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{isKu ? 'کاڵا' : 'Product'}</label>
              <SearchableDropdown options={savedProducts} value={posDraft.rowProduct} onChange={(v) => setPosDraft({ ...posDraft, rowProduct: v })} onAddNew={(v) => addToDropdownPresets('savedProducts', v)} onDeleteOption={(v) => removeFromDropdownPresets('savedProducts', v)} placeholder="Product..." allowDelete={!isViewer} compact={true} clearable={true} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{isKu ? 'فرۆشتن' : 'Method'}</label>
              <SearchableDropdown options={sellingTypeOptions} value={posDraft.rowSellingType} onChange={(v) => setPosDraft({ ...posDraft, rowSellingType: v })} onAddNew={(v) => addToDropdownPresets('savedSellingTypes', v)} onDeleteOption={(v) => removeFromDropdownPresets('savedSellingTypes', v)} placeholder="Wholesale..." allowDelete={!isViewer} compact={true} clearable={true} />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{isKu ? 'بڕ' : 'Qty'}</label>
              <input tabIndex={3} ref={quantityInputRef} type="number" min="1" step="any" value={posDraft.rowQuantity} onChange={(e) => setPosDraft({ ...posDraft, rowQuantity: e.target.value === '' ? '' : parseFloat(e.target.value) })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); priceInputRef.current?.focus(); } }} className="w-full h-[38px] px-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-center focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{isKu ? 'نرخ' : 'Price ($)'}</label>
              <input tabIndex={4} ref={priceInputRef} type="text" inputMode="decimal" value={rowPriceStr} onChange={(e) => setRowPriceStr(e.target.value)} onBlur={() => { const resolved = evaluateMath(rowPriceStr); setRowPriceStr(resolved === '' ? '' : String(resolved)); setPosDraft({ ...posDraft, rowPrice: resolved }); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') { const resolved = evaluateMath(rowPriceStr); setRowPriceStr(resolved === '' ? '' : String(resolved)); setPosDraft({ ...posDraft, rowPrice: resolved }); if (e.key === 'Enter') { e.preventDefault(); if (costInputRef.current) costInputRef.current.focus(); else handleAddLineItem(); } } }} placeholder="150+45" className="w-full h-[38px] ps-2 pe-6 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-sky-500" />
              <Calculator className="w-3 h-3 absolute end-2.5 top-[29px] text-slate-400 pointer-events-none opacity-60" />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider truncate" title="Internal Cost">{isKu ? 'تێچوو' : 'Cost ($)'}</label>
              <input tabIndex={5} ref={costInputRef} type="text" inputMode="decimal" value={costPriceStr} onChange={(e) => setCostPriceStr(e.target.value)} onBlur={() => { const resolved = evaluateMath(costPriceStr); setCostPriceStr(resolved === '' ? '' : String(resolved)); setPosDraft({ ...posDraft, estimatedCost: resolved }); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') { const resolved = evaluateMath(costPriceStr); setCostPriceStr(resolved === '' ? '' : String(resolved)); setPosDraft({ ...posDraft, estimatedCost: resolved }); if (e.key === 'Enter') { e.preventDefault(); setTimeout(() => handleAddLineItem(), 50); } } }} placeholder="120" className="w-full h-[38px] ps-2 pe-6 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-sky-500" />
              <Calculator className="w-3 h-3 absolute end-2.5 top-[29px] text-slate-400 pointer-events-none opacity-60" />
            </div>
            <div className="col-span-12 mt-1">
              <button tabIndex={6} ref={addRowBtnRef} type="button" onClick={handleAddLineItem} disabled={!posDraft.rowProduct || currentRowPrice === 0} className="w-full h-11 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/40 text-white disabled:text-white/70 font-black tracking-widest text-sm shadow-md disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Plus className="w-5 h-5" />
                {isKu ? 'زیادکردن بۆ وەسڵ' : 'ADD TO INVOICE'}
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
                type="text"
                inputMode="decimal"
                value={rowPriceStr}
                onChange={(e) => setRowPriceStr(e.target.value)}
                onBlur={() => {
                  const resolved = evaluateMath(rowPriceStr);
                  setRowPriceStr(resolved === '' ? '' : String(resolved));
                  setPosDraft({ ...posDraft, rowPrice: resolved });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const resolved = evaluateMath(rowPriceStr);
                    setRowPriceStr(resolved === '' ? '' : String(resolved));
                    setPosDraft({ ...posDraft, rowPrice: resolved });
                  }
                }}
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
              className="h-12 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/40 text-white disabled:text-white/70 font-bold text-sm shadow-sm disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
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
              <table className="w-full text-start text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">{isKu ? 'کاڵا' : 'Item'}</th>
                    <th className="px-4 py-2.5">{isKu ? 'جۆر' : 'Type'}</th>
                    <th className="px-4 py-2.5 text-center">{isKu ? 'بڕ' : 'Qty'}</th>
                    <th className="px-4 py-2.5 text-end">{isKu ? 'نرخ' : 'Price'}</th>
                    <th className="px-4 py-2.5 text-end">{isKu ? 'کۆی کاڵا' : 'Line Total'}</th>
                    <th className="px-4 py-2.5 text-center">{isKu ? 'کردار' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {posDraft.items.map((item) => (
                    <tr key={item.id} className="even:bg-slate-50/70 dark:even:bg-slate-900/20 hover:bg-slate-100/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-900 dark:text-white font-semibold">
                        {item.product}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                        {item.type}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-end font-mono">
                        {formatMoney(item.price, posDraft.activeCurrency)}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono font-bold text-slate-900 dark:text-white">
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

                    <div className="text-end">
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
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{isKu ? 'تێبینییەکانی پسوولە (Notes)' : 'Transaction Notes'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">{isKu ? 'ئارەزوومەندانە' : 'Optional'}</span>
          </label>
          <textarea
            tabIndex={7}
            rows={4}
            value={posDraft.notes || ''}
            onChange={(e) => setPosDraft({ ...posDraft, notes: e.target.value })}
            placeholder={isKu ? 'تێبینی بنووسە دەربارەی ئەم پسوولەیە (کڕیار، گەیاندن، ڕێککەوتن)...' : 'Add invoice notes (delivery terms, customer instructions, agreements)...'}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all font-sans"
          />
        </div>
      </div>
      {/* END LEFT COLUMN */}

      {/* RIGHT COLUMN (30% width / Sticky Card): Order Financial Summary & Actions */}
      <div className="w-full lg:w-[32%] xl:w-[30%] lg:sticky lg:top-20 space-y-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKu ? 'پوختەی دارایی و حیساب' : 'Order Financial Summary'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = posDraft.activeCurrency === 'USD' ? 'EUR' : posDraft.activeCurrency === 'EUR' ? 'IQD' : 'USD';
                handleCurrencyChange(next);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-black font-mono shadow-sm tracking-widest cursor-pointer transition active:scale-95"
              title="Click to cycle currency (USD → EUR → IQD)"
            >
              {posDraft.activeCurrency} ↻
            </button>
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
                tabIndex={8}
                type="text"
                inputMode="decimal"
                value={discountDollarsStr}
                onChange={(e) => setDiscountDollarsStr(e.target.value)}
                onBlur={() => {
                  const resolved = evaluateMath(discountDollarsStr);
                  setDiscountDollarsStr(resolved === '' ? '' : String(resolved));
                  handleDiscountDollarsChange(resolved);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const resolved = evaluateMath(discountDollarsStr);
                    setDiscountDollarsStr(resolved === '' ? '' : String(resolved));
                    handleDiscountDollarsChange(resolved);
                  }
                }}
                placeholder="Amt"
                className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <input
                tabIndex={9}
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                step="any"
                value={posDraft.discountPercentage}
                onChange={(e) =>
                  handleDiscountPercentChange(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="%"
                className="w-full px-2.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
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

          {/* Amount Paid to Supplier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                {txFormMode === 'AR' ? 'Amount Received Now' : 'Amount Paid Now'}
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
              tabIndex={10}
              type="text"
              inputMode="decimal"
              value={amountPaidNowStr}
              onChange={(e) => setAmountPaidNowStr(e.target.value)}
              onBlur={() => {
                const resolved = evaluateMath(amountPaidNowStr);
                setAmountPaidNowStr(resolved === '' ? '' : String(resolved));
                setPosDraft({ ...posDraft, amountPaidNow: resolved });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const resolved = evaluateMath(amountPaidNowStr);
                  setAmountPaidNowStr(resolved === '' ? '' : String(resolved));
                  setPosDraft({ ...posDraft, amountPaidNow: resolved });
                }
              }}
              placeholder="0.00 (e.g. 150+50)"
              className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold"
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

          {/* Prior Supplier Debt */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
              {txFormMode === 'AR' ? 'Prior Customer Debt' : 'Prior Supplier Debt'}
            </label>
            <input
              tabIndex={11}
              type="text"
              inputMode="decimal"
              value={oldUnpaidDebtStr}
              onChange={(e) => setOldUnpaidDebtStr(e.target.value)}
              onBlur={() => {
                const resolved = evaluateMath(oldUnpaidDebtStr);
                setOldUnpaidDebtStr(resolved === '' ? '' : String(resolved));
                setPosDraft({ ...posDraft, oldUnpaidDebt: resolved });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const resolved = evaluateMath(oldUnpaidDebtStr);
                  setOldUnpaidDebtStr(resolved === '' ? '' : String(resolved));
                  setPosDraft({ ...posDraft, oldUnpaidDebt: resolved });
                }
              }}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
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
                    {txFormMode === 'AR' ? 'Customer Debt (Receivable):' : 'Supplier Debt (Payable):'}
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
                    tabIndex={12}
                    onClick={() => handleSaveInvoice(false)}
                    className={`w-full h-14 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                      txFormMode === 'AR'
                        ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                        : 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600/80 dark:hover:bg-rose-600 shadow-rose-500/20'
                    }`}
                  >
                    <ReceiptText className="w-5 h-5" />
                    {txFormMode === 'AR' ? 'Save Customer Sale' : 'Save Supplier Bill'}
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
              {`${filteredShipments.length} entries`}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
              {isKu ? 'کۆی پسوولەکان:' : 'Invoiced:'} {formatMoney(filteredTotalRevenue, posDraft.activeCurrency)}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
              {isKu ? 'کۆی قەرز:' : 'Debt:'} {formatMoney(filteredTotalDebt, posDraft.activeCurrency)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Customer Sales (AR) vs Supplier Bills (AP) Filter */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  historyTypeFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKu ? 'هەموو' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('AR')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  historyTypeFilter === 'AR'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKu ? 'فرۆشتن (AR)' : 'Customer Sales (AR)'}
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('AP')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  historyTypeFilter === 'AP'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isKu ? 'کڕین (AP)' : 'Supplier Bills (AP)'}
              </button>
            </div>

            {userPermissions?.canExport !== false && (
              <button
                type="button"
                onClick={() => exportTransactionsToCSV(transactions, language)}
                disabled={filteredShipments.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title={isKu ? 'هەناردەکردنی فایلی Excel / CSV بۆ ژمێریاری و وردبینی' : 'Export filtered sales to Excel / CSV for accountant audit'}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>{isKu ? 'هەناردەکردنی Excel / CSV' : 'Export Excel / CSV'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-750 flex flex-col sm:flex-row items-center justify-between gap-3 select-none text-xs">
          <div className="flex items-center gap-2 flex-1 flex-wrap w-full sm:w-auto">
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
            <select
              value={salesTimeframeFilter}
              onChange={(e) => setSalesTimeframeFilter(e.target.value)}
              className="h-11 px-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Filter by Time"
            >
              <option value="all">All Time</option>
              <option value="1day">1 Day</option>
              <option value="1week">1 Week</option>
              <option value="1month">1 Month</option>
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
              <option value="3years">3 Years</option>
              <option value="5years">5 Years</option>
            </select>

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

          {/* Compact Share Language Selector in Filter Bar */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 h-11 text-xs shrink-0 shadow-2xs self-end sm:self-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              {isKu ? 'زمان:' : 'Share:'}
            </span>
            <button
              type="button"
              onClick={() => setReceiptShareLang('ku')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                receiptShareLang === 'ku'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kurdish"
            >
              کوردی
            </button>
            <button
              type="button"
              onClick={() => setReceiptShareLang('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                receiptShareLang === 'en'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setReceiptShareLang('ar')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                receiptShareLang === 'ar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Arabic"
            >
              عربي
            </button>
          </div>
        </div>

        {/* Dual Adaptive Layout: Desktop Dense Table (W >= 1024px) */}
        <div className="hidden lg:block w-full max-w-full max-h-[75vh] overflow-x-auto overflow-y-auto pb-4 rounded-3xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 shadow-xs">
          <table className="w-full text-start text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs shadow-2xs text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-2.5 py-3">{isKu ? 'کۆد / بەروار' : 'Code / Date'}</th>
                <th className="px-2.5 py-3">{isKu ? 'کڕیار' : 'Customer'}</th>
                <th className="px-2.5 py-3">{isKu ? 'ڕوونکردنەوە (Notes)' : 'Notes / ڕوونکردنەوە'}</th>
                <th className="px-2.5 py-3">{isKu ? 'پوختە' : 'Summary'}</th>
                <th className="px-2.5 py-3">{isKu ? 'فرۆشیار / شێواز' : 'Seller / Method'}</th>
                <th className="px-2.5 py-3 text-end">{isKu ? 'کۆی گشتی' : 'Net Total'}</th>
                <th className="px-2.5 py-3 text-end">{isKu ? 'پارەی وەرگیراو' : 'RECEIVED / پارەی وەرگیراو'}</th>
                <th className="px-2.5 py-3 text-end">{isKu ? 'قەرزی ماوە' : 'UNPAID BALANCE / قەرزی ماوە'}</th>
                <th className="px-2.5 py-3 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                <th className="px-2.5 py-3 text-center">{isKu ? 'کردارەکان' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    {isKu ? 'هیچ پسوولەیەک نەدۆزرایەوە.' : 'No ledger entries match the current filters.'}
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => {
                  const matchedTx = transactions.find(
                    (t) => t.id === s.id || (t.code && s.batchCode && t.code.toLowerCase() === s.batchCode.toLowerCase())
                  );
                  const invoiced = Number(s.totalInvoiceAmount) || 0;
                  const paid = Number(s.amountPaidToSupplier) || 0;
                  const debt =
                    s.supplierDebtRemaining !== undefined
                      ? Number(s.supplierDebtRemaining)
                      : Math.max(0, invoiced - paid);
                  const status: 'completed' | 'partial' | 'debt' =
                    debt <= 0 ? 'completed' : paid > 0 ? 'partial' : 'debt';
                  const txCur: CurrencyCode =
                    (s.invoiceCurrency as CurrencyCode) ||
                    (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
                  const rawDate = s.createdAt || s.arrivalDate || '';
                  const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
                  const timestamp = !isNaN(parsedDate.getTime())
                    ? parsedDate.toISOString()
                    : new Date(0).toISOString();
                  const totalQty = (s.items || []).reduce(
                    (sum, it) => sum + (Number(it.receivedQty || it.expectedQty) || 0),
                    0
                  );
                  const firstDesc =
                    s.items && s.items.length > 0
                      ? s.items[0].description
                      : s.originCountry || 'Inbound Batch';
                  const firstUnit =
                    s.items && s.items.length > 0 && s.items[0].unit ? s.items[0].unit : 'pcs';

                  const fallbackIsReceivable =
                    matchedTx?.isReceivable !== undefined
                      ? matchedTx.isReceivable
                      : matchedTx
                      ? matchedTx.paymentType !== 'Supplier Bill' && matchedTx.sellingType !== 'Supplier Purchase'
                      : historyTypeFilter === 'AR'
                      ? true
                      : historyTypeFilter === 'AP'
                      ? false
                      : (s.batchCode || '').toUpperCase().startsWith('INV');
                  const fallbackSellingType =
                    matchedTx?.sellingType || (fallbackIsReceivable ? 'Customer Sale' : 'Supplier Purchase');
                  const fallbackPaymentType =
                    matchedTx?.paymentType || (fallbackIsReceivable ? 'Cash' : 'Supplier Bill');
                  const fallbackPanelType =
                    matchedTx?.panelType || (fallbackIsReceivable ? 'Panel' : 'Supplier Shipment');

                  const tx: PanelTransaction = {
                    id: s.id,
                    code: s.batchCode || matchedTx?.code || s.id.slice(-6),
                    timestamp,
                    panelType: fallbackPanelType,
                    material: firstDesc,
                    quantity: totalQty || 1,
                    unit: firstUnit,
                    sellingType: fallbackSellingType,
                    seller: matchedTx?.seller || '—',
                    bank: matchedTx?.bank || (fallbackIsReceivable ? 'Counter Cash' : 'Supplier Wire / LC'),
                    paymentType: fallbackPaymentType,
                    currency: txCur,
                    sellingAmount: invoiced,
                    costPrice: invoiced,
                    discountDollars: matchedTx?.discountDollars || 0,
                    discountPercentage: matchedTx?.discountPercentage || 0,
                    totalAfterDiscount: invoiced,
                    amountPaidNow: paid,
                    amountOwed: debt,
                    oldUnpaidDebt: matchedTx?.oldUnpaidDebt || 0,
                    combinedTotalDebt: debt,
                    grossProfit: 0,
                    profitMargin: 0,
                    notes: s.notes || matchedTx?.notes || '',
                    images: lazyImagesByTxId[s.id] || [],
                    hasImages: Boolean(
                      matchedTx?.hasImages ||
                      s.hasAttachments ||
                      (lazyImagesByTxId[s.id] && lazyImagesByTxId[s.id].length > 0) ||
                      (s.attachments && s.attachments.length > 0) ||
                      (matchedTx?.images && matchedTx.images.length > 0)
                    ),
                    status,
                    lastUpdated: s.updatedAt || timestamp,
                    items:
                      matchedTx?.items && matchedTx.items.length > 0
                        ? matchedTx.items
                        : (s.items || []).map((it, idx) => {
                            const itemQty = Number(it.receivedQty || it.expectedQty) || 1;
                            const lineTotal = idx === 0 ? invoiced : 0;
                            const unitPrice = lineTotal > 0 ? roundMoney(lineTotal / Math.max(1, itemQty), txCur) : 0;
                            return {
                              id: it.id,
                              type: fallbackIsReceivable ? 'Panel' : 'Inbound Batch',
                              product: it.description,
                              quantity: itemQty,
                              sellingType: fallbackSellingType,
                              price: unitPrice,
                              total: lineTotal,
                              fundermaxBatchRef: s.batchCode,
                            };
                          }),
                    client: s.supplier || s.supplierName || matchedTx?.client || (fallbackIsReceivable ? 'Walk-in Customer' : 'FunderMax GmbH'),
                    clientPhone: s.supplierContact || matchedTx?.clientPhone || '',
                    phoneCountryCode: matchedTx?.phoneCountryCode,
                    legacyInvoiceRef: s.originCountry || matchedTx?.legacyInvoiceRef || '',
                    fundermaxBatchRef: s.batchCode,
                    isReceivable: fallbackIsReceivable,
                  };

                  const isExpanded = expandedTxIds.has(tx.id);
                  const isDebt = debt > 0;
                  const phoneStr = (tx?.clientPhone || (tx as any)?.supplierContact || s?.supplierContact || matchedTx?.clientPhone || '').replace(/\D/g, '');
                  const isChina = (tx?.phoneCountryCode === '+86' || matchedTx?.phoneCountryCode === '+86') || (editingTxId === tx?.id && phoneCountryCode === '+86') || phoneStr.startsWith('86') || phoneStr.startsWith('086') || (tx?.clientPhone || '').startsWith('+86') || (s?.supplierContact || '').startsWith('+86');

                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        onClick={() => toggleExpandTx(tx.id)}
                        className="even:bg-slate-50/70 dark:even:bg-slate-900/20 transition-colors cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-2">
                            {tx.images && tx.images.length > 0 ? (
                              <img
                                src={tx.images[0]}
                                alt="Receipt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomedImage({ url: tx.images![0], title: `Invoice ${tx.code || tx.id} - Receipt` });
                                }}
                                className="w-8 h-8 rounded border border-slate-200 dark:border-slate-700 object-cover cursor-pointer hover:scale-105 transition shrink-0 shadow-2xs"
                                title={isKu ? 'کرتە بکە بۆ پیشاندانی پسوولە' : 'Click to view receipt'}
                              />
                            ) : tx.hasImages ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleViewReceipt(tx.id, tx.code || tx.id, true);
                                }}
                                disabled={loadingReceiptId === tx.id}
                                className="h-7 px-2 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white dark:bg-sky-950/60 dark:hover:bg-sky-600 dark:text-sky-300 dark:hover:text-white border border-sky-200 dark:border-sky-800 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-2xs"
                                title={isKu ? 'پیشاندانی وەسڵ (View Receipt)' : 'View Receipt'}
                              >
                                <Paperclip className="w-3 h-3 shrink-0" />
                                <span>{loadingReceiptId === tx.id ? '...' : isKu ? 'وەسڵ' : 'View Receipt'}</span>
                              </button>
                            ) : null}
                            <div className="min-w-0">
                              <div className="font-bold font-mono text-slate-900 dark:text-white text-xs">
                                {tx.code || tx.id.slice(-6)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {tx.client || 'FunderMax GmbH'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {tx.isReceivable ? (isKu ? 'فرۆشتنی کڕیار' : 'Customer Sale') : (isKu ? 'پسوولەی دابینکەر' : 'Supplier Bill')}
                            </span>
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
                        <td className="px-2.5 py-2.5 text-xs max-w-[120px]">
                          {tx.notes ? (
                            <span
                              className="max-w-[120px] truncate block text-slate-500 dark:text-slate-400 text-xs cursor-pointer font-normal"
                              title={tx.notes}
                            >
                              {tx.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="text-slate-900 dark:text-white font-medium text-xs max-w-[140px] truncate" title={tx.material || tx.panelType}>
                            {tx.material || tx.panelType}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.quantity} {tx.unit} • {tx.sellingType}
                            {tx.items && tx.items.length > 1 && (
                              <span className="ms-1 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                {tx.items.length} کاڵا
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          <div className="font-medium text-slate-800 dark:text-slate-200 max-w-[100px] truncate">{tx.seller || '—'}</div>
                          <div className="text-[11px] text-slate-500 max-w-[100px] truncate">{tx.bank || tx.paymentType || '—'}</div>
                        </td>
                        <td className="px-2.5 py-2.5 text-end font-mono font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                          {formatMoney(tx.totalAfterDiscount, txCur)}
                        </td>
                        <td className="px-2.5 py-2.5 text-end font-mono text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                          {formatMoney(tx.amountPaidNow, txCur)}
                        </td>
                        <td className="px-2.5 py-2.5 text-end font-mono whitespace-nowrap">
                          {isDebt ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                              {formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, txCur)}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              {isKu ? 'بەتەواوی دراوە' : 'Paid in Full'}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
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
                        <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* 1. Download PDF */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleShareInvoice(tx, 'download');
                              }}
                              className="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-600 hover:text-white dark:bg-sky-950/60 dark:hover:bg-sky-600 dark:text-sky-400 dark:hover:text-white border border-sky-200 dark:border-sky-800/80 flex items-center justify-center transition cursor-pointer"
                              title={isKu ? 'داگرتنی PDF' : 'Download PDF'}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. WhatsApp / WeChat */}
                            {isChina ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleShareInvoice(tx, 'wechat');
                                }}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center transition cursor-pointer active:scale-95"
                                title="WeChat"
                              >
                                <WeChatIcon className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleShareInvoice(tx, 'whatsapp');
                                }}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center transition cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3. Viber */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleShareInvoice(tx, 'viber');
                              }}
                              className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white dark:bg-purple-950/60 dark:hover:bg-purple-600 dark:text-purple-400 dark:hover:text-white border border-purple-200 dark:border-purple-800/80 flex items-center justify-center transition cursor-pointer"
                              title="Viber"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Email */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleShareInvoice(tx, 'email');
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-600 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center transition cursor-pointer"
                              title="Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            {/* 5. Inspect (Eye) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandTx(tx.id);
                              }}
                              className={
                                isExpanded
                                  ? 'w-7 h-7 rounded-lg bg-sky-600 border border-sky-700 text-white flex items-center justify-center transition cursor-pointer'
                                  : 'w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-600 text-sky-600 hover:text-white dark:bg-sky-950/60 dark:hover:bg-sky-600 dark:text-sky-400 dark:hover:text-white border border-sky-200 dark:border-sky-800/80 flex items-center justify-center transition cursor-pointer'
                              }
                              title={isKu ? 'بینینی تەواوی وردەکاری و تێبینی' : 'Inspect Details & Full Notes'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 6. Edit */}
                            {userPermissions.canEditSales && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTx(tx);
                                }}
                                className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white dark:bg-amber-950/60 dark:hover:bg-amber-600 dark:text-amber-400 dark:hover:text-white border border-amber-200 dark:border-amber-800/80 flex items-center justify-center transition cursor-pointer"
                                title={isKu ? 'دەستکاری پسوولە (Edit Invoice)' : 'Edit Invoice'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 7. Delete */}
                            {userPermissions.canDeleteSales && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTx(tx);
                                }}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/60 dark:hover:bg-rose-600 dark:text-rose-400 dark:hover:text-white border border-rose-200 dark:border-rose-800/80 flex items-center justify-center transition cursor-pointer"
                                title={isKu ? 'سڕینەوەی پسوولە (Delete Invoice)' : 'Delete Invoice'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                                </div>
                              </div>

                              {/* Structured 2-Section Grid: Left (Receipt) vs Right (Financials & Notes) */}
                              <div className={`grid gap-5 ${(tx.images && tx.images.length > 0) || tx.hasImages ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
                                {/* Left Section (Receipt Image Preview Card) */}
                                {((tx.images && tx.images.length > 0) || tx.hasImages) && (
                                  <div className="lg:col-span-4 flex flex-col gap-2">
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <Paperclip className="w-3.5 h-3.5 text-sky-500" />
                                      <span>{isKu ? 'فۆتۆی پسوولە و هاوپێچ:' : 'Attached Receipt / Slip:'}</span>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col items-center justify-center gap-2">
                                      {tx.images && tx.images.length > 0 ? (
                                        <>
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
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => void handleViewReceipt(tx.id, tx.code || tx.id, true)}
                                          disabled={loadingReceiptId === tx.id}
                                          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                                        >
                                          <Paperclip className="w-4 h-4" />
                                          <span>
                                            {loadingReceiptId === tx.id
                                              ? (isKu ? 'بارکردنی وەسڵ...' : 'Loading Receipt...')
                                              : (isKu ? 'پیشاندانی وەسڵ (View Receipt)' : 'View Receipt')}
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Right Section (Financials, Line Items & Notes) */}
                                <div className={`${(tx.images && tx.images.length > 0) || tx.hasImages ? 'lg:col-span-8' : 'col-span-1'} space-y-3`}>
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
                                            <div className="text-end shrink-0">
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
                                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>{isKu ? 'تێبینی و ڕوونکردنەوەی تەواو (Full Notes):' : 'Full Invoice Notes:'}</span>
                                    </div>
                                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap mt-1">
                                      {matchedTx?.notes || s.notes || tx.notes || 'No additional notes provided.'}
                                    </p>
                                  </div>
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

          {filteredShipments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs">
              {isKu ? 'هیچ پسوولەیەک نەدۆزرایەوە.' : 'No ledger entries match the current filters.'}
            </div>
          ) : (
            filteredShipments.map((s) => {
              const matchedTx = transactions.find(
                (t) => t.id === s.id || (t.code && s.batchCode && t.code.toLowerCase() === s.batchCode.toLowerCase())
              );
              const invoiced = Number(s.totalInvoiceAmount) || 0;
              const paid = Number(s.amountPaidToSupplier) || 0;
              const debt =
                s.supplierDebtRemaining !== undefined
                  ? Number(s.supplierDebtRemaining)
                  : Math.max(0, invoiced - paid);
              const status: 'completed' | 'partial' | 'debt' =
                debt <= 0 ? 'completed' : paid > 0 ? 'partial' : 'debt';
              const txCur: CurrencyCode =
                (s.invoiceCurrency as CurrencyCode) ||
                (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');
              const rawDate = s.createdAt || s.arrivalDate || '';
              const parsedDate = rawDate ? new Date(rawDate) : new Date(0);
              const timestamp = !isNaN(parsedDate.getTime())
                ? parsedDate.toISOString()
                : new Date(0).toISOString();
              const totalQty = (s.items || []).reduce(
                (sum, it) => sum + (Number(it.receivedQty || it.expectedQty) || 0),
                0
              );
              const firstDesc =
                s.items && s.items.length > 0
                  ? s.items[0].description
                  : s.originCountry || 'Inbound Batch';
              const firstUnit =
                s.items && s.items.length > 0 && s.items[0].unit ? s.items[0].unit : 'pcs';

              const fallbackIsReceivable =
                matchedTx?.isReceivable !== undefined
                  ? matchedTx.isReceivable
                  : matchedTx
                  ? matchedTx.paymentType !== 'Supplier Bill' && matchedTx.sellingType !== 'Supplier Purchase'
                  : historyTypeFilter === 'AR'
                  ? true
                  : historyTypeFilter === 'AP'
                  ? false
                  : (s.batchCode || '').toUpperCase().startsWith('INV');
              const fallbackSellingType =
                matchedTx?.sellingType || (fallbackIsReceivable ? 'Customer Sale' : 'Supplier Purchase');
              const fallbackPaymentType =
                matchedTx?.paymentType || (fallbackIsReceivable ? 'Cash' : 'Supplier Bill');
              const fallbackPanelType =
                matchedTx?.panelType || (fallbackIsReceivable ? 'Panel' : 'Supplier Shipment');

              const tx: PanelTransaction = {
                id: s.id,
                code: s.batchCode || matchedTx?.code || s.id.slice(-6),
                timestamp,
                panelType: fallbackPanelType,
                material: firstDesc,
                quantity: totalQty || 1,
                unit: firstUnit,
                sellingType: fallbackSellingType,
                seller: matchedTx?.seller || '—',
                bank: matchedTx?.bank || (fallbackIsReceivable ? 'Counter Cash' : 'Supplier Wire / LC'),
                paymentType: fallbackPaymentType,
                currency: txCur,
                sellingAmount: invoiced,
                costPrice: invoiced,
                discountDollars: matchedTx?.discountDollars || 0,
                discountPercentage: matchedTx?.discountPercentage || 0,
                totalAfterDiscount: invoiced,
                amountPaidNow: paid,
                amountOwed: debt,
                oldUnpaidDebt: matchedTx?.oldUnpaidDebt || 0,
                combinedTotalDebt: debt,
                grossProfit: 0,
                profitMargin: 0,
                notes: s.notes || matchedTx?.notes || '',
                images: lazyImagesByTxId[s.id] || [],
                hasImages: Boolean(
                  matchedTx?.hasImages ||
                  s.hasAttachments ||
                  (lazyImagesByTxId[s.id] && lazyImagesByTxId[s.id].length > 0) ||
                  (s.attachments && s.attachments.length > 0) ||
                  (matchedTx?.images && matchedTx.images.length > 0)
                ),
                status,
                lastUpdated: s.updatedAt || timestamp,
                items:
                  matchedTx?.items && matchedTx.items.length > 0
                    ? matchedTx.items
                    : (s.items || []).map((it, idx) => {
                        const itemQty = Number(it.receivedQty || it.expectedQty) || 1;
                        const lineTotal = idx === 0 ? invoiced : 0;
                        const unitPrice = lineTotal > 0 ? roundMoney(lineTotal / Math.max(1, itemQty), txCur) : 0;
                        return {
                          id: it.id,
                          type: fallbackIsReceivable ? 'Panel' : 'Inbound Batch',
                          product: it.description,
                          quantity: itemQty,
                          sellingType: fallbackSellingType,
                          price: unitPrice,
                          total: lineTotal,
                          fundermaxBatchRef: s.batchCode,
                        };
                      }),
                client: s.supplier || s.supplierName || matchedTx?.client || (fallbackIsReceivable ? 'Walk-in Customer' : 'FunderMax GmbH'),
                clientPhone: s.supplierContact || matchedTx?.clientPhone || '',
                phoneCountryCode: matchedTx?.phoneCountryCode,
                legacyInvoiceRef: s.originCountry || matchedTx?.legacyInvoiceRef || '',
                fundermaxBatchRef: s.batchCode,
                isReceivable: fallbackIsReceivable,
              };

              const isDebt = debt > 0;
              const phoneStr = (tx?.clientPhone || (tx as any)?.supplierContact || s?.supplierContact || matchedTx?.clientPhone || '').replace(/\D/g, '');
              const isChina = (tx?.phoneCountryCode === '+86' || matchedTx?.phoneCountryCode === '+86') || (editingTxId === tx?.id && phoneCountryCode === '+86') || phoneStr.startsWith('86') || phoneStr.startsWith('086') || (tx?.clientPhone || '').startsWith('+86') || (s?.supplierContact || '').startsWith('+86');

              return (
                <div
                  key={tx.id}
                  className="p-4 rounded-2xl border shadow-xs space-y-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                >
                  {/* Top row: Invoice #, Date, and Supplier Name */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-750 pb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                          {tx.client || 'FunderMax GmbH'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          tx.isReceivable
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {tx.isReceivable ? (isKu ? 'فرۆشتنی کڕیار' : 'Customer Sale') : (isKu ? 'پسوولەی دابینکەر' : 'Supplier Bill')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          #{tx.code || tx.id.slice(-6)}
                        </span>
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

                    {isChina ? (
                      <button
                        type="button"
                        onClick={() => void handleShareInvoice(tx, 'wechat')}
                        className="h-11 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                        title="WeChat"
                      >
                        <WeChatIcon className="w-4 h-4 shrink-0" />
                        <span>WeChat</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppShare(tx)}
                        className="min-h-[48px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                        title={receiptShareLang === 'ku' ? 'ناردن بۆ وەتسئەپ' : 'WhatsApp'}
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>WhatsApp</span>
                      </button>
                    )}

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onPointerDown={(e) => e.target === e.currentTarget && setAddingDropdownCategory(null)}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onPointerDown={(e) => e.target === e.currentTarget && setInspectingTx(null)}
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
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-start text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs text-slate-600 dark:text-slate-300 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">{isKu ? 'کاڵا' : 'Item'}</th>
                      <th className="px-3 py-2 text-center">{isKu ? 'بڕ' : 'Qty'}</th>
                      <th className="px-3 py-2 text-end">{isKu ? 'نرخ' : 'Price'}</th>
                      <th className="px-3 py-2 text-end">{isKu ? 'کۆی کاڵا' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {inspectingTx.items && inspectingTx.items.length > 0 ? (
                      inspectingTx.items.map((it, idx) => (
                        <tr key={idx} className="even:bg-slate-50/70 dark:even:bg-slate-900/20 hover:bg-slate-100/70 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 text-slate-900 dark:text-white font-semibold">
                            {it.product}
                            {it.type && <span className="text-slate-400 font-normal ms-1">({it.type})</span>}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                          <td className="px-3 py-2 text-end font-mono">
                            {formatMoney(it.price, inspectingTx.currency || 'USD')}
                          </td>
                          <td className="px-3 py-2 text-end font-mono font-bold text-slate-900 dark:text-white">
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
                        <td className="px-3 py-2 text-end font-mono">
                          {formatMoney(inspectingTx.sellingAmount, inspectingTx.currency || 'USD')}
                        </td>
                        <td className="px-3 py-2 text-end font-mono font-bold text-slate-900 dark:text-white">
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
              ) : inspectingTx.hasImages ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void handleViewReceipt(inspectingTx.id, inspectingTx.code || inspectingTx.id, true)}
                    disabled={loadingReceiptId === inspectingTx.id}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>
                      {loadingReceiptId === inspectingTx.id
                        ? (isKu ? 'بارکردنی وەسڵ...' : 'Loading Receipt...')
                        : (isKu ? 'پیشاندانی وەسڵ (View Receipt)' : 'View Receipt')}
                    </span>
                  </button>
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
              {(() => {
                const phoneStr = (inspectingTx?.clientPhone || (inspectingTx as any)?.supplierContact || '').replace(/\D/g, '');
                const isChina = inspectingTx?.phoneCountryCode === '+86' || (editingTxId === inspectingTx.id && phoneCountryCode === '+86') || phoneStr.startsWith('86') || phoneStr.startsWith('086') || (inspectingTx?.clientPhone || '').startsWith('+86') || ((inspectingTx as any)?.supplierContact || '').startsWith('+86');
                return isChina ? (
                  <button
                    type="button"
                    onClick={() => void handleShareInvoice(inspectingTx, 'wechat')}
                    className="h-11 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <WeChatIcon className="w-4 h-4 shrink-0" />
                    <span>WeChat</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(inspectingTx)}
                    className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isKu ? 'وەتسئەپ' : 'WhatsApp'}</span>
                  </button>
                );
              })()}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
            onPointerDown={(e) => e.target === e.currentTarget && closeDebtPayment()}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
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
                  <span className="text-end">
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
                  className="w-full px-3 py-2.5 text-base rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold"
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
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
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
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = '';
                    if (files.length === 0) return;
                    const urls = await readImageFiles(files, 'document');
                    if (urls.length > 0) {
                      setPayImages((prev) => [...urls, ...prev]);
                    }
                  }}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:me-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 file:font-semibold"
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
                          className="absolute top-0 end-0 p-0.5 bg-black/60 text-white rounded-es-md cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
          onPointerDown={(e) => e.target === e.currentTarget && setCompletedInvoice(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
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

      {/* SUCCESS MODAL / SHARE POPUP */}
      {printingTx && (
        <div
          onPointerDown={(e) => e.target === e.currentTarget && setPrintingTx(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {isKu ? 'وەسڵ بەسەرکەوتوویی تۆمارکرا' : 'Record Saved Successfully'}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold block mt-0.5">
                    #{printingTx.code || (typeof printingTx.id === 'string' ? printingTx.id.slice(-6) : 'INV')}
                    {printingTx.client ? ` • ${printingTx.client}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintingTx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs font-medium">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>{isKu ? 'کۆی گشتی پسوولە:' : 'Net Total:'}</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {formatMoney(printingTx.totalAfterDiscount || printingTx.sellingAmount || 0, printingTx.currency || 'USD')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>{isKu ? 'پارەی وەرگیراو:' : 'Amount Settled:'}</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(printingTx.amountPaidNow || 0, printingTx.currency || 'USD')}
                </span>
              </div>
              {(printingTx.combinedTotalDebt || printingTx.amountOwed || 0) > 0 && (
                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                  <span>{isKu ? 'قەرزی ماوە:' : 'Remaining Balance:'}</span>
                  <span className="font-black font-mono">
                    {formatMoney(printingTx.combinedTotalDebt || printingTx.amountOwed || 0, printingTx.currency || 'USD')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block px-1">
                {isKu ? 'کردارە خێراکان' : 'Quick Actions & Export'}
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => { const tx = printingTx; setPrintingTx(null); handleShareInvoice(tx, 'download'); }}
                  className="h-11 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>PDF Export</span>
                </button>
                {(() => {
                  const phoneStr = (printingTx?.clientPhone || (printingTx as any)?.supplierContact || '').replace(/\D/g, '');
                  const isChina = printingTx?.phoneCountryCode === '+86' || (phoneCountryCode === '+86' && (!printingTx || printingTx.id === editingTxId)) || phoneStr.startsWith('86') || phoneStr.startsWith('086') || (printingTx?.clientPhone || '').startsWith('+86') || ((printingTx as any)?.supplierContact || '').startsWith('+86');
                  return isChina ? (
                    <button
                      type="button"
                      onClick={() => { const tx = printingTx; setPrintingTx(null); void handleShareInvoice(tx, 'wechat'); }}
                      className="h-11 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/60 dark:hover:bg-emerald-600 dark:text-emerald-400 dark:hover:text-white border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <WeChatIcon className="w-4 h-4 shrink-0" />
                      <span>WeChat</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { const tx = printingTx; setPrintingTx(null); void handleShareInvoice(tx, 'whatsapp'); }}
                      className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>WhatsApp</span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => { const tx = printingTx; setPrintingTx(null); handleShareInvoice(tx, 'viber'); }}
                  className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Viber</span>
                </button>
                <button
                  type="button"
                  onClick={() => { const tx = printingTx; setPrintingTx(null); handleShareInvoice(tx, 'email'); }}
                  className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>Email</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPrintingTx(null)}
              className="w-full h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              {isKu ? 'داخستن / بەردەوامبوون' : 'Done / New Entry'}
            </button>
          </div>
        </div>
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

      {/* SUPPLIER PAYABLES IN-PLACE LEDGER MODAL */}
      <SupplierPayablesModal
        isOpen={isSupplierPayablesOpen}
        onClose={() => setIsSupplierPayablesOpen(false)}
      />

      {/* EXECUTIVE ANALYTICS MODAL */}
      {isExecutiveAnalyticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isKu ? 'شیکاری بەڕێوەبردن (Executive Analytics)' : 'Executive Analytics Dashboard'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isKu
                      ? 'شیکاری داتا داراییەکان، دابەشبوونی قەرز، و سەرەکیترین کڕیار و دابینکەران'
                      : `Live multi-dimensional financial intelligence (${posDraft.activeCurrency})`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExecutiveAnalyticsOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close Analytics"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Revenue vs Payables Area Chart */}
              <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {isKu ? 'داهات بەرامبەر پارەدان (Revenue vs Payables)' : 'Revenue vs Payables'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isKu ? 'بەراوردی فرۆشی کڕیاران و خەرجی کڕین بەپێی کات' : 'Customer sales vs supplier bills over time'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {posDraft.activeCurrency}
                  </span>
                </div>
                {analyticsData.revenueVsPayables.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                    {isKu ? 'هیچ داتایەکی بەردەست نییە' : 'No transaction history available.'}
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.revenueVsPayables} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                        <XAxis dataKey="date" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area isAnimationActive={false} type="monotone" dataKey="revenue" name={isKu ? 'داهات (فرۆشتن)' : 'Revenue (Sales)'} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                        <Area isAnimationActive={false} type="monotone" dataKey="payables" name={isKu ? 'پارەی دابینکەر (کڕین)' : 'Payables (Bills)'} stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#payGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 2. Debt Distribution Pie Chart */}
              <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {isKu ? 'دابەشبوونی قەرز (Debt Distribution)' : 'Debt Distribution'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isKu ? 'کۆی گشتی دراو بەرامبەر قەرزی ماوەی هەموو لایەک' : 'Paid vs unpaid debt across all AR & AP records'}
                    </p>
                  </div>
                </div>
                {analyticsData.debtDistribution.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                    {isKu ? 'هیچ داتایەکی قەرز نییە' : 'No debt distribution data.'}
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={analyticsData.debtDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={5}
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          <Cell key="cell-0" fill="#10b981" />
                          <Cell key="cell-1" fill="#f43f5e" />
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => formatMoney(Number(value), posDraft.activeCurrency)}
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 3. Top 5 Customers by Volume Bar Chart */}
              <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {isKu ? '٥ کڕیاری سەرەکی بەپێی قەبارە' : 'Top 5 Customers by Volume'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isKu ? 'سەرەکیترین کڕیاران بەپێی کۆی پارەی فرۆشراو' : 'Highest sales volume generated per client'}
                    </p>
                  </div>
                </div>
                {analyticsData.topCustomers.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                    {isKu ? 'هیچ کڕیارێک تۆمار نەکراوە' : 'No customer sales records.'}
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topCustomers} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                        <XAxis type="number" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                        <YAxis type="category" dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} width={90} />
                        <Tooltip
                          formatter={(value: any) => formatMoney(Number(value), posDraft.activeCurrency)}
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        />
                        <Bar isAnimationActive={false} dataKey="total" name={isKu ? 'کۆی فرۆشتن' : 'Total Sales'} fill="#0284c7" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 4. Top 5 Suppliers by Volume Bar Chart */}
              <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {isKu ? '٥ دابینکەری سەرەکی بەپێی قەبارە' : 'Top 5 Suppliers by Volume'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isKu ? 'سەرەکیترین دابینکەران بەپێی بڕی کڕینی شمەک' : 'Highest purchase volume sourced per supplier'}
                    </p>
                  </div>
                </div>
                {analyticsData.topSuppliers.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">
                    {isKu ? 'هیچ دابینکەرێک تۆمار نەکراوە' : 'No supplier purchase records.'}
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topSuppliers} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
                        <XAxis type="number" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                        <YAxis type="category" dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} width={90} />
                        <Tooltip
                          formatter={(value: any) => formatMoney(Number(value), posDraft.activeCurrency)}
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        />
                        <Bar isAnimationActive={false} dataKey="total" name={isKu ? 'کۆی کڕین' : 'Total Sourced'} fill="#e11d48" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SalesSection = TradeLedgerSection;
export default TradeLedgerSection;
