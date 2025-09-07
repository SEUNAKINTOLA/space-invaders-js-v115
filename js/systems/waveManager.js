/**
 * Wave Management System for Space Invaders
 * 
 * This module implements a comprehensive enemy wave system that manages:
 * - Multiple enemy types with different behaviors
 * - Formation movement patterns and spawn timing
 * - Progressive difficulty scaling across waves
 * - Wave completion detection and transitions
 * - Performance-optimized enemy spawning
 * 
 * Architecture:
 * - Event-driven design for loose coupling
 * - Strategy pattern for wave configurations
 * - Observer pattern for wave state changes
 * - Factory pattern for enemy creation
 * 
 * Dependencies: None (self-contained implementation)
 * Performance: Optimized for 60fps with efficient spawning algorithms
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Enemy type definitions with behavioral characteristics
 * @typedef {Object} EnemyType
 * @property {string} id - Unique identifier for the enemy type
 * @property {number} health - Hit points for the enemy
 * @property {number} speed - Movement speed multiplier
 * @property {number} points - Score points awarded for destruction
 * @property {string} sprite - Sprite identifier for rendering
 * @property {Object} behavior - AI behavior configuration
 */

/**
 * Wave configuration structure
 * @typedef {Object} WaveConfig
 * @property {number} waveNumber - Sequential wave identifier
 * @property {Array<EnemySpawn>} enemies - Enemy spawn definitions
 * @property {Object} formation - Formation movement pattern
 * @property {number} spawnDelay - Delay between enemy spawns (ms)
 * @property {number} difficultyMultiplier - Scaling factor for this wave
 * @property {Object} rewards - Bonus rewards for wave completion
 */

/**
 * Enemy spawn specification
 * @typedef {Object} EnemySpawn
 * @property {string} type - Enemy type identifier
 * @property {number} count - Number of enemies to spawn
 * @property {Object} position - Spawn position configuration
 * @property {number} delay - Individual spawn delay offset
 */

/**
 * Formation pattern definition
 * @typedef {Object} FormationPattern
 * @property {string} type - Pattern type (grid, v-formation, circle, etc.)
 * @property {Object} parameters - Pattern-specific parameters
 * @property {Function} getPosition - Position calculation function
 * @property {Function} getMovement - Movement calculation function
 */

/**
 * Wave Manager - Core system for managing enemy waves
 * 
 * Responsibilities:
 * - Wave progression and difficulty scaling
 * - Enemy spawning with formation patterns
 * - Wave completion detection
 * - Performance optimization for large enemy counts
 * - Event emission for game state synchronization
 */
class WaveManager {
    /**
     * Initialize the Wave Manager with configuration
     * @param {Object} config - Wave manager configuration
     * @param {Object} config.gameArea - Game area dimensions
     * @param {Function} config.onEnemySpawn - Enemy spawn callback
     * @param {Function} config.onWaveComplete - Wave completion callback
     * @param {Function} config.onWaveStart - Wave start callback
     * @param {Object} config.difficultySettings - Difficulty scaling parameters
     */
    constructor(config = {}) {
        // Validate required configuration
        this._validateConfig(config);
        
        // Core configuration
        this.gameArea = config.gameArea || { width: 800, height: 600 };
        this.onEnemySpawn = config.onEnemySpawn || (() => {});
        this.onWaveComplete = config.onWaveComplete || (() => {});
        this.onWaveStart = config.onWaveStart || (() => {});
        
        // Wave state management
        this.currentWave = 0;
        this.isWaveActive = false;
        this.activeEnemies = new Set();
        this.spawnQueue = [];
        this.waveStartTime = 0;
        
        // Performance tracking
        this.spawnedThisFrame = 0;
        this.maxSpawnsPerFrame = 3;
        this.lastSpawnTime = 0;
        
        // Difficulty scaling
        this.difficultySettings = {
            healthMultiplier: 1.1,
            speedMultiplier: 1.05,
            spawnRateMultiplier: 0.95,
            enemyCountMultiplier: 1.2,
            ...config.difficultySettings
        };
        
        // Event listeners for cleanup
        this.eventListeners = new Map();
        
        // Initialize enemy types and formation patterns
        this._initializeEnemyTypes();
        this._initializeFormationPatterns();
        this._initializeWaveTemplates();
        
        // Performance monitoring
        this.performanceMetrics = {
            averageSpawnTime: 0,
            totalEnemiesSpawned: 0,
            waveCompletionTimes: []
        };
        
        console.log('WaveManager initialized', {
            gameArea: this.gameArea,
            difficultySettings: this.difficultySettings,
            timestamp: Date.now()
        });
    }
    
