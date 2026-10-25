"use client";

import React, { useState, useMemo } from "react";
import {
  Printer,
  Layers,
  PackageCheck,
  Search,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PanelMaterial, OrderAllocation, Language } from "../types/inventory";

export interface PrintQueueItem {
  id: string; // e.g. "panel-mat-123" or "order-ord-456"
  type: "panel" | "order";
  material: PanelMaterial;
  order?: OrderAllocation;
}

interface BatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: PanelMaterial[];
  allFlattenedOrders: { order: OrderAllocation; material: PanelMaterial }[];
  selectedQueue: PrintQueueItem[];
  onUpdateQueue: (queue: PrintQueueItem[]) => void;
  onConfirmPrint: (queue: PrintQueueItem[]) => void;
  language: Language;
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
  isOpen,
  onClose,
  materials,
  allFlattenedOrders,
  selectedQueue,
  onUpdateQueue,
  onConfirmPrint,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "panels" | "orders">("all");
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(() => new Set(selectedQueue.map((item) => item.id)), [selectedQueue]);

  // Flattened panels
  const panelItems: PrintQueueItem[] = useMemo(() => {
    return materials.map((m) => ({
      id: `panel-${m.id}`,
      type: "panel",
      material: m,
    }));
  }, [materials]);

  // Flattened orders
  const orderItems: PrintQueueItem[] = useMemo(() => {
    return allFlattenedOrders.map(({ order, material }) => ({
      id: `order-${order.id}`,
      type: "order",
      material,
      order,
    }));
  }, [allFlattenedOrders]);

  // Filtered by tab & search
  const displayedItems = useMemo(() => {
    let list: PrintQueueItem[] = [];
    if (activeTab === "all") {
      list = [...panelItems, ...orderItems];
    } else if (activeTab === "panels") {
      list = panelItems;
    } else {
      list = orderItems;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();

    return list.filter((item) => {
      if (item.type === "panel") {
        return (
          item.material.code.toLowerCase().includes(q) ||
          item.material.name.toLowerCase().includes(q) ||
          item.material.type.toLowerCase().includes(q)
        );
      } else if (item.order) {
        return (
          item.order.orderNumber.toLowerCase().includes(q) ||
          item.order.client.toLowerCase().includes(q) ||
          item.material.code.toLowerCase().includes(q) ||
          item.material.name.toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [activeTab, search, panelItems, orderItems]);

  if (!isOpen) return null;

  const toggleItem = (item: PrintQueueItem) => {
    if (selectedIds.has(item.id)) {
      onUpdateQueue(selectedQueue.filter((q) => q.id !== item.id));
    } else {
      onUpdateQueue([...selectedQueue, item]);
    }
  };

  const selectAllFiltered = () => {
    const newItems = displayedItems.filter((item) => !selectedIds.has(item.id));
    onUpdateQueue([...selectedQueue, ...newItems]);
  };

  const deselectAllFiltered = () => {
    const toRemoveIds = new Set(displayedItems.map((item) => item.id));
    onUpdateQueue(selectedQueue.filter((item) => !toRemoveIds.has(item.id)));
  };

  // Append unselected panels to queue
  const selectAllPanels = () => {
    const unselectedPanels = panelItems.filter((item) => !selectedIds.has(item.id));
    onUpdateQueue([...selectedQueue, ...unselectedPanels]);
  };

  // Append unselected orders to queue
  const selectAllOrders = () => {
    const unselectedOrders = orderItems.filter((item) => !selectedIds.has(item.id));
    onUpdateQueue([...selectedQueue, ...unselectedOrders]);
  };

  const moveQueueItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedQueue.length) return;
    const updated = [...selectedQueue];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onUpdateQueue(updated);
  };

  const clearAll = () => {
    onUpdateQueue([]);
  };

  const handlePrintAction = () => {
    if (selectedQueue.length === 0) return;
    onConfirmPrint(selectedQueue);
    onClose();
  };

  const selectedPanelCount = selectedQueue.filter((q) => q.type === "panel").length;
  const selectedOrderCount = selectedQueue.filter((q) => q.type === "order").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-750 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-850 border-b border-slate-200 dark:border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  {language === "ku" ? "هەڵبژاردنی چەندین ماددە بۆ چاپ" : "Batch Print Slip Selector"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300">
                  {selectedQueue.length} {language === "ku" ? "هەڵبژێردراو" : "Selected"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {language === "ku"
                  ? "چەندین پانێڵ و داواکاری بە یەکجار هەڵبژێرە بۆ چاپکردنی پاک بەبێ بەفیڕۆدانی مەرەکەب"
                  : "Queue multiple panels and orders to print clean, ink-friendly slips in one batch."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Tabs */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-750 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "ku" ? "هەمووی" : "All Items"} ({panelItems.length + orderItems.length})
              </button>
              <button
                onClick={() => setActiveTab("panels")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "panels"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === "ku" ? "پانێڵەکان" : "Panels"}</span> ({panelItems.length})
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === "orders"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>{language === "ku" ? "داواکارییەکان" : "Orders"}</span> ({orderItems.length})
              </button>
            </div>

            {/* Quick Bulk Select Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={selectAllPanels}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                + {language === "ku" ? "هەموو پانێڵەکان" : "All Panels"}
              </button>
              <button
                onClick={selectAllOrders}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs"
              >
                + {language === "ku" ? "هەموو داواکارییەکان" : "All Orders"}
              </button>
              <button
                onClick={selectAllFiltered}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200"
              >
                + {language === "ku" ? "دیاریکردنی پەڕە" : "Select View"}
              </button>
              <button
                onClick={deselectAllFiltered}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
              >
                - {language === "ku" ? "لابردنی پەڕە" : "Deselect View"}
              </button>
              {selectedQueue.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  {language === "ku" ? "پاککردنەوە" : "Clear All"}
                </button>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                language === "ku"
                  ? "گەڕان لە کۆد، ناوی ماددە، یان کڕیار..."
                  : "Filter by panel code, panel name, order number, or client..."
              }
              className="w-full h-9 ps-9 pe-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
          {displayedItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              {language === "ku" ? "هیچ ماددەیەک نەدۆزرایەوە." : "No matching items found."}
            </div>
          ) : (
            displayedItems.map((item) => {
              const isChecked = selectedIds.has(item.id);
              const queueIndex = isChecked ? selectedQueue.findIndex((q) => q.id === item.id) : -1;

              if (item.type === "panel") {
                const mat = item.material;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none border-s-4 border-s-emerald-600 ${
                      isChecked
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-2xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-emerald-700 dark:text-emerald-400 shrink-0">
                        {isChecked ? (
                          <div className="relative flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 fill-emerald-600 text-white dark:fill-emerald-500 dark:text-slate-900" />
                          </div>
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                            #{mat.code}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-750 px-1.5 py-0.5 rounded">
                            {mat.type}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {mat.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{mat.dimensions.formatted}</span>
                          <span>•</span>
                          <span>Total Stock: <strong className="text-slate-800 dark:text-slate-200">{mat.totalStock}</strong></span>
                          <span>•</span>
                          <span>Available: <strong className="text-emerald-700 dark:text-emerald-400">{mat.availableStock}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-400 flex items-center gap-1.5 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>{language === "ku" ? "پەڕەی پانێڵ (کۆگا)" : "🪵 PANEL SLIP"}</span>
                      </span>
                      {isChecked && queueIndex >= 0 && (
                        <span className="text-[10px] font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-300">
                          #{queueIndex + 1} in print order
                        </span>
                      )}
                    </div>
                  </div>
                );
              } else if (item.order) {
                const ord = item.order;
                const mat = item.material;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none border-s-4 border-s-sky-600 ${
                      isChecked
                        ? "bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 shadow-2xs"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sky-700 dark:text-sky-400 shrink-0">
                        {isChecked ? (
                          <div className="relative flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 fill-sky-600 text-white dark:fill-sky-500 dark:text-slate-900" />
                          </div>
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-700">
                            {ord.orderNumber}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {ord.client}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              ord.status === "finalized"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-750 dark:text-slate-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            }`}
                          >
                            {ord.status === "finalized" ? "Finalized" : "Reserved"}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Qty: <strong className="text-slate-900 dark:text-white font-bold">{ord.quantity} pcs</strong></span>
                          <span>•</span>
                          <span>Assigned Panel: <strong className="text-slate-700 dark:text-slate-300">#{mat.code} ({mat.name})</strong></span>
                          <span>•</span>
                          <span>Date: {ord.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200 border border-sky-400 flex items-center gap-1.5 shadow-2xs">
                        <PackageCheck className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                        <span>{language === "ku" ? "پەڕەی داواکاری (کڕیار)" : "📦 ORDER SLIP"}</span>
                      </span>
                      {isChecked && queueIndex >= 0 && (
                        <span className="text-[10px] font-mono font-black text-sky-800 dark:text-sky-300 bg-sky-200/70 dark:bg-sky-900/50 px-2 py-0.5 rounded-md border border-sky-300">
                          #{queueIndex + 1} in print order
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Selected Print Queue Sequence Preview Tray */}
        {selectedQueue.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-750 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {language === "ku"
                    ? "ڕیزبەندی چاپکردن (بەپێی کاتی هەڵبژاردن):"
                    : "Print Queue Sequence (Exact order selected):"}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {language === "ku"
                  ? "چەند دانە لە پەڕەیەکدا جێدەبنەوە بەیەکەوە چاپ دەکرێن"
                  : "Fits multiple slips per page where space allows"}
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
              {selectedQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono shrink-0 shadow-2xs ${
                    item.type === "panel"
                      ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400/80 text-emerald-900 dark:text-emerald-200"
                      : "bg-sky-50 dark:bg-sky-950/70 border-sky-400/80 text-sky-900 dark:text-sky-200"
                  }`}
                >
                  <span className="font-black text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                    #{idx + 1}
                  </span>
                  <span className="font-bold">
                    {item.type === "panel" ? `🪵 #${item.material.code}` : `📦 #${item.order?.orderNumber}`}
                  </span>
                  <div className="flex items-center ms-1 text-slate-400">
                    {idx > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQueueItem(idx, "up");
                        }}
                        className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-400"
                        title="Move Earlier in Print Sequence"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                    )}
                    {idx < selectedQueue.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQueueItem(idx, "down");
                        }}
                        className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-400"
                        title="Move Later in Print Sequence"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(item);
                      }}
                      className="p-0.5 hover:text-rose-500 ms-0.5"
                      title="Remove from queue"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            <strong className="text-slate-900 dark:text-white font-black text-sm">
              {selectedQueue.length}
            </strong>{" "}
            {language === "ku" ? "ماددە هەڵبژێردراوە بۆ چاپ:" : "items queued for printing:"}{" "}
            <span className="text-slate-500 font-mono">
              ({selectedPanelCount} panels, {selectedOrderCount} orders)
            </span>
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {language === "ku" ? "داخستن" : "Cancel"}
            </button>

            <button
              disabled={selectedQueue.length === 0}
              onClick={handlePrintAction}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>
                {language === "ku"
                  ? `چاپکردنی هەڵبژێردراوەکان (${selectedQueue.length})`
                  : `Print Selected Batch (${selectedQueue.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
