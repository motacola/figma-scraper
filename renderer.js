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
const exportPresetSelect = document.getElementById('export-preset');

// Buttons
const validateLicenseBtn = document.getElementById('validate-license-btn');
const browseBtn = document.getElementById('browse-btn');
const browseBrowserBtn = document.getElementById('browse-browser-btn');
const discoverBtn = document.getElementById('discover-btn');
const startBtn = document.getElementById('start-btn');
const flowsSection = document.getElementById('flows-section');
const flowsList = document.getElementById('flows-list');

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
            // Auto-detect browser path
            ipcRenderer.invoke('get-chrome-path').then(path => {
                if (path) {
                    document.getElementById('browser-path').value = path;
                } else {
                    document.getElementById('browser-path').placeholder = 'No browser found - click Browse';
                }
            });
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
        // Auto-detect browser path for new users
        ipcRenderer.invoke('get-chrome-path').then(path => {
            if (path) {
                document.getElementById('browser-path').value = path;
            }
        });
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

discoverBtn.onclick = async () => {
    const url = figmaUrlInput.value.trim();
    if (!url) {
        alert('Please enter a Figma URL first.');
        return;
    }

    discoverBtn.disabled = true;
    discoverBtn.innerText = 'Searching...';
    flowsSection.classList.add('hidden');
    flowsList.innerHTML = '';

    try {
        const flows = await ipcRenderer.invoke('discover-flows', {
            url,
            password: figmaPasswordInput.value,
            browserPath: document.getElementById('browser-path').value
        });

        if (flows && flows.length > 0) {
            flowsSection.classList.remove('hidden');
            flows.forEach(flow => {
                const item = document.createElement('div');
                item.className = 'flow-item';
                item.innerHTML = `
                    <input type="checkbox" id="flow-${flow.nodeId}" value="${flow.nodeId}" checked>
                    <label for="flow-${flow.nodeId}">${flow.name}</label>
                `;
                item.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        const cb = item.querySelector('input');
                        cb.checked = !cb.checked;
                    }
                };
                flowsList.appendChild(item);
            });
            statusText.innerText = `Found ${flows.length} flows.`;
        } else {
            alert('No flows found in this prototype. Proceeding with default capture.');
        }
    } catch (err) {
        alert(`Discovery error: ${err.message}`);
    } finally {
        discoverBtn.disabled = false;
        discoverBtn.innerText = 'Discover Flows';
    }
};

startBtn.onclick = () => {
    const selectedFlows = Array.from(flowsList.querySelectorAll('input:checked')).map(cb => cb.value);
    
    const config = {
        url: figmaUrlInput.value.trim(),
        password: figmaPasswordInput.value,
        outputDir: outputPathInput.value,
        maxSlides: parseInt(maxSlidesInput.value) || 200,
        waitMs: parseInt(waitMsInput.value) || 5000,
        browserPath: document.getElementById('browser-path').value,
        flowNodeIds: selectedFlows.length > 0 ? selectedFlows : [null],
        preset: exportPresetSelect.value
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
