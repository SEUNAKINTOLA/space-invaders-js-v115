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
 * - Mathematical helpers for game calculations
 * - Input validation and sanitization
 * 
 * @module utils
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Custom error class for utility function errors
 */
class UtilsError extends Error {
    constructor(message, code = 'UTILS_ERROR') {
        super(message);
        this.name = 'UtilsError';
        this.code = code;
        this.timestamp = Date.now();
    }
}

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
        this.isSupported = typeof performance !== 'undefined' && performance.now;
    }

    /**
     * Start timing an operation
     * @param {string} label - Unique identifier for the operation
     */
    startTimer(label) {
        if (!this.isSupported) return;
        
        if (typeof label !== 'string' || label.trim() === '') {
            throw new UtilsError('Timer label must be a non-empty string', 'INVALID_LABEL');
        }

        this.startTimes.set(label, performance.now());
    }

    /**
     * End timing an operation and record the duration
     * @param {string} label - Unique identifier for the operation
     * @returns {number} Duration in milliseconds
     */
    endTimer(label) {
        if (!this.isSupported) return 0;

        const startTime = this.startTimes.get(label);
        if (startTime === undefined) {
            throw new UtilsError(`No timer found for label: ${label}`, 'TIMER_NOT_FOUND');
        }

        const duration = performance.now() - startTime;
        this.startTimes.delete(label);
        
        // Store metric
        if (!this.metrics.has(label)) {
            this.metrics.set(label, []);
        }
        this.metrics.get(label).push(duration);

        return duration;
    }

    /**
     * Get average duration for a metric
     * @param {string} label - Metric label
     * @returns {number} Average duration in milliseconds
     */
    getAverageTime(label) {
        const times = this.metrics.get(label);
        if (!times || times.length === 0) return 0;
        
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
        this.startTimes.clear();
    }
}

/**
 * Device and browser detection utilities
 */
class DeviceDetector {
    constructor() {
        this.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        this.platform = typeof navigator !== 'undefined' ? navigator.platform : '';
        this._cache = new Map();
    }

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobile() {
        if (this._cache.has('isMobile')) {
            return this._cache.get('isMobile');
        }

        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const result = mobileRegex.test(this.userAgent);
        this._cache.set('isMobile', result);
        return result;
    }

    /**
     * Check if device is tablet
     * @returns {boolean} True if tablet device
     */
    isTablet() {
        if (this._cache.has('isTablet')) {
            return this._cache.get('isTablet');
        }

        const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)|Android/i;
        const result = tabletRegex.test(this.userAgent) && !this.isMobile();
        this._cache.set('isTablet', result);
        return result;
    }

    /**
     * Check if device supports touch
     * @returns {boolean} True if touch is supported
     */
    isTouchDevice() {
        if (this._cache.has('isTouchDevice')) {
            return this._cache.get('isTouchDevice');
        }

        const result = typeof window !== 'undefined' && (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
        this._cache.set('isTouchDevice', result);
        return result;
    }

    /**
     * Get device pixel ratio
     * @returns {number} Device pixel ratio
     */
    getPixelRatio() {
        if (this._cache.has('pixelRatio')) {
            return this._cache.get('pixelRatio');
        }

        const ratio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        this._cache.set('pixelRatio', ratio);
        return ratio;
    }

    /**
     * Get viewport dimensions
     * @returns {{width: number, height: number}} Viewport dimensions
     */
    getViewportSize() {
        if (typeof window === 'undefined') {
            return { width: 800, height: 600 };
        }

        return {
            width: window.innerWidth || document.documentElement.clientWidth || 800,
            height: window.innerHeight || document.documentElement.clientHeight || 600
        };
    }
}

/**
 * Canvas scaling and viewport utilities
 */
