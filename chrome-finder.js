const { existsSync } = require('fs');
const path = require('path');
const os = require('os');

function findChrome() {
    const platform = os.platform();
    let paths = [];

    if (platform === 'darwin') {
        paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            '/Applications/Arc.app/Contents/MacOS/Arc',
            '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ];
    } else if (platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA;
        const programFiles = process.env.PROGRAMFILES;
        const programFilesx86 = process.env['PROGRAMFILES(X86)'];
        paths = [
            `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
            `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
            `${programFilesx86}\\Google\\Chrome\\Application\\chrome.exe`,
            `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
            `${programFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
            `${localAppData}\\Chromium\\Application\\chrome.exe`,
            `${programFiles}\\Chromium\\Application\\chrome.exe`
        ];
    } else if (platform === 'linux') {
        paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/microsoft-edge',
            '/usr/bin/brave-browser',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium'
        ];
    }

    for (const p of paths) {
        if (existsSync(p)) {
            return p;
        }
    }

    return null;
}

module.exports = { findChrome };
