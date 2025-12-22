// background.js - Service Worker for FigmaSnap Extension
importScripts('libs/pdf-lib.min.js');

console.log('FigmaSnap Extension: Background worker active');

let captureConfig = null;
let currentTabId = null;
let isCapturing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_capture') {
        if (isCapturing) {
            sendResponse({ success: false, error: 'Capture already in progress' });
            return;
        }
        
        captureConfig = request.config;
        startCaptureLoop().catch(err => {
            console.error('Capture loop error:', err);
            sendStatusUpdate('error', `Error: ${err.message}`);
        });
        
        sendResponse({ success: true });
    }
});

async function startCaptureLoop() {
    isCapturing = true;
    const { url, maxSlides, waitMs, flowNodeIds, redacted } = captureConfig;
    
    // 1. Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('No active tab found');
    currentTabId = tab.id;

    sendStatusUpdate('info', 'Starting capture flow...');

    try {
        const PDFLibInstance = typeof PDFLib !== 'undefined' ? PDFLib : self.PDFLib;
        if (!PDFLibInstance) {
            throw new Error('PDFLib not loaded. Ensure libs/pdf-lib.min.js is correct.');
        }

        const { PDFDocument, rgb } = PDFLibInstance;
        const pdfDoc = await PDFDocument.create();

        for (let flowIndex = 0; flowIndex < flowNodeIds.length; flowIndex++) {
            const flowId = flowNodeIds[flowIndex];
            const flowPrefix = flowNodeIds.length > 1 ? `[Flow ${flowIndex + 1}/${flowNodeIds.length}] ` : '';

            if (flowId) {
                const flowUrl = new URL(url);
                flowUrl.searchParams.set('node-id', flowId);
                sendStatusUpdate('info', `${flowPrefix}Navigating to flow...`);
                await chrome.tabs.update(currentTabId, { url: flowUrl.toString() });
                // Wait for load with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        chrome.tabs.onUpdated.removeListener(listener);
                        reject(new Error('Navigation timeout'));
                    }, 30000);

                    const listener = (tabId, info) => {
                        if (tabId === currentTabId && info.status === 'complete') {
                            clearTimeout(timeout);
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                });
                await new Promise(r => setTimeout(r, 2000)); // Stability buffer
            }

            if (redacted) {
                await chrome.tabs.sendMessage(currentTabId, { action: 'apply_redaction' });
            }

            let slideCount = 0;
            let previousCapture = null;
            let consecutiveDuplicates = 0;

            while (slideCount < maxSlides) {
                slideCount++;
                sendStatusUpdate('progress', `${flowPrefix}Capturing slide ${slideCount}...`, slideCount, maxSlides);

                // Wait for stability via content script with timeout
                try {
                    await Promise.race([
                        chrome.tabs.sendMessage(currentTabId, { action: 'check_stability' }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Stability check timeout')), 5000))
                    ]);
                } catch (err) {
                    console.warn('Stability check failed:', err.message);
                }
                await new Promise(r => setTimeout(r, 500)); // Small buffer

                // Capture the visible tab
                const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
                
                // Check if it's the same as previous (end of flow)
                if (previousCapture && dataUrl === previousCapture) {
                    consecutiveDuplicates++;
                    console.log(`Duplicate detected (${consecutiveDuplicates}/3)`);
                    if (consecutiveDuplicates >= 3) {
                        console.log('Visual end detected');
                        break;
                    }
                } else {
                    consecutiveDuplicates = 0; // Reset counter on new content
                }
                
                // Always add to PDF (even duplicates, until we hit 3 in a row)
                const imageBytes = decodeBase64(dataUrl.split(',')[1]);
                const image = await pdfDoc.embedPng(imageBytes);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                
                previousCapture = dataUrl;

                // Next slide
                try {
                    await chrome.tabs.sendMessage(currentTabId, { action: 'next_slide' });
                } catch (err) {
                    console.warn('Failed to navigate to next slide:', err.message);
                }
                await new Promise(r => setTimeout(r, waitMs));
            }
        }

        sendStatusUpdate('info', 'Generating PDF...');
        const pdfBytes = await pdfDoc.save();
        const base64Pdf = encodeBase64(pdfBytes);
        const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

        chrome.downloads.download({
            url: dataUrl,
            filename: 'FigmaSnap_Capture.pdf',
            saveAs: true
        });

        sendStatusUpdate('success', 'Capture completed! PDF downloaded.');
    } catch (error) {
        console.error('Capture error:', error);
        sendStatusUpdate('error', `Capture failed: ${error.message}`);
        throw error; // Re-throw to be caught by outer handler
    } finally {
        isCapturing = false;
    }
}

function sendStatusUpdate(type, message, current = 0, total = 0) {
    chrome.runtime.sendMessage({
        action: 'status_update',
        status: { type, message, current, total }
    }).catch(() => {}); // Popup might be closed, ignore
}

// Helpers for binary data in service worker
function decodeBase64(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function encodeBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
