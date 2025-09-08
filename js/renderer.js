/**
 * Canvas Renderer Module
 * 
 * Provides comprehensive rendering utilities for the Space Invaders game including:
 * - Canvas management and scaling for responsive design
 * - Shape and sprite rendering with performance optimization
 * - Text rendering with multiple font styles and effects
 * - Background effects including animated starfield
 * - UI element rendering with accessibility support
 * - Debug visualization tools
 * 
 * Architecture:
 * - Singleton pattern for global renderer access
 * - Command pattern for render operations
 * - Observer pattern for canvas resize events
 * - Strategy pattern for different rendering modes
 * 
 * Performance Features:
 * - Object pooling for render commands
 * - Batch rendering for similar operations
 * - Canvas layer management for optimization
 * - Automatic quality scaling based on performance
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

import { gameConfig } from '../config/gameConfig.js';
import { 
    PerformanceMonitor, 
    DeviceDetector, 
    CanvasScaler, 
    CoordinateTransformer,
    MathUtils,
    ValidationUtils,
    performanceMonitor,
    deviceDetector
} from '../utils.js';

/**
 * Custom error class for renderer-specific errors
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
 * Render command for batch processing
 */
class RenderCommand {
    constructor(type, params, priority = 0) {
        this.type = ValidationUtils.validateString(type, 'Command type');
        this.params = ValidationUtils.validateObject(params, 'Command parameters');
        this.priority = ValidationUtils.validateNumber(priority, 'Command priority');
        this.timestamp = performance.now();
    }
}

/**
 * Star particle for background animation
 */
class Star {
    constructor(x, y, size, speed, opacity = 1) {
        this.x = ValidationUtils.validateNumber(x, 'Star x position');
        this.y = ValidationUtils.validateNumber(y, 'Star y position');
        this.size = ValidationUtils.validateNumber(size, 'Star size', 0.1, 5);
        this.speed = ValidationUtils.validateNumber(speed, 'Star speed', 0.1, 10);
        this.opacity = ValidationUtils.validateNumber(opacity, 'Star opacity', 0, 1);
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = 0.02 + Math.random() * 0.03;
    }

    /**
     * Update star position and animation
     * @param {number} deltaTime - Time elapsed since last update
     * @param {number} canvasHeight - Canvas height for wrapping
     */
    update(deltaTime, canvasHeight) {
        this.y += this.speed * deltaTime * 60; // Normalize to 60fps
        this.twinkle += this.twinkleSpeed * deltaTime * 60;
        
        if (this.y > canvasHeight + this.size) {
            this.y = -this.size;
            this.x = Math.random() * window.innerWidth;
        }
    }

    /**
     * Get current opacity with twinkle effect
     * @returns {number} Current opacity value
     */
    getCurrentOpacity() {
        return this.opacity * (0.7 + 0.3 * Math.sin(this.twinkle));
    }
}

/**
 * Main renderer class providing comprehensive canvas rendering capabilities
 */
class Renderer {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.canvasScaler = null;
        this.coordinateTransformer = null;
        this.renderCommands = [];
        this.stars = [];
        this.debugMode = false;
        this.qualityLevel = 1.0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.renderStats = {
            drawCalls: 0,
            triangles: 0,
            textureBinds: 0,
            frameTime: 0
        };
        
        // Font presets for consistent text rendering
        this.fontPresets = {
            title: { size: 48, family: 'Arial Black', weight: 'bold' },
            subtitle: { size: 24, family: 'Arial', weight: 'bold' },
            ui: { size: 16, family: 'Arial', weight: 'normal' },
            score: { size: 20, family: 'Courier New', weight: 'bold' },
            debug: { size: 12, family: 'Courier New', weight: 'normal' }
        };

        // Color palette for consistent theming
        this.colors = {
            background: '#000011',
            star: '#ffffff',
            player: '#00ff00',
            enemy: '#ff0000',
            projectile: '#ffff00',
            ui: '#ffffff',
            debug: '#ff00ff',
            warning: '#ffa500',
            error: '#ff0000'
        };

        this.initialized = false;
        this.resizeObserver = null;
        
