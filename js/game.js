/**
 * Space Invaders Game - Core Game Engine
 * 
 * This module implements the main game class that manages the core game loop,
 * canvas rendering, and coordinates all game systems. It follows a clean
 * architecture pattern with clear separation of concerns and robust error handling.
 * 
 * Key Features:
 * - High-performance requestAnimationFrame game loop
 * - Canvas context management with fallback handling
 * - FPS monitoring and performance tracking
 * - Modular system architecture for extensibility
 * - Comprehensive error handling and recovery
 * - Mobile-responsive canvas scaling
 * 
 * Architecture Decisions:
 * - Entity-Component-System (ECS) pattern for game objects
 * - Event-driven communication between systems
 * - Dependency injection for testability
 * - State machine for game state management
 * 
 * @author Space Invaders Development Team
 * @version 1.15.0
 * @since 2025-01-27
 */

import { gameConfig } from './config/gameConfig.js';
import { Renderer, RendererError } from './renderer.js';
import { performanceMonitor, ValidationUtils, MathUtils } from './utils.js';

/**
 * Custom error class for game-specific errors
 */
class GameError extends Error {
    constructor(message, code = 'GAME_ERROR', context = {}) {
        super(message);
        this.name = 'GameError';
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Game initialization error
 */
class GameInitializationError extends GameError {
    constructor(message, context = {}) {
        super(message, 'GAME_INIT_ERROR', context);
        this.name = 'GameInitializationError';
    }
}

/**
 * Game loop error
 */
class GameLoopError extends GameError {
    constructor(message, context = {}) {
        super(message, 'GAME_LOOP_ERROR', context);
        this.name = 'GameLoopError';
    }
}

/**
 * Game state enumeration
 */
const GameState = Object.freeze({
    INITIALIZING: 'initializing',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    ERROR: 'error'
});

/**
 * Main Game class that orchestrates the entire game experience
 * 
 * Responsibilities:
 * - Initialize and manage the game loop
 * - Coordinate all game systems
 * - Handle canvas and rendering setup
 * - Manage game state transitions
 * - Provide performance monitoring
 * - Handle errors gracefully
 */
class Game {
    /**
     * Initialize the Game instance
     * 
     * @param {string} canvasId - The ID of the canvas element
     * @param {Object} options - Configuration options
     * @param {boolean} options.debug - Enable debug mode
     * @param {number} options.targetFPS - Target frames per second
     * @param {boolean} options.enablePerformanceMonitoring - Enable performance tracking
     */
    constructor(canvasId = 'gameCanvas', options = {}) {
        // Validate constructor parameters
        if (!ValidationUtils.isString(canvasId) || canvasId.trim().length === 0) {
            throw new GameInitializationError('Canvas ID must be a non-empty string', { canvasId });
        }

        // Configuration
        this.canvasId = canvasId;
        this.options = {
            debug: false,
            targetFPS: 60,
            enablePerformanceMonitoring: true,
            maxDeltaTime: 1000 / 30, // Cap delta time to prevent spiral of death
            ...options
        };

        // Core components
        this.canvas = null;
        this.renderer = null;
        this.systems = new Map();
        
        // Game state
        this.state = GameState.INITIALIZING;
        this.isRunning = false;
        this.isPaused = false;
        
        // Timing and performance
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 1000; // Update FPS display every second
        this.lastFpsUpdate = 0;
        
        // Animation frame management
        this.animationFrameId = null;
        this.boundGameLoop = this.gameLoop.bind(this);
        
        // Error handling
        this.errorCount = 0;
        this.maxErrors = 10;
        this.lastError = null;
        
        // Event listeners cleanup
        this.eventListeners = [];
        
        // Performance monitoring
        if (this.options.enablePerformanceMonitoring) {
            this.performanceMetrics = {
                frameTime: [],
                renderTime: [],
                updateTime: [],
                maxSamples: 60
            };
        }

        // Bind methods for event listeners
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleError = this.handleError.bind(this);
        
        this.log('Game instance created', { canvasId, options: this.options });
    }

    /**
     * Initialize the game
     * 
     * Sets up the canvas, renderer, and all game systems.
     * Must be called before starting the game loop.
     * 
     * @returns {Promise<void>}
     * @throws {GameInitializationError} If initialization fails
     */
    async init() {
        try {
            this.log('Initializing game...');
            this.state = GameState.INITIALIZING;

            // Initialize canvas and renderer
            await this.initializeCanvas();
            await this.initializeRenderer();
            
            // Initialize game systems
            await this.initializeSystems();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Transition to menu state
            this.state = GameState.MENU;
            
            this.log('Game initialization complete');
            
        } catch (error) {
            this.handleError(error, 'Game initialization failed');
            throw new GameInitializationError('Failed to initialize game', { 
                originalError: error.message,
                canvasId: this.canvasId 
            });
        }
    }

    /**
     * Initialize the canvas element
     * 
     * @private
     * @returns {Promise<void>}
     */
    async initializeCanvas() {
        this.canvas = document.getElementById(this.canvasId);
        
        if (!this.canvas) {
            throw new GameInitializationError(`Canvas element with ID '${this.canvasId}' not found`);
        }
        
        if (!(this.canvas instanceof HTMLCanvasElement)) {
            throw new GameInitializationError(`Element with ID '${this.canvasId}' is not a canvas element`);
        }

        // Set canvas dimensions
        this.resizeCanvas();
        
        // Set canvas attributes for better performance
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.style.imageRendering = 'crisp-edges';
        
        this.log('Canvas initialized', { 
            width: this.canvas.width, 
            height: this.canvas.height 
        });
    }

    /**
     * Initialize the renderer
     * 
     * @private
     * @returns {Promise<void>}
     */
    async initializeRenderer() {
        try {
            this.renderer = new Renderer(this.canvas, {
                alpha: false,
                antialias: false,
                preserveDrawingBuffer: false
            });
            
            await this.renderer.init();
            
            this.log('Renderer initialized');
            
        } catch (error) {
            if (error instanceof RendererError) {
                throw new GameInitializationError('Failed to initialize renderer', { 
                    rendererError: error.message 
                });
            }
            throw error;
        }
    }

    /**
     * Initialize game systems
     * 
     * @private
     * @returns {Promise<void>}
     */
    async initializeSystems() {
        // Systems will be initialized here as they are implemented
        // For now, we'll set up the basic structure
        
        this.systems.set('collision', null);
        this.systems.set('enemy', null);
        this.systems.set('projectile', null);
        this.systems.set('wave', null);
        
        this.log('Game systems initialized', { 
            systemCount: this.systems.size 
        });
    }

    /**
     * Set up event listeners
     * 
     * @private
     */
    setupEventListeners() {
        // Visibility change for pause/resume
        this.addEventListener(document, 'visibilitychange', this.handleVisibilityChange);
        
        // Window resize for canvas scaling
        this.addEventListener(window, 'resize', this.handleResize);
        
        // Global error handling
        this.addEventListener(window, 'error', this.handleError);
        this.addEventListener(window, 'unhandledrejection', this.handleError);
        
        this.log('Event listeners set up');
    }

    /**
     * Add event listener with cleanup tracking
     * 
     * @private
     * @param {EventTarget} target - Event target
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    addEventListener(target, event, handler) {
        target.addEventListener(event, handler);
        this.eventListeners.push({ target, event, handler });
    }

    /**
     * Start the game loop
     * 
     * @returns {void}
     * @throws {GameError} If game is not properly initialized
     */
    start() {
        if (this.state === GameState.INITIALIZING) {
            throw new GameError('Cannot start game before initialization is complete');
        }
        
        if (this.isRunning) {
            this.log('Game is already running');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.state = GameState.PLAYING;
        this.lastFrameTime = performance.now();
        
        // Start the game loop
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
        
        this.log('Game started');
    }

    /**
     * Pause the game
     * 
     * @returns {void}
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        
        this.isPaused = true;
        this.state = GameState.PAUSED;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.log('Game paused');
    }

    /**
     * Resume the game
     * 
     * @returns {void}
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        this.state = GameState.PLAYING;
        this.lastFrameTime = performance.now();
        
        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
        
        this.log('Game resumed');
    }

    /**
     * Stop the game
     * 
     * @returns {void}
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.state = GameState.MENU;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.log('Game stopped');
    }

    /**
     * Main game loop
     * 
     * Handles timing, updates, and rendering for each frame.
     * 
     * @private
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    gameLoop(currentTime) {
        try {
            // Calculate delta time
            this.deltaTime = Math.min(currentTime - this.lastFrameTime, this.options.maxDeltaTime);
            this.lastFrameTime = currentTime;
            
            // Performance monitoring
            const frameStartTime = performance.now();
            
            // Update game state
            this.update(this.deltaTime);
            
            const updateEndTime = performance.now();
            
            // Render frame
            this.render();
            
            const renderEndTime = performance.now();
            
            // Update performance metrics
            if (this.options.enablePerformanceMonitoring) {
                this.updatePerformanceMetrics(frameStartTime, updateEndTime, renderEndTime);
            }
            
            // Update FPS counter
            this.updateFPS(currentTime);
            
            // Continue the loop if still running
            if (this.isRunning && !this.isPaused) {
                this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
            }
            
        } catch (error) {
            this.handleGameLoopError(error);
        }
    }

    /**
     * Update game logic
     * 
     * @private
     * @param {number} deltaTime - Time elapsed since last frame
     */
    update(deltaTime) {
        // Update all game systems
        for (const [name, system] of this.systems) {
            if (system && typeof system.update === 'function') {
                try {
                    system.update(deltaTime);
                } catch (error) {
                    this.log(`Error updating system ${name}:`, error, 'error');
                }
            }
        }
    }

    /**
     * Render the current frame
     * 
     * @private
     */
    render() {
        if (!this.renderer) {
            return;
        }
        
        try {
            // Clear the canvas
            this.renderer.clear();
            
            // Render all game systems
            for (const [name, system] of this.systems) {
                if (system && typeof system.render === 'function') {
                    try {
                        system.render(this.renderer);
                    } catch (error) {
                        this.log(`Error rendering system ${name}:`, error, 'error');
                    }
                }
            }
            
            // Render debug information
            if (this.options.debug) {
                this.renderDebugInfo();
            }
            
        } catch (error) {
            this.log('Render error:', error, 'error');
        }
    }

    /**
     * Render debug information
     * 
     * @private
     */
    renderDebugInfo() {
        const ctx = this.renderer.context;
        const padding = 10;
        let y = padding + 20;
        
        ctx.save();
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        // FPS
        ctx.fillText(`FPS: ${this.fps}`, padding, y);
        y += 20;
        
        // Frame time
        ctx.fillText(`Frame: ${this.deltaTime.toFixed(2)}ms`, padding, y);
        y += 20;
        
        // Game state
        ctx.fillText(`State: ${this.state}`, padding, y);
        y += 20;
        
        // Error count
        if (this.errorCount > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(`Errors: ${this.errorCount}`, padding, y);
        }
        
        ctx.restore();
    }

    /**
     * Update FPS counter
     * 
     * @private
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }

    /**
     * Update performance metrics
     * 
     * @private
     * @param {number} frameStart - Frame start time
     * @param {number} updateEnd - Update end time
     * @param {number} renderEnd - Render end time
     */
    updatePerformanceMetrics(frameStart, updateEnd, renderEnd) {
        const metrics = this.performanceMetrics;
        const maxSamples = metrics.maxSamples;
        
        // Add new samples
        metrics.frameTime.push(renderEnd - frameStart);
        metrics.updateTime.push(updateEnd - frameStart);
        metrics.renderTime.push(renderEnd - updateEnd);
        
        // Keep only recent samples
        if (metrics.frameTime.length > maxSamples) {
            metrics.frameTime.shift();
            metrics.updateTime.shift();
            metrics.renderTime.shift();
        }
    }

    /**
     * Resize canvas to fit container
     * 
     * @private
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        // Calculate aspect ratio
        const targetAspectRatio = gameConfig.canvas.width / gameConfig.canvas.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (containerAspectRatio > targetAspectRatio) {
            // Container is wider than target aspect ratio
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * targetAspectRatio;
        } else {
            // Container is taller than target aspect ratio
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / targetAspectRatio;
        }
        
        // Set canvas size
        this.canvas.width = gameConfig.canvas.width;
        this.canvas.height = gameConfig.canvas.height;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        
        this.log('Canvas resized', { 
            canvasWidth, 
            canvasHeight, 
            containerWidth, 
            containerHeight 
        });
    }

    /**
     * Handle visibility change events
     * 
     * @private
     */
    handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused) {
                this.pause();
                this.log('Game auto-paused due to visibility change');
            }
        } else {
            // Don't auto-resume, let user decide
            this.log('Game visibility restored');
        }
    }

