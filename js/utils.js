/**
 * Utility functions for common game operations
 * 
 * This module provides essential utility functions for the Space Invaders game,
 * including canvas scaling, coordinate transformations, device detection,
 * and performance monitoring. All functions are designed to be pure and testable
 * where possible, with comprehensive error handling and validation.
 * 
 * Key Features:
 * - Canvas scaling and viewport management
 * - Coordinate system transformations
 * - Device and browser capability detection
 * - Performance monitoring utilities
 * - Mathematical helpers for game calculations
 * - Input validation and sanitization
 * 
 * @module utils
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Custom error class for utility-related errors
 */
export class UtilsError extends Error {
    constructor(message, code = 'UTILS_ERROR') {
        super(message);
        this.name = 'UtilsError';
        this.code = code;
        this.timestamp = Date.now();
    }
}

/**
 * Custom error class for canvas-related operations
 */
export class CanvasUtilsError extends UtilsError {
    constructor(message) {
        super(message, 'CANVAS_UTILS_ERROR');
        this.name = 'CanvasUtilsError';
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.frameRates = [];
        this.maxFrameRateHistory = 60;
    }

    /**
     * Start timing a performance metric
     * @param {string} name - Name of the metric
     */
    startTiming(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new UtilsError('Performance metric name must be a non-empty string');
        }
        
        this.startTimes.set(name, performance.now());
    }

    /**
     * End timing a performance metric and record the duration
     * @param {string} name - Name of the metric
     * @returns {number} Duration in milliseconds
     */
    endTiming(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new UtilsError('Performance metric name must be a non-empty string');
        }

        const startTime = this.startTimes.get(name);
        if (startTime === undefined) {
            throw new UtilsError(`No start time found for metric: ${name}`);
        }

        const duration = performance.now() - startTime;
        this.startTimes.delete(name);
        
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        this.metrics.get(name).push(duration);
        return duration;
    }

    /**
     * Update frame rate tracking
     * @param {number} currentTime - Current timestamp
     */
    updateFrameRate(currentTime) {
        if (typeof currentTime !== 'number' || currentTime < 0) {
            throw new UtilsError('Current time must be a non-negative number');
        }

        if (this.lastFrameTime > 0) {
            const deltaTime = currentTime - this.lastFrameTime;
            const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
            
            this.frameRates.push(fps);
            if (this.frameRates.length > this.maxFrameRateHistory) {
                this.frameRates.shift();
            }
        }
        
        this.lastFrameTime = currentTime;
        this.frameCount++;
    }

    /**
     * Get average frame rate
     * @returns {number} Average FPS
     */
    getAverageFrameRate() {
        if (this.frameRates.length === 0) return 0;
        
        const sum = this.frameRates.reduce((acc, fps) => acc + fps, 0);
        return sum / this.frameRates.length;
    }

    /**
     * Get performance metrics summary
     * @returns {Object} Metrics summary
     */
    getMetrics() {
        const summary = {};
        
        for (const [name, values] of this.metrics) {
            if (values.length > 0) {
                const sum = values.reduce((acc, val) => acc + val, 0);
                summary[name] = {
                    count: values.length,
                    average: sum / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    total: sum
                };
            }
        }
        
        summary.frameRate = {
            current: this.frameRates[this.frameRates.length - 1] || 0,
            average: this.getAverageFrameRate(),
            frameCount: this.frameCount
        };
        
        return summary;
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics.clear();
        this.startTimes.clear();
        this.frameRates.length = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
    }
}

/**
 * Canvas scaling and viewport utilities
 */
