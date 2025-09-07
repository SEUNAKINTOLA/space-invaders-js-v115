/**
 * Wave Manager System
 * Handles wave progression, enemy spawning, wave completion detection,
 * and bonus score calculation for wave clear events
 */

class WaveManager {
    constructor(eventBus, enemyManager, scoreManager) {
        this.eventBus = eventBus;
        this.enemyManager = enemyManager;
        this.scoreManager = scoreManager;
        
        // Wave state
        this.currentWave = 1;
        this.waveActive = false;
        this.waveStartTime = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesDestroyed = 0;
        this.totalWaveEnemies = 0;
        
        // Wave configuration
        this.baseEnemiesPerWave = 10;
        this.enemyIncreasePerWave = 2;
        this.baseBonusPoints = 1000;
        this.timeBonus = 100;
        this.accuracyBonus = 500;
        
        // Performance tracking
        this.waveStats = {
            shotsfired: 0,
            shotsHit: 0,
            timeElapsed: 0,
            perfectWave: true
        };
        
        this.setupEventListeners();
    }
    
    /**
     * Initialize event listeners for wave management
     */
    setupEventListeners() {
        this.eventBus.on('enemy:destroyed', this.handleEnemyDestroyed.bind(this));
        this.eventBus.on('player:shot', this.handlePlayerShot.bind(this));
        this.eventBus.on('player:hit', this.handlePlayerHit.bind(this));
        this.eventBus.on('game:start', this.startFirstWave.bind(this));
        this.eventBus.on('game:reset', this.reset.bind(this));
    }
    
    /**
     * Start the first wave of the game
     */
    startFirstWave() {
        this.reset();
        this.startWave(1);
    }
    
    /**
     * Start a specific wave
     * @param {number} waveNumber - The wave number to start
     */
    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.waveActive = true;
        this.waveStartTime = Date.now();
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesDestroyed = 0;
        this.totalWaveEnemies = this.calculateWaveEnemyCount(waveNumber);
        
        // Reset wave statistics
        this.waveStats = {
            shotsfired: 0,
            shotsHit: 0,
            timeElapsed: 0,
            perfectWave: true
        };
        
        // Emit wave start event
        this.eventBus.emit('wave:started', {
            waveNumber: this.currentWave,
            totalEnemies: this.totalWaveEnemies,
            difficulty: this.calculateWaveDifficulty(waveNumber)
        });
        
