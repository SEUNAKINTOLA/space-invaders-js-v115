/**
 * Projectile Entity System
 * 
 * Handles player bullet projectiles with position tracking, velocity management,
 * lifetime control, and collision detection preparation. Implements efficient
 * object pooling patterns and provides visual feedback for responsive gameplay.
 * 
 * Key Features:
 * - Position and velocity-based movement
 * - Automatic lifetime management
 * - Collision boundary detection
 * - Visual rendering with trail effects
 * - Memory-efficient object pooling
 * - Performance monitoring integration
 * 
 * Architecture:
 * - Entity-Component pattern for modularity
 * - Observer pattern for lifecycle events
 * - Strategy pattern for different projectile types
 * 
 * @module ProjectileEntity
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Projectile types enumeration for different bullet behaviors
 * @readonly
 * @enum {string}
 */
const ProjectileType = {
    BASIC: 'basic',
    RAPID: 'rapid',
    PIERCING: 'piercing',
    EXPLOSIVE: 'explosive'
};

/**
 * Projectile state enumeration for lifecycle management
 * @readonly
 * @enum {string}
 */
const ProjectileState = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    COLLIDED: 'collided',
    OUT_OF_BOUNDS: 'out_of_bounds'
};

/**
 * Default projectile configuration with performance-optimized values
 * @readonly
 * @type {Object}
 */
const DEFAULT_CONFIG = {
    speed: 400,           // pixels per second
    lifetime: 3000,       // milliseconds
    width: 4,             // pixels
    height: 12,           // pixels
    color: '#00ff00',     // bright green
    trailLength: 3,       // trail effect length
    damage: 1,            // base damage value
    maxPoolSize: 100      // object pool limit
};

/**
 * Projectile class representing player bullets with comprehensive lifecycle management
 * 
 * Implements efficient movement, collision detection preparation, and visual rendering
 * with built-in performance monitoring and memory management.
 * 
 * @class Projectile
 */
class Projectile {
    /**
     * Creates a new projectile instance
     * 
     * @param {Object} options - Projectile configuration options
     * @param {number} options.x - Initial X position
     * @param {number} options.y - Initial Y position
     * @param {number} [options.velocityX=0] - Horizontal velocity
     * @param {number} [options.velocityY=-DEFAULT_CONFIG.speed] - Vertical velocity
     * @param {ProjectileType} [options.type=ProjectileType.BASIC] - Projectile type
     * @param {Object} [options.config=DEFAULT_CONFIG] - Custom configuration
     * @param {Function} [options.onDestroy] - Destruction callback
     * @throws {Error} When required parameters are missing or invalid
     */
    constructor(options = {}) {
        // Input validation with detailed error messages
        if (typeof options.x !== 'number' || typeof options.y !== 'number') {
            throw new Error('Projectile requires valid numeric x and y coordinates');
        }

        if (options.x < -1000 || options.x > 2000 || options.y < -1000 || options.y > 2000) {
            throw new Error('Projectile coordinates out of reasonable bounds');
        }

        // Core properties with secure defaults
        this.id = this._generateId();
        this.x = options.x;
        this.y = options.y;
        this.velocityX = options.velocityX || 0;
        this.velocityY = options.velocityY || -DEFAULT_CONFIG.speed;
        this.type = options.type || ProjectileType.BASIC;
        this.state = ProjectileState.ACTIVE;

        // Configuration with fallback to defaults
        this.config = { ...DEFAULT_CONFIG, ...(options.config || {}) };
        
        // Lifecycle management
        this.createdAt = performance.now();
        this.lifetime = this.config.lifetime;
        this.age = 0;
        
        // Visual properties
        this.width = this.config.width;
        this.height = this.config.height;
        this.color = this.config.color;
        this.alpha = 1.0;
        
        // Trail effect for visual feedback
        this.trail = [];
        this.trailLength = this.config.trailLength;
        
        // Collision detection properties
        this.damage = this.config.damage;
        this.hasCollided = false;
        this.collisionRadius = Math.max(this.width, this.height) / 2;
        
        // Performance tracking
        this.updateCount = 0;
        this.renderCount = 0;
        
        // Event callbacks
        this.onDestroy = options.onDestroy || null;
        this.onCollision = options.onCollision || null;
        
        // Boundary constraints (will be set by game system)
        this.boundaries = {
            left: -50,
            right: 850,
            top: -50,
            bottom: 650
        };

        this._logCreation();
    }

