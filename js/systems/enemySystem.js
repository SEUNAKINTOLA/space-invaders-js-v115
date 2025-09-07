/**
 * Enemy System - Complete enemy management with wave spawning, formations, and collision detection
 * 
 * This system manages all enemy entities in the game, including:
 * - Wave-based enemy spawning with progressive difficulty
 * - Formation movement patterns and AI behaviors
 * - Collision detection with player projectiles
 * - Performance-optimized batch updates and spatial partitioning
 * - Enemy lifecycle management and cleanup
 * 
 * Architecture:
 * - Event-driven design for loose coupling
 * - Spatial partitioning for efficient collision detection
 * - Factory pattern for enemy creation
 * - Observer pattern for wave progression
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Enemy type definitions with behavioral characteristics
 */
const ENEMY_TYPES = {
    SCOUT: {
        id: 'scout',
        health: 1,
        speed: 2.0,
        points: 100,
        size: { width: 32, height: 24 },
        color: '#00ff00',
        fireRate: 0.02,
        movementPattern: 'zigzag'
    },
    FIGHTER: {
        id: 'fighter',
        health: 2,
        speed: 1.5,
        points: 200,
        size: { width: 40, height: 32 },
        color: '#ffff00',
        fireRate: 0.03,
        movementPattern: 'formation'
    },
    TANK: {
        id: 'tank',
        health: 4,
        speed: 0.8,
        points: 400,
        size: { width: 48, height: 40 },
        color: '#ff0000',
        fireRate: 0.01,
        movementPattern: 'steady'
    },
    BOSS: {
        id: 'boss',
        health: 20,
        speed: 0.5,
        points: 2000,
        size: { width: 96, height: 80 },
        color: '#ff00ff',
        fireRate: 0.05,
        movementPattern: 'boss'
    }
};

/**
 * Wave configuration templates for progressive difficulty
 */
const WAVE_TEMPLATES = [
    // Wave 1-3: Basic scouts
    { enemies: [{ type: 'SCOUT', count: 8, formation: 'line' }], spawnDelay: 1000 },
    { enemies: [{ type: 'SCOUT', count: 12, formation: 'grid' }], spawnDelay: 800 },
    { enemies: [{ type: 'SCOUT', count: 16, formation: 'v' }], spawnDelay: 600 },
    
    // Wave 4-6: Mixed formations
    { 
        enemies: [
            { type: 'SCOUT', count: 8, formation: 'line' },
            { type: 'FIGHTER', count: 4, formation: 'line' }
        ], 
        spawnDelay: 500 
    },
    { 
        enemies: [
            { type: 'FIGHTER', count: 10, formation: 'grid' },
            { type: 'TANK', count: 2, formation: 'center' }
        ], 
        spawnDelay: 400 
    },
    
    // Wave 7+: Advanced patterns
    { 
        enemies: [
            { type: 'SCOUT', count: 12, formation: 'circle' },
            { type: 'FIGHTER', count: 8, formation: 'diamond' },
            { type: 'TANK', count: 4, formation: 'corners' }
        ], 
        spawnDelay: 300 
    }
];

/**
 * Formation patterns for enemy positioning
 */
