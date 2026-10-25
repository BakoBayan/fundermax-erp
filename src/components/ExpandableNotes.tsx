"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, StickyNote } from "lucide-react";

interface ExpandableNotesProps {
  notes?: string;
  className?: string;
  maxCollapsedLines?: number;
  variant?: "inline" | "block";
}

export const ExpandableNotes: React.FC<ExpandableNotesProps> = ({
  notes,
  className = "",
  maxCollapsedLines = 1,
  variant = "inline",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!notes || !notes.trim()) {
    if (variant === "block") {
      return null;
    }
    return <span className="text-slate-300 dark:text-slate-600 italic text-xs select-none">—</span>;
  }

  const trimmed = notes.trim();

  // Block variant
  if (variant === "block") {
    const isVeryLong = trimmed.length > 140 || trimmed.split("\n").length > 3;

    return (
      <div className={`w-full bg-slate-50 dark:bg-slate-750/70 rounded-xl p-3 border border-slate-200/90 dark:border-slate-700/80 text-start space-y-1.5 shadow-2xs ${className}`}>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-bold text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <StickyNote className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wider text-[11px] font-bold">Notes</span>
          </div>
          {isVeryLong && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{isExpanded ? "Show less" : "Show more"}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        <div
          className={`text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text transition-all ${
            !isExpanded && isVeryLong ? "line-clamp-3 overflow-hidden" : ""
          }`}
        >
          {trimmed}
        </div>
      </div>
    );
  }

  // Inline variant
  const isLong = trimmed.length > 35 || trimmed.includes("\n");

  if (!isLong) {
    return (
      <span className={`text-xs text-slate-600 dark:text-slate-300 ${className}`}>
        {trimmed}
      </span>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={`group relative text-start transition-all cursor-pointer ${className}`}
      title={isExpanded ? "Click to collapse notes" : "Click to expand & scroll notes"}
    >
      {!isExpanded ? (
        <div className="flex items-center justify-center gap-1.5 py-0.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-700/80 transition-colors">
          <FileText className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          <span
            className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[140px] sm:max-w-[180px]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: maxCollapsedLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {trimmed}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0 group-hover:translate-y-0.5 transition-transform" />
        </div>
      ) : (
        <div
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-500/50 shadow-md min-w-[200px] max-w-[320px] text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Notes</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              <span>Close</span>
            </button>
          </div>

          {/* Vertically scrollable notes body */}
          <div className="max-h-36 overflow-y-auto text-slate-700 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap pe-1 custom-scrollbar select-text text-xs">
            {trimmed}
          </div>
        </div>
      )}
    </div>
  );
};
