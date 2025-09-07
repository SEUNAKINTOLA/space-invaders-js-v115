/**
 * Comprehensive scoring system for Space Invaders game
 * 
 * This module provides a complete scoring system that handles:
 * - Point calculation for enemy destruction
 * - Score display and tracking
 * - High score management with local storage persistence
 * - Bonus point logic for combos and achievements
 * - Score-related event handling and notifications
 * 
 * Architecture:
 * - Event-driven design for loose coupling
 * - Repository pattern for score persistence
 * - Strategy pattern for different scoring rules
 * - Observer pattern for score updates
 * 
 * Dependencies: None (uses only standard browser APIs)
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Custom error types for score system operations
 */
class ScoreSystemError extends Error {
    constructor(message, code = 'SCORE_ERROR') {
        super(message);
        this.name = 'ScoreSystemError';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

class ScorePersistenceError extends ScoreSystemError {
    constructor(message) {
        super(message, 'PERSISTENCE_ERROR');
        this.name = 'ScorePersistenceError';
    }
}

/**
 * Score calculation strategies for different enemy types and scenarios
 */
class ScoreCalculator {
    constructor() {
        this.baseScores = {
            'basic': 10,
            'scout': 20,
            'tank': 50,
            'boss': 200
        };
        
        this.multipliers = {
            'combo': 1.5,
            'perfect': 2.0,
            'streak': 1.2
        };
        
        this.logger = this._createLogger();
    }

    /**
     * Calculate points for enemy destruction
     * @param {string} enemyType - Type of enemy destroyed
     * @param {Object} context - Additional context for scoring
     * @param {number} context.comboCount - Current combo count
     * @param {boolean} context.isPerfectHit - Whether it was a perfect hit
     * @param {number} context.streakCount - Current streak count
     * @returns {number} Calculated score points
     */
    calculateEnemyScore(enemyType, context = {}) {
        try {
            this._validateEnemyType(enemyType);
            this._validateContext(context);

            const baseScore = this.baseScores[enemyType] || this.baseScores['basic'];
            let finalScore = baseScore;

            // Apply combo multiplier
            if (context.comboCount > 1) {
                const comboMultiplier = Math.min(
                    this.multipliers.combo * Math.log(context.comboCount), 
                    3.0
                );
                finalScore *= comboMultiplier;
                this.logger.debug(`Applied combo multiplier: ${comboMultiplier}`, {
                    comboCount: context.comboCount,
                    baseScore,
                    newScore: finalScore
                });
            }

            // Apply perfect hit bonus
            if (context.isPerfectHit) {
                finalScore *= this.multipliers.perfect;
                this.logger.debug('Applied perfect hit multiplier', {
                    multiplier: this.multipliers.perfect,
                    newScore: finalScore
                });
            }

            // Apply streak bonus
            if (context.streakCount > 5) {
                const streakMultiplier = Math.min(
                    this.multipliers.streak * (context.streakCount / 10), 
                    2.5
                );
                finalScore *= streakMultiplier;
                this.logger.debug(`Applied streak multiplier: ${streakMultiplier}`, {
                    streakCount: context.streakCount,
                    newScore: finalScore
                });
            }

            return Math.floor(finalScore);
        } catch (error) {
            this.logger.error('Error calculating enemy score', {
                enemyType,
                context,
                error: error.message
            });
            return this.baseScores['basic']; // Fallback to basic score
        }
    }

    /**
     * Calculate bonus points for special achievements
     * @param {string} achievementType - Type of achievement
     * @param {Object} data - Achievement-specific data
     * @returns {number} Bonus points awarded
     */
    calculateBonusScore(achievementType, data = {}) {
        const bonusScores = {
            'wave_clear': 100,
            'no_damage': 500,
            'speed_bonus': 200,
            'accuracy_bonus': 300
        };

        const baseBonus = bonusScores[achievementType] || 0;
        
        // Apply data-specific multipliers
        switch (achievementType) {
            case 'wave_clear':
                return baseBonus * (data.waveNumber || 1);
            case 'accuracy_bonus':
                return Math.floor(baseBonus * (data.accuracy || 0.5));
            case 'speed_bonus':
                return Math.floor(baseBonus * Math.min(data.speedMultiplier || 1, 2));
            default:
                return baseBonus;
        }
    }

    _validateEnemyType(enemyType) {
        if (typeof enemyType !== 'string' || enemyType.trim() === '') {
            throw new ScoreSystemError('Enemy type must be a non-empty string');
        }
    }

    _validateContext(context) {
        if (context.comboCount !== undefined && 
            (!Number.isInteger(context.comboCount) || context.comboCount < 0)) {
            throw new ScoreSystemError('Combo count must be a non-negative integer');
        }
        
        if (context.streakCount !== undefined && 
            (!Number.isInteger(context.streakCount) || context.streakCount < 0)) {
            throw new ScoreSystemError('Streak count must be a non-negative integer');
        }
    }

    _createLogger() {
        return {
            debug: (message, data) => console.debug(`[ScoreCalculator] ${message}`, data),
            error: (message, data) => console.error(`[ScoreCalculator] ${message}`, data)
        };
    }
}

/**
 * High score persistence manager using localStorage
 */
class HighScoreRepository {
    constructor(storageKey = 'spaceInvaders_highScores', maxScores = 10) {
        this.storageKey = storageKey;
        this.maxScores = maxScores;
        this.logger = this._createLogger();
        this._validateStorage();
    }

    /**
     * Get all high scores sorted by score descending
     * @returns {Array<Object>} Array of high score entries
     */
    getHighScores() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) {
                return [];
            }

            const scores = JSON.parse(stored);
            return this._validateAndSortScores(scores);
        } catch (error) {
            this.logger.error('Failed to retrieve high scores', { error: error.message });
            return [];
        }
    }

    /**
     * Add a new high score entry
     * @param {number} score - The score to add
     * @param {string} playerName - Name of the player (optional)
     * @param {Object} metadata - Additional metadata (optional)
     * @returns {boolean} True if score was added to high scores list
     */
    addHighScore(score, playerName = 'Anonymous', metadata = {}) {
        try {
            this._validateScore(score);
            this._validatePlayerName(playerName);

            const currentScores = this.getHighScores();
            const newEntry = {
                score,
                playerName: this._sanitizePlayerName(playerName),
                timestamp: new Date().toISOString(),
                metadata: this._sanitizeMetadata(metadata)
            };

            // Check if score qualifies for high scores
            if (currentScores.length < this.maxScores || 
                score > currentScores[currentScores.length - 1].score) {
                
                currentScores.push(newEntry);
                currentScores.sort((a, b) => b.score - a.score);
                
                // Keep only top scores
                const trimmedScores = currentScores.slice(0, this.maxScores);
                
                localStorage.setItem(this.storageKey, JSON.stringify(trimmedScores));
                
                this.logger.debug('High score added', {
                    score,
                    playerName,
                    position: trimmedScores.findIndex(s => s.score === score && s.playerName === playerName) + 1
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            this.logger.error('Failed to add high score', {
                score,
                playerName,
                error: error.message
            });
            throw new ScorePersistenceError(`Failed to save high score: ${error.message}`);
        }
    }

    /**
     * Get the highest score
     * @returns {number} The highest score, or 0 if no scores exist
     */
    getHighestScore() {
        const scores = this.getHighScores();
        return scores.length > 0 ? scores[0].score : 0;
    }

    /**
     * Check if a score qualifies as a high score
     * @param {number} score - Score to check
     * @returns {boolean} True if score would make it to high scores list
     */
    isHighScore(score) {
        const currentScores = this.getHighScores();
        return currentScores.length < this.maxScores || 
               score > currentScores[currentScores.length - 1].score;
    }

    /**
     * Clear all high scores (for testing or reset functionality)
     */
    clearHighScores() {
        try {
            localStorage.removeItem(this.storageKey);
            this.logger.debug('High scores cleared');
        } catch (error) {
            this.logger.error('Failed to clear high scores', { error: error.message });
            throw new ScorePersistenceError(`Failed to clear high scores: ${error.message}`);
        }
    }

    _validateStorage() {
        if (typeof Storage === 'undefined') {
            throw new ScorePersistenceError('localStorage is not available');
        }
    }

    _validateScore(score) {
        if (!Number.isInteger(score) || score < 0) {
            throw new ScoreSystemError('Score must be a non-negative integer');
        }
    }

    _validatePlayerName(playerName) {
        if (typeof playerName !== 'string') {
            throw new ScoreSystemError('Player name must be a string');
        }
    }

    _sanitizePlayerName(playerName) {
        return playerName.trim().substring(0, 20) || 'Anonymous';
    }

    _sanitizeMetadata(metadata) {
        // Remove any functions or non-serializable data
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (typeof value !== 'function' && value !== undefined) {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    _validateAndSortScores(scores) {
        if (!Array.isArray(scores)) {
            this.logger.error('Invalid scores data format, resetting');
            return [];
        }

        const validScores = scores.filter(entry => {
            return entry && 
                   typeof entry.score === 'number' && 
                   entry.score >= 0 &&
                   typeof entry.playerName === 'string';
        });

        return validScores.sort((a, b) => b.score - a.score);
    }

    _createLogger() {
        return {
            debug: (message, data) => console.debug(`[HighScoreRepository] ${message}`, data),
            error: (message, data) => console.error(`[HighScoreRepository] ${message}`, data)
        };
    }
}

/**
 * Main scoring system that orchestrates all scoring functionality
 */
class ScoreSystem {
    constructor(options = {}) {
        this.currentScore = 0;
        this.sessionStats = {
            enemiesDestroyed: 0,
            comboCount: 0,
            maxCombo: 0,
            streakCount: 0,
            maxStreak: 0,
            bonusPoints: 0
        };

        this.calculator = new ScoreCalculator();
        this.repository = new HighScoreRepository(
            options.storageKey,
            options.maxHighScores
        );

        this.eventListeners = new Map();
        this.logger = this._createLogger();
        this.isActive = true;

        // Performance monitoring
        this.performanceMetrics = {
            calculationTime: [],
            persistenceTime: []
        };

        this.logger.debug('ScoreSystem initialized', {
            options,
            highestScore: this.repository.getHighestScore()
        });
    }

    /**
     * Add points for enemy destruction
     * @param {string} enemyType - Type of enemy destroyed
     * @param {Object} context - Additional scoring context
     * @returns {number} Points awarded
     */
    addEnemyScore(enemyType, context = {}) {
        if (!this.isActive) {
            return 0;
        }

        const startTime = performance.now();

        try {
            // Update session stats
            this.sessionStats.enemiesDestroyed++;
            
            // Handle combo logic
            if (context.isCombo) {
                this.sessionStats.comboCount++;
                this.sessionStats.maxCombo = Math.max(
                    this.sessionStats.maxCombo, 
                    this.sessionStats.comboCount
                );
            } else {
                this.sessionStats.comboCount = 0;
            }

            // Handle streak logic
            if (context.continuesStreak) {
                this.sessionStats.streakCount++;
                this.sessionStats.maxStreak = Math.max(
                    this.sessionStats.maxStreak,
                    this.sessionStats.streakCount
                );
            } else {
                this.sessionStats.streakCount = 0;
            }

            // Calculate score with current session context
            const scoringContext = {
                ...context,
                comboCount: this.sessionStats.comboCount,
                streakCount: this.sessionStats.streakCount
            };

            const points = this.calculator.calculateEnemyScore(enemyType, scoringContext);
            this.currentScore += points;

            // Record performance
            const calculationTime = performance.now() - startTime;
            this._recordPerformanceMetric('calculationTime', calculationTime);

            // Emit score update event
            this._emitEvent('scoreUpdate', {
                points,
                totalScore: this.currentScore,
                enemyType,
                context: scoringContext,
                sessionStats: { ...this.sessionStats }
            });

            this.logger.debug('Enemy score added', {
                enemyType,
                points,
                totalScore: this.currentScore,
                calculationTime: `${calculationTime.toFixed(2)}ms`
            });

            return points;
        } catch (error) {
            this.logger.error('Failed to add enemy score', {
                enemyType,
                context,
                error: error.message
            });
            return 0;
        }
    }

    /**
     * Add bonus points for achievements
     * @param {string} achievementType - Type of achievement
     * @param {Object} data - Achievement data
     * @returns {number} Bonus points awarded
     */
    addBonusScore(achievementType, data = {}) {
        if (!this.isActive) {
            return 0;
        }

        try {
            const bonusPoints = this.calculator.calculateBonusScore(achievementType, data);
            this.currentScore += bonusPoints;
            this.sessionStats.bonusPoints += bonusPoints;

            this._emitEvent('bonusScore', {
                achievementType,
                bonusPoints,
                totalScore: this.currentScore,
                data
            });

            this.logger.debug('Bonus score added', {
                achievementType,
                bonusPoints,
                totalScore: this.currentScore
            });

            return bonusPoints;
        } catch (error) {
            this.logger.error('Failed to add bonus score', {
                achievementType,
                data,
                error: error.message
            });
            return 0;
        }
    }

    /**
     * Get current score
     * @returns {number} Current score
     */
    getCurrentScore() {
        return this.currentScore;
    }

    /**
     * Get session statistics
     * @returns {Object} Session statistics
     */
    getSessionStats() {
        return { ...this.sessionStats };
    }

    /**
     * Get all high scores
     * @returns {Array<Object>} High scores list
     */
    getHighScores() {
        return this.repository.getHighScores();
    }

    /**
     * Get the highest score ever achieved
     * @returns {number} Highest score
     */
    getHighestScore() {
        return this.repository.getHighestScore();
    }

    /**
     * Check if current score is a high score
     * @returns {boolean} True if current score qualifies as high score
     */
    isCurrentScoreHigh() {
        return this.repository.isHighScore(this.currentScore);
    }

    /**
     * Save current score as high score
     * @param {string} playerName - Player name for high score entry
     * @param {Object} metadata - Additional metadata
     * @returns {boolean} True if score was saved as high score
     */
    saveHighScore(playerName = 'Anonymous', metadata = {}) {
        const startTime = performance.now();

        try {
            const sessionMetadata = {
                ...metadata,
                sessionStats: this.sessionStats,
                gameVersion: '1.0.0',
                platform: navigator.userAgent
            };

            const wasAdded = this.repository.addHighScore(
                this.currentScore,
                playerName,
                sessionMetadata
            );

            const persistenceTime = performance.now() - startTime;
            this._recordPerformanceMetric('persistenceTime', persistenceTime);

            if (wasAdded) {
                this._emitEvent('highScoreAchieved', {
                    score: this.currentScore,
                    playerName,
                    metadata: sessionMetadata
                });

                this.logger.debug('High score saved', {
                    score: this.currentScore,
                    playerName,
                    persistenceTime: `${persistenceTime.toFixed(2)}ms`
                });
            }

            return wasAdded;
        } catch (error) {
            this.logger.error('Failed to save high score', {
                score: this.currentScore,
                playerName,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Reset current game score and session stats
     */
    resetScore() {
        const previousScore = this.currentScore;
        
        this.currentScore = 0;
        this.sessionStats = {
            enemiesDestroyed: 0,
            comboCount: 0,
            maxCombo: 0,
            streakCount: 0,
            maxStreak: 0,
            bonusPoints: 0
        };

        this._emitEvent('scoreReset', {
            previousScore,
            newScore: this.currentScore
        });

        this.logger.debug('Score reset', { previousScore });
    }

    /**
     * Add event listener for score events
     * @param {string} eventType - Type of event to listen for
     * @param {Function} callback - Callback function
     */
    addEventListener(eventType, callback) {
        if (typeof callback !== 'function') {
            throw new ScoreSystemError('Event callback must be a function');
        }

        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }

        this.eventListeners.get(eventType).add(callback);
        
        this.logger.debug('Event listener added', { eventType });
    }

    /**
     * Remove event listener
     * @param {string} eventType - Type of event
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(eventType, callback) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.eventListeners.delete(eventType);
            }
        }
    }

    /**
     * Get performance metrics for monitoring
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const metrics = {};
        
        for (const [key, values] of Object.entries(this.performanceMetrics)) {
            if (values.length > 0) {
                metrics[key] = {
                    count: values.length,
                    average: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        }

        return metrics;
    }

    /**
     * Pause the scoring system
     */
    pause() {
        this.isActive = false;
        this._emitEvent('scoringPaused', {});
        this.logger.debug('Scoring system paused');
    }

    /**
     * Resume the scoring system
     */
    resume() {
        this.isActive = true;
        this._emitEvent('scoringResumed', {});
        this.logger.debug('Scoring system resumed');
    }

    /**
     * Cleanup resources and event listeners
     */
    destroy() {
        this.isActive = false;
        this.eventListeners.clear();
        this._emitEvent('scoringDestroyed', {});
        this.logger.debug('Scoring system destroyed');
    }

    _emitEvent(eventType, data) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error('Error in event listener', {
                        eventType,
                        error: error.message
                    });
                }
            });
        }
    }

    _recordPerformanceMetric(metricName, value) {
        const metrics = this.performanceMetrics[metricName];
        metrics.push(value);
        
        // Keep only last 100 measurements to prevent memory leaks
        if (metrics.length > 100) {
            metrics.shift();
        }
    }

    _createLogger() {
        return {
            debug: (message, data) => console.debug(`[ScoreSystem] ${message}`, data),
            error: (message, data) => console.error(`[ScoreSystem] ${message}`, data)
        };
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ScoreSystem,
        ScoreCalculator,
        HighScoreRepository,
        ScoreSystemError,
        ScorePersistenceError
    };
} else if (typeof window !== 'undefined') {
    window.ScoreSystem = ScoreSystem;
    window.ScoreCalculator = ScoreCalculator;
    window.HighScoreRepository = HighScoreRepository;
    window.ScoreSystemError = ScoreSystemError;
    window.ScorePersistenceError = ScorePersistenceError;
}