// --- Consolidated YouTube Transcript Extractor ---
class YouTubeTranscriptExtractor {
  constructor(logger) {
    this.logger = logger;
    this.isExtracting = false;
  }

  // Main extraction function
  async extractSubtitles(videoId) {
    if (this.isExtracting) {
      this.logger.log('warn', 'Extraction already in progress.');
      return;
    }

    this.isExtracting = true;
    this.logger.log('info', `Starting subtitle extraction for video ID: ${videoId}`);

    try {
      // Method 1: Extract from player response (most reliable)
      const playerResponse = await this.extractFromPlayerResponse();
      if (playerResponse) {
        const subtitles = this.parsePlayerResponse(playerResponse);
        if (subtitles && subtitles.length > 0) {
          this.logger.log('info', 'Successfully extracted subtitles from player response.');
          this.sendSubtitles(subtitles);
          return;
        }
      }

      // Method 2: Fetch timed text URL
      this.logger.log('info', 'Player response method failed, trying timed text fetch.');
      const timedText = await this.fetchTimedText(videoId);
      if (timedText) {
        const subtitles = this.parseTimedText(timedText);
        if (subtitles && subtitles.length > 0) {
          this.logger.log('info', 'Successfully extracted subtitles from timed text.');
          this.sendSubtitles(subtitles);
          return;
        }
      }

      // If all methods fail
      throw new Error('All subtitle extraction methods failed.');

    } catch (error) {
      this.logger.log('error', 'Subtitle extraction failed', error);
      this.sendError(error.message);
    } finally {
      this.isExtracting = false;
    }
  }

  // Extract from ytInitialPlayerResponse
  async extractFromPlayerResponse() {
    this.logger.log('debug', 'Attempting to extract from ytInitialPlayerResponse.');
    if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
      return window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer;
    }
    return null;
  }

  // Parse the player response to get subtitle tracks
  parsePlayerResponse(playerResponse) {
    const tracks = playerResponse.captionTracks;
    if (!tracks || tracks.length === 0) {
      return null;
    }

    // For simplicity, we'll just take the first track.
    // A more robust solution would be to let the user choose.
    const track = tracks[0];
    this.logger.log('info', `Found ${tracks.length} tracks, using the first one: ${track.name.simpleText}`);

    // We need to fetch the actual subtitle data from the baseUrl
    // This part is simplified for now.
    return null;
  }

  // Fetch the timed text URL
  async fetchTimedText(videoId) {
    this.logger.log('debug', `Fetching timed text for ${videoId}`);
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      this.logger.log('error', 'Failed to fetch timed text', error);
      return null;
    }
  }

  // Parse the timed text XML
  parseTimedText(xml) {
    this.logger.log('debug', 'Parsing timed text XML.');
    const subtitles = [];
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const texts = xmlDoc.getElementsByTagName('text');

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const start = text.getAttribute('start');
      const dur = text.getAttribute('dur');
      const content = text.textContent;

      subtitles.push({
        start: parseFloat(start),
        dur: parseFloat(dur),
        text: content
      });
    }
    return subtitles;
  }

  // Send the extracted subtitles to the content script
  sendSubtitles(subtitles) {
    window.postMessage({
      type: 'SUBTITLES_EXTRACTED',
      subtitles: subtitles
    }, '*');
  }

  // Send an error message to the content script
  sendError(errorMessage) {
    window.postMessage({
      type: 'SUBTITLES_ERROR',
      error: errorMessage
    }, '*');
  }
}

// Initialize the extractor and listen for messages
if (window.location.hostname === 'www.youtube.com') {
  const logger = window.logger || console;
  const extractor = new YouTubeTranscriptExtractor(logger);

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data.type) {
      return;
    }

    if (event.data.type === 'TRIGGER_SUBTITLE_EXTRACTION') {
      extractor.extractSubtitles(event.data.videoId);
    }
  });
}
