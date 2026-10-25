'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ReceiptText, 
  X, 
  Printer, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Check, 
  Maximize2,
  Phone,
  Eye,
  EyeOff,
  AlertTriangle,
  Minimize2,
  Share2
} from 'lucide-react';
import { PanelTransaction } from '@/types/inventory';
import { useInventory } from '../context/InventoryContext';

export interface PrintableImageItem {
  id: string;
  url: string;
  width: number; // in pixels (e.g., 90 to 540)
  align: 'left' | 'center' | 'right';
  source: 'order' | 'custom';
  title?: string;
  included: boolean; // OPTIONAL toggle: user can attach or exclude at will!
}

interface PrintInvoiceModalProps {
  tx: PanelTransaction | null;
  onClose: () => void;
  formatMoney: (val: number, cur?: any) => string;
  lang: 'en' | 'ku';
  isDark: boolean;
}

export default function PrintInvoiceModal({
  tx,
  onClose,
  formatMoney,
  lang,
  isDark
}: PrintInvoiceModalProps) {
  const { printInvoiceJob } = useInventory();

  // 1. Initial image list with optional attachment toggle
  const [images, setImages] = useState<PrintableImageItem[]>([]);
  const [isImageDrawerOpen, setIsImageDrawerOpen] = useState(false);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mouse drag-to-resize state (Zero lag, no scrollbars!)
  const [resizingImgId, setResizingImgId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ startX: number; startWidth: number; id: string } | null>(null);

  // Print Format: "a4" (Standard Full Voucher) or "thermal80" (80mm ESC/POS thermal counter printer)
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal80'>('a4');

  // Client hydration check for React Portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe standard A4 page printable height in screen pixels (~960px)
  const PAGE_HEIGHT_PX = 960;
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [invoiceHeight, setInvoiceHeight] = useState<number>(0);

  // Dynamic calculation: whether order content fits on 1 page or splits into 2+ pages
  const isSinglePage = invoiceHeight > 0 && invoiceHeight <= PAGE_HEIGHT_PX;
  const pageCount = invoiceHeight > 0 ? Math.max(1, Math.ceil(invoiceHeight / PAGE_HEIGHT_PX)) : 1;

  // Real-time measurement of invoice height as images resize, load, or are added/removed
  useEffect(() => {
    const el = invoiceRef.current;
    if (!el) return;

    const measure = () => {
      if (invoiceRef.current) {
        setInvoiceHeight(invoiceRef.current.scrollHeight);
      }
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(el);
    }

    const imgs = el.querySelectorAll('img');
    imgs.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', measure, { once: true });
      }
    });

    return () => {
      if (ro) ro.disconnect();
    };
  }, [tx, images]);

  // Manage print class on body
  useEffect(() => {
    if (tx) {
      document.body.classList.add('invoice-print-active');
      if (printFormat === 'thermal80') {
        document.body.classList.add('invoice-print-thermal');
      } else {
        document.body.classList.remove('invoice-print-thermal');
      }
      return () => {
        document.body.classList.remove('invoice-print-active');
        document.body.classList.remove('invoice-print-thermal');
      };
    }
  }, [tx, printFormat]);

  // 1-click helper: auto-shrink images to fit within 1 page
  const handleFitToOnePage = () => {
    setImages(prev => prev.map(img => {
      if (!img.included) return img;
      return { ...img, width: Math.min(img.width, 110) };
    }));
  };

  // Sync images when transaction changes - order photos are OPTIONAL
  useEffect(() => {
    if (tx && tx.images && tx.images.length > 0) {
      setImages(
        tx.images.map((imgUrl, index) => ({
          id: `order-img-${index}-${Date.now()}`,
          url: imgUrl,
          width: 180,
          align: 'center',
          source: 'order',
          title: `Order Photo #${index + 1}`,
          included: true // Optional: user can easily toggle off!
        }))
      );
    } else {
      setImages([]);
    }
  }, [tx]);

  // Mouse drag resize tracking
  const handleStartResize = (e: React.MouseEvent, imgId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingImgId(imgId);
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: currentWidth,
      id: imgId
    };
  };

  useEffect(() => {
    if (!resizingImgId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const { startX, startWidth, id } = resizeStartRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(90, Math.min(560, Math.round(startWidth + delta)));
      setImages(prev => prev.map(item => item.id === id ? { ...item, width: newWidth } : item));
    };

    const handleMouseUp = () => {
      setResizingImgId(null);
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingImgId]);

  // Global Escape key listener to guarantee user can ALWAYS exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!tx || !mounted) return null;

  const handlePrint = () => {
    const includedImages = images.filter(i => i.included).map(i => i.url);
    const updatedTx = { ...tx, images: includedImages };
    printInvoiceJob(updatedTx, printFormat);
  };

  const handleWhatsAppShare = () => {
    if (!tx) return;
    const itemsText = tx.items && tx.items.length > 0
      ? tx.items.map(it => `• ${it.product || it.type} (${it.quantity}) - ${formatMoney(it.price * it.quantity, tx.currency || tx.chargedCurrency)}`).join('\n')
      : `• ${tx.material || tx.panelType} (${tx.quantity} ${tx.unit || ''}) - ${formatMoney(tx.sellingAmount, tx.currency || tx.chargedCurrency)}`;
    
    const text = `*وەسڵی فرۆشتن / Sales Invoice*
*کۆد:* ${tx.code || tx.id.slice(-4)}
*کڕیار:* ${tx.seller || 'کڕیاری بەڕێز'}
*بەروار:* ${invoiceDateStr}

*کاڵاکان:*
${itemsText}

*کۆی گشتی:* ${formatMoney(tx.totalAfterDiscount || tx.sellingAmount, tx.currency || tx.chargedCurrency)}
*پارەی دراو:* ${formatMoney(tx.amountPaidNow || 0, tx.currency || tx.chargedCurrency)}
*قەرزی ماوە:* ${formatMoney(tx.combinedTotalDebt || tx.amountOwed || 0, tx.currency || tx.chargedCurrency)}

کۆمپانیای شەسواری ئەحمەد شەسوار
Bako's Master System`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Upload an additional unrelated image
  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newImg: PrintableImageItem = {
            id: `custom-img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            url: dataUrl,
            width: 180,
            align: 'center',
            source: 'custom',
            title: file.name || 'Additional Image',
            included: true
          };
          setImages(prev => [...prev, newImg]);
          setActiveImageId(newImg.id);
          setIsImageDrawerOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleImageIncluded = (id: string) => {
    setImages(prev => prev.map(item => item.id === id ? { ...item, included: !item.included } : item));
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(item => item.id !== id));
    if (activeImageId === id) setActiveImageId(null);
  };

  const updateImageWidth = (id: string, width: number) => {
    setImages(prev => prev.map(item => item.id === id ? { ...item, width } : item));
  };

  const updateImageAlign = (id: string, align: 'left' | 'center' | 'right') => {
    setImages(prev => prev.map(item => item.id === id ? { ...item, align } : item));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
  };

  const printableImages = images.filter(img => img.included);

  const invoiceDateStr = new Date(tx.timestamp).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const modalContent = (
    <div 
      id="print-invoice-modal-backdrop"
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        // Clicking backdrop directly exits modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ========================================================================= */}
      {/* FLOATING TOP-RIGHT EMERGENCY CLOSE BUTTON (Guaranteed Exit at all times)  */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-[120] p-2.5 rounded-full bg-slate-900/90 text-white hover:bg-rose-600 shadow-2xl border border-white/20 flex items-center gap-1.5 text-xs font-black transition active:scale-95 print-hide"
        title="Exit Invoice (Esc)"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Exit (Esc)</span>
      </button>

      {/* ========================================================================= */}
      {/* MODAL DIALOG CONTAINER                                                    */}
      {/* ========================================================================= */}
      <div 
        className="w-full max-w-2xl max-h-[85dvh] sm:max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border overflow-hidden transition-all bg-white text-slate-900 border-slate-200 dark:bg-[#272a33] dark:text-zinc-100 dark:border-[#3b3f4d] print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:overflow-visible print:bg-white print:text-black my-0 sm:my-auto pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0 print-hide" />
        
        {/* ========================================================================= */}
        {/* 1. TOP CONTROL BAR (Screen Only - Bright, Ultra-Visible Print & Close)    */}
        {/* ========================================================================= */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-inherit bg-[#1e293b] text-white print-hide">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <ReceiptText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {lang === 'en' ? 'Official Receipt Preview' : 'پێشبینینی پسوولەی فەرمی'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-300 font-mono">
                  Order #{tx.code || tx.id.slice(-4)}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                {isSinglePage ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'en' ? 'Fits on 1 Page' : '١ پەڕەیە'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 text-[10px] font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>
                      {lang === 'en' 
                        ? `Will Split: ${pageCount} Pages` 
                        : `دەبێتە ${pageCount} پەڕە`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Switcher: A4 Voucher vs 80mm Thermal ESC/POS */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Standard A4 Voucher"
              >
                A4 Voucher
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal80')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  printFormat === 'thermal80'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="80mm Thermal Receipt (ESC/POS)"
              >
                80mm Thermal
              </button>
            </div>

            {/* Toggle Image Manager Drawer */}
            <button
              type="button"
              onClick={() => setIsImageDrawerOpen(!isImageDrawerOpen)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                isImageDrawerOpen 
                  ? 'bg-blue-600 text-white border-blue-400' 
                  : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
              }`}
              title="Add or resize images for print"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'en' ? 'Images' : 'وێنە'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                {images.length}
              </span>
            </button>

            {/* WhatsApp 1-Tap Sharing */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
              title="Send via WhatsApp (ناردن بۆ وەتسئەپ)"
            >
              <Share2 className="w-4 h-4" />
              <span>{lang === 'en' ? 'WhatsApp' : 'ناردن بۆ وەتسئەپ'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition"
              title="Print to Paper or PDF (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'en' ? 'Print Now' : 'چاپ'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 border border-slate-600 text-slate-200 hover:text-white transition active:scale-95"
              title="Close / Exit (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. INTERACTIVE IMAGE MANAGER DRAWER (Add, Resize, Align & Move Images)    */}
        {/* ========================================================================= */}
        {isImageDrawerOpen && (
          <div className="shrink-0 p-3.5 border-b border-inherit bg-slate-50 dark:bg-[#20222a] text-xs space-y-3 print-hide">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span>{lang === 'en' ? 'Printout Photos (Order & Custom)' : 'وێنەی سەر پسوولە'}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 font-mono">
                  ({printableImages.length}/{images.length} printed)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Bulk Select/Deselect */}
                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIncluded = images.every(i => i.included);
                      setImages(prev => prev.map(i => ({ ...i, included: !allIncluded })));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold transition"
                  >
                    {images.every(i => i.included) 
                      ? (lang === 'en' ? 'Exclude All' : 'لابردنی هەمووی') 
                      : (lang === 'en' ? 'Include All' : 'دیاریکردنی هەمووی')}
                  </button>
                )}

                {/* Upload custom additional image button */}
                <label className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? '+ Add Extra Photo' : '+ زیادکردنی وێنەی تر'}</span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleUploadCustomImage} 
                  />
                </label>
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-slate-400 italic text-[11px] py-1">
                {lang === 'en' ? 'No images added yet. Click "+ Add Extra Photo" to add any receipt, signature, or product photo.' : 'هیچ وێنەیەک زیاد نەکراوە. کلیک لە "+ زیادکردنی وێنەی تر" بکە.'}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {images.map((img, idx) => (
                    <div 
                      key={img.id}
                      onClick={() => setActiveImageId(img.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                        activeImageId === img.id
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-[#3b3f4d] bg-white dark:bg-[#272a33]'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={img.url} alt="Thumbnail" className="w-10 h-10 object-cover rounded-lg shrink-0 border border-inherit" />
                        <div className="truncate">
                          <span className="font-bold block truncate text-xs">{img.title || `Image #${idx + 1}`}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {img.width}px • {img.align} • {img.source === 'order' ? (lang === 'en' ? 'Order' : 'داواکاری') : (lang === 'en' ? 'Extra' : 'زیادە')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle include/exclude */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleImageIncluded(img.id); }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                            img.included
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-slate-200/50 text-slate-400 border-slate-300 dark:bg-slate-700 dark:text-zinc-400 line-through'
                          }`}
                          title={img.included ? 'Included in print (click to exclude)' : 'Excluded from print (click to include)'}
                        >
                          {img.included ? <Check className="w-3 h-3 text-emerald-500" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                          <span>{img.included ? (lang === 'en' ? 'Print' : 'چاپ دەبێت') : (lang === 'en' ? 'Skip' : 'لابراو')}</span>
                        </button>

                        {/* Move Up/Down */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, 'up'); }}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#343845] disabled:opacity-30 text-slate-600 dark:text-zinc-300"
                          title="Move Up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, 'down'); }}
                          disabled={idx === images.length - 1}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#343845] disabled:opacity-30 text-slate-600 dark:text-zinc-300"
                          title="Move Down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        {/* Remove Image */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="p-1 rounded hover:bg-rose-100 text-rose-500"
                          title="Remove from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Controls for currently selected image */}
                {activeImageId && (() => {
                  const activeImg = images.find(i => i.id === activeImageId);
                  if (!activeImg) return null;
                  return (
                    <div className="p-2.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100">
                      {/* Resize Slider & Quick Buttons */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                          {lang === 'en' ? 'Size / قەبارە:' : 'قەبارە:'}
                        </span>
                        <input
                          type="range"
                          min="80"
                          max="480"
                          step="10"
                          value={activeImg.width}
                          onChange={(e) => updateImageWidth(activeImg.id, Number(e.target.value))}
                          className="w-28 accent-blue-600"
                        />
                        <span className="font-mono font-bold text-[11px]">{activeImg.width}px</span>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 ml-1">
                          {[100, 160, 240, 360].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updateImageWidth(activeImg.id, w)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                activeImg.width === w 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {w === 100 ? 'S' : w === 160 ? 'M' : w === 240 ? 'L' : 'XL'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Alignment */}
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                          {lang === 'en' ? 'Align / جێگە:' : 'جێگە:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateImageAlign(activeImg.id, 'left')}
                          className={`p-1 rounded border ${activeImg.align === 'left' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800'}`}
                          title="Align Left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateImageAlign(activeImg.id, 'center')}
                          className={`p-1 rounded border ${activeImg.align === 'center' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800'}`}
                          title="Align Center"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateImageAlign(activeImg.id, 'right')}
                          className={`p-1 rounded border ${activeImg.align === 'right' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800'}`}
                          title="Align Right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SCROLLABLE PREVIEW & PRINTABLE INVOICE BODY                              */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-[#1a1c23] print:p-0 print:bg-white print:overflow-visible">
          
          {/* Format Notice: 80mm ESC/POS Thermal Receipt Layout */}
          {printFormat === 'thermal80' ? (
            <div 
              id="printable-invoice" 
              ref={invoiceRef}
              className="w-[80mm] max-w-[80mm] mx-auto p-3.5 text-black bg-white rounded-none shadow-md border border-slate-300 font-mono text-[11px] leading-snug print:p-0 print:m-0 print:text-[10.5px] print:leading-tight print:shadow-none print:border-none print:w-[72mm] print:max-w-[72mm] relative select-text"
            >
              {/* Thermal Header */}
              <div className="text-center pb-2.5 mb-2.5 border-b-2 border-dashed border-black">
                <h2 className="text-base font-black uppercase tracking-wider text-black">
                  BAKO&apos;S MASTER SYSTEM
                </h2>
                <p className="text-[11px] font-bold text-black mt-0.5">
                  Shaswar Ahmad Shaswar Co.
                </p>
                <p className="text-[10.5px] font-semibold text-black mt-0.5">
                  Official Contact: 07705488654
                </p>
                <div className="text-[10px] font-black uppercase tracking-widest mt-1.5 border-t border-black pt-1">
                  SALES RECEIPT / پسوولەی فرۆشتن
                </div>
              </div>

              {/* Thermal Meta */}
              <div className="text-[10px] space-y-0.5 pb-2 mb-2 border-b border-dashed border-black font-mono">
                <div className="flex justify-between">
                  <span>INV: #{tx.code || tx.id.slice(-6)}</span>
                  <span>{invoiceDateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>SELLER: {tx.seller || 'Bako Bayan'}</span>
                  <span>PAY: {tx.paymentType || 'Cash'}</span>
                </div>
                <div className="flex justify-between">
                  <span>CURRENCY: {tx.currency || 'USD'}</span>
                  {tx.bank && <span>BANK: {tx.bank}</span>}
                </div>
              </div>

              {/* Thermal Items Table */}
              <div className="pb-2 mb-2 border-b-2 border-dashed border-black">
                <div className="flex justify-between text-[10px] font-black border-b border-black pb-1 mb-1">
                  <span className="w-1/2">ITEM</span>
                  <span className="w-10 text-center">QTY</span>
                  <span className="w-16 text-right">PRICE</span>
                  <span className="w-16 text-right">TOTAL</span>
                </div>
                {tx.items && tx.items.length > 0 ? (
                  tx.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-[10px] py-0.5">
                      <div className="w-1/2 font-bold truncate">
                        {it.product || it.type}
                      </div>
                      <div className="w-10 text-center font-bold">{it.quantity}</div>
                      <div className="w-16 text-right">{formatMoney(it.price, tx.currency)}</div>
                      <div className="w-16 text-right font-black">{formatMoney(it.total, tx.currency)}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-start text-[10px] py-0.5">
                    <div className="w-1/2 font-bold truncate">{tx.material || tx.panelType}</div>
                    <div className="w-10 text-center font-bold">{tx.quantity}</div>
                    <div className="w-16 text-right">{formatMoney(tx.sellingAmount / (tx.quantity || 1), tx.currency)}</div>
                    <div className="w-16 text-right font-black">{formatMoney(tx.sellingAmount, tx.currency)}</div>
                  </div>
                )}
              </div>

              {/* Thermal Financial Breakdown */}
              <div className="text-[10.5px] space-y-1 pb-2 mb-2 border-b-2 border-dashed border-black font-mono">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{formatMoney(tx.sellingAmount, tx.currency)}</span>
                </div>
                {tx.discountDollars !== undefined && tx.discountDollars > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>DISCOUNT:</span>
                    <span>-{formatMoney(tx.discountDollars, tx.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black border-t border-black pt-1">
                  <span>TOTAL NET:</span>
                  <span>{formatMoney(tx.totalAfterDiscount, tx.currency)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>PAID NOW:</span>
                  <span>{formatMoney(tx.amountPaidNow || 0, tx.currency)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>REMAINING DEBT:</span>
                  <span>{formatMoney(tx.combinedTotalDebt || 0, tx.currency)}</span>
                </div>
              </div>

              {/* Thermal Notes */}
              {tx.notes && (
                <div className="text-[10px] pb-2 mb-2 border-b border-dashed border-black break-words font-mono">
                  <span className="font-bold">NOTES: </span>
                  <span>{tx.notes}</span>
                </div>
              )}

              {/* Thermal Attached Photos */}
              {printableImages.length > 0 && (
                <div className="space-y-2 pb-2 mb-2 border-b border-dashed border-black">
                  {printableImages.map((img) => (
                    <div key={img.id} className="text-center">
                      <img src={img.url} alt="Receipt attachment" className="w-full max-w-[68mm] mx-auto filter grayscale contrast-150" />
                    </div>
                  ))}
                </div>
              )}

              {/* Thermal Cut Line & Footer */}
              <div className="text-center text-[9.5px] pt-1.5 space-y-1 font-mono">
                <p className="font-black uppercase tracking-wider">THANK YOU FOR YOUR BUSINESS</p>
                <p>Bako&apos;s Master System • v{APP_CONFIG.version}</p>
                <div className="pt-2 text-center text-[9px] text-slate-700 font-mono">
                  - - - - - - - - - - - - - - - - - - - - - - - -
                  <span className="block mt-0.5 font-bold">[ CUT HERE / لێرە بیبڕە ]</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Warning Banner when contents exceed 1 page (A4 layout) */}
              {!isSinglePage && invoiceHeight > 0 && (
                <div className="max-w-xl mx-auto mb-3 p-3 rounded-xl bg-amber-500/15 dark:bg-amber-950/50 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-xs print-hide animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold leading-tight">
                      {lang === 'en' 
                        ? `Notice: Order contents won't fit on 1 page and will split onto ${pageCount} pages (large images or long notes).` 
                        : `ئاگاداری: بەهۆی گەورەیی وێنەکان یان تێبینی، چاپەکە دەبێتە ${pageCount} پەڕە.`}
                    </span>
                  </div>
                  {printableImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleFitToOnePage}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                      title="Automatically shrink images so order fits on 1 page"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Shrink to 1 Page' : 'بیکە بە ١ پەڕە'}</span>
                    </button>
                  )}
                </div>
              )}

              <div 
                id="printable-invoice" 
                ref={invoiceRef}
                className="print-section-active w-full max-w-xl mx-auto p-6 sm:p-7 text-slate-900 bg-white rounded-xl shadow-md border border-slate-200 text-xs print:p-0 print:m-0 print:text-[11px] print:leading-tight print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none relative"
              >
                {/* Visual Page Break Marker in Screen Preview (only when height > 960px) */}
                {!isSinglePage && invoiceHeight > PAGE_HEIGHT_PX && (
                  <div 
                    className="absolute left-0 right-0 pointer-events-none flex items-center justify-center print-hide z-20"
                    style={{ top: `${PAGE_HEIGHT_PX}px` }}
                  >
                    <div className="w-full border-t-2 border-dashed border-amber-500/80 relative">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-md whitespace-nowrap">
                        {lang === 'en' ? '✂ PAGE 1 ENDS HERE • PAGE 2 STARTS' : '✂ کۆتایی پەڕەی ١ • دەستپێکی پەڕەی ٢'}
                      </span>
                    </div>
                  </div>
                )}

            {/* Header: Company Name, Voucher title, Code, Date & Time (Region removed) */}
            <div className="flex items-start justify-between border-b pb-3 mb-3 border-slate-300 print-avoid-break">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                  BAKO&apos;S INVENTORY MANAGER
                </h2>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                  بەڕێوەبەری کۆگای باکۆ • Shaswar Ahmad Shaswar Co.
                </p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                  Official Sales Voucher / پسوولەی فەرمی فرۆشتن
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-sm sm:text-base text-blue-700 block">
                  #{tx.code || tx.id.slice(-4)}
                </span>
                <div className="mt-1 text-[11px] text-slate-600 font-semibold">
                  <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Date & Time:</span>
                  <span>{invoiceDateStr}</span>
                </div>
              </div>
            </div>

            {/* Quick Meta Strip: Seller, Bank, Method, Currency */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 mb-3 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Seller / فرۆشیار:</span>
                <span className="font-bold text-slate-800">{tx.seller || 'Bako Bayan'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Method / شێواز:</span>
                <span className="font-bold text-slate-800">{tx.paymentType || 'Cash'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Bank / بانک:</span>
                <span className="font-bold text-slate-800">{tx.bank || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Currency / دراو:</span>
                <span className="font-mono font-bold text-slate-800">{tx.currency || 'USD'}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-black text-[10px] uppercase">
                    <th className="py-1 text-left">Item / کاڵا</th>
                    <th className="py-1 text-center">Qty / ژمارە</th>
                    <th className="py-1 text-center">Type / جۆر</th>
                    <th className="py-1 text-right">Price / نرخ</th>
                    <th className="py-1 text-right">Total / کۆ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tx.items && tx.items.length > 0 ? (
                    tx.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 font-bold text-slate-900">
                          {it.product || it.type}
                          {it.product && it.type && it.product !== it.type && (
                            <span className="text-[10px] font-normal text-slate-500 block">{it.type}</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="py-1.5 text-center text-[10px] text-slate-600">
                          {it.sellingType || tx.sellingType || '-'}
                        </td>
                        <td className="py-1.5 text-right font-mono text-slate-700">
                          {formatMoney(it.price, tx.currency)}
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold text-slate-950">
                          {formatMoney(it.total, tx.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-1.5 font-bold text-slate-900">{tx.material || tx.panelType}</td>
                      <td className="py-1.5 text-center font-mono font-bold">{tx.quantity}</td>
                      <td className="py-1.5 text-center text-[10px] text-slate-600">{tx.sellingType || '-'}</td>
                      <td className="py-1.5 text-right font-mono text-slate-700">
                        {formatMoney(tx.sellingAmount / (tx.quantity || 1), tx.currency)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-950">
                        {formatMoney(tx.sellingAmount, tx.currency)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown (Totals) */}
            <div className="border-t border-slate-300 pt-2 text-xs space-y-1 bg-slate-50/60 p-2.5 rounded-lg">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Subtotal / کۆی سەرەتایی:</span>
                <span className="font-mono">{formatMoney(tx.sellingAmount, tx.currency)}</span>
              </div>

              {tx.discountDollars !== undefined && tx.discountDollars > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Discount / داشکاندن:</span>
                  <span className="font-mono">-{formatMoney(tx.discountDollars, tx.currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1 text-slate-950">
                <span>Total Net / کۆی گشتی:</span>
                <span className="font-mono">{formatMoney(tx.totalAfterDiscount, tx.currency)}</span>
              </div>

              <div className="flex justify-between font-bold text-emerald-700">
                <span>Amount Paid / دراو:</span>
                <span className="font-mono">{formatMoney(tx.amountPaidNow || 0, tx.currency)}</span>
              </div>

              <div className="flex justify-between font-black text-rose-700">
                <span>Remaining Debt / قەرز:</span>
                <span className="font-mono">{formatMoney(tx.combinedTotalDebt || 0, tx.currency)}</span>
              </div>
            </div>

            {/* Notes Section (Never clipped or cut off!) */}
            {tx.notes && (
              <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] overflow-visible">
                <span className="font-bold text-slate-700 block mb-1">Notes / تێبینی:</span>
                <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">{tx.notes}</p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PRINTABLE IMAGES SECTION (User-selected order photos & custom uploads)     */}
            {/* ========================================================================= */}
            {printableImages.length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-200 space-y-3 print-avoid-break">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Attached Photos / وێنەکان ({printableImages.length}):
                  </span>
                  <span className="text-[10px] text-slate-400 print-hide">
                    Drag corner ⤡ to resize • Hover for position controls
                  </span>
                </div>

                <div className="space-y-4">
                  {printableImages.map((img, idx) => (
                    <div 
                      key={img.id}
                      className={`print-image-card relative group flex ${
                        img.align === 'left' 
                          ? 'justify-start' 
                          : img.align === 'right' 
                          ? 'justify-end' 
                          : 'justify-center'
                      }`}
                    >
                      <div 
                        style={{ width: `${img.width}px`, maxWidth: '100%' }}
                        className="relative rounded-lg border border-slate-300 overflow-visible bg-white shadow-xs p-1 transition-all"
                      >
                        {/* Hover Overlay Controls (Screen Only) */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 print-hide whitespace-nowrap">
                          {/* Align buttons */}
                          <button
                            type="button"
                            onClick={() => updateImageAlign(img.id, 'left')}
                            className={`p-1 rounded hover:bg-white/20 ${img.align === 'left' ? 'text-blue-400 font-bold' : 'text-slate-300'}`}
                            title="Align Left"
                          >
                            <AlignLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageAlign(img.id, 'center')}
                            className={`p-1 rounded hover:bg-white/20 ${img.align === 'center' ? 'text-blue-400 font-bold' : 'text-slate-300'}`}
                            title="Align Center"
                          >
                            <AlignCenter className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateImageAlign(img.id, 'right')}
                            className={`p-1 rounded hover:bg-white/20 ${img.align === 'right' ? 'text-blue-400 font-bold' : 'text-slate-300'}`}
                            title="Align Right"
                          >
                            <AlignRight className="w-3 h-3" />
                          </button>
                          <span className="w-px h-3 bg-white/20 mx-0.5" />
                          {/* Move up / down */}
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 'down')}
                            disabled={idx === printableImages.length - 1}
                            className="p-1 rounded hover:bg-white/20 disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                          <span className="w-px h-3 bg-white/20 mx-0.5" />
                          {/* Exclude toggle */}
                          <button
                            type="button"
                            onClick={() => toggleImageIncluded(img.id)}
                            className="p-1 rounded hover:bg-amber-600/50 text-amber-300 flex items-center gap-0.5"
                            title="Exclude from print"
                          >
                            <EyeOff className="w-3 h-3" />
                          </button>
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-1 rounded hover:bg-rose-600 text-rose-300"
                            title="Delete Image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* The Image Itself */}
                        <img 
                          src={img.url} 
                          alt="Invoice attachment" 
                          className="w-full h-auto object-contain rounded select-none pointer-events-none" 
                        />

                        {/* Interactive Drag Corner Handle (Bottom-Right, Zero-Lag Mouse Resizing) */}
                        <div
                          onMouseDown={(e) => handleStartResize(e, img.id, img.width)}
                          className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-ew-resize shadow-md border-2 border-white z-10 print-hide transition active:scale-125 select-none"
                          title="Drag mouse horizontally to resize image without lag!"
                        >
                          <span className="text-[10px] font-black leading-none select-none">⤡</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* OFFICIAL FOOTER CREDITS (Exact requirement from user: Phone logo, no tel) */}
            {/* ========================================================================= */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-center space-y-1 print-avoid-break">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-700">
                Created by Bako&apos;s Inventory Manager. Made specially for Shaswar Ahmad Shaswar Co.
              </p>
              <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1.5 flex-wrap">
                <span>© 2026 Bako Bayan Madhhar. All rights reserved. • Bako&apos;s Master System ({APP_CONFIG.version})</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700">
                  <Phone className="w-2.5 h-2.5 inline fill-current text-blue-600" />
                  <span>07705488654</span>
                </span>
              </p>
              </div>
            </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM ACTION BAR (Sticky at bottom so exit & print are ALWAYS visible) */}
        {/* ========================================================================= */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-t border-inherit bg-slate-50 dark:bg-[#20222a] print-hide">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            <span className="hidden sm:inline">Press </span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono font-bold">Esc</kbd>
            <span className="hidden sm:inline"> or click outside to exit</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              printFormat === 'thermal80'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                : isSinglePage 
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' 
                : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            }`}>
              {printFormat === 'thermal80'
                ? '80mm ESC/POS Roll'
                : isSinglePage 
                ? (lang === 'en' ? '✓ Fits on 1 Page' : '✓ ١ پەڕەیە') 
                : (lang === 'en' ? `⚠️ Splits in ${pageCount} Pages` : `⚠️ دەبێتە ${pageCount} پەڕە`)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
            >
              {lang === 'en' ? 'Exit / Close' : 'داخستن'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-95 transition"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'en' ? 'Print Receipt' : 'چاپکردنی پسوولە'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