class CanvasScaler {
    /**
     * Scale canvas to fit container while maintaining aspect ratio
     * @param {HTMLCanvasElement} canvas - Canvas element to scale
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {boolean} maintainAspectRatio - Whether to maintain aspect ratio
     * @returns {{scaleX: number, scaleY: number, offsetX: number, offsetY: number}}
     */
    static scaleToFit(canvas, targetWidth, targetHeight, maintainAspectRatio = true) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new UtilsError('First parameter must be a canvas element', 'INVALID_CANVAS');
        }

        if (typeof targetWidth !== 'number' || targetWidth <= 0) {
            throw new UtilsError('Target width must be a positive number', 'INVALID_WIDTH');
        }

        if (typeof targetHeight !== 'number' || targetHeight <= 0) {
            throw new UtilsError('Target height must be a positive number', 'INVALID_HEIGHT');
        }

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        if (canvasWidth === 0 || canvasHeight === 0) {
            throw new UtilsError('Canvas dimensions cannot be zero', 'ZERO_CANVAS_SIZE');
        }

        let scaleX = targetWidth / canvasWidth;
        let scaleY = targetHeight / canvasHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (maintainAspectRatio) {
            const scale = Math.min(scaleX, scaleY);
            scaleX = scaleY = scale;
            
            // Center the canvas
            offsetX = (targetWidth - canvasWidth * scale) / 2;
            offsetY = (targetHeight - canvasHeight * scale) / 2;
        }

        return { scaleX, scaleY, offsetX, offsetY };
    }

    /**
     * Set up high DPI canvas rendering
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Logical width
     * @param {number} height - Logical height
     */
    static setupHighDPI(canvas, ctx, width, height) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new UtilsError('First parameter must be a canvas element', 'INVALID_CANVAS');
        }

        if (!ctx || typeof ctx.scale !== 'function') {
            throw new UtilsError('Second parameter must be a valid canvas context', 'INVALID_CONTEXT');
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        const backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                                 ctx.mozBackingStorePixelRatio ||
                                 ctx.msBackingStorePixelRatio ||
                                 ctx.oBackingStorePixelRatio ||
                                 ctx.backingStorePixelRatio || 1;

        const ratio = devicePixelRatio / backingStoreRatio;

        if (devicePixelRatio !== backingStoreRatio) {
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(ratio, ratio);
        } else {
            canvas.width = width;
            canvas.height = height;
        }

        return ratio;
    }
}

/**
 * Coordinate transformation utilities
 */
class CoordinateTransformer {
    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {{scaleX: number, scaleY: number, offsetX: number, offsetY: number}} transform - Transform data
     * @returns {{x: number, y: number}} Canvas coordinates
     */
    static screenToCanvas(screenX, screenY, canvas, transform = null) {
        if (typeof screenX !== 'number' || typeof screenY !== 'number') {
            throw new UtilsError('Screen coordinates must be numbers', 'INVALID_COORDINATES');
        }

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new UtilsError('Canvas parameter must be a canvas element', 'INVALID_CANVAS');
        }

        const rect = canvas.getBoundingClientRect();
        let x = screenX - rect.left;
        let y = screenY - rect.top;

        if (transform) {
            x = (x - transform.offsetX) / transform.scaleX;
            y = (y - transform.offsetY) / transform.scaleY;
        }

        return { x, y };
    }

    /**
     * Convert canvas coordinates to screen coordinates
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {{scaleX: number, scaleY: number, offsetX: number, offsetY: number}} transform - Transform data
     * @returns {{x: number, y: number}} Screen coordinates
     */
    static canvasToScreen(canvasX, canvasY, canvas, transform = null) {
        if (typeof canvasX !== 'number' || typeof canvasY !== 'number') {
            throw new UtilsError('Canvas coordinates must be numbers', 'INVALID_COORDINATES');
        }

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new UtilsError('Canvas parameter must be a canvas element', 'INVALID_CANVAS');
        }

        const rect = canvas.getBoundingClientRect();
        let x = canvasX;
        let y = canvasY;

        if (transform) {
            x = x * transform.scaleX + transform.offsetX;
            y = y * transform.scaleY + transform.offsetY;
        }

        return {
            x: x + rect.left,
            y: y + rect.top
        };
    }
}

