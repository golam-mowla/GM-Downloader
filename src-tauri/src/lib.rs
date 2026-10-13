use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Emitter, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct DownloadState {
    pub active_pid: Arc<Mutex<Option<u32>>>,
    pub cancelled: Arc<Mutex<bool>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaStream {
    pub id: String,
    pub label: String,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub ext: Option<String>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub filesize: Option<u64>,
    #[serde(rename = "hasAudio")]
    pub has_audio: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleTrack {
    pub code: String,
    pub name: String,
    #[serde(rename = "isAuto")]
    pub is_auto: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    pub id: Option<String>,
    pub title: String,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    #[serde(rename = "videoStreams")]
    pub video_streams: Vec<MediaStream>,
    #[serde(rename = "audioStreams")]
    pub audio_streams: Vec<MediaStream>,
    pub subtitles: Vec<SubtitleTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadOptions {
    pub url: String,
    pub save_folder: String,
    pub download_mode: String, // "video" | "audio" | "subtitles"
    pub container: String,     // "Video (Generic)", "MP4 (Video)", "WEBM (Video)", "MKV (Video)", "MOV (Video)", "AVI (Video)", "Audio (Generic)", "MP3 (Audio)", "M4A (Audio)", "OPUS (Audio)", "FLAC (Audio)", "WAV (Audio)", "OGG (Audio)"
    pub video_stream_id: String,
    pub audio_stream_id: String,
    pub audio_bitrate: String,

    // Subtitle Section
    pub enable_subtitles: bool,
    pub subtitle_lang: String,
    pub subtitle_format: String, // "srt" | "vtt" | "ass" | "lrc"
    pub subtitle_save_mode: String, // "separate" | "embed" | "both"

    // Clip Section
    pub enable_clip: bool,
    pub start_time: String,
    pub end_time: String,
    pub precise_cut: bool,

    // Parabolic Options - UI & Downloads
    pub max_active_downloads: u32,
    pub overwrite_files: bool,
    pub include_media_id: bool,
    pub include_auto_subtitles: bool,
    pub include_super_res: bool,
    pub preferred_video_codec: String,
    pub preferred_audio_codec: String,
    pub preferred_subtitle_format: String,
    pub preferred_fps: String,

    // Parabolic Options - Downloader
    pub use_part_files: bool,
    pub sponsor_block: bool,
    pub limit_speed: bool,
    pub speed_limit_kb: u32,
    pub proxy: String,
    pub cookies_file: String,
    pub cookies_browser: String,
    pub use_aria2c: bool,
    pub aria2_connections: u32,
    pub ytdlp_discovery_args: String,
    pub ytdlp_download_args: String,

    // Parabolic Options - Converter
    pub translate_metadata: bool,
    pub embed_metadata: bool,
    pub embed_thumbnails: bool,
    pub crop_audio_thumbnails: bool,
    pub embed_chapters: bool,
    pub split_chapters: bool,
    pub embed_subtitles_global: bool,
    pub ffmpeg_threads: u32,
    pub post_processor_args: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub percent: f64,
    pub text: String,
    pub speed: String,
    pub eta: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub name: String,
    pub installed_version: String,
    pub latest_version: String,
    pub has_update: bool,
}

// ---------------------------------------------------------------------------
// Cross-Platform Binary & PATH Discovery (Fixes Windows GUI PATH issues)
// ---------------------------------------------------------------------------

fn get_augmented_path() -> String {
    let current_path = env::var("PATH").unwrap_or_default();
    let mut extra_dirs: Vec<PathBuf> = Vec::new();

    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let local = PathBuf::from(&local_app_data);
        // WinGet Links
        let winget_links = local.join("Microsoft").join("WinGet").join("Links");
        if winget_links.exists() {
            extra_dirs.push(winget_links);
        }

        // WinGet Packages (FFmpeg, Deno, aria2, yt-dlp)
        let winget_pkgs = local.join("Microsoft").join("WinGet").join("Packages");
        if let Ok(entries) = fs::read_dir(&winget_pkgs) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    extra_dirs.push(p.clone());
                    if let Ok(sub_entries) = fs::read_dir(&p) {
                        for sub in sub_entries.flatten() {
                            let sp = sub.path();
                            if sp.is_dir() {
                                extra_dirs.push(sp.clone());
                                let bin_dir = sp.join("bin");
                                if bin_dir.exists() {
                                    extra_dirs.push(bin_dir);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Python Scripts directories
        let py_root = local.join("Programs").join("Python");
        if let Ok(entries) = fs::read_dir(&py_root) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    let scripts = p.join("Scripts");
                    if scripts.exists() {
                        extra_dirs.push(scripts);
                    }
                    extra_dirs.push(p);
                }
            }
        }
    }

    if let Ok(user_profile) = env::var("USERPROFILE").or_else(|_| env::var("HOME")) {
        let home = PathBuf::from(&user_profile);
        let deno_bin = home.join(".deno").join("bin");
        if deno_bin.exists() {
            extra_dirs.push(deno_bin);
        }
        let local_bin = home.join(".local").join("bin");
        if local_bin.exists() {
            extra_dirs.push(local_bin);
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        extra_dirs.push(PathBuf::from("/opt/homebrew/bin"));
        extra_dirs.push(PathBuf::from("/usr/local/bin"));
        extra_dirs.push(PathBuf::from("/usr/bin"));
    }

    let sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let mut parts: Vec<String> = extra_dirs
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    parts.push(current_path);
    parts.join(sep)
}

fn find_exe_in_augmented_path(bin_name: &str) -> Option<PathBuf> {
    let aug_path = get_augmented_path();
    let sep = if cfg!(target_os = "windows") { ';' } else { ':' };
    let exts = if cfg!(target_os = "windows") {
        vec![".exe", ".cmd", ".bat", ""]
    } else {
        vec![""]
    };

    for dir in aug_path.split(sep) {
        if dir.trim().is_empty() {
            continue;
        }
        let base = PathBuf::from(dir);
        for ext in &exts {
            let candidate = base.join(format!("{}{}", bin_name, ext));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn make_command(bin_name: &str) -> Command {
    let resolved = find_exe_in_augmented_path(bin_name)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| bin_name.to_string());

    let mut cmd = Command::new(resolved);
    cmd.env("PATH", get_augmented_path());
    cmd.env("PYTHONIOENCODING", "utf-8");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd
}

fn short_codec(c: &str) -> String {
    let cl = c.to_lowercase();
    if cl.starts_with("avc1") || cl.starts_with("h264") {
        "H.264".to_string()
    } else if cl.starts_with("vp09") || cl.starts_with("vp9") {
        "VP9".to_string()
    } else if cl.starts_with("av01") {
        "AV1".to_string()
    } else if cl.starts_with("hev1") || cl.starts_with("hvc1") {
        "H.265".to_string()
    } else if cl.starts_with("mp4a") {
        "AAC".to_string()
    } else if cl.starts_with("opus") {
        "OPUS".to_string()
    } else if cl.starts_with("vorbis") {
        "OGG".to_string()
    } else {
        c.split('.').next().unwrap_or("?").to_uppercase()
    }
}

fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "Size N/A".to_string();
    }
    let mib = bytes as f64 / (1024.0 * 1024.0);
    if mib >= 1024.0 {
        format!("{:.2} GiB", mib / 1024.0)
    } else {
        format!("{:.1} MiB", mib)
    }
}

// ---------------------------------------------------------------------------
// Command 1: Fetch Media Info (Dynamic Qualities, Formats, Subtitles)
// ---------------------------------------------------------------------------

#[command]
async fn fetch_media_info(
    url: String,
    cookies_browser: Option<String>,
    cookies_file: Option<String>,
    proxy: Option<String>,
    discovery_args: Option<String>,
) -> Result<MediaInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = make_command("yt-dlp");
        cmd.args([
            "--dump-single-json",
            "--no-playlist",
            "--no-warnings",
            "--quiet",
        ]);

        // Pass Deno JS runtime if available
        if find_exe_in_augmented_path("deno").is_some() {
            cmd.args(["--js-runtimes", "deno"]);
        }

        if let Some(cb) = cookies_browser {
            if cb != "None" && !cb.trim().is_empty() {
                cmd.args(["--cookies-from-browser", &cb.to_lowercase()]);
            }
        }
        if let Some(cf) = cookies_file {
            if !cf.trim().is_empty() && PathBuf::from(&cf).exists() {
                cmd.args(["--cookies", &cf]);
            }
        }
        if let Some(pr) = proxy {
            if !pr.trim().is_empty() {
                cmd.args(["--proxy", pr.trim()]);
            }
        }
        if let Some(extra) = discovery_args {
            for arg in extra.split_whitespace() {
                if !arg.is_empty() {
                    cmd.arg(arg);
                }
            }
        }

        cmd.arg(url.trim());

        let output = cmd
            .output()
            .map_err(|e| format!("Could not launch yt-dlp: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp failed to fetch URL: {}", err.trim()));
        }

        let stdout_str = String::from_utf8_lossy(&output.stdout);
        // Find JSON line in case any notice was printed before it
        let json_line = stdout_str
            .lines()
            .rev()
            .find(|l| l.trim_start().starts_with('{'))
            .unwrap_or(&stdout_str);

        let v: serde_json::Value = serde_json::from_str(json_line)
            .map_err(|e| format!("Failed to parse media JSON: {}", e))?;

        let id = v["id"].as_str().map(|s| s.to_string());
        let title = v["title"].as_str().unwrap_or("Untitled Media").to_string();
        let uploader = v["uploader"]
            .as_str()
            .or_else(|| v["channel"].as_str())
            .map(|s| s.to_string());
        let duration = v["duration"].as_f64();
        let thumbnail = v["thumbnail"].as_str().map(|s| s.to_string());

        let mut video_raw: Vec<(u32, u32, u64, MediaStream)> = Vec::new();
        let mut audio_raw: Vec<(u32, u64, MediaStream)> = Vec::new();

        if let Some(formats) = v["formats"].as_array() {
            for f in formats {
                let fid = f["format_id"].as_str().unwrap_or("").to_string();
                let ext = f["ext"].as_str().unwrap_or("").to_string();
                let format_note = f["format_note"].as_str().unwrap_or("");
                if format_note == "storyboard" || ext == "mhtml" {
                    continue;
                }

                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                let size = f["filesize"]
                    .as_u64()
                    .or_else(|| f["filesize_approx"].as_u64())
                    .unwrap_or(0);

                if vcodec != "none" {
                    let h = f["height"].as_u64().unwrap_or(0) as u32;
                    let w = f["width"].as_u64().unwrap_or(0) as u32;
                    let fps = f["fps"].as_f64().unwrap_or(0.0).round() as u32;
                    let tbr = f["tbr"].as_f64().unwrap_or(0.0).round() as u64;
                    let has_audio = acodec != "none";
                    let res_tag = if h >= 2160 {
                        format!("{}p (4K UHD)", h)
                    } else if h >= 1440 {
                        format!("{}p (2K QHD)", h)
                    } else if h >= 1080 {
                        format!("{}p (Full HD)", h)
                    } else if h >= 720 {
                        format!("{}p (HD)", h)
                    } else if h > 0 {
                        format!("{}p", h)
                    } else if w > 0 {
                        format!("{}x{}", w, h)
                    } else {
                        format_note.to_string()
                    };

                    let audio_badge = if has_audio { " [+Audio]" } else { "" };
                    let label = format!(
                        "{} • {} • {}fps • {} • {}{} (ID: {})",
                        res_tag,
                        short_codec(vcodec),
                        fps,
                        ext.to_uppercase(),
                        format_bytes(size),
                        audio_badge,
                        fid
                    );

                    video_raw.push((
                        h,
                        fps,
                        tbr,
                        MediaStream {
                            id: fid,
                            label,
                            height: Some(h),
                            fps: Some(fps),
                            ext: Some(ext),
                            vcodec: Some(short_codec(vcodec)),
                            acodec: Some(short_codec(acodec)),
                            filesize: if size > 0 { Some(size) } else { None },
                            has_audio: Some(has_audio),
                        },
                    ));
                } else if acodec != "none" {
                    let abr = f["abr"]
                        .as_f64()
                        .or_else(|| f["tbr"].as_f64())
                        .unwrap_or(0.0)
                        .round() as u32;
                    let lang = f["language"].as_str().unwrap_or("und");
                    let label = format!(
                        "{} kbps • {} • {} • {} • {} (ID: {})",
                        abr,
                        short_codec(acodec),
                        lang.to_uppercase(),
                        ext.to_uppercase(),
                        format_bytes(size),
                        fid
                    );

                    audio_raw.push((
                        abr,
                        size,
                        MediaStream {
                            id: fid,
                            label,
                            height: None,
                            fps: None,
                            ext: Some(ext),
                            vcodec: None,
                            acodec: Some(short_codec(acodec)),
                            filesize: if size > 0 { Some(size) } else { None },
                            has_audio: Some(true),
                        },
                    ));
                }
            }
        }

        // Sort highest quality first
        video_raw.sort_by(|a, b| (b.0, b.1, b.2).cmp(&(a.0, a.1, a.2)));
        audio_raw.sort_by(|a, b| (b.0, b.1).cmp(&(a.0, a.1)));

        let video_streams = video_raw.into_iter().map(|x| x.3).collect();
        let audio_streams = audio_raw.into_iter().map(|x| x.2).collect();

        // Parse subtitles
        let mut subtitles: Vec<SubtitleTrack> = Vec::new();
        if let Some(subs_obj) = v["subtitles"].as_object() {
            for (lang_code, tracks) in subs_obj {
                if lang_code == "live_chat" {
                    continue;
                }
                let name = tracks
                    .as_array()
                    .and_then(|arr| arr.first())
                    .and_then(|t| t["name"].as_str())
                    .unwrap_or(lang_code)
                    .to_string();
                subtitles.push(SubtitleTrack {
                    code: lang_code.clone(),
                    name: format!("{} ({})", name, lang_code),
                    is_auto: false,
                });
            }
        }
        if let Some(auto_obj) = v["automatic_captions"].as_object() {
            // Pick popular auto-caption languages first so dropdown stays clean
            let priority_langs = ["en", "bn", "hi", "ar", "es", "fr", "de", "ja", "ko", "pt", "ru", "zh-Hans"];
            for code in priority_langs {
                if let Some(tracks) = auto_obj.get(code) {
                    if !subtitles.iter().any(|s| s.code == code) {
                        let name = tracks
                            .as_array()
                            .and_then(|arr| arr.first())
                            .and_then(|t| t["name"].as_str())
                            .unwrap_or(code);
                        subtitles.push(SubtitleTrack {
                            code: code.to_string(),
                            name: format!("{} [Auto-Generated] ({})", name, code),
                            is_auto: true,
                        });
                    }
                }
            }
        }

        Ok(MediaInfo {
            id,
            title,
            uploader,
            duration,
            thumbnail,
            video_streams,
            audio_streams,
            subtitles,
        })
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

// ---------------------------------------------------------------------------
// Command 2: Start Download (Video, Audio, Subtitles Only, Clipping, Parabolic)
// ---------------------------------------------------------------------------

#[command]
async fn start_download(
    app: AppHandle,
    state: State<'_, DownloadState>,
    options: DownloadOptions,
) -> Result<String, String> {
    let active_pid = state.active_pid.clone();
    let cancelled = state.cancelled.clone();
    *cancelled.lock().unwrap() = false;

    tauri::async_runtime::spawn_blocking(move || {
        fs::create_dir_all(&options.save_folder)
            .map_err(|e| format!("Failed to create output folder: {}", e))?;

        let mut cmd = make_command("yt-dlp");
        cmd.args(["--newline", "--progress", "--no-playlist"]);

        // Ensure Deno JS runtime
        if find_exe_in_augmented_path("deno").is_some() {
            cmd.args(["--js-runtimes", "deno"]);
        }

        // Ensure FFmpeg location is explicitly passed if found
        if let Some(ffmpeg_path) = find_exe_in_augmented_path("ffmpeg") {
            if let Some(parent) = ffmpeg_path.parent() {
                cmd.args(["--ffmpeg-location", &parent.to_string_lossy()]);
            }
        }

        // Output filename template (Include Media ID in Title option)
        let mut suffix_tag = String::new();
        if options.enable_clip && !options.start_time.trim().is_empty() && !options.end_time.trim().is_empty() {
            let s_clean = options.start_time.trim().replace(':', "-");
            let e_clean = options.end_time.trim().replace(':', "-");
            suffix_tag = format!(" [Clip {} to {}]", s_clean, e_clean);
        }

        let out_tmpl = if options.include_media_id {
            format!(
                "{}/%(title).140s{} [%(id)s].%(ext)s",
                options.save_folder.trim_end_matches(&['/', '\\'][..]),
                suffix_tag
            )
        } else {
            format!(
                "{}/%(title).150s{}.%(ext)s",
                options.save_folder.trim_end_matches(&['/', '\\'][..]),
                suffix_tag
            )
        };
        cmd.args(["-o", &out_tmpl, "--windows-filenames"]);

        // Part files & Overwrite
        if options.use_part_files {
            cmd.arg("--part");
        } else {
            cmd.arg("--no-part");
        }
        if options.overwrite_files {
            cmd.arg("--force-overwrites");
        } else {
            cmd.arg("--continue");
        }

        // Mode & Container Handling
        let is_subtitles_only = options.download_mode == "subtitles";
        let container_upper = options.container.to_uppercase();
        let is_audio_container = options.download_mode == "audio"
            || container_upper.contains("(AUDIO)");

        if is_subtitles_only {
            cmd.arg("--skip-download");
        } else if is_audio_container {
            let aud_fmt = if options.audio_stream_id.is_empty() || options.audio_stream_id == "ba" {
                "ba/b".to_string()
            } else {
                options.audio_stream_id.clone()
            };
            cmd.args(["-f", &aud_fmt, "-x"]);

            // Determine audio format from container option:
            // Audio (Generic), MP3 (Audio), M4A (Audio), OPUS (Audio), FLAC (Audio), WAV (Audio), OGG (Audio)
            if !container_upper.starts_with("AUDIO (GENERIC)") {
                let target_codec = if container_upper.starts_with("MP3") {
                    "mp3"
                } else if container_upper.starts_with("M4A") {
                    "m4a"
                } else if container_upper.starts_with("OPUS") {
                    "opus"
                } else if container_upper.starts_with("FLAC") {
                    "flac"
                } else if container_upper.starts_with("WAV") {
                    "wav"
                } else if container_upper.starts_with("OGG") {
                    "vorbis"
                } else {
                    "mp3"
                };
                cmd.args(["--audio-format", target_codec]);
            }

            let aq = if options.audio_bitrate.is_empty() || options.audio_bitrate == "Best" {
                "0"
            } else {
                options.audio_bitrate.as_str()
            };
            cmd.args(["--audio-quality", aq]);
        } else {
            // Video Mode
            let vid_sel = if options.video_stream_id.is_empty() || options.video_stream_id == "best" {
                "bv*".to_string()
            } else {
                options.video_stream_id.clone()
            };
            let aud_sel = if options.audio_stream_id.is_empty() || options.audio_stream_id == "ba" {
                "ba".to_string()
            } else {
                options.audio_stream_id.clone()
            };

            let fmt_expr = format!("{}+{}/{}/b", vid_sel, aud_sel, vid_sel);
            cmd.args(["-f", &fmt_expr]);

            // Video Containers: Video (Generic), MP4 (Video), WEBM (Video), MKV (Video), MOV (Video), AVI (Video)
            if !container_upper.starts_with("VIDEO (GENERIC)") {
                if container_upper.starts_with("MP4") {
                    cmd.args(["--merge-output-format", "mp4"]);
                } else if container_upper.starts_with("WEBM") {
                    cmd.args(["--merge-output-format", "webm"]);
                } else if container_upper.starts_with("MKV") {
                    cmd.args(["--merge-output-format", "mkv"]);
                } else if container_upper.starts_with("MOV") {
                    cmd.args(["--remux-video", "mov"]);
                } else if container_upper.starts_with("AVI") {
                    cmd.args(["--recode-video", "avi"]);
                }
            }
        }

        // Subtitles Handling
        if is_subtitles_only || options.enable_subtitles {
            cmd.arg("--write-subs");
            if options.include_auto_subtitles || options.subtitle_lang.contains("auto") {
                cmd.arg("--write-auto-subs");
            }
            let clean_lang = options.subtitle_lang.replace("-auto", "");
            let lang_arg = if clean_lang.trim().is_empty() {
                "en,bn"
            } else {
                clean_lang.trim()
            };
            cmd.args(["--sub-langs", lang_arg]);

            if !options.subtitle_format.is_empty() && options.subtitle_format != "any" {
                cmd.args(["--convert-subs", &options.subtitle_format.to_lowercase()]);
            }

            if !is_subtitles_only
                && !is_audio_container
                && (options.subtitle_save_mode == "embed"
                    || options.subtitle_save_mode == "both"
                    || options.embed_subtitles_global)
            {
                cmd.arg("--embed-subs");
            }
        }

        // Timeframe / Clipping Section
        if options.enable_clip && !is_subtitles_only {
            let s = options.start_time.trim();
            let e = options.end_time.trim();
            if !s.is_empty() && !e.is_empty() {
                cmd.args(["--download-sections", &format!("*{}-{}", s, e)]);
                if options.precise_cut {
                    cmd.arg("--force-keyframes-at-cuts");
                }
            }
        }

        // Metadata, Thumbnails, Chapters, SponsorBlock
        if !is_subtitles_only {
            if options.embed_metadata {
                cmd.arg("--embed-metadata");
            }
            if options.embed_thumbnails {
                cmd.arg("--embed-thumbnail");
                if is_audio_container && options.crop_audio_thumbnails {
                    cmd.args([
                        "--ppa",
                        "ThumbnailsConvertor:-vf crop=ih:ih",
                    ]);
                }
            }
            if options.embed_chapters {
                cmd.arg("--embed-chapters");
            }
            if options.split_chapters {
                cmd.arg("--split-chapters");
            }
            if options.sponsor_block {
                cmd.args(["--sponsorblock-remove", "sponsor,selfpromo,interaction,intro,outro"]);
            }
        }

        // Speed Limit, Proxy, Cookies
        if options.limit_speed && options.speed_limit_kb > 0 {
            cmd.args(["--limit-rate", &format!("{}K", options.speed_limit_kb)]);
        }
        if !options.proxy.trim().is_empty() {
            cmd.args(["--proxy", options.proxy.trim()]);
        }
        if options.cookies_browser != "None" && !options.cookies_browser.trim().is_empty() {
            cmd.args([
                "--cookies-from-browser",
                &options.cookies_browser.to_lowercase(),
            ]);
        } else if !options.cookies_file.trim().is_empty()
            && PathBuf::from(&options.cookies_file).exists()
        {
            cmd.args(["--cookies", options.cookies_file.trim()]);
        }

        // Aria2c Downloader
        if options.use_aria2c && find_exe_in_augmented_path("aria2c").is_some() && !options.enable_clip {
            let conns = options.aria2_connections.max(1).min(16);
            cmd.args([
                "--downloader",
                "aria2c",
                "--downloader-args",
                &format!("aria2c:-x {} -s {} -k 1M", conns, conns),
            ]);
        }

        // FFmpeg Threads & Post-Processor Args
        if options.ffmpeg_threads > 0 {
            cmd.args([
                "--ppa",
                &format!("ffmpeg:-threads {}", options.ffmpeg_threads),
            ]);
        }
        if !options.post_processor_args.trim().is_empty() {
            cmd.args([
                "--ppa",
                &format!("ffmpeg:{}", options.post_processor_args.trim()),
            ]);
        }

        // Extra yt-dlp download args
        if !options.ytdlp_download_args.trim().is_empty() {
            for arg in options.ytdlp_download_args.split_whitespace() {
                if !arg.is_empty() {
                    cmd.arg(arg);
                }
            }
        }

        cmd.arg(options.url.trim());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let _ = app.emit(
            "download-progress",
            ProgressPayload {
                percent: 2.0,
                text: "Initializing download stream...".to_string(),
                speed: "".to_string(),
                eta: "".to_string(),
                status: "downloading".to_string(),
            },
        );

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start yt-dlp download process: {}", e))?;

        *active_pid.lock().unwrap() = Some(child.id());

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // Read stderr in background thread to capture errors
        let err_lines = Arc::new(Mutex::new(Vec::<String>::new()));
        let err_lines_clone = err_lines.clone();
        let app_err = app.clone();
        if let Some(se) = stderr {
            std::thread::spawn(move || {
                let reader = BufReader::new(se);
                for line in reader.lines().flatten() {
                    let trimmed = line.trim().to_string();
                    if !trimmed.is_empty() {
                        let _ = app_err.emit("download-log", trimmed.clone());
                        err_lines_clone.lock().unwrap().push(trimmed);
                    }
                }
            });
        }

        // Read stdout for progress lines
        if let Some(so) = stdout {
            let reader = BufReader::new(so);
            for line in reader.lines().flatten() {
                if *cancelled.lock().unwrap() {
                    break;
                }
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let _ = app.emit("download-log", trimmed.to_string());

                // Parse standard yt-dlp progress line: [download]  45.2% of 84.60MiB at  6.42MiB/s ETA 00:06
                if trimmed.starts_with("[download]") && trimmed.contains('%') {
                    let after_tag = trimmed.trim_start_matches("[download]").trim();
                    let pct_part = after_tag.split('%').next().unwrap_or("0").trim();
                    let pct = pct_part.parse::<f64>().unwrap_or(0.0);

                    let speed = if let Some(idx) = after_tag.find("at ") {
                        after_tag[idx + 3..]
                            .split_whitespace()
                            .next()
                            .unwrap_or("")
                            .to_string()
                    } else {
                        "".to_string()
                    };

                    let eta = if let Some(idx) = after_tag.find("ETA ") {
                        after_tag[idx + 4..]
                            .split_whitespace()
                            .next()
                            .unwrap_or("")
                            .to_string()
                    } else {
                        "".to_string()
                    };

                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            percent: pct,
                            text: after_tag.to_string(),
                            speed,
                            eta,
                            status: "downloading".to_string(),
                        },
                    );
                } else if trimmed.starts_with("[Merger]")
                    || trimmed.starts_with("[ExtractAudio]")
                    || trimmed.starts_with("[EmbedSubtitle]")
                    || trimmed.starts_with("[Metadata]")
                {
                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            percent: 99.0,
                            text: format!("Post-processing: {}", trimmed),
                            speed: "".to_string(),
                            eta: "00:00".to_string(),
                            status: "processing".to_string(),
                        },
                    );
                }
            }
        }

        let status = child
            .wait()
            .map_err(|e| format!("Process wait failed: {}", e))?;
        *active_pid.lock().unwrap() = None;

        if *cancelled.lock().unwrap() {
            return Err("Download paused / cancelled by user.".to_string());
        }

        if !status.success() {
            let errs = err_lines.lock().unwrap();
            let last_err = errs.last().cloned().unwrap_or_else(|| "Unknown yt-dlp error".to_string());
            return Err(last_err);
        }

        let _ = app.emit(
            "download-progress",
            ProgressPayload {
                percent: 100.0,
                text: "Download Completed Successfully! ✔".to_string(),
                speed: "".to_string(),
                eta: "00:00".to_string(),
                status: "completed".to_string(),
            },
        );

        Ok("Completed".to_string())
    })
    .await
    .map_err(|e| format!("Join error: {}", e))?
}

