import React from "react";
import { DownloadTask } from "../types";
import {
  Play,
  Pause,
  FolderOpen,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileVideo,
  FileAudio,
  RotateCcw,
} from "lucide-react";
import { formatBytes } from "../lib/utils";

interface HistoryTabProps {
  tasks: DownloadTask[];
  onResumeTask: (task: DownloadTask) => void;
  onPauseTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearCompleted: () => void;
  onOpenFolder: (path: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  tasks,
  onResumeTask,
  onPauseTask,
  onDeleteTask,
  onClearCompleted,
  onOpenFolder,
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>Download Queue & Resilient History</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interrupted downloads (network disconnect, power outage, PC restart) can be resumed directly from where they stopped.
          </p>
        </div>

        {tasks.some((t) => t.status === "completed") && (
          <button
            onClick={onClearCompleted}
            className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-medium border border-border transition-all"
          >
            Clear Completed
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No downloads in history yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            When you start downloads, they will appear here. Even if your internet disconnects or power cuts, your partial downloads are saved and can be resumed here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isPaused = task.status === "paused" || task.status === "interrupted";
            const isDownloading = task.status === "downloading";
            const isCompleted = task.status === "completed";

            return (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3 hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                      {task.thumbnail ? (
                        <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : task.options.mediaType === "Audio" ? (
                        <FileAudio className="w-6 h-6 text-primary" />
                      ) : (
                        <FileVideo className="w-6 h-6 text-primary" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate max-w-lg" title={task.title}>
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-secondary font-mono text-foreground font-semibold">
                          {task.format} • {task.quality}
                        </span>
                        {task.options.enableClip && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">
                            Clip: {task.options.startTime} - {task.options.endTime}
                          </span>
                        )}
                        <span>• {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {isPaused && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {task.status === "paused" ? "Paused" : "Interrupted"}
                      </span>
                    )}
                    {isDownloading && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        Downloading
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>
                      {task.downloadedBytes && task.totalBytes
                        ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
                        : `${task.percent.toFixed(0)}%`}
                    </span>
                    {task.speed && <span>{task.speed}</span>}
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isPaused
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, task.percent))}%` }}
                    />
                  </div>
                </div>

                {/* Task Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-muted-foreground truncate max-w-sm" title={task.saveFolder}>
                    📁 {task.saveFolder}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Resume Button */}
                    {isPaused && (
                      <button
                        onClick={() => onResumeTask(task)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Resume downloading from saved partial file"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Resume</span>
                      </button>
                    )}

                    {/* Pause Button */}
                    {isDownloading && (
                      <button
                        onClick={() => onPauseTask(task.id)}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Pause download (preserves partial file)"
                      >
                        <Pause className="w-3 h-3 fill-current" />
                        <span>Pause</span>
                      </button>
                    )}

                    {/* Open Folder Button */}
                    <button
                      onClick={() => onOpenFolder(task.saveFolder)}
                      className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-all"
                      title="Open Destination Folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Task Button */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-destructive transition-all"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
