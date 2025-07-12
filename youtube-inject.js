// YouTube Subtitle Injection Script - Fallback Version
// This is a simpler fallback version of the YouTube injection script

(function() {
    'use strict';

    console.log('🚀 YouTube Fallback Injection Script Loaded');

    // Simple player detection
    function getPlayer() {
        return document.querySelector('video.html5-main-video') ||
               document.querySelector('.html5-video-player video') ||
               document.querySelector('video');
    }

    // Simple subtitle extraction fallback
    async function extractSubtitlesFallback() {
        try {
            const videoId = new URLSearchParams(window.location.search).get('v') ||
                          window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/)?.[1];
            
            if (!videoId) {
                throw new Error('No video ID found');
            }

            // Try simple API call
            const response = await fetch(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.events) {
                    const subtitles = [];
                    let id = 1;
                    
                    for (const event of data.events) {
                        if (event.segs) {
                            const startTime = (event.tStartMs || 0) / 1000;
                            const text = event.segs.map(seg => seg.utf8 || '').join('').trim();
                            
                            if (text) {
                                subtitles.push({
                                    id: id++,
                                    timestamp: formatTime(startTime),
                                    text: cleanText(text),
                                    offset: event.tStartMs || 0
                                });
                            }
                        }
                    }
                    
                    return {
                        subtitles: subtitles,
                        videoId: videoId,
                        language: 'en'
                    };
                }
            }
            
            throw new Error('Failed to fetch subtitles');
        } catch (error) {
            console.error('Fallback extraction failed:', error);
            throw error;
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function cleanText(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n/g, ' ')
            .trim();
    }

    // Player control functions
    function seekToTime(seconds) {
        const player = getPlayer();
        if (player) {
            player.currentTime = seconds;
            return true;
        }
        return false;
    }

    function togglePlayPause() {
        const player = getPlayer();
        if (player) {
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
            return true;
        }
        return false;
    }

    // Message listener
    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;

        const { type, videoId, time } = event.data;

        switch (type) {
            case 'TRIGGER_SUBTITLE_EXTRACTION':
                try {
                    const result = await extractSubtitlesFallback();
                    window.postMessage({
                        action: 'subtitlesExtracted',
                        data: result
                    }, '*');
                } catch (error) {
                    window.postMessage({
                        action: 'extractionFailed',
                        data: {
                            reason: error.message
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
        }
    });

    console.log('✅ YouTube Fallback Injection Script Ready');

})();