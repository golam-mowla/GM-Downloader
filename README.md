# GM Downloader 🚀

**GM Downloader** is an ultra-modern, blazing-fast desktop media downloader and precision clipper built with:
- **Tauri 2** (Lightweight native desktop shell)
- **Rust** (High performance backend & process management)
- **React 18 + TypeScript + Vite** (Interactive frontend)
- **Tailwind CSS + shadcn/ui** (Modern aesthetic design system)
- **yt-dlp, Deno, and FFmpeg** (Media engine with Parabolic features & YouTube throttling bypass)

---

## ✨ Features

- **Full Parabolic Options:**
  - Video Formats: `MP4`, `MKV`, `WebM`
  - Audio Formats: `MP3`, `M4A`, `OPUS`, `FLAC`, `WAV`
  - Quality Presets: `Best`, `4K (2160p)`, `1440p`, `1080p`, `720p`, `480p`, `360p` / Audio bitrates (`320k`, `256k`, `192k`, `128k`)
  - Subtitles download & embedding into video containers
  - Metadata & Album art embedding (with square crop for audio)
  - Chapter splitting & SponsorBlock segment removal
  - Multi-connection Aria2c downloader accelerator
  - Browser cookies extraction (Chrome, Edge, Firefox, Brave, Opera) & Proxy support
- **✂️ Fixed Timeframe / Clip Engine:**
  - Toggle between full media download and custom timeframe cuts
  - Input timestamps in `HH:MM:SS`, `MM:SS`, or raw seconds
  - Real-time clip duration calculation badge
  - Keyframe-accurate cuts or precise re-encoding cuts
- **🔄 Core Engine Update Center:**
  - One-click updater for `yt-dlp`, `Deno`, and `FFmpeg`
  - Version comparison and visual success alerts
- **🧩 "Download with Parrot" Browser Extension:**
  - 1-click download from right-click context menu on any website, including Instagram reels & feed posts, YouTube videos & shorts, Facebook, TikTok, Twitter/X.
  - Automatically sends links directly into GM Downloader (Parrot) and fetches streams instantly.
  - Available in `browser-extension/` directory.

---

## 🏗️ Development & Building

### Local Development:
```bash
# Install frontend dependencies
npm install

# Run in browser dev mode
npm run dev

# Run Tauri desktop app (requires Rust & C++ build tools)
npm run tauri dev
```

### Automated GitHub Actions Build:
Every commit pushed to the `main` branch automatically triggers the GitHub Actions workflow to build the Windows `.exe` installer. You can download the generated executable directly from the **Actions** tab or **Releases** on GitHub!
