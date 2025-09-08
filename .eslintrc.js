/**
 * ESLint Configuration for Space Invaders JS V115
 * 
 * This configuration provides comprehensive linting rules for a modern JavaScript
 * HTML5 Canvas game project with ES6 modules, browser environment support,
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
 * - Enforces consistent code style across the project
 * - Optimized for Canvas API and game loop patterns
 * - Supports modern JavaScript features for better performance
 * 
 * @version 1.0.0
 * @author Space Invaders Development Team
 * @since 2025-01-27
 */

module.exports = {
    // Environment Configuration
    env: {
        browser: true,      // Enable browser global variables (window, document, etc.)
        es2022: true,       // Enable ES2022 features (top-level await, class fields, etc.)
        node: false,        // Disable Node.js globals (not needed for browser game)
        jest: true,         // Enable Jest testing framework globals
        worker: true        // Enable Web Worker globals for potential background processing
    },

    // Parser Configuration
    parserOptions: {
        ecmaVersion: 2022,          // Support latest ECMAScript features
        sourceType: 'module',       // Enable ES6 modules (import/export)
        ecmaFeatures: {
            impliedStrict: true,    // Enable strict mode globally
            globalReturn: false     // Disallow return statements in global scope
        }
    },

    // Extends Configuration - Build upon recommended rules
    extends: [
        'eslint:recommended'        // Use ESLint's recommended rule set
    ],

    // Global Variables - Game-specific globals
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
        
        // Touch and pointer events for mobile support
        TouchEvent: 'readonly',
        PointerEvent: 'readonly',
        
        // Game development utilities
        ImageData: 'readonly',
        Path2D: 'readonly'
    },

    // Rule Configuration - Comprehensive code quality rules
    rules: {
        // === ERROR PREVENTION ===
        'no-console': 'warn',                    // Allow console for debugging but warn
        'no-debugger': 'error',                  // Prevent debugger statements in production
        'no-alert': 'error',                     // Prevent alert/confirm/prompt usage
        'no-eval': 'error',                      // Prevent eval() usage for security
        'no-implied-eval': 'error',              // Prevent implied eval (setTimeout with string)
        'no-new-func': 'error',                  // Prevent Function constructor
        'no-script-url': 'error',                // Prevent javascript: URLs
        
        // === VARIABLE MANAGEMENT ===
        'no-unused-vars': ['error', {           // Prevent unused variables
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
        
        // === CODE STYLE ===
        'indent': ['error', 4, {                // 4-space indentation
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
        'quotes': ['error', 'single', {         // Single quotes for strings
            avoidEscape: true,
            allowTemplateLiterals: true
        }],
        'semi': ['error', 'always'],            // Require semicolons
        'comma-dangle': ['error', 'never'],     // No trailing commas
        'brace-style': ['error', '1tbs', {      // One true brace style
            allowSingleLine: true
        }],
        
        // === SPACING AND FORMATTING ===
        'space-before-blocks': 'error',         // Space before blocks
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        'space-in-parens': ['error', 'never'],  // No spaces in parentheses
        'space-infix-ops': 'error',             // Spaces around operators
        'keyword-spacing': 'error',             // Spaces around keywords
        'comma-spacing': 'error',               // Spaces after commas
        'key-spacing': 'error',                 // Spaces around object keys
        'object-curly-spacing': ['error', 'always'], // Spaces in object literals
        'array-bracket-spacing': ['error', 'never'], // No spaces in arrays
        
        // === MODERN JAVASCRIPT ===
        'arrow-spacing': 'error',               // Spaces around arrow functions
        'prefer-arrow-callback': 'error',       // Prefer arrow functions for callbacks
        'prefer-template': 'error',             // Prefer template literals
        'template-curly-spacing': 'error',      // No spaces in template literals
        'object-shorthand': 'error',            // Use object shorthand
        'prefer-destructuring': ['error', {     // Prefer destructuring
            array: true,
            object: true
        }, {
            enforceForRenamedProperties: false
        }],
        
        // === PERFORMANCE OPTIMIZATIONS ===
        'no-loop-func': 'error',                // Prevent function creation in loops
        'no-new-object': 'error',               // Prefer {} over new Object()
        'no-new-array': 'error',                // Prefer [] over new Array()
        'no-new-wrappers': 'error',             // Prevent primitive wrapper constructors
        'prefer-spread': 'error',               // Prefer spread over .apply()
        'prefer-rest-params': 'error',          // Prefer rest parameters
        
        // === GAME DEVELOPMENT SPECIFIC ===
        'no-magic-numbers': ['warn', {          // Prevent magic numbers
            ignore: [0, 1, -1, 2, 60, 1000],   // Allow common game values
            ignoreArrayIndexes: true,
            enforceConst: true,
            detectObjects: false
        }],
        'consistent-return': 'error',           // Consistent return statements
        'default-case': 'error',                // Require default case in switch
        'eqeqeq': ['error', 'always'],          // Require strict equality
        'guard-for-in': 'error',                // Guard for-in loops
        'no-fallthrough': 'error',              // Prevent switch fallthrough
        
        // === ERROR HANDLING ===
        'no-throw-literal': 'error',            // Throw Error objects only
        'prefer-promise-reject-errors': 'error', // Reject with Error objects
        'no-return-await': 'error',             // Avoid unnecessary await
        
        // === ACCESSIBILITY ===
        'no-restricted-globals': ['error',      // Restrict problematic globals
            'event',                            // Use parameter instead
            'fdescribe',                        // Prevent focused tests
            'fit'                               // Prevent focused tests
        ],
        
        // === SECURITY ===
        'no-unsafe-negation': 'error',          // Prevent unsafe negation
        'use-isnan': 'error',                   // Use isNaN() for NaN checks
        'valid-typeof': 'error',                // Valid typeof comparisons
        'no-compare-neg-zero': 'error',         // Prevent comparison with -0
        'no-unsafe-finally': 'error',           // Prevent unsafe finally blocks
        
        // === DOCUMENTATION ===
        'valid-jsdoc': ['warn', {               // Validate JSDoc comments
            requireReturn: false,
            requireReturnDescription: false,
            requireParamDescription: true,
            prefer: {
                return: 'returns'
            }
        }],
        'require-jsdoc': ['warn', {             // Require JSDoc for functions
            require: {
                FunctionDeclaration: true,
                MethodDefinition: true,
                ClassDeclaration: true,
                ArrowFunctionExpression: false,
                FunctionExpression: false
            }
        }]
    },

    // Override rules for specific file patterns
    overrides: [
        {
            // Test files - more lenient rules
            files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
            env: {
                jest: true
            },
            rules: {
                'no-magic-numbers': 'off',       // Allow magic numbers in tests
                'max-lines-per-function': 'off', // Allow longer test functions
                'max-statements': 'off',         // Allow more statements in tests
                'prefer-arrow-callback': 'off'   // Allow function expressions in tests
            }
        },
        {
            // Configuration files - Node.js environment
            files: ['*.config.js', '.eslintrc.js'],
            env: {
                node: true,
                browser: false
            },
            rules: {
                'no-console': 'off'              // Allow console in config files
            }
        },
        {
            // Game entity files - allow more complex constructors
            files: ['**/entities/*.js'],
            rules: {
                'max-params': ['warn', 8],       // Allow more parameters for entity constructors
                'max-statements': ['warn', 25]   // Allow more statements for entity logic
            }
        },
        {
            // System files - allow higher complexity for game systems
            files: ['**/systems/*.js'],
            rules: {
                'complexity': ['warn', 15],      // Higher complexity for game systems
                'max-statements': ['warn', 30]   // More statements for system logic
            }
        }
    ],

    // Report unused disable directives
    reportUnusedDisableDirectives: true,

    // Settings for shared configurations
    settings: {
        // Future extension point for shared settings
        'space-invaders': {
            version: '1.15.0',
            target: 'browser',
            features: ['canvas', 'audio', 'touch']
        }
    }
};