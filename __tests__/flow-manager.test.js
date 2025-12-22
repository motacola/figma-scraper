const FlowManager = require('../flow-manager');
const fs = require('fs');
const path = require('path');

describe('FlowManager', () => {
    let flowManager;
    const testFlowsDir = path.join(__dirname, 'test-flows');

    beforeAll(() => {
        // Use test directory for flows
        flowManager = new FlowManager(testFlowsDir);
    });

    beforeEach(() => {
        // Clean up test flows before each test
        if (fs.existsSync(testFlowsDir)) {
            fs.rmSync(testFlowsDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testFlowsDir, { recursive: true });
    });

    afterAll(() => {
        // Clean up after all tests
        if (fs.existsSync(testFlowsDir)) {
            fs.rmSync(testFlowsDir, { recursive: true, force: true });
        }
    });

    describe('Flow Creation and Management', () => {
        test('should create a guided flow configuration', () => {
            const flowConfig = flowManager.createGuidedFlow('https://example.com', [
                { action: 'click', selector: '.button', description: 'Click button' }
            ], { maxSlides: 50 });

            expect(flowConfig).toBeDefined();
            expect(flowConfig.url).toBe('https://example.com');
            expect(flowConfig.steps).toHaveLength(1);
            expect(flowConfig.steps[0].action).toBe('click');
            expect(flowConfig.options.maxSlides).toBe(50);
        });

        test('should save and load a flow', () => {
            const flowConfig = flowManager.createGuidedFlow('https://example.com', [
                { action: 'click', selector: '.button' }
            ]);

            const filePath = flowManager.saveFlow('test-flow', flowConfig);
            expect(filePath).toContain('test_flow.json');
            expect(fs.existsSync(filePath)).toBe(true);

            const loadedFlow = flowManager.loadFlow('test-flow');
            expect(loadedFlow).toBeDefined();
            expect(loadedFlow.name).toBe('test-flow');
            expect(loadedFlow.url).toBe('https://example.com');
        });

        test('should list saved flows', () => {
            flowManager.saveFlow('flow1', flowManager.createGuidedFlow('https://example1.com'));
            flowManager.saveFlow('flow2', flowManager.createGuidedFlow('https://example2.com'));

            const flows = flowManager.listFlows();
            expect(flows).toHaveLength(2);
            expect(flows[0].name).toBeDefined();
            expect(flows[1].name).toBeDefined();
        });

        test('should delete a flow', () => {
            flowManager.saveFlow('flow-to-delete', flowManager.createGuidedFlow('https://example.com'));

            const deleted = flowManager.deleteFlow('flow-to-delete');
            expect(deleted).toBe(true);

            const flows = flowManager.listFlows();
            expect(flows).toHaveLength(0);
        });

        test('should handle non-existent flow gracefully', () => {
            expect(() => flowManager.loadFlow('non-existent')).toThrow();
            expect(flowManager.deleteFlow('non-existent')).toBe(false);
        });
    });

    describe('Flow Execution', () => {
        test('should execute a guided flow with valid steps', async () => {
            const flowConfig = flowManager.createGuidedFlow('https://example.com', [
                { action: 'click', selector: '.button', waitAfter: 100 }
            ]);

            // Mock page object
            const mockPage = {
                click: jest.fn().mockResolvedValue({}),
                waitForTimeout: jest.fn().mockResolvedValue({}),
                screenshot: jest.fn().mockResolvedValue(Buffer.from('test'))
            };

            const onStatus = jest.fn();

            await flowManager.executeGuidedFlow(flowConfig, mockPage, onStatus);

            expect(mockPage.click).toHaveBeenCalledWith('.button');
            expect(mockPage.waitForTimeout).toHaveBeenCalledWith(100);
            expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
                type: 'success',
                message: 'Guided flow completed'
            }));
        });

        test('should continue execution when a step fails', async () => {
            const flowConfig = flowManager.createGuidedFlow('https://example.com', [
                { action: 'click', selector: '.button' },
                { action: 'click', selector: '.another-button' }
            ]);

            // Mock page object with first step failing
            const mockPage = {
                click: jest.fn().mockImplementation((selector) => {
                    if (selector === '.button') {
                        throw new Error('Element not found');
                    }
                    return Promise.resolve();
                }),
                waitForTimeout: jest.fn().mockResolvedValue({}),
                screenshot: jest.fn().mockResolvedValue(Buffer.from('test'))
            };

            const onStatus = jest.fn();

            await flowManager.executeGuidedFlow(flowConfig, mockPage, onStatus);

            expect(mockPage.click).toHaveBeenCalledTimes(2);
            expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
                type: 'warning',
                message: expect.stringContaining('failed')
            }));
        });

        test('should handle invalid flow configuration', async () => {
            await expect(flowManager.executeGuidedFlow(null, {}, jest.fn()))
                .rejects
                .toThrow('Invalid flow configuration');
        });
    });

    describe('Utility Methods', () => {
        test('should sanitize filenames', () => {
            const sanitized = flowManager.sanitizeFilename('Test Flow 123!@#');
            expect(sanitized).toMatch(/^[a-z0-9_]+$/);
        });

        test('should export and import flows', () => {
            flowManager.saveFlow('export-flow1', flowManager.createGuidedFlow('https://example1.com'));
            flowManager.saveFlow('export-flow2', flowManager.createGuidedFlow('https://example2.com'));

            const exported = flowManager.exportFlows();
            expect(exported).toHaveLength(2);

            const importResult = flowManager.importFlows(exported);
            expect(importResult).toBe(2);
        });

        test('should handle import errors gracefully', () => {
            const invalidFlows = [
                { name: 'valid', url: 'https://example.com' },
                { invalid: 'data' }
            ];

            const importResult = flowManager.importFlows(invalidFlows);
            expect(importResult).toBe(1); // Only one valid flow imported
        });
    });
});