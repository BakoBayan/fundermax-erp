"use client";

import React, { useState, useMemo } from "react";
import { useInventory } from "../context/InventoryContext";
import { OrderAllocation, PanelMaterial } from "../types/inventory";
import { SearchableDropdown } from "./SearchableDropdown";
import { ExpandableNotes } from "./ExpandableNotes";
import {
  PackagePlus,
  Search,
  ZoomIn,
  Eye,
  Edit2,
  Trash2,
  User,
  ArrowUpDown,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  X,
  DoorClosed,
} from "lucide-react";
import { exportOrdersToCSV } from "../utils/export";
import { OrderContactActions } from "./OrderContactActions";
import { CutMathModal } from "./CutMathModal";

interface FlattenedOrder {
  order: OrderAllocation;
  material: PanelMaterial;
}

interface OrdersSectionProps {
  onOpenOrderModal: (
    materialId?: string,
    orderToEdit?: { materialId: string; order: OrderAllocation }
  ) => void;
  onSelectOrderForDetails: (item: FlattenedOrder) => void;
  onPrintIndividualItem?: (target: { type: "panel" | "order"; material?: PanelMaterial; order?: OrderAllocation }) => void;
  selectedPrintItemIds?: Set<string>;
  onTogglePrintQueueItem?: (item: { id: string; type: "order"; material: PanelMaterial; order: OrderAllocation }) => void;
}

