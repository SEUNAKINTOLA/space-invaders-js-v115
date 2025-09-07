/**
 * Projectile System - Manages projectile lifecycle, movement, and collision responses
 * Handles player bullets, enemy projectiles, and collision detection integration
 */

class ProjectileSystem {
    constructor() {
        this.projectiles = [];
        this.collisionCallbacks = new Map();
        this.projectilePool = [];
        this.maxPoolSize = 100;
        this.activeProjectiles = 0;
        
        // Initialize projectile pool
        this.initializePool();
    }

    /**
     * Initialize object pool for performance optimization
     */
    initializePool() {
        for (let i = 0; i < this.maxPoolSize; i++) {
            this.projectilePool.push(this.createProjectileObject());
        }
    }

    /**
     * Create a new projectile object with default properties
     */
    createProjectileObject() {
        return {
            id: null,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            width: 4,
            height: 8,
            type: 'player',
            active: false,
            damage: 1,
            owner: null,
            sprite: null,
            hitbox: { x: 0, y: 0, width: 4, height: 8 }
        };
    }

    /**
     * Create a new projectile
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     * @param {string} type - Projectile type ('player' or 'enemy')
     * @param {Object} owner - Entity that fired the projectile
     * @param {Object} options - Additional projectile properties
     * @returns {Object|null} Created projectile or null if pool exhausted
     */
    createProjectile(x, y, vx, vy, type = 'player', owner = null, options = {}) {
        if (this.activeProjectiles >= this.maxPoolSize) {
            return null; // Pool exhausted
        }

        const projectile = this.getFromPool();
        if (!projectile) return null;

        projectile.id = this.generateProjectileId();
        projectile.x = x;
        projectile.y = y;
        projectile.vx = vx;
        projectile.vy = vy;
        projectile.type = type;
        projectile.active = true;
        projectile.owner = owner;
        projectile.damage = options.damage || 1;
        projectile.width = options.width || 4;
        projectile.height = options.height || 8;
        projectile.sprite = options.sprite || null;

        // Update hitbox
        projectile.hitbox.x = x;
        projectile.hitbox.y = y;
        projectile.hitbox.width = projectile.width;
        projectile.hitbox.height = projectile.height;

        this.projectiles.push(projectile);
        this.activeProjectiles++;

        return projectile;
    }

    /**
     * Get projectile from object pool
     */
    getFromPool() {
        return this.projectilePool.find(p => !p.active) || null;
    }

    /**
     * Return projectile to object pool
     */
    returnToPool(projectile) {
        projectile.active = false;
        projectile.id = null;
        projectile.owner = null;
        projectile.sprite = null;
        this.activeProjectiles = Math.max(0, this.activeProjectiles - 1);
    }

