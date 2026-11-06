"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useInventory } from "../context/InventoryContext";
import { isPdfFile, extractClipboardFiles } from "../utils/imageUpload";
import { PDFDocument } from "pdf-lib";
import {
  Combine,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  Download,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  LayoutGrid,
  ZoomIn,
  Layers,
  Loader2,
  ChevronDown,
  FileCheck,
} from "lucide-react";

interface MergerAssetItem {
  id: string;
  name: string;
  sourceType: "image" | "pdf-page";
  dataUrl: string;
  imageElement: HTMLImageElement; // Full-res image for final export only
  previewElement: HTMLCanvasElement | HTMLImageElement; // Lightweight proxy (<= 600px) for 60FPS preview dragging
  naturalWidth: number;
  naturalHeight: number;
  caption: string;
  captionFontSize: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface HitRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = "None" | "Move" | "ResizeTL" | "ResizeTR" | "ResizeBL" | "ResizeBR";

type PaperSizeOption = "A4" | "Letter" | "Legal";
type OrientationOption = "Portrait" | "Landscape";
type MarginOption = "Normal" | "Compact" | "Wide" | "None";
type GapOption = "Medium" | "Small" | "Large" | "None";
type SizeCapOption = "150kb" | "100kb" | "none";

const HANDLE_RADIUS_DOC = 28;
const PROXY_PREVIEW_MAX_EDGE = 560;
const CANVAS_MAX_WIDTH = 560;
const CANVAS_MAX_HEIGHT = 760;
const COPYRIGHT_LINE1 =
  "Created by Bako's Master System © 2026 Shaswar Ahmad Shaswar. All rights reserved.";
const COPYRIGHT_LINE2 =
  "Need a custom ERP? Contact: bakobayan.official@gmail.com | 07705488654";

/**
 * Scans sourceCanvas using ctx.getImageData to find the bounding box of non-white / non-transparent
 * pixels and returns a tightly cropped canvas without wasted empty PDF margins.
 */
export function trimCanvas(sourceCanvas: HTMLCanvasElement, paddingPx = 12): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  if (width <= 1 || height <= 1) return sourceCanvas;

  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  const whiteThreshold = 248;
  const alphaThreshold = 12;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > alphaThreshold && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return sourceCanvas;
  }

  const cropX = Math.max(0, minX - paddingPx);
  const cropY = Math.max(0, minY - paddingPx);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + paddingPx * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + paddingPx * 2);

  if (cropW <= 0 || cropH <= 0 || (cropW === width && cropH === height)) {
    return sourceCanvas;
  }

  const trimmed = document.createElement("canvas");
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tCtx = trimmed.getContext("2d");
  if (!tCtx) return sourceCanvas;

  tCtx.fillStyle = "#ffffff";
  tCtx.fillRect(0, 0, cropW, cropH);
  tCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmed;
}

/**
 * Creates a lightweight downscaled proxy canvas (max 560px edge) so the interactive preview canvas
 * never has to downsample multi-megapixel bitmaps during 60FPS drag/resize.
 */
function createProxyBitmap(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const maxEdge = Math.max(w, h);
  if (maxEdge <= PROXY_PREVIEW_MAX_EDGE) return img;

  const scale = PROXY_PREVIEW_MAX_EDGE / maxEdge;
  const proxy = document.createElement("canvas");
  proxy.width = Math.max(1, Math.round(w * scale));
  proxy.height = Math.max(1, Math.round(h * scale));
  const ctx = proxy.getContext("2d");
  if (!ctx) return img;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(img, 0, 0, proxy.width, proxy.height);
  return proxy;
}

function getPaperDimensions300Dpi(paper: PaperSizeOption, orientation: OrientationOption): { pageW: number; pageH: number } {
  let pageW = 2480;
  let pageH = 3508;
  if (paper === "Letter") {
    pageW = 2550;
    pageH = 3300;
  } else if (paper === "Legal") {
    pageW = 2550;
    pageH = 4200;
  }
  if (orientation === "Landscape") {
    return { pageW: pageH, pageH: pageW };
  }
  return { pageW, pageH };
}

function getMarginPx300Dpi(margin: MarginOption): number {
  switch (margin) {
    case "Compact":
      return 65;
    case "Wide":
      return 180;
    case "None":
      return 20;
    default:
      return 120;
  }
}

function getGapPx300Dpi(gap: GapOption): number {
  switch (gap) {
    case "Small":
      return 20;
    case "Large":
      return 80;
    case "None":
      return 0;
    default:
      return 45;
  }
}

function computeBalancedGrid(n: number, isLandscape: boolean): { cols: number; rows: number } {
  let cols = 1;
  let rows = 1;
  if (n <= 1) {
    cols = 1;
    rows = 1;
  } else if (n === 2) {
    cols = isLandscape ? 2 : 1;
    rows = isLandscape ? 1 : 2;
  } else if (n === 3) {
    cols = isLandscape ? 3 : 1;
    rows = isLandscape ? 1 : 3;
  } else if (n === 4) {
    cols = 2;
    rows = 2;
  } else if (n <= 6) {
    cols = isLandscape ? 3 : 2;
    rows = isLandscape ? 2 : 3;
  } else if (n <= 9) {
    cols = 3;
    rows = Math.ceil(n / 3);
  } else {
    cols = isLandscape ? 4 : 3;
    rows = Math.ceil(n / cols);
  }
  return { cols, rows };
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

async function rotateImageDataUrl90CW(
  img: HTMLImageElement
): Promise<{ dataUrl: string; rotatedImg: HTMLImageElement; previewElement: HTMLCanvasElement | HTMLImageElement }> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight || img.height;
  canvas.height = img.naturalWidth || img.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const rotatedImg = await loadImageFromDataUrl(dataUrl);
  const previewElement = createProxyBitmap(rotatedImg);
  return { dataUrl, rotatedImg, previewElement };
}

let pdfJsLoadPromise: Promise<any> | null = null;

