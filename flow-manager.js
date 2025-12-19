const fs = require('fs');
const path = require('path');

/**
 * Flow Manager - Save, load, and manage guided flows for Figma prototypes
 */

class FlowManager {
    constructor(configDir = './flows') {
        this.configDir = configDir;
        this.ensureConfigDir();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    /**
     * Save a guided flow configuration
     * @param {string} flowName - Name of the flow
     * @param {Object} flowConfig - Flow configuration
     */
    saveFlow(flowName, flowConfig) {
        const safeName = this.sanitizeFilename(flowName);
        const filePath = path.join(this.configDir, `${safeName}.json`);

        const configWithMetadata = {
            name: flowName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...flowConfig
        };

        fs.writeFileSync(filePath, JSON.stringify(configWithMetadata, null, 2));
        return filePath;
    }

    /**
     * Load a saved flow configuration
     * @param {string} flowName - Name of the flow to load
     */
    loadFlow(flowName) {
        const safeName = this.sanitizeFilename(flowName);
        const filePath = path.join(this.configDir, `${safeName}.json`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`Flow '${flowName}' not found`);
        }

        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return config;
    }

    /**
     * List all saved flows
     */
    listFlows() {
        const files = fs.readdirSync(this.configDir);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(this.configDir, file);
                const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return {
                    name: config.name,
                    file: file,
                    createdAt: config.createdAt,
                    updatedAt: config.updatedAt
                };
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    /**
     * Delete a saved flow
     * @param {string} flowName - Name of the flow to delete
     */
    deleteFlow(flowName) {
        const safeName = this.sanitizeFilename(flowName);
        const filePath = path.join(this.configDir, `${safeName}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    /**
     * Create a guided flow configuration
     * @param {string} url - Figma prototype URL
     * @param {Array} steps - Array of navigation steps
     * @param {Object} options - Additional options
     */
    createGuidedFlow(url, steps = [], options = {}) {
        return {
            url,
            steps: steps.map(step => ({
                action: step.action || 'click',
                selector: step.selector,
                description: step.description || '',
                waitAfter: step.waitAfter || 2000
            })),
            options: {
                maxSlides: options.maxSlides || 50,
                waitMs: options.waitMs || 3000,
                preset: options.preset || 'stakeholder',
                ...options
            }
        };
    }

    /**
     * Execute a guided flow
     * @param {Object} flowConfig - Flow configuration
     * @param {Object} page - Playwright page object
     */
    async executeGuidedFlow(flowConfig, page, onStatus = () => { }) {
        if (!flowConfig || !flowConfig.steps) {
            throw new Error('Invalid flow configuration');
        }

        onStatus({ type: 'info', message: `Starting guided flow: ${flowConfig.name || 'Unnamed Flow'}` });

        for (let i = 0; i < flowConfig.steps.length; i++) {
            const step = flowConfig.steps[i];
            onStatus({ type: 'info', message: `Step ${i + 1}/${flowConfig.steps.length}: ${step.description || step.action}` });

            try {
                switch (step.action) {
                    case 'click':
                        await page.click(step.selector);
                        break;
                    case 'type':
                        await page.type(step.selector, step.text || '');
                        break;
                    case 'wait':
                        await page.waitForTimeout(step.waitAfter || step.duration || 2000);
                        break;
                    case 'navigate':
                        await page.goto(step.url);
                        break;
                    default:
                        await page.click(step.selector);
                }

                if (step.waitAfter) {
                    await page.waitForTimeout(step.waitAfter);
                }

                // Wait for visual stability after each step
                await this.waitForVisualStability(page);

            } catch (error) {
                onStatus({ type: 'warning', message: `Step ${i + 1} failed: ${error.message}` });
                // Continue with next step even if one fails
            }
        }

        onStatus({ type: 'success', message: 'Guided flow completed' });
    }

    /**
     * Wait for visual stability after navigation actions
     */
    async waitForVisualStability(page, timeout = 3000) {
        const start = Date.now();
        let lastScreenshot = null;

        while (Date.now() - start < timeout) {
            const currentScreenshot = await page.screenshot({ fullPage: false });

            if (lastScreenshot && lastScreenshot.equals(currentScreenshot)) {
                // Visual stability detected
                return;
            }

            lastScreenshot = currentScreenshot;
            await page.waitForTimeout(200);
        }
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    /**
     * Export flows for sharing
     */
    exportFlows() {
        const flows = this.listFlows();
        const exportData = flows.map(flow => this.loadFlow(flow.name));
        return exportData;
    }

    /**
     * Import flows from external source
     */
    importFlows(flowsData) {
        let importedCount = 0;

        for (const flow of flowsData) {
            try {
                this.saveFlow(flow.name, flow);
                importedCount++;
            } catch (error) {
                console.error(`Failed to import flow ${flow.name}:`, error.message);
            }
        }

        return importedCount;
    }
}

module.exports = FlowManager;