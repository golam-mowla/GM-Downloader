export interface MediaStream {
  id: string;
  label: string;
  height?: number;
  fps?: number;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  hasAudio?: boolean;
}

export interface SubtitleTrack {
  code: string;
  name: string;
  isAuto: boolean;
}

export interface MediaInfo {
  id?: string;
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  videoStreams: MediaStream[];
  audioStreams: MediaStream[];
  subtitles: SubtitleTrack[];
}

export type DownloadMode = "video" | "audio" | "subtitles";

export type ContainerFormat =
  | "Video (Generic)"
  | "MP4 (Video)"
  | "WEBM (Video)"
  | "MKV (Video)"
  | "MOV (Video)"
  | "AVI (Video)"
  | "Audio (Generic)"
  | "MP3 (Audio)"
  | "M4A (Audio)"
  | "OPUS (Audio)"
  | "FLAC (Audio)"
  | "WAV (Audio)"
  | "OGG (Audio)";

export const ALL_CONTAINERS: ContainerFormat[] = [
  "Video (Generic)",
  "MP4 (Video)",
  "WEBM (Video)",
  "MKV (Video)",
  "MOV (Video)",
  "AVI (Video)",
  "Audio (Generic)",
  "MP3 (Audio)",
  "M4A (Audio)",
  "OPUS (Audio)",
  "FLAC (Audio)",
  "WAV (Audio)",
  "OGG (Audio)",
];

export interface DownloadOptions {
  taskId?: string;
  url: string;
  saveFolder: string;
  downloadMode: DownloadMode;
  container: ContainerFormat;
  videoStreamId: string;
  audioStreamId: string;
  audioBitrate: string;

  // Subtitle Section
  enableSubtitles: boolean;
  subtitleLang: string;
  subtitleFormat: "srt" | "vtt" | "ass" | "lrc" | "any";
  subtitleSaveMode: "separate" | "embed" | "both";

  // Timeframe / Clip Section
  enableClip: boolean;
  startTime: string;
  endTime: string;
  preciseCut: boolean;

  // Parabolic Options - UI
  theme: "Light (White Neon)" | "System" | "Dark";
  translationLanguage: string;
  receivePreviewUpdates: boolean;
  preventSuspend: boolean;
  historyLength: string;

  // Parabolic Options - Downloads
  maxActiveDownloads: number;
  overwriteFiles: boolean;
  includeMediaId: boolean;
  includeAutoSubtitles: boolean;
  includeSuperRes: boolean;
  preferredVideoCodec: string;
  preferredAudioCodec: string;
  preferredSubtitleFormat: string;
  preferredFps: string;

  // Parabolic Options - Downloader
  usePartFiles: boolean;
  sponsorBlock: boolean;
  limitSpeed: boolean;
  speedLimitKb: number;
  proxy: string;
  cookiesFile: string;
  cookiesBrowser: string;
  useAria2c: boolean;
  aria2Connections: number;
  ytdlpDiscoveryArgs: string;
  ytdlpDownloadArgs: string;

  // Parabolic Options - Converter
  translateMetadata: boolean;
  embedMetadata: boolean;
  embedThumbnails: boolean;
  cropAudioThumbnails: boolean;
  embedChapters: boolean;
  splitChapters: boolean;
  embedSubtitlesGlobal: boolean;
  ffmpegThreads: number;
  postProcessorArgs: string;
}

export interface DownloadProgress {
  percent: number;
  text: string;
  speed?: string;
  eta?: string;
  status:
    | "idle"
    | "fetching"
    | "downloading"
    | "processing"
    | "paused"
    | "interrupted"
    | "completed"
    | "error"
    | "cancelled";
}

export interface DownloadTask {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  container: string;
  qualityLabel: string;
  saveFolder: string;
  percent: number;
  speed?: string;
  eta?: string;
  progressText?: string;
  status: "completed" | "downloading" | "paused" | "interrupted" | "error";
  error?: string;
  createdAt: number;
  options: DownloadOptions;
}

export interface ToolVersionInfo {
  name: string;
  installedVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  isUpdating?: boolean;
}
