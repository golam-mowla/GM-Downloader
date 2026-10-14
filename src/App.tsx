import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Download,
  Settings,
  History,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Header } from "./components/Header";
import { DownloadTab } from "./components/DownloadTab";
import { BatchTab } from "./components/BatchTab";
import { SettingsTab } from "./components/SettingsTab";
import { HistoryTab } from "./components/HistoryTab";
import { UpdatesTab } from "./components/UpdatesTab";
import {
  DownloadMode,
  DownloadOptions,
  DownloadProgress,
  DownloadTask,
  MediaInfo,
  SubtitleTrack,
  ToolVersionInfo,
} from "./types";

const CURRENT_APP_VERSION = "2.0.1";

const parseRawYtdlJsonToMediaInfo = (raw: any): MediaInfo => {
  const formats = Array.isArray(raw.formats) ? raw.formats : [];

  const videoStreams = formats
    .filter((f: any) => f.vcodec && f.vcodec !== "none")
    .map((f: any) => ({
      id: String(f.format_id),
      label: `${f.resolution || (f.height ? `${f.height}p` : "Video")} • ${f.ext || "mp4"} • ${(f.vcodec || "").split(".")[0]}`,
      ext: f.ext || "mp4",
      resolution: f.resolution || (f.height ? `${f.height}p` : "HD"),
      fps: f.fps || 30,
      height: f.height || 0,
      filesize: f.filesize
        ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB`
        : f.filesize_approx
        ? `~${(f.filesize_approx / (1024 * 1024)).toFixed(1)} MB`
        : "Dynamic",
      vcodec: f.vcodec || "",
      acodec: f.acodec || "",
    }))
    .sort((a: any, b: any) => {
      const hA = a.height || parseInt(String(a.resolution || "").replace(/[^0-9]/g, "")) || 0;
      const hB = b.height || parseInt(String(b.resolution || "").replace(/[^0-9]/g, "")) || 0;
      return hB - hA;
    });

  const audioStreams = formats
    .filter(
      (f: any) =>
        f.acodec &&
        f.acodec !== "none" &&
        (!f.vcodec || f.vcodec === "none")
    )
    .map((f: any) => ({
      id: String(f.format_id),
      label: `${f.ext || "audio"} • ${f.abr ? `${Math.round(f.abr)}kbps` : "Audio"} • ${(f.acodec || "").split(".")[0]}`,
      ext: f.ext || "m4a",
      resolution: "Audio only",
      fps: 0,
      abr: f.abr || 0,
      filesize: f.filesize
        ? `${(f.filesize / (1024 * 1024)).toFixed(1)} MB`
        : "Dynamic",
      vcodec: "none",
      acodec: f.acodec || "",
    }))
    .sort((a: any, b: any) => (b.abr || 0) - (a.abr || 0));

  const subs: SubtitleTrack[] = Object.keys(raw.subtitles || {}).map((lang) => ({
    code: lang,
    name: lang.toUpperCase(),
    isAuto: false,
  }));

  return {
    id: raw.id || "media",
    title: raw.title || "Video",
    duration: typeof raw.duration === "number" ? raw.duration : 0,
    thumbnail: raw.thumbnail || "",
    uploader: raw.uploader || raw.channel || "",
    videoStreams:
      videoStreams.length > 0
        ? videoStreams
        : [
            {
              id: "best",
              label: "Best Quality (Auto)",
              ext: "mp4",
              resolution: "Best",
              fps: 60,
              filesize: "Auto",
              vcodec: "",
              acodec: "",
            },
          ],
    audioStreams:
      audioStreams.length > 0
        ? audioStreams
        : [
            {
              id: "ba",
              label: "Best Audio (Auto)",
              ext: "mp3",
              resolution: "Audio only",
              fps: 0,
              filesize: "Auto",
              vcodec: "none",
              acodec: "",
            },
          ],
    subtitles: subs,
  };
};

const DEFAULT_OPTIONS: DownloadOptions = {
  url: "",
  saveFolder: "D:\\00VideoEditing Tools\\yt-dlp\\Downloads",
  customFilename: "",
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
  overwriteFiles: false, // RESUME FIX: Never overwrite files so partial .part downloads resume!
  includeMediaId: false,
  includeAutoSubtitles: true,
  includeSuperRes: false,
  preferredVideoCodec: "Any",
  preferredAudioCodec: "Any",
  preferredSubtitleFormat: "Any",
  preferredFps: "Any (Highest)",

  // Parabolic Options - Downloader
  usePartFiles: true, // Always save .part files
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

type ActiveTab = "download" | "batch" | "options" | "history" | "updates";

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("download");

  const [options, setOptions] = useState<DownloadOptions>(() => {
    try {
      const saved = localStorage.getItem("gm_downloader_options_v2");
      if (saved) {
        return { ...DEFAULT_OPTIONS, ...JSON.parse(saved), overwriteFiles: false };
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
    text: "Ready — Paste link(s) and click Fetch or Start Download",
    status: "idle",
  });
  const [logs, setLogs] = useState<string[]>([]);

  const [tools, setTools] = useState<ToolVersionInfo[]>([
    {
      name: "yt-dlp",
      installedVersion: "Ready",
      latestVersion: "Up to date",
      hasUpdate: false,
    },
    {
      name: "Deno",
      installedVersion: "Ready",
      latestVersion: "Up to date",
      hasUpdate: false,
    },
    {
      name: "FFmpeg",
      installedVersion: "Ready",
      latestVersion: "Up to date",
      hasUpdate: false,
    },
  ]);
  const [checkingTools, setCheckingTools] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [appHasUpdate, setAppHasUpdate] = useState(false);
  const [latestAppVersion, setLatestAppVersion] = useState<string | undefined>(undefined);
  const [latestReleaseUrl, setLatestReleaseUrl] = useState<string>("");
  const [latestReleaseAssets, setLatestReleaseAssets] = useState<any[]>([]);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);

  const currentTaskIdRef = useRef<string | null>(null);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (options.theme === "Dark") {
      root.classList.add("dark");
    } else if (options.theme === "Light (White Neon)") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
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

  // Setup listeners and automatic update check on startup
  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenProgress = await listen<{
          taskId?: string;
          percent: number;
          text: string;
          speed: string;
          eta: string;
          status: string;
        }>("download-progress", (event) => {
          const p = event.payload;
          const targetTaskId = p.taskId || currentTaskIdRef.current;

          setTasks((prev) =>
            prev.map((t) =>
              t.id === targetTaskId
                ? {
                    ...t,
                    percent: p.percent,
                    speed: p.speed,
                    eta: p.eta,
                    progressText: p.text,
                    status: p.status === "completed" ? "completed" : "downloading",
                  }
                : t
            )
          );

          setProgress({
            percent: p.percent,
            text: p.text,
            speed: p.speed,
            eta: p.eta,
            status: (p.status as DownloadProgress["status"]) || "downloading",
          });
        });

        unlistenLog = await listen<string>("download-log", (event) => {
          setLogs((prev) => [...prev.slice(-120), event.payload]);
        });
      } catch {
        // Preview mode
      }
      // Android bridge callbacks
      (window as any).onAndroidProgress = (
        tid: string,
        percent: number,
        eta: number,
        line: string
      ) => {
        const p = Math.round(percent);
        setProgress({
          percent: p,
          text: line || `Downloading... ${p}%`,
          speed: "",
          eta: eta > 0 ? `${eta}s` : "",
          status: p >= 100 ? "completed" : "downloading",
        });

        const currentTid = currentTaskIdRef.current || tid;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTid
              ? {
                  ...t,
                  percent: p,
                  status: p >= 100 ? "completed" : "downloading",
                }
              : t
          )
        );
      };

      (window as any).onAndroidLog = (line: string) => {
        setLogs((prev) => [...prev.slice(-120), line]);
      };

      (window as any).onAndroidComplete = (
        tid: string,
        success: boolean,
        err: string | null
      ) => {
        setProgress({
          percent: success ? 100 : 0,
          text: success
            ? "✔ Download completed successfully to Downloads/GM-Downloader"
            : `❌ Download Failed: ${err}`,
          status: success ? "completed" : "error",
        });

        const currentTid = currentTaskIdRef.current || tid;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTid
              ? {
                  ...t,
                  percent: success ? 100 : t.percent,
                  status: success ? "completed" : "interrupted",
                  error: err || undefined,
                }
              : t
          )
        );
        currentTaskIdRef.current = null;
      };

      if ((window as any).GMAndroidBridge?.getDownloadPath?.()) {
        try {
          const androidPath = (window as any).GMAndroidBridge.getDownloadPath();
          if (androidPath) {
            setOptions((prev) => {
              if (!prev.saveFolder || prev.saveFolder.startsWith("D:\\") || prev.saveFolder.startsWith("C:\\")) {
                return { ...prev, saveFolder: androidPath };
              }
              return prev;
            });
          }
        } catch {
          // ignore
        }
      }

      // Handle folder chosen via native Android folder picker (SAF)
      (window as any).onAndroidFolderSelected = (folderPath: string) => {
        if (folderPath && typeof folderPath === "string") {
          const cleanPath = folderPath.trim();
          setOptions((prev) => ({ ...prev, saveFolder: cleanPath }));
          setProgress((prev) => ({
            ...prev,
            text: `Selected save folder: ${cleanPath}`,
          }));
        }
      };

      // Handle URLs shared from YouTube, browsers, or other apps
      (window as any).onAndroidSharedUrl = (sharedUrl: string) => {
        if (sharedUrl && typeof sharedUrl === "string") {
          const cleanUrl = sharedUrl.trim();
          setActiveTab("download");
          setOptions((prev) => ({ ...prev, url: cleanUrl }));
          setTimeout(() => {
            handleFetchInfo(cleanUrl);
          }, 200);
        }
      };

      if ((window as any).GMAndroidBridge?.getPendingSharedUrl) {
        try {
          const pending = (window as any).GMAndroidBridge.getPendingSharedUrl();
          if (pending) {
            (window as any).onAndroidSharedUrl(pending);
          }
        } catch {
          // ignore
        }
      }
    };

    setupListeners();
    handleCheckAllUpdates();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenLog) unlistenLog();
    };
  }, []);

  const handleCheckAllUpdates = async () => {
    if ((window as any).GMAndroidBridge?.isAndroidAvailable?.()) {
      setTools([
        {
          name: "yt-dlp",
          installedVersion: "v0.18.1 (Native Android)",
          latestVersion: "Up to date",
          hasUpdate: false,
        },
        {
          name: "Python",
          installedVersion: "v3.10 (Native Android)",
          latestVersion: "Up to date",
          hasUpdate: false,
        },
        {
          name: "FFmpeg",
          installedVersion: "v6.0-android",
          latestVersion: "Up to date",
          hasUpdate: false,
        },
      ]);
      setCheckingTools(false);
      return;
    }

    setCheckingTools(true);
    // 1. Check tools from backend
    try {
      const res = await invoke<ToolVersionInfo[]>("check_tool_updates");
      if (res && Array.isArray(res)) {
        setTools(res);
      }
    } catch {
      // ignore
    } finally {
      setCheckingTools(false);
    }

    // 2. Check PyPI & GitHub for App updates
    try {
      const ghRes = await fetch(
        "https://api.github.com/repos/golam-mowla/GM-Downloader/releases/latest"
      );
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        const tag = ghData.tag_name ? ghData.tag_name.replace("v", "") : "";
        setLatestReleaseUrl(ghData.html_url || "");
        setLatestReleaseAssets(Array.isArray(ghData.assets) ? ghData.assets : []);
        if (tag && tag !== CURRENT_APP_VERSION) {
          setAppHasUpdate(true);
          setLatestAppVersion(`v${tag}`);
        } else {
          setAppHasUpdate(false);
          setLatestAppVersion(`v${CURRENT_APP_VERSION}`);
        }
      }
    } catch {
      // ignore
    }
  };

  const handle1ClickAppUpdate = async () => {
    setIsUpdatingApp(true);
    try {
      const isAndroid = (window as any).GMAndroidBridge?.isAndroidAvailable?.();
      if (isAndroid) {
        const apkAsset =
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().includes("universal")
          ) ||
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().includes("arm64")
          ) ||
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().endsWith(".apk")
          );
        if (apkAsset?.browser_download_url) {
          window.open(apkAsset.browser_download_url, "_blank");
        } else {
          window.open(
            latestReleaseUrl ||
              "https://github.com/golam-mowla/GM-Downloader/releases/latest",
            "_blank"
          );
        }
        setIsUpdatingApp(false);
        return;
      }

      // PC (Windows / Linux / macOS)
      const ua = navigator.userAgent.toLowerCase();
      let targetAsset = null;
      if (ua.includes("win")) {
        targetAsset =
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().includes("setup.exe")
          ) ||
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().endsWith(".exe")
          );
      } else if (ua.includes("mac")) {
        targetAsset =
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().endsWith(".zip") ||
            a.name?.toLowerCase().endsWith(".dmg")
          );
      } else {
        targetAsset =
          latestReleaseAssets.find((a: any) =>
            a.name?.toLowerCase().endsWith(".appimage") ||
            a.name?.toLowerCase().endsWith(".deb")
          );
      }

      const downloadUrl =
        targetAsset?.browser_download_url ||
        `https://github.com/golam-mowla/GM-Downloader/releases/download/${latestAppVersion || "v" + CURRENT_APP_VERSION}/GM-Downloader-Setup.exe`;

      setProgress({
        percent: 60,
        text: `Downloading GM Downloader update (${latestAppVersion || "latest"})... Installer will launch automatically.`,
        status: "processing",
      });

      await invoke("install_app_update", { downloadUrl });
    } catch (err: any) {
      setIsUpdatingApp(false);
      const msg = typeof err === "string" ? err : err?.message || String(err);
      alert(`Update Error: ${msg}\nOpening GitHub releases page instead.`);
      window.open(
        latestReleaseUrl ||
          "https://github.com/golam-mowla/GM-Downloader/releases/latest",
        "_blank"
      );
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
      let msg = "";
      if ((window as any).GMAndroidBridge?.isAndroidAvailable?.()) {
        if (toolName.toLowerCase().includes("yt-dlp")) {
          msg = await new Promise<string>((resolve, reject) => {
            const cbId = "update_" + Date.now();
            (window as any).onAndroidUpdateResult = (
              id: string,
              success: boolean,
              resultMsg: string
            ) => {
              if (id === cbId) {
                if (success) resolve(resultMsg);
                else reject(new Error(resultMsg));
              }
            };
            (window as any).GMAndroidBridge.updateYtDlp(cbId);
          });
        } else {
          msg = `${toolName} is a pre-compiled native Android C/C++ engine — already active & up to date!`;
        }
      } else {
        msg = await invoke<string>("update_tool", { toolName });
      }

      setUpdateLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✔ ${msg}`,
      ]);
      setUpdateSuccess(msg);
      await handleCheckAllUpdates();
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

  const handleFetchInfo = async (overrideUrl?: string | any) => {
    const rawTarget = typeof overrideUrl === "string" ? overrideUrl : options.url;
    const url = (rawTarget || "").trim();
    if (!url) {
      setFetchError("Please enter or paste a video URL before fetching.");
      return;
    }
    if (typeof overrideUrl === "string") {
      setOptions((prev) => ({ ...prev, url }));
    }

    setIsFetching(true);
    setFetchError(null);
    setMediaInfo(null);
    setProgress({
      percent: 15,
      text: "Inspecting link & discovering available video/audio streams...",
      status: "fetching",
    });

    try {
      let info: MediaInfo;
      if ((window as any).GMAndroidBridge?.isAndroidAvailable?.()) {
        info = await new Promise<MediaInfo>((resolve, reject) => {
          const callbackId = "cb_" + Math.random().toString(36).slice(2);
          (window as any).onAndroidFetchSuccess = (cbId: string, raw: any) => {
            if (cbId === callbackId) {
              try {
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                resolve(parseRawYtdlJsonToMediaInfo(parsed));
              } catch (e: any) {
                reject(new Error("Failed to parse media metadata: " + (e?.message || e)));
              }
            }
          };
          (window as any).onAndroidFetchError = (cbId: string, err: string) => {
            if (cbId === callbackId) {
              reject(new Error(err));
            }
          };
          (window as any).GMAndroidBridge.fetchMediaInfo(url, callbackId);
        });
      } else {
        info = await invoke<MediaInfo>("fetch_media_info", {
          url,
          cookiesBrowser: options.cookiesBrowser,
          cookiesFile: options.cookiesFile,
          proxy: options.proxy,
          discoveryArgs: options.ytdlpDiscoveryArgs,
        });
      }

      setMediaInfo(info);

      setOptions((prev) => ({
        ...prev,
        customFilename: info.title,
        videoStreamId: "best",
        audioStreamId: "ba",
        subtitleLang:
          info.subtitles && info.subtitles.length > 0
            ? info.subtitles[0].code
            : prev.subtitleLang,
      }));

      setProgress({
        percent: 0,
        text: `✔ Fetched "${info.title}" (${info.videoStreams.length} Video, ${info.audioStreams.length} Audio, ${info.subtitles.length} Subs)`,
        status: "idle",
      });
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || String(err);
      setFetchError(errMsg);
      setProgress({
        percent: 0,
        text: `Fetch failed: ${errMsg.slice(0, 120)}`,
        status: "error",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleBrowseFolder = async () => {
    if ((window as any).GMAndroidBridge?.chooseFolder) {
      try {
        (window as any).GMAndroidBridge.chooseFolder();
        return;
      } catch {
        // ignore
      }
    }
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
    if ((window as any).GMAndroidBridge?.openFolder) {
      try {
        (window as any).GMAndroidBridge.openFolder(target);
        return;
      } catch {
        // ignore
      }
    }
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
      effectiveOptions.customFilename?.trim() ||
      mediaInfo?.title ||
      tasks.find((t) => t.id === existingTaskId)?.title ||
      url;

    const newTask: DownloadTask = {
      id: taskId,
      title: taskTitle,
      customFilename: effectiveOptions.customFilename?.trim(),
      url,
      thumbnail: mediaInfo?.thumbnail,
      container: effectiveOptions.container,
      qualityLabel: selectedVideoLabel.split("•")[0].trim(),
      saveFolder: effectiveOptions.saveFolder,
      percent: 2,
      status: "downloading",
      createdAt: Date.now(),
      options: { ...effectiveOptions, taskId, overwriteFiles: false },
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
      text: "Starting download engine (resuming from .part file if available)...",
      status: "downloading",
    });

    try {
      if ((window as any).GMAndroidBridge?.isAndroidAvailable?.()) {
        const formatSpec =
          effectiveOptions.downloadMode === "subtitles"
            ? ""
            : effectiveOptions.downloadMode === "audio"
            ? effectiveOptions.audioStreamId === "ba"
              ? "bestaudio"
              : effectiveOptions.audioStreamId
            : effectiveOptions.videoStreamId === "best"
            ? "bestvideo+bestaudio/best"
            : `${effectiveOptions.videoStreamId}+bestaudio/best`;

        (window as any).GMAndroidBridge.startDownload(
          taskId,
          effectiveOptions.url,
          formatSpec,
          effectiveOptions.container,
          effectiveOptions.enableClip,
          effectiveOptions.startTime,
          effectiveOptions.endTime,
          effectiveOptions.enableSubtitles,
          effectiveOptions.subtitleLang,
          effectiveOptions.saveFolder,
          effectiveOptions.customFilename?.trim() || ""
        );
      } else {
        await invoke<string>("start_download", {
          options: { ...effectiveOptions, taskId, overwriteFiles: false },
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
      }
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || String(err);
      const isPaused =
        msg.toLowerCase().includes("paused") || msg.toLowerCase().includes("cancelled");

      setProgress({
        percent: 0,
        text: isPaused
          ? "⏸ Download Paused — Partial .part file preserved for instant resume"
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
      if (currentTaskIdRef.current === taskId) {
        currentTaskIdRef.current = null;
      }
    }
  };

  const handleStartDownload = (overrideMode?: DownloadMode | any) => {
    const validMode: DownloadMode | undefined =
      overrideMode === "video" || overrideMode === "audio" || overrideMode === "subtitles"
        ? overrideMode
        : undefined;

    const effectiveOptions: DownloadOptions = validMode
      ? {
          ...options,
          downloadMode: validMode,
          enableSubtitles: validMode === "subtitles" ? true : options.enableSubtitles,
        }
      : options;

    runDownloadWithOptions(effectiveOptions);
  };

  // MULTIPLE FILE / BATCH DOWNLOAD HANDLER
  const handleStartBatchDownload = async (
    urls: string[],
    batchOpts: Partial<DownloadOptions>
  ) => {
    setActiveTab("history");

    const newTasks: DownloadTask[] = urls.map((url, idx) => ({
      id: `batch_${Date.now()}_${idx}`,
      title: `Batch Item: ${url}`,
      url,
      container: batchOpts.container || options.container,
      qualityLabel: "Batch Quality",
      saveFolder: options.saveFolder,
      percent: 0,
      status: "paused",
      createdAt: Date.now() + idx,
      options: {
        ...options,
        ...batchOpts,
        url,
        overwriteFiles: false,
      },
    }));

    setTasks((prev) => [...newTasks, ...prev]);

    // Sequentially start downloading each batch task
    for (const task of newTasks) {
      await runDownloadWithOptions(task.options, task.id);
    }
  };

  const handleCancelDownload = async (taskId?: string) => {
    try {
      if ((window as any).GMAndroidBridge?.isAndroidAvailable?.()) {
        const targetId = taskId || currentTaskIdRef.current;
        if (targetId) {
          (window as any).GMAndroidBridge.cancelDownload(targetId);
        }
      } else {
        await invoke("cancel_download", { taskId: taskId || null });
      }
    } catch {
      // ignore
    }
  };

  const handleResumeTask = (task: DownloadTask) => {
    runDownloadWithOptions(task.options, task.id);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => t.status !== "completed"));
  };

  const activeOrPausedCount = tasks.filter(
    (t) =>
      t.status === "downloading" ||
      t.status === "paused" ||
      t.status === "interrupted"
  ).length;

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-6">
      {/* Top Header with Full Parrot Icon, Update Pill, + Add Button and Help Menu */}
      <Header
        tools={tools}
        appHasUpdate={appHasUpdate}
        latestAppVersion={latestAppVersion}
        onOpenUpdates={() => setActiveTab("updates")}
        onAddNewDownload={() => {
          setActiveTab("download");
          setOptions((prev) => ({ ...prev, url: "" }));
          setMediaInfo(null);
          setFetchError(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("download")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
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
            onClick={() => setActiveTab("batch")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
              activeTab === "batch"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <Layers className="w-4 h-4" />
            Batch / Multi-Download
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
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
            onClick={() => setActiveTab("options")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
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
            onClick={() => setActiveTab("updates")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
              activeTab === "updates"
                ? "neon-btn-primary"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Tool Updater
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === "download" && (
          <DownloadTab
            options={options}
            setOptions={setOptions}
            mediaInfo={mediaInfo}
            isFetching={isFetching}
            fetchError={fetchError}
            onFetchInfo={() => handleFetchInfo()}
            onBrowseFolder={handleBrowseFolder}
            onOpenFolder={() => handleOpenFolder()}
            onStartDownload={(mode) => handleStartDownload(mode)}
            onCancelDownload={handleCancelDownload}
            onResumeTask={handleResumeTask}
            tasks={tasks}
            progress={progress}
            logs={logs}
          />
        )}

        {activeTab === "batch" && (
          <BatchTab
            options={options}
            onBrowseFolder={handleBrowseFolder}
            onOpenFolder={() => handleOpenFolder()}
            onStartBatchDownload={handleStartBatchDownload}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            tasks={tasks}
            onResumeTask={handleResumeTask}
            onPauseTask={(id) => handleCancelDownload(id)}
            onDeleteTask={handleDeleteTask}
            onClearCompleted={handleClearCompleted}
            onOpenFolder={(p) => handleOpenFolder(p)}
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

        {activeTab === "updates" && (
          <UpdatesTab
            tools={tools}
            checking={checkingTools}
            onCheckUpdates={handleCheckAllUpdates}
            onUpdateTool={handleUpdateTool}
            onUpdateAll={handleUpdateAllTools}
            updateLogs={updateLogs}
            successMessage={updateSuccess}
            appHasUpdate={appHasUpdate}
            latestAppVersion={latestAppVersion}
            isUpdatingApp={isUpdatingApp}
            on1ClickAppUpdate={handle1ClickAppUpdate}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Fits smartphone displays perfectly) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-1 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("download")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-black transition-colors ${
            activeTab === "download"
              ? "text-cyan-600 dark:text-cyan-400"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Download className="w-4 h-4 mb-0.5" />
          Single
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-black transition-colors ${
            activeTab === "batch"
              ? "text-cyan-600 dark:text-cyan-400"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          Batch
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-black transition-colors relative ${
            activeTab === "history"
              ? "text-cyan-600 dark:text-cyan-400"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4 mb-0.5" />
          Queue
          {activeOrPausedCount > 0 && (
            <span className="absolute top-0 right-1 px-1 text-[9px] rounded-full bg-amber-400 text-slate-950 font-black">
              {activeOrPausedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("options")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-black transition-colors ${
            activeTab === "options"
              ? "text-cyan-600 dark:text-cyan-400"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          Options
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("updates")}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-black transition-colors ${
            activeTab === "updates"
              ? "text-cyan-600 dark:text-cyan-400"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <RefreshCw className="w-4 h-4 mb-0.5" />
          Updates
        </button>
      </nav>
    </div>
  );
}

export default App;