function ensurePdfJsLoaded(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (w.pdfjsLib) {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(w.pdfjsLib);
      } else {
        reject(new Error("pdfjsLib not found after script load"));
      }
    };
    script.onerror = () => {
      pdfJsLoadPromise = null;
      reject(new Error("Failed to load PDF.js from CDN"));
    };
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

async function rasterizePdfFileToAssets(file: File): Promise<MergerAssetItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.pdf$/i, "");

  try {
    const pdfjsLib = await ensurePdfJsLoaded();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages || 1;
    const items: MergerAssetItem[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = Math.max(1, Math.round(viewport.width));
      rawCanvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = rawCanvas.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rawCanvas.width, rawCanvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const croppedCanvas = trimCanvas(rawCanvas);
      const dataUrl = croppedCanvas.toDataURL("image/jpeg", 0.9);
      const img = await loadImageFromDataUrl(dataUrl);
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-p${pageNum}`,
        name: numPages > 1 ? `${baseName} (P${pageNum})` : `${baseName}.pdf`,
        sourceType: "pdf-page",
        dataUrl,
        imageElement: img,
        previewElement: createProxyBitmap(img),
        naturalWidth: img.naturalWidth || croppedCanvas.width,
        naturalHeight: img.naturalHeight || croppedCanvas.height,
        caption: "",
        captionFontSize: 14,
        offsetX: 0,
        offsetY: 0,
        scale: 1.0,
      });
    }
    if (items.length > 0) return items;
  } catch {
    // Offline fallback below
  }

  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const total = Math.max(1, pages.length);
    const items: MergerAssetItem[] = [];

    for (let i = 0; i < total; i++) {
      const p = pages[i];
      const { width, height } = p ? p.getSize() : { width: 595, height: 842 };
      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = Math.round(width * 2);
      rawCanvas.height = Math.round(height * 2);
      const ctx = rawCanvas.getContext("2d");
      if (!ctx) continue;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rawCanvas.width, rawCanvas.height);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, rawCanvas.width - 48, rawCanvas.height - 48);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 42px Inter, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(file.name, rawCanvas.width / 2, rawCanvas.height / 2 - 20);

      ctx.fillStyle = "#475569";
      ctx.font = "600 30px Inter, Segoe UI, sans-serif";
      ctx.fillText(`Page ${i + 1} of ${total}`, rawCanvas.width / 2, rawCanvas.height / 2 + 35);

      const croppedCanvas = trimCanvas(rawCanvas);
      const dataUrl = croppedCanvas.toDataURL("image/jpeg", 0.9);
      const img = await loadImageFromDataUrl(dataUrl);
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-pf${i + 1}`,
        name: total > 1 ? `${baseName} (P${i + 1})` : `${baseName}.pdf`,
        sourceType: "pdf-page",
        dataUrl,
        imageElement: img,
        previewElement: createProxyBitmap(img),
        naturalWidth: croppedCanvas.width,
        naturalHeight: croppedCanvas.height,
        caption: "",
        captionFontSize: 14,
        offsetX: 0,
        offsetY: 0,
        scale: 1.0,
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fileToMergerAssets(file: File): Promise<MergerAssetItem[]> {
  if (isPdfFile(file)) {
    return rasterizePdfFileToAssets(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const img = await loadImageFromDataUrl(dataUrl);
        resolve([
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name || `pasted_${Date.now()}.png`,
            sourceType: "image",
            dataUrl,
            imageElement: img,
            previewElement: createProxyBitmap(img),
            naturalWidth: img.naturalWidth || img.width,
            naturalHeight: img.naturalHeight || img.height,
            caption: "",
            captionFontSize: 14,
            offsetX: 0,
            offsetY: 0,
            scale: 1.0,
          },
        ]);
      } catch {
        resolve([]);
      }
    };
    reader.onerror = () => resolve([]);
    reader.readAsDataURL(file);
  });
}

/**
 * Memoized Glassmorphic Select Dropdown (Isolated State + Custom SVG Chevron)
 */
interface MergerSelectProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
}