const FORMATIONS = {
    line: (count, startX, startY, spacing) => {
        const positions = [];
        const totalWidth = (count - 1) * spacing;
        const offsetX = startX - totalWidth / 2;
        
        for (let i = 0; i < count; i++) {
            positions.push({
                x: offsetX + i * spacing,
                y: startY,
                delay: i * 100
            });
        }
        return positions;
    },
    
    grid: (count, startX, startY, spacing) => {
        const positions = [];
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            positions.push({
                x: startX + (col - cols / 2) * spacing,
                y: startY + row * spacing,
                delay: (row * cols + col) * 50
            });
        }
        return positions;
    },
    
    v: (count, startX, startY, spacing) => {
        const positions = [];
        const half = Math.floor(count / 2);
        
        for (let i = 0; i < count; i++) {
            const side = i < half ? -1 : 1;
            const index = i < half ? i : i - half;
            positions.push({
                x: startX + side * index * spacing,
                y: startY + index * spacing * 0.5,
                delay: i * 80
            });
        }
        return positions;
    },
    
    circle: (count, centerX, centerY, radius) => {
        const positions = [];
        const angleStep = (Math.PI * 2) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                delay: i * 60
            });
        }
        return positions;
    },
    
    diamond: (count, centerX, centerY, size) => {
        const positions = [];
        const perSide = Math.floor(count / 4);
        
        for (let i = 0; i < count; i++) {
            const side = Math.floor(i / perSide);
            const index = i % perSide;
            const progress = index / (perSide - 1 || 1);
            
            let x, y;
            switch (side) {
                case 0: // Top
                    x = centerX + (progress - 0.5) * size;
                    y = centerY - size / 2;
                    break;
                case 1: // Right
                    x = centerX + size / 2;
                    y = centerY + (progress - 0.5) * size;
                    break;
                case 2: // Bottom
                    x = centerX + (0.5 - progress) * size;
                    y = centerY + size / 2;
                    break;
                default: // Left
                    x = centerX - size / 2;
                    y = centerY + (0.5 - progress) * size;
            }
            
            positions.push({ x, y, delay: i * 70 });
        }
        return positions;
    }
};

/**
 * Movement pattern implementations
 */
const MOVEMENT_PATTERNS = {
    zigzag: (enemy, deltaTime, gameTime) => {
        const amplitude = 50;
        const frequency = 0.003;
        enemy.x += Math.sin(gameTime * frequency + enemy.id * 0.5) * amplitude * deltaTime * 0.01;
        enemy.y += enemy.speed * deltaTime * 0.1;
    },
    
    formation: (enemy, deltaTime, gameTime) => {
        // Maintain formation while moving down
        const targetX = enemy.formationX + Math.sin(gameTime * 0.001) * 20;
        enemy.x += (targetX - enemy.x) * 0.02;
        enemy.y += enemy.speed * deltaTime * 0.05;
    },
    
    steady: (enemy, deltaTime) => {
        enemy.y += enemy.speed * deltaTime * 0.08;
    },
    
    boss: (enemy, deltaTime, gameTime) => {
        const amplitude = 100;
        const frequency = 0.001;
        enemy.x += Math.sin(gameTime * frequency) * amplitude * deltaTime * 0.01;
        enemy.y += enemy.speed * deltaTime * 0.03;
    }
};

/**
 * Enemy System - Manages all enemy entities and behaviors
 */
class EnemySystem {
    /**
     * Initialize the enemy system
     * @param {Object} config - Configuration object
     * @param {HTMLCanvasElement} config.canvas - Game canvas
     * @param {Object} config.eventBus - Event system for communication
     * @param {Object} config.spatialGrid - Spatial partitioning system
     */
    constructor(config = {}) {
        this.validateConfig(config);
        
        // Core dependencies
        this.canvas = config.canvas;
        this.eventBus = config.eventBus || this.createMockEventBus();
        this.spatialGrid = config.spatialGrid || this.createSpatialGrid();
        
        // Enemy management
        this.enemies = new Map();
        this.enemyPool = new Map();
        this.nextEnemyId = 1;
        
        // Wave system
        this.currentWave = 0;
        this.waveInProgress = false;
        this.waveStartTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesRemaining = 0;
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateCount = 0;
        this.averageUpdateTime = 0;
        
        // Configuration
        this.config = {
            maxEnemies: config.maxEnemies || 100,
            spawnBoundary: config.spawnBoundary || { top: -50, sides: 50 },
            cleanupBoundary: config.cleanupBoundary || 50,
            difficultyMultiplier: config.difficultyMultiplier || 1.1,
            ...config
        };
        
        // Initialize object pools
        this.initializeObjectPools();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleProjectileHit = this.handleProjectileHit.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('EnemySystem initialized', {
            maxEnemies: this.config.maxEnemies,
            canvasSize: { width: this.canvas.width, height: this.canvas.height }
        });
    }
    
