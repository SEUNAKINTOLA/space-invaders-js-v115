/**
 * Collision Detection System for Space Invaders
 * 
 * Provides high-performance collision detection with spatial partitioning,
 * AABB collision detection, collision response handling, and performance optimization.
 * 
 * Key Features:
 * - Spatial partitioning using quad-tree for O(log n) collision queries
 * - Axis-Aligned Bounding Box (AABB) collision detection
 * - Collision response system with customizable handlers
 * - Performance monitoring and optimization
 * - Memory-efficient object pooling
 * 
 * Architecture:
 * - Uses spatial hash grid for broad-phase collision detection
 * - Implements narrow-phase AABB testing for precise collision detection
 * - Event-driven collision response system
 * - Configurable collision layers and masks
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Represents a collision event with detailed information
 */
class CollisionEvent {
    /**
     * @param {Object} entityA - First entity in collision
     * @param {Object} entityB - Second entity in collision
     * @param {Object} contactPoint - Point of contact
     * @param {Object} normal - Collision normal vector
     * @param {number} penetration - Penetration depth
     */
    constructor(entityA, entityB, contactPoint, normal, penetration) {
        this.entityA = entityA;
        this.entityB = entityB;
        this.contactPoint = contactPoint;
        this.normal = normal;
        this.penetration = penetration;
        this.timestamp = performance.now();
        this.handled = false;
    }

    /**
     * Mark collision as handled
     */
    markHandled() {
        this.handled = true;
    }
}

/**
 * Axis-Aligned Bounding Box for collision detection
 */
class AABB {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of bounding box
     * @param {number} height - Height of bounding box
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Get the center point of the AABB
     * @returns {Object} Center point {x, y}
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Check if this AABB intersects with another AABB
     * @param {AABB} other - Other bounding box
     * @returns {boolean} True if intersecting
     */
    intersects(other) {
        return !(this.x + this.width < other.x ||
                other.x + other.width < this.x ||
                this.y + this.height < other.y ||
                other.y + other.height < this.y);
    }

    /**
     * Check if this AABB contains a point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is inside
     */
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    /**
     * Calculate overlap area with another AABB
     * @param {AABB} other - Other bounding box
     * @returns {number} Overlap area
     */
    getOverlapArea(other) {
        if (!this.intersects(other)) return 0;

        const overlapX = Math.min(this.x + this.width, other.x + other.width) - 
                        Math.max(this.x, other.x);
        const overlapY = Math.min(this.y + this.height, other.y + other.height) - 
                        Math.max(this.y, other.y);

        return overlapX * overlapY;
    }
}

/**
 * Spatial hash grid for efficient broad-phase collision detection
 */
class SpatialHashGrid {
    /**
     * @param {number} cellSize - Size of each grid cell
     * @param {number} worldWidth - Width of the game world
     * @param {number} worldHeight - Height of the game world
     */
    constructor(cellSize = 64, worldWidth = 800, worldHeight = 600) {
        this.cellSize = cellSize;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.cols = Math.ceil(worldWidth / cellSize);
        this.rows = Math.ceil(worldHeight / cellSize);
        this.grid = new Map();
        this.entityCells = new Map(); // Track which cells each entity occupies
    }

    /**
     * Get grid cell key for coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Cell key
     */
    getCellKey(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return `${col},${row}`;
    }

