/**
 * Game Configuration Module
 *
 * Central configuration system for Space Invaders game mechanics, enemy types,
 * wave progression, and balance parameters. Provides a comprehensive configuration
 * object that drives all game systems including enemy behavior, collision detection,
 * difficulty scaling, and performance optimization.
 *
 * Architecture:
 * - Immutable configuration objects for predictable behavior
 * - Hierarchical structure for easy maintenance and extension
 * - Performance-optimized defaults for smooth gameplay
 * - Extensible design for future enemy types and mechanics
 *
 * Usage:
 *   import { gameConfig } from './config/gameConfig.js';
 *   const enemySpeed = gameConfig.enemies.scout.speed;
 *   const waveData = gameConfig.waves.getWaveConfig(5);
 *
 * Dependencies: None (pure configuration)
 * Constraints: All values must be positive numbers for game mechanics
 */

/**
 * Enemy type definitions with complete stat configurations
 * Each enemy type includes movement, combat, and visual properties
 */
const ENEMY_TYPES = {
    scout: {
        id: 'scout',
        name: 'Scout',
        health: 1,
        speed: 2.5,
        points: 10,
        size: {
            width: 32,
            height: 24
        },
        collision: {
            radius: 12,
            bounds: {
                offsetX: 4,
                offsetY: 4,
                width: 24,
                height: 16
            }
        },
        movement: {
            pattern: 'formation',
            amplitude: 0,
            frequency: 0,
            verticalSpeed: 0.5
        },
        combat: {
            fireRate: 0.002,
            projectileSpeed: 3,
            accuracy: 0.7
        },
        spawning: {
            weight: 60,
            minWave: 1,
            maxPerWave: 20
        }
    },

    tank: {
        id: 'tank',
        name: 'Tank',
        health: 3,
        speed: 1.5,
        points: 25,
        size: {
            width: 40,
            height: 32
        },
        collision: {
            radius: 16,
            bounds: {
                offsetX: 4,
                offsetY: 4,
                width: 32,
                height: 24
            }
        },
        movement: {
            pattern: 'formation',
            amplitude: 0,
            frequency: 0,
            verticalSpeed: 0.3
        },
        combat: {
            fireRate: 0.001,
            projectileSpeed: 2.5,
            accuracy: 0.8
        },
        spawning: {
            weight: 25,
            minWave: 2,
            maxPerWave: 8
        }
    },

    interceptor: {
        id: 'interceptor',
        name: 'Interceptor',
        health: 1,
        speed: 4,
        points: 20,
        size: {
            width: 28,
            height: 20
        },
        collision: {
            radius: 10,
            bounds: {
                offsetX: 4,
                offsetY: 4,
                width: 20,
                height: 12
            }
        },
        movement: {
            pattern: 'weave',
            amplitude: 50,
            frequency: 0.02,
            verticalSpeed: 0.8
        },
        combat: {
            fireRate: 0.003,
            projectileSpeed: 4,
            accuracy: 0.6
        },
        spawning: {
            weight: 15,
            minWave: 3,
            maxPerWave: 6
        }
    },

    boss: {
        id: 'boss',
        name: 'Boss',
        health: 15,
        speed: 1,
        points: 100,
        size: {
            width: 80,
            height: 60
        },
        collision: {
            radius: 35,
            bounds: {
                offsetX: 8,
                offsetY: 8,
                width: 64,
                height: 44
            }
        },
        movement: {
            pattern: 'boss',
            amplitude: 100,
            frequency: 0.01,
            verticalSpeed: 0.2
        },
        combat: {
            fireRate: 0.005,
            projectileSpeed: 2,
            accuracy: 0.9,
            multiShot: true,
            shotCount: 3,
            shotSpread: 0.3
        },
        spawning: {
            weight: 0,
            minWave: 5,
            maxPerWave: 1,
            bossWave: true
        }
    }
};

/**
 * Formation patterns for enemy movement and positioning
 * Defines how enemies are arranged and move as groups
 */
