# FigmaSnap Chrome Extension

**Capture Figma prototypes directly from your browser - No Electron app required!**

## 🚀 Quick Start

### Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder: `/path/to/figma-scraper/extension`

### Usage

1. Navigate to any Figma prototype
2. Click the FigmaSnap extension icon
3. Enter license key (starts with `FSNAP-`)
4. Click **Discover** to find flows (optional)
5. Click **Start Capture**
6. PDF will automatically download when complete

## ✨ Features

- **Browser-Native**: No Electron app needed
- **Automatic Flow Detection**: Discovers all flows in your prototype
- **Redaction Mode**: Hide sensitive content with `[mask]` tags
- **Multi-Flow Support**: Capture multiple flows in one PDF
- **Smart Duplicate Detection**: Automatically detects end of flows
- **Progress Tracking**: Real-time status updates

## 🔧 Configuration

### Settings

- **Max Slides**: Maximum number of slides to capture (1-1000)
- **Wait Time**: Delay between slides in milliseconds (500-60000)
- **Export Preset**: Choose output format (Stakeholder/Dev/Clean)
- **Redaction Mode**: Enable to mask layers tagged with `[mask]`

### License

For development, any key starting with `FSNAP-` is valid:
- Example: `FSNAP-TEST-KEY-2025`

## 📁 Extension Structure

```
extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic and validation
├── background.js       # Service worker (capture orchestration)
├── content.js          # Injected into Figma pages
├── styles.css          # UI styles
├── assets/
│   └── icon.png        # Extension icon
└── libs/
    └── pdf-lib.min.js  # PDF generation library
```

## 🐛 Troubleshooting

### Extension doesn't appear
- Ensure you loaded the `extension` folder, not the root project folder
- Check for errors in `chrome://extensions/`

### Discover button doesn't work
- Make sure you're on a Figma prototype page
- The URL should contain `figma.com/proto/` or `figma.com/design/`

### Capture fails or hangs
- Check the browser console for errors (F12)
- Ensure the Figma page is fully loaded before starting
- Try increasing the wait time

### PDF is empty or incomplete
- This was a known bug that has been fixed
- Make sure you're using the latest version

## 🔒 Privacy & Security

- **No Cloud Processing**: Everything runs locally in your browser
- **No Data Collection**: No analytics or tracking
- **XSS Protected**: All user input is sanitized
- **Input Validated**: Upper bounds prevent abuse

## 🚧 Known Limitations

- Maximum 1000 slides per capture
- Wait time capped at 60 seconds
- Requires Chrome (Chromium-based browsers may work)
- Content scripts only inject on Figma domains

## 📝 Development

### Building from Source

The extension is already built and ready to use. No build step required.

### Testing

1. Load extension in Developer Mode
2. Navigate to a Figma prototype
3. Test all features:
   - Flow discovery
   - Single/multi-flow capture
   - Redaction mode
   - Error scenarios

### Debugging

- **Popup**: Right-click extension icon → Inspect popup
- **Background**: chrome://extensions/ → Details → Inspect service worker
- **Content Script**: F12 on Figma page → Console

## 🔄 Updates

To update the extension:
1. Pull latest changes from git
2. Go to `chrome://extensions/`
3. Click the refresh icon on the FigmaSnap extension

## 📜 License

MIT License - See LICENSE file for details

---

**Need the Electron app instead?** See the main [README.md](../README.md) for the desktop application.
