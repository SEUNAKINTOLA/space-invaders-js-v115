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
 * @version 1.0.0
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
        this.fpsUpdateTime = 0;
        this.animationFrameId = null;
        
        // Performance monitoring
        this.performanceMetrics = {
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            totalGameTime: 0,
            averageFPS: 0,
            minFPS: Infinity,
            maxFPS: 0
        };
        
        // Error handling
        this.errorCount = 0;
        this.maxErrors = 10;
        this.lastError = null;
        
        // Event listeners cleanup
        this.eventListeners = [];
        
        // Bind methods to preserve context
        this.gameLoop = this.gameLoop.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleError = this.handleError.bind(this);
        
        // Initialize performance monitoring if enabled
        if (this.options.enablePerformanceMonitoring) {
            performanceMonitor.startSession('game-session');
        }
        
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
            
            // Setup canvas and renderer
            await this.initializeCanvas();
            await this.initializeRenderer();
            
            // Initialize game systems
            await this.initializeSystems();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Transition to menu state
            this.setState(GameState.MENU);
            
            this.log('Game initialization complete');
            
        } catch (error) {
            const initError = new GameInitializationError(
                `Failed to initialize game: ${error.message}`,
                { originalError: error, canvasId: this.canvasId }
            );
            
            this.handleError(initError);
            throw initError;
        }
    }
    
    /**
     * Initialize the canvas element
     * 
     * @private
     * @returns {Promise<void>}
     * @throws {GameInitializationError} If canvas setup fails
     */
    async initializeCanvas() {
        this.canvas = document.getElementById(this.canvasId);
        
        if (!this.canvas) {
            throw new GameInitializationError(
                `Canvas element with ID '${this.canvasId}' not found`,
                { canvasId: this.canvasId }
            );
        }
        
        if (!(this.canvas instanceof HTMLCanvasElement)) {
            throw new GameInitializationError(
                `Element with ID '${this.canvasId}' is not a canvas element`,
                { canvasId: this.canvasId, elementType: this.canvas.tagName }
            );
        }
        
        // Set canvas dimensions
        this.canvas.width = gameConfig.canvas.width;
        this.canvas.height = gameConfig.canvas.height;
        
        // Add canvas attributes for accessibility
        this.canvas.setAttribute('role', 'application');
        this.canvas.setAttribute('aria-label', 'Space Invaders Game');
        this.canvas.setAttribute('tabindex', '0');
        
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
     * @throws {GameInitializationError} If renderer setup fails
     */
    async initializeRenderer() {
        try {
            this.renderer = new Renderer(this.canvas);
            await this.renderer.init();
            
            this.log('Renderer initialized');
            
        } catch (error) {
            if (error instanceof RendererError) {
                throw new GameInitializationError(
                    `Renderer initialization failed: ${error.message}`,
                    { rendererError: error }
                );
            }
            throw error;
        }
    }
    
    /**
     * Initialize all game systems
     * 
     * @private
     * @returns {Promise<void>}
     */
    async initializeSystems() {
        // Systems will be initialized here as they are implemented
        // For now, we'll just log that systems are ready
        this.log('Game systems initialized');
    }
    
    /**
     * Setup event listeners for game events
     * 
     * @private
     */
    setupEventListeners() {
        // Visibility change handling for pause/resume
        const visibilityListener = () => this.handleVisibilityChange();
        document.addEventListener('visibilitychange', visibilityListener);
        this.eventListeners.push(['visibilitychange', visibilityListener, document]);
        
        // Window resize handling
        const resizeListener = () => this.handleResize();
        window.addEventListener('resize', resizeListener);
        this.eventListeners.push(['resize', resizeListener, window]);
        
        // Global error handling
        const errorListener = (event) => this.handleError(event.error);
        window.addEventListener('error', errorListener);
        this.eventListeners.push(['error', errorListener, window]);
        
        // Unhandled promise rejection handling
        const rejectionListener = (event) => this.handleError(event.reason);
        window.addEventListener('unhandledrejection', rejectionListener);
        this.eventListeners.push(['unhandledrejection', rejectionListener, window]);
        
        this.log('Event listeners setup complete');
    }
    
    /**
     * Start the game loop
     * 
     * @returns {void}
     * @throws {GameLoopError} If the game loop fails to start
     */
    start() {
        if (this.state === GameState.INITIALIZING) {
            throw new GameLoopError('Cannot start game before initialization is complete');
        }
        
        if (this.isRunning) {
            this.log('Game loop already running');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.setState(GameState.PLAYING);
        
        // Start the game loop
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
        
        this.log('Game loop started');
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
        this.setState(GameState.PAUSED);
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.log('Game paused');
    }
    
    /**
     * Resume the game from pause
     * 
     * @returns {void}
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        this.setState(GameState.PLAYING);
        this.lastFrameTime = performance.now(); // Reset timing to prevent large delta
        
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
        
        this.log('Game resumed');
    }
    
    /**
     * Stop the game loop
     * 
     * @returns {void}
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.setState(GameState.MENU);
        
        this.log('Game stopped');
    }
    
    /**
     * Main game loop
     * 
     * Handles timing, updates, and rendering for each frame.
     * Uses requestAnimationFrame for smooth 60fps performance.
     * 
     * @private
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     * @returns {void}
     */
    gameLoop(currentTime) {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        
        try {
            const frameStartTime = performance.now();
            
            // Calculate delta time
            this.deltaTime = Math.min(currentTime - this.lastFrameTime, this.options.maxDeltaTime);
            this.lastFrameTime = currentTime;
            
            // Update performance metrics
            this.updatePerformanceMetrics(frameStartTime);
            
            // Update game logic
            const updateStartTime = performance.now();
            this.update(this.deltaTime);
            this.performanceMetrics.updateTime = performance.now() - updateStartTime;
            
            // Render frame
            const renderStartTime = performance.now();
            this.render();
            this.performanceMetrics.renderTime = performance.now() - renderStartTime;
            
            // Calculate total frame time
            this.performanceMetrics.frameTime = performance.now() - frameStartTime;
            
            // Schedule next frame
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
            
        } catch (error) {
            this.handleError(new GameLoopError(
                `Game loop error: ${error.message}`,
                { originalError: error, frameCount: this.frameCount }
            ));
        }
    }
    
    /**
     * Update game logic
     * 
     * @private
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @returns {void}
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
        
        // Update total game time
        this.performanceMetrics.totalGameTime += deltaTime;
    }
    
    /**
     * Render the current frame
     * 
     * @private
     * @returns {void}
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
            
            // Render debug information if enabled
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
     * @returns {void}
     */
    renderDebugInfo() {
        const ctx = this.renderer.context;
        const debugY = 20;
        const lineHeight = 16;
        let currentY = debugY;
        
        // Set debug text style
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        // FPS counter
        ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 10, currentY);
        currentY += lineHeight;
        
        // Performance metrics
        ctx.fillText(`Frame: ${this.performanceMetrics.frameTime.toFixed(2)}ms`, 10, currentY);
        currentY += lineHeight;
        
        ctx.fillText(`Update: ${this.performanceMetrics.updateTime.toFixed(2)}ms`, 10, currentY);
        currentY += lineHeight;
        
        ctx.fillText(`Render: ${this.performanceMetrics.renderTime.toFixed(2)}ms`, 10, currentY);
        currentY += lineHeight;
        
        // Game state
        ctx.fillText(`State: ${this.state}`, 10, currentY);
        currentY += lineHeight;
        
        // Canvas dimensions
        ctx.fillText(`Canvas: ${this.canvas.width}x${this.canvas.height}`, 10, currentY);
    }
    
    /**
     * Update performance metrics and FPS calculation
     * 
     * @private
     * @param {number} frameStartTime - Start time of current frame
     * @returns {void}
     */
    updatePerformanceMetrics(frameStartTime) {
        this.frameCount++;
        
        // Update FPS every second
        if (frameStartTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount * 1000 / (frameStartTime - this.fpsUpdateTime);
            
            // Update FPS statistics
            this.performanceMetrics.averageFPS = (this.performanceMetrics.averageFPS + this.fps) / 2;
            this.performanceMetrics.minFPS = Math.min(this.performanceMetrics.minFPS, this.fps);
            this.performanceMetrics.maxFPS = Math.max(this.performanceMetrics.maxFPS, this.fps);
            
            this.frameCount = 0;
            this.fpsUpdateTime = frameStartTime;
            
            // Log performance metrics periodically
            if (this.options.enablePerformanceMonitoring) {
                performanceMonitor.recordMetric('fps', this.fps);
                performanceMonitor.recordMetric('frameTime', this.performanceMetrics.frameTime);
            }
        }
    }
    
    /**
     * Set the current game state
     * 
     * @private
     * @param {string} newState - The new game state
     * @returns {void}
     */
    setState(newState) {
        if (!Object.values(GameState).includes(newState)) {
            this.log(`Invalid game state: ${newState}`, null, 'warn');
            return;
        }
        
        const previousState = this.state;
        this.state = newState;
        
        this.log(`Game state changed: ${previousState} -> ${newState}`);
        
        // Emit state change event (for future event system)
        this.onStateChange(previousState, newState);
    }
    
    /**
     * Handle game state changes
     * 
     * @private
     * @param {string} previousState - The previous game state
     * @param {string} newState - The new game state
     * @returns {void}
     */
    onStateChange(previousState, newState) {
        // State change logic will be implemented here
        // For now, just log the change
        this.log(`State transition: ${previousState} -> ${newState}`);
    }
    
    /**
     * Handle visibility change events (tab switching, minimizing)
     * 
     * @private
     * @returns {void}
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
     * @returns {void}
     */
    handleResize() {
        if (!this.canvas || !this.renderer) {
            return;
        }
        
        try {
            // Maintain aspect ratio while fitting to container
            const container = this.canvas.parentElement;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const aspectRatio = gameConfig.canvas.width / gameConfig.canvas.height;
                
                let newWidth = containerRect.width;
                let newHeight = newWidth / aspectRatio;
                
                if (newHeight > containerRect.height) {
                    newHeight = containerRect.height;
                    newWidth = newHeight * aspectRatio;
                }
                
                this.canvas.style.width = `${newWidth}px`;
                this.canvas.style.height = `${newHeight}px`;
                
                this.log('Canvas resized', { width: newWidth, height: newHeight });
            }
            
        } catch (error) {
            this.log('Error handling resize:', error, 'error');
        }
    }
    
    /**
     * Handle errors that occur during game execution
     * 
     * @private
     * @param {Error} error - The error that occurred
     * @returns {void}
     */
    handleError(error) {
        this.errorCount++;
        this.lastError = error;
        
        this.log('Game error occurred:', error, 'error');
        
        // If too many errors occur, stop the game
        if (this.errorCount >= this.maxErrors) {
            this.log(`Too many errors (${this.errorCount}), stopping game`, null, 'error');
            this.stop();
            this.setState(GameState.ERROR);
        }
        
        // Report error to performance monitor
        if (this.options.enablePerformanceMonitoring) {
            performanceMonitor.recordError(error);
        }
    }
    
    /**
     * Get current performance metrics
     * 
     * @returns {Object} Current performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            fps: this.fps,
            frameCount: this.frameCount,
            errorCount: this.errorCount,
            state: this.state,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }
    
    /**
     * Clean up resources and event listeners
     * 
     * @returns {void}
     */
    destroy() {
        this.log('Destroying game instance...');
        
        // Stop the game loop
        this.stop();
        
        // Clean up event listeners
        this.eventListeners.forEach(([event, listener, target]) => {
            target.removeEventListener(event, listener);
        });
        this.eventListeners.length = 0;
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        
        // Clean up systems
        this.systems.clear();
        
        // End performance monitoring session
        if (this.options.enablePerformanceMonitoring) {
            performanceMonitor.endSession();
        }
        
        this.log('Game instance destroyed');
    }
    
    /**
     * Logging utility with different levels
     * 
     * @private
     * @param {string} message - Log message
     * @param {*} data - Additional data to log
     * @param {string} level - Log level (info, warn, error)
     * @returns {void}
     */
    log(message, data = null, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            gameState: this.state,
            frameCount: this.frameCount
        };
        
        if (data) {
            logEntry.data = data;
        }
        
        // Console output based on level
        switch (level) {
            case 'error':
                console.error(`[GAME ERROR] ${message}`, data);
                break;
            case 'warn':
                console.warn(`[GAME WARN] ${message}`, data);
                break;
            default:
                if (this.options.debug) {
                    console.log(`[GAME] ${message}`, data);
                }
        }
        
        // Send to performance monitor if available
        if (this.options.enablePerformanceMonitoring) {
            performanceMonitor.log(level, message, logEntry);
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

// Default export
export default Game;