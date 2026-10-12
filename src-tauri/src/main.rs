// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{command, AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaStream {
    pub id: String,
    pub label: String,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub ext: Option<String>,
    pub size: Option<String>,
    #[serde(rename = "hasAudio")]
    pub has_audio: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaInfo {
    pub title: String,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    #[serde(rename = "videoStreams")]
    pub video_streams: Vec<MediaStream>,
    #[serde(rename = "audioStreams")]
    pub audio_streams: Vec<MediaStream>,
}

#[command]
async fn fetch_media_info(
    url: String,
    cookies_browser: Option<String>,
    proxy: Option<String>,
) -> Result<MediaInfo, String> {
    let mut cmd = Command::new("yt-dlp");
    cmd.args(["--dump-json", "--no-playlist", "--quiet", &url]);

    if let Some(cb) = cookies_browser {
        if cb != "None" && !cb.is_empty() {
            cmd.args(["--cookies-from-browser", &cb.to_lowercase()]);
        }
    }
    if let Some(pr) = proxy {
        if !pr.is_empty() {
            cmd.args(["--proxy", &pr]);
        }
    }

    let output = cmd.output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", err));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let v: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("JSON parsing failed: {}", e))?;

    let title = v["title"].as_str().unwrap_or("Unknown Title").to_string();
    let uploader = v["uploader"].as_str().map(|s| s.to_string());
    let duration = v["duration"].as_f64();
    let thumbnail = v["thumbnail"].as_str().map(|s| s.to_string());

    let mut video_streams = Vec::new();
    let mut audio_streams = Vec::new();

    if let Some(formats) = v["formats"].as_array() {
        for f in formats {
            let fid = f["format_id"].as_str().unwrap_or("").to_string();
            let vcodec = f["vcodec"].as_str().unwrap_or("none");
            let acodec = f["acodec"].as_str().unwrap_or("none");
            let height = f["height"].as_u64().map(|h| h as u32);
            let fps = f["fps"].as_u64().map(|f| f as u32);
            let ext = f["ext"].as_str().map(|s| s.to_string());

            if vcodec != "none" {
                let has_audio = acodec != "none";
                let label = format!(
                    "{}p | {} | {}fps",
                    height.unwrap_or(0),
                    vcodec,
                    fps.unwrap_or(0)
                );
                video_streams.push(MediaStream {
                    id: fid,
                    label,
                    height,
                    fps,
                    ext,
                    size: None,
                    has_audio: Some(has_audio),
                });
            } else if acodec != "none" {
                let abr = f["abr"].as_f64().unwrap_or(0.0) as u32;
                let label = format!("{}k | {}", abr, acodec);
                audio_streams.push(MediaStream {
                    id: fid,
                    label,
                    height: None,
                    fps: None,
                    ext,
                    size: None,
                    has_audio: Some(false),
                });
            }
        }
    }

    Ok(MediaInfo {
        title,
        uploader,
        duration,
        thumbnail,
        video_streams,
        audio_streams,
    })
}

#[command]
async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            fetch_media_info,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running GM Downloader");
}