const MergerSelect = React.memo(function MergerSelectInner<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: MergerSelectProps<T>) {
  const [localVal, setLocalVal] = useState<T>(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const parsed = (typeof value === "number" ? Number(raw) : raw) as T;
    setLocalVal(parsed);
    onChange(parsed);
  };

  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 select-none">
        {label}
      </label>
      <div className="relative flex items-center bg-white/80 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 rounded-xl px-2.5 h-9 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20">
        <select
          value={localVal}
          onChange={handleChange}
          className="w-full bg-transparent focus:outline-none cursor-pointer text-slate-800 dark:text-slate-100 font-semibold text-xs appearance-none pr-5 z-10"
        >
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold py-1"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}) as <T extends string | number>(props: MergerSelectProps<T>) => React.ReactElement;

/**
 * Memoized Dropzone using pure CSS :hover and DOM ref class toggling (Zero React re-renders on hover/dragover)
 */
const MergerDropzone = React.memo(function MergerDropzone({
  onTriggerClick,
  onFilesDropped,
}: {
  onTriggerClick: () => void;
  onFilesDropped: (files: File[]) => void;
}) {
  const zoneRef = useRef<HTMLDivElement | null>(null);

  const setHighlight = (active: boolean) => {
    const el = zoneRef.current;
    if (!el) return;
    if (active) {
      el.classList.add("border-indigo-500", "bg-indigo-500/15", "shadow-indigo-500/20");
    } else {
      el.classList.remove("border-indigo-500", "bg-indigo-500/15", "shadow-indigo-500/20");
    }
  };

  return (
    <div
      ref={zoneRef}
      onDragEnter={(e) => {
        e.preventDefault();
        setHighlight(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={() => setHighlight(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHighlight(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFilesDropped(Array.from(e.dataTransfer.files));
        }
      }}
      onClick={onTriggerClick}
      className="group relative rounded-2xl border-2 border-dashed border-indigo-400/40 dark:border-indigo-500/30 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gradient-to-br from-indigo-500/[0.04] via-blue-500/[0.03] to-slate-100/50 dark:from-indigo-950/20 dark:via-blue-950/15 dark:to-slate-900/40 hover:bg-indigo-500/10 p-3.5 text-center transition-[border-color,background-color,box-shadow] duration-150 transform-gpu cursor-pointer select-none shadow-xs hover:shadow-md hover:shadow-indigo-500/10 shrink-0"
    >
      <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs pointer-events-none">
        <Layers className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
        <span className="tracking-wide">Drop or Paste (Ctrl+V) Files</span>
      </div>
    </div>
  );
});

const PAPER_OPTIONS: { value: PaperSizeOption; label: string }[] = [
  { value: "A4", label: "A4 Sheet" },
  { value: "Letter", label: "US Letter" },
  { value: "Legal", label: "US Legal" },
];

const ORIENTATION_OPTIONS: { value: OrientationOption; label: string }[] = [
  { value: "Portrait", label: "Portrait" },
  { value: "Landscape", label: "Landscape" },
];

const MARGIN_OPTIONS: { value: MarginOption; label: string }[] = [
  { value: "Normal", label: "Normal" },
  { value: "Compact", label: "Compact" },
  { value: "Wide", label: "Wide" },
  { value: "None", label: "Minimal" },
];

const GAP_OPTIONS: { value: GapOption; label: string }[] = [
  { value: "Medium", label: "Medium" },
  { value: "Small", label: "Small" },
  { value: "Large", label: "Large" },
  { value: "None", label: "None" },
];

const DPI_OPTIONS: { value: number; label: string }[] = [
  { value: 300, label: "300 DPI (Print)" },
  { value: 200, label: "200 DPI (High)" },
  { value: 150, label: "150 DPI (Standard)" },
  { value: 96, label: "96 DPI (Screen)" },
  { value: 72, label: "72 DPI (Compact)" },
];

const SIZE_CAP_OPTIONS: { value: SizeCapOption; label: string }[] = [
  { value: "150kb", label: "< 150 KB (Cloud)" },
  { value: "100kb", label: "< 100 KB (Strict)" },
  { value: "none", label: "Unrestricted" },
];

export function MultiAssetMergerModal() {
  const {
    isMergerModalOpen,
    mergerInitialFiles,
    mergerIsIntercepted,
    closeMergerModal,
    confirmMergerApply,
  } = useInventory();

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<MergerAssetItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Page Setup State
  const [paperSize, setPaperSize] = useState<PaperSizeOption>("A4");
  const [orientation, setOrientation] = useState<OrientationOption>("Portrait");
  const [marginOption, setMarginOption] = useState<MarginOption>("Normal");
  const [gapOption, setGapOption] = useState<GapOption>("Medium");
  const [showEmptyGridSlots, setShowEmptyGridSlots] = useState<boolean>(false);

  // Document Header & Footer State
  const [headerTitle, setHeaderTitle] = useState<string>("");
  const [headerFontSize, setHeaderFontSize] = useState<number>(24);
  const [footerNotes, setFooterNotes] = useState<string>("");
  const [footerFontSize, setFooterFontSize] = useState<number>(11);

  // Export & Compression State
  const [exportDpi, setExportDpi] = useState<number>(300);
  const [sizeCap, setSizeCap] = useState<SizeCapOption>("150kb");
  const [estimatedSizeKb, setEstimatedSizeKb] = useState<number | null>(null);

  // Detached Mutable Refs for 60FPS Proxy Preview Canvas
  const itemsRef = useRef<MergerAssetItem[]>([]);
  const selectedIndexRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hitRectsRef = useRef<HitRect[]>([]);
  const previewTransformRef = useRef<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Interactive Drag/Resize State on Canvas
  const dragStateRef = useRef<{
    mode: DragMode;
    activeIndex: number;
    startClientX: number;
    startClientY: number;
    origOffsetX: number;
    origOffsetY: number;
    origScale: number;
    origRect: HitRect | null;
  }>({
    mode: "None",
    activeIndex: -1,
    startClientX: 0,
    startClientY: 0,
    origOffsetX: 0,
    origOffsetY: 0,
    origScale: 1,
    origRect: null,
  });

  useEffect(() => {
    setMounted(true);
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Body and document scroll lock when modal is open
  useEffect(() => {
    if (!isMergerModalOpen) return;
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBody || 'unset';
      document.documentElement.style.overflow = originalHtml || 'unset';
    };
  }, [isMergerModalOpen]);

  // Native mobile hardware back-button listener
  useEffect(() => {
    if (!isMergerModalOpen) return;
    window.history.pushState({ modal: 'image-merger' }, '');
    const handlePopState = () => {
      closeMergerModal();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal === 'image-merger') {
        window.history.back();
      }
    };
  }, [isMergerModalOpen, closeMergerModal]);

  useEffect(() => {
    itemsRef.current = items.map((it) => ({ ...it }));
  }, [items]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const handleAddFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return;
    setIsLoadingFiles(true);
    try {
      const newlyLoaded: MergerAssetItem[] = [];
      for (const file of arr) {
        const assets = await fileToMergerAssets(file);
        newlyLoaded.push(...assets);
      }
      if (newlyLoaded.length > 0) {
        const nextItems = [...itemsRef.current, ...newlyLoaded];
        itemsRef.current = nextItems;
        setItems(nextItems);
        if (selectedIndexRef.current === -1) {
          selectedIndexRef.current = 0;
          setSelectedIndex(0);
        }
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Ingest initial files when opened via Smart Interceptor
  useEffect(() => {
    if (!isMergerModalOpen) return;

    if (mergerInitialFiles && mergerInitialFiles.length > 0) {
      let cancelled = false;
      setIsLoadingFiles(true);
      (async () => {
        const loaded: MergerAssetItem[] = [];
        for (const f of mergerInitialFiles) {
          const assets = await fileToMergerAssets(f);
          loaded.push(...assets);
        }
        if (!cancelled) {
          itemsRef.current = loaded.map((it) => ({ ...it }));
          selectedIndexRef.current = loaded.length > 0 ? 0 : -1;
          setItems(loaded);
          setSelectedIndex(loaded.length > 0 ? 0 : -1);
          setIsLoadingFiles(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      itemsRef.current = [];
      selectedIndexRef.current = -1;
      setItems([]);
      setSelectedIndex(-1);
    }
  }, [isMergerModalOpen, mergerInitialFiles]);

  // Global Paste Support inside MultiAssetMergerModal
  useEffect(() => {
    if (!isMergerModalOpen) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const pastedFiles = extractClipboardFiles(e.clipboardData);
      if (pastedFiles.length > 0) {
        e.preventDefault();
        void handleAddFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [isMergerModalOpen, handleAddFiles]);

  const selectedItem = selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null;

  /**
   * Core Document Renderer:
   * - When `isPreview === true`, draws using the lightweight `item.previewElement` proxy on the small preview canvas.
   * - When `isPreview === false` (Export only), draws using full-resolution `item.imageElement` onto the 300-DPI export canvas.
   */
  const renderDocumentToContext = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      pageW: number,
      pageH: number,
      isPreview: boolean,
      sourceItems: MergerAssetItem[] = itemsRef.current,
      activeSelIdx: number = selectedIndexRef.current
    ): HitRect[] => {
      const recordedHitRects: HitRect[] = [];

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageW, pageH);

      const margin = getMarginPx300Dpi(marginOption);
      const gap = getGapPx300Dpi(gapOption);
      const dpiScale = 300 / 72;

      let currentY = margin;
      const contentW = pageW - margin * 2;
      let bottomLimit = pageH - margin;

      // 1. Two-Line ERP Copyright Attribution at bottom of page with breathing room
      const copyFontPx = Math.round(7.5 * dpiScale);
      const lineSpacing = copyFontPx + 6;
      const copyBlockHeight = lineSpacing * 2 + 12;
      bottomLimit -= copyBlockHeight;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#64748b";
      ctx.font = `600 ${copyFontPx}px Inter, "Segoe UI", sans-serif`;
      ctx.fillText(COPYRIGHT_LINE1, pageW / 2, bottomLimit + 8, contentW);
      ctx.fillText(COPYRIGHT_LINE2, pageW / 2, bottomLimit + 8 + lineSpacing, contentW);

      // 2. Document Header Title
      if (headerTitle.trim().length > 0) {
        const hFontPx = Math.round(headerFontSize * dpiScale);
        ctx.fillStyle = "#0f172a";
        ctx.font = `bold ${hFontPx}px Inter, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(headerTitle.trim(), pageW / 2, currentY, contentW);
        currentY += hFontPx + 40;
      }

      // 3. Document Footer Notes
      if (footerNotes.trim().length > 0) {
        const fFontPx = Math.round(footerFontSize * dpiScale);
        const fHeight = fFontPx + 16;
        bottomLimit -= fHeight + 30;

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin, bottomLimit + 10);
        ctx.lineTo(pageW - margin, bottomLimit + 10);
        ctx.stroke();

        ctx.fillStyle = "#475569";
        ctx.font = `italic ${fFontPx}px Inter, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(footerNotes.trim(), pageW / 2, bottomLimit + 24, contentW);
      }

      const bodyH = bottomLimit - currentY;
      if (bodyH <= 50) {
        ctx.restore();
        return recordedHitRects;
      }

      // 4. Empty state placeholder on Preview
      if (sourceItems.length === 0) {
        if (isPreview) {
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 4;
          ctx.setLineDash([16, 12]);
          ctx.strokeRect(margin, currentY, contentW, bodyH);
          ctx.setLineDash([]);

          ctx.fillStyle = "#94a3b8";
          ctx.font = `600 ${Math.round(15 * dpiScale)}px Inter, "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "Drop or Paste (Ctrl+V) Files Here",
            pageW / 2,
            currentY + bodyH / 2
          );
        }
        ctx.restore();
        return recordedHitRects;
      }

      // 5. Balanced Grid Calculation
      const n = sourceItems.length;
      const isLandscape = contentW > bodyH;
      const { cols, rows } = computeBalancedGrid(n, isLandscape);

      const cellW = (contentW - gap * (cols - 1)) / cols;
      const cellH = (bodyH - gap * (rows - 1)) / rows;
      const totalSlots = cols * rows;

      for (let i = 0; i < totalSlots; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cellX = margin + c * (cellW + gap);
        const cellY = currentY + r * (cellH + gap);

        if (i < n) {
          const item = sourceItems[i];
          let imgAreaH = cellH;
          let capFontPx = 0;

          if (item.caption && item.caption.trim().length > 0) {
            capFontPx = Math.round((item.captionFontSize || 14) * dpiScale);
            const capHeight = capFontPx + 20;
            imgAreaH = Math.max(20, cellH - capHeight - 15);
          }

          if (item.naturalWidth > 0 && item.naturalHeight > 0) {
            const ratioX = cellW / item.naturalWidth;
            const ratioY = imgAreaH / item.naturalHeight;
            const baseRatio = Math.min(ratioX, ratioY);
            const finalRatio = baseRatio * item.scale;

            const drawW = item.naturalWidth * finalRatio;
            const drawH = item.naturalHeight * finalRatio;

            const drawX = cellX + (cellW - drawW) / 2 + item.offsetX;
            const drawY = cellY + (imgAreaH - drawH) / 2 + item.offsetY;

            // Use lightweight proxy bitmap during interactive preview, full-res bitmap during final export
            const drawable = isPreview ? item.previewElement || item.imageElement : item.imageElement;
            ctx.drawImage(drawable, drawX, drawY, drawW, drawH);

            const rect: HitRect = { index: i, x: drawX, y: drawY, w: drawW, h: drawH };
            recordedHitRects.push(rect);

            if (isPreview && i === activeSelIdx) {
              ctx.save();
              ctx.strokeStyle = "#2563eb";
              ctx.lineWidth = 6;
              ctx.setLineDash([14, 8]);
              ctx.strokeRect(drawX, drawY, drawW, drawH);
              ctx.setLineDash([]);

              const corners = [
                { cx: drawX, cy: drawY },
                { cx: drawX + drawW, cy: drawY },
                { cx: drawX, cy: drawY + drawH },
                { cx: drawX + drawW, cy: drawY + drawH },
              ];
              for (const corner of corners) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(
                  corner.cx - HANDLE_RADIUS_DOC,
                  corner.cy - HANDLE_RADIUS_DOC,
                  HANDLE_RADIUS_DOC * 2,
                  HANDLE_RADIUS_DOC * 2
                );
                ctx.strokeStyle = "#2563eb";
                ctx.lineWidth = 5;
                ctx.strokeRect(
                  corner.cx - HANDLE_RADIUS_DOC,
                  corner.cy - HANDLE_RADIUS_DOC,
                  HANDLE_RADIUS_DOC * 2,
                  HANDLE_RADIUS_DOC * 2
                );
              }
              ctx.restore();
            }
          }

          if (item.caption && item.caption.trim().length > 0) {
            ctx.fillStyle = "#1e293b";
            ctx.font = `600 ${capFontPx}px Inter, "Segoe UI", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(
              item.caption.trim(),
              cellX + cellW / 2,
              cellY + imgAreaH + 12,
              cellW
            );
          }
        } else if (showEmptyGridSlots && n > 1) {
          ctx.save();
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(cellX, cellY, cellW, cellH);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 10]);
          ctx.strokeRect(cellX, cellY, cellW, cellH);
          ctx.setLineDash([]);

          ctx.fillStyle = "#94a3b8";
          ctx.font = `600 ${Math.round(13 * dpiScale)}px Inter, "Segoe UI", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            isPreview ? "Empty Slot" : "Intentionally Left Blank",
            cellX + cellW / 2,
            cellY + cellH / 2
          );
          ctx.restore();
        }
      }

      ctx.restore();
      return recordedHitRects;
    },
    [
      marginOption,
      gapOption,
      headerTitle,
      headerFontSize,
      footerNotes,
      footerFontSize,
      showEmptyGridSlots,
    ]
  );

  // Fast Low-Res Proxy Preview Draw Function (Strictly <= 560x760 px)
  const drawCanvas = useCallback(() => {
    rafIdRef.current = null;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { pageW, pageH } = getPaperDimensions300Dpi(paperSize, orientation);
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    const pad = 16;
    const availW = Math.max(50, cw - pad * 2);
    const availH = Math.max(50, ch - pad * 2);
    const scale = Math.min(availW / pageW, availH / pageH);

    const offsetX = (cw - pageW * scale) / 2;
    const offsetY = (ch - pageH * scale) / 2;

    previewTransformRef.current = { scale, offsetX, offsetY };

    // Drop shadow behind paper sheet
    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.fillRect(offsetX + 4, offsetY + 6, pageW * scale, pageH * scale);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const rects = renderDocumentToContext(
      ctx,
      pageW,
      pageH,
      true,
      itemsRef.current,
      selectedIndexRef.current
    );
    hitRectsRef.current = rects;
    ctx.restore();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, pageW * scale, pageH * scale);
  }, [paperSize, orientation, renderDocumentToContext]);

  const scheduleDrawCanvas = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(drawCanvas);
  }, [drawCanvas]);

  useEffect(() => {
    if (!isMergerModalOpen) return;
    scheduleDrawCanvas();
  }, [isMergerModalOpen, items, selectedIndex, scheduleDrawCanvas]);

  // Idle size estimation calculation (debounced so it never causes drag lag)
  useEffect(() => {
    if (!isMergerModalOpen || items.length === 0) {
      setEstimatedSizeKb(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (sizeCap === "150kb") {
          setEstimatedSizeKb(148);
          return;
        }
        if (sizeCap === "100kb") {
          setEstimatedSizeKb(98);
          return;
        }

        const { pageW, pageH } = getPaperDimensions300Dpi(paperSize, orientation);
        const dpiRatio = exportDpi / 300.0;
        const targetW = Math.max(100, Math.round(pageW * dpiRatio));
        const targetH = Math.max(100, Math.round(pageH * dpiRatio));
        const totalPixels = targetW * targetH;

        // Approximate JPEG byte size based on asset count and DPI resolution
        const approxBytes = Math.round(totalPixels * 0.12 * Math.min(1.0, 0.4 + items.length * 0.15));
        setEstimatedSizeKb(Math.max(45, Math.round(approxBytes / 1024)));
      } catch {
        setEstimatedSizeKb(null);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isMergerModalOpen, items.length, paperSize, orientation, exportDpi, sizeCap]);

  const updateSelectedItemLive = useCallback(
    (patch: Partial<MergerAssetItem>) => {
      if (selectedIndexRef.current < 0) return;
      const curIdx = selectedIndexRef.current;
      const target = itemsRef.current[curIdx];
      if (!target) return;
      Object.assign(target, patch);
      scheduleDrawCanvas();
    },
    [scheduleDrawCanvas]
  );

  const commitSelectedItem = useCallback(() => {
    setItems(itemsRef.current.map((it) => ({ ...it })));
  }, []);

  const handleMoveItem = useCallback(
    (direction: -1 | 1) => {
      if (selectedIndex < 0) return;
      const targetIndex = selectedIndex + direction;
      if (targetIndex < 0 || targetIndex >= itemsRef.current.length) return;
      const copy = [...itemsRef.current];
      const [moved] = copy.splice(selectedIndex, 1);
      copy.splice(targetIndex, 0, moved);
      itemsRef.current = copy;
      selectedIndexRef.current = targetIndex;
      setItems(copy);
      setSelectedIndex(targetIndex);
    },
    [selectedIndex]
  );

  const handleRemoveItem = useCallback((indexToRemove: number) => {
    const next = itemsRef.current.filter((_, idx) => idx !== indexToRemove);
    itemsRef.current = next;
    const nextSel =
      next.length === 0
        ? -1
        : selectedIndexRef.current >= next.length
        ? next.length - 1
        : selectedIndexRef.current;
    selectedIndexRef.current = nextSel;
    setItems(next);
    setSelectedIndex(nextSel);
  }, []);

  const handleRotateItem = useCallback(async (indexToRotate: number) => {
    const target = itemsRef.current[indexToRotate];
    if (!target) return;
    try {
      const { dataUrl, rotatedImg, previewElement } = await rotateImageDataUrl90CW(target.imageElement);
      const next = itemsRef.current.map((it, idx) =>
        idx === indexToRotate
          ? {
              ...it,
              dataUrl,
              imageElement: rotatedImg,
              previewElement,
              naturalWidth: rotatedImg.naturalWidth || rotatedImg.width,
              naturalHeight: rotatedImg.naturalHeight || rotatedImg.height,
            }
          : it
      );
      itemsRef.current = next;
      setItems(next);
    } catch {
      // Ignore rotation error
    }
  }, []);

  const clientToDocCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { docX: 0, docY: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;
    const { scale, offsetX, offsetY } = previewTransformRef.current;
    return {
      docX: (canvasX - offsetX) / scale,
      docY: (canvasY - offsetY) / scale,
    };
  }, []);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const currentItems = itemsRef.current;
      if (currentItems.length === 0) return;
      const { docX, docY } = clientToDocCoords(e.clientX, e.clientY);
      const hitRects = hitRectsRef.current;
      const currSel = selectedIndexRef.current;

      if (currSel >= 0 && currSel < currentItems.length) {
        const selRect = hitRects.find((hr) => hr.index === currSel);
        if (selRect) {
          const hitRadius = HANDLE_RADIUS_DOC * 1.45;
          const isNear = (cx: number, cy: number) =>
            Math.abs(docX - cx) <= hitRadius && Math.abs(docY - cy) <= hitRadius;

          let resizeMode: DragMode = "None";
          if (isNear(selRect.x, selRect.y)) resizeMode = "ResizeTL";
          else if (isNear(selRect.x + selRect.w, selRect.y)) resizeMode = "ResizeTR";
          else if (isNear(selRect.x, selRect.y + selRect.h)) resizeMode = "ResizeBL";
          else if (isNear(selRect.x + selRect.w, selRect.y + selRect.h)) resizeMode = "ResizeBR";

          if (resizeMode !== "None") {
            const item = currentItems[currSel];
            dragStateRef.current = {
              mode: resizeMode,
              activeIndex: currSel,
              startClientX: e.clientX,
              startClientY: e.clientY,
              origOffsetX: item.offsetX,
              origOffsetY: item.offsetY,
              origScale: item.scale,
              origRect: { ...selRect },
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      for (let i = hitRects.length - 1; i >= 0; i--) {
        const hr = hitRects[i];
        if (docX >= hr.x && docX <= hr.x + hr.w && docY >= hr.y && docY <= hr.y + hr.h) {
          const idx = hr.index;
          selectedIndexRef.current = idx;
          const item = currentItems[idx];
          dragStateRef.current = {
            mode: "Move",
            activeIndex: idx,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origOffsetX: item.offsetX,
            origOffsetY: item.offsetY,
            origScale: item.scale,
            origRect: { ...hr },
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          scheduleDrawCanvas();
          return;
        }
      }
    },
    [clientToDocCoords, scheduleDrawCanvas]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const st = dragStateRef.current;
      const isDragging = st.mode !== "None" && st.activeIndex >= 0;
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const targetItem = itemsRef.current[st.activeIndex];
      if (!targetItem) return;

      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { scale } = previewTransformRef.current;
      if (scale <= 0) return;

      const deltaCanvasX = ((e.clientX - st.startClientX) / rect.width) * canvas.width;
      const deltaCanvasY = ((e.clientY - st.startClientY) / rect.height) * canvas.height;
      const deltaDocX = deltaCanvasX / scale;
      const deltaDocY = deltaCanvasY / scale;

      if (st.mode === "Move") {
        targetItem.offsetX = Math.max(-1200, Math.min(1200, Math.round(st.origOffsetX + deltaDocX)));
        targetItem.offsetY = Math.max(-1600, Math.min(1600, Math.round(st.origOffsetY + deltaDocY)));
        scheduleDrawCanvas();
      } else if (st.origRect && st.origRect.w > 10) {
        const dirX = st.mode === "ResizeTL" || st.mode === "ResizeBL" ? -1 : 1;
        const scaleChangeRatio = (deltaDocX * dirX) / st.origRect.w;
        let newScale = st.origScale * (1 + scaleChangeRatio);
        newScale = Math.max(0.2, Math.min(3.0, newScale));

        const actualRatio = newScale / st.origScale;
        const newW = st.origRect.w * actualRatio;
        const newH = st.origRect.h * actualRatio;
        const deltaW = newW - st.origRect.w;
        const deltaH = newH - st.origRect.h;

        const signX = st.mode === "ResizeTL" || st.mode === "ResizeBL" ? -0.5 : 0.5;
        const signY = st.mode === "ResizeTL" || st.mode === "ResizeTR" ? -0.5 : 0.5;

        targetItem.scale = Number(newScale.toFixed(2));
        targetItem.offsetX = Math.max(
          -1200,
          Math.min(1200, Math.round(st.origOffsetX + signX * deltaW))
        );
        targetItem.offsetY = Math.max(
          -1600,
          Math.min(1600, Math.round(st.origOffsetY + signY * deltaH))
        );
        scheduleDrawCanvas();
      }
    },
    [scheduleDrawCanvas]
  );

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current.mode !== "None") {
      const droppedIndex = dragStateRef.current.activeIndex;
      dragStateRef.current.mode = "None";
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
      setSelectedIndex(droppedIndex);
      setItems(itemsRef.current.map((it) => ({ ...it })));
    }
  }, []);

  /**
   * High-Resolution Export Engine — ONLY invoked on "Confirm & Apply" or "Download to PC"
   */
  const generateMergedOutput = useCallback(
    async (overrideCapKb?: number): Promise<{ dataUrl: string }> => {
      const { pageW, pageH } = getPaperDimensions300Dpi(paperSize, orientation);
      const dpiRatio = exportDpi / 300.0;
      const targetW = Math.max(100, Math.round(pageW * dpiRatio));
      const targetH = Math.max(100, Math.round(pageH * dpiRatio));

      const masterCanvas = document.createElement("canvas");
      masterCanvas.width = targetW;
      masterCanvas.height = targetH;
      const ctx = masterCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.scale(dpiRatio, dpiRatio);
      renderDocumentToContext(ctx, pageW, pageH, false, itemsRef.current, selectedIndexRef.current);

      const effectiveCapKb =
        overrideCapKb !== undefined
          ? overrideCapKb
          : sizeCap === "150kb"
          ? 150
          : sizeCap === "100kb"
          ? 100
          : 0;

      const estimateBase64Bytes = (b64: string) => {
        const commaIdx = b64.indexOf(",");
        const raw = commaIdx >= 0 ? b64.slice(commaIdx + 1) : b64;
        return Math.ceil((raw.length * 3) / 4);
      };

      if (effectiveCapKb <= 0) {
        return { dataUrl: masterCanvas.toDataURL("image/jpeg", 0.92) };
      }

      const targetMaxBytes = effectiveCapKb * 1024;
      const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];
      let bestDataUrl = "";
      let bestBytes = Infinity;

      for (const q of qualities) {
        const candidate = masterCanvas.toDataURL("image/jpeg", q);
        const bytes = estimateBase64Bytes(candidate);
        bestDataUrl = candidate;
        bestBytes = bytes;
        if (bytes <= targetMaxBytes) {
          return { dataUrl: candidate };
        }
      }

      let currentScale = Math.min(0.9, Math.sqrt((targetMaxBytes * 0.92) / bestBytes));
      for (let attempt = 0; attempt < 3; attempt++) {
        const finalW = Math.max(400, Math.round(targetW * currentScale));
        const finalH = Math.max(400, Math.round(targetH * currentScale));
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = finalW;
        scaledCanvas.height = finalH;
        const sCtx = scaledCanvas.getContext("2d");
        if (sCtx) {
          sCtx.imageSmoothingEnabled = true;
          sCtx.imageSmoothingQuality = "high";
          sCtx.drawImage(masterCanvas, 0, 0, finalW, finalH);
          for (const q of [0.72, 0.58, 0.45, 0.35]) {
            const candidate = scaledCanvas.toDataURL("image/jpeg", q);
            const bytes = estimateBase64Bytes(candidate);
            bestDataUrl = candidate;
            if (bytes <= targetMaxBytes) {
              return { dataUrl: candidate };
            }
          }
        }
        currentScale *= 0.8;
      }

      return { dataUrl: bestDataUrl };
    },
    [paperSize, orientation, exportDpi, sizeCap, renderDocumentToContext]
  );

  const handleDownloadToPc = useCallback(async () => {
    if (itemsRef.current.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const { dataUrl } = await generateMergedOutput();
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
        now.getDate()
      ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `merged_document_${stamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, generateMergedOutput]);

  const handleConfirmAndApply = useCallback(async () => {
    if (itemsRef.current.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const capKb = sizeCap === "100kb" ? 100 : 150;
      const { dataUrl } = await generateMergedOutput(capKb);
      confirmMergerApply(dataUrl);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, sizeCap, generateMergedOutput, confirmMergerApply]);

  if (!mounted || !isMergerModalOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] overflow-y-auto max-h-[100dvh] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in"
      onPointerDown={(e) => e.target === e.currentTarget && closeMergerModal()}
    >
      <div className="relative w-full max-w-[1380px] min-h-full sm:min-h-0 sm:h-[92vh] my-auto flex flex-col rounded-none sm:rounded-[2.25rem] bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-3xl border-0 sm:border border-white/40 dark:border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Responsive Un-Crushed Header */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shrink-0">
          {/* Close button pinned to top right on mobile & desktop */}
          <button
            type="button"
            onClick={closeMergerModal}
            className="absolute top-4 right-4 sm:static p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800/70 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 transition-all cursor-pointer active:scale-90 sm:order-last z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 min-w-0 pr-10 sm:pr-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 ring-1 ring-white/20">
              <Combine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                  Multi-Asset Merger
                </h2>
                {mergerIsIntercepted && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs shrink-0">
                    Intercepted
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                Precision Print & Document Composition Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files ? Array.from(e.target.files) : [];
                e.target.value = "";
                if (selected.length > 0) void handleAddFiles(selected);
              }}
            />
            <button
              type="button"
              onClick={triggerFileInput}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Files</span>
            </button>
          </div>
        </div>

        {/* Main 3-Column Studio Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 lg:overflow-hidden">
          {/* Left Column: Asset Queue & Selected Item Scale/Caption */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl flex flex-col min-h-0 p-4 space-y-3.5 overflow-hidden">
            <MergerDropzone onTriggerClick={triggerFileInput} onFilesDropped={handleAddFiles} />

            {/* Loaded Assets List - Naturally expands to fill vertical space */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex items-center justify-between shrink-0 px-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assets ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      itemsRef.current = [];
                      selectedIndexRef.current = -1;
                      setItems([]);
                      setSelectedIndex(-1);
                    }}
                    className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:underline cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {isLoadingFiles && (
                <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20 shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading assets...</span>
                </div>
              )}

              {items.length === 0 && !isLoadingFiles ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-slate-200/90 dark:border-slate-800/80 bg-gradient-to-b from-white/40 to-slate-100/30 dark:from-slate-900/30 dark:to-slate-950/20 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 mb-2 shadow-inner">
                    <ImageIcon className="w-6 h-6 opacity-60" />
                  </div>
                  <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Queue is empty</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px]">Drop receipts, slips or PDF pages here to merge</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 space-y-2 pr-1">
                  {items.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          selectedIndexRef.current = idx;
                          setSelectedIndex(idx);
                        }}
                        className={`group relative flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border text-xs transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-transparent border-indigo-500/60 text-indigo-950 dark:text-white shadow-sm ring-1 ring-indigo-500/30"
                            : "bg-white/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white/90 dark:hover:bg-slate-900/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300/60 dark:border-slate-700 shadow-2xs">
                            <img
                              src={item.dataUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold truncate text-[11px] leading-tight text-slate-800 dark:text-slate-100">
                              {item.name}
                            </div>
                            <div className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span>#{idx + 1}</span>
                              <span>•</span>
                              <span>{Math.round(item.scale * 100)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRotateItem(idx);
                            }}
                            className="p-1.5 rounded-xl hover:bg-indigo-500/15 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Rotate 90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(idx);
                            }}
                            className="p-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Asset Primary Controls */}
            {selectedItem && (
              <div className="rounded-2xl border border-indigo-500/30 dark:border-indigo-500/25 bg-gradient-to-b from-indigo-500/[0.06] to-transparent dark:from-indigo-950/20 p-3.5 space-y-3 text-xs shrink-0 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Selected Asset #{selectedIndex + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                    {Math.round(selectedItem.scale * 100)}%
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-indigo-500" /> Scale Size
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    value={Math.round(selectedItem.scale * 100)}
                    onChange={(e) => updateSelectedItemLive({ scale: Number(e.target.value) / 100 })}
                    onPointerUp={commitSelectedItem}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={selectedItem.caption}
                    onChange={(e) => updateSelectedItemLive({ caption: e.target.value })}
                    onBlur={commitSelectedItem}
                    placeholder="Asset caption / label (optional)..."
                    className="w-full px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Center Column: Premium "God View" Canvas Container */}
          <div className="lg:col-span-6 bg-gradient-to-b from-slate-200/50 via-slate-200/80 to-slate-300/60 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 flex flex-col min-h-[360px] lg:min-h-0 relative items-center justify-center p-1 sm:p-4 overflow-hidden shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_20px_rgba(0,0,0,0.6)] touch-pan-y">
            {/* Subtle God-View Radial Glow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/[0.08] via-transparent to-transparent" />
            <canvas
              ref={previewCanvasRef}
              width={CANVAS_MAX_WIDTH}
              height={CANVAS_MAX_HEIGHT}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className="relative max-w-full max-h-full w-auto h-auto object-contain rounded-2xl cursor-grab active:cursor-grabbing select-none touch-pan-y shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] ring-1 ring-slate-900/5 dark:ring-white/10"
            />
          </div>

          {/* Right Column: Clean Layout Setup, Single Advanced Options Accordion & Dual Save Actions */}
          <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xl flex flex-col min-h-0 p-4 space-y-3.5">
            {/* Core Page Setup */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Sheet Setup</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <MergerSelect
                  label="Paper Size"
                  value={paperSize}
                  options={PAPER_OPTIONS}
                  onChange={setPaperSize}
                />
                <MergerSelect
                  label="Orientation"
                  value={orientation}
                  options={ORIENTATION_OPTIONS}
                  onChange={setOrientation}
                />
              </div>
            </div>

            {/* Single Expandable "Advanced Options" Accordion */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  Advanced Options
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    showAdvanced ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showAdvanced && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <MergerSelect
                      label="Margins"
                      value={marginOption}
                      options={MARGIN_OPTIONS}
                      onChange={setMarginOption}
                    />
                    <MergerSelect
                      label="Grid Gap"
                      value={gapOption}
                      options={GAP_OPTIONS}
                      onChange={setGapOption}
                    />
                    <MergerSelect
                      label="Export DPI"
                      value={exportDpi}
                      options={DPI_OPTIONS}
                      onChange={setExportDpi}
                    />
                    <MergerSelect
                      label="Size Cap"
                      value={sizeCap}
                      options={SIZE_CAP_OPTIONS}
                      onChange={setSizeCap}
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      placeholder="Document Header Title..."
                      className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                    <input
                      type="text"
                      value={footerNotes}
                      onChange={(e) => setFooterNotes(e.target.value)}
                      placeholder="Footer Notes..."
                      className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>

                  {selectedItem && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Pan X</span>
                          <span className="font-mono">{selectedItem.offsetX}</span>
                        </div>
                        <input
                          type="range"
                          min={-1200}
                          max={1200}
                          value={selectedItem.offsetX}
                          onChange={(e) => updateSelectedItemLive({ offsetX: Number(e.target.value) })}
                          onPointerUp={commitSelectedItem}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Pan Y</span>
                          <span className="font-mono">{selectedItem.offsetY}</span>
                        </div>
                        <input
                          type="range"
                          min={-1600}
                          max={1600}
                          value={selectedItem.offsetY}
                          onChange={(e) => updateSelectedItemLive({ offsetY: Number(e.target.value) })}
                          onPointerUp={commitSelectedItem}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showEmptyGridSlots}
                      onChange={(e) => setShowEmptyGridSlots(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Show empty grid slot placeholders</span>
                  </label>
                </div>
              )}
            </div>

            {/* Live Output File Size Badge & Dual Save Actions */}
            <div className="mt-auto pt-3 space-y-3">
              {/* Prominent High-Contrast Glassmorphic Output File Size Badge */}
              <div className="relative overflow-hidden rounded-2xl p-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/40 border border-emerald-500/40 dark:border-emerald-500/30 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.25)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0 ring-1 ring-white/30">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Estimated Output Size
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {sizeCap === "none" ? "Unrestricted Quality" : `Capped under ${sizeCap.toUpperCase()}`}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-mono font-black text-sm tracking-tight shadow-inner">
                    {estimatedSizeKb !== null ? `${estimatedSizeKb} KB` : "—"}
                  </div>
                </div>
              </div>

              {mergerIsIntercepted && (
                <button
                  type="button"
                  disabled={items.length === 0 || isExporting}
                  onClick={handleConfirmAndApply}
                  className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirm & Apply</span>
                </button>
              )}

              <button
                type="button"
                disabled={items.length === 0 || isExporting}
                onClick={handleDownloadToPc}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 active:scale-98 ${
                  mergerIsIntercepted
                    ? "bg-slate-200/80 dark:bg-slate-800/90 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700/80 shadow-xs"
                    : "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/25"
                }`}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download to PC</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MultiAssetMergerModal;