    /**
     * Validate configuration parameters
     * @private
     * @param {Object} config - Configuration to validate
     * @throws {Error} If configuration is invalid
     */
    _validateConfig(config) {
        if (config.gameArea) {
            if (typeof config.gameArea.width !== 'number' || config.gameArea.width <= 0) {
                throw new Error('Invalid game area width');
            }
            if (typeof config.gameArea.height !== 'number' || config.gameArea.height <= 0) {
                throw new Error('Invalid game area height');
            }
        }
        
        if (config.onEnemySpawn && typeof config.onEnemySpawn !== 'function') {
            throw new Error('onEnemySpawn must be a function');
        }
        
        if (config.onWaveComplete && typeof config.onWaveComplete !== 'function') {
            throw new Error('onWaveComplete must be a function');
        }
        
        if (config.onWaveStart && typeof config.onWaveStart !== 'function') {
            throw new Error('onWaveStart must be a function');
        }
    }
    
    /**
     * Initialize enemy type definitions
     * @private
     */
    _initializeEnemyTypes() {
        this.enemyTypes = {
            scout: {
                id: 'scout',
                health: 1,
                speed: 1.2,
                points: 10,
                sprite: 'enemy-scout',
                behavior: {
                    movementPattern: 'zigzag',
                    shootingRate: 0.3,
                    aggressiveness: 0.4
                }
            },
            fighter: {
                id: 'fighter',
                health: 2,
                speed: 1.0,
                points: 20,
                sprite: 'enemy-fighter',
                behavior: {
                    movementPattern: 'straight',
                    shootingRate: 0.5,
                    aggressiveness: 0.6
                }
            },
            tank: {
                id: 'tank',
                health: 4,
                speed: 0.7,
                points: 50,
                sprite: 'enemy-tank',
                behavior: {
                    movementPattern: 'steady',
                    shootingRate: 0.8,
                    aggressiveness: 0.8
                }
            },
            boss: {
                id: 'boss',
                health: 20,
                speed: 0.5,
                points: 200,
                sprite: 'enemy-boss',
                behavior: {
                    movementPattern: 'complex',
                    shootingRate: 1.2,
                    aggressiveness: 1.0
                }
            }
        };
    }
    
