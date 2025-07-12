// Enhanced YouTube Subtitle Injection Script - 2025 Edition
// This script runs in the context of the YouTube page and provides robust subtitle extraction

(function() {
    'use strict';

    let isInitialized = false;
    let currentPlayer = null;
    let captionTracks = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    console.log('🚀 YouTube Enhanced Injection Script Loaded');

    // Modern YouTube subtitle extraction
    class YouTubeSubtitleExtractor {
        constructor() {
            this.playerData = null;
            this.captionTracks = null;
            this.isExtracting = false;
            
            // Rate limiting system to prevent HTTP 429 errors
            this.requestQueue = [];
            this.isProcessingQueue = false;
            this.lastRequestTime = 0;
            this.minRequestInterval = 2000; // 2 seconds between requests
            this.rateLimitBackoff = 5000; // 5 seconds for 429 errors
            this.activeRequests = new Set(); // Track active requests to prevent duplicates
            
            console.log('🚀 YouTube Subtitle Extractor initialized with rate limiting');
        }

        // Method 1: Extract from ytInitialPlayerResponse (most reliable)
        async extractFromPlayerResponse() {
            try {
                // Look for ytInitialPlayerResponse in window object first
                if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
                    this.playerData = window.ytInitialPlayerResponse;
                    this.captionTracks = this.playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    if (this.captionTracks && this.captionTracks.length > 0) {
                        console.log('✅ Found captions in window.ytInitialPlayerResponse');
                        return this.captionTracks;
                    }
                }

                // Fallback: Extract from script tags
                const scripts = document.getElementsByTagName('script');
                for (let script of scripts) {
                    const content = script.textContent || '';
                    
                    if (content.includes('ytInitialPlayerResponse') && content.includes('captionTracks')) {
                        try {
                            // Extract ytInitialPlayerResponse JSON
                            const match = content.match(/var ytInitialPlayerResponse = ({.+?});/);
                            if (match) {
                                this.playerData = JSON.parse(match[1]);
                            } else {
                                // Alternative pattern
                                const altMatch = content.match(/ytInitialPlayerResponse":\s*({.+?})(?:,|;|\})/);
                                if (altMatch) {
                                    this.playerData = JSON.parse(altMatch[1]);
                                }
                            }

                            if (this.playerData && this.playerData.captions) {
                                this.captionTracks = this.playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                                if (this.captionTracks && this.captionTracks.length > 0) {
                                    console.log('✅ Found captions in script tag');
                                    return this.captionTracks;
                                }
                            }
                        } catch (e) {
                            console.log('Failed to parse player response from script:', e.message);
                        }
                    }
                }

                throw new Error('No captions found in player response');
            } catch (error) {
                console.log('Player response extraction failed:', error.message);
                throw error;
            }
        }

        // Method 2: Extract from YouTube player API
        async extractFromPlayerAPI() {
            try {
                // Try to get player instance
                if (window.ytplayer && window.ytplayer.config) {
                    const config = window.ytplayer.config;
                    if (config.args && config.args.player_response) {
                        try {
                            const playerResponse = JSON.parse(config.args.player_response);
                            this.captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                            if (this.captionTracks && this.captionTracks.length > 0) {
                                console.log('✅ Found captions in player API');
                                return this.captionTracks;
                            }
                        } catch (e) {
                            console.log('Failed to parse player response from API:', e.message);
                        }
                    }
                }

                // Try YouTube iframe API
                if (window.YT && window.YT.Player) {
                    const players = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
                    for (let iframe of players) {
                        try {
                            if (iframe.contentWindow && iframe.contentWindow.YT) {
                                // Extract from iframe
                                console.log('Found YouTube iframe player');
                            }
                        } catch (e) {
                            // Cross-origin restriction expected
                        }
                    }
                }

                throw new Error('No captions found via player API');
            } catch (error) {
                console.log('Player API extraction failed:', error.message);
                throw error;
            }
        }

        // Method 3: Direct DOM extraction from current page elements
        async extractFromDOM() {
            try {
                // Look for caption button to confirm captions exist
                const captionButton = document.querySelector('button[data-title-no-tooltip="Captions"], button[aria-label*="caption"], .ytp-subtitles-button');
                if (!captionButton) {
                    throw new Error('No caption button found - video may not have captions');
                }

                // Try to get video ID from URL or player
                const videoId = this.getVideoId();
                if (!videoId) {
                    throw new Error('Could not determine video ID');
                }

                // Look for any caption-related data in the DOM
                const captionElements = document.querySelectorAll('[data-language], [data-caption-track]');
                if (captionElements.length > 0) {
                    console.log('Found caption elements in DOM');
                }

                throw new Error('DOM extraction method needs caption URL discovery');
            } catch (error) {
                console.log('DOM extraction failed:', error.message);
                throw error;
            }
        }

        // Get video ID from current URL or player
        getVideoId() {
            // From URL
            const urlParams = new URLSearchParams(window.location.search);
            let videoId = urlParams.get('v');
            
            if (!videoId) {
                // From shorts URL
                const shortsMatch = window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
                if (shortsMatch) {
                    videoId = shortsMatch[1];
                }
            }

            if (!videoId && this.playerData) {
                videoId = this.playerData.videoDetails?.videoId;
            }

            return videoId;
        }

        // Select the best caption track
        selectBestCaptionTrack(tracks) {
            if (!tracks || tracks.length === 0) {
                return null;
            }

            // Priority order:
            // 1. English manual captions (not auto-generated)
            // 2. English auto-generated captions
            // 3. Any other manual captions
            // 4. Any other auto-generated captions

            const manualEnglish = tracks.find(track => 
                track.languageCode === 'en' && track.kind !== 'asr'
            );
            
            if (manualEnglish) {
                console.log('Selected manual English captions');
                return manualEnglish;
            }

            const autoEnglish = tracks.find(track => 
                track.languageCode === 'en' && track.kind === 'asr'
            );
            
            if (autoEnglish) {
                console.log('Selected auto-generated English captions');
                return autoEnglish;
            }

            const anyManual = tracks.find(track => 
                track.kind !== 'asr'
            );
            
            if (anyManual) {
                console.log('Selected manual captions in', anyManual.languageCode);
                return anyManual;
            }

            console.log('Selected auto-generated captions in', tracks[0].languageCode);
            return tracks[0];
        }

        // Fetch and parse caption data
        async fetchCaptionData(track) {
            try {
                if (!track.baseUrl) {
                    throw new Error('No base URL for caption track');
                }

                // Add format parameter to get JSON format
                const url = new URL(track.baseUrl);
                url.searchParams.set('fmt', 'json3');
                
                console.log('Fetching captions from:', url.toString());
                
                const response = await this.rateLimitedFetch(url.toString(), {
                    method: 'GET',
                    credentials: 'include'
                });

                const data = await response.json();
                return this.parseJSON3Format(data);
            } catch (error) {
                console.log('JSON3 fetch failed, trying XML format:', error.message);
                
                // Fallback to XML format using rate-limited fetch
                try {
                    const response = await this.rateLimitedFetch(track.baseUrl);

                    const xmlText = await response.text();
                    return this.parseXMLFormat(xmlText);
                } catch (xmlError) {
                    console.error('Both JSON3 and XML parsing failed:', xmlError.message);
                    throw xmlError;
                }
            }
        }

        // Parse JSON3 caption format
        parseJSON3Format(data) {
            const subtitles = [];
            let id = 1;

            if (!data.events) {
                throw new Error('No events found in caption data');
            }

            for (const event of data.events) {
                if (event.segs) {
                    const startTime = (event.tStartMs || 0) / 1000;
                    const duration = (event.dDurationMs || 0) / 1000;
                    const text = event.segs.map(seg => seg.utf8 || '').join('').trim();

                    if (text) {
                        subtitles.push({
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

            return subtitles;
        }

        // Parse XML caption format using safe text parsing (no DOMParser to avoid TrustedHTML issues)
        parseXMLFormat(xmlText) {
            console.log('🔧 Parsing XML using safe text parsing to avoid TrustedHTML issues');
            
            const subtitles = [];
            
            // Use regex to extract text elements safely
            const textPattern = /<text[^>]*start="([^"]*)"[^>]*(?:dur="([^"]*)")?[^>]*>(.*?)<\/text>/g;
            let match;
            let index = 0;
            
            while ((match = textPattern.exec(xmlText)) !== null) {
                const start = parseFloat(match[1] || 0);
                const duration = parseFloat(match[2] || 0);
                let text = match[3] || '';
                
                // Clean up HTML entities and tags
                text = text.replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&amp;/g, '&')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/<[^>]*>/g, '')  // Remove any HTML tags
                          .trim();
                
                if (text) {
                    subtitles.push({
                        id: index + 1,
                        timestamp: this.formatTimestamp(start),
                        text: this.cleanText(text),
                        offset: start * 1000,
                        duration: duration,
                        endTime: start + duration
                    });
                    index++;
                }
            }
            
            console.log(`✅ Safely parsed ${subtitles.length} XML subtitles without DOMParser`);
            return subtitles;
            
            return subtitles;
        }

        // Format timestamp for display
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

        // Clean text content
        cleanText(text) {
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

        // Enhanced rate-limited fetch with exponential backoff to prevent HTTP 429 errors
        async rateLimitedFetch(url, options = {}) {
            return new Promise((resolve, reject) => {
                // Check if we already have an active request for this URL
                if (this.activeRequests.has(url)) {
                    console.log(`⏸️ Skipping duplicate request for: ${url}`);
                    reject(new Error('Duplicate request'));
                    return;
                }
                
                this.requestQueue.push({ url, options, resolve, reject });
                this.processQueue();
            });
        }

        // Enhanced exponential backoff for rate limiting
        async waitWithExponentialBackoff(attempt = 0) {
            const delay = Math.min(this.minRequestInterval * Math.pow(2, attempt), 10000);
            console.log(`⏳ Rate limiting: waiting ${delay}ms (attempt ${attempt + 1})`);
            await new Promise(r => setTimeout(r, delay));
        }
        
        // Enhanced queue processing with better rate limiting and error recovery
        async processQueue() {
            if (this.isProcessingQueue || this.requestQueue.length === 0) {
                return;
            }
            
            this.isProcessingQueue = true;
            let attempt = 0;
            
            while (this.requestQueue.length > 0) {
                const { url, options, resolve, reject } = this.requestQueue.shift();
                
                try {
                    // Enhanced timing with exponential backoff
                    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
                    if (timeSinceLastRequest < this.minRequestInterval) {
                        await this.waitWithExponentialBackoff(attempt);
                    }
                    
                    this.activeRequests.add(url);
                    this.lastRequestTime = Date.now();
                    
                    console.log(`🌐 Making enhanced rate-limited request to: ${url.substring(0, 100)}...`);
                    const response = await fetch(url, {
                        ...options,
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/xml,text/xml,application/json,*/*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            ...options.headers
                        }
                    });
                    
                    // Enhanced rate limiting handling with multiple retry attempts
                    if (response.status === 429) {
                        attempt++;
                        const backoffDelay = Math.min(this.rateLimitBackoff * Math.pow(2, attempt), 30000);
                        console.warn(`⚠️ Rate limited (429), backing off for ${backoffDelay}ms (attempt ${attempt})`);
                        
                        if (attempt < 3) {
                            await new Promise(r => setTimeout(r, backoffDelay));
                            // Re-add to queue for retry
                            this.requestQueue.unshift({ url, options, resolve, reject });
                            continue;
                        } else {
                            throw new Error(`HTTP 429: Rate limited after ${attempt} attempts`);
                        }
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    console.log(`✅ Successfully fetched: ${response.status} ${response.statusText}`);
                    resolve(response);
                    attempt = 0; // Reset attempt counter on success
                    
                } catch (error) {
                    console.error(`❌ Enhanced rate-limited request failed: ${error.message}`);
                    reject(error);
                } finally {
                    this.activeRequests.delete(url);
                }
                
                // Progressive delay between queue processing to prevent overwhelming
                await new Promise(r => setTimeout(r, Math.min(100 + (attempt * 50), 500)));
            }
            
            this.isProcessingQueue = false;
        }

        // Enhanced extraction method with 5 fallback methods for maximum reliability
        async extractSubtitles() {
            if (this.isExtracting) {
                console.log('Subtitle extraction already in progress');
                return null;
            }

            this.isExtracting = true;
            
            try {
                console.log('🎯 Starting enhanced subtitle extraction with 5 fallback methods...');

                // Enhanced extraction methods with better error handling and logging
                let tracks = null;
                const methods = [
                    {
                        name: 'Player Response (Primary)',
                        method: () => this.extractFromPlayerResponse(),
                        priority: 1
                    },
                    {
                        name: 'Player API (Secondary)',
                        method: () => this.extractFromPlayerAPI(),
                        priority: 2
                    },
                    {
                        name: 'DOM Extraction (Tertiary)',
                        method: () => this.extractFromDOM(),
                        priority: 3
                    },
                    {
                        name: 'Script Tag Fallback',
                        method: () => this.extractFromScriptTags(),
                        priority: 4
                    },
                    {
                        name: 'Manual URL Construction',
                        method: () => this.extractViaManualConstruction(),
                        priority: 5
                    }
                ];

                // Try each method with detailed logging
                for (const { name, method, priority } of methods) {
                    try {
                        console.log(`🔄 Attempting method ${priority}/5: ${name}`);
                        tracks = await method();
                        if (tracks && tracks.length > 0) {
                            console.log(`✅ Method ${priority} (${name}) succeeded with ${tracks.length} tracks`);
                            break;
                        } else {
                            console.log(`⚠️ Method ${priority} (${name}) found no tracks`);
                        }
                    } catch (error) {
                        console.log(`❌ Method ${priority} (${name}) failed: ${error.message}`);
                    }
                }

                if (!tracks || tracks.length === 0) {
                    throw new Error('All extraction methods failed. This video may not have captions available, or YouTube has changed their API structure.');
                }

                console.log(`📝 Successfully found ${tracks.length} caption track(s) using enhanced methods`);
                
                // Log available tracks for debugging
                tracks.forEach((track, index) => {
                    console.log(`📋 Track ${index + 1}: ${track.languageCode} (${track.name?.simpleText || 'Unknown'}) - ${track.kind === 'asr' ? 'Auto-generated' : 'Manual'}`);
                });

                // Enhanced track selection with better prioritization
                const selectedTrack = this.selectBestCaptionTrack(tracks);
                if (!selectedTrack) {
                    throw new Error('No suitable caption track found after advanced filtering');
                }

                console.log(`🎯 Selected optimal track: ${selectedTrack.languageCode} (${selectedTrack.name?.simpleText || 'Unknown'})`);

                // Enhanced subtitle fetching with multiple format support
                const subtitles = await this.fetchCaptionDataWithFallbacks(selectedTrack);
                
                if (!subtitles || subtitles.length === 0) {
                    throw new Error('No subtitle content found despite successful track selection');
                }

                console.log(`✅ Successfully extracted ${subtitles.length} subtitle entries with enhanced methods`);
                
                // Log sample for debugging
                if (subtitles.length > 0) {
                    console.log(`📄 Sample subtitle: [${subtitles[0].timestamp}] "${subtitles[0].text.substring(0, 50)}..."`);
                }

                return {
                    subtitles: subtitles,
                    videoId: this.getVideoId(),
                    language: selectedTrack.languageCode,
                    trackName: selectedTrack.name?.simpleText || selectedTrack.languageCode,
                    isAutoGenerated: selectedTrack.kind === 'asr',
                    extractionMethod: 'Enhanced Multi-Method',
                    tracksFound: tracks.length
                };

            } catch (error) {
                console.error('❌ Enhanced subtitle extraction failed:', error.message);
                throw error;
            } finally {
                this.isExtracting = false;
            }
        }

        // Additional extraction method: Script tag fallback
        async extractFromScriptTags() {
            try {
                console.log('🔍 Trying script tag extraction fallback...');
                
                const scripts = document.querySelectorAll('script:not([src])');
                for (const script of scripts) {
                    const content = script.textContent || script.innerHTML;
                    
                    if (content.includes('captionTracks') && content.includes('baseUrl')) {
                        // Try multiple JSON extraction patterns
                        const patterns = [
                            /"captionTracks":\s*(\[.*?\])/,
                            /captionTracks":\s*(\[.*?\])/,
                            /"captionTracks":\[([^\]]+)\]/
                        ];
                        
                        for (const pattern of patterns) {
                            const match = content.match(pattern);
                            if (match) {
                                try {
                                    const tracks = JSON.parse(match[1]);
                                    if (Array.isArray(tracks) && tracks.length > 0) {
                                        console.log('✅ Found caption tracks in script tag');
                                        return tracks;
                                    }
                                } catch (parseError) {
                                    console.log('Failed to parse tracks from script:', parseError.message);
                                }
                            }
                        }
                    }
                }
                
                throw new Error('No caption tracks found in script tags');
            } catch (error) {
                console.log('Script tag extraction failed:', error.message);
                throw error;
            }
        }

        // Additional extraction method: Manual URL construction
        async extractViaManualConstruction() {
            try {
                console.log('🔧 Trying manual URL construction method...');
                
                const videoId = this.getVideoId();
                if (!videoId) {
                    throw new Error('No video ID for manual construction');
                }
                
                // Construct common caption URL patterns
                const baseUrls = [
                    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
                    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
                    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
                    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&caps=asr&fmt=json3`
                ];
                
                // Test each URL to see if it returns valid data
                for (const url of baseUrls) {
                    try {
                        const response = await this.rateLimitedFetch(url);
                        if (response.ok) {
                            const text = await response.text();
                            if (text.length > 100 && (text.includes('events') || text.includes('<text'))) {
                                console.log('✅ Found working manual caption URL');
                                return [{
                                    baseUrl: url,
                                    languageCode: 'en',
                                    name: { simpleText: 'English (Manual Discovery)' },
                                    kind: 'asr'
                                }];
                            }
                        }
                    } catch (fetchError) {
                        console.log(`Manual URL ${url} failed:`, fetchError.message);
                    }
                }
                
                throw new Error('Manual URL construction found no working endpoints');
            } catch (error) {
                console.log('Manual URL construction failed:', error.message);
                throw error;
            }
        }

        // Enhanced caption data fetching with multiple format fallbacks
        async fetchCaptionDataWithFallbacks(track) {
            const formats = ['json3', 'srv3', 'xml'];
            
            for (const format of formats) {
                try {
                    console.log(`🔄 Trying ${format.toUpperCase()} format...`);
                    
                    if (format === 'json3') {
                        const url = new URL(track.baseUrl);
                        url.searchParams.set('fmt', 'json3');
                        
                        const response = await this.rateLimitedFetch(url.toString());
                        const data = await response.json();
                        const result = this.parseJSON3Format(data);
                        
                        if (result && result.length > 0) {
                            console.log(`✅ ${format.toUpperCase()} format successful`);
                            return result;
                        }
                    } else if (format === 'srv3') {
                        const url = new URL(track.baseUrl);
                        url.searchParams.set('fmt', 'srv3');
                        
                        const response = await this.rateLimitedFetch(url.toString());
                        const text = await response.text();
                        const result = this.parseSRV3Format(text);
                        
                        if (result && result.length > 0) {
                            console.log(`✅ ${format.toUpperCase()} format successful`);
                            return result;
                        }
                    } else {
                        // XML fallback
                        const response = await this.rateLimitedFetch(track.baseUrl);
                        const xmlText = await response.text();
                        const result = this.parseXMLFormat(xmlText);
                        
                        if (result && result.length > 0) {
                            console.log(`✅ ${format.toUpperCase()} format successful`);
                            return result;
                        }
                    }
                } catch (error) {
                    console.log(`${format.toUpperCase()} format failed:`, error.message);
                }
            }
            
            throw new Error('All caption formats failed');
        }

        // Parse SRV3 format (additional format support)
        parseSRV3Format(text) {
            try {
                const subtitles = [];
                const lines = text.split('\n');
                let id = 1;
                
                for (const line of lines) {
                    if (line.trim()) {
                        const parts = line.split('\t');
                        if (parts.length >= 3) {
                            const start = parseFloat(parts[0]) || 0;
                            const duration = parseFloat(parts[1]) || 0;
                            const text = parts[2] || '';
                            
                            if (text.trim()) {
                                subtitles.push({
                                    id: id++,
                                    timestamp: this.formatTimestamp(start),
                                    text: this.cleanText(text),
                                    offset: start * 1000,
                                    duration: duration,
                                    endTime: start + duration
                                });
                            }
                        }
                    }
                }
                
                return subtitles;
            } catch (error) {
                console.log('SRV3 parsing failed:', error.message);
                return [];
            }
        }
    }

    // Player control functions
    function getYouTubePlayer() {
        // Try multiple methods to get the player
        return document.querySelector('video.html5-main-video') ||
               document.querySelector('.html5-video-player video') ||
               document.querySelector('video[src*="youtube"]') ||
               document.querySelector('video');
    }

    function seekToTime(seconds) {
        const player = getYouTubePlayer();
        if (player) {
            player.currentTime = seconds;
            console.log(`⏯️ Seeked to ${seconds}s`);
            return true;
        }
        console.warn('⚠️ Could not find YouTube player for seeking');
        return false;
    }

    function togglePlayPause() {
        const player = getYouTubePlayer();
        if (player) {
            if (player.paused) {
                player.play();
                console.log('▶️ Video resumed');
            } else {
                player.pause();
                console.log('⏸️ Video paused');
            }
            return true;
        }
        console.warn('⚠️ Could not find YouTube player for play/pause');
        return false;
    }

    function getCurrentTime() {
        const player = getYouTubePlayer();
        if (player) {
            return player.currentTime;
        }
        return null;
    }

    function getPlayState() {
        const player = getYouTubePlayer();
        if (player) {
            return {
                isPlaying: !player.paused,
                currentTime: player.currentTime,
                duration: player.duration
            };
        }
        return null;
    }

    // Initialize the extractor
    const extractor = new YouTubeSubtitleExtractor();

    // Message listener
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;

        const { type, videoId, time } = event.data;

        switch (type) {
            case 'TRIGGER_SUBTITLE_EXTRACTION':
                console.log('🎯 Received subtitle extraction trigger for video:', videoId);
                try {
                    const result = await extractor.extractSubtitles();
                    window.postMessage({
                        action: 'subtitlesExtracted',
                        data: result
                    }, '*');
                } catch (error) {
                    window.postMessage({
                        action: 'extractionFailed',
                        data: {
                            reason: error.message,
                            videoId: videoId
                        }
                    }, '*');
                }
                break;

            case 'SEEK_VIDEO':
                seekToTime(time);
                break;

            case 'TOGGLE_PLAY_PAUSE':
                togglePlayPause();
                break;

            case 'GET_CURRENT_TIME':
                const currentTime = getCurrentTime();
                window.postMessage({
                    action: 'currentTime',
                    data: { currentTime }
                }, '*');
                break;

            case 'GET_PLAY_STATE':
                const playState = getPlayState();
                window.postMessage({
                    action: 'playState',
                    data: playState
                }, '*');
                break;
        }
    });

    // Auto-extraction on page load (with delay for YouTube's dynamic loading)
    function attemptAutoExtraction() {
        retryCount++;
        console.log(`🔄 Auto-extraction attempt ${retryCount}/${MAX_RETRIES}`);
        
        setTimeout(async () => {
            try {
                // Check if we're on a video page
                const videoId = new URLSearchParams(window.location.search).get('v') ||
                              window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/)?.[1];
                
                if (videoId) {
                    console.log('🎥 Video detected, attempting auto-extraction for:', videoId);
                    const result = await extractor.extractSubtitles();
                    window.postMessage({
                        action: 'subtitlesExtracted',
                        data: result
                    }, '*');
                }
            } catch (error) {
                console.log(`Auto-extraction attempt ${retryCount} failed:`, error.message);
                if (retryCount < MAX_RETRIES) {
                    setTimeout(attemptAutoExtraction, 3000 * retryCount); // Exponential backoff
                }
            }
        }, 2000);
    }

    // Initialize
    if (!isInitialized) {
        isInitialized = true;
        console.log('✅ YouTube Enhanced Injection Script Initialized');
        
        // Start auto-extraction after page load
        if (document.readyState === 'complete') {
            attemptAutoExtraction();
        } else {
            window.addEventListener('load', attemptAutoExtraction);
        }
    }

    // Global testing and diagnostic functions
    window.youtubeTranscriptExtractor = extractor;
    
    // Enhanced diagnostic function
    window.runDiagnostics = async function() {
        console.log('🔬 Running enhanced YouTube transcript diagnostics...');
        
        const results = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            videoId: extractor.getVideoId(),
            tests: {}
        };
        
        // Test 1: Check for YouTube objects
        results.tests.youtubeObjects = {
            ytInitialPlayerResponse: !!window.ytInitialPlayerResponse,
            ytplayer: !!window.ytplayer,
            captionTracks: !!(window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks)
        };
        
        // Test 2: Check extraction methods
        const methods = ['extractFromPlayerResponse', 'extractFromPlayerAPI', 'extractFromDOM', 'extractFromScriptTags'];
        for (const method of methods) {
            try {
                const tracks = await extractor[method]();
                results.tests[method] = {
                    success: true,
                    tracksFound: tracks ? tracks.length : 0
                };
            } catch (error) {
                results.tests[method] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Test 3: Full extraction test
        try {
            const result = await extractor.extractSubtitles();
            results.tests.fullExtraction = {
                success: true,
                subtitlesCount: result.subtitles.length,
                language: result.language,
                method: result.extractionMethod
            };
        } catch (error) {
            results.tests.fullExtraction = {
                success: false,
                error: error.message
            };
        }
        
        console.log('🔬 Diagnostic results:', results);
        return results;
    };
    
    // Quick test function for specific video
    window.testSubtitles = async function(videoId = null) {
        console.log('🧪 Testing subtitle extraction...');
        
        if (videoId) {
            // Navigate to video if provided
            window.location.href = `https://www.youtube.com/watch?v=${videoId}`;
            return;
        }
        
        try {
            const result = await extractor.extractSubtitles();
            console.log('✅ Test successful!', result);
            
            // Show sample subtitles
            if (result.subtitles.length > 0) {
                console.log('📄 Sample subtitles:');
                result.subtitles.slice(0, 5).forEach(sub => {
                    console.log(`[${sub.timestamp}] ${sub.text}`);
                });
            }
            
            return result;
        } catch (error) {
            console.error('❌ Test failed:', error);
            return null;
        }
    };
