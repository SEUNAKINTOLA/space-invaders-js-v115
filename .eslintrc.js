/**
 * ESLint Configuration for Space Invaders JS V115
 * 
 * This configuration provides comprehensive linting rules for a modern JavaScript
 * game development project with HTML5 Canvas. It enforces code quality standards,
 * ES6+ module syntax, and browser-specific best practices.
 * 
 * Key Features:
 * - ES2022 language features support
 * - Browser environment configuration
 * - ES6 module system support
 * - Game development specific rules
 * - Performance-focused linting
 * - Security-aware configurations
 * 
 * Architecture Decisions:
 * - Extends recommended ESLint rules for baseline quality
 * - Configures browser globals for Canvas API and game development
 * - Enables ES6 modules for modern JavaScript architecture
 * - Customizes rules for game loop patterns and performance
 * 
 * Usage:
 * - Automatically applied during development
 * - Integrated with CI/CD pipeline
 * - Supports IDE integration for real-time feedback
 * 
 * Dependencies:
 * - ESLint 8.x or higher
 * - Modern browser environment
 * - ES6 module support
 * 
 * @fileoverview ESLint configuration for Space Invaders game project
 * @version 1.0.0
 * @since 2025-01-11
 */

module.exports = {
  // Environment configuration for browser-based game development
  env: {
    browser: true,           // Enable browser global variables
    es2022: true,           // Enable ES2022 syntax and globals
    node: false,            // Disable Node.js globals (browser-only project)
    jest: true,             // Enable Jest testing framework globals
    worker: true            // Enable Web Worker globals for potential threading
  },

  // Extend recommended configurations for solid baseline
  extends: [
    'eslint:recommended'    // ESLint's recommended rule set
  ],

  // Parser options for modern JavaScript features
  parserOptions: {
    ecmaVersion: 2022,      // Support latest ECMAScript features
    sourceType: 'module',   // Enable ES6 module syntax
    ecmaFeatures: {
      impliedStrict: true   // Enable strict mode globally
    }
  },

  // Global variables specific to game development
  globals: {
    // HTML5 Canvas and WebGL globals
    CanvasRenderingContext2D: 'readonly',
    WebGLRenderingContext: 'readonly',
    WebGL2RenderingContext: 'readonly',
    ImageData: 'readonly',
    Path2D: 'readonly',
    
    // Performance and timing APIs
    performance: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    
    // Audio APIs for game sounds
    AudioContext: 'readonly',
    webkitAudioContext: 'readonly',
    
    // Touch and pointer events for mobile support
    TouchEvent: 'readonly',
    PointerEvent: 'readonly',
    
    // Game-specific globals (if any are added later)
    gameConfig: 'readonly'
  },

  // Custom rule configurations for game development
  rules: {
    // Code Quality Rules
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',        // Allow unused args prefixed with _
      varsIgnorePattern: '^_'         // Allow unused vars prefixed with _
    }],
    'no-console': 'warn',             // Warn on console usage (should use proper logging)
    'no-debugger': 'error',           // Prevent debugger statements in production
    'no-alert': 'error',              // Prevent alert/confirm/prompt usage
    
    // Performance Rules for Game Development
    'no-loop-func': 'error',          // Prevent function creation in loops
    'no-inner-declarations': 'error', // Prevent nested function declarations
    'prefer-const': 'error',          // Prefer const for immutable bindings
    'no-var': 'error',                // Require let/const instead of var
    
    // ES6+ Module Rules
    'import/no-unresolved': 'off',    // Disable for now (no import plugin)
    'no-duplicate-imports': 'error',  // Prevent duplicate imports
    
    // Code Style Rules
    'indent': ['error', 2, {          // 2-space indentation
      SwitchCase: 1,                  // Indent case statements
      ignoredNodes: ['TemplateLiteral'] // Ignore template literal indentation
    }],
    'quotes': ['error', 'single', {   // Single quotes preference
      avoidEscape: true,              // Allow double quotes to avoid escaping
      allowTemplateLiterals: true     // Allow template literals
    }],
    'semi': ['error', 'always'],      // Require semicolons
    'comma-dangle': ['error', 'never'], // No trailing commas
    'brace-style': ['error', '1tbs'], // One true brace style
    
    // Function and Method Rules
    'func-style': ['error', 'declaration', { // Prefer function declarations
      allowArrowFunctions: true       // Allow arrow functions for callbacks
    }],
    'arrow-spacing': 'error',         // Require spaces around arrow functions
    'no-confusing-arrow': 'error',    // Prevent confusing arrow function syntax
    
    // Object and Array Rules
    'object-curly-spacing': ['error', 'always'], // Spaces in object literals
    'array-bracket-spacing': ['error', 'never'], // No spaces in array brackets
    'computed-property-spacing': ['error', 'never'], // No spaces in computed properties
    
    // Comparison and Logic Rules
    'eqeqeq': ['error', 'always'],    // Require strict equality
    'no-implicit-coercion': 'error',  // Prevent implicit type coercion
    'no-unneeded-ternary': 'error',   // Prevent unnecessary ternary operators
    
    // Security Rules
    'no-eval': 'error',               // Prevent eval() usage
    'no-implied-eval': 'error',       // Prevent implied eval
    'no-new-func': 'error',           // Prevent Function constructor
    'no-script-url': 'error',         // Prevent javascript: URLs
    
    // Game Development Specific Rules
    'no-magic-numbers': ['warn', {    // Warn on magic numbers
      ignore: [0, 1, -1, 2, 60, 1000], // Common game values
      ignoreArrayIndexes: true,       // Allow array indexing
      enforceConst: true              // Suggest const for magic numbers
    }],
    
    // Error Handling Rules
    'no-throw-literal': 'error',      // Require Error objects for throwing
    'prefer-promise-reject-errors': 'error', // Require Error objects in Promise.reject
    
    // Complexity Rules
    'complexity': ['warn', 10],       // Warn on high cyclomatic complexity
    'max-depth': ['warn', 4],         // Warn on deep nesting
    'max-params': ['warn', 5],        // Warn on too many parameters
    'max-statements': ['warn', 20],   // Warn on too many statements per function
    
    // Documentation Rules
    'valid-jsdoc': ['warn', {         // Validate JSDoc comments
      requireReturn: false,           // Don't require @return for all functions
      requireParamDescription: true,  // Require parameter descriptions
      requireReturnDescription: true  // Require return descriptions when present
    }],
    'require-jsdoc': ['warn', {       // Require JSDoc for certain constructs
      require: {
        FunctionDeclaration: true,    // Require for function declarations
        MethodDefinition: true,       // Require for class methods
        ClassDeclaration: true        // Require for class declarations
      }
    }]
  },

  // Override rules for specific file patterns
  overrides: [
    {
      // Test files have relaxed rules
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-magic-numbers': 'off',    // Allow magic numbers in tests
        'max-statements': 'off',      // Allow longer test functions
        'require-jsdoc': 'off',       // Don't require JSDoc in tests
        'no-console': 'off'           // Allow console in tests
      }
    },
    {
      // Configuration files have different rules
      files: ['**/config/*.js', '**/*.config.js'],
      rules: {
        'no-magic-numbers': 'off',    // Allow magic numbers in config
        'require-jsdoc': 'off'        // Don't require JSDoc in config
      }
    },
    {
      // Game loop and animation files may need relaxed complexity rules
      files: ['**/game.js', '**/renderer.js', '**/systems/*.js'],
      rules: {
        'complexity': ['warn', 15],   // Higher complexity allowed for game systems
        'max-statements': ['warn', 30] // More statements allowed for game logic
      }
    }
  ],

  // Report unused disable directives
  reportUnusedDisableDirectives: true,

  // Additional settings for future extensibility
  settings: {
    // Placeholder for future plugin configurations
    'game-dev': {
      version: '1.0.0',
      canvas: true,
      webgl: true,
      audio: true
    }
  }
};