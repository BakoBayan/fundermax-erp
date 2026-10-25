'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { InventoryProvider, useInventory } from '@/context/InventoryContext';
import { Header } from '@/components/Header';
import { ModuleHub } from '@/components/ModuleHub';
import { ExcelGrid } from '@/components/ExcelGrid';
import { MobileView } from '@/components/MobileView';
import { OrdersSection } from '@/components/OrdersSection';
import { SalesSection } from '@/components/SalesSection';
import { WarehouseGoodsSection } from '@/components/WarehouseGoodsSection';
import { AuditBackupsSection } from '@/components/AuditBackupsSection';
import { MaterialModal, OrderModal } from '@/components/Modals';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { LoginScreen } from '@/components/LoginScreen';
import { BatchPrintModal, PrintQueueItem } from '@/components/BatchPrintModal';
import { VisualChartsModal } from '@/components/VisualChartsModal';
import { CopyrightModal } from '@/components/CopyrightModal';
import { FooterAttribution } from '@/components/FooterAttribution';
import { PanelMaterial, OrderAllocation } from '@/types/inventory';
import {
  Phone,
  ShieldCheck,
  Layers,
  PackageCheck,
  Printer,
  Image as ImageIcon,
  Undo2,
  Redo2,
  CheckSquare,
  BarChart3
} from 'lucide-react';

type PrintScope = 'panels' | 'orders' | 'all' | 'individual-panels' | 'individual-orders' | 'batch-selection';

const AccessDeniedView: React.FC<{
  moduleName: string;
  onReturn: () => void;
  language: string;
}> = ({ moduleName, onReturn, language }) => {
  const isKu = language === 'ku';
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 font-mono text-xs font-bold">
          {isKu ? 'دەسەڵات سنووردارکراوە' : 'Access Restricted'}
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          {moduleName}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {isKu
            ? 'ئەژمێری تۆ لەلایەن بەڕێوەبەری سەرەکی (Admin) باکۆ بەیان ڕێگەی پێنەدراوە بۆ دەستپێگەیشتن بەم بەشە. تکایە پەیوەندی بکە بە بەڕێوەبەر بۆ چالاککردنی ئەم دەسەڵاتە.'
            : 'Your account does not have permission granted by Master Administrator Bako Bayan to access this division. Please contact the administrator to assign permissions for your account.'}
        </p>

        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
            {isKu ? 'پەیوەندی بە ئەدمین:' : 'Master System Administrator:'}
          </div>
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span>Bako Bayan Madhhar</span>
            <a href="tel:07705488654" className="text-emerald-600 dark:text-emerald-400 font-mono hover:underline">
              07705488654
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={onReturn}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {isKu ? 'گەڕانەوە بۆ مێنیوی سەرەکی' : 'Return to Main Menu'}
        </button>
      </div>
    </div>
  );
};

