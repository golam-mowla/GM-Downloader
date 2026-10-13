package com.golammowla.gmdownloader;

import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;
import com.yausername.youtubedl_android.YoutubeDLResponse;

import org.json.JSONObject;
import java.io.File;
import kotlin.Unit;

public class GMAndroidBridge {
    private final MainActivity activity;
    private final Handler mainHandler;
    private volatile String pendingSharedUrl = null;

    public GMAndroidBridge(MainActivity activity) {
        this.activity = activity;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    @JavascriptInterface
    public boolean isAndroidAvailable() {
        return true;
    }

    @JavascriptInterface
    public String getPendingSharedUrl() {
        String url = this.pendingSharedUrl;
        this.pendingSharedUrl = null;
        return url;
    }

    public void setPendingSharedUrl(String url) {
        this.pendingSharedUrl = url;
    }

    public void dispatchSharedUrl(String url) {
        if (url == null || url.isEmpty()) return;
        this.pendingSharedUrl = url;
        evalJs("if (window.onAndroidSharedUrl) { window.onAndroidSharedUrl(" + JSONObject.quote(url) + "); }");
    }

    @JavascriptInterface
    public String getDownloadPath() {
        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File appDir = new File(downloads, "GM-Downloader");
        if (!appDir.exists()) {
            appDir.mkdirs();
        }
        return appDir.getAbsolutePath();
    }

    @JavascriptInterface
    public void fetchMediaInfo(String url, String callbackId) {
        new Thread(() -> {
            try {
                YoutubeDLRequest request = new YoutubeDLRequest(url);
                request.addOption("--dump-single-json");
                request.addOption("--no-playlist");
                request.addOption("--no-check-certificates");
                request.addOption("--no-update");
                request.addOption("--compat-options", "manifest-filesize-approx");
                YoutubeDLResponse response = YoutubeDL.getInstance().execute(request);
                String json = response.getOut();
                evalJs("window.onAndroidFetchSuccess(" + JSONObject.quote(callbackId) + ", " + json + ");");
            } catch (Exception e) {
                Log.e("GMDownloader", "fetchMediaInfo error", e);
                evalJs("window.onAndroidFetchError(" + JSONObject.quote(callbackId) + ", " + JSONObject.quote(e.getMessage() != null ? e.getMessage() : e.toString()) + ");");
            }
        }).start();
    }

    @JavascriptInterface
    public void startDownload(String taskId, String url, String formatSpec, String container, boolean enableClip, String startTime, String endTime, boolean enableSubs, String subLangs) {
        new Thread(() -> {
            try {
                File saveDir = new File(getDownloadPath());
                YoutubeDLRequest request = new YoutubeDLRequest(url);
                request.addOption("-o", saveDir.getAbsolutePath() + "/%(title)s.%(ext)s");
                request.addOption("--no-part");
                request.addOption("--no-check-certificates");
                request.addOption("--no-update");

                if (formatSpec != null && !formatSpec.isEmpty() && !formatSpec.equals("best")) {
                    request.addOption("-f", formatSpec);
                }

                // Proper clean container & audio extraction handling
                String cUpper = container != null ? container.toUpperCase() : "";
                String targetExt = null;
                boolean isAudio = cUpper.contains("AUDIO");

                if (cUpper.startsWith("MP4")) targetExt = "mp4";
                else if (cUpper.startsWith("WEBM")) targetExt = "webm";
                else if (cUpper.startsWith("MKV")) targetExt = "mkv";
                else if (cUpper.startsWith("MOV")) targetExt = "mov";
                else if (cUpper.startsWith("AVI")) targetExt = "avi";
                else if (cUpper.startsWith("MP3")) targetExt = "mp3";
                else if (cUpper.startsWith("M4A")) targetExt = "m4a";
                else if (cUpper.startsWith("OPUS")) targetExt = "opus";
                else if (cUpper.startsWith("FLAC")) targetExt = "flac";
                else if (cUpper.startsWith("WAV")) targetExt = "wav";
                else if (cUpper.startsWith("OGG")) targetExt = "ogg";

                if (targetExt != null) {
                    if (isAudio) {
                        request.addOption("-x");
                        request.addOption("--audio-format", targetExt);
                    } else {
                        request.addOption("--merge-output-format", targetExt);
                    }
                }

                if (enableClip && startTime != null && endTime != null && !startTime.isEmpty()) {
                    request.addOption("--download-sections", "*" + startTime + "-" + endTime);
                }
                if (enableSubs) {
                    request.addOption("--write-subs");
                    if (subLangs != null && !subLangs.isEmpty()) {
                        request.addOption("--sub-langs", subLangs);
                    }
                }

                evalJs("window.onAndroidLog(" + JSONObject.quote("[Android yt-dlp] Starting download for task " + taskId) + ");");

                YoutubeDL.getInstance().execute(request, taskId, (progress, eta, line) -> {
                    evalJs("window.onAndroidProgress(" + JSONObject.quote(taskId) + ", " + progress + ", " + eta + ", " + JSONObject.quote(line) + ");");
                    evalJs("window.onAndroidLog(" + JSONObject.quote(line) + ");");
                    return Unit.INSTANCE;
                });

                evalJs("window.onAndroidComplete(" + JSONObject.quote(taskId) + ", true, null);");
            } catch (Exception e) {
                Log.e("GMDownloader", "startDownload error", e);
                evalJs("window.onAndroidComplete(" + JSONObject.quote(taskId) + ", false, " + JSONObject.quote(e.getMessage() != null ? e.getMessage() : e.toString()) + ");");
            }
        }).start();
    }

    @JavascriptInterface
    public void cancelDownload(String taskId) {
        new Thread(() -> {
            try {
                YoutubeDL.getInstance().destroyProcessById(taskId);
                evalJs("window.onAndroidLog(" + JSONObject.quote("[Android yt-dlp] Cancelled task " + taskId) + ");");
            } catch (Exception e) {
                Log.e("GMDownloader", "cancelDownload error", e);
            }
        }).start();
    }

    @JavascriptInterface
    public void updateYtDlp(String callbackId) {
        new Thread(() -> {
            try {
                evalJs("window.onAndroidLog(\"[Updater] Checking and downloading latest yt-dlp binary from GitHub...\");");
                YoutubeDL.UpdateStatus status = YoutubeDL.getInstance().updateYoutubeDL(activity.getApplicationContext(), YoutubeDL.UpdateChannel.STABLE.INSTANCE);
                evalJs("window.onAndroidLog(\"[Updater] ✔ yt-dlp update status: " + status.name() + "\");");
                evalJs("window.onAndroidUpdateResult(" + JSONObject.quote(callbackId) + ", true, \"yt-dlp updated successfully! Status: " + status.name() + "\");");
            } catch (Exception e) {
                Log.e("GMDownloader", "updateYtDlp error", e);
                evalJs("window.onAndroidLog(\"[Updater] ❌ Error updating yt-dlp: " + JSONObject.quote(e.getMessage() != null ? e.getMessage() : e.toString()) + "\");");
                evalJs("window.onAndroidUpdateResult(" + JSONObject.quote(callbackId) + ", false, \"Error: " + (e.getMessage() != null ? e.getMessage() : e.toString()) + "\");");
            }
        }).start();
    }

    public void evalJs(String code) {
        mainHandler.post(() -> {
            WebView wv = activity.getBridge() != null ? activity.getBridge().getWebView() : null;
            if (wv != null) {
                wv.evaluateJavascript(code, null);
            }
        });
    }
}
