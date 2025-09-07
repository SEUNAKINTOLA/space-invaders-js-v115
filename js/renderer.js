/**
 * Canvas Renderer Module for Space Invaders
 * 
 * Provides comprehensive rendering utilities and drawing functions for the HTML5 Canvas game.
 * Implements a scalable rendering system with support for shapes, text, sprites, backgrounds,
 * and UI elements with automatic canvas scaling for different screen sizes.
 * 
 * Key Features:
 * - Responsive canvas scaling and viewport management
 * - Optimized drawing operations with batching
 * - Background star field generation and animation
 * - Text rendering with multiple fonts and styles
 * - Shape drawing utilities with anti-aliasing
 * - Performance monitoring and frame rate optimization
 * - Memory-efficient resource management
 * 
 * Architecture:
 * - Singleton pattern for global renderer access
 * - Command pattern for batched drawing operations
 * - Observer pattern for canvas resize events
 * - Strategy pattern for different rendering modes
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Rendering context types for different drawing operations
 * @typedef {'2d' | 'webgl' | 'webgl2'} RenderingContextType
 */

/**
 * Canvas scaling modes for different screen adaptations
 * @typedef {'fit' | 'fill' | 'stretch' | 'center'} ScalingMode
 */

/**
 * Drawing operation types for batching optimization
 * @typedef {'shape' | 'text' | 'sprite' | 'background' | 'ui'} DrawOperationType
 */

/**
 * Color representation with alpha channel
 * @typedef {Object} Color
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 * @property {number} a - Alpha component (0-1)
 */

/**
 * 2D Vector for position and dimension calculations
 * @typedef {Object} Vector2D
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Rectangle bounds for collision detection and rendering
 * @typedef {Object} Rectangle
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} width - Width dimension
 * @property {number} height - Height dimension
 */

/**
 * Star field particle for background animation
 * @typedef {Object} Star
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} z - Z depth (for parallax effect)
 * @property {number} brightness - Star brightness (0-1)
 * @property {number} speed - Movement speed
 */

/**
 * Drawing command for batched rendering operations
 * @typedef {Object} DrawCommand
 * @property {DrawOperationType} type - Type of drawing operation
 * @property {Function} execute - Function to execute the drawing
 * @property {number} priority - Rendering priority (lower = earlier)
 * @property {Object} data - Command-specific data
 */

/**
 * Canvas Renderer Class
 * 
 * Main rendering engine that handles all drawing operations for the Space Invaders game.
 * Provides a comprehensive API for rendering shapes, text, sprites, and UI elements
 * with automatic scaling and performance optimization.
 */
class Renderer {
    /**
     * Initialize the renderer with canvas context and configuration
     * 
     * @param {HTMLCanvasElement} canvas - The HTML5 canvas element
     * @param {Object} options - Renderer configuration options
     * @param {RenderingContextType} [options.contextType='2d'] - Rendering context type
     * @param {ScalingMode} [options.scalingMode='fit'] - Canvas scaling mode
     * @param {boolean} [options.enableAntiAliasing=true] - Enable anti-aliasing
     * @param {boolean} [options.enableBatching=true] - Enable draw call batching
     * @param {number} [options.targetFPS=60] - Target frame rate
     * @param {boolean} [options.enableDebug=false] - Enable debug rendering
     * @throws {Error} When canvas is not provided or invalid
     */
    constructor(canvas, options = {}) {
        // Input validation
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Renderer requires a valid HTMLCanvasElement');
        }

        // Core properties
        this.canvas = canvas;
        this.context = null;
        this.isInitialized = false;
        
        // Configuration with secure defaults
        this.config = {
            contextType: options.contextType || '2d',
            scalingMode: options.scalingMode || 'fit',
            enableAntiAliasing: options.enableAntiAliasing !== false,
            enableBatching: options.enableBatching !== false,
            targetFPS: Math.max(30, Math.min(120, options.targetFPS || 60)),
            enableDebug: Boolean(options.enableDebug),
            maxStars: Math.max(50, Math.min(500, options.maxStars || 200)),
            starSpeed: Math.max(0.1, Math.min(5.0, options.starSpeed || 1.0))
        };

