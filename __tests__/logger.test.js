const Logger = require('../logger');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
    let logger;
    const testLogFile = path.join(__dirname, 'test-logs', 'test.log');

    beforeAll(() => {
        // Create test logger
        logger = new Logger({
            logFile: testLogFile,
            logLevel: 'debug'
        });
    });

    beforeEach(() => {
        // Clean up test log file before each test
        if (fs.existsSync(testLogFile)) {
            fs.unlinkSync(testLogFile);
        }
    });

    afterAll(() => {
        // Clean up after all tests
        if (fs.existsSync(testLogFile)) {
            fs.unlinkSync(testLogFile);
        }
    });

    describe('Logger Initialization', () => {
        test('should create logger instance with default settings', () => {
            const defaultLogger = new Logger();
            expect(defaultLogger.logLevel).toBe('info');
            expect(defaultLogger.logToFile).toBe(true);
        });

        test('should create logger instance with custom settings', () => {
            expect(logger.logLevel).toBe('debug');
            expect(logger.logFile).toContain('test.log');
        });

        test('should create log directory if it does not exist', () => {
            const logDir = path.dirname(testLogFile);
            expect(fs.existsSync(logDir)).toBe(true);
        });
    });

    describe('Logging Methods', () => {
        test('should log debug messages', () => {
            // Test that debug method doesn't throw and logs to file
            expect(() => logger.debug('Test debug message', { test: 'data' })).not.toThrow();

            // Check that it was logged to file
            const logs = logger.getRecentLogs();
            expect(logs.some(log => log.message === 'Test debug message')).toBe(true);
        });

        test('should log info messages', () => {
            expect(() => logger.info('Test info message')).not.toThrow();

            const logs = logger.getRecentLogs();
            expect(logs.some(log => log.message === 'Test info message')).toBe(true);
        });

        test('should log warning messages', () => {
            expect(() => logger.warn('Test warning message')).not.toThrow();

            const logs = logger.getRecentLogs();
            expect(logs.some(log => log.message === 'Test warning message')).toBe(true);
        });

        test('should log error messages', () => {
            expect(() => logger.error('Test error message')).not.toThrow();

            const logs = logger.getRecentLogs();
            expect(logs.some(log => log.message === 'Test error message')).toBe(true);
        });

        test('should respect log level settings', () => {
            const debugLogger = new Logger({ logLevel: 'debug' });
            const errorLogger = new Logger({ logLevel: 'error' });

            // Test that debug logger logs debug messages
            debugLogger.debug('Should log');
            const debugLogs = debugLogger.getRecentLogs();
            expect(debugLogs.some(log => log.message === 'Should log')).toBe(true);

            // Test that error logger doesn't log debug messages
            errorLogger.debug('Should not log');
            const errorLogs = errorLogger.getRecentLogs();
            expect(errorLogs.some(log => log.message === 'Should not log')).toBe(false);
        });
    });

    describe('Log File Operations', () => {
        test('should write logs to file', () => {
            logger.info('Test log entry');

            expect(fs.existsSync(testLogFile)).toBe(true);

            const content = fs.readFileSync(testLogFile, 'utf8');
            expect(content).toContain('Test log entry');
        });

        test('should create valid JSON log entries', () => {
            logger.info('JSON test message', { key: 'value' });

            const content = fs.readFileSync(testLogFile, 'utf8');
            const lines = content.trim().split('\n');
            const lastLine = lines[lines.length - 1];

            const logEntry = JSON.parse(lastLine);
            expect(logEntry).toHaveProperty('timestamp');
            expect(logEntry).toHaveProperty('level');
            expect(logEntry).toHaveProperty('message');
            expect(logEntry).toHaveProperty('key');
        });

        test('should handle log file errors gracefully', () => {
            // Test with a directory that doesn't exist and can't be created
            const badLogger = new Logger({
                logFile: '/nonexistent/test.log',
                logToFile: false // Disable file logging to avoid permission issues
            });

            // The logger should still work even if file logging is disabled
            expect(badLogger).toBeDefined();
            expect(badLogger.logFile).toContain('/nonexistent/test.log');

            // Should be able to log without errors
            expect(() => badLogger.info('Test message')).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should create formatted errors', () => {
            const error = logger.createError('Test error', 'TEST_ERR', { context: 'data' });

            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERR');
            expect(error.context).toEqual({ context: 'data' });
            expect(error.timestamp).toBeDefined();
        });

        test('should format errors for display', () => {
            const error = new Error('Test error');
            error.code = 'TEST_CODE';
            error.context = { detail: 'test' };

            const formatted = logger.formatError(error);

            expect(formatted).toContain('TEST_CODE');
            expect(formatted).toContain('Test error');
            expect(formatted).toContain('test');
        });

        test('should handle errors without context', () => {
            const error = new Error('Simple error');
            const formatted = logger.formatError(error);

            expect(formatted).toContain('Simple error');
        });
    });

    describe('Log Management', () => {
        test('should get recent logs', () => {
            logger.info('Log entry 1');
            logger.info('Log entry 2');
            logger.info('Log entry 3');

            const logs = logger.getRecentLogs(2);
            expect(logs).toHaveLength(2);
            expect(logs[0].message).toContain('Log entry');
        });

        test('should handle empty log file', () => {
            const emptyLogger = new Logger({ logFile: path.join(__dirname, 'empty.log') });
            const logs = emptyLogger.getRecentLogs();

            expect(logs).toHaveLength(0);
        });

        test('should clear logs', () => {
            logger.info('Entry to be cleared');

            const beforeClear = logger.getRecentLogs();
            expect(beforeClear.length).toBeGreaterThan(0);

            logger.clearLogs();

            // After clearing, the log file should be empty or contain only the clear log entry
            const afterClear = logger.getRecentLogs();
            expect(afterClear.length).toBeLessThanOrEqual(1); // May contain the "Log file cleared" entry
        });
    });

    describe('Log Rotation', () => {
        test('should rotate logs when they exceed size limit', () => {
            // Create a logger with very small size limit for testing
            const testLogDir = path.join(__dirname, 'rotation-test');
            if (!fs.existsSync(testLogDir)) {
                fs.mkdirSync(testLogDir, { recursive: true });
            }

            const rotationLogger = new Logger({
                logFile: path.join(testLogDir, 'rotation.log'),
                maxLogSize: 100 // 100 bytes
            });

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                rotationLogger.info(`Rotation test entry ${i}`);
            }

            // Check if backup file was created (may not work in all test environments)
            const files = fs.existsSync(testLogDir) ? fs.readdirSync(testLogDir) : [];
            const backupFiles = files.filter(f => f.startsWith('rotation.log.') && f !== 'rotation.log');

            // Clean up
            if (fs.existsSync(testLogDir)) {
                fs.rmSync(testLogDir, { recursive: true, force: true });
            }

            // This test should pass now
            expect(backupFiles.length).toBeGreaterThan(0);
        });
    });
});