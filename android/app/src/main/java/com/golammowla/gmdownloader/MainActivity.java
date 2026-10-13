package com.golammowla.gmdownloader;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.ffmpeg.FFmpeg;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {
    private GMAndroidBridge bridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            YoutubeDL.getInstance().init(this.getApplicationContext());
            FFmpeg.getInstance().init(this.getApplicationContext());
            Log.d("GMDownloader", "Native yt-dlp & FFmpeg initialized successfully!");
        } catch (Exception e) {
            Log.e("GMDownloader", "Failed to initialize YoutubeDL / FFmpeg", e);
        }

        bridge = new GMAndroidBridge(this);
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(bridge, "GMAndroidBridge");
        }

        handleIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (bridge == null) {
            bridge = new GMAndroidBridge(this);
        }
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(bridge, "GMAndroidBridge");
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String sharedUrl = extractUrlFromIntent(intent);
        if (sharedUrl != null && !sharedUrl.isEmpty()) {
            Log.d("GMDownloader", "Received shared URL from Intent: " + sharedUrl);
            if (bridge != null) {
                bridge.dispatchSharedUrl(sharedUrl);
            }
        }
    }

    private String extractUrlFromIntent(Intent intent) {
        if (intent == null) return null;
        String text = null;
        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(intent.getType())) {
            text = intent.getStringExtra(Intent.EXTRA_TEXT);
        } else if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) {
            text = intent.getDataString();
        }
        if (text != null) {
            Matcher m = Pattern.compile("https?://[^\\s]+").matcher(text);
            if (m.find()) {
                return m.group();
            }
        }
        return null;
    }
}
