const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const chalk = require('chalk');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { findChrome } = require('./chrome-finder');
require('dotenv').config();

const argv = yargs(hideBin(process.argv))
    .option('url', { type: 'string', description: 'Figma URL' })
    .option('output', { type: 'string', description: 'Output directory' })
    .option('password', { type: 'string', description: 'Figma password' })
    .option('max-slides', { type: 'number', default: 200, description: 'Max slides to capture' })
    .option('wait', { type: 'number', default: 5000, description: 'Wait time per slide (ms)' })
    .argv;

const FIGMA_URL = argv.url || process.env.FIGMA_URL;
const PASSWORD = argv.password || process.env.FIGMA_PASSWORD;
const DOWNLOADS_DIR = path.resolve(argv.output || process.env.OUTPUT_DIR || 'downloads');
const MAX_SLIDES = argv['max-slides'];
const WAIT_TIME = argv.wait;

/**
 * Pixel-sensing to detect blank screens
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

async function run() {
    if (!FIGMA_URL) {
        console.error(chalk.red('Error: FIGMA_URL is not defined.'));
        process.exit(1);
    }

    const figmaRegex = /^https?:\/\/(www\.)?figma\.com\/(proto|file)\/[\w\-]+/;
    if (!figmaRegex.test(FIGMA_URL)) {
        console.error(chalk.red('Error: Invalid Figma URL format.'));
        process.exit(1);
    }

    console.log(chalk.blue(`🚀 [FigmaSnap CLI] Hardened Playwright Engine Starting...`));
    try {
        if (!fs.existsSync(DOWNLOADS_DIR)) {
            fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
        }
    } catch (mkdirError) {
        console.error(chalk.red(`Failed to create output directory: ${mkdirError.message}`));
        process.exit(1);
    }

    const pdfDoc = await PDFDocument.create();
    const chromePath = findChrome();

    const browser = await chromium.launch({
        headless: false,
        executablePath: chromePath || undefined,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--no-sandbox',
            '--start-maximized',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log(chalk.cyan(`🌐 Navigating: ${FIGMA_URL}`));
        await page.goto(FIGMA_URL, { waitUntil: 'load', timeout: 0 });
        await page.waitForLoadState('networkidle').catch(() => null);

        // Password detection
        try {
            const passwordInput = 'input[type="password"]';
            const present = await page.waitForSelector(passwordInput, { timeout: 8000 }).catch(() => null);
            if (present && PASSWORD) {
                console.log(chalk.yellow('🔑 Entering password...'));
                await page.fill(passwordInput, PASSWORD);
                await page.keyboard.press('Enter');
                await page.waitForLoadState('networkidle').catch(() => null);
                await page.waitForTimeout(5000);
            }
        } catch (e) {
            console.error('Password handling error:', e);
        }

        console.log(chalk.yellow('📸 Vision sensing WebGL content...'));
        try {
            await page.waitForSelector('canvas', { state: 'visible', timeout: 60000 });
            let senseCount = 0;
            while (senseCount < 5) {
                const check = await page.screenshot();
                if (!isBlank(check)) break;
                console.log(chalk.gray(`   Waiting for visual pixels... (${senseCount + 1}/5)`));
                await page.waitForTimeout(3000);
                senseCount++;
            }
            await page.waitForTimeout(5000);
        } catch (e) {
            console.log(chalk.magenta('⚠️ Vision sensing timed out. Capturing anyway...'));
            await page.waitForTimeout(5000);
        }

        await page.bringToFront();
        await page.mouse.click(640, 400);

        let previousBuffer = null;
        let consecutiveDuplicates = 0;
        let slideCount = 1;

        for (let i = 1; i <= MAX_SLIDES; i++) {
            console.log(chalk.green(`   Processing slide ${i}...`));
            const buffer = await page.screenshot({ fullPage: false });

            if (previousBuffer && buffer.compare(previousBuffer) === 0) {
                consecutiveDuplicates++;
                if (consecutiveDuplicates >= 3) {
                    console.log(chalk.blue('   🏁 Visual end detected.'));
                    break;
                }
            } else {
                // Bugfix: Support 100+ slides
                const filename = `Slide_${String(slideCount).padStart(3, '0')}.png`;
                try {
                    fs.writeFileSync(path.join(DOWNLOADS_DIR, filename), buffer);
                } catch (writeError) {
                    console.error(chalk.red(`Failed to save slide ${slideCount}: ${writeError.message}`));
                    throw writeError;
                }

                try {
                    const image = await pdfDoc.embedPng(buffer);
                    const pdfPage = pdfDoc.addPage([image.width, image.height]);
                    pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
                    slideCount++;
                } catch (e) {
                    console.log(chalk.red(`   ⚠️ Failed to embed slide ${i} into PDF.`));
                }

                consecutiveDuplicates = 0;
                previousBuffer = buffer;
            }

            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(1500);
            
            if (consecutiveDuplicates > 0) {
                await page.keyboard.press('Space');
                await page.waitForTimeout(1000);
            }
            await page.waitForTimeout(WAIT_TIME);
        }

        if (slideCount > 1) {
            console.log(chalk.cyan(`📄 Compiling final PDF...`));
            const pdfBytes = await pdfDoc.save();
            try {
                fs.writeFileSync(path.join(DOWNLOADS_DIR, 'Presentation.pdf'), pdfBytes);
            } catch (writeError) {
                console.error(chalk.red(`Failed to save PDF: ${writeError.message}`));
                throw writeError;
            }
            console.log(chalk.green.bold(`✨ Success! Saved ${slideCount - 1} slides to ${DOWNLOADS_DIR}`));
        } else {
            console.log(chalk.red('\n❌ Failure: No slides were captured.'));
        }

    } catch (error) {
        console.error(chalk.red('\n💥 Error:'), error);
    } finally {
        await browser.close().catch(() => null);
    }
}

run();
