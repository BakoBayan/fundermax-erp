'use client';

import React from 'react';
import { X, Layers, Lock, CheckCircle2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { PanelMaterial } from '../types/inventory';

interface StockMathModalProps {
  material: PanelMaterial;
  onClose: () => void;
}

/** Read-only audit of how sellable stock is derived: physical − reserved = available. */
export const StockMathModal: React.FC<StockMathModalProps> = ({ material, onClose }) => {
  const { language } = useInventory();
  const isKu = language === 'ku';

  const physical = material.totalStock || 0;
  const pending = (material.activeOrders || []).filter((o) => o.status !== 'finalized');
  const reserved = material.allocatedStock || 0;
  const net = material.availableStock ?? physical - reserved;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      dir={isKu ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="min-w-0">
            <div className="font-black text-slate-900 dark:text-white text-sm">
              {isKu ? 'وردەکاری خەزن' : 'Inspect Stock Math'}
            </div>
            <div className="text-xs text-slate-500 truncate">
              #{material.code} · {material.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Layers className="w-4 h-4 text-sky-600" />
              {isKu ? 'هەبوو لە کۆگا' : 'Physical On Rack'}
            </span>
            <span className="font-mono font-black text-lg text-slate-900 dark:text-white">{physical}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4" />
              {isKu ? 'گیراوە بۆ کارگە' : 'Reserved in Workshop'}
            </span>
            <span className="font-mono font-black text-lg text-amber-700 dark:text-amber-300">− {reserved}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              {isKu ? 'بەردەست بۆ فرۆشتن' : 'Net Available for Sale'}
            </span>
            <span className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-300">= {net}</span>
          </div>

          {pending.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                {isKu ? 'داواکارییە چالاکەکان' : 'Pending reservations'}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {pending.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs rounded-lg bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5"
                  >
                    <span className="font-mono font-bold">#{o.orderNumber}</span>
                    <span className="truncate mx-2 text-slate-600 dark:text-slate-300">{o.client}</span>
                    <span className="font-mono font-black">{o.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
