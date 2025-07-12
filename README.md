# SidePanel AI - Standalone Chrome Extension

![Extension Icon](icon.png)

A self-contained Chrome extension that provides AI-powered YouTube transcript viewing in the side panel. This version doesn't require a separate Next.js server and runs entirely within the Chrome extension environment.

## Features

- 🎥 **YouTube Transcript Fetching**: Extract transcripts from YouTube videos
- 🤖 **AI Integration**: Support for multiple AI providers (Gemini, OpenAI, Groq, Cerebras, Mistral, OpenRouter)
- 🌍 **Translation**: Translate transcripts to 100+ languages using AI
- 💬 **AI Chat**: Ask questions about video content based on transcript
- ⏯️ **Playback Control**: Simulate playback with auto-scrolling and line-by-line progression
- 🔍 **Search**: Search within transcripts
- 📋 **Copy**: Copy individual lines or entire transcripts
- 🎨 **Modern UI**: Clean, responsive design with dark/light theme support
- ⚙️ **Settings**: Configure AI provider, API keys, and models

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `standalone` folder
5. The extension will appear in your toolbar

## Setup

1. Click the extension icon when on a YouTube video page
2. Click the settings gear icon in the side panel
3. Choose your AI provider and enter your API key
4. Select a model from the dropdown
5. Save settings

## Usage

1. Navigate to any YouTube video
2. Click the extension icon to open the side panel
3. The transcript will automatically load for the current video
4. Use the various features:
   - Search within the transcript
   - Translate to different languages
   - Ask AI questions about the video content
   - Control playback and auto-scroll

The extension automatically detects when you navigate to a different YouTube video and loads the new transcript.

## Supported AI Providers

- **Gemini** (Google)
- **OpenAI** (GPT models)
- **Groq** (Fast inference)
- **Cerebras** (High-performance inference)
- **Mistral** (Open source models)
- **OpenRouter** (Multiple model access)
- **OpenAI-Compatible Endpoints** (Custom APIs)

## API Keys

You'll need an API key from your chosen provider:

- **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Groq**: Get from [Groq Console](https://console.groq.com/keys)
- **Cerebras**: Get from [Cerebras Inference](https://inference.cerebras.ai/)
- **Mistral**: Get from [Mistral Platform](https://console.mistral.ai/)
- **OpenRouter**: Get from [OpenRouter](https://openrouter.ai/keys)

## Files Structure

```
standalone/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js         # YouTube page integration
├── sidepanel.html     # Main UI
├── styles.css         # Styling
├── app.js            # Main application logic
├── youtube-transcript.js  # Transcript fetching
├── icon.png          # Extension icon
└── README.md         # This file
```

## Technical Details

- **Manifest V3**: Uses the latest Chrome extension format
- **Side Panel API**: Leverages Chrome's native side panel
- **No External Dependencies**: Runs entirely in the browser
- **Local Storage**: Settings persist across sessions
- **CORS Handling**: Direct API calls to AI providers
- **Fallback Transcript**: Mock data when real transcripts aren't available

## Limitations

- YouTube transcript availability depends on the video having captions
- Some videos may not have accessible transcripts
- API rate limits apply based on your chosen provider
- Cross-origin requests are subject to browser security policies

## Development

To modify or extend the extension:

1. Edit the relevant files in the `standalone` folder
2. Reload the extension in `chrome://extensions/`
3. Test on YouTube videos

## Troubleshooting

**Extension not loading?**
- Make sure all files are in the `standalone` folder
- Check the developer console for errors
- Verify manifest.json is valid

**Can't fetch transcripts?**
- Check if the video has captions enabled
- Try a different YouTube video
- The extension will use demo data if real transcripts fail

**AI not responding?**
- Verify your API key is correct
- Check your provider's status page
- Ensure you have credits/quota remaining

**Settings not saving?**
- Check browser local storage permissions
- Try refreshing the extension

## Privacy

This extension:
- Only accesses YouTube.com when active
- Stores settings locally in your browser
- Makes direct API calls to your chosen AI provider
- Does not collect or transmit personal data to third parties

## License

This project is open source. Feel free to modify and distribute according to your needs.
# ytsidebar
