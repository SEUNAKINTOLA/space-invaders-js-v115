/**
 * ProjectileSystem - Advanced projectile management system with object pooling and spatial optimization
 * 
 * This system manages all projectiles in the game with high-performance object pooling,
 * batch processing, spatial partitioning for collision detection, and automatic cleanup.
 * 
 * Key Features:
 * - Object pooling for memory efficiency
 * - Spatial partitioning for optimized collision detection
 * - Batch updates for performance
 * - Automatic cleanup of off-screen projectiles
 * - Visual effects integration
 * - Performance monitoring and metrics
 * 
 * Architecture:
 * - Uses factory pattern for projectile creation
 * - Implements observer pattern for event notifications
 * - Follows single responsibility principle
 * - Provides clean separation of concerns
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Projectile entity representing a single projectile in the game
 */
class Projectile {
    /**
     * Creates a new projectile instance
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} velocityX - Horizontal velocity
     * @param {number} velocityY - Vertical velocity
     * @param {string} type - Projectile type ('player', 'enemy', 'special')
     * @param {Object} config - Projectile configuration
     */
    constructor(x = 0, y = 0, velocityX = 0, velocityY = 0, type = 'player', config = {}) {
        this.reset(x, y, velocityX, velocityY, type, config);
        this.id = this.generateId();
        this.createdAt = performance.now();
    }

    /**
     * Resets projectile state for object pooling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} velocityX - Horizontal velocity
     * @param {number} velocityY - Vertical velocity
     * @param {string} type - Projectile type
     * @param {Object} config - Configuration object
     */
    reset(x, y, velocityX, velocityY, type, config) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.type = type;
        this.active = true;
        this.age = 0;
        
        // Configuration with secure defaults
        this.width = Math.max(1, config.width || 4);
        this.height = Math.max(1, config.height || 8);
        this.damage = Math.max(0, config.damage || 1);
        this.maxAge = Math.max(100, config.maxAge || 5000);
        this.color = this.sanitizeColor(config.color || '#FFFF00');
        this.piercing = Boolean(config.piercing);
        this.explosive = Boolean(config.explosive);
        this.explosionRadius = Math.max(0, config.explosionRadius || 0);
        
        // Visual properties
        this.trail = [];
        this.maxTrailLength = Math.max(0, config.trailLength || 5);
        this.glowIntensity = Math.max(0, Math.min(1, config.glowIntensity || 0.5));
        
