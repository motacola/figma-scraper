const { ipcRenderer } = require('electron');

// Screens
const licenseScreen = document.getElementById('license-screen');
const mainScreen = document.getElementById('main-screen');

// Inputs
const licenseKeyInput = document.getElementById('license-key');
const figmaUrlInput = document.getElementById('figma-url');
const figmaPasswordInput = document.getElementById('figma-password');
const outputPathInput = document.getElementById('output-path');
const maxSlidesInput = document.getElementById('max-slides');
const waitMsInput = document.getElementById('wait-ms');

// Buttons
const validateLicenseBtn = document.getElementById('validate-license-btn');
const browseBtn = document.getElementById('browse-btn');
const browseBrowserBtn = document.getElementById('browse-browser-btn');
const startBtn = document.getElementById('start-btn');

// Status
const progressContainer = document.getElementById('progress-container');
const statusText = document.getElementById('status-text');
const progressFill = document.getElementById('progress-fill');
const licenseError = document.getElementById('license-error');

// --- Initialization ---
// Check if already licensed
const savedKey = localStorage.getItem('figmasnap_license');
if (savedKey) {
    ipcRenderer.invoke('check-license', savedKey).then(isValid => {
        if (isValid) {
            showMainScreen();
        } else {
            localStorage.removeItem('figmasnap_license');
        }
    });
}

// --- Event Handlers ---

validateLicenseBtn.onclick = async () => {
    licenseError.classList.add('hidden');
    const key = licenseKeyInput.value.trim();
    if (!key) return;

    validateLicenseBtn.disabled = true;
    const isValid = await ipcRenderer.invoke('check-license', key);
    validateLicenseBtn.disabled = false;

    if (isValid) {
        localStorage.setItem('figmasnap_license', key);
        showMainScreen();
    } else {
        licenseError.classList.remove('hidden');
    }
};

browseBtn.onclick = async () => {
    const path = await ipcRenderer.invoke('select-directory');
    if (path) {
        outputPathInput.value = path;
    }
};

browseBrowserBtn.onclick = async () => {
    const path = await ipcRenderer.invoke('select-browser');
    if (path) {
        document.getElementById('browser-path').value = path;
    }
};

startBtn.onclick = () => {
    const config = {
        url: figmaUrlInput.value.trim(),
        password: figmaPasswordInput.value,
        outputDir: outputPathInput.value,
        maxSlides: parseInt(maxSlidesInput.value) || 200,
        waitMs: parseInt(waitMsInput.value) || 5000,
        browserPath: document.getElementById('browser-path').value
    };

    if (!config.url || !config.outputDir) {
        alert('Please provide both a Figma URL and an output folder.');
        return;
    }

    const figmaRegex = /^https?:\/\/(www\.)?figma\.com\/(proto|file)\/[\w\-]+/;
    if (!figmaRegex.test(config.url)) {
        alert('Please enter a valid Figma URL (e.g., https://www.figma.com/proto/...)');
        return;
    }

    startBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statusText.innerText = 'Starting...';
    progressFill.style.width = '0%';

    ipcRenderer.send('start-capture', config);
};

// --- IPC Listeners ---

ipcRenderer.on('status-update', (event, status) => {
    console.log('Renderer: Status Update', status);
    
    if (status.type === 'progress') {
        const percent = (status.current / status.total) * 100;
        progressFill.style.width = `${percent}%`;
        statusText.innerText = status.message;
    } else if (status.type === 'error') {
        statusText.innerText = status.message;
        statusText.style.color = 'var(--error)';
        startBtn.disabled = false;
    } else if (status.type === 'success') {
        statusText.innerText = status.message;
        statusText.style.color = 'var(--success)';
        progressFill.style.width = '100%';
        startBtn.disabled = false;
    } else {
        statusText.innerText = status.message;
        statusText.style.color = 'var(--text)';
    }
});

// --- Helpers ---

function showMainScreen() {
    licenseScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
}
