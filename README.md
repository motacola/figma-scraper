# FigmaSnap

**Automate Figma prototype capture - Save hours every week with one-click PDF generation**

FigmaSnap is the fastest way to turn Figma prototypes into professional PDFs and screenshots. Perfect for client presentations, developer handoffs, and design documentation.

## 🎯 Who It's For

**Designers & Agencies**

![FigmaSnap Electron App Interface](assets/screenshots/electron-app.png)

- Send review-ready PDFs to clients without giving them Figma login access
- Create polished design documentation in seconds instead of manual screenshot work
- Maintain consistent presentation format across all client deliverables

**Developers & Product Teams**

- Get complete visual specifications from Figma prototypes
- Capture entire user flows with all states and interactions
- Generate technical documentation with annotated screens

**Product Managers & Stakeholders**

- Share interactive prototypes as static PDFs for easy review
- Archive design iterations with timestamped captures
- Create audit trails of design decisions and iterations

## 🚀 Why FigmaSnap?

### ⏱️ **Saves Hours Every Week**

- Manual process: 30+ minutes per prototype (screenshots, cropping, PDF conversion)
- FigmaSnap: 2 minutes per prototype (fully automated)
- **Time saved: 2+ hours weekly for typical design teams**

### 🔒 **Secure & Private**

- No cloud processing - everything runs locally on your machine
- No Figma login required for recipients - just share the PDF
- Password-protected prototypes supported

### 📱 **Better Than Alternatives**

| Method | Time | Quality | Privacy | Automation |
|--------|------|---------|---------|------------|
| **Manual Screenshots** | 30+ min | Inconsistent | ✅ Good | ❌ None |
| **Screen Recording** | 10 min | Low quality | ✅ Good | ❌ None |
| **Figma Export** | 15 min | Limited | ❌ Requires login | ❌ None |
| **FigmaSnap** | 2 min | Professional | ✅ Excellent | ✅ Full |

## 📋 Table of Contents

- [Features](#features)
- [Visual Showcase](#visual-showcase)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Chrome Extension](#chrome-extension-new)
  - [CLI Usage](#cli-usage)
  - [Electron App Usage](#electron-app-usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Automated Capture**: Walk through Figma prototypes automatically
- **Password Protection**: Handle password-protected prototypes seamlessly
- **Anti-bot Detection**: Intelligent bypass of common anti-bot measures
- **Long Content Support**: Capture long vertical content automatically
- **PDF Generation**: Generate professional PDFs from captured screenshots
- **Cross-platform**: Works on Mac, Windows, and Linux
- **Redaction Mode**: Hide sensitive layers with [mask] tags
- **Flow Capture**: Target specific user flows within prototypes

## 👀 Visual Showcase

### Before vs After

![Before and After Comparison](assets/screenshots/before-after.png)

**Manual Process:** 30+ minutes of manual screenshots, cropping, and PDF assembly
**FigmaSnap:** 2 minutes of automated capture with professional results

### Sample Output

📄 **[Download Sample PDF](assets/sample-output.pdf)** - See exactly what FigmaSnap produces

![Sample PDF Output](assets/screenshots/sample-pdf.png)

*Professional PDF with automatic frame naming and consistent formatting*

### How It Works

1. **Input**: Paste your Figma prototype URL
2. **Capture**: FigmaSnap automatically walks through all screens
3. **Output**: Get a complete PDF with all frames and interactions

## 🏃 5-Minute Quickstart

Get up and running in minutes:

```bash
# 1. Clone the repository
git clone https://github.com/motacola/figma-scraper.git
cd figma-scraper

# 2. Install dependencies
npm install

# 3. Run with a sample prototype (try our demo URL)
node scrape.js --url "https://www.figma.com/proto/DEMO/EXAMPLE" --output ./my-capture

# 4. Open the generated PDF
open ./my-capture/Presentation.pdf
```

**That's it!** You've just captured your first Figma prototype.

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- Google Chrome installed
- Git (for cloning the repository)

### Recommended: Global CLI Install

```bash
# Install globally for easy CLI access
npm install -g figma-scraper

# Verify installation
figma-scraper --version
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/motacola/figma-scraper.git

# Navigate to the project directory
cd figma-scraper

# Install dependencies
npm install

# For Electron app
npm install electron --save-dev
```

## 📖 Usage

### Chrome Extension (NEW!) 🎉

The easiest way to use FigmaSnap - no installation required!

**Installation:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository

**Usage:**
1. Navigate to any Figma prototype
2. Click the FigmaSnap extension icon
3. Enter license key: `FSNAP-TEST-KEY-2025`
4. Click **Discover** to find flows (optional)
5. Click **Start Capture** - PDF downloads automatically!

📖 **[Full Extension Documentation](extension/README.md)**

---

### CLI Usage

```bash
# Basic usage - capture prototype to screenshots
figma-scraper --url "https://www.figma.com/proto/..." --output ./output

# With password protection
figma-scraper --url "https://www.figma.com/proto/..." --password "yourpassword" --output ./output

# Generate PDF directly
figma-scraper --url "https://www.figma.com/proto/..." --output ./output --pdf

# All options with custom delay
figma-scraper --url "URL" --password "PASSWORD" --output "OUTPUT_DIR" --pdf --headless --delay 5000
```

### Electron App Usage

```bash
# Start the Electron application
npm start

# Or build for production
npm run build
```

## ⚙️ Configuration

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | Figma prototype URL | Required |
| `--password` | Password for protected prototypes | None |
| `--output` | Output directory for screenshots | `./output` |
| `--pdf` | Generate PDF from screenshots | `false` |
| `--headless` | Run in headless mode | `false` |
| `--delay` | Delay between actions (ms) | `3000` |
| `--max-slides` | Maximum slides to capture | `200` |
| `--wait` | Wait time per slide (ms) | `5000` |

### Environment Variables

```bash
# Set Chrome executable path
export CHROME_PATH="/path/to/chrome"

# Set output directory
export OUTPUT_DIR="./screenshots"

# Set Figma URL
export FIGMA_URL="https://www.figma.com/proto/..."

# Set Figma password
export FIGMA_PASSWORD="yourpassword"
```

## 🔧 Troubleshooting

### Common Issues

**Chrome not found:**

- Ensure Google Chrome is installed in the default location
- Set `CHROME_PATH` environment variable to point to your Chrome executable
- Firefox and Safari are not supported (Playwright Chromium only)

**Canvas not detected:**

- Some complex prototypes load slowly
- FigmaSnap will wait up to 60 seconds before defaulting to manual mode
- Try increasing the delay with `--delay 5000`

**Permission Denied:**

- On Mac/Windows, you may need to allow the app to run
- The app is currently unsigned for the development version

**Authentication Issues:**

- Ensure your Figma URL is correct
- Check if the prototype requires a password
- Try manual mode if automatic detection fails

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/motacola/figma-scraper.git

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### Bug Reports

Please include:

- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- System information (OS, Node.js version, Chrome version)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

For questions or support, please open an issue on GitHub or contact us at <support@figmasnap.com>.

---
*Saves you 2+ hours every week. Pay once, use forever. No subscriptions, no cloud processing, no tracking.*