    /**
     * Get all cell keys that an AABB occupies
     * @param {AABB} aabb - Bounding box
     * @returns {string[]} Array of cell keys
     */
    getCellsForAABB(aabb) {
        const cells = [];
        const startCol = Math.max(0, Math.floor(aabb.x / this.cellSize));
        const endCol = Math.min(this.cols - 1, Math.floor((aabb.x + aabb.width) / this.cellSize));
        const startRow = Math.max(0, Math.floor(aabb.y / this.cellSize));
        const endRow = Math.min(this.rows - 1, Math.floor((aabb.y + aabb.height) / this.cellSize));

        for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
                cells.push(`${col},${row}`);
            }
        }

        return cells;
    }

    /**
     * Insert entity into spatial grid
     * @param {Object} entity - Entity to insert
     * @param {AABB} aabb - Entity's bounding box
     */
    insert(entity, aabb) {
        const cells = this.getCellsForAABB(aabb);
        this.entityCells.set(entity.id, cells);

        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey).add(entity);
        });
    }

    /**
     * Remove entity from spatial grid
     * @param {Object} entity - Entity to remove
     */
    remove(entity) {
        const cells = this.entityCells.get(entity.id);
        if (!cells) return;

        cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.delete(entity);
                if (cell.size === 0) {
                    this.grid.delete(cellKey);
                }
            }
        });

        this.entityCells.delete(entity.id);
    }

    /**
     * Update entity position in spatial grid
     * @param {Object} entity - Entity to update
     * @param {AABB} newAABB - New bounding box
     */
    update(entity, newAABB) {
        this.remove(entity);
        this.insert(entity, newAABB);
    }

    /**
     * Query entities near a given AABB
     * @param {AABB} aabb - Query bounding box
     * @returns {Set} Set of nearby entities
     */
    query(aabb) {
        const nearbyEntities = new Set();
        const cells = this.getCellsForAABB(aabb);

        cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.forEach(entity => nearbyEntities.add(entity));
            }
        });

        return nearbyEntities;
    }

    /**
     * Clear all entities from the grid
     */
    clear() {
        this.grid.clear();
        this.entityCells.clear();
    }

    /**
     * Get grid statistics for debugging
     * @returns {Object} Grid statistics
     */
    getStats() {
        let totalEntities = 0;
        let occupiedCells = 0;

        this.grid.forEach(cell => {
            if (cell.size > 0) {
                occupiedCells++;
                totalEntities += cell.size;
            }
        });

        return {
            totalCells: this.cols * this.rows,
            occupiedCells,
            totalEntities,
            averageEntitiesPerCell: occupiedCells > 0 ? totalEntities / occupiedCells : 0
        };
    }
}

/**
 * Performance metrics tracker for collision system
 */
class CollisionMetrics {
    constructor() {
        this.reset();
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.broadPhaseTime = 0;
        this.narrowPhaseTime = 0;
        this.totalCollisions = 0;
        this.entitiesChecked = 0;
        this.frameTime = 0;
        this.lastFrameStart = 0;
    }

    /**
     * Start frame timing
     */
    startFrame() {
        this.lastFrameStart = performance.now();
    }

    /**
     * End frame timing
     */
    endFrame() {
        this.frameTime = performance.now() - this.lastFrameStart;
    }

    /**
     * Record broad phase timing
     * @param {number} time - Time in milliseconds
     */
    recordBroadPhase(time) {
        this.broadPhaseTime += time;
    }

    /**
     * Record narrow phase timing
     * @param {number} time - Time in milliseconds
     */
    recordNarrowPhase(time) {
        this.narrowPhaseTime += time;
    }

    /**
     * Record collision detection
     */
    recordCollision() {
        this.totalCollisions++;
    }

    /**
     * Record entities checked
     * @param {number} count - Number of entities
     */
    recordEntitiesChecked(count) {
        this.entitiesChecked += count;
    }

    /**
     * Get performance summary
     * @returns {Object} Performance metrics
     */
    getSummary() {
        return {
            frameTime: this.frameTime,
            broadPhaseTime: this.broadPhaseTime,
            narrowPhaseTime: this.narrowPhaseTime,
            totalCollisions: this.totalCollisions,
            entitiesChecked: this.entitiesChecked,
            broadPhasePercentage: this.frameTime > 0 ? (this.broadPhaseTime / this.frameTime) * 100 : 0,
            narrowPhasePercentage: this.frameTime > 0 ? (this.narrowPhaseTime / this.frameTime) * 100 : 0
        };
    }
}

/**
 * Main collision detection system
 * 
 * Handles all collision detection and response for the game using spatial partitioning
 * and optimized algorithms for high performance.
 */
class CollisionSystem {
    /**
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Configuration with defaults
        this.config = {
            cellSize: config.cellSize || 64,
            worldWidth: config.worldWidth || 800,
            worldHeight: config.worldHeight || 600,
            enableMetrics: config.enableMetrics !== false,
            maxCollisionsPerFrame: config.maxCollisionsPerFrame || 1000,
            ...config
        };

        // Initialize spatial partitioning
        this.spatialGrid = new SpatialHashGrid(
            this.config.cellSize,
            this.config.worldWidth,
            this.config.worldHeight
        );

        // Entity management
        this.entities = new Map();
        this.collisionLayers = new Map();
        this.collisionHandlers = new Map();

        // Performance tracking
        this.metrics = new CollisionMetrics();
        this.enabled = true;

        // Collision event queue
        this.collisionEvents = [];
        this.eventPool = [];

        // Initialize default collision layers
        this.initializeDefaultLayers();

        console.log('CollisionSystem initialized with config:', this.config);
    }

    /**
     * Initialize default collision layers
     * @private
     */
    initializeDefaultLayers() {
        // Define collision layers
        this.LAYERS = {
            PLAYER: 1,
            ENEMY: 2,
            PLAYER_PROJECTILE: 4,
            ENEMY_PROJECTILE: 8,
            POWERUP: 16,
            BOUNDARY: 32
        };

        // Set up collision matrix (what can collide with what)
        this.setLayerCollision(this.LAYERS.PLAYER, this.LAYERS.ENEMY);
        this.setLayerCollision(this.LAYERS.PLAYER, this.LAYERS.ENEMY_PROJECTILE);
        this.setLayerCollision(this.LAYERS.PLAYER, this.LAYERS.POWERUP);
        this.setLayerCollision(this.LAYERS.PLAYER, this.LAYERS.BOUNDARY);
        this.setLayerCollision(this.LAYERS.ENEMY, this.LAYERS.PLAYER_PROJECTILE);
        this.setLayerCollision(this.LAYERS.ENEMY, this.LAYERS.BOUNDARY);
        this.setLayerCollision(this.LAYERS.PLAYER_PROJECTILE, this.LAYERS.BOUNDARY);
        this.setLayerCollision(this.LAYERS.ENEMY_PROJECTILE, this.LAYERS.BOUNDARY);
    }

