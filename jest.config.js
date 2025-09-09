/**
 * Jest Configuration for Space Invaders JS V115
 * 
 * Basic testing framework configuration for HTML5 Canvas game development.
 * Provides DOM testing environment and essential configuration for CI/CD pipeline.
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

/**
 * Jest configuration object with basic testing setup
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Test environment options for JSDOM
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },

  // Root directory for tests and source files
  rootDir: '.',

  // Directories to search for tests
  roots: [
    '<rootDir>/js',
    '<rootDir>/tests'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json'
  ],

  // Coverage configuration
  collectCoverage: false,
  
  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'html'
  ],

  // Test timeout (10 seconds)
  testTimeout: 10000,

  // Verbose output for detailed test information
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: false,
  
  // Cache configuration
  cache: true,

  // Bail configuration (stop on first failure in CI)
  bail: process.env.CI ? 1 : 0,

  // Force exit after tests complete
  forceExit: true,

  // Module directories
  moduleDirectories: [
    'node_modules'
  ]
};