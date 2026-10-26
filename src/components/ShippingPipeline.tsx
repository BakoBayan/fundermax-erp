'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/context/InventoryContext';
import { Shipment, ShipmentStatus } from '@/types/inventory';
import {
  Truck,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  Calendar,
  Search,
  RotateCcw,
  Boxes,
  X,
  ArrowLeft,
} from 'lucide-react';

interface ShippingPipelineProps {
  onReturn?: () => void;
}

export const ShippingPipeline: React.FC<ShippingPipelineProps> = ({ onReturn }) => {
  const {
    shipments,
    addShipment,
    updateShipmentStatus,
    language,
    setCurrentModule,
  } = useInventory();

  const isKu = language === 'ku';

  // Mobile active lane tab switcher ('pending' | 'in_transit' | 'delivered')
  const [mobileLane, setMobileLane] = useState<ShipmentStatus>('in_transit');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Add Shipment Modal
  const [newTrackingCode, setNewTrackingCode] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newItemSummary, setNewItemSummary] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | ''>(50);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('pending');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Destination quick presets
  const destinationPresets = isKu
    ? ['سلێمانی - کارگەی ناوەندی', 'هەولێر - کۆگای بەحرکە', 'سلێمانی - کۆگای باشوور', 'دهۆک - کۆگای ناوەندی']
    : ['Sulaymaniyah - Main Factory', 'Erbil - Baharka Depot', 'Sulaymaniyah - South Depot', 'Duhok - Central Hub'];

  // Pre-fill tracking code generator
  const handleOpenAddModal = () => {
    const randomBatch = `BATCH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90 + 10))}`;
    setNewTrackingCode(randomBatch);
    setNewDestination(destinationPresets[0]);
    setNewItemSummary('');
    setNewQuantity(50);
    setNewStatus('pending');
    setNewDate(new Date().toISOString().split('T')[0]);
    setIsAddModalOpen(true);
  };

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackingCode.trim() || !newDestination.trim() || !newItemSummary.trim()) {
      return;
    }
    addShipment({
      id: `shp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      trackingCode: newTrackingCode.trim().toUpperCase(),
      destination: newDestination.trim(),
      itemSummary: newItemSummary.trim(),
      quantity: Number(newQuantity) || 1,
      status: newStatus,
      createdAt: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
    });
    setIsAddModalOpen(false);
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.trackingCode.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        s.itemSummary.toLowerCase().includes(q)
      );
    });
  }, [shipments, searchQuery]);

  // Grouped lanes
  const pendingShipments = useMemo(
    () => filteredShipments.filter((s) => s.status === 'pending'),
    [filteredShipments]
  );
  const inTransitShipments = useMemo(
    () => filteredShipments.filter((s) => s.status === 'in_transit'),
    [filteredShipments]
  );
  const deliveredShipments = useMemo(
    () => filteredShipments.filter((s) => s.status === 'delivered'),
    [filteredShipments]
  );

  const getLaneShipments = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending':
        return pendingShipments;
      case 'in_transit':
        return inTransitShipments;
      case 'delivered':
        return deliveredShipments;
    }
  };

  // Status Labels and Colors
  const STATUS_CONFIG = {
    pending: {
      labelKu: 'چاوەڕوانکراو',
      labelEn: 'Pending Dispatch',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      dotClass: 'bg-amber-500',
      borderClass: 'border-amber-200 dark:border-amber-800/60',
      headerClass: 'text-amber-700 dark:text-amber-400',
    },
    in_transit: {
      labelKu: 'لە ڕێگایە',
      labelEn: 'In Transit',
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800',
      dotClass: 'bg-sky-500 animate-pulse',
      borderClass: 'border-sky-200 dark:border-sky-800/60',
      headerClass: 'text-sky-700 dark:text-sky-400',
    },
    delivered: {
      labelKu: 'گەیشتووە',
      labelEn: 'Delivered',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
      borderClass: 'border-emerald-200 dark:border-emerald-800/60',
      headerClass: 'text-emerald-700 dark:text-emerald-400',
    },
  };

  const renderCard = (shipment: Shipment) => {
    const config = STATUS_CONFIG[shipment.status];
    const isPending = shipment.status === 'pending';
    const isInTransit = shipment.status === 'in_transit';
    const isDelivered = shipment.status === 'delivered';

    return (
      <div
        key={shipment.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-3 transition-all hover:shadow-md space-y-3"
      >
        {/* Top Header: Tracking Code & Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white select-all bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {shipment.trackingCode}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              #{shipment.id.slice(-4)}
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${config.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            <span>{isKu ? config.labelKu : config.labelEn}</span>
          </span>
        </div>

        {/* Destination & Cargo Details */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{shipment.destination}</span>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{shipment.itemSummary}</span>
          </div>
        </div>

        {/* Quantity & Date Strip */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="inline-flex items-center gap-1 text-slate-500 font-mono">
            <Boxes className="w-3.5 h-3.5 text-slate-400" />
            <span>{isKu ? 'بڕ:' : 'Qty:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {shipment.quantity.toLocaleString()}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{new Date(shipment.createdAt).toLocaleDateString(isKu ? 'ar-IQ' : 'en-US')}</span>
          </div>
        </div>

        {/* Touch-Friendly Full-Width Action Buttons (min-h-[48px] for effortless single-hand tapping) */}
        <div className="pt-2">
          {isPending && (
            <button
              type="button"
              onClick={() => updateShipmentStatus(shipment.id, 'in_transit')}
              className="w-full min-h-[48px] px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>{isKu ? 'گۆڕین بۆ لە ڕێگایە' : 'Mark as In Transit'}</span>
              <ArrowRight className={`w-4 h-4 ${isKu ? 'rotate-180' : ''}`} />
            </button>
          )}

          {isInTransit && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => updateShipmentStatus(shipment.id, 'delivered')}
                className="w-full min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKu ? 'گۆڕین بۆ گەیشتووە' : 'Mark as Delivered'}</span>
              </button>
              <button
                type="button"
                onClick={() => updateShipmentStatus(shipment.id, 'pending')}
                className="w-full py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {isKu ? 'گەڕاندنەوە بۆ چاوەڕوانکراو' : 'Move back to Pending'}
              </button>
            </div>
          )}

          {isDelivered && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-h-[48px] px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isKu ? 'گەیشتنی بار تەواوکرا' : 'Delivery Complete'}</span>
              </div>
              <button
                type="button"
                onClick={() => updateShipmentStatus(shipment.id, 'in_transit')}
                className="min-h-[48px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                title={isKu ? 'گەڕاندنەوە بۆ لە ڕێگایە' : 'Move back to In Transit'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReturn || (() => setCurrentModule('hub'))}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
              title={isKu ? 'گەڕانەوە بۆ مێنیوی سەرەکی' : 'Return to Master Hub'}
            >
              <ArrowLeft className={`w-5 h-5 ${isKu ? 'rotate-180' : ''}`} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {isKu ? 'هێڵی گواستنەوە و بارەکان' : 'Shipping Pipeline'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKu
                  ? 'چاودێری بارەکان لە دەرەوە و کارگە، گومرگ و قۆناغەکانی گەیاندن'
                  : 'Real-time cargo tracking, transport logistics & delivery pipeline'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: + باری نوێ */}
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isKu ? '+ باری نوێ' : '+ New Shipment'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div
          onClick={() => setMobileLane('pending')}
          className={`p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border cursor-pointer transition-all ${
            mobileLane === 'pending'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>{isKu ? 'چاوەڕوانکراو' : 'Pending'}</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {pendingShipments.length}
          </div>
        </div>

        <div
          onClick={() => setMobileLane('in_transit')}
          className={`p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border cursor-pointer transition-all ${
            mobileLane === 'in_transit'
              ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400">
            <span>{isKu ? 'لە ڕێگایە' : 'In Transit'}</span>
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {inTransitShipments.length}
          </div>
        </div>

        <div
          onClick={() => setMobileLane('delivered')}
          className={`p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border cursor-pointer transition-all ${
            mobileLane === 'delivered'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>{isKu ? 'گەیشتووە' : 'Delivered'}</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {deliveredShipments.length}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isKu
              ? 'گەڕان بەپێی کۆدی بەدواداچوون (BATCH-...) یان شوێنی گەیشتن...'
              : 'Search by tracking code (BATCH-...), destination, or cargo...'
          }
          className="w-full h-11 ps-10 pe-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. MOBILE-FIRST RESPONSIVENESS: Segmented Top Tab Switcher on Mobile      */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        {/* Clean Segmented Lane Switcher Pills */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1 mb-4">
          <button
            type="button"
            onClick={() => setMobileLane('pending')}
            className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileLane === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{isKu ? 'چاوەڕوانکراو' : 'Pending'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mobileLane === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingShipments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileLane('in_transit')}
            className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileLane === 'in_transit'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{isKu ? 'لە ڕێگایە' : 'In Transit'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mobileLane === 'in_transit' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {inTransitShipments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileLane('delivered')}
            className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileLane === 'delivered'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>{isKu ? 'گەیشتووە' : 'Delivered'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mobileLane === 'delivered' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {deliveredShipments.length}
            </span>
          </button>
        </div>

        {/* Mobile Lane Cards View (Zero horizontal scroll) */}
        <div>
          {getLaneShipments(mobileLane).length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-6">
              <Truck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">
                {isKu
                  ? `هیچ بارێک لە قۆناغی "${STATUS_CONFIG[mobileLane].labelKu}" نییە`
                  : `No shipments currently in "${STATUS_CONFIG[mobileLane].labelEn}"`}
              </p>
            </div>
          ) : (
            getLaneShipments(mobileLane).map((s) => renderCard(s))
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP KANBAN VIEW (md:flex side-by-side columns untouched)           */}
      {/* ========================================================================= */}
      <div className="hidden md:flex md:flex-row gap-5 items-start [&>*]:flex-1">
        {/* Lane 1: Pending */}
        <div className="rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKu ? 'چاوەڕوانکراو' : 'Pending Dispatch'}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
              {pendingShipments.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {pendingShipments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {isKu ? 'هیچ بارێکی چاوەڕوانکراو نییە' : 'No pending shipments'}
              </div>
            ) : (
              pendingShipments.map((s) => renderCard(s))
            )}
          </div>
        </div>

        {/* Lane 2: In Transit */}
        <div className="rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKu ? 'لە ڕێگایە' : 'In Transit'}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300">
              {inTransitShipments.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {inTransitShipments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {isKu ? 'هیچ بارێک لە ڕێگادا نییە' : 'No shipments in transit'}
              </div>
            ) : (
              inTransitShipments.map((s) => renderCard(s))
            )}
          </div>
        </div>

        {/* Lane 3: Delivered */}
        <div className="rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isKu ? 'گەیشتووە' : 'Delivered'}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              {deliveredShipments.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {deliveredShipments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {isKu ? 'هیچ بارێکی گەیشتوو تۆمار نەکراوە' : 'No delivered shipments'}
              </div>
            ) : (
              deliveredShipments.map((s) => renderCard(s))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ADD SHIPMENT MODAL FORM (Vertical stack + h-12 text-base inputs)        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Pull pill for mobile */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isKu ? '+ تۆمارکردنی باری نوێ' : '+ Register New Shipment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="flex flex-col gap-3.5">
              {/* Tracking Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {isKu ? 'کۆدی بەدواداچوونی بار' : 'Tracking Code'}
                </label>
                <input
                  type="text"
                  required
                  value={newTrackingCode}
                  onChange={(e) => setNewTrackingCode(e.target.value)}
                  placeholder="e.g. BATCH-2026-04"
                  className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Destination Dropdown / Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {isKu ? 'شوێنی گەیشتن (مەخزەن / کڕیار)' : 'Destination Depot / Client'}
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    placeholder={isKu ? 'وەک: سلێمانی - کارگەی ناوەندی' : 'e.g. Sulaymaniyah - Main Factory'}
                    className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {destinationPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewDestination(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cargo Summary */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {isKu ? 'پوختەی ناوەڕۆکی بار' : 'Cargo Summary'}
                </label>
                <input
                  type="text"
                  required
                  value={newItemSummary}
                  onChange={(e) => setNewItemSummary(e.target.value)}
                  placeholder={isKu ? 'وەک: تەختەی HPL دژە ئاو، قەراغ لەزگە' : 'e.g. Matte Anthracite HPL Panels & Edge bands'}
                  className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Date & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {isKu ? 'بەرواری بار' : 'Shipment Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    {isKu ? 'بڕی بار (یەکە / دانە)' : 'Quantity (Units)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {isKu ? 'دۆخی سەرەتایی بار' : 'Initial Status'}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                  className="w-full h-12 text-base px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="pending">{isKu ? 'چاوەڕوانکراو' : 'Pending Dispatch'}</option>
                  <option value="in_transit">{isKu ? 'لە ڕێگایە' : 'In Transit'}</option>
                  <option value="delivered">{isKu ? 'گەیشتووە' : 'Delivered'}</option>
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[48px] px-5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isKu ? '+ باری نوێ' : '+ Register Shipment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
