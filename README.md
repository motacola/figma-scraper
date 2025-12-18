# Figma Screenshot Automation

This project contains a Puppeteer script to capture full-page screenshots of Figma prototypes. It is designed to handle password protection, anti-bot detection, and long vertical content.

## Prerequisites

-   **Node.js**: Ensure Node.js is installed.
-   **Google Chrome**: The script uses the system's Google Chrome installation (MacOS).

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Run the script:
    ```bash
    node scrape.js
    ```

2.  **Manual Setup (Human-in-the-Loop)**:
    The script will launch Chrome and pause for **60 seconds**. During this time, you MUST:
    -   **Log in** to Figma (if prompted). Password is usually configured in the script (default: 'Boho').
    -   **Ensure the prototype is loaded**.
    -   **Click on the canvas** to ensure it has focus.
    -   **Wait** for the script to resume.

## Features

-   **Full Page Capture**: Forces a `1600x5000` viewport to capture scrolling content.
-   **Duplicate Detection**: Skips saving identical screenshots if the slide hasn't changed.
-   **Persistent Profile**: Saves login state to `./chrome_profile` to avoid repeated logins.
-   **System Chrome**: Uses the actual Chrome browser to bypass WebGL/GPU rendering issues common in headless browsers.

## key specific settings

-   **URL**: Configured in `scrape.js` (`const FIGMA_URL = ...`).
-   **Output**: Saved to `~/Downloads/Boho_Beautiful_Screenshots`.