export class CanvasUtils {
    /**
     * Calculate optimal canvas scaling for responsive design
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {Object} options - Scaling options
     * @returns {Object} Scaling information
     */
    static calculateScaling(canvas, targetWidth, targetHeight, options = {}) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new CanvasUtilsError('Invalid canvas element provided');
        }
        
        if (typeof targetWidth !== 'number' || targetWidth <= 0) {
            throw new CanvasUtilsError('Target width must be a positive number');
        }
        
        if (typeof targetHeight !== 'number' || targetHeight <= 0) {
            throw new CanvasUtilsError('Target height must be a positive number');
        }

        const {
            maintainAspectRatio = true,
            maxScale = 3,
            minScale = 0.1,
            pixelRatio = window.devicePixelRatio || 1
        } = options;

        const container = canvas.parentElement;
        if (!container) {
            throw new CanvasUtilsError('Canvas must have a parent element');
        }

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        let scaleX = containerWidth / targetWidth;
        let scaleY = containerHeight / targetHeight;
        let scale = Math.min(scaleX, scaleY);

        if (maintainAspectRatio) {
            scaleX = scaleY = scale;
        }

        // Apply scale constraints
        scale = Math.max(minScale, Math.min(maxScale, scale));
        if (maintainAspectRatio) {
            scaleX = scaleY = scale;
        }

        const displayWidth = targetWidth * scaleX;
        const displayHeight = targetHeight * scaleY;
        const canvasWidth = displayWidth * pixelRatio;
        const canvasHeight = displayHeight * pixelRatio;

        return {
            scale,
            scaleX,
            scaleY,
            displayWidth,
            displayHeight,
            canvasWidth,
            canvasHeight,
            pixelRatio,
            offsetX: (containerWidth - displayWidth) / 2,
            offsetY: (containerHeight - displayHeight) / 2
        };
    }

    /**
     * Apply calculated scaling to canvas
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} scalingInfo - Scaling information from calculateScaling
     */
    static applyScaling(canvas, scalingInfo) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new CanvasUtilsError('Invalid canvas element provided');
        }

        if (!scalingInfo || typeof scalingInfo !== 'object') {
            throw new CanvasUtilsError('Invalid scaling information provided');
        }

        const {
            displayWidth,
            displayHeight,
            canvasWidth,
            canvasHeight,
            pixelRatio,
            offsetX,
            offsetY
        } = scalingInfo;

        // Set canvas internal size
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Set canvas display size
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        canvas.style.position = 'absolute';
        canvas.style.left = `${offsetX}px`;
        canvas.style.top = `${offsetY}px`;

        // Scale the drawing context
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(pixelRatio, pixelRatio);
        }
    }

    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} scalingInfo - Scaling information
     * @returns {Object} Canvas coordinates
     */
    static screenToCanvas(screenX, screenY, canvas, scalingInfo) {
        if (typeof screenX !== 'number' || typeof screenY !== 'number') {
            throw new CanvasUtilsError('Screen coordinates must be numbers');
        }

        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new CanvasUtilsError('Invalid canvas element provided');
        }

        const rect = canvas.getBoundingClientRect();
        const { scaleX, scaleY, offsetX, offsetY } = scalingInfo;

        const canvasX = (screenX - rect.left - offsetX) / scaleX;
        const canvasY = (screenY - rect.top - offsetY) / scaleY;

        return { x: canvasX, y: canvasY };
    }
}

/**
 * Device and browser detection utilities
 */
export class DeviceDetection {
    /**
     * Detect if device supports touch
     * @returns {boolean} True if touch is supported
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }

    /**
     * Detect if device is mobile
     * @returns {boolean} True if mobile device
     */
    static isMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipad', 'ipod', 
            'blackberry', 'windows phone', 'opera mini'
        ];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               (window.innerWidth <= 768 && this.isTouchDevice());
    }

    /**
     * Get device pixel ratio
     * @returns {number} Device pixel ratio
     */
    static getPixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * Detect browser capabilities
     * @returns {Object} Browser capabilities
     */
    static getBrowserCapabilities() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return {
            canvas2d: !!ctx,
            webgl: !!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl'),
            audioContext: !!(window.AudioContext || window.webkitAudioContext),
            localStorage: (() => {
                try {
                    const test = 'test';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch (e) {
                    return false;
                }
            })(),
            fullscreen: !!(document.fullscreenEnabled || 
                          document.webkitFullscreenEnabled || 
                          document.mozFullScreenEnabled),
            gamepad: !!navigator.getGamepads,
            vibration: !!navigator.vibrate,
            deviceOrientation: 'DeviceOrientationEvent' in window,
            requestAnimationFrame: !!window.requestAnimationFrame
        };
    }

    /**
     * Get viewport dimensions
     * @returns {Object} Viewport dimensions
     */
    static getViewportDimensions() {
        return {
            width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
            availableWidth: screen.availWidth,
            availableHeight: screen.availHeight,
            orientation: screen.orientation ? screen.orientation.angle : 0
        };
    }
}

/**
 * Mathematical utility functions
 */
