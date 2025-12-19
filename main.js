const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { findChrome } = require('./chrome-finder');
const { validateLicense } = require('./license');
const { runScrape } = require('./scraper-core');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: "FigmaSnap",
        resizable: false,
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('start-capture', async (event, config) => {
    console.log('Main: Starting capture with config:', config);
    
    // 1. Find browser (use provided path or auto-detect)
    let chromePath = config.browserPath || findChrome();
    
    if (chromePath) {
        const lowerPath = chromePath.toLowerCase();
        const isSafari = lowerPath.includes('safari.app') ||
                         lowerPath.includes('/safari') ||
                         lowerPath.includes('com.apple.safari') ||
                         lowerPath.includes('safari.exe');
        
        if (isSafari) {
            event.reply('status-update', {
                type: 'error',
                message: 'Safari is not supported (Playwright Chromium only). Please use Chrome, Edge, Brave, or Arc.'
            });
            return;
        }
    }
    
    if (!chromePath) {
        event.reply('status-update', { type: 'error', message: 'Browser not found. Please install Chrome or select a browser path.' });
        return;
    }

    try {
        await runScrape({
            ...config,
            chromePath,
            onStatus: (status) => {
                event.reply('status-update', status);
            }
        });
        event.reply('status-update', { type: 'success', message: 'Capture finished!' });
    } catch (error) {
        console.error('Scrape error:', error);
        event.reply('status-update', { type: 'error', message: `Error: ${error.message}` });
    }
});

ipcMain.handle('select-browser', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Browsers', extensions: ['app', 'exe'] }
        ]
    });
    if (result.canceled) return null;
    
    let selectedPath = result.filePaths[0];
    // On Mac, if a .app is selected, we need to find the executable inside or just use the app path if playwright handles it
    // Actually, on Mac, .app is a directory. Playwright needs the binary inside.
    if (process.platform === 'darwin' && selectedPath.endsWith('.app')) {
        const appName = path.basename(selectedPath, '.app');
        const internalPath = path.join(selectedPath, 'Contents', 'MacOS', appName);
        if (fs.existsSync(internalPath)) {
            selectedPath = internalPath;
        } else {
            // Fallback: try to find any executable in MacOS folder
            const macosDir = path.join(selectedPath, 'Contents', 'MacOS');
            if (fs.existsSync(macosDir)) {
                const files = fs.readdirSync(macosDir);
                if (files.length > 0) {
                    selectedPath = path.join(macosDir, files[0]);
                }
            }
        }
    }
    return selectedPath;
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('check-license', async (event, key) => {
    return validateLicense(key);
});
