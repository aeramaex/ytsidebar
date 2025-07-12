// YouTube Transcript Extension - Complete Test Suite
// This file validates that all fixes have been properly applied

console.log('🚀 YouTube Transcript Extension Test Suite Starting...');

// Test 1: Check if the enhanced extractor is loaded
function testExtractorLoaded() {
    console.log('📋 Test 1: Checking if enhanced extractor is loaded...');
    
    const tests = {
        youtubeTranscriptExtractor: !!window.youtubeTranscriptExtractor,
        runDiagnostics: typeof window.runDiagnostics === 'function',
        testSubtitles: typeof window.testSubtitles === 'function',
        performanceTest: typeof window.performanceTest === 'function'
    };
    
    const passed = Object.values(tests).every(Boolean);
    console.log(passed ? '✅ Extractor loaded successfully' : '❌ Extractor not loaded properly');
    console.log('Details:', tests);
    
    return passed;
}

// Test 2: Validate extraction methods
async function testExtractionMethods() {
    console.log('📋 Test 2: Validating extraction methods...');
    
    if (!window.youtubeTranscriptExtractor) {
        console.log('❌ Extractor not available');
        return false;
    }
    
    const extractor = window.youtubeTranscriptExtractor;
    const methods = [
        'extractFromPlayerResponse',
        'extractFromPlayerAPI', 
        'extractFromDOM',
        'extractFromScriptTags',
        'extractViaManualConstruction'
    ];
    
    const results = {};
    for (const method of methods) {
        results[method] = typeof extractor[method] === 'function';
    }
    
    const passed = Object.values(results).every(Boolean);
    console.log(passed ? '✅ All extraction methods available' : '❌ Some methods missing');
    console.log('Details:', results);
    
    return passed;
}

// Test 3: Test rate limiting functionality
function testRateLimiting() {
    console.log('📋 Test 3: Testing rate limiting functionality...');
    
    if (!window.youtubeTranscriptExtractor) {
        console.log('❌ Extractor not available');
        return false;
    }
    
    const extractor = window.youtubeTranscriptExtractor;
    const rateLimitMethods = [
        'rateLimitedFetch',
        'processQueue',
        'waitWithExponentialBackoff'
    ];
    
    const results = {};
    for (const method of rateLimitMethods) {
        results[method] = typeof extractor[method] === 'function';
    }
    
    const passed = Object.values(results).every(Boolean);
    console.log(passed ? '✅ Rate limiting methods available' : '❌ Rate limiting incomplete');
    console.log('Details:', results);
    
    return passed;
}

// Test 4: Test YouTube page detection
function testYouTubeDetection() {
    console.log('📋 Test 4: Testing YouTube page detection...');
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    const hasVideoId = !!(new URLSearchParams(window.location.search).get('v') || 
                          window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/));
    
    console.log(`Is YouTube page: ${isYouTube}`);
    console.log(`Has video ID: ${hasVideoId}`);
    
    if (isYouTube) {
        console.log('✅ YouTube page detected');
        return true;
    } else {
        console.log('⚠️ Not on YouTube page - some tests may not work');
        return false;
    }
}

// Test 5: Test caption availability
function testCaptionAvailability() {
    console.log('📋 Test 5: Testing caption availability...');
    
    const hasYtData = !!window.ytInitialPlayerResponse;
    let captionCount = 0;
    
    if (hasYtData && window.ytInitialPlayerResponse.captions) {
        const tracks = window.ytInitialPlayerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        captionCount = tracks ? tracks.length : 0;
    }
    
    console.log(`YouTube data available: ${hasYtData}`);
    console.log(`Caption tracks found: ${captionCount}`);
    
    if (captionCount > 0) {
        console.log('✅ Captions available for testing');
        return true;
    } else {
        console.log('⚠️ No captions found - may need different video');
        return false;
    }
}

// Test 6: Quick extraction test
async function testQuickExtraction() {
    console.log('📋 Test 6: Quick extraction test...');
    
    if (!window.testSubtitles) {
        console.log('❌ Test function not available');
        return false;
    }
    
    try {
        const result = await window.testSubtitles();
        if (result && result.subtitles && result.subtitles.length > 0) {
            console.log(`✅ Quick extraction successful: ${result.subtitles.length} subtitles`);
            return true;
        } else {
            console.log('❌ Quick extraction returned no results');
            return false;
        }
    } catch (error) {
        console.log(`❌ Quick extraction failed: ${error.message}`);
        return false;
    }
}

// Test 7: Performance validation
async function testPerformance() {
    console.log('📋 Test 7: Performance validation...');
    
    if (!window.performanceTest) {
        console.log('❌ Performance test not available');
        return false;
    }
    
    try {
        const result = await window.performanceTest();
        if (result && result.duration < 10000) { // Should complete within 10 seconds
            console.log(`✅ Performance test passed: ${result.duration.toFixed(2)}ms`);
            return true;
        } else {
            console.log('❌ Performance test too slow or failed');
            return false;
        }
    } catch (error) {
        console.log(`❌ Performance test failed: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Running complete test suite...');
    console.log('=====================================');
    
    const tests = [
        { name: 'Extractor Loaded', test: testExtractorLoaded },
        { name: 'Extraction Methods', test: testExtractionMethods },
        { name: 'Rate Limiting', test: testRateLimiting },
        { name: 'YouTube Detection', test: testYouTubeDetection },
        { name: 'Caption Availability', test: testCaptionAvailability },
        { name: 'Quick Extraction', test: testQuickExtraction },
        { name: 'Performance', test: testPerformance }
    ];
    
    const results = {};
    let passedCount = 0;
    
    for (const { name, test } of tests) {
        try {
            const passed = await test();
            results[name] = passed;
            if (passed) passedCount++;
        } catch (error) {
            console.log(`❌ Test "${name}" threw error:`, error.message);
            results[name] = false;
        }
        console.log('-------------------------------------');
    }
    
    console.log('🏁 Test Summary:');
    console.log(`Passed: ${passedCount}/${tests.length} tests`);
    console.log('Results:', results);
    
    const overallSuccess = passedCount >= tests.length - 1; // Allow 1 failure
    console.log(overallSuccess ? '🎉 Extension is working!' : '🚨 Extension needs fixes');
    
    return {
        passed: passedCount,
        total: tests.length,
        success: overallSuccess,
        results
    };
}

// Auto-run tests after page load
if (document.readyState === 'complete') {
    setTimeout(runAllTests, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(runAllTests, 2000);
    });
}

// Make test functions globally available
window.runExtensionTests = runAllTests;
window.testExtractorLoaded = testExtractorLoaded;

console.log('📋 Test suite loaded. Run window.runExtensionTests() to test manually.');
