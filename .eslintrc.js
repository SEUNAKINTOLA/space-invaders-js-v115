/**
 * ESLint Configuration for Space Invaders JS V115
 * 
 * This configuration provides comprehensive linting rules for a modern JavaScript
 * game development project with HTML5 Canvas. It enforces code quality standards,
 * ES6+ module support, and browser environment compatibility.
 * 
 * Key Features:
 * - ES2022 language features support
 * - Browser and Node.js environment compatibility
 * - Strict code quality rules with performance considerations
 * - Game development specific patterns
 * - Accessibility and security best practices
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

module.exports = {
  // Environment Configuration
  env: {
    browser: true,        // Enable browser global variables (window, document, etc.)
    es2022: true,        // Enable ES2022 syntax and globals
    node: true,          // Enable Node.js globals for build scripts
    jest: true,          // Enable Jest testing framework globals
    worker: true         // Enable Web Worker globals for performance optimization
  },

  // Parser Configuration
  parserOptions: {
    ecmaVersion: 2022,           // Support latest ECMAScript features
    sourceType: 'module',        // Enable ES6 modules
    ecmaFeatures: {
      impliedStrict: true,       // Enable strict mode globally
      globalReturn: false        // Disallow return statements in global scope
    }
  },

  // Extends Configuration - Layered approach for comprehensive coverage
  extends: [
    'eslint:recommended'         // ESLint's recommended rules as foundation
  ],

  // Global Variables - Game-specific globals
  globals: {
    // HTML5 Canvas and WebGL globals
    OffscreenCanvas: 'readonly',
    ImageBitmap: 'readonly',
    AudioContext: 'readonly',
    webkitAudioContext: 'readonly',
    
    // Performance and monitoring
    performance: 'readonly',
    requestIdleCallback: 'readonly',
    cancelIdleCallback: 'readonly',
    
    // Game development utilities
    gameConfig: 'writable',      // Global game configuration
    DEBUG_MODE: 'readonly'       // Debug flag for development
  },

  // Core Linting Rules - Comprehensive rule set for game development
  rules: {
    // === ERROR PREVENTION ===
    'no-console': ['warn', { 
      allow: ['warn', 'error', 'info'] // Allow logging but warn on console.log
    }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // === VARIABLE MANAGEMENT ===
    'no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true,
      argsIgnorePattern: '^_',     // Allow unused args prefixed with _
      varsIgnorePattern: '^_'      // Allow unused vars prefixed with _
    }],
    'no-undef': 'error',
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    'prefer-const': ['error', {
      destructuring: 'any',
      ignoreReadBeforeAssign: false
    }],
    'no-var': 'error',             // Enforce let/const over var
    
    // === FUNCTION QUALITY ===
    'complexity': ['warn', { max: 10 }], // Enforce cyclomatic complexity limit
    'max-depth': ['warn', { max: 4 }],   // Limit nesting depth
    'max-params': ['warn', { max: 5 }],  // Limit function parameters
    'max-lines-per-function': ['warn', {
      max: 100,
      skipBlankLines: true,
      skipComments: true
    }],
    
    // === CODE STYLE ===
    'indent': ['error', 2, {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      MemberExpression: 1,
      FunctionDeclaration: { parameters: 1, body: 1 },
      FunctionExpression: { parameters: 1, body: 1 },
      CallExpression: { arguments: 1 },
      ArrayExpression: 1,
      ObjectExpression: 1
    }],
    'quotes': ['error', 'single', {
      avoidEscape: true,
      allowTemplateLiterals: true
    }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    
    // === MODERN JAVASCRIPT ===
    'arrow-spacing': 'error',
    'template-curly-spacing': 'error',
    'object-shorthand': ['error', 'always'],
    'prefer-arrow-callback': ['error', {
      allowNamedFunctions: false,
      allowUnboundThis: true
    }],
    'prefer-template': 'error',
    'prefer-destructuring': ['error', {
      array: true,
      object: true
    }, {
      enforceForRenamedProperties: false
    }],
    
    // === ASYNC/AWAIT PATTERNS ===
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-promise-executor-return': 'error',
    
    // === PERFORMANCE CONSIDERATIONS ===
    'no-loop-func': 'error',        // Prevent function creation in loops
    'no-new-object': 'error',       // Prefer object literals
    'no-array-constructor': 'error', // Prefer array literals
    'no-new-wrappers': 'error',     // Avoid primitive wrapper constructors
    
    // === SECURITY ===
    'no-script-url': 'error',       // Prevent javascript: URLs
    'no-octal-escape': 'error',     // Prevent octal escape sequences
    'no-new-require': 'error',      // Prevent new require()
    
    // === GAME DEVELOPMENT SPECIFIC ===
    'no-magic-numbers': ['warn', {
      ignore: [-1, 0, 1, 2, 60, 1000], // Common game values
      ignoreArrayIndexes: true,
      enforceConst: true,
      detectObjects: false
    }],
    
    // === ACCESSIBILITY ===
    'no-restricted-globals': ['error',
      'event',    // Use parameter instead of global event
      'fdescribe', // Prevent focused tests
      'fit'       // Prevent focused tests
    ],
    
    // === ERROR HANDLING ===
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    
    // === DOCUMENTATION ===
    'valid-jsdoc': ['warn', {
      requireReturn: false,
      requireReturnDescription: false,
      requireParamDescription: true,
      prefer: {
        return: 'returns',
        arg: 'param',
        argument: 'param'
      }
    }],
    
    // === SPACING AND FORMATTING ===
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'space-in-parens': ['error', 'never'],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // === LINE LENGTH AND STRUCTURE ===
    'max-len': ['warn', {
      code: 100,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      ignoreComments: true
    }],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', {
      max: 2,
      maxEOF: 1,
      maxBOF: 0
    }]
  },

  // Override rules for specific file patterns
  overrides: [
    {
      // Test files - More lenient rules
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      rules: {
        'no-magic-numbers': 'off',     // Allow magic numbers in tests
        'max-lines-per-function': 'off', // Allow longer test functions
        'prefer-arrow-callback': 'off'  // Allow function expressions in tests
      }
    },
    {
      // Configuration files - Node.js specific
      files: ['*.config.js', 'scripts/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'off'            // Allow console in build scripts
      }
    },
    {
      // Game engine core files - Performance critical
      files: ['js/game.js', 'js/renderer.js', 'js/systems/**/*.js'],
      rules: {
        'complexity': ['error', { max: 15 }], // Allow higher complexity for core systems
        'max-lines-per-function': ['warn', { max: 150 }] // Allow longer functions for performance
      }
    }
  ],

  // Settings for additional configurations
  settings: {
    // Future extension point for additional linting tools
    'import/resolver': {
      node: {
        extensions: ['.js', '.json']
      }
    }
  },

  // Report unused disable directives
  reportUnusedDisableDirectives: true,

  // Ignore patterns (handled by .eslintignore, but defined here for completeness)
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js'
  ]
};