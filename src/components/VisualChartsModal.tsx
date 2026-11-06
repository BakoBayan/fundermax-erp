'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { useWarehouseOps } from '../hooks/useWarehouseOps';
import {
  BarChart3,
  TrendingUp,
  Layers,
  ReceiptText,
  Package,
  Truck,
  Printer,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  ArrowRight,
  ShieldCheck,
  Lock,
  Building2,
  Coins,
  Activity,
  ArrowUpRight,
  Calendar,
  PieChart
} from 'lucide-react';
import { PanelMaterial, OrderAllocation } from '../types/inventory';

// ============================================================================
// VECTOR SVG CHART COMPONENTS (Zero Dependencies - Preserved for External Imports)
// ============================================================================

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  subtext?: string;
}

export const SvgDonutChart: React.FC<{
  data: DonutSlice[];
  totalLabel?: string;
  totalValue?: string | number;
  size?: number;
  isKu?: boolean;
}> = React.memo(({ data = [], totalLabel, totalValue, size = 260, isKu = false }) => {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.value > 0 ? d.value : 0), 0);
  }, [data]);

  const radius = size / 2;
  const strokeWidth = size * 0.17;
  const innerRadius = radius - strokeWidth;
  const center = radius;

  const slices = useMemo(() => {
    if (total <= 0) return [];
    const nonZeroSlices = data.filter((d) => d.value > 0);
    const isSingleNonZero = nonZeroSlices.length === 1;

    let currentAngle = -90;
    return data.map((d, index) => {
      if (d.value <= 0) {
        return { ...d, index, percentage: '0.0', pathData: '' };
      }

      const sliceAngle = (d.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      const rOut = radius - 8;
      const rIn = innerRadius;
      const isFull = isSingleNonZero || sliceAngle >= 359.5;

      let pathData = '';
      if (isFull) {
        pathData = `M ${center} ${center - rOut} A ${rOut} ${rOut} 0 1 1 ${center} ${center + rOut} A ${rOut} ${rOut} 0 1 1 ${center} ${center - rOut} M ${center} ${center - rIn} A ${rIn} ${rIn} 0 1 0 ${center} ${center + rIn} A ${rIn} ${rIn} 0 1 0 ${center} ${center - rIn} Z`;
      } else {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = center + rOut * Math.cos(startRad);
        const y1 = center + rOut * Math.sin(startRad);
        const x2 = center + rOut * Math.cos(endRad);
        const y2 = center + rOut * Math.sin(endRad);

        const x3 = center + rIn * Math.cos(endRad);
        const y3 = center + rIn * Math.sin(endRad);
        const x4 = center + rIn * Math.cos(startRad);
        const y4 = center + rIn * Math.sin(startRad);

        const largeArc = sliceAngle > 180 ? 1 : 0;
        pathData = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      }

      const percentage = ((d.value / total) * 100).toFixed(1);
      return { ...d, index, percentage, pathData };
    });
  }, [data, total, radius, innerRadius, center]);

  const activeSlice = useMemo(() => {
    return activeHoverIdx !== null && slices[activeHoverIdx] ? slices[activeHoverIdx] : null;
  }, [activeHoverIdx, slices]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-center justify-center transform-gpu" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible select-none transition-transform"
        >
          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius - 12}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-200 dark:text-slate-800"
            />
          ) : (
            slices.map((s) => {
              if (!s.pathData) return null;
              const isHovered = activeHoverIdx === s.index;
              return (
                <path
                  key={s.index}
                  d={s.pathData}
                  fill={s.color}
                  fillRule="evenodd"
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    transformOrigin: `${center}px ${center}px`,
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' : 'none',
                    opacity: activeHoverIdx === null || isHovered ? 1 : 0.65,
                  }}
                  onMouseEnter={() => setActiveHoverIdx(s.index)}
                  onMouseLeave={() => setActiveHoverIdx(null)}
                />
              );
            })
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {activeSlice ? (
            <>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
                {activeSlice.label}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-tight">
                {activeSlice.value.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {activeSlice.percentage}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
                {totalLabel || (isKu ? 'کۆی گشتی' : 'Total')}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-tight">
                {totalValue !== undefined ? totalValue : total.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pe-1">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          const isHovered = activeHoverIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveHoverIdx(idx)}
              onMouseLeave={() => setActiveHoverIdx(null)}
              className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent hover:border-slate-200 dark:hover:border-slate-750'
              }`}
            >
              <div className="flex items-center gap-2 truncate pe-1 min-w-0">
                <span className="w-3 h-3 rounded-md shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
              </div>
              <div className="text-end shrink-0 font-mono">
                <span className="font-bold text-slate-900 dark:text-white">{item.value.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ms-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export interface BarGroupItem {
  category: string;
  v1: number;
  v2?: number;
  label1: string;
  label2?: string;
  color1: string;
  color2?: string;
}

export const SvgGroupedBarChart: React.FC<{
  data: BarGroupItem[];
  height?: number;
}> = React.memo(({ data = [], height = 230 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    let m = 1;
    data.forEach((d) => {
      if (d.v1 > m) m = d.v1;
      if (d.v2 && d.v2 > m) m = d.v2;
    });
    return Math.max(Math.ceil((m * 1.15) / 10) * 10, 10);
  }, [data]);

  const width = 500;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 40;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const groupWidth = data.length > 0 ? innerWidth / data.length : innerWidth;
  const barWidth = Math.min(22, groupWidth * 0.35);

  const gridLines = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
      const y = paddingTop + innerHeight - pct * innerHeight;
      const val = Math.round(pct * maxValue);
      return { pct, i, y, val };
    });
  }, [paddingTop, innerHeight, maxValue]);

  const barCoordinates = useMemo(() => {
    return data.map((item, idx) => {
      const groupX = paddingLeft + idx * groupWidth;
      const centerX = groupX + groupWidth / 2;
      const h1 = (Math.max(0, item.v1) / maxValue) * innerHeight;
      const y1 = paddingTop + innerHeight - h1;
      const hasV2 = item.v2 !== undefined && !!item.color2;
      const xBar1 = hasV2 ? centerX - barWidth - 2 : centerX - barWidth / 2;
      const xBar2 = centerX + 2;
      const h2 = hasV2 ? (Math.max(0, item.v2!) / maxValue) * innerHeight : 0;
      const y2 = paddingTop + innerHeight - h2;
      const truncatedCategory = item.category.length > 9 ? `${item.category.substring(0, 8)}…` : item.category;

      return {
        item,
        idx,
        groupX,
        centerX,
        xBar1,
        xBar2,
        y1,
        y2,
        h1: Math.max(2, h1),
        h2: Math.max(2, h2),
        hasV2,
        truncatedCategory,
      };
    });
  }, [data, maxValue, innerHeight, groupWidth, barWidth, paddingLeft, paddingTop]);

  return (
    <div className="w-full flex flex-col">
      <div className="w-full overflow-x-auto">
        <div className="transform-gpu" style={{ minWidth: width, width: '100%' }}>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="select-none overflow-visible">
            {gridLines.map((gl) => (
              <g key={gl.i}>
                <line
                  x1={paddingLeft}
                  y1={gl.y}
                  x2={width - paddingRight}
                  y2={gl.y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-slate-800"
                />
                <text
                  x={paddingLeft - 8}
                  y={gl.y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  className="fill-slate-400 dark:fill-slate-500 font-semibold"
                >
                  {gl.val.toLocaleString()}
                </text>
              </g>
            ))}

            {barCoordinates.map((bar) => {
              const isHovered = hoveredIdx === bar.idx;
              return (
                <g
                  key={bar.idx}
                  onMouseEnter={() => setHoveredIdx(bar.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <rect
                      x={bar.groupX + 2}
                      y={paddingTop}
                      width={groupWidth - 4}
                      height={innerHeight}
                      fill="currentColor"
                      className="text-slate-100 dark:text-slate-800/60"
                      rx="6"
                    />
                  )}
                  <rect
                    x={bar.xBar1}
                    y={bar.y1}
                    width={barWidth}
                    height={bar.h1}
                    fill={bar.item.color1}
                    rx="4"
                  />
                  {bar.hasV2 && (
                    <rect
                      x={bar.xBar2}
                      y={bar.y2}
                      width={barWidth}
                      height={bar.h2}
                      fill={bar.item.color2}
                      rx="4"
                    />
                  )}
                  <text
                    x={bar.centerX}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-slate-600 dark:fill-slate-300"
                  >
                    {bar.truncatedCategory}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      {/* Legend below bar chart */}
      {data.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-[11px] font-bold mt-2">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data[0].color1 }} />
            {data[0].label1}
          </span>
          {data[0].label2 && (
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data[0].color2 }} />
              {data[0].label2}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export interface TrendPoint {
  label: string;
  value: number;
}

export const SvgAreaTrendChart: React.FC<{
  data: TrendPoint[];
  lineColor?: string;
  fillGradientId?: string;
  height?: number;
  valuePrefix?: string;
  isKu?: boolean;
}> = React.memo(({
  data = [],
  lineColor = '#0ea5e9',
  fillGradientId = 'trendGradient',
  height = 200,
  valuePrefix = '',
  isKu = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartWidth = 520;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    let m = 1;
    (data || []).forEach((p) => {
      if (p.value > m) m = p.value;
    });
    return Math.max(Math.ceil((m * 1.15) / 10) * 10, 10);
  }, [data]);

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
    return data.map((d, i) => {
      const x = paddingLeft + (data.length > 1 ? i * step : innerW / 2);
      const y = paddingTop + innerH - (Math.max(0, d.value) / maxVal) * innerH;
      return { ...d, x, y };
    });
  }, [data, innerW, innerH, maxVal, paddingLeft, paddingTop]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (!pathD || points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${pathD} L ${last.x} ${paddingTop + innerH} L ${first.x} ${paddingTop + innerH} Z`;
  }, [pathD, points, innerH, paddingTop]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-slate-400 text-xs font-mono" style={{ height }}>
        {isKu ? 'هیچ داتایەک بەردەست نییە' : 'No trend data available'}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="transform-gpu" style={{ minWidth: chartWidth, width: '100%' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} className="select-none overflow-visible">
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {areaD && <path d={areaD} fill={`url(#${fillGradientId})`} />}
          {pathD && <path d={pathD} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 6 : 4}
              fill={hoveredIdx === i ? '#ffffff' : lineColor}
              stroke={lineColor}
              strokeWidth={hoveredIdx === i ? 3 : 2}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
          {/* Axis points */}
          {points.map((pt, i) => (
            <text key={i} x={pt.x} y={height - 8} textAnchor="middle" fontSize="10" className="fill-slate-500 font-mono">
              {pt.label}
            </text>
          ))}
          {/* Decoupled Floating Tooltip */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <g transform={`translate(${points[hoveredIdx].x}, ${Math.max(22, points[hoveredIdx].y - 12)})`} className="pointer-events-none">
              <rect
                x="-36"
                y="-22"
                width="72"
                height="20"
                rx="6"
                fill="#0f172a"
                className="drop-shadow-md"
              />
              <text
                x="0"
                y="-8"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                className="font-mono select-none"
              >
                {valuePrefix}{points[hoveredIdx].value.toLocaleString()}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN EXECUTIVE VISUAL CHARTS MODAL COMPONENT (RBAC Protected Bento Grid)
// ============================================================================

type FilterModule = 'all' | 'panels' | 'sales' | 'logistics';

export const VisualChartsModal: React.FC = () => {
  const {
    isVisualChartsOpen,
    closeVisualCharts,
    materials,
    stats,
    language,
    userPermissions,
  } = useInventory();

  const warehouseOps = useWarehouseOps();
  const [mounted, setMounted] = useState(false);
  const [filterModule, setFilterModule] = useState<FilterModule>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body and document scroll lock when modal is open
  useEffect(() => {
    if (!isVisualChartsOpen) return;
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBody || '';
      document.documentElement.style.overflow = originalHtml || '';
    };
  }, [isVisualChartsOpen]);

  // Native mobile hardware back-button listener
  useEffect(() => {
    if (!isVisualChartsOpen) return;
    window.history.pushState({ modal: 'visual-charts' }, '');
    const handlePopState = () => {
      closeVisualCharts();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal === 'visual-charts') {
        window.history.back();
      }
    };
  }, [isVisualChartsOpen, closeVisualCharts]);

  const isKu = language === 'ku';

  // Strict RBAC Permission Gates
  const canFinancial = !!userPermissions?.canViewSales;
  const canLogistics = !!userPermissions?.canViewWarehouse;
  const canInventory = !!userPermissions?.canViewPanels;

  // 1. FINANCIALS CALCULATIONS (Guarded)
  const financialData = useMemo(() => {
    if (!canFinancial) return null;

    const activeList = warehouseOps.activeShipments || [];
    let totalPaid = 0;
    let totalDebt = 0;
    let debtEUR = 0;

    activeList.forEach((s) => {
      if (s.isDeleted === 1) return;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const paid = Number(s.amountPaidToSupplier) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      const curr = s.invoiceCurrency || (s.supplier?.toLowerCase().includes('fundermax') ? 'EUR' : 'USD');

      totalPaid += paid;
      if (curr === 'EUR') {
        debtEUR += debt;
      } else {
        totalDebt += debt;
      }
    });

    const totalInvoiced = totalPaid + totalDebt;
    const count = activeList.length;
    const avgInvoiceValue = count > 0 ? totalInvoiced / count : 0;
    const paidPct = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
    const debtPct = 100 - paidPct;

    return {
      totalPaid,
      totalDebt,
      debtEUR,
      totalInvoiced,
      count,
      avgInvoiceValue,
      paidPct,
      debtPct,
    };
  }, [canFinancial, warehouseOps.activeShipments]);

  // Financial Donut Data (Supplier Paid vs Supplier Debt)
  const financialDonutData: DonutSlice[] = useMemo(() => {
    if (!financialData) return [];
    return [
      {
        label: isKu ? 'پارەی دراو بە دابینکەر' : 'Paid to Suppliers',
        value: financialData.totalPaid,
        color: '#10b981', // emerald-500
        subtext: isKu ? 'تەواوکراو' : 'Settled',
      },
      {
        label: isKu ? 'قەرزی ماوە بۆ دابینکەران' : 'Supplier Debt',
        value: financialData.totalDebt,
        color: '#f43f5e', // rose-500
        subtext: isKu ? 'قەرزی سەر کۆمپانیا' : 'Payables Remaining',
      },
    ];
  }, [financialData, isKu]);

  // Financial Grouped Bar Data (Turnover by Supplier)
  const financialBarData: BarGroupItem[] = useMemo(() => {
    if (!canFinancial) return [];
    const activeList = warehouseOps.activeShipments || [];
    const supplierMap = new Map<string, { paid: number; debt: number }>();

    activeList.forEach((s) => {
      if (s.isDeleted === 1) return;
      const name = s.supplier || s.supplierName || 'FunderMax';
      const paid = Number(s.amountPaidToSupplier) || 0;
      const invoiced = Number(s.totalInvoiceAmount) || 0;
      const debt = s.supplierDebtRemaining !== undefined ? Number(s.supplierDebtRemaining) : Math.max(0, invoiced - paid);
      const existing = supplierMap.get(name) || { paid: 0, debt: 0 };
      supplierMap.set(name, { paid: existing.paid + paid, debt: existing.debt + debt });
    });

    const list: BarGroupItem[] = [];
    supplierMap.forEach((val, name) => {
      list.push({
        category: name,
        v1: val.paid,
        v2: val.debt,
        label1: isKu ? 'دراو ($)' : 'Paid ($)',
        label2: isKu ? 'قەرز ($)' : 'Debt ($)',
        color1: '#10b981',
        color2: '#f43f5e',
      });
    });

    return list.slice(0, 6);
  }, [canFinancial, warehouseOps.activeShipments, isKu]);

  // 2. LOGISTICS 3-STAGE PIPELINE CALCULATIONS (Guarded)
  const logisticsData = useMemo(() => {
    if (!canLogistics) return null;

    const activeList = warehouseOps.activeShipments || [];
    const factoryCount = activeList.filter((s) => s.status === 'pending').length;
    const customsCount = activeList.filter((s) => s.status === 'customs').length;
    const warehouseCount = activeList.filter((s) => s.status === 'received' || s.status === 'inspected').length;
    const totalRacked = (warehouseOps.allocations || []).reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

    return {
      factoryCount,
      customsCount,
      warehouseCount,
      totalCount: activeList.length,
      totalRacked,
    };
  }, [canLogistics, warehouseOps.activeShipments, warehouseOps.allocations]);

  // Logistics Trend Data across Inbound Batches
  const logisticsTrendData: TrendPoint[] = useMemo(() => {
    if (!canLogistics) return [];
    const activeList = warehouseOps.activeShipments || [];
    if (activeList.length === 0) {
      return [
        { label: isKu ? 'بار ۰۱' : 'Batch 01', value: 0 },
        { label: isKu ? 'بار ۰۲' : 'Batch 02', value: 0 },
      ];
    }

    return activeList.slice(0, 8).map((s, i) => {
      const totalQty = (s.items || []).reduce((sum, item) => sum + (Number(item.receivedQty) || Number(item.expectedQty) || 0), 0);
      return {
        label: s.batchCode ? s.batchCode.slice(-6) : `B-${i + 1}`,
        value: totalQty > 0 ? totalQty : Math.round((Number(s.totalInvoiceAmount) || 1000) / 100),
      };
    });
  }, [canLogistics, warehouseOps.activeShipments, isKu]);

  // Logistics Status Donut
  const logisticsStatusDonut: DonutSlice[] = useMemo(() => {
    if (!logisticsData) return [];
    return [
      {
        label: isKu ? 'لە کارگە / ڕێگە' : 'Factory / In Transit',
        value: logisticsData.factoryCount,
        color: '#0ea5e9', // sky-500
      },
      {
        label: isKu ? 'گومرگ' : 'Border Customs',
        value: logisticsData.customsCount,
        color: '#f59e0b', // amber-500
      },
      {
        label: isKu ? 'کۆگا / گەیشتوو' : 'Warehouse / Racked',
        value: logisticsData.warehouseCount,
        color: '#10b981', // emerald-500
      },
    ];
  }, [logisticsData, isKu]);

  // 3. INVENTORY HEALTH & STOCK DISTRIBUTION CALCULATIONS (Guarded)
  const inventoryData = useMemo(() => {
    if (!canInventory) return null;

    const totalStock = stats.totalStock || 0;
    const totalAvailable = stats.totalAvailable || 0;
    const totalReserved = stats.totalAllocated || 0;
    const depletedCount = materials.filter((m) => (m.availableStock || 0) <= 0).length;

    const availablePct = totalStock > 0 ? Math.round((totalAvailable / totalStock) * 100) : 0;
    const reservedPct = totalStock > 0 ? Math.round((totalReserved / totalStock) * 100) : 0;
    const depletedPct = Math.max(0, 100 - (availablePct + reservedPct));

    const lowestStockPanels = [...materials]
      .sort((a, b) => (a.availableStock || 0) - (b.availableStock || 0))
      .slice(0, 3);

    return {
      totalStock,
      totalAvailable,
      totalReserved,
      depletedCount,
      availablePct,
      reservedPct,
      depletedPct,
      lowestStockPanels,
    };
  }, [canInventory, stats, materials]);

  // Inventory Stock Distribution Donut (Available vs Reserved vs Depleted)
  const stockDonutData: DonutSlice[] = useMemo(() => {
    if (!inventoryData) return [];
    return [
      {
        label: isKu ? 'تەختەی بەردەست' : 'Available Stock',
        value: inventoryData.totalAvailable,
        color: '#10b981', // emerald-500
      },
      {
        label: isKu ? 'حجزکراو بۆ وەرشە' : 'Reserved for Orders',
        value: inventoryData.totalReserved,
        color: '#f59e0b', // amber-500
      },
      {
        label: isKu ? 'تەواوبوو / کەم' : 'Depleted Items',
        value: inventoryData.depletedCount,
        color: '#f43f5e', // rose-500
      },
    ];
  }, [inventoryData, isKu]);

  // Inventory Material Types Bar Chart (Available vs Reserved by Type)
  const materialTypeBarData: BarGroupItem[] = useMemo(() => {
    if (!canInventory) return [];
    const typeMap = new Map<string, { available: number; reserved: number }>();

    materials.forEach((m) => {
      const type = m.type || (isKu ? 'تەختە' : 'Panel');
      const existing = typeMap.get(type) || { available: 0, reserved: 0 };
      typeMap.set(type, {
        available: existing.available + (Number(m.availableStock) || 0),
        reserved: existing.reserved + (Number(m.allocatedStock) || 0),
      });
    });

    const list: BarGroupItem[] = [];
    typeMap.forEach((val, type) => {
      list.push({
        category: type,
        v1: val.available,
        v2: val.reserved,
        label1: isKu ? 'بەردەست' : 'Available',
        label2: isKu ? 'حجزکراو' : 'Reserved',
        color1: '#0ea5e9', // sky-500
        color2: '#f59e0b', // amber-500
      });
    });

    return list.slice(0, 6);
  }, [canInventory, materials, isKu]);

  if (!mounted || !isVisualChartsOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-0 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden cursor-pointer"
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => e.target === e.currentTarget && closeVisualCharts()}
    >
      {/* Executive Bento Container */}
      <div
        className="relative w-full max-w-7xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-[2.5rem] bg-slate-50/95 dark:bg-slate-950/95 border-0 sm:border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-2xl my-auto text-slate-900 dark:text-white cursor-default"
        dir={isKu ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 aspect-square rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <BarChart3 className="w-6 h-6 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight truncate">
                  {isKu ? 'ناوەندی شیکاری بینراوی بەڕێوەبردن' : 'Executive Visual Analytics Suite'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                {isKu
                  ? 'ئاماری وردی دارایی، لۆجستی و دابەشبوونی تەختە بە شێوازی پارێزراوی بەڕێوەبەرایەتی'
                  : 'Rigid RBAC protected command center: Multi-currency payables, cargo pipelines & live stock distribution.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
              title={isKu ? 'چاپکردنی ڕاپۆرت' : 'Print Analytics Report'}
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>{isKu ? 'چاپکردن' : 'Print'}</span>
            </button>
            <button
              type="button"
              onClick={closeVisualCharts}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-750"
              title={isKu ? 'داخستن' : 'Close Modal'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. MODULE FILTER SWITCHER (Segmented Filter Bar)                          */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-8 py-3 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* All Modules */}
            <button
              type="button"
              onClick={() => setFilterModule('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                filterModule === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black shadow-md'
                  : 'bg-white/80 dark:bg-slate-850/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-750'
              }`}
            >
              {isKu ? 'هەموو بەشەکان' : 'All Modules'}
            </button>

            {/* Panels & Workshop */}
            {canInventory && (
              <button
                type="button"
                onClick={() => setFilterModule('panels')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-2xs ${
                  filterModule === 'panels'
                    ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/40'
                    : 'bg-white/80 dark:bg-slate-850/80 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/60 dark:border-slate-750'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isKu ? 'تەختەکان و وەرشە' : 'Panels & Workshop'}</span>
              </button>
            )}

            {/* B2B Trade & Payables */}
            {canFinancial && (
              <button
                type="button"
                onClick={() => setFilterModule('sales')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-2xs ${
                  filterModule === 'sales'
                    ? 'bg-sky-600 text-white font-black shadow-md shadow-sky-600/25 ring-1 ring-sky-400/40'
                    : 'bg-white/80 dark:bg-slate-850/80 text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200/60 dark:border-slate-750'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>{isKu ? 'بازرگانی B2B و قەرزەکان' : 'B2B Trade & Payables'}</span>
              </button>
            )}

            {/* Logistics & Cargo */}
            {canLogistics && (
              <button
                type="button"
                onClick={() => setFilterModule('logistics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-2xs ${
                  filterModule === 'logistics'
                    ? 'bg-amber-600 text-white font-black shadow-md shadow-amber-600/25 ring-1 ring-amber-400/40'
                    : 'bg-white/80 dark:bg-slate-850/80 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/60 dark:border-slate-750'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{isKu ? 'لۆجستی و بارەکان' : 'Logistics & Cargo'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Bento Grid Body */}
        <div className="flex-1 overflow-y-auto touch-pan-y p-5 sm:p-8 space-y-6">
          
          {/* Main Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ========================================================================= */}
            {/* 2. FINANCIAL / PAYABLES VIEW (RBAC: canFinancial)                         */}
            {/* ========================================================================= */}
            {canFinancial && financialData && (filterModule === 'all' || filterModule === 'sales') && (
              <>
                {/* A. Hero Financial Ledger Overview Card */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center shadow-xs">
                        <ReceiptText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          {isKu ? 'شیكاری دارایی و قەرزی دابینکەران' : 'Executive Financial & Payables Ledger'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {isKu ? 'بەراوردی پارەی دراو بەرامبەر بە قەرزی ماوە بۆ دابینکەران' : 'Settlement proportion of supplier obligations'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-100/80 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 w-fit">
                      B2B Trade & Multi-Currency
                    </span>
                  </div>

                  {/* Horizontal Dual Progress Bar (Total Paid vs Supplier Debt) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        {isKu ? 'کۆی پارەی دراو:' : 'Total Paid:'} ${financialData.totalPaid.toLocaleString()} ({financialData.paidPct}%)
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        {isKu ? 'قەرزی سەر کۆمپانیا:' : 'Supplier Debt:'} ${financialData.totalDebt.toLocaleString()} ({financialData.debtPct}%)
                      </span>
                    </div>

                    <div className="h-5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-0.5 shadow-inner">
                      <div
                        style={{ width: `${Math.max(4, financialData.paidPct)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 shadow-xs"
                        title={`Total Paid: $${financialData.totalPaid.toLocaleString()}`}
                      />
                      <div
                        style={{ width: `${Math.max(4, financialData.debtPct)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700 shadow-xs ms-1"
                        title={`Total Debt: $${financialData.totalDebt.toLocaleString()}`}
                      />
                    </div>
                  </div>

                  {/* Metric Sub-cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        {isKu ? 'تێکڕای پسوولەی دابینکەر' : 'Average Invoice Value'}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                        ${Math.round(financialData.avgInvoiceValue).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        {financialData.count} {isKu ? 'پسوولەی گشتی' : 'total bills'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        {isKu ? 'کۆی گشتی پسوولەکان' : 'Total Invoiced Volume'}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                        ${financialData.totalInvoiced.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        USD Gross Turnover
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80">
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block mb-1">
                        {isKu ? 'قەرزی FunderMax بە یۆرۆ' : 'EUR Currency Debt'}
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                        €{financialData.debtEUR.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-mono block mt-1">
                        European Direct Import
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. Financial SvgDonutChart: Supplier Paid vs Debt */}
                <div className="col-span-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'دابەشبوونی پارەدان و قەرز' : 'Paid vs Debt Ratio'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Donut</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin flex justify-center">
                    <SvgDonutChart
                      data={financialDonutData}
                      totalLabel={isKu ? 'کۆی پسوولە' : 'Total Invoiced'}
                      totalValue={`$${financialData.totalInvoiced.toLocaleString()}`}
                      size={220}
                      isKu={isKu}
                    />
                  </div>
                </div>

                {/* C. Financial SvgGroupedBarChart: Obligations by Supplier */}
                <div className="col-span-1 md:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-sky-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'قەرز و پارەی دراو بەپێی دابینکەر' : 'Turnover by Supplier'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Grouped Bar</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin">
                    {financialBarData.length > 0 ? (
                      <SvgGroupedBarChart data={financialBarData} height={210} />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                        {isKu ? 'هیچ داتایەکی دابینکەر بەردەست نییە' : 'No supplier transaction data available'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* 3. INVENTORY & CUTTING VIEW (RBAC: canInventory)                         */}
            {/* ========================================================================= */}
            {canInventory && inventoryData && (filterModule === 'all' || filterModule === 'panels') && (
              <>
                {/* A. Inventory Stock Distribution Donut */}
                <div className="col-span-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-teal-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'دابەشبوونی تەختەکانی کۆگا' : 'Stock Distribution Donut'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Donut</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin flex justify-center">
                    <SvgDonutChart
                      data={stockDonutData}
                      totalLabel={isKu ? 'کۆی تەختە' : 'Total Panels'}
                      totalValue={inventoryData.totalStock.toLocaleString()}
                      size={220}
                      isKu={isKu}
                    />
                  </div>
                </div>

                {/* B. Inventory SvgGroupedBarChart: Panel Stock by Material Type */}
                <div className="col-span-1 md:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'تەختەکان بەپێی جۆر (MDF, HPL, Plywood)' : 'Stock by Material Type'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Available vs Reserved</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin">
                    {materialTypeBarData.length > 0 ? (
                      <SvgGroupedBarChart data={materialTypeBarData} height={210} />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                        {isKu ? 'هیچ جۆرە تەختەیەک بەردەست نییە' : 'No material stock records'}
                      </div>
                    )}
                  </div>
                </div>

                {/* C. Stock Distribution Bar & Critical Depletion Alerts */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          {isKu ? 'تەندروستی کۆگا و ڕێژەی بەردەست' : 'Inventory Health & Depletion Thresholds'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {isKu ? 'بەردەست، حجزکراو بۆ وەرشە، و کەمبوونەوەی مەترسیدار' : 'Available capacity vs workshop allocation'}
                        </p>
                      </div>
                    </div>

                    <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 w-fit">
                      {inventoryData.totalStock.toLocaleString()} {isKu ? 'تەختە لە کۆگا' : 'Panels in Stock'}
                    </span>
                  </div>

                  {/* Visual "Stock Distribution" Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        {isKu ? 'بەردەست:' : 'Available:'} {inventoryData.totalAvailable.toLocaleString()} ({inventoryData.availablePct}%)
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        {isKu ? 'حجزکراو (بڕین):' : 'Reserved:'} {inventoryData.totalReserved.toLocaleString()} ({inventoryData.reservedPct}%)
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        {isKu ? 'تەواوبوو:' : 'Depleted:'} {inventoryData.depletedCount} {isKu ? 'جۆر' : 'types'} ({inventoryData.depletedPct}%)
                      </span>
                    </div>

                    <div className="h-6 w-full rounded-2xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-1 shadow-inner">
                      <div
                        style={{ width: `${Math.max(4, inventoryData.availablePct)}%` }}
                        className="h-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 shadow-xs"
                        title={`Available: ${inventoryData.totalAvailable.toLocaleString()}`}
                      />
                      <div
                        style={{ width: `${Math.max(4, inventoryData.reservedPct)}%` }}
                        className="h-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 shadow-xs ms-1.5"
                        title={`Reserved: ${inventoryData.totalReserved.toLocaleString()}`}
                      />
                      {inventoryData.depletedPct > 0 && (
                        <div
                          style={{ width: `${Math.max(4, inventoryData.depletedPct)}%` }}
                          className="h-full rounded-xl bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-700 shadow-xs ms-1.5"
                          title={`Depleted Percentage: ${inventoryData.depletedPct}%`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Top 3 Lowest-Stock Panels with Critical Warning Colors */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>{isKu ? '۳ تەختەی کەمترین لە کۆگادا (ئاگاداری مەترسی)' : 'Top 3 Depleted & Lowest-Stock Panels (Critical Alert)'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {inventoryData.lowestStockPanels.map((mat) => {
                        const avail = mat.availableStock || 0;
                        const isZero = avail <= 0;
                        return (
                          <div
                            key={mat.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isZero
                                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 shadow-xs'
                                : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                {mat.code}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                                  isZero
                                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                                    : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {isZero ? (isKu ? 'تەواوبووە' : 'Depleted') : (isKu ? 'کەم ماوە' : 'Low Stock')}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white block truncate mb-1">
                                {mat.name}
                              </span>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">{mat.type || 'Panel'}</span>
                                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                  {avail} {isKu ? 'تەختە' : 'left'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* 4. LOGISTICS VIEW (RBAC: canLogistics)                                     */}
            {/* ========================================================================= */}
            {canLogistics && logisticsData && (filterModule === 'all' || filterModule === 'logistics') && (
              <>
                {/* A. 3-Stage Visual Pipeline */}
                <div className="col-span-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shadow-xs">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                            {isKu ? 'هێڵی ۳ قۆناغی بارەکان' : '3-Stage Pipeline'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isKu ? 'هاوردەکردنی FunderMax' : 'Inbound Cargo Pipeline'}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Inbound
                      </span>
                    </div>

                    {/* 3-Stage Visual Pipeline (Factory ➔ Customs ➔ Warehouse) */}
                    <div className="mt-4 space-y-2.5">
                      {/* Stage 1: Factory / In Transit */}
                      <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-sky-500/20" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isKu ? 'لە کارگە / باری لە ڕێگە' : 'Factory / In Transit'}
                          </span>
                        </div>
                        <span className="px-3 py-0.5 rounded-xl font-mono font-black text-xs bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-sm shadow-sky-500/10">
                          {logisticsData.factoryCount} {isKu ? 'بار' : 'loads'}
                        </span>
                      </div>

                      <div className="flex justify-center text-slate-400 leading-none">
                        <span className="text-xs font-mono font-bold">↓</span>
                      </div>

                      {/* Stage 2: Customs */}
                      <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isKu ? 'گومرگ و پشکنین' : 'Border Customs'}
                          </span>
                        </div>
                        <span className="px-3 py-0.5 rounded-xl font-mono font-black text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm shadow-amber-500/10">
                          {logisticsData.customsCount} {isKu ? 'بار' : 'customs'}
                        </span>
                      </div>

                      <div className="flex justify-center text-slate-400 leading-none">
                        <span className="text-xs font-mono font-bold">↓</span>
                      </div>

                      {/* Stage 3: Warehouse */}
                      <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isKu ? 'گەیشتووەتە کۆگا' : 'Received & Inspected'}
                          </span>
                        </div>
                        <span className="px-3 py-0.5 rounded-xl font-mono font-black text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
                          {logisticsData.warehouseCount} {isKu ? 'گەیشتوو' : 'racked'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      {isKu ? 'کۆی تەختەی مەخزەن:' : 'Total Racked Units:'}
                    </span>
                    <span className="font-mono font-black text-sm text-amber-900 dark:text-amber-200">
                      {logisticsData.totalRacked.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* B. Logistics Status Donut */}
                <div className="col-span-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-amber-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'دابەشبوونی دۆخی بارەکان' : 'Cargo Pipeline Donut'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Donut</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin flex justify-center">
                    <SvgDonutChart
                      data={logisticsStatusDonut}
                      totalLabel={isKu ? 'کۆی بارەکان' : 'Total Shipments'}
                      totalValue={logisticsData.totalCount}
                      size={220}
                      isKu={isKu}
                    />
                  </div>
                </div>

                {/* C. Logistics SvgAreaTrendChart: Volume across Inbound Shipments */}
                <div className="col-span-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-lg rounded-[2rem] p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-sky-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {isKu ? 'قەبارەی باری FunderMax' : 'Fundermax Inbound Trend'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Area Curve</span>
                  </div>
                  <div className="overflow-x-auto touch-pan-y scrollbar-thin">
                    <SvgAreaTrendChart
                      data={logisticsTrendData}
                      lineColor="#0284c7"
                      fillGradientId="logisticsTrendGrad"
                      height={190}
                      isKu={isKu}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* UNAUTHORIZED LOCKOUT STATE (If user has zero permissions)                 */}
            {/* ========================================================================= */}
            {!canFinancial && !canLogistics && !canInventory && (
              <div className="col-span-full p-12 text-center rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-rose-200 dark:border-rose-900/60 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {isKu ? 'دەستپێگەیشتن سنووردارکراوە' : 'Access Restricted • RBAC Security Active'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isKu
                    ? 'ئەژمێرەکەت مۆڵەتی پێویستی نییە بۆ بینینی داتاکانی دارایی، گواستنەوە، یان کۆگای تەختەکان.'
                    : 'Your user profile does not possess permissions to view financial ledgers, logistics status, or wood panel stock.'}
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Footer Bar */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              {isKu
                ? 'پارێزراوە بە سیستەمی مۆڵەتپێدانی باکۆ بەیان بۆ کۆمپانیای شاسوار'
                : 'Protected by Enterprise RBAC authorization for Shaswar Ahmad Co.'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeVisualCharts}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {isKu ? 'داخستن' : 'Close Dashboard'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VisualChartsModal;
