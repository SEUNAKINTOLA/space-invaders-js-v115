/**
 * Space Invaders Game - Core Game Engine
 * 
 * Main game class managing the core game loop, canvas rendering, and system coordination.
 * Implements a clean architecture with separation of concerns between rendering,
 * game logic, and input handling.
 * 
 * Key Features:
 * - 60 FPS game loop with requestAnimationFrame
 * - Canvas context management with automatic scaling
 * - FPS counter and performance monitoring
 * - Modular system architecture for extensibility
 * - Error handling and graceful degradation
 * - Mobile-responsive canvas sizing
 * 
 * Dependencies:
 * - gameConfig: Game configuration and constants
 * - Player: Player entity management
 * - InputManager: Input handling and processing
 * - CollisionSystem: Collision detection and response
 * - EnemySystem: Enemy spawning and management
 * - ProjectileSystem: Projectile lifecycle management
 * - WaveManager: Wave progression and difficulty scaling
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

import { gameConfig } from './config/gameConfig.js';
import { Player } from './entities/player.js';
import { InputManager } from './input/inputManager.js';
import { CollisionSystem } from './systems/collisionSystem.js';
import { EnemySystem } from './systems/enemySystem.js';
import { ProjectileSystem } from './systems/projectileSystem.js';
import { WaveManager } from './systems/waveManager.js';

/**
 * Game States Enumeration
 * Defines all possible game states for proper state management
 */
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

/**
 * Main Game Class
 * 
 * Orchestrates the entire game experience including initialization,
 * game loop management, rendering, and system coordination.
 * 
 * Architecture:
 * - Entity-Component-System (ECS) inspired design
 * - Clear separation between update and render phases
 * - Modular system integration for maintainability
 * - Performance monitoring and optimization
 */
class Game {
    /**
     * Initialize the Game instance
     * 
     * Sets up the core game infrastructure including canvas management,
     * system initialization, and performance monitoring.
     * 
     * @param {HTMLCanvasElement} canvas - The HTML5 canvas element for rendering
     * @throws {Error} If canvas is not provided or invalid
     */
    constructor(canvas) {
        // Input validation
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Game constructor requires a valid HTMLCanvasElement');
        }

