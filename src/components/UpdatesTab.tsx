import React from "react";
import { ToolVersionInfo } from "../types";
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowUpCircle, Terminal } from "lucide-react";

interface UpdatesTabProps {
  tools: { ytdlp: ToolVersionInfo; deno: ToolVersionInfo; ffmpeg: ToolVersionInfo };
  checking: boolean;
  onCheckUpdates: () => void;
  onUpdateTool: (name: string) => void;
  onUpdateAll: () => void;
  updateLogs: string[];
  successMessage: string | null;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  tools,
  checking,
  onCheckUpdates,
  onUpdateTool,
  onUpdateAll,
  updateLogs,
  successMessage,
}) => {
  const toolList = [tools.ytdlp, tools.deno, tools.ffmpeg];
  const hasAnyUpdate = toolList.some((t) => t.hasUpdate);

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* Header Info Banner */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 text-primary ${checking ? "animate-spin" : ""}`} />
          <span>Tool Update Center</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Keep yt-dlp, Deno (JavaScript Runtime engine for YouTube throttling bypass), and FFmpeg updated to ensure peak download speeds and 100% format support.
        </p>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm">Update Succeeded!</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {toolList.map((tool) => (
          <div
            key={tool.name}
            className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">{tool.name}</span>
                {tool.hasUpdate ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Update Available
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Up to Date
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <p className="text-muted-foreground">
                  Installed: <span className="font-mono text-foreground font-semibold">{tool.installedVersion}</span>
                </p>
                <p className="text-muted-foreground">
                  Latest: <span className="font-mono text-foreground font-semibold">{tool.latestVersion}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => onUpdateTool(tool.name)}
              disabled={tool.isUpdating}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                tool.hasUpdate
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
              }`}
            >
              {tool.isUpdating ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUpCircle className="w-3.5 h-3.5" />
              )}
              <span>{tool.isUpdating ? "Updating..." : `Update ${tool.name}`}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onCheckUpdates}
          disabled={checking}
          className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "Checking..." : "Check for Updates Now"}</span>
        </button>

        {hasAnyUpdate && (
          <button
            onClick={onUpdateAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all animate-pulse"
          >
            <ArrowUpCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Update All Tools (One-Click)</span>
          </button>
        )}
      </div>

      {/* Update Log Console */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" />
          <span>Update Terminal Log</span>
        </label>
        <div className="bg-black/80 rounded-lg p-3 font-mono text-[11px] text-emerald-400 h-32 overflow-y-auto space-y-1">
          {updateLogs.length === 0 ? (
            <p className="text-muted-foreground">No recent update activities.</p>
          ) : (
            updateLogs.map((log, idx) => <p key={idx}>{log}</p>)
          )}
        </div>
      </div>
    </div>
  );
};
