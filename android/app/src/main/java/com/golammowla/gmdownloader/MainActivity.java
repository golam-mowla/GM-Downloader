package com.golammowla.gmdownloader;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.ffmpeg.FFmpeg;

public class MainActivity extends BridgeActivity {
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

        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(new GMAndroidBridge(this), "GMAndroidBridge");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(new GMAndroidBridge(this), "GMAndroidBridge");
        }
    }
}