    /**
     * Initialize formation movement patterns
     * @private
     */
    _initializeFormationPatterns() {
        this.formationPatterns = {
            grid: {
                type: 'grid',
                getPosition: (index, total, params) => {
                    const cols = params.columns || Math.ceil(Math.sqrt(total));
                    const rows = Math.ceil(total / cols);
                    const col = index % cols;
                    const row = Math.floor(index / cols);
                    
                    return {
                        x: params.startX + (col * params.spacing),
                        y: params.startY + (row * params.spacing)
                    };
                },
                getMovement: (time, params) => ({
                    x: Math.sin(time * 0.001) * params.amplitude,
                    y: params.speed * time * 0.001
                })
            },
            
            vFormation: {
                type: 'v-formation',
                getPosition: (index, total, params) => {
                    const center = Math.floor(total / 2);
                    const offset = index - center;
                    
                    return {
                        x: params.centerX + (offset * params.spacing),
                        y: params.startY + Math.abs(offset) * params.vSpacing
                    };
                },
                getMovement: (time, params) => ({
                    x: 0,
                    y: params.speed * time * 0.001
                })
            },
            
            circle: {
                type: 'circle',
                getPosition: (index, total, params) => {
                    const angle = (index / total) * Math.PI * 2;
                    
                    return {
                        x: params.centerX + Math.cos(angle) * params.radius,
                        y: params.centerY + Math.sin(angle) * params.radius
                    };
                },
                getMovement: (time, params) => {
                    const rotationSpeed = params.rotationSpeed || 0.001;
                    return {
                        rotation: time * rotationSpeed,
                        y: params.speed * time * 0.001
                    };
                }
            },
            
            wave: {
                type: 'wave',
                getPosition: (index, total, params) => ({
                    x: params.startX + (index * params.spacing),
                    y: params.startY
                }),
                getMovement: (time, params) => ({
                    x: 0,
                    y: params.speed * time * 0.001 + 
                       Math.sin(time * 0.002 + params.phase) * params.amplitude
                })
            }
        };
    }
    
    /**
     * Initialize wave template configurations
     * @private
     */
    _initializeWaveTemplates() {
        this.waveTemplates = [
            // Wave 1: Introduction
            {
                enemies: [
                    { type: 'scout', count: 8, formation: 'grid', delay: 500 }
                ],
                formation: {
                    type: 'grid',
                    parameters: {
                        columns: 4,
                        spacing: 80,
                        startX: 200,
                        startY: 50,
                        amplitude: 20,
                        speed: 30
                    }
                },
                spawnDelay: 800,
                difficultyMultiplier: 1.0
            },
            
            // Wave 2: Mixed formation
            {
                enemies: [
                    { type: 'scout', count: 6, formation: 'vFormation', delay: 300 },
                    { type: 'fighter', count: 4, formation: 'grid', delay: 1000 }
                ],
                formation: {
                    type: 'vFormation',
                    parameters: {
                        centerX: 400,
                        startY: 30,
                        spacing: 60,
                        vSpacing: 20,
                        speed: 35
                    }
                },
                spawnDelay: 600,
                difficultyMultiplier: 1.2
            },
            
            // Wave 3: Circular assault
            {
                enemies: [
                    { type: 'fighter', count: 10, formation: 'circle', delay: 200 },
                    { type: 'tank', count: 2, formation: 'grid', delay: 2000 }
                ],
                formation: {
                    type: 'circle',
                    parameters: {
                        centerX: 400,
                        centerY: 100,
                        radius: 120,
                        rotationSpeed: 0.0005,
                        speed: 25
                    }
                },
                spawnDelay: 400,
                difficultyMultiplier: 1.5
            },
            
            // Wave 4: Wave pattern
            {
                enemies: [
                    { type: 'scout', count: 12, formation: 'wave', delay: 150 },
                    { type: 'fighter', count: 6, formation: 'wave', delay: 800 }
                ],
                formation: {
                    type: 'wave',
                    parameters: {
                        startX: 50,
                        startY: 40,
                        spacing: 45,
                        speed: 40,
                        amplitude: 30,
                        phase: 0
                    }
                },
                spawnDelay: 300,
                difficultyMultiplier: 1.8
            },
            
            // Wave 5: Boss wave
            {
                enemies: [
                    { type: 'scout', count: 8, formation: 'grid', delay: 100 },
                    { type: 'tank', count: 4, formation: 'vFormation', delay: 1500 },
                    { type: 'boss', count: 1, formation: 'grid', delay: 3000 }
                ],
                formation: {
                    type: 'grid',
                    parameters: {
                        columns: 4,
                        spacing: 70,
                        startX: 150,
                        startY: 30,
                        amplitude: 40,
                        speed: 20
                    }
                },
                spawnDelay: 200,
                difficultyMultiplier: 2.0
            }
        ];
    }
    
