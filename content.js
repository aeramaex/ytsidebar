// Enhanced debugging for sidepanel connection issues
console.log('🚀 Enhanced YouTube content script loading...');

// Add debugging for extension loading
window.addEventListener('load', () => {
  console.log('🌐 Page fully loaded, extension should be active');
  setTimeout(() => {
    if (!document.querySelector('script[data-sidepanel-injected]')) {
      console.log('⚠️ Injection script not found after page load, attempting injection...');
      injectionAttempts = 0;
      injectSubtitleExtractor();
    }
  }, 2000);
});

// Console debug info
console.log("SidePanel AI content script loaded on YouTube.");

// Content script for YouTube pages
// Handles URL change detection and subtitle extraction

let lastUrl = '';
let lastVideoId = null;
let currentVideoId = null;
let injectionAttempts = 0;
let urlCheckInterval = null;
let currentUrl = window.location.href;
const MAX_INJECTION_ATTEMPTS = 3;

// Inject the YouTube subtitle extraction script
function injectSubtitleExtractor() {
  // Prevent duplicate injections by checking a global flag
  if (window.sidepanelExtractorInjected) {
    console.log('Subtitle extractor already initialized (global flag)');
    return;
  }
  // Check if script is already injected
  if (document.querySelector('script[data-sidepanel-injected]')) {
    console.log('Subtitle extractor already injected (script tag present)');
    return;
  }

  try {
    // Inject main enhanced script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('youtube-inject-enhanced.js');
    script.setAttribute('data-sidepanel-injected', 'true');
    script.onload = function() {
      window.sidepanelExtractorInjected = true;
      console.log('✅ YouTube subtitle extractor injected successfully');
      
      // Load additional components
      loadAdditionalComponents();
      
      this.remove();
    };
    script.onerror = function() {
      window.sidepanelExtractorInjected = false;
      console.error('❌ Failed to inject YouTube subtitle extractor');
      injectionAttempts++;
      if (injectionAttempts < MAX_INJECTION_ATTEMPTS) {
        console.log(`Retrying injection (attempt ${injectionAttempts + 1}/${MAX_INJECTION_ATTEMPTS})...`);
        setTimeout(injectSubtitleExtractor, 2000);
      }
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('Error injecting subtitle extractor:', error);
    injectionAttempts++;
    if (injectionAttempts < MAX_INJECTION_ATTEMPTS) {
      setTimeout(injectSubtitleExtractor, 2000);
    }
  }
}

// Load additional testing and analytics components
function loadAdditionalComponents() {
  const components = [
    'fixed-transcript-extractor-new.js',
    'youtube-transcript.js',
    'youtube-subtitle-tester.js', 
    'youtube-analytics.js',
    'youtube-system-integration.js'
  ];
  
  components.forEach((component, index) => {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(component);
      script.onload = function() {
        console.log(`✅ ${component} loaded successfully`);
        this.remove();
      };
      script.onerror = function() {
        console.warn(`⚠️ Failed to load ${component}`);
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    }, index * 200); // Stagger loading
  });
}

