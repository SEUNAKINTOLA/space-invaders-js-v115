/**
 * ESLint Configuration for Space Invaders JS V115
 * 
 * This configuration provides comprehensive linting rules for a modern JavaScript
 * HTML5 Canvas game project with ES6+ modules, browser environment support,
 * and strict code quality standards.
 * 
 * Key Features:
 * - ES2022 language features support
 * - Browser and ES6 module environment
 * - Strict code quality rules with performance focus
 * - Game development specific configurations
 * - Accessibility and security best practices
 * 
 * Architecture Decisions:
 * - Uses ESLint recommended rules as baseline
 * - Enforces consistent code style for team collaboration
 * - Optimizes for browser performance and memory management
 * - Supports modern JavaScript features used in game development
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

module.exports = {
    // Environment configuration for browser-based game development
    env: {
        browser: true,        // Enable browser global variables (window, document, etc.)
        es2022: true,        // Enable ES2022 syntax and globals
        node: false,         // Disable Node.js globals (browser-only project)
        jest: true,          // Enable Jest testing framework globals
        worker: true         // Enable Web Worker globals for potential background processing
    },

    // Parser and module system configuration
    parserOptions: {
        ecmaVersion: 2022,           // Support latest ECMAScript features
        sourceType: 'module',        // Enable ES6 module imports/exports
        ecmaFeatures: {
            impliedStrict: true,     // Enable strict mode globally
            globalReturn: false      // Disallow return statements in global scope
        }
    },

    // Extend recommended configurations
    extends: [
        'eslint:recommended'         // Use ESLint's recommended rule set
    ],

    // Global variables specific to game development
    globals: {
        // Canvas and WebGL contexts
        CanvasRenderingContext2D: 'readonly',
        WebGLRenderingContext: 'readonly',
        WebGL2RenderingContext: 'readonly',
        
        // Performance and timing APIs
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        
        // Audio APIs for game sounds
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',
        
        // Game-specific globals (if any are added later)
        GAME_VERSION: 'readonly',
        DEBUG_MODE: 'readonly'
    },

    // Comprehensive rule configuration for code quality and performance
    rules: {
        // === ERROR PREVENTION ===
        'no-console': 'warn',                    // Allow console for debugging but warn
        'no-debugger': 'error',                  // Prevent debugger statements in production
        'no-alert': 'error',                     // Prevent alert/confirm/prompt usage
        'no-eval': 'error',                      // Prevent eval() for security
        'no-implied-eval': 'error',              // Prevent implied eval
        'no-new-func': 'error',                  // Prevent Function constructor
        'no-script-url': 'error',                // Prevent javascript: URLs
        
        // === VARIABLE MANAGEMENT ===
        'no-unused-vars': ['error', {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
            argsIgnorePattern: '^_'              // Allow unused args starting with _
        }],
        'no-undef': 'error',                     // Prevent undefined variables
        'no-global-assign': 'error',             // Prevent assignment to global variables
        'no-implicit-globals': 'error',          // Prevent implicit global variables
        'prefer-const': 'error',                 // Prefer const for non-reassigned variables
        'no-var': 'error',                       // Prefer let/const over var
        
        // === FUNCTION QUALITY ===
        'complexity': ['warn', 10],              // Limit cyclomatic complexity
        'max-depth': ['warn', 4],                // Limit nesting depth
        'max-params': ['warn', 5],               // Limit function parameters
        'max-statements': ['warn', 20],          // Limit statements per function
        'max-lines-per-function': ['warn', 50], // Limit function length
        
        // === CODE STYLE AND CONSISTENCY ===
        'indent': ['error', 4, {                 // 4-space indentation
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            MemberExpression: 1,
            FunctionDeclaration: { parameters: 1, body: 1 },
            FunctionExpression: { parameters: 1, body: 1 },
            CallExpression: { arguments: 1 },
            ArrayExpression: 1,
            ObjectExpression: 1,
            ImportDeclaration: 1,
            flatTernaryExpressions: false,
            ignoreComments: false
        }],
        'quotes': ['error', 'single', {          // Single quotes for strings
            avoidEscape: true,
            allowTemplateLiterals: true
        }],
        'semi': ['error', 'always'],             // Require semicolons
        'comma-dangle': ['error', 'never'],      // No trailing commas
        'brace-style': ['error', '1tbs', {       // One true brace style
            allowSingleLine: true
        }],
        
        // === SPACING AND FORMATTING ===
        'space-before-blocks': 'error',          // Space before blocks
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        'space-in-parens': ['error', 'never'],   // No spaces in parentheses
        'space-infix-ops': 'error',              // Spaces around operators
        'keyword-spacing': 'error',              // Spaces around keywords
        'comma-spacing': 'error',                // Spaces after commas
        'key-spacing': 'error',                  // Spaces around object keys
        'object-curly-spacing': ['error', 'always'], // Spaces in object literals
        'array-bracket-spacing': ['error', 'never'], // No spaces in arrays
        
        // === MODERN JAVASCRIPT FEATURES ===
        'arrow-spacing': 'error',                // Spaces around arrow functions
        'prefer-arrow-callback': 'error',        // Prefer arrow functions for callbacks
        'prefer-template': 'error',              // Prefer template literals
        'template-curly-spacing': 'error',       // No spaces in template literals
        'object-shorthand': 'error',             // Use object shorthand
        'prefer-destructuring': ['error', {      // Prefer destructuring
            array: true,
            object: true
        }, {
            enforceForRenamedProperties: false
        }],
        
        // === PERFORMANCE OPTIMIZATIONS ===
        'no-loop-func': 'error',                 // Prevent functions in loops
        'no-inner-declarations': 'error',        // Prevent inner function declarations
        'no-new-object': 'error',                // Prefer object literals
        'no-array-constructor': 'error',         // Prefer array literals
        'no-new-wrappers': 'error',              // Prevent primitive wrapper constructors
        
        // === GAME DEVELOPMENT SPECIFIC ===
        'no-magic-numbers': ['warn', {           // Discourage magic numbers
            ignore: [-1, 0, 1, 2, 60, 1000],    // Common game values allowed
            ignoreArrayIndexes: true,
            enforceConst: true,
            detectObjects: false
        }],
        'consistent-return': 'error',            // Consistent return statements
        'default-case': 'error',                 // Require default case in switch
        'eqeqeq': 'error',                       // Require strict equality
        'no-fallthrough': 'error',               // Prevent switch fallthrough
        
        // === ERROR HANDLING ===
        'no-throw-literal': 'error',             // Throw Error objects only
        'no-return-assign': 'error',             // Prevent assignment in return
        'no-unreachable': 'error',               // Prevent unreachable code
        'no-duplicate-case': 'error',            // Prevent duplicate switch cases
        
        // === ACCESSIBILITY AND USABILITY ===
        'no-empty': 'error',                     // Prevent empty blocks
        'no-extra-semi': 'error',                // Remove extra semicolons
        'no-irregular-whitespace': 'error',      // Prevent irregular whitespace
        'no-multiple-empty-lines': ['error', {   // Limit empty lines
            max: 2,
            maxEOF: 1,
            maxBOF: 0
        }],
        'eol-last': 'error',                     // Require newline at end of file
        'no-trailing-spaces': 'error'            // Remove trailing whitespace
    },

    // Override rules for specific file patterns
    overrides: [
        {
            // Test files can have more relaxed rules
            files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
            rules: {
                'no-magic-numbers': 'off',       // Allow magic numbers in tests
                'max-lines-per-function': 'off', // Allow longer test functions
                'max-statements': 'off'          // Allow more statements in tests
            }
        },
        {
            // Configuration files
            files: ['*.config.js', '.eslintrc.js'],
            env: {
                node: true                       // Enable Node.js for config files
            },
            rules: {
                'no-magic-numbers': 'off'        // Allow magic numbers in config
            }
        },
        {
            // Game entity files may need more complex logic
            files: ['**/entities/**/*.js', '**/systems/**/*.js'],
            rules: {
                'complexity': ['warn', 15],      // Allow higher complexity for game logic
                'max-statements': ['warn', 30]   // Allow more statements for game entities
            }
        }
    ],

    // Report unused eslint-disable comments
    reportUnusedDisableDirectives: true,

    // Additional settings for enhanced linting
    settings: {
        // Future extension point for additional linting tools
        'html/html-extensions': ['.html'],       // HTML file extensions
        'html/xml-extensions': ['.xml']          // XML file extensions
    }
};