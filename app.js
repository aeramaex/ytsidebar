// SidePanel AI - Standalone Application
class SidePanelAI {
  constructor() {
    this.transcript = [];
    this.currentLineIndex = 0;
    this.isPlaying = false;
    this.currentPlayState = 'unknown';
    this.autoScroll = true;
    this.showTimestamps = true;
    this.isTranslated = false;
    this.searchQuery = '';
    this.settings = this.loadSettings();
    this.currentView = 'home';
    this.subtitlePromise = null;
    this.backgroundPort = null;
    this.subtitleResolve = null;
    this.currentTheme = 'light';
    this.videoSyncInterval = null; // For video time synchronization
    this.lastVideoTime = -1; // Track last video time to detect pauses
    this.pausedTimeCount = 0; // Count consecutive same times
    this.pendingUrlRequest = null; // For handling URL requests
    this.lastFetchTime = 0; // Rate limiting for transcript fetches
    this.lastFetchedVideoId = null; // Prevent duplicate fetches for same video
    this.init();
  }

  init() {
    this.connectToBackground();
    this.bindEvents();
    this.loadTheme();
    this.updateThemeIcon();
    
    // Initial auto-fetch attempt (for when side panel is opened on a video page)
    setTimeout(() => {
      console.log('🎬 Initial transcript check on sidepanel open...');
      this.autoFetchTranscript();
    }, 500);
    
    this.startVideoTimeSync();
    
    // More aggressive periodic check for transcript (as fallback)
    setInterval(() => {
      if (this.transcript.length === 0 && this.backgroundPort) {
        console.log('🔄 Periodic transcript check - no transcript found, attempting fetch...');
        this.autoFetchTranscript();
      }
    }, 3000); // Check every 3 seconds for more responsive detection
  }

