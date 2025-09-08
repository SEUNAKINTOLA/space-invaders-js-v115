/**
 * Canvas Renderer Module
 * 
 * Provides comprehensive rendering utilities for HTML5 Canvas-based games.
 * Handles drawing operations, canvas scaling, coordinate transformations,
 * and performance optimization for smooth gameplay across different devices.
 * 
 * Key Features:
 * - Adaptive canvas scaling for responsive design
 * - Optimized drawing operations with batching
 * - Performance monitoring and frame rate tracking
 * - Memory-efficient resource management
 * - Cross-platform compatibility
 * 
 * Architecture:
 * - Singleton pattern for global renderer access
 * - Strategy pattern for different rendering modes
 * - Observer pattern for performance metrics
 * - Factory pattern for drawing operations
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

import { gameConfig } from '../config/gameConfig.js';
import { 
    PerformanceMonitor, 
    CanvasScaler, 
    CoordinateTransformer,
    MathUtils,
    ValidationUtils,
    performanceMonitor 
} from '../utils.js';

/**
 * Custom error class for renderer-specific exceptions
 */
class RendererError extends Error {
    constructor(message, code = 'RENDERER_ERROR', context = {}) {
        super(message);
        this.name = 'RendererError';
        this.code = code;
        this.context = context;
        this.timestamp = Date.now();
    }
}

/**
 * Drawing context wrapper for enhanced functionality
 */
class DrawingContext {
    constructor(ctx) {
        this.ctx = ctx;
        this.transformStack = [];
        this.styleStack = [];
    }

    /**
     * Save current transformation and style state
     */
    pushState() {
        this.ctx.save();
        this.transformStack.push({
            transform: this.ctx.getTransform(),
            timestamp: performance.now()
        });
        this.styleStack.push({
            fillStyle: this.ctx.fillStyle,
            strokeStyle: this.ctx.strokeStyle,
            lineWidth: this.ctx.lineWidth,
            globalAlpha: this.ctx.globalAlpha
        });
    }

    /**
     * Restore previous transformation and style state
     */
    popState() {
        if (this.transformStack.length === 0) {
            console.warn('DrawingContext: Attempting to pop empty state stack');
            return;
        }
        
        this.ctx.restore();
        this.transformStack.pop();
        this.styleStack.pop();
    }

    /**
     * Get current state depth for debugging
     */
    getStateDepth() {
        return this.transformStack.length;
    }
}

/**
 * Star field background generator for space theme
 */
class StarField {
    constructor(width, height, starCount = 100) {
        this.width = width;
        this.height = height;
        this.stars = this.generateStars(starCount);
        this.animationOffset = 0;
    }

    /**
     * Generate random star positions and properties
     */
    generateStars(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.5 + 0.1,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        return stars;
    }

    /**
     * Update star positions for animation
     */
    update(deltaTime) {
        this.animationOffset += deltaTime * 0.001;
        
        this.stars.forEach(star => {
            star.y += star.speed * deltaTime * 0.1;
            star.twinkle += deltaTime * 0.002;
            
            // Wrap stars that move off screen
            if (star.y > this.height + star.size) {
                star.y = -star.size;
                star.x = Math.random() * this.width;
            }
        });
    }

