# 🛠️ YouTube Transcript Extension Debug Guide

## Quick Diagnosis Steps

### Step 1: Load and Test the Extension

1. **Load the Extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select your extension folder
   - Make sure the extension appears and is enabled

2. **Test on YouTube:**
   - Navigate to a YouTube video with subtitles (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
   - Click your extension icon to open the side panel
   - Check if subtitles load automatically

### Step 2: Use the Debug Tools

3. **Open the Extension Tester:**
   - Navigate to the `extension-tester.html` file you just created
   - Run the environment checks to see what's working
   - Check the debug output for detailed logs

4. **Open the Debug Test Page:**
   - Navigate to the `debug-test.html` file
   - Run the transcript extraction tests
   - Monitor the debug output

### Step 3: Common Issues and Fixes

## 🔍 Common Issues and Solutions

### Issue 1: Extension Not Loading Scripts
**Symptoms:** No transcript extraction, console errors about missing scripts
**Solution:**
```javascript
// Check if scripts are being injected
console.log('Scripts injected:', document.querySelectorAll('script[data-sidepanel-injected]').length);
```

### Issue 2: Content Script Not Running
**Symptoms:** Side panel opens but no communication with YouTube page
**Solution:**
1. Check content script is listed in manifest.json
2. Verify YouTube page matches the content script pattern
3. Check browser console for content script errors

### Issue 3: No Transcript Data
**Symptoms:** Extension loads but no subtitles appear
**Solution:**
1. Verify the video has captions available
2. Check network requests in DevTools
3. Test with different videos

### Issue 4: CORS/Permission Issues
**Symptoms:** Fetch requests failing
**Solution:**
1. Verify host_permissions in manifest.json includes YouTube
2. Check if video has captions enabled
3. Try different extraction methods

## 🧪 Testing Methods

### Method 1: Direct Browser Testing
```javascript
// Open browser console on YouTube video and test:
if (window.fixedTranscriptExtractor) {
    window.fixedTranscriptExtractor.diagnose();
    window.testFixedTranscriptExtraction();
}
```

### Method 2: Extension Console Testing
1. Open Chrome DevTools
2. Go to Extensions tab
3. Click "Inspect views" under your extension
4. Check for errors in extension console

### Method 3: Content Script Testing
```javascript
// In YouTube page console:
console.log('Extension objects:', {
    debugExtractor: !!window.debugExtractor,
    fixedExtractor: !!window.fixedTranscriptExtractor,
    youtubeTranscript: !!window.YouTubeTranscript,
    ytInitialPlayerResponse: !!window.ytInitialPlayerResponse
});
```

## 🔧 Quick Fixes

### Fix 1: Reload Extension
```
1. Go to chrome://extensions/
2. Click reload button under your extension
3. Refresh YouTube page
4. Test again
```

### Fix 2: Clear Cache and Data
```javascript
// Run in extension console:
localStorage.clear();
sessionStorage.clear();
if (window.fixedTranscriptExtractor) window.fixedTranscriptExtractor.clearCache();
```

### Fix 3: Re-inject Scripts
```javascript
// Run in YouTube page console:
if (chrome.runtime) {
    chrome.runtime.sendMessage({type: 'REINJECT_EXTRACTOR'});
}
```

## 📋 Debugging Checklist

- [ ] Extension loaded and enabled in chrome://extensions/
- [ ] On a YouTube video page with captions
- [ ] Content script injected (check for `script[data-sidepanel-injected]`)
- [ ] Background script responding (check extension console)
- [ ] Side panel opens without errors
- [ ] Video ID extracted correctly
- [ ] Caption tracks found in page data
- [ ] Network requests succeeding
- [ ] Transcript parsing working

## 🚨 Emergency Fixes

If nothing works, try these in order:

1. **Full Reset:**
   ```
   - Reload extension
   - Clear all browser data for YouTube
   - Restart Chrome
   - Test with fresh YouTube video
   ```

2. **Manual Test:**
   ```javascript
   // Test core functionality manually
   const videoId = 'dQw4w9WgXcQ'; // Rick Roll video with captions
   if (window.fixedTranscriptExtractor) {
       window.fixedTranscriptExtractor.getTranscript(videoId)
           .then(transcript => console.log('Success:', transcript))
           .catch(error => console.error('Failed:', error));
   }
   ```

3. **Check File Paths:**
   - Verify all files exist in the extension directory
   - Check manifest.json web_accessible_resources
   - Ensure no typos in file names

## 📞 Support Information

If you're still having issues:

1. **Collect Debug Information:**
   - Extension console logs
   - YouTube page console logs
   - Network tab in DevTools
   - Extension tester results

2. **Test Environment:**
   - Chrome version
   - Operating system
   - YouTube video URL being tested
   - Any console error messages

3. **Working Test Videos:**
   - https://www.youtube.com/watch?v=dQw4w9WgXcQ (Rick Roll - has captions)
   - https://www.youtube.com/watch?v=LXb3EKWsInQ (MKBHD - has captions)
   - Any TED Talk or educational video (usually has captions)

## 🎯 Next Steps

Once you identify the issue:

1. **Fix the root cause** (usually script injection or permissions)
2. **Test with multiple videos** to ensure reliability
3. **Optimize performance** if extraction is slow
4. **Add error handling** for edge cases

The most common issue is that the content script isn't injecting properly or the YouTube page isn't providing caption data. Start with the environment checks and work through the debugging steps systematically.
