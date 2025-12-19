const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { findChrome } = require('./chrome-finder');
const { validateLicense } = require('./license');
const { runScrape, discoverFlows, runGuidedFlow } = require('./scraper-core');

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
        const isUnsupported = lowerPath.includes('safari.app') ||
            lowerPath.includes('/safari') ||
            lowerPath.includes('com.apple.safari') ||
            lowerPath.includes('firefox.app') ||
            lowerPath.includes('/firefox') ||
            lowerPath.includes('safari.exe') ||
            lowerPath.includes('firefox.exe');

        if (isUnsupported) {
            const browserName = lowerPath.includes('safari') ? 'Safari' : 'Firefox';
            event.reply('status-update', {
                type: 'error',
                message: `${browserName} is not supported (Playwright Chromium only). Please use Chrome, Edge, Brave, or Arc.`
            });
            return;
        }
    }

    if (!chromePath) {
        event.reply('status-update', { type: 'error', message: 'Browser not found. Please install Chrome or select a browser path.' });
        return;
    }

    try {
        const flowNodeIds = config.flowNodeIds || [null]; // Default to one run with current URL

        for (let i = 0; i < flowNodeIds.length; i++) {
            const flowId = flowNodeIds[i];
            const totalFlows = flowNodeIds.length;
            const flowMsg = totalFlows > 1 ? ` (Flow ${i + 1}/${totalFlows})` : '';

            event.reply('status-update', { type: 'info', message: `Processing flow${flowMsg}...` });

            await runScrape({
                ...config,
                flowNodeId: flowId,
                chromePath,
                onStatus: (status) => {
                    // Prepend flow info if multiple
                    if (totalFlows > 1 && status.type === 'progress') {
                        status.message = `[Flow ${i + 1}/${totalFlows}] ${status.message}`;
                    }
                    event.reply('status-update', status);
                }
            });
        }

        event.reply('status-update', { type: 'success', message: 'All captures finished!' });
    } catch (error) {
        console.error('Scrape error:', error);
        event.reply('status-update', { type: 'error', message: `Error: ${error.message}` });
    }
});

ipcMain.handle('discover-flows', async (event, config) => {
    let chromePath = config.browserPath || findChrome();
    if (!chromePath) throw new Error('Browser not found');

    return await discoverFlows({
        url: config.url,
        password: config.password,
        chromePath,
        onStatus: (status) => {
            event.sender.send('status-update', status);
        }
    });
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

ipcMain.handle('get-chrome-path', async () => {
    return findChrome();
});

// Guided Flow IPC Handlers
ipcMain.handle('start-guided-flow', async (event, config) => {
    console.log('Main: Starting guided flow with config:', config);

    let chromePath = config.browserPath || findChrome();

    if (chromePath) {
        const lowerPath = chromePath.toLowerCase();
        const isUnsupported = lowerPath.includes('safari.app') ||
            lowerPath.includes('/safari') ||
            lowerPath.includes('com.apple.safari') ||
            lowerPath.includes('firefox.app') ||
            lowerPath.includes('/firefox') ||
            lowerPath.includes('safari.exe') ||
            lowerPath.includes('firefox.exe');

        if (isUnsupported) {
            const browserName = lowerPath.includes('safari') ? 'Safari' : 'Firefox';
            event.reply('status-update', {
                type: 'error',
                message: `${browserName} is not supported (Playwright Chromium only). Please use Chrome, Edge, Brave, or Arc.`
            });
            return;
        }
    }

    if (!chromePath) {
        event.reply('status-update', { type: 'error', message: 'Browser not found. Please install Chrome or select a browser path.' });
        return;
    }

    try {
        await runGuidedFlow({
            ...config,
            chromePath,
            onStatus: (status) => {
                event.reply('status-update', status);
            }
        });

        event.reply('status-update', { type: 'success', message: 'Guided flow completed successfully!' });
    } catch (error) {
        console.error('Guided flow error:', error);
        event.reply('status-update', { type: 'error', message: `Guided flow error: ${error.message}` });
    }
});

ipcMain.handle('save-flow', async (event, { flowName, flowConfig }) => {
    try {
        const FlowManager = require('./flow-manager');
        const flowManager = new FlowManager();
        const filePath = flowManager.saveFlow(flowName, flowConfig);
        return { success: true, filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-flow', async (event, flowName) => {
    try {
        const FlowManager = require('./flow-manager');
        const flowManager = new FlowManager();
        const flowConfig = flowManager.loadFlow(flowName);
        return { success: true, flowConfig };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-flows', async () => {
    try {
        const FlowManager = require('./flow-manager');
        const flowManager = new FlowManager();
        const flows = flowManager.listFlows();
        return { success: true, flows };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-flow', async (event, flowName) => {
    try {
        const FlowManager = require('./flow-manager');
        const flowManager = new FlowManager();
        const deleted = flowManager.deleteFlow(flowName);
        return { success: deleted };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
