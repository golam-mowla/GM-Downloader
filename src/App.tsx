import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Download,
  Settings,
  History,
  RefreshCw,
} from "lucide-react";
import { Header } from "./components/Header";
import { DownloadTab } from "./components/DownloadTab";
import { SettingsTab } from "./components/SettingsTab";
import { HistoryTab } from "./components/HistoryTab";
import { UpdatesTab } from "./components/UpdatesTab";
import {
  DownloadMode,
  DownloadOptions,
  DownloadProgress,
  DownloadTask,
  MediaInfo,
  ToolVersionInfo,
} from "./types";

const DEFAULT_OPTIONS: DownloadOptions = {
  url: "",
  saveFolder: "D:\\00VideoEditing Tools\\yt-dlp\\Downloads",
  downloadMode: "video",
  container: "MP4 (Video)",
  videoStreamId: "best",
  audioStreamId: "ba",
  audioBitrate: "0",

  // Subtitles
  enableSubtitles: false,
  subtitleLang: "en,bn",
  subtitleFormat: "srt",
  subtitleSaveMode: "separate",

  // Clipper
  enableClip: false,
  startTime: "00:00:00",
  endTime: "00:02:00",
  preciseCut: false,

  // Parabolic Options - UI
  theme: "Light (White Neon)",
  translationLanguage: "Default (en-US)",
  receivePreviewUpdates: false,
  preventSuspend: false,
  historyLength: "One Month",

  // Parabolic Options - Downloads
  maxActiveDownloads: 5,
  overwriteFiles: true,
  includeMediaId: false,
  includeAutoSubtitles: true,
  includeSuperRes: false,
  preferredVideoCodec: "Any",
  preferredAudioCodec: "Any",
  preferredSubtitleFormat: "Any",
  preferredFps: "Any (Highest)",

  // Parabolic Options - Downloader
  usePartFiles: true,
  sponsorBlock: false,
  limitSpeed: false,
  speedLimitKb: 1024,
  proxy: "",
  cookiesFile: "",
  cookiesBrowser: "None",
  useAria2c: false,
  aria2Connections: 16,
  ytdlpDiscoveryArgs: "",
  ytdlpDownloadArgs: "",

  // Parabolic Options - Converter
  translateMetadata: false,
  embedMetadata: true,
  embedThumbnails: true,
  cropAudioThumbnails: false,
  embedChapters: false,
  splitChapters: false,
  embedSubtitlesGlobal: true,
  ffmpegThreads: 4,
  postProcessorArgs: "",
};

