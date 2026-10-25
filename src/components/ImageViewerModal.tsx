"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X, Move } from "lucide-react";
import { useInventory } from "../context/InventoryContext";

interface ImageViewerModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  const { t } = useInventory();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when image changes or closes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 6));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const didMoveRef = useRef(false);

  // Drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    didMoveRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    didMoveRef.current = true;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleContainerClick = () => {
    if (!didMoveRef.current) {
      onClose();
    }
  };

  // Touch support for mobile phones
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      didMoveRef.current = false;
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    didMoveRef.current = true;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!imageUrl) return null;

  return (
    <div
      onClick={handleContainerClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none"
    >
      {/* Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent text-white"
      >
        <div>
          <h3 className="font-bold text-sm tracking-wide">{title || t.image}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Move className="w-3.5 h-3.5" />
            <span>{t.dragToPan}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          title={t.close}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Zoom / Pan Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full flex items-center justify-center overflow-hidden ${
          zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title || "Order attachment"}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            maxHeight: "85vh",
            maxWidth: "90vw",
            imageRendering: "auto",
          }}
          className="object-contain shadow-2xl rounded-lg pointer-events-none"
        />
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl text-white backdrop-blur-md"
      >
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
          title={t.zoomOut}
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <span className="font-mono text-xs font-bold px-2 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-2 rounded-xl hover:bg-slate-800 active:scale-95 transition-all"
          title={t.zoomIn}
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <div className="h-5 w-px bg-slate-700 mx-1"></div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 active:scale-95 transition-all text-slate-300"
          title={t.resetZoom}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.resetZoom}</span>
        </button>
      </div>
    </div>
  );
};