const FORMATION_PATTERNS = {
    standard: {
        name: 'Standard Grid',
        rows: 5,
        columns: 8,
        spacing: {
            horizontal: 48,
            vertical: 40
        },
        startPosition: {
            x: 100,
            y: 50
        },
        movement: {
            horizontalSpeed: 1,
            dropDistance: 20,
            edgeBehavior: 'reverse'
        }
    },

    vformation: {
        name: 'V Formation',
        rows: 3,
        columns: 7,
        spacing: {
            horizontal: 50,
            vertical: 35
        },
        startPosition: {
            x: 150,
            y: 60
        },
        movement: {
            horizontalSpeed: 1.2,
            dropDistance: 15,
            edgeBehavior: 'reverse'
        },
        customPositions: true
    },

    diamond: {
        name: 'Diamond Formation',
        rows: 5,
        columns: 5,
        spacing: {
            horizontal: 45,
            vertical: 35
        },
        startPosition: {
            x: 200,
            y: 40
        },
        movement: {
            horizontalSpeed: 0.8,
            dropDistance: 25,
            edgeBehavior: 'reverse'
        },
        customPositions: true
    },

    scattered: {
        name: 'Scattered',
        rows: 4,
        columns: 6,
        spacing: {
            horizontal: 60,
            vertical: 50
        },
        startPosition: {
            x: 80,
            y: 30
        },
        movement: {
            horizontalSpeed: 1.5,
            dropDistance: 30,
            edgeBehavior: 'wrap'
        },
        randomOffset: {
            x: 20,
            y: 15
        }
    }
};

/**
 * Wave configuration templates and progression system
 * Defines enemy composition, difficulty scaling, and special events
 */
const WAVE_SYSTEM = {
    baseWave: {
        enemyCount: 20,
        composition: {
            scout: 0.7,
            tank: 0.2,
            interceptor: 0.1,
            boss: 0
        },
        formation: 'standard',
        spawnDelay: 100,
        difficultyMultiplier: 1.0
    },

    progressionRules: {
        healthScaling: {
            base: 1.0,
            increment: 0.1,
            maxMultiplier: 3.0
        },
        speedScaling: {
            base: 1.0,
            increment: 0.05,
            maxMultiplier: 2.0
        },
        fireRateScaling: {
            base: 1.0,
            increment: 0.08,
            maxMultiplier: 2.5
        },
        enemyCountScaling: {
            base: 20,
            increment: 2,
            maxCount: 40
        }
    },

    specialWaves: {
        5: {
            type: 'boss',
            composition: {
                scout: 0.3,
                tank: 0.3,
                interceptor: 0.3,
                boss: 0.1
            },
            formation: 'vformation',
            bonusMultiplier: 2.0
        },
        10: {
            type: 'swarm',
            composition: {
                scout: 0.8,
                interceptor: 0.2
            },
            formation: 'scattered',
            enemyCount: 35,
            bonusMultiplier: 1.5
        },
        15: {
            type: 'fortress',
            composition: {
                tank: 0.6,
                boss: 0.4
            },
            formation: 'diamond',
            enemyCount: 15,
            bonusMultiplier: 3.0
        }
    },

    /**
     * Generate wave configuration for a specific wave number
     * @param {number} waveNumber - The wave number to generate config for
     * @returns {Object} Complete wave configuration
     */
    getWaveConfig(waveNumber) {
        if (waveNumber <= 0) {
            throw new Error('Wave number must be positive');
        }

        // Check for special wave configurations
        if (this.specialWaves[waveNumber]) {
            return this.generateSpecialWave(waveNumber);
        }

        return this.generateStandardWave(waveNumber);
    },

    /**
     * Generate standard wave with progressive difficulty
     * @param {number} waveNumber - Wave number
     * @returns {Object} Standard wave configuration
     */
    generateStandardWave(waveNumber) {
        const rules = this.progressionRules;
        const base = this.baseWave;
        const healthIncrementFactor = 0.1;
        const speedIncrementFactor = 0.05;
        const fireRateIncrementFactor = 0.08;
        const enemyCountIncrementFactor = 2;
        const waveNumberOffset = 1;
        const waveGroupSize = 2;
        const interceptorBaseChance = 0.1;
        const interceptorWaveThreshold = 3;
        const interceptorIncrementFactor = 0.02;
        const scoutBaseChance = 0.7;
        const scoutDecrementFactor = 0.03;
        const tankBaseChance = 0.2;
        const tankWaveThreshold = 2;
        const tankIncrementFactor = 0.02;
        const formationGroupSize = 3;
        const spawnDelayDecrementFactor = 5;
        const difficultyIncrementFactor = 0.1;

        // Calculate scaling factors
        const healthMultiplier = Math.min(
            rules.healthScaling.base + (waveNumber - waveNumberOffset) * healthIncrementFactor,
            rules.healthScaling.maxMultiplier
        );

        const speedMultiplier = Math.min(
            rules.speedScaling.base + (waveNumber - waveNumberOffset) * speedIncrementFactor,
            rules.speedScaling.maxMultiplier
        );

        const fireRateMultiplier = Math.min(
            rules.fireRateScaling.base + (waveNumber - waveNumberOffset) * fireRateIncrementFactor,
            rules.fireRateScaling.maxMultiplier
        );

        const enemyCount = Math.min(
            rules.enemyCountScaling.base + Math.floor((waveNumber - waveNumberOffset) / waveGroupSize) * enemyCountIncrementFactor,
            rules.enemyCountScaling.maxCount
        );

        // Adjust composition based on wave number
        const composition = { ...base.composition };

        if (waveNumber >= interceptorWaveThreshold) {
            composition.interceptor = Math.min(0.2, interceptorBaseChance + (waveNumber - interceptorWaveThreshold) * interceptorIncrementFactor);
            composition.scout = Math.max(0.5, scoutBaseChance - (waveNumber - interceptorWaveThreshold) * scoutDecrementFactor);
        }

        if (waveNumber >= tankWaveThreshold) {
            composition.tank = Math.min(0.3, tankBaseChance + (waveNumber - tankWaveThreshold) * tankIncrementFactor);
        }

        // Select formation based on wave number
        const formations = Object.keys(FORMATION_PATTERNS);
        const formationIndex = Math.floor((waveNumber - waveNumberOffset) / formationGroupSize) % formations.length;
        const formation = formations[formationIndex];

        return {
            waveNumber,
            enemyCount,
            composition,
            formation,
            spawnDelay: Math.max(50, base.spawnDelay - (waveNumber - waveNumberOffset) * spawnDelayDecrementFactor),
            scaling: {
                health: healthMultiplier,
                speed: speedMultiplier,
                fireRate: fireRateMultiplier
            },
            difficultyMultiplier: base.difficultyMultiplier + (waveNumber - waveNumberOffset) * difficultyIncrementFactor,
            bonusMultiplier: 1.0
        };
    },

    /**
     * Generate special wave configuration
     * @param {number} waveNumber - Wave number
     * @returns {Object} Special wave configuration
     */
    generateSpecialWave(waveNumber) {
        const specialConfig = this.specialWaves[waveNumber];
        const baseConfig = this.generateStandardWave(waveNumber);

        return {
            ...baseConfig,
            ...specialConfig,
            type: specialConfig.type,
            isSpecialWave: true
        };
    }
};

