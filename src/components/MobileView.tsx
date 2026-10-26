"use client";

import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { PanelMaterial, OrderAllocation } from "../types/inventory";
import { SearchableDropdown } from "./SearchableDropdown";
import { ExpandableNotes } from "./ExpandableNotes";
import {
  PackagePlus,
  Plus,
  Minus,
  Edit2,
  Trash2,
  ZoomIn,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ArrowUpDown,
  Download,
  X,
} from "lucide-react";
import { exportPanelsToCSV } from "../utils/export";

interface MobileViewProps {
  onOpenOrderModal: (materialId?: string, orderToEdit?: { materialId: string; order: OrderAllocation }) => void;
  onOpenMaterialModal: (materialToEdit?: PanelMaterial | null) => void;
  onSelectOrderForDetails?: (item: { order: OrderAllocation; material: PanelMaterial }) => void;
  onPrintIndividualItem?: (target: { type: "panel" | "order"; material?: PanelMaterial; order?: OrderAllocation }) => void;
  selectedPrintItemIds?: Set<string>;
  onTogglePrintQueueItem?: (item: { id: string; type: "panel" | "order"; material: PanelMaterial; order?: OrderAllocation }) => void;
  onNavigateToOrders?: (material?: PanelMaterial) => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  onOpenOrderModal,
  onOpenMaterialModal,
  onSelectOrderForDetails,
  onPrintIndividualItem,
  selectedPrintItemIds,
  onTogglePrintQueueItem,
  onNavigateToOrders,
}) => {
  const {
    t,
    language,
    materials,
    customTypes,
    addCustomType,
    deleteCustomType,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    quickStepStock,
    deleteMaterial,
    canDeleteMaterial,
    userPermissions,
    isViewer,
    finalizeOrder,
    deleteOrder,
    requestConfirm,
    setZoomedImage,
    highlightedId,
  } = useInventory();

  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostStock" | "leastStock" | "code">("newest");

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = m.code.toLowerCase().includes(q);
      const nameMatch = m.name.toLowerCase().includes(q);
      const clientMatch = m.activeOrders.some((o) => o.client.toLowerCase().includes(q));
      const notesMatch = (m.notes || "").toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !clientMatch && !notesMatch) return false;
    }

    const isAllType =
      !typeFilter ||
      typeFilter === "all" ||
      typeFilter === t.allTypes ||
      typeFilter === "All Types" ||
      typeFilter === "هەموو جۆرەکان";

    if (!isAllType && m.type.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }

    if (stockStatusFilter === "in_stock" && m.availableStock <= 0) return false;
    if (stockStatusFilter === "out_of_stock" && m.availableStock > 0) return false;

    return true;
  });

  const getMaterialTime = (m: PanelMaterial): number => {
    if (m.createdAt) return m.createdAt;
    if (m.updatedAt) {
      const parsed = new Date(m.updatedAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const match = m.id.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 0;
  };

  // Sort materials
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortBy === "newest") {
      return getMaterialTime(b) - getMaterialTime(a);
    }
    if (sortBy === "oldest") {
      return getMaterialTime(a) - getMaterialTime(b);
    }
    if (sortBy === "mostStock") {
      return b.availableStock - a.availableStock;
    }
    if (sortBy === "leastStock") {
      return a.availableStock - b.availableStock;
    }
    if (sortBy === "code") {
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    }
    return 0;
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 pb-24 select-none no-print touch-pan-y">
      {/* Mobile Sticky Control Bar: Search + Add Panel + Filters + Sorting */}
      <div className="sticky top-[49px] z-30 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 shadow-2xs w-full max-w-full box-border overflow-hidden">
        <div className="max-w-xl mx-auto space-y-2.5 w-full box-border">
          {/* Search bar: Full width, h-12, text-base */}
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="mobile-panels-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ku' ? 'گەڕان لە تەختەکان...' : t.searchPanels}
              className="w-full h-12 ps-11 pe-9 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={t.clearSearch}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontally scrolling filter pills */}
          <div className="flex items-center overflow-x-auto no-scrollbar gap-2 py-0.5 scroll-smooth">
            {[
              { id: 'all', label: language === 'ku' ? 'هەموو' : 'All' },
              { id: 'in_stock', label: language === 'ku' ? 'بەردەست' : 'In Stock' },
              { id: 'out_of_stock', label: language === 'ku' ? 'لە کۆگا نەماوە' : 'Out of Stock' },
            ].map((pill) => {
              const isSelected = stockStatusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStockStatusFilter(pill.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            {/* Type Filter */}
            <div className="shrink-0 min-w-[120px]">
              <SearchableDropdown
                options={[t.allTypes, ...customTypes]}
                value={typeFilter === "all" ? t.allTypes : typeFilter}
                onChange={(v) => setTypeFilter(v === t.allTypes ? "all" : v)}
                onAddNew={!isViewer ? addCustomType : undefined}
                onDeleteOption={!isViewer ? deleteCustomType : undefined}
                placeholder={t.allTypes}
                allowDelete={!isViewer}
                compact={true}
              />
            </div>

            {/* + Add Panel Button */}
            {!isViewer && (
              <button
                type="button"
                onClick={() => onOpenMaterialModal(null)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs shrink-0 whitespace-nowrap transition-all"
                title={t.addPanel}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'تەختەی نوێ' : t.addPanel}</span>
              </button>
            )}

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest" className="dark:bg-slate-800">{t.newest}</option>
                <option value="oldest" className="dark:bg-slate-800">{t.oldest}</option>
                <option value="mostStock" className="dark:bg-slate-800">{t.mostStock}</option>
                <option value="leastStock" className="dark:bg-slate-800">{t.leastStock}</option>
                <option value="code" className="dark:bg-slate-800">{t.codeAZ}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Material Mobile Cards (Constrained to max-w-xl for stylish modern native app look) */}
      <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-3 space-y-3 box-border overflow-x-hidden">
        {/* Count indicator and Export CSV Action */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              {sortedMaterials.length} {t.panels}
            </span>
            {stockStatusFilter !== "all" && (
              <span className="text-emerald-700 dark:text-emerald-400">
                • {stockStatusFilter === "in_stock" ? t.inStockOnly : t.outOfStockOnly}
              </span>
            )}
          </div>
          {userPermissions?.canExport !== false && (
          <button
            onClick={() => exportPanelsToCSV(sortedMaterials, language)}
            disabled={sortedMaterials.length === 0}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all shadow-2xs"
            title={t.exportPanels}
          >
            <Download className="w-3 h-3 shrink-0" />
            <span>{t.exportCSV}</span>
          </button>
          )}
        </div>

        {sortedMaterials.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <p className="text-sm font-semibold">{t.emptyMaterials}</p>
          </div>
        ) : (
          sortedMaterials.map((mat) => {
            const isOutOfStock = mat.availableStock === 0;
            const isHighlighted = highlightedId === mat.id;

            return (
              <div
                key={mat.id}
                className={`w-full max-w-full bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 box-border ${
                  isHighlighted
                    ? "ring-4 ring-emerald-500/80 shadow-lg scale-[1.01] z-20 bg-emerald-100/50 dark:bg-emerald-950/50 border-emerald-400"
                    : isOutOfStock
                    ? "border-s-2 border-s-amber-400 border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-700/80"
                }`}
              >
                {/* 1. Header: Photo Thumbnail, Code, Type, Name, Dimensions & Top Action Buttons */}
                <div className="p-3.5 pb-3 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Panel Image Thumbnail with Pan & Zoom */}
                    {mat.imageUrl ? (
                      <div
                        onClick={() =>
                          setZoomedImage({
                            url: mat.imageUrl!,
                            title: `${mat.code} - ${mat.name}`,
                          })
                        }
                        className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer shrink-0 shadow-2xs group"
                        title={t.zoom}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mat.imageUrl}
                          alt="Panel"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      {/* Code and Type Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-750 px-2.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-650">
                          {mat.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-750 font-medium text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-650">
                          {mat.type}
                        </span>
                      </div>

                      {/* Panel Name */}
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-1 truncate">
                        {mat.name}
                      </h4>

                      {/* Dimensions */}
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {mat.dimensions.formatted}
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons: Comfortable 48px Touch Targets for Workshop Gloves */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Print Slip or Toggle Queue */}
                    {(() => {
                      const inQueue = selectedPrintItemIds?.has(`panel-${mat.id}`);
                      return (
                        <button
                          onClick={() => {
                            if (selectedPrintItemIds && selectedPrintItemIds.size > 0 && onTogglePrintQueueItem) {
                              onTogglePrintQueueItem({ id: `panel-${mat.id}`, type: "panel", material: mat });
                            } else if (onPrintIndividualItem) {
                              onPrintIndividualItem({ type: "panel", material: mat });
                            }
                          }}
                          className={`min-w-[48px] min-h-[48px] p-2.5 rounded-xl border transition-colors active:scale-90 flex items-center justify-center cursor-pointer ${
                            inQueue
                              ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700"
                          }`}
                          title={inQueue ? "Remove from Print Queue" : t.printIndividualSlip}
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      );
                    })()}

                    {/* Edit Panel: Strictly unmounted unless canEditPanels */}
                    {userPermissions.canEditPanels && (
                      <button
                        onClick={() => onOpenMaterialModal(mat)}
                        className="min-w-[48px] min-h-[48px] p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-colors active:scale-90 flex items-center justify-center cursor-pointer"
                        title={t.edit}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}

                    {/* Delete Panel: Strictly unmounted unless canDeletePanels */}
                    {userPermissions.canDeletePanels && (
                      <button
                        onClick={() => {
                          requestConfirm({
                            title: t.delete,
                            message: t.confirmDeleteMaterial,
                            confirmLabel: t.delete,
                            type: "danger",
                            onConfirm: () => deleteMaterial(mat.id),
                          });
                        }}
                        className="min-w-[48px] min-h-[48px] p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors active:scale-90 flex items-center justify-center cursor-pointer"
                        title={t.delete}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Stock Deduction Dashboard: Large clear steppers & high-contrast badges */}
                <div className="p-3 bg-slate-50/80 dark:bg-slate-850/60 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60">
                  {/* On-hand Stock with Large Stepper Buttons (48px tap targets for workshop safety) */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t.currentStock}:
                    </span>
                    {userPermissions.canEditPanels ? (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                        <button
                          onClick={() => quickStepStock(mat.id, -1)}
                          disabled={mat.availableStock === 0}
                          className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 disabled:opacity-30 text-slate-800 dark:text-slate-200 font-black flex items-center justify-center active:scale-90 transition-transform hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                          title="-1"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span
                          className={`font-black text-lg sm:text-xl min-w-[36px] text-center font-mono ${
                            isOutOfStock ? "text-slate-600 dark:text-slate-400" : "text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          {mat.availableStock}
                        </span>
                        <button
                          onClick={() => quickStepStock(mat.id, 1)}
                          className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black flex items-center justify-center active:scale-90 transition-transform hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                          title="+1"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`font-black text-base sm:text-lg font-mono px-2 ${
                          isOutOfStock ? "text-slate-600 dark:text-slate-400" : "text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {mat.availableStock}
                      </span>
                    )}
                  </div>

                  {/* Out of Stock Pill or Reserved Count */}
                  <div>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{t.outOfStockBadge}</span>
                      </span>
                    ) : mat.allocatedStock > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>{mat.allocatedStock} {t.reserved}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 3. Dedicated Notes Section (Clean full-width block, never squeezed!) */}
                {mat.notes && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                    <ExpandableNotes notes={mat.notes} variant="block" />
                  </div>
                )}

                {/* 4. Active Orders List (Latest 3 only) */}
                {mat.activeOrders.length > 0 && (() => {
                  const sortedOrders = [...mat.activeOrders].sort((a, b) => {
                    if (b.createdAt && a.createdAt) return b.createdAt - a.createdAt;
                    return (b.id || "").localeCompare(a.id || "");
                  });
                  const displayedOrders = sortedOrders.slice(0, 3);
                  const hasMoreOrders = mat.activeOrders.length > 3;
                  const remainingCount = mat.activeOrders.length - 3;

                  return (
                    <div className="p-3 space-y-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-850/40">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>{t.orders} ({mat.activeOrders.length})</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                            {hasMoreOrders ? `${t.latestThreeOf} ${mat.activeOrders.length}` : t.latestThreeBadge}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          {mat.allocatedStock} {t.reserved}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {displayedOrders.map((ord) => (
                          <div
                            key={ord.id}
                            onClick={() =>
                              onSelectOrderForDetails &&
                              onSelectOrderForDetails({ order: ord, material: mat })
                            }
                            className="p-2 px-2.5 rounded-xl bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-transform shadow-2xs hover:border-emerald-500/50"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {ord.imageUrl && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomedImage({
                                      url: ord.imageUrl!,
                                      title: `${ord.client} - ${mat.code}`,
                                    });
                                  }}
                                  className="relative w-8 h-8 rounded-lg shrink-0 overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer shadow-2xs"
                                  title={t.zoom}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ord.imageUrl}
                                    alt="Order"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="truncate">
                                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {ord.client}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  {ord.orderNumber}
                                </div>
                              </div>
                              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-black shrink-0 ms-1">
                                (-{ord.quantity})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Finalize button: Strictly unmounted unless canEditPanels */}
                              {userPermissions.canEditPanels && ord.status !== "finalized" && (
                                <button
                                  onClick={() => {
                                    requestConfirm({
                                      title: t.finalize,
                                      message: t.finalizeOrderPrompt,
                                      confirmLabel: t.finalize,
                                      type: "success",
                                      onConfirm: () => finalizeOrder(mat.id, ord.id),
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
                                  title={t.finalize}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {ord.status === "finalized" && (
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-lg" title={t.finalized}>
                                  ✓
                                </span>
                              )}

                              {/* View Details */}
                              <button
                                onClick={() =>
                                  onSelectOrderForDetails &&
                                  onSelectOrderForDetails({ order: ord, material: mat })
                                }
                                className="p-1.5 rounded-lg text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60"
                                title={t.viewDetails}
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Print Order Slip or Toggle Queue */}
                              {(() => {
                                const inQueue = selectedPrintItemIds?.has(`order-${ord.id}`);
                                return (
                                  <button
                                    onClick={() => {
                                      if (selectedPrintItemIds && selectedPrintItemIds.size > 0 && onTogglePrintQueueItem) {
                                        onTogglePrintQueueItem({ id: `order-${ord.id}`, type: "order", material: mat, order: ord });
                                      } else if (onPrintIndividualItem) {
                                        onPrintIndividualItem({ type: "order", order: ord, material: mat });
                                      }
                                    }}
                                    className={`p-1.5 rounded-lg ${
                                      inQueue
                                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    }`}
                                    title={inQueue ? "Remove from Print Queue" : t.printOrder}
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                );
                              })()}

                              {/* Edit Order: Strictly unmounted unless canEditPanels */}
                              {userPermissions.canEditPanels && (
                                <button
                                  onClick={() => onOpenOrderModal(mat.id, { materialId: mat.id, order: ord })}
                                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  title={t.edit}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Order: Strictly unmounted unless canDeletePanels */}
                              {userPermissions.canDeletePanels && (
                                <button
                                  onClick={() => {
                                    const confirmMsg = ord.status === "finalized"
                                      ? t.confirmDeleteFinalizedOrder
                                      : t.confirmDeleteOrder;
                                    requestConfirm({
                                      title: t.delete,
                                      message: confirmMsg,
                                      confirmLabel: t.delete,
                                      type: "danger",
                                      onConfirm: () => deleteOrder(mat.id, ord.id),
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                                  title={t.delete}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {hasMoreOrders && (
                        <button
                          onClick={() => onNavigateToOrders ? onNavigateToOrders(mat) : null}
                          className="w-full text-center py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-2"
                        >
                          <span>+{remainingCount} {t.moreInOrdersTab}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Card Footer: Large tap buttons for [دەستکاری / Edit] and [+ داواکاری / Reserve] */}
                <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-750/80 flex items-center gap-2">
                  {userPermissions.canEditPanels && (
                    <button
                      type="button"
                      onClick={() => onOpenMaterialModal(mat)}
                      className="flex-1 min-h-[48px] py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-650 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>{language === 'ku' ? 'دەستکاری' : 'Edit'}</span>
                    </button>
                  )}

                  {userPermissions.canCreatePanels && (
                    <button
                      type="button"
                      onClick={() => onOpenOrderModal(mat.id)}
                      disabled={isOutOfStock}
                      className="flex-1 min-h-[48px] py-3 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>{language === 'ku' ? '+ داواکاری' : '+ Reserve'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
