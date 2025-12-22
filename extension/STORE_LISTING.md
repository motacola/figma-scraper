# Chrome Web Store Listing

## Name
FigmaSnap - Figma Prototype Capture

## Short Description (132 characters max)
Capture Figma prototypes into PDFs with one click. Automatic flow detection, redaction mode, and smart duplicate detection.

## Detailed Description

**Transform Figma prototypes into professional PDFs in seconds - no manual screenshots needed!**

FigmaSnap automates the tedious process of capturing Figma prototypes, saving you hours every week. Perfect for designers, developers, and product teams who need to share prototypes without giving Figma access.

### ✨ Key Features

**🚀 One-Click Capture**
- Automatically walks through your entire Figma prototype
- Captures every screen with perfect quality
- Generates a complete PDF ready to share

**🎯 Smart Flow Detection**
- Automatically discovers all flows in your prototype
- Capture single or multiple flows in one PDF
- Intelligent duplicate detection knows when the flow ends

**🔒 Privacy & Redaction**
- Tag layers with `[mask]` to hide sensitive content
- Everything processes locally in your browser
- No data sent to external servers
- No tracking or analytics

**⚡ Time-Saving Automation**
- Manual process: 30+ minutes per prototype
- FigmaSnap: 2 minutes per prototype
- Save 2+ hours every week

**🎨 Professional Output**
- High-quality PNG screenshots
- Clean, organized PDF layout
- Consistent formatting across all captures

### 🔧 How It Works

1. Navigate to any Figma prototype
2. Click the FigmaSnap extension icon
3. (Optional) Click "Discover" to find all flows
4. Click "Start Capture"
5. PDF downloads automatically when complete!

### 💡 Perfect For

**Designers & Agencies**
- Share review-ready PDFs with clients
- Create design documentation in seconds
- Maintain consistent presentation format

**Developers & Product Teams**
- Get complete visual specifications
- Capture entire user flows with all states
- Generate technical documentation

**Product Managers**
- Share prototypes as static PDFs for easy review
- Archive design iterations
- Create audit trails of design decisions

### 🛡️ Privacy First

- **100% Local Processing** - Everything runs in your browser
- **No Data Collection** - We don't collect, store, or transmit any data
- **No External Servers** - All processing happens on your machine
- **Open Source** - Review the code on GitHub

### ⚙️ Configuration

- **Max Slides**: Set capture limit (1-1000)
- **Wait Time**: Adjust delay between slides (500ms-60s)
- **Export Presets**: Choose output format (Stakeholder/Dev/Clean)
- **Redaction Mode**: Enable to mask sensitive content

### 🔐 Security

- XSS protection on all inputs
- Input validation and sanitization
- No external dependencies
- Secure local storage only

### 📖 Documentation

Full documentation available at:
https://github.com/motacola/figma-scraper/tree/main/extension

### 🆘 Support

- GitHub Issues: https://github.com/motacola/figma-scraper/issues
- Email: support@figmasnap.com

### 📜 License

MIT License - Free and open source

---

**Save hours every week. Try FigmaSnap today!**

## Category
Productivity

## Language
English

## Screenshots Needed
1. Extension popup with Figma URL detected
2. Flow discovery showing multiple flows
3. Capture in progress with progress bar
4. Sample PDF output

## Promotional Images (Optional)
- 440x280 small tile
- 920x680 large tile
- 1400x560 marquee

## Privacy Policy
See PRIVACY.md in extension folder

## Permissions Justification

**tabs**: Required to identify and interact with Figma tabs
**activeTab**: Required to capture screenshots of the current Figma prototype
**scripting**: Required to inject content scripts for flow detection and navigation
**downloads**: Required to save the generated PDF to your computer
**storage**: Required to store license key and settings locally
**host_permissions (figma.com)**: Required to access Figma prototypes for capture

All permissions are used solely for core functionality. No data is collected or transmitted.