// ---------------------------------------------------------------------------
// Command 3: Cancel / Pause Active Download
// ---------------------------------------------------------------------------

#[command]
async fn cancel_download(state: State<'_, DownloadState>) -> Result<(), String> {
    *state.cancelled.lock().unwrap() = true;
    if let Some(pid) = *state.active_pid.lock().unwrap() {
        #[cfg(target_os = "windows")]
        {
            let mut kill_cmd = Command::new("taskkill");
            kill_cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
            kill_cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = kill_cmd.output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Command 4: Tool Version Check & One-Click Updater (yt-dlp, Deno, FFmpeg)
// ---------------------------------------------------------------------------

#[command]
async fn check_tool_updates() -> Result<Vec<ToolStatus>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        // 1. yt-dlp
        let ytdlp_ver = make_command("yt-dlp")
            .arg("--version")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                } else {
                    None
                }
            })
            .unwrap_or_else(|| "Not Found".to_string());

        // 2. Deno
        let deno_ver = make_command("deno")
            .arg("--version")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    let s = String::from_utf8_lossy(&o.stdout);
                    s.lines()
                        .next()
                        .and_then(|l| l.split_whitespace().nth(1))
                        .map(|v| format!("v{}", v))
                } else {
                    None
                }
            })
            .unwrap_or_else(|| "Not Found".to_string());

        // 3. FFmpeg
        let ffmpeg_ver = make_command("ffmpeg")
            .arg("-version")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    let s = String::from_utf8_lossy(&o.stdout);
                    s.lines()
                        .next()
                        .and_then(|l| l.split_whitespace().nth(2))
                        .map(|v| v.chars().take(18).collect::<String>())
                } else {
                    None
                }
            })
            .unwrap_or_else(|| "Not Found".to_string());

        Ok(vec![
            ToolStatus {
                name: "yt-dlp".to_string(),
                installed_version: ytdlp_ver.clone(),
                latest_version: ytdlp_ver,
                has_update: false,
            },
            ToolStatus {
                name: "Deno".to_string(),
                installed_version: deno_ver.clone(),
                latest_version: deno_ver,
                has_update: false,
            },
            ToolStatus {
                name: "FFmpeg".to_string(),
                installed_version: ffmpeg_ver.clone(),
                latest_version: ffmpeg_ver,
                has_update: false,
            },
        ])
    })
    .await
    .map_err(|e| format!("Check error: {}", e))?
}