        // Begin enemy spawning
        this.spawnWaveEnemies();
    }
    
    /**
     * Calculate the number of enemies for a given wave
     * @param {number} waveNumber - The wave number
     * @returns {number} Number of enemies to spawn
     */
    calculateWaveEnemyCount(waveNumber) {
        return this.baseEnemiesPerWave + ((waveNumber - 1) * this.enemyIncreasePerWave);
    }
    
    /**
     * Calculate wave difficulty multiplier
     * @param {number} waveNumber - The wave number
     * @returns {number} Difficulty multiplier
     */
    calculateWaveDifficulty(waveNumber) {
        return 1 + (waveNumber - 1) * 0.1;
    }
    
    /**
     * Spawn enemies for the current wave
     */
    spawnWaveEnemies() {
        if (!this.waveActive || !this.enemyManager) {
            return;
        }
        
        const enemyTypes = this.getEnemyTypesForWave(this.currentWave);
        const spawnDelay = Math.max(500, 2000 - (this.currentWave * 100));
        
        const spawnInterval = setInterval(() => {
            if (this.waveEnemiesSpawned >= this.totalWaveEnemies || !this.waveActive) {
                clearInterval(spawnInterval);
                return;
            }
            
            const enemyType = enemyTypes[this.waveEnemiesSpawned % enemyTypes.length];
            this.enemyManager.spawnEnemy(enemyType, this.calculateWaveDifficulty(this.currentWave));
            this.waveEnemiesSpawned++;
            
        }, spawnDelay);
    }
    
    /**
     * Get enemy types to spawn for a given wave
     * @param {number} waveNumber - The wave number
     * @returns {Array<string>} Array of enemy type identifiers
     */
    getEnemyTypesForWave(waveNumber) {
        const baseTypes = ['scout', 'fighter'];
        
        if (waveNumber >= 3) {
            baseTypes.push('heavy');
        }
        
        if (waveNumber >= 5) {
            baseTypes.push('boss');
        }
        
        return baseTypes;
    }
    
    /**
     * Handle enemy destruction event
     * @param {Object} eventData - Enemy destruction event data
     */
    handleEnemyDestroyed(eventData) {
        if (!this.waveActive) {
            return;
        }
        
        this.waveEnemiesDestroyed++;
        this.waveStats.shotsHit++;
        
        // Check if wave is complete
        if (this.waveEnemiesDestroyed >= this.totalWaveEnemies) {
            this.completeWave();
        }
    }
    
    /**
     * Handle player shot event for accuracy tracking
     * @param {Object} eventData - Shot event data
     */
    handlePlayerShot(eventData) {
        if (this.waveActive) {
            this.waveStats.shotsfired++;
        }
    }
    
    /**
     * Handle player hit event for perfect wave tracking
     * @param {Object} eventData - Player hit event data
     */
    handlePlayerHit(eventData) {
        if (this.waveActive) {
            this.waveStats.perfectWave = false;
        }
    }
    
    /**
     * Complete the current wave and calculate bonuses
     */
    completeWave() {
        if (!this.waveActive) {
            return;
        }
        
        this.waveActive = false;
        this.waveStats.timeElapsed = Date.now() - this.waveStartTime;
        
        const bonusScore = this.calculateWaveBonus();
        
        // Emit wave completion event with bonus details
        this.eventBus.emit('wave:completed', {
            waveNumber: this.currentWave,
            bonusScore: bonusScore,
            stats: { ...this.waveStats },
            nextWave: this.currentWave + 1
        });
        
        // Award bonus points
        if (bonusScore > 0 && this.scoreManager) {
            this.scoreManager.addScore(bonusScore, 'wave_bonus');
        }
        
        // Start next wave after delay
        setTimeout(() => {
            this.startWave(this.currentWave + 1);
        }, 3000);
    }
    
    /**
     * Calculate wave completion bonus score
     * @returns {number} Bonus score for wave completion
     */
    calculateWaveBonus() {
        let bonus = this.baseBonusPoints * this.currentWave;
        
        // Time bonus (faster completion = more points)
        const timeInSeconds = this.waveStats.timeElapsed / 1000;
        const expectedTime = 60; // Expected time per wave in seconds
        if (timeInSeconds < expectedTime) {
            const timeBonusMultiplier = Math.max(0, (expectedTime - timeInSeconds) / expectedTime);
            bonus += Math.floor(this.timeBonus * timeBonusMultiplier * this.currentWave);
        }
        
        // Accuracy bonus
        if (this.waveStats.shotsfired > 0) {
            const accuracy = this.waveStats.shotsHit / this.waveStats.shotsfired;
            if (accuracy >= 0.8) {
                bonus += Math.floor(this.accuracyBonus * accuracy * this.currentWave);
            }
        }
        
        // Perfect wave bonus (no damage taken)
        if (this.waveStats.perfectWave) {
            bonus += Math.floor(this.baseBonusPoints * 0.5 * this.currentWave);
        }
        
        return Math.floor(bonus);
    }
    
    /**
     * Get current wave information
     * @returns {Object} Current wave state
     */
    getCurrentWaveInfo() {
        return {
            waveNumber: this.currentWave,
            isActive: this.waveActive,
            enemiesSpawned: this.waveEnemiesSpawned,
            enemiesDestroyed: this.waveEnemiesDestroyed,
            totalEnemies: this.totalWaveEnemies,
            progress: this.totalWaveEnemies > 0 ? this.waveEnemiesDestroyed / this.totalWaveEnemies : 0,
            timeElapsed: this.waveActive ? Date.now() - this.waveStartTime : this.waveStats.timeElapsed,
            stats: { ...this.waveStats }
        };
    }
    
    /**
     * Check if current wave is complete
     * @returns {boolean} True if wave is complete
     */
    isWaveComplete() {
        return !this.waveActive && this.waveEnemiesDestroyed >= this.totalWaveEnemies;
    }
    
    /**
     * Force complete current wave (for testing or special conditions)
     */
    forceCompleteWave() {
        if (this.waveActive) {
            this.waveEnemiesDestroyed = this.totalWaveEnemies;
            this.completeWave();
        }
    }
    
    /**
     * Skip to a specific wave
     * @param {number} waveNumber - Wave number to skip to
     */
    skipToWave(waveNumber) {
        if (waveNumber > 0) {
            this.waveActive = false;
            this.startWave(waveNumber);
        }
    }
    
    /**
     * Reset wave manager to initial state
     */
    reset() {
        this.currentWave = 1;
        this.waveActive = false;
        this.waveStartTime = 0;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesDestroyed = 0;
        this.totalWaveEnemies = 0;
        
        this.waveStats = {
            shotsfired: 0,
            shotsHit: 0,
            timeElapsed: 0,
            perfectWave: true
        };
    }
    
    /**
     * Update wave manager (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (!this.waveActive) {
            return;
        }
        
        // Check for wave timeout or other conditions
        const currentTime = Date.now();
        const waveTimeLimit = 300000; // 5 minutes per wave maximum
        
        if (currentTime - this.waveStartTime > waveTimeLimit) {
            // Force wave completion if taking too long
            this.eventBus.emit('wave:timeout', {
                waveNumber: this.currentWave,
                timeElapsed: currentTime - this.waveStartTime
            });
            
            this.forceCompleteWave();
        }
    }
    
    /**
     * Get wave statistics for display
     * @returns {Object} Formatted wave statistics
     */
    getWaveStats() {
        const accuracy = this.waveStats.shotsFired > 0 
            ? (this.waveStats.shotsHit / this.waveStats.shotsFired * 100).toFixed(1)
            : '0.0';
            
        return {
            wave: this.currentWave,
            enemiesRemaining: Math.max(0, this.totalWaveEnemies - this.waveEnemiesDestroyed),
            accuracy: `${accuracy}%`,
            timeElapsed: Math.floor((Date.now() - this.waveStartTime) / 1000),
            perfectWave: this.waveStats.perfectWave,
            progress: this.totalWaveEnemies > 0 
                ? Math.floor((this.waveEnemiesDestroyed / this.totalWaveEnemies) * 100)
                : 0
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaveManager;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.WaveManager = WaveManager;
}