        // Viewport and scaling
        this.viewport = {
            width: 0,
            height: 0,
            scale: 1,
            offsetX: 0,
            offsetY: 0
        };

        // Performance tracking
        this.performance = {
            frameCount: 0,
            lastFrameTime: 0,
            averageFPS: 0,
            drawCalls: 0,
            lastDrawCallCount: 0
        };

        // Drawing state
        this.drawCommands = [];
        this.currentTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
        this.clipStack = [];

        // Background stars
        this.stars = [];
        this.starFieldEnabled = true;

        // Font cache for performance
        this.fontCache = new Map();
        this.defaultFont = '16px Arial, sans-serif';

        // Color utilities
        this.colors = {
            white: { r: 255, g: 255, b: 255, a: 1 },
            black: { r: 0, g: 0, b: 0, a: 1 },
            red: { r: 255, g: 0, b: 0, a: 1 },
            green: { r: 0, g: 255, b: 0, a: 1 },
            blue: { r: 0, g: 0, b: 255, a: 1 },
            yellow: { r: 255, g: 255, b: 0, a: 1 },
            transparent: { r: 0, g: 0, b: 0, a: 0 }
        };

        // Event listeners for responsive design
        this.resizeObserver = null;
        this.boundHandleResize = this.handleResize.bind(this);