// Extract video ID from URL (universal function like subz)
function extractVideoId(url) {
  // Regular video parameter
  const match = url.match(/[?&]v=([^&]*)/);
  if (match) return match[1];

  // Handle shorts URLs
  const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

// Detect URL changes like subz extension
function detectUrlChange() {
  const newUrl = window.location.href;
  if (newUrl !== currentUrl) {
    console.log('🔄 URL changed from', currentUrl, 'to', newUrl);
    currentUrl = newUrl;
    setTimeout(checkUrlChange, 500);
  }
}

// Check for URL changes and notify side panel
function checkUrlChange() {
  const currentUrl = window.location.href;
  const videoId = extractVideoId(currentUrl);

  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    
    if (videoId && videoId !== lastVideoId) {
      lastVideoId = videoId;
      currentVideoId = videoId;
      console.log('🎥 YouTube URL changed to:', currentUrl);
      console.log('📝 Video ID:', videoId);

      // Notify the side panel about the URL change immediately
      chrome.runtime.sendMessage({
        type: 'YOUTUBE_URL_CHANGED',
        url: currentUrl,
        videoId: videoId
      }).catch(() => {
        // Side panel might not be open, that's OK
        console.log('Side panel not available to receive URL change notification');
      });

      // Auto-trigger subtitle extraction for new videos with optimized delay
      setTimeout(() => {
        if (currentVideoId === videoId) { // Make sure we're still on the same video
          console.log('🎯 Auto-triggering subtitle extraction for new video:', videoId);
          
          // Ensure injection script is present before triggering
          if (!document.querySelector('script[data-sidepanel-injected]')) {
            console.log('🔄 Re-injecting subtitle extractor for new video...');
            injectionAttempts = 0;
            injectSubtitleExtractor();
            
            // Trigger extraction after re-injection with longer delay
            setTimeout(() => {
              window.postMessage({
                type: 'TRIGGER_SUBTITLE_EXTRACTION',
                videoId: videoId
              }, '*');
            }, 3000); // Increased delay for enhanced extraction
          } else {
            // Script is already injected, trigger directly
            window.postMessage({
              type: 'TRIGGER_SUBTITLE_EXTRACTION',
              videoId: videoId
            }, '*');
          }
        }
      }, 1500); // Reduced delay for faster response
    } else if (!videoId) {
      console.log('🚫 Not a YouTube video URL:', currentUrl);
      currentVideoId = null;
      lastVideoId = null;
    }
  }
}

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;
  
  // Handle subtitle extraction results
  if (event.data.action === 'subtitlesExtracted') {
    const payload = event.data.data;
    if (!payload || !payload.subtitles || payload.subtitles.length === 0) {
      // Extraction returned no subtitles (possibly still in progress or unavailable)
      console.log('⚠️ No subtitle data received (null or empty). Ignoring this event.');
      return; // Avoid forwarding invalid data and throwing errors
    }
    console.log('📨 Content script received', payload.subtitles.length, 'subtitles from injected script');
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'SUBTITLE_DATA',
      data: {
        type: 'YT_SUBTITLES_SUCCESS',
        subtitles: payload.subtitles,
        videoId: payload.videoId,
        language: payload.language,
        trackName: payload.trackName,
        isAutoGenerated: payload.isAutoGenerated
      }
    }).catch(error => {
      console.log('Failed to send subtitle data to background:', error);
    });
  } else if (event.data.action === 'extractionFailed') {
    console.log('📨 Content script received extraction failure from injected script');
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'SUBTITLE_DATA',
      data: {
        type: 'YT_SUBTITLES_ERROR',
        error: event.data.data.reason || 'Subtitle extraction failed'
      }
    }).catch(error => {
      console.log('Failed to send error to background:', error);
    });
  }
});

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message.type);

  if (message.type === 'GET_CURRENT_URL') {
    sendResponse({url: window.location.href});
    return true;
  }

  if (message.type === 'GET_YOUTUBE_URL') {
    const url = window.location.href;
    const videoId = extractVideoId(url);
    sendResponse({
      url: url,
      videoId: videoId,
      isYoutube: url.includes('youtube.com')
    });
    return true;
  }

  if (message.type === 'EXTRACT_SUBTITLES') {
    console.log('🎯 Content script received EXTRACT_SUBTITLES request for video:', message.videoId);
    
    // Trigger subtitle extraction by sending message to injected script
    window.postMessage({
      type: 'TRIGGER_SUBTITLE_EXTRACTION',
      videoId: message.videoId
    }, '*');
    
    sendResponse({success: true});
    return true;
  }

  if (message.type === 'GET_YOUTUBE_DATA') {
    // Send more detailed information about the current video
    const videoId = extractVideoId(window.location.href);
    sendResponse({
      url: window.location.href,
      videoId: videoId,
      title: document.title,
      isWatchPage: window.location.pathname === '/watch' || window.location.pathname.includes('/shorts/')
    });
    return true;
  }

  if (message.type === 'REINJECT_EXTRACTOR') {
    console.log('🔄 Re-injecting subtitle extractor...');
    injectionAttempts = 0;
    injectSubtitleExtractor();
    sendResponse({success: true});
    return true;
  }

  if (message.type === 'SEEK_YOUTUBE_VIDEO') {
    console.log('⏯️ Seeking YouTube video to time:', message.time);
    
    // Check if injected script is available
    if (!document.querySelector('script[data-sidepanel-injected]')) {
      console.warn('⚠️ Injected script not found, attempting to inject...');
      injectSubtitleExtractor();
      // Retry after a delay
      setTimeout(() => {
        window.postMessage({
          type: 'SEEK_VIDEO',
          time: message.time
        }, '*');
      }, 1000);
    } else {
      // Send seek message to injected script
      window.postMessage({
        type: 'SEEK_VIDEO',
        time: message.time
      }, '*');
    }
    
    sendResponse({success: true});
    return true;
  }

  if (message.type === 'TOGGLE_YOUTUBE_PLAYBACK') {
    console.log('⏯️ Toggling YouTube video playback');
    
    // Check if injected script is available
    if (!document.querySelector('script[data-sidepanel-injected]')) {
      console.warn('⚠️ Injected script not found, attempting to inject...');
      injectSubtitleExtractor();
      // Retry after a delay
      setTimeout(() => {
        window.postMessage({
          type: 'TOGGLE_PLAY_PAUSE'
        }, '*');
      }, 1000);
    } else {
      // Send toggle message to injected script
      window.postMessage({
        type: 'TOGGLE_PLAY_PAUSE'
      }, '*');
    }
    
    sendResponse({success: true});
    return true;
  }

  if (message.type === 'GET_YOUTUBE_PLAY_STATE') {
    console.log('⏯️ Getting YouTube video play state');
    
    // Request play state from injected script
    window.postMessage({
      type: 'GET_PLAY_STATE'
    }, '*');
    
    sendResponse({success: true});
    return true;
  }

  if (message.type === 'GET_VIDEO_TIME') {
    // Request current video time from injected script
    window.postMessage({
      type: 'GET_CURRENT_TIME'
    }, '*');
    
    // We'll handle the response through the window message listener
    sendResponse({success: true});
    return true;
  }
});

