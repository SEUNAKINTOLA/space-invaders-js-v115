/**
 * Utility functions for common game operations
 * 
 * This module provides essential utility functions for the Space Invaders game,
 * including canvas scaling, coordinate transformations, device detection,
 * and performance monitoring. All functions are designed to be pure and testable
 * where possible, with comprehensive error handling and input validation.
 * 
 * Key Features:
 * - Canvas scaling and viewport management
 * - Coordinate system transformations
 * - Device and browser capability detection
 * - Performance monitoring utilities
 * - Mathematical helpers for game physics
 * - Input validation and sanitization
 * 
 * @module utils
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Custom error class for utility function errors
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
 * Custom error for canvas-related operations
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
        this.fps = 0;
        this.fpsHistory = [];
        this.maxHistorySize = 60; // Keep 1 second of history at 60fps
    }

    /**
     * Start timing a performance metric
     * @param {string} name - Name of the metric
     */
    startTimer(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new UtilsError('Timer name must be a non-empty string');
        }
        this.startTimes.set(name, performance.now());
    }

    /**
     * End timing a performance metric and record the duration
     * @param {string} name - Name of the metric
     * @returns {number} Duration in milliseconds
     */
    endTimer(name) {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new UtilsError('Timer name must be a non-empty string');
        }

        const startTime = this.startTimes.get(name);
        if (startTime === undefined) {
            throw new UtilsError(`Timer '${name}' was not started`);
        }

        const duration = performance.now() - startTime;
        this.startTimes.delete(name);
        
        // Store metric with history
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const history = this.metrics.get(name);
        history.push(duration);
        
        // Keep only recent history
        if (history.length > this.maxHistorySize) {
            history.shift();
        }

        return duration;
    }

    /**
     * Update FPS calculation
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            return;
        }

        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.frameCount++;

        if (deltaTime > 0) {
            const currentFPS = 1000 / deltaTime;
            this.fpsHistory.push(currentFPS);
            
            if (this.fpsHistory.length > this.maxHistorySize) {
                this.fpsHistory.shift();
            }

            // Calculate average FPS
            this.fps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
        }
    }

    /**
     * Get average duration for a metric
     * @param {string} name - Name of the metric
     * @returns {number} Average duration in milliseconds
     */
    getAverageMetric(name) {
        const history = this.metrics.get(name);
        if (!history || history.length === 0) {
            return 0;
        }
        return history.reduce((sum, value) => sum + value, 0) / history.length;
    }

    /**
     * Get current FPS
     * @returns {number} Current FPS
     */
    getFPS() {
        return Math.round(this.fps);
    }

    /**
     * Get performance summary
     * @returns {Object} Performance metrics summary
     */
    getSummary() {
        const summary = {
            fps: this.getFPS(),
            frameCount: this.frameCount,
            metrics: {}
        };

        for (const [name, history] of this.metrics) {
            if (history.length > 0) {
                summary.metrics[name] = {
                    average: this.getAverageMetric(name),
                    min: Math.min(...history),
                    max: Math.max(...history),
                    samples: history.length
                };
            }
        }

        return summary;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.startTimes.clear();
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.fpsHistory = [];
    }
}

/**
 * Canvas scaling and viewport utilities
 */
export class CanvasUtils {
    /**
     * Calculate optimal canvas scaling to fit within container while maintaining aspect ratio
     * @param {number} canvasWidth - Original canvas width
     * @param {number} canvasHeight - Original canvas height
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @returns {Object} Scaling information
     */
    static calculateScaling(canvasWidth, canvasHeight, containerWidth, containerHeight) {
        // Input validation
        const inputs = [canvasWidth, canvasHeight, containerWidth, containerHeight];
        if (inputs.some(val => typeof val !== 'number' || val <= 0 || !isFinite(val))) {
            throw new CanvasUtilsError('All dimensions must be positive finite numbers');
        }

        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = canvasWidth * scale;
        const scaledHeight = canvasHeight * scale;

        const offsetX = (containerWidth - scaledWidth) / 2;
        const offsetY = (containerHeight - scaledHeight) / 2;

        return {
            scale,
            scaledWidth,
            scaledHeight,
            offsetX,
            offsetY,
            scaleX,
            scaleY
        };
    }

    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {Object} scaling - Scaling information from calculateScaling
     * @returns {Object} Canvas coordinates
     */
    static screenToCanvas(screenX, screenY, scaling) {
        if (typeof screenX !== 'number' || typeof screenY !== 'number') {
            throw new CanvasUtilsError('Screen coordinates must be numbers');
        }

        if (!scaling || typeof scaling.scale !== 'number' || typeof scaling.offsetX !== 'number' || typeof scaling.offsetY !== 'number') {
            throw new CanvasUtilsError('Invalid scaling object provided');
        }

        const canvasX = (screenX - scaling.offsetX) / scaling.scale;
        const canvasY = (screenY - scaling.offsetY) / scaling.scale;

        return { x: canvasX, y: canvasY };
    }

