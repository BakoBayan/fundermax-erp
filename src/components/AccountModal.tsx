"use client";

import React, { useState } from "react";
import { Shield, User, Lock, X, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useInventory } from "../context/InventoryContext";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onOpenAdminPanel }) => {
  const { currentUser, login, logout, language, isAdmin, userPermissions } = useInventory();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const success = login(username.trim(), password.trim());
    if (success) {
      setSuccessMsg(language === "ku" ? "بە سەرکەوتوویی چووە ژوورەوە!" : "Successfully signed in!");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setUsername("");
        setPassword("");
      }, 700);
    } else {
      setErrorMsg(
        language === "ku"
          ? "ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە!"
          : "Invalid username or password. Please try again."
      );
    }
  };

  const handleLogout = () => {
    logout();
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-750 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-850 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                {language === "ku" ? "ئەکاونتی سیستەم" : "System Account"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {language === "ku" ? "بەڕێوەبردنی ئەکاونتی بەکارهێنەر" : "Active session & authentication"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Signed In Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm text-sm">
                {currentUser?.displayName?.[0] || "U"}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {language === "ku" ? "ئەکاونتی چالاک" : "Signed in as"}
                </div>
                <div className="font-black text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                  <span>{currentUser?.displayName || "Guest"}</span>
                  {currentUser?.isAuthenticated && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                  <span>Role:</span>
                  <span className={`font-semibold ${
                    currentUser?.role === "Viewer"
                      ? "text-purple-600 dark:text-purple-400 font-bold"
                      : currentUser?.role === "Owner"
                      ? "text-amber-600 dark:text-amber-400 font-bold"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {currentUser?.role === "Viewer"
                      ? (language === "ku" ? "تەنها بینەر (سەیرکردن)" : "Viewer (Read-Only)")
                      : currentUser?.role === "Owner"
                      ? (language === "ku" ? "👑 خاوەن کار (Owner)" : "👑 Owner")
                      : (currentUser?.role || "Visitor")}
                  </span>
                </div>
              </div>
            </div>

            {currentUser?.isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title={language === "ku" ? "دەرچوون" : "Sign Out"}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Executive Owner Notice Banner */}
          {currentUser?.role === "Owner" && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-850 dark:text-amber-300 font-medium flex items-center gap-2">
              <span className="text-base shrink-0">👑</span>
              <div>
                <span className="font-bold">{language === "ku" ? "خاوەن کار • بینینی باڵا" : "Executive Owner Oversight"}</span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  {language === "ku"
                    ? "دەسەڵاتی بینینی تەواوی ئامار و قازانج بەبێ دەستکاریکردنی ئۆپەراسیۆنە مەیدانییەکان."
                    : "Full executive oversight over profits, sales, and warehouse with accidental edit protection."}
                </p>
              </div>
            </div>
          )}

          {/* Viewer Read-Only Notice Banner */}
          {currentUser?.role === "Viewer" && (
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300 font-medium">
              {language === "ku"
                ? "ئەم ئەکاونتە تەنها دەسەڵاتی سەیرکردن، گەڕان و چاپکردنی هەیە. ناتوانێت هیچ بەشێک یان داتایەک بگۆڕێت یان بسڕێتەوە."
                : "This account has Read-Only access. You can explore inventory, search, and print slips, but cannot modify or delete data."}
            </div>
          )}

          {/* Prominent Log Out Button */}
          {currentUser?.isAuthenticated && (
            <button
              onClick={() => {
                handleLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-900/80 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs active:scale-98 transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{language === "ku" ? "دەرچوون لە ئەکاونت" : "Log Out / Sign Out"}</span>
            </button>
          )}

          {/* Admin Panel button if current user is Admin with canAccessAdmin clearance */}
          {isAdmin && userPermissions?.canAccessAdmin && onOpenAdminPanel && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminPanel();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs active:scale-98 transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>{language === "ku" ? "کردنەوەی پانێڵی ئەدمین" : "Open Admin Control Panel"}</span>
            </button>
          )}

          {/* Switch Account Form */}
          <form onSubmit={handleLogin} className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-750">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "ku" ? "گۆڕینی ئەکاونت" : "Switch Account"}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">
                {language === "ku" ? "ناوی بەکارهێنەر" : "Username"}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full h-9 ps-8 pe-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">
                {language === "ku" ? "وشەی نهێنی" : "Password"}
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-9 ps-8 pe-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-9 mt-1 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-98 transition-all text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === "ku" ? "چوونەژوورەوە" : "Sign In"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
