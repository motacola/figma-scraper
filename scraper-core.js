const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const FlowManager = require('./flow-manager');
const ExportManager = require('./export-manager');
const logger = require('./logger');

/**
 * Simple "Computer Vision" check to see if a screenshot is "blank" (solid color).
 * Analyzes the buffer to see if it's mostly a single repeating pixel value.
 */
/**
 * Pixel-sensing to detect blank screens
 */
function isBlank(buffer) {
    if (!buffer || buffer.length < 5000) return true;

    // Check multiple points across the buffer (20 samples)
    const samples = [];
    for (let i = 1; i <= 20; i++) {
        samples.push(buffer[Math.floor(buffer.length * (i / 21))]);
    }

    // If all sample bytes are identical, it's very likely a solid color
    const isSolid = samples.every(s => s === samples[0]);
    return isSolid;
}

/**
 * Monitors the page until the visual content has "settled" (no changes for a period).
 * This ensures animations like Smart Animate have finished before capture.
 */
async function waitForVisualStability(page, { minWaitMs = 500, maxWaitMs = 5000, stabilityChecks = 3 } = {}) {
    let previousBuffer = null;
    let stableCount = 0;
    const start = Date.now();

    // Always wait the minimum time first
    if (minWaitMs > 0) await page.waitForTimeout(minWaitMs);

    while (Date.now() - start < maxWaitMs) {
        const currentBuffer = await page.screenshot({ fullPage: false });

        if (previousBuffer && currentBuffer.equals(previousBuffer)) {
            stableCount++;
            if (stableCount >= stabilityChecks) {
                return currentBuffer; // Return the stable buffer to save a screenshot call later
            }
        } else {
            stableCount = 0;
        }

        previousBuffer = currentBuffer;
        await page.waitForTimeout(200); // Sample every 200ms
    }

    // Timeout reached, return whatever the last screenshot was
    return previousBuffer || await page.screenshot({ fullPage: false });
}

/**
 * Extracts the current frame name and ID from the page state.
 */
async function getFrameInfo(page) {
    try {
        const title = await page.title();
        // Figma titles usually look like "Frame Name – File Name"
        const parts = title.split(' – ');
        const frameName = parts.length > 1 ? parts[0].trim() : 'Unknown Frame';

        // Sanitize for filename usage
        const safeName = frameName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        return { name: frameName, safeName };
    } catch (e) {
        return { name: 'Slide', safeName: 'Slide' };
    }
}

async function discoverFlows({ url, password, chromePath, onStatus }) {
    if (!onStatus) onStatus = () => { };
    onStatus({ type: 'info', message: 'Discovering flows...' });

    let browser = null;
    try {
        browser = await chromium.launch({
            headless: true, // Discovery can be headless
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // Append hide-ui=0 to ensure flows are in DOM
        const discoveryUrl = url.includes('?') ? `${url}&hide-ui=0` : `${url}?hide-ui=0`;
        await page.goto(discoveryUrl, { waitUntil: 'load', timeout: 60000 });

        // Handle password if present
        try {
            const passwordInputSelector = 'input[type="password"]';
            const present = await page.waitForSelector(passwordInputSelector, { timeout: 5000 }).catch(() => null);
            if (present && password) {
                await page.fill(passwordInputSelector, password);
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle').catch(() => null);
            }
        } catch (e) { }

        // Wait for flows to appear in the sidebar
        const sidebarSelector = '#prototype-sidebar-panel';
        try {
            await page.waitForSelector(sidebarSelector, { timeout: 15000 });
        } catch (e) {
            // Check if we need to click "Flows" button first (sometimes sidebar is collapsed)
            const flowsButton = await page.getByRole('button', { name: /flows/i }).first().catch(() => null);
            if (flowsButton) {
                await flowsButton.click();
                await page.waitForSelector(sidebarSelector, { timeout: 10000 });
            }
        }

        const flows = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('[class*="flowRow"]'));
            return rows.map(row => {
                const label = row.querySelector('label') || row;
                return {
                    name: label.innerText.trim(),
                    nodeId: row.getAttribute('data-node-id')
                };
            }).filter(f => f.nodeId);
        });

        return flows;
    } finally {
        if (browser) await browser.close();
    }
}

