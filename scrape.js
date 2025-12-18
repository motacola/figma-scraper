require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { PDFDocument } = require('pdf-lib');

puppeteer.use(StealthPlugin());

const mkdir = promisify(fs.mkdir);

// Configuration from Env
const FIGMA_URL = process.env.FIGMA_URL;
const PASSWORD = process.env.FIGMA_PASSWORD;

// Resolve output dir
let DOWNLOADS_DIR = process.env.OUTPUT_DIR || path.join(os.homedir(), 'Downloads', 'Boho_Beautiful_Screenshots');
if (!path.isAbsolute(DOWNLOADS_DIR)) {
    if (DOWNLOADS_DIR.toLowerCase().startsWith('downloads/')) {
        DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads', DOWNLOADS_DIR.substring(10));
    } else {
        DOWNLOADS_DIR = path.resolve(process.cwd(), DOWNLOADS_DIR);
    }
}

const MAX_SLIDES = 200; 
const TRANSITION_WAIT_MS = 5000; 

async function run() {
    if (!FIGMA_URL) {
        console.error('Error: FIGMA_URL is not set in .env file');
        process.exit(1);
    }

    console.log(`Output Directory: ${DOWNLOADS_DIR}`);
    if (!fs.existsSync(DOWNLOADS_DIR)) {
        await mkdir(DOWNLOADS_DIR, { recursive: true });
    }

    // Initialize PDF Document
    const pdfDoc = await PDFDocument.create();

    // Launch headful with system Chrome
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
        userDataDir: path.join(__dirname, 'chrome_profile'), 
        defaultViewport: { width: 1600, height: 5000 }, 
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--enable-gpu',
            '--ignore-gpu-blocklist',
            '--enable-webgl',
            '--enable-webgl-draft-extensions',
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars'
        ]
    });
    
    // get first page
    const pages = await browser.pages();
    let page = pages.length > 0 ? pages[0] : await browser.newPage();
    await page.setViewport({ width: 1600, height: 5000 });

    console.log(`Navigating to Figma...`);
    await page.goto(FIGMA_URL, { waitUntil: 'domcontentloaded', timeout: 0 }); 

    // === MANUAL INTERVENTION BLOCK ===
    console.log('\n\n=============================================================');
    console.log('  WAITING 60 SECONDS FOR MANUAL USER SETUP');
    console.log('=============================================================');
    console.log(`1. Log in if needed (Pass: ${PASSWORD || 'Not Set'}).`);
    console.log('2. Ensure prototype is loaded.');
    console.log('3. Adjust zoom/fit if needed.');
    console.log('4. CLICK on the canvas.');
    console.log('-------------------------------------------------------------');
    console.log('Script will resume automatically in 60 seconds...');
    console.log('=============================================================\n');

    await new Promise(r => setTimeout(r, 60000));

    console.log('Resuming automation...');
    // Refresh page focus
    const allPages = await browser.pages();
    let targetPage = page;
    for (const p of allPages) {
        if (p.url().includes('figma.com')) targetPage = p;
    }
    page = targetPage;
    await page.bringToFront();
    
    // Attempt focus click
    await page.mouse.click(800, 2500); 

    let previousBuffer = null;
    let consecutiveDuplicates = 0;
    let slideCount = 1;

    for (let i = 1; i <= MAX_SLIDES; i++) {
        console.log(`Processing slide ${i}...`);
        
        // Screenshot
        const buffer = await page.screenshot({ fullPage: false });
        
        if (previousBuffer && buffer.equals(previousBuffer)) {
            console.log('Duplicate detected.');
            consecutiveDuplicates++;
            if (consecutiveDuplicates >= 3) {
                 console.log('Stopping after 3 consecutive duplicates.');
                 break;
            }
        } else {
            console.log(`New slide detected! Saving image and adding to PDF...`);
            
            // Save PNG
            const filename = `slide_${String(slideCount).padStart(2, '0')}.png`;
            fs.writeFileSync(path.join(DOWNLOADS_DIR, filename), buffer);
            
            // Add to PDF
            const image = await pdfDoc.embedPng(buffer);
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });

            slideCount++;
            consecutiveDuplicates = 0;
            previousBuffer = buffer; 
        }

        console.log('Navigating...');
        await page.keyboard.press('ArrowRight');
        await new Promise(r => setTimeout(r, 500));
        
        if (consecutiveDuplicates > 0) {
             await page.keyboard.press('Space');
             await new Promise(r => setTimeout(r, 500));
        }

        await new Promise(r => setTimeout(r, TRANSITION_WAIT_MS));
    }

    console.log(`Saving Presentation.pdf to ${DOWNLOADS_DIR}...`);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(DOWNLOADS_DIR, 'Presentation.pdf'), pdfBytes);

    console.log('Finished. Closing browser...');
    await browser.close();
}

run().catch(console.error);
