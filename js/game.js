/**
 * Space Invaders Game - Core Game Engine
 * 
 * This module implements the main game class that manages the core game loop,
 * canvas rendering, and fundamental game state. It follows a clean architecture
 * pattern with clear separation of concerns and provides a solid foundation
 * for the Space Invaders game.
 * 
 * Key Features:
 * - High-performance game loop with requestAnimationFrame
 * - Canvas context management with automatic scaling
 * - FPS monitoring and performance tracking
 * - Robust error handling and graceful degradation
 * - Event-driven architecture for extensibility
 * - Memory-efficient resource management
 * 
 * Architecture Decisions:
 * - Uses composition over inheritance for game systems
 * - Implements observer pattern for game state changes
 * - Provides hooks for dependency injection
 * - Maintains immutable game state where possible
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Game state enumeration for type safety and clarity
 * @readonly
 * @enum {string}
 */
const GameState = Object.freeze({
    INITIALIZING: 'initializing',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    LOADING: 'loading',
    ERROR: 'error'
});

/**
 * Performance monitoring configuration
 * @readonly
 * @type {Object}
 */
const PERFORMANCE_CONFIG = Object.freeze({
    FPS_SAMPLE_SIZE: 60,
    TARGET_FPS: 60,
    MIN_FRAME_TIME: 1000 / 120, // 120 FPS cap
    MAX_FRAME_TIME: 1000 / 30,  // 30 FPS minimum
    PERFORMANCE_WARNING_THRESHOLD: 0.8
});

/**
 * Canvas configuration constants
 * @readonly
 * @type {Object}
 */
const CANVAS_CONFIG = Object.freeze({
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 240,
    ASPECT_RATIO: 4/3,
    PIXEL_RATIO_THRESHOLD: 2
});

/**
 * Main Game class that orchestrates the entire game experience.
 * 
 * This class is responsible for:
 * - Managing the game loop and rendering cycle
 * - Handling canvas setup and context management
 * - Coordinating between different game systems
 * - Monitoring performance and providing diagnostics
 * - Managing game state transitions
 * 
 * @class Game
 */
class Game {
    /**
     * Creates a new Game instance
     * 
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     * @param {Object} options - Configuration options
     * @param {number} [options.width=800] - Canvas width
     * @param {number} [options.height=600] - Canvas height
     * @param {boolean} [options.debug=false] - Enable debug mode
     * @param {boolean} [options.autoStart=true] - Auto-start the game loop
     * @throws {Error} When canvas is invalid or context cannot be created
     */
    constructor(canvas, options = {}) {
        // Validate and store canvas reference
        this._validateCanvas(canvas);
        this.canvas = canvas;
        
        // Initialize configuration with defaults
        this.config = {
            width: options.width || CANVAS_CONFIG.DEFAULT_WIDTH,
            height: options.height || CANVAS_CONFIG.DEFAULT_HEIGHT,
            debug: Boolean(options.debug),
            autoStart: options.autoStart !== false
        };
        
        // Initialize core properties
        this._initializeProperties();
        
        // Setup canvas and rendering context
        this._setupCanvas();
        
        // Initialize performance monitoring
        this._initializePerformanceMonitoring();
        
        // Setup event system
        this._initializeEventSystem();
        
        // Initialize game systems
        this._initializeGameSystems();
        
        // Setup error handling
        this._setupErrorHandling();
        
        // Log successful initialization
        this._log('info', 'Game initialized successfully', {
            canvasSize: `${this.config.width}x${this.config.height}`,
            debug: this.config.debug,
            devicePixelRatio: window.devicePixelRatio || 1
        });
        
        // Auto-start if configured
        if (this.config.autoStart) {
            this.start();
        }
    }
    