        // Core rendering infrastructure
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }

        // Game state management
        this.state = GameState.LOADING;
        this.isRunning = false;
        this.isPaused = false;

        // Performance monitoring
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.showFPS = gameConfig.debug.showFPS || false;

        // Game loop management
        this.animationFrameId = null;
        this.gameLoopBound = this.gameLoop.bind(this);

        // Game systems - initialized in init()
        this.player = null;
        this.inputManager = null;
        this.collisionSystem = null;
        this.enemySystem = null;
        this.projectileSystem = null;
        this.waveManager = null;

        // Game data
        this.score = 0;
        this.lives = gameConfig.player.initialLives;
        this.level = 1;

        // Error handling
        this.errorCount = 0;
        this.maxErrors = 10;

        // Initialize canvas properties
        this.setupCanvas();
        
        // Bind event handlers
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();

        console.log('Game instance created successfully');
    }

    /**
     * Setup canvas properties and responsive behavior
     * 
     * Configures canvas dimensions, scaling, and rendering properties
     * for optimal display across different screen sizes.
     */
    setupCanvas() {
        try {
            // Set canvas dimensions from config
            this.canvas.width = gameConfig.canvas.width;
            this.canvas.height = gameConfig.canvas.height;

            // Configure rendering context
            this.ctx.imageSmoothingEnabled = gameConfig.canvas.imageSmoothingEnabled;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';

            // Apply CSS styling for responsive behavior
            this.canvas.style.display = 'block';
            this.canvas.style.margin = '0 auto';
            this.canvas.style.border = '1px solid #333';
            this.canvas.style.backgroundColor = '#000';

            // Calculate and apply responsive scaling
            this.updateCanvasScale();

            console.log(`Canvas initialized: ${this.canvas.width}x${this.canvas.height}`);
        } catch (error) {
            console.error('Failed to setup canvas:', error);
            throw new Error(`Canvas setup failed: ${error.message}`);
        }
    }

    /**
     * Update canvas scaling for responsive design
     * 
     * Calculates optimal scaling factor based on viewport size
     * while maintaining aspect ratio.
     */
    updateCanvasScale() {
        try {
            const containerWidth = window.innerWidth * 0.9; // 90% of viewport
            const containerHeight = window.innerHeight * 0.8; // 80% of viewport

            const scaleX = containerWidth / this.canvas.width;
            const scaleY = containerHeight / this.canvas.height;
            const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1

            this.canvas.style.width = `${this.canvas.width * scale}px`;
            this.canvas.style.height = `${this.canvas.height * scale}px`;

            console.log(`Canvas scaled to: ${scale.toFixed(2)}x`);
        } catch (error) {
            console.error('Failed to update canvas scale:', error);
        }
    }

    /**
     * Setup global event listeners
     * 
     * Registers event handlers for page visibility changes,
     * window resizing, and other global events.
     */
    setupEventListeners() {
        try {
            // Handle page visibility changes for pause/resume
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            
            // Handle window resize for responsive canvas
            window.addEventListener('resize', this.handleResize);

            // Handle page unload for cleanup
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });

            console.log('Event listeners registered successfully');
        } catch (error) {
            console.error('Failed to setup event listeners:', error);
        }
    }

    /**
     * Handle page visibility changes
     * 
     * Automatically pauses the game when the page becomes hidden
     * and resumes when it becomes visible again.
     */
    handleVisibilityChange() {
        try {
            if (document.hidden && this.state === GameState.PLAYING) {
                this.pause();
                console.log('Game auto-paused due to page visibility change');
            } else if (!document.hidden && this.isPaused && this.state === GameState.PAUSED) {
                // Only auto-resume if the game was auto-paused
                this.resume();
                console.log('Game auto-resumed due to page visibility change');
            }
        } catch (error) {
            console.error('Error handling visibility change:', error);
        }
    }

    /**
     * Handle window resize events
     * 
     * Updates canvas scaling to maintain responsive behavior
     * when the window size changes.
     */
    handleResize() {
        try {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.updateCanvasScale();
            }, 250);
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }

    /**
     * Initialize the game
     * 
     * Sets up all game systems, entities, and prepares the game
     * for the main game loop. This method should be called once
     * before starting the game loop.
     * 
     * @returns {Promise<void>} Resolves when initialization is complete
     * @throws {Error} If initialization fails
     */
    async init() {
        try {
            console.log('Initializing game systems...');

            // Initialize input management
            this.inputManager = new InputManager();
            await this.inputManager.init();

            // Initialize player entity
            this.player = new Player(
                gameConfig.canvas.width / 2,
                gameConfig.canvas.height - gameConfig.player.offsetFromBottom
            );

            // Initialize game systems
            this.collisionSystem = new CollisionSystem();
            this.enemySystem = new EnemySystem();
            this.projectileSystem = new ProjectileSystem();
            this.waveManager = new WaveManager();

            // Initialize systems that require setup
            await this.enemySystem.init();
            await this.projectileSystem.init();
            await this.waveManager.init();

            // Set initial game state
            this.state = GameState.MENU;
            this.score = 0;
            this.lives = gameConfig.player.initialLives;
            this.level = 1;

            console.log('Game initialization completed successfully');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.state = GameState.LOADING;
            throw new Error(`Game initialization failed: ${error.message}`);
        }
    }

    /**
     * Start the game
     * 
     * Begins the main game loop and transitions to the playing state.
     * The game must be initialized before calling this method.
     * 
     * @throws {Error} If the game is not properly initialized
     */
    start() {
        try {
            if (this.state === GameState.LOADING) {
                throw new Error('Cannot start game: initialization not complete');
            }

            if (this.isRunning) {
                console.warn('Game is already running');
                return;
            }

            // Transition to playing state
            this.state = GameState.PLAYING;
            this.isRunning = true;
            this.isPaused = false;

            // Reset performance counters
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            this.fpsUpdateTime = this.lastFrameTime;

            // Start the game loop
            this.animationFrameId = requestAnimationFrame(this.gameLoopBound);

            console.log('Game started successfully');
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    /**
     * Pause the game
     * 
     * Suspends the game loop while maintaining game state.
     * The game can be resumed from the exact same state.
     */
    pause() {
        try {
            if (!this.isRunning || this.isPaused) {
                return;
            }

            this.isPaused = true;
            this.state = GameState.PAUSED;

            // Cancel the animation frame
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            console.log('Game paused');
        } catch (error) {
            console.error('Failed to pause game:', error);
        }
    }

    /**
     * Resume the game
     * 
     * Resumes the game loop from a paused state.
     * Resets timing to prevent large delta time jumps.
     */
    resume() {
        try {
            if (!this.isRunning || !this.isPaused) {
                return;
            }

            this.isPaused = false;
            this.state = GameState.PLAYING;

            // Reset timing to prevent delta time jump
            this.lastFrameTime = performance.now();

            // Restart the game loop
            this.animationFrameId = requestAnimationFrame(this.gameLoopBound);

            console.log('Game resumed');
        } catch (error) {
            console.error('Failed to resume game:', error);
        }
    }

    /**
     * Stop the game
     * 
     * Completely stops the game loop and resets the game state.
     * The game can be restarted by calling start() again.
     */
    stop() {
        try {
            this.isRunning = false;
            this.isPaused = false;

            // Cancel animation frame
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            // Reset game state
            this.state = GameState.MENU;

            console.log('Game stopped');
        } catch (error) {
            console.error('Failed to stop game:', error);
        }
    }

    /**
     * Main game loop
     * 
     * The core game loop that handles timing, updates, and rendering.
     * Runs at 60 FPS using requestAnimationFrame for smooth performance.
     * 
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     */
    gameLoop(currentTime) {
        try {
            // Calculate delta time
            this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
            this.lastFrameTime = currentTime;

            // Cap delta time to prevent large jumps
            this.deltaTime = Math.min(this.deltaTime, gameConfig.performance.maxDeltaTime);

            // Update FPS counter
            this.updateFPS(currentTime);

            // Only update and render if not paused
            if (!this.isPaused && this.state === GameState.PLAYING) {
                this.update(this.deltaTime);
                this.render();
            }

            // Continue the game loop if still running
            if (this.isRunning) {
                this.animationFrameId = requestAnimationFrame(this.gameLoopBound);
            }
        } catch (error) {
            this.handleGameLoopError(error);
        }
    }

    /**
     * Update FPS counter
     * 
     * Calculates and updates the frames per second counter
     * for performance monitoring.
     * 
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.fpsUpdateTime >= 1000) { // Update every second
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }

    /**
     * Update game logic
     * 
     * Updates all game systems and entities. This is where the
     * game logic is processed each frame.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(deltaTime) {
        try {
            // Update input state
            this.inputManager.update(deltaTime);

            // Update player
            if (this.player) {
                this.player.update(deltaTime, this.inputManager);
            }

            // Update game systems
            this.enemySystem.update(deltaTime);
            this.projectileSystem.update(deltaTime);
            this.waveManager.update(deltaTime);

            // Process collisions
            this.collisionSystem.update(
                deltaTime,
                this.player,
                this.enemySystem.getEnemies(),
                this.projectileSystem.getProjectiles()
            );

            // Check game state conditions
            this.checkGameStateConditions();

        } catch (error) {
            console.error('Error in game update:', error);
            throw error;
        }
    }

    /**
     * Render the game
     * 
     * Renders all visual elements to the canvas. This includes
     * clearing the canvas, drawing entities, UI elements, and debug info.
     */
    render() {
        try {
            // Clear the canvas
            this.ctx.fillStyle = gameConfig.canvas.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Render game entities
            if (this.player) {
                this.player.render(this.ctx);
            }

            this.enemySystem.render(this.ctx);
            this.projectileSystem.render(this.ctx);

            // Render UI elements
            this.renderUI();

            // Render debug information
            if (gameConfig.debug.enabled) {
                this.renderDebugInfo();
            }

        } catch (error) {
            console.error('Error in game render:', error);
            throw error;
        }
    }

    /**
     * Render UI elements
     * 
     * Draws the user interface including score, lives, level,
     * and other game information.
     */
    renderUI() {
        try {
            const ctx = this.ctx;
            
            // Set UI text properties
            ctx.fillStyle = gameConfig.ui.textColor;
            ctx.font = gameConfig.ui.font;

            // Render score
            ctx.fillText(`Score: ${this.score}`, 10, 10);

            // Render lives
            ctx.fillText(`Lives: ${this.lives}`, 10, 35);

            // Render level
            ctx.fillText(`Level: ${this.level}`, 10, 60);

            // Render wave information
            if (this.waveManager) {
                const waveInfo = this.waveManager.getCurrentWaveInfo();
                ctx.fillText(`Wave: ${waveInfo.number}`, 10, 85);
            }

        } catch (error) {
            console.error('Error rendering UI:', error);
        }
    }

    /**
     * Render debug information
     * 
     * Displays debug information including FPS, entity counts,
     * and performance metrics.
     */
    renderDebugInfo() {
        try {
            const ctx = this.ctx;
            const debugY = this.canvas.height - 100;

            // Set debug text properties
            ctx.fillStyle = gameConfig.debug.textColor;
            ctx.font = gameConfig.debug.font;

            // Render FPS
            if (this.showFPS) {
                ctx.fillText(`FPS: ${this.fps}`, 10, debugY);
            }

            // Render entity counts
            ctx.fillText(`Enemies: ${this.enemySystem.getEnemyCount()}`, 10, debugY + 20);
            ctx.fillText(`Projectiles: ${this.projectileSystem.getProjectileCount()}`, 10, debugY + 40);

            // Render delta time
            ctx.fillText(`Delta: ${(this.deltaTime * 1000).toFixed(2)}ms`, 10, debugY + 60);

        } catch (error) {
            console.error('Error rendering debug info:', error);
        }
    }

    /**
     * Check game state conditions
     * 
     * Evaluates conditions that might trigger state changes
     * such as game over, level completion, etc.
     */
    checkGameStateConditions() {
        try {
            // Check for game over conditions
            if (this.lives <= 0) {
                this.gameOver();
                return;
            }

            // Check for wave completion
            if (this.waveManager.isWaveComplete() && this.enemySystem.getEnemyCount() === 0) {
                this.completeWave();
            }

        } catch (error) {
            console.error('Error checking game state conditions:', error);
        }
    }

    /**
     * Handle wave completion
     * 
     * Processes the completion of a wave including score bonuses,
     * level progression, and next wave preparation.
     */
    completeWave() {
        try {
            // Award completion bonus
            const bonus = this.level * gameConfig.scoring.waveCompletionBonus;
            this.addScore(bonus);

            // Progress to next level/wave
            this.level++;
            this.waveManager.nextWave();

            console.log(`Wave completed! Level ${this.level}, Bonus: ${bonus}`);
        } catch (error) {
            console.error('Error completing wave:', error);
        }
    }

    /**
     * Handle game over
     * 
     * Transitions the game to the game over state and
     * performs necessary cleanup.
     */
    gameOver() {
        try {
            this.state = GameState.GAME_OVER;
            this.pause();

            console.log(`Game Over! Final Score: ${this.score}`);
        } catch (error) {
            console.error('Error handling game over:', error);
        }
    }

    /**
     * Add score
     * 
     * Adds points to the player's score with validation.
     * 
     * @param {number} points - Points to add
     */
    addScore(points) {
        try {
            if (typeof points !== 'number' || points < 0) {
                console.warn('Invalid score value:', points);
                return;
            }

            this.score += points;
            console.log(`Score added: ${points}, Total: ${this.score}`);
        } catch (error) {
            console.error('Error adding score:', error);
        }
    }

    /**
     * Remove life
     * 
     * Decreases the player's life count with validation.
     */
    removeLife() {
        try {
            if (this.lives > 0) {
                this.lives--;
                console.log(`Life lost! Remaining lives: ${this.lives}`);
            }
        } catch (error) {
            console.error('Error removing life:', error);
        }
    }

    /**
     * Handle game loop errors
     * 
     * Manages errors that occur during the game loop to prevent
     * complete game crashes.
     * 
     * @param {Error} error - The error that occurred
     */
    handleGameLoopError(error) {
        this.errorCount++;
        console.error(`Game loop error #${this.errorCount}:`, error);

        // If too many errors occur, stop the game
        if (this.errorCount >= this.maxErrors) {
            console.error('Too many game loop errors, stopping game');
            this.stop();
            this.state = GameState.GAME_OVER;
        } else {
            // Try to continue the game loop
            if (this.isRunning) {
                this.animationFrameId = requestAnimationFrame(this.gameLoopBound);
            }
        }
    }

    /**
     * Get current game state
     * 
     * @returns {string} Current game state
     */
    getState() {
        return this.state;
    }

    /**
     * Get current score
     * 
     * @returns {number} Current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Get current lives
     * 
     * @returns {number} Current lives
     */
    getLives() {
        return this.lives;
    }

    /**
     * Get current level
     * 
     * @returns {number} Current level
     */
    getLevel() {
        return this.level;
    }

    /**
     * Get current FPS
     * 
     * @returns {number} Current frames per second
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Toggle FPS display
     * 
     * @param {boolean} show - Whether to show FPS
     */
    toggleFPS(show = !this.showFPS) {
        this.showFPS = show;
        console.log(`FPS display ${show ? 'enabled' : 'disabled'}`);
    }

    /**
     * Cleanup resources
     * 
     * Performs cleanup of resources, event listeners, and systems
     * when the game is being destroyed.
     */
    cleanup() {
        try {
            // Stop the game loop
            this.stop();

            // Remove event listeners
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('resize', this.handleResize);

            // Cleanup systems
            if (this.inputManager) {
                this.inputManager.cleanup();
            }

            // Clear timeouts
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }

            console.log('Game cleanup completed');
        } catch (error) {
            console.error('Error during game cleanup:', error);
        }
    }
}

// Export the Game class and GameState enum
export { Game, GameState };
export default Game;