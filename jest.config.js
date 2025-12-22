module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test match patterns
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],

    // Coverage configuration
    collectCoverage: true,
    collectCoverageFrom: [
        '*.js',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/release/**',
        '!**/scripts/**',
        '!**/__tests__/**',
        '!jest.config.js',
        '!package.json'
    ],

    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover'],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

    // Verbose output
    verbose: true,

    // Timeout
    testTimeout: 10000,

    // Module file extensions
    moduleFileExtensions: ['js', 'json', 'node']
};