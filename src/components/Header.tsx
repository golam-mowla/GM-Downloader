import React from "react";
import { Download, Moon, Sun, Bell, RefreshCw, Cpu, Layers } from "lucide-react";
import { ToolVersionInfo } from "../types";

interface HeaderProps {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  tools: { ytdlp: ToolVersionInfo; deno: ToolVersionInfo; ffmpeg: ToolVersionInfo };
  onNavigateToUpdates: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  tools,
  onNavigateToUpdates,
}) => {
  const hasAnyUpdate =
    tools.ytdlp.hasUpdate || tools.deno.hasUpdate || tools.ffmpeg.hasUpdate;

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Download className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            GM Downloader
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <span>Powered by Tauri 2 & yt-dlp</span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Active Engine Status Badges */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            yt-dlp {tools.ytdlp.installedVersion.slice(0, 10)}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Deno JS
          </span>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            FFmpeg
          </span>
        </div>

        {/* Update alert banner */}
        {hasAnyUpdate && (
          <button
            onClick={onNavigateToUpdates}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 transition-all text-xs font-semibold flex items-center gap-1.5 animate-pulse"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Update Available!</span>
          </button>
        )}

        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