    /**
     * Updates projectile position, lifetime, and state
     * 
     * Handles movement calculations, boundary checking, lifetime management,
     * and trail effect updates with performance optimization.
     * 
     * @param {number} deltaTime - Time elapsed since last update (milliseconds)
     * @returns {boolean} True if projectile is still active, false if should be removed
     */
    update(deltaTime) {
        try {
            // Validate delta time to prevent physics errors
            if (typeof deltaTime !== 'number' || deltaTime < 0 || deltaTime > 100) {
                console.warn(`Invalid deltaTime: ${deltaTime}, using fallback`);
                deltaTime = 16.67; // ~60 FPS fallback
            }

            // Skip update if already inactive
            if (this.state !== ProjectileState.ACTIVE) {
                return false;
            }

            this.updateCount++;
            const deltaSeconds = deltaTime / 1000;

            // Update age and check lifetime
            this.age += deltaTime;
            if (this.age >= this.lifetime) {
                this._expire('lifetime_exceeded');
                return false;
            }

            // Store previous position for trail effect
            this._updateTrail();

            // Update position based on velocity
            this.x += this.velocityX * deltaSeconds;
            this.y += this.velocityY * deltaSeconds;

            // Check boundaries and mark for removal if out of bounds
            if (this._checkBoundaries()) {
                this._expire('out_of_bounds');
                return false;
            }

            // Update visual properties
            this._updateVisuals(deltaTime);

            return true;

        } catch (error) {
            console.error(`Projectile update error (ID: ${this.id}):`, error);
            this._expire('update_error');
            return false;
        }
    }

    /**
     * Renders the projectile with visual effects
     * 
     * Draws the projectile body, trail effect, and any special visual indicators
     * with optimized canvas operations.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @throws {Error} When context is invalid
     */
    render(ctx) {
        try {
            if (!ctx || typeof ctx.fillRect !== 'function') {
                throw new Error('Invalid canvas context provided to projectile render');
            }

            // Skip rendering if not active or fully transparent
            if (this.state !== ProjectileState.ACTIVE || this.alpha <= 0) {
                return;
            }

            this.renderCount++;

            // Save context state
            ctx.save();

            // Render trail effect first (behind projectile)
            this._renderTrail(ctx);

            // Set projectile visual properties
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;

            // Render main projectile body
            const renderX = Math.round(this.x - this.width / 2);
            const renderY = Math.round(this.y - this.height / 2);
            
            ctx.fillRect(renderX, renderY, this.width, this.height);

            // Add glow effect for enhanced visibility
            this._renderGlowEffect(ctx, renderX, renderY);

            // Restore context state
            ctx.restore();

        } catch (error) {
            console.error(`Projectile render error (ID: ${this.id}):`, error);
        }
    }