    /**
     * Handle window resize events
     * 
     * @private
     */
    handleResize() {
        this.resizeCanvas();
        
        if (this.renderer) {
            this.renderer.handleResize();
        }
    }

    /**
     * Handle game loop errors
     * 
     * @private
     * @param {Error} error - The error that occurred
     */
    handleGameLoopError(error) {
        this.errorCount++;
        this.lastError = error;
        
        this.log('Game loop error:', error, 'error');
        
        if (this.errorCount >= this.maxErrors) {
            this.log('Too many errors, stopping game', {}, 'error');
            this.stop();
            this.state = GameState.ERROR;
        } else {
            // Try to continue the game loop
            if (this.isRunning && !this.isPaused) {
                this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
            }
        }
    }

    /**
     * Handle general errors
     * 
     * @private
     * @param {Error|Event} error - The error or error event
     */
    handleError(error) {
        let errorMessage = 'Unknown error';
        let errorDetails = {};
        
        if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = { stack: error.stack };
        } else if (error.error instanceof Error) {
            errorMessage = error.error.message;
            errorDetails = { stack: error.error.stack };
        } else if (error.reason) {
            errorMessage = error.reason.toString();
        }
        
        this.log('Unhandled error:', errorMessage, 'error', errorDetails);
    }

    /**
     * Clean up resources
     * 
     * Should be called when the game is no longer needed.
     * 
     * @returns {void}
     */
    destroy() {
        this.log('Destroying game instance...');
        
        // Stop the game loop
        this.stop();
        
        // Remove event listeners
        for (const { target, event, handler } of this.eventListeners) {
            target.removeEventListener(event, handler);
        }
        this.eventListeners.length = 0;
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        
        // Clear systems
        this.systems.clear();
        
        // Reset state
        this.canvas = null;
        this.state = GameState.INITIALIZING;
        this.isRunning = false;
        this.isPaused = false;
        
        this.log('Game instance destroyed');
    }

    /**
     * Get current game statistics
     * 
     * @returns {Object} Game statistics
     */
    getStats() {
        const stats = {
            state: this.state,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            fps: this.fps,
            frameCount: this.frameCount,
            errorCount: this.errorCount,
            deltaTime: this.deltaTime
        };
        
        if (this.options.enablePerformanceMonitoring && this.performanceMetrics) {
            const metrics = this.performanceMetrics;
            stats.performance = {
                avgFrameTime: MathUtils.average(metrics.frameTime),
                avgUpdateTime: MathUtils.average(metrics.updateTime),
                avgRenderTime: MathUtils.average(metrics.renderTime),
                maxFrameTime: Math.max(...metrics.frameTime),
                minFrameTime: Math.min(...metrics.frameTime)
            };
        }
        
        return stats;
    }

    /**
     * Log a message with context
     * 
     * @private
     * @param {string} message - Log message
     * @param {*} data - Additional data to log
     * @param {string} level - Log level (info, warn, error)
     * @param {Object} context - Additional context
     */
    log(message, data = null, level = 'info', context = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            component: 'Game',
            gameState: this.state,
            ...context
        };
        
        if (data !== null) {
            logEntry.data = data;
        }
        
        if (this.options.debug || level === 'error') {
            console[level](message, logEntry);
        }
        
        // Send to performance monitor if available
        if (performanceMonitor && typeof performanceMonitor.log === 'function') {
            performanceMonitor.log(logEntry);
        }
    }
}

// Export the Game class and related utilities
export {
    Game,
    GameError,
    GameInitializationError,
    GameLoopError,
    GameState
};

export default Game;