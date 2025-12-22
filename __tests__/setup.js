// Jest setup file
const fs = require('fs');
const path = require('path');

// Create test directories if they don't exist
const testDirs = ['test-output', 'test-flows', 'test-presets'];
testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Mock Playwright for unit tests (we'll test the core logic without browser automation)
global.mockPlaywright = {
    chromium: {
        launch: jest.fn().mockResolvedValue({
            newContext: jest.fn().mockResolvedValue({
                newPage: jest.fn().mockResolvedValue({
                    goto: jest.fn().mockResolvedValue({}),
                    waitForLoadState: jest.fn().mockResolvedValue({}),
                    waitForSelector: jest.fn().mockResolvedValue({}),
                    screenshot: jest.fn().mockResolvedValue(Buffer.from('test')),
                    title: jest.fn().mockResolvedValue('Test Prototype'),
                    bringToFront: jest.fn().mockResolvedValue({}),
                    mouse: { click: jest.fn().mockResolvedValue({}) },
                    keyboard: { press: jest.fn().mockResolvedValue({}) },
                    close: jest.fn().mockResolvedValue({}),
                    evaluate: jest.fn().mockResolvedValue({}),
                    $: jest.fn().mockResolvedValue({})
                })
            }),
            close: jest.fn().mockResolvedValue({})
        })
    }
};

// Mock PDF-lib for testing
global.mockPDFLib = {
    PDFDocument: {
        create: jest.fn().mockResolvedValue({
            embedPng: jest.fn().mockResolvedValue({}),
            addPage: jest.fn().mockResolvedValue({}),
            embedFont: jest.fn().mockResolvedValue({}),
            save: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            insertPage: jest.fn().mockResolvedValue({})
        }),
        StandardFonts: {
            Helvetica: 'Helvetica',
            HelveticaBold: 'HelveticaBold'
        },
        rgb: jest.fn((r, g, b) => ({ r, g, b }))
    }
};

// Set up test environment
beforeAll(() => {
    console.log('Setting up test environment...');
});

// Clean up after tests
afterAll(() => {
    console.log('Cleaning up test environment...');
});