    /**
     * Start a new wave
     * @param {number} waveNumber - Wave number to start (optional, defaults to next wave)
     * @returns {Promise<boolean>} Success status
     */
    async startWave(waveNumber = null) {
        try {
            // Determine wave number
            const targetWave = waveNumber !== null ? waveNumber : this.currentWave + 1;
            
            if (this.isWaveActive) {
                console.warn('Cannot start wave: another wave is already active', {
                    currentWave: this.currentWave,
                    targetWave,
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Generate wave configuration
            const waveConfig = this._generateWaveConfig(targetWave);
            if (!waveConfig) {
                console.error('Failed to generate wave configuration', {
                    waveNumber: targetWave,
                    timestamp: Date.now()
                });
                return false;
            }
            
            // Update wave state
            this.currentWave = targetWave;
            this.isWaveActive = true;
            this.waveStartTime = Date.now();
            this.activeEnemies.clear();
            this.spawnQueue = [];
            
            // Prepare spawn queue
            this._prepareSpawnQueue(waveConfig);
            
            // Notify wave start
            this.onWaveStart({
                waveNumber: this.currentWave,
                enemyCount: waveConfig.totalEnemies,
                difficulty: waveConfig.difficultyMultiplier,
                timestamp: this.waveStartTime
            });
            
            console.log('Wave started', {
                waveNumber: this.currentWave,
                enemyCount: waveConfig.totalEnemies,
                spawnQueueSize: this.spawnQueue.length,
                timestamp: this.waveStartTime
            });
            
            return true;
            
        } catch (error) {
            console.error('Error starting wave', {
                error: error.message,
                stack: error.stack,
                waveNumber: targetWave,
                timestamp: Date.now()
            });
            
            // Reset state on error
            this.isWaveActive = false;
            return false;
        }
    }
    
    /**
     * Generate wave configuration based on wave number
     * @private
     * @param {number} waveNumber - Target wave number
     * @returns {Object|null} Wave configuration or null if generation fails
     */
    _generateWaveConfig(waveNumber) {
        try {
            // Use template for early waves, generate procedurally for later waves
            let baseTemplate;
            
            if (waveNumber <= this.waveTemplates.length) {
                baseTemplate = this.waveTemplates[waveNumber - 1];
            } else {
                // Generate procedural wave
                baseTemplate = this._generateProceduralWave(waveNumber);
            }
            
            // Apply difficulty scaling
            const scaledConfig = this._applyDifficultyScaling(baseTemplate, waveNumber);
            
            // Calculate total enemy count
            scaledConfig.totalEnemies = scaledConfig.enemies.reduce(
                (total, spawn) => total + spawn.count, 0
            );
            
            return scaledConfig;
            
        } catch (error) {
            console.error('Error generating wave config', {
                error: error.message,
                waveNumber,
                timestamp: Date.now()
            });
            return null;
        }
    }
    
    /**
     * Generate procedural wave for high wave numbers
     * @private
     * @param {number} waveNumber - Wave number
     * @returns {Object} Procedural wave configuration
     */
    _generateProceduralWave(waveNumber) {
        const complexity = Math.min(waveNumber / 10, 3); // Cap complexity
        const enemyCount = Math.floor(8 + (waveNumber * 1.5));
        
        // Select enemy types based on wave number
        const availableTypes = ['scout', 'fighter'];
        if (waveNumber >= 3) availableTypes.push('tank');
        if (waveNumber >= 5 && waveNumber % 5 === 0) availableTypes.push('boss');
        
        // Generate enemy spawns
        const enemies = [];
        let remainingEnemies = enemyCount;
        
        while (remainingEnemies > 0 && enemies.length < 5) {
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const count = Math.min(
                remainingEnemies,
                Math.floor(Math.random() * 8) + 2
            );
            
            enemies.push({
                type,
                count,
                formation: this._selectRandomFormation(),
                delay: Math.floor(Math.random() * 1000) + 200
            });
            
            remainingEnemies -= count;
        }
        
        // Select formation pattern
        const formationTypes = Object.keys(this.formationPatterns);
        const selectedFormation = formationTypes[
            Math.floor(Math.random() * formationTypes.length)
        ];
        
        return {
            enemies,
            formation: {
                type: selectedFormation,
                parameters: this._generateFormationParameters(selectedFormation)
            },
            spawnDelay: Math.max(100, 800 - (waveNumber * 20)),
            difficultyMultiplier: 1.0 + (waveNumber * 0.15)
        };
    }
    
    /**
     * Select random formation type
     * @private
     * @returns {string} Formation type
     */
    _selectRandomFormation() {
        const formations = ['grid', 'vFormation', 'circle', 'wave'];
        return formations[Math.floor(Math.random() * formations.length)];
    }
    
    /**
     * Generate formation parameters for given type
     * @private
     * @param {string} formationType - Formation type
     * @returns {Object} Formation parameters
     */
    _generateFormationParameters(formationType) {
        const baseParams = {
            speed: 20 + Math.random() * 30,
            startX: 50 + Math.random() * 200,
            startY: 30 + Math.random() * 50
        };
        
        switch (formationType) {
            case 'grid':
                return {
                    ...baseParams,
                    columns: 3 + Math.floor(Math.random() * 4),
                    spacing: 60 + Math.random() * 40,
                    amplitude: 15 + Math.random() * 25
                };
                
            case 'vFormation':
                return {
                    ...baseParams,
                    centerX: this.gameArea.width / 2,
                    spacing: 50 + Math.random() * 30,
                    vSpacing: 15 + Math.random() * 15
                };
                
            case 'circle':
                return {
                    ...baseParams,
                    centerX: this.gameArea.width / 2,
                    centerY: 80 + Math.random() * 40,
                    radius: 80 + Math.random() * 60,
                    rotationSpeed: 0.0003 + Math.random() * 0.0007
                };
                
            case 'wave':
                return {
                    ...baseParams,
                    spacing: 40 + Math.random() * 20,
                    amplitude: 20 + Math.random() * 30,
                    phase: Math.random() * Math.PI * 2
                };
                
            default:
                return baseParams;
        }
    }
    
    /**
     * Apply difficulty scaling to wave configuration
     * @private
     * @param {Object} baseConfig - Base wave configuration
     * @param {number} waveNumber - Current wave number
     * @returns {Object} Scaled wave configuration
     */
    _applyDifficultyScaling(baseConfig, waveNumber) {
        const scalingFactor = Math.pow(1.1, waveNumber - 1);
        
        return {
            ...baseConfig,
            enemies: baseConfig.enemies.map(spawn => ({
                ...spawn,
                count: Math.floor(spawn.count * 
                    Math.pow(this.difficultySettings.enemyCountMultiplier, waveNumber - 1))
            })),
            spawnDelay: Math.max(50, Math.floor(
                baseConfig.spawnDelay * 
                Math.pow(this.difficultySettings.spawnRateMultiplier, waveNumber - 1)
            )),
            difficultyMultiplier: baseConfig.difficultyMultiplier * scalingFactor
        };
    }
    
    /**
     * Prepare spawn queue from wave configuration
     * @private
     * @param {Object} waveConfig - Wave configuration
     */
    _prepareSpawnQueue(waveConfig) {
        this.spawnQueue = [];
        let currentTime = 0;
        
        for (const enemySpawn of waveConfig.enemies) {
            const enemyType = this.enemyTypes[enemySpawn.type];
            if (!enemyType) {
                console.warn('Unknown enemy type', { type: enemySpawn.type });
                continue;
            }
            
            // Apply difficulty scaling to enemy stats
            const scaledEnemy = this._scaleEnemyStats(enemyType, waveConfig.difficultyMultiplier);
            
            // Generate spawn positions using formation pattern
            const formation = this.formationPatterns[enemySpawn.formation] || 
                             this.formationPatterns.grid;
            
            for (let i = 0; i < enemySpawn.count; i++) {
                const position = formation.getPosition(
                    i, 
                    enemySpawn.count, 
                    waveConfig.formation.parameters
                );
                
                this.spawnQueue.push({
                    enemyType: scaledEnemy,
                    position,
                    spawnTime: currentTime + enemySpawn.delay + (i * waveConfig.spawnDelay),
                    formation: waveConfig.formation,
                    index: i,
                    total: enemySpawn.count
                });
            }
            
            currentTime += enemySpawn.delay;
        }
        
        // Sort spawn queue by spawn time
        this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
    }
    
    /**
     * Scale enemy stats based on difficulty
     * @private
     * @param {Object} baseEnemy - Base enemy configuration
     * @param {number} difficultyMultiplier - Difficulty scaling factor
     * @returns {Object} Scaled enemy configuration
     */
    _scaleEnemyStats(baseEnemy, difficultyMultiplier) {
        return {
            ...baseEnemy,
            health: Math.ceil(baseEnemy.health * 
                Math.pow(this.difficultySettings.healthMultiplier, this.currentWave - 1)),
            speed: baseEnemy.speed * 
                Math.pow(this.difficultySettings.speedMultiplier, this.currentWave - 1),
            points: Math.floor(baseEnemy.points * difficultyMultiplier)
        };
    }
    
    /**
     * Update wave manager (call every frame)
     * @param {number} deltaTime - Time since last update (ms)
     * @param {number} currentTime - Current game time (ms)
     */
    update(deltaTime, currentTime = Date.now()) {
        if (!this.isWaveActive) {
            return;
        }
        
        try {
            // Reset frame spawn counter
            this.spawnedThisFrame = 0;
            
            // Process spawn queue
            this._processSpawnQueue(currentTime);
            
            // Check wave completion
            this._checkWaveCompletion();
            
            // Update performance metrics
            this._updatePerformanceMetrics(deltaTime);
            
        } catch (error) {
            console.error('Error updating wave manager', {
                error: error.message,
                stack: error.stack,
                currentWave: this.currentWave,
                timestamp: currentTime
            });
        }
    }
    
    /**
     * Process spawn queue and spawn enemies
     * @private
     * @param {number} currentTime - Current game time
     */
    _processSpawnQueue(currentTime) {
        const waveElapsed = currentTime - this.waveStartTime;
        
        while (this.spawnQueue.length > 0 && 
               this.spawnedThisFrame < this.maxSpawnsPerFrame) {
            
            const nextSpawn = this.spawnQueue[0];
            
            if (waveElapsed >= nextSpawn.spawnTime) {
                // Remove from queue
                this.spawnQueue.shift();
                
                // Spawn enemy
                this._spawnEnemy(nextSpawn, currentTime);
                this.spawnedThisFrame++;
                
            } else {
                // No more enemies ready to spawn this frame
                break;
            }
        }
    }
    
    /**
     * Spawn individual enemy
     * @private
     * @param {Object} spawnData - Enemy spawn data
     * @param {number} currentTime - Current game time
     */
    _spawnEnemy(spawnData, currentTime) {
        try {
            const startTime = performance.now();
            
            // Calculate movement pattern
            const formation = this.formationPatterns[spawnData.formation.type];
            const movement = formation ? formation.getMovement(0, spawnData.formation.parameters) : {};
            
            // Create enemy data
            const enemyData = {
                id: `enemy_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
                type: spawnData.enemyType.id,
                health: spawnData.enemyType.health,
                maxHealth: spawnData.enemyType.health,
                speed: spawnData.enemyType.speed,
                points: spawnData.enemyType.points,
                sprite: spawnData.enemyType.sprite,
                behavior: spawnData.enemyType.behavior,
                position: { ...spawnData.position },
                movement: movement,
                formation: spawnData.formation,
                formationIndex: spawnData.index,
                formationTotal: spawnData.total,
                spawnTime: currentTime,
                waveNumber: this.currentWave
            };
            
            // Add to active enemies
            this.activeEnemies.add(enemyData.id);
            
            // Notify spawn
            this.onEnemySpawn(enemyData);
            
            // Update performance metrics
            const spawnTime = performance.now() - startTime;
            this._updateSpawnMetrics(spawnTime);
            
            console.log('Enemy spawned', {
                id: enemyData.id,
                type: enemyData.type,
                position: enemyData.position,
                wave: this.currentWave,
                spawnTime: spawnTime.toFixed(2) + 'ms'
            });
            
        } catch (error) {
            console.error('Error spawning enemy', {
                error: error.message,
                spawnData,
                timestamp: currentTime
            });
        }
    }
    
    /**
     * Update spawn performance metrics
     * @private
     * @param {number} spawnTime - Time taken to spawn enemy (ms)
     */
    _updateSpawnMetrics(spawnTime) {
        this.performanceMetrics.totalEnemiesSpawned++;
        
        // Update average spawn time (exponential moving average)
        const alpha = 0.1;
        this.performanceMetrics.averageSpawnTime = 
            (alpha * spawnTime) + 
            ((1 - alpha) * this.performanceMetrics.averageSpawnTime);
    }
    
    /**
     * Check if current wave is complete
     * @private
     */
    _checkWaveCompletion() {
        if (this.spawnQueue.length === 0 && this.activeEnemies.size === 0) {
            this._completeWave();
        }
    }
    
    /**
     * Complete current wave
     * @private
     */
    _completeWave() {
        if (!this.isWaveActive) {
            return;
        }
        
        const completionTime = Date.now() - this.waveStartTime;
        this.performanceMetrics.waveCompletionTimes.push(completionTime);
        
        // Update state
        this.isWaveActive = false;
        
        // Calculate wave statistics
        const waveStats = {
            waveNumber: this.currentWave,
            completionTime,
            enemiesSpawned: this.performanceMetrics.totalEnemiesSpawned,
            averageSpawnTime: this.performanceMetrics.averageSpawnTime,
            timestamp: Date.now()
        };
        
        // Notify completion
        this.onWaveComplete(waveStats);
        
        console.log('Wave completed', waveStats);
    }
    
    /**
     * Update performance metrics
     * @private
     * @param {number} deltaTime - Frame delta time
     */
    _updatePerformanceMetrics(deltaTime) {
        // Track performance issues
        if (deltaTime > 33) { // > 30fps
            console.warn('Performance warning: slow frame detected', {
                deltaTime: deltaTime.toFixed(2) + 'ms',
                activeEnemies: this.activeEnemies.size,
                spawnQueueSize: this.spawnQueue.length,
                currentWave: this.currentWave
            });
        }
    }
    
    /**
     * Register enemy destruction
     * @param {string} enemyId - ID of destroyed enemy
     * @param {Object} destructionData - Additional destruction data
     */
    onEnemyDestroyed(enemyId, destructionData = {}) {
        if (this.activeEnemies.has(enemyId)) {
            this.activeEnemies.delete(enemyId);
            
            console.log('Enemy destroyed', {
                enemyId,
                remainingEnemies: this.activeEnemies.size,
                spawnQueueSize: this.spawnQueue.length,
                ...destructionData
            });
            
            // Check for wave completion
            this._checkWaveCompletion();
        }
    }
    
    /**
     * Get current wave status
     * @returns {Object} Wave status information
     */
    getWaveStatus() {
        return {
            currentWave: this.currentWave,
            isActive: this.isWaveActive,
            activeEnemies: this.activeEnemies.size,
            spawnQueueSize: this.spawnQueue.length,
            waveElapsed: this.isWaveActive ? Date.now() - this.waveStartTime : 0,
            performanceMetrics: { ...this.performanceMetrics }
        };
    }
    
    /**
     * Skip current wave (for testing/debugging)
     * @returns {boolean} Success status
     */
    skipWave() {
        if (!this.isWaveActive) {
            return false;
        }
        
        // Clear spawn queue and active enemies
        this.spawnQueue = [];
        this.activeEnemies.clear();
        
        // Complete wave
        this._completeWave();
        
        console.log('Wave skipped', { waveNumber: this.currentWave });
        return true;
    }
    
    /**
     * Reset wave manager to initial state
     */
    reset() {
        this.currentWave = 0;
        this.isWaveActive = false;
        this.activeEnemies.clear();
        this.spawnQueue = [];
        this.waveStartTime = 0;
        this.spawnedThisFrame = 0;
        this.lastSpawnTime = 0;
        
        // Reset performance metrics
        this.performanceMetrics = {
            averageSpawnTime: 0,
            totalEnemiesSpawned: 0,
            waveCompletionTimes: []
        };
        
        console.log('WaveManager reset', { timestamp: Date.now() });
    }
    
    /**
     * Get enemy type configuration
     * @param {string} typeId - Enemy type identifier
     * @returns {Object|null} Enemy type configuration
     */
    getEnemyType(typeId) {
        return this.enemyTypes[typeId] || null;
    }
    
    /**
     * Get formation pattern configuration
     * @param {string} patternId - Formation pattern identifier
     * @returns {Object|null} Formation pattern configuration
     */
    getFormationPattern(patternId) {
        return this.formationPatterns[patternId] || null;
    }
    
    /**
     * Add custom enemy type
     * @param {string} typeId - Unique type identifier
     * @param {Object} typeConfig - Enemy type configuration
     * @returns {boolean} Success status
     */
    addEnemyType(typeId, typeConfig) {
        try {
            // Validate configuration
            if (!typeId || typeof typeId !== 'string') {
                throw new Error('Invalid enemy type ID');
            }
            
            if (!typeConfig || typeof typeConfig !== 'object') {
                throw new Error('Invalid enemy type configuration');
            }
            
            // Required fields
            const requiredFields = ['health', 'speed', 'points', 'sprite'];
            for (const field of requiredFields) {
                if (!(field in typeConfig)) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Add type
            this.enemyTypes[typeId] = {
                id: typeId,
                ...typeConfig
            };
            
            console.log('Enemy type added', { typeId, typeConfig });
            return true;
            
        } catch (error) {
            console.error('Error adding enemy type', {
                error: error.message,
                typeId,
                typeConfig
            });
            return false;
        }
    }
    
    /**
     * Add custom formation pattern
     * @param {string} patternId - Unique pattern identifier
     * @param {Object} patternConfig - Formation pattern configuration
     * @returns {boolean} Success status
     */
    addFormationPattern(patternId, patternConfig) {
        try {
            // Validate configuration
            if (!patternId || typeof patternId !== 'string') {
                throw new Error('Invalid formation pattern ID');
            }
            
            if (!patternConfig || typeof patternConfig !== 'object') {
                throw new Error('Invalid formation pattern configuration');
            }
            
            // Required functions
            if (typeof patternConfig.getPosition !== 'function') {
                throw new Error('getPosition function is required');
            }
            
            if (typeof patternConfig.getMovement !== 'function') {
                throw new Error('getMovement function is required');
            }
            
            // Add pattern
            this.formationPatterns[patternId] = {
                type: patternId,
                ...patternConfig
            };
            
            console.log('Formation pattern added', { patternId });
            return true;
            
        } catch (error) {
            console.error('Error adding formation pattern', {
                error: error.message,
                patternId,
                patternConfig
            });
            return false;
        }
    }
    
    /**
     * Cleanup resources and event listeners
     */
    destroy() {
        // Clear all state
        this.reset();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Clear references
        this.onEnemySpawn = null;
        this.onWaveComplete = null;
        this.onWaveStart = null;
        
        console.log('WaveManager destroyed', { timestamp: Date.now() });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WaveManager };
} else if (typeof window !== 'undefined') {
    window.WaveManager = WaveManager;
}