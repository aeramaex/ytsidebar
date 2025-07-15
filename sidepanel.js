// --- Side Panel Logic ---
const statusMessage = document.getElementById('status-message');
const extractBtn = document.getElementById('extract-btn');
const apiKeyInput = document.getElementById('api-key-input');
const transcriptContainer = document.getElementById('transcript-container');
const errorContainer = document.getElementById('error-container');

let currentVideoId = null;

// Function to update the status message
function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? 'red' : 'black';
}

// Function to display subtitles
function displaySubtitles(subtitles) {
  transcriptContainer.innerHTML = '';
  subtitles.forEach(line => {
    const p = document.createElement('p');
    p.textContent = `[${line.start.toFixed(2)}] ${line.text}`;
    transcriptContainer.appendChild(p);
  });
}

// Function to display an error
function displayError(error) {
  errorContainer.textContent = error;
}

// Listen for the extract button click
extractBtn.addEventListener('click', () => {
  if (currentVideoId) {
    setStatus('Extracting subtitles...');
    errorContainer.textContent = '';
    transcriptContainer.innerHTML = '';

    const apiKey = apiKeyInput.value.trim();

    // First, try the normal extraction method
    chrome.runtime.sendMessage({
      type: 'EXTRACT_SUBTITLES',
      videoId: currentVideoId
    });

    // If an API key is provided, also try the API method as a fallback
    if (apiKey) {
      setTimeout(() => {
        if (transcriptContainer.innerHTML === '') {
          setStatus('Normal extraction failed, trying API fallback...');
          chrome.runtime.sendMessage({
            type: 'TRIGGER_API_EXTRACTION',
            videoId: currentVideoId,
            apiKey: apiKey
          });
        }
      }, 5000); // 5-second timeout before trying API
    }
  } else {
    setStatus('Not on a YouTube video page.', true);
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'YOUTUBE_URL_CHANGED') {
    currentVideoId = request.videoId;
    setStatus(`On video: ${currentVideoId}`);
    transcriptContainer.innerHTML = '';
    errorContainer.textContent = '';
  } else if (request.type === 'SUBTITLES_EXTRACTED') {
    setStatus('Subtitles extracted successfully!');
    displaySubtitles(request.subtitles);
  } else if (request.type === 'SUBTITLES_ERROR') {
    setStatus('Error extracting subtitles.', true);
    displayError(request.error);
  }
});

// Get the current video ID when the side panel is opened
chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO_ID' });
