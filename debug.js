// --- Enhanced Debugging & Logging System ---
class Logger {
  constructor(level = 'info') {
    this.logLevel = this.levels[level] || this.levels.info;
    this.logs = [];
    console.log(`Logger initialized with level: ${level}`);
  }

  levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  log(level, message, data = null) {
    if (this.levels[level] >= this.logLevel) {
      const logEntry = {
        level: level,
        message: message,
        timestamp: new Date().toISOString(),
        data: data
      };

      this.logs.push(logEntry);

      // Also log to console for real-time debugging
      const style = `font-weight: bold; color: ${this.getColor(level)}`;
      console.log(`%c[${level.toUpperCase()}]`, style, message, data || '');

      // Dispatch event for debug UI
      window.dispatchEvent(new CustomEvent('logger-update', { detail: logEntry }));
    }
  }

  getColor(level) {
    switch (level) {
      case 'debug': return 'gray';
      case 'info': return 'blue';
      case 'warn': return 'orange';
      case 'error': return 'red';
      default: return 'black';
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    window.dispatchEvent(new CustomEvent('logger-clear'));
  }
}

// Global logger instance
window.logger = new Logger('debug');

// --- Diagnostic Tools ---
class Diagnostics {
  constructor(logger) {
    this.logger = logger;
  }

  async runAllChecks() {
    this.logger.log('info', 'Starting diagnostic checks...');

    await this.checkYoutubeObjects();
    await this.checkApiEndpoints();
    await this.checkExtractionMethods();

    this.logger.log('info', 'Diagnostic checks complete.');
  }

  async checkYoutubeObjects() {
    this.logger.log('info', 'Checking for key YouTube objects...');

    const objects = {
      ytInitialPlayerResponse: !!window.ytInitialPlayerResponse,
      ytplayer: !!window.ytplayer,
      player: !!document.getElementById('movie_player')
    };

    for (const [key, value] of Object.entries(objects)) {
      if (value) {
        this.logger.log('info', `✅ Found YouTube object: ${key}`);
      } else {
        this.logger.log('warn', `⚠️ Missing YouTube object: ${key}`);
      }
    }
  }

  async checkApiEndpoints() {
    this.logger.log('info', 'Checking YouTube API endpoints...');

    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      this.logger.log('warn', 'No video ID found, skipping API endpoint checks.');
      return;
    }

    const urlsToTest = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&kind=asr&lang=en`
    ];

    for (const url of urlsToTest) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          this.logger.log('info', `✅ API endpoint is reachable: ${url}`);
        } else {
          this.logger.log('error', `❌ API endpoint failed with status ${response.status}: ${url}`);
        }
      } catch (error) {
        this.logger.log('error', `❌ API endpoint fetch failed: ${url}`, error);
      }
    }
  }

  async checkExtractionMethods() {
    this.logger.log('info', 'Testing different subtitle extraction methods...');
    // This assumes an extractor object is available at window.youtubeTranscriptExtractor
    if (window.youtubeTranscriptExtractor) {
      const extractor = window.youtubeTranscriptExtractor;

      try {
        const tracks = await extractor.extractFromPlayerResponse();
        this.logger.log('info', `Method 'PlayerResponse' found ${tracks ? tracks.length : 0} tracks.`);
      } catch (error) {
        this.logger.log('warn', `Method 'PlayerResponse' failed: ${error.message}`);
      }

      try {
        const tracks = await extractor.extractFromPlayerAPI();
        this.logger.log('info', `Method 'PlayerAPI' found ${tracks ? tracks.length : 0} tracks.`);
      } catch (error) {
        this.logger.log('warn', `Method 'PlayerAPI' failed: ${error.message}`);
      }
    } else {
      this.logger.log('warn', 'youtubeTranscriptExtractor not found, skipping method checks.');
    }
  }
}

// Global diagnostics instance
window.diagnostics = new Diagnostics(window.logger);

console.log('✅ Debugging and diagnostics module loaded.');
