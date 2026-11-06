'use client';

import React from 'react';
import { Phone, Mail } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const FooterAttribution: React.FC = () => {
  const { language, openCopyrightModal } = useInventory();
  const isKu = language === 'ku';

  return (
    <footer className="w-full max-w-4xl mx-auto mt-6 mb-6 min-h-[3.5rem] h-auto py-3 md:py-0 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-2xl md:rounded-full select-none no-print transition-all shrink-0">
      {/* Left: Strictly Clean Copyright Text (Fully rendered on mobile and desktop) */}
      <div className="flex items-center justify-center md:justify-start min-w-0 text-center md:text-start">
        <span
          onClick={openCopyrightModal}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors duration-200 cursor-pointer text-[11px] sm:text-xs md:text-sm font-medium"
          title={isKu ? 'کلیک بکە بۆ زانیاری مافی یاسایی و داواکردنی پڕۆژە لە باکۆ بەیان مەزهەر' : 'Click for Legal Copyright & Project Commissioning'}
        >
          {isKu
            ? `© ${new Date().getFullYear()} باکۆ بەیان مەزهەر. هەموو مافەکان پارێزراون.`
            : `© ${new Date().getFullYear()} Bako Bayan Madhhar. All rights reserved.`}
        </span>
      </div>

      {/* Right: Sleek Interactive Contact with Subtle Icon Hover Glows & Mobile Overflow Protection */}
      <div className="w-full md:w-auto flex flex-wrap items-center justify-center md:justify-end gap-2.5 sm:gap-3.5 text-xs sm:text-sm shrink-0">
        <a
          href="tel:07705488654"
          className="group inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium cursor-pointer"
          title="Call Bako Bayan Madhhar"
        >
          <div className="p-1 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-all duration-200">
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <span className="font-mono font-medium text-[11px] sm:text-xs md:text-sm">07705488654</span>
        </a>
        <span className="text-slate-300 dark:text-slate-700 text-xs sm:text-sm hidden sm:inline">&bull;</span>
        <a
          href="mailto:bakobayan.official@gmail.com"
          className="group inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium cursor-pointer"
          title="Email Bako Bayan Madhhar"
        >
          <div className="p-1 rounded-full text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/10 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(14,165,233,0.35)] transition-all duration-200">
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <span className="font-mono lowercase font-medium text-[11px] sm:text-xs md:text-sm truncate max-w-[200px] sm:max-w-none">bakobayan.official@gmail.com</span>
        </a>
      </div>
    </footer>
  );
};

export default FooterAttribution;