// Initialize when DOM is ready (removed duplicate function)

// Initialize URL monitoring and setup  
function initializeUrlMonitoring() {
  console.log('🔧 Initializing enhanced URL monitoring system...');
  
  // Initial check
  checkUrlChange();
  
  // Method 1: Use MutationObserver like subz extension for DOM changes
  const urlObserver = new MutationObserver(detectUrlChange);
  urlObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Method 2: Set up interval monitoring as fallback (reduced frequency)
  urlCheckInterval = setInterval(checkUrlChange, 5000);
  
  // Method 3: Listen for navigation events
  window.addEventListener('popstate', () => {
    setTimeout(detectUrlChange, 500);
  });
  
  // Method 4: Monitor for pushState/replaceState changes like subz
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(detectUrlChange, 500);
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setTimeout(detectUrlChange, 500);
  };
  
  // Method 5: Listen for YouTube-specific events
  window.addEventListener('yt-navigate-finish', () => {
    console.log('🎯 YouTube navigation finished, checking URL...');
    setTimeout(detectUrlChange, 300);
  });
  
  window.addEventListener('yt-page-data-updated', () => {
    console.log('🎯 YouTube page data updated, checking URL...');
    setTimeout(detectUrlChange, 300);
  });
  
  console.log('✅ URL monitoring system initialized');
}

// Wait for page to be ready and initialize everything
function initialize() {
  console.log('🚀 Initializing YouTube content script...');
  
  // Inject subtitle extractor immediately  
  setTimeout(() => {
    injectSubtitleExtractor();
  }, 500);
  
  // Start URL monitoring
  initializeUrlMonitoring();
  
  console.log('✅ YouTube content script fully initialized');
}

// Clean up intervals when page unloads
window.addEventListener('beforeunload', () => {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
});

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // Page already loaded
  setTimeout(initialize, 100);
}

// Re-inject on page visibility change (handles tab switching)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(() => {
      if (!document.querySelector('script[data-sidepanel-injected]')) {
        console.log('🔄 Re-injecting subtitle extractor after visibility change...');
        injectionAttempts = 0;
        injectSubtitleExtractor();
      }
      checkUrlChange();
    }, 1000);
  }
});