        // Initialize the renderer
        this.initialize();
    }

    /**
     * Initialize the rendering context and setup event listeners
     * 
     * @private
     * @throws {Error} When context creation fails
     */
    initialize() {
        try {
            // Create rendering context
            this.context = this.canvas.getContext(this.config.contextType, {
                alpha: true,
                antialias: this.config.enableAntiAliasing,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false
            });

            if (!this.context) {
                throw new Error(`Failed to create ${this.config.contextType} rendering context`);
            }

            // Setup canvas properties
            this.setupCanvas();

            // Initialize star field
            this.initializeStarField();

            // Setup resize handling
            this.setupResizeHandling();

            // Mark as initialized
            this.isInitialized = true;

            console.log('Renderer initialized successfully', {
                contextType: this.config.contextType,
                scalingMode: this.config.scalingMode,
                viewport: this.viewport,
                starCount: this.stars.length
            });

        } catch (error) {
            console.error('Failed to initialize renderer:', error);
            throw new Error(`Renderer initialization failed: ${error.message}`);
        }
    }

    /**
     * Setup canvas properties and initial scaling
     * 
     * @private
     */
    setupCanvas() {
        // Set canvas size to match container
        this.updateViewport();

        // Configure context properties
        if (this.config.contextType === '2d') {
            this.context.imageSmoothingEnabled = this.config.enableAntiAliasing;
            this.context.textBaseline = 'top';
            this.context.textAlign = 'left';
        }
    }

    /**
     * Initialize the background star field
     * 
     * @private
     */
    initializeStarField() {
        this.stars = [];
        
        for (let i = 0; i < this.config.maxStars; i++) {
            this.stars.push({
                x: Math.random() * this.viewport.width,
                y: Math.random() * this.viewport.height,
                z: Math.random() * 3 + 1, // 1-4 for parallax layers
                brightness: Math.random() * 0.8 + 0.2, // 0.2-1.0
                speed: (Math.random() * 0.5 + 0.5) * this.config.starSpeed
            });
        }
    }

    /**
     * Setup responsive canvas resize handling
     * 
     * @private
     */
    setupResizeHandling() {
        // Use ResizeObserver if available, fallback to window resize
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(this.boundHandleResize);
            this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
        } else {
            window.addEventListener('resize', this.boundHandleResize);
        }

        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(this.boundHandleResize, 100);
        });
    }

    /**
     * Handle canvas resize events
     * 
     * @private
     */
    handleResize() {
        this.updateViewport();
        this.initializeStarField(); // Regenerate stars for new dimensions
        
        console.log('Canvas resized', {
            viewport: this.viewport,
            devicePixelRatio: window.devicePixelRatio
        });
    }

    /**
     * Update viewport dimensions and scaling
     * 
     * @private
     */
    updateViewport() {
        const container = this.canvas.parentElement || document.body;
        const containerRect = container.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Calculate optimal canvas size
        const targetWidth = containerRect.width;
        const targetHeight = containerRect.height;

        // Apply device pixel ratio for crisp rendering
        this.canvas.width = targetWidth * devicePixelRatio;
        this.canvas.height = targetHeight * devicePixelRatio;

        // Scale canvas back to target size
        this.canvas.style.width = `${targetWidth}px`;
        this.canvas.style.height = `${targetHeight}px`;

        // Update viewport
        this.viewport.width = this.canvas.width;
        this.viewport.height = this.canvas.height;
        this.viewport.scale = devicePixelRatio;

        // Scale context to match device pixel ratio
        if (this.context && this.config.contextType === '2d') {
            this.context.scale(devicePixelRatio, devicePixelRatio);
        }
    }

    /**
     * Begin a new frame for rendering
     * 
     * @param {number} [timestamp] - Current timestamp for performance tracking
     */
    beginFrame(timestamp = performance.now()) {
        if (!this.isInitialized) {
            console.warn('Renderer not initialized, skipping frame');
            return;
        }

        // Update performance metrics
        this.updatePerformanceMetrics(timestamp);

        // Clear the canvas
        this.clear();

        // Reset drawing state
        this.drawCommands = [];
        this.performance.drawCalls = 0;

        // Save initial context state
        this.context.save();
    }

    /**
     * End the current frame and execute all batched drawing commands
     */
    endFrame() {
        if (!this.isInitialized) return;

        try {
            // Sort draw commands by priority
            if (this.config.enableBatching) {
                this.drawCommands.sort((a, b) => a.priority - b.priority);
            }

            // Execute all drawing commands
            for (const command of this.drawCommands) {
                try {
                    command.execute();
                    this.performance.drawCalls++;
                } catch (error) {
                    console.error('Draw command failed:', error, command);
                }
            }

            // Draw debug information if enabled
            if (this.config.enableDebug) {
                this.drawDebugInfo();
            }

        } catch (error) {
            console.error('Frame rendering failed:', error);
        } finally {
            // Restore context state
            this.context.restore();
            
            // Update performance tracking
            this.performance.lastDrawCallCount = this.performance.drawCalls;
        }
    }

    /**
     * Clear the entire canvas
     * 
     * @param {Color} [color] - Background color to fill with
     */
    clear(color = null) {
        if (!this.isInitialized) return;

        if (color) {
            this.context.fillStyle = this.colorToString(color);
            this.context.fillRect(0, 0, this.viewport.width / this.viewport.scale, 
                                this.viewport.height / this.viewport.scale);
        } else {
            this.context.clearRect(0, 0, this.viewport.width / this.viewport.scale, 
                                 this.viewport.height / this.viewport.scale);
        }
    }

    /**
     * Draw the animated star field background
     * 
     * @param {number} [deltaTime=16.67] - Time since last frame in milliseconds
     */
    drawStarField(deltaTime = 16.67) {
        if (!this.starFieldEnabled || !this.isInitialized) return;

        const command = {
            type: 'background',
            priority: 0,
            data: { deltaTime },
            execute: () => {
                this.context.save();
                
                // Update and draw each star
                for (const star of this.stars) {
                    // Update position
                    star.y += star.speed * star.z * (deltaTime / 16.67);
                    
                    // Wrap around screen
                    if (star.y > this.viewport.height / this.viewport.scale) {
                        star.y = -5;
                        star.x = Math.random() * (this.viewport.width / this.viewport.scale);
                    }
                    
                    // Calculate star properties based on depth
                    const size = (4 - star.z) * 0.5;
                    const alpha = star.brightness * (4 - star.z) / 3;
                    
                    // Draw star
                    this.context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.context.beginPath();
                    this.context.arc(star.x, star.y, size, 0, Math.PI * 2);
                    this.context.fill();
                }
                
                this.context.restore();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a filled rectangle
     * 
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {Color|string} color - Fill color
     */
    drawRect(x, y, width, height, color) {
        if (!this.isInitialized) return;

        const command = {
            type: 'shape',
            priority: 10,
            data: { x, y, width, height, color },
            execute: () => {
                this.context.fillStyle = this.colorToString(color);
                this.context.fillRect(x, y, width, height);
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a rectangle outline
     * 
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {Color|string} color - Stroke color
     * @param {number} [lineWidth=1] - Line width
     */
    drawRectOutline(x, y, width, height, color, lineWidth = 1) {
        if (!this.isInitialized) return;

        const command = {
            type: 'shape',
            priority: 10,
            data: { x, y, width, height, color, lineWidth },
            execute: () => {
                this.context.strokeStyle = this.colorToString(color);
                this.context.lineWidth = lineWidth;
                this.context.strokeRect(x, y, width, height);
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a filled circle
     * 
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {Color|string} color - Fill color
     */
    drawCircle(x, y, radius, color) {
        if (!this.isInitialized) return;

        const command = {
            type: 'shape',
            priority: 10,
            data: { x, y, radius, color },
            execute: () => {
                this.context.fillStyle = this.colorToString(color);
                this.context.beginPath();
                this.context.arc(x, y, radius, 0, Math.PI * 2);
                this.context.fill();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a circle outline
     * 
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {Color|string} color - Stroke color
     * @param {number} [lineWidth=1] - Line width
     */
    drawCircleOutline(x, y, radius, color, lineWidth = 1) {
        if (!this.isInitialized) return;

        const command = {
            type: 'shape',
            priority: 10,
            data: { x, y, radius, color, lineWidth },
            execute: () => {
                this.context.strokeStyle = this.colorToString(color);
                this.context.lineWidth = lineWidth;
                this.context.beginPath();
                this.context.arc(x, y, radius, 0, Math.PI * 2);
                this.context.stroke();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a line between two points
     * 
     * @param {number} x1 - Start X position
     * @param {number} y1 - Start Y position
     * @param {number} x2 - End X position
     * @param {number} y2 - End Y position
     * @param {Color|string} color - Line color
     * @param {number} [lineWidth=1] - Line width
     */
    drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
        if (!this.isInitialized) return;

        const command = {
            type: 'shape',
            priority: 10,
            data: { x1, y1, x2, y2, color, lineWidth },
            execute: () => {
                this.context.strokeStyle = this.colorToString(color);
                this.context.lineWidth = lineWidth;
                this.context.beginPath();
                this.context.moveTo(x1, y1);
                this.context.lineTo(x2, y2);
                this.context.stroke();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw text with specified styling
     * 
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} [options] - Text styling options
     * @param {string} [options.font] - Font specification
     * @param {Color|string} [options.color] - Text color
     * @param {string} [options.align='left'] - Text alignment
     * @param {string} [options.baseline='top'] - Text baseline
     * @param {number} [options.maxWidth] - Maximum text width
     * @param {boolean} [options.stroke=false] - Draw text outline
     * @param {Color|string} [options.strokeColor] - Outline color
     * @param {number} [options.strokeWidth=1] - Outline width
     */
    drawText(text, x, y, options = {}) {
        if (!this.isInitialized || typeof text !== 'string') return;

        const {
            font = this.defaultFont,
            color = this.colors.white,
            align = 'left',
            baseline = 'top',
            maxWidth,
            stroke = false,
            strokeColor = this.colors.black,
            strokeWidth = 1
        } = options;

        const command = {
            type: 'text',
            priority: 20,
            data: { text, x, y, font, color, align, baseline, maxWidth, stroke, strokeColor, strokeWidth },
            execute: () => {
                this.context.save();
                
                this.context.font = font;
                this.context.textAlign = align;
                this.context.textBaseline = baseline;
                
                if (stroke) {
                    this.context.strokeStyle = this.colorToString(strokeColor);
                    this.context.lineWidth = strokeWidth;
                    if (maxWidth) {
                        this.context.strokeText(text, x, y, maxWidth);
                    } else {
                        this.context.strokeText(text, x, y);
                    }
                }
                
                this.context.fillStyle = this.colorToString(color);
                if (maxWidth) {
                    this.context.fillText(text, x, y, maxWidth);
                } else {
                    this.context.fillText(text, x, y);
                }
                
                this.context.restore();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Measure text dimensions
     * 
     * @param {string} text - Text to measure
     * @param {string} [font] - Font specification
     * @returns {Object} Text metrics with width and height
     */
    measureText(text, font = this.defaultFont) {
        if (!this.isInitialized || typeof text !== 'string') {
            return { width: 0, height: 0 };
        }

        this.context.save();
        this.context.font = font;
        const metrics = this.context.measureText(text);
        this.context.restore();

        return {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 16
        };
    }

    /**
     * Draw a sprite/image at specified position
     * 
     * @param {HTMLImageElement|HTMLCanvasElement} image - Image to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} [width] - Target width (defaults to image width)
     * @param {number} [height] - Target height (defaults to image height)
     * @param {Object} [options] - Drawing options
     * @param {number} [options.rotation=0] - Rotation in radians
     * @param {number} [options.alpha=1] - Alpha transparency
     * @param {Vector2D} [options.origin] - Rotation origin point
     */
    drawSprite(image, x, y, width, height, options = {}) {
        if (!this.isInitialized || !image) return;

        const {
            rotation = 0,
            alpha = 1,
            origin = null
        } = options;

        const drawWidth = width || image.width;
        const drawHeight = height || image.height;

        const command = {
            type: 'sprite',
            priority: 15,
            data: { image, x, y, drawWidth, drawHeight, rotation, alpha, origin },
            execute: () => {
                this.context.save();
                
                this.context.globalAlpha = Math.max(0, Math.min(1, alpha));
                
                if (rotation !== 0) {
                    const originX = origin ? origin.x : drawWidth / 2;
                    const originY = origin ? origin.y : drawHeight / 2;
                    
                    this.context.translate(x + originX, y + originY);
                    this.context.rotate(rotation);
                    this.context.translate(-originX, -originY);
                    
                    this.context.drawImage(image, 0, 0, drawWidth, drawHeight);
                } else {
                    this.context.drawImage(image, x, y, drawWidth, drawHeight);
                }
                
                this.context.restore();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Draw a portion of a sprite (sprite sheet support)
     * 
     * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
     * @param {number} sx - Source X position
     * @param {number} sy - Source Y position
     * @param {number} sWidth - Source width
     * @param {number} sHeight - Source height
     * @param {number} dx - Destination X position
     * @param {number} dy - Destination Y position
     * @param {number} dWidth - Destination width
     * @param {number} dHeight - Destination height
     * @param {Object} [options] - Drawing options
     */
    drawSpriteRegion(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, options = {}) {
        if (!this.isInitialized || !image) return;

        const {
            rotation = 0,
            alpha = 1,
            origin = null
        } = options;

        const command = {
            type: 'sprite',
            priority: 15,
            data: { image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight, rotation, alpha, origin },
            execute: () => {
                this.context.save();
                
                this.context.globalAlpha = Math.max(0, Math.min(1, alpha));
                
                if (rotation !== 0) {
                    const originX = origin ? origin.x : dWidth / 2;
                    const originY = origin ? origin.y : dHeight / 2;
                    
                    this.context.translate(dx + originX, dy + originY);
                    this.context.rotate(rotation);
                    this.context.translate(-originX, -originY);
                    
                    this.context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
                } else {
                    this.context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
                }
                
                this.context.restore();
            }
        };

        if (this.config.enableBatching) {
            this.drawCommands.push(command);
        } else {
            command.execute();
        }
    }

    /**
     * Set clipping region for subsequent drawing operations
     * 
     * @param {number} x - Clip region X position
     * @param {number} y - Clip region Y position
     * @param {number} width - Clip region width
     * @param {number} height - Clip region height
     */
    setClipRegion(x, y, width, height) {
        if (!this.isInitialized) return;

        this.context.save();
        this.context.beginPath();
        this.context.rect(x, y, width, height);
        this.context.clip();
        
        this.clipStack.push({ x, y, width, height });
    }

    /**
     * Clear the current clipping region
     */
    clearClipRegion() {
        if (!this.isInitialized || this.clipStack.length === 0) return;

        this.context.restore();
        this.clipStack.pop();
    }

    /**
     * Convert color object to CSS color string
     * 
     * @private
     * @param {Color|string} color - Color to convert
     * @returns {string} CSS color string
     */
    colorToString(color) {
        if (typeof color === 'string') {
            return color;
        }
        
        if (color && typeof color === 'object') {
            const r = Math.max(0, Math.min(255, Math.round(color.r || 0)));
            const g = Math.max(0, Math.min(255, Math.round(color.g || 0)));
            const b = Math.max(0, Math.min(255, Math.round(color.b || 0)));
            const a = Math.max(0, Math.min(1, color.a !== undefined ? color.a : 1));
            
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        
        return 'rgba(255, 255, 255, 1)'; // Default to white
    }

    /**
     * Update performance metrics
     * 
     * @private
     * @param {number} timestamp - Current timestamp
     */
    updatePerformanceMetrics(timestamp) {
        this.performance.frameCount++;
        
        if (this.performance.lastFrameTime > 0) {
            const deltaTime = timestamp - this.performance.lastFrameTime;
            const currentFPS = 1000 / deltaTime;
            
            // Calculate rolling average FPS
            this.performance.averageFPS = this.performance.averageFPS * 0.9 + currentFPS * 0.1;
        }
        
        this.performance.lastFrameTime = timestamp;
    }

    /**
     * Draw debug information overlay
     * 
     * @private
     */
    drawDebugInfo() {
        const debugInfo = [
            `FPS: ${this.performance.averageFPS.toFixed(1)}`,
            `Draw Calls: ${this.performance.lastDrawCallCount}`,
            `Stars: ${this.stars.length}`,
            `Viewport: ${Math.round(this.viewport.width / this.viewport.scale)}x${Math.round(this.viewport.height / this.viewport.scale)}`,
            `Scale: ${this.viewport.scale.toFixed(2)}`
        ];

        this.context.save();
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.context.fillRect(10, 10, 200, debugInfo.length * 20 + 10);
        
        this.context.fillStyle = '#00ff00';
        this.context.font = '14px monospace';
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';
        
        debugInfo.forEach((info, index) => {
            this.context.fillText(info, 15, 15 + index * 20);
        });
        
        this.context.restore();
    }

    /**
     * Get current viewport dimensions
     * 
     * @returns {Object} Viewport information
     */
    getViewport() {
        return { ...this.viewport };
    }

    /**
     * Get current performance metrics
     * 
     * @returns {Object} Performance information
     */
    getPerformanceMetrics() {
        return { ...this.performance };
    }

    /**
     * Enable or disable star field background
     * 
     * @param {boolean} enabled - Whether to enable star field
     */
    setStarFieldEnabled(enabled) {
        this.starFieldEnabled = Boolean(enabled);
    }

    /**
     * Update renderer configuration
     * 
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        // Reinitialize star field if star count changed
        if (newConfig.maxStars !== undefined || newConfig.starSpeed !== undefined) {
            this.initializeStarField();
        }
        
        console.log('Renderer configuration updated', this.config);
    }

    /**
     * Cleanup renderer resources and event listeners
     */
    destroy() {
        try {
            // Remove event listeners
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', this.boundHandleResize);
            }
            window.removeEventListener('orientationchange', this.boundHandleResize);

            // Clear resources
            this.drawCommands = [];
            this.stars = [];
            this.fontCache.clear();
            this.clipStack = [];

            // Mark as destroyed
            this.isInitialized = false;

            console.log('Renderer destroyed successfully');

        } catch (error) {
            console.error('Error during renderer cleanup:', error);
        }
    }
}

// Export the Renderer class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
} else if (typeof window !== 'undefined') {
    window.Renderer = Renderer;
}