/**
 * Mathematical utility functions
 */
class MathUtils {
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            throw new UtilsError('All parameters must be numbers', 'INVALID_NUMBERS');
        }

        if (min > max) {
            throw new UtilsError('Minimum value cannot be greater than maximum', 'INVALID_RANGE');
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
            throw new UtilsError('All parameters must be numbers', 'INVALID_NUMBERS');
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
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
            typeof x2 !== 'number' || typeof y2 !== 'number') {
            throw new UtilsError('All coordinates must be numbers', 'INVALID_COORDINATES');
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static degToRad(degrees) {
        if (typeof degrees !== 'number') {
            throw new UtilsError('Degrees must be a number', 'INVALID_NUMBER');
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
            throw new UtilsError('Radians must be a number', 'INVALID_NUMBER');
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
            throw new UtilsError('Min and max must be numbers', 'INVALID_NUMBERS');
        }

        if (min > max) {
            throw new UtilsError('Minimum value cannot be greater than maximum', 'INVALID_RANGE');
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
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

/**
 * Input validation utilities
 */
class ValidationUtils {
    /**
     * Validate that a value is a non-empty string
     * @param {*} value - Value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @returns {boolean} True if valid
     * @throws {UtilsError} If validation fails
     */
    static validateString(value, fieldName = 'value') {
        if (typeof value !== 'string') {
            throw new UtilsError(`${fieldName} must be a string`, 'INVALID_TYPE');
        }
        if (value.trim() === '') {
            throw new UtilsError(`${fieldName} cannot be empty`, 'EMPTY_STRING');
        }
        return true;
    }

    /**
     * Validate that a value is a number within a range
     * @param {*} value - Value to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {string} fieldName - Name of the field for error messages
     * @returns {boolean} True if valid
     * @throws {UtilsError} If validation fails
     */
    static validateNumber(value, min = -Infinity, max = Infinity, fieldName = 'value') {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new UtilsError(`${fieldName} must be a valid number`, 'INVALID_NUMBER');
        }
        if (value < min || value > max) {
            throw new UtilsError(`${fieldName} must be between ${min} and ${max}`, 'OUT_OF_RANGE');
        }
        return true;
    }

    /**
     * Validate that a value is a positive integer
     * @param {*} value - Value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @returns {boolean} True if valid
     * @throws {UtilsError} If validation fails
     */
    static validatePositiveInteger(value, fieldName = 'value') {
        if (!Number.isInteger(value) || value <= 0) {
            throw new UtilsError(`${fieldName} must be a positive integer`, 'INVALID_POSITIVE_INTEGER');
        }
        return true;
    }
}

/**
 * Debounce utility for limiting function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate = false) {
    if (typeof func !== 'function') {
        throw new UtilsError('First parameter must be a function', 'INVALID_FUNCTION');
    }
    
    if (typeof wait !== 'number' || wait < 0) {
        throw new UtilsError('Wait time must be a non-negative number', 'INVALID_WAIT_TIME');
    }

    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle utility for limiting function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    if (typeof func !== 'function') {
        throw new UtilsError('First parameter must be a function', 'INVALID_FUNCTION');
    }
    
    if (typeof limit !== 'number' || limit < 0) {
        throw new UtilsError('Limit must be a non-negative number', 'INVALID_LIMIT');
    }

    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Create singleton instances
const performanceMonitor = new PerformanceMonitor();
const deviceDetector = new DeviceDetector();

// Export all utilities
export {
    UtilsError,
    PerformanceMonitor,
    DeviceDetector,
    CanvasScaler,
    CoordinateTransformer,
    MathUtils,
    ValidationUtils,
    debounce,
    throttle,
    performanceMonitor,
    deviceDetector
};

// Default export with all utilities
export default {
    UtilsError,
    PerformanceMonitor,
    DeviceDetector,
    CanvasScaler,
    CoordinateTransformer,
    MathUtils,
    ValidationUtils,
    debounce,
    throttle,
    performanceMonitor,
    deviceDetector
};