    /**
     * Generate unique projectile ID
     */
    generateProjectileId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update all active projectiles
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, gameState) {
        const screenBounds = gameState.screenBounds || { width: 800, height: 600 };
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (!projectile.active) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Update position
            projectile.x += projectile.vx * deltaTime;
            projectile.y += projectile.vy * deltaTime;

            // Update hitbox
            projectile.hitbox.x = projectile.x;
            projectile.hitbox.y = projectile.y;

            // Check screen boundaries
            if (this.isOutOfBounds(projectile, screenBounds)) {
                this.destroyProjectile(projectile);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check for collisions
            this.checkCollisions(projectile, gameState);
        }
    }

    /**
     * Check if projectile is out of screen bounds
     * @param {Object} projectile - Projectile to check
     * @param {Object} bounds - Screen boundaries
     * @returns {boolean} True if out of bounds
     */
    isOutOfBounds(projectile, bounds) {
        return projectile.x < -projectile.width ||
               projectile.x > bounds.width ||
               projectile.y < -projectile.height ||
               projectile.y > bounds.height;
    }

    /**
     * Check collisions for a projectile
     * @param {Object} projectile - Projectile to check
     * @param {Object} gameState - Current game state
     */
    checkCollisions(projectile, gameState) {
        // Check collision with enemies (for player projectiles)
        if (projectile.type === 'player' && gameState.enemies) {
            for (const enemy of gameState.enemies) {
                if (enemy.active && this.checkCollision(projectile, enemy)) {
                    this.handleCollision(projectile, enemy, 'enemy');
                    return; // Projectile destroyed, no need to check more
                }
            }
        }

        // Check collision with player (for enemy projectiles)
        if (projectile.type === 'enemy' && gameState.player) {
            if (gameState.player.active && this.checkCollision(projectile, gameState.player)) {
                this.handleCollision(projectile, gameState.player, 'player');
                return;
            }
        }

        // Check collision with barriers/obstacles
        if (gameState.barriers) {
            for (const barrier of gameState.barriers) {
                if (barrier.active && this.checkCollision(projectile, barrier)) {
                    this.handleCollision(projectile, barrier, 'barrier');
                    return;
                }
            }
        }
    }

    /**
     * Check collision between two objects using AABB collision detection
     * @param {Object} obj1 - First object (projectile)
     * @param {Object} obj2 - Second object (target)
     * @returns {boolean} True if collision detected
     */
    checkCollision(obj1, obj2) {
        const box1 = obj1.hitbox || { x: obj1.x, y: obj1.y, width: obj1.width, height: obj1.height };
        const box2 = obj2.hitbox || { x: obj2.x, y: obj2.y, width: obj2.width, height: obj2.height };

        return box1.x < box2.x + box2.width &&
               box1.x + box1.width > box2.x &&
               box1.y < box2.y + box2.height &&
               box1.y + box1.height > box2.y;
    }

    /**
     * Handle collision between projectile and target
     * @param {Object} projectile - The projectile that collided
     * @param {Object} target - The target that was hit
     * @param {string} targetType - Type of target ('enemy', 'player', 'barrier')
     */
    handleCollision(projectile, target, targetType) {
        // Execute collision callback if registered
        const callback = this.collisionCallbacks.get(targetType);
        if (callback) {
            callback(projectile, target);
        }

        // Apply damage to target
        if (target.takeDamage && typeof target.takeDamage === 'function') {
            target.takeDamage(projectile.damage);
        } else if (target.health !== undefined) {
            target.health -= projectile.damage;
            if (target.health <= 0) {
                target.active = false;
            }
        }

        // Destroy projectile
        this.destroyProjectile(projectile);
    }

    /**
     * Register collision callback for specific target type
     * @param {string} targetType - Type of target ('enemy', 'player', 'barrier')
     * @param {Function} callback - Callback function to execute on collision
     */
    registerCollisionCallback(targetType, callback) {
        this.collisionCallbacks.set(targetType, callback);
    }

    /**
     * Destroy a projectile and return it to pool
     * @param {Object} projectile - Projectile to destroy
     */
    destroyProjectile(projectile) {
        projectile.active = false;
        this.returnToPool(projectile);
    }

    /**
     * Get all active projectiles
     * @returns {Array} Array of active projectiles
     */
    getActiveProjectiles() {
        return this.projectiles.filter(p => p.active);
    }

    /**
     * Get projectiles by type
     * @param {string} type - Projectile type to filter by
     * @returns {Array} Array of projectiles of specified type
     */
    getProjectilesByType(type) {
        return this.projectiles.filter(p => p.active && p.type === type);
    }

    /**
     * Clear all projectiles
     */
    clearAllProjectiles() {
        for (const projectile of this.projectiles) {
            this.returnToPool(projectile);
        }
        this.projectiles = [];
    }

    /**
     * Get projectile count by type
     * @param {string} type - Projectile type
     * @returns {number} Count of active projectiles of specified type
     */
    getProjectileCount(type = null) {
        if (type) {
            return this.projectiles.filter(p => p.active && p.type === type).length;
        }
        return this.activeProjectiles;
    }

    /**
     * Render all active projectiles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        for (const projectile of this.projectiles) {
            if (!projectile.active) continue;

            if (projectile.sprite) {
                // Render sprite if available
                ctx.drawImage(
                    projectile.sprite,
                    projectile.x,
                    projectile.y,
                    projectile.width,
                    projectile.height
                );
            } else {
                // Render simple rectangle
                ctx.fillStyle = projectile.type === 'player' ? '#00ff00' : '#ff0000';
                ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
            }
        }
    }

    /**
     * Get system statistics for debugging
     * @returns {Object} System statistics
     */
    getStats() {
        return {
            activeProjectiles: this.activeProjectiles,
            totalProjectiles: this.projectiles.length,
            poolSize: this.projectilePool.length,
            poolUtilization: (this.activeProjectiles / this.maxPoolSize * 100).toFixed(1) + '%'
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectileSystem;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ProjectileSystem = ProjectileSystem;
}