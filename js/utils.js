/**
 * Utility Functions for Space Invaders Game
 * 
 * This module provides essential utility functions for common game operations including:
 * - Canvas scaling and coordinate transformations
 * - Device detection and capability assessment
 * - Performance monitoring and optimization
 * - Mathematical helpers for game physics
 * - Input validation and sanitization
 * 
 * Architecture: Pure functional design with immutable operations
 * Performance: Optimized for 60fps game loop execution
 * Security: Input validation and bounds checking on all operations
 * 
 * @module Utils
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

'use strict';

/**
 * Canvas and Rendering Utilities
 * Provides functions for canvas scaling, coordinate transformations, and rendering optimizations
 */
const CanvasUtils = {
    /**
     * Calculates optimal canvas scaling based on device pixel ratio and viewport
     * @param {HTMLCanvasElement} canvas - The canvas element to scale
     * @param {number} baseWidth - Base game width in logical pixels
     * @param {number} baseHeight - Base game height in logical pixels
     * @returns {Object} Scaling information with scale factor and dimensions
     * @throws {Error} If canvas is invalid or dimensions are non-positive
     */
    calculateOptimalScale(canvas, baseWidth, baseHeight) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Invalid canvas element provided');
        }
        
        if (baseWidth <= 0 || baseHeight <= 0) {
            throw new Error('Base dimensions must be positive numbers');
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate scale factors for both dimensions
        const scaleX = rect.width / baseWidth;
        const scaleY = rect.height / baseHeight;
        
        // Use the smaller scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY);
        
        return {
            scale: scale * devicePixelRatio,
            displayScale: scale,
            devicePixelRatio,
            scaledWidth: baseWidth * scale,
            scaledHeight: baseHeight * scale,
            offsetX: (rect.width - baseWidth * scale) / 2,
            offsetY: (rect.height - baseHeight * scale) / 2
        };
    },

    /**
     * Transforms screen coordinates to game world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {Object} scaleInfo - Scale information from calculateOptimalScale
     * @returns {Object} Game world coordinates {x, y}
     * @throws {Error} If coordinates or scale info are invalid
     */
    screenToWorld(screenX, screenY, scaleInfo) {
        if (typeof screenX !== 'number' || typeof screenY !== 'number') {
            throw new Error('Screen coordinates must be numbers');
        }
        
        if (!scaleInfo || typeof scaleInfo.displayScale !== 'number') {
            throw new Error('Invalid scale information provided');
        }

        return {
            x: (screenX - scaleInfo.offsetX) / scaleInfo.displayScale,
            y: (screenY - scaleInfo.offsetY) / scaleInfo.displayScale
        };
    },

    /**
     * Transforms game world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {Object} scaleInfo - Scale information from calculateOptimalScale
     * @returns {Object} Screen coordinates {x, y}
     * @throws {Error} If coordinates or scale info are invalid
     */
    worldToScreen(worldX, worldY, scaleInfo) {
        if (typeof worldX !== 'number' || typeof worldY !== 'number') {
            throw new Error('World coordinates must be numbers');
        }
        
        if (!scaleInfo || typeof scaleInfo.displayScale !== 'number') {
            throw new Error('Invalid scale information provided');
        }

        return {
            x: worldX * scaleInfo.displayScale + scaleInfo.offsetX,
            y: worldY * scaleInfo.displayScale + scaleInfo.offsetY
        };
    }
};

/**
 * Device Detection and Capability Assessment
 * Provides functions to detect device capabilities and optimize game settings
 */
const DeviceUtils = {
    /**
     * Detects if the current device is mobile
     * @returns {boolean} True if mobile device detected
     */
    isMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        return mobileRegex.test(userAgent.toLowerCase());
    },

    /**
     * Detects if the device supports touch input
     * @returns {boolean} True if touch is supported
     */
    isTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    },

    /**
     * Gets device performance tier based on hardware capabilities
     * @returns {string} Performance tier: 'high', 'medium', or 'low'
     */
    getPerformanceTier() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return 'low';
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
        
        // High-end GPU detection
        const highEndGPUs = ['nvidia', 'amd', 'intel iris', 'apple'];
        const isHighEnd = highEndGPUs.some(gpu => renderer.toLowerCase().includes(gpu));
        
        // Memory and core detection
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        
        if (isHighEnd && memory >= 8 && cores >= 8) {
            return 'high';
        } else if (memory >= 4 && cores >= 4) {
            return 'medium';
        } else {
            return 'low';
        }
    },

    /**
     * Gets optimal game settings based on device capabilities
     * @returns {Object} Recommended game settings
     */
    getOptimalSettings() {
        const tier = this.getPerformanceTier();
        const isMobile = this.isMobile();
        
        const settings = {
            high: {
                particleCount: 100,
                shadowQuality: 'high',
                effectsEnabled: true,
                targetFPS: 60,
                audioChannels: 32
            },
            medium: {
                particleCount: 50,
                shadowQuality: 'medium',
                effectsEnabled: true,
                targetFPS: 60,
                audioChannels: 16
            },
            low: {
                particleCount: 20,
                shadowQuality: 'low',
                effectsEnabled: false,
                targetFPS: 30,
                audioChannels: 8
            }
        };

        const optimal = { ...settings[tier] };
        
        // Mobile-specific adjustments
        if (isMobile) {
            optimal.particleCount = Math.floor(optimal.particleCount * 0.7);
            optimal.audioChannels = Math.floor(optimal.audioChannels * 0.5);
        }

        return optimal;
    }
};

