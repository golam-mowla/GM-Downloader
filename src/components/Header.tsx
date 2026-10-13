import React from "react";
import { ShieldCheck, Sparkles, Terminal, ArrowRight, ShieldAlert } from "lucide-react";
import { ToolVersionInfo } from "../types";

interface HeaderProps {
  tools: ToolVersionInfo[];
  appHasUpdate?: boolean;
  latestAppVersion?: string;
  onOpenUpdates: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tools,
  appHasUpdate = false,
  latestAppVersion,
  onOpenUpdates,
}) => {
  const ytdlp = tools.find((t) => t.name.toLowerCase().includes("yt-dlp"));
  const hasAnyEngineUpdate = tools.some((t) => t.hasUpdate);
  const showUpdateAlert = appHasUpdate || hasAnyEngineUpdate;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
      {/* Brand + FULL PARROT ICON (No White Box Enclosure) */}
      <div className="flex items-center gap-3">
        {/* Full Parrot Icon directly filling frame without a white box */}
        <div className="relative shrink-0 flex items-center justify-center">
          <img
            src="/parrot_full.png"
            alt="GM Downloader Parrot"
            className="w-11 h-11 object-contain drop-shadow-[0_4px_10px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-cyan-600 dark:from-white dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent">
              GM Downloader
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Pro v2.0
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Multi-Platform Media Downloader, Batch Queue &amp; Resilient Clipper
          </p>
        </div>
      </div>

      {/* Right Action Bar & Status Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* PROMINENT BLUE UPDATE BUTTON (Matches User's Image 3: "Restart to Update ->") */}
        {showUpdateAlert ? (
          <button
            type="button"
            onClick={onOpenUpdates}
            title="Click to view update details and update core engines"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/30 border border-blue-400 animate-pulse transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Update Available{latestAppVersion ? ` (${latestAppVersion})` : ""}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          /* Yt-dlp Up to Date (No update available) Badge requested by User */
          <button
            type="button"
            onClick={onOpenUpdates}
            title="yt-dlp is fully updated to the latest version"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <Terminal className="w-3.5 h-3.5 text-cyan-600" />
            <span>yt-dlp: Up to date (No update available) ✔</span>
          </button>
        )}

        {/* 18+ Age Restriction Bypass Active Badge */}
        <div
          title="18+ Age-Restricted video bypass is active via iOS/Web spoofing"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
          <span>18+ Bypass Active</span>
        </div>

        {/* Auto-Resume Active Badge */}
        <div
          title="Downloads automatically resume from saved .part files across network cuts"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resume Ready</span>
        </div>
      </div>
    </header>
  );
};