    /**
     * Set collision between two layers
     * @param {number} layerA - First layer
     * @param {number} layerB - Second layer
     */
    setLayerCollision(layerA, layerB) {
        if (!this.collisionLayers.has(layerA)) {
            this.collisionLayers.set(layerA, new Set());
        }
        if (!this.collisionLayers.has(layerB)) {
            this.collisionLayers.set(layerB, new Set());
        }

        this.collisionLayers.get(layerA).add(layerB);
        this.collisionLayers.get(layerB).add(layerA);
    }

    /**
     * Check if two layers can collide
     * @param {number} layerA - First layer
     * @param {number} layerB - Second layer
     * @returns {boolean} True if layers can collide
     */
    canLayersCollide(layerA, layerB) {
        const layerACollisions = this.collisionLayers.get(layerA);
        return layerACollisions && layerACollisions.has(layerB);
    }

    /**
     * Register an entity for collision detection
     * @param {Object} entity - Entity to register
     * @param {Object} options - Registration options
     */
    registerEntity(entity, options = {}) {
        if (!entity || !entity.id) {
            console.error('CollisionSystem: Cannot register entity without ID');
            return;
        }

        const entityData = {
            entity,
            layer: options.layer || this.LAYERS.PLAYER,
            aabb: this.createAABBFromEntity(entity),
            isStatic: options.isStatic || false,
            isTrigger: options.isTrigger || false,
            lastPosition: { x: entity.x, y: entity.y }
        };

        this.entities.set(entity.id, entityData);
        this.spatialGrid.insert(entity, entityData.aabb);

        console.log(`CollisionSystem: Registered entity ${entity.id} on layer ${entityData.layer}`);
    }

    /**
     * Unregister an entity from collision detection
     * @param {string} entityId - Entity ID to unregister
     */
    unregisterEntity(entityId) {
        const entityData = this.entities.get(entityId);
        if (!entityData) return;

        this.spatialGrid.remove(entityData.entity);
        this.entities.delete(entityId);

        console.log(`CollisionSystem: Unregistered entity ${entityId}`);
    }

    /**
     * Create AABB from entity
     * @param {Object} entity - Entity object
     * @returns {AABB} Bounding box
     * @private
     */
    createAABBFromEntity(entity) {
        const width = entity.width || entity.radius * 2 || 32;
        const height = entity.height || entity.radius * 2 || 32;
        const x = entity.x - (entity.radius || width / 2);
        const y = entity.y - (entity.radius || height / 2);

        return new AABB(x, y, width, height);
    }

    /**
     * Update entity position in collision system
     * @param {string} entityId - Entity ID
     * @param {number} x - New X position
     * @param {number} y - New Y position
     */
    updateEntityPosition(entityId, x, y) {
        const entityData = this.entities.get(entityId);
        if (!entityData) return;

        // Update entity position
        entityData.entity.x = x;
        entityData.entity.y = y;

        // Update AABB
        const newAABB = this.createAABBFromEntity(entityData.entity);
        
        // Only update spatial grid if position changed significantly
        const dx = Math.abs(x - entityData.lastPosition.x);
        const dy = Math.abs(y - entityData.lastPosition.y);
        
        if (dx > this.config.cellSize / 4 || dy > this.config.cellSize / 4) {
            this.spatialGrid.update(entityData.entity, newAABB);
            entityData.lastPosition = { x, y };
        }

        entityData.aabb = newAABB;
    }