    /**
     * Convert canvas coordinates to screen coordinates
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @param {Object} scaling - Scaling information from calculateScaling
     * @returns {Object} Screen coordinates
     */
    static canvasToScreen(canvasX, canvasY, scaling) {
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number') {
            throw new CanvasUtilsError('Canvas coordinates must be numbers');
        }

        if (!scaling || typeof scaling.scale !== 'number' || typeof scaling.offsetX !== 'number' || typeof scaling.offsetY !== 'number') {
            throw new CanvasUtilsError('Invalid scaling object provided');
        }

        const screenX = canvasX * scaling.scale + scaling.offsetX;
        const screenY = canvasY * scaling.scale + scaling.offsetY;

        return { x: screenX, y: screenY };
    }

    /**
     * Get device pixel ratio for high-DPI displays
     * @returns {number} Device pixel ratio
     */
    static getDevicePixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * Setup canvas for high-DPI displays
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} width - Logical width
     * @param {number} height - Logical height
     * @returns {Object} Canvas context and scaling info
     */
    static setupHighDPICanvas(canvas, width, height) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new CanvasUtilsError('First argument must be a canvas element');
        }

        if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
            throw new CanvasUtilsError('Width and height must be positive numbers');
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new CanvasUtilsError('Could not get 2D rendering context');
        }

        const devicePixelRatio = this.getDevicePixelRatio();
        
        // Set actual size in memory (scaled to account for extra pixel density)
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        
        // Scale the canvas back down using CSS
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        ctx.scale(devicePixelRatio, devicePixelRatio);

        return {
            context: ctx,
            devicePixelRatio,
            logicalWidth: width,
            logicalHeight: height,
            actualWidth: canvas.width,
            actualHeight: canvas.height
        };
    }
}

/**
 * Device and browser detection utilities
 */
export class DeviceDetection {
    /**
     * Check if the device is mobile
     * @returns {boolean} True if mobile device
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if the device is a tablet
     * @returns {boolean} True if tablet device
     */
    static isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    /**
     * Check if the device supports touch
     * @returns {boolean} True if touch is supported
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }

    /**
     * Get screen orientation
     * @returns {string} 'portrait' or 'landscape'
     */
    static getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
        }
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    /**
     * Check if device is in landscape mode
     * @returns {boolean} True if in landscape mode
     */
    static isLandscape() {
        return this.getOrientation() === 'landscape';
    }

    /**
     * Get viewport dimensions
     * @returns {Object} Viewport width and height
     */
    static getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Check browser capabilities
     * @returns {Object} Browser capability information
     */
    static getBrowserCapabilities() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return {
            canvas2D: !!ctx,
            webGL: !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
            localStorage: typeof Storage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
            devicePixelRatio: window.devicePixelRatio || 1,
            touch: this.isTouchDevice(),
            mobile: this.isMobile(),
            tablet: this.isTablet()
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
            throw new UtilsError('All arguments must be numbers');
        }
        if (min > max) {
            throw new UtilsError('Min value cannot be greater than max value');
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
            throw new UtilsError('All arguments must be numbers');
        }
        return start + (end - start) * this.clamp(t, 0, 1);
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance between points
     */
    static distance(x1, y1, x2, y2) {
        const inputs = [x1, y1, x2, y2];
        if (inputs.some(val => typeof val !== 'number')) {
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
        const inputs = [x1, y1, x2, y2];
        if (inputs.some(val => typeof val !== 'number')) {
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
     * Generate a random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    static random(min, max) {
        if (typeof min !== 'number' || typeof max !== 'number') {
            throw new UtilsError('Min and max must be numbers');
        }
        if (min > max) {
            throw new UtilsError('Min value cannot be greater than max value');
        }
        return Math.random() * (max - min) + min;
    }

    /**
     * Generate a random integer between min and max (inclusive)
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
            throw new UtilsError('Min value cannot be greater than max value');
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

/**
 * Input validation utilities
 */
export class ValidationUtils {
    /**
     * Validate that a value is a number within a range
     * @param {*} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {string} name - Name of the value for error messages
     * @returns {number} Validated number
     */
    static validateNumber(value, min = -Infinity, max = Infinity, name = 'value') {
        if (typeof value !== 'number' || !isFinite(value)) {
            throw new UtilsError(`${name} must be a finite number`);
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
            throw new UtilsError(`${name} must be an object`);
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
     * Create a debounced function that delays execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        if (typeof func !== 'function') {
            throw new UtilsError('First argument must be a function');
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
     * Create a throttled function that limits execution frequency
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        if (typeof func !== 'function') {
            throw new UtilsError('First argument must be a function');
        }
        if (typeof limit !== 'number' || limit < 0) {
            throw new UtilsError('Limit must be a non-negative number');
        }

        let inThrottle;
        return function throttled(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
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
     * Get current timestamp in milliseconds
     * @returns {number} Current timestamp
     */
    static now() {
        return performance.now();
    }
}

// Create singleton instances for global use
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
    PerformanceMonitor,
    CanvasUtils,
    DeviceDetection,
    MathUtils,
    ValidationUtils,
    TimingUtils,
    performanceMonitor,
    UtilsError,
    CanvasUtilsError
};