async function addCoverPage(pdfDoc, title, flowName) {

    /**
     * Run a guided flow capture with predefined navigation steps
     */
    async function runGuidedFlow({ url, password, outputDir, chromePath, onStatus, flowConfig, preset = 'stakeholder' }) {
        if (!onStatus) onStatus = () => { };

        const flowManager = new FlowManager();
        const scaleFactor = preset === 'clean' ? 1 : 2;
        const isStakeholder = preset === 'stakeholder';

        // Validate URL format
        const figmaRegex = /^https?:\/\/(www\.)?figma\.com\/(proto|file|design)\/[\w\-]+/;
        if (!url || !figmaRegex.test(url)) {
            onStatus({ type: 'error', message: `Invalid Figma URL format. Please use a valid Figma prototype URL.` });
            throw new Error('Invalid Figma URL format');
        }

        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
        } catch (mkdirError) {
            onStatus({ type: 'error', message: `Failed to create output directory: ${mkdirError.message}` });
            throw mkdirError;
        }

        const pdfDoc = await PDFDocument.create();

        let browser = null;
        try {
            browser = await chromium.launch({
                headless: false,
                executablePath: chromePath,
                ignoreDefaultArgs: ['--enable-automation'],
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--start-maximized',
                    '--disable-infobars',
                    '--disable-blink-features=AutomationControlled'
                ]
            });

            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                deviceScaleFactor: scaleFactor,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            });
            const page = await context.newPage();

            onStatus({ type: 'info', message: `Navigating to: ${url}` });
            await page.goto(url, { waitUntil: 'load', timeout: 0 });
            await page.waitForLoadState('networkidle').catch(() => null);

            // Auth Logic
            onStatus({ type: 'info', message: `Checking for security prompts...` });
            try {
                const passwordInputSelector = 'input[type="password"]';
                const present = await page.waitForSelector(passwordInputSelector, { timeout: 8000 }).catch(() => null);
                if (present && password) {
                    onStatus({ type: 'info', message: `Entering password...` });
                    await page.fill(passwordInputSelector, password);
                    await page.keyboard.press('Enter');
                    await page.waitForLoadState('networkidle').catch(() => null);
                    await page.waitForTimeout(5000);
                }
            } catch (authError) {
                console.error('Auth error:', authError);
            }

            onStatus({ type: 'info', message: `Waiting for WebGL Canvas...` });
            const canvasSelector = 'canvas';
            try {
                await page.waitForSelector(canvasSelector, { state: 'visible', timeout: 60000 });
                let attempts = 0;
                while (attempts < 5) {
                    const checkBuf = await page.screenshot();
                    if (!isBlank(checkBuf)) break;
                    onStatus({ type: 'info', message: `Content not yet visible... (${attempts + 1}/5)` });
                    await page.waitForTimeout(3000);
                    attempts++;
                }
                await page.waitForTimeout(5000);
            } catch (canvasError) {
                onStatus({ type: 'warning', message: `Vision sensor timed out. Proceeding...` });
            }

            // Focus & Prepare
            await page.bringToFront();
            await page.mouse.click(640, 400);

            // Execute the guided flow
            await flowManager.executeGuidedFlow(flowConfig, page, onStatus);

            // Capture the final state
            let previousBuffer = null;
            let consecutiveDuplicates = 0;
            let slideCount = 1;

            // Capture the result of the guided flow
            const finalBuffer = await waitForVisualStability(page, {
                minWaitMs: 2000,
                maxWaitMs: 5000,
                stabilityChecks: 3
            });

            const frameInfo = await getFrameInfo(page);

            // Save the final capture
            let filename = `guided_flow_final_${frameInfo.safeName}.png`;
            try {
                fs.writeFileSync(path.join(outputDir, filename), finalBuffer);
            } catch (writeError) {
                onStatus({ type: 'error', message: `Failed to save final capture: ${writeError.message}` });
                throw writeError;
            }

            // Add to PDF
            try {
                const image = await pdfDoc.embedPng(finalBuffer);
                const pdfPage = pdfDoc.addPage([image.width, image.height]);
                pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

                if (isStakeholder) {
                    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                    pdfPage.drawText(`Guided Flow: ${flowConfig.name || 'Unnamed Flow'}`, {
                        x: 20,
                        y: 20,
                        size: 10,
                        font: font,
                        color: rgb(0.5, 0.5, 0.5)
                    });
                }
            } catch (embedError) {
                onStatus({ type: 'warning', message: `Could not embed final capture into PDF: ${embedError.message}` });
            }

            // Generate final PDF
            let prototypeName = 'Guided_Flow_Capture';
            try {
                const title = await page.title();
                prototypeName = title.split(' – ')[0].split(' - ')[0].replace(/[<>:"/\\|?*]/g, '_').trim() || 'Guided_Flow_Capture';
            } catch (titleError) {
                console.error('Title parsing error:', titleError);
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const safeName = prototypeName.substring(0, 50);
            const pdfName = `${safeName}_guided_flow_${timestamp}.pdf`;

            if (slideCount > 0) {
                if (isStakeholder) {
                    onStatus({ type: 'info', message: `Adding Professional Cover Page...` });
                    await addCoverPage(pdfDoc, prototypeName, flowConfig.name || 'Guided Flow');
                }

                onStatus({ type: 'info', message: `Finalizing PDF Document...` });
                const pdfBytes = await pdfDoc.save();
                try {
                    fs.writeFileSync(path.join(outputDir, pdfName), pdfBytes);
                } catch (writeError) {
                    onStatus({ type: 'error', message: `Failed to save PDF: ${writeError.message}` });
                    throw writeError;
                }
                onStatus({ type: 'success', message: `Guided flow capture completed! Saved ${slideCount} slides.` });
            } else {
                onStatus({ type: 'error', message: `No captures were made during guided flow.` });
            }

        } catch (mainError) {
            onStatus({ type: 'error', message: `Guided flow error: ${mainError.message}` });
            throw mainError;
        } finally {
            if (browser) {
                await browser.close().catch(() => null);
            }
        }
    }

    const page = pdfDoc.insertPage(0, [600, 400]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const subFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Background
    page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.09, 0.63, 0.98), // Figma Blueish
    });

    // Title
    page.drawText('FigmaSnap Capture', {
        x: 50,
        y: height - 100,
        size: 30,
        font,
        color: rgb(1, 1, 1),
    });

    // File Name
    page.drawText(`File: ${title}`, {
        x: 50,
        y: height - 150,
        size: 18,
        font: subFont,
        color: rgb(1, 1, 1),
    });

    if (flowName) {
        page.drawText(`Flow: ${flowName}`, {
            x: 50,
            y: height - 180,
            size: 18,
            font: subFont,
            color: rgb(1, 1, 1),
        });
    }

    // Date
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: 80,
        size: 12,
        font: subFont,
        color: rgb(1, 1, 1),
    });
}

