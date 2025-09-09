/**
 * 🌊 Wave Management System
 * Handles enemy wave generation, progression, and difficulty scaling
 */

import { gameConfig } from '../config/gameConfig.js';
import { MathUtils } from '../utils.js';

export class WaveManager {
    constructor() {
        this.currentWave = 1;
        this.enemiesRemaining = 0;
        this.waveInProgress = false;
        this.timeBetweenWaves = 3000; // 3 seconds
        this.lastWaveEndTime = 0;
        this.waveStartTime = 0;
        this.totalEnemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        // Wave configuration
        this.baseEnemyCount = 8;
        this.enemyCountIncrement = 2;
        this.maxEnemiesPerWave = 50;
        
        // Difficulty scaling
        this.difficultyMultiplier = 1.0;
        this.speedIncrement = 0.1;
        this.healthIncrement = 0.2;
        
        // Special wave configuration
        this.bossWaveInterval = 5; // Every 5th wave is a boss wave
        this.specialWaveTypes = ['fast', 'armored', 'swarm', 'mixed'];
        
        // Wave patterns
        this.wavePatterns = {
            standard: { rows: 4, cols: 8, spacing: { x: 60, y: 50 } },
            dense: { rows: 5, cols: 10, spacing: { x: 45, y: 40 } },
            sparse: { rows: 3, cols: 6, spacing: { x: 80, y: 60 } },
            formation: { rows: 6, cols: 12, spacing: { x: 50, y: 45 } }
        };
        
        // Performance tracking
        this.waveStats = {
            averageWaveTime: 0,
            fastestWave: Infinity,
            slowestWave: 0,
            totalWaves: 0
        };
        
        // Event callbacks
        this.onWaveStart = null;
        this.onWaveComplete = null;
        this.onBossWave = null;
        this.onSpecialWave = null;
    }
    
    /**
     * Initialize wave manager
     */
    init() {
        this.reset();
        console.log('🌊 Wave Manager initialized');
    }
    
    /**
     * Reset wave manager to initial state
     */
    reset() {
        this.currentWave = 1;
        this.enemiesRemaining = 0;
        this.waveInProgress = false;
        this.lastWaveEndTime = 0;
        this.waveStartTime = 0;
        this.totalEnemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.difficultyMultiplier = 1.0;
        
        // Reset stats
        this.waveStats = {
            averageWaveTime: 0,
            fastestWave: Infinity,
            slowestWave: 0,
            totalWaves: 0
        };
    }
    
    /**
     * Update wave manager
     * @param {number} deltaTime - Time since last update
     * @param {number} currentTime - Current game time
     * @param {Array} enemies - Current enemies array
     */
    update(deltaTime, currentTime, enemies) {
        // Update enemies remaining count
        this.enemiesRemaining = enemies.length;
        
        // Check if wave is complete
        if (this.waveInProgress && this.enemiesRemaining === 0) {
            this.completeWave(currentTime);
        }
        
        // Check if it's time to start next wave
        if (!this.waveInProgress && 
            currentTime - this.lastWaveEndTime >= this.timeBetweenWaves) {
            this.startNextWave(currentTime);
        }
        
        // Update wave statistics
        this.updateWaveStats(currentTime);
    }
    
    /**
     * Start the next wave
     * @param {number} currentTime - Current game time
     */
    startNextWave(currentTime) {
        this.waveInProgress = true;
        this.waveStartTime = currentTime;
        this.currentWave++;
        
        // Calculate wave properties
        const waveConfig = this.calculateWaveConfig();
        
        // Trigger wave start event
        if (this.onWaveStart) {
            this.onWaveStart(this.currentWave, waveConfig);
        }
        
        // Special wave handling
        if (this.isBossWave()) {
            this.handleBossWave(waveConfig);
        } else if (this.isSpecialWave()) {
            this.handleSpecialWave(waveConfig);
        }
        
        console.log(`🌊 Wave ${this.currentWave} started!`, waveConfig);
    }
    
