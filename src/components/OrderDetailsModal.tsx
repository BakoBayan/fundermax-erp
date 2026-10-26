"use client";

import React from "react";
import { OrderAllocation, PanelMaterial } from "../types/inventory";
import { useInventory } from "../context/InventoryContext";
import {
  X,
  User,
  Calendar,
  Layers,
  FileText,
  Trash2,
  Edit2,
  ZoomIn,
  Printer,
  PackageCheck,
  Image as ImageIcon,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Share2,
  DoorClosed,
} from "lucide-react";

interface OrderDetailsModalProps {
  isOpen: boolean;
  data: { order: OrderAllocation; material: PanelMaterial } | null;
  onClose: () => void;
  onEdit: (materialId: string, order: OrderAllocation) => void;
  onFinalize?: (materialId: string, orderId: string) => void;
  onDelete: (materialId: string, orderId: string) => void;
  onPrintIndividualItem?: (target: { type: "order"; order: OrderAllocation; material: PanelMaterial }) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  data,
  onClose,
  onEdit,
  onFinalize,
  onDelete,
  onPrintIndividualItem,
}) => {
  const { t, setZoomedImage, requestConfirm, printCuttingSlip, language } = useInventory();
  const isKu = language === 'ku';

  if (!isOpen || !data) return null;

  const { order, material } = data;
  const isFinalized = order.status === "finalized";
  const isDoor = order.jobType === "door" || !!order.doorSpec;
  const spec = order.doorSpec;

  const handlePrintSlip = () => {
    printCuttingSlip(order, material);
  };

  const handleWhatsAppShareCutting = () => {
    let text = "";
    if (isDoor && spec) {
      const heightCm = (spec.doorHeight / 10).toFixed(0);
      const widthCm = (spec.doorWidth / 10).toFixed(0);
      const frameCm = (spec.frameDepth / 10).toFixed(0);

      if (isKu) {
        text = `*پەڕەی دروستکردنی دەرگا*
*کۆمپانیای شاسوار ئەحمەد شاسوار (سلێمانی)*
*داواکاری:* #${order.orderNumber}
*کڕیار:* ${order.client}
*ژمارەی دەرگا:* ${order.quantity} دانە
*قەبارەی دەرگا:* ${heightCm} × ${widthCm} سم (${spec.doorHeight} × ${spec.doorWidth} mm)
*چوارچێوە / دیوار:* ${frameCm} سم (${spec.frameDepth} mm)
*لای کردنەوە (دەستە):* ${spec.openingDirection === "left" ? "لای چەپ" : "لای ڕاست"}
*جۆری دەرگا:* ${spec.doorType === "waterproof_wc" ? "پێکهاتەی دژە ئاو (Waterproof)" : spec.doorType === "entrance" ? "دەرگای سەرەکی" : "ژوور"}
*مۆدێل:* ${spec.doorModel || material.name}
*تەختە:* ${material.name} (#${material.code || ""})
*تاج و کەتیبە:* ${spec.casingIncluded ? "هەیە" : "نییە"}
*بەستنی قوفڵ و ئێکسسوارات لە کارگە:* ${spec.hardwareIncluded ? "هەیە" : "نییە"}
*بەروار:* ${order.date}
${order.notes ? `*تێبینی دارتاش:* ${order.notes}\n` : ""}
سوپاس بۆ مامەڵەکردنتان - کۆمپانیای شاسوار ئەحمەد شاسوار`;
      } else {
        text = `*Door Production Slip*
*Shaswar Ahmad Shaswar Co. (Sulaymaniyah)*
*Order #:* #${order.orderNumber}
*Customer:* ${order.client}
*Door Quantity:* ${order.quantity} pcs
*Door Dimensions:* ${heightCm} × ${widthCm} cm (${spec.doorHeight} × ${spec.doorWidth} mm)
*Frame / Wall Depth:* ${frameCm} cm (${spec.frameDepth} mm)
*Opening Direction:* ${spec.openingDirection === "left" ? "Left-Hand" : "Right-Hand"}
*Door Type:* ${spec.doorType === "waterproof_wc" ? "Waterproof / WC" : spec.doorType === "entrance" ? "Main Entrance" : "Interior Room"}
*Model:* ${spec.doorModel || material.name}
*Material:* ${material.name} (#${material.code || ""})
*Architrave / Casing:* ${spec.casingIncluded ? "Included" : "None"}
*Lock & Handle Hardware:* ${spec.hardwareIncluded ? "Included" : "None"}
*Date:* ${order.date}
${order.notes ? `*Carpenter Notes:* ${order.notes}\n` : ""}
Thank you for your business - Shaswar Ahmad Shaswar Co.`;
      }
    } else {
      const formattedDim = material.dimensions?.formatted || `${material.dimensions?.length || 2440} × ${material.dimensions?.width || 1220} × ${material.dimensions?.thickness || 18} mm`;
      if (isKu) {
        text = `*پسوولەی بڕینی تەختە*
*داواکاری:* #${order.orderNumber}
*کڕیار:* ${order.client}
*تەختە:* ${material.name} (${material.code || ''})
*قەبارە:* ${formattedDim}
*دانەی داواکراو:* ${order.quantity} تەختە
*بەروار:* ${order.date}
*دۆخ:* ${order.status === 'finalized' ? 'تەواوکراو' : 'لە کاردایە (حجز)'}
${order.notes ? `*تێبینی:* ${order.notes}\n` : ''}
کۆمپانیای شاسوار ئەحمەد شاسوار
سیستەمی وەستای باکۆ`;
      } else {
        text = `*Panel Cutting Slip*
*Order #:* #${order.orderNumber}
*Customer:* ${order.client}
*Material:* ${material.name} (${material.code || ''})
*Dimensions:* ${formattedDim}
*Quantity Ordered:* ${order.quantity} panels
*Date:* ${order.date}
*Status:* ${order.status === 'finalized' ? 'Completed' : 'In Progress (Reserved)'}
${order.notes ? `*Notes:* ${order.notes}\n` : ''}
Shaswar Ahmad Shaswar Co.
Bako's Master System`;
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print print:hidden select-none"
    >
      <div
        className="bg-white dark:bg-slate-850 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-750 w-full max-w-lg overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[92vh] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Pill Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/70 dark:from-slate-800 dark:to-slate-850 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border font-bold ${
              isFinalized
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
            }`}>
              {isFinalized ? <CheckCircle2 className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
                  {t.orderDetails}
                </h3>
                {/* Status Pill */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isFinalized
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                }`}>
                  {isFinalized ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-sky-600" />}
                  <span>{isFinalized ? t.finalized : t.reserved}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {order.orderNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Client & Date Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 font-black text-lg">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-500">{t.client}</div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {order.client}
                </div>
              </div>
            </div>

            <div className="text-end shrink-0">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 justify-end">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t.date}</span>
              </div>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {order.date}
              </div>
            </div>
          </div>

          {/* Specialized Door Specification Card (Sulaymaniyah Custom Door) */}
          {isDoor && spec && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/30 dark:to-slate-800 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <DoorClosed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isKu ? 'تایبەتمەندی دەرگا (کۆمپانیای شاسوار ئەحمەد شاسوار)' : 'Door Specifications (Shaswar Ahmad Shaswar Co.)'}</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded">
                  {isKu ? 'سلێمانی' : 'Sulaymaniyah'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500">{isKu ? 'قەبارەی دەرگا' : 'Door Size'}</div>
                  <div className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5">
                    {(spec.doorHeight / 10).toFixed(0)} × {(spec.doorWidth / 10).toFixed(0)} {isKu ? 'سم' : 'cm'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    {spec.doorHeight} × {spec.doorWidth} mm
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500">{isKu ? 'چوارچێوە / دیوار' : 'Frame / Wall'}</div>
                  <div className="font-mono font-black text-sm text-slate-900 dark:text-white mt-0.5">
                    {(spec.frameDepth / 10).toFixed(0)} {isKu ? 'سم' : 'cm'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    {spec.frameDepth} mm
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500">{isKu ? 'لای کردنەوە (دەستە)' : 'Handing'}</div>
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    {spec.openingDirection === "left" ? (isKu ? "لای چەپ" : "Left Hand") : (isKu ? "لای ڕاست" : "Right Hand")}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold text-slate-500">{isKu ? 'جۆری دەرگا' : 'Door Type'}</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                    {spec.doorType === "waterproof_wc"
                      ? (isKu ? "پێکهاتەی دژە ئاو (Waterproof)" : "Waterproof WC")
                      : spec.doorType === "entrance"
                      ? (isKu ? "سەرەکی" : "Main Entrance")
                      : (isKu ? "ژوور" : "Room")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{isKu ? 'تاج و کەتیبە:' : 'Casing:'}</span>
                  <strong className="text-slate-900 dark:text-white">{spec.casingIncluded ? (isKu ? "هەیە ✅" : "Yes ✅") : (isKu ? "نییە ❌" : "None ❌")}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{isKu ? 'بەستنی قوفڵ و ئێکسسوارات لە کارگە:' : 'Hardware:'}</span>
                  <strong className="text-slate-900 dark:text-white">{spec.hardwareIncluded ? (isKu ? "هەیە ✅" : "Yes ✅") : (isKu ? "نییە ❌" : "None ❌")}</strong>
                </div>
              </div>

              {spec.doorModel && (
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 me-1">{isKu ? 'ناوی مۆدێل / نەخش:' : 'Model / Pattern:'}</span>
                  <strong className="text-slate-900 dark:text-white">{spec.doorModel}</strong>
                </div>
              )}
            </div>
          )}

          {/* Assigned Panel & Quantity Taken from Stock */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-slate-50/50 dark:from-emerald-950/20 dark:to-slate-800/60 border border-emerald-500/20 dark:border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{t.assignedPanel}</span>
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isFinalized
                  ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                  : "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300"
              }`}>
                {isFinalized ? t.orderStatusFinalized : t.stockDeductedNotice}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Panel Photo Thumbnail */}
                {material.imageUrl ? (
                  <div
                    onClick={() =>
                      setZoomedImage({
                        url: material.imageUrl!,
                        title: `${material.code} - ${material.name}`,
                      })
                    }
                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/30 cursor-pointer shrink-0 shadow-sm group"
                    title={t.zoom}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={material.imageUrl}
                      alt={material.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                    <Layers className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-750 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                      {material.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {material.type}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate mt-0.5">
                    {material.name}
                  </div>
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {material.dimensions.formatted}
                  </div>
                </div>
              </div>

              {/* Quantity Used Pill */}
              <div className="text-center bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-emerald-500/30 shadow-2xs shrink-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {isFinalized ? t.panelUnit : t.reserved}
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-800 dark:text-emerald-300">
                  {order.quantity}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  {t.panelUnit}
                </div>
              </div>
            </div>

            {/* Warehouse Stock Status */}
            <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.currentStock} {t.available}:</span>
              </span>
              <strong className="font-mono font-bold text-slate-900 dark:text-white">
                {material.availableStock} {t.panelUnit}
              </strong>
            </div>
          </div>

          {/* Attached Order Blueprint / Photo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>{t.attachedImage}</span>
              </span>
            </div>

            {order.imageUrl ? (
              <div
                onClick={() =>
                  setZoomedImage({
                    url: order.imageUrl!,
                    title: `${order.client} - ${order.orderNumber}`,
                  })
                }
                className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 cursor-pointer group bg-slate-900/10 shadow-sm max-h-56 flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.imageUrl}
                  alt="Order blueprint/photo"
                  className="w-full max-h-56 object-contain group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white gap-1.5">
                  <ZoomIn className="w-6 h-6" />
                  <span className="text-xs font-bold bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    {t.zoom}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                {t.noImageAttached}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.notes}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap min-h-[50px] max-h-40 overflow-y-auto custom-scrollbar select-text">
              {order.notes || <span className="text-slate-400 italic">—</span>}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Delete Order Button */}
            <button
              onClick={() => {
                const confirmMsg = isFinalized
                  ? t.confirmDeleteFinalizedOrder
                  : t.confirmDeleteOrder;
                requestConfirm({
                  title: t.delete,
                  message: confirmMsg,
                  confirmLabel: t.delete,
                  type: "danger",
                  onConfirm: () => {
                    onDelete(material.id, order.id);
                    onClose();
                  },
                });
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 font-bold text-xs transition-colors"
              title={t.delete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.delete}</span>
            </button>

            {/* Edit Order Button */}
            <button
              onClick={() => {
                onEdit(material.id, order);
                onClose();
              }}
              className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 border border-slate-200 dark:border-slate-600 font-bold text-xs transition-colors cursor-pointer"
              title={t.edit}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t.edit}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Finalize Button: Only if not already finalized */}
            {!isFinalized && onFinalize && (
              <button
                onClick={() => {
                  requestConfirm({
                    title: t.finalize,
                    message: t.finalizeOrderPrompt,
                    confirmLabel: t.finalize,
                    type: "success",
                    onConfirm: () => {
                      onFinalize(material.id, order.id);
                      onClose();
                    },
                  });
                }}
                className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                title={t.finalize}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.finalize}</span>
              </button>
            )}

            {/* WhatsApp 1-Tap Sharing */}
            <button
              type="button"
              onClick={handleWhatsAppShareCutting}
              className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
              title={isKu ? 'ناردن بۆ وەتسئەپ' : 'Send via WhatsApp'}
            >
              <Share2 className="w-4 h-4" />
              <span>{isKu ? 'ناردن بۆ وەتسئەپ' : 'WhatsApp'}</span>
            </button>

            {/* One Dedicated Print Cutting Slip Button */}
            <button
              onClick={handlePrintSlip}
              className="flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-650 border border-slate-200 dark:border-slate-600 font-bold text-xs transition-colors cursor-pointer"
              title={isKu ? 'چاپی پسوولەی بڕین' : 'Print Cutting Slip'}
            >
              <Printer className="w-4 h-4" />
              <span>{isKu ? 'چاپی پسوولە' : 'Print Slip'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[38px] px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