  bindEvents() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Settings functionality
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettings();
      });
    }

    const backToHome = document.getElementById('back-to-home');
    if (backToHome) {
      backToHome.addEventListener('click', () => {
        this.hideSettings();
      });
    }

    const backToTranscript = document.getElementById('back-to-transcript');
    if (backToTranscript) {
      backToTranscript.addEventListener('click', () => {
        this.hideAIResult();
      });
    }

    // Transcript functionality
    const searchInput = document.getElementById('search-transcript');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTranscript(e.target.value);
      });
    }

    const timestampDropdown = document.getElementById('timestamp-dropdown');
    if (timestampDropdown) {
      timestampDropdown.addEventListener('change', (e) => {
        if (e.target.value) {
          this.jumpToTimestamp(parseInt(e.target.value));
        }
      });
    }

    const autoScrollCheckbox = document.getElementById('auto-scroll');
    if (autoScrollCheckbox) {
      autoScrollCheckbox.addEventListener('change', (e) => {
        this.autoScroll = e.target.checked;
      });
    }

    const showTimestampsCheckbox = document.getElementById('show-timestamps');
    if (showTimestampsCheckbox) {
      showTimestampsCheckbox.addEventListener('change', (e) => {
        this.showTimestamps = e.target.checked;
        this.toggleTimestamps();
      });
    }

    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
      translateBtn.addEventListener('click', () => {
        this.translateTranscript();
      });
    }

    const askAiBtn = document.getElementById('ask-ai');
    if (askAiBtn) {
      askAiBtn.addEventListener('click', () => {
        this.askAI();
      });
    }
  }

  loadTheme() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('sidepanel-theme') || 'light';
    this.currentTheme = savedTheme;
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.currentTheme = newTheme;
    this.applyTheme(newTheme);
    this.updateThemeIcon();
    
    // Save to localStorage
    localStorage.setItem('sidepanel-theme', newTheme);
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  updateThemeIcon() {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    
    if (!sunIcon || !moonIcon) return;
    
    if (this.currentTheme === 'dark') {
      // In dark mode, show sun icon (to switch to light)
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      // In light mode, show moon icon (to switch to dark)
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }

  showSettings() {
    const homeView = document.getElementById('home-view');
    const settingsView = document.getElementById('settings-view');
    
    if (homeView && settingsView) {
      homeView.classList.add('hidden');
      settingsView.classList.remove('hidden');
      settingsView.classList.add('flex');
    }
  }

  hideSettings() {
    const homeView = document.getElementById('home-view');
    const settingsView = document.getElementById('settings-view');
    
    if (homeView && settingsView) {
      settingsView.classList.add('hidden');
      settingsView.classList.remove('flex');
      homeView.classList.remove('hidden');
    }
  }

  hideAIResult() {
    const homeView = document.getElementById('home-view');
    const aiResultView = document.getElementById('ai-result-view');
    
    if (homeView && aiResultView) {
      aiResultView.classList.add('hidden');
      aiResultView.classList.remove('flex');
      homeView.classList.remove('hidden');
    }
  }

  connectToBackground() {
    console.log('🔌 Attempting to connect to background script...');
    
    // Enhanced debugging for connection issues
    if (!chrome || !chrome.runtime) {
      console.error('❌ Chrome runtime not available - extension may not be loaded');
      this.showError('Extension not properly loaded. Please refresh the page.');
      return;
    }

    try {
      this.backgroundPort = chrome.runtime.connect({ name: 'sidepanel' });
      console.log('✅ Successfully connected to background script');

      // Handle disconnection and auto-reconnect
      this.backgroundPort.onDisconnect.addListener(() => {
        console.log('🔌 Background port disconnected');
        this.backgroundPort = null;
        // Try to reconnect after a delay
        setTimeout(() => {
          if (!this.backgroundPort) {
            console.log('🔄 Attempting to reconnect...');
            this.connectToBackground();
          }
        }, 1000);
      });

      // Check for transcript when side panel connects with more delay to ensure stability
      setTimeout(() => {
        console.log('🔍 Starting initial auto-fetch transcript...');
        this.autoFetchTranscript();
      }, 1000); // Increased delay to ensure background connection is stable

      this.backgroundPort.onMessage.addListener((message) => {
        console.log('Side panel received message:', message.type);

        if (message.type === 'YOUTUBE_URL_CHANGED') {
          console.log('🎥 YouTube URL changed detected:', message.url);
          
          // Reset all state when navigating to a new video
          this.resetState();
          
          // Show loading state immediately
          const transcriptContainer = document.getElementById('transcript-container');
          if (transcriptContainer) {
            transcriptContainer.innerHTML = `
              <div id="no-transcript" class="text-center text-muted py-10">
                <div class="mb-4">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
                <p class="mb-2">New video detected, fetching transcript...</p>
                <p class="text-sm opacity-75">Please wait...</p>
              </div>
            `;
          }

          // Auto-fetch transcript when URL changes with optimized delay
          setTimeout(() => {
            console.log('🚀 Starting transcript fetch for URL change:', message.url);
            this.fetchTranscript(message.url, 0); // Start with retry count 0
          }, 600); // Optimized delay for better reliability
        }
        
        if (message.type === 'SUBTITLE_DATA') {
          this.handleSubtitleData(message.data);
        }

        if (message.type === 'VIDEO_TIME_RESPONSE') {
          this.updateCurrentLineFromVideoTime(message.currentTime);
        }

        // Handle automatic video time updates from content script
        if (message.type === 'VIDEO_TIME_UPDATE') {
          this.updateCurrentLineFromVideoTime(message.currentTime);
        }

        if (message.type === 'PLAYBACK_STATE_UPDATE') {
          this.updatePlaybackState(message.state);
        }

        if (message.type === 'YOUTUBE_URL_RESPONSE') {
          // Handle URL response for manual requests
          if (this.pendingUrlRequest && this.pendingUrlRequest.requestId === message.requestId) {
            this.pendingUrlRequest.resolve(message);
            this.pendingUrlRequest = null;
          }
        }
      });

      this.backgroundPort.onDisconnect.addListener(() => {
        console.warn('⚠️ Background port disconnected');
        this.backgroundPort = null;
        // Try to reconnect after a delay
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect to background...');
          this.connectToBackground();
        }, 2000);
      });

    } catch (error) {
      console.error('Failed to connect to background script:', error);
    }
  }

  async getYouTubeUrl() {
    // Check if Chrome extension APIs are available
    if (!chrome || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }

    // Use port-based communication for better reliability
    return new Promise((resolve, reject) => {
      if (!this.backgroundPort) {
        reject(new Error('Background port not available'));
        return;
      }

      const requestId = Date.now() + Math.random();
      this.pendingUrlRequest = { requestId, resolve, reject };

      // Set timeout for request (increased from 5 to 8 seconds for better reliability)
      setTimeout(() => {
        if (this.pendingUrlRequest && this.pendingUrlRequest.requestId === requestId) {
          this.pendingUrlRequest.reject(new Error('Request timeout - background may be slow'));
          this.pendingUrlRequest = null;
        }
      }, 8000);

      try {
        this.backgroundPort.postMessage({
          type: 'GET_YOUTUBE_URL',
          requestId: requestId
        });
        console.log('📤 Sent GET_YOUTUBE_URL request with ID:', requestId);
      } catch (error) {
        this.pendingUrlRequest = null;
        reject(new Error('Failed to send message to background: ' + error.message));
      }
    });
  }

  async autoFetchTranscript() {
    if (!this._autoFetchAttempts) this._autoFetchAttempts = 0;
    this._autoFetchAttempts++;
    console.log(`🎯 autoFetchTranscript called (attempt ${this._autoFetchAttempts})`);

    try {
      if (chrome && chrome.runtime) {
        if (!this.backgroundPort) {
          console.error('❌ No background port available in autoFetchTranscript');
          this.showError('Extension background connection not available. Try refreshing the page.');
          return;
        }
        try {
          console.log('📡 Requesting YouTube URL from background...');
          const response = await this.getYouTubeUrl();
          if (response && response.url && response.url.includes('youtube.com/watch')) {
            console.log('✅ Got YouTube URL:', response.url);

            // Show loading state immediately
            const transcriptContainer = document.getElementById('transcript-container');
            if (transcriptContainer && this.transcript.length === 0) {
              transcriptContainer.innerHTML = `
                <div id="no-transcript" class="text-center text-muted py-10">
                  <div class="mb-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                  <p class="mb-2">Auto-fetching transcript...</p>
                  <p class="text-sm opacity-75">Please wait...</p>
                </div>
              `;
            }

            // Fetch transcript with shorter delay
            setTimeout(() => {
              console.log('🚀 Starting transcript fetch for auto-fetch');
              this.fetchTranscript(response.url, 0);
            }, 500);
          } else {
            console.log('🚫 Not on YouTube video page, skipping auto-fetch');
            if (this._autoFetchAttempts > 3) {
              this.showError('Not on a YouTube video page. Please open a video to fetch transcript.');
            }
          }
        } catch (sendMessageError) {
          console.log('⚠️ Could not get YouTube URL:', sendMessageError.message);
          // Try again in 2 seconds if it's a connection issue
          if (sendMessageError.message.includes('timeout') || sendMessageError.message.includes('port')) {
            console.log('🔄 Retrying auto-fetch in 2 seconds due to connection issue...');
            setTimeout(() => {
              this.autoFetchTranscript();
            }, 2000);
          } else {
            if (this._autoFetchAttempts > 3) {
              this.showError('Failed to get YouTube URL from background. Try refreshing the page.');
            }
          }
        }
      } else {
        console.log('🚫 Running in standalone mode - auto-fetch disabled');
        this.showError('Extension is not running in Chrome. Auto-fetch is disabled.');
      }
    } catch (error) {
      console.log('❌ Error in autoFetchTranscript:', error);
      if (this._autoFetchAttempts > 3) {
        this.showError('Repeated errors fetching transcript. Try refreshing the page.');
      }
    }

    // Fallback: if after 5 attempts and still no transcript, force fetch
    if (this._autoFetchAttempts === 5 && this.backgroundPort) {
      console.warn('⚠️ Forcing transcript fetch after 5 failed attempts...');
      this.fetchTranscript(null, 0);
    }
  }

  async fetchTranscript(url = null, retryCount = 0) {
    const maxRetries = 2;
    const now = Date.now();
    
    // Rate limiting: don't fetch more than once every 1 second (reduced from 3 seconds)
    if (now - this.lastFetchTime < 1000) {
      console.log('🚫 Skipping transcript fetch - too frequent (rate limited)');
      return;
    }
    
    // If no URL provided, try to get current YouTube URL
    if (!url) {
      try {
        const response = await this.getYouTubeUrl();
        if (response && response.url && response.url.includes('youtube.com/watch')) {
          url = response.url;
        }
      } catch (error) {
        console.log('Could not get current YouTube URL:', error);
      }
    }

    if (!url) {
      this.showError('Please navigate to a YouTube video first');
      return;
    }

    // Extract video ID and check if we already fetched this video
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.showError('Could not extract video ID from URL');
      return;
    }

    // Don't fetch if we already have transcript for this video
    if (videoId === this.lastFetchedVideoId && this.transcript.length > 0) {
      console.log('📝 Already have transcript for this video:', videoId);
      return;
    }

    try {
      this.lastFetchTime = now;
      this.lastFetchedVideoId = videoId;

      const transcriptContainer = document.getElementById('transcript-container');
      transcriptContainer.innerHTML = `
        <div id="no-transcript" class="text-center text-muted py-10">
          <div class="mb-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
          <p class="mb-2">Fetching transcript...${retryCount > 0 ? ` (Attempt ${retryCount + 1})` : ''}</p>
          <p class="text-sm opacity-75">This may take a few seconds</p>
        </div>
      `;

      console.log('🎯 Fetching transcript for video:', videoId, retryCount > 0 ? `(Retry ${retryCount})` : '');

      // First try using the content script injection method
      let transcript = await this.fetchYouTubeSubtitles(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.log('⚠️ Content script method failed, trying direct method...');

        // Try the YouTube transcript fetcher as fallback
        try {
          if (window.YouTubeTranscript) {
            console.log('🔄 Trying YouTube transcript fetcher...');
            transcript = await window.YouTubeTranscript.fetchTranscript(url);
          }
        } catch (fallbackError) {
          console.log('Direct fetcher also failed:', fallbackError.message);
        }

        // If still no transcript, show error
        if (!transcript || transcript.length === 0) {
          throw new Error('No transcript available for this video. The video may not have captions or subtitles enabled.');
        }
      }

      // Successfully got transcript
      this.transcript = transcript;
      this.displayTranscript(transcript);
      this.startVideoTimeSync(); // Start video time sync for auto-scroll
      console.log('✅ Transcript loaded successfully:', transcript.length, 'lines');

    } catch (error) {
      console.error('❌ Error fetching transcript:', error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying transcript fetch in 2 seconds... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          this.fetchTranscript(url, retryCount + 1);
        }, 2000);
        return;
      }
      
      this.showError(error.message);
    }
  }

  async fetchYouTubeSubtitles(videoId) {
    // Use content script injection method for subtitle extraction
    return new Promise((resolve) => {
      if (!this.backgroundPort) {
        console.log('No background port available for subtitle extraction');
        resolve(null);
        return;
      }

      // Store the resolve function to call when we get subtitle data
      this.subtitleResolve = resolve;

      // Request subtitle extraction
      this.backgroundPort.postMessage({
        type: 'EXTRACT_SUBTITLES',
        videoId: videoId
      });

      // Set timeout for subtitle extraction
      setTimeout(() => {
        if (this.subtitleResolve === resolve) {
          console.log('⏰ Subtitle extraction timeout');
          this.subtitleResolve = null;
          resolve(null);
        }
      }, 10000); // 10 second timeout
    });
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  displayTranscript(transcript) {
    const container = document.getElementById('transcript-container');
    if (!container) return;

    // Clear loading state
    container.innerHTML = '';

    // Create transcript items
    transcript.forEach((item, index) => {
      const transcriptItem = document.createElement('div');
      transcriptItem.className = 'transcript-item p-3 rounded-lg border border-border bg-card hover:bg-background-secondary transition-colors cursor-pointer';
      transcriptItem.dataset.index = index;
      transcriptItem.dataset.offset = item.offset;
      transcriptItem.dataset.timestamp = item.timestamp;

      // Add click handler for seeking
      transcriptItem.addEventListener('click', () => {
        this.jumpToTimestamp(index);
      });

      transcriptItem.innerHTML = `
        <div class="flex items-start gap-3">
          ${this.showTimestamps ? `<span class="timestamp text-xs text-muted font-mono bg-background-tertiary px-2 py-1 rounded">${item.timestamp}</span>` : ''}
          <span class="text-sm font-medium flex-1">${item.text}</span>
        </div>
      `;

      container.appendChild(transcriptItem);
    });

    // Enable controls
    this.enableControls();
    
    // Initial render to highlight current line
    this.renderTranscript();
  }

  enableControls() {
    // Enable search
    const searchInput = document.getElementById('search-transcript');
    if (searchInput) {
      searchInput.disabled = false;
    }

    // Enable timestamp dropdown
    const timestampDropdown = document.getElementById('timestamp-dropdown');
    if (timestampDropdown) {
      timestampDropdown.disabled = false;
      this.populateTimestampDropdown();
    }

    // Enable language select and translate button
    const languageSelect = document.getElementById('target-language');
    const translateBtn = document.getElementById('translate-btn');
    if (languageSelect) languageSelect.disabled = false;
    if (translateBtn) translateBtn.disabled = false;

    // Enable AI input
    const aiQuestion = document.getElementById('ai-question');
    const askAiBtn = document.getElementById('ask-ai');
    if (aiQuestion) aiQuestion.disabled = false;
    if (askAiBtn) askAiBtn.disabled = false;
  }

  populateTimestampDropdown() {
    const dropdown = document.getElementById('timestamp-dropdown');
    if (!dropdown || !this.transcript) return;

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Select a timestamp to jump to...</option>';

    // Add timestamp options (every 5th line to avoid too many options)
    this.transcript.forEach((item, index) => {
      if (index % 5 === 0) {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${item.timestamp} - ${item.text.substring(0, 50)}...`;
        dropdown.appendChild(option);
      }
    });
  }

  showError(message) {
    const container = document.getElementById('transcript-container');
    if (container) {
      container.innerHTML = `
        <div id="no-transcript" class="text-center text-muted py-20">
          <div class="mb-6">
            <svg class="w-16 h-16 mx-auto text-error opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-foreground mb-2">Error</h3>
          <p class="text-sm text-foreground-secondary px-4">${message}</p>
        </div>
      `;
    }
  }

  resetState() {
    this.transcript = [];
    this.currentLineIndex = 0;
    this.isPlaying = false;
    this.currentPlayState = 'unknown';
    this.isTranslated = false;
    this.searchQuery = '';
    this.lastFetchedVideoId = null; // Reset video ID tracking
    this.stopVideoTimeSync();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('sidepanel-settings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  }

  searchTranscript(query) {
    this.searchQuery = query.toLowerCase();
    const items = document.querySelectorAll('.transcript-item');
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (!query || text.includes(this.searchQuery)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  jumpToTimestamp(index) {
    if (!this.transcript || !this.transcript[index]) return;
    
    const item = this.transcript[index];
    const timeInSeconds = this.timestampToSeconds(item.timestamp);
    
    // Seek video to the timestamp
    if (this.backgroundPort) {
      try {
        this.backgroundPort.postMessage({
          type: 'SEEK_YOUTUBE_VIDEO',
          time: timeInSeconds
        });
        console.log('⏯️ Seeking to:', timeInSeconds, 'seconds for timestamp:', item.timestamp);
      } catch (error) {
        console.log('Failed to seek video:', error);
      }
    }
    
    // Update current line index and render
    this.currentLineIndex = index;
    this.renderTranscript();
    
    // Scroll to the item
    const transcriptItems = document.querySelectorAll('.transcript-item');
    if (transcriptItems[index]) {
      this.scrollToCurrentLine(transcriptItems[index]);
    }
  }

  toggleTimestamps() {
    const timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(ts => {
      if (this.showTimestamps) {
        ts.style.display = 'inline-block';
      } else {
        ts.style.display = 'none';
      }
    });
  }

  translateTranscript() {
    // Placeholder for translation functionality
    console.log('Translation not implemented yet');
  }

  askAI() {
    // Placeholder for AI functionality
    console.log('AI functionality not implemented yet');
  }

  handleSubtitleData(data) {
    console.log('📨 Handling subtitle data:', data.type);
    
    if (data.type === 'YT_SUBTITLES_SUCCESS' || data.type === 'YT_SUBTITLES') {
      console.log('✅ Received subtitle data, processing...');

      // Guard against empty or null subtitle payloads to prevent runtime errors
      if (!data.subtitles || data.subtitles.length === 0) {
        console.warn('⚠️ Empty or null subtitles received');
        if (this.subtitleResolve) {
          this.subtitleResolve(null);
          this.subtitleResolve = null;
        } else {
          this.showError('No subtitles found for this video.');
        }
        return;
      }

      // Convert subtitle data to transcript format
      const transcript = this.convertSubtitlesToTranscript(data.subtitles);
      
      if (transcript && transcript.length > 0) {
        // If we have a pending subtitle request, resolve it
        if (this.subtitleResolve) {
          this.subtitleResolve(transcript);
          this.subtitleResolve = null;
          return; // Don't display twice
        }
        
        // Otherwise display directly (for URL change events)
        this.transcript = transcript;
        this.displayTranscript(transcript);
        this.startVideoTimeSync(); // Start video time sync for auto-scroll
        console.log('✅ Transcript loaded successfully from content script:', transcript.length, 'lines');
      } else {
        console.log('❌ No valid transcript data received');
        if (this.subtitleResolve) {
          this.subtitleResolve(null);
          this.subtitleResolve = null;
        } else {
          this.showError('Failed to process transcript data');
        }
      }
    } else if (data.type === 'YT_SUBTITLES_ERROR') {
      console.log('❌ Subtitle extraction error:', data.error);
      if (this.subtitleResolve) {
        this.subtitleResolve(null);
        this.subtitleResolve = null;
      } else {
        this.showError(data.error || 'Failed to extract subtitles');
      }
    }
  }

  convertSubtitlesToTranscript(subtitles) {
    if (!subtitles || !Array.isArray(subtitles)) {
      console.log('❌ Invalid subtitle data format');
      return null;
    }

    return subtitles.map((item, index) => ({
      id: index + 1,
      timestamp: item.timestamp || this.formatTimestamp(item.start || 0),
      text: item.text || '',
      offset: (item.start || 0) * 1000 // Convert to milliseconds
    }));
  }

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  startVideoTimeSync() {
    // Don't start if we don't have a background connection
    if (!this.backgroundPort) {
      console.log('⚠️ No background port available, cannot start video time sync');
      return;
    }

    // Request video time updates every 500ms for smooth synchronization
    if (this.videoSyncInterval) {
      clearInterval(this.videoSyncInterval);
    }

    this.lastVideoTime = -1; // Track last video time to detect if video is paused
    this.pausedTimeCount = 0; // Count how many times we get the same time

    this.videoSyncInterval = setInterval(() => {
      if (this.backgroundPort && this.transcript.length > 0) {
        try {
          this.backgroundPort.postMessage({
            type: 'GET_VIDEO_TIME'
          });
        } catch (error) {
          console.log('Failed to request video time:', error.message);
          // Stop the interval if connection is lost
          if (error.message.includes('Extension context invalidated')) {
            this.stopVideoTimeSync();
          }
        }
      }
    }, 500);
  }

  stopVideoTimeSync() {
    if (this.videoSyncInterval) {
      clearInterval(this.videoSyncInterval);
      this.videoSyncInterval = null;
    }
  }

  updateCurrentLineFromVideoTime(currentTime) {
    if (!this.transcript.length || !this.autoScroll) return;

    // Check if video time is stuck (same time repeated)
    if (this.lastVideoTime === currentTime) {
      this.pausedTimeCount++;
      // If we get the same time 5 times in a row, assume video is paused
      if (this.pausedTimeCount >= 5) {
        // Reduce sync frequency when video is paused to avoid console spam
        if (this.videoSyncInterval && this.pausedTimeCount === 5) {
          clearInterval(this.videoSyncInterval);
          // Check less frequently when paused
          this.videoSyncInterval = setInterval(() => {
            if (this.backgroundPort && this.transcript.length > 0) {
              try {
                this.backgroundPort.postMessage({
                  type: 'GET_VIDEO_TIME'
                });
              } catch (error) {
                console.log('Failed to request video time:', error.message);
                if (error.message.includes('Extension context invalidated')) {
                  this.stopVideoTimeSync();
                }
              }
            }
          }, 2000); // Check every 2 seconds when paused
        }
        return; // Don't update UI when video is paused
      }
    } else {
      // Video time changed, reset paused counter and restore normal sync frequency
      if (this.pausedTimeCount >= 5) {
        console.log('🎮 Video resumed, restoring normal sync frequency');
        this.startVideoTimeSync(); // Restore normal 500ms interval
      }
      this.pausedTimeCount = 0;
      this.lastVideoTime = currentTime;
    }

    // Find the current line based on video time
    let newCurrentIndex = 0;
    for (let i = 0; i < this.transcript.length; i++) {
      const lineTime = this.timestampToSeconds(this.transcript[i].timestamp);
      if (currentTime >= lineTime) {
        newCurrentIndex = i;
      } else {
        break;
      }
    }

    // Only update if the line actually changed
    if (newCurrentIndex !== this.currentLineIndex) {
      this.currentLineIndex = newCurrentIndex;
      this.renderTranscript();
    }
  }

  updatePlaybackState(state) {
    console.log('🎮 Video playback state updated:', this.currentPlayState, '->', state);
    this.currentPlayState = state;
    
    // Update UI to reflect play state (without showing toast for every state change)
    this.renderTranscript();
  }

  renderTranscript() {
    const container = document.getElementById('transcript-container');
    if (!container || !this.transcript || this.transcript.length === 0) return;

    // Remove existing highlights
    const existingHighlights = container.querySelectorAll('.transcript-item.current-line');
    existingHighlights.forEach(item => item.classList.remove('current-line'));

    // Find and highlight the current line
    const transcriptItems = container.querySelectorAll('.transcript-item');
    if (transcriptItems[this.currentLineIndex]) {
      const currentItem = transcriptItems[this.currentLineIndex];
      currentItem.classList.add('current-line');

      // Auto-scroll to current line if enabled
      if (this.autoScroll) {
        this.scrollToCurrentLine(currentItem);
      }
    }

    // Update play state indicator if needed
    this.updatePlayStateIndicator();
  }

  scrollToCurrentLine(currentItem) {
    if (!currentItem) return;

    const container = document.getElementById('transcript-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = currentItem.getBoundingClientRect();

    // Check if item is outside the visible area
    const isAbove = itemRect.top < containerRect.top + 20;
    const isBelow = itemRect.bottom > containerRect.bottom - 20;

    if (isAbove || isBelow) {
      // Smooth scroll to center the current item
      const scrollTop = currentItem.offsetTop - container.offsetTop - (container.clientHeight / 2) + (currentItem.clientHeight / 2);
      
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }

  updatePlayStateIndicator() {
    // Add visual indicator for play state if needed
    const playStateElement = document.querySelector('.play-state-indicator');
    if (playStateElement) {
      playStateElement.textContent = this.currentPlayState === 'playing' ? '▶️' : '⏸️';
      playStateElement.title = `Video is ${this.currentPlayState}`;
    }
  }

  timestampToSeconds(timestamp) {
    const parts = timestamp.split(':').map(part => parseInt(part));
    if (parts.length === 2) {
      // mm:ss format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // hh:mm:ss format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // ...existing methods...
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelAI();
});
