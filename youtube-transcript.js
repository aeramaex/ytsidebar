// YouTube Transcript Fetcher for Browser Extension - Enhanced 2025 Edition
class YouTubeTranscript {
  static lastRequestTime = 0;
  static minRequestInterval = 1500; // 1.5 seconds between requests
  
  // Simple rate limiting for transcript requests
  static async throttledFetch(url, options = {}) {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Throttling transcript request, waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      // Always include credentials (cookies) in requests to ensure access to caption endpoints that require authentication.
      // Add an AbortController so we can timeout slow requests (default 12s)
      const { timeout = 12000, ...restOptions } = options;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('Timeout exceeded')), timeout);

      const fetchOptions = { ...restOptions, credentials: 'include', signal: controller.signal };
      const response = await fetch(url, fetchOptions);
      clearTimeout(timer);

      // Handle rate limiting
      if (response.status === 429) {
        console.warn(`⚠️ Transcript request rate limited (429), backing off for 3000ms`);
        await new Promise(r => setTimeout(r, 3000));
        throw new Error(`HTTP 429: Rate limited`);
      }

      return response;
    } catch (error) {
      console.error('Throttled fetch error:', error);
      throw error;
    }
  }

  static async fetchTranscript(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log('🎯 Fetching transcript for video ID:', videoId);

      // Try multiple modern methods to get transcript
      let transcript = null;
      
      // Method 1: Try to extract from current page using enhanced detection
      if (window.location && window.location.hostname === 'www.youtube.com') {
        try {
          console.log('🔍 Trying enhanced current page extraction...');
          transcript = await this.extractFromCurrentPageEnhanced(videoId);
          if (transcript && transcript.length > 0) {
            console.log('✅ Successfully extracted transcript from current page');
            return transcript;
          }
        } catch (error) {
          console.log('❌ Current page extraction failed:', error.message);
        }
      }

      // Method 2: Try with multiple language codes and formats
      const languageCodes = ['en', 'en-US', 'en-GB'];
      const formats = ['json3', 'srv3', 'ttml', 'vtt'];
      
      for (const lang of languageCodes) {
        for (const fmt of formats) {
          try {
            console.log(`🔄 Trying ${fmt} format with language ${lang}...`);
            const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=${fmt}`;
            const response = await this.throttledFetch(transcriptUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json, text/xml, */*',
                'User-Agent': navigator.userAgent
              }
            });
            
            if (response.ok) {
              const contentType = response.headers.get('content-type') || '';
              
              if (fmt === 'json3' || contentType.includes('json')) {
                const data = await response.json();
                if (data && data.events) {
                  transcript = this.parseJSON3Transcript(data);
                  if (transcript && transcript.length > 0) {
                    console.log(`✅ Successfully fetched transcript from ${fmt} API with ${lang}`);
                    return transcript;
                  }
                }
              } else {
                const textData = await response.text();
                if (textData && textData.trim()) {
                  if (fmt === 'srv3' || fmt === 'ttml') {
                    transcript = this.parseTranscriptXML(textData);
                  } else if (fmt === 'vtt') {
                    transcript = this.parseVTTTranscript(textData);
                  } else {
                    transcript = this.parseTranscriptXML(textData);
                  }
                  
                  if (transcript && transcript.length > 0) {
                    console.log(`✅ Successfully fetched transcript from ${fmt} API with ${lang}`);
                    return transcript;
                  }
                }
              }
            }
          } catch (error) {
            console.log(`❌ ${fmt} API with ${lang} failed:`, error.message);
          }
        }
      }

      // Method 3: Try auto-generated captions with different approaches
      try {
        console.log('🤖 Trying auto-generated captions...');
        const autoGenUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&asr_langs=en&caps=asr&exp=xfm&xorp=true&xoaf=5&hl=en&ip=0.0.0.0&ipbits=0&expire=19000000000&sparams=ip,ipbits,expire&signature=dummy&key=yttt1&fmt=json3`;
        const response = await this.throttledFetch(autoGenUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.events) {
            transcript = this.parseJSON3Transcript(data);
            if (transcript && transcript.length > 0) {
              console.log('✅ Successfully fetched auto-generated transcript');
              return transcript;
            }
          }
        }
      } catch (error) {
        console.log('❌ Auto-generated captions failed:', error.message);
      }

      // Method 4: Try fallback with different API endpoints
      try {
        console.log('🔄 Trying fallback API endpoints...');
        const fallbackUrls = [
          `https://youtube.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
          `https://www.youtube.com/get_video_info?video_id=${videoId}`,
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        ];

        for (const fallbackUrl of fallbackUrls) {
          try {
            const response = await this.throttledFetch(fallbackUrl);
            if (response.ok) {
              const data = await response.json();
              console.log('Fallback API response received, but parsing not implemented for this endpoint');
            }
          } catch (e) {
            console.log('Fallback URL failed:', fallbackUrl);
          }
        }
      } catch (error) {
        console.log('❌ Fallback methods failed:', error.message);
      }

      // If all methods fail, throw error with helpful message
      throw new Error(`Could not fetch transcript for video ${videoId}. This video may not have captions available, captions may be disabled, or they may be in a language not supported by this extraction method.`);
    } catch (error) {
      console.error('❌ Transcript fetch error:', error);
      throw error;
    }
  }

  static extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  static parseJSON3Transcript(data) {
    const transcript = [];
    let id = 1;
    
    for (const event of data.events || []) {
      if (event.segs) {
        const startTime = (event.tStartMs || 0) / 1000;
        const duration = (event.dDurationMs || 0) / 1000;
        const text = event.segs.map(seg => seg.utf8 || '').join('').trim();
        
        if (text) {
          transcript.push({
            id: id++,
            timestamp: this.formatTimestamp(startTime),
            text: this.cleanText(text),
            offset: event.tStartMs || 0,
            duration: duration,
            endTime: startTime + duration
          });
        }
      }
    }
    
    return transcript;
  }

  static parseTranscriptXML(xmlText) {
    // Use safe regex parsing instead of DOMParser to avoid TrustedHTML issues
    const textRegex = /<text[^>]*start="([^"]*)"[^>]*(?:dur="([^"]*)")?[^>]*>(.*?)<\/text>/g;
    const transcript = [];
    let match;
    let id = 1;
    
    while ((match = textRegex.exec(xmlText)) !== null) {
      const start = parseFloat(match[1] || 0);
      const duration = parseFloat(match[2] || 0);
      const text = match[3] || '';
      
      // Decode HTML entities
      const decodedText = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      if (decodedText.trim()) {
        transcript.push({
          id: id++,
          timestamp: this.formatTimestamp(start),
          text: this.cleanText(decodedText),
          offset: start * 1000,
          duration: duration,
          endTime: start + duration
        });
      }
    }
    
    return transcript;
  }

  static async extractFromCurrentPageEnhanced(videoId) {
    // Enhanced method to extract captions from the current YouTube page
    console.log('🔍 Enhanced extraction from current page for video:', videoId);
    
    // Wait for page to be fully loaded and stabilized
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let captionTracks = null;
    let playerData = null;
    
    // Method 1: Try window.ytInitialPlayerResponse first (most reliable)
    if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
      try {
        playerData = window.ytInitialPlayerResponse;
        captionTracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && captionTracks.length > 0) {
          console.log('✅ Found caption tracks in window.ytInitialPlayerResponse');
        }
      } catch (e) {
        console.log('❌ Failed to extract from window.ytInitialPlayerResponse:', e.message);
      }
    }

    // Method 2: Extract from script tags if window method failed
    if (!captionTracks || captionTracks.length === 0) {
      const scripts = document.getElementsByTagName('script');
      
      for (let script of scripts) {
        const content = script.textContent || '';
        
        // Look for ytInitialPlayerResponse with more flexible patterns
        if (content.includes('ytInitialPlayerResponse') && content.includes('captionTracks')) {
          try {
            // Try multiple extraction patterns
            const patterns = [
              /var ytInitialPlayerResponse = ({.+?});/,
              /ytInitialPlayerResponse":\s*({.+?})(?:,|;|\})/,
              /"ytInitialPlayerResponse":\s*({.+?})(?:,|;|\})/,
              /ytInitialPlayerResponse\s*=\s*({.+?});/
            ];

            for (const pattern of patterns) {
              const match = content.match(pattern);
              if (match) {
                try {
                  playerData = JSON.parse(match[1]);
                  captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                  if (captionTracks && captionTracks.length > 0) {
                    console.log('✅ Found caption tracks in script tag using pattern');
                    break;
                  }
                } catch (parseError) {
                  console.log('Parse error with pattern, trying next...', parseError.message);
                }
              }
            }
            
            if (captionTracks && captionTracks.length > 0) {
              break;
            }
          } catch (e) {
            console.log('❌ Failed to parse ytInitialPlayerResponse from script:', e.message);
          }
        }
      }
    }

    // Method 3: Try to find caption tracks directly in global variables
    if (!captionTracks || captionTracks.length === 0) {
      try {
        // Check various global YouTube variables
        const globalVars = ['yt', 'ytplayer', 'ytcfg', 'ytInitialData'];
        
        for (const varName of globalVars) {
          if (window[varName]) {
            console.log(`🔍 Searching in window.${varName}...`);
            const searchResult = this.deepSearch(window[varName], 'captionTracks');
            if (searchResult && Array.isArray(searchResult) && searchResult.length > 0) {
              captionTracks = searchResult;
              console.log(`✅ Found caption tracks in window.${varName}`);
              break;
            }
          }
        }
      } catch (e) {
        console.log('❌ Global variable search failed:', e.message);
      }
    }

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('No captions found on this page. The video may not have captions enabled or captions may be loading.');
    }

    console.log(`📝 Found ${captionTracks.length} caption track(s)`);
    
    // Select the best caption track with enhanced logic
    let selectedTrack = this.selectBestTrackEnhanced(captionTracks);

    if (!selectedTrack || !selectedTrack.baseUrl) {
      throw new Error('No suitable caption track found or missing baseUrl');
    }

    console.log('🎯 Using caption track:', selectedTrack.name?.simpleText || selectedTrack.languageCode, 
                selectedTrack.kind === 'asr' ? '(auto-generated)' : '(manual)');

    // Fetch the caption data with enhanced error handling
    const response = await this.throttledFetch(selectedTrack.baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/xml, */*',
        'User-Agent': navigator.userAgent
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch caption data: HTTP ${response.status}`);
    }

    const captionText = await response.text();
    
    // Try to parse as JSON first (newer format)
    try {
      const jsonData = JSON.parse(captionText);
      if (jsonData.events) {
        return this.parseJSON3Transcript(jsonData);
      }
    } catch (e) {
      // If JSON parsing fails, try XML parsing
      return this.parseTranscriptXML(captionText);
    }
  }

  // Deep search helper function
  static deepSearch(obj, targetKey, maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth || !obj || typeof obj !== 'object') {
      return null;
    }

    if (obj.hasOwnProperty(targetKey)) {
      return obj[targetKey];
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const result = this.deepSearch(obj[key], targetKey, maxDepth, currentDepth + 1);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  // Enhanced track selection logic
  static selectBestTrackEnhanced(captionTracks) {
    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    // Priority scoring system
    const scoreTrack = (track) => {
      let score = 0;
      
      // Language preference (English gets highest score)
      if (track.languageCode === 'en') score += 100;
      else if (track.languageCode === 'en-US') score += 95;
      else if (track.languageCode === 'en-GB') score += 90;
      else if (track.languageCode && track.languageCode.startsWith('en')) score += 80;
      else score += 50; // Other languages get base score
      
      // Manual captions preferred over auto-generated
      if (track.kind !== 'asr') score += 50;
      
      // CC (closed captions) preferred
      if (track.isCC) score += 25;
      
      // Prefer tracks with proper names
      if (track.name && track.name.simpleText) score += 10;
      
      return score;
    };

    // Score all tracks and select the best one
    const scoredTracks = captionTracks.map(track => ({
      track,
      score: scoreTrack(track)
    }));

    scoredTracks.sort((a, b) => b.score - a.score);
    
    console.log('📊 Caption track scores:', scoredTracks.map(st => ({
      lang: st.track.languageCode,
      name: st.track.name?.simpleText,
      auto: st.track.kind === 'asr',
      score: st.score
    })));

    return scoredTracks[0].track;
  }

  // Add VTT parser for modern subtitle formats
  static parseVTTTranscript(vttText) {
    const transcript = [];
    const lines = vttText.split('\n');
    let id = 1;
    let i = 0;

    // Skip header
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.includes('-->')) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          const startTime = this.parseVTTTime(timeMatch[1]);
          const endTime = this.parseVTTTime(timeMatch[2]);
          
          // Get subtitle text (next non-empty lines until empty line)
          i++;
          let subtitleText = '';
          while (i < lines.length && lines[i].trim() !== '') {
            if (subtitleText) subtitleText += ' ';
            subtitleText += lines[i].trim();
            i++;
          }
          
          if (subtitleText) {
            transcript.push({
              id: id++,
              timestamp: this.formatTimestamp(startTime),
              text: this.cleanText(subtitleText),
              offset: startTime * 1000,
              duration: endTime - startTime,
              endTime: endTime
            });
          }
        }
      }
      i++;
    }
    
    return transcript;
  }

  // Parse VTT time format
  static parseVTTTime(timeStr) {
    const parts = timeStr.split(':');
    const secondsParts = parts[2].split('.');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(secondsParts[0]) + parseInt(secondsParts[1]) / 1000;
  }

  static formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  static cleanText(text) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Mock data for testing when no transcript is available
  static getMockTranscript() {
    return [
      {
        id: 1,
        timestamp: "00:00",
        text: "Welcome to this video! This is a sample transcript.",
        offset: 0
      },
      {
        id: 2,
        timestamp: "00:05",
        text: "In this example, we'll demonstrate how the AI transcript viewer works.",
        offset: 5000
      },
      {
        id: 3,
        timestamp: "00:12",
        text: "You can search through the transcript, translate it, and ask AI questions.",
        offset: 12000
      },
      {
        id: 4,
        timestamp: "00:20",
        text: "The interface is designed to be intuitive and easy to use.",
        offset: 20000
      },
      {
        id: 5,
        timestamp: "00:28",
        text: "Try out the different features to see how they work!",
        offset: 28000
      }
    ];
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YouTubeTranscript;
} else {
  window.YouTubeTranscript = YouTubeTranscript;
}
