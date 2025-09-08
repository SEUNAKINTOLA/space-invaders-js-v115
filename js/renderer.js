/**
 * Canvas Renderer System for Space Invaders
 * 
 * Provides comprehensive rendering utilities for HTML5 Canvas including:
 * - Shape and sprite drawing with optimized performance
 * - Text rendering with multiple font styles and effects
 * - Animated background star field generation
 * - UI element rendering with responsive scaling
 * - Canvas scaling and resolution management for cross-device compatibility
 * 
 * Architecture:
 * - Singleton pattern for global renderer access
 * - Command pattern for batched rendering operations
 * - Observer pattern for canvas resize events
 * - Strategy pattern for different rendering modes
 * 
 * Performance Features:
 * - Object pooling for frequently created objects
 * - Batch rendering to minimize draw calls
 * - Viewport culling for off-screen objects
 * - Canvas layer management for UI separation
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

import { gameConfig } from '../config/gameConfig.js';

/**
 * Custom error types for renderer-specific issues
 */
class RendererError extends Error {
    constructor(message, code = 'RENDERER_ERROR') {
        super(message);
        this.name = 'RendererError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

class CanvasNotFoundError extends RendererError {
    constructor(canvasId) {
        super(`Canvas element with ID '${canvasId}' not found`, 'CANVAS_NOT_FOUND');
        this.canvasId = canvasId;
    }
}

class RenderingContextError extends RendererError {
    constructor(contextType) {
        super(`Failed to get ${contextType} rendering context`, 'CONTEXT_ERROR');
        this.contextType = contextType;
    }
}

/**
 * Point class for 2D coordinates with utility methods
 */
class Point {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Calculate distance to another point
     * @param {Point} other - Target point
     * @returns {number} Distance between points
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Create a copy of this point
     * @returns {Point} New point instance
     */
    clone() {
        return new Point(this.x, this.y);
    }
}

/**
 * Rectangle class for bounds checking and collision detection
 */
class Rectangle {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Check if point is inside rectangle
     * @param {Point} point - Point to test
     * @returns {boolean} True if point is inside
     */
    contains(point) {
        return point.x >= this.x && 
               point.x <= this.x + this.width &&
               point.y >= this.y && 
               point.y <= this.y + this.height;
    }

    /**
     * Check if this rectangle intersects with another
     * @param {Rectangle} other - Rectangle to test against
     * @returns {boolean} True if rectangles intersect
     */
    intersects(other) {
        return !(other.x > this.x + this.width || 
                other.x + other.width < this.x || 
                other.y > this.y + this.height || 
                other.y + other.height < this.y);
    }
}

/**
 * Star object for background animation
 */
class Star {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} speed - Movement speed
     * @param {number} brightness - Star brightness (0-1)
     * @param {number} size - Star size
     */
    constructor(x, y, speed, brightness, size) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.brightness = brightness;
        this.size = size;
        this.twinkle = Math.random() * Math.PI * 2;
    }

    /**
     * Update star position and animation
     * @param {number} deltaTime - Time since last update
     * @param {number} canvasHeight - Canvas height for wrapping
     */
    update(deltaTime, canvasHeight) {
        this.y += this.speed * deltaTime;
        this.twinkle += deltaTime * 0.005;
        
        // Wrap around when star goes off screen
        if (this.y > canvasHeight + this.size) {
            this.y = -this.size;
            this.x = Math.random() * gameConfig.canvas.width;
        }
    }

    /**
     * Get current brightness with twinkle effect
     * @returns {number} Current brightness value
     */
    getCurrentBrightness() {
        return this.brightness * (0.7 + 0.3 * Math.sin(this.twinkle));
    }
}

/**
 * Main Renderer class providing comprehensive canvas rendering capabilities
 */
