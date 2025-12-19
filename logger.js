const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Logger - Enhanced logging system with file and console output
 */

class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info'; // debug, info, warn, error
        this.logFile = options.logFile || './logs/figmasnap.log';
        this.maxLogSize = options.maxLogSize || 5 * 1024 * 1024; // 5MB
        this.logToFile = options.logToFile !== false;

        this.ensureLogDirectory();
        this.rotateLogsIfNeeded();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    rotateLogsIfNeeded() {
        try {
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                if (stats.size > this.maxLogSize) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const backupFile = `${this.logFile}.${timestamp}`;
                    fs.renameSync(this.logFile, backupFile);
                    this.log('info', `Log file rotated. Backup created: ${backupFile}`);
                }
            }
        } catch (error) {
            console.error('Log rotation failed:', error.message);
        }
    }

    log(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...context
        };

        // Console output with colors
        this.logToConsole(level, message, context);

        // File output
        if (this.logToFile) {
            this.logToFileEntry(logEntry);
        }
    }

    logToConsole(level, message, context) {
        let colorFunc = console.log;
        let prefix = 'INFO';

        switch (level) {
            case 'debug':
                colorFunc = chalk.gray;
                prefix = 'DEBUG';
                break;
            case 'info':
                colorFunc = chalk.blue;
                prefix = 'INFO';
                break;
            case 'warn':
                colorFunc = chalk.yellow;
                prefix = 'WARN';
                break;
            case 'error':
                colorFunc = chalk.red;
                prefix = 'ERROR';
                break;
        }

        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0
            ? ` | ${JSON.stringify(context)}`
            : '';

        colorFunc(`[${timestamp}] [${prefix}] ${message}${contextStr}`);
    }

    logToFileEntry(entry) {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    debug(message, context = {}) {
        if (this.shouldLog('debug')) {
            this.log('debug', message, context);
        }
    }

    info(message, context = {}) {
        if (this.shouldLog('info')) {
            this.log('info', message, context);
        }
    }

    warn(message, context = {}) {
        if (this.shouldLog('warn')) {
            this.log('warn', message, context);
        }
    }

    error(message, context = {}) {
        if (this.shouldLog('error')) {
            this.log('error', message, context);
        }
    }

    shouldLog(level) {
        const levels = { debug: 1, info: 2, warn: 3, error: 4 };
        return levels[level] >= levels[this.logLevel];
    }

    /**
     * Create an error with additional context
     */
    createError(message, code, context = {}) {
        const error = new Error(message);
        error.code = code;
        error.context = context;
        error.timestamp = new Date().toISOString();

        this.error(message, context);

        return error;
    }

    /**
     * Format error for user display
     */
    formatError(error) {
        let message = error.message || 'Unknown error';

        if (error.code) {
            message = `[${error.code}] ${message}`;
        }

        if (error.context && Object.keys(error.context).length > 0) {
            message += `\nContext: ${JSON.stringify(error.context, null, 2)}`;
        }

        if (error.stack && this.logLevel === 'debug') {
            message += `\nStack: ${error.stack}`;
        }

        return message;
    }

    /**
     * Get recent log entries
     */
    getRecentLogs(limit = 100) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n');
            return lines.slice(-limit).map(line => JSON.parse(line));
        } catch (error) {
            this.error('Failed to read log file', { error: error.message });
            return [];
        }
    }

    /**
     * Clear log file
     */
    clearLogs() {
        try {
            fs.writeFileSync(this.logFile, '');
            this.info('Log file cleared');
        } catch (error) {
            this.error('Failed to clear log file', { error: error.message });
        }
    }
}

// Singleton logger instance
const logger = new Logger();

module.exports = logger;