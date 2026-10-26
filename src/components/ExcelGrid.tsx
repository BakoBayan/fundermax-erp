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
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ArrowUpDown,
  Download,
  X,
} from "lucide-react";
import { exportPanelsToCSV } from "../utils/export";

interface ExcelGridProps {
  onOpenOrderModal: (materialId?: string, orderToEdit?: { materialId: string; order: OrderAllocation }) => void;
  onOpenMaterialModal: (materialToEdit?: PanelMaterial | null) => void;
  onSelectOrderForDetails?: (item: { order: OrderAllocation; material: PanelMaterial }) => void;
  onPrintIndividualItem?: (target: { type: "panel" | "order"; material?: PanelMaterial; order?: OrderAllocation }) => void;
  selectedPrintItemIds?: Set<string>;
  onTogglePrintQueueItem?: (item: { id: string; type: "panel"; material: PanelMaterial }) => void;
  onNavigateToOrders?: (material?: PanelMaterial) => void;
}

export const ExcelGrid: React.FC<ExcelGridProps> = ({
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
    requestConfirm,
    setZoomedImage,
    highlightedId,
  } = useInventory();

  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock" | "reserved">("all");
  const [thicknessFilter, setThicknessFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostStock" | "leastStock" | "code">("newest");

  // Dynamically extract unique thicknesses from materials
  const availableThicknesses = React.useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.dimensions?.thickness) {
        set.add(`${m.dimensions.thickness}mm`);
      }
    });
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [materials]);

  // Filtered materials
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
    if (stockStatusFilter === "low_stock" && (m.availableStock <= 0 || m.availableStock > 10)) return false;
    if (stockStatusFilter === "out_of_stock" && m.availableStock > 0) return false;
    if (stockStatusFilter === "reserved" && (m.allocatedStock || 0) <= 0) return false;

    if (thicknessFilter !== "all" && `${m.dimensions?.thickness}mm` !== thicknessFilter) return false;

    return true;
  });

  const isAllType =
    !typeFilter ||
    typeFilter === "all" ||
    typeFilter === t.allTypes ||
    typeFilter === "All Types" ||
    typeFilter === "هەموو جۆرەکان";

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    !isAllType ||
    stockStatusFilter !== "all" ||
    thicknessFilter !== "all" ||
    sortBy !== "newest"
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStockStatusFilter("all");
    setThicknessFilter("all");
    setSortBy("newest");
  };

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

  // Sort materials (Newest is default)
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

  const fontClass = language === "ku" ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  return (
    <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${fontClass}`}>
      {/* Top Filter & Action Bar: Modern, Responsive & Non-Bland */}
      <div className="p-2.5 sm:px-5 bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 select-none no-print">
        <div className="flex items-center gap-2 flex-1 max-w-3xl flex-wrap">
          {/* Primary + Panel Button: Hidden unless canCreatePanels */}
          {userPermissions.canCreatePanels && (
            <button
              onClick={() => onOpenMaterialModal(null)}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl font-bold shadow-2xs active:scale-95 transition-all shrink-0"
              title={t.addPanel}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{t.addPanel}</span>
            </button>
          )}

          {/* Search Input with Instant Clear and Hotkey Indicator */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="warehouse-panels-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPanels}
              className="w-full h-8 ps-9 pe-8 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs text-xs sm:text-sm"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={t.clearSearch}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-400 border border-slate-200 dark:border-slate-600 select-none pointer-events-none">
                /
              </kbd>
            )}
          </div>

          {/* Type Filter Dropdown */}
          <div className="w-32 sm:w-40 shrink-0">
            <SearchableDropdown
              options={[t.allTypes, ...customTypes]}
              value={typeFilter === "all" ? t.allTypes : typeFilter}
              onChange={(v) => setTypeFilter(v === t.allTypes ? "all" : v)}
              onAddNew={!isViewer ? addCustomType : undefined}
              onDeleteOption={!isViewer ? deleteCustomType : undefined}
              placeholder={t.allTypes}
              allowDelete={!isViewer}
            />
          </div>

          {/* Stock Status Filter (All, In Stock, Low Stock, Out of Stock, Reserved) */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <Filter className="w-3.5 h-3.5 me-1 text-slate-400" />
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as "all" | "in_stock" | "low_stock" | "out_of_stock" | "reserved")}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">{language === 'ku' ? 'هەموو کۆگا' : 'All Stock'}</option>
              <option value="in_stock" className="dark:bg-slate-800">{language === 'ku' ? 'بەردەست (> 0)' : 'In Stock (> 0)'}</option>
              <option value="low_stock" className="dark:bg-slate-800">{language === 'ku' ? 'کەم ماوە (≤ 10)' : 'Low Stock (≤ 10)'}</option>
              <option value="out_of_stock" className="dark:bg-slate-800">{language === 'ku' ? 'تەواوبوو (0)' : 'Out of Stock (0)'}</option>
              <option value="reserved" className="dark:bg-slate-800">{language === 'ku' ? 'تەختەی گیراو' : 'Reserved Orders'}</option>
            </select>
          </div>

          {/* Panel Thickness Filter */}
          {availableThicknesses.length > 0 && (
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <span className="text-[11px] font-mono text-slate-400 me-1">T:</span>
              <select
                value={thicknessFilter}
                onChange={(e) => setThicknessFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
                title="Filter by panel thickness (e.g. 18mm, 16mm)"
              >
                <option value="all" className="dark:bg-slate-800">{language === 'ku' ? 'هەموو ئەستوورییەکان' : 'All Thicknesses'}</option>
                {availableThicknesses.map((th) => (
                  <option key={th} value={th} className="dark:bg-slate-800 font-mono">
                    {th}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Filter: Newest (default), Oldest, Most Stock, Least Stock, Code */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 me-1.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "mostStock" | "leastStock" | "code")}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold"
              title={t.sortBy}
            >
              <option value="newest" className="dark:bg-slate-800">{t.newest}</option>
              <option value="oldest" className="dark:bg-slate-800">{t.oldest}</option>
              <option value="mostStock" className="dark:bg-slate-800">{t.mostStock}</option>
              <option value="leastStock" className="dark:bg-slate-800">{t.leastStock}</option>
              <option value="code" className="dark:bg-slate-800">{t.codeAZ}</option>
            </select>
          </div>

          {/* 1-Click Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Reset all active panel filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'ku' ? 'سڕینەوەی فلتەر' : 'Clear Filters'}</span>
            </button>
          )}
        </div>

        {/* Actions & Stats: Export CSV and Total Count */}
        <div className="flex items-center gap-2 shrink-0">
          {userPermissions?.canExport !== false && (
          <button
            onClick={() => exportPanelsToCSV(sortedMaterials, language)}
            disabled={sortedMaterials.length === 0}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs active:scale-95 transition-all"
            title={t.exportPanels}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t.exportCSV}</span>
          </button>
          )}

          {/* Total Panels Count Pill */}
          <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 text-xs">
            <span>{t.materials}: </span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {hasActiveFilters ? `${sortedMaterials.length}/${materials.length}` : sortedMaterials.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid: Centered, Non-Capitalized, Modern Polished SaaS Theme */}
      <div className="flex-1 w-full max-w-full overflow-x-auto pb-4">
        <table className="w-full border-collapse text-center select-text">
          {/* Header: Centered & Not Fully Capitalized */}
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 select-none shadow-2xs">
            <tr className="divide-x divide-slate-200 dark:divide-slate-700">
              <th className="w-10 py-2.5 px-2 text-center bg-slate-200/70 dark:bg-slate-750">#</th>
              <th className="w-12 py-2.5 px-2 text-center">{t.image}</th>
              <th className="py-2.5 px-3 min-w-[90px] text-center">{t.code}</th>
              <th className="py-2.5 px-3 min-w-[100px] text-center">{t.type}</th>
              <th className="py-2.5 px-3 min-w-[150px] text-center">{t.name}</th>
              <th className="py-2.5 px-3 min-w-[140px] text-center">{t.dimensions}</th>
              <th className="py-2.5 px-3 text-center min-w-[130px] bg-emerald-50/50 dark:bg-emerald-950/20 font-black text-emerald-900 dark:text-emerald-200">
                {t.currentStock}
              </th>
              <th className="py-2.5 px-3 min-w-[200px] text-center">
                <div className="flex flex-col items-center justify-center">
                  <span>{t.orders}</span>
                  <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                    {t.latestThreeBadge}
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 min-w-[120px] text-center">{t.notes}</th>
              <th className="py-2.5 px-2 text-center min-w-[120px] no-print">{t.actions}</th>
            </tr>
          </thead>

          {/* Rows: Centered text, sleek hover, image zoomable, subtle out-of-stock highlight */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {sortedMaterials.map((mat, index) => {
              const isOutOfStock = mat.availableStock === 0;
              const isHighlighted = highlightedId === mat.id;

              return (
                <tr
                  key={mat.id}
                  className={`divide-x divide-slate-200 dark:divide-slate-800 transition-all duration-300 ${
                    isHighlighted
                      ? "ring-4 ring-emerald-500/80 shadow-lg scale-[1.008] z-20 bg-emerald-100/60 dark:bg-emerald-950/60"
                      : isOutOfStock
                      ? "bg-slate-50/70 dark:bg-slate-850/60 border-s-2 border-s-amber-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* # Index */}
                  <td className="py-2 px-2 text-center font-mono text-slate-400 select-none text-xs">
                    {index + 1}
                  </td>

                  {/* Panel Photo Thumbnail with Pan & Zoom */}
                  <td className="py-2 px-2 text-center">
                    {mat.imageUrl ? (
                      <div
                        onClick={() =>
                          setZoomedImage({
                            url: mat.imageUrl!,
                            title: `${mat.code} - ${mat.name}`,
                          })
                        }
                        className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer group shadow-2xs mx-auto"
                        title={t.zoom}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mat.imageUrl}
                          alt={mat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Code */}
                  <td className="py-2 px-3 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold border border-slate-300 dark:border-slate-700">
                      {mat.code}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="py-2 px-3 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs">
                      {mat.type}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-2 px-3 text-center font-semibold text-slate-900 dark:text-white break-words">
                    {mat.name}
                  </td>

                  {/* Dimensions */}
                  <td className="py-2 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                    {mat.dimensions.formatted}
                  </td>

                  {/* Stock: Deducted directly from on-hand inventory + Steppers */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      {userPermissions.canEditPanels ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => quickStepStock(mat.id, -1)}
                            disabled={mat.availableStock === 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors active:scale-90"
                            title="-1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className={`font-mono font-black min-w-[32px] text-base ${
                              isOutOfStock
                                ? "text-slate-600 dark:text-slate-400"
                                : "text-emerald-800 dark:text-emerald-300"
                            }`}
                          >
                            {mat.availableStock}
                          </span>
                          <button
                            onClick={() => quickStepStock(mat.id, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors active:scale-90"
                            title="+1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`font-mono font-black min-w-[32px] text-lg ${
                            isOutOfStock
                              ? "text-slate-600 dark:text-slate-400"
                              : "text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          {mat.availableStock}
                        </span>
                      )}

                      {/* Out of Stock & Reserved Badges */}
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{t.outOfStockBadge}</span>
                        </span>
                      ) : mat.allocatedStock > 0 ? (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 shadow-2xs">
                          <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>{mat.allocatedStock} {t.reserved}</span>
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Orders allocated to this panel (Latest 3 only) */}
                  <td className="py-2 px-3 text-center">
                    {mat.activeOrders.length > 0 ? (() => {
                      const sortedOrders = [...mat.activeOrders].sort((a, b) => {
                        if (b.createdAt && a.createdAt) return b.createdAt - a.createdAt;
                        return (b.id || "").localeCompare(a.id || "");
                      });
                      const displayedOrders = sortedOrders.slice(0, 3);
                      const hasMoreOrders = mat.activeOrders.length > 3;
                      const remainingCount = mat.activeOrders.length - 3;

                      return (
                        <div className="space-y-1.5 max-w-[250px] mx-auto">
                          {/* Indicator badge: lets them know it only shows the latest 3 */}
                          <div className="flex items-center justify-between text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 mb-1">
                            <span>
                              {hasMoreOrders
                                ? `${t.latestThreeOf} ${mat.activeOrders.length}`
                                : `${t.latestThreeBadge} (${mat.activeOrders.length})`}
                            </span>
                            <span className="font-mono">
                              {mat.allocatedStock} {t.reserved}
                            </span>
                          </div>

                          {/* Up to latest 3 orders */}
                          {displayedOrders.map((ord) => (
                            <div
                              key={ord.id}
                              onClick={() =>
                                onSelectOrderForDetails &&
                                onSelectOrderForDetails({ order: ord, material: mat })
                              }
                              className="p-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-start hover:border-emerald-500/50 hover:bg-emerald-50/20 transition-colors cursor-pointer group/order shadow-2xs"
                              title={t.viewDetails}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-xs text-slate-900 dark:text-white group-hover/order:text-emerald-700 dark:group-hover/order:text-emerald-400 truncate">
                                  {ord.client}
                                </span>
                                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                                  (-{ord.quantity})
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {/* Finalize order directly from panels table */}
                                {!isViewer && ord.status !== "finalized" && (
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
                                    className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 transition-colors"
                                    title={t.finalize}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </button>
                                )}
                                {ord.status === "finalized" && (
                                  <span
                                    className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 rounded"
                                    title={t.finalized}
                                  >
                                    ✓
                                  </span>
                                )}

                                <button
                                  onClick={() =>
                                    onSelectOrderForDetails &&
                                    onSelectOrderForDetails({ order: ord, material: mat })
                                  }
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                  title={t.viewDetails}
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                {userPermissions.canEditPanels && (
                                  <button
                                    onClick={() => onOpenOrderModal(mat.id, { materialId: mat.id, order: ord })}
                                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                    title={t.edit}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* More orders indicator */}
                          {hasMoreOrders && (
                            <button
                              onClick={() => onNavigateToOrders ? onNavigateToOrders(mat) : null}
                              className="w-full text-center py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                              title={t.moreInOrdersTab}
                            >
                              <span>+{remainingCount} {t.moreInOrdersTab}</span>
                            </button>
                          )}
                        </div>
                      );
                    })() : (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Notes: Expandable and vertically scrollable */}
                  <td className="py-2 px-3 text-center text-xs text-slate-600 dark:text-slate-300">
                    <ExpandableNotes notes={mat.notes} />
                  </td>

                  {/* Actions: Prominent, larger, clear buttons */}
                  <td className="py-2 px-3 text-center no-print">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Allocate Order for this panel: Strictly unmounted unless canCreatePanels */}
                      {userPermissions.canCreatePanels && (
                        <button
                          onClick={() => onOpenOrderModal(mat.id)}
                          disabled={isOutOfStock}
                          className="p-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 disabled:opacity-40"
                          title={t.addOrder}
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Print Panel Slip or Toggle Queue */}
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
                            className={`p-2 rounded-xl border shadow-2xs transition-all active:scale-95 flex items-center justify-center ${
                              inQueue
                                ? "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                            }`}
                            title={inQueue ? "Remove from Print Queue" : "Print Panel Slip"}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        );
                      })()}

                      {/* Edit Panel: Rendered strictly if canEditPanels */}
                      {userPermissions.canEditPanels && (
                        <button
                          onClick={() => onOpenMaterialModal(mat)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
                          title={t.edit}
                        >
                          <Edit2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                        </button>
                      )}

                      {/* Delete Panel with On-Site Modal: Rendered strictly if canDeletePanels */}
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
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs transition-all active:scale-95"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
