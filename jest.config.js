/**
 * Jest Configuration for Space Invaders JS V115
 * 
 * Comprehensive testing framework configuration optimized for HTML5 Canvas game development.
 * Provides DOM testing environment, coverage thresholds, module path mapping, and performance
 * optimizations for a modern JavaScript game architecture.
 * 
 * Key Features:
 * - JSDOM environment for Canvas API testing
 * - 90% coverage thresholds across all metrics
 * - Module path mapping for clean imports
 * - Performance optimizations for CI/CD
 * - Comprehensive test matching patterns
 * 
 * Architecture Decisions:
 * - Uses JSDOM for lightweight DOM simulation
 * - Separates unit and integration test patterns
 * - Implements strict coverage requirements
 * - Supports ES6 modules with Babel transformation
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

const path = require('path');

/**
 * Jest configuration object with comprehensive testing setup
 * Optimized for HTML5 Canvas game development with strict quality gates
 */
module.exports = {
  // Test Environment Configuration
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    html: '<html><body><canvas id="gameCanvas" width="800" height="600"></canvas></body></html>',
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (compatible; Jest/29.0.0)',
    pretendToBeVisual: true,
    resources: 'usable'
  },

  // Root directory for tests and source files
  rootDir: '.',
  
  // Test file discovery patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/**/__tests__/**/*.js'
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.git/',
    '/assets/'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'mjs'
  ],

  // Module path mapping for clean imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/js/config/$1',
    '^@entities/(.*)$': '<rootDir>/js/entities/$1',
    '^@systems/(.*)$': '<rootDir>/js/systems/$1',
    '^@input/(.*)$': '<rootDir>/js/input/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1',
    '^@ui/(.*)$': '<rootDir>/js/ui/$1',
    '^@audio/(.*)$': '<rootDir>/js/audio/$1',
    '^@effects/(.*)$': '<rootDir>/js/effects/$1',
    '^@ai/(.*)$': '<rootDir>/js/ai/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ogg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Directories to search for modules
  moduleDirectories: [
    'node_modules',
    '<rootDir>/js',
    '<rootDir>/tests'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // Transform configuration for ES6+ support
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current',
            browsers: ['last 2 versions', 'ie >= 11']
          },
          modules: 'commonjs'
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
    '/node_modules/(?!(es6-module-name)/)',
    '\\.pnp\\.[^\\/]+$'
  ],

  // Coverage configuration with strict thresholds
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.config.js',
    '!js/**/*.min.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds - 90% across all metrics
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical modules
    './js/entities/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './js/systems/': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },

  // Coverage output configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/',
    '/assets/',
    '/docs/'
  ],

  // Test execution configuration
  verbose: true,
  silent: false,
  bail: false,
  maxWorkers: '50%',
  
  // Timeout configuration
  testTimeout: 10000,
  
  // Cache configuration for performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,

  // Error handling configuration
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/.git/'
  ],

  // Notification configuration
  notify: false,
  notifyMode: 'failure-change',

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Custom test result processor
  testResultsProcessor: '<rootDir>/tests/utils/testResultsProcessor.js',

  // Snapshot configuration
  snapshotSerializers: [
    '<rootDir>/tests/utils/canvasSnapshotSerializer.js'
  ],

  // Mock configuration
  unmockedModulePathPatterns: [
    '/node_modules/'
  ],

  // Performance and debugging
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: false,

  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/tests/setup/polyfills.js',
    '<rootDir>/tests/setup/canvasMock.js'
  ],

  // Test sequencer for deterministic test order
  testSequencer: '<rootDir>/tests/utils/testSequencer.js',

  // Global variables available in tests
  globals: {
    'GAME_VERSION': '1.15.0',
    'CANVAS_WIDTH': 800,
    'CANVAS_HEIGHT': 600,
    'DEBUG_MODE': false,
    'TEST_ENVIRONMENT': true
  },

  // Project configuration for multi-project setups
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/entities/**/*.test.js', '<rootDir>/tests/systems/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      testTimeout: 15000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'jsdom',
      testTimeout: 30000
    }
  ],

  // Dependency extraction configuration
  dependencyExtractor: '<rootDir>/tests/utils/dependencyExtractor.js',

  // Custom environment variables
  testEnvironmentVariables: {
    NODE_ENV: 'test',
    GAME_ENV: 'testing',
    LOG_LEVEL: 'error'
  }
};