type ActiveTab = "download" | "options" | "history" | "updates";

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("download");

  const [options, setOptions] = useState<DownloadOptions>(() => {
    try {
      const saved = localStorage.getItem("gm_downloader_options_v2");
      if (saved) {
        return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_OPTIONS;
  });

  const [tasks, setTasks] = useState<DownloadTask[]>(() => {
    try {
      const saved = localStorage.getItem("gm_downloader_history_v2");
      if (saved) {
        const parsed: DownloadTask[] = JSON.parse(saved);
        // Any task that was still "downloading" when PC shut down becomes "interrupted"
        return parsed.map((t) =>
          t.status === "downloading" ? { ...t, status: "interrupted" } : t
        );
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [progress, setProgress] = useState<DownloadProgress>({
    percent: 0,
    text: "Ready — Paste a link and click Fetch Link Qualities or Start Download",
    status: "idle",
  });
  const [logs, setLogs] = useState<string[]>([]);

  const [tools, setTools] = useState<ToolVersionInfo[]>([
    {
      name: "yt-dlp",
      installedVersion: "Checking...",
      latestVersion: "Latest",
      hasUpdate: false,
    },
    {
      name: "Deno",
      installedVersion: "Checking...",
      latestVersion: "Latest",
      hasUpdate: false,
    },
    {
      name: "FFmpeg",
      installedVersion: "Checking...",
      latestVersion: "Latest",
      hasUpdate: false,
    },
  ]);
  const [checkingTools, setCheckingTools] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const currentTaskIdRef = useRef<string | null>(null);

  // Sync theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (options.theme === "Dark") {
      root.classList.add("dark");
    } else if (options.theme === "Light (White Neon)") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", prefersDark);
    }
    try {
      localStorage.setItem("gm_downloader_options_v2", JSON.stringify(options));
    } catch {
      // ignore
    }
  }, [options]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem("gm_downloader_history_v2", JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  // Subscribe to Tauri Backend Events + Initial Tool Version Check
  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenProgress = await listen<{
          percent: number;
          text: string;
          speed: string;
          eta: string;
          status: string;
        }>("download-progress", (event) => {
          const p = event.payload;
          setProgress({
            percent: p.percent,
            text: p.text,
            speed: p.speed,
            eta: p.eta,
            status: (p.status as DownloadProgress["status"]) || "downloading",
          });

          if (currentTaskIdRef.current) {
            const tid = currentTaskIdRef.current;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      percent: p.percent,
                      speed: p.speed,
                      status:
                        p.status === "completed" ? "completed" : "downloading",
                    }
                  : t
              )
            );
          }
        });

        unlistenLog = await listen<string>("download-log", (event) => {
          setLogs((prev) => [...prev.slice(-120), event.payload]);
        });
      } catch {
        // Running in browser preview mode
      }
    };

    setupListeners();
    handleCheckToolUpdates();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenLog) unlistenLog();
    };
  }, []);

  const handleCheckToolUpdates = async () => {
    setCheckingTools(true);
    try {
      const res = await invoke<ToolVersionInfo[]>("check_tool_updates");
      if (res && Array.isArray(res)) {
        setTools(res);
      }
    } catch {
      // Fallback if running outside Tauri
    } finally {
      setCheckingTools(false);
    }
  };

  const handleUpdateTool = async (toolName: string) => {
    setUpdateSuccess(null);
    setTools((prev) =>
      prev.map((t) => (t.name === toolName ? { ...t, isUpdating: true } : t))
    );
    setUpdateLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Starting update for ${toolName}...`,
    ]);

    try {
      const msg = await invoke<string>("update_tool", { toolName });
      setUpdateLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✔ ${msg}`,
      ]);
      setUpdateSuccess(msg);
      await handleCheckToolUpdates();
    } catch (err: any) {
      setUpdateLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Error updating ${toolName}: ${String(
          err
        )}`,
      ]);
    } finally {
      setTools((prev) =>
        prev.map((t) => (t.name === toolName ? { ...t, isUpdating: false } : t))
      );
    }
  };

  const handleUpdateAllTools = async () => {
    for (const t of tools) {
      await handleUpdateTool(t.name);
    }
  };

  const handleFetchInfo = async () => {
    const url = options.url.trim();
    if (!url) return;

    setIsFetching(true);
    setFetchError(null);
    setMediaInfo(null);
    setProgress({
      percent: 10,
      text: "Inspecting link and discovering all available qualities, codecs & subtitles...",
      status: "fetching",
    });

    try {
      const info = await invoke<MediaInfo>("fetch_media_info", {
        url,
        cookiesBrowser: options.cookiesBrowser,
        cookiesFile: options.cookiesFile,
        proxy: options.proxy,
        discoveryArgs: options.ytdlpDiscoveryArgs,
      });

      setMediaInfo(info);

      // Default to highest video stream and highest audio stream
      setOptions((prev) => ({
        ...prev,
        videoStreamId: "best",
        audioStreamId: "ba",
        subtitleLang:
          info.subtitles && info.subtitles.length > 0
            ? info.subtitles[0].code
            : prev.subtitleLang,
      }));

      setProgress({
        percent: 0,
        text: `✔ Fetched "${info.title}" (${info.videoStreams.length} Video streams, ${info.audioStreams.length} Audio streams, ${info.subtitles.length} Subtitles)`,
        status: "idle",
      });
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || String(err);
      setFetchError(errMsg);
      setProgress({
        percent: 0,
        text: "Could not fetch link metadata. Check error message above.",
        status: "error",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: options.saveFolder,
      });
      if (selected && typeof selected === "string") {
        setOptions((prev) => ({ ...prev, saveFolder: selected }));
      }
    } catch {
      // ignore
    }
  };

  const handleBrowseCookiesFile = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [{ name: "Cookies TXT", extensions: ["txt"] }],
      });
      if (selected && typeof selected === "string") {
        setOptions((prev) => ({ ...prev, cookiesFile: selected }));
      }
    } catch {
      // ignore
    }
  };

  const handleOpenFolder = async (folderPath?: string) => {
    const target = folderPath || options.saveFolder;
    try {
      await invoke("open_folder", { path: target });
    } catch {
      // ignore
    }
  };

  const runDownloadWithOptions = async (
    effectiveOptions: DownloadOptions,
    existingTaskId?: string
  ) => {
    const url = effectiveOptions.url.trim();
    if (!url) return;

    const taskId = existingTaskId || `task_${Date.now()}`;
    currentTaskIdRef.current = taskId;

    const selectedVideoLabel =
      effectiveOptions.downloadMode === "subtitles"
        ? `Subtitles (${effectiveOptions.subtitleFormat.toUpperCase()})`
        : effectiveOptions.downloadMode === "audio"
        ? `Audio (${effectiveOptions.audioBitrate === "0" ? "320kbps" : effectiveOptions.audioBitrate})`
        : mediaInfo?.videoStreams.find(
            (s) => s.id === effectiveOptions.videoStreamId
          )?.label || "Best Quality";

    const taskTitle =
      mediaInfo?.title ||
      tasks.find((t) => t.id === existingTaskId)?.title ||
      url;

    const newTask: DownloadTask = {
      id: taskId,
      title: taskTitle,
      url,
      thumbnail: mediaInfo?.thumbnail,
      container: effectiveOptions.container,
      qualityLabel: selectedVideoLabel.split("•")[0].trim(),
      saveFolder: effectiveOptions.saveFolder,
      percent: 2,
      status: "downloading",
      createdAt: Date.now(),
      options: effectiveOptions,
    };

    setTasks((prev) => {
      const exists = prev.some((t) => t.id === taskId);
      if (exists) {
        return prev.map((t) =>
          t.id === taskId ? { ...t, status: "downloading", error: undefined } : t
        );
      }
      return [newTask, ...prev];
    });

    setLogs([]);
    setProgress({
      percent: 2,
      text: "Starting download engine...",
      status: "downloading",
    });

    try {
      await invoke<string>("start_download", {
        options: effectiveOptions,
      });

      setProgress({
        percent: 100,
        text: "Download Completed Successfully! ✔",
        status: "completed",
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, percent: 100, status: "completed" } : t
        )
      );
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      const isPaused = msg.toLowerCase().includes("paused") || msg.toLowerCase().includes("cancelled");

      setProgress({
        percent: progress.percent,
        text: isPaused
          ? "⏸ Download Paused — Partial .part file saved for instant resume"
          : `Error: ${msg}`,
        status: isPaused ? "paused" : "error",
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: isPaused ? "paused" : "interrupted",
                error: msg,
              }
            : t
        )
      );
    } finally {
      currentTaskIdRef.current = null;
    }
  };

  const handleStartDownload = (overrideMode?: DownloadMode) => {
    const effectiveOptions: DownloadOptions = overrideMode
      ? {
          ...options,
          downloadMode: overrideMode,
          enableSubtitles: overrideMode === "subtitles" ? true : options.enableSubtitles,
        }
      : options;

    runDownloadWithOptions(effectiveOptions);
  };

  const handleCancelDownload = async () => {
    try {
      await invoke("cancel_download");
    } catch {
      // ignore
    }
  };

  const handleResumeTask = (task: DownloadTask) => {
    setActiveTab("download");
    setOptions(task.options);
    runDownloadWithOptions(task.options, task.id);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== "completed"));
  };

  const activeOrPausedCount = tasks.filter(
    (t) => t.status === "downloading" || t.status === "paused" || t.status === "interrupted"
  ).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header with Parrot Logo */}
      <Header
        tools={tools}
        onOpenUpdates={() => setActiveTab("updates")}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Navigation Tabs (Renamed "Options" per User Request) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("download")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              activeTab === "download"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <Download className="w-4 h-4" />
            Download &amp; Clip
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("options")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              activeTab === "options"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <Settings className="w-4 h-4" />
            Options
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              activeTab === "history"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <History className="w-4 h-4" />
            Queue &amp; History
            {activeOrPausedCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-slate-950 font-black">
                {activeOrPausedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("updates")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
              activeTab === "updates"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Tool Updater
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === "download" && (
          <DownloadTab
            options={options}
            setOptions={setOptions}
            mediaInfo={mediaInfo}
            isFetching={isFetching}
            fetchError={fetchError}
            onFetchInfo={handleFetchInfo}
            onBrowseFolder={handleBrowseFolder}
            onOpenFolder={() => handleOpenFolder()}
            onStartDownload={handleStartDownload}
            onCancelDownload={handleCancelDownload}
            progress={progress}
            logs={logs}
          />
        )}

        {activeTab === "options" && (
          <SettingsTab
            options={options}
            setOptions={setOptions}
            onBrowseCookiesFile={handleBrowseCookiesFile}
            onResetDefaults={() => setOptions(DEFAULT_OPTIONS)}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            tasks={tasks}
            onResumeTask={handleResumeTask}
            onPauseTask={() => handleCancelDownload()}
            onDeleteTask={handleDeleteTask}
            onClearCompleted={handleClearCompleted}
            onOpenFolder={(p) => handleOpenFolder(p)}
          />
        )}

        {activeTab === "updates" && (
          <UpdatesTab
            tools={tools}
            checking={checkingTools}
            onCheckUpdates={handleCheckToolUpdates}
            onUpdateTool={handleUpdateTool}
            onUpdateAll={handleUpdateAllTools}
            updateLogs={updateLogs}
            successMessage={updateSuccess}
          />
        )}
      </main>
    </div>
  );
}
