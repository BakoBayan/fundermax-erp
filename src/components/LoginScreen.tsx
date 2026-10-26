"use client";

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { BakoLogo } from "./BakoLogo";
import { User, Lock, Eye, EyeOff, LogIn, Sun, Moon, Globe, Shield } from "lucide-react";

export const LoginScreen: React.FC = () => {
  const { login, language, setLanguage, theme, toggleTheme, openCopyrightModal } = useInventory();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter your username and password.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const success = login(username, password);
      setIsLoading(false);
      if (!success) {
        setErrorMsg("Invalid username or password. Please check your credentials.");
      }
    }, 200);
  };

  return (
    <div dir="ltr" className="min-h-screen w-full flex flex-col items-center justify-between bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 text-slate-900 dark:text-slate-100 p-4 transition-colors select-none">
      {/* Top Bar: Language & Theme Toggles */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        {/* Language Preference Switcher for post-login session */}
        <button
          type="button"
          onClick={() => setLanguage(language === "en" ? "ku" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all active:scale-95"
          title={language === "en" ? "Switch post-login language to Kurdish" : "Switch post-login language to English"}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === "en" ? "کوردی" : "English"}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all active:scale-95"
          title={theme === "light" ? "Switch to Night mode" : "Switch to Day mode"}
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>

      {/* Main Centered Login Card - Always in English */}
      <div className="w-full max-w-sm my-auto">
        <div className="bg-white/95 dark:bg-slate-850/95 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-750 shadow-xl overflow-hidden p-6 sm:p-7 space-y-6">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center text-center space-y-3">
            <BakoLogo size={56} className="w-14 h-14 shadow-lg rounded-2xl" />
            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Bako&apos;s Master System
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/25">
                  {APP_CONFIG.version}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Unified Panels, Sales POS &amp; Warehouse Operations
              </p>
            </div>
            {/* Security Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Secure Authentication</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  autoComplete="username"
                  className="w-full h-11 ps-9 pe-3 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full h-11 ps-9 pe-10 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in duration-150">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 dark:text-slate-400 py-3 space-y-1">
        <button
          type="button"
          onClick={openCopyrightModal}
          className="font-semibold text-[11px] tracking-wide hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group inline-flex items-center gap-1.5"
          title="Click to view legal copyright notice and custom software project inquiries"
        >
          <span>© 2026 Bako Bayan Madhhar. All rights reserved.</span>
          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">• Bako&apos;s Master System ({APP_CONFIG.version})</span>
        </button>
        <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
          Official Support &amp; Commissions: <a href="tel:07705488654" className="font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors">07705488654</a>
        </div>
      </footer>
    </div>
  );
};
