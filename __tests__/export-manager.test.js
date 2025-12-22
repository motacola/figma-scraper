const ExportManager = require('../export-manager');
const fs = require('fs');
const path = require('path');

describe('ExportManager', () => {
    let exportManager;
    const testPresetsDir = path.join(__dirname, 'test-presets');

    beforeAll(() => {
        exportManager = new ExportManager();
    });

    beforeEach(() => {
        // Clean up test presets before each test
        if (fs.existsSync(testPresetsDir)) {
            fs.rmSync(testPresetsDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testPresetsDir, { recursive: true });
    });

    afterAll(() => {
        // Clean up after all tests
        if (fs.existsSync(testPresetsDir)) {
            fs.rmSync(testPresetsDir, { recursive: true, force: true });
        }
    });

    describe('Preset Management', () => {
        test('should have default presets', () => {
            const presets = exportManager.getPresetNames();
            expect(presets).toContain('client-signoff');
            expect(presets).toContain('dev-handoff');
            expect(presets).toContain('stakeholder');
            expect(presets).toContain('clean');
        });

        test('should get preset details', () => {
            const preset = exportManager.getPreset('client-signoff');
            expect(preset).toBeDefined();
            expect(preset.name).toBe('Client Signoff');
            expect(preset.pageSize).toBe('A4');
            expect(preset.margin).toBe(40);
        });

        test('should create custom preset', () => {
            const customPreset = exportManager.createCustomPreset('custom-test', {
                pageSize: 'Letter',
                margin: 25,
                description: 'Test custom preset'
            });

            expect(customPreset).toBeDefined();
            expect(customPreset.name).toBe('custom-test');
            expect(customPreset.pageSize).toBe('Letter');
            expect(customPreset.margin).toBe(25);
        });

        test('should save and load custom presets', () => {
            exportManager.createCustomPreset('test-preset', {
                pageSize: '16:9',
                margin: 10
            });

            const filePath = exportManager.saveCustomPreset('test-preset', testPresetsDir);
            expect(filePath).toContain('test_preset.json');
            expect(fs.existsSync(filePath)).toBe(true);

            const loadedCount = exportManager.loadCustomPresets(testPresetsDir);
            expect(loadedCount).toBe(1);

            const loadedPreset = exportManager.getPreset('test-preset');
            expect(loadedPreset).toBeDefined();
            expect(loadedPreset.pageSize).toBe('16:9');
        });

        test('should handle invalid preset gracefully', () => {
            const preset = exportManager.getPreset('non-existent');
            expect(preset).toBeDefined(); // Should return default preset
            expect(preset.name).toBe('Stakeholder Presentation'); // Default preset
        });
    });

    describe('Page Dimensions', () => {
        test('should return correct dimensions for page sizes', () => {
            const a4 = exportManager.getPageDimensions('A4');
            expect(a4.width).toBe(595);
            expect(a4.height).toBe(842);

            const letter = exportManager.getPageDimensions('Letter');
            expect(letter.width).toBe(612);
            expect(letter.height).toBe(792);

            const landscape = exportManager.getPageDimensions('16:9');
            expect(landscape.width).toBe(1024);
            expect(landscape.height).toBe(576);
        });

        test('should return A4 as default for unknown page size', () => {
            const unknown = exportManager.getPageDimensions('Unknown');
            expect(unknown.width).toBe(595);
            expect(unknown.height).toBe(842);
        });
    });

    describe('Placeholder Replacement', () => {
        test('should replace placeholders in text', () => {
            const currentYear = new Date().getFullYear().toString();
            const result = exportManager.replacePlaceholders(
                'Page {pageNum} of {totalPages} - {date}',
                { pageNum: 1, totalPages: 10 }
            );

            expect(result).toContain('Page 1 of 10');
            expect(result).toContain(currentYear);
        });

        test('should handle missing placeholders gracefully', () => {
            const result = exportManager.replacePlaceholders(
                'Test {missing}',
                {}
            );
            expect(result).toBe('Test {missing}');
        });
    });

    describe('Quality Settings', () => {
        test('should return correct quality settings', () => {
            const high = exportManager.getQualitySettings({ quality: 'high' });
            expect(high.dpi).toBe(300);
            expect(high.compression).toBe(0.4);

            const low = exportManager.getQualitySettings({ quality: 'low' });
            expect(low.dpi).toBe(72);
            expect(low.compression).toBe(0.8);
        });

        test('should return high quality as default', () => {
            const defaultQuality = exportManager.getQualitySettings({});
            expect(defaultQuality.dpi).toBe(300);
        });
    });

    describe('File Operations', () => {
        test('should sanitize filenames', () => {
            const sanitized = exportManager.sanitizeFilename('Test Preset!@#.json');
            expect(sanitized).toMatch(/^[a-z0-9_]+$/);
        });

        test('should handle preset file operations', () => {
            const preset = exportManager.createCustomPreset('file-test', {});
            const filePath = exportManager.saveCustomPreset('file-test', testPresetsDir);

            expect(fs.existsSync(filePath)).toBe(true);

            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            expect(parsedContent.name).toBe('file-test');
        });
    });
});