/**
 * Main Game Class - Space Invaders JS V115
 * Handles game loop, scoring system, and core game mechanics
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;
        
        // Game state
        this.wave = 1;
        this.enemies = [];
        this.bullets = [];
        this.player = null;
        
        // Scoring system
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.scoreMultiplier = 1;
        this.accuracyShots = 0;
        this.accuracyHits = 0;
        this.waveStartTime = Date.now();
        
        // Score values for different enemy types
        this.enemyScoreValues = {
            scout: 100,
            fighter: 200,
            bomber: 300,
            boss: 1000
        };
        
        // Performance optimization
        this.lastScoreUpdate = 0;
        this.scoreUpdateThrottle = 16; // ~60fps
        
        // UI elements
        this.scoreDisplay = null;
        this.highScoreDisplay = null;
        
        this.initializeScoreDisplay();
        this.setupEventListeners();
    }
    
    /**
     * Initialize score display elements
     */
    initializeScoreDisplay() {
        // Create score display elements if they don't exist
        if (!document.getElementById('score-display')) {
            const scoreContainer = document.createElement('div');
            scoreContainer.id = 'score-container';
            scoreContainer.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                color: white;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                z-index: 100;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            `;
            
            const currentScore = document.createElement('div');
            currentScore.id = 'score-display';
            currentScore.textContent = 'SCORE: 0';
            
            const highScore = document.createElement('div');
            highScore.id = 'high-score-display';
            highScore.textContent = `HIGH SCORE: ${this.formatScore(this.highScore)}`;
            highScore.style.marginTop = '5px';
            
            const waveDisplay = document.createElement('div');
            waveDisplay.id = 'wave-display';
            waveDisplay.textContent = 'WAVE: 1';
            waveDisplay.style.marginTop = '5px';
            
            scoreContainer.appendChild(currentScore);
            scoreContainer.appendChild(highScore);
            scoreContainer.appendChild(waveDisplay);
            
            document.body.appendChild(scoreContainer);
        }
        
        this.scoreDisplay = document.getElementById('score-display');
        this.highScoreDisplay = document.getElementById('high-score-display');
        this.waveDisplay = document.getElementById('wave-display');
    }
    
    /**
     * Setup event listeners for score-related events
     */
    setupEventListeners() {
        // Listen for enemy destruction events
        document.addEventListener('enemyDestroyed', (event) => {
            this.handleEnemyDestroyed(event.detail);
        });
        
        // Listen for wave completion events
        document.addEventListener('waveCompleted', (event) => {
            this.handleWaveCompleted(event.detail);
        });
        
        // Listen for bullet fired events for accuracy tracking
        document.addEventListener('bulletFired', () => {
            this.accuracyShots++;
        });
        
        // Listen for game over events
        document.addEventListener('gameOver', () => {
            this.handleGameOver();
        });
        
        // Handle page visibility for score persistence
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveHighScore();
            }
        });
        
        // Handle page unload for score persistence
        window.addEventListener('beforeunload', () => {
            this.saveHighScore();
        });
    }
    
    /**
     * Handle enemy destruction and award points
     * @param {Object} enemyData - Data about the destroyed enemy
     */
    handleEnemyDestroyed(enemyData) {
        const basePoints = this.enemyScoreValues[enemyData.type] || 100;
        const multipliedPoints = Math.floor(basePoints * this.scoreMultiplier);
        
        this.addScore(multipliedPoints);
        this.accuracyHits++;
        
        // Bonus for consecutive hits
        if (enemyData.consecutiveHits > 1) {
            const bonusPoints = Math.floor(multipliedPoints * 0.1 * enemyData.consecutiveHits);
            this.addScore(bonusPoints);
        }
        
        // Update score multiplier based on performance
        this.updateScoreMultiplier();
    }
    
    /**
     * Handle wave completion and award bonus points
     * @param {Object} waveData - Data about the completed wave
     */
    handleWaveCompleted(waveData) {
        const waveTime = Date.now() - this.waveStartTime;
        const timeBonus = Math.max(0, Math.floor((60000 - waveTime) / 1000) * 50); // Bonus for speed
        
        // Accuracy bonus
        const accuracy = this.accuracyShots > 0 ? this.accuracyHits / this.accuracyShots : 0;
        const accuracyBonus = Math.floor(accuracy * 1000);
        
        // Wave completion bonus
        const waveBonus = this.wave * 500;
        
        const totalBonus = timeBonus + accuracyBonus + waveBonus;
        this.addScore(totalBonus);
        
        // Reset for next wave
        this.wave++;
        this.waveStartTime = Date.now();
        this.accuracyShots = 0;
        this.accuracyHits = 0;
        
        // Increase multiplier for higher waves
        this.scoreMultiplier = Math.min(5, 1 + (this.wave - 1) * 0.1);
        
        this.updateWaveDisplay();
    }
    
    /**
     * Add points to the current score
     * @param {number} points - Points to add
     */
    addScore(points) {
        if (typeof points !== 'number' || points < 0) {
            console.warn('Invalid score points:', points);
            return;
        }
        
        this.score += points;
        
        // Throttle score display updates for performance
        const now = Date.now();
        if (now - this.lastScoreUpdate >= this.scoreUpdateThrottle) {
            this.updateScoreDisplay();
            this.lastScoreUpdate = now;
        }
        
        // Check for new high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScoreDisplay();
        }
    }
    
    /**
     * Update score multiplier based on performance
     */
    updateScoreMultiplier() {
        const accuracy = this.accuracyShots > 0 ? this.accuracyHits / this.accuracyShots : 0;
        
        if (accuracy >= 0.9) {
            this.scoreMultiplier = Math.min(5, this.scoreMultiplier + 0.1);
        } else if (accuracy < 0.5) {
            this.scoreMultiplier = Math.max(1, this.scoreMultiplier - 0.05);
        }
    }
    
    /**
     * Update score display with proper formatting
     */
    updateScoreDisplay() {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `SCORE: ${this.formatScore(this.score)}`;
        }
    }
    
    /**
     * Update high score display
     */
    updateHighScoreDisplay() {
        if (this.highScoreDisplay) {
            this.highScoreDisplay.textContent = `HIGH SCORE: ${this.formatScore(this.highScore)}`;
        }
    }
    
    /**
     * Update wave display
     */
    updateWaveDisplay() {
        if (this.waveDisplay) {
            this.waveDisplay.textContent = `WAVE: ${this.wave}`;
        }
    }
    
    /**
     * Format score with proper number separators
     * @param {number} score - Score to format
     * @returns {string} Formatted score string
     */
    formatScore(score) {
        if (typeof score !== 'number') {
            return '0';
        }
        return score.toLocaleString();
    }
    
    /**
     * Load high score from local storage
     * @returns {number} High score value
     */
    loadHighScore() {
        try {
            const stored = localStorage.getItem('spaceInvadersHighScore');
            const score = stored ? parseInt(stored, 10) : 0;
            
            // Validate score data to prevent tampering
            if (isNaN(score) || score < 0 || score > 99999999) {
                console.warn('Invalid high score data detected, resetting to 0');
                return 0;
            }
            
            return score;
        } catch (error) {
            console.error('Error loading high score:', error);
            return 0;
        }
    }
    
    /**
     * Save high score to local storage
     */
    saveHighScore() {
        try {
            // Validate score before saving
            if (typeof this.highScore === 'number' && this.highScore >= 0) {
                localStorage.setItem('spaceInvadersHighScore', this.highScore.toString());
            }
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }
    
    /**
     * Handle game over event
     */
    handleGameOver() {
        this.gameOver = true;
        this.isRunning = false;
        
        // Save high score immediately on game over
        this.saveHighScore();
        
        // Display final score
        this.showGameOverScreen();
    }
    
    /**
     * Show game over screen with final score
     */
    showGameOverScreen() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';
        gameOverScreen.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 30px;
            border: 2px solid #fff;
            text-align: center;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            z-index: 1000;
        `;
        
        const accuracy = this.accuracyShots > 0 ? 
            Math.round((this.accuracyHits / this.accuracyShots) * 100) : 0;
        
        gameOverScreen.innerHTML = `
            <h2>GAME OVER</h2>
            <p>Final Score: ${this.formatScore(this.score)}</p>
            <p>High Score: ${this.formatScore(this.highScore)}</p>
            <p>Wave Reached: ${this.wave}</p>
            <p>Accuracy: ${accuracy}%</p>
            <button onclick="this.parentElement.remove(); game.restart();" 
                    style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
                Play Again
            </button>
        `;
        
        document.body.appendChild(gameOverScreen);
    }
    
    /**
     * Start the game
     */
    start() {
        this.isRunning = true;
        this.gameOver = false;
        this.gameLoop();
    }
    
    /**
     * Restart the game
     */
    restart() {
        // Reset game state
        this.score = 0;
        this.wave = 1;
        this.scoreMultiplier = 1;
        this.accuracyShots = 0;
        this.accuracyHits = 0;
        this.waveStartTime = Date.now();
        this.gameOver = false;
        
        // Clear game objects
        this.enemies = [];
        this.bullets = [];
        
        // Update displays
        this.updateScoreDisplay();
        this.updateWaveDisplay();
        
        // Remove game over screen if it exists
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.remove();
        }
        
        // Restart game
        this.start();
    }
    
    /**
     * Pause/unpause the game
     */
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning || this.gameOver) {
            return;
        }
        
        if (!this.isPaused) {
            this.update();
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update game state
     */
    update() {
        // Update game objects
        this.updateBullets();
        this.updateEnemies();
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkGameState();
    }
    
    /**
     * Render game
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render game objects
        this.renderBackground();
        this.renderPlayer();
        this.renderBullets();
        this.renderEnemies();
        this.renderUI();
    }
    
    /**
     * Placeholder methods for game object management
     */
    updateBullets() {
        // Bullet update logic would go here
    }
    
    updateEnemies() {
        // Enemy update logic would go here
    }
    
    checkCollisions() {
        // Collision detection logic would go here
    }
    
    checkGameState() {
        // Game state checking logic would go here
    }
    
    renderBackground() {
        // Background rendering logic would go here
    }
    
    renderPlayer() {
        // Player rendering logic would go here
    }
    
    renderBullets() {
        // Bullet rendering logic would go here
    }
    
    renderEnemies() {
        // Enemy rendering logic would go here
    }
    
    renderUI() {
        // Additional UI rendering logic would go here
    }
    
    /**
     * Get current game statistics
     * @returns {Object} Game statistics
     */
    getGameStats() {
        const accuracy = this.accuracyShots > 0 ? 
            Math.round((this.accuracyHits / this.accuracyShots) * 100) : 0;
        
        return {
            score: this.score,
            highScore: this.highScore,
            wave: this.wave,
            accuracy: accuracy,
            multiplier: this.scoreMultiplier,
            shotsfired: this.accuracyShots,
            shotsHit: this.accuracyHits
        };
    }
}

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} else {
    window.Game = Game;
}