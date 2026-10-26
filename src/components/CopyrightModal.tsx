'use client';

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Phone,
  Copy,
  Check,
  X
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
        {/* Close Button Top Right/Left */}
        <button
          type="button"
          onClick={closeCopyrightModal}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-20 cursor-pointer"
          title={isKu ? 'داخستن' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-8 overflow-y-auto">
          {isKu ? (
            <div className="space-y-6 text-right" dir="rtl">
              {/* Header Section */}
              <div className="text-center space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  مافی خاوەندارێتی و زانیاری گەشەپێدەر
                </h2>
                <p className="text-sm text-slate-500 font-mono">v{APP_VERSION_NUMBER}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  بەڵگەنامەی فەرمی پاراستنی مافی فیکری نەرمەکاڵا و پەیوەندیکردن بە گەشەپێدەر
                </p>
              </div>

              {/* English Legal Boilerplate */}
              <div
                className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-center font-mono text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 leading-relaxed"
                dir="ltr"
              >
                <strong className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Legal Notice &amp; Copyright
                </strong>
                Universal Copyright Convention &amp; Berne Compliant<br />
                © 2026 Bako Bayan Madhhar. All Rights Reserved.<br />
                Software: Bako&apos;s Master System™ (Version {APP_VERSION_NUMBER}) • Author &amp; Architect: Bako Bayan Madhhar
              </div>

              {/* Intro */}
              <div className="text-base text-slate-700 dark:text-slate-300 font-medium leading-loose text-center bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                ئەم سیستەمە بە تایبەتی بۆ کۆمپانیای شاسوار ئەحمەد شاسوار دروستکراوە لەلایەن باکۆ بەیان مەزهەرەوە.
              </div>

              {/* Legal Terms - Bullet Points */}
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-loose">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0"></div>
                  <p>
                    <strong>مافی خاوەندارێتی:</strong> تەواوی کۆدەکانی ئەم سیستەمە، پێکهاتەی داتابەیسەکەی، شێوازی کارکردن و دیزاینەکەی موڵکی تایبەتی و یاسایی گەشەپێدەر (باکۆ بەیان مەزهەر)ـن، و بەپێی پەیماننامەی نێودەوڵەتی بێرن مافەکانی پارێزراون.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-500 shrink-0"></div>
                  <p>
                    <strong>قەدەغەکردنی بەکارهێنانی بێ مۆڵەت:</strong> هیچ کەس و لایەنێک بۆی نییە بەبێ ڕەزامەندی نووسراوی باکۆ بەیان، ئەم سیستەمە یان هەر بەشێکی کۆپی بکات، بفرۆشێتەوە، دەستکاری کۆدەکانی بکات یان لە پڕۆژەیەکی تردا بەکاری بهێنێت.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500 shrink-0"></div>
                  <p>
                    <strong>مۆڵەتی بەکارهێنان:</strong> ئەم وەشانەی سیستەمەکە بەپێی ڕێکەوتنێکی تایبەت تەنها مۆڵەتی کارپێکردنی پێدراوە بۆ بەڕێوەبردنی کارگە و کۆگاکانی کۆمپانیای شاسوار ئەحمەد شاسوار، و مافی فرۆشتنەوەی نییە.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Advertisement Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center mb-4">
                  پێویستت بە سیستەمێکی تایبەتە بۆ کار و بازرگانییەکەت؟
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-loose text-justify">
                  باکۆ بەیان خاوەنی شارەزاییەکی قووڵ و ئەزموونێکی ئاست بەرزە لە ئەندازیاریی و دروستکردنی نەرمەکاڵای پێشکەوتوو بۆ بەڕێوەبردنی کار و بازرگانی بە بەرزترین کوالێتی، لەوانە:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 leading-loose space-y-1 pr-2">
                  <li>سیستەمی کۆگا و بەڕێوەبردنی کارگە.</li>
                  <li>بەرنامەی فرۆشتن، پسوولە و بەدواداچوونی قەرز (POS).</li>
                  <li>سیستەمی داتابەیسی خێرا و ئۆفلاین بۆ کاتی نەبوونی ئینتەرنێت.</li>
                  <li>نەرمەکاڵای تایبەت بەپێی ویست و داواکاریی کڕیار.</li>
                </ul>
              </div>

              {/* Contact Buttons */}
              <div className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Direct Call Button */}
                  <a
                    href="tel:07705488654"
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>پەیوەندی تەلەفۆنی</span>
                  </a>

                  {/* WhatsApp Direct */}
                  <a
                    href="https://wa.me/9647705488654?text=Hello%20Bako,%20I%20am%20interested%20in%20custom%20software%20development%20and%20system%20engineering."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                    </svg>
                    <span>نامەی واتسئەپ</span>
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
                          ژمارە کۆپی کرا!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>کۆپیکردنی ژمارە</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-left" dir="ltr">
              {/* Header Section */}
              <div className="text-center space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Legal Notice &amp; Copyright
                </h2>
                <p className="text-sm text-slate-500 font-mono">v{APP_VERSION_NUMBER}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Official software copyright documentation &amp; direct inquiry with Bako Bayan
                </p>
              </div>

              {/* English Legal Boilerplate */}
              <div
                className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-center font-mono text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 leading-relaxed"
                dir="ltr"
              >
                <strong className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                  Legal Notice &amp; Copyright
                </strong>
                Universal Copyright Convention &amp; Berne Compliant<br />
                © 2026 Bako Bayan Madhhar. All Rights Reserved.<br />
                Software: Bako&apos;s Master System™ (Version {APP_VERSION_NUMBER}) • Author &amp; Architect: Bako Bayan Madhhar
              </div>

              {/* Intro */}
              <div className="text-base text-slate-700 dark:text-slate-300 font-medium leading-loose text-center bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                This system was custom-engineered specifically for Shaswar Ahmad Shaswar Co. by Bako Bayan Madhhar.
              </div>

              {/* Legal Terms - Bullet Points */}
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-loose">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0"></div>
                  <p>
                    <strong>Exclusive Authorship &amp; Ownership:</strong> All source code, database architecture, algorithms, and UI design are the exclusive legal property of Bako Bayan Madhhar, protected under the international Berne Convention.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-red-500 shrink-0"></div>
                  <p>
                    <strong>Prohibition of Unauthorized Use:</strong> No individual or entity may copy, resell, modify, or incorporate this system or any portion thereof into other projects without written consent from Bako Bayan.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500 shrink-0"></div>
                  <p>
                    <strong>Operational License:</strong> This instance is licensed strictly for enterprise workshop and warehouse operations for Shaswar Co., with all distribution rights reserved.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Advertisement Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center mb-4">
                  Need a Custom Software System for Your Business?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-loose text-justify">
                  Bako Bayan brings extensive expertise in engineering mission-critical business management software of the highest quality, including:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 leading-loose space-y-1 pl-2">
                  <li>Warehouse and factory management systems.</li>
                  <li>Point of Sale (POS), invoicing, and debt-tracking platforms.</li>
                  <li>High-speed, offline-first local database architectures.</li>
                  <li>Custom tailored software designed to exact client specifications.</li>
                </ul>
              </div>

              {/* Contact Buttons */}
              <div className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Direct Call Button */}
                  <a
                    href="tel:07705488654"
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Phone Call</span>
                  </a>

                  {/* WhatsApp Direct */}
                  <a
                    href="https://wa.me/9647705488654?text=Hello%20Bako,%20I%20am%20interested%20in%20custom%20software%20development%20and%20system%20engineering."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                    </svg>
                    <span>WhatsApp Message</span>
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
                          Number Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy Number</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
