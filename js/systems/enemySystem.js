/**
 * Enemy System - Manages enemy lifecycle, destruction, and score events
 * Handles enemy spawning, movement, collision detection, and score emission
 */

class EnemySystem {
    constructor(eventBus, gameConfig) {
        this.eventBus = eventBus;
        this.gameConfig = gameConfig;
        this.enemies = new Map();
        this.enemyTypes = this.initializeEnemyTypes();
        this.waveManager = {
            currentWave: 1,
            enemiesInWave: 0,
            enemiesDestroyed: 0,
            waveBonus: 1000
        };
        this.accuracyTracker = {
            shotsHit: 0,
            totalShots: 0
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize enemy types with their respective point values and characteristics
     */
    initializeEnemyTypes() {
        return {
            SCOUT: {
                points: 100,
                health: 1,
                speed: 2,
                sprite: 'enemy-scout',
                bonusMultiplier: 1.0
            },
            FIGHTER: {
                points: 200,
                health: 2,
                speed: 1.5,
                sprite: 'enemy-fighter',
                bonusMultiplier: 1.2
            },
            HEAVY: {
                points: 500,
                health: 3,
                speed: 1,
                sprite: 'enemy-heavy',
                bonusMultiplier: 1.5
            },
            BOSS: {
                points: 2000,
                health: 10,
                speed: 0.5,
                sprite: 'enemy-boss',
                bonusMultiplier: 2.0
            }
        };
    }

    /**
     * Setup event listeners for game events
     */
    setupEventListeners() {
        this.eventBus.on('game:start', () => this.resetSystem());
        this.eventBus.on('game:pause', () => this.pauseEnemies());
        this.eventBus.on('game:resume', () => this.resumeEnemies());
        this.eventBus.on('collision:enemy-bullet', (data) => this.handleEnemyHit(data));
        this.eventBus.on('player:shoot', () => this.trackShot());
        this.eventBus.on('wave:start', (waveData) => this.startWave(waveData));
    }

    /**
     * Reset the enemy system for a new game
     */
    resetSystem() {
        this.enemies.clear();
        this.waveManager.currentWave = 1;
        this.waveManager.enemiesInWave = 0;
        this.waveManager.enemiesDestroyed = 0;
        this.accuracyTracker.shotsHit = 0;
        this.accuracyTracker.totalShots = 0;
    }

    /**
     * Spawn a new enemy
     */
    spawnEnemy(type, x, y, id = null) {
        const enemyId = id || this.generateEnemyId();
        const enemyType = this.enemyTypes[type];
        
        if (!enemyType) {
            console.warn(`Unknown enemy type: ${type}`);
            return null;
        }

        const enemy = {
            id: enemyId,
            type: type,
            x: x,
            y: y,
            health: enemyType.health,
            maxHealth: enemyType.health,
            speed: enemyType.speed,
            sprite: enemyType.sprite,
            active: true,
            createdAt: Date.now()
        };

        this.enemies.set(enemyId, enemy);
        this.waveManager.enemiesInWave++;

        this.eventBus.emit('enemy:spawned', {
            enemy: enemy,
            totalEnemies: this.enemies.size
        });

        return enemy;
    }

    /**
     * Handle enemy being hit by bullet
     */
    handleEnemyHit(collisionData) {
        const { enemyId, bulletId, damage = 1 } = collisionData;
        const enemy = this.enemies.get(enemyId);

        if (!enemy || !enemy.active) {
            return;
        }

        // Track accuracy
        this.accuracyTracker.shotsHit++;

        // Apply damage
        enemy.health -= damage;

        this.eventBus.emit('enemy:damaged', {
            enemy: enemy,
            damage: damage,
            remainingHealth: enemy.health
        });

        // Check if enemy is destroyed
        if (enemy.health <= 0) {
            this.destroyEnemy(enemyId);
        }
    }

    /**
     * Destroy an enemy and emit score events
     */
    destroyEnemy(enemyId) {
        const enemy = this.enemies.get(enemyId);
        
        if (!enemy || !enemy.active) {
            return;
        }

        const enemyType = this.enemyTypes[enemy.type];
        const basePoints = enemyType.points;
        
        // Calculate bonus points
        const bonusPoints = this.calculateBonusPoints(enemy, enemyType);
        const totalPoints = basePoints + bonusPoints;

        // Mark enemy as inactive
        enemy.active = false;
        this.waveManager.enemiesDestroyed++;

        // Emit score event
        this.eventBus.emit('score:enemy-destroyed', {
            enemyId: enemyId,
            enemyType: enemy.type,
            basePoints: basePoints,
            bonusPoints: bonusPoints,
            totalPoints: totalPoints,
            position: { x: enemy.x, y: enemy.y },
            waveNumber: this.waveManager.currentWave
        });

        // Emit enemy destroyed event
        this.eventBus.emit('enemy:destroyed', {
            enemy: enemy,
            points: totalPoints,
            remainingEnemies: this.getActiveEnemyCount()
        });

        // Check for wave completion
        this.checkWaveCompletion();

        // Remove enemy after a short delay for visual effects
        setTimeout(() => {
            this.enemies.delete(enemyId);
        }, 500);
    }

    /**
     * Calculate bonus points for enemy destruction
     */
    calculateBonusPoints(enemy, enemyType) {
        let bonusPoints = 0;
        const survivalTime = Date.now() - enemy.createdAt;
        
        // Quick destruction bonus (destroyed within 3 seconds)
        if (survivalTime < 3000) {
            bonusPoints += Math.floor(enemyType.points * 0.2);
        }

        // Accuracy bonus
        const accuracy = this.getAccuracy();
        if (accuracy > 0.8) {
            bonusPoints += Math.floor(enemyType.points * 0.3);
        } else if (accuracy > 0.6) {
            bonusPoints += Math.floor(enemyType.points * 0.1);
        }

        // Wave progression bonus
        const waveBonus = Math.floor(enemyType.points * (this.waveManager.currentWave - 1) * 0.1);
        bonusPoints += waveBonus;

        // Apply enemy type bonus multiplier
        bonusPoints = Math.floor(bonusPoints * enemyType.bonusMultiplier);

        return bonusPoints;
    }

    /**
     * Check if current wave is completed and emit wave completion event
     */
    checkWaveCompletion() {
        const activeEnemies = this.getActiveEnemyCount();
        
        if (activeEnemies === 0 && this.waveManager.enemiesInWave > 0) {
            const accuracy = this.getAccuracy();
            const waveBonus = this.calculateWaveCompletionBonus(accuracy);
            
            this.eventBus.emit('score:wave-completed', {
                waveNumber: this.waveManager.currentWave,
                enemiesDestroyed: this.waveManager.enemiesDestroyed,
                accuracy: accuracy,
                bonusPoints: waveBonus,
                totalEnemies: this.waveManager.enemiesInWave
            });

            this.eventBus.emit('wave:completed', {
                waveNumber: this.waveManager.currentWave,
                bonusPoints: waveBonus,
                accuracy: accuracy
            });
        }
    }

    /**
     * Calculate wave completion bonus based on performance
     */
    calculateWaveCompletionBonus(accuracy) {
        let bonus = this.waveManager.waveBonus;
        
        // Accuracy multiplier
        if (accuracy >= 0.9) {
            bonus *= 2.0; // Perfect accuracy
        } else if (accuracy >= 0.7) {
            bonus *= 1.5; // Good accuracy
        } else if (accuracy >= 0.5) {
            bonus *= 1.2; // Average accuracy
        }

        // Wave number multiplier
        bonus *= this.waveManager.currentWave;

        return Math.floor(bonus);
    }

    /**
     * Start a new wave
     */
    startWave(waveData) {
        this.waveManager.currentWave = waveData.waveNumber;
        this.waveManager.enemiesInWave = 0;
        this.waveManager.enemiesDestroyed = 0;
        
        // Reset accuracy tracking for new wave
        this.accuracyTracker.shotsHit = 0;
        this.accuracyTracker.totalShots = 0;
    }

    /**
     * Track a shot fired by the player
     */
    trackShot() {
        this.accuracyTracker.totalShots++;
    }

    /**
     * Get current accuracy percentage
     */
    getAccuracy() {
        if (this.accuracyTracker.totalShots === 0) {
            return 1.0; // Perfect accuracy if no shots fired yet
        }
        return this.accuracyTracker.shotsHit / this.accuracyTracker.totalShots;
    }

    /**
     * Get count of active enemies
     */
    getActiveEnemyCount() {
        let count = 0;
        for (const enemy of this.enemies.values()) {
            if (enemy.active) {
                count++;
            }
        }
        return count;
    }

    /**
     * Update enemy system (called each frame)
     */
    update(deltaTime) {
        for (const enemy of this.enemies.values()) {
            if (enemy.active) {
                this.updateEnemyMovement(enemy, deltaTime);
                this.checkEnemyBoundaries(enemy);
            }
        }
    }

    /**
     * Update enemy movement
     */
    updateEnemyMovement(enemy, deltaTime) {
        // Basic downward movement - can be extended for more complex patterns
        enemy.y += enemy.speed * deltaTime;
        
        this.eventBus.emit('enemy:moved', {
            enemyId: enemy.id,
            position: { x: enemy.x, y: enemy.y }
        });
    }

    /**
     * Check if enemy has moved out of boundaries
     */
    checkEnemyBoundaries(enemy) {
        const gameHeight = this.gameConfig?.height || 600;
        
        if (enemy.y > gameHeight) {
            this.eventBus.emit('enemy:escaped', {
                enemy: enemy,
                pointsPenalty: Math.floor(this.enemyTypes[enemy.type].points * 0.1)
            });
            
            enemy.active = false;
            setTimeout(() => {
                this.enemies.delete(enemy.id);
            }, 100);
        }
    }

    /**
     * Pause all enemy movement
     */
    pauseEnemies() {
        this.eventBus.emit('enemies:paused', {
            activeEnemies: this.getActiveEnemyCount()
        });
    }

    /**
     * Resume all enemy movement
     */
    resumeEnemies() {
        this.eventBus.emit('enemies:resumed', {
            activeEnemies: this.getActiveEnemyCount()
        });
    }

    /**
     * Generate unique enemy ID
     */
    generateEnemyId() {
        return `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all active enemies
     */
    getActiveEnemies() {
        const activeEnemies = [];
        for (const enemy of this.enemies.values()) {
            if (enemy.active) {
                activeEnemies.push(enemy);
            }
        }
        return activeEnemies;
    }

    /**
     * Get enemy by ID
     */
    getEnemy(enemyId) {
        return this.enemies.get(enemyId);
    }

    /**
     * Get current wave statistics
     */
    getWaveStats() {
        return {
            currentWave: this.waveManager.currentWave,
            enemiesInWave: this.waveManager.enemiesInWave,
            enemiesDestroyed: this.waveManager.enemiesDestroyed,
            enemiesRemaining: this.waveManager.enemiesInWave - this.waveManager.enemiesDestroyed,
            accuracy: this.getAccuracy()
        };
    }

    /**
     * Cleanup system resources
     */
    destroy() {
        this.enemies.clear();
        this.eventBus.off('game:start');
        this.eventBus.off('game:pause');
        this.eventBus.off('game:resume');
        this.eventBus.off('collision:enemy-bullet');
        this.eventBus.off('player:shoot');
        this.eventBus.off('wave:start');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnemySystem;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.EnemySystem = EnemySystem;
}