'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { OrderAllocation, PanelMaterial } from '../types/inventory';

interface CutMathModalProps {
  order: OrderAllocation;
  material: PanelMaterial;
  onClose: () => void;
}

const KERF_MM = 4; // blade kerf allowance
const MIN_USABLE_MM = 100; // offcut strips thinner than this count as scrap

interface CutResult {
  hasCutList: boolean;
  sheets: number;
  sheetArea: number; // m²
  neededArea: number; // m²
  kerfArea: number; // m²
  offcutArea: number; // m²
  scrapArea: number; // m²
  perSheet: number;
}

function fitCount(sheetL: number, sheetW: number, pieceL: number, pieceW: number): number {
  return Math.floor(sheetL / pieceL) * Math.floor(sheetW / pieceW);
}

/** Estimate only: simple grid nesting, both orientations; not a true optimiser. */
export function computeCutMath(order: OrderAllocation, material: PanelMaterial): CutResult {
  const L = material.dimensions.length;
  const W = material.dimensions.width;
  const sheetArea = (L * W) / 1e6;
  const spec = order.doorSpec;

  if (!spec || !(spec.doorHeight > 0) || !(spec.doorWidth > 0)) {
    const sheets = order.quantity;
    return {
      hasCutList: false,
      sheets,
      sheetArea,
      neededArea: 0,
      kerfArea: 0,
      offcutArea: 0,
      scrapArea: 0,
      perSheet: 0,
    };
  }

  const f = spec.unit === 'cm' ? 10 : 1;
  const h = spec.doorHeight * f;
  const w = spec.doorWidth * f;
  const gl = h + KERF_MM;
  const gw = w + KERF_MM;
  const a = fitCount(L, W, gl, gw);
  const b = fitCount(L, W, gw, gl);
  const perSheet = Math.max(a, b, 0);
  const qty = Math.max(order.quantity, 0);

  const neededArea = (qty * h * w) / 1e6;
  const grossPiece = (gl * gw) / 1e6;
  const kerfArea = qty * (grossPiece - (h * w) / 1e6);

  if (perSheet === 0) {
    // Piece larger than sheet: one sheet each, no nesting possible.
    const sheets = qty;
    const rest = Math.max(sheets * sheetArea - neededArea, 0);
    return { hasCutList: true, sheets, sheetArea, neededArea, kerfArea: 0, offcutArea: 0, scrapArea: rest, perSheet };
  }

  const sheets = Math.ceil(qty / perSheet);
  const totalArea = sheets * sheetArea;
  const leftover = Math.max(totalArea - neededArea - kerfArea, 0);

  // Leftover is usable only if the free strips are wide enough.
  const lw = Math.floor(L / (a >= b ? gl : gw)) * (a >= b ? gl : gw);
  const usedL = a >= b ? lw : Math.floor(L / gw) * gw;
  const freeL = L - usedL;
  const usedW = a >= b ? Math.floor(W / gw) * gw : Math.floor(W / gl) * gl;
  const freeW = W - usedW;
  let usableShare = 0;
  if (freeL >= MIN_USABLE_MM || freeW >= MIN_USABLE_MM) usableShare = 0.8;
  const offcutArea = leftover * usableShare;
  const scrapArea = leftover - offcutArea;

  return { hasCutList: true, sheets, sheetArea, neededArea, kerfArea, offcutArea, scrapArea, perSheet };
}

export const CutMathModal: React.FC<CutMathModalProps> = ({ order, material, onClose }) => {
  const { language } = useInventory();
  const isKu = language === 'ku';
  const r = computeCutMath(order, material);
  const total = r.sheets * r.sheetArea;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const rows: { label: string; value: string }[] = [
    {
      label: isKu ? 'ڕووبەری پێویست (دەرگا/تەختە)' : 'Surface area needed (doors/panels)',
      value: r.hasCutList ? `${r.neededArea.toFixed(2)} m²` : '—',
    },
    {
      label: isKu ? 'قەبارەی تەختەی خاو' : 'Raw sheet dimensions',
      value: `${material.dimensions.length} × ${material.dimensions.width} mm (${r.sheetArea.toFixed(2)} m²)`,
    },
    {
      label: isKu ? 'ژمارەی تەختە' : 'Raw sheets',
      value: `${r.sheets}${r.perSheet ? ` (${r.perSheet}/${isKu ? 'تەختە' : 'sheet'})` : ''}`,
    },
    {
      label: isKu ? 'بڕینی تیغ / مارجین' : 'Blade kerf / margin loss',
      value: r.hasCutList ? `${KERF_MM} mm · ${r.kerfArea.toFixed(2)} m²` : `${KERF_MM} mm`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      dir={isKu ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="min-w-0">
            <div className="font-black text-slate-900 dark:text-white text-sm">
              {isKu ? 'وردەکاری بڕین و بەفیڕۆچوون' : 'Inspect Cut Math'}
            </div>
            <div className="text-xs text-slate-500 truncate">
              #{order.orderNumber} · {order.client}
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

        <div className="p-4 space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2"
            >
              <span className="font-semibold text-slate-600 dark:text-slate-300">{row.label}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs" dir="ltr">
                {row.value}
              </span>
            </div>
          ))}

          {r.hasCutList ? (
            <div className="pt-1 space-y-1.5">
              <div className="flex h-4 w-full rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                <div className="bg-emerald-500" style={{ width: `${pct(r.neededArea)}%` }} />
                <div className="bg-slate-400" style={{ width: `${pct(r.kerfArea)}%` }} />
                <div className="bg-sky-400" style={{ width: `${pct(r.offcutArea)}%` }} />
                <div className="bg-rose-500" style={{ width: `${pct(r.scrapArea)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400">
                  ● {isKu ? 'بەکارهاتوو' : 'Used'} {pct(r.neededArea).toFixed(1)}%
                </span>
                <span className="text-slate-500">
                  ● {isKu ? 'تیغ' : 'Kerf'} {pct(r.kerfArea).toFixed(1)}%
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  ● {isKu ? 'پاشماوەی بەکارهێنراو' : 'Usable offcut'} {pct(r.offcutArea).toFixed(1)}%
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  ● {isKu ? 'بەفیڕۆچوونی ڕاستەقینە' : 'True scrap waste'} {pct(r.scrapArea).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 pt-1">
              {isKu
                ? 'لیستی بڕین تۆمار نەکراوە؛ ئەم داواکارییە بە تەختەی تەواو ژمێردراوە.'
                : 'No cut list recorded; this job is counted as whole sheets.'}
            </div>
          )}

          <div className="text-[10px] text-slate-400 pt-1">
            {isKu ? 'خەمڵاندنە، نەک ژمارەی کۆتایی.' : 'Estimate only (simple grid nesting, both orientations).'}
          </div>
        </div>
      </div>
    </div>
  );
};
