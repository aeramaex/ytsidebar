chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// --- Main Logic ---
let sidePanelPorts = new Set();
let lastNotifiedUrl = ''; // Prevent duplicate notifications
let lastNotifyTime = 0; // Rate limiting for notifications
const NOTIFY_THROTTLE_MS = 2000; // Minimum time between notifications

function notifySidePanels(tab) {
  const now = Date.now();
  
  // Rate limiting: don't notify more than once every 2 seconds
  if (now - lastNotifyTime < NOTIFY_THROTTLE_MS && tab.url === lastNotifiedUrl) {
    console.log('🚫 Skipping notification - too frequent:', tab.url);
    return;
  }
  
  if (tab.url && tab.url.includes('youtube.com/watch') && tab.url !== lastNotifiedUrl) {
    console.log('✅ Notifying side panel of new YouTube URL:', tab.url);
    lastNotifiedUrl = tab.url;
    lastNotifyTime = now;
    const videoId = extractVideoId(tab.url);
    
    sidePanelPorts.forEach(port => {
      try {
        port.postMessage({
          type: 'YOUTUBE_URL_CHANGED',
          url: tab.url,
          videoId: videoId || null
        });
      } catch (error) {
        console.log('Failed to send URL change to side panel:', error);
        sidePanelPorts.delete(port);
      }
    });
  }
}

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    notifySidePanels(tab);
  } catch (error) {
    console.log('Error handling tab activation:', error);
  }
});

// Listen for tab updates (navigation, reloads)
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);

  if (url.hostname === 'www.youtube.com') {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
    // `info.status` check ensures we only fire on page load completion
    if (info.status === 'complete') {
      notifySidePanels(tab);
    }
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
    // Reset last notified URL when leaving YouTube
    if (lastNotifiedUrl.includes('youtube.com')) {
      lastNotifiedUrl = '';
    }
  }
});

// Helper function to extract video ID from URL
function extractVideoId(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    const videoId = params.get('v');
    if (videoId) return videoId;

    // Handle shorts URLs
    const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]+)/);
    if (shortsMatch) return shortsMatch[1];

    return null;
  } catch (error) {
    return null;
  }
}

// Handle connections from side panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('Side panel connected');
    sidePanelPorts.add(port);

    // When a new side panel connects, immediately send the current URL if it's a video
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        lastNotifiedUrl = ''; // Reset to ensure notification
        notifySidePanels(tabs[0]);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
      sidePanelPorts.delete(port);
    });

    // Handle messages from side panel
    port.onMessage.addListener((message) => {
      console.log('Background received from side panel:', message.type);

      if (message.type === 'GET_YOUTUBE_URL') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            port.postMessage({
              type: 'YOUTUBE_URL_RESPONSE',
              url: tabs[0].url,
              requestId: message.requestId
            });
          }
        });
      }

      if (message.type === 'EXTRACT_SUBTITLES') {
        // Forward subtitle extraction request to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'EXTRACT_SUBTITLES',
              videoId: message.videoId
            }).catch((error) => {
              console.log('Could not send subtitle extraction request to content script:', error);
              // Send error back to side panel
              port.postMessage({
                type: 'SUBTITLE_DATA',
                data: {
                  type: 'YT_SUBTITLES_ERROR',
                  error: 'Could not communicate with YouTube page'
                }
              });
            });
          } else {
            // Send error back to side panel
            port.postMessage({
              type: 'SUBTITLE_DATA',
              data: {
                type: 'YT_SUBTITLES_ERROR',
                error: 'Not on a YouTube page'
              }
            });
          }
        });
      }

      if (message.type === 'SEEK_YOUTUBE_VIDEO') {
        // Forward seek request to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SEEK_YOUTUBE_VIDEO',
              time: message.time
            }).catch((error) => {
              console.log('Could not send seek request to content script:', error);
            });
          }
        });
      }

      if (message.type === 'TOGGLE_YOUTUBE_PLAYBACK') {
        // Forward play/pause toggle request to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'TOGGLE_YOUTUBE_PLAYBACK'
            }).catch((error) => {
              console.log('Could not send play/pause toggle to content script:', error);
            });
          }
        });
      }

      if (message.type === 'GET_YOUTUBE_PLAY_STATE') {
        // Forward play state request to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'GET_YOUTUBE_PLAY_STATE'
            }).catch((error) => {
              console.log('Could not send play state request to content script:', error);
            });
          }
        });
      }

      if (message.type === 'GET_VIDEO_TIME') {
        // Forward video time request to content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'GET_VIDEO_TIME'
            }).catch((error) => {
              console.log('Could not request video time from content script:', error);
            });
          }
        });
      }
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, 'from', sender.tab ? 'content script' : 'unknown');

  if (message.type === 'GET_YOUTUBE_URL') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        sendResponse({url: tabs[0].url});
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'YOUTUBE_URL_CHANGED') {
    console.log('Forwarding URL change to side panels:', message.url);
    // Forward URL change notification to all connected side panels
    sidePanelPorts.forEach(port => {
      try {
        port.postMessage({
          type: 'YOUTUBE_URL_CHANGED',
          url: message.url,
          videoId: message.videoId
        });
      } catch (error) {
        console.log('Failed to send to side panel:', error);
        sidePanelPorts.delete(port);
      }
    });
  }
  
  if (message.type === 'SUBTITLE_DATA') {
    console.log('Forwarding subtitle data to side panels:', message.data.type);
    // Forward subtitle data from content script to all connected side panels
    sidePanelPorts.forEach(port => {
      try {
        port.postMessage({
          type: 'SUBTITLE_DATA',
          data: message.data
        });
      } catch (error) {
        console.log('Failed to send subtitle data to side panel:', error);
        sidePanelPorts.delete(port);
      }
    });
  }

  if (message.type === 'VIDEO_TIME_UPDATE') {
    console.log('Forwarding video time update to side panels:', message.currentTime);
    // Forward video time update from content script to all connected side panels
    sidePanelPorts.forEach(port => {
      try {
        port.postMessage({
          type: 'VIDEO_TIME_UPDATE',
          currentTime: message.currentTime,
          videoId: message.videoId
        });
      } catch (error) {
        console.log('Failed to send video time to side panel:', error);
        sidePanelPorts.delete(port);
      }
    });
  }

  if (message.type === 'PLAY_STATE_UPDATE') {
    console.log('Forwarding play state update to side panels:', message.state);
    // Forward play state update from content script to all connected side panels
    sidePanelPorts.forEach(port => {
      try {
        port.postMessage({
          type: 'PLAY_STATE_RESPONSE',
          state: message.state,
          videoId: message.videoId
        });
      } catch (error) {
        console.log('Failed to send play state to side panel:', error);
        sidePanelPorts.delete(port);
      }
    });
  }

  // Health check for debugging
  if (message.type === 'HEALTH_CHECK') {
    sendResponse({
      status: 'healthy',
      timestamp: Date.now(),
      watchedTabs: watchTabs.size,
      activePorts: sidePanelPorts.size
    });
    return true;
  }

  // Don't send response for these message types
  return false;
});