/**
 * Performance Monitoring and Optimization
 * Provides functions for tracking and optimizing game performance
 */
const PerformanceUtils = {
    /**
     * Frame rate tracker for performance monitoring
     * @private
     */
    _frameTracker: {
        frames: [],
        lastTime: 0,
        maxSamples: 60
    },

    /**
     * Updates frame rate tracking
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     * @returns {number} Current FPS
     */
    updateFrameRate(currentTime) {
        if (typeof currentTime !== 'number') {
            throw new Error('Current time must be a number');
        }

        const tracker = this._frameTracker;
        
        if (tracker.lastTime > 0) {
            const deltaTime = currentTime - tracker.lastTime;
            const fps = 1000 / deltaTime;
            
            tracker.frames.push(fps);
            
            // Keep only recent samples
            if (tracker.frames.length > tracker.maxSamples) {
                tracker.frames.shift();
            }
        }
        
        tracker.lastTime = currentTime;
        return this.getAverageFPS();
    },

    /**
     * Gets the average FPS over recent frames
     * @returns {number} Average FPS
     */
    getAverageFPS() {
        const frames = this._frameTracker.frames;
        if (frames.length === 0) return 0;
        
        const sum = frames.reduce((acc, fps) => acc + fps, 0);
        return Math.round(sum / frames.length);
    },

    /**
     * Checks if performance is below acceptable threshold
     * @param {number} threshold - Minimum acceptable FPS (default: 30)
     * @returns {boolean} True if performance is poor
     */
    isPerformancePoor(threshold = 30) {
        const avgFPS = this.getAverageFPS();
        return avgFPS > 0 && avgFPS < threshold;
    },

    /**
     * Creates a performance-optimized timer for game loops
     * @param {Function} callback - Function to call on each frame
     * @param {number} targetFPS - Target frames per second (default: 60)
     * @returns {Object} Timer control object with start/stop methods
     * @throws {Error} If callback is not a function
     */
    createGameTimer(callback, targetFPS = 60) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const targetInterval = 1000 / targetFPS;
        let animationId = null;
        let lastTime = 0;
        let accumulator = 0;

        const tick = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            accumulator += deltaTime;

            // Fixed timestep with accumulator
            while (accumulator >= targetInterval) {
                callback(targetInterval);
                accumulator -= targetInterval;
            }

            if (animationId !== null) {
                animationId = requestAnimationFrame(tick);
            }
        };

        return {
            start() {
                if (animationId === null) {
                    lastTime = performance.now();
                    animationId = requestAnimationFrame(tick);
                }
            },
            stop() {
                if (animationId !== null) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            },
            isRunning() {
                return animationId !== null;
            }
        };
    }
};

/**
 * Mathematical Helpers for Game Physics
 * Provides optimized mathematical functions for game calculations
 */