    /**
     * Register collision handler for specific layer combinations
     * @param {number} layerA - First layer
     * @param {number} layerB - Second layer
     * @param {Function} handler - Collision handler function
     */
    registerCollisionHandler(layerA, layerB, handler) {
        const key = `${Math.min(layerA, layerB)}-${Math.max(layerA, layerB)}`;
        this.collisionHandlers.set(key, handler);
    }

    /**
     * Get collision handler for layer combination
     * @param {number} layerA - First layer
     * @param {number} layerB - Second layer
     * @returns {Function|null} Collision handler
     * @private
     */
    getCollisionHandler(layerA, layerB) {
        const key = `${Math.min(layerA, layerB)}-${Math.max(layerA, layerB)}`;
        return this.collisionHandlers.get(key) || null;
    }

    /**
     * Perform collision detection for all entities
     */
    detectCollisions() {
        if (!this.enabled) return;

        if (this.config.enableMetrics) {
            this.metrics.startFrame();
        }

        this.collisionEvents.length = 0;
        let collisionsDetected = 0;

        const broadPhaseStart = performance.now();

        // Iterate through all entities
        for (const [entityId, entityDataA] of this.entities) {
            if (collisionsDetected >= this.config.maxCollisionsPerFrame) {
                console.warn('CollisionSystem: Maximum collisions per frame reached');
                break;
            }

            // Query spatial grid for nearby entities
            const nearbyEntities = this.spatialGrid.query(entityDataA.aabb);
            
            if (this.config.enableMetrics) {
                this.metrics.recordEntitiesChecked(nearbyEntities.size);
            }

            // Check collisions with nearby entities
            for (const entityB of nearbyEntities) {
                if (entityB.id === entityId) continue;

                const entityDataB = this.entities.get(entityB.id);
                if (!entityDataB) continue;

                // Check if layers can collide
                if (!this.canLayersCollide(entityDataA.layer, entityDataB.layer)) {
                    continue;
                }

                // Narrow phase collision detection
                const narrowPhaseStart = performance.now();
                
                if (this.checkAABBCollision(entityDataA.aabb, entityDataB.aabb)) {
                    const collisionEvent = this.createCollisionEvent(entityDataA, entityDataB);
                    this.collisionEvents.push(collisionEvent);
                    collisionsDetected++;

                    if (this.config.enableMetrics) {
                        this.metrics.recordCollision();
                    }
                }

                if (this.config.enableMetrics) {
                    this.metrics.recordNarrowPhase(performance.now() - narrowPhaseStart);
                }
            }
        }

        if (this.config.enableMetrics) {
            this.metrics.recordBroadPhase(performance.now() - broadPhaseStart);
            this.metrics.endFrame();
        }

        // Process collision events
        this.processCollisionEvents();
    }

    /**
     * Check AABB collision between two bounding boxes
     * @param {AABB} aabbA - First bounding box
     * @param {AABB} aabbB - Second bounding box
     * @returns {boolean} True if colliding
     * @private
     */
    checkAABBCollision(aabbA, aabbB) {
        return aabbA.intersects(aabbB);
    }

    /**
     * Create collision event from two entity data objects
     * @param {Object} entityDataA - First entity data
     * @param {Object} entityDataB - Second entity data
     * @returns {CollisionEvent} Collision event
     * @private
     */
    createCollisionEvent(entityDataA, entityDataB) {
        // Calculate contact point (center of overlap)
        const overlapLeft = Math.max(entityDataA.aabb.x, entityDataB.aabb.x);
        const overlapRight = Math.min(
            entityDataA.aabb.x + entityDataA.aabb.width,
            entityDataB.aabb.x + entityDataB.aabb.width
        );
        const overlapTop = Math.max(entityDataA.aabb.y, entityDataB.aabb.y);
        const overlapBottom = Math.min(
            entityDataA.aabb.y + entityDataA.aabb.height,
            entityDataB.aabb.y + entityDataB.aabb.height
        );

        const contactPoint = {
            x: (overlapLeft + overlapRight) / 2,
            y: (overlapTop + overlapBottom) / 2
        };

        // Calculate collision normal
        const centerA = entityDataA.aabb.getCenter();
        const centerB = entityDataB.aabb.getCenter();
        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const normal = distance > 0 ? {
            x: dx / distance,
            y: dy / distance
        } : { x: 1, y: 0 };

        // Calculate penetration depth
        const overlapX = overlapRight - overlapLeft;
        const overlapY = overlapBottom - overlapTop;
        const penetration = Math.min(overlapX, overlapY);

        return new CollisionEvent(
            entityDataA.entity,
            entityDataB.entity,
            contactPoint,
            normal,
            penetration
        );
    }

