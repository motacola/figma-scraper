const { StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Export Manager - Handle PDF export presets and customization
 */

class ExportManager {
    constructor() {
        this.presets = this.loadDefaultPresets();
    }

    loadDefaultPresets() {
        return {
            'client-signoff': {
                name: 'Client Signoff',
                description: 'Polished presentation for client reviews',
                pageSize: 'A4',
                margin: 40,
                includeHeader: true,
                includeFooter: true,
                includeFrameNames: true,
                headerContent: 'Confidential - Client Review',
                footerContent: 'Page {pageNum} of {totalPages}',
                fontSize: 12,
                headerFontSize: 10,
                footerFontSize: 10,
                headerColor: [0.3, 0.3, 0.3],
                footerColor: [0.5, 0.5, 0.5],
                backgroundColor: [1, 1, 1],
                quality: 'high'
            },
            'dev-handoff': {
                name: 'Developer Handoff',
                description: 'Technical documentation with annotations',
                pageSize: 'Letter',
                margin: 20,
                includeHeader: true,
                includeFooter: true,
                includeFrameNames: true,
                headerContent: 'Technical Specification',
                footerContent: 'FigmaSnap Export - {date}',
                fontSize: 10,
                headerFontSize: 12,
                footerFontSize: 8,
                headerColor: [0, 0, 0],
                footerColor: [0.3, 0.3, 0.3],
                backgroundColor: [1, 1, 1],
                quality: 'medium'
            },
            'stakeholder': {
                name: 'Stakeholder Presentation',
                description: 'Professional presentation for stakeholders',
                pageSize: '16:9',
                margin: 30,
                includeHeader: false,
                includeFooter: true,
                includeFrameNames: false,
                headerContent: '',
                footerContent: '© {year} - Confidential',
                fontSize: 14,
                headerFontSize: 0,
                footerFontSize: 10,
                headerColor: [0, 0, 0],
                footerColor: [0.4, 0.4, 0.4],
                backgroundColor: [1, 1, 1],
                quality: 'high'
            },
            'clean': {
                name: 'Clean Export',
                description: 'Minimal export without annotations',
                pageSize: 'A4',
                margin: 0,
                includeHeader: false,
                includeFooter: false,
                includeFrameNames: false,
                headerContent: '',
                footerContent: '',
                fontSize: 12,
                headerFontSize: 0,
                footerFontSize: 0,
                headerColor: [0, 0, 0],
                footerColor: [0, 0, 0],
                backgroundColor: [1, 1, 1],
                quality: 'high'
            }
        };
    }

    getPresetNames() {
        return Object.keys(this.presets);
    }

    getPreset(presetName) {
        return this.presets[presetName] || this.presets['stakeholder'];
    }

    getPageDimensions(pageSize) {
        const sizes = {
            'A4': { width: 595, height: 842 },
            'Letter': { width: 612, height: 792 },
            '16:9': { width: 1024, height: 576 },
            '4:3': { width: 1024, height: 768 },
            'A3': { width: 842, height: 1190 }
        };

        return sizes[pageSize] || sizes['A4'];
    }

    /**
     * Create a custom export preset
     */
    createCustomPreset(name, options = {}) {
        const preset = {
            name: name,
            description: options.description || 'Custom export preset',
            pageSize: options.pageSize || 'A4',
            margin: options.margin || 30,
            includeHeader: options.includeHeader !== false,
            includeFooter: options.includeFooter !== false,
            includeFrameNames: options.includeFrameNames !== false,
            headerContent: options.headerContent || '',
            footerContent: options.footerContent || '',
            fontSize: options.fontSize || 12,
            headerFontSize: options.headerFontSize || 10,
            footerFontSize: options.footerFontSize || 10,
            headerColor: options.headerColor || [0, 0, 0],
            footerColor: options.footerColor || [0.5, 0.5, 0.5],
            backgroundColor: options.backgroundColor || [1, 1, 1],
            quality: options.quality || 'high'
        };

        this.presets[name] = preset;
        return preset;
    }

    /**
     * Save a custom preset to file
     */
    saveCustomPreset(name, presetDir = './presets') {
        if (!fs.existsSync(presetDir)) {
            fs.mkdirSync(presetDir, { recursive: true });
        }

        const safeName = this.sanitizeFilename(name);
        const filePath = path.join(presetDir, `${safeName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(this.presets[name], null, 2));
        return filePath;
    }

    /**
     * Load custom presets from directory
     */
    loadCustomPresets(presetDir = './presets') {
        if (!fs.existsSync(presetDir)) {
            return 0;
        }

        const files = fs.readdirSync(presetDir);
        let loadedCount = 0;

        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const presetData = JSON.parse(fs.readFileSync(path.join(presetDir, file), 'utf8'));
                    this.presets[presetData.name] = presetData;
                    loadedCount++;
                } catch (error) {
                    console.error(`Failed to load preset ${file}:`, error.message);
                }
            }
        }

        return loadedCount;
    }

    /**
     * Add header to PDF page
     */
    async addHeader(pdfDoc, pdfPage, preset, pageNum, totalPages) {
        if (!preset.includeHeader || !preset.headerContent) return;

        const { width } = pdfPage.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const headerText = this.replacePlaceholders(preset.headerContent, { pageNum, totalPages });

        pdfPage.drawText(headerText, {
            x: preset.margin,
            y: pdfPage.getHeight() - preset.margin - 20,
            size: preset.headerFontSize,
            font: font,
            color: rgb(...preset.headerColor)
        });
    }

    /**
     * Add footer to PDF page
     */
    async addFooter(pdfDoc, pdfPage, preset, pageNum, totalPages) {
        if (!preset.includeFooter || !preset.footerContent) return;

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const footerText = this.replacePlaceholders(preset.footerContent, { pageNum, totalPages });

        pdfPage.drawText(footerText, {
            x: preset.margin,
            y: preset.margin + 10,
            size: preset.footerFontSize,
            font: font,
            color: rgb(...preset.footerColor)
        });
    }

    /**
     * Add frame name annotation to PDF page
     */
    async addFrameName(pdfDoc, pdfPage, frameName, preset) {
        if (!preset.includeFrameNames || !frameName) return;

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        pdfPage.drawText(frameName, {
            x: preset.margin,
            y: preset.margin + 30,
            size: preset.fontSize,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    /**
     * Replace placeholders in text (e.g., {pageNum}, {totalPages})
     */
    replacePlaceholders(text, placeholders) {
        return text
            .replace(/{pageNum}/g, placeholders.pageNum)
            .replace(/{totalPages}/g, placeholders.totalPages)
            .replace(/{date}/g, new Date().toLocaleDateString())
            .replace(/{year}/g, new Date().getFullYear());
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    /**
     * Get quality settings based on preset
     */
    getQualitySettings(preset) {
        const qualities = {
            'low': { dpi: 72, compression: 0.8 },
            'medium': { dpi: 150, compression: 0.6 },
            'high': { dpi: 300, compression: 0.4 }
        };

        return qualities[preset.quality] || qualities['high'];
    }

    /**
     * Create a PDF with custom preset styling
     */
    async createStyledPDF(images, presetName = 'stakeholder') {
        const preset = this.getPreset(presetName);
        const { width, height } = this.getPageDimensions(preset.pageSize);

        const pdfDoc = await PDFDocument.create();

        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const pdfPage = pdfDoc.addPage([width, height]);

            // Add background
            pdfPage.drawRectangle({
                x: 0,
                y: 0,
                width: width,
                height: height,
                color: rgb(...preset.backgroundColor)
            });

            // Calculate image position with margins
            const imageWidth = width - (2 * preset.margin);
            const imageHeight = height - (2 * preset.margin);
            const x = preset.margin;
            const y = preset.margin;

            // Draw the image
            pdfPage.drawImage(image, {
                x: x,
                y: y,
                width: imageWidth,
                height: imageHeight
            });

            // Add header, footer, and frame name
            await this.addHeader(pdfDoc, pdfPage, preset, i + 1, images.length);
            await this.addFooter(pdfDoc, pdfPage, preset, i + 1, images.length);

            if (image.frameName) {
                await this.addFrameName(pdfDoc, pdfPage, image.frameName, preset);
            }
        }

        return pdfDoc;
    }
}

module.exports = ExportManager;