const MathUtils = {
    /**
     * Clamps a value between minimum and maximum bounds
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     * @throws {Error} If parameters are not numbers or min > max
     */
    clamp(value, min, max) {
        if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            throw new Error('All parameters must be numbers');
        }
        
        if (min > max) {
            throw new Error('Minimum value cannot be greater than maximum');
        }

        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation between two values
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     * @throws {Error} If parameters are not numbers
     */
    lerp(start, end, t) {
        if (typeof start !== 'number' || typeof end !== 'number' || typeof t !== 'number') {
            throw new Error('All parameters must be numbers');
        }

        return start + (end - start) * this.clamp(t, 0, 1);
    },

    /**
     * Calculates distance between two points
     * @param {number} x1 - First point X coordinate
     * @param {number} y1 - First point Y coordinate
     * @param {number} x2 - Second point X coordinate
     * @param {number} y2 - Second point Y coordinate
     * @returns {number} Distance between points
     * @throws {Error} If coordinates are not numbers
     */
    distance(x1, y1, x2, y2) {
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || 
            typeof x2 !== 'number' || typeof y2 !== 'number') {
            throw new Error('All coordinates must be numbers');
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Normalizes an angle to the range [0, 2π)
     * @param {number} angle - Angle in radians
     * @returns {number} Normalized angle
     * @throws {Error} If angle is not a number
     */
    normalizeAngle(angle) {
        if (typeof angle !== 'number') {
            throw new Error('Angle must be a number');
        }

        const TWO_PI = Math.PI * 2;
        return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    },

    /**
     * Checks if two rectangles intersect
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if rectangles intersect
     * @throws {Error} If rectangle objects are invalid
     */
    rectanglesIntersect(rect1, rect2) {
        const validateRect = (rect, name) => {
            if (!rect || typeof rect !== 'object') {
                throw new Error(`${name} must be an object`);
            }
            const required = ['x', 'y', 'width', 'height'];
            for (const prop of required) {
                if (typeof rect[prop] !== 'number') {
                    throw new Error(`${name}.${prop} must be a number`);
                }
            }
        };

        validateRect(rect1, 'rect1');
        validateRect(rect2, 'rect2');

        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
};

/**
 * Input Validation and Sanitization
 * Provides secure input handling for game operations
 */
const ValidationUtils = {
    /**
     * Validates and sanitizes a numeric input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options {min, max, integer, default}
     * @returns {number} Validated and sanitized number
     */
    sanitizeNumber(value, options = {}) {
        const { min = -Infinity, max = Infinity, integer = false, default: defaultValue = 0 } = options;
        
        // Convert to number
        const num = Number(value);
        
        // Check if valid number
        if (isNaN(num) || !isFinite(num)) {
            return defaultValue;
        }
        
        // Apply integer constraint
        const result = integer ? Math.round(num) : num;
        
        // Apply bounds
        return this.clamp(result, min, max);
    },

    /**
     * Validates and sanitizes a string input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options {maxLength, allowEmpty, default}
     * @returns {string} Validated and sanitized string
     */
    sanitizeString(value, options = {}) {
        const { maxLength = 1000, allowEmpty = true, default: defaultValue = '' } = options;
        
        // Convert to string
        let str = String(value || '');
        
        // Check empty constraint
        if (!allowEmpty && str.trim().length === 0) {
            return defaultValue;
        }
        
        // Apply length constraint
        if (str.length > maxLength) {
            str = str.substring(0, maxLength);
        }
        
        // Basic XSS prevention
        return str.replace(/[<>'"&]/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[char];
        });
    },

    /**
     * Validates an object against a schema
     * @param {any} obj - Object to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} Validated object with sanitized values
     * @throws {Error} If object structure is invalid
     */
    validateObject(obj, schema) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Input must be an object');
        }
        
        if (!schema || typeof schema !== 'object') {
            throw new Error('Schema must be an object');
        }

        const result = {};
        
        for (const [key, validator] of Object.entries(schema)) {
            if (typeof validator === 'function') {
                try {
                    result[key] = validator(obj[key]);
                } catch (error) {
                    throw new Error(`Validation failed for property '${key}': ${error.message}`);
                }
            } else {
                result[key] = obj[key];
            }
        }
        
        return result;
    },

    // Alias clamp method from MathUtils for convenience
    clamp: MathUtils.clamp
};

/**
 * Logging and Debug Utilities
 * Provides structured logging for development and debugging
 */
const LogUtils = {
    /**
     * Log levels for filtering messages
     */
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    /**
     * Current log level (can be configured)
     */
    currentLevel: 1, // INFO by default

    /**
     * Logs a message with specified level
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    log(level, message, data = null) {
        if (level < this.currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelName = levelNames[level] || 'UNKNOWN';
        
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            data
        };

        // Use appropriate console method
        const consoleMethods = [console.debug, console.info, console.warn, console.error];
        const consoleMethod = consoleMethods[level] || console.log;
        
        consoleMethod(`[${timestamp}] ${levelName}: ${message}`, data || '');
    },

    /**
     * Convenience methods for different log levels
     */
    debug(message, data) { this.log(this.LogLevel.DEBUG, message, data); },
    info(message, data) { this.log(this.LogLevel.INFO, message, data); },
    warn(message, data) { this.log(this.LogLevel.WARN, message, data); },
    error(message, data) { this.log(this.LogLevel.ERROR, message, data); }
};

/**
 * Main Utils Export
 * Combines all utility modules into a single interface
 */
const Utils = {
    // Canvas and rendering utilities
    Canvas: CanvasUtils,
    
    // Device detection and capabilities
    Device: DeviceUtils,
    
    // Performance monitoring
    Performance: PerformanceUtils,
    
    // Mathematical helpers
    Math: MathUtils,
    
    // Input validation and sanitization
    Validation: ValidationUtils,
    
    // Logging utilities
    Log: LogUtils,

    /**
     * Initializes the utils module with configuration
     * @param {Object} config - Configuration options
     */
    init(config = {}) {
        // Configure logging level
        if (config.logLevel !== undefined) {
            LogUtils.currentLevel = config.logLevel;
        }
        
        // Log initialization
        LogUtils.info('Utils module initialized', {
            deviceType: DeviceUtils.isMobile() ? 'mobile' : 'desktop',
            touchSupport: DeviceUtils.isTouchDevice(),
            performanceTier: DeviceUtils.getPerformanceTier()
        });
    },

    /**
     * Gets module version and build information
     * @returns {Object} Version information
     */
    getVersion() {
        return {
            version: '1.0.0',
            build: 'a6bf8fcb73693ee1c2663e5c4a87129dd8dc6120',
            modules: [
                'Canvas', 'Device', 'Performance', 
                'Math', 'Validation', 'Log'
            ]
        };
    }
};

// Auto-initialize with default configuration
Utils.init();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}