        // Physics properties
        this.gravity = config.gravity || 0;
        this.friction = Math.max(0, Math.min(1, config.friction || 1));
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
    }

    /**
     * Updates projectile state
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} boundaries - Game boundaries
     */
    update(deltaTime) {
        if (!this.active) return;

        try {
            // Update position
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            // Apply physics
            if (this.gravity !== 0) {
                this.velocityY += this.gravity * deltaTime;
            }

            if (this.friction !== 1) {
                this.velocityX *= Math.pow(this.friction, deltaTime);
                this.velocityY *= Math.pow(this.friction, deltaTime);
            }

            // Update rotation
            if (this.rotationSpeed !== 0) {
                this.rotation += this.rotationSpeed * deltaTime;
                this.rotation %= Math.PI * 2;
            }

            // Update trail
            this.updateTrail();

            // Update age
            this.age += deltaTime;

            // Check if projectile has expired
            if (this.age >= this.maxAge) {
                this.deactivate();
            }

        } catch (error) {
            console.error('Error updating projectile:', error);
            this.deactivate();
        }
    }

    /**
     * Updates projectile trail for visual effects
     */
    updateTrail() {
        if (this.maxTrailLength > 0) {
            this.trail.unshift({ x: this.x, y: this.y, age: 0 });
            
            // Update trail ages and remove old segments
            this.trail = this.trail
                .map(segment => ({ ...segment, age: segment.age + 1 }))
                .slice(0, this.maxTrailLength);
        }
    }

    /**
     * Gets projectile bounding box for collision detection
     * @returns {Object} Bounding box with x, y, width, height
     */
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Checks if projectile is outside given boundaries
     * @param {Object} boundaries - Game boundaries
     * @returns {boolean} True if outside boundaries
     */
    isOutOfBounds(boundaries) {
        const margin = Math.max(this.width, this.height);
        return (
            this.x < boundaries.left - margin ||
            this.x > boundaries.right + margin ||
            this.y < boundaries.top - margin ||
            this.y > boundaries.bottom + margin
        );
    }

    /**
     * Deactivates the projectile
     */
    deactivate() {
        this.active = false;
    }

    /**
     * Generates unique ID for projectile
     * @returns {string} Unique identifier
     */
    generateId() {
        return `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitizes color input to prevent injection
     * @param {string} color - Color string
     * @returns {string} Sanitized color
     */
    sanitizeColor(color) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return colorRegex.test(color) ? color : '#FFFFFF';
    }

    /**
     * Serializes projectile state for debugging
     * @returns {Object} Serialized state
     */
    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            type: this.type,
            active: this.active,
            age: this.age,
            damage: this.damage
        };
    }
}

/**
 * Object pool for efficient projectile management
 */
class ProjectilePool {
    /**
     * Creates a new projectile pool
     * @param {number} initialSize - Initial pool size
     * @param {number} maxSize - Maximum pool size
     */
    constructor(initialSize = 100, maxSize = 500) {
        this.pool = [];
        this.maxSize = Math.max(initialSize, maxSize);
        this.initialSize = Math.max(1, initialSize);
        this.created = 0;
        this.reused = 0;
        
        // Pre-populate pool
        this.initialize();
    }

    /**
     * Initializes the pool with projectile instances
     */
    initialize() {
        for (let i = 0; i < this.initialSize; i++) {
            this.pool.push(new Projectile());
        }
    }

    /**
     * Gets a projectile from the pool
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} velocityX - Horizontal velocity
     * @param {number} velocityY - Vertical velocity
     * @param {string} type - Projectile type
     * @param {Object} config - Configuration
     * @returns {Projectile} Projectile instance
     */
    acquire(x, y, velocityX, velocityY, type, config) {
        let projectile;

        if (this.pool.length > 0) {
            projectile = this.pool.pop();
            projectile.reset(x, y, velocityX, velocityY, type, config);
            this.reused++;
        } else if (this.created < this.maxSize) {
            projectile = new Projectile(x, y, velocityX, velocityY, type, config);
            this.created++;
        } else {
            // Pool exhausted, reuse oldest projectile
            console.warn('Projectile pool exhausted, reusing instance');
            projectile = new Projectile(x, y, velocityX, velocityY, type, config);
        }

        return projectile;
    }

    /**
     * Returns a projectile to the pool
     * @param {Projectile} projectile - Projectile to return
     */
    release(projectile) {
        if (projectile && this.pool.length < this.maxSize) {
            projectile.active = false;
            this.pool.push(projectile);
        }
    }

    /**
     * Gets pool statistics
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            available: this.pool.length,
            created: this.created,
            reused: this.reused,
            maxSize: this.maxSize,
            efficiency: this.created > 0 ? (this.reused / this.created) : 0
        };
    }

    /**
     * Clears the pool
     */
    clear() {
        this.pool.length = 0;
        this.created = 0;
        this.reused = 0;
    }
}

/**
 * Spatial grid for optimized collision detection
 */
class SpatialGrid {
    /**
     * Creates a new spatial grid
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @param {number} cellSize - Size of each cell
     */
    constructor(width, height, cellSize = 64) {
        this.width = width;
        this.height = height;
        this.cellSize = Math.max(1, cellSize);
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);
        this.grid = new Array(this.cols * this.rows);
        this.clear();
    }

    /**
     * Clears the grid
     */
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = [];
        }
    }

    /**
     * Gets grid cell index for coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Cell index
     */
    getCellIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        
        return row * this.cols + col;
    }

    /**
     * Inserts projectile into grid
     * @param {Projectile} projectile - Projectile to insert
     */
    insert(projectile) {
        const index = this.getCellIndex(projectile.x, projectile.y);
        if (index >= 0 && index < this.grid.length) {
            this.grid[index].push(projectile);
        }
    }

    /**
     * Gets nearby projectiles for collision detection
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Nearby projectiles
     */
    getNearby(x, y, radius = 0) {
        const nearby = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCol = Math.floor(x / this.cellSize);
        const centerRow = Math.floor(y / this.cellSize);

        for (let row = centerRow - cellRadius; row <= centerRow + cellRadius; row++) {
            for (let col = centerCol - cellRadius; col <= centerCol + cellRadius; col++) {
                if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                    const index = row * this.cols + col;
                    nearby.push(...this.grid[index]);
                }
            }
        }

        return nearby;
    }
}

/**
 * Main ProjectileSystem class for managing all projectiles
 */
class ProjectileSystem {
    /**
     * Creates a new projectile system
     * @param {Object} config - System configuration
     */
    constructor(config = {}) {
        // Validate and set configuration
        this.config = this.validateConfig(config);
        
        // Initialize core components
        this.projectiles = new Map();
        this.pool = new ProjectilePool(
            this.config.poolSize,
            this.config.maxPoolSize
        );
        
        // Spatial optimization
        this.spatialGrid = new SpatialGrid(
            this.config.worldWidth,
            this.config.worldHeight,
            this.config.gridCellSize
        );
        
        // Performance tracking
        this.metrics = {
            activeProjectiles: 0,
            projectilesCreated: 0,
            projectilesDestroyed: 0,
            collisionsDetected: 0,
            updateTime: 0,
            lastFrameTime: 0
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Boundaries
        this.boundaries = {
            left: 0,
            right: this.config.worldWidth,
            top: 0,
            bottom: this.config.worldHeight
        };
        
        // Performance monitoring
        this.performanceBuffer = [];
        this.maxPerformanceBufferSize = 60; // 1 second at 60fps
        
        console.log('ProjectileSystem initialized with config:', this.config);
    }

    /**
     * Validates system configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validated configuration
     */
    validateConfig(config) {
        const defaults = {
            poolSize: 100,
            maxPoolSize: 500,
            worldWidth: 800,
            worldHeight: 600,
            gridCellSize: 64,
            maxProjectiles: 1000,
            cleanupInterval: 1000,
            enableSpatialOptimization: true,
            enablePerformanceTracking: true,
            enableTrails: true,
            enableCollisionEffects: true
        };

        const validated = { ...defaults, ...config };

        // Ensure positive values
        validated.poolSize = Math.max(1, validated.poolSize);
        validated.maxPoolSize = Math.max(validated.poolSize, validated.maxPoolSize);
        validated.worldWidth = Math.max(1, validated.worldWidth);
        validated.worldHeight = Math.max(1, validated.worldHeight);
        validated.gridCellSize = Math.max(1, validated.gridCellSize);
        validated.maxProjectiles = Math.max(1, validated.maxProjectiles);
        validated.cleanupInterval = Math.max(100, validated.cleanupInterval);

        return validated;
    }

    /**
     * Creates a new projectile
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} velocityX - Horizontal velocity
     * @param {number} velocityY - Vertical velocity
     * @param {string} type - Projectile type
     * @param {Object} config - Projectile configuration
     * @returns {string|null} Projectile ID or null if failed
     */
    createProjectile(x, y, velocityX, velocityY, type = 'player', config = {}) {
        try {
            // Validate inputs
            if (!this.isValidNumber(x) || !this.isValidNumber(y) ||
                !this.isValidNumber(velocityX) || !this.isValidNumber(velocityY)) {
                throw new Error('Invalid projectile parameters');
            }

            // Check projectile limit
            if (this.projectiles.size >= this.config.maxProjectiles) {
                console.warn('Maximum projectiles reached, cannot create new projectile');
                return null;
            }

            // Sanitize type
            const sanitizedType = this.sanitizeString(type);
            if (!sanitizedType) {
                throw new Error('Invalid projectile type');
            }

            // Create projectile from pool
            const projectile = this.pool.acquire(x, y, velocityX, velocityY, sanitizedType, config);
            
            if (!projectile) {
                console.error('Failed to acquire projectile from pool');
                return null;
            }

            // Add to active projectiles
            this.projectiles.set(projectile.id, projectile);
            this.metrics.projectilesCreated++;
            this.metrics.activeProjectiles = this.projectiles.size;

            // Emit creation event
            this.emit('projectileCreated', {
                id: projectile.id,
                type: sanitizedType,
                x: x,
                y: y,
                timestamp: performance.now()
            });

            return projectile.id;

        } catch (error) {
            console.error('Error creating projectile:', error);
            return null;
        }
    }

    /**
     * Updates all projectiles
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        const startTime = performance.now();

        try {
            // Validate delta time
            const safeDeltaTime = Math.max(0, Math.min(100, deltaTime || 16.67));

            // Clear spatial grid
            if (this.config.enableSpatialOptimization) {
                this.spatialGrid.clear();
            }

            // Update projectiles
            const projectilesToRemove = [];

            for (const [id, projectile] of this.projectiles) {
                if (!projectile.active) {
                    projectilesToRemove.push(id);
                    continue;
                }

                // Update projectile
                projectile.update(safeDeltaTime);

                // Check boundaries
                if (projectile.isOutOfBounds(this.boundaries)) {
                    projectile.deactivate();
                    projectilesToRemove.push(id);
                    continue;
                }

                // Add to spatial grid
                if (this.config.enableSpatialOptimization && projectile.active) {
                    this.spatialGrid.insert(projectile);
                }
            }

            // Remove inactive projectiles
            this.removeProjectiles(projectilesToRemove);

            // Update metrics
            this.updateMetrics(startTime);

        } catch (error) {
            console.error('Error updating projectiles:', error);
        }
    }

    /**
     * Removes projectiles by IDs
     * @param {Array} ids - Array of projectile IDs to remove
     */
    removeProjectiles(ids) {
        for (const id of ids) {
            const projectile = this.projectiles.get(id);
            if (projectile) {
                // Return to pool
                this.pool.release(projectile);
                
                // Remove from active projectiles
                this.projectiles.delete(id);
                this.metrics.projectilesDestroyed++;

                // Emit destruction event
                this.emit('projectileDestroyed', {
                    id: id,
                    type: projectile.type,
                    age: projectile.age,
                    timestamp: performance.now()
                });
            }
        }

        this.metrics.activeProjectiles = this.projectiles.size;
    }

    /**
     * Gets projectiles by type
     * @param {string} type - Projectile type to filter by
     * @returns {Array} Array of projectiles
     */
    getProjectilesByType(type) {
        const sanitizedType = this.sanitizeString(type);
        if (!sanitizedType) return [];

        const result = [];
        for (const projectile of this.projectiles.values()) {
            if (projectile.active && projectile.type === sanitizedType) {
                result.push(projectile);
            }
        }
        return result;
    }

    /**
     * Gets projectiles in area for collision detection
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Array of nearby projectiles
     */
    getProjectilesInArea(x, y, radius = 50) {
        if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(radius)) {
            return [];
        }

        if (this.config.enableSpatialOptimization) {
            return this.spatialGrid.getNearby(x, y, radius)
                .filter(projectile => projectile.active);
        } else {
            // Fallback to brute force search
            const result = [];
            const radiusSquared = radius * radius;

            for (const projectile of this.projectiles.values()) {
                if (!projectile.active) continue;

                const dx = projectile.x - x;
                const dy = projectile.y - y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared <= radiusSquared) {
                    result.push(projectile);
                }
            }

            return result;
        }
    }

    /**
     * Destroys projectile by ID
     * @param {string} id - Projectile ID
     * @param {Object} options - Destruction options
     */
    destroyProjectile(id, options = {}) {
        const projectile = this.projectiles.get(id);
        if (!projectile) return;

        try {
            // Create explosion effect if configured
            if (options.createExplosion && projectile.explosive) {
                this.emit('explosionRequested', {
                    x: projectile.x,
                    y: projectile.y,
                    radius: projectile.explosionRadius,
                    damage: projectile.damage,
                    type: projectile.type
                });
            }

            // Deactivate projectile
            projectile.deactivate();

            // Emit destruction event
            this.emit('projectileDestroyed', {
                id: id,
                x: projectile.x,
                y: projectile.y,
                type: projectile.type,
                reason: options.reason || 'destroyed',
                timestamp: performance.now()
            });

        } catch (error) {
            console.error('Error destroying projectile:', error);
        }
    }

    /**
     * Clears all projectiles
     */
    clear() {
        try {
            // Deactivate all projectiles
            for (const projectile of this.projectiles.values()) {
                projectile.deactivate();
                this.pool.release(projectile);
            }

            // Clear collections
            this.projectiles.clear();
            this.spatialGrid.clear();

            // Reset metrics
            this.metrics.activeProjectiles = 0;

            // Emit clear event
            this.emit('projectilesCleared', {
                timestamp: performance.now()
            });

            console.log('All projectiles cleared');

        } catch (error) {
            console.error('Error clearing projectiles:', error);
        }
    }

    /**
     * Sets world boundaries
     * @param {Object} boundaries - Boundary configuration
     */
    setBoundaries(boundaries) {
        if (!boundaries || typeof boundaries !== 'object') {
            console.error('Invalid boundaries provided');
            return;
        }

        this.boundaries = {
            left: this.isValidNumber(boundaries.left) ? boundaries.left : this.boundaries.left,
            right: this.isValidNumber(boundaries.right) ? boundaries.right : this.boundaries.right,
            top: this.isValidNumber(boundaries.top) ? boundaries.top : this.boundaries.top,
            bottom: this.isValidNumber(boundaries.bottom) ? boundaries.bottom : this.boundaries.bottom
        };

        // Update spatial grid if dimensions changed
        const newWidth = this.boundaries.right - this.boundaries.left;
        const newHeight = this.boundaries.bottom - this.boundaries.top;

        if (newWidth !== this.spatialGrid.width || newHeight !== this.spatialGrid.height) {
            this.spatialGrid = new SpatialGrid(newWidth, newHeight, this.config.gridCellSize);
        }
    }

    /**
     * Gets system performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        const poolStats = this.pool.getStats();
        
        return {
            ...this.metrics,
            pool: poolStats,
            averageUpdateTime: this.getAverageUpdateTime(),
            memoryUsage: this.getMemoryUsage(),
            spatialGrid: {
                cells: this.spatialGrid.cols * this.spatialGrid.rows,
                cellSize: this.spatialGrid.cellSize
            }
        };
    }

    /**
     * Gets average update time from performance buffer
     * @returns {number} Average update time in milliseconds
     */
    getAverageUpdateTime() {
        if (this.performanceBuffer.length === 0) return 0;
        
        const sum = this.performanceBuffer.reduce((acc, time) => acc + time, 0);
        return sum / this.performanceBuffer.length;
    }

    /**
     * Estimates memory usage
     * @returns {Object} Memory usage information
     */
    getMemoryUsage() {
        const projectileSize = 200; // Estimated bytes per projectile
        const activeMemory = this.projectiles.size * projectileSize;
        const poolMemory = this.pool.pool.length * projectileSize;
        
        return {
            active: activeMemory,
            pool: poolMemory,
            total: activeMemory + poolMemory,
            unit: 'bytes'
        };
    }

    /**
     * Updates performance metrics
     * @param {number} startTime - Update start time
     */
    updateMetrics(startTime) {
        if (!this.config.enablePerformanceTracking) return;

        const updateTime = performance.now() - startTime;
        this.metrics.updateTime = updateTime;
        this.metrics.lastFrameTime = performance.now();

        // Add to performance buffer
        this.performanceBuffer.push(updateTime);
        if (this.performanceBuffer.length > this.maxPerformanceBufferSize) {
            this.performanceBuffer.shift();
        }
    }

    /**
     * Adds event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (typeof callback !== 'function') {
            console.error('Event callback must be a function');
            return;
        }

        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }

        this.eventListeners.get(event).push(callback);
    }

    /**
     * Removes event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback to remove
     */
    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emits event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }
    }

    /**
     * Validates if value is a valid number
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid number
     */
    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Sanitizes string input
     * @param {*} value - Value to sanitize
     * @returns {string|null} Sanitized string or null
     */
    sanitizeString(value) {
        if (typeof value !== 'string') return null;
        
        // Remove potentially dangerous characters
        const sanitized = value.replace(/[<>\"'&]/g, '').trim();
        return sanitized.length > 0 ? sanitized : null;
    }

    /**
     * Performs health check on the system
     * @returns {Object} Health check results
     */
    healthCheck() {
        const metrics = this.getMetrics();
        const issues = [];

        // Check for performance issues
        if (metrics.averageUpdateTime > 16.67) {
            issues.push('High update time detected');
        }

        // Check for memory issues
        if (metrics.activeProjectiles > this.config.maxProjectiles * 0.9) {
            issues.push('Approaching maximum projectile limit');
        }

        // Check pool efficiency
        if (metrics.pool.efficiency < 0.5 && metrics.pool.created > 100) {
            issues.push('Low object pool efficiency');
        }

        return {
            healthy: issues.length === 0,
            issues: issues,
            metrics: metrics,
            timestamp: performance.now()
        };
    }

    /**
     * Disposes of the projectile system
     */
    dispose() {
        try {
            // Clear all projectiles
            this.clear();

            // Clear pool
            this.pool.clear();

            // Clear event listeners
            this.eventListeners.clear();

            // Clear performance buffer
            this.performanceBuffer.length = 0;

            console.log('ProjectileSystem disposed');

        } catch (error) {
            console.error('Error disposing ProjectileSystem:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectileSystem, Projectile, ProjectilePool, SpatialGrid };
} else if (typeof window !== 'undefined') {
    window.ProjectileSystem = ProjectileSystem;
    window.Projectile = Projectile;
    window.ProjectilePool = ProjectilePool;
    window.SpatialGrid = SpatialGrid;
}