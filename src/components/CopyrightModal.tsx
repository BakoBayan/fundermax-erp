'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Phone,
  Copy,
  Check,
  X,
  FileText,
  Lock,
  Layers,
  CheckCircle2,
  ExternalLink,
  Code2,
  HardDrive
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const CopyrightModal: React.FC = () => {
  const { isCopyrightOpen, closeCopyrightModal, language } = useInventory();
  const isKu = language === 'ku';

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCopyrightOpen) {
        closeCopyrightModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCopyrightOpen, closeCopyrightModal]);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText('07705488654');
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (!isCopyrightOpen || !mounted) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={closeCopyrightModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {isKu
                    ? 'خاوەندارێتی فیکری، مافی یاسایی و دروستکردنی پڕۆژە'
                    : 'Copyright, Intellectual Property & Project Commissioning'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKu
                  ? 'بەڵگەنامەی فەرمی پاراستنی مافی نەرمەکاڵا و پەیوەندی بە باکۆ بەیان'
                  : 'Official software copyright notice & custom project inquiry portal'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCopyrightModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isKu ? 'داخستن' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">

          {/* 1. Official Legal Copyright Notice Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {isKu ? 'ئاگاداری یاسایی فەرمی (Legal Notice)' : 'Statutory Copyright Notice'}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                Universal Copyright Convention & Berne Compliant
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 shadow-inner">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                © 2026 Bako Bayan Madhhar. All Rights Reserved.
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Software: Bako&apos;s Master System™ (Version {APP_VERSION_NUMBER}) • Author & Architect: Bako Bayan Madhhar
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-sans font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isKu
                    ? 'ئەندازیاری کراوە لەلایەن باکۆ بەیان مەزهەر تایبەت بۆ کۆمپانیای شەسواری ئەحمەد شەسوار'
                    : 'Engineered by Bako Bayan Madhhar specifically for Shaswar Ahmad Shaswar Co.'}
                </span>
              </div>
            </div>

            {/* Legal Tenets */}
            <div className="space-y-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{isKu ? 'خاوەندارێتی و دانەری یاسایی: ' : 'Exclusive Authorship & Ownership: '}</strong>
                  {isKu
                    ? 'هەموو تەلارسازی نەرمەکاڵاکە، کۆدی سەرچاوە، شێوازی داتابەیس، ئەلگۆریتمەکانی ژمێریاری، و دیزاینی بینراو موڵکی تایبەتی و یاسایی ئەندازیار باکۆ بەیان مەزهەرن بەپێی پەیماننامەی نێودەوڵەتی بێرن (Berne Convention) و یاساکانی پاراستنی مافی فیکری.'
                    : 'The software architecture, compiled binary structures, custom database schemas, multi-currency algorithmic calculation engines, and proprietary user interface design are the sole intellectual property of Bako Bayan Madhhar under international copyright conventions and domestic intellectual property statutes.'}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{isKu ? 'قەدەغەکردنی دەستکاری و بەکارهێنانی بێ مۆڵەت: ' : 'Prohibition of Unauthorized Reproduction: '}</strong>
                  {isKu
                    ? 'هیچ لایەنێک بۆی نییە بەبێ ڕەزامەندی و مۆڵەتی نووسراوی باکۆ بەیان، ئەم سیستەمە یان هەر بەشێکی لێی کۆپی بکات، بفرۆشێتەوە، دیبەگ یان ئەندازیاری پێچەوانەی بۆ بکات، یان لە پڕۆژەی تردا بەکاری بهێنێت.'
                    : 'No portion of this software system may be reproduced, decompiled, reverse-engineered, sublicensed, redistributed, altered, or incorporated into other software products without the express, prior written authorization of the copyright owner.'}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <p>
                  <strong>{isKu ? 'مۆڵەتی بەکارهێنانی کارگێڕی: ' : 'Licensed Enterprise Operation: '}</strong>
                  {isKu
                    ? 'ئەم نوسخەیە تەنها بۆ بەڕێوەبردنی کارگەی تەختە و مەخزەن بەپێی ڕێککەوتنی تایبەت مۆڵەتی پێدراوە و خاوەندارێتی تەواوی کۆدەکە پارێزراوە بۆ دانەرەکەی.'
                    : 'This instance is deployed strictly under authorized operational licensure for enterprise workshop management, maintaining full reservation of moral and proprietary economic rights by the architect.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Custom Project Commissioning Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/60 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isKu
                  ? 'دەتەوێت سیستەمێکی تایبەت بۆ کار یان بازرگانییەکەت دروست بکرێت؟'
                  : 'Commission a Custom Software Project for Your Business'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              {isKu
                ? 'ئەندازیار باکۆ بەیان خاوەنی ئەزموونی بەرزە لە دروستکردنی سیستەمی کۆگا و کارگە، بەرنامەی فرۆشتن و ژمێریاری (POS)، سیستەمی داتابەیسی خێرا و ئۆفلاین (Local WAL)، و پڕۆگرامی تایبەت بۆ هەموو جۆرە بازرگانییەک بە بەرزترین کوالیتی.'
                : 'Bako Bayan Madhhar designs, engineers, and delivers custom mission-critical software solutions tailored specifically to client workflows: industrial warehouse systems, multi-currency POS invoicing, offline-first architectures, and high-performance business applications.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{isKu ? 'سیستەمی کۆگا و کۆنتڕۆڵی تەختە' : 'Industrial Warehouse & Inventory'}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>{isKu ? 'فرۆشتن، پسوولە و قەرز (POS)' : 'Multi-Currency POS & Invoicing'}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <HardDrive className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span>{isKu ? 'داتابەیسی ناوخۆیی و ئۆفلاین (WAL)' : 'Offline-First SQLite WAL Sync'}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <Code2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{isKu ? 'بەرنامەی پێشکەوتوو بە ویستی تۆ' : 'Custom Tailored Architecture'}</span>
              </div>
            </div>
          </div>

          {/* 3. Direct Contact & Action Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>{isKu ? 'ڕێگاکانی پەیوەندی ڕاستەوخۆ بە دانەر:' : 'Official Direct Contact & Project Inquiries:'}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">Bako Bayan Madhhar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Direct Call Button */}
              <a
                href="tel:07705488654"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>{isKu ? 'پەیوەندی بکە (تەلەفۆن)' : 'Call 07705488654'}</span>
              </a>

              {/* WhatsApp Direct */}
              <a
                href="https://wa.me/9647705488654?text=Hello%20Bako,%20I%20am%20interested%20in%20custom%20software%20development%20and%20system%20engineering."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
              >
                {/* Clean WhatsApp SVG */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                </svg>
                <span>{isKu ? 'نامە لە واتسئەپ' : 'WhatsApp Chat'}</span>
              </a>

              {/* Copy Phone Number */}
              <button
                type="button"
                onClick={handleCopyPhone}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 active:scale-98 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                      {isKu ? 'ژمارە کۆپی کرا!' : 'Number Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{isKu ? 'کۆپیکردنی ژمارە' : 'Copy 07705488654'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">
              {isKu
                ? 'پارێزراوە لەلایەن باکۆ بەیان • هەموو مافەکان پارێزراون'
                : 'Engineered & Maintained by Bako Bayan Madhhar • 2026'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeCopyrightModal}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer"
          >
            {isKu ? 'داخستن' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CopyrightModal;
