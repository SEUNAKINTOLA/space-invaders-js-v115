/**
 * Jest Configuration for Space Invaders JS V115
 * 
 * Comprehensive testing framework configuration optimized for HTML5 Canvas game development.
 * Provides DOM testing environment, coverage thresholds, module path mapping, and performance
 * optimizations for a modular JavaScript game architecture.
 * 
 * Key Features:
 * - DOM testing environment with JSDOM
 * - 90% coverage thresholds across all metrics
 * - Module path mapping for clean imports
 * - Canvas and WebGL API mocking
 * - Performance optimization settings
 * - Comprehensive test file patterns
 * 
 * Architecture Decisions:
 * - Uses JSDOM for browser environment simulation
 * - Separates unit, integration, and e2e test patterns
 * - Implements strict coverage requirements for production readiness
 * - Provides extensive setup for game-specific APIs
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

module.exports = {
  // Test Environment Configuration
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  },

  // Root Directory Configuration
  rootDir: '.',
  roots: ['<rootDir>/js', '<rootDir>/tests'],

  // Test File Patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // Module Path Mapping for Clean Imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@config/(.*)$': '<rootDir>/js/config/$1',
    '^@entities/(.*)$': '<rootDir>/js/entities/$1',
    '^@systems/(.*)$': '<rootDir>/js/systems/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1',
    '^@ui/(.*)$': '<rootDir>/js/ui/$1',
    '^@audio/(.*)$': '<rootDir>/js/audio/$1',
    '^@effects/(.*)$': '<rootDir>/js/effects/$1',
    '^@input/(.*)$': '<rootDir>/js/input/$1',
    '^@ai/(.*)$': '<rootDir>/js/ai/$1',
    '^@scoring/(.*)$': '<rootDir>/js/scoring/$1',
    '^@spatial/(.*)$': '<rootDir>/js/spatial/$1',
    '^@performance/(.*)$': '<rootDir>/js/performance/$1',
    '^@monitoring/(.*)$': '<rootDir>/js/monitoring/$1',
    '^@persistence/(.*)$': '<rootDir>/js/persistence/$1',
    '^@tutorial/(.*)$': '<rootDir>/js/tutorial/$1',
    '^@abilities/(.*)$': '<rootDir>/js/abilities/$1',
    '^@factories/(.*)$': '<rootDir>/js/factories/$1',
    '^@events/(.*)$': '<rootDir>/js/events/$1',
    
    // Asset Mocking
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|ogg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Setup Files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],

  // Transform Configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module File Extensions
  moduleFileExtensions: ['js', 'json'],

  // Coverage Configuration - Strict 90% Thresholds
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.config.js',
    '!js/**/*.min.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical modules
    'js/systems/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'js/entities/': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    },
    'js/utils/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Test Execution Configuration
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  
  // Performance Optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,

  // Error Handling
  errorOnDeprecated: true,
  bail: false,
  
  // Watch Mode Configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Global Variables for Game Testing
  globals: {
    'GAME_VERSION': '1.15.0',
    'DEVELOPMENT_MODE': true,
    'CANVAS_WIDTH': 800,
    'CANVAS_HEIGHT': 600,
    'FRAME_RATE': 60
  },

  // Test Categories Configuration
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js']
    },
    {
      displayName: 'systems',
      testMatch: ['<rootDir>/tests/systems/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'entities',
      testMatch: ['<rootDir>/tests/entities/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'ui',
      testMatch: ['<rootDir>/tests/ui/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'audio',
      testMatch: ['<rootDir>/tests/audio/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/audio.setup.js']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      testEnvironment: 'jsdom',
      testTimeout: 30000
    },
    {
      displayName: 'accessibility',
      testMatch: ['<rootDir>/tests/accessibility/**/*.test.js'],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'cross-platform',
      testMatch: ['<rootDir>/tests/cross-platform/**/*.test.js'],
      testEnvironment: 'jsdom'
    }
  ],

  // Reporter Configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Space Invaders JS Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Notification Configuration
  notify: true,
  notifyMode: 'failure-change',

  // Snapshot Configuration
  updateSnapshot: false,
  snapshotSerializers: [],

  // Custom Matchers and Extensions
  setupFiles: [
    '<rootDir>/tests/setup/canvas.mock.js',
    '<rootDir>/tests/setup/webgl.mock.js',
    '<rootDir>/tests/setup/audio.mock.js',
    '<rootDir>/tests/setup/performance.mock.js'
  ],

  // Test Result Processing
  testResultsProcessor: '<rootDir>/tests/processors/testResultsProcessor.js',

  // Ignore Patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/docs/'
  ],

  // Module Directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/js',
    '<rootDir>/tests'
  ],

  // Force Exit Configuration
  forceExit: false,
  detectOpenHandles: true,

  // Timing Configuration
  slowTestThreshold: 5,

  // Custom Environment Variables
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (compatible; SpaceInvadersTest/1.0)',
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously'
  }
};