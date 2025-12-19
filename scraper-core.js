const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

/**
 * Simple "Computer Vision" check to see if a screenshot is "blank" (solid color).
 * Analyzes the buffer to see if it's mostly a single repeating pixel value.
 */
function isBlank(buffer) {
    if (!buffer || buffer.length < 5000) return true;
    
    // Check points in the buffer (start, middle, end)
    const samples = [
        buffer[Math.floor(buffer.length * 0.25)],
        buffer[Math.floor(buffer.length * 0.5)],
        buffer[Math.floor(buffer.length * 0.75)],
        buffer[buffer.length - 1]
    ];
    
    // If all sample bytes are identical, it's very likely a solid color
    const isSolid = samples.every(s => s === samples[0]);
    return isSolid;
}

async function runScrape({ url, password, outputDir, maxSlides = 200, waitMs = 5000, chromePath, onStatus }) {
    if (!onStatus) onStatus = () => {};

    // Validate URL format
    const figmaRegex = /^https?:\/\/(www\.)?figma\.com\/(proto|file)\/[\w\-]+/;
    if (!url || !figmaRegex.test(url)) {
        onStatus({ type: 'error', message: `Invalid Figma URL format. Please use a valid Figma prototype URL.` });
        throw new Error('Invalid Figma URL format');
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
            deviceScaleFactor: 2,
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

        onStatus({ type: 'info', message: `Waiting for WebGL Canvas (Vision sensing)...` });
        const canvasSelector = 'canvas'; 
        try {
            await page.waitForSelector(canvasSelector, { state: 'visible', timeout: 60000 });
            let attempts = 0;
            while (attempts < 5) {
                const checkBuf = await page.screenshot();
                if (!isBlank(checkBuf)) break;
                onStatus({ type: 'info', message: `Content not yet visible. sensing... (${attempts+1}/5)` });
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

            const buffer = await page.screenshot({ fullPage: false });

            // Computer Vision: Duplicate Check
            if (previousBuffer && buffer.compare(previousBuffer) === 0) {
                consecutiveDuplicates++;
                if (consecutiveDuplicates >= 3) {
                    onStatus({ type: 'info', message: `End detected by visual stability.` });
                    break;
                }
            } else {
                const filename = `slide_${String(slideCount).padStart(3, '0')}.png`;
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
                } catch (embedError) {
                    onStatus({ type: 'warning', message: `Could not embed slide ${slideCount} into PDF. PNG saved.` });
                }

                slideCount++;
                consecutiveDuplicates = 0;
                previousBuffer = buffer;
            }

            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(1500);
            
            if (consecutiveDuplicates > 0) {
                await page.keyboard.press('Space');
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

module.exports = { runScrape };