function WarehouseApp() {
  const {
    currentModule,
    setCurrentModule,
    effectiveMode,
    zoomedImage,
    setZoomedImage,
    t,
    language,
    materials,
    stats,
    currentUser,
    hasModulePermission,
    userPermissions,
    canUndo,
    canRedo,
    undo,
    redo,
    finalizeOrder,
    deleteOrder,
    confirmDialog,
    closeConfirm,
    isViewer,
    searchQuery,
    setSearchQuery,
    openVisualCharts,
  } = useInventory();

  // Print Image Option: "none" (ink-saver text only), "small", "medium", "large"
  const [printImageSize, setPrintImageSize] = useState<'none' | 'small' | 'medium' | 'large'>('small');

  // Modals state for Wood Panels & Orders
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<PanelMaterial | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalMatId, setOrderModalMatId] = useState<string | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<{ materialId: string; order: OrderAllocation } | null>(null);

  // Order Details Modal state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<{
    order: OrderAllocation;
    material: PanelMaterial;
  } | null>(null);

  // Print Scope & Formatted Date
  const [printScope, setPrintScope] = useState<PrintScope>('all');
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Batch multi-item print queue & selector modal
  const [selectedPrintQueue, setSelectedPrintQueue] = useState<PrintQueueItem[]>([]);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);

  // Individual item printing target
  const [individualPrintTarget, setIndividualPrintTarget] = useState<{
    type: 'panel' | 'order';
    material?: PanelMaterial;
    order?: OrderAllocation;
  } | null>(null);

  const allFlattenedOrders = useMemo(() => {
    const list: { order: OrderAllocation; material: PanelMaterial }[] = [];
    materials.forEach((mat) => {
      mat.activeOrders.forEach((ord) => {
        list.push({ order: ord, material: mat });
      });
    });
    return list;
  }, [materials]);

  const shouldPrintPanels =
    printScope === 'panels' ||
    printScope === 'individual-panels' ||
    printScope === 'all';

  const shouldPrintOrders =
    printScope === 'orders' ||
    printScope === 'individual-orders' ||
    printScope === 'all';

  const formatDateTime = (d: Date = new Date()) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${month}/${day}/${year} • ${hoursStr}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatDateTime());
    };
    updateTime();

    const onAfterPrint = () => {
      setIndividualPrintTarget(null);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          const targetInput =
            currentModule === 'panels'
              ? (document.getElementById('warehouse-panels-search-input') as HTMLInputElement) ||
                (document.getElementById('mobile-panels-search-input') as HTMLInputElement)
              : (document.getElementById('warehouse-orders-search-input') as HTMLInputElement);

          if (targetInput) {
            targetInput.focus();
            targetInput.select();
          }
        }
      }

      if (e.key === 'Escape') {
        if (isMaterialModalOpen) setIsMaterialModalOpen(false);
        else if (isOrderModalOpen) setIsOrderModalOpen(false);
        else if (selectedOrderForDetails) setSelectedOrderForDetails(null);
        else if (zoomedImage) setZoomedImage(null);
        else if (isBatchPrintModalOpen) setIsBatchPrintModalOpen(false);
        else if (searchQuery) setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentModule,
    isMaterialModalOpen,
    isOrderModalOpen,
    selectedOrderForDetails,
    zoomedImage,
    isBatchPrintModalOpen,
    searchQuery,
    setSearchQuery,
    setZoomedImage
  ]);

  // If user is not logged in, render the secure Login screen
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <CopyrightModal />
      </>
    );
  }

  const handleOpenMaterialModal = (matToEdit?: PanelMaterial | null) => {
    setMaterialToEdit(matToEdit || null);
    setIsMaterialModalOpen(true);
  };

  const handleOpenOrderModal = (
    matId?: string,
    ordToEdit?: { materialId: string; order: OrderAllocation }
  ) => {
    setOrderModalMatId(matId || null);
    setOrderToEdit(ordToEdit || null);
    setIsOrderModalOpen(true);
  };

  const handlePrintIndividual = (target: {
    type: 'panel' | 'order';
    material?: PanelMaterial;
    order?: OrderAllocation;
  }) => {
    setIndividualPrintTarget(target);
    setSelectedPrintQueue([]);
    setCurrentDateTime(formatDateTime());
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleTogglePrintQueueItem = (item: PrintQueueItem) => {
    setSelectedPrintQueue((prev) => {
      const exists = prev.some((q) => q.id === item.id);
      if (exists) {
        return prev.filter((q) => q.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleConfirmBatchPrint = (queue: PrintQueueItem[]) => {
    setSelectedPrintQueue(queue);
    setIndividualPrintTarget(null);
    setCurrentDateTime(formatDateTime());
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleTriggerPrint = () => {
    setIndividualPrintTarget(null);
    setCurrentDateTime(formatDateTime());
    window.print();
  };

  // Render faithful panel slip
  const renderPanelSlip = (
    mat: PanelMaterial,
    forcePageBreak: boolean = false,
    queueIndex?: number,
    queueTotal?: number
  ) => {
    const isKu = language === 'ku';
    const isSingle = forcePageBreak || !queueTotal || queueTotal === 1 || (queueTotal % 2 === 1 && queueIndex === queueTotal);
    return (
      <div
        key={mat.id}
        className={`border-2 border-slate-400 rounded-2xl bg-white text-slate-900 font-sans w-full max-w-none shadow-none print-card ${
          isSingle ? 'p-8 sm:p-9 print-card-single' : 'p-4 sm:p-5 print-card-multi'
        } ${
          forcePageBreak ? '[page-break-after:always] [break-after:page]' : '[page-break-after:auto] [break-after:auto]'
        } [page-break-inside:avoid] [break-inside:avoid]`}
      >
        {/* Top Header Block */}
        <div className={`border-b-2 border-slate-300 ${isSingle ? 'pb-5 mb-5' : 'pb-2.5 mb-3'} flex items-start justify-between gap-4`}>
          <div>
            <div className={`inline-flex items-center gap-1.5 ${isSingle ? 'px-3.5 py-1.5 text-xs mb-2.5' : 'px-2.5 py-1 text-[10px] mb-1'} rounded-md border border-slate-300 bg-slate-100 font-mono font-black uppercase tracking-wider text-slate-800`}>
              <span>{isKu ? 'پسوڵەی تەختە (پەنەل)' : 'PANEL SLIP'}</span>
            </div>
            <h1 className={`${isSingle ? 'text-2xl sm:text-3xl' : 'text-base'} font-black tracking-tight text-slate-900 uppercase`}>
              Bako&apos;s Panel Manager
            </h1>
            <div className={`${isSingle ? 'text-xs mt-1' : 'text-[11px] mt-0.5'} font-bold text-slate-500 uppercase tracking-wider`}>
              {isKu ? 'کۆگا و تۆماری مەخزەن' : 'Warehouse Inventory & Stock Record'}
            </div>
          </div>
          <div className="text-end shrink-0">
            <div className={`font-mono ${isSingle ? 'text-base px-4 py-1.5' : 'text-xs px-2 py-0.5'} font-black text-slate-900 bg-slate-100 rounded-lg border border-slate-300`}>
              {isKu ? `کۆدی تەختە: #${mat.code}` : `PANEL REF: #${mat.code}`}
            </div>
            <div dir="ltr" className={`${isSingle ? 'text-xs pt-2' : 'text-[10px] pt-1'} font-mono text-slate-500 text-end`}>
              {currentDateTime || formatDateTime()}
            </div>
            {queueIndex && queueTotal && queueTotal > 1 && (
              <div className={`${isSingle ? 'text-xs px-2.5 py-1' : 'text-[10px] px-1.5 py-0.5'} font-bold font-mono text-slate-700 bg-slate-100 rounded-md mt-1.5 border border-slate-300`}>
                {isKu ? `دانەی ${queueIndex} لە ${queueTotal}` : `Item ${queueIndex} of ${queueTotal}`}
              </div>
            )}
          </div>
        </div>

        {/* Panel Main Identity Card */}
        <div className={`${isSingle ? 'p-5 rounded-2xl mb-5 bg-slate-50/90 border border-slate-300' : 'mb-2'}`}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`font-mono font-black ${isSingle ? 'text-base px-3.5 py-1.5 rounded-xl' : 'text-sm px-3 py-1 rounded-lg'} bg-slate-900 text-white`}>
              #{mat.code}
            </span>
            <span className={`${isSingle ? 'text-sm px-3.5 py-1.5 rounded-xl' : 'text-xs px-2.5 py-1 rounded-lg'} font-bold text-slate-800 bg-white border border-slate-300 shadow-2xs`}>
              {isKu ? `جۆری ماددە: ${mat.type}` : `MATERIAL TYPE: ${mat.type}`}
            </span>
          </div>

          <h2 className={`${isSingle ? 'text-3xl sm:text-4xl mt-2 mb-3' : 'text-xl mt-2 mb-1'} font-black text-slate-900 tracking-tight`}>
            {mat.name}
          </h2>

          <div className={`font-mono ${isSingle ? 'text-sm px-4 py-2.5 bg-white border border-slate-300 rounded-xl flex items-center justify-between flex-wrap gap-2' : 'text-xs mb-3 text-slate-700 font-semibold'}`}>
            <div>
              <span className="text-slate-500 font-semibold">{isKu ? 'قەبارە و ئەندازە: ' : 'Dimensions: '}</span>
              <span className="font-black text-slate-900 text-base">{mat.dimensions.formatted}</span>
            </div>
            {isSingle && (
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span>L: <strong className="text-slate-800">{mat.dimensions.length}mm</strong></span>
                <span>•</span>
                <span>W: <strong className="text-slate-800">{mat.dimensions.width}mm</strong></span>
                <span>•</span>
                <span>T: <strong className="text-slate-800">{mat.dimensions.thickness}mm</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Stock Grid */}
        <div className={`border border-slate-300 rounded-xl ${isSingle ? 'p-5 mb-5 bg-slate-50/80' : 'p-3 mb-3 bg-slate-50/60'}`}>
          <div className={`${isSingle ? 'text-xs mb-3.5' : 'text-[10px] mb-2'} font-black uppercase text-slate-600 tracking-wider flex items-center justify-between`}>
            <span>{isKu ? 'ئاماری کۆگای تەختە' : 'WAREHOUSE STOCK METRICS'}</span>
            <span className="text-slate-400 font-mono text-[10px]">{isKu ? 'ژماردنی فیزیکی کۆگا' : 'PHYSICAL INVENTORY COUNT'}</span>
          </div>
          <div className="grid grid-cols-3 gap-3.5 text-center font-mono">
            <div className={`${isSingle ? 'p-4 sm:p-5' : 'p-2'} border border-slate-300 rounded-xl bg-white shadow-2xs`}>
              <div className={`${isSingle ? 'text-xs font-bold' : 'text-[10px] font-semibold'} text-slate-500 uppercase tracking-wide`}>
                {isKu ? 'کۆی گشتی کۆگا' : 'Total Stock'}
              </div>
              <div className={`${isSingle ? 'text-3xl sm:text-4xl mt-2' : 'text-base'} font-black text-slate-900`}>{mat.totalStock}</div>
              {isSingle && <div className="text-[10px] text-slate-400 mt-1 uppercase">{isKu ? 'دانە لە کۆگا' : 'units in warehouse'}</div>}
            </div>
            <div className={`${isSingle ? 'p-4 sm:p-5' : 'p-2'} border border-slate-300 rounded-xl bg-white shadow-2xs`}>
              <div className={`${isSingle ? 'text-xs font-bold' : 'text-[10px] font-semibold'} text-slate-500 uppercase tracking-wide`}>
                {isKu ? 'گیراو (داواکراو)' : 'Reserved Stock'}
              </div>
              <div className={`${isSingle ? 'text-3xl sm:text-4xl mt-2' : 'text-base'} font-black text-slate-900`}>{mat.allocatedStock}</div>
              {isSingle && <div className="text-[10px] text-slate-400 mt-1 uppercase">{isKu ? 'دانەی گیراو' : 'allocated to orders'}</div>}
            </div>
            <div className={`${isSingle ? 'p-4 sm:p-5' : 'p-2'} border border-slate-300 rounded-xl bg-white shadow-2xs`}>
              <div className={`${isSingle ? 'text-xs font-bold' : 'text-[10px] font-semibold'} text-emerald-700 uppercase tracking-wide`}>
                {isKu ? 'بەردەست بۆ فرۆشتن' : 'Available Stock'}
              </div>
              <div className={`${isSingle ? 'text-3xl sm:text-4xl mt-2' : 'text-base'} font-black text-emerald-700`}>{mat.availableStock}</div>
              {isSingle && <div className="text-[10px] text-emerald-600 mt-1 uppercase">{isKu ? 'ئامادە بۆ وەرگرتن' : 'ready for dispatch'}</div>}
            </div>
          </div>
        </div>

        {/* Active Reservations Table */}
        {mat.activeOrders && mat.activeOrders.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase text-slate-600 mb-1.5 tracking-wider">
              {isKu ? 'داواکارییە چالاکەکانی ئەم تەختەیە' : 'ACTIVE RESERVATIONS FOR THIS PANEL'}
            </div>
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-1.5">#</th>
                  <th className="p-1.5">{isKu ? 'کڕیار' : 'Customer'}</th>
                  <th className="p-1.5 text-center">{isKu ? 'بڕ' : 'Qty'}</th>
                  <th className="p-1.5 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {mat.activeOrders.map((ord) => (
                  <tr key={ord.id} className="border-b border-slate-200">
                    <td className="p-1.5 font-mono">#{ord.orderNumber}</td>
                    <td className="p-1.5 font-bold">{ord.client}</td>
                    <td className="p-1.5 text-center font-mono font-bold">{ord.quantity} pcs</td>
                    <td className="p-1.5 text-center uppercase text-[10px] font-bold">
                      {ord.status === 'finalized' ? (isKu ? 'تەواوکراو' : 'Finalized') : (isKu ? 'گیراو' : 'Reserved')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card Footer */}
        <div dir="ltr" className={`${isSingle ? 'mt-6 pt-4 text-xs' : 'mt-4 pt-2.5 text-[11px]'} border-t border-slate-300 flex items-center justify-between text-slate-500 font-medium select-none`}>
          <div>Engineered & Maintained by Bako Bayan Madhhar — Version 1.3</div>
          <div className="font-mono font-bold">Contact: 07705488654</div>
        </div>
      </div>
    );
  };

  // Render faithful order dispatch slip
  const renderOrderSlip = (
    ord: OrderAllocation,
    mat: PanelMaterial,
    forcePageBreak: boolean = false,
    queueIndex?: number,
    queueTotal?: number
  ) => {
    const isKu = language === 'ku';
    const isSingle = forcePageBreak || !queueTotal || queueTotal === 1 || (queueTotal % 2 === 1 && queueIndex === queueTotal);
    return (
      <div
        key={ord.id}
        className={`border-2 border-slate-400 rounded-2xl bg-white text-slate-900 font-sans w-full max-w-none shadow-none print-card ${
          isSingle ? 'p-8 sm:p-9 print-card-single' : 'p-4 sm:p-5 print-card-multi'
        } ${
          forcePageBreak ? '[page-break-after:always] [break-after:page]' : '[page-break-after:auto] [break-after:auto]'
        } [page-break-inside:avoid] [break-inside:avoid]`}
      >
        <div className={`border-b-2 border-slate-300 ${isSingle ? 'pb-5 mb-5' : 'pb-2.5 mb-3'} flex items-start justify-between gap-4`}>
          <div>
            <div className={`inline-flex items-center gap-1.5 ${isSingle ? 'px-3.5 py-1.5 text-xs mb-2.5' : 'px-2.5 py-1 text-[10px] mb-1'} rounded-md border border-slate-300 bg-slate-100 font-mono font-black uppercase tracking-wider text-slate-800`}>
              <span>{isKu ? 'پسوڵەی ناردنی داواکاری کڕیار' : 'CUSTOMER ORDER DISPATCH SLIP'}</span>
            </div>
            <h1 className={`${isSingle ? 'text-2xl sm:text-3xl' : 'text-base'} font-black tracking-tight text-slate-900 uppercase`}>
              Bako&apos;s Panel Manager
            </h1>
            <div className={`${isSingle ? 'text-xs mt-1' : 'text-[11px] mt-0.5'} font-bold text-slate-500 uppercase tracking-wider`}>
              {isKu ? 'پەسەندکردنی داواکاری و ناردنی تەختە' : 'Client Reservation & Fulfillment Ticket'}
            </div>
          </div>
          <div className="text-end shrink-0">
            <div className={`font-mono ${isSingle ? 'text-base px-4 py-1.5' : 'text-xs px-2 py-0.5'} font-black text-slate-900 bg-slate-100 rounded-lg border border-slate-300`}>
              {isKu ? `داواکاری #${ord.orderNumber}` : `ORDER #${ord.orderNumber}`}
            </div>
            <div dir="ltr" className={`${isSingle ? 'text-xs pt-2' : 'text-[10px] pt-1'} font-mono text-slate-500 text-end`}>
              {currentDateTime || formatDateTime()}
            </div>
          </div>
        </div>

        {/* Customer & Panel Info Card */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
            <div className="text-[10px] font-black uppercase text-slate-500">{isKu ? 'زانیاری کڕیار' : 'Customer Info'}</div>
            <div className="text-lg font-black text-slate-900">{ord.client}</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-1 text-right">
            <div className="text-[10px] font-black uppercase text-slate-500">{isKu ? 'بڕی ناردن' : 'Quantity To Dispatch'}</div>
            <div className="text-2xl font-black text-emerald-700 font-mono">{ord.quantity} pcs</div>
            <div className="text-xs font-bold uppercase text-slate-600">
              {ord.status === 'finalized' ? (isKu ? 'تەواوکراو' : 'Finalized') : (isKu ? 'گیراو' : 'Reserved')}
            </div>
          </div>
        </div>

        {/* Assigned Material Box */}
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl mb-4 space-y-1.5 font-mono">
          <div className="text-[10px] font-black uppercase text-slate-500">{isKu ? 'تەختەی دیاریکراو لە کۆگا' : 'Assigned Warehouse Panel'}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm bg-white px-2.5 py-0.5 rounded border border-slate-300">#{mat.code}</span>
            <span className="font-black text-base text-slate-900">{mat.name}</span>
            <span className="text-xs text-slate-600">({mat.type})</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-slate-800">{mat.dimensions.formatted}</span>
          </div>
        </div>

        {ord.notes && (
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl mb-4 text-xs">
            <div className="text-[10px] font-black uppercase text-slate-500 mb-1">{isKu ? 'تێبینی' : 'Notes'}</div>
            <div className="text-slate-800 whitespace-pre-wrap">{ord.notes}</div>
          </div>
        )}

        <div dir="ltr" className={`${isSingle ? 'mt-6 pt-4 text-xs' : 'mt-4 pt-2.5 text-[11px]'} border-t border-slate-300 flex items-center justify-between text-slate-500 font-medium select-none`}>
          <div>Engineered & Maintained by Bako Bayan Madhhar — Version 1.3</div>
          <div className="font-mono font-bold">Contact: 07705488654</div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors w-full max-w-full overflow-x-hidden">
      {/* Global Ambient Background Motion Elements (Subtle & Clean on White Primary) */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 no-print" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[460px] h-[460px] rounded-full bg-emerald-500/[0.035] dark:bg-emerald-500/[0.08] blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-sky-500/[0.03] dark:bg-sky-500/[0.07] blur-3xl animate-float-reverse" />
      </div>

      {/* Universal Master Header */}
      <Header
        onOpenNewOrder={() => handleOpenOrderModal()}
        onPrint={handleTriggerPrint}
      />

      {/* When inside Wood Panels or Orders, render the Section Switcher & Print Customizer Bar */}
      {(currentModule === 'panels' || currentModule === 'orders') && (
        <div className="bg-white/80 dark:bg-slate-850/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 select-none no-print print:hidden w-full max-w-full box-border">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Segmented Section Tabs: Panels vs Orders */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                {/* Panels Section Tab */}
                <button
                  onClick={() => setCurrentModule('panels')}
                  className={`flex-1 sm:flex-initial h-9 flex items-center justify-center gap-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    currentModule === 'panels'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>{t.panelsSection}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      currentModule === 'panels'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {materials.length}
                  </span>
                </button>

                {/* Orders Section Tab */}
                <button
                  onClick={() => setCurrentModule('orders')}
                  className={`flex-1 sm:flex-initial h-9 flex items-center justify-center gap-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    currentModule === 'orders'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PackageCheck className="w-4 h-4 shrink-0" />
                  <span>{t.ordersSection}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                      currentModule === 'orders'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {stats.totalOrders}
                  </span>
                </button>
              </div>

              {/* Undo & Redo Controls (Hidden for Viewers) */}
              {!isViewer && (
                <div className="flex items-center h-9 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="h-full px-2.5 rounded-lg text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Undo</span>
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="h-full px-2.5 rounded-lg text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Redo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Print & Visual Charts Options */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 ms-auto flex-wrap">
              {/* Visual Charts Modal Trigger for Panels & Orders */}
              <button
                type="button"
                onClick={() => openVisualCharts('panels')}
                className="h-9 flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 px-3 rounded-xl font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                title={language === 'ku' ? 'چارت و شیکاری تەختە و داواکارییەکان' : 'View Wood Panels & Orders Visual Charts'}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'ku' ? 'چارتەکان' : 'Charts'}</span>
              </button>

              {/* Batch Print Selector Button */}
              {(() => {
                const queuedPanels = selectedPrintQueue.filter((q) => q.type === 'panel').length;
                const queuedOrders = selectedPrintQueue.filter((q) => q.type === 'order').length;
                return (
                  <button
                    onClick={() => setIsBatchPrintModalOpen(true)}
                    className="h-9 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 rounded-xl font-bold text-xs shadow-2xs cursor-pointer transition-colors"
                    title="Select multiple panels and orders to print simultaneously"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{language === 'ku' ? 'هەڵبژاردنی چەندین بۆ چاپ' : 'Select Multiple'}</span>
                    {selectedPrintQueue.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-mono font-black border border-white/20">
                        {queuedPanels > 0 && queuedOrders > 0
                          ? `${queuedPanels}P • ${queuedOrders}O`
                          : queuedPanels > 0
                          ? `${queuedPanels}P`
                          : `${queuedOrders}O`}
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* Print Scope Selector */}
              <select
                value={printScope}
                onChange={(e) => setPrintScope(e.target.value as PrintScope)}
                className="h-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                title="Select what to print"
              >
                {selectedPrintQueue.length > 0 && (
                  <option value="batch-selection">
                    {language === 'ku'
                      ? `هەڵبژێردراوەکان: ${selectedPrintQueue.filter((q) => q.type === 'panel').length} تەختە، ${selectedPrintQueue.filter((q) => q.type === 'order').length} داواکاری`
                      : `Batch: ${selectedPrintQueue.filter((q) => q.type === 'panel').length} Panels, ${selectedPrintQueue.filter((q) => q.type === 'order').length} Orders`}
                  </option>
                )}
                <option value="all">{language === 'ku' ? 'هەموو پەڕەکان (تەختە و داواکاری)' : 'All (Panel & Order Slips)'}</option>
                <option value="panels">{t.panels} ({t.panelSlip})</option>
                <option value="orders">{t.orders} ({t.orderSlip})</option>
                <option value="individual-panels">{t.printIndividualPanels}</option>
                <option value="individual-orders">{t.printIndividualOrders}</option>
              </select>

              <span className="hidden md:inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.printImages}:</span>
              </span>
              <select
                value={printImageSize}
                onChange={(e) => setPrintImageSize(e.target.value as 'none' | 'small' | 'medium' | 'large')}
                className="h-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                title="Control photo size when printing"
              >
                <option value="none">{t.noImages}</option>
                <option value="small">{t.smallImages}</option>
                <option value="medium">{t.mediumImages}</option>
                <option value="large">Large Photos</option>
              </select>

              <button
                onClick={handleTriggerPrint}
                className="h-9 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3.5 rounded-xl font-bold shadow-2xs cursor-pointer transition-colors"
                title={t.print}
              >
                <Printer className="w-4 h-4" />
                <span>{t.print}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Main Workspace Container */}
      <main className="flex-1 flex flex-col w-full max-w-full min-h-0 pb-16 sm:pb-14 no-print print:hidden">
        {currentModule === 'hub' && (
          <ModuleHub
            onOpenBatchPrint={() => setIsBatchPrintModalOpen(true)}
          />
        )}

        {currentModule === 'panels' && (
          hasModulePermission('panels') ? (
            effectiveMode === 'pc' ? (
              <ExcelGrid
                onOpenOrderModal={handleOpenOrderModal}
                onOpenMaterialModal={handleOpenMaterialModal}
                onSelectOrderForDetails={setSelectedOrderForDetails}
                onPrintIndividualItem={handlePrintIndividual}
                selectedPrintItemIds={new Set(selectedPrintQueue.map((q) => q.id))}
                onTogglePrintQueueItem={handleTogglePrintQueueItem}
                onNavigateToOrders={() => setCurrentModule('orders')}
              />
            ) : (
              <MobileView
                onOpenOrderModal={handleOpenOrderModal}
                onOpenMaterialModal={handleOpenMaterialModal}
                onSelectOrderForDetails={setSelectedOrderForDetails}
                onPrintIndividualItem={handlePrintIndividual}
                selectedPrintItemIds={new Set(selectedPrintQueue.map((q) => q.id))}
                onTogglePrintQueueItem={handleTogglePrintQueueItem}
                onNavigateToOrders={() => setCurrentModule('orders')}
              />
            )
          ) : (
            <AccessDeniedView
              moduleName={language === 'ku' ? 'تەختەکان و بڕینی وەرشە' : 'Wood Panels & Workshop Cutting'}
              onReturn={() => setCurrentModule('hub')}
              language={language}
            />
          )
        )}

        {currentModule === 'orders' && (
          hasModulePermission('orders') ? (
            <OrdersSection
              onOpenOrderModal={handleOpenOrderModal}
              onSelectOrderForDetails={setSelectedOrderForDetails}
              onPrintIndividualItem={handlePrintIndividual}
              selectedPrintItemIds={new Set(selectedPrintQueue.map((q) => q.id))}
              onTogglePrintQueueItem={handleTogglePrintQueueItem}
            />
          ) : (
            <AccessDeniedView
              moduleName={language === 'ku' ? 'داواکاری کڕیاران و مەخزەن' : 'Order Allocations & Workshop Reservations'}
              onReturn={() => setCurrentModule('hub')}
              language={language}
            />
          )
        )}

        {currentModule === 'sales' && (
          hasModulePermission('sales') ? (
            <SalesSection />
          ) : (
            <AccessDeniedView
              moduleName={language === 'ku' ? 'فرۆشتن و پسوولەی کاش (POS)' : 'Sales POS, Invoicing & Debt Ledger'}
              onReturn={() => setCurrentModule('hub')}
              language={language}
            />
          )
        )}

        {(currentModule === 'goods' || currentModule === 'shipping') && (
          ((currentModule === 'goods' && hasModulePermission('goods')) ||
           (currentModule === 'shipping' && hasModulePermission('shipping')) ||
           hasModulePermission('goods') ||
           hasModulePermission('shipping')) ? (
            <WarehouseGoodsSection />
          ) : (
            <AccessDeniedView
              moduleName={language === 'ku' ? 'کەلوپەل و لۆجستی کۆگا' : 'Warehouse Goods & Logistics'}
              onReturn={() => setCurrentModule('hub')}
              language={language}
            />
          )
        )}

        {currentModule === 'audit' && (
          hasModulePermission('audit') ? (
            <AuditBackupsSection />
          ) : (
            <AccessDeniedView
              moduleName={language === 'ku' ? 'داتابەیس و چاودێری سیستەم' : 'Database Backups & Audit Trail'}
              onReturn={() => setCurrentModule('hub')}
              language={language}
            />
          )
        )}
      </main>

      {/* Understated Universal Footer Attribution */}
      <FooterAttribution />

      {/* Universal Modals */}
      <MaterialModal
        isOpen={isMaterialModalOpen}
        materialToEdit={materialToEdit}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setMaterialToEdit(null);
        }}
      />

      <OrderModal
        isOpen={isOrderModalOpen}
        preselectedMaterialId={orderModalMatId}
        orderToEdit={orderToEdit}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderToEdit(null);
        }}
      />

      <OrderDetailsModal
        isOpen={!!selectedOrderForDetails}
        data={selectedOrderForDetails}
        onClose={() => setSelectedOrderForDetails(null)}
        onEdit={(materialId, ord) => {
          setSelectedOrderForDetails(null);
          handleOpenOrderModal(materialId, { materialId, order: ord });
        }}
        onFinalize={(materialId, orderId) => {
          finalizeOrder(materialId, orderId);
          setSelectedOrderForDetails(null);
        }}
        onDelete={(materialId, orderId) => {
          deleteOrder(materialId, orderId);
          setSelectedOrderForDetails(null);
        }}
        onPrintIndividualItem={handlePrintIndividual}
      />

      <ImageViewerModal
        imageUrl={zoomedImage?.url || null}
        title={zoomedImage?.title}
        onClose={() => setZoomedImage(null)}
      />

      <ConfirmModal dialog={confirmDialog} onClose={closeConfirm} />

      <BatchPrintModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        materials={materials}
        allFlattenedOrders={allFlattenedOrders}
        selectedQueue={selectedPrintQueue}
        onUpdateQueue={setSelectedPrintQueue}
        onConfirmPrint={handleConfirmBatchPrint}
        language={language}
      />

      {/* Standalone Visual Charts & Analytics Engine Modal */}
      <VisualChartsModal />

      {/* Statutory Copyright, Intellectual Property & Project Commissioning Modal */}
      <CopyrightModal />

      {/* Dedicated High-Fidelity Slip Print View */}
      <div className="hidden print:block print:w-full bg-white text-slate-900 font-sans text-xs p-0 print-sheet-root">
        {selectedPrintQueue.length > 0 ? (
          <div>
            {selectedPrintQueue.map((item, index) => {
              if (item.type === 'panel') {
                return renderPanelSlip(item.material, false, index + 1, selectedPrintQueue.length);
              } else if (item.order) {
                return renderOrderSlip(item.order, item.material, false, index + 1, selectedPrintQueue.length);
              }
              return null;
            })}
          </div>
        ) : individualPrintTarget ? (
          <div>
            {individualPrintTarget.type === 'panel' && individualPrintTarget.material && (
              renderPanelSlip(individualPrintTarget.material, false)
            )}
            {individualPrintTarget.type === 'order' && individualPrintTarget.order && individualPrintTarget.material && (
              renderOrderSlip(individualPrintTarget.order, individualPrintTarget.material, false)
            )}
          </div>
        ) : (
          <div>
            {shouldPrintPanels &&
              materials.map((m, idx) =>
                renderPanelSlip(m, printScope === 'individual-panels', idx + 1, materials.length)
              )}
            {shouldPrintOrders &&
              allFlattenedOrders.map(({ order, material }, idx) =>
                renderOrderSlip(order, material, printScope === 'individual-orders', idx + 1, allFlattenedOrders.length)
              )}
            {!shouldPrintPanels && !shouldPrintOrders && (
              <div className="text-center py-12 text-slate-400">
                No items to print.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono font-bold text-xs text-slate-500 tracking-wide">
            Loading Modular Operations Platform...
          </span>
        </div>
      </div>
    );
  }

  return (
    <InventoryProvider>
      <WarehouseApp />
    </InventoryProvider>
  );
}