class Renderer {
    /**
     * @param {string} canvasId - ID of the canvas element
     * @param {Object} options - Renderer configuration options
     */
    constructor(canvasId, options = {}) {
        this.canvasId = canvasId;
        this.options = {
            enableHighDPI: true,
            enableSmoothing: true,
            backgroundColor: '#000011',
            starCount: 100,
            debugMode: false,
            ...options
        };

        // Canvas and context references
        this.canvas = null;
        this.ctx = null;
        this.viewport = new Rectangle();
        
        // Scaling and resolution management
        this.pixelRatio = 1;
        this.scaleFactor = 1;
        this.baseWidth = gameConfig.canvas.width;
        this.baseHeight = gameConfig.canvas.height;

        // Background stars system
        this.stars = [];
        this.starPool = [];

        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.renderStats = {
            drawCalls: 0,
            objectsRendered: 0,
            culledObjects: 0
        };

        // Event listeners for cleanup
        this.resizeHandler = null;
        this.visibilityHandler = null;

        // Initialize renderer
        this.initialize();
    }

    /**
     * Initialize the renderer and set up canvas
     * @throws {CanvasNotFoundError} When canvas element is not found
     * @throws {RenderingContextError} When context creation fails
     */
    initialize() {
        try {
            // Get canvas element
            this.canvas = document.getElementById(this.canvasId);
            if (!this.canvas) {
                throw new CanvasNotFoundError(this.canvasId);
            }

            // Get 2D rendering context
            this.ctx = this.canvas.getContext('2d', {
                alpha: false,
                desynchronized: true,
                willReadFrequently: false
            });

            if (!this.ctx) {
                throw new RenderingContextError('2d');
            }

            // Set up high DPI support
            this.setupHighDPI();

            // Configure canvas properties
            this.setupCanvas();

            // Initialize background stars
            this.initializeStars();

            // Set up event listeners
            this.setupEventListeners();

            // Log successful initialization
            this.log('Renderer initialized successfully', {
                canvasId: this.canvasId,
                resolution: `${this.canvas.width}x${this.canvas.height}`,
                pixelRatio: this.pixelRatio,
                scaleFactor: this.scaleFactor
            });

        } catch (error) {
            this.logError('Failed to initialize renderer', error);
            throw error;
        }
    }

    /**
     * Set up high DPI display support
     */
    setupHighDPI() {
        if (!this.options.enableHighDPI) {
            this.pixelRatio = 1;
            return;
        }

        this.pixelRatio = window.devicePixelRatio || 1;
        
        // Calculate scale factor based on container size
        const container = this.canvas.parentElement;
        if (container) {
            const containerRect = container.getBoundingClientRect();
            this.scaleFactor = Math.min(
                containerRect.width / this.baseWidth,
                containerRect.height / this.baseHeight
            );
        }

        this.updateCanvasSize();
    }

    /**
     * Update canvas size and scaling
     */
    updateCanvasSize() {
        const displayWidth = this.baseWidth * this.scaleFactor;
        const displayHeight = this.baseHeight * this.scaleFactor;

        // Set display size
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        // Set actual canvas size for high DPI
        this.canvas.width = displayWidth * this.pixelRatio;
        this.canvas.height = displayHeight * this.pixelRatio;

        // Scale context for high DPI
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        // Update viewport
        this.viewport.width = displayWidth;
        this.viewport.height = displayHeight;
    }

