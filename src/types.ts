export interface MediaStream {
  id: string;
  label: string;
  height?: number;
  fps?: number;
  ext?: string;
  size?: string;
  hasAudio?: boolean;
}

export interface MediaInfo {
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  formats?: any[];
  videoStreams: MediaStream[];
  audioStreams: MediaStream[];
}

export interface DownloadOptions {
  url: string;
  saveFolder: string;
  mediaType: "Video" | "Audio";
  format: string; // MP4, MKV, WebM, MP3, M4A, OPUS, FLAC, WAV
  quality: string; // Best, 4K, 1080p, 720p, etc.
  customVid?: string;
  customAud?: string;
  
  // Timeframe / Clip Section
  enableClip: boolean;
  startTime: string;
  endTime: string;
  preciseCut: boolean;

  // Parabolic Options
  downloadSubtitles: boolean;
  embedSubtitles: boolean;
  autoSubtitles: boolean;
  subtitleLanguages: string;

  embedMetadata: boolean;
  embedThumbnail: boolean;
  cropThumbnail: boolean;
  splitChapters: boolean;
  sponsorBlock: boolean;

  downloader: "Native" | "Aria2c";
  aria2Connections: string;
  speedLimitKb: string;
  overwriteFiles: boolean;

  cookiesBrowser: string; // None, Chrome, Edge, Firefox, Brave, Opera
  cookiesFile: string;
  proxy: string;
}

export interface DownloadProgress {
  percent: number;
  text: string;
  speed?: string;
  eta?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  status: "idle" | "fetching" | "downloading" | "processing" | "completed" | "error" | "cancelled";
}

export interface ToolVersionInfo {
  name: string;
  installedVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  isUpdating?: boolean;
}
