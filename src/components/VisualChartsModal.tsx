'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import {
  BarChart3,
  PieChart,
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
  Search,
  Filter,
  DollarSign,
  Boxes,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  User,
  Phone
} from 'lucide-react';
import { PanelMaterial, PanelTransaction, Product, Shipment, CurrencyCode } from '../types/inventory';

type ChartScopeTab = 'all' | 'panels' | 'sales' | 'goods' | 'shipping';

// ============================================================================
// VECTOR SVG CHART COMPONENTS (100% Offline, Fast, Zero Heavy NPM Dependencies)
// ============================================================================

interface DonutSlice {
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
}> = ({ data, totalLabel, totalValue, size = 260, isKu = false }) => {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + (d.value > 0 ? d.value : 0), 0);
  }, [data]);

  const radius = size / 2;
  const strokeWidth = size * 0.17; // doughnut thickness
  const innerRadius = radius - strokeWidth;
  const center = radius;

  // Compute SVG arc paths using polar coordinates
  const slices = useMemo(() => {
    if (total <= 0) return [];

    const nonZeroSlices = data.filter((d) => d.value > 0);
    const isSingleNonZero = nonZeroSlices.length === 1;

    let currentAngle = -90; // start at 12 o'clock
    return data.map((d, index) => {
      if (d.value <= 0) {
        return {
          ...d,
          index,
          percentage: '0.0',
          pathData: '',
        };
      }

      const sliceAngle = (d.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle += sliceAngle;

      const rOut = radius - 8;
      const rIn = innerRadius;

      // Handle complete 360 degree full circle gracefully
      const isFull = isSingleNonZero || sliceAngle >= 359.5;

      let pathData = '';
      if (isFull) {
        // Two 180-degree semicircles for outer circle, and two for inner cutout
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

      return {
        ...d,
        index,
        percentage,
        pathData,
      };
    });
  }, [data, total, radius, innerRadius, center]);

  const activeSlice = activeHoverIdx !== null ? slices[activeHoverIdx] : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
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
              className="text-slate-200 dark:text-slate-750"
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

        {/* Center Cutout Stats */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {activeSlice ? (
            <>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
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
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {totalLabel || (isKu ? 'کۆی گشتی' : 'Total')}
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono leading-tight">
                {totalValue !== undefined ? totalValue : total.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {slices.length} {isKu ? 'جۆر' : 'segments'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend Grid */}
      <div className="w-full mt-4 grid grid-cols-2 gap-2 text-xs">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          const isHovered = activeHoverIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setActiveHoverIdx(idx)}
              onMouseLeave={() => setActiveHoverIdx(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                isHovered
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 scale-[1.02]'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-transparent hover:border-slate-200 dark:hover:border-slate-750'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-1">
                <span className="w-3 h-3 rounded-md shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
              </div>
              <div className="text-right shrink-0 font-mono">
                <span className="font-bold text-slate-900 dark:text-white">{item.value.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// GROUPED & STACKED SVG BAR CHART
// ============================================================================

interface BarGroupItem {
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
  isKu?: boolean;
}> = ({ data, height = 240, isKu = false }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    let max = 1;
    data.forEach((d) => {
      if (d.v1 > max) max = d.v1;
      if (d.v2 && d.v2 > max) max = d.v2;
    });
    // Add 15% headroom and round neatly
    const rounded = Math.ceil((max * 1.15) / 10) * 10;
    return Math.max(rounded, 10);
  }, [data]);

  const chartWidth = 520;
  const paddingLeft = 46;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 34;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const groupWidth = innerWidth / Math.max(data.length, 1);
  const barWidth = Math.min(26, groupWidth * 0.38);

  return (
    <div className="w-full flex flex-col">
      <div className="relative w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-auto min-w-[340px] select-none overflow-visible"
        >
          {/* Y-axis gridlines & labels */}
          {yTicks.map((pct, i) => {
            const val = Math.round(maxValue * pct);
            const y = paddingTop + innerHeight - innerHeight * pct;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-slate-800"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  className="fill-slate-400 dark:fill-slate-500 font-semibold"
                >
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {data.map((item, idx) => {
            const groupX = paddingLeft + idx * groupWidth;
            const centerX = groupX + groupWidth / 2;

            const h1 = (Math.max(0, item.v1) / maxValue) * innerHeight;
            const y1 = paddingTop + innerHeight - h1;

            const hasV2 = item.v2 !== undefined && item.color2;
            const xBar1 = hasV2 ? centerX - barWidth - 2 : centerX - barWidth / 2;
            const xBar2 = centerX + 2;

            const h2 = hasV2 ? (Math.max(0, item.v2!) / maxValue) * innerHeight : 0;
            const y2 = paddingTop + innerHeight - h2;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                {/* Background column highlight on hover */}
                {isHovered && (
                  <rect
                    x={groupX + 2}
                    y={paddingTop}
                    width={groupWidth - 4}
                    height={innerHeight}
                    fill="currentColor"
                    className="text-slate-100 dark:text-slate-800/60"
                    rx="6"
                  />
                )}

                {/* Bar 1 */}
                <rect
                  x={xBar1}
                  y={y1}
                  width={barWidth}
                  height={Math.max(2, h1)}
                  fill={item.color1}
                  rx="4"
                  className="transition-all duration-200"
                  style={{
                    filter: isHovered ? 'brightness(1.15) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                  }}
                />

                {/* Bar 2 (if present) */}
                {hasV2 && (
                  <rect
                    x={xBar2}
                    y={y2}
                    width={barWidth}
                    height={Math.max(2, h2)}
                    fill={item.color2}
                    rx="4"
                    className="transition-all duration-200"
                    style={{
                      filter: isHovered ? 'brightness(1.15) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                    }}
                  />
                )}

                {/* Category label below X axis */}
                <text
                  x={centerX}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  className="fill-slate-600 dark:fill-slate-300 transition-colors"
                >
                  {item.category.length > 9 ? `${item.category.substring(0, 8)}…` : item.category}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Hover Tooltip Banner */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="mt-2 p-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <span className="font-bold">{data[hoveredIdx].category}</span>
          <div className="flex items-center gap-4 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data[hoveredIdx].color1 }} />
              <span>{data[hoveredIdx].label1}:</span>
              <strong>{data[hoveredIdx].v1.toLocaleString()}</strong>
            </span>
            {data[hoveredIdx].v2 !== undefined && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data[hoveredIdx].color2 }} />
                <span>{data[hoveredIdx].label2}:</span>
                <strong>{data[hoveredIdx].v2?.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SMOOTH AREA CURVE TREND CHART
// ============================================================================

interface TrendPoint {
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
}> = ({
  data,
  lineColor = '#0ea5e9',
  fillGradientId = 'trendGradient',
  height = 200,
  valuePrefix = '',
  isKu = false,
}) => {
  const [activePt, setActivePt] = useState<number | null>(null);

  const chartWidth = 520;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    let m = 1;
    data.forEach((p) => {
      if (p.value > m) m = p.value;
    });
    return Math.max(Math.ceil((m * 1.15) / 10) * 10, 10);
  }, [data]);

  const points = useMemo(() => {
    if (data.length === 0) return [];
    const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
    return data.map((d, i) => {
      const x = paddingLeft + (data.length > 1 ? i * step : innerW / 2);
      const y = paddingTop + innerH - (Math.max(0, d.value) / maxVal) * innerH;
      return { ...d, x, y };
    });
  }, [data, innerW, innerH, maxVal, paddingLeft, paddingTop]);

  // Construct smooth cubic bezier path
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
    const bottom = paddingTop + innerH;
    return `${pathD} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
  }, [pathD, points, innerH, paddingTop]);

  return (
    <div className="w-full flex flex-col">
      <div className="relative w-full overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-auto min-w-[340px] select-none overflow-visible"
        >
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((pct, i) => {
            const y = paddingTop + innerH - innerH * pct;
            const v = Math.round(maxVal * pct);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="2 3"
                  className="text-slate-200 dark:text-slate-800"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontFamily="monospace"
                  className="fill-slate-400 font-semibold"
                >
                  {valuePrefix}
                  {v.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill={`url(#${fillGradientId})`} />}

          {/* Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={lineColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = activePt === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setActivePt(i)}
                onMouseLeave={() => setActivePt(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={lineColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />
                {/* X-axis labels */}
                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  className="fill-slate-500 dark:fill-slate-400"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {activePt !== null && points[activePt] && (
        <div className="mt-1 p-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-slate-300">{points[activePt].label}</span>
          <span className="font-bold font-mono text-emerald-400">
            {valuePrefix}
            {points[activePt].value.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HORIZONTAL RANKING PROGRESS BAR CHART
// ============================================================================

interface RankingItem {
  label: string;
  value: number;
  subLabel?: string;
  color?: string;
}

export const SvgHorizontalRankingChart: React.FC<{
  items: RankingItem[];
  valueSuffix?: string;
  isKu?: boolean;
}> = ({ items, valueSuffix = '', isKu = false }) => {
  const maxVal = useMemo(() => {
    return items.reduce((m, item) => (item.value > m ? item.value : m), 1);
  }, [items]);

  return (
    <div className="w-full space-y-3">
      {items.map((item, idx) => {
        const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
        const barColor = item.color || '#10b981';

        return (
          <div key={idx} className="group flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                  #{idx + 1}
                </span>
                <span className="text-slate-900 dark:text-white truncate">{item.label}</span>
                {item.subLabel && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({item.subLabel})
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                {item.value.toLocaleString()} {valueSuffix}
              </span>
            </div>

            {/* Track & Filled Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                style={{
                  width: `${pct}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// SEMI-CIRCLE RADIAL GAUGE CHART
// ============================================================================

export const SvgGaugeChart: React.FC<{
  percentage: number;
  title: string;
  statusLabel?: string;
  size?: number;
  color?: string;
  isKu?: boolean;
}> = ({ percentage, title, statusLabel, size = 180, color = '#10b981', isKu = false }) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const r = size * 0.38;
  const strokeW = size * 0.12;
  const cx = size / 2;
  const cy = size * 0.58;

  // 180 degree arc length: pi * r
  const arcLength = Math.PI * r;
  const filledLength = (clamped / 100) * arcLength;

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg width={size} height={size * 0.65} className="overflow-visible select-none">
          {/* Background Track Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeW}
            strokeLinecap="round"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Filled Metric Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
            {clamped.toFixed(1)}%
          </span>
          {statusLabel && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">{title}</span>
    </div>
  );
};

// ============================================================================
// MAIN VISUAL CHARTS MODAL COMPONENT
// ============================================================================

export const VisualChartsModal: React.FC = () => {
  const {
    isVisualChartsOpen,
    visualChartsScope,
    closeVisualCharts,
    materials,
    stats,
    transactions,
    products,
    shipments,
    language,
    formatMoney,
    convertCurrency,
  } = useInventory();

  const isKu = language === 'ku';

  // Active Scope Tab
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ChartScopeTab>('all');
  const [reportDate, setReportDate] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync tab with initial scope when modal opens
  useEffect(() => {
    if (isVisualChartsOpen) {
      if (visualChartsScope === 'panels' || visualChartsScope === 'orders') {
        setActiveTab('panels');
      } else if (visualChartsScope === 'sales') {
        setActiveTab('sales');
      } else if (visualChartsScope === 'goods') {
        setActiveTab('goods');
      } else if (visualChartsScope === 'shipping') {
        setActiveTab('shipping');
      } else {
        setActiveTab('all');
      }

      const d = new Date();
      setReportDate(d.toLocaleDateString(isKu ? 'ku' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }));
    }
  }, [isVisualChartsOpen, visualChartsScope, isKu]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisualChartsOpen) {
        closeVisualCharts();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisualChartsOpen, closeVisualCharts]);

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // --------------------------------------------------------------------------
  // DATA CALCULATIONS FOR ALL MODULES
  // --------------------------------------------------------------------------

  // 1. Wood Panels & Orders Data Calculations
  const panelsAnalytics = useMemo(() => {
    // Types breakdown
    const typeMap: Record<string, number> = {};
    const thicknessMap: Record<string, number> = {};
    const clientOrderMap: Record<string, number> = {};

    materials.forEach((m) => {
      typeMap[m.type] = (typeMap[m.type] || 0) + m.totalStock;
      const th = `${m.dimensions.thickness}mm`;
      thicknessMap[th] = (thicknessMap[th] || 0) + m.totalStock;

      m.activeOrders.forEach((ord) => {
        const client = ord.client.trim() || (isKu ? 'کڕیاری گشتی' : 'General Client');
        clientOrderMap[client] = (clientOrderMap[client] || 0) + ord.quantity;
      });
    });

    const palette = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const typesDonut: DonutSlice[] = Object.entries(typeMap).map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));

    const thicknessBars: BarGroupItem[] = Object.entries(thicknessMap).map(([category, value]) => ({
      category,
      v1: value,
      label1: isKu ? 'کۆی تەختە' : 'Stock Panels',
      color1: '#10b981',
    }));

    const topClients: RankingItem[] = Object.entries(clientOrderMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({
        label,
        value,
        color: palette[i % palette.length],
        subLabel: isKu ? 'داواکراو' : 'Reserved panels',
      }));

    const allocationRate = stats.totalStock > 0 ? (stats.totalAllocated / stats.totalStock) * 100 : 0;

    return {
      typesDonut,
      thicknessBars,
      topClients,
      allocationRate,
    };
  }, [materials, stats, isKu]);

  // 2. Sales POS & Invoices Calculations
  const salesAnalytics = useMemo(() => {
    const curMap: Record<string, number> = { USD: 0, IQD: 0, EUR: 0 };
    const statusMap: Record<string, number> = { completed: 0, partial: 0, debt: 0 };

    let totalGrossRevenueUsd = 0;
    let totalPaidUsd = 0;
    let totalDebtUsd = 0;

    const trendPoints: TrendPoint[] = [];

    transactions.forEach((tx, idx) => {
      const cur = tx.currency || 'USD';
      curMap[cur] = (curMap[cur] || 0) + 1;

      const st = tx.status || (tx.amountOwed > 0 ? 'debt' : 'completed');
      statusMap[st] = (statusMap[st] || 0) + 1;

      // Normalize into USD for global aggregation
      const amtUsd = cur === 'USD' ? tx.totalAfterDiscount : convertCurrency(tx.totalAfterDiscount, cur as CurrencyCode, 'USD');
      const paidUsd = cur === 'USD' ? tx.amountPaidNow : convertCurrency(tx.amountPaidNow, cur as CurrencyCode, 'USD');
      const debtUsd = cur === 'USD' ? tx.combinedTotalDebt : convertCurrency(tx.combinedTotalDebt, cur as CurrencyCode, 'USD');

      totalGrossRevenueUsd += amtUsd;
      totalPaidUsd += paidUsd;
      totalDebtUsd += debtUsd;

      if (idx < 8) {
        trendPoints.push({
          label: tx.code || `#${idx + 1}`,
          value: Math.round(amtUsd),
        });
      }
    });

    const currencyDonut: DonutSlice[] = [
      { label: 'USD ($)', value: curMap.USD, color: '#0ea5e9' },
      { label: 'IQD (د.ع)', value: curMap.IQD, color: '#10b981' },
      { label: 'EUR (€)', value: curMap.EUR, color: '#8b5cf6' },
    ].filter((d) => d.value > 0);

    const statusDonut: DonutSlice[] = [
      { label: isKu ? 'دراوە (تەواو)' : 'Completed', value: statusMap.completed, color: '#10b981' },
      { label: isKu ? 'بەشەکی' : 'Partial', value: statusMap.partial, color: '#f59e0b' },
      { label: isKu ? 'قەرز' : 'Unpaid Debt', value: statusMap.debt, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    const recoveryRate = totalGrossRevenueUsd > 0 ? (totalPaidUsd / totalGrossRevenueUsd) * 100 : 100;

    return {
      totalGrossRevenueUsd,
      totalPaidUsd,
      totalDebtUsd,
      currencyDonut,
      statusDonut,
      recoveryRate,
      trendPoints: trendPoints.reverse(),
    };
  }, [transactions, convertCurrency, isKu]);

  // 3. Warehouse Goods & Hardware Calculations
  const goodsAnalytics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const catMap: Record<string, number> = {};
    const locMap: Record<string, number> = {};

    products.forEach((p) => {
      if (p.currentStock <= 0 || p.lane === 'outOfStock') outOfStock++;
      else if (p.currentStock <= p.minStock || p.lane === 'lowStock') lowStock++;
      else inStock++;

      catMap[p.category] = (catMap[p.category] || 0) + p.currentStock;
      const loc = p.location || 'Warehouse Floor';
      locMap[loc] = (locMap[loc] || 0) + p.currentStock;
    });

    const healthDonut: DonutSlice[] = [
      { label: isKu ? 'بەردەست' : 'In Stock', value: inStock, color: '#10b981' },
      { label: isKu ? 'کەم ماوە' : 'Low Stock', value: lowStock, color: '#f59e0b' },
      { label: isKu ? 'تەواوبوو' : 'Out of Stock', value: outOfStock, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    const catBars: BarGroupItem[] = Object.entries(catMap)
      .slice(0, 6)
      .map(([category, value]) => ({
        category,
        v1: value,
        label1: isKu ? 'دانە لە کۆگا' : 'Units in stock',
        color1: '#f59e0b',
      }));

    const locRanking: RankingItem[] = Object.entries(locMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label,
        value,
        color: '#f59e0b',
        subLabel: isKu ? 'کۆی کەلوپەل' : 'Stored items',
      }));

    const healthRate = products.length > 0 ? (inStock / products.length) * 100 : 100;

    return {
      healthDonut,
      catBars,
      locRanking,
      healthRate,
    };
  }, [products, isKu]);

  // 4. Shipping & Logistics Calculations
  const shippingAnalytics = useMemo(() => {
    const statusMap: Record<string, number> = { delivered: 0, in_transit: 0, pending: 0 };
    const destMap: Record<string, number> = {};

    shipments.forEach((s) => {
      statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      const d = s.destination.trim() || (isKu ? 'شوێنی نادیار' : 'Unassigned');
      destMap[d] = (destMap[d] || 0) + (s.quantity || 1);
    });

    const statusDonut: DonutSlice[] = [
      { label: isKu ? 'گەیشتووە' : 'Delivered', value: statusMap.delivered, color: '#10b981' },
      { label: isKu ? 'لە ڕێگایە' : 'In Transit', value: statusMap.in_transit, color: '#0ea5e9' },
      { label: isKu ? 'چاوەڕوانکراو' : 'Pending', value: statusMap.pending, color: '#f59e0b' },
    ].filter((d) => d.value > 0);

    const destRanking: RankingItem[] = Object.entries(destMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({
        label,
        value,
        color: '#0ea5e9',
        subLabel: isKu ? 'کۆی بڕ' : 'Units transported',
      }));

    const deliveredRate = shipments.length > 0 ? (statusMap.delivered / shipments.length) * 100 : 100;

    return {
      statusDonut,
      destRanking,
      deliveredRate,
    };
  }, [shipments, isKu]);

  // 5. Cross-Division Overview
  const crossDivisionDonut: DonutSlice[] = useMemo(() => {
    return [
      { label: isKu ? 'تەختەی کۆگا' : 'Wood Panels', value: stats.totalStock, color: '#10b981' },
      { label: isKu ? 'کەلوپەل و قەراغ' : 'Hardware & Goods', value: products.reduce((acc, p) => acc + p.currentStock, 0), color: '#f59e0b' },
      { label: isKu ? 'تەختەی گیراوی بڕین' : 'Reserved Orders', value: stats.totalAllocated, color: '#8b5cf6' },
      { label: isKu ? 'باری گەیاندن' : 'Logistics Cargo', value: shipments.reduce((acc, s) => acc + s.quantity, 0), color: '#0ea5e9' },
    ].filter((d) => d.value > 0);
  }, [stats, products, shipments, isKu]);

  if (!isVisualChartsOpen || !mounted) {
    return null;
  }

  const modalContent = (
    <div
      id="print-charts-mount-root"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={closeVisualCharts}
    >
      {/* Modal Card Container */}
      <div
        id="printable-charts"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100"
      >
        {/* ================================================================= */}
        {/* TOP MODAL HEADER & CONTROLS (Screen Only)                         */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 backdrop-blur-md shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isKu ? 'چارت و شیکاری بینراوی سیستەمی سەرەکی' : 'Visual Charts & Executive Analytics'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Bako&apos;s Master System • Engineered &amp; Maintained by <strong>Bako Bayan Madhhar</strong> (07705488654)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Print Analytics Report Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              title="Print Vector Analytics Report"
            >
              <Printer className="w-4 h-4" />
              <span>{isKu ? 'چاپی ڕاپۆرتی چارتەکان' : 'Print Analytics Report'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeVisualCharts}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* DIVISION SCOPE NAVIGATION TABS (Screen Only)                      */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 no-print">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isKu ? 'پوختەی گشتی سەرجەم بەشەکان' : 'Executive Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('panels')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'panels'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isKu ? 'تەختەکان و داواکارییەکان' : 'Wood Panels & Orders'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {materials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-sky-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>{isKu ? 'فرۆشتن و دارایی (POS)' : 'Sales POS & Finance'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goods')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'goods'
                ? 'bg-amber-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isKu ? 'کەلوپەل و قەراغ (PVC)' : 'Warehouse Hardware'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'shipping'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{isKu ? 'گواستنەوە و لۆجستی' : 'Shipping Pipeline'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {shipments.length}
            </span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* PRINT FORMAL REPORT HEADER (Visible in Print & Top of Document)   */}
        {/* ================================================================= */}
        <div className="hidden print:block p-6 border-b-2 border-slate-900 bg-white text-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded mb-1">
                OFFICIAL SYSTEM ANALYTICS & INTELLIGENCE REPORT
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                Bako&apos;s Master System • {APP_CONFIG.version}
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Division Focus:{' '}
                <span className="uppercase text-slate-900 font-black">
                  {activeTab === 'all'
                    ? 'Cross-Division Operations'
                    : activeTab === 'panels'
                    ? 'Wood Panels & Workshop Orders'
                    : activeTab === 'sales'
                    ? 'Sales POS, Finance & Debt Ledger'
                    : activeTab === 'goods'
                    ? 'Warehouse Hardware & PVC Edging'
                    : 'Shipping & Logistics Fleet'}
                </span>
              </p>
            </div>

            <div className="text-right text-xs font-mono">
              <div className="font-bold text-slate-900">
                Engineered &amp; Maintained by: <strong>Bako Bayan Madhhar</strong>
              </div>
              <div className="text-slate-600">Contact: 07705488654</div>
              <div className="text-slate-500 mt-1">{reportDate}</div>
              <div className="text-[10px] text-emerald-800 font-bold">SQLITE WAL DURABILITY VERIFIED</div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SCROLLABLE MODAL CONTENT BODY                                     */}
        {/* ================================================================= */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">

          {/* --------------------------------------------------------------- */}
          {/* TAB 1: EXECUTIVE OVERVIEW (ALL DIVISIONS)                       */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'all' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Executive KPI Ticker Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <span>{isKu ? 'کۆی تەختە' : 'Wood Panels'}</span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">
                    {stats.totalStock.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {stats.totalAvailable.toLocaleString()} {isKu ? 'بەردەست' : 'ready for dispatch'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80">
                  <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-bold">
                    <span>{isKu ? 'پسوولە و فرۆشتن' : 'Invoices & Sales'}</span>
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">
                    {transactions.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    ${Math.round(salesAnalytics.totalGrossRevenueUsd).toLocaleString()} {isKu ? 'کۆی فرۆش' : 'Gross USD'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80">
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold">
                    <span>{isKu ? 'کەلوپەلی کۆگا' : 'Warehouse Goods'}</span>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">
                    {products.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {products.reduce((acc, p) => acc + p.currentStock, 0).toLocaleString()} {isKu ? 'دانەی گشتی' : 'total hardware items'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80">
                  <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold">
                    <span>{isKu ? 'هێڵی گواستنەوە' : 'Logistics'}</span>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono mt-2">
                    {shipments.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {shippingAnalytics.deliveredRate.toFixed(0)}% {isKu ? 'گەیشتووە' : 'completion rate'}
                  </div>
                </div>
              </div>

              {/* 2-Column Visual Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Master Inventory Share */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between print-avoid-break">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-emerald-500" />
                      <span>{isKu ? 'دابەشبوونی ماددەکان لە سەرانسەری سیستم' : 'Cross-Division Asset Share'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isKu ? 'بەراوردی ڕێژەی تەختە، کەلوپەل و داواکارییەکان' : 'Volume proportion of Panels, Hardware Goods, and Active Reservations'}
                    </p>
                  </div>
                  <SvgDonutChart
                    data={crossDivisionDonut}
                    totalLabel={isKu ? 'کۆی بڕ' : 'Total Items'}
                    isKu={isKu}
                  />
                </div>

                {/* Chart 2: Recent Revenue Trend */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between print-avoid-break">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-500" />
                      <span>{isKu ? 'ئاستی فرۆشتن بەپێی پسوولەکان ($)' : 'Invoice Revenue Trend ($)'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isKu ? 'بەدواداچوونی گەشەی داهاتی دارایی بە دۆلار' : 'Real-time sales progression curve in USD across recent transactions'}
                    </p>
                  </div>
                  {salesAnalytics.trendPoints.length > 0 ? (
                    <SvgAreaTrendChart
                      data={salesAnalytics.trendPoints}
                      lineColor="#0ea5e9"
                      valuePrefix="$"
                      isKu={isKu}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                      {isKu ? 'هیچ پسوولەیەک تۆمار نەکراوە' : 'No transactions recorded yet'}
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Operational Health Gauges */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{isKu ? 'پێوەرە تەندروستییەکانی بەشەکان' : 'Operational Division Health Dials'}</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {isKu ? 'ئامارەکانی بەردەستبوون، کۆکردنەوەی قەرز، و دۆخی کۆگا' : 'Real-time capability metrics: Stock Availability, Debt Recovery, Goods Health, Logistics Delivery'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <SvgGaugeChart
                    percentage={stats.totalStock > 0 ? (stats.totalAvailable / stats.totalStock) * 100 : 100}
                    title={isKu ? 'بەردەستبوونی تەختە' : 'Panel Availability'}
                    statusLabel={isKu ? 'تەندروست' : 'In Stock'}
                    color="#10b981"
                    isKu={isKu}
                  />

                  <SvgGaugeChart
                    percentage={salesAnalytics.recoveryRate}
                    title={isKu ? 'وەرگرتنەوەی پارە' : 'Payment Collection'}
                    statusLabel={salesAnalytics.recoveryRate >= 75 ? 'Optimal' : 'Attention'}
                    color="#0ea5e9"
                    isKu={isKu}
                  />

                  <SvgGaugeChart
                    percentage={goodsAnalytics.healthRate}
                    title={isKu ? 'ڕێژەی کاڵای تەواو' : 'Goods Stock Health'}
                    statusLabel={goodsAnalytics.healthRate >= 80 ? 'Optimal' : 'Low Stock'}
                    color="#f59e0b"
                    isKu={isKu}
                  />

                  <SvgGaugeChart
                    percentage={shippingAnalytics.deliveredRate}
                    title={isKu ? 'تەواوبوونی گەیاندن' : 'Fleet Delivery Rate'}
                    statusLabel={shippingAnalytics.deliveredRate >= 80 ? 'Optimal' : 'In Transit'}
                    color="#8b5cf6"
                    isKu={isKu}
                  />
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 2: WOOD PANELS & ORDERS                                     */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'panels' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Panels KPI Ticker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">{isKu ? 'کۆی تەختە' : 'Total Stock'}</span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {stats.totalStock.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{materials.length} {isKu ? 'کۆد / جۆر' : 'panel codes'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{isKu ? 'گیراو بۆ بڕین' : 'Reserved Orders'}</span>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {stats.totalAllocated.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{stats.totalOrders} {isKu ? 'داواکاری چالاک' : 'active orders'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{isKu ? 'بەردەست بۆ فرۆشتن' : 'Available Stock'}</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.totalAvailable.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'ئامادە بۆ کڕیار' : 'ready for dispatch'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">{isKu ? 'ڕێژەی گیراو' : 'Workshop Demand'}</span>
                  <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                    {panelsAnalytics.allocationRate.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'لە کۆی گشتی کۆگا' : 'of warehouse capacity'}</span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Panel Types Donut */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-emerald-500" />
                    <span>{isKu ? 'جۆرەکانی تەختە لە کۆگا' : 'Wood Panel Types Distribution'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ڕێژەی MDF، Plywood، Acrylic و جۆرەکانی تر' : 'Breakdown by MDF, Plywood, HPL, Acrylic, and custom sheets'}
                  </p>
                  <SvgDonutChart
                    data={panelsAnalytics.typesDonut}
                    totalLabel={isKu ? 'کۆی تەختە' : 'Total Panels'}
                    isKu={isKu}
                  />
                </div>

                {/* Top Clients by Reservations */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-sky-500" />
                    <span>{isKu ? 'داواکارییەکانی کڕیاران بۆ بڕین' : 'Top Clients by Cut Order Volume'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ئەو کڕیارانەی زۆرترین تەختەیان بۆ گیراوە' : 'Highest demand clients with active workshop cutting orders'}
                  </p>
                  {panelsAnalytics.topClients.length > 0 ? (
                    <SvgHorizontalRankingChart
                      items={panelsAnalytics.topClients}
                      valueSuffix={isKu ? 'تەختە' : 'panels'}
                      isKu={isKu}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                      {isKu ? 'هیچ داواکارییەکی چالاک نییە' : 'No active client orders found'}
                    </div>
                  )}
                </div>
              </div>

              {/* Panel Thickness Distribution Bar Chart */}
              {panelsAnalytics.thicknessBars.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <span>{isKu ? 'ئەستووری تەختەکان (Thickness)' : 'Panel Thickness Distribution (mm)'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ژمارەی تەختەکان بەپێی ئەستووری (18mm، 16mm، هتد)' : 'Physical panel stock distributed across gauges and sheet thicknesses'}
                  </p>
                  <SvgGroupedBarChart data={panelsAnalytics.thicknessBars} height={200} isKu={isKu} />
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 3: SALES POS & FINANCIAL INVOICES                           */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'sales' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Financial Ticker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">{isKu ? 'کۆی فرۆش' : 'Gross Sales Volume'}</span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    ${Math.round(salesAnalytics.totalGrossRevenueUsd).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{transactions.length} {isKu ? 'پسوولە' : 'invoices recorded'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{isKu ? 'پارەی وەرگیراو' : 'Paid & Collected'}</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ${Math.round(salesAnalytics.totalPaidUsd).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{salesAnalytics.recoveryRate.toFixed(1)}% {isKu ? 'دراوە' : 'recovered'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{isKu ? 'کۆی قەرز' : 'Outstanding Debt'}</span>
                  <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                    ${Math.round(salesAnalytics.totalDebtUsd).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'قەرزی ماوە' : 'unpaid customer balance'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">{isKu ? 'دراوەکان' : 'Multi-Currency'}</span>
                  <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
                    3 Currencies
                  </div>
                  <span className="text-[10px] text-slate-400">USD • IQD • EUR</span>
                </div>
              </div>

              {/* Financial Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Currency Share */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-sky-500" />
                    <span>{isKu ? 'دابەشبوونی دراوەکان (Currency Share)' : 'Currency Transaction Share'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ڕێژەی پسوولەکان بە دۆلار، دینار و یۆرۆ' : 'Proportion of invoices billed in USD, IQD, and EUR'}
                  </p>
                  <SvgDonutChart
                    data={salesAnalytics.currencyDonut}
                    totalLabel={isKu ? 'کۆی پسوولە' : 'Invoices'}
                    isKu={isKu}
                  />
                </div>

                {/* Payment Status Breakdown */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-emerald-500" />
                    <span>{isKu ? 'دۆخی پارەدان و قەرز' : 'Invoice Payment & Debt Status'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ڕێژەی پسوولەی تەواوکراو، بەشەکی، و قەرزی ماوە' : 'Invoices categorized into Fully Paid, Partial Payment, and Open Debt'}
                  </p>
                  <SvgDonutChart
                    data={salesAnalytics.statusDonut}
                    totalLabel={isKu ? 'دۆخەکان' : 'Status'}
                    isKu={isKu}
                  />
                </div>
              </div>

              {/* Revenue Curve */}
              {salesAnalytics.trendPoints.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                    <span>{isKu ? 'گەشەی دارایی بەپێی پسوولەکان' : 'Financial Revenue Growth Curve'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ئاستی بەهای دارایی لەسەر زنجیرەی پسوولەکانی دوایی' : 'Smooth transaction revenue trajectory mapped chronologically'}
                  </p>
                  <SvgAreaTrendChart
                    data={salesAnalytics.trendPoints}
                    lineColor="#0ea5e9"
                    valuePrefix="$"
                    isKu={isKu}
                  />
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 4: WAREHOUSE GOODS & HARDWARE STOCK                         */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'goods' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Goods Ticker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">{isKu ? 'کۆی کاڵاکان' : 'Product SKUs'}</span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {products.length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'بابەتی جیاواز' : 'distinct hardware items'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{isKu ? 'کۆی دانەکان' : 'Total Units'}</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {products.reduce((acc, p) => acc + p.currentStock, 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'دانە لە مەخزەن' : 'units in warehouse'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{isKu ? 'کەمبووەوە' : 'Low Stock Alerts'}</span>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {products.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0).length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'پێویستی بە کڕینەوەیە' : 'near reorder threshold'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{isKu ? 'تەواوبوو' : 'Out of Stock'}</span>
                  <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                    {products.filter((p) => p.currentStock <= 0).length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'دەستبەجێ پێویستە' : 'zero stock items'}</span>
                </div>
              </div>

              {/* Goods Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stock Health Donut */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-amber-500" />
                    <span>{isKu ? 'دۆخی بەردەستبوونی کاڵاکان' : 'Stock Threshold Health'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'پۆلێنکردن بەپێی بەردەست، کەمبووەوە و تەواوبوو' : 'Categorized by Healthy Stock, Low Reorder Alert, and Depleted Stock'}
                  </p>
                  <SvgDonutChart
                    data={goodsAnalytics.healthDonut}
                    totalLabel={isKu ? 'کۆی کاڵا' : 'Total Items'}
                    isKu={isKu}
                  />
                </div>

                {/* Warehouse Location Density */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <Boxes className="w-4 h-4 text-amber-500" />
                    <span>{isKu ? 'خانە و شوێنەکانی کۆگا' : 'Warehouse Location Density'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'چڕی کەلوپەل لە خانەکانی مەخزەن' : 'Inventory concentration across storage bays and racks'}
                  </p>
                  {goodsAnalytics.locRanking.length > 0 ? (
                    <SvgHorizontalRankingChart
                      items={goodsAnalytics.locRanking}
                      valueSuffix={isKu ? 'دانە' : 'units'}
                      isKu={isKu}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                      {isKu ? 'هیچ شوێنێک دیاری نەکراوە' : 'No locations recorded'}
                    </div>
                  )}
                </div>
              </div>

              {/* Goods Category Volume Bar Chart */}
              {goodsAnalytics.catBars.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    <span>{isKu ? 'کەلوپەل بەپێی پۆلێن (Categories)' : 'Inventory Volume by Category'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'قەراغی PVC، پێداویستی، دەسک، چەکمەجە و هتد' : 'Stock unit volume distributed across PVC Edging, Hinges, Screws, and Hardware'}
                  </p>
                  <SvgGroupedBarChart data={goodsAnalytics.catBars} height={200} isKu={isKu} />
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 5: SHIPPING & LOGISTICS                                     */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'shipping' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Shipping Ticker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">{isKu ? 'کۆی بارەکان' : 'Total Shipments'}</span>
                  <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {shipments.length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'بارنامەی گشتی' : 'dispatch manifests'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{isKu ? 'گەیشتووە' : 'Delivered'}</span>
                  <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {shipments.filter((s) => s.status === 'delivered').length}
                  </div>
                  <span className="text-[10px] text-slate-400">{shippingAnalytics.deliveredRate.toFixed(1)}% {isKu ? 'تەواوکراو' : 'completion'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">{isKu ? 'لە ڕێگایە' : 'In Transit'}</span>
                  <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
                    {shipments.filter((s) => s.status === 'in_transit').length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'شۆفێر لە ڕێگادایە' : 'active en-route'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{isKu ? 'چاوەڕوانکراو' : 'Pending'}</span>
                  <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {shipments.filter((s) => s.status === 'pending').length}
                  </div>
                  <span className="text-[10px] text-slate-400">{isKu ? 'ئامادەکاری بۆ بارکردن' : 'staged for loading'}</span>
                </div>
              </div>

              {/* Shipping Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Donut */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <PieChart className="w-4 h-4 text-purple-500" />
                    <span>{isKu ? 'دۆخی گەیاندنی بارەکان' : 'Shipment Pipeline Status'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'ڕێژەی گەیشتوو، لە ڕێگا و چاوەڕوانکراو' : 'Fleet delivery lifecycle: Pending Dispatch, In-Transit, Delivered'}
                  </p>
                  <SvgDonutChart
                    data={shippingAnalytics.statusDonut}
                    totalLabel={isKu ? 'کۆی بار' : 'Shipments'}
                    isKu={isKu}
                  />
                </div>

                {/* Top Destinations */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-purple-500" />
                    <span>{isKu ? 'شوێنەکانی گەیاندن (Destinations)' : 'Top Destination Hubs'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {isKu ? 'شار و شوێنەکانی زۆرترین باریان بۆ چووە' : 'Cargo volumes distributed across cities, workshops, and project sites'}
                  </p>
                  {shippingAnalytics.destRanking.length > 0 ? (
                    <SvgHorizontalRankingChart
                      items={shippingAnalytics.destRanking}
                      valueSuffix={isKu ? 'دانە' : 'units'}
                      isKu={isKu}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                      {isKu ? 'هیچ شوێنێک تۆمار نەکراوە' : 'No destinations recorded'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* DETAILED DATA ANALYSIS & TABULAR BREAKDOWN                      */}
          {/* =============================================================== */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>{isKu ? 'شیکاری ورد و خشتەی ئامارەکان' : 'Tabular Analytics Breakdown'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isKu ? 'وردەکاری بڕگەکان بۆ لێکۆڵینەوە، بڕیار و چاپ' : 'Itemized data register for verification, analysis, and formal audit print'}
                </p>
              </div>

              {/* Table Search Input (Screen Only) */}
              <div className="relative w-full sm:w-64 no-print">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={isKu ? 'گەڕان لە خشتەدا...' : 'Filter table rows...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-750">
              {activeTab === 'panels' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 font-mono">#Code</th>
                      <th className="p-2.5">{isKu ? 'ناوی تەختە' : 'Material Name'}</th>
                      <th className="p-2.5">{isKu ? 'جۆر' : 'Type'}</th>
                      <th className="p-2.5">{isKu ? 'قەبارە' : 'Dimensions'}</th>
                      <th className="p-2.5 text-center font-mono">{isKu ? 'کۆی گشتی' : 'Total Stock'}</th>
                      <th className="p-2.5 text-center font-mono text-amber-600">{isKu ? 'گیراو' : 'Reserved'}</th>
                      <th className="p-2.5 text-center font-mono text-emerald-600">{isKu ? 'بەردەست' : 'Available'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {materials
                      .filter((m) =>
                        !tableSearch ||
                        m.code.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        m.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        m.type.toLowerCase().includes(tableSearch.toLowerCase())
                      )
                      .slice(0, 15)
                      .map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">#{m.code}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{m.name}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {m.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-500">{m.dimensions.formatted}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {m.totalStock}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                            {m.allocatedStock}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {m.availableStock}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : activeTab === 'sales' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 font-mono">Invoice #</th>
                      <th className="p-2.5">{isKu ? 'فرۆشیار / بانک' : 'Seller / Bank'}</th>
                      <th className="p-2.5">{isKu ? 'جۆر و بابەت' : 'Item / Type'}</th>
                      <th className="p-2.5 text-right font-mono">{isKu ? 'کۆی پارە' : 'Total'}</th>
                      <th className="p-2.5 text-right font-mono text-emerald-600">{isKu ? 'دراو' : 'Paid Now'}</th>
                      <th className="p-2.5 text-right font-mono text-rose-600">{isKu ? 'قەرز' : 'Debt'}</th>
                      <th className="p-2.5 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {transactions
                      .filter((tx) =>
                        !tableSearch ||
                        (tx.code && tx.code.toLowerCase().includes(tableSearch.toLowerCase())) ||
                        (tx.seller && tx.seller.toLowerCase().includes(tableSearch.toLowerCase())) ||
                        (tx.material && tx.material.toLowerCase().includes(tableSearch.toLowerCase()))
                      )
                      .slice(0, 15)
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                            {tx.code || `#${tx.id.slice(-4)}`}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                            {tx.seller || 'General'}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">
                            {tx.material || tx.panelType}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatMoney(tx.totalAfterDiscount, tx.currency)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(tx.amountPaidNow, tx.currency)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatMoney(tx.combinedTotalDebt, tx.currency)}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : tx.status === 'partial'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : activeTab === 'goods' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 font-mono">SKU</th>
                      <th className="p-2.5">{isKu ? 'ناوی کاڵا' : 'Product Name'}</th>
                      <th className="p-2.5">{isKu ? 'پۆلێن' : 'Category'}</th>
                      <th className="p-2.5">{isKu ? 'شوێن لە کۆگا' : 'Location'}</th>
                      <th className="p-2.5 text-center font-mono">{isKu ? 'بڕ لە کۆگا' : 'Current Stock'}</th>
                      <th className="p-2.5 text-center font-mono text-slate-400">{isKu ? 'کەمترین بڕ' : 'Min Stock'}</th>
                      <th className="p-2.5 text-right font-mono">{isKu ? 'نرخ' : 'Unit Price'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {products
                      .filter((p) =>
                        !tableSearch ||
                        p.sku.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        p.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        p.category.toLowerCase().includes(tableSearch.toLowerCase())
                      )
                      .slice(0, 15)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{p.sku}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{p.name}</td>
                          <td className="p-2.5 text-slate-500">{p.category}</td>
                          <td className="p-2.5 font-mono text-slate-500">{p.location}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {p.currentStock}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-400">{p.minStock}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${p.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : activeTab === 'shipping' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 font-mono">Tracking</th>
                      <th className="p-2.5">{isKu ? 'شوێنی گەیشتن' : 'Destination'}</th>
                      <th className="p-2.5">{isKu ? 'پوختەی بار' : 'Cargo Summary'}</th>
                      <th className="p-2.5 text-center font-mono">{isKu ? 'بڕ' : 'Quantity'}</th>
                      <th className="p-2.5 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                      <th className="p-2.5 font-mono text-right">{isKu ? 'بەروار' : 'Created At'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {shipments
                      .filter((s) =>
                        !tableSearch ||
                        s.trackingCode.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        s.destination.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        s.itemSummary.toLowerCase().includes(tableSearch.toLowerCase())
                      )
                      .slice(0, 15)
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{s.trackingCode}</td>
                          <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{s.destination}</td>
                          <td className="p-2.5 text-slate-500">{s.itemSummary}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {s.quantity}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                s.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : s.status === 'in_transit'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-400 text-right">{s.createdAt.slice(0, 10)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                /* Cross-Division Master Table */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5">{isKu ? 'بەشی سیستم' : 'Division Name'}</th>
                      <th className="p-2.5">{isKu ? 'پۆلێنی سەرەکی' : 'Primary Metrics'}</th>
                      <th className="p-2.5 text-center font-mono">{isKu ? 'کۆی بڕ / ژمارە' : 'Total Items / Volume'}</th>
                      <th className="p-2.5 text-center font-mono text-amber-600">{isKu ? 'داواکاری چالاک' : 'Active Load'}</th>
                      <th className="p-2.5 text-center font-mono text-emerald-600">{isKu ? 'تەندروستی ئیشکردن' : 'Health Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Wood Panels & Workshop</span>
                      </td>
                      <td className="p-2.5 text-slate-500">MDF, Plywood, HPL, Acrylic</td>
                      <td className="p-2.5 text-center font-mono font-bold">{stats.totalStock.toLocaleString()}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-600">
                        {stats.totalAllocated.toLocaleString()} ({stats.totalOrders} orders)
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {stats.totalStock > 0 ? ((stats.totalAvailable / stats.totalStock) * 100).toFixed(0) : 100}% Ready
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ReceiptText className="w-3.5 h-3.5 text-sky-500" />
                        <span>Sales POS & Finance</span>
                      </td>
                      <td className="p-2.5 text-slate-500">USD, IQD, EUR Multi-Currency</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        ${Math.round(salesAnalytics.totalGrossRevenueUsd).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-rose-600">
                        ${Math.round(salesAnalytics.totalDebtUsd).toLocaleString()} Debt
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          {salesAnalytics.recoveryRate.toFixed(0)}% Settled
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        <span>Warehouse Hardware & PVC</span>
                      </td>
                      <td className="p-2.5 text-slate-500">Banding, Joinery, Slides, Hinges</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        {products.reduce((acc, p) => acc + p.currentStock, 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-600">
                        {products.filter((p) => p.currentStock <= p.minStock).length} Reorders
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {goodsAnalytics.healthRate.toFixed(0)}% In-Stock
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-purple-500" />
                        <span>Shipping & Logistics</span>
                      </td>
                      <td className="p-2.5 text-slate-500">Fleet Dispatch & Site Delivery</td>
                      <td className="p-2.5 text-center font-mono font-bold">{shipments.length} Runs</td>
                      <td className="p-2.5 text-center font-mono font-bold text-sky-600">
                        {shipments.filter((s) => s.status === 'in_transit').length} In Transit
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {shippingAnalytics.deliveredRate.toFixed(0)}% Delivered
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* =============================================================== */}
          {/* PRINT VERIFICATION & SIGN-OFF BLOCK                             */}
          {/* =============================================================== */}
          <div className="hidden print:block pt-8 border-t-2 border-slate-300 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-bold text-slate-900 mb-1">System Verification Notice:</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  This visual analytics report was generated from Bako&apos;s Master System ({APP_CONFIG.version}) with SQLite Write-Ahead Logging (WAL) state persistence. All inventory units, multi-currency ledger balances, and workshop reservation allocations are verified accurate as of the execution timestamp.
                </p>
                <p className="text-slate-500 text-[10px] mt-2 font-mono">
                  Report Ref: #BMS-ANL-{Date.now().toString().slice(-6)} • Operator: Bako Bayan Madhhar (07705488654)
                </p>
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1">
                  <span className="font-bold">Authorized Supervisor Signature:</span>
                  <span className="font-mono">Bako Bayan Madhhar</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Official Signature / Stamp</span>
                  <span>Date: {reportDate}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* BOTTOM ACTION BAR (Screen Only)                                   */}
        {/* ================================================================= */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{isKu ? 'هەموو چارتەکان بە شێوەی ڕاستەوخۆ لە داتابەیسەوە نوێ دەبنەوە' : 'Vector SVG charts computed in real-time from active SQLite WAL data'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isKu ? 'چاپکردنی ڕاپۆرت' : 'Print Report'}</span>
            </button>

            <button
              type="button"
              onClick={closeVisualCharts}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              {isKu ? 'داخستن' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VisualChartsModal;