/**
 * Collision detection configuration and optimization settings
 */
const COLLISION_CONFIG = {
    detection: {
        method: 'spatial', // 'basic', 'spatial', 'hybrid'
        spatialGrid: {
            cellSize: 64,
            maxObjectsPerCell: 10
        },
        broadPhase: {
            enabled: true,
            algorithm: 'sweep_and_prune'
        },
        narrowPhase: {
            algorithm: 'circle', // 'circle', 'aabb', 'obb'
            precision: 'medium' // 'low', 'medium', 'high'
        }
    },

    optimization: {
        enableSpatialPartitioning: true,
        maxCollisionChecksPerFrame: 500,
        collisionCacheSize: 100,
        skipStaticObjects: true,
        useQuadTree: true,
        quadTreeDepth: 4
    },

    bounds: {
        player: {
            type: 'circle',
            radius: 12,
            offset: { x: 0, y: 0 }
        },
        projectile: {
            type: 'circle',
            radius: 3,
            offset: { x: 0, y: 0 }
        },
        powerup: {
            type: 'circle',
            radius: 16,
            offset: { x: 0, y: 0 }
        }
    },

    layers: {
        player: 1,
        playerProjectiles: 2,
        enemies: 4,
        enemyProjectiles: 8,
        powerups: 16,
        boundaries: 32
    },

    interactions: {
        playerProjectiles: ['enemies'],
        enemyProjectiles: ['player'],
        enemies: ['player', 'playerProjectiles'],
        player: ['enemies', 'enemyProjectiles', 'powerups'],
        powerups: ['player']
    }
};

/**
 * Performance and optimization configuration
 */
const PERFORMANCE_CONFIG = {
    rendering: {
        maxFPS: 60,
        vsync: true,
        culling: {
            enabled: true,
            margin: 50
        },
        batching: {
            enabled: true,
            maxBatchSize: 100
        }
    },

    memory: {
        objectPooling: {
            enabled: true,
            pools: {
                enemies: 50,
                projectiles: 200,
                particles: 500,
                effects: 100
            }
        },
        garbageCollection: {
            forceGC: false,
            gcInterval: 10000
        }
    },

    audio: {
        maxConcurrentSounds: 32,
        audioPoolSize: 16,
        compressionEnabled: true,
        spatialAudio: false
    },

    quality: {
        autoScale: true,
        targetFPS: 60,
        qualityLevels: {
            low: {
                particleCount: 0.3,
                effectQuality: 0.5,
                audioQuality: 0.7
            },
            medium: {
                particleCount: 0.7,
                effectQuality: 0.8,
                audioQuality: 0.9
            },
            high: {
                particleCount: 1.0,
                effectQuality: 1.0,
                audioQuality: 1.0
            }
        }
    }
};

