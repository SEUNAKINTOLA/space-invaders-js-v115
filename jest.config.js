/**
 * Jest Configuration for Space Invaders JS V115
 * 
 * Comprehensive testing framework configuration optimized for HTML5 Canvas game development.
 * Provides DOM testing environment, coverage thresholds, module path mapping, and performance
 * monitoring for a complete testing infrastructure.
 * 
 * Key Features:
 * - DOM testing environment with JSDOM
 * - 90% coverage thresholds across all metrics
 * - Module path mapping for clean imports
 * - Canvas API mocking for game rendering tests
 * - Performance monitoring and memory leak detection
 * - Accessibility testing support
 * - Cross-browser compatibility testing setup
 * 
 * Architecture Decisions:
 * - Uses JSDOM for lightweight DOM simulation
 * - Separates unit, integration, and e2e test patterns
 * - Implements custom matchers for game-specific assertions
 * - Provides comprehensive mocking for browser APIs
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

const path = require('path');

/**
 * Jest configuration object with comprehensive testing setup
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Test environment options for JSDOM
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously'
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
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/js/**/__tests__/**/*.js',
    '<rootDir>/js/**/*.test.js'
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.git/'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'html',
    'css'
  ],

  // Module name mapping for clean imports
  moduleNameMapper: {
    // Game modules
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@config/(.*)$': '<rootDir>/js/config/$1',
    '^@entities/(.*)$': '<rootDir>/js/entities/$1',
    '^@systems/(.*)$': '<rootDir>/js/systems/$1',
    '^@input/(.*)$': '<rootDir>/js/input/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1',
    
    // Test utilities
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    
    // Assets and static files
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@css/(.*)$': '<rootDir>/css/$1',
    
    // CSS and asset mocking
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ogg)$': '<rootDir>/tests/mocks/fileMock.js'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // Transform configuration
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current',
            browsers: ['last 2 versions', 'ie >= 11']
          }
        }]
      ],
      plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
      ]
    }]
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(es6-module-that-needs-transform)/)'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.test.js',
    '!js/**/*.spec.js',
    '!js/**/__tests__/**',
    '!js/**/node_modules/**',
    '!js/vendor/**',
    '!js/lib/**'
  ],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Coverage thresholds (90% across all metrics)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical modules
    'js/game.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'js/renderer.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'js/systems/': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },

  // Test reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Space Invaders Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      suiteName: 'Space Invaders Test Suite'
    }]
  ],

  // Test timeout (30 seconds for complex game tests)
  testTimeout: 30000,

  // Verbose output for detailed test information
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],

  // Performance monitoring
  maxWorkers: '50%',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Notification configuration
  notify: false,
  notifyMode: 'failure-change',

  // Bail configuration (stop on first failure in CI)
  bail: process.env.CI ? 1 : 0,

  // Silent mode for CI environments
  silent: process.env.CI === 'true',

  // Custom test sequencer for deterministic test order
  testSequencer: '<rootDir>/tests/utils/testSequencer.js',

  // Project-specific Jest extensions
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.js'],
      testTimeout: 60000
    }
  ],

  // Custom matchers and utilities
  snapshotSerializers: [
    '<rootDir>/tests/serializers/canvasSerializer.js',
    '<rootDir>/tests/serializers/gameStateSerializer.js'
  ],

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/js',
    '<rootDir>/tests'
  ],

  // Force exit after tests complete
  forceExit: false,

  // Detect open handles
  detectOpenHandles: true,

  // Detect leaked timers
  detectLeaks: true,

  // Maximum number of concurrent workers
  maxConcurrency: 5,

  // Test result processor
  testResultsProcessor: '<rootDir>/tests/processors/testResultsProcessor.js',

  // Custom environment variables for tests
  setupFiles: [
    '<rootDir>/tests/setup/env.setup.js'
  ],

  // Resolver configuration
  resolver: '<rootDir>/tests/utils/resolver.js',

  // Watch plugins for enhanced development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    '<rootDir>/tests/plugins/watchPlugin.js'
  ],

  // Extra configuration for game-specific testing
  globals: {
    __DEV__: true,
    __TEST__: true,
    __GAME_VERSION__: '1.15.0',
    __BUILD_TIME__: new Date().toISOString(),
    
    // Canvas and WebGL mocking flags
    __MOCK_CANVAS__: true,
    __MOCK_WEBGL__: true,
    __MOCK_AUDIO__: true,
    
    // Performance testing flags
    __PERFORMANCE_TESTING__: process.env.PERFORMANCE_TEST === 'true',
    __MEMORY_TESTING__: process.env.MEMORY_TEST === 'true'
  }
};