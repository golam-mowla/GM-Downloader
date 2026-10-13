import React from "react";
import { ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { ToolVersionInfo } from "../types";

interface HeaderProps {
  tools: ToolVersionInfo[];
  onOpenUpdates: () => void;
}

export const Header: React.FC<HeaderProps> = ({ tools, onOpenUpdates }) => {
  const ytdlp = tools.find((t) => t.name.toLowerCase().includes("yt-dlp"));
  const ffmpeg = tools.find((t) => t.name.toLowerCase().includes("ffmpeg"));

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
      {/* Brand + Parrot Logo */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 border-2 border-cyan-400 flex items-center justify-center shrink-0"
          style={{
            boxShadow:
              "0 0 16px rgba(6, 182, 212, 0.35), 0 0 8px rgba(16, 185, 129, 0.25)",
          }}
        >
          {/* Custom Neon Parrot SVG Icon */}
          <svg
            width="30"
            height="30"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Crest feathers */}
            <path
              d="M24 8C20 12 18 18 20 22C23 17 28 14 33 14C30 10 27 8 24 8Z"
              fill="#EF4444"
            />
            <path
              d="M31 6C28 10 27 15 29 19C32 15 36 13 40 13C37 9 34 6 31 6Z"
              fill="#F59E0B"
            />
            {/* Head & Body */}
            <path
              d="M18 28C18 18.6112 25.6112 11 35 11C43.5 11 49 17 49 25.5C49 36 43 49 33 56C25 58 18 51 18 42V28Z"
              fill="url(#parrot_body_grad)"
            />
            {/* Wing */}
            <path
              d="M22 31C22 25 28 23 34 26C40 29 41 39 35 48C28 49 22 42 22 31Z"
              fill="url(#parrot_wing_grad)"
            />
            {/* Beak */}
            <path
              d="M47 20C54 20 59 25 57 32C54 31 50 29 47 29V20Z"
              fill="#FBBF24"
            />
            <path
              d="M47 27C51 27 54 29 53 33C50 33 48 31 47 30V27Z"
              fill="#1E293B"
            />
            {/* Eye */}
            <circle cx="41" cy="21" r="4" fill="white" />
            <circle cx="42" cy="21" r="2" fill="#0F172A" />
            <defs>
              <linearGradient
                id="parrot_body_grad"
                x1="18"
                y1="11"
                x2="49"
                y2="56"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#10B981" />
                <stop offset="0.55" stopColor="#06B6D4" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient
                id="parrot_wing_grad"
                x1="22"
                y1="25"
                x2="39"
                y2="48"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F43F5E" />
                <stop offset="0.5" stopColor="#A855F7" />
                <stop offset="1" stopColor="#6366F1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-cyan-600 dark:from-white dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent">
              GM Downloader
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Pro Edition
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Universal Media Downloader, Dynamic Stream Picker &amp; Timeframe Clipper
          </p>
        </div>
      </div>

      {/* Right Status Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onOpenUpdates}
          title="Click to check or update core engines"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Terminal className="w-3.5 h-3.5 text-cyan-600" />
          <span>yt-dlp: {ytdlp?.installedVersion || "Ready"}</span>
        </button>

        <button
          onClick={onOpenUpdates}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
        >
          <span>FFmpeg: {ffmpeg?.installedVersion ? "Active" : "Ready"}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Auto-Resume Ready</span>
        </div>
      </div>
    </header>
  );
};
