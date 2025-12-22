// Popup logic for FigmaSnap Extension
const licenseScreen = document.getElementById('license-screen');
const mainScreen = document.getElementById('main-screen');
const licenseKeyInput = document.getElementById('license-key');
const figmaUrlInput = document.getElementById('figma-url');
const validateLicenseBtn = document.getElementById('validate-license-btn');
const discoverBtn = document.getElementById('discover-btn');
const startBtn = document.getElementById('start-btn');
const flowsSection = document.getElementById('flows-section');
const flowsList = document.getElementById('flows-list');
const statusText = document.getElementById('status-text');
const progressFill = document.getElementById('progress-fill');
const progressContainer = document.getElementById('progress-container');
const licenseError = document.getElementById('license-error');

// --- Initialization ---

// Check license status using chrome.storage
chrome.storage.local.get(['figmasnap_license'], (result) => {
    if (result.figmasnap_license) {
        if (checkLicenseLocally(result.figmasnap_license)) {
            showMainScreen();
            initializeMainScreen();
        } else {
            chrome.storage.local.remove('figmasnap_license');
        }
    }
});

function checkLicenseLocally(key) {
    // Ported from license-validator.js: Any key starting with 'FSNAP-' is valid for dev
    return key && key.startsWith('FSNAP-');
}

async function initializeMainScreen() {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('figma.com')) {
        figmaUrlInput.value = tab.url;
    }
}

function showMainScreen() {
    licenseScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
}

// --- Event Handlers ---

validateLicenseBtn.onclick = () => {
    const key = licenseKeyInput.value.trim();
    if (checkLicenseLocally(key)) {
        chrome.storage.local.set({ figmasnap_license: key }, () => {
            showMainScreen();
            initializeMainScreen();
        });
    } else {
        licenseError.classList.remove('hidden');
    }
};

discoverBtn.onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        statusText.innerText = 'No active tab found';
        return;
    }

    if (!tab.url || !tab.url.includes('figma.com')) {
        statusText.innerText = 'Please navigate to a Figma prototype first';
        return;
    }

    discoverBtn.disabled = true;
    discoverBtn.innerText = 'Searching...';
    
    chrome.tabs.sendMessage(tab.id, { action: 'discover_flows' }, (response) => {
        discoverBtn.disabled = false;
        discoverBtn.innerText = 'Discover';

        if (chrome.runtime.lastError) {
            statusText.innerText = 'Error: ' + chrome.runtime.lastError.message;
            return;
        }

        if (response && response.flows && response.flows.length > 0) {
            flowsSection.classList.remove('hidden');
            flowsList.innerHTML = '';
            response.flows.forEach(flow => {
                const item = document.createElement('div');
                item.className = 'flow-item';
                
                // Create elements safely to prevent XSS
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `flow-${flow.nodeId}`;
                checkbox.value = flow.nodeId;
                checkbox.checked = true;
                
                const label = document.createElement('label');
                label.htmlFor = `flow-${flow.nodeId}`;
                label.textContent = flow.name; // Use textContent to prevent XSS
                
                item.appendChild(checkbox);
                item.appendChild(label);
                flowsList.appendChild(item);
            });
            statusText.innerText = `Found ${response.flows.length} flow(s)`;
        } else {
            statusText.innerText = 'No flows found. Capture will use current view.';
        }
    });
};

startBtn.onclick = () => {
    const selectedFlows = Array.from(flowsList.querySelectorAll('input:checked')).map(cb => cb.value);
    
    const url = figmaUrlInput.value.trim();
    if (!url) {
        statusText.innerText = 'Please enter a Figma URL';
        return;
    }

    if (!url.includes('figma.com')) {
        statusText.innerText = 'Invalid Figma URL';
        return;
    }

    const maxSlides = parseInt(document.getElementById('max-slides').value);
    const waitMs = parseInt(document.getElementById('wait-ms').value);

    if (isNaN(maxSlides) || maxSlides <= 0) {
        statusText.innerText = 'Invalid max slides value';
        return;
    }

    if (maxSlides > 1000) {
        statusText.innerText = 'Max slides cannot exceed 1000';
        return;
    }

    if (isNaN(waitMs) || waitMs < 500) {
        statusText.innerText = 'Wait time must be at least 500ms';
        return;
    }

    if (waitMs > 60000) {
        statusText.innerText = 'Wait time cannot exceed 60 seconds';
        return;
    }
    
    const config = {
        url,
        maxSlides,
        waitMs,
        flowNodeIds: selectedFlows.length > 0 ? selectedFlows : [null],
        preset: document.getElementById('export-preset').value,
        redacted: document.getElementById('redaction-mode').checked
    };

    startBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statusText.innerText = 'Initializing capture...';
    statusText.style.color = '';
    
    // Send to background script
    chrome.runtime.sendMessage({ action: 'start_capture', config }, (response) => {
        if (chrome.runtime.lastError) {
            statusText.innerText = 'Error: ' + chrome.runtime.lastError.message;
            statusText.style.color = 'var(--error)';
            startBtn.disabled = false;
            return;
        }

        if (!response || !response.success) {
            statusText.innerText = response?.error || 'Error starting capture';
            statusText.style.color = 'var(--error)';
            startBtn.disabled = false;
        }
    });
};

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'status_update') {
        const { status } = message;
        if (status.type === 'progress') {
            const percent = (status.current / status.total) * 100;
            progressFill.style.width = `${percent}%`;
        }
        statusText.innerText = status.message;
        
        if (status.type === 'success' || status.type === 'error') {
            startBtn.disabled = false;
        }
    }
});