    /**
     * Initialize core game properties
     * @private
     */
    _initializeProperties() {
        // Game state management
        this.state = GameState.INITIALIZING;
        this.previousState = null;
        
        // Timing and performance
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.startTime = performance.now();
        
        // Game loop control
        this.isRunning = false;
        this.isPaused = false;
        this.animationFrameId = null;
        
        // Error handling
        this.errorCount = 0;
        this.lastError = null;
        
        // Event listeners storage for cleanup
        this.eventListeners = new Map();
        
        // Game systems registry
        this.systems = new Map();
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            averageFps: 0,
            frameTime: 0,
            memoryUsage: 0,
            renderTime: 0
        };
    }
    
    /**
     * Validate canvas element
     * @private
     * @param {HTMLCanvasElement} canvas - Canvas to validate
     * @throws {Error} When canvas is invalid
     */
    _validateCanvas(canvas) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }
        
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Provided element is not a canvas');
        }
        
        if (!canvas.getContext) {
            throw new Error('Canvas does not support getContext method');
        }
    }
    
    /**
     * Setup canvas properties and rendering context
     * @private
     * @throws {Error} When WebGL context cannot be created
     */
    _setupCanvas() {
        try {
            // Get 2D rendering context with optimizations
            this.ctx = this.canvas.getContext('2d', {
                alpha: false,
                desynchronized: true,
                willReadFrequently: false
            });
            
            if (!this.ctx) {
                throw new Error('Failed to get 2D rendering context');
            }
            
            // Configure canvas dimensions
            this._configureCanvasDimensions();
            
            // Setup rendering optimizations
            this._setupRenderingOptimizations();
            
            // Configure canvas styling
            this._configureCanvasStyle();
            
        } catch (error) {
            this._handleError('Canvas setup failed', error);
            throw error;
        }
    }
    
    /**
     * Configure canvas dimensions with device pixel ratio support
     * @private
     */
    _configureCanvasDimensions() {
        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            CANVAS_CONFIG.PIXEL_RATIO_THRESHOLD
        );
        
        // Set display size
        this.canvas.style.width = `${this.config.width}px`;
        this.canvas.style.height = `${this.config.height}px`;
        
        // Set actual canvas size for crisp rendering
        this.canvas.width = this.config.width * pixelRatio;
        this.canvas.height = this.config.height * pixelRatio;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(pixelRatio, pixelRatio);
        
        // Store scaling information
        this.pixelRatio = pixelRatio;
        this.displayWidth = this.config.width;
        this.displayHeight = this.config.height;
        this.actualWidth = this.canvas.width;
        this.actualHeight = this.canvas.height;
    }
    
    /**
     * Setup rendering optimizations
     * @private
     */
    _setupRenderingOptimizations() {
        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Set default text properties
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.font = '16px Arial, sans-serif';
        
        // Set default drawing properties
        this.ctx.lineWidth = 1;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    /**
     * Configure canvas CSS styling
     * @private
     */
    _configureCanvasStyle() {
        const style = this.canvas.style;
        
        // Prevent context menu and selection
        style.userSelect = 'none';
        style.webkitUserSelect = 'none';
        style.mozUserSelect = 'none';
        style.msUserSelect = 'none';
        
        // Optimize for games
        style.imageRendering = 'pixelated';
        style.imageRendering = 'crisp-edges';
        
        // Ensure proper display
        if (!style.display) {
            style.display = 'block';
        }
    }
    
    /**
     * Initialize performance monitoring system
     * @private
     */
    _initializePerformanceMonitoring() {
        this.fpsHistory = new Array(PERFORMANCE_CONFIG.FPS_SAMPLE_SIZE).fill(0);
        this.fpsHistoryIndex = 0;
        this.lastFpsUpdate = 0;
        this.frameTimeHistory = [];
        
        // Setup performance observer if available
        if ('PerformanceObserver' in window) {
            try {
                this.performanceObserver = new PerformanceObserver((list) => {
                    this._processPerformanceEntries(list.getEntries());
                });
                
                this.performanceObserver.observe({
                    entryTypes: ['measure', 'navigation', 'resource']
                });
            } catch (error) {
                this._log('warn', 'Performance observer setup failed', error);
            }
        }
    }
    
    /**
     * Initialize event system for game communication
     * @private
     */
    _initializeEventSystem() {
        // Create event target for custom events
        this.eventTarget = new EventTarget();
        
        // Setup window event listeners
        this._setupWindowEventListeners();
        
        // Setup canvas event listeners
        this._setupCanvasEventListeners();
    }
    
    /**
     * Setup window-level event listeners
     * @private
     */
    _setupWindowEventListeners() {
        const listeners = [
            ['resize', this._handleResize.bind(this)],
            ['beforeunload', this._handleBeforeUnload.bind(this)],
            ['visibilitychange', this._handleVisibilityChange.bind(this)],
            ['error', this._handleWindowError.bind(this)],
            ['unhandledrejection', this._handleUnhandledRejection.bind(this)]
        ];
        
        listeners.forEach(([event, handler]) => {
            window.addEventListener(event, handler, { passive: true });
            this.eventListeners.set(`window:${event}`, handler);
        });
    }
    
    /**
     * Setup canvas-specific event listeners
     * @private
     */
    _setupCanvasEventListeners() {
        const listeners = [
            ['contextlost', this._handleContextLost.bind(this)],
            ['contextrestored', this._handleContextRestored.bind(this)]
        ];
        
        listeners.forEach(([event, handler]) => {
            this.canvas.addEventListener(event, handler);
            this.eventListeners.set(`canvas:${event}`, handler);
        });
    }
    
    /**
     * Initialize game systems
     * @private
     */
    _initializeGameSystems() {
        // Systems will be registered here as they're created
        // This provides a clean extension point for adding new systems
        
        this._log('info', 'Game systems initialized', {
            systemCount: this.systems.size
        });
    }
    
    /**
     * Setup comprehensive error handling
     * @private
     */
    _setupErrorHandling() {
        // Set maximum error count before emergency stop
        this.maxErrors = 10;
        this.errorResetTime = 60000; // 1 minute
        this.lastErrorReset = Date.now();
    }
    
    /**
     * Start the game loop
     * 
     * @public
     * @returns {Promise<void>} Resolves when game starts successfully
     * @throws {Error} When game cannot be started
     */
    async start() {
        try {
            if (this.isRunning) {
                this._log('warn', 'Game is already running');
                return;
            }
            
            this._log('info', 'Starting game...');
            
            // Transition to loading state
            this._changeState(GameState.LOADING);
            
            // Initialize game resources
            await this._initializeResources();
            
            // Start the game loop
            this.isRunning = true;
            this.startTime = performance.now();
            this.lastFrameTime = this.startTime;
            
            // Transition to menu state
            this._changeState(GameState.MENU);
            
            // Start the render loop
            this._gameLoop();
            
            // Emit start event
            this._emitEvent('gameStarted', {
                timestamp: this.startTime,
                config: this.config
            });
            
            this._log('info', 'Game started successfully');
            
        } catch (error) {
            this._handleError('Failed to start game', error);
            throw error;
        }
    }
    
    /**
     * Stop the game loop
     * 
     * @public
     * @returns {void}
     */
    stop() {
        if (!this.isRunning) {
            this._log('warn', 'Game is not running');
            return;
        }
        
        this._log('info', 'Stopping game...');
        
        // Stop the animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Update state
        this.isRunning = false;
        this.isPaused = false;
        this._changeState(GameState.MENU);
        
        // Emit stop event
        this._emitEvent('gameStopped', {
            timestamp: performance.now(),
            duration: performance.now() - this.startTime,
            frameCount: this.frameCount
        });
        
        this._log('info', 'Game stopped');
    }
    
    /**
     * Pause the game
     * 
     * @public
     * @returns {void}
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        
        this.isPaused = true;
        this.previousState = this.state;
        this._changeState(GameState.PAUSED);
        
        this._emitEvent('gamePaused', {
            timestamp: performance.now(),
            previousState: this.previousState
        });
        
        this._log('info', 'Game paused');
    }
    
    /**
     * Resume the game from pause
     * 
     * @public
     * @returns {void}
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        const resumeState = this.previousState || GameState.PLAYING;
        this._changeState(resumeState);
        
        // Reset timing to prevent large delta jumps
        this.lastFrameTime = performance.now();
        
        this._emitEvent('gameResumed', {
            timestamp: performance.now(),
            resumedState: resumeState
        });
        
        this._log('info', 'Game resumed');
    }
    
    /**
     * Main game loop using requestAnimationFrame
     * 
     * @private
     * @returns {void}
     */
    _gameLoop() {
        if (!this.isRunning) {
            return;
        }
        
        try {
            const currentTime = performance.now();
            
            // Calculate delta time with clamping
            this.deltaTime = Math.min(
                Math.max(currentTime - this.lastFrameTime, PERFORMANCE_CONFIG.MIN_FRAME_TIME),
                PERFORMANCE_CONFIG.MAX_FRAME_TIME
            );
            
            // Update performance metrics
            this._updatePerformanceMetrics(currentTime);
            
            // Only update and render if not paused
            if (!this.isPaused) {
                // Update game logic
                this._update(this.deltaTime);
                
                // Render frame
                const renderStart = performance.now();
                this._render();
                this.metrics.renderTime = performance.now() - renderStart;
            }
            
            // Update timing
            this.lastFrameTime = currentTime;
            this.frameCount++;
            
            // Schedule next frame
            this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
            
        } catch (error) {
            this._handleError('Game loop error', error);
            
            // Continue loop unless too many errors
            if (this.errorCount < this.maxErrors) {
                this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
            } else {
                this._emergencyStop();
            }
        }
    }
    
    /**
     * Update game logic
     * 
     * @private
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @returns {void}
     */
    _update(deltaTime) {
        // Update all registered systems
        for (const [name, system] of this.systems) {
            try {
                if (system.update && typeof system.update === 'function') {
                    system.update(deltaTime);
                }
            } catch (error) {
                this._handleError(`System update error: ${name}`, error);
            }
        }
        
        // Emit update event for external systems
        this._emitEvent('gameUpdate', {
            deltaTime,
            frameCount: this.frameCount,
            state: this.state
        });
    }
    
    /**
     * Render the current frame
     * 
     * @private
     * @returns {void}
     */
    _render() {
        // Clear the canvas
        this._clearCanvas();
        
        // Render all systems
        for (const [name, system] of this.systems) {
            try {
                if (system.render && typeof system.render === 'function') {
                    system.render(this.ctx);
                }
            } catch (error) {
                this._handleError(`System render error: ${name}`, error);
            }
        }
        
        // Render debug information if enabled
        if (this.config.debug) {
            this._renderDebugInfo();
        }
        
        // Emit render event
        this._emitEvent('gameRender', {
            frameCount: this.frameCount,
            renderTime: this.metrics.renderTime
        });
    }
    
    /**
     * Clear the canvas for the next frame
     * 
     * @private
     * @returns {void}
     */
    _clearCanvas() {
        // Use fillRect for better performance than clearRect
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    }
    
    /**
     * Render debug information overlay
     * 
     * @private
     * @returns {void}
     */
    _renderDebugInfo() {
        const ctx = this.ctx;
        const padding = 10;
        const lineHeight = 20;
        let y = padding;
        
        // Setup debug text style
        ctx.save();
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Add semi-transparent background
        const debugInfo = this._getDebugInfo();
        const maxWidth = Math.max(...debugInfo.map(line => ctx.measureText(line).width));
        const backgroundHeight = debugInfo.length * lineHeight + padding;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, maxWidth + padding * 2, backgroundHeight);
        
        // Render debug text
        ctx.fillStyle = '#00ff00';
        debugInfo.forEach(line => {
            ctx.fillText(line, padding, y);
            y += lineHeight;
        });
        
        ctx.restore();
    }
    
    /**
     * Get debug information array
     * 
     * @private
     * @returns {string[]} Array of debug info lines
     */
    _getDebugInfo() {
        const memoryInfo = this._getMemoryInfo();
        
        return [
            `FPS: ${this.metrics.fps.toFixed(1)} (avg: ${this.metrics.averageFps.toFixed(1)})`,
            `Frame: ${this.frameCount}`,
            `Delta: ${this.deltaTime.toFixed(2)}ms`,
            `Render: ${this.metrics.renderTime.toFixed(2)}ms`,
            `State: ${this.state}`,
            `Memory: ${memoryInfo.used}MB / ${memoryInfo.total}MB`,
            `Canvas: ${this.actualWidth}x${this.actualHeight} (${this.pixelRatio}x)`,
            `Systems: ${this.systems.size}`,
            `Errors: ${this.errorCount}`
        ];
    }
    
    /**
     * Update performance metrics
     * 
     * @private
     * @param {number} currentTime - Current timestamp
     * @returns {void}
     */
    _updatePerformanceMetrics(currentTime) {
        // Calculate FPS
        const fps = 1000 / this.deltaTime;
        this.fpsHistory[this.fpsHistoryIndex] = fps;
        this.fpsHistoryIndex = (this.fpsHistoryIndex + 1) % PERFORMANCE_CONFIG.FPS_SAMPLE_SIZE;
        
        // Update FPS metrics every second
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.metrics.fps = fps;
            this.metrics.averageFps = this.fpsHistory.reduce((a, b) => a + b, 0) / PERFORMANCE_CONFIG.FPS_SAMPLE_SIZE;
            this.metrics.frameTime = this.deltaTime;
            this.lastFpsUpdate = currentTime;
            
            // Check for performance issues
            this._checkPerformance();
        }
        
        // Update memory usage if available
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
        }
    }
    
    /**
     * Check for performance issues and emit warnings
     * 
     * @private
     * @returns {void}
     */
    _checkPerformance() {
        const targetFps = PERFORMANCE_CONFIG.TARGET_FPS;
        const warningThreshold = targetFps * PERFORMANCE_CONFIG.PERFORMANCE_WARNING_THRESHOLD;
        
        if (this.metrics.averageFps < warningThreshold) {
            this._emitEvent('performanceWarning', {
                currentFps: this.metrics.averageFps,
                targetFps: targetFps,
                threshold: warningThreshold,
                memoryUsage: this.metrics.memoryUsage
            });
            
            this._log('warn', 'Performance warning', {
                fps: this.metrics.averageFps,
                target: targetFps,
                memory: this.metrics.memoryUsage
            });
        }
    }
    
    /**
     * Initialize game resources
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _initializeResources() {
        // This method will be extended as resources are added
        // For now, just simulate loading time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this._log('info', 'Resources initialized');
    }
    
    /**
     * Change game state with validation and events
     * 
     * @private
     * @param {string} newState - New game state
     * @returns {void}
     */
    _changeState(newState) {
        if (!Object.values(GameState).includes(newState)) {
            throw new Error(`Invalid game state: ${newState}`);
        }
        
        const oldState = this.state;
        this.state = newState;
        
        this._emitEvent('stateChanged', {
            oldState,
            newState,
            timestamp: performance.now()
        });
        
        this._log('info', 'State changed', { from: oldState, to: newState });
    }
    
    /**
     * Register a game system
     * 
     * @public
     * @param {string} name - System name
     * @param {Object} system - System object with update/render methods
     * @returns {void}
     * @throws {Error} When system is invalid
     */
    registerSystem(name, system) {
        if (!name || typeof name !== 'string') {
            throw new Error('System name must be a non-empty string');
        }
        
        if (!system || typeof system !== 'object') {
            throw new Error('System must be an object');
        }
        
        if (this.systems.has(name)) {
            this._log('warn', `System '${name}' is being replaced`);
        }
        
        this.systems.set(name, system);
        
        this._log('info', `System '${name}' registered`);
        
        this._emitEvent('systemRegistered', { name, system });
    }
    
    /**
     * Unregister a game system
     * 
     * @public
     * @param {string} name - System name to remove
     * @returns {boolean} True if system was removed
     */
    unregisterSystem(name) {
        const removed = this.systems.delete(name);
        
        if (removed) {
            this._log('info', `System '${name}' unregistered`);
            this._emitEvent('systemUnregistered', { name });
        }
        
        return removed;
    }
    
    /**
     * Get current game metrics
     * 
     * @public
     * @returns {Object} Current performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: performance.now() - this.startTime,
            frameCount: this.frameCount,
            state: this.state,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            systemCount: this.systems.size,
            errorCount: this.errorCount
        };
    }
    
    /**
     * Add event listener for game events
     * 
     * @public
     * @param {string} type - Event type
     * @param {Function} listener - Event listener function
     * @param {Object} [options] - Event listener options
     * @returns {void}
     */
    addEventListener(type, listener, options) {
        this.eventTarget.addEventListener(type, listener, options);
    }
    
    /**
     * Remove event listener
     * 
     * @public
     * @param {string} type - Event type
     * @param {Function} listener - Event listener function
     * @returns {void}
     */
    removeEventListener(type, listener) {
        this.eventTarget.removeEventListener(type, listener);
    }
    
    /**
     * Emit custom game event
     * 
     * @private
     * @param {string} type - Event type
     * @param {Object} [detail] - Event detail data
     * @returns {void}
     */
    _emitEvent(type, detail = {}) {
        const event = new CustomEvent(type, {
            detail: {
                ...detail,
                game: this,
                timestamp: performance.now()
            }
        });
        
        this.eventTarget.dispatchEvent(event);
    }
    
    /**
     * Handle window resize events
     * 
     * @private
     * @returns {void}
     */
    _handleResize() {
        // Debounce resize handling
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this._log('info', 'Handling window resize');
            
            // Reconfigure canvas dimensions
            this._configureCanvasDimensions();
            
            // Emit resize event
            this._emitEvent('canvasResized', {
                width: this.displayWidth,
                height: this.displayHeight,
                pixelRatio: this.pixelRatio
            });
        }, 100);
    }
    
    /**
     * Handle page visibility changes
     * 
     * @private
     * @returns {void}
     */
    _handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused) {
                this.pause();
                this._wasAutoPaused = true;
                this._log('info', 'Game auto-paused due to visibility change');
            }
        } else {
            if (this._wasAutoPaused && this.isPaused) {
                this.resume();
                this._wasAutoPaused = false;
                this._log('info', 'Game auto-resumed due to visibility change');
            }
        }
    }
    
    /**
     * Handle before unload events
     * 
     * @private
     * @returns {void}
     */
    _handleBeforeUnload() {
        this._log('info', 'Page unloading, cleaning up game');
        this.destroy();
    }
    
    /**
     * Handle canvas context lost
     * 
     * @private
     * @param {Event} event - Context lost event
     * @returns {void}
     */
    _handleContextLost(event) {
        event.preventDefault();
        this._log('error', 'Canvas context lost');
        
        this.pause();
        this._emitEvent('contextLost', { event });
    }
    
    /**
     * Handle canvas context restored
     * 
     * @private
     * @param {Event} event - Context restored event
     * @returns {void}
     */
    _handleContextRestored(event) {
        this._log('info', 'Canvas context restored');
        
        // Reconfigure canvas
        this._setupRenderingOptimizations();
        
        this.resume();
        this._emitEvent('contextRestored', { event });
    }
    
    /**
     * Handle window errors
     * 
     * @private
     * @param {ErrorEvent} event - Error event
     * @returns {void}
     */
    _handleWindowError(event) {
        this._handleError('Window error', event.error);
    }
    
    /**
     * Handle unhandled promise rejections
     * 
     * @private
     * @param {PromiseRejectionEvent} event - Promise rejection event
     * @returns {void}
     */
    _handleUnhandledRejection(event) {
        this._handleError('Unhandled promise rejection', event.reason);
    }
    
    /**
     * Handle errors with logging and recovery
     * 
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @returns {void}
     */
    _handleError(message, error) {
        this.errorCount++;
        this.lastError = {
            message,
            error,
            timestamp: performance.now(),
            stack: error?.stack
        };
        
        // Reset error count periodically
        const now = Date.now();
        if (now - this.lastErrorReset > this.errorResetTime) {
            this.errorCount = 1;
            this.lastErrorReset = now;
        }
        
        this._log('error', message, {
            error: error?.message,
            stack: error?.stack,
            errorCount: this.errorCount
        });
        
        this._emitEvent('gameError', {
            message,
            error,
            errorCount: this.errorCount,
            canRecover: this.errorCount < this.maxErrors
        });
        
        // Emergency stop if too many errors
        if (this.errorCount >= this.maxErrors) {
            this._emergencyStop();
        }
    }
    
    /**
     * Emergency stop the game due to critical errors
     * 
     * @private
     * @returns {void}
     */
    _emergencyStop() {
        this._log('error', 'Emergency stop triggered due to excessive errors');
        
        this.stop();
        this._changeState(GameState.ERROR);
        
        this._emitEvent('emergencyStop', {
            errorCount: this.errorCount,
            lastError: this.lastError
        });
    }
    
    /**
     * Get memory information
     * 
     * @private
     * @returns {Object} Memory usage information
     */
    _getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        
        return { used: 0, total: 0, limit: 0 };
    }
    
    /**
     * Process performance entries from PerformanceObserver
     * 
     * @private
     * @param {PerformanceEntry[]} entries - Performance entries
     * @returns {void}
     */
    _processPerformanceEntries(entries) {
        entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name.startsWith('game-')) {
                this._log('debug', 'Performance measure', {
                    name: entry.name,
                    duration: entry.duration
                });
            }
        });
    }
    
    /**
     * Log messages with structured format
     * 
     * @private
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} message - Log message
     * @param {Object} [data] - Additional log data
     * @returns {void}
     */
    _log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component: 'Game',
            message,
            frameCount: this.frameCount,
            state: this.state,
            ...data
        };
        
        // Use appropriate console method
        const consoleMethod = console[level] || console.log;
        consoleMethod(`[${logEntry.timestamp}] ${logEntry.level}: ${message}`, data);
        
        // Emit log event for external logging systems
        this._emitEvent('gameLog', logEntry);
    }
    
    /**
     * Clean up resources and event listeners
     * 
     * @public
     * @returns {void}
     */
    destroy() {
        this._log('info', 'Destroying game instance');
        
        // Stop the game loop
        this.stop();
        
        // Clean up event listeners
        for (const [key, handler] of this.eventListeners) {
            const [target, event] = key.split(':');
            if (target === 'window') {
                window.removeEventListener(event, handler);
            } else if (target === 'canvas') {
                this.canvas.removeEventListener(event, handler);
            }
        }
        this.eventListeners.clear();
        
        // Clean up performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Clear systems
        this.systems.clear();
        
        // Clear timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Emit destroy event
        this._emitEvent('gameDestroyed', {
            uptime: performance.now() - this.startTime,
            frameCount: this.frameCount
        });
        
        this._log('info', 'Game instance destroyed');
    }
}

// Export the Game class and related constants
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        Game,
        GameState,
        PERFORMANCE_CONFIG,
        CANVAS_CONFIG
    };
} else {
    // Browser environment
    window.Game = Game;
    window.GameState = GameState;
    window.PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;
    window.CANVAS_CONFIG = CANVAS_CONFIG;
}