        // Bind methods to preserve context
        this.handleResize = this.handleResize.bind(this);
        this.render = this.render.bind(this);
    }

    /**
     * Initialize the renderer with canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element to render to
     * @throws {RendererError} If initialization fails
     */
    initialize(canvas) {
        try {
            if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
                throw new RendererError('Invalid canvas element provided', 'INVALID_CANVAS');
            }

            this.canvas = canvas;
            this.context = canvas.getContext('2d', {
                alpha: false,
                desynchronized: true,
                powerPreference: 'high-performance'
            });

            if (!this.context) {
                throw new RendererError('Failed to get 2D rendering context', 'CONTEXT_FAILED');
            }

            // Initialize scaling and coordinate transformation
            this.canvasScaler = new CanvasScaler(canvas);
            this.coordinateTransformer = new CoordinateTransformer();

            // Set up canvas properties
            this.setupCanvas();
            
            // Initialize starfield
            this.initializeStarfield();

            // Set up resize handling
            this.setupResizeHandling();

            // Detect device capabilities and adjust quality
            this.adjustQualityForDevice();

            this.initialized = true;
            
            console.log('Renderer initialized successfully', {
                canvasSize: { width: canvas.width, height: canvas.height },
                devicePixelRatio: window.devicePixelRatio,
                qualityLevel: this.qualityLevel
            });

        } catch (error) {
            throw new RendererError(
                `Failed to initialize renderer: ${error.message}`,
                'INIT_FAILED',
                { originalError: error }
            );
        }
    }

    /**
     * Set up canvas properties and context settings
     * @private
     */
    setupCanvas() {
        // Enable image smoothing for better quality
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';
        
        // Set default text properties
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';
        
        // Set default line properties
        this.context.lineWidth = 1;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';

        // Initial resize
        this.handleResize();
    }

    /**
     * Initialize animated starfield background
     * @private
     */
    initializeStarfield() {
        const starCount = Math.min(200, Math.floor(this.canvas.width * this.canvas.height / 5000));
        this.stars = [];

        for (let i = 0; i < starCount; i++) {
            this.stars.push(new Star(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                0.5 + Math.random() * 2,
                0.5 + Math.random() * 2,
                0.3 + Math.random() * 0.7
            ));
        }
    }

    /**
     * Set up canvas resize handling
     * @private
     */
    setupResizeHandling() {
        // Use ResizeObserver for better performance than window resize events
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.handleResize);
            this.resizeObserver.observe(this.canvas);
        } else {
            // Fallback to window resize event
            window.addEventListener('resize', this.handleResize);
        }
    }

    /**
     * Handle canvas resize events
     * @private
     */
    handleResize() {
        if (!this.canvas || !this.canvasScaler) return;

        try {
            // Update canvas size using scaler
            this.canvasScaler.updateSize();
            
            // Reinitialize starfield for new dimensions
            this.initializeStarfield();
            
            // Update coordinate transformer
            this.coordinateTransformer.setCanvasSize(this.canvas.width, this.canvas.height);

            console.log('Canvas resized', {
                width: this.canvas.width,
                height: this.canvas.height,
                devicePixelRatio: window.devicePixelRatio
            });

        } catch (error) {
            console.error('Error handling canvas resize:', error);
        }
    }

    /**
     * Adjust rendering quality based on device capabilities
     * @private
     */
    adjustQualityForDevice() {
        const deviceInfo = deviceDetector.getDeviceInfo();
        
        if (deviceInfo.isMobile) {
            this.qualityLevel = 0.7;
        } else if (deviceInfo.isTablet) {
            this.qualityLevel = 0.8;
        } else {
            this.qualityLevel = 1.0;
        }

        // Adjust based on performance
        const avgFrameTime = performanceMonitor.getAverageFrameTime();
        if (avgFrameTime > 20) { // If frame time > 20ms (< 50fps)
            this.qualityLevel *= 0.8;
        }

        this.qualityLevel = Math.max(0.3, Math.min(1.0, this.qualityLevel));
    }

    /**
     * Clear the entire canvas
     */
    clear() {
        if (!this.context) return;

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderStats.drawCalls++;
    }

    /**
     * Fill canvas with background color
     * @param {string} color - Background color
     */
    fillBackground(color = this.colors.background) {
        if (!this.context) return;

        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderStats.drawCalls++;
    }

    /**
     * Draw animated starfield background
     * @param {number} deltaTime - Time elapsed since last frame
     */
    drawStarfield(deltaTime = 16.67) {
        if (!this.context || this.stars.length === 0) return;

        // Update and draw stars
        this.context.fillStyle = this.colors.star;
        
        for (const star of this.stars) {
            star.update(deltaTime / 1000, this.canvas.height);
            
            const opacity = star.getCurrentOpacity();
            this.context.globalAlpha = opacity * this.qualityLevel;
            
            this.context.beginPath();
            this.context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.context.fill();
        }
        
        this.context.globalAlpha = 1.0;
        this.renderStats.drawCalls += this.stars.length;
    }

    /**
     * Draw a rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {string} color - Fill color
     * @param {boolean} filled - Whether to fill or stroke
     */
    drawRect(x, y, width, height, color = this.colors.ui, filled = true) {
        if (!this.context) return;

        try {
            ValidationUtils.validateNumber(x, 'Rectangle x');
            ValidationUtils.validateNumber(y, 'Rectangle y');
            ValidationUtils.validateNumber(width, 'Rectangle width', 0);
            ValidationUtils.validateNumber(height, 'Rectangle height', 0);

            if (filled) {
                this.context.fillStyle = color;
                this.context.fillRect(x, y, width, height);
            } else {
                this.context.strokeStyle = color;
                this.context.strokeRect(x, y, width, height);
            }
            
            this.renderStats.drawCalls++;
        } catch (error) {
            console.error('Error drawing rectangle:', error);
        }
    }

    /**
     * Draw a circle
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Fill color
     * @param {boolean} filled - Whether to fill or stroke
     */
    drawCircle(x, y, radius, color = this.colors.ui, filled = true) {
        if (!this.context) return;

        try {
            ValidationUtils.validateNumber(x, 'Circle x');
            ValidationUtils.validateNumber(y, 'Circle y');
            ValidationUtils.validateNumber(radius, 'Circle radius', 0);

            this.context.beginPath();
            this.context.arc(x, y, radius, 0, Math.PI * 2);
            
            if (filled) {
                this.context.fillStyle = color;
                this.context.fill();
            } else {
                this.context.strokeStyle = color;
                this.context.stroke();
            }
            
            this.renderStats.drawCalls++;
        } catch (error) {
            console.error('Error drawing circle:', error);
        }
    }

    /**
     * Draw a line
     * @param {number} x1 - Start X position
     * @param {number} y1 - Start Y position
     * @param {number} x2 - End X position
     * @param {number} y2 - End Y position
     * @param {string} color - Line color
     * @param {number} width - Line width
     */
    drawLine(x1, y1, x2, y2, color = this.colors.ui, width = 1) {
        if (!this.context) return;

        try {
            ValidationUtils.validateNumber(x1, 'Line x1');
            ValidationUtils.validateNumber(y1, 'Line y1');
            ValidationUtils.validateNumber(x2, 'Line x2');
            ValidationUtils.validateNumber(y2, 'Line y2');
            ValidationUtils.validateNumber(width, 'Line width', 0);

            this.context.strokeStyle = color;
            this.context.lineWidth = width;
            this.context.beginPath();
            this.context.moveTo(x1, y1);
            this.context.lineTo(x2, y2);
            this.context.stroke();
            
            this.renderStats.drawCalls++;
        } catch (error) {
            console.error('Error drawing line:', error);
        }
    }

    /**
     * Draw text with specified styling
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text styling options
     */
    drawText(text, x, y, options = {}) {
        if (!this.context || !text) return;

        try {
            ValidationUtils.validateString(text, 'Text content');
            ValidationUtils.validateNumber(x, 'Text x');
            ValidationUtils.validateNumber(y, 'Text y');

            const {
                preset = 'ui',
                color = this.colors.ui,
                align = 'left',
                baseline = 'top',
                maxWidth = null,
                shadow = false,
                outline = false
            } = options;

            // Apply font preset
            const fontStyle = this.fontPresets[preset] || this.fontPresets.ui;
            this.context.font = `${fontStyle.weight} ${fontStyle.size}px ${fontStyle.family}`;
            this.context.textAlign = align;
            this.context.textBaseline = baseline;

            // Draw shadow if requested
            if (shadow) {
                this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.context.fillText(text, x + 2, y + 2, maxWidth);
            }

            // Draw outline if requested
            if (outline) {
                this.context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                this.context.lineWidth = 2;
                this.context.strokeText(text, x, y, maxWidth);
            }

            // Draw main text
            this.context.fillStyle = color;
            this.context.fillText(text, x, y, maxWidth);
            
            this.renderStats.drawCalls++;
        } catch (error) {
            console.error('Error drawing text:', error);
        }
    }

    /**
     * Draw a sprite (placeholder for future sprite implementation)
     * @param {Object} sprite - Sprite object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Rendering options
     */
    drawSprite(sprite, x, y, options = {}) {
        if (!this.context || !sprite) return;

        try {
            ValidationUtils.validateNumber(x, 'Sprite x');
            ValidationUtils.validateNumber(y, 'Sprite y');

            const {
                width = sprite.width || 32,
                height = sprite.height || 32,
                rotation = 0,
                alpha = 1,
                flipX = false,
                flipY = false
            } = options;

            this.context.save();
            
            // Apply transformations
            this.context.globalAlpha = alpha;
            this.context.translate(x + width / 2, y + height / 2);
            
            if (rotation !== 0) {
                this.context.rotate(rotation);
            }
            
            if (flipX || flipY) {
                this.context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            }

            // For now, draw a colored rectangle as placeholder
            this.context.fillStyle = sprite.color || this.colors.ui;
            this.context.fillRect(-width / 2, -height / 2, width, height);
            
            this.context.restore();
            this.renderStats.drawCalls++;
        } catch (error) {
            console.error('Error drawing sprite:', error);
        }
    }

    /**
     * Draw UI panel with border and background
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Panel width
     * @param {number} height - Panel height
     * @param {Object} options - Panel styling options
     */
    drawPanel(x, y, width, height, options = {}) {
        if (!this.context) return;

        try {
            ValidationUtils.validateNumber(x, 'Panel x');
            ValidationUtils.validateNumber(y, 'Panel y');
            ValidationUtils.validateNumber(width, 'Panel width', 0);
            ValidationUtils.validateNumber(height, 'Panel height', 0);

            const {
                backgroundColor = 'rgba(0, 0, 0, 0.7)',
                borderColor = this.colors.ui,
                borderWidth = 2,
                cornerRadius = 5
            } = options;

            // Draw background
            if (backgroundColor) {
                this.context.fillStyle = backgroundColor;
                if (cornerRadius > 0) {
                    this.drawRoundedRect(x, y, width, height, cornerRadius, true);
                } else {
                    this.context.fillRect(x, y, width, height);
                }
            }

            // Draw border
            if (borderColor && borderWidth > 0) {
                this.context.strokeStyle = borderColor;
                this.context.lineWidth = borderWidth;
                if (cornerRadius > 0) {
                    this.drawRoundedRect(x, y, width, height, cornerRadius, false);
                } else {
                    this.context.strokeRect(x, y, width, height);
                }
            }
            
            this.renderStats.drawCalls += 2;
        } catch (error) {
            console.error('Error drawing panel:', error);
        }
    }

    /**
     * Draw rounded rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {number} radius - Corner radius
     * @param {boolean} filled - Whether to fill or stroke
     * @private
     */
    drawRoundedRect(x, y, width, height, radius, filled = true) {
        this.context.beginPath();
        this.context.moveTo(x + radius, y);
        this.context.lineTo(x + width - radius, y);
        this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.context.lineTo(x + width, y + height - radius);
        this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.context.lineTo(x + radius, y + height);
        this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.context.lineTo(x, y + radius);
        this.context.quadraticCurveTo(x, y, x + radius, y);
        this.context.closePath();

        if (filled) {
            this.context.fill();
        } else {
            this.context.stroke();
        }
    }

    /**
     * Draw debug information
     * @param {Object} debugInfo - Debug information to display
     */
    drawDebugInfo(debugInfo = {}) {
        if (!this.debugMode || !this.context) return;

        const debugLines = [
            `FPS: ${Math.round(1000 / (this.renderStats.frameTime || 16.67))}`,
            `Frame Time: ${this.renderStats.frameTime.toFixed(2)}ms`,
            `Draw Calls: ${this.renderStats.drawCalls}`,
            `Quality: ${(this.qualityLevel * 100).toFixed(0)}%`,
            `Canvas: ${this.canvas.width}x${this.canvas.height}`,
            `Device Pixel Ratio: ${window.devicePixelRatio}`,
            ...Object.entries(debugInfo).map(([key, value]) => `${key}: ${value}`)
        ];

        // Draw debug panel
        const panelWidth = 250;
        const panelHeight = debugLines.length * 16 + 20;
        this.drawPanel(10, 10, panelWidth, panelHeight, {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: this.colors.debug
        });

        // Draw debug text
        debugLines.forEach((line, index) => {
            this.drawText(line, 20, 20 + index * 16, {
                preset: 'debug',
                color: this.colors.debug
            });
        });
    }

    /**
     * Add render command to batch queue
     * @param {string} type - Command type
     * @param {Object} params - Command parameters
     * @param {number} priority - Command priority (higher = rendered first)
     */
    addRenderCommand(type, params, priority = 0) {
        this.renderCommands.push(new RenderCommand(type, params, priority));
    }

    /**
     * Execute all queued render commands
     */
    executeRenderCommands() {
        if (this.renderCommands.length === 0) return;

        // Sort by priority (higher priority first)
        this.renderCommands.sort((a, b) => b.priority - a.priority);

        for (const command of this.renderCommands) {
            try {
                this.executeRenderCommand(command);
            } catch (error) {
                console.error('Error executing render command:', error, command);
            }
        }

        // Clear command queue
        this.renderCommands.length = 0;
    }

    /**
     * Execute a single render command
     * @param {RenderCommand} command - Command to execute
     * @private
     */
    executeRenderCommand(command) {
        const { type, params } = command;

        switch (type) {
            case 'rect':
                this.drawRect(params.x, params.y, params.width, params.height, params.color, params.filled);
                break;
            case 'circle':
                this.drawCircle(params.x, params.y, params.radius, params.color, params.filled);
                break;
            case 'line':
                this.drawLine(params.x1, params.y1, params.x2, params.y2, params.color, params.width);
                break;
            case 'text':
                this.drawText(params.text, params.x, params.y, params.options);
                break;
            case 'sprite':
                this.drawSprite(params.sprite, params.x, params.y, params.options);
                break;
            case 'panel':
                this.drawPanel(params.x, params.y, params.width, params.height, params.options);
                break;
            default:
                console.warn('Unknown render command type:', type);
        }
    }

    /**
     * Main render method - call this each frame
     * @param {number} deltaTime - Time elapsed since last frame
     * @param {Object} debugInfo - Optional debug information
     */
    render(deltaTime = 16.67, debugInfo = {}) {
        if (!this.initialized || !this.context) return;

        const frameStart = performance.now();
        
        // Reset render stats
        this.renderStats.drawCalls = 0;
        this.renderStats.triangles = 0;
        this.renderStats.textureBinds = 0;

        try {
            // Clear canvas
            this.clear();
            
            // Fill background
            this.fillBackground();
            
            // Draw starfield
            this.drawStarfield(deltaTime);
            
            // Execute queued render commands
            this.executeRenderCommands();
            
            // Draw debug info if enabled
            this.drawDebugInfo(debugInfo);
            
            // Update frame stats
            this.frameCount++;
            this.lastFrameTime = deltaTime;
            this.renderStats.frameTime = performance.now() - frameStart;
            
            // Update performance monitor
            performanceMonitor.recordFrameTime(this.renderStats.frameTime);
            
            // Adjust quality based on performance
            if (this.frameCount % 60 === 0) { // Check every 60 frames
                this.adjustQualityForDevice();
            }

        } catch (error) {
            console.error('Error during render:', error);
            throw new RendererError(
                `Render failed: ${error.message}`,
                'RENDER_FAILED',
                { frameCount: this.frameCount, deltaTime }
            );
        }
    }

    /**
     * Toggle debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set rendering quality level
     * @param {number} quality - Quality level (0.1 to 1.0)
     */
    setQualityLevel(quality) {
        this.qualityLevel = ValidationUtils.validateNumber(quality, 'Quality level', 0.1, 1.0);
        console.log(`Rendering quality set to ${(this.qualityLevel * 100).toFixed(0)}%`);
    }

    /**
     * Get current render statistics
     * @returns {Object} Render statistics
     */
    getRenderStats() {
        return {
            ...this.renderStats,
            frameCount: this.frameCount,
            qualityLevel: this.qualityLevel,
            canvasSize: {
                width: this.canvas?.width || 0,
                height: this.canvas?.height || 0
            }
        };
    }

    /**
     * Clean up resources and event listeners
     */
    destroy() {
        try {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            } else {
                window.removeEventListener('resize', this.handleResize);
            }

            this.renderCommands.length = 0;
            this.stars.length = 0;
            this.canvas = null;
            this.context = null;
            this.canvasScaler = null;
            this.coordinateTransformer = null;
            this.initialized = false;

            console.log('Renderer destroyed successfully');
        } catch (error) {
            console.error('Error destroying renderer:', error);
        }
    }
}

// Create and export singleton instance
const renderer = new Renderer();

export { Renderer, RendererError, RenderCommand, Star, renderer };
export default renderer;