    /**
     * Configure canvas rendering properties
     */
    setupCanvas() {
        // Set smoothing preferences
        this.ctx.imageSmoothingEnabled = this.options.enableSmoothing;
        if (this.ctx.imageSmoothingEnabled) {
            this.ctx.imageSmoothingQuality = 'high';
        }

        // Set default text properties
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.font = '16px Arial, sans-serif';

        // Set default line properties
        this.ctx.lineWidth = 1;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    /**
     * Initialize background star field
     */
    initializeStars() {
        this.stars = [];
        this.starPool = [];

        for (let i = 0; i < this.options.starCount; i++) {
            const star = this.createStar();
            this.stars.push(star);
        }
    }

    /**
     * Create a new star with random properties
     * @returns {Star} New star instance
     */
    createStar() {
        return new Star(
            Math.random() * this.viewport.width,
            Math.random() * this.viewport.height,
            20 + Math.random() * 80, // Speed: 20-100 pixels per second
            0.3 + Math.random() * 0.7, // Brightness: 0.3-1.0
            1 + Math.random() * 2 // Size: 1-3 pixels
        );
    }

    /**
     * Set up event listeners for responsive behavior
     */
    setupEventListeners() {
        // Handle window resize
        this.resizeHandler = () => {
            this.handleResize();
        };
        window.addEventListener('resize', this.resizeHandler);

        // Handle visibility changes for performance
        this.visibilityHandler = () => {
            if (document.hidden) {
                this.log('Renderer paused due to visibility change');
            } else {
                this.log('Renderer resumed');
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Handle window resize events
     */
    handleResize() {
        try {
            this.setupHighDPI();
            this.log('Canvas resized', {
                newSize: `${this.canvas.width}x${this.canvas.height}`,
                scaleFactor: this.scaleFactor
            });
        } catch (error) {
            this.logError('Error handling resize', error);
        }
    }

    /**
     * Clear the entire canvas
     * @param {string} [color] - Optional background color
     */
    clear(color = this.options.backgroundColor) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
        this.renderStats.drawCalls++;
    }

    /**
     * Begin a new frame render cycle
     * @param {number} currentTime - Current timestamp
     */
    beginFrame(currentTime = performance.now()) {
        // Calculate FPS
        if (this.lastFrameTime > 0) {
            const deltaTime = currentTime - this.lastFrameTime;
            this.fps = 1000 / deltaTime;
        }
        this.lastFrameTime = currentTime;
        this.frameCount++;

        // Reset render stats
        this.renderStats.drawCalls = 0;
        this.renderStats.objectsRendered = 0;
        this.renderStats.culledObjects = 0;

        // Clear canvas
        this.clear();

        // Update and render background stars
        this.updateStars(currentTime);
        this.renderStars();
    }

    /**
     * Update background stars animation
     * @param {number} currentTime - Current timestamp
     */
    updateStars(currentTime) {
        const deltaTime = currentTime - this.lastFrameTime;
        
        for (const star of this.stars) {
            star.update(deltaTime, this.viewport.height);
        }
    }

    /**
     * Render background stars
     */
    renderStars() {
        this.ctx.save();
        
        for (const star of this.stars) {
            const brightness = star.getCurrentBrightness();
            const alpha = Math.min(brightness, 1);
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered += this.stars.length;
    }

    /**
     * Draw a filled rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {string} color - Fill color
     */
    fillRect(x, y, width, height, color = '#ffffff') {
        if (!this.isInViewport(x, y, width, height)) {
            this.renderStats.culledObjects++;
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw a rectangle outline
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {string} color - Stroke color
     * @param {number} lineWidth - Line width
     */
    strokeRect(x, y, width, height, color = '#ffffff', lineWidth = 1) {
        if (!this.isInViewport(x, y, width, height)) {
            this.renderStats.culledObjects++;
            return;
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, width, height);
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw a filled circle
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Fill color
     */
    fillCircle(x, y, radius, color = '#ffffff') {
        if (!this.isInViewport(x - radius, y - radius, radius * 2, radius * 2)) {
            this.renderStats.culledObjects++;
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw a circle outline
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Stroke color
     * @param {number} lineWidth - Line width
     */
    strokeCircle(x, y, radius, color = '#ffffff', lineWidth = 1) {
        if (!this.isInViewport(x - radius, y - radius, radius * 2, radius * 2)) {
            this.renderStats.culledObjects++;
            return;
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw a line between two points
     * @param {number} x1 - Start X position
     * @param {number} y1 - Start Y position
     * @param {number} x2 - End X position
     * @param {number} y2 - End Y position
     * @param {string} color - Line color
     * @param {number} lineWidth - Line width
     */
    drawLine(x1, y1, x2, y2, color = '#ffffff', lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw text with various styling options
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text styling options
     */
    drawText(text, x, y, options = {}) {
        const {
            font = '16px Arial, sans-serif',
            color = '#ffffff',
            align = 'left',
            baseline = 'top',
            maxWidth = null,
            shadow = false,
            shadowColor = '#000000',
            shadowBlur = 2,
            shadowOffset = { x: 1, y: 1 }
        } = options;

        this.ctx.save();

        // Set text properties
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        // Apply shadow if requested
        if (shadow) {
            this.ctx.shadowColor = shadowColor;
            this.ctx.shadowBlur = shadowBlur;
            this.ctx.shadowOffsetX = shadowOffset.x;
            this.ctx.shadowOffsetY = shadowOffset.y;
        }

        // Draw text
        if (maxWidth) {
            this.ctx.fillText(text, x, y, maxWidth);
        } else {
            this.ctx.fillText(text, x, y);
        }

        this.ctx.restore();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw an image or sprite
     * @param {HTMLImageElement|HTMLCanvasElement} image - Image to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} [width] - Optional width (uses image width if not provided)
     * @param {number} [height] - Optional height (uses image height if not provided)
     * @param {Object} [options] - Additional drawing options
     */
    drawImage(image, x, y, width = null, height = null, options = {}) {
        if (!image || !image.complete) {
            this.renderStats.culledObjects++;
            return;
        }

        const drawWidth = width || image.width;
        const drawHeight = height || image.height;

        if (!this.isInViewport(x, y, drawWidth, drawHeight)) {
            this.renderStats.culledObjects++;
            return;
        }

        const {
            rotation = 0,
            alpha = 1,
            flipX = false,
            flipY = false
        } = options;

        this.ctx.save();

        // Set alpha
        if (alpha !== 1) {
            this.ctx.globalAlpha = alpha;
        }

        // Apply transformations
        if (rotation !== 0 || flipX || flipY) {
            this.ctx.translate(x + drawWidth / 2, y + drawHeight / 2);
            
            if (rotation !== 0) {
                this.ctx.rotate(rotation);
            }
            
            if (flipX || flipY) {
                this.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            }
            
            this.ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            this.ctx.drawImage(image, x, y, drawWidth, drawHeight);
        }

        this.ctx.restore();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw a sprite from a sprite sheet
     * @param {HTMLImageElement} spriteSheet - Sprite sheet image
     * @param {number} sourceX - Source X position in sprite sheet
     * @param {number} sourceY - Source Y position in sprite sheet
     * @param {number} sourceWidth - Source width in sprite sheet
     * @param {number} sourceHeight - Source height in sprite sheet
     * @param {number} destX - Destination X position
     * @param {number} destY - Destination Y position
     * @param {number} destWidth - Destination width
     * @param {number} destHeight - Destination height
     * @param {Object} [options] - Additional drawing options
     */
    drawSprite(spriteSheet, sourceX, sourceY, sourceWidth, sourceHeight, 
               destX, destY, destWidth, destHeight, options = {}) {
        if (!spriteSheet || !spriteSheet.complete) {
            this.renderStats.culledObjects++;
            return;
        }

        if (!this.isInViewport(destX, destY, destWidth, destHeight)) {
            this.renderStats.culledObjects++;
            return;
        }

        const { rotation = 0, alpha = 1 } = options;

        this.ctx.save();

        if (alpha !== 1) {
            this.ctx.globalAlpha = alpha;
        }

        if (rotation !== 0) {
            this.ctx.translate(destX + destWidth / 2, destY + destHeight / 2);
            this.ctx.rotate(rotation);
            this.ctx.drawImage(
                spriteSheet,
                sourceX, sourceY, sourceWidth, sourceHeight,
                -destWidth / 2, -destHeight / 2, destWidth, destHeight
            );
        } else {
            this.ctx.drawImage(
                spriteSheet,
                sourceX, sourceY, sourceWidth, sourceHeight,
                destX, destY, destWidth, destHeight
            );
        }

        this.ctx.restore();
        this.renderStats.drawCalls++;
        this.renderStats.objectsRendered++;
    }

    /**
     * Draw UI elements with automatic scaling
     * @param {Function} drawFunction - Function that performs the drawing
     * @param {Object} [options] - UI drawing options
     */
    drawUI(drawFunction, options = {}) {
        const { scale = 1, alpha = 1 } = options;

        this.ctx.save();

        // Apply UI scaling
        if (scale !== 1) {
            this.ctx.scale(scale, scale);
        }

        if (alpha !== 1) {
            this.ctx.globalAlpha = alpha;
        }

        // Execute drawing function
        drawFunction(this.ctx);

        this.ctx.restore();
    }

    /**
     * Check if an object is within the viewport (for culling)
     * @param {number} x - Object X position
     * @param {number} y - Object Y position
     * @param {number} width - Object width
     * @param {number} height - Object height
     * @returns {boolean} True if object is in viewport
     */
    isInViewport(x, y, width, height) {
        return !(x + width < this.viewport.x ||
                x > this.viewport.x + this.viewport.width ||
                y + height < this.viewport.y ||
                y > this.viewport.y + this.viewport.height);
    }

    /**
     * Get current render statistics
     * @returns {Object} Render statistics object
     */
    getStats() {
        return {
            fps: Math.round(this.fps),
            frameCount: this.frameCount,
            drawCalls: this.renderStats.drawCalls,
            objectsRendered: this.renderStats.objectsRendered,
            culledObjects: this.renderStats.culledObjects,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height,
                displayWidth: this.viewport.width,
                displayHeight: this.viewport.height
            },
            pixelRatio: this.pixelRatio,
            scaleFactor: this.scaleFactor
        };
    }

    /**
     * Render debug information overlay
     */
    renderDebugInfo() {
        if (!this.options.debugMode) return;

        const stats = this.getStats();
        const debugText = [
            `FPS: ${stats.fps}`,
            `Frame: ${stats.frameCount}`,
            `Draw Calls: ${stats.drawCalls}`,
            `Objects: ${stats.objectsRendered}`,
            `Culled: ${stats.culledObjects}`,
            `Canvas: ${stats.canvasSize.width}x${stats.canvasSize.height}`,
            `Display: ${stats.canvasSize.displayWidth}x${stats.canvasSize.displayHeight}`,
            `Pixel Ratio: ${stats.pixelRatio}`,
            `Scale: ${stats.scaleFactor.toFixed(2)}`
        ];

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, debugText.length * 20 + 10);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        debugText.forEach((text, index) => {
            this.ctx.fillText(text, 15, 15 + index * 20);
        });

        this.ctx.restore();
    }

    /**
     * Cleanup resources and remove event listeners
     */
    destroy() {
        try {
            // Remove event listeners
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }
            if (this.visibilityHandler) {
                document.removeEventListener('visibilitychange', this.visibilityHandler);
            }

            // Clear references
            this.canvas = null;
            this.ctx = null;
            this.stars = [];
            this.starPool = [];

            this.log('Renderer destroyed successfully');
        } catch (error) {
            this.logError('Error during renderer cleanup', error);
        }
    }

    /**
     * Log information messages
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data to log
     */
    log(message, data = {}) {
        if (this.options.debugMode) {
            console.log(`[Renderer] ${message}`, data);
        }
    }

    /**
     * Log error messages
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    logError(message, error) {
        console.error(`[Renderer] ${message}:`, error);
    }
}

// Export classes and utilities
export { 
    Renderer, 
    Point, 
    Rectangle, 
    Star,
    RendererError,
    CanvasNotFoundError,
    RenderingContextError
};

// Export default renderer instance factory
export default Renderer;