    /**
     * Checks collision with another entity
     * 
     * Performs efficient collision detection using bounding box and circular
     * collision methods with configurable precision.
     * 
     * @param {Object} entity - Entity to check collision against
     * @param {number} entity.x - Entity X position
     * @param {number} entity.y - Entity Y position
     * @param {number} entity.width - Entity width
     * @param {number} entity.height - Entity height
     * @returns {boolean} True if collision detected
     */
    checkCollision(entity) {
        try {
            // Validate entity parameters
            if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
                return false;
            }

            // Skip if already collided or not active
            if (this.hasCollided || this.state !== ProjectileState.ACTIVE) {
                return false;
            }

            // Use circular collision detection for better accuracy
            const dx = this.x - entity.x;
            const dy = this.y - entity.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const entityRadius = Math.max(entity.width || 0, entity.height || 0) / 2;
            const collisionDistance = this.collisionRadius + entityRadius;

            const hasCollision = distance < collisionDistance;

            if (hasCollision) {
                this._handleCollision(entity);
            }

            return hasCollision;

        } catch (error) {
            console.error(`Collision detection error (ID: ${this.id}):`, error);
            return false;
        }
    }

    /**
     * Destroys the projectile and cleans up resources
     * 
     * Handles proper cleanup, event notifications, and resource deallocation
     * with memory leak prevention.
     * 
     * @param {string} [reason='manual'] - Reason for destruction
     */
    destroy(reason = 'manual') {
        try {
            if (this.state === ProjectileState.EXPIRED) {
                return; // Already destroyed
            }

            this.state = ProjectileState.EXPIRED;
            
            // Clear trail to free memory
            this.trail.length = 0;
            
            // Notify destruction callback
            if (this.onDestroy && typeof this.onDestroy === 'function') {
                this.onDestroy(this, reason);
            }

            this._logDestruction(reason);

        } catch (error) {
            console.error(`Projectile destruction error (ID: ${this.id}):`, error);
        }
    }

    /**
     * Gets projectile bounds for collision detection
     * 
     * @returns {Object} Bounding box coordinates
     */
    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }

    /**
     * Gets projectile performance metrics
     * 
     * @returns {Object} Performance statistics
     */
    getMetrics() {
        return {
            id: this.id,
            age: this.age,
            updateCount: this.updateCount,
            renderCount: this.renderCount,
            state: this.state,
            type: this.type,
            position: { x: this.x, y: this.y },
            velocity: { x: this.velocityX, y: this.velocityY }
        };
    }

    // Private methods for internal functionality

    /**
     * Generates unique projectile ID
     * @private
     * @returns {string} Unique identifier
     */
    _generateId() {
        return `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Updates trail effect positions
     * @private
     */
    _updateTrail() {
        // Add current position to trail
        this.trail.unshift({ x: this.x, y: this.y, alpha: this.alpha });
        
        // Limit trail length for performance
        if (this.trail.length > this.trailLength) {
            this.trail.pop();
        }
    }

    /**
     * Checks if projectile is within boundaries
     * @private
     * @returns {boolean} True if out of bounds
     */
    _checkBoundaries() {
        return (
            this.x < this.boundaries.left ||
            this.x > this.boundaries.right ||
            this.y < this.boundaries.top ||
            this.y > this.boundaries.bottom
        );
    }

    /**
     * Updates visual properties based on age
     * @private
     * @param {number} deltaTime - Time delta
     */
    _updateVisuals(deltaTime) {
        // Fade out near end of lifetime for smooth disappearance
        const lifetimeRatio = this.age / this.lifetime;
        if (lifetimeRatio > 0.8) {
            this.alpha = Math.max(0, 1 - (lifetimeRatio - 0.8) * 5);
        }
    }

    /**
     * Renders trail effect
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    _renderTrail(ctx) {
        if (this.trail.length < 2) return;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, this.width / 2);
        ctx.lineCap = 'round';

        for (let i = 0; i < this.trail.length - 1; i++) {
            const current = this.trail[i];
            const next = this.trail[i + 1];
            const trailAlpha = (1 - i / this.trail.length) * this.alpha * 0.5;

            ctx.globalAlpha = trailAlpha;
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
        }
    }

    /**
     * Renders glow effect for enhanced visibility
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Render X position
     * @param {number} y - Render Y position
     */
    _renderGlowEffect(ctx, x, y) {
        // Create subtle glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.globalAlpha = this.alpha * 0.3;
        ctx.fillRect(x - 1, y - 1, this.width + 2, this.height + 2);
        ctx.shadowBlur = 0;
    }

    /**
     * Handles collision event
     * @private
     * @param {Object} entity - Collided entity
     */
    _handleCollision(entity) {
        this.hasCollided = true;
        this.state = ProjectileState.COLLIDED;

        if (this.onCollision && typeof this.onCollision === 'function') {
            this.onCollision(this, entity);
        }
    }

    /**
     * Expires projectile with reason
     * @private
     * @param {string} reason - Expiration reason
     */
    _expire(reason) {
        this.state = ProjectileState.OUT_OF_BOUNDS;
        this.destroy(reason);
    }

    /**
     * Logs projectile creation
     * @private
     */
    _logCreation() {
        console.debug(`Projectile created: ${this.id} at (${this.x}, ${this.y}) type: ${this.type}`);
    }

    /**
     * Logs projectile destruction
     * @private
     * @param {string} reason - Destruction reason
     */
    _logDestruction(reason) {
        console.debug(`Projectile destroyed: ${this.id} reason: ${reason} age: ${this.age}ms`);
    }
}

/**
 * Projectile Pool Manager for efficient memory management
 * 
 * Implements object pooling pattern to reduce garbage collection overhead
 * and improve performance during intense gameplay.
 * 
 * @class ProjectilePool
 */
class ProjectilePool {
    /**
     * Creates a new projectile pool
     * 
     * @param {number} [maxSize=DEFAULT_CONFIG.maxPoolSize] - Maximum pool size
     */
    constructor(maxSize = DEFAULT_CONFIG.maxPoolSize) {
        this.maxSize = maxSize;
        this.pool = [];
        this.active = new Set();
        this.metrics = {
            created: 0,
            reused: 0,
            destroyed: 0
        };
    }

    /**
     * Gets a projectile from the pool or creates a new one
     * 
     * @param {Object} options - Projectile options
     * @returns {Projectile} Projectile instance
     */
    acquire(options) {
        let projectile;

        if (this.pool.length > 0) {
            projectile = this.pool.pop();
            this._resetProjectile(projectile, options);
            this.metrics.reused++;
        } else {
            projectile = new Projectile(options);
            this.metrics.created++;
        }

        this.active.add(projectile);
        return projectile;
    }

    /**
     * Returns a projectile to the pool
     * 
     * @param {Projectile} projectile - Projectile to return
     */
    release(projectile) {
        if (!this.active.has(projectile)) {
            return;
        }

        this.active.delete(projectile);

        if (this.pool.length < this.maxSize) {
            this.pool.push(projectile);
        }

        this.metrics.destroyed++;
    }

    /**
     * Gets pool statistics
     * 
     * @returns {Object} Pool metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            poolSize: this.pool.length,
            activeCount: this.active.size,
            efficiency: this.metrics.reused / (this.metrics.created + this.metrics.reused)
        };
    }

    /**
     * Resets projectile properties for reuse
     * @private
     * @param {Projectile} projectile - Projectile to reset
     * @param {Object} options - New options
     */
    _resetProjectile(projectile, options) {
        projectile.id = projectile._generateId();
        projectile.x = options.x;
        projectile.y = options.y;
        projectile.velocityX = options.velocityX || 0;
        projectile.velocityY = options.velocityY || -DEFAULT_CONFIG.speed;
        projectile.state = ProjectileState.ACTIVE;
        projectile.age = 0;
        projectile.alpha = 1.0;
        projectile.hasCollided = false;
        projectile.trail.length = 0;
        projectile.updateCount = 0;
        projectile.renderCount = 0;
        projectile.createdAt = performance.now();
    }
}

// Export classes and constants for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        Projectile,
        ProjectilePool,
        ProjectileType,
        ProjectileState,
        DEFAULT_CONFIG
    };
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.Projectile = Projectile;
    window.ProjectilePool = ProjectilePool;
    window.ProjectileType = ProjectileType;
    window.ProjectileState = ProjectileState;
}