export const OrdersSection: React.FC<OrdersSectionProps> = ({
  onOpenOrderModal,
  onSelectOrderForDetails,
  onPrintIndividualItem,
  selectedPrintItemIds,
  onTogglePrintQueueItem,
}) => {
  const {
    t,
    language,
    materials,
    customTypes,
    addCustomType,
    deleteCustomType,
    finalizeOrder,
    deleteOrder,
    canDeleteMaterial,
    userPermissions,
    requestConfirm,
    setZoomedImage,
    effectiveMode,
    highlightedId,
    isViewer,
    printCuttingSlip,
    transactions,
  } = useInventory();

  const isKu = language === 'ku';

  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | "generic" | "door">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [panelTypeFilter, setPanelTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "reserved" | "finalized">("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [cutMathTarget, setCutMathTarget] = useState<{ order: OrderAllocation; material: PanelMaterial } | null>(null);
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [qtyFilter, setQtyFilter] = useState<"all" | "small" | "medium" | "bulk">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highestQty" | "lowestQty">("newest");

  // Dynamically extract unique clients with active orders
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((mat) => {
      mat.activeOrders.forEach((ord) => {
        if (ord.client && ord.client.trim()) set.add(ord.client.trim());
      });
    });
    return Array.from(set).sort();
  }, [materials]);

  // Flatten all active orders with their parent panel material
  const allOrdersList: FlattenedOrder[] = useMemo(() => {
    const list: FlattenedOrder[] = [];
    materials.forEach((mat) => {
      mat.activeOrders.forEach((ord) => {
        list.push({ order: ord, material: mat });
      });
    });
    return list;
  }, [materials]);

  const getOrderTimestamp = (ord: OrderAllocation) => {
    if (ord.createdAt && typeof ord.createdAt === "number" && ord.createdAt > 0) {
      return ord.createdAt;
    }
    const numMatch = ord.id.match(/\d+/);
    if (numMatch) {
      const parsed = parseInt(numMatch[0], 10);
      if (!isNaN(parsed) && parsed > 1000000000000) return parsed;
    }
    if (ord.date) {
      const dateParsed = new Date(ord.date).getTime();
      if (!isNaN(dateParsed)) return dateParsed;
    }
    return 0;
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    const result = allOrdersList.filter(({ order, material }) => {
      if (jobTypeFilter === "door" && order.jobType !== "door" && !order.doorSpec) {
        return false;
      }
      if (jobTypeFilter === "generic" && (order.jobType === "door" || !!order.doorSpec)) {
        return false;
      }

      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const clientMatch = order.client.toLowerCase().includes(q);
        const orderNumMatch = order.orderNumber.toLowerCase().includes(q);
        const panelCodeMatch = material.code.toLowerCase().includes(q);
        const panelNameMatch = material.name.toLowerCase().includes(q);
        const notesMatch = (order.notes || "").toLowerCase().includes(q);
        const doorModelMatch = (order.doorSpec?.doorModel || "").toLowerCase().includes(q);
        if (
          !clientMatch &&
          !orderNumMatch &&
          !panelCodeMatch &&
          !panelNameMatch &&
          !notesMatch &&
          !doorModelMatch
        )
          return false;
      }

      const isAllType =
        !panelTypeFilter ||
        panelTypeFilter === "all" ||
        panelTypeFilter === t.allTypes ||
        panelTypeFilter === "All Types" ||
        panelTypeFilter === "هەموو جۆرەکان";

      if (!isAllType && material.type.toLowerCase() !== panelTypeFilter.toLowerCase()) {
        return false;
      }

      const isFinalized = order.status === "finalized";
      if (statusFilter === "reserved" && isFinalized) return false;
      if (statusFilter === "finalized" && !isFinalized) return false;

      if (clientFilter !== "all" && order.client.trim().toLowerCase() !== clientFilter.toLowerCase()) {
        return false;
      }

      if (qtyFilter === "small" && (order.quantity < 1 || order.quantity > 5)) return false;
      if (qtyFilter === "medium" && (order.quantity < 6 || order.quantity > 20)) return false;
      if (qtyFilter === "bulk" && order.quantity <= 20) return false;

      if (timeframeFilter !== "all") {
        const ts = getOrderTimestamp(order);
        if (ts > 0) {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          if (timeframeFilter === "today" && now - ts > oneDay) return false;
          if (timeframeFilter === "week" && now - ts > 7 * oneDay) return false;
          if (timeframeFilter === "month" && now - ts > 30 * oneDay) return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "highestQty") {
        const qtyDiff = b.order.quantity - a.order.quantity;
        if (qtyDiff !== 0) return qtyDiff;
        return getOrderTimestamp(b.order) - getOrderTimestamp(a.order);
      }
      if (sortBy === "lowestQty") {
        const qtyDiff = a.order.quantity - b.order.quantity;
        if (qtyDiff !== 0) return qtyDiff;
        return getOrderTimestamp(b.order) - getOrderTimestamp(a.order);
      }
      if (sortBy === "oldest") {
        const timeDiff = getOrderTimestamp(a.order) - getOrderTimestamp(b.order);
        if (timeDiff !== 0) return timeDiff;
        return a.order.id.localeCompare(b.order.id);
      }
      // default: newest
      const timeDiff = getOrderTimestamp(b.order) - getOrderTimestamp(a.order);
      if (timeDiff !== 0) return timeDiff;
      return b.order.id.localeCompare(a.order.id);
    });

    return result;
  }, [allOrdersList, orderSearch, panelTypeFilter, statusFilter, clientFilter, timeframeFilter, qtyFilter, sortBy, t.allTypes]);

  const isAllType =
    !panelTypeFilter ||
    panelTypeFilter === "all" ||
    panelTypeFilter === t.allTypes ||
    panelTypeFilter === "All Types" ||
    panelTypeFilter === "هەموو جۆرەکان";

  const hasActiveFilters = Boolean(
    orderSearch.trim() ||
    !isAllType ||
    statusFilter !== "all" ||
    clientFilter !== "all" ||
    timeframeFilter !== "all" ||
    qtyFilter !== "all" ||
    sortBy !== "newest"
  );

  const resetAllFilters = () => {
    setOrderSearch("");
    setPanelTypeFilter("all");
    setStatusFilter("all");
    setClientFilter("all");
    setTimeframeFilter("all");
    setQtyFilter("all");
    setSortBy("newest");
  };

  const fontClass = language === "ku" ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  return (
    <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${fontClass}`}>
      {/* Orders Filter & Action Toolbar */}
      <div className="p-2.5 sm:px-5 bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 select-none no-print">
        <div className="flex items-center gap-2 flex-1 max-w-4xl flex-wrap">
          {/* Create New Order Button (Strictly unmounted unless canCreatePanels) */}
          {userPermissions.canCreatePanels && (
            <button
              onClick={() => onOpenOrderModal()}
              disabled={materials.length === 0}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl font-bold shadow-2xs active:scale-95 transition-all shrink-0"
              title={t.addOrder}
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span>{t.addOrder}</span>
            </button>
          )}

          {/* 1-Click Workshop Job Type Selector: Generic vs Custom Door */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 text-xs font-semibold shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setJobTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                jobTypeFilter === "all"
                  ? "bg-slate-900 dark:bg-slate-700 text-white font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {isKu ? 'هەموو' : 'All'} ({allOrdersList.length})
            </button>
            <button
              type="button"
              onClick={() => setJobTypeFilter("generic")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                jobTypeFilter === "generic"
                  ? "bg-emerald-700 text-white font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {isKu ? 'بڕینی ئاسایی' : 'Standard Cuts'}
            </button>
            <button
              type="button"
              onClick={() => setJobTypeFilter("door")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                jobTypeFilter === "door"
                  ? "bg-emerald-700 text-white font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>{isKu ? 'دروستکردنی دەرگا' : 'Door Fabrication'}</span>
            </button>
          </div>

          {/* Search Input with Instant Clear and Hotkey Indicator */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              id="warehouse-orders-search-input"
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={t.searchOrders}
              className="w-full h-8 ps-9 pe-8 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs text-xs sm:text-sm"
            />
            {orderSearch ? (
              <button
                type="button"
                onClick={() => setOrderSearch("")}
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

          {/* Panel Type Filter */}
          <div className="w-28 sm:w-36 shrink-0">
            <SearchableDropdown
              options={[t.allTypes, ...customTypes]}
              value={panelTypeFilter === "all" ? t.allTypes : panelTypeFilter}
              onChange={(v) => setPanelTypeFilter(v === t.allTypes ? "all" : v)}
              onAddNew={!isViewer ? addCustomType : undefined}
              onDeleteOption={!isViewer ? deleteCustomType : undefined}
              placeholder={t.allTypes}
              compact={true}
              allowDelete={!isViewer}
            />
          </div>

          {/* Client Filter */}
          {uniqueClients.length > 0 && (
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
              <User className="w-3.5 h-3.5 me-1 text-slate-400" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                title="Filter by Client"
              >
                <option value="all" className="dark:bg-slate-800">{language === 'ku' ? 'هەموو کڕیاران' : 'All Clients'}</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client} className="dark:bg-slate-800">
                    {client}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter (All, Reserved, Finalized) */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "reserved" | "finalized")}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">{t.allStock}</option>
              <option value="reserved" className="dark:bg-slate-800">{t.orderStatusReserved}</option>
              <option value="finalized" className="dark:bg-slate-800">{t.orderStatusFinalized}</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <Clock className="w-3.5 h-3.5 me-1 text-slate-400" />
            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value as "all" | "today" | "week" | "month")}
              className="bg-transparent focus:outline-none cursor-pointer"
              title="Filter by Timeframe"
            >
              <option value="all" className="dark:bg-slate-800">{language === 'ku' ? 'هەموو کات' : 'All Time'}</option>
              <option value="today" className="dark:bg-slate-800">{language === 'ku' ? 'ئەمڕۆ' : 'Today'}</option>
              <option value="week" className="dark:bg-slate-800">{language === 'ku' ? 'ئەم هەفتەیە' : 'Last 7 Days'}</option>
              <option value="month" className="dark:bg-slate-800">{language === 'ku' ? 'ئەم مانگە' : 'This Month'}</option>
            </select>
          </div>

          {/* Quantity Size Filter */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 me-1">Qty:</span>
            <select
              value={qtyFilter}
              onChange={(e) => setQtyFilter(e.target.value as "all" | "small" | "medium" | "bulk")}
              className="bg-transparent focus:outline-none cursor-pointer"
              title="Filter by Quantity Size"
            >
              <option value="all" className="dark:bg-slate-800">{language === 'ku' ? 'هەموو بڕێک' : 'All Quantities'}</option>
              <option value="small" className="dark:bg-slate-800">{language === 'ku' ? 'بچووک (١-٥)' : 'Small (1-5 pcs)'}</option>
              <option value="medium" className="dark:bg-slate-800">{language === 'ku' ? 'ناوەند (٦-٢٠)' : 'Medium (6-20 pcs)'}</option>
              <option value="bulk" className="dark:bg-slate-800">{language === 'ku' ? 'زۆر (> ٢٠)' : 'Bulk (> 20 pcs)'}</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 me-1.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "highestQty" | "lowestQty")}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="newest" className="dark:bg-slate-800">{t.newest}</option>
              <option value="oldest" className="dark:bg-slate-800">{t.oldest}</option>
              <option value="highestQty" className="dark:bg-slate-800">{t.highestQty}</option>
              <option value="lowestQty" className="dark:bg-slate-800">{t.lowestQty}</option>
            </select>
          </div>

          {/* 1-Click Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Reset all active order filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'ku' ? 'سڕینەوەی فلتەر' : 'Clear Filters'}</span>
            </button>
          )}
        </div>

        {/* Actions & Stats: Export CSV and Total Orders Count */}
        <div className="flex items-center gap-2 shrink-0">
          {userPermissions?.canExport !== false && (
          <button
            onClick={() => exportOrdersToCSV(filteredOrders, language)}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 disabled:opacity-40 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs active:scale-95 transition-all"
            title={t.exportOrders}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t.exportCSV}</span>
          </button>
          )}

          {/* Total Orders Counter Pill */}
          <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 text-xs">
            <span>{t.orders}: </span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {hasActiveFilters ? `${filteredOrders.length}/${allOrdersList.length}` : filteredOrders.length}
            </strong>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <PackagePlus className="w-7 h-7" />
          </div>
          <p className="font-bold text-sm sm:text-base">
            {allOrdersList.length === 0 ? t.emptyOrders : t.noOrdersFound}
          </p>
        </div>
      ) : effectiveMode === "pc" ? (
        /* PC Table View */
        <div className="flex-1 w-full max-w-full overflow-x-auto pb-4">
          <table className="w-full border-collapse text-center select-text">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 select-none shadow-2xs">
              <tr className="divide-x divide-slate-200 dark:divide-slate-700">
                <th className="w-10 py-2.5 px-2 text-center bg-slate-200/70 dark:bg-slate-750">#</th>
                <th className="py-2.5 px-3 min-w-[95px] text-center">{t.date}</th>
                <th className="py-2.5 px-3 min-w-[105px] text-center">{t.orderNumber}</th>
                <th className="py-2.5 px-3 min-w-[140px] text-center">{t.client}</th>
                <th className="py-2.5 px-3 min-w-[170px] text-center">{t.assignedPanel}</th>
                <th className="py-2.5 px-3 min-w-[95px] text-center">{t.type}</th>
                <th className="py-2.5 px-3 min-w-[110px] text-center bg-emerald-50/50 dark:bg-emerald-950/20 font-black text-emerald-800 dark:text-emerald-300">
                  {t.quantity}
                </th>
                <th className="py-2.5 px-3 min-w-[100px] text-center">{t.stockStatus}</th>
                <th className="w-12 py-2.5 px-2 text-center">{t.image}</th>
                <th className="py-2.5 px-3 min-w-[130px] text-center">{t.notes}</th>
                <th className="py-2.5 px-3 min-w-[170px] text-center no-print">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredOrders.map(({ order, material }, index) => {
                const isFinalized = order.status === "finalized";

                const isHighlighted = highlightedId === order.id || highlightedId === material.id;

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrderForDetails({ order, material })}
                    className={`divide-x divide-slate-200 dark:divide-slate-800 transition-all duration-300 cursor-pointer group ${
                      isHighlighted
                        ? "ring-4 ring-emerald-500/80 shadow-lg scale-[1.008] z-20 bg-emerald-100/60 dark:bg-emerald-950/60"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                    title={t.viewDetails}
                  >
                    {/* Index */}
                    <td className="py-2 px-2 text-center font-mono text-slate-400 select-none text-xs">
                      {index + 1}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                      {order.date}
                    </td>

                    {/* Order Number */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                          {order.orderNumber}
                        </span>
                        {(order.jobType === "door" || !!order.doorSpec) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800 whitespace-nowrap">
                            <DoorClosed className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              {isKu ? 'دەرگا ' : 'Door '}
                              {order.doorSpec ? `${(order.doorSpec.doorHeight / 10).toFixed(0)}×${(order.doorSpec.doorWidth / 10).toFixed(0)}` : ""}
                              {order.doorSpec ? ` (${order.doorSpec.openingDirection === "left" ? (isKu ? "چەپ" : "L") : (isKu ? "ڕاست" : "R")})` : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Client Name */}
                    <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center justify-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {order.client}
                        </span>
                      </div>
                       <div className="mt-1 flex justify-center">
                         <OrderContactActions order={order} transactions={transactions} isKu={isKu} />
                       </div>
                    </td>

                    {/* Assigned Panel */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {material.imageUrl && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({
                                url: material.imageUrl!,
                                title: `${material.code} - ${material.name}`,
                              });
                            }}
                            className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0"
                            title={t.zoom}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={material.imageUrl}
                              alt={material.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                          {material.code}
                        </span>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {material.name}
                        </span>
                      </div>
                    </td>

                    {/* Panel Type */}
                    <td className="py-2 px-3 text-center text-xs text-slate-600 dark:text-slate-400">
                      {material.type}
                    </td>

                    {/* Quantity */}
                    <td className="py-2 px-3 text-center font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                      {order.quantity} {t.panelUnit}
                       <button
                         type="button"
                         onClick={(e) => { e.stopPropagation(); setCutMathTarget({ order, material }); }}
                         className="block mx-auto mt-0.5 text-[10px] font-sans font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                       >
                         {isKu ? 'وردەکاری بڕین و بەفیڕۆچوون ←' : 'Inspect Cut Math ←'}
                       </button>
                    </td>

                    {/* Status Pill (Reserved vs Finalized) */}
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isFinalized
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                      }`}>
                        {isFinalized ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-sky-600" />}
                        <span>{isFinalized ? t.finalized : t.reserved}</span>
                      </span>
                    </td>

                    {/* Attached Image Thumbnail */}
                    <td className="py-2 px-2 text-center">
                      {order.imageUrl ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage({
                              url: order.imageUrl!,
                              title: `${order.client} (${order.orderNumber})`,
                            });
                          }}
                          className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 cursor-pointer mx-auto group/img shadow-2xs"
                          title={t.zoom}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.imageUrl}
                            alt="Order attachment"
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Notes: Expandable and vertically scrollable */}
                    <td className="py-2 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      <ExpandableNotes notes={order.notes} />
                    </td>

                    {/* Actions: Larger, clearer buttons */}
                    <td
                      className="py-2.5 px-3 text-center no-print"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Finalize Button: Strictly unmounted unless canEditPanels */}
                        {userPermissions.canEditPanels && !isFinalized && (
                          <button
                            onClick={() => {
                              requestConfirm({
                                title: t.finalize,
                                message: t.finalizeOrderPrompt,
                                confirmLabel: t.finalize,
                                type: "success",
                                onConfirm: () => finalizeOrder(material.id, order.id),
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
                            title={t.finalize}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t.finalize}</span>
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => onSelectOrderForDetails({ order, material })}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1 text-xs font-bold shadow-2xs transition-all active:scale-95"
                          title={t.viewDetails}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden xl:inline">{t.viewDetails}</span>
                        </button>

                        {/* Print Order Slip or Toggle Queue */}
                        {(() => {
                          const inQueue = selectedPrintItemIds?.has(`order-${order.id}`);
                          return (
                            <button
                              onClick={() => {
                                if (selectedPrintItemIds && selectedPrintItemIds.size > 0 && onTogglePrintQueueItem) {
                                  onTogglePrintQueueItem({ id: `order-${order.id}`, type: "order", material, order });
                                } else {
                                  printCuttingSlip(order, material);
                                }
                              }}
                              className={`p-2 rounded-xl border shadow-2xs transition-all active:scale-95 flex items-center justify-center ${
                                inQueue
                                  ? "bg-sky-100 text-sky-800 border-sky-400 dark:bg-sky-950 dark:text-sky-200"
                                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                              }`}
                              title={inQueue ? "Remove from Print Queue" : (language === 'ku' ? 'چاپی پسوڵەی بڕین' : 'Print Cutting Slip')}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          );
                        })()}

                        {/* Edit Order: Strictly unmounted unless canEditPanels */}
                        {userPermissions.canEditPanels && (
                          <button
                            onClick={() => onOpenOrderModal(material.id, { materialId: material.id, order })}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
                            title={t.edit}
                          >
                            <Edit2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          </button>
                        )}

                        {/* Delete Order with On-Site Modal: Strictly unmounted unless canDeletePanels */}
                        {userPermissions.canDeletePanels && (
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
                                onConfirm: () => deleteOrder(material.id, order.id),
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
      ) : (
        /* Mobile Cards View */
        <div className="p-2.5 sm:px-4 py-3 space-y-3 overflow-y-auto pb-24 w-full max-w-xl mx-auto box-border overflow-x-hidden touch-pan-y">
          {filteredOrders.map(({ order, material }) => {
            const isFinalized = order.status === "finalized";

            const isHighlighted = highlightedId === order.id || highlightedId === material.id;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrderForDetails({ order, material })}
                className={`w-full max-w-full bg-white dark:bg-slate-800 rounded-2xl border p-3 shadow-2xs space-y-2.5 cursor-pointer active:scale-[0.99] transition-all duration-300 ${
                  isHighlighted
                    ? "ring-4 ring-emerald-500/80 shadow-lg scale-[1.01] z-20 bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-400"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Header: Order # + Client Name + Status pill ([لە کاردایە / In Queue] or [تەواوکراو / Finalized]) */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-750 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs border border-sky-500/20">
                      #{order.orderNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                        {order.client}
                      </div>
                       <OrderContactActions order={order} transactions={transactions} isKu={isKu} />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs text-slate-400">
                          {order.date}
                        </span>
                        {(order.jobType === "door" || !!order.doorSpec) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                            <DoorClosed className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              {isKu ? 'دەرگا ' : 'Door '}
                              {order.doorSpec ? `${(order.doorSpec.doorHeight / 10).toFixed(0)}×${(order.doorSpec.doorWidth / 10).toFixed(0)}` : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill: [لە کاردایە / In Queue] vs [تەواوکراو / Finalized] */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isFinalized
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                  }`}>
                    {isFinalized ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-sky-600" />}
                    <span>{isFinalized ? (isKu ? 'تەواوکراو / Finalized' : 'Finalized / تەواوکراو') : (isKu ? 'لە کاردایە / In Queue' : 'In Queue / لە کاردایە')}</span>
                  </span>
                </div>

                {/* Details: Assigned panel code, sheet count, attached blueprint thumbnail */}
                <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Blueprint / Order Image Thumbnail if attached */}
                    {order.imageUrl ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage({
                            url: order.imageUrl!,
                            title: `${order.client} - #${order.orderNumber}`,
                          });
                        }}
                        className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs group cursor-pointer"
                        title={t.zoom}
                      >
                        <img src={order.imageUrl} alt="Blueprint" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    ) : material.imageUrl ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage({
                            url: material.imageUrl!,
                            title: `${material.code} - ${material.name}`,
                          });
                        }}
                        className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 shadow-2xs group cursor-pointer"
                        title={t.zoom}
                      >
                        <img src={material.imageUrl} alt="Panel" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ) : null}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-650">
                          #{material.code}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold truncate">
                          {material.type}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {material.name}
                      </div>
                    </div>
                  </div>

                  {/* Sheet count */}
                  <div className="text-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      {isKu ? 'دانە' : 'Sheets'}
                    </div>
                    <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {order.quantity}
                    </div>
                     <button
                       type="button"
                       onClick={(e) => { e.stopPropagation(); setCutMathTarget({ order, material }); }}
                       className="mt-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                     >
                       {isKu ? 'وردەکاری بڕین و بەفیڕۆچوون ←' : 'Inspect Cut Math ←'}
                     </button>
                  </div>
                </div>

                {/* Order Notes: Expansive, clean block */}
                {order.notes && (
                  <div className="pt-0.5">
                    <ExpandableNotes notes={order.notes} variant="block" />
                  </div>
                )}

                {/* Bottom Action Bar: Prominent 1-tap buttons for [وردەکاری / Details], [چاپ / Print Slip], and [تەواوکردن / Finalize] */}
                <div
                  className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-750"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1. [وردەکاری / Details] */}
                  <button
                    type="button"
                    onClick={() => onSelectOrderForDetails({ order, material })}
                    className="flex-1 min-h-[48px] px-2.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    <span>{isKu ? 'وردەکاری / Details' : 'Details / وردەکاری'}</span>
                  </button>

                  {/* 2. [چاپ / Print Slip] */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPrintItemIds && selectedPrintItemIds.size > 0 && onTogglePrintQueueItem) {
                        onTogglePrintQueueItem({ id: `order-${order.id}`, type: "order", material, order });
                      } else {
                        printCuttingSlip(order, material);
                      }
                    }}
                    className="flex-1 min-h-[48px] px-2.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title={isKu ? 'چاپی پسوڵەی بڕین' : 'Print Cutting Slip'}
                  >
                    <Printer className="w-4 h-4 shrink-0" />
                    <span>{isKu ? 'چاپ / Print' : 'Print / چاپ'}</span>
                  </button>

                  {/* 3. [تەواوکردن / Finalize] */}
                  {userPermissions.canEditPanels && !isFinalized ? (
                    <button
                      type="button"
                      onClick={() => {
                        requestConfirm({
                          title: t.finalize,
                          message: t.finalizeOrderPrompt,
                          confirmLabel: t.finalize,
                          type: "success",
                          onConfirm: () => finalizeOrder(material.id, order.id),
                        });
                      }}
                      className="flex-1 min-h-[48px] px-2.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{isKu ? 'تەواوکردن / Finalize' : 'Finalize / تەواوکردن'}</span>
                    </button>
                  ) : (
                    <div className="flex-1 min-h-[48px] px-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isKu ? 'تەواوکراوە' : 'Finalized'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {cutMathTarget && (
        <CutMathModal order={cutMathTarget.order} material={cutMathTarget.material} onClose={() => setCutMathTarget(null)} />
      )}
    </div>
  );
};
