'use client';

import React from 'react';
import { Phone, ShieldCheck, HardDrive } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const FooterAttribution: React.FC = () => {
  const { language, openCopyrightModal } = useInventory();
  const isKu = language === 'ku';

  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 w-full py-2 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] select-none no-print transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left: Professional & Legally Sound Copyright Attribution (Clickable) */}
        <button
          type="button"
          onClick={openCopyrightModal}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-300 flex-wrap justify-center sm:justify-start hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer group text-left py-0.5 px-1.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
          title={isKu ? 'کلیک بکە بۆ زانیاری مافی یاسایی و داواکردنی پڕۆژە لە باکۆ بەیان' : 'Click for Legal Copyright, Intellectual Property & Project Commissioning'}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {isKu
              ? 'ئەندازیاری و چاودێریکراوە لەلایەن باکۆ بەیان مەزهەر'
              : 'Engineered & Maintained by Bako Bayan Madhhar'}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
            © 2026 Bako Bayan Madhhar. All rights reserved.
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-all shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{isKu ? 'مافەکان و پڕۆژەکان' : 'Legal & Custom Projects'}</span>
          </span>
        </button>

        {/* Right: Prominent Phone Contact Badge & System Engine Indicator */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
          {/* Direct Phone Call Button */}
          <a
            href="tel:07705488654"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80 hover:border-emerald-400 transition-all shadow-2xs group cursor-pointer active:scale-95"
            title="Call Bako Bayan Madhhar directly: 07705488654"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold">
              {isKu ? 'پەیوەندی ڕاستەوخۆ:' : 'Official Contact:'}
            </span>
            <span className="font-mono font-black text-xs text-emerald-900 dark:text-emerald-200 tracking-wider">
              07705488654
            </span>
          </a>

          {/* SQLite WAL Reliability Badge */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
            <HardDrive className="w-3 h-3 text-emerald-500" />
            <span className="font-mono font-semibold">SQLite WAL Synced</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default FooterAttribution;
