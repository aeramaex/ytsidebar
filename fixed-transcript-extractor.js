// FINAL FIX - YouTube Transcript Extractor - Enhanced Version 2025
// This version fixes all critical issues and provides comprehensive transcript extraction

class FixedTranscriptExtractor {
    constructor() {
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.requestDelay = 1000; // Reasonable delay to prevent rate limiting
        this.maxRetries = 3;
        this.debugMode = true;
        
        this.log('🚀 Enhanced Fixed Transcript Extractor initialized');
    }

    log(message, data = null) {
        if (this.debugMode) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[TranscriptExtractor ${timestamp}] ${message}`, data || '');
        }
        
        // Also show in UI if available
        try {
            const debugElement = document.getElementById('debug-output');
            if (debugElement) {
                debugElement.textContent += `\n[${timestamp}] ${message}`;
                if (data) debugElement.textContent += ` ${JSON.stringify(data)}`;
                debugElement.scrollTop = debugElement.scrollHeight;
            }
        } catch (e) {
            // Ignore if no debug element
        }
    }

    error(message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[TranscriptExtractor ${timestamp}] ❌ ${message}`, error || '');
        
        try {
            const debugElement = document.getElementById('debug-output');
            if (debugElement) {
                debugElement.textContent += `\n[${timestamp}] ❌ ${message}`;
                if (error) debugElement.textContent += `\n   Error: ${error.message || error}`;
                debugElement.scrollTop = debugElement.scrollHeight;
            }
        } catch (e) {
            // Ignore if no debug element
        }
    }

    // Enhanced video ID extraction with multiple fallback methods
    extractVideoId(url = window.location.href) {
        this.log('🔍 Extracting video ID from:', url);
        
        if (!url) return null;
        
        // Method 1: Standard YouTube URL patterns
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /\/shorts\/([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[1].length === 11) {
                this.log(`✅ Video ID found: ${match[1]}`);
                return match[1];
            }
        }
        
        // Method 2: URL parameters
        try {
            const urlObj = new URL(url);
            const videoId = urlObj.searchParams.get('v');
            if (videoId && videoId.length === 11) {
                this.log(`✅ Video ID found in params: ${videoId}`);
                return videoId;
            }
        } catch (e) {
            // Ignore URL parsing errors
        }
        
        this.log('❌ No video ID found');
        return null;
    }
        
        const methods = [
            // Method 1: URL-based extraction
            () => {
                const url = window.location.href;
                const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
                    /[?&]v=([^&\n?#]+)/
                ];
                
                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match && match[1] && match[1].length === 11) {
                        this.log(`✅ Video ID from URL: ${match[1]}`);
                        return match[1];
                    }
                }
                return null;
            },
            
            // Method 2: URL parameters
            () => {
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const videoId = urlParams.get('v');
                    if (videoId && videoId.length === 11) {
                        this.log(`✅ Video ID from URL params: ${videoId}`);
                        return videoId;
                    }
                } catch (e) {
                    this.error('Failed to extract from URL params', e);
                }
                return null;
            },
            
            // Method 3: ytInitialPlayerResponse
            () => {
                try {
                    if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
                        const videoId = window.ytInitialPlayerResponse.videoDetails.videoId;
                        if (videoId && videoId.length === 11) {
                            this.log(`✅ Video ID from ytInitialPlayerResponse: ${videoId}`);
                            return videoId;
                        }
                    }
                } catch (e) {
                    this.error('Failed to extract from ytInitialPlayerResponse', e);
                }
                return null;
            }
        ];
        
        // Try each method
        for (let i = 0; i < methods.length; i++) {
            const videoId = methods[i]();
            if (videoId) {
                this.log(`🎯 Final video ID: ${videoId} (method ${i + 1})`);
                return videoId;
            }
        }
        
        this.error('❌ No video ID found with any method');
        return null;
    }

    // FIXED: Extract caption tracks with video ID validation
    extractCaptionTracks() {
        this.log('📋 Extracting caption tracks from current page');
        
        try {
            if (!window.ytInitialPlayerResponse) {
                this.error('No ytInitialPlayerResponse found');
                return [];
            }
            
            const captions = window.ytInitialPlayerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captions || !Array.isArray(captions) || captions.length === 0) {
                this.error('No caption tracks found in ytInitialPlayerResponse');
                return [];
            }
            
            this.log(`✅ Found ${captions.length} caption tracks`);
            
            // CRITICAL FIX: Validate video IDs match
            const urlVideoId = this.extractVideoId();
            const firstCaptionUrl = captions[0].baseUrl;
            const captionVideoIdMatch = firstCaptionUrl.match(/[?&]v=([^&]+)/);
            const captionVideoId = captionVideoIdMatch ? captionVideoIdMatch[1] : null;
            
            if (urlVideoId && captionVideoId && urlVideoId !== captionVideoId) {
                this.error(`🚨 VIDEO ID MISMATCH! URL: ${urlVideoId}, Captions: ${captionVideoId}`);
                this.log('🔄 Attempting to refresh page data...');
                
                // Force page refresh if IDs don't match
                window.location.reload();
                return [];
            }
            
            this.log(`✅ Video ID validation passed: ${urlVideoId}`);
            
            return captions.map(track => ({
                url: track.baseUrl,
                languageCode: track.languageCode,
                name: track.name?.simpleText || track.languageCode,
                isAutoGenerated: track.kind === 'asr',
                videoId: captionVideoId
            }));
            
        } catch (error) {
            this.error('Error extracting caption tracks', error);
            return [];
        }
    }

    // Rate limiting
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest;
            this.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    // Extract tracks from current page with multiple methods
    extractTracksFromCurrentPage() {
        this.log('🔍 Extracting tracks from current page');
        
        try {
            // Method 1: Window object
            if (window.ytInitialPlayerResponse?.captions) {
                const captions = window.ytInitialPlayerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (captions && captions.length > 0) {
                    this.log(`✅ Found ${captions.length} tracks in window object`);
                    return this.formatTracks(captions);
                }
            }
            
            // Method 2: Script tags
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || '';
                if (content.includes('ytInitialPlayerResponse') && content.includes('captionTracks')) {
                    const patterns = [
                        /var ytInitialPlayerResponse = ({.+?});/,
                        /ytInitialPlayerResponse":\s*({.+?})(?:,|}|;)/,
                        /"ytInitialPlayerResponse":({.+?})(?:,|})/
                    ];
                    
                    for (const pattern of patterns) {
                        const match = content.match(pattern);
                        if (match) {
                            try {
                                const playerResponse = JSON.parse(match[1]);
                                const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                                if (captions && captions.length > 0) {
                                    this.log(`✅ Found ${captions.length} tracks in script tag`);
                                    return this.formatTracks(captions);
                                }
                            } catch (e) {
                                // Continue to next pattern
                            }
                        }
                    }
                }
            }
            
            // Method 3: Check ytplayer object
            if (window.ytplayer?.config?.args?.player_response) {
                try {
                    const playerResponse = JSON.parse(window.ytplayer.config.args.player_response);
                    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                    if (captions && captions.length > 0) {
                        this.log(`✅ Found ${captions.length} tracks in ytplayer config`);
                        return this.formatTracks(captions);
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
            
            this.log('❌ No tracks found on current page');
            return [];
            
        } catch (error) {
            this.error('Error extracting tracks from current page', error);
            return [];
        }
    }

    // Format track objects consistently
    formatTracks(tracks) {
        return tracks.map(track => ({
            url: track.baseUrl,
            languageCode: track.languageCode,
            name: track.name?.simpleText || track.name?.runs?.[0]?.text || track.languageCode,
            isAutoGenerated: track.kind === 'asr'
        }));
    }

    // Enhanced fetch with timeout and error handling
    async fetchWithTimeout(url, options = {}, timeout = 15000) {
        this.log(`🌐 Fetching: ${url.substring(0, 100)}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            this.error(`Request timeout after ${timeout}ms`);
        }, timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/xml,text/xml,*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            this.log(`📨 Response: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            this.error('Fetch failed', error);
            throw error;
        }
    }

    // Parse transcript XML with improved error handling
    parseTranscriptXML(xmlText) {
        this.log(`📝 Parsing XML transcript (${xmlText.length} characters)`);
        
        try {
            if (!xmlText || xmlText.trim().length === 0) {
                throw new Error('Empty XML content');
            }
            
            const transcript = [];
            
            // Handle both <text> and <p> tags (YouTube uses both formats)
            const textMatches = xmlText.matchAll(/<(?:text|p)[^>]*(?:start="([^"]*)"[^>]*dur="([^"]*)"[^>]*|t="([^"]*)"[^>]*d="([^"]*)"[^>]*)>(.*?)<\/(?:text|p)>/gs);
            
            for (const match of textMatches) {
                const start = parseFloat(match[1] || match[3] || '0');
                const dur = parseFloat(match[2] || match[4] || '0');
                const content = match[5];
                
                // Clean and decode text
                const text = this.cleanTranscriptText(content);
                
                if (text && text.trim()) {
                    transcript.push({
                        start: start,
                        duration: dur,
                        text: text.trim()
                    });
                }
            }
            
            // If no matches with start/dur attributes, try simpler parsing
            if (transcript.length === 0) {
                const simpleMatches = xmlText.matchAll(/<(?:text|p)[^>]*>(.*?)<\/(?:text|p)>/gs);
                let index = 0;
                for (const match of simpleMatches) {
                    const text = this.cleanTranscriptText(match[1]);
                    if (text && text.trim()) {
                        transcript.push({
                            start: index,
                            duration: 0,
                            text: text.trim()
                        });
                        index++;
                    }
                }
            }
            
            this.log(`✅ Parsed ${transcript.length} transcript segments`);
            return transcript;
            
        } catch (error) {
            this.error('Error parsing transcript XML', error);
            return [];
        }
    }

    // Clean transcript text
    cleanTranscriptText(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Select the best track for the requested language
    selectBestTrack(tracks, languageCode) {
        // Priority: exact match (manual) > exact match (auto) > language prefix match > first available
        return tracks.find(track => 
            track.languageCode === languageCode && !track.isAutoGenerated
        ) || tracks.find(track => 
            track.languageCode === languageCode
        ) || tracks.find(track => 
            track.languageCode.startsWith(languageCode.split('-')[0])
        ) || tracks[0];
    }

    // API fallback method
    async getCaptionTracksFromAPI(videoId) {
        this.log(`🌐 Fetching caption tracks from API for: ${videoId}`);
        
        try {
            await this.waitForRateLimit();
            
            const response = await this.fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();
            
            return this.extractCaptionTracksFromHTML(html);
            
        } catch (error) {
            this.error('API fallback failed', error);
            return [];
        }
    }

    // Extract caption tracks from HTML
    extractCaptionTracksFromHTML(html) {
        this.log('🔍 Extracting caption tracks from HTML');
        
        try {
            const patterns = [
                /var ytInitialPlayerResponse = ({.+?});/,
                /"ytInitialPlayerResponse":({.+?})(?:,|})/
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    try {
                        const playerResponse = JSON.parse(match[1]);
                        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                        
                        if (captions && captions.length > 0) {
                            this.log(`✅ Found ${captions.length} caption tracks in HTML`);
                            return this.formatTracks(captions);
                        }
                    } catch (e) {
                        // Continue to next pattern
                    }
                }
            }
            
            this.log('❌ No captions found in HTML');
            return [];
            
        } catch (error) {
            this.error('Error parsing HTML for captions', error);
            return [];
        }
    }

    // Main transcript extraction method
    async getTranscript(videoId = null, languageCode = 'en') {
        this.log('🎬 Starting transcript extraction');
        
        try {
            // Step 1: Get video ID
            if (!videoId) {
                videoId = this.extractVideoId();
                if (!videoId) {
                    throw new Error('Could not determine video ID');
                }
            }
            
            this.log(`🎯 Target: ${videoId}, language: ${languageCode}`);
            
            // Step 2: Check cache
            const cacheKey = `${videoId}_${languageCode}`;
            if (this.cache.has(cacheKey)) {
                this.log('💾 Returning cached transcript');
                return this.cache.get(cacheKey);
            }
            
            // Step 3: Get caption tracks
            let tracks = this.extractTracksFromCurrentPage();
            
            if (!tracks || tracks.length === 0) {
                this.log('⚠️ No tracks from current page, trying API fallback');
                tracks = await this.getCaptionTracksFromAPI(videoId);
            }
            
            if (!tracks || tracks.length === 0) {
                throw new Error('No caption tracks available for this video');
            }
            
            this.log(`📋 Available tracks: ${tracks.map(t => `${t.languageCode} (${t.name})`).join(', ')}`);
            
            // Step 4: Select best track
            let selectedTrack = this.selectBestTrack(tracks, languageCode);
            
            if (!selectedTrack) {
                throw new Error('No suitable caption track found');
            }
            
            this.log(`🎯 Selected: ${selectedTrack.languageCode} (${selectedTrack.name})`);
            
            // Step 5: Download and parse transcript
            await this.waitForRateLimit();
            
            const response = await this.fetchWithTimeout(selectedTrack.url);
            const xmlText = await response.text();
            
            this.log(`📥 Downloaded transcript data (${xmlText.length} characters)`);
            
            const transcript = this.parseTranscriptXML(xmlText);
            
            if (!transcript || transcript.length === 0) {
                throw new Error('No transcript segments found in downloaded data');
            }
            
            // Step 6: Cache and return
            this.cache.set(cacheKey, transcript);
            this.log(`✅ Successfully extracted ${transcript.length} transcript segments`);
            
            return transcript;
            
        } catch (error) {
            this.error('Transcript extraction failed', error);
            throw error;
        }
    }

    // Quick diagnostic function
    async diagnose() {
        this.log('🔬 Running diagnostic...');
        
        const videoId = this.extractVideoId();
        const hasYtData = !!window.ytInitialPlayerResponse;
        const url = window.location.href;
        
        let captionCount = 0;
        if (hasYtData && window.ytInitialPlayerResponse.captions) {
            captionCount = window.ytInitialPlayerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length || 0;
        }
        
        const result = {
            videoId,
            hasYtData,
            captionCount,
            url,
            timestamp: new Date().toISOString()
        };
        
        this.log('🔬 Diagnostic results:', result);
        return result;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        this.log('🗑️ Cache cleared');
    }
}

// Create global instance
window.fixedTranscriptExtractor = new FixedTranscriptExtractor();

// Global convenience functions
window.testFixedTranscriptExtraction = async function(videoId = null, languageCode = 'en') {
    console.log('🧪 Running fixed transcript extraction test...');
    try {
        const transcript = await window.fixedTranscriptExtractor.getTranscript(videoId, languageCode);
        console.log('✅ Test successful!', transcript);
        return transcript;
    } catch (error) {
        console.error('❌ Test failed:', error);
        return null;
    }
};

window.diagnoseTranscriptExtractor = async function() {
    return await window.fixedTranscriptExtractor.diagnose();
};

console.log('🚀 Enhanced Fixed Transcript Extractor loaded! Run testFixedTranscriptExtraction() to test.');