    /**
     * Complete current wave
     * @param {number} currentTime - Current game time
     */
    completeWave(currentTime) {
        const waveTime = currentTime - this.waveStartTime;
        
        // Update statistics
        this.updateWaveCompletionStats(waveTime);
        
        // Mark wave as complete
        this.waveInProgress = false;
        this.lastWaveEndTime = currentTime;
        
        // Increase difficulty
        this.increaseDifficulty();
        
        // Trigger wave complete event
        if (this.onWaveComplete) {
            this.onWaveComplete(this.currentWave, waveTime, this.waveStats);
        }
        
        console.log(`✅ Wave ${this.currentWave} completed in ${(waveTime / 1000).toFixed(1)}s`);
    }
    
    /**
     * Calculate configuration for current wave
     * @returns {Object} Wave configuration
     */
    calculateWaveConfig() {
        const baseCount = this.baseEnemyCount + 
                         (this.currentWave - 1) * this.enemyCountIncrement;
        
        const enemyCount = Math.min(baseCount, this.maxEnemiesPerWave);
        
        // Determine wave pattern
        const patternName = this.selectWavePattern();
        const pattern = this.wavePatterns[patternName];
        
        // Calculate enemy distribution
        const distribution = this.calculateEnemyDistribution(enemyCount);
        
        return {
            wave: this.currentWave,
            enemyCount,
            pattern: patternName,
            layout: pattern,
            distribution,
            difficulty: this.difficultyMultiplier,
            specialType: this.getSpecialWaveType(),
            isBoss: this.isBossWave(),
            bonusMultiplier: this.calculateBonusMultiplier()
        };
    }
    
    /**
     * Select appropriate wave pattern based on wave number and difficulty
     * @returns {string} Pattern name
     */
    selectWavePattern() {
        const patterns = Object.keys(this.wavePatterns);
        
        // Early waves use standard pattern
        if (this.currentWave <= 3) {
            return 'standard';
        }
        
        // Boss waves use formation pattern
        if (this.isBossWave()) {
            return 'formation';
        }
        
        // Higher waves use more complex patterns
        if (this.currentWave >= 10) {
            const complexPatterns = ['dense', 'formation'];
            return complexPatterns[Math.floor(Math.random() * complexPatterns.length)];
        }
        
        // Random pattern for mid-level waves
        return patterns[Math.floor(Math.random() * patterns.length)];
    }
    
    /**
     * Calculate enemy type distribution for wave
     * @param {number} totalEnemies - Total number of enemies
     * @returns {Object} Enemy distribution
     */
    calculateEnemyDistribution(totalEnemies) {
        const distribution = {
            basic: 0,
            fast: 0,
            armored: 0,
            shooter: 0,
            boss: 0
        };
        
        if (this.isBossWave()) {
            distribution.boss = 1;
            distribution.basic = Math.floor(totalEnemies * 0.4);
            distribution.fast = Math.floor(totalEnemies * 0.3);
            distribution.armored = Math.floor(totalEnemies * 0.2);
            distribution.shooter = totalEnemies - distribution.boss - 
                                 distribution.basic - distribution.fast - distribution.armored;
        } else {
            // Standard distribution based on wave number
            const basicRatio = Math.max(0.4, 0.8 - this.currentWave * 0.05);
            const fastRatio = Math.min(0.3, this.currentWave * 0.03);
            const armoredRatio = Math.min(0.2, this.currentWave * 0.02);
            const shooterRatio = 1 - basicRatio - fastRatio - armoredRatio;
            
            distribution.basic = Math.floor(totalEnemies * basicRatio);
            distribution.fast = Math.floor(totalEnemies * fastRatio);
            distribution.armored = Math.floor(totalEnemies * armoredRatio);
            distribution.shooter = totalEnemies - distribution.basic - 
                                 distribution.fast - distribution.armored;
        }
        
        return distribution;
    }
    
    /**
     * Check if current wave is a boss wave
     * @returns {boolean}
     */
    isBossWave() {
        return this.currentWave % this.bossWaveInterval === 0;
    }
    
    /**
     * Check if current wave is a special wave
     * @returns {boolean}
     */
    isSpecialWave() {
        return !this.isBossWave() && this.currentWave % 3 === 0;
    }
    