/**
 * Game balance and difficulty configuration
 */
const BALANCE_CONFIG = {
    player: {
        health: 3,
        speed: 5,
        fireRate: 0.15,
        projectileSpeed: 8,
        invulnerabilityTime: 2000,
        respawnDelay: 1000
    },

    scoring: {
        baseMultiplier: 1.0,
        comboMultiplier: 0.1,
        maxComboMultiplier: 5.0,
        comboTimeout: 3000,
        waveCompletionBonus: 500,
        perfectWaveMultiplier: 2.0
    },

    powerups: {
        spawnChance: 0.15,
        duration: 10000,
        types: {
            rapidFire: {
                fireRateMultiplier: 2.0,
                rarity: 0.4
            },
            multiShot: {
                shotCount: 3,
                rarity: 0.3
            },
            shield: {
                duration: 15000,
                rarity: 0.2
            },
            scoreMultiplier: {
                multiplier: 2.0,
                rarity: 0.1
            }
        }
    },

    difficulty: {
        adaptiveScaling: true,
        playerSkillTracking: true,
        difficultyAdjustmentRate: 0.05,
        minDifficulty: 0.5,
        maxDifficulty: 3.0
    }
};

/**
 * Main game configuration object
 * Combines all configuration modules into a single, immutable interface
 */
const gameConfig = Object.freeze({
    // Core game systems
    enemies: Object.freeze(ENEMY_TYPES),
    formations: Object.freeze(FORMATION_PATTERNS),
    waves: Object.freeze(WAVE_SYSTEM),
    collision: Object.freeze(COLLISION_CONFIG),
    performance: Object.freeze(PERFORMANCE_CONFIG),
    balance: Object.freeze(BALANCE_CONFIG),

    // Game constants
    constants: Object.freeze({
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
        GAME_BOUNDS: {
            left: 0,
            right: 800,
            top: 0,
            bottom: 600
        },
        PHYSICS_TIMESTEP: 16.67, // 60 FPS
        MAX_DELTA_TIME: 50
    }),

    // Validation utilities
    validation: {
        /**
         * Validate enemy type configuration
         * @param {Object} enemyConfig - Enemy configuration to validate
         * @returns {boolean} True if valid
         */
        validateEnemyConfig(enemyConfig) {
            const required = ['id', 'health', 'speed', 'points', 'size', 'collision'];
            return required.every(prop => enemyConfig.hasOwnProperty(prop)) &&
                   enemyConfig.health > 0 &&
                   enemyConfig.speed > 0 &&
                   enemyConfig.points >= 0;
        },

        /**
         * Validate wave configuration
         * @param {Object} waveConfig - Wave configuration to validate
         * @returns {boolean} True if valid
         */
        validateWaveConfig(waveConfig) {
            return waveConfig.waveNumber > 0 &&
                   waveConfig.enemyCount > 0 &&
                   waveConfig.composition &&
                   Object.values(waveConfig.composition).reduce((sum, val) => sum + val, 0) <= 1.1; // Allow small floating point errors
        }
    },

    // Configuration helpers
    helpers: {
        /**
         * Get enemy configuration by type
         * @param {string} enemyType - Enemy type identifier
         * @returns {Object} Enemy configuration
         */
        getEnemyConfig(enemyType) {
            const config = ENEMY_TYPES[enemyType];
            if (!config) {
                throw new Error(`Unknown enemy type: ${enemyType}`);
            }
            return { ...config }; // Return copy to prevent mutation
        },

        /**
         * Get formation pattern by name
         * @param {string} formationName - Formation pattern name
         * @returns {Object} Formation configuration
         */
        getFormationConfig(formationName) {
            const config = FORMATION_PATTERNS[formationName];
            if (!config) {
                throw new Error(`Unknown formation pattern: ${formationName}`);
            }
            return { ...config }; // Return copy to prevent mutation
        },

        /**
         * Calculate scaled enemy stats for a given wave
         * @param {string} enemyType - Enemy type
         * @param {number} waveNumber - Wave number
         * @returns {Object} Scaled enemy stats
         */
        getScaledEnemyStats(enemyType, waveNumber) {
            const baseConfig = this.getEnemyConfig(enemyType);
            const waveConfig = WAVE_SYSTEM.getWaveConfig(waveNumber);

            return {
                ...baseConfig,
                health: Math.ceil(baseConfig.health * waveConfig.scaling.health),
                speed: baseConfig.speed * waveConfig.scaling.speed,
                combat: {
                    ...baseConfig.combat,
                    fireRate: baseConfig.combat.fireRate * waveConfig.scaling.fireRate
                }
            };
        }
    }
});

// Export the complete configuration
export { gameConfig };
export default gameConfig;
