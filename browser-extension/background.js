// Download with Parrot - Background Service Worker (Manifest V3)

const PARROT_BRIDGE_PORT = 9666;
const PARROT_BRIDGE_URL = `http://127.0.0.1:${PARROT_BRIDGE_PORT}`;

// Create Context Menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "download-with-parrot",
      title: "Download with Parrot 🦜",
      contexts: ["all"],
    });
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "download-with-parrot") {
    let candidateUrl = "";

    // 1. Ask content script for detected element URL (e.g. Instagram reel, video, card)
    if (tab && tab.id) {
      try {
        const resp = await chrome.tabs.sendMessage(tab.id, {
          action: "GET_LAST_CLICKED_MEDIA",
        });
        if (resp && resp.url) {
          candidateUrl = resp.url;
        }
      } catch (e) {
        // Content script might not be injected or supported on this page
      }
    }

    // 2. Fallbacks from contextMenus info (strictly ignore blob/data URLs)
    const isClean = (u) => u && typeof u === "string" && !u.startsWith("blob:") && !u.startsWith("data:") && (u.startsWith("http://") || u.startsWith("https://"));

    if (!isClean(candidateUrl)) {
      if (isClean(info.linkUrl)) {
        candidateUrl = info.linkUrl;
      } else if (isClean(info.srcUrl)) {
        candidateUrl = info.srcUrl;
      } else if (info.selectionText && isClean(info.selectionText.trim())) {
        candidateUrl = info.selectionText.trim();
      } else if (isClean(info.pageUrl)) {
        candidateUrl = info.pageUrl;
      } else if (tab && isClean(tab.url)) {
        candidateUrl = tab.url;
      }
    }

    if (!isClean(candidateUrl)) {
      if (tab && isClean(tab.url)) {
        candidateUrl = tab.url;
      } else {
        return;
      }
    }

    await sendUrlToParrot(candidateUrl, tab ? tab.id : null);
  }
});

// Send URL to Parrot Desktop App
async function sendUrlToParrot(mediaUrl, tabId) {
  let cleanUrl = (mediaUrl || "").trim();
  if (!cleanUrl) return;

  // Clean blob URL if accidentally passed
  if (cleanUrl.startsWith("blob:")) {
    if (tabId) {
      try {
        const t = await chrome.tabs.get(tabId);
        if (t && t.url && !t.url.startsWith("blob:")) {
          cleanUrl = t.url;
        }
      } catch {}
    }
  }

  // Resolve active tab if not passed (e.g. called from popup)
  let effectiveTabId = tabId;
  if (!effectiveTabId) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        effectiveTabId = activeTab.id;
      }
    } catch {}
  }

  // Notify tab that request is in progress
  if (effectiveTabId) {
    try {
      await chrome.tabs.sendMessage(effectiveTabId, {
        action: "SHOW_TOAST",
        title: "GM Downloader 🦜",
        message: "Sending link to Parrot...",
        status: "info",
      });
    } catch {
      // ignore
    }
  }

  // 1. Try sending to local bridge HTTP server (if app is running)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const resp = await fetch(
      `${PARROT_BRIDGE_URL}/open?url=${encodeURIComponent(cleanUrl)}`,
      {
        method: "GET",
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (resp.ok) {
      if (effectiveTabId) {
        try {
          await chrome.tabs.sendMessage(effectiveTabId, {
            action: "SHOW_TOAST",
            title: "Parrot Downloader 🦜",
            message: "Link sent to Parrot! Fetching streams...",
            status: "success",
          });
        } catch {}
      }
      return { success: true, method: "bridge" };
    }
  } catch (err) {
    // Local bridge not active (app might be closed or starting)
  }

  // 2. Launch GM Downloader via custom Windows protocol
  const protocolUrl = `parrot://open?url=${encodeURIComponent(cleanUrl)}`;

  if (effectiveTabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: effectiveTabId },
        func: (proto, raw) => {
          // Fallback copy to clipboard
          navigator.clipboard.writeText(raw).catch(() => {});

          // Trigger protocol handler
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = proto;
          document.body.appendChild(iframe);
          setTimeout(() => iframe.remove(), 2500);
        },
        args: [protocolUrl, cleanUrl],
      });

      await chrome.tabs.sendMessage(effectiveTabId, {
        action: "SHOW_TOAST",
        title: "GM Downloader 🦜",
        message: "Opening Parrot desktop app & fetching link...",
        status: "info",
      });

      return { success: true, method: "protocol" };
    } catch (e) {
      // Fallback if scripting fails on internal browser pages
      chrome.tabs.create({ url: protocolUrl, active: false }, (t) => {
        setTimeout(() => chrome.tabs.remove(t.id), 2000);
      });
    }
  } else {
    chrome.tabs.create({ url: protocolUrl, active: false }, (t) => {
      setTimeout(() => chrome.tabs.remove(t.id), 2000);
    });
  }

  return { success: true, method: "protocol" };
}

// Listen to messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SEND_TO_PARROT") {
    sendUrlToParrot(request.url, null).then((res) => sendResponse(res));
    return true;
  }

  if (request.action === "CHECK_PARROT_STATUS") {
    fetch(`${PARROT_BRIDGE_URL}/ping`, { method: "GET" })
      .then((res) => res.json())
      .then((data) => sendResponse({ online: true, data }))
      .catch(() => sendResponse({ online: false }));
    return true;
  }
});