    /**
     * Get special wave type
     * @returns {string|null}
     */
    getSpecialWaveType() {
        if (!this.isSpecialWave()) return null;
        
        const typeIndex = Math.floor(this.currentWave / 3) % this.specialWaveTypes.length;
        return this.specialWaveTypes[typeIndex];
    }
    
    /**
     * Handle boss wave special logic
     * @param {Object} waveConfig - Wave configuration
     */
    handleBossWave(waveConfig) {
        if (this.onBossWave) {
            this.onBossWave(waveConfig);
        }
        
        // Boss waves have longer preparation time
        this.timeBetweenWaves = 5000;
        
        console.log('👹 Boss wave incoming!');
    }
    
    /**
     * Handle special wave logic
     * @param {Object} waveConfig - Wave configuration
     */
    handleSpecialWave(waveConfig) {
        if (this.onSpecialWave) {
            this.onSpecialWave(waveConfig);
        }
        
        const specialType = waveConfig.specialType;
        console.log(`⭐ Special wave: ${specialType}`);
        
        // Apply special wave modifiers
        switch (specialType) {
            case 'fast':
                // All enemies move faster
                waveConfig.speedMultiplier = 1.5;
                break;
            case 'armored':
                // All enemies have more health
                waveConfig.healthMultiplier = 2.0;
                break;
            case 'swarm':
                // More enemies, but weaker
                waveConfig.enemyCount *= 1.5;
                waveConfig.healthMultiplier = 0.7;
                break;
            case 'mixed':
                // Balanced mix of all types
                waveConfig.mixedFormation = true;
                break;
        }
    }
    
    /**
     * Increase difficulty for next wave
     */
    increaseDifficulty() {
        // Increase base difficulty multiplier
        this.difficultyMultiplier += 0.1;
        
        // Decrease time between waves (minimum 1 second)
        this.timeBetweenWaves = Math.max(1000, this.timeBetweenWaves - 100);
        
        // Increase enemy stats scaling
        const waveBonus = Math.floor(this.currentWave / 5);
        this.speedIncrement += waveBonus * 0.02;
        this.healthIncrement += waveBonus * 0.05;
    }
    
    /**
     * Calculate bonus multiplier for current wave
     * @returns {number}
     */
    calculateBonusMultiplier() {
        let multiplier = 1.0;
        
        // Boss wave bonus
        if (this.isBossWave()) {
            multiplier += 0.5;
        }
        
        // Special wave bonus
        if (this.isSpecialWave()) {
            multiplier += 0.3;
        }
        
        // Consecutive wave bonus
        if (this.currentWave >= 10) {
            multiplier += (this.currentWave - 9) * 0.1;
        }
        
        return multiplier;
    }
    
    /**
     * Update wave completion statistics
     * @param {number} waveTime - Time taken to complete wave
     */
    updateWaveCompletionStats(waveTime) {
        this.waveStats.totalWaves++;
        
        // Update fastest/slowest times
        if (waveTime < this.waveStats.fastestWave) {
            this.waveStats.fastestWave = waveTime;
        }
        if (waveTime > this.waveStats.slowestWave) {
            this.waveStats.slowestWave = waveTime;
        }
        
        // Update average time
        const totalTime = this.waveStats.averageWaveTime * (this.waveStats.totalWaves - 1) + waveTime;
        this.waveStats.averageWaveTime = totalTime / this.waveStats.totalWaves;
    }
    
    /**
     * Update ongoing wave statistics
     * @param {number} currentTime - Current game time
     */
    updateWaveStats(currentTime) {
        if (!this.waveInProgress) return;
        
        const currentWaveTime = currentTime - this.waveStartTime;
        
        // Track performance metrics
        if (currentWaveTime > 0) {
            const enemiesPerSecond = this.enemiesKilled / (currentWaveTime / 1000);
            this.waveStats.currentEnemiesPerSecond = enemiesPerSecond;
        }
    }
    
