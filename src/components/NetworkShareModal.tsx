"use client";

import React, { useState, useEffect } from "react";
import { useInventory } from "../context/InventoryContext";
import { X, Copy, Check, Wifi, Smartphone } from "lucide-react";

interface NetworkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkShareModal: React.FC<NetworkShareModalProps> = ({ isOpen, onClose }) => {
  const { t } = useInventory();
  const [networkUrl, setNetworkUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/network-info")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.networkUrl) {
          setNetworkUrl(data.networkUrl);
        } else if (typeof window !== "undefined") {
          setNetworkUrl(window.location.origin);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          setNetworkUrl(window.location.origin);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (networkUrl && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(networkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // QR code image URL
  const qrCodeUrl = networkUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        networkUrl
      )}&color=065f46&bgcolor=ffffff`
    : "";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-emerald-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-base sm:text-lg">{t.connectPhone}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-100 hover:text-white rounded-xl hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 text-center space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            {t.scanQrNote}
          </p>

          {/* QR Code Container */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 inline-block mx-auto shadow-inner">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="Connect Mobile QR Code"
                className="w-48 h-48 rounded-xl object-contain mx-auto shadow-xs bg-white p-2"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                <Smartphone className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Network URL Pill & Copy Button */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.networkLink}
            </label>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-2xl border border-slate-300 dark:border-slate-700">
              <span className="flex-1 font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate select-all px-2 text-left">
                {networkUrl || "Loading..."}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.copyLink}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tip Note */}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-xl text-xs text-sky-800 dark:text-sky-300 font-medium">
            💡 {t.sameWifiTip}
          </div>
        </div>
      </div>
    </div>
  );
};