    /**
     * Validate configuration parameters
     * @param {Object} config - Configuration to validate
     * @throws {Error} If configuration is invalid
     */
    validateConfig(config) {
        if (!config.canvas || !(config.canvas instanceof HTMLCanvasElement)) {
            throw new Error('EnemySystem requires a valid canvas element');
        }
        
        if (config.maxEnemies && (typeof config.maxEnemies !== 'number' || config.maxEnemies < 1)) {
            throw new Error('maxEnemies must be a positive number');
        }
    }
    
    /**
     * Create a mock event bus for testing
     * @returns {Object} Mock event bus
     */
    createMockEventBus() {
        const listeners = new Map();
        return {
            on: (event, callback) => {
                if (!listeners.has(event)) listeners.set(event, []);
                listeners.get(event).push(callback);
            },
            emit: (event, data) => {
                if (listeners.has(event)) {
                    listeners.get(event).forEach(callback => callback(data));
                }
            },
            off: (event, callback) => {
                if (listeners.has(event)) {
                    const callbacks = listeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) callbacks.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Create a basic spatial grid for collision detection
     * @returns {Object} Spatial grid system
     */
    createSpatialGrid() {
        const cellSize = 64;
        const grid = new Map();
        
        return {
            clear: () => grid.clear(),
            insert: (entity) => {
                const cellX = Math.floor(entity.x / cellSize);
                const cellY = Math.floor(entity.y / cellSize);
                const key = `${cellX},${cellY}`;
                
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key).push(entity);
            },
            query: (x, y, width, height) => {
                const entities = [];
                const startX = Math.floor(x / cellSize);
                const endX = Math.floor((x + width) / cellSize);
                const startY = Math.floor(y / cellSize);
                const endY = Math.floor((y + height) / cellSize);
                
                for (let cx = startX; cx <= endX; cx++) {
                    for (let cy = startY; cy <= endY; cy++) {
                        const key = `${cx},${cy}`;
                        if (grid.has(key)) {
                            entities.push(...grid.get(key));
                        }
                    }
                }
                return entities;
            }
        };
    }
    
    /**
     * Initialize object pools for performance
     */
    initializeObjectPools() {
        Object.keys(ENEMY_TYPES).forEach(type => {
            this.enemyPool.set(type, []);
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.eventBus.on('projectile:hit', this.handleProjectileHit);
        this.eventBus.on('game:start', () => this.startWave(1));
        this.eventBus.on('game:reset', () => this.reset());
        this.eventBus.on('wave:complete', () => this.onWaveComplete());
    }
    
    /**
     * Start a new wave
     * @param {number} waveNumber - Wave number to start
     */
    startWave(waveNumber) {
        try {
            if (this.waveInProgress) {
                console.warn('Cannot start wave: wave already in progress');
                return;
            }
            
            this.currentWave = waveNumber;
            this.waveInProgress = true;
            this.waveStartTime = Date.now();
            this.enemiesSpawned = 0;
            this.enemiesRemaining = 0;
            
            const waveTemplate = this.getWaveTemplate(waveNumber);
            this.spawnWave(waveTemplate);
            
            this.eventBus.emit('wave:started', {
                wave: waveNumber,
                template: waveTemplate
            });
            
            console.log(`Wave ${waveNumber} started`, waveTemplate);
            
        } catch (error) {
            console.error('Error starting wave:', error);
            this.eventBus.emit('system:error', { system: 'enemy', error: error.message });
        }
    }
    
    /**
     * Get wave template with difficulty scaling
     * @param {number} waveNumber - Wave number
     * @returns {Object} Wave configuration
     */
    getWaveTemplate(waveNumber) {
        const baseTemplate = WAVE_TEMPLATES[Math.min(waveNumber - 1, WAVE_TEMPLATES.length - 1)] || 
                           WAVE_TEMPLATES[WAVE_TEMPLATES.length - 1];
        
        // Apply difficulty scaling
        const difficultyScale = Math.pow(this.config.difficultyMultiplier, waveNumber - 1);
        
        return {
            ...baseTemplate,
            enemies: baseTemplate.enemies.map(enemyGroup => ({
                ...enemyGroup,
                count: Math.floor(enemyGroup.count * Math.min(difficultyScale, 2.0))
            })),
            spawnDelay: Math.max(baseTemplate.spawnDelay * 0.9, 100)
        };
    }
    
    /**
     * Spawn enemies for a wave
     * @param {Object} waveTemplate - Wave configuration
     */
    spawnWave(waveTemplate) {
        const centerX = this.canvas.width / 2;
        const startY = this.config.spawnBoundary.top;
        
        let totalDelay = 0;
        
        waveTemplate.enemies.forEach((enemyGroup, groupIndex) => {
            const formation = FORMATIONS[enemyGroup.formation] || FORMATIONS.line;
            const positions = formation(
                enemyGroup.count,
                centerX,
                startY - groupIndex * 80,
                60
            );
            
            positions.forEach((position, index) => {
                setTimeout(() => {
                    if (this.waveInProgress) {
                        this.spawnEnemy(enemyGroup.type, position.x, position.y);
                    }
                }, totalDelay + position.delay);
            });
            
            totalDelay += waveTemplate.spawnDelay;
        });
        
        // Calculate total enemies for this wave
        this.enemiesRemaining = waveTemplate.enemies.reduce((total, group) => total + group.count, 0);
    }
    
    /**
     * Spawn a single enemy
     * @param {string} type - Enemy type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} Created enemy
     */
    spawnEnemy(type, x, y) {
        try {
            if (this.enemies.size >= this.config.maxEnemies) {
                console.warn('Cannot spawn enemy: max enemies reached');
                return null;
            }
            
            const enemyType = ENEMY_TYPES[type];
            if (!enemyType) {
                throw new Error(`Unknown enemy type: ${type}`);
            }
            
            // Try to reuse from pool
            let enemy = this.getFromPool(type);
            if (!enemy) {
                enemy = this.createEnemy(enemyType);
            }
            
            // Initialize enemy state
            this.initializeEnemy(enemy, enemyType, x, y);
            
            // Add to active enemies
            this.enemies.set(enemy.id, enemy);
            this.enemiesSpawned++;
            
            // Add to spatial grid
            this.spatialGrid.insert(enemy);
            
            this.eventBus.emit('enemy:spawned', { enemy, wave: this.currentWave });
            
            return enemy;
            
        } catch (error) {
            console.error('Error spawning enemy:', error);
            return null;
        }
    }
    
    /**
     * Create a new enemy object
     * @param {Object} enemyType - Enemy type configuration
     * @returns {Object} New enemy
     */
    createEnemy(enemyType) {
        return {
            id: this.nextEnemyId++,
            type: enemyType.id,
            x: 0,
            y: 0,
            width: enemyType.size.width,
            height: enemyType.size.height,
            health: enemyType.health,
            maxHealth: enemyType.health,
            speed: enemyType.speed,
            points: enemyType.points,
            color: enemyType.color,
            fireRate: enemyType.fireRate,
            movementPattern: enemyType.movementPattern,
            lastFireTime: 0,
            formationX: 0,
            formationY: 0,
            active: true,
            created: Date.now()
        };
    }
    
    /**
     * Initialize enemy state
     * @param {Object} enemy - Enemy to initialize
     * @param {Object} enemyType - Enemy type configuration
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    initializeEnemy(enemy, enemyType, x, y) {
        enemy.x = x;
        enemy.y = y;
        enemy.formationX = x;
        enemy.formationY = y;
        enemy.health = enemyType.health;
        enemy.active = true;
        enemy.lastFireTime = 0;
        enemy.created = Date.now();
    }
    
    /**
     * Get enemy from object pool
     * @param {string} type - Enemy type
     * @returns {Object|null} Pooled enemy or null
     */
    getFromPool(type) {
        const pool = this.enemyPool.get(type);
        return pool && pool.length > 0 ? pool.pop() : null;
    }
    
    /**
     * Return enemy to object pool
     * @param {Object} enemy - Enemy to pool
     */
    returnToPool(enemy) {
        const pool = this.enemyPool.get(enemy.type);
        if (pool && pool.length < 20) { // Limit pool size
            enemy.active = false;
            pool.push(enemy);
        }
    }
    
    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last update
     * @param {number} gameTime - Total game time
     */
    update(deltaTime, gameTime) {
        const updateStart = performance.now();
        
        try {
            // Clear spatial grid
            this.spatialGrid.clear();
            
            // Update each enemy
            const enemiesToRemove = [];
            
            for (const [id, enemy] of this.enemies) {
                if (!enemy.active) {
                    enemiesToRemove.push(id);
                    continue;
                }
                
                // Update movement
                this.updateEnemyMovement(enemy, deltaTime, gameTime);
                
                // Update AI behavior
                this.updateEnemyAI(enemy, deltaTime, gameTime);
                
                // Check boundaries
                if (this.isEnemyOutOfBounds(enemy)) {
                    enemiesToRemove.push(id);
                    continue;
                }
                
                // Add to spatial grid
                this.spatialGrid.insert(enemy);
            }
            
            // Remove inactive enemies
            enemiesToRemove.forEach(id => {
                const enemy = this.enemies.get(id);
                if (enemy) {
                    this.removeEnemy(id);
                }
            });
            
            // Check wave completion
            this.checkWaveCompletion();
            
            // Update performance metrics
            this.updatePerformanceMetrics(performance.now() - updateStart);
            
        } catch (error) {
            console.error('Error updating enemies:', error);
            this.eventBus.emit('system:error', { system: 'enemy', error: error.message });
        }
    }
    
    /**
     * Update enemy movement based on pattern
     * @param {Object} enemy - Enemy to update
     * @param {number} deltaTime - Time delta
     * @param {number} gameTime - Game time
     */
    updateEnemyMovement(enemy, deltaTime, gameTime) {
        const pattern = MOVEMENT_PATTERNS[enemy.movementPattern];
        if (pattern) {
            pattern(enemy, deltaTime, gameTime);
        }
        
        // Clamp to canvas bounds (with some margin)
        const margin = 20;
        enemy.x = Math.max(margin, Math.min(this.canvas.width - enemy.width - margin, enemy.x));
    }
    
    /**
     * Update enemy AI behavior
     * @param {Object} enemy - Enemy to update
     * @param {number} deltaTime - Time delta
     * @param {number} gameTime - Game time
     */
    updateEnemyAI(enemy, deltaTime, gameTime) {
        // Simple firing logic
        if (gameTime - enemy.lastFireTime > (1000 / enemy.fireRate)) {
            if (Math.random() < enemy.fireRate) {
                this.enemyFire(enemy);
                enemy.lastFireTime = gameTime;
            }
        }
    }
    
    /**
     * Handle enemy firing
     * @param {Object} enemy - Enemy that fires
     */
    enemyFire(enemy) {
        this.eventBus.emit('enemy:fire', {
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            enemyId: enemy.id
        });
    }
    
    /**
     * Check if enemy is out of bounds
     * @param {Object} enemy - Enemy to check
     * @returns {boolean} True if out of bounds
     */
    isEnemyOutOfBounds(enemy) {
        return enemy.y > this.canvas.height + this.config.cleanupBoundary ||
               enemy.x < -this.config.cleanupBoundary ||
               enemy.x > this.canvas.width + this.config.cleanupBoundary;
    }
    
    /**
     * Handle projectile hit on enemy
     * @param {Object} data - Hit data
     */
    handleProjectileHit(data) {
        const { enemyId, damage = 1, projectile } = data;
        const enemy = this.enemies.get(enemyId);
        
        if (!enemy || !enemy.active) return;
        
        // Apply damage
        enemy.health -= damage;
        
        this.eventBus.emit('enemy:damaged', {
            enemy,
            damage,
            projectile,
            remaining: enemy.health
        });
        
        // Check if enemy is destroyed
        if (enemy.health <= 0) {
            this.destroyEnemy(enemyId);
        }
    }
    
    /**
     * Destroy an enemy
     * @param {number} enemyId - Enemy ID to destroy
     */
    destroyEnemy(enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (!enemy) return;
        
        // Emit destruction event
        this.eventBus.emit('enemy:destroyed', {
            enemy,
            points: enemy.points,
            position: { x: enemy.x, y: enemy.y }
        });
        
        // Remove from active enemies
        this.removeEnemy(enemyId);
        
        // Decrease remaining count
        this.enemiesRemaining--;
    }
    
    /**
     * Remove enemy from system
     * @param {number} enemyId - Enemy ID to remove
     */
    removeEnemy(enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (enemy) {
            this.returnToPool(enemy);
            this.enemies.delete(enemyId);
        }
    }
    
    /**
     * Check if wave is complete
     */
    checkWaveCompletion() {
        if (this.waveInProgress && this.enemies.size === 0 && this.enemiesRemaining <= 0) {
            this.completeWave();
        }
    }
    
    /**
     * Complete current wave
     */
    completeWave() {
        this.waveInProgress = false;
        const waveTime = Date.now() - this.waveStartTime;
        
        this.eventBus.emit('wave:completed', {
            wave: this.currentWave,
            time: waveTime,
            enemiesSpawned: this.enemiesSpawned
        });
        
        console.log(`Wave ${this.currentWave} completed in ${waveTime}ms`);
        
        // Auto-start next wave after delay
        setTimeout(() => {
            this.startWave(this.currentWave + 1);
        }, 2000);
    }
    
    /**
     * Handle wave completion event
     */
    onWaveComplete() {
        // Additional wave completion logic can go here
    }
    
    /**
     * Get enemies in area for collision detection
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @returns {Array} Enemies in area
     */
    getEnemiesInArea(x, y, width, height) {
        return this.spatialGrid.query(x, y, width, height)
            .filter(enemy => enemy.active && this.isColliding(
                { x, y, width, height },
                { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
            ));
    }
    
    /**
     * Check collision between two rectangles
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @returns {boolean} True if colliding
     */
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    /**
     * Update performance metrics
     * @param {number} updateTime - Time taken for update
     */
    updatePerformanceMetrics(updateTime) {
        this.updateCount++;
        this.averageUpdateTime = (this.averageUpdateTime * (this.updateCount - 1) + updateTime) / this.updateCount;
        
        // Log performance warnings
        if (updateTime > 16.67) { // More than one frame at 60fps
            console.warn(`EnemySystem update took ${updateTime.toFixed(2)}ms (target: 16.67ms)`);
        }
    }
    
    /**
     * Reset the enemy system
     */
    reset() {
        // Clear all enemies
        this.enemies.clear();
        this.spatialGrid.clear();
        
        // Reset wave state
        this.currentWave = 0;
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesRemaining = 0;
        
        // Reset performance metrics
        this.updateCount = 0;
        this.averageUpdateTime = 0;
        
        console.log('EnemySystem reset');
    }
    
    /**
     * Get system status
     * @returns {Object} System status
     */
    getStatus() {
        return {
            activeEnemies: this.enemies.size,
            currentWave: this.currentWave,
            waveInProgress: this.waveInProgress,
            enemiesSpawned: this.enemiesSpawned,
            enemiesRemaining: this.enemiesRemaining,
            averageUpdateTime: this.averageUpdateTime,
            poolSizes: Object.fromEntries(
                Array.from(this.enemyPool.entries()).map(([type, pool]) => [type, pool.length])
            )
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        this.eventBus.off('projectile:hit', this.handleProjectileHit);
        
        // Clear all data
        this.enemies.clear();
        this.enemyPool.clear();
        this.spatialGrid.clear();
        
        console.log('EnemySystem destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemySystem, ENEMY_TYPES, WAVE_TEMPLATES, FORMATIONS, MOVEMENT_PATTERNS };
} else if (typeof window !== 'undefined') {
    window.EnemySystem = EnemySystem;
    window.ENEMY_TYPES = ENEMY_TYPES;
    window.WAVE_TEMPLATES = WAVE_TEMPLATES;
    window.FORMATIONS = FORMATIONS;
    window.MOVEMENT_PATTERNS = MOVEMENT_PATTERNS;
}