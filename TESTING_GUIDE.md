# Enhanced Extension Testing & Debug Guide

## Quick Test Instructions

### 1. Load the Extension in Chrome
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the folder: `c:\Users\amiak\OneDrive\Desktop\myextensions\firebase\standalone`

### 2. Test Enhanced Features
1. Go to any YouTube video with subtitles
2. Click the extension icon to open side panel
3. The extension should automatically extract subtitles with:
   - **Enhanced extraction methods** (5 different approaches)
   - **Real-time highlighting** (current subtitle highlighted in yellow)
   - **Auto-scroll functionality** (panel follows video position)
   - **Smooth animations** and transitions

## New Enhanced Features to Test

### ✨ Real-time Subtitle Highlighting
- Play a YouTube video with subtitles
- **Expected**: Current subtitle highlighted in yellow with smooth animation
- **Check**: Highlighting updates as video progresses

### ✨ Auto-scroll Functionality  
- Play a video and let it run
- **Expected**: Side panel automatically scrolls to keep current subtitle visible
- **Check**: Smooth scrolling behavior

### ✨ Advanced Extraction Methods
The extension now tries 5 different methods in order:
1. **Network interception** (most reliable)
2. **CC button interaction** (simulates user clicking captions)
3. **YouTube Innertube API** (official API)
4. **Player response parsing** (from page data)
5. **Direct timedtext API** (fallback method)

### ✨ Better Error Handling
- Try videos without subtitles
- **Expected**: Clear error messages instead of silent failures
6. Verify the extension appears with no errors

### 2. Test on YouTube
1. Open a new tab and go to: https://www.youtube.com/watch?v=jNQXAC9IVRw
2. Click the extension icon in the toolbar (puzzle piece icon if hidden)
3. Click "SidePanel AI - Standalone" to open the side panel
4. The side panel should open on the right side

### 3. Debug Console Logging
Open Developer Tools (F12) and check these tabs:

#### **Content Script Logs** (Main Page Console):
- Go to YouTube video page
- Press F12 → Console tab
- Look for messages starting with:
  - `🚀 Enhanced YouTube content script loading...`
  - `✅ YouTube subtitle extractor injected successfully`
  - `🎯 Attempting to load captions for video:`

#### **Background Script Logs**:
- In Chrome, go to `chrome://extensions/`
- Find "SidePanel AI - Standalone"
- Click "Inspect views: service worker"
- Check console for messages like:
  - `✅ Notifying side panel of new YouTube URL:`
  - `✅ Background script loaded and monitoring tabs`

#### **Side Panel Logs**:
- With side panel open, right-click in the side panel
- Select "Inspect" 
- Check console for:
  - `🔌 Attempting to connect to background script...`
  - `✅ Successfully connected to background script`
  - `🎯 Auto-fetching transcript for:`

### 4. Test Subtitle Extraction

#### **Automatic Test:**
1. Navigate to a YouTube video with captions
2. Wait 2-3 seconds
3. Side panel should show loading spinner, then transcript

#### **Manual Test:**
If automatic doesn't work:
1. Open side panel
2. Look for any manual fetch button
3. Check console logs for error messages

### 5. Test URL Change Detection
1. Start on any YouTube video
2. Click to a different video (or use these test URLs):
   - https://www.youtube.com/watch?v=dQw4w9WgXcQ
   - https://www.youtube.com/watch?v=jNQXAC9IVRw
3. Should automatically extract new transcript without refresh

## Common Issues & Solutions

### Issue: "No transcript loaded"
**Possible Causes:**
1. Extension not properly loaded
2. Content script injection failed
3. YouTube API blocked by adblockers
4. Network request interception not working

**Debug Steps:**
1. Check if content script logs appear in console
2. Verify background script is running
3. Test with uBlock Origin disabled
4. Check if CC button clicking is working

### Issue: Auto-scroll not working
**Debug Steps:**
1. Check if timestamps are being processed
2. Verify video time sync is running
3. Check console for sync messages

### Issue: Extension not loading
**Debug Steps:**
1. Check `chrome://extensions/` for errors
2. Verify all files are present in folder
3. Check manifest.json syntax

## Debug Commands

Run these in the appropriate console:

```javascript
// In content script (main page console):
window.postMessage({type: 'TRIGGER_SUBTITLE_EXTRACTION'}, '*');

// In side panel console:
console.log('Current transcript length:', this.transcript?.length || 0);

// Check extension connection:
chrome.runtime.sendMessage({type: 'HEALTH_CHECK'}, console.log);
```

## Expected Console Output

### **Working Extension Should Show:**
```
🚀 Enhanced YouTube content script loading...
✅ YouTube subtitle extractor injected successfully  
🎯 URL changed detected: [video-id]
🎯 Attempting to load captions for video: [video-id]
✅ Found captions using Innertube API: X tracks
✅ Successfully extracted X subtitles
```

### **Side Panel Should Show:**
```
🔌 Attempting to connect to background script...
✅ Successfully connected to background script
🎯 Auto-fetching transcript for: [url]
✅ Transcript loaded successfully: X lines
```

## Test Videos

Use these videos that typically have good captions:
- https://www.youtube.com/watch?v=jNQXAC9IVRw (TED Talk)
- https://www.youtube.com/watch?v=dQw4w9WgXcQ (Music video)
- https://www.youtube.com/watch?v=9bZkp7q19f0 (Tech content)

## If Nothing Works

1. Disable all other extensions temporarily
2. Test in incognito mode
3. Clear browser cache and reload extension
4. Check if webRequest permission is granted in extension details
