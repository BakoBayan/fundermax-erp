"use client";

import { APP_CONFIG, APP_VERSION_NUMBER } from '@/config/appConfig';
import React, { useState } from "react";
import { useInventory } from "../context/InventoryContext";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Sun,
  Moon,
  Globe,
  Shield,
  ChessKnight,
  Phone,
  Mail
} from "lucide-react";

export const LoginScreen: React.FC = () => {
  const { login, language, setLanguage, theme, toggleTheme, openCopyrightModal } = useInventory();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isKu = language === 'ku';

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
    <div
      dir="ltr"
      className="relative min-h-screen w-full flex flex-col items-center justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 overflow-x-hidden select-none transition-colors"
    >
      {/* Dedicated Ambient Background Container (Full Viewport Coverage at z-0 for Mobile & PC) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none" aria-hidden="true">
        {/* Texture Parity: Coordinate Blueprint Grid & Dot Matrix Mesh */}
        <div className="ambient-blueprint absolute inset-0 pointer-events-none" />
        <div className="ambient-dots absolute inset-0 pointer-events-none text-slate-900 dark:text-white" />

        {/* Main Menu Ambient Geometric Shapes (Vibrant, Fully Visible on Mobile & PC, Collision-Free) */}
        {/* Shape 1: Top-Left Floating Cyan/Sky Tech Orb */}
        <div className="absolute top-[8%] left-[6%] sm:top-[10%] sm:left-[8%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-1 pointer-events-none transform-gpu">
            <div className="w-14 h-14 sm:w-16 sm:h-16 opacity-100 rounded-xl sm:rounded-2xl border sm:border-2 border-sky-400/55 dark:border-sky-300/45 bg-gradient-to-br from-sky-400/30 via-cyan-400/15 to-transparent shadow-xs rotate-12 flex items-center justify-center transform-gpu">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded sm:rounded-lg border border-sky-300/40 bg-sky-400/20" />
            </div>
          </div>
        </div>

        {/* Shape 2: Top-Right Poly-Diamond Cube (Emerald) */}
        <div className="absolute top-[10%] right-[8%] sm:top-[12%] sm:right-[10%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-2 pointer-events-none transform-gpu">
            <div className="w-16 h-16 sm:w-20 sm:h-20 opacity-100 rotate-45 rounded-xl sm:rounded-2xl border sm:border-2 border-emerald-500/60 dark:border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-transparent shadow-sm transform-gpu" />
          </div>
        </div>

        {/* Shape 3: Mid-Left Angled Prism (Indigo/Violet) */}
        <div className="absolute top-[50%] left-[4%] sm:top-[52%] sm:left-[6%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-3 pointer-events-none transform-gpu">
            <div className="w-12 h-18 sm:w-16 sm:h-24 opacity-100 -rotate-12 rounded-xl sm:rounded-2xl border sm:border-2 border-indigo-500/55 dark:border-indigo-400/50 bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-transparent shadow-sm transform-gpu" />
          </div>
        </div>

        {/* Shape 4: Mid-Right Isometric Rhombus Prism (Rose/Fuchsia) */}
        <div className="absolute top-[52%] right-[6%] sm:top-[54%] sm:right-[8%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-4 pointer-events-none transform-gpu">
            <div className="w-12 h-12 sm:w-14 sm:h-14 opacity-100 rotate-[30deg] skew-x-12 rounded-lg sm:rounded-xl border sm:border-2 border-rose-500/55 dark:border-rose-400/50 bg-gradient-to-br from-rose-400/25 via-fuchsia-400/15 to-transparent shadow-sm transform-gpu" />
          </div>
        </div>

        {/* Shape 5: Bottom-Left Floating Crystal Tile (Amber/Orange) */}
        <div className="absolute bottom-[12%] left-[16%] sm:bottom-[10%] sm:left-[20%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-5 pointer-events-none transform-gpu">
            <div className="w-12 h-12 sm:w-16 sm:h-16 opacity-100 rotate-12 rounded-lg sm:rounded-xl border sm:border-2 border-amber-500/55 dark:border-amber-400/45 bg-gradient-to-br from-amber-400/30 via-orange-400/15 to-transparent shadow-xs transform-gpu" />
          </div>
        </div>

        {/* Shape 6: Bottom-Right Precision Tech Capsule (Teal/Emerald) */}
        <div className="absolute bottom-[12%] right-[16%] sm:bottom-[10%] sm:right-[20%] pointer-events-none transform-gpu">
          <div className="animate-bounded-float-6 pointer-events-none transform-gpu">
            <div className="w-16 h-10 sm:w-20 sm:h-12 opacity-100 -rotate-6 rounded-full border sm:border-2 border-teal-500/60 dark:border-teal-400/50 bg-gradient-to-br from-teal-400/30 via-emerald-400/15 to-transparent shadow-sm flex items-center justify-center transform-gpu">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-teal-500/45" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Bar: Language & Theme Toggles */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pt-2 relative z-20">
        {/* Language Preference Switcher for post-login session */}
        <button
          type="button"
          onClick={() => setLanguage(language === "en" ? "ku" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title={language === "en" ? "Switch post-login language to Kurdish" : "Switch post-login language to English"}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === "en" ? "کوردی" : "English"}</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition-all active:scale-95 cursor-pointer"
          title={theme === "light" ? "Switch to Night mode" : "Switch to Day mode"}
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4 text-slate-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>

      {/* Main Centered Login Card - Substantial & Thick PC Dimensions */}
      <div className="w-full max-w-md md:max-w-lg mx-auto relative z-20 flex flex-col items-center justify-center my-auto">
        <div className="w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xl overflow-hidden p-8 md:p-10 space-y-6 sm:space-y-7">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-sm border border-emerald-500/20">
              <ChessKnight className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Bako&apos;s Master System
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Specially made for Shaswar Ahmad Shaswar Co.
              </p>
            </div>
            {/* Security Pill & Version Badge */}
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Secure Authentication</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/25">
                {APP_CONFIG.version}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5 text-start">
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
            <div className="space-y-1.5 text-start">
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

      {/* Synchronized Static Footer Pill with Proximity Spacing & Mobile Overflow Protection */}
      <footer className="w-full max-w-4xl mx-auto mt-6 mb-4 md:mb-6 min-h-[3.5rem] h-auto py-3 md:py-0 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-2xl md:rounded-full select-none no-print transition-all relative z-20 shrink-0">
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
    </div>
  );
};

export default LoginScreen;