#[command]
async fn update_tool(tool_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let lower = tool_name.to_lowercase();
        if lower.contains("yt-dlp") {
            let out = make_command("python")
                .args(["-m", "pip", "install", "-U", "yt-dlp"])
                .output();
            let _ = make_command("yt-dlp").arg("-U").output();
            if let Ok(o) = out {
                if o.status.success() {
                    return Ok("yt-dlp updated to the latest version successfully!".to_string());
                }
            }
            Ok("yt-dlp update check completed!".to_string())
        } else if lower.contains("deno") {
            let out = make_command("deno").arg("upgrade").output();
            if let Ok(o) = out {
                if o.status.success() {
                    return Ok("Deno JS runtime updated successfully!".to_string());
                }
            }
            let _ = make_command("winget")
                .args([
                    "upgrade",
                    "--id",
                    "DenoLand.Deno",
                    "--accept-source-agreements",
                    "--accept-package-agreements",
                ])
                .output();
            Ok("Deno JS runtime is up to date!".to_string())
        } else {
            let _ = make_command("winget")
                .args([
                    "upgrade",
                    "--id",
                    "yt-dlp.FFmpeg",
                    "--accept-source-agreements",
                    "--accept-package-agreements",
                ])
                .output();
            Ok("FFmpeg updated to the latest version successfully!".to_string())
        }
    })
    .await
    .map_err(|e| format!("Update error: {}", e))?
}

// ---------------------------------------------------------------------------
// Command 5: Open Folder in Native File Manager
// ---------------------------------------------------------------------------

#[command]
async fn open_folder(path: String) -> Result<(), String> {
    let _ = fs::create_dir_all(&path);
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DownloadState {
            active_pid: Arc::new(Mutex::new(None)),
            cancelled: Arc::new(Mutex::new(false)),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            fetch_media_info,
            start_download,
            cancel_download,
            check_tool_updates,
            update_tool,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running GM Downloader");
}
