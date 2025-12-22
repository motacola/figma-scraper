// content.js - Injected into Figma pages
console.log('FigmaSnap Extension: Content script injected');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'discover_flows') {
        discoverFlows().then(flows => {
            sendResponse({ flows });
        });
        return true;
    } else if (request.action === 'apply_redaction') {
        applyRedaction();
        sendResponse({ success: true });
    } else if (request.action === 'next_slide') {
        // Figma requires both keydown and keyup events
        const keydownEvent = new KeyboardEvent('keydown', { 
            key: 'ArrowRight', 
            code: 'ArrowRight',
            keyCode: 39,
            which: 39,
            bubbles: true,
            cancelable: true
        });
        const keyupEvent = new KeyboardEvent('keyup', { 
            key: 'ArrowRight', 
            code: 'ArrowRight',
            keyCode: 39,
            which: 39,
            bubbles: true,
            cancelable: true
        });
        document.body.dispatchEvent(keydownEvent);
        setTimeout(() => document.body.dispatchEvent(keyupEvent), 50);
        sendResponse({ success: true });
    } else if (request.action === 'check_stability') {
        checkVisualStability().then(isStable => {
            sendResponse({ isStable });
        });
        return true; // Keep message channel open for async response
    }
});

async function discoverFlows() {
    try {
        // 1. Check if sidebar is visible
        let sidebar = document.querySelector('#prototype-sidebar-panel');
        if (!sidebar) {
            const flowsButton = Array.from(document.querySelectorAll('button')).find(b => {
                try {
                    return b.innerText && b.innerText.match(/flows/i);
                } catch (e) {
                    return false;
                }
            });
            if (flowsButton) {
                flowsButton.click();
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        const rows = Array.from(document.querySelectorAll('[class*="flowRow"]'));
        return rows.map(row => {
            try {
                const label = row.querySelector('label') || row;
                const nodeId = row.getAttribute('data-node-id');
                const name = label.innerText ? label.innerText.trim() : 'Unnamed Flow';
                return nodeId ? { name, nodeId } : null;
            } catch (e) {
                console.warn('Error parsing flow row:', e);
                return null;
            }
        }).filter(f => f !== null);
    } catch (error) {
        console.error('Error discovering flows:', error);
        return [];
    }
}

function applyRedaction() {
    // Find layers tagged with [mask] in accessibility DOM
    const targets = document.querySelectorAll('[aria-label*="[mask]"]');
    targets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const maskExists = target.dataset.figmasnapMasked === 'true';
        if (!maskExists && rect.width > 0 && rect.height > 0) { // Only mask visible elements
            const mask = document.createElement('div');
            mask.className = 'figmasnap-mask';
            mask.style.position = 'fixed'; // Use fixed for proper overlay
            mask.style.left = rect.left + 'px';
            mask.style.top = rect.top + 'px';
            mask.style.width = rect.width + 'px';
            mask.style.height = rect.height + 'px';
            mask.style.backgroundColor = 'black';
            mask.style.zIndex = '2147483647'; // Max z-index value
            mask.style.pointerEvents = 'none';
            document.body.appendChild(mask);
            target.dataset.figmasnapMasked = 'true';
        }
    });
}

// Visual stability detection in the browser environment
let lastFrameTime = 0;
let isStable = false;

async function checkVisualStability(timeout = 3000) {
    return new Promise(resolve => {
        let stableCount = 0;
        const start = Date.now();
        
        const check = () => {
            // Figma often has a progress bar or loading spinner
            const loader = document.querySelector('[class*="loading_indicator"], [class*="progress_bar"]');
            const isFigmaIdle = !loader;

            if (isFigmaIdle) {
                stableCount++;
            } else {
                stableCount = 0;
            }

            // If we've been "stable" for 5 frames or reached timeout
            if (stableCount >= 5 || (Date.now() - start > timeout)) {
                resolve(true);
            } else {
                requestAnimationFrame(check);
            }
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => requestAnimationFrame(check), { timeout });
        } else {
            requestAnimationFrame(check);
        }
    });
}