    /**
     * Render star field to canvas
     */
    render(ctx) {
        ctx.fillStyle = '#ffffff';
        
        this.stars.forEach(star => {
            const twinkleAlpha = (Math.sin(star.twinkle) + 1) * 0.3 + 0.4;
            ctx.globalAlpha = star.brightness * twinkleAlpha;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
    }

    /**
     * Resize star field for new canvas dimensions
     */
    resize(width, height) {
        const scaleX = width / this.width;
        const scaleY = height / this.height;
        
        this.width = width;
        this.height = height;
        
        this.stars.forEach(star => {
            star.x *= scaleX;
            star.y *= scaleY;
        });
    }
}

/**
 * Text rendering utilities with enhanced typography
 */
class TextRenderer {
    constructor() {
        this.fontCache = new Map();
        this.measureCache = new Map();
    }

    /**
     * Render text with advanced styling options
     */
    renderText(ctx, text, x, y, options = {}) {
        const {
            font = '16px Arial',
            fillStyle = '#ffffff',
            strokeStyle = null,
            strokeWidth = 1,
            align = 'left',
            baseline = 'top',
            shadow = null,
            outline = null,
            maxWidth = null
        } = options;

        // Validate inputs
        if (!ValidationUtils.isString(text)) {
            throw new RendererError('Text must be a string', 'INVALID_TEXT', { text });
        }

        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        // Apply shadow effect
        if (shadow) {
            ctx.shadowColor = shadow.color || '#000000';
            ctx.shadowBlur = shadow.blur || 2;
            ctx.shadowOffsetX = shadow.offsetX || 1;
            ctx.shadowOffsetY = shadow.offsetY || 1;
        }

        // Apply outline effect
        if (outline) {
            ctx.strokeStyle = outline.color || '#000000';
            ctx.lineWidth = outline.width || 2;
            ctx.strokeText(text, x, y, maxWidth);
        }

        // Render main text
        ctx.fillStyle = fillStyle;
        ctx.fillText(text, x, y, maxWidth);

        // Reset shadow
        if (shadow) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    /**
     * Measure text dimensions with caching
     */
    measureText(ctx, text, font) {
        const cacheKey = `${text}_${font}`;
        
        if (this.measureCache.has(cacheKey)) {
            return this.measureCache.get(cacheKey);
        }

        const originalFont = ctx.font;
        ctx.font = font;
        const metrics = ctx.measureText(text);
        ctx.font = originalFont;

        const result = {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        };

        // Cache result with size limit
        if (this.measureCache.size < 1000) {
            this.measureCache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * Clear text measurement cache
     */
    clearCache() {
        this.measureCache.clear();
    }
}

/**
 * Shape rendering utilities with optimized drawing operations
 */
class ShapeRenderer {
    constructor() {
        this.pathCache = new Map();
    }

    /**
     * Draw rectangle with optional styling
     */
    drawRect(ctx, x, y, width, height, options = {}) {
        const {
            fillStyle = null,
            strokeStyle = null,
            lineWidth = 1,
            cornerRadius = 0
        } = options;

        if (cornerRadius > 0) {
            this.drawRoundedRect(ctx, x, y, width, height, cornerRadius, options);
            return;
        }

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fillRect(x, y, width, height);
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, width, height);
        }
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius, options = {}) {
        const { fillStyle = null, strokeStyle = null, lineWidth = 1 } = options;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    /**
     * Draw circle with styling options
     */
    drawCircle(ctx, x, y, radius, options = {}) {
        const {
            fillStyle = null,
            strokeStyle = null,
            lineWidth = 1,
            startAngle = 0,
            endAngle = Math.PI * 2
        } = options;

        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    /**
     * Draw polygon from points array
     */
    drawPolygon(ctx, points, options = {}) {
        if (!Array.isArray(points) || points.length < 3) {
            throw new RendererError('Polygon requires at least 3 points', 'INVALID_POLYGON', { points });
        }

        const { fillStyle = null, strokeStyle = null, lineWidth = 1 } = options;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }
}

/**
 * Main Renderer class - handles all canvas rendering operations
 */
class Renderer {
    constructor(canvas) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new RendererError('Invalid canvas element provided', 'INVALID_CANVAS', { canvas });
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.drawingContext = new DrawingContext(this.ctx);
        
        // Initialize subsystems
        this.canvasScaler = new CanvasScaler();
        this.coordinateTransformer = new CoordinateTransformer();
        this.textRenderer = new TextRenderer();
        this.shapeRenderer = new ShapeRenderer();
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.renderStats = {
            drawCalls: 0,
            triangles: 0,
            textureBinds: 0
        };

        // Initialize star field
        this.starField = new StarField(canvas.width, canvas.height);
        
        // Rendering state
        this.isRendering = false;
        this.renderQueue = [];
        this.clearColor = gameConfig.graphics.backgroundColor || '#000011';
        
        // Setup canvas properties
        this.setupCanvas();
        
        console.log('Renderer initialized successfully', {
            canvasSize: { width: canvas.width, height: canvas.height },
            devicePixelRatio: window.devicePixelRatio || 1
        });
    }

    /**
     * Setup canvas with optimal settings
     */
    setupCanvas() {
        // Enable high-DPI support
        this.canvasScaler.setupHighDPI(this.canvas);
        
        // Set canvas properties for crisp rendering
        this.ctx.imageSmoothingEnabled = gameConfig.graphics.smoothing || true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Setup coordinate system
        this.coordinateTransformer.setCanvasSize(this.canvas.width, this.canvas.height);
    }

    /**
     * Begin rendering frame
     */
    beginFrame() {
        if (this.isRendering) {
            console.warn('Renderer: beginFrame called while already rendering');
            return;
        }

        this.isRendering = true;
        this.renderStats.drawCalls = 0;
        this.renderStats.triangles = 0;
        this.renderStats.textureBinds = 0;

        // Start performance measurement
        performanceMonitor.startMeasurement('frame_render');
    }

    /**
     * End rendering frame and update statistics
     */
    endFrame() {
        if (!this.isRendering) {
            console.warn('Renderer: endFrame called without beginFrame');
            return;
        }

        this.isRendering = false;
        this.frameCount++;

        // End performance measurement
        const renderTime = performanceMonitor.endMeasurement('frame_render');
        
        // Update frame rate statistics
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Log performance metrics periodically
        if (this.frameCount % 60 === 0) {
            console.debug('Renderer performance', {
                frameCount: this.frameCount,
                renderTime: renderTime.toFixed(2) + 'ms',
                fps: Math.round(1000 / deltaTime),
                drawCalls: this.renderStats.drawCalls
            });
        }
    }

    /**
     * Clear canvas with background
     */
    clear() {
        this.renderStats.drawCalls++;
        
        // Clear entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill with background color
        this.ctx.fillStyle = this.clearColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render animated star field background
     */
    renderBackground(deltaTime) {
        this.starField.update(deltaTime);
        this.starField.render(this.ctx);
        this.renderStats.drawCalls++;
    }

    /**
     * Draw rectangle with enhanced options
     */
    drawRect(x, y, width, height, options = {}) {
        this.validateCoordinates(x, y);
        this.shapeRenderer.drawRect(this.ctx, x, y, width, height, options);
        this.renderStats.drawCalls++;
    }

    /**
     * Draw circle with enhanced options
     */
    drawCircle(x, y, radius, options = {}) {
        this.validateCoordinates(x, y);
        this.shapeRenderer.drawCircle(this.ctx, x, y, radius, options);
        this.renderStats.drawCalls++;
    }

    /**
     * Draw text with advanced styling
     */
    drawText(text, x, y, options = {}) {
        this.validateCoordinates(x, y);
        this.textRenderer.renderText(this.ctx, text, x, y, options);
        this.renderStats.drawCalls++;
    }

    /**
     * Draw sprite/image with transformation support
     */
    drawSprite(image, x, y, options = {}) {
        if (!image) {
            throw new RendererError('Image is required for sprite drawing', 'MISSING_IMAGE');
        }

        this.validateCoordinates(x, y);

        const {
            width = image.width,
            height = image.height,
            rotation = 0,
            scaleX = 1,
            scaleY = 1,
            alpha = 1,
            flipX = false,
            flipY = false
        } = options;

        this.drawingContext.pushState();

        try {
            // Apply transformations
            this.ctx.globalAlpha = MathUtils.clamp(alpha, 0, 1);
            this.ctx.translate(x + width / 2, y + height / 2);
            
            if (rotation !== 0) {
                this.ctx.rotate(rotation);
            }
            
            if (scaleX !== 1 || scaleY !== 1) {
                this.ctx.scale(scaleX * (flipX ? -1 : 1), scaleY * (flipY ? -1 : 1));
            }

            // Draw sprite centered
            this.ctx.drawImage(image, -width / 2, -height / 2, width, height);
            
            this.renderStats.drawCalls++;
            this.renderStats.textureBinds++;
        } finally {
            this.drawingContext.popState();
        }
    }

    /**
     * Draw UI panel with background and border
     */
    drawPanel(x, y, width, height, options = {}) {
        const {
            backgroundColor = 'rgba(0, 0, 20, 0.8)',
            borderColor = '#4a90e2',
            borderWidth = 2,
            cornerRadius = 8,
            shadow = true
        } = options;

        this.drawingContext.pushState();

        try {
            // Draw shadow
            if (shadow) {
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
            }

            // Draw background
            this.shapeRenderer.drawRoundedRect(this.ctx, x, y, width, height, cornerRadius, {
                fillStyle: backgroundColor,
                strokeStyle: borderColor,
                lineWidth: borderWidth
            });

            this.renderStats.drawCalls++;
        } finally {
            this.drawingContext.popState();
        }
    }

    /**
     * Draw progress bar
     */
    drawProgressBar(x, y, width, height, progress, options = {}) {
        const {
            backgroundColor = '#333333',
            fillColor = '#4a90e2',
            borderColor = '#666666',
            borderWidth = 1
        } = options;

        const clampedProgress = MathUtils.clamp(progress, 0, 1);
        const fillWidth = width * clampedProgress;

        // Draw background
        this.drawRect(x, y, width, height, {
            fillStyle: backgroundColor,
            strokeStyle: borderColor,
            lineWidth: borderWidth
        });

        // Draw progress fill
        if (fillWidth > 0) {
            this.drawRect(x, y, fillWidth, height, {
                fillStyle: fillColor
            });
        }

        this.renderStats.drawCalls += 2;
    }

    /**
     * Resize canvas and update related systems
     */
    resize(width, height) {
        if (!ValidationUtils.isPositiveNumber(width) || !ValidationUtils.isPositiveNumber(height)) {
            throw new RendererError('Invalid canvas dimensions', 'INVALID_DIMENSIONS', { width, height });
        }

        this.canvas.width = width;
        this.canvas.height = height;
        
        // Update subsystems
        this.setupCanvas();
        this.starField.resize(width, height);
        this.coordinateTransformer.setCanvasSize(width, height);

        console.log('Renderer resized', { width, height });
    }

    /**
     * Get current render statistics
     */
    getStats() {
        return {
            ...this.renderStats,
            frameCount: this.frameCount,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    /**
     * Validate coordinate parameters
     */
    validateCoordinates(x, y) {
        if (!ValidationUtils.isNumber(x) || !ValidationUtils.isNumber(y)) {
            throw new RendererError('Invalid coordinates', 'INVALID_COORDINATES', { x, y });
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.textRenderer.clearCache();
        this.renderQueue.length = 0;
        
        console.log('Renderer disposed');
    }
}

// Export classes and utilities
export {
    Renderer,
    RendererError,
    DrawingContext,
    StarField,
    TextRenderer,
    ShapeRenderer
};

// Default export
export default Renderer;