// Network request interception for blocked APIs
const watchTabs = new Map();     // tabId -> true (should catch timedtext)
const lastTimedTextUrls = new Map(); // tabId -> last URL to prevent duplicates

// Helper: check if it's a watch page
function isWatchPage(url) {
  return url.includes("youtube.com/watch") && url.includes("v=");
}

// Handle SPA navigation / history for network interception
chrome.webNavigation.onHistoryStateUpdated.addListener(details => {
  const { tabId, url } = details;
  if (isWatchPage(url)) {
    console.log(`▶️ Tab ${tabId} navigated to WATCH page - enabling subtitle URL interception`);
    watchTabs.set(tabId, true);
    lastTimedTextUrls.delete(tabId);  // reset before new video
  } else if (watchTabs.has(tabId)) {
    // if navigating away from video - stop monitoring
    console.log(`⏹ Tab ${tabId} left WATCH page - disabling interception`);
    watchTabs.delete(tabId);
    lastTimedTextUrls.delete(tabId);
  }
}, {
  url: [{ hostContains: "youtube.com" }]
});

// Check for new timedtext URL
function isNewTimedTextUrl(tabId, url) {
  if (lastTimedTextUrls.get(tabId) === url) return false;
  lastTimedTextUrls.set(tabId, url);
  return true;
}

// Clean up data when tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  watchTabs.delete(tabId);
  lastTimedTextUrls.delete(tabId);
  console.log(`🧹 Cleared network monitoring data for closed tab ${tabId}`);
});

// Intercept subtitle requests when main API method fails
chrome.webRequest.onCompleted.addListener(
  details => {
    // Check if this is a timedtext request, in the right tab, and status 200
    if (
      details.tabId >= 0 &&
      details.url.includes('timedtext') &&
      details.statusCode === 200 &&
      watchTabs.get(details.tabId) &&
      isNewTimedTextUrl(details.tabId, details.url)
    ) {
      console.log('🔔 Intercepted timedtext URL:', details.url);
      chrome.tabs.sendMessage(details.tabId, {
        type: 'TIMEDTEXT_URL_INTERCEPTED',
        url: details.url
      }).catch(() => {
        // Content script might not be ready, that's OK
        console.log('Could not send intercepted URL to content script');
      });
    }
  },
  { urls: ["*://*.youtube.com/api/timedtext*"] }
);
