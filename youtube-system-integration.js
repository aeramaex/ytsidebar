// YouTube Subtitle System Integration Script
// This script coordinates all components and provides unified functionality

class YouTubeSubtitleSystem {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.config = {
            autoStart: true,
            enableAnalytics: true,
            enableTesting: true,
            debugMode: false,
            retryAttempts: 3,
            extractionTimeout: 10000
        };
        
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing YouTube Subtitle System...');
        
        try {
            // Initialize core components
            await this.initializeComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start auto-monitoring if enabled
            if (this.config.enableAnalytics && this.config.autoStart) {
                this.startAnalytics();
            }
            
            // Auto-extract subtitles on page load
            if (this.config.autoStart && this.isYouTubePage()) {
                setTimeout(() => this.autoExtract(), 2000);
            }
            
            this.initialized = true;
            console.log('✅ YouTube Subtitle System initialized successfully');
            
            // Expose global interface
            this.exposeGlobalInterface();
            
        } catch (error) {
            console.error('❌ Failed to initialize YouTube Subtitle System:', error);
        }
    }

    async initializeComponents() {
        // Initialize transcript fetcher
        if (window.YouTubeTranscript) {
            this.components.transcript = window.YouTubeTranscript;
            console.log('✅ YouTube Transcript component loaded');
        }
        
        // Initialize tester
        if (window.YouTubeSubtitleTester) {
            this.components.tester = new window.YouTubeSubtitleTester();
            console.log('✅ YouTube Subtitle Tester component loaded');
        }
        
        // Initialize analytics
        if (window.YouTubeSubtitleAnalytics) {
            this.components.analytics = new window.YouTubeSubtitleAnalytics();
            console.log('✅ YouTube Subtitle Analytics component loaded');
        }
        
        // Initialize injection detection
        this.checkInjectionStatus();
    }

    setupEventListeners() {
        // Listen for subtitle extraction results
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            this.handleMessage(event.data);
        });
        
        // Listen for URL changes
        let lastUrl = window.location.href;
        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log('🔄 URL changed, triggering auto-extraction...');
                setTimeout(() => this.autoExtract(), 1500);
            }
        });
        
        urlObserver.observe(document.body, { childList: true, subtree: true });
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isYouTubePage()) {
                setTimeout(() => this.autoExtract(), 1000);
            }
        });
    }

    handleMessage(data) {
        switch (data.action) {
            case 'subtitlesExtracted':
                this.onSubtitlesExtracted(data.data);
                break;
            case 'extractionFailed':
                this.onExtractionFailed(data.data);
                break;
            case 'currentTime':
                this.onCurrentTime(data.data);
                break;
            case 'playState':
                this.onPlayState(data.data);
                break;
        }
    }

    onSubtitlesExtracted(data) {
        console.log('✅ Subtitles extracted successfully:', data);
        
        // Record analytics
        if (this.components.analytics) {
            this.components.analytics.recordExtraction(
                'system_extraction',
                true,
                0, // Duration not available
                data.subtitles?.length || 0,
                null,
                data.videoId
            );
        }
        
        // Trigger custom event for extension components
        this.dispatchCustomEvent('subtitlesReady', data);
    }

    onExtractionFailed(data) {
        console.log('❌ Subtitle extraction failed:', data);
        
        // Record analytics
        if (this.components.analytics) {
            this.components.analytics.recordExtraction(
                'system_extraction',
                false,
                0,
                0,
                data.reason || 'Unknown error',
                data.videoId
            );
        }
        
        // Try fallback methods
        this.tryFallbackExtraction(data.videoId);
    }

    onCurrentTime(data) {
        this.dispatchCustomEvent('videoTimeUpdate', data);
    }

    onPlayState(data) {
        this.dispatchCustomEvent('videoStateChange', data);
    }

    async autoExtract() {
        if (!this.isYouTubePage()) return;
        
        const videoId = this.getCurrentVideoId();
        if (!videoId) {
            console.log('🔍 No video ID found for auto-extraction');
            return;
        }
        
        console.log(`🎯 Auto-extracting subtitles for video: ${videoId}`);
        
        try {
            const result = await this.extractSubtitles(videoId);
            if (result) {
                console.log(`✅ Auto-extraction successful: ${result.subtitles?.length || 0} subtitles`);
            }
        } catch (error) {
            console.log('❌ Auto-extraction failed:', error.message);
        }
    }

    async extractSubtitles(videoId, method = 'auto') {
        if (!videoId) {
            videoId = this.getCurrentVideoId();
        }
        
        if (!videoId) {
            throw new Error('No video ID provided or detected');
        }
        
        const startTime = Date.now();
        
        try {
            let result = null;
            
            switch (method) {
                case 'page':
                    result = await this.extractFromPage(videoId);
                    break;
                case 'api':
                    result = await this.extractFromAPI(videoId);
                    break;
                case 'injection':
                    result = await this.extractViaInjection(videoId);
                    break;
                case 'auto':
                default:
                    result = await this.extractAuto(videoId);
                    break;
            }
            
            const duration = Date.now() - startTime;
            
            // Record success
            if (this.components.analytics) {
                this.components.analytics.recordExtraction(
                    method,
                    true,
                    duration,
                    result?.subtitles?.length || 0,
                    null,
                    videoId
                );
            }
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Record failure
            if (this.components.analytics) {
                this.components.analytics.recordExtraction(
                    method,
                    false,
                    duration,
                    0,
                    error.message,
                    videoId
                );
            }
            
            throw error;
        }
    }

    async extractAuto(videoId) {
        // Try multiple methods in order of preference
        const methods = [
            () => this.extractViaInjection(videoId),
            () => this.extractFromPage(videoId),
            () => this.extractFromAPI(videoId)
        ];
        
        let lastError = null;
        
        for (const method of methods) {
            try {
                const result = await method();
                if (result && result.subtitles && result.subtitles.length > 0) {
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.log('Method failed, trying next...', error.message);
            }
        }
        
        throw lastError || new Error('All extraction methods failed');
    }

    async extractViaInjection(videoId) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Injection extraction timeout'));
            }, this.config.extractionTimeout);
            
            const messageHandler = (event) => {
                if (event.source !== window) return;
                
                if (event.data.action === 'subtitlesExtracted') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(event.data.data);
                } else if (event.data.action === 'extractionFailed') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    reject(new Error(event.data.data.reason || 'Injection extraction failed'));
                }
            };
            
            window.addEventListener('message', messageHandler);
            
            // Trigger extraction
            window.postMessage({
                type: 'TRIGGER_SUBTITLE_EXTRACTION',
                videoId: videoId
            }, '*');
        });
    }

    async extractFromPage(videoId) {
        if (!this.components.transcript) {
            throw new Error('Transcript component not available');
        }
        
        return await this.components.transcript.extractFromCurrentPageEnhanced(videoId);
    }

    async extractFromAPI(videoId) {
        if (!this.components.transcript) {
            throw new Error('Transcript component not available');
        }
        
        const url = window.location.href;
        return await this.components.transcript.fetchTranscript(url);
    }

    async tryFallbackExtraction(videoId) {
        console.log('🔄 Trying fallback extraction methods...');
        
        try {
            // Try different approach
            const result = await this.extractSubtitles(videoId, 'api');
            console.log('✅ Fallback extraction successful');
            this.onSubtitlesExtracted(result);
        } catch (error) {
            console.log('❌ Fallback extraction also failed:', error.message);
        }
    }

    // Testing and debugging methods
    async runDiagnostics() {
        console.log('🔍 Running system diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            page: {
                url: window.location.href,
                isYoutube: this.isYouTubePage(),
                videoId: this.getCurrentVideoId(),
                pageType: this.getPageType()
            },
            components: {
                transcript: !!this.components.transcript,
                tester: !!this.components.tester,
                analytics: !!this.components.analytics
            },
            injection: {
                scriptInjected: !!document.querySelector('script[data-sidepanel-injected]'),
                functionsAvailable: {
                    testSubtitles: typeof window.testSubtitles === 'function',
                    startAnalytics: typeof window.startAnalytics === 'function'
                }
            },
            youtube: {
                ytInitialPlayerResponse: !!window.ytInitialPlayerResponse,
                captions: this.checkCaptionAvailability(),
                player: !!document.querySelector('video')
            }
        };
        
        console.log('📊 Diagnostic results:', diagnostics);
        return diagnostics;
    }

    checkCaptionAvailability() {
        if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
            const tracks = window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
            return {
                available: !!tracks,
                count: tracks ? tracks.length : 0,
                languages: tracks ? tracks.map(t => t.languageCode) : []
            };
        }
        return { available: false, count: 0, languages: [] };
    }

    async runFullTest() {
        if (!this.components.tester) {
            throw new Error('Tester component not available');
        }
        
        const videoId = this.getCurrentVideoId();
        return await this.components.tester.runLiveTest(videoId);
    }

    // Analytics methods
    startAnalytics() {
        if (this.components.analytics && !this.components.analytics.isMonitoring) {
            this.components.analytics.startMonitoring();
            console.log('📊 Analytics monitoring started');
        }
    }

    stopAnalytics() {
        if (this.components.analytics && this.components.analytics.isMonitoring) {
            this.components.analytics.stopMonitoring();
            console.log('📊 Analytics monitoring stopped');
        }
    }

    getAnalytics() {
        if (this.components.analytics) {
            return this.components.analytics.exportMetrics();
        }
        return null;
    }

    // Utility methods
    isYouTubePage() {
        return window.location.hostname === 'www.youtube.com';
    }

    getCurrentVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        let videoId = urlParams.get('v');
        
        if (!videoId) {
            const shortsMatch = window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
            if (shortsMatch) {
                videoId = shortsMatch[1];
            }
        }
        
        return videoId;
    }

    getPageType() {
        if (window.location.pathname.includes('/shorts/')) {
            return 'shorts';
        } else if (window.location.pathname === '/watch') {
            return 'watch';
        } else if (window.location.search.includes('list=')) {
            return 'playlist';
        } else {
            return 'other';
        }
    }

    checkInjectionStatus() {
        const injected = !!document.querySelector('script[data-sidepanel-injected]');
        console.log(`💉 Injection status: ${injected ? 'Active' : 'Not detected'}`);
        return injected;
    }

    dispatchCustomEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    // Global interface
    exposeGlobalInterface() {
        // Main system object
        window.YouTubeSubtitleSystem = this;
        
        // Easy-to-use functions
        window.extractSubtitles = (videoId, method) => this.extractSubtitles(videoId, method);
        window.runDiagnostics = () => this.runDiagnostics();
        window.runFullTest = () => this.runFullTest();
        
        // Analytics shortcuts
        window.startAnalytics = () => this.startAnalytics();
        window.stopAnalytics = () => this.stopAnalytics();
        window.getAnalytics = () => this.getAnalytics();
        
        // Testing shortcuts
        window.testSubtitles = (videoId) => {
            if (this.components.tester) {
                return this.components.tester.runLiveTest(videoId);
            }
            throw new Error('Tester component not available');
        };
        
        console.log('🌐 Global interface exposed');
        console.log('💡 Available functions: extractSubtitles(), runDiagnostics(), runFullTest(), startAnalytics(), etc.');
    }

    // Configuration methods
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Configuration updated:', this.config);
    }

    getConfig() {
        return { ...this.config };
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.youtubeSubtitleSystem = new YouTubeSubtitleSystem();
        });
    } else {
        window.youtubeSubtitleSystem = new YouTubeSubtitleSystem();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeSubtitleSystem;
}