async function runScrape({ url, password, outputDir, maxSlides = 200, waitMs = 5000, chromePath, onStatus, flowNodeId, preset = 'stakeholder', redacted = false }) {
    if (!onStatus) onStatus = () => { };

    // Preset Config
    const scaleFactor = preset === 'clean' ? 1 : 2;
    const isStakeholder = preset === 'stakeholder';
    const isDev = preset === 'dev';

    // Validate URL format
    const figmaRegex = /^https?:\/\/(www\.)?figma\.com\/(proto|file|design)\/[\w\-]+/;
    if (!url || !figmaRegex.test(url)) {
        onStatus({ type: 'error', message: `Invalid Figma URL format. Please use a valid Figma prototype URL.` });
        throw new Error('Invalid Figma URL format');
    }

    // If a specific flow is targetted, update the URL
    let targetUrl = url;
    if (flowNodeId) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        // Remove existing starting-point-node-id if any
        targetUrl = targetUrl.replace(/([?&])starting-point-node-id=[^&]+/, '');
        targetUrl += `${separator}starting-point-node-id=${encodeURIComponent(flowNodeId)}`;
    }

    onStatus({ type: 'info', message: `Initializing capture...` });

    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    } catch (mkdirError) {
        onStatus({ type: 'error', message: `Failed to create output directory: ${mkdirError.message}` });
        throw mkdirError;
    }

    const exportManager = new ExportManager();
    const pdfDoc = await PDFDocument.create();

    let browser = null;
    try {
        browser = await chromium.launch({
            headless: false,
            executablePath: chromePath,
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized',
                '--disable-infobars',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            deviceScaleFactor: scaleFactor,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        onStatus({ type: 'info', message: `Navigating to: ${targetUrl}` });
        await page.goto(targetUrl, { waitUntil: 'load', timeout: 0 });
        await page.waitForLoadState('networkidle').catch(() => null);

        // Privacy & Redaction Start
        if (redacted) {
            onStatus({ type: 'info', message: 'Enabling Redaction Mode (Accessibility)...' });
            // Figma's keyboard trigger for accessibility: Tab once or similar
            // But the most robust way is to inject the 'Skip to content' focus
            await page.keyboard.press('Tab');
            await page.waitForTimeout(1000);

            // Wait for skip link or common UI to be focused
            const skipLink = await page.$('button:has-text("Skip to content"), [role="link"]:has-text("Skip to content")').catch(() => null);
            if (skipLink) {
                await page.keyboard.press('Enter');
            } else {
                // Fallback for different Figma UI versions
                await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(2000);
        }

        // Auth Logic
        onStatus({ type: 'info', message: `Checking for security prompts...` });
        try {
            const passwordInputSelector = 'input[type="password"]';
            const present = await page.waitForSelector(passwordInputSelector, { timeout: 8000 }).catch(() => null);
            if (present && password) {
                onStatus({ type: 'info', message: `Entering password...` });
                await page.fill(passwordInputSelector, password);
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle').catch(() => null);
                await page.waitForTimeout(5000);
            }
        } catch (authError) {
            console.error('Auth error:', authError);
        }

        onStatus({ type: 'info', message: `Waiting for WebGL Canvas (Vision sensing)...` });
        const canvasSelector = 'canvas';
        try {
            await page.waitForSelector(canvasSelector, { state: 'visible', timeout: 60000 });
            let attempts = 0;
            while (attempts < 5) {
                const checkBuf = await page.screenshot();
                if (!isBlank(checkBuf)) break;
                onStatus({ type: 'info', message: `Content not yet visible. sensing... (${attempts + 1}/5)` });
                await page.waitForTimeout(3000);
                attempts++;
            }
            await page.waitForTimeout(5000);
        } catch (canvasError) {
            onStatus({ type: 'warning', message: `Vision sensor timed out. Proceeding...` });
        }

        // Focus & Prepare
        await page.bringToFront();
        await page.mouse.click(640, 400);

        // Add Redaction Script
        if (redacted) {
            await page.evaluate(() => {
                window._figmaSnapRedactor = () => {
                    // Remove old masks
                    document.querySelectorAll('.figmasnap-mask').forEach(m => m.remove());
                    // Find new targets
                    const targets = document.querySelectorAll('[aria-label*="[mask]"]');
                    targets.forEach(target => {
                        const rect = target.getBoundingClientRect();
                        const mask = document.createElement('div');
                        mask.className = 'figmasnap-mask';
                        mask.style.position = 'absolute';
                        mask.style.left = rect.left + 'px';
                        mask.style.top = rect.top + 'px';
                        mask.style.width = rect.width + 'px';
                        mask.style.height = rect.height + 'px';
                        mask.style.backgroundColor = 'black';
                        mask.style.zIndex = '999999';
                        mask.style.pointerEvents = 'none';
                        document.body.appendChild(mask);
                    });
                };
            });
        }

        let previousBuffer = null;
        let consecutiveDuplicates = 0;
        let slideCount = 1;

        for (let i = 1; i <= maxSlides; i++) {
            onStatus({
                type: 'progress',
                current: i,
                total: maxSlides,
                message: `Capturing slide ${i}...`
            });

            if (redacted) {
                await page.evaluate(() => window._figmaSnapRedactor());
                await page.waitForTimeout(500);
            }

            // Enhanced Timing: Wait for animation to settle
            const buffer = await waitForVisualStability(page, {
                minWaitMs: i === 1 ? 5000 : 500, // Longer wait on first slide
                maxWaitMs: waitMs > 5000 ? waitMs : 5000,
                stabilityChecks: 3
            });

            const frameInfo = await getFrameInfo(page);

            // Computer Vision: Duplicate Check
            if (previousBuffer && buffer.equals(previousBuffer)) {
                consecutiveDuplicates++;
                if (consecutiveDuplicates >= 3) {
                    onStatus({ type: 'info', message: `End detected by visual stability.` });
                    break;
                }
            } else {
                let filename = `slide_${String(slideCount).padStart(3, '0')}.png`;
                if (isDev) {
                    filename = `figmasnap_${frameInfo.safeName}_${String(slideCount).padStart(3, '0')}.png`;
                }

                try {
                    fs.writeFileSync(path.join(outputDir, filename), buffer);
                } catch (writeError) {
                    onStatus({ type: 'error', message: `Failed to save slide ${slideCount}: ${writeError.message}` });
                    throw writeError;
                }

                try {
                    const image = await pdfDoc.embedPng(buffer);
                    const pdfPage = pdfDoc.addPage([image.width, image.height]);
                    pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

                    // Add frame name using export manager
                    if (isStakeholder) {
                        await exportManager.addFrameName(pdfDoc, pdfPage, frameInfo.name, exportManager.getPreset(preset));
                    }
                } catch (embedError) {
                    onStatus({ type: 'warning', message: `Could not embed slide ${slideCount} into PDF: ${embedError.message}` });
                }

                slideCount++;
                consecutiveDuplicates = 0;
                previousBuffer = buffer;
            }

            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(1500);

            if (consecutiveDuplicates > 0) {
                onStatus({ type: 'info', message: `Stability detected. Pushing presentation...` });
                await page.keyboard.press('Space');
                await page.waitForTimeout(2000);
                await page.keyboard.press('ArrowRight');
                await page.waitForTimeout(1000);
            }
            await page.waitForTimeout(waitMs);
        }

        // Generate final PDF
        let prototypeName = 'FigmaSnap_Capture';
        try {
            const title = await page.title();
            prototypeName = title.split(' – ')[0].split(' - ')[0].replace(/[<>:"/\\|?*]/g, '_').trim() || 'FigmaSnap_Capture';
        } catch (titleError) {
            console.error('Title parsing error:', titleError);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeName = prototypeName.substring(0, 50);
        const pdfName = `${safeName}_${timestamp}.pdf`;

        if (slideCount > 1) {
            if (isStakeholder) {
                onStatus({ type: 'info', message: `Adding Professional Cover Page...` });
                await addCoverPage(pdfDoc, prototypeName, flowNodeId ? 'Targeted Flow' : 'Full Prototype');
            }

            onStatus({ type: 'info', message: `Finalizing PDF Document...` });
            const pdfBytes = await pdfDoc.save();
            try {
                fs.writeFileSync(path.join(outputDir, pdfName), pdfBytes);
            } catch (writeError) {
                onStatus({ type: 'error', message: `Failed to save PDF: ${writeError.message}` });
                throw writeError;
            }
            onStatus({ type: 'success', message: `Success! Compiled ${slideCount - 1} slides.` });
        } else {
            onStatus({ type: 'error', message: `No slides were captured. Please check URL.` });
        }

    } catch (mainError) {
        onStatus({ type: 'error', message: `Scraper error: ${mainError.message}` });
        throw mainError;
    } finally {
        if (browser) {
            await browser.close().catch(() => null);
        }
    }
}

module.exports = { runScrape, discoverFlows, runGuidedFlow, FlowManager, ExportManager, logger };