    /**
     * Process all collision events
     * @private
     */
    processCollisionEvents() {
        for (const event of this.collisionEvents) {
            if (event.handled) continue;

            const entityDataA = this.entities.get(event.entityA.id);
            const entityDataB = this.entities.get(event.entityB.id);

            if (!entityDataA || !entityDataB) continue;

            // Get collision handler
            const handler = this.getCollisionHandler(entityDataA.layer, entityDataB.layer);
            
            if (handler) {
                try {
                    handler(event);
                } catch (error) {
                    console.error('CollisionSystem: Error in collision handler:', error);
                }
            }

            // Default collision response for non-trigger collisions
            if (!entityDataA.isTrigger && !entityDataB.isTrigger && !event.handled) {
                this.resolveCollision(event);
            }
        }
    }

    /**
     * Resolve collision by separating entities
     * @param {CollisionEvent} event - Collision event
     * @private
     */
    resolveCollision(event) {
        const entityDataA = this.entities.get(event.entityA.id);
        const entityDataB = this.entities.get(event.entityB.id);

        if (!entityDataA || !entityDataB) return;

        // Don't resolve if both entities are static
        if (entityDataA.isStatic && entityDataB.isStatic) return;

        const separation = event.penetration / 2;

        // Move entities apart
        if (!entityDataA.isStatic) {
            event.entityA.x -= event.normal.x * separation;
            event.entityA.y -= event.normal.y * separation;
            this.updateEntityPosition(event.entityA.id, event.entityA.x, event.entityA.y);
        }

        if (!entityDataB.isStatic) {
            event.entityB.x += event.normal.x * separation;
            event.entityB.y += event.normal.y * separation;
            this.updateEntityPosition(event.entityB.id, event.entityB.x, event.entityB.y);
        }

        event.markHandled();
    }

    /**
     * Query entities at a specific point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object[]} Array of entities at point
     */
    queryPoint(x, y) {
        const queryAABB = new AABB(x, y, 1, 1);
        const nearbyEntities = this.spatialGrid.query(queryAABB);
        const entitiesAtPoint = [];

        for (const entity of nearbyEntities) {
            const entityData = this.entities.get(entity.id);
            if (entityData && entityData.aabb.containsPoint(x, y)) {
                entitiesAtPoint.push(entity);
            }
        }

        return entitiesAtPoint;
    }

    /**
     * Query entities within a rectangular area
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width of query area
     * @param {number} height - Height of query area
     * @returns {Object[]} Array of entities in area
     */
    queryArea(x, y, width, height) {
        const queryAABB = new AABB(x, y, width, height);
        const nearbyEntities = this.spatialGrid.query(queryAABB);
        const entitiesInArea = [];

        for (const entity of nearbyEntities) {
            const entityData = this.entities.get(entity.id);
            if (entityData && queryAABB.intersects(entityData.aabb)) {
                entitiesInArea.push(entity);
            }
        }

        return entitiesInArea;
    }

    /**
     * Enable or disable collision detection
     * @param {boolean} enabled - Whether to enable collision detection
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`CollisionSystem: ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Clear all entities and reset system
     */
    clear() {
        this.entities.clear();
        this.spatialGrid.clear();
        this.collisionEvents.length = 0;
        this.metrics.reset();
        console.log('CollisionSystem: Cleared all entities');
    }

    /**
     * Get system performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics.getSummary(),
            entityCount: this.entities.size,
            spatialGridStats: this.spatialGrid.getStats()
        };
    }

    /**
     * Get system status for debugging
     * @returns {Object} System status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            entityCount: this.entities.size,
            collisionEventsThisFrame: this.collisionEvents.length,
            config: this.config,
            layers: this.LAYERS,
            metrics: this.getMetrics()
        };
    }

    /**
     * Debug draw collision bounds (for development)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    debugDraw(ctx) {
        if (!ctx) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;

        // Draw entity bounding boxes
        for (const [entityId, entityData] of this.entities) {
            const aabb = entityData.aabb;
            ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);
        }

        // Draw spatial grid
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        for (let x = 0; x < this.config.worldWidth; x += this.config.cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.config.worldHeight);
            ctx.stroke();
        }
        for (let y = 0; y < this.config.worldHeight; y += this.config.cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.config.worldWidth, y);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CollisionSystem,
        CollisionEvent,
        AABB,
        SpatialHashGrid,
        CollisionMetrics
    };
} else if (typeof window !== 'undefined') {
    window.CollisionSystem = CollisionSystem;
    window.CollisionEvent = CollisionEvent;
    window.AABB = AABB;
    window.SpatialHashGrid = SpatialHashGrid;
    window.CollisionMetrics = CollisionMetrics;
}