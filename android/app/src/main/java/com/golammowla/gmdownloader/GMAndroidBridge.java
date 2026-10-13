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

    public GMAndroidBridge(MainActivity activity) {
        this.activity = activity;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    @JavascriptInterface
    public boolean isAndroidAvailable() {
        return true;
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
                request.addOption("--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
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
                request.addOption("--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");

                if (formatSpec != null && !formatSpec.isEmpty() && !formatSpec.equals("best")) {
                    request.addOption("-f", formatSpec);
                }
                if (container != null && !container.toLowerCase().contains("generic")) {
                    String ext = container.toLowerCase().replaceAll("[^a-z0-9]", "");
                    request.addOption("--merge-output-format", ext);
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

    private void evalJs(String code) {
        mainHandler.post(() -> {
            WebView wv = activity.getBridge() != null ? activity.getBridge().getWebView() : null;
            if (wv != null) {
                wv.evaluateJavascript(code, null);
            }
        });
    }
}