    /**
     * Get current wave information
     * @returns {Object}
     */
    getCurrentWaveInfo() {
        return {
            wave: this.currentWave,
            enemiesRemaining: this.enemiesRemaining,
            inProgress: this.waveInProgress,
            difficulty: this.difficultyMultiplier,
            isBoss: this.isBossWave(),
            isSpecial: this.isSpecialWave(),
            specialType: this.getSpecialWaveType(),
            stats: { ...this.waveStats }
        };
    }
    
    /**
     * Get wave preview for next wave
     * @returns {Object}
     */
    getNextWavePreview() {
        const nextWave = this.currentWave + 1;
        const tempWave = this.currentWave;
        
        // Temporarily set to next wave to calculate config
        this.currentWave = nextWave;
        const config = this.calculateWaveConfig();
        this.currentWave = tempWave; // Restore current wave
        
        return {
            wave: nextWave,
            ...config,
            timeUntilStart: Math.max(0, this.timeBetweenWaves - 
                          (Date.now() - this.lastWaveEndTime))
        };
    }
    
    /**
     * Force start next wave (cheat/debug function)
     */
    forceNextWave() {
        if (!this.waveInProgress) {
            this.lastWaveEndTime = Date.now() - this.timeBetweenWaves;
        }
    }
    
    /**
     * Skip to specific wave (cheat/debug function)
     * @param {number} targetWave - Target wave number
     */
    skipToWave(targetWave) {
        if (targetWave > this.currentWave) {
            this.currentWave = targetWave - 1;
            this.difficultyMultiplier = 1.0 + (targetWave - 1) * 0.1;
            this.forceNextWave();
        }
    }
    
    /**
     * Get wave manager statistics
     * @returns {Object}
     */
    getStatistics() {
        return {
            currentWave: this.currentWave,
            totalEnemiesSpawned: this.totalEnemiesSpawned,
            enemiesKilled: this.enemiesKilled,
            difficultyMultiplier: this.difficultyMultiplier,
            waveStats: { ...this.waveStats },
            performance: {
                averageWaveTime: this.waveStats.averageWaveTime,
                fastestWave: this.waveStats.fastestWave,
                slowestWave: this.waveStats.slowestWave,
                totalWaves: this.waveStats.totalWaves
            }
        };
    }
    
    /**
     * Register event callbacks
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        switch (event) {
            case 'waveStart':
                this.onWaveStart = callback;
                break;
            case 'waveComplete':
                this.onWaveComplete = callback;
                break;
            case 'bossWave':
                this.onBossWave = callback;
                break;
            case 'specialWave':
                this.onSpecialWave = callback;
                break;
            default:
                console.warn(`Unknown event: ${event}`);
        }
    }
    
    /**
     * Remove event callback
     * @param {string} event - Event name
     */
    off(event) {
        switch (event) {
            case 'waveStart':
                this.onWaveStart = null;
                break;
            case 'waveComplete':
                this.onWaveComplete = null;
                break;
            case 'bossWave':
                this.onBossWave = null;
                break;
            case 'specialWave':
                this.onSpecialWave = null;
                break;
        }
    }
    
    /**
     * Serialize wave manager state
     * @returns {Object}
     */
    serialize() {
        return {
            currentWave: this.currentWave,
            enemiesRemaining: this.enemiesRemaining,
            waveInProgress: this.waveInProgress,
            lastWaveEndTime: this.lastWaveEndTime,
            difficultyMultiplier: this.difficultyMultiplier,
            waveStats: this.waveStats
        };
    }
    
    /**
     * Deserialize wave manager state
     * @param {Object} data - Serialized data
     */
    deserialize(data) {
        this.currentWave = data.currentWave || 1;
        this.enemiesRemaining = data.enemiesRemaining || 0;
        this.waveInProgress = data.waveInProgress || false;
        this.lastWaveEndTime = data.lastWaveEndTime || 0;
        this.difficultyMultiplier = data.difficultyMultiplier || 1.0;
        this.waveStats = data.waveStats || {
            averageWaveTime: 0,
            fastestWave: Infinity,
            slowestWave: 0,
            totalWaves: 0
        };
    }
}