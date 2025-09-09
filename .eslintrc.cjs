module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'indent': 'off',
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-console': 'off',
        'no-unused-vars': 'off',
        'no-prototype-builtins': 'off'
    },
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/'
    ]
};