export class MathUtils {
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            throw new UtilsError('All parameters must be numbers');
        }
        
        if (min > max) {
            throw new UtilsError('Minimum value cannot be greater than maximum value');
        }
        
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Linear interpolation between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(start, end, t) {
        if (typeof start !== 'number' || typeof end !== 'number' || typeof t !== 'number') {
            throw new UtilsError('All parameters must be numbers');
        }
        
        return start + (end - start) * this.clamp(t, 0, 1);
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    static distance(x1, y1, x2, y2) {
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
            typeof x2 !== 'number' || typeof y2 !== 'number') {
            throw new UtilsError('All coordinates must be numbers');
        }
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle between two points in radians
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Angle in radians
     */
    static angle(x1, y1, x2, y2) {
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
            typeof x2 !== 'number' || typeof y2 !== 'number') {
            throw new UtilsError('All coordinates must be numbers');
        }
        
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static degToRad(degrees) {
        if (typeof degrees !== 'number') {
            throw new UtilsError('Degrees must be a number');
        }
        
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    static radToDeg(radians) {
        if (typeof radians !== 'number') {
            throw new UtilsError('Radians must be a number');
        }
        
        return radians * (180 / Math.PI);
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    static random(min, max) {
        if (typeof min !== 'number' || typeof max !== 'number') {
            throw new UtilsError('Min and max must be numbers');
        }
        
        if (min > max) {
            throw new UtilsError('Minimum value cannot be greater than maximum value');
        }
        
        return Math.random() * (max - min) + min;
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    static randomInt(min, max) {
        if (typeof min !== 'number' || typeof max !== 'number') {
            throw new UtilsError('Min and max must be numbers');
        }
        
        if (!Number.isInteger(min) || !Number.isInteger(max)) {
            throw new UtilsError('Min and max must be integers');
        }
        
        if (min > max) {
            throw new UtilsError('Minimum value cannot be greater than maximum value');
        }
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

/**
 * Input validation utilities
 */
export class ValidationUtils {
    /**
     * Validate that a value is a number within specified range
     * @param {*} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {string} name - Name of the value for error messages
     * @returns {number} Validated number
     */
    static validateNumber(value, min = -Infinity, max = Infinity, name = 'value') {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new UtilsError(`${name} must be a valid number`);
        }
        
        if (value < min || value > max) {
            throw new UtilsError(`${name} must be between ${min} and ${max}`);
        }
        
        return value;
    }

    /**
     * Validate that a value is a non-empty string
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @returns {string} Validated string
     */
    static validateString(value, name = 'value') {
        if (typeof value !== 'string') {
            throw new UtilsError(`${name} must be a string`);
        }
        
        if (value.trim() === '') {
            throw new UtilsError(`${name} cannot be empty`);
        }
        
        return value;
    }

    /**
     * Validate that a value is a boolean
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @returns {boolean} Validated boolean
     */
    static validateBoolean(value, name = 'value') {
        if (typeof value !== 'boolean') {
            throw new UtilsError(`${name} must be a boolean`);
        }
        
        return value;
    }

    /**
     * Validate that a value is an object
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @returns {Object} Validated object
     */
    static validateObject(value, name = 'value') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new UtilsError(`${name} must be a valid object`);
        }
        
        return value;
    }

    /**
     * Validate that a value is an array
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @returns {Array} Validated array
     */
    static validateArray(value, name = 'value') {
        if (!Array.isArray(value)) {
            throw new UtilsError(`${name} must be an array`);
        }
        
        return value;
    }
}

/**
 * Timing and animation utilities
 */
export class TimingUtils {
    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        if (typeof func !== 'function') {
            throw new UtilsError('First parameter must be a function');
        }
        
        if (typeof delay !== 'number' || delay < 0) {
            throw new UtilsError('Delay must be a non-negative number');
        }
        
        let timeoutId;
        
        return function debounced(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Create a throttled function
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay) {
        if (typeof func !== 'function') {
            throw new UtilsError('First parameter must be a function');
        }
        
        if (typeof delay !== 'number' || delay < 0) {
            throw new UtilsError('Delay must be a non-negative number');
        }
        
        let lastCall = 0;
        
        return function throttled(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * Wait for a specified amount of time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after the delay
     */
    static wait(ms) {
        if (typeof ms !== 'number' || ms < 0) {
            throw new UtilsError('Wait time must be a non-negative number');
        }
        
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create an animation frame loop
     * @param {Function} callback - Function to call each frame
     * @returns {Function} Function to stop the loop
     */
    static createAnimationLoop(callback) {
        if (typeof callback !== 'function') {
            throw new UtilsError('Callback must be a function');
        }
        
        let animationId;
        let isRunning = false;
        
        const loop = (timestamp) => {
            if (isRunning) {
                callback(timestamp);
                animationId = requestAnimationFrame(loop);
            }
        };
        
        // Start the loop
        isRunning = true;
        animationId = requestAnimationFrame(loop);
        
        // Return stop function
        return () => {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Export all utility classes and functions
export {
    CanvasUtils,
    DeviceDetection,
    MathUtils,
    ValidationUtils,
    TimingUtils
};

// Default export with all utilities
export default {
    UtilsError,
    CanvasUtilsError,
    PerformanceMonitor,
    CanvasUtils,
    DeviceDetection,
    MathUtils,
    ValidationUtils,
    TimingUtils,
    performanceMonitor
};