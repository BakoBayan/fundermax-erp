'use client';

import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Package,
  Truck,
  Plus,
  Trash2,
  Edit3,
  Download,
  Search,
  Kanban,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  MapPin,
  X,
  SlidersHorizontal,
  BarChart3
} from 'lucide-react';
import { Product, Shipment, ShipmentStatus } from '../types/inventory';
import { exportProductsToCSV, exportShipmentsToCSV } from '../utils/export';
import { SearchableDropdown } from './SearchableDropdown';
import DropdownManagerModal from './DropdownManagerModal';
import { autoCapitalizeFirstLetter } from '../utils/text';

export const WarehouseGoodsSection: React.FC = () => {
  const {
    t,
    language,
    products,
    addProduct,
    editProduct,
    deleteProduct,
    shipments,
    addShipment,
    updateShipmentStatus,
    deleteShipment,
    canModify,
    canDeleteMaterial,
    userPermissions,
    hasModulePermission,
    isViewer,
    dropdownPresets,
    addToDropdownPresets,
    removeFromDropdownPresets,
    openVisualCharts,
  } = useInventory();

  const isKu = language === 'ku';

  const hasGoods = hasModulePermission('goods');
  const hasShipping = hasModulePermission('shipping');

  const savedCategories = dropdownPresets?.savedCategories || [
    'Hardware & Edge Banding',
    'Veneer & Laminate',
    'PVC Edging',
    'Glues & Fasteners',
    'Accessories'
  ];

  const savedLocations = dropdownPresets?.savedLocations || [
    'Bay A-1',
    'Bay A-2',
    'Bay B-1',
    'Bay B-2',
    'Bay C-1',
    'Warehouse Floor'
  ];

  // Sub-tab: "goods" vs "shipping" (respecting individual account permissions)
  const [activeTab, setActiveTab] = useState<'goods' | 'shipping'>(() => {
    if (!hasGoods && hasShipping) return 'shipping';
    return 'goods';
  });
  const [goodsViewMode, setGoodsViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [goodsStockStatusFilter, setGoodsStockStatusFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');
  const [goodsLocationFilter, setGoodsLocationFilter] = useState<string>('all');
  const [goodsSortBy, setGoodsSortBy] = useState<'name' | 'stockAsc' | 'stockDesc' | 'priceAsc' | 'priceDesc'>('name');

  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'all' | ShipmentStatus>('all');
  const [shipmentDestFilter, setShipmentDestFilter] = useState<string>('all');
  const [shipmentSortBy, setShipmentSortBy] = useState<'newest' | 'oldest' | 'highestQty'>('newest');

  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);

  // Dynamically extract locations and destinations
  const availableLocations = React.useMemo(() => {
    const set = new Set<string>(savedLocations);
    products.forEach((p) => {
      if (p.location && p.location.trim()) set.add(p.location.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [savedLocations, products]);

  const availableDestinations = React.useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      if (s.destination && s.destination.trim()) set.add(s.destination.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [shipments]);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

  // Form states for Product
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Hardware & Edge Banding');
  const [prodStock, setProdStock] = useState<number | ''>(10);
  const [prodMinStock, setProdMinStock] = useState<number | ''>(5);
  const [prodLocation, setProdLocation] = useState('Bay A-1');
  const [prodPrice, setProdPrice] = useState<number | ''>(15);

  // Form states for Shipment
  const [shipTracking, setShipTracking] = useState(`TRK-${Date.now().toString().slice(-5)}`);
  const [shipDest, setShipDest] = useState('');
  const [shipSummary, setShipSummary] = useState('');
  const [shipQty, setShipQty] = useState<number | ''>(10);
  const [shipStatus, setShipStatus] = useState<ShipmentStatus>('pending');

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProdSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
    setProdName('');
    setProdCategory('Hardware & Accessories');
    setProdStock(20);
    setProdMinStock(5);
    setProdLocation('Bay A-1');
    setProdPrice(10);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setProdSku(p.sku);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdStock(p.currentStock);
    setProdMinStock(p.minStock);
    setProdLocation(p.location);
    setProdPrice(p.price);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const stockNum = typeof prodStock === 'number' ? prodStock : 0;
    const minStockNum = typeof prodMinStock === 'number' ? prodMinStock : 0;

    let lane: 'inStock' | 'lowStock' | 'outOfStock' = 'inStock';
    if (stockNum <= 0) lane = 'outOfStock';
    else if (stockNum <= minStockNum) lane = 'lowStock';

    const payload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: prodSku.trim() ? autoCapitalizeFirstLetter(prodSku.trim()) : `SKU-${Date.now().toString().slice(-4)}`,
      name: autoCapitalizeFirstLetter(prodName.trim()),
      category: autoCapitalizeFirstLetter(prodCategory.trim() || 'General'),
      currentStock: stockNum,
      minStock: minStockNum,
      location: autoCapitalizeFirstLetter(prodLocation.trim() || 'Warehouse Floor'),
      price: typeof prodPrice === 'number' ? prodPrice : 0,
      lane,
      lastUpdated: new Date().toISOString(),
    };

    if (editingProduct) {
      editProduct(editingProduct.id, payload);
    } else {
      addProduct(payload);
    }

    setIsProductModalOpen(false);
  };

  const handleSaveShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipDest.trim() || !shipSummary.trim()) return;

    const payload: Shipment = {
      id: `ship-${Date.now()}`,
      trackingCode: shipTracking.trim() ? autoCapitalizeFirstLetter(shipTracking.trim()) : `TRK-${Date.now().toString().slice(-5)}`,
      destination: autoCapitalizeFirstLetter(shipDest.trim()),
      itemSummary: autoCapitalizeFirstLetter(shipSummary.trim()),
      quantity: typeof shipQty === 'number' ? shipQty : 1,
      status: shipStatus,
      createdAt: new Date().toISOString(),
    };

    addShipment(payload);
    setIsShipmentModalOpen(false);
    setShipDest('');
    setShipSummary('');
    setShipQty(10);
  };

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    const list = products.filter((p) => {
      if (selectedCategoryFilter !== 'all' && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (goodsStockStatusFilter === 'inStock' && p.currentStock <= p.minStock) return false;
      if (goodsStockStatusFilter === 'lowStock' && (p.currentStock <= 0 || p.currentStock > p.minStock)) return false;
      if (goodsStockStatusFilter === 'outOfStock' && p.currentStock > 0) return false;

      if (goodsLocationFilter !== 'all' && (p.location || '').toLowerCase() !== goodsLocationFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (goodsSortBy === 'stockAsc') return a.currentStock - b.currentStock;
      if (goodsSortBy === 'stockDesc') return b.currentStock - a.currentStock;
      if (goodsSortBy === 'priceAsc') return a.price - b.price;
      if (goodsSortBy === 'priceDesc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [products, selectedCategoryFilter, goodsStockStatusFilter, goodsLocationFilter, searchQuery, goodsSortBy]);

  // Filter and sort shipments
  const filteredShipments = React.useMemo(() => {
    const list = shipments.filter((s) => {
      if (shipmentStatusFilter !== 'all' && s.status !== shipmentStatusFilter) {
        return false;
      }
      if (shipmentDestFilter !== 'all' && (s.destination || '').toLowerCase() !== shipmentDestFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.trackingCode.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.itemSummary.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (shipmentSortBy === 'highestQty') return b.quantity - a.quantity;
      if (shipmentSortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [shipments, shipmentStatusFilter, shipmentDestFilter, searchQuery, shipmentSortBy]);

  const hasActiveGoodsFilters = Boolean(
    searchQuery.trim() ||
    selectedCategoryFilter !== 'all' ||
    goodsStockStatusFilter !== 'all' ||
    goodsLocationFilter !== 'all' ||
    goodsSortBy !== 'name'
  );

  const resetAllGoodsFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setGoodsStockStatusFilter('all');
    setGoodsLocationFilter('all');
    setGoodsSortBy('name');
  };

  const hasActiveShipmentFilters = Boolean(
    searchQuery.trim() ||
    shipmentStatusFilter !== 'all' ||
    shipmentDestFilter !== 'all' ||
    shipmentSortBy !== 'newest'
  );

  const resetAllShipmentFilters = () => {
    setSearchQuery('');
    setShipmentStatusFilter('all');
    setShipmentDestFilter('all');
    setShipmentSortBy('newest');
  };

  const inStockProducts = filteredProducts.filter((p) => p.lane === 'inStock' || p.currentStock > p.minStock);
  const lowStockProducts = filteredProducts.filter((p) => p.lane === 'lowStock' || (p.currentStock > 0 && p.currentStock <= p.minStock));
  const outOfStockProducts = filteredProducts.filter((p) => p.lane === 'outOfStock' || p.currentStock <= 0);

  const pendingShipments = filteredShipments.filter((s) => s.status === 'pending');
  const transitShipments = filteredShipments.filter((s) => s.status === 'in_transit');
  const deliveredShipments = filteredShipments.filter((s) => s.status === 'delivered');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-200">
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t.module3Title}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isKu
              ? 'بەڕێوەبردنی کاڵاکانی کۆگا و قۆناغەکانی گەیاندن و بەدواداچوونی بار'
              : 'Warehouse goods catalog, stock threshold lanes, and shipping pipeline'}
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-Tab Switcher */}
          {(hasGoods || hasShipping) && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {hasGoods && (
                <button
                  type="button"
                  onClick={() => setActiveTab('goods')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'goods'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{t.goodsInventory} ({products.length})</span>
                </button>
              )}
              {hasShipping && (
                <button
                  type="button"
                  onClick={() => setActiveTab('shipping')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'shipping'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{t.shippingPipeline} ({shipments.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Manage Saved Dropdowns */}
          <button
            type="button"
            onClick={() => setIsDropdownManagerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Manage saved categories and locations"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Manage Dropdowns</span>
          </button>

          {/* Export utility */}
          {userPermissions?.canExport !== false && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'goods') exportProductsToCSV(products, language);
                else exportShipmentsToCSV(shipments, language);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="1-Tap Export to CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Visual Charts Modal Trigger for Goods & Shipping */}
          <button
            type="button"
            onClick={() => openVisualCharts(activeTab === 'shipping' ? 'shipping' : 'goods')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
            title={isKu ? 'چارت و شیکاری کاڵاکانی کۆگا' : 'View Warehouse Goods & Logistics Visual Charts'}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>{isKu ? 'چارتەکانی کۆگا' : 'Goods Charts'}</span>
          </button>

          {/* Primary Action Button */}
          {canModify && (
            activeTab === 'goods' ? (
              <button
                type="button"
                onClick={openNewProductModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Product</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShipTracking(`TRK-${Date.now().toString().slice(-5)}`);
                  setIsShipmentModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.newShipment}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* SEARCH AND VIEW TOGGLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[150px] flex-1">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'goods' ? (isKu ? "گەڕان بەپێی ناو، کۆد، شوێن..." : "Search products by name, SKU, location...") : (isKu ? "گەڕان بەپێی کۆدی بار، شوێن..." : "Search shipments by tracking, destination...")}
              className="w-full h-8 ps-8 pe-7 text-xs rounded-xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* GOODS SPECIFIC FILTERS */}
          {activeTab === 'goods' && (
            <>
              {/* Category Filter */}
              <div className="w-40 shrink-0">
                <SearchableDropdown
                  options={['All Categories', ...savedCategories]}
                  value={selectedCategoryFilter === 'all' ? 'All Categories' : selectedCategoryFilter}
                  onChange={(v) => setSelectedCategoryFilter(v === 'All Categories' ? 'all' : v)}
                  onAddNew={(v) => addToDropdownPresets('savedCategories', v)}
                  onDeleteOption={(v) => removeFromDropdownPresets('savedCategories', v)}
                  placeholder="All Categories"
                  compact={true}
                  allowDelete={!isViewer}
                />
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <select
                  value={goodsStockStatusFilter}
                  onChange={(e) => setGoodsStockStatusFilter(e.target.value as 'all' | 'inStock' | 'lowStock' | 'outOfStock')}
                  className="bg-transparent focus:outline-none cursor-pointer"
                  title="Filter by stock level"
                >
                  <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو کۆگا' : 'All Stock Levels'}</option>
                  <option value="inStock" className="dark:bg-slate-800">{isKu ? 'بەردەست (تەواو)' : 'In Stock (> Min)'}</option>
                  <option value="lowStock" className="dark:bg-slate-800">{isKu ? 'کەم ماوە (پێویستی بە کڕین)' : 'Low Stock (≤ Min)'}</option>
                  <option value="outOfStock" className="dark:bg-slate-800">{isKu ? 'تەواوبوو (0)' : 'Out of Stock (0)'}</option>
                </select>
              </div>

              {/* Location Filter */}
              {availableLocations.length > 0 && (
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  <MapPin className="w-3.5 h-3.5 me-1 text-slate-400" />
                  <select
                    value={goodsLocationFilter}
                    onChange={(e) => setGoodsLocationFilter(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                    title="Filter by warehouse location"
                  >
                    <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو شوێنەکان' : 'All Locations'}</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc} className="dark:bg-slate-800">
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <select
                  value={goodsSortBy}
                  onChange={(e) => setGoodsSortBy(e.target.value as 'name' | 'stockAsc' | 'stockDesc' | 'priceAsc' | 'priceDesc')}
                  className="bg-transparent focus:outline-none cursor-pointer"
                  title="Sort Products"
                >
                  <option value="name" className="dark:bg-slate-800">{isKu ? 'ناو (ئەلفوبێ)' : 'Name (A-Z)'}</option>
                  <option value="stockAsc" className="dark:bg-slate-800">{isKu ? 'کەمترین ژمارە' : 'Stock: Low to High'}</option>
                  <option value="stockDesc" className="dark:bg-slate-800">{isKu ? 'زۆرترین ژمارە' : 'Stock: High to Low'}</option>
                  <option value="priceDesc" className="dark:bg-slate-800">{isKu ? 'بەرزترین نرخ' : 'Price: High to Low'}</option>
                  <option value="priceAsc" className="dark:bg-slate-800">{isKu ? 'نزمترین نرخ' : 'Price: Low to High'}</option>
                </select>
              </div>

              {/* Reset Goods Filters */}
              {hasActiveGoodsFilters && (
                <button
                  type="button"
                  onClick={resetAllGoodsFilters}
                  className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Reset all active goods filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isKu ? 'سڕینەوەی فلتەر' : 'Clear Filters'}</span>
                </button>
              )}
            </>
          )}

          {/* SHIPPING SPECIFIC FILTERS */}
          {activeTab === 'shipping' && (
            <>
              {/* Shipment Status Filter */}
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <select
                  value={shipmentStatusFilter}
                  onChange={(e) => setShipmentStatusFilter(e.target.value as 'all' | ShipmentStatus)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                  title="Filter by shipment status"
                >
                  <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو قۆناغەکان' : 'All Stages'}</option>
                  <option value="pending" className="dark:bg-slate-800">{isKu ? 'چاوەڕوانکراو' : 'Pending Processing'}</option>
                  <option value="in_transit" className="dark:bg-slate-800">{isKu ? 'لە ڕێگایە' : 'In Transit'}</option>
                  <option value="delivered" className="dark:bg-slate-800">{isKu ? 'گەیەندراو' : 'Delivered'}</option>
                </select>
              </div>

              {/* Destination Filter */}
              {availableDestinations.length > 0 && (
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  <Truck className="w-3.5 h-3.5 me-1 text-slate-400" />
                  <select
                    value={shipmentDestFilter}
                    onChange={(e) => setShipmentDestFilter(e.target.value)}
                    className="bg-transparent focus:outline-none cursor-pointer max-w-[120px] truncate"
                    title="Filter by destination"
                  >
                    <option value="all" className="dark:bg-slate-800">{isKu ? 'هەموو ناوچەکان' : 'All Destinations'}</option>
                    {availableDestinations.map((dest) => (
                      <option key={dest} value={dest} className="dark:bg-slate-800">
                        {dest}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                <select
                  value={shipmentSortBy}
                  onChange={(e) => setShipmentSortBy(e.target.value as 'newest' | 'oldest' | 'highestQty')}
                  className="bg-transparent focus:outline-none cursor-pointer"
                  title="Sort Shipments"
                >
                  <option value="newest" className="dark:bg-slate-800">{isKu ? 'نوێترین' : 'Newest'}</option>
                  <option value="oldest" className="dark:bg-slate-800">{isKu ? 'کۆنترین' : 'Oldest'}</option>
                  <option value="highestQty" className="dark:bg-slate-800">{isKu ? 'زۆرترین بڕ' : 'Highest Quantity'}</option>
                </select>
              </div>

              {/* Reset Shipment Filters */}
              {hasActiveShipmentFilters && (
                <button
                  type="button"
                  onClick={resetAllShipmentFilters}
                  className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Reset all active shipment filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isKu ? 'سڕینەوەی فلتەر' : 'Clear Filters'}</span>
                </button>
              )}
            </>
          )}
        </div>

        {activeTab === 'goods' && (
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setGoodsViewMode('board')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                goodsViewMode === 'board'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>{t.boardView}</span>
            </button>
            <button
              type="button"
              onClick={() => setGoodsViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                goodsViewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{t.tableView}</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTENT: GOODS INVENTORY */}
      {activeTab === 'goods' && (
        goodsViewMode === 'board' ? (
          /* Kanban Lanes Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Lane 1: In Stock */}
            <div className="flex flex-col rounded-3xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 min-h-[400px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.inStockLane}
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  {inStockProducts.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {inStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                          {p.sku}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                          {p.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {p.currentStock}
                        </span>
                        <span className="block text-[10px] text-slate-400">units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{p.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          ${p.price}
                        </span>
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1 hover:text-amber-600 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lane 2: Low Stock Alert */}
            <div className="flex flex-col rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-4 min-h-[400px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.lowStockLane}
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                  {lowStockProducts.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-amber-200 dark:border-amber-900/50 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                          {p.sku}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                          {p.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                          {p.currentStock}
                        </span>
                        <span className="block text-[10px] text-amber-600">min {p.minStock}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{p.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          ${p.price}
                        </span>
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1 hover:text-amber-600 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lane 3: Out of Stock */}
            <div className="flex flex-col rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 p-4 min-h-[400px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200 dark:border-rose-900/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t.outOfStockLane}
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-rose-200 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200">
                  {outOfStockProducts.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {outOfStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-rose-200 dark:border-rose-900/50 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                          {p.sku}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                          {p.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {p.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                          0
                        </span>
                        <span className="block text-[10px] text-rose-500">Out of Stock</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{p.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                          ${p.price}
                        </span>
                        {canModify && (
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1 hover:text-amber-600 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Min Stock</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {p.category}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-extrabold text-slate-900 dark:text-white">
                      {p.currentStock}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-500">
                      {p.minStock}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {p.location}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ${p.price}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canModify && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="p-1 hover:text-amber-600 rounded"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canDeleteMaterial && (
                            <button
                              type="button"
                              onClick={() => deleteProduct(p.id)}
                              className="p-1 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* CONTENT: SHIPPING PIPELINE */}
      {activeTab === 'shipping' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Stage 1: Pending */}
          <div className="flex flex-col rounded-3xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 min-h-[400px]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.statusPending}
                </h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                {pendingShipments.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {pendingShipments.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {s.trackingCode}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {s.destination}
                      </h4>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">
                      {s.quantity} units
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {s.itemSummary}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    {canModify && (
                      <button
                        type="button"
                        onClick={() => updateShipmentStatus(s.id, 'in_transit')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 transition-colors"
                      >
                        <span>Dispatch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: In Transit */}
          <div className="flex flex-col rounded-3xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 p-4 min-h-[400px]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-200 dark:border-sky-900/40">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.statusInTransit}
                </h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-200 text-sky-900 dark:bg-sky-900/80 dark:text-sky-200">
                {transitShipments.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {transitShipments.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-sky-200 dark:border-sky-900/50 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                        {s.trackingCode}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {s.destination}
                      </h4>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">
                      {s.quantity} units
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {s.itemSummary}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    {canModify && (
                      <button
                        type="button"
                        onClick={() => updateShipmentStatus(s.id, 'delivered')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Deliver</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: Delivered */}
          <div className="flex flex-col rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 p-4 min-h-[400px]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200 dark:border-emerald-900/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t.statusDelivered}
                </h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                {deliveredShipments.length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {deliveredShipments.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-emerald-200 dark:border-emerald-900/50 shadow-xs opacity-90"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {s.trackingCode}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {s.destination}
                      </h4>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">
                      {s.quantity} units
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {s.itemSummary}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Completed & Delivered
                    </span>
                    {canDeleteMaterial && (
                      <button
                        type="button"
                        onClick={() => deleteShipment(s.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsProductModalOpen(false)}
        >
          <form
            onSubmit={handleSaveProduct}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Warehouse Product' : 'Add New Warehouse Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SKU / Code
                </label>
                <input
                  type="text"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <SearchableDropdown
                  options={savedCategories}
                  value={prodCategory}
                  onChange={setProdCategory}
                  onAddNew={(v) => addToDropdownPresets('savedCategories', v)}
                  onDeleteOption={(v) => removeFromDropdownPresets('savedCategories', v)}
                  placeholder="Select or add category..."
                  allowDelete={!isViewer}
                  compact={true}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. PVC Edge Banding 22mm Oak"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stock Units
                </label>
                <input
                  type="number"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min Alert
                </label>
                <input
                  type="number"
                  value={prodMinStock}
                  onChange={(e) => setProdMinStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location / Bay
              </label>
              <SearchableDropdown
                options={savedLocations}
                value={prodLocation}
                onChange={setProdLocation}
                onAddNew={(v) => addToDropdownPresets('savedLocations', v)}
                onDeleteOption={(v) => removeFromDropdownPresets('savedLocations', v)}
                placeholder="Select or add location/bay..."
                allowDelete={!isViewer}
                compact={true}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD SHIPMENT */}
      {isShipmentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsShipmentModalOpen(false)}
        >
          <form
            onSubmit={handleSaveShipment}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dispatch New Pipeline Shipment
              </h3>
              <button
                type="button"
                onClick={() => setIsShipmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tracking Code
                </label>
                <input
                  type="text"
                  value={shipTracking}
                  onChange={(e) => setShipTracking(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={shipQty}
                  onChange={(e) => setShipQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Destination City / Client Site
              </label>
              <input
                type="text"
                value={shipDest}
                onChange={(e) => setShipDest(e.target.value)}
                placeholder="e.g. Erbil Central Warehouse / Sulaymaniyah Project"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cargo Summary / Content
              </label>
              <textarea
                rows={2}
                value={shipSummary}
                onChange={(e) => setShipSummary(e.target.value)}
                placeholder="e.g. 50x Green MR MDF sheets + PVC edge rolls"
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={shipStatus}
                onChange={(e) => setShipStatus(e.target.value as ShipmentStatus)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsShipmentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
              >
                Dispatch Shipment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DROPDOWN OPTIONS MANAGER MODAL */}
      <DropdownManagerModal
        isOpen={isDropdownManagerOpen}
        onClose={() => setIsDropdownManagerOpen(false)}
        initialTab="savedCategories"
      />
    </div>
  );
};

export default WarehouseGoodsSection;
