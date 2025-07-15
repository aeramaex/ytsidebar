// Simplified content script for YouTube pages
console.log("SidePanel AI content script loaded.");

let currentVideoId = null;

// Function to inject a script into the page
function injectScript(scriptName) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(scriptName);
  s.onload = function() {
    console.log(`${scriptName} injected successfully.`);
    this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

// Extract video ID from URL
function getVideoId(url) {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
}

// Main function to run on page load and on URL changes
function initialize() {
  const videoId = getVideoId(window.location.href);

  if (videoId && videoId !== currentVideoId) {
    console.log(`New video detected: ${videoId}`);
    currentVideoId = videoId;

    // Inject the necessary scripts
    injectScript('debug.js');
    injectScript('youtube-transcript-extractor.js');
    injectScript('youtube-api-extractor.js');

    // Notify the background script of the new video
    chrome.runtime.sendMessage({
      type: 'YOUTUBE_URL_CHANGED',
      videoId: videoId
    });
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_SUBTITLES') {
    console.log(`Received request to extract subtitles for ${request.videoId}`);
    window.postMessage({ type: 'TRIGGER_SUBTITLE_EXTRACTION', videoId: request.videoId }, '*');
    sendResponse({ success: true });
  }
});

// Run the initialize function when the page loads
initialize();

// YouTube uses single-page navigation, so we need to detect URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });
