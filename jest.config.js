/**
 * Jest Configuration for Space Invaders JS V115
 * 
 * Comprehensive testing framework configuration optimized for HTML5 Canvas game development.
 * Provides DOM testing environment, coverage thresholds, module path mapping, and performance
 * monitoring for a complete testing experience.
 * 
 * Key Features:
 * - DOM testing environment with JSDOM
 * - 90% coverage thresholds across all metrics
 * - Module path mapping for clean imports
 * - Canvas API mocking for game rendering tests
 * - Performance monitoring and memory leak detection
 * - Cross-platform compatibility testing
 * 
 * Architecture Decisions:
 * - Uses JSDOM for lightweight DOM simulation
 * - Separates unit and integration test patterns
 * - Implements custom matchers for game-specific assertions
 * - Provides comprehensive setup/teardown for canvas contexts
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
const config = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  
  // Test environment options for enhanced DOM simulation
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0 (compatible; Jest/29.0; +https://jestjs.io)',
    pretendToBeVisual: true,
    resources: 'usable'
  },

  // Root directory for tests and source files
  rootDir: '.',

  // Test file patterns
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
    '/.git/'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'html',
    'css'
  ],

  // Module path mapping for clean imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@js/(.*)$': '<rootDir>/js/$1',
    '^@css/(.*)$': '<rootDir>/css/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@config/(.*)$': '<rootDir>/js/config/$1',
    '^@entities/(.*)$': '<rootDir>/js/entities/$1',
    '^@systems/(.*)$': '<rootDir>/js/systems/$1',
    '^@input/(.*)$': '<rootDir>/js/input/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/global.setup.js',
  globalTeardown: '<rootDir>/tests/setup/global.teardown.js',

  // Coverage configuration with strict thresholds
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.config.js',
    '!js/**/*.min.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**'
  ],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage reporters for multiple output formats
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Strict coverage thresholds (90% across all metrics)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Specific thresholds for critical game systems
    'js/game.js': {
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
    },
    'js/entities/': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88
    }
  },

  // Transform configuration for different file types
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
    }],
    '^.+\\.css$': 'jest-css-modules-transform',
    '^.+\\.html$': 'html-loader-jest'
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    '/node_modules/(?!(module-to-transform)/)',
    '\\.pnp\\.[^\\/]+$'
  ],

  // Module directories for resolution
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Test timeout configuration
  testTimeout: 10000,

  // Verbose output for detailed test results
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,

  // Error handling configuration
  errorOnDeprecated: true,
  bail: false,
  maxWorkers: '50%',

  // Cache configuration for performance
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],

  // Notification configuration
  notify: false,
  notifyMode: 'failure-change',

  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'jest-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Space Invaders Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: false,
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],

  // Custom test sequencer for optimized test execution
  testSequencer: '<rootDir>/tests/utils/testSequencer.js',

  // Global variables available in tests
  globals: {
    'GAME_VERSION': '1.15.0',
    'TEST_ENVIRONMENT': 'jest',
    'CANVAS_WIDTH': 800,
    'CANVAS_HEIGHT': 600,
    'DEBUG_MODE': false
  },

  // Snapshot configuration
  snapshotSerializers: [
    'jest-serializer-html'
  ],

  // Custom matchers and utilities
  setupFiles: [
    '<rootDir>/tests/setup/polyfills.js',
    '<rootDir>/tests/setup/canvas-mock.js',
    '<rootDir>/tests/setup/performance-mock.js'
  ],

  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/tests/utils/testResultsProcessor.js',

  // Dependency extraction configuration
  dependencyExtractor: '<rootDir>/tests/utils/dependencyExtractor.js',

  // Haste configuration for module resolution
  haste: {
    computeSha1: true,
    throwOnModuleCollision: true
  },

  // Project-specific configuration
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
      testTimeout: 30000
    }
  ],

  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,
  logHeapUsage: true,

  // Advanced configuration for game testing
  extensionsToTreatAsEsm: [],
  
  // Custom environment variables
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
};

/**
 * Validates Jest configuration for completeness and correctness
 * @param {Object} config - Jest configuration object
 * @returns {boolean} - True if configuration is valid
 * @throws {Error} - If configuration is invalid
 */
function validateConfig(config) {
  const requiredFields = [
    'testEnvironment',
    'testMatch',
    'collectCoverage',
    'coverageThreshold'
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required Jest configuration field: ${field}`);
    }
  }

  // Validate coverage thresholds
  const { global } = config.coverageThreshold;
  const requiredMetrics = ['branches', 'functions', 'lines', 'statements'];
  
  for (const metric of requiredMetrics) {
    if (typeof global[metric] !== 'number' || global[metric] < 0 || global[metric] > 100) {
      throw new Error(`Invalid coverage threshold for ${metric}: must be a number between 0 and 100`);
    }
  }

  return true;
}

/**
 * Enhances configuration with environment-specific settings
 * @param {Object} baseConfig - Base Jest configuration
 * @returns {Object} - Enhanced configuration
 */
function enhanceConfigForEnvironment(baseConfig) {
  const environment = process.env.NODE_ENV || 'test';
  const isCI = process.env.CI === 'true';
  
  const enhancedConfig = { ...baseConfig };

  if (isCI) {
    // CI-specific optimizations
    enhancedConfig.maxWorkers = 2;
    enhancedConfig.cache = false;
    enhancedConfig.verbose = false;
    enhancedConfig.silent = true;
    enhancedConfig.coverageReporters = ['text', 'lcov', 'json'];
  }

  if (environment === 'development') {
    // Development-specific settings
    enhancedConfig.watchAll = false;
    enhancedConfig.notify = true;
    enhancedConfig.verbose = true;
  }

  return enhancedConfig;
}

// Validate configuration before export
try {
  validateConfig(config);
  console.log('✅ Jest configuration validated successfully');
} catch (error) {
  console.error('❌ Jest configuration validation failed:', error.message);
  process.exit(1);
}

// Export enhanced configuration
module.exports = enhanceConfigForEnvironment(config);

/**
 * Configuration metadata for documentation and tooling
 */
module.exports.metadata = {
  version: '1.0.0',
  description: 'Jest configuration for Space Invaders HTML5 Canvas game',
  author: 'Space Invaders Development Team',
  created: '2025-01-27',
  lastModified: '2025-01-27',
  compatibleJestVersions: ['^29.0.0'],
  requiredDependencies: [
    'jest',
    '@jest/types',
    'jest-environment-jsdom',
    'babel-jest',
    '@babel/preset-env',
    'jest-html-reporters',
    'jest-junit'
  ],
  optionalDependencies: [
    'jest-css-modules-transform',
    'html-loader-jest',
    'jest-serializer-html'
  ],
  supportedFeatures: [
    'DOM testing with JSDOM',
    'Canvas API mocking',
    'ES6+ syntax support',
    'CSS module transformation',
    'HTML file testing',
    'Coverage reporting',
    'Performance monitoring',
    'Memory leak detection',
    'Cross-platform compatibility'
  ]
};