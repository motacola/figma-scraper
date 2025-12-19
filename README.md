# FigmaSnap

**Capture Figma prototypes in seconds - no subscriptions, pay once, use forever.**

FigmaSnap is a powerful desktop utility that automates the process of capturing full-page screenshots and generating PDFs from Figma prototypes. It handles password protection, anti-bot detection, and long vertical content automatically.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [CLI Usage](#cli-usage)
- [Electron App Usage](#electron-app-usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Automated Capture**: Automatically walk through Figma prototypes
- **Password Protection**: Handle password-protected prototypes
- **Anti-bot Detection**: Bypass common anti-bot measures
- **Long Content Support**: Capture long vertical content automatically
- **PDF Generation**: Generate PDFs from captured screenshots
- **Cross-platform**: Works on Mac, Windows, and Linux

## 🚀 Installation

### Prerequisites

- Node.js (v16 or higher)
- Google Chrome installed
- Git (for cloning the repository)

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

### Install as CLI Tool

```bash
npm install -g figma-scraper
```

## 📖 Usage

### CLI Usage

```bash
# Basic usage
figma-scraper --url "https://www.figma.com/proto/..." --output ./output

# With password protection
figma-scraper --url "https://www.figma.com/proto/..." --password "yourpassword" --output ./output

# Generate PDF
figma-scraper --url "https://www.figma.com/proto/..." --output ./output --pdf

# All options
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

### Environment Variables

```bash
# Set Chrome executable path
export CHROME_PATH="/path/to/chrome"

# Set output directory
export OUTPUT_DIR="./screenshots"
```

## 🔧 Troubleshooting

### Common Issues

**Chrome not found:**

- Ensure Google Chrome is installed in the default location
- Set `CHROME_PATH` environment variable to point to your Chrome executable

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
*Saves you 2 hours every week. Pay once, use forever.*
