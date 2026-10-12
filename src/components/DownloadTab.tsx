import React, { useState, useEffect } from "react";
import {
  Download,
  Scissors,
  FolderOpen,
  Clipboard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Music,
  Video,
  StopCircle,
} from "lucide-react";
import { DownloadOptions, MediaInfo, DownloadProgress } from "../types";
import { formatTime, parseTimeToSeconds } from "../lib/utils";

interface DownloadTabProps {
  options: DownloadOptions;
  setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>>;
  mediaInfo: MediaInfo | null;
  fetching: boolean;
  onFetchInfo: (url: string) => void;
  onStartDownload: () => void;
  onCancelDownload: () => void;
  onBrowseFolder: () => void;
  onOpenFolder: () => void;
  progress: DownloadProgress;
}

export const DownloadTab: React.FC<DownloadTabProps> = ({
  options,
  setOptions,
  mediaInfo,
  fetching,
  onFetchInfo,
  onStartDownload,
  onCancelDownload,
  onBrowseFolder,
  onOpenFolder,
  progress,
}) => {
  const [showAdvStreams, setShowAdvStreams] = useState(false);

  // Update clip end time when duration is detected
  useEffect(() => {
    if (mediaInfo?.duration && (!options.endTime || options.endTime === "00:01:00")) {
      setOptions((prev) => ({
        ...prev,
        endTime: formatTime(mediaInfo.duration),
      }));
    }
  }, [mediaInfo?.duration]);

  // Handle URL paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setOptions((prev) => ({ ...prev, url: text.trim() }));
        onFetchInfo(text.trim());
      }
    } catch {
      // ignore
    }
  };

  // Calculate selected clip duration
  const startSec = parseTimeToSeconds(options.startTime || "00:00:00");
  const endSec = parseTimeToSeconds(options.endTime || "00:00:00");
  const clipDuration = Math.max(0, endSec - startSec);

  const isDownloading = progress.status === "downloading" || progress.status === "processing";

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* 1. URL Input Card */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-primary" />
          <span>Media URL</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={options.url}
            onChange={(e) => setOptions({ ...options, url: e.target.value })}
            placeholder="Paste YouTube, Facebook, TikTok, Instagram, Twitter, or web media URL..."
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && onFetchInfo(options.url)}
          />
          <button
            onClick={handlePaste}
            className="px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>
          <button
            onClick={() => onFetchInfo(options.url)}
            disabled={fetching || !options.url.trim()}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {fetching ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>{fetching ? "Fetching..." : "Fetch Info"}</span>
          </button>
        </div>
      </div>

      {/* 2. Media Preview Card */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4 transition-all">
        <div className="w-24 h-16 rounded-lg bg-secondary border border-border overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-inner">
          {mediaInfo?.thumbnail ? (
            <img
              src={mediaInfo.thumbnail}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <Video className="w-8 h-8 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate text-foreground">
            {mediaInfo ? mediaInfo.title : "No URL loaded yet. Paste a link to auto-detect."}
          </h2>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration: {mediaInfo?.duration ? formatTime(mediaInfo.duration) : "--:--:--"}
            </span>
            {mediaInfo?.uploader && (
              <span>• Channel: {mediaInfo.uploader}</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Format & Quality Card */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Media Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Media Type</label>
            <div className="flex rounded-lg bg-secondary/60 p-1 border border-border">
              <button
                type="button"
                onClick={() => setOptions({ ...options, mediaType: "Video", format: "MP4" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  options.mediaType === "Video"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setOptions({ ...options, mediaType: "Audio", format: "MP3" })}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  options.mediaType === "Audio"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Audio
              </button>
            </div>
          </div>

          {/* Container Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Container Format</label>
            <select
              value={options.format}
              onChange={(e) => setOptions({ ...options, format: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {options.mediaType === "Video" ? (
                <>
                  <option value="MP4">MP4 (Default, High Compatibility)</option>
                  <option value="MKV">MKV (Matroska, Subtitle Friendly)</option>
                  <option value="WebM">WebM (Open Web Video)</option>
                </>
              ) : (
                <>
                  <option value="MP3">MP3 (Universal Audio)</option>
                  <option value="M4A">M4A (High Efficiency AAC)</option>
                  <option value="OPUS">OPUS (Modern Low-Bitrate Voice/Music)</option>
                  <option value="FLAC">FLAC (Lossless Studio Quality)</option>
                  <option value="WAV">WAV (Uncompressed Raw PCM)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Quality Preset */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Quality Preset</label>
          <select
            value={options.quality}
            onChange={(e) => setOptions({ ...options, quality: e.target.value })}
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {options.mediaType === "Video" ? (
              <>
                <option value="Best">Best Quality Available</option>
                <option value="4K (2160p)">4K UHD (2160p)</option>
                <option value="1440p (2K)">2K QHD (1440p)</option>
                <option value="1080p (FHD)">Full HD (1080p)</option>
                <option value="720p (HD)">HD (720p)</option>
                <option value="480p (SD)">SD (480p)</option>
                <option value="360p">Low (360p)</option>
              </>
            ) : (
              <>
                <option value="Best">Best (VBR 0 / Lossless)</option>
                <option value="320k">320 kbps (Extreme Quality)</option>
                <option value="256k">256 kbps (High Quality)</option>
                <option value="192k">192 kbps (Standard Quality)</option>
                <option value="128k">128 kbps (Compact Size)</option>
              </>
            )}
          </select>
        </div>

        {/* Advanced Stream Selector Toggle */}
        <div className="pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={showAdvStreams}
              onChange={(e) => setShowAdvStreams(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Show Advanced Stream Selector (Specific Codec & Stream ID)</span>
          </label>

          {showAdvStreams && (
            <div className="mt-3 p-3 bg-secondary/30 rounded-lg border border-border/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-muted-foreground font-medium block mb-1">Video Stream</label>
                <select
                  value={options.customVid || ""}
                  onChange={(e) => setOptions({ ...options, customVid: e.target.value })}
                  className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs"
                >
                  <option value="">Auto (Best matched)</option>
                  {mediaInfo?.videoStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted-foreground font-medium block mb-1">Audio Stream</label>
                <select
                  value={options.customAud || ""}
                  onChange={(e) => setOptions({ ...options, customAud: e.target.value })}
                  className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs"
                >
                  <option value="">Auto (Best matched)</option>
                  {mediaInfo?.audioStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Timeframe / Clip Card (HIGHLIGHTED FEATURE) */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Download Specific Timeframe (Clip Range)
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={options.enableClip}
              onChange={(e) => setOptions({ ...options, enableClip: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {options.enableClip ? (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start Timestamp</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={options.startTime}
                    onChange={(e) => setOptions({ ...options, startTime: e.target.value })}
                    placeholder="00:00:00"
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setOptions({ ...options, startTime: "00:00:00" })}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-mono hover:bg-secondary/80 border border-border"
                  >
                    00:00:00
                  </button>
                </div>
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">End Timestamp</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={options.endTime}
                    onChange={(e) => setOptions({ ...options, endTime: e.target.value })}
                    placeholder="00:01:00"
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaInfo?.duration) {
                        setOptions({ ...options, endTime: formatTime(mediaInfo.duration) });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs hover:bg-secondary/80 border border-border"
                  >
                    Full End
                  </button>
                </div>
              </div>
            </div>

            {/* Clip Duration Summary Badge & Precise Re-encode */}
            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/50 text-xs gap-2">
              <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Clip Duration: {formatTime(clipDuration)} ({clipDuration}s)
              </span>

              <label className="inline-flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={options.preciseCut}
                  onChange={(e) => setOptions({ ...options, preciseCut: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Precise Cut (Re-encode for frame-accurate cuts)</span>
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Full media will be downloaded without any timeframe cut. Enable the toggle above to clip a specific part.
          </p>
        )}
      </div>

      {/* 5. Save Folder Row */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Save Location</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={options.saveFolder}
            onChange={(e) => setOptions({ ...options, saveFolder: e.target.value })}
            className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={onBrowseFolder}
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Browse</span>
          </button>
          <button
            onClick={onOpenFolder}
            className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <span>Open Folder</span>
          </button>
        </div>
      </div>

      {/* 6. Progress Card */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-foreground">{progress.text || "Ready to download"}</span>
          <span className="text-primary font-bold">{progress.percent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
      </div>

      {/* 7. Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onStartDownload}
          disabled={isDownloading || !options.url.trim()}
          className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isDownloading ? "Downloading..." : "Start Download"}</span>
        </button>

        {isDownloading && (
          <button
            onClick={onCancelDownload}
            className="py-3 px-6 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/25 flex items-center justify-center gap-2 transition-all"
          >
            <StopCircle className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};
