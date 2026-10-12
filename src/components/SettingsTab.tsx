import React from "react";
import { DownloadOptions } from "../types";
import { Subtitles, Tag, Zap, Shield, Save } from "lucide-react";

interface SettingsTabProps {
  options: DownloadOptions;
  setOptions: React.Dispatch<React.SetStateAction<DownloadOptions>>;
  onSavePreferences: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  options,
  setOptions,
  onSavePreferences,
}) => {
  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* 1. Subtitles & Captions */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Subtitles className="w-4 h-4 text-primary" />
          <span>Subtitles & Captions (Parabolic Feature)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.downloadSubtitles}
              onChange={(e) => setOptions({ ...options, downloadSubtitles: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Download Subtitles</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.embedSubtitles}
              onChange={(e) => setOptions({ ...options, embedSubtitles: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Embed Subtitles into Video Container</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.autoSubtitles}
              onChange={(e) => setOptions({ ...options, autoSubtitles: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Include Auto-Generated Subtitles</span>
          </label>
        </div>
        <div className="pt-1">
          <label className="text-xs text-muted-foreground font-medium block mb-1">
            Languages (comma separated, e.g. en,bn,all):
          </label>
          <input
            type="text"
            value={options.subtitleLanguages}
            onChange={(e) => setOptions({ ...options, subtitleLanguages: e.target.value })}
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="en,bn,all"
          />
        </div>
      </div>

      {/* 2. Metadata & Cover Art */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Tag className="w-4 h-4 text-primary" />
          <span>Metadata & Post-Processing (Parabolic Feature)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.embedMetadata}
              onChange={(e) => setOptions({ ...options, embedMetadata: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Embed Metadata (Title, Artist, Chapters, Tags)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.embedThumbnail}
              onChange={(e) => setOptions({ ...options, embedThumbnail: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Embed Thumbnail / Album Art</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.cropThumbnail}
              onChange={(e) => setOptions({ ...options, cropThumbnail: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Crop Thumbnail to Square (Recommended for Audio)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.splitChapters}
              onChange={(e) => setOptions({ ...options, splitChapters: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Split Video by Chapters (Separate Output Files)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={options.sponsorBlock}
              onChange={(e) => setOptions({ ...options, sponsorBlock: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>SponsorBlock (Remove Sponsors, Intros, Outros)</span>
          </label>
        </div>
      </div>

      {/* 3. Downloader Engine & Performance */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Zap className="w-4 h-4 text-primary" />
          <span>Downloader Backend & Performance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Downloader Engine</label>
            <select
              value={options.downloader}
              onChange={(e) => setOptions({ ...options, downloader: e.target.value as any })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              <option value="Native">yt-dlp Native Downloader</option>
              <option value="Aria2c">Aria2c (Multi-Connection Accelerator)</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Aria2 Connections</label>
            <input
              type="text"
              value={options.aria2Connections}
              onChange={(e) => setOptions({ ...options, aria2Connections: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
              placeholder="16"
            />
          </div>
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Speed Limit (KB/s, 0 = unlimited)</label>
            <input
              type="text"
              value={options.speedLimitKb}
              onChange={(e) => setOptions({ ...options, speedLimitKb: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
              placeholder="0"
            />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={options.overwriteFiles}
                onChange={(e) => setOptions({ ...options, overwriteFiles: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Overwrite Existing Output Files</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Authentication & Network */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Shield className="w-4 h-4 text-primary" />
          <span>Cookies, Authentication & Proxy</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Import Cookies from Browser</label>
            <select
              value={options.cookiesBrowser}
              onChange={(e) => setOptions({ ...options, cookiesBrowser: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              <option value="None">None (Default)</option>
              <option value="Chrome">Google Chrome</option>
              <option value="Edge">Microsoft Edge</option>
              <option value="Firefox">Mozilla Firefox</option>
              <option value="Brave">Brave Browser</option>
              <option value="Opera">Opera</option>
              <option value="Vivaldi">Vivaldi</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground font-medium block mb-1">Or Cookies File (.txt)</label>
            <input
              type="text"
              value={options.cookiesFile}
              onChange={(e) => setOptions({ ...options, cookiesFile: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
              placeholder="Path to cookies.txt"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-muted-foreground font-medium block mb-1">HTTP / SOCKS Proxy URL</label>
            <input
              type="text"
              value={options.proxy}
              onChange={(e) => setOptions({ ...options, proxy: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
              placeholder="e.g. socks5://127.0.0.1:1080"
            />
          </div>
        </div>
      </div>

      {/* Save Preferences Button */}
      <div className="text-center pt-2">
        <button
          onClick={onSavePreferences}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md flex items-center gap-2 mx-auto transition-all"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
};
