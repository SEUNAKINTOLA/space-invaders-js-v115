/**
 * Player Entity System
 * 
 * Complete player entity implementation with movement, shooting, and rendering logic.
 * Supports both keyboard and touch controls with visual feedback and responsive design.
 * 
 * Key Features:
 * - Smooth left/right movement with velocity-based physics
 * - Shooting system with cooldown management
 * - Boundary collision detection and constraint
 * - Health and damage system
 * - Visual feedback for actions and states
 * - Touch and keyboard input support
 * - Performance-optimized rendering
 * 
 * Architecture:
 * - Entity-Component pattern for modularity
 * - Event-driven design for loose coupling
 * - State management for player conditions
 * - Resource pooling for projectiles
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Player entity class representing the player's ship in the game
 * Handles movement, shooting, collision detection, and rendering
 */
class Player {
    /**
     * Player configuration constants
     * @type {Object}
     */
    static CONFIG = {
        // Movement properties
        SPEED: 300,                    // pixels per second
        ACCELERATION: 800,             // pixels per second squared
        DECELERATION: 1200,           // pixels per second squared
        MAX_VELOCITY: 400,            // maximum velocity in pixels per second
        
        // Shooting properties
        SHOOT_COOLDOWN: 150,          // milliseconds between shots
        PROJECTILE_SPEED: 500,        // pixels per second
        
        // Physical properties
        WIDTH: 48,                    // player sprite width
        HEIGHT: 32,                   // player sprite height
        COLLISION_RADIUS: 16,         // collision detection radius
        
        // Health system
        MAX_HEALTH: 100,              // maximum health points
        INVULNERABILITY_TIME: 2000,   // milliseconds of invulnerability after hit
        
        // Visual feedback
        DAMAGE_FLASH_DURATION: 100,   // milliseconds for damage flash
        SHOOT_FLASH_DURATION: 50,     // milliseconds for shoot flash
        
        // Input sensitivity
        TOUCH_SENSITIVITY: 1.2,       // touch input multiplier
        KEYBOARD_SENSITIVITY: 1.0     // keyboard input multiplier
    };

    /**
     * Player states enumeration
     * @type {Object}
     */
    static STATES = {
        NORMAL: 'normal',
        DAMAGED: 'damaged',
        INVULNERABLE: 'invulnerable',
        DESTROYED: 'destroyed',
        SHOOTING: 'shooting'
    };

    /**
     * Input types enumeration
     * @type {Object}
     */
    static INPUT_TYPES = {
        KEYBOARD: 'keyboard',
        TOUCH: 'touch',
        GAMEPAD: 'gamepad'
    };

    /**
     * Create a new Player instance
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {Object} gameConfig - Game configuration object
     * @param {Object} eventEmitter - Event emitter for game events
     */
    constructor(x = 0, y = 0, gameConfig = {}, eventEmitter = null) {
        // Validate input parameters
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Player position coordinates must be numbers');
        }

        // Position and movement
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.lastPosition = { x, y };

        // Physical properties
        this.width = Player.CONFIG.WIDTH;
        this.height = Player.CONFIG.HEIGHT;
        this.collisionRadius = Player.CONFIG.COLLISION_RADIUS;
        this.bounds = null; // Set by game boundaries

        // Health and state
        this.health = Player.CONFIG.MAX_HEALTH;
        this.maxHealth = Player.CONFIG.MAX_HEALTH;
        this.state = Player.STATES.NORMAL;
        this.isAlive = true;
        this.isInvulnerable = false;

        // Shooting system
        this.canShoot = true;
        this.lastShotTime = 0;
        this.shootCooldown = Player.CONFIG.SHOOT_COOLDOWN;
        this.projectiles = [];

        // Input handling
        this.inputState = {
            left: false,
            right: false,
            shoot: false,
            touch: { active: false, startX: 0, currentX: 0 }
        };
        this.activeInputType = Player.INPUT_TYPES.KEYBOARD;

        // Visual feedback
        this.visualEffects = {
            damageFlash: { active: false, timer: 0 },
            shootFlash: { active: false, timer: 0 },
            invulnerabilityFlash: { active: false, timer: 0 }
        };

        // Timers
        this.invulnerabilityTimer = 0;
        this.stateTimer = 0;

        // Game integration
        this.gameConfig = { ...gameConfig };
        this.eventEmitter = eventEmitter;

        // Performance tracking
        this.lastUpdateTime = 0;
        this.frameCount = 0;

        // Initialize systems
        this._initializeInputHandlers();
        this._initializeVisualEffects();
        
        // Log player creation
        this._log('Player created', { x, y, health: this.health });
    }

    /**
     * Initialize input event handlers
     * @private
     */
    _initializeInputHandlers() {
        // Keyboard event handlers
        this.keydownHandler = (event) => this._handleKeyDown(event);
        this.keyupHandler = (event) => this._handleKeyUp(event);
        
        // Touch event handlers
        this.touchstartHandler = (event) => this._handleTouchStart(event);
        this.touchmoveHandler = (event) => this._handleTouchMove(event);
        this.touchendHandler = (event) => this._handleTouchEnd(event);

        // Add event listeners
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', this.keydownHandler);
            document.addEventListener('keyup', this.keyupHandler);
            document.addEventListener('touchstart', this.touchstartHandler, { passive: false });
            document.addEventListener('touchmove', this.touchmoveHandler, { passive: false });
            document.addEventListener('touchend', this.touchendHandler);
        }
    }

    /**
     * Initialize visual effects system
     * @private
     */
    _initializeVisualEffects() {
        this.sprite = {
            normal: null,
            damaged: null,
            invulnerable: null,
            current: null
        };

        this.animations = {
            idle: { frame: 0, frameCount: 1, frameTime: 0 },
            moving: { frame: 0, frameCount: 2, frameTime: 0 },
            shooting: { frame: 0, frameCount: 3, frameTime: 0 }
        };
    }

    /**
     * Update player state and physics
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, gameState = {}) {
        if (!this.isAlive) return;

        const deltaSeconds = deltaTime / 1000;
        this.lastUpdateTime = performance.now();

        try {
            // Update timers
            this._updateTimers(deltaTime);

            // Process input
            this._processInput(deltaSeconds);

            // Update physics
            this._updatePhysics(deltaSeconds);

            // Update shooting system
            this._updateShooting(deltaTime);

            // Update visual effects
            this._updateVisualEffects(deltaTime);

            // Update state machine
            this._updateState(deltaTime);

            // Enforce boundaries
            this._enforceBoundaries();

            // Update projectiles
            this._updateProjectiles(deltaSeconds);

            // Performance tracking
            this.frameCount++;

        } catch (error) {
            this._handleError('Update error', error);
        }
    }

    /**
     * Update all timers
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @private
     */
    _updateTimers(deltaTime) {
        // Invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.state = Player.STATES.NORMAL;
                this._emit('player:invulnerability_ended');
            }
        }

        // State timer
        this.stateTimer += deltaTime;

        // Visual effect timers
        Object.keys(this.visualEffects).forEach(effect => {
            if (this.visualEffects[effect].active) {
                this.visualEffects[effect].timer -= deltaTime;
                if (this.visualEffects[effect].timer <= 0) {
                    this.visualEffects[effect].active = false;
                }
            }
        });
    }

    /**
     * Process player input
     * @param {number} deltaSeconds - Time elapsed in seconds
     * @private
     */
    _processInput(deltaSeconds) {
        // Reset acceleration
        this.acceleration.x = 0;

        // Handle movement input
        if (this.inputState.left) {
            this.acceleration.x -= Player.CONFIG.ACCELERATION;
        }
        if (this.inputState.right) {
            this.acceleration.x += Player.CONFIG.ACCELERATION;
        }

        // Handle touch input
        if (this.inputState.touch.active) {
            const touchDelta = this.inputState.touch.currentX - this.inputState.touch.startX;
            const touchForce = touchDelta * Player.CONFIG.TOUCH_SENSITIVITY;
            this.acceleration.x += touchForce * 10; // Scale for responsiveness
        }

        // Apply input sensitivity
        const sensitivity = this.activeInputType === Player.INPUT_TYPES.TOUCH 
            ? Player.CONFIG.TOUCH_SENSITIVITY 
            : Player.CONFIG.KEYBOARD_SENSITIVITY;
        
        this.acceleration.x *= sensitivity;

        // Handle shooting input
        if (this.inputState.shoot && this.canShoot) {
            this.shoot();
        }
    }

    /**
     * Update physics simulation
     * @param {number} deltaSeconds - Time elapsed in seconds
     * @private
     */
    _updatePhysics(deltaSeconds) {
        // Store last position
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;

        // Apply deceleration when no input
        if (Math.abs(this.acceleration.x) < 0.1) {
            const deceleration = Player.CONFIG.DECELERATION * deltaSeconds;
            if (this.velocity.x > 0) {
                this.velocity.x = Math.max(0, this.velocity.x - deceleration);
            } else if (this.velocity.x < 0) {
                this.velocity.x = Math.min(0, this.velocity.x + deceleration);
            }
        }

        // Apply acceleration
        this.velocity.x += this.acceleration.x * deltaSeconds;

        // Clamp velocity
        this.velocity.x = Math.max(-Player.CONFIG.MAX_VELOCITY, 
                          Math.min(Player.CONFIG.MAX_VELOCITY, this.velocity.x));

        // Update position
        this.position.x += this.velocity.x * deltaSeconds;
        this.position.y += this.velocity.y * deltaSeconds;
    }

    /**
     * Update shooting system
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @private
     */
    _updateShooting(deltaTime) {
        // Update shoot cooldown
        if (!this.canShoot) {
            const timeSinceLastShot = performance.now() - this.lastShotTime;
            if (timeSinceLastShot >= this.shootCooldown) {
                this.canShoot = true;
            }
        }

        // Update shoot flash effect
        if (this.visualEffects.shootFlash.active) {
            this.visualEffects.shootFlash.timer -= deltaTime;
            if (this.visualEffects.shootFlash.timer <= 0) {
                this.visualEffects.shootFlash.active = false;
            }
        }
    }

    /**
     * Update visual effects
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @private
     */
    _updateVisualEffects(deltaTime) {
        // Update damage flash
        if (this.visualEffects.damageFlash.active) {
            this.visualEffects.damageFlash.timer -= deltaTime;
            if (this.visualEffects.damageFlash.timer <= 0) {
                this.visualEffects.damageFlash.active = false;
            }
        }

        // Update invulnerability flash
        if (this.isInvulnerable) {
            this.visualEffects.invulnerabilityFlash.active = 
                Math.floor(this.invulnerabilityTimer / 100) % 2 === 0;
        }

        // Update animations
        this._updateAnimations(deltaTime);
    }

    /**
     * Update animation frames
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @private
     */
    _updateAnimations(deltaTime) {
        const currentAnimation = Math.abs(this.velocity.x) > 10 ? 'moving' : 'idle';
        const animation = this.animations[currentAnimation];
        
        animation.frameTime += deltaTime;
        if (animation.frameTime >= 200) { // 200ms per frame
            animation.frame = (animation.frame + 1) % animation.frameCount;
            animation.frameTime = 0;
        }
    }

    /**
     * Update state machine
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @private
     */
    _updateState(deltaTime) {
        switch (this.state) {
            case Player.STATES.NORMAL:
                // Normal state - no special behavior
                break;
                
            case Player.STATES.DAMAGED:
                // Transition to invulnerable state
                this.state = Player.STATES.INVULNERABLE;
                this.isInvulnerable = true;
                this.invulnerabilityTimer = Player.CONFIG.INVULNERABILITY_TIME;
                break;
                
            case Player.STATES.INVULNERABLE:
                // Handled in timer update
                break;
                
            case Player.STATES.DESTROYED:
                this.isAlive = false;
                this._emit('player:destroyed');
                break;
                
            case Player.STATES.SHOOTING:
                // Reset to normal after shoot flash
                if (!this.visualEffects.shootFlash.active) {
                    this.state = Player.STATES.NORMAL;
                }
                break;
        }
    }

    /**
     * Enforce boundary constraints
     * @private
     */
    _enforceBoundaries() {
        if (!this.bounds) return;

        const halfWidth = this.width / 2;
        
        // Left boundary
        if (this.position.x - halfWidth < this.bounds.left) {
            this.position.x = this.bounds.left + halfWidth;
            this.velocity.x = Math.max(0, this.velocity.x);
        }
        
        // Right boundary
        if (this.position.x + halfWidth > this.bounds.right) {
            this.position.x = this.bounds.right - halfWidth;
            this.velocity.x = Math.min(0, this.velocity.x);
        }
        
        // Top boundary
        if (this.position.y - this.height / 2 < this.bounds.top) {
            this.position.y = this.bounds.top + this.height / 2;
            this.velocity.y = Math.max(0, this.velocity.y);
        }
        
        // Bottom boundary
        if (this.position.y + this.height / 2 > this.bounds.bottom) {
            this.position.y = this.bounds.bottom - this.height / 2;
            this.velocity.y = Math.min(0, this.velocity.y);
        }
    }

    /**
     * Update projectiles
     * @param {number} deltaSeconds - Time elapsed in seconds
     * @private
     */
    _updateProjectiles(deltaSeconds) {
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.y -= Player.CONFIG.PROJECTILE_SPEED * deltaSeconds;
            return projectile.y > -50; // Remove off-screen projectiles
        });
    }

    /**
     * Shoot a projectile
     * @returns {boolean} True if shot was fired, false if on cooldown
     */
    shoot() {
        if (!this.canShoot || !this.isAlive) {
            return false;
        }

        try {
            // Create projectile
            const projectile = {
                x: this.position.x,
                y: this.position.y - this.height / 2,
                width: 4,
                height: 12,
                speed: Player.CONFIG.PROJECTILE_SPEED,
                damage: 25,
                owner: 'player',
                id: `player_projectile_${Date.now()}_${Math.random()}`
            };

            this.projectiles.push(projectile);

            // Update shooting state
            this.canShoot = false;
            this.lastShotTime = performance.now();
            this.state = Player.STATES.SHOOTING;

            // Trigger visual effects
            this.visualEffects.shootFlash.active = true;
            this.visualEffects.shootFlash.timer = Player.CONFIG.SHOOT_FLASH_DURATION;

            // Emit events
            this._emit('player:shoot', { projectile, position: { ...this.position } });
            this._emit('projectile:created', projectile);

            this._log('Player shot fired', { projectileId: projectile.id });
            return true;

        } catch (error) {
            this._handleError('Shoot error', error);
            return false;
        }
    }

    /**
     * Take damage
     * @param {number} damage - Amount of damage to take
     * @param {Object} source - Source of damage
     * @returns {boolean} True if damage was applied, false if invulnerable
     */
    takeDamage(damage, source = {}) {
        if (!this.isAlive || this.isInvulnerable) {
            return false;
        }

        try {
            // Validate damage
            if (typeof damage !== 'number' || damage < 0) {
                throw new Error('Invalid damage amount');
            }

            // Apply damage
            this.health = Math.max(0, this.health - damage);
            this.state = Player.STATES.DAMAGED;

            // Trigger visual effects
            this.visualEffects.damageFlash.active = true;
            this.visualEffects.damageFlash.timer = Player.CONFIG.DAMAGE_FLASH_DURATION;

            // Check if destroyed
            if (this.health <= 0) {
                this.state = Player.STATES.DESTROYED;
                this.isAlive = false;
            }

            // Emit events
            this._emit('player:damage_taken', { 
                damage, 
                health: this.health, 
                source,
                isDestroyed: !this.isAlive 
            });

            this._log('Player took damage', { 
                damage, 
                remainingHealth: this.health, 
                source: source.type || 'unknown' 
            });

            return true;

        } catch (error) {
            this._handleError('Take damage error', error);
            return false;
        }
    }

    /**
     * Heal the player
     * @param {number} amount - Amount to heal
     * @returns {number} Actual amount healed
     */
    heal(amount) {
        if (!this.isAlive) return 0;

        try {
            if (typeof amount !== 'number' || amount < 0) {
                throw new Error('Invalid heal amount');
            }

            const oldHealth = this.health;
            this.health = Math.min(this.maxHealth, this.health + amount);
            const actualHealed = this.health - oldHealth;

            if (actualHealed > 0) {
                this._emit('player:healed', { amount: actualHealed, health: this.health });
                this._log('Player healed', { amount: actualHealed, health: this.health });
            }

            return actualHealed;

        } catch (error) {
            this._handleError('Heal error', error);
            return 0;
        }
    }

    /**
     * Set player boundaries
     * @param {Object} bounds - Boundary object with left, right, top, bottom
     */
    setBounds(bounds) {
        if (!bounds || typeof bounds !== 'object') {
            throw new Error('Invalid bounds object');
        }

        const requiredProps = ['left', 'right', 'top', 'bottom'];
        for (const prop of requiredProps) {
            if (typeof bounds[prop] !== 'number') {
                throw new Error(`Bounds must have numeric ${prop} property`);
            }
        }

        this.bounds = { ...bounds };
        this._log('Player bounds set', bounds);
    }

    /**
     * Get collision bounds
     * @returns {Object} Collision bounds object
     */
    getCollisionBounds() {
        return {
            x: this.position.x - this.collisionRadius,
            y: this.position.y - this.collisionRadius,
            width: this.collisionRadius * 2,
            height: this.collisionRadius * 2,
            centerX: this.position.x,
            centerY: this.position.y,
            radius: this.collisionRadius
        };
    }

    /**
     * Check collision with another entity
     * @param {Object} entity - Entity to check collision with
     * @returns {boolean} True if collision detected
     */
    checkCollision(entity) {
        if (!entity || !this.isAlive) return false;

        try {
            const dx = this.position.x - entity.x;
            const dy = this.position.y - entity.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.collisionRadius + (entity.radius || entity.width / 2);

            return distance < minDistance;

        } catch (error) {
            this._handleError('Collision check error', error);
            return false;
        }
    }

    /**
     * Render the player
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} camera - Camera object for viewport transformation
     */
    render(ctx, camera = {}) {
        if (!ctx || !this.isAlive) return;

        try {
            ctx.save();

            // Apply camera transformation
            const renderX = this.position.x - (camera.x || 0);
            const renderY = this.position.y - (camera.y || 0);

            // Apply visual effects
            this._applyVisualEffects(ctx);

            // Render player sprite or fallback rectangle
            if (this.sprite.current) {
                ctx.drawImage(
                    this.sprite.current,
                    renderX - this.width / 2,
                    renderY - this.height / 2,
                    this.width,
                    this.height
                );
            } else {
                // Fallback rendering
                ctx.fillStyle = this._getPlayerColor();
                ctx.fillRect(
                    renderX - this.width / 2,
                    renderY - this.height / 2,
                    this.width,
                    this.height
                );
            }

            // Render health bar
            this._renderHealthBar(ctx, renderX, renderY);

            // Render projectiles
            this._renderProjectiles(ctx, camera);

            // Debug rendering
            if (this.gameConfig.debug) {
                this._renderDebugInfo(ctx, renderX, renderY);
            }

            ctx.restore();

        } catch (error) {
            this._handleError('Render error', error);
        }
    }

    /**
     * Apply visual effects to rendering context
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @private
     */
    _applyVisualEffects(ctx) {
        // Damage flash effect
        if (this.visualEffects.damageFlash.active) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
        }

        // Invulnerability flash effect
        if (this.visualEffects.invulnerabilityFlash.active) {
            ctx.globalAlpha = 0.5;
        }

        // Shoot flash effect
        if (this.visualEffects.shootFlash.active) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
        }
    }

    /**
     * Get player color based on state
     * @returns {string} CSS color string
     * @private
     */
    _getPlayerColor() {
        if (this.visualEffects.damageFlash.active) return '#ff4444';
        if (this.visualEffects.shootFlash.active) return '#44ffff';
        if (this.isInvulnerable) return '#ffff44';
        return '#4444ff';
    }

    /**
     * Render health bar
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - Render x position
     * @param {number} y - Render y position
     * @private
     */
    _renderHealthBar(ctx, x, y) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = y - this.height / 2 - 10;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

        // Health bar
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        ctx.fillStyle = healthPercent > 0.6 ? '#44ff44' : 
                       healthPercent > 0.3 ? '#ffff44' : '#ff4444';
        ctx.fillRect(x - barWidth / 2, barY, healthWidth, barHeight);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth / 2, barY, barWidth, barHeight);
    }

    /**
     * Render projectiles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} camera - Camera object
     * @private
     */
    _renderProjectiles(ctx, camera) {
        ctx.fillStyle = '#00ffff';
        this.projectiles.forEach(projectile => {
            const renderX = projectile.x - (camera.x || 0);
            const renderY = projectile.y - (camera.y || 0);
            
            ctx.fillRect(
                renderX - projectile.width / 2,
                renderY - projectile.height / 2,
                projectile.width,
                projectile.height
            );
        });
    }

    /**
     * Render debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - Render x position
     * @param {number} y - Render y position
     * @private
     */
    _renderDebugInfo(ctx, x, y) {
        // Collision radius
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, this.collisionRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Velocity vector
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.velocity.x * 0.1, y + this.velocity.y * 0.1);
        ctx.stroke();

        // Debug text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(`Health: ${this.health}`, x + 30, y - 20);
        ctx.fillText(`State: ${this.state}`, x + 30, y - 5);
        ctx.fillText(`Vel: ${Math.round(this.velocity.x)}`, x + 30, y + 10);
    }

    /**
     * Handle keyboard key down events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyDown(event) {
        if (!this.isAlive) return;

        this.activeInputType = Player.INPUT_TYPES.KEYBOARD;

        switch (event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.inputState.left = true;
                event.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.inputState.right = true;
                event.preventDefault();
                break;
            case 'Space':
            case 'Enter':
                this.inputState.shoot = true;
                event.preventDefault();
                break;
        }
    }

    /**
     * Handle keyboard key up events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyUp(event) {
        switch (event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.inputState.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.inputState.right = false;
                break;
            case 'Space':
            case 'Enter':
                this.inputState.shoot = false;
                break;
        }
    }

    /**
     * Handle touch start events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchStart(event) {
        if (!this.isAlive) return;

        event.preventDefault();
        this.activeInputType = Player.INPUT_TYPES.TOUCH;

        const touch = event.touches[0];
        if (touch) {
            this.inputState.touch.active = true;
            this.inputState.touch.startX = touch.clientX;
            this.inputState.touch.currentX = touch.clientX;

            // Check for shoot gesture (tap in upper area)
            if (touch.clientY < window.innerHeight * 0.3) {
                this.inputState.shoot = true;
            }
        }
    }

    /**
     * Handle touch move events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchMove(event) {
        if (!this.inputState.touch.active) return;

        event.preventDefault();
        const touch = event.touches[0];
        if (touch) {
            this.inputState.touch.currentX = touch.clientX;
        }
    }

    /**
     * Handle touch end events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchEnd(event) {
        this.inputState.touch.active = false;
        this.inputState.shoot = false;
    }

    /**
     * Get player state for serialization
     * @returns {Object} Serializable player state
     */
    getState() {
        return {
            position: { ...this.position },
            velocity: { ...this.velocity },
            health: this.health,
            maxHealth: this.maxHealth,
            state: this.state,
            isAlive: this.isAlive,
            isInvulnerable: this.isInvulnerable,
            canShoot: this.canShoot,
            projectileCount: this.projectiles.length,
            frameCount: this.frameCount
        };
    }

    /**
     * Restore player state from serialized data
     * @param {Object} state - Serialized player state
     */
    setState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }

        try {
            if (state.position) {
                this.position = { ...state.position };
            }
            if (state.velocity) {
                this.velocity = { ...state.velocity };
            }
            if (typeof state.health === 'number') {
                this.health = state.health;
            }
            if (typeof state.maxHealth === 'number') {
                this.maxHealth = state.maxHealth;
            }
            if (state.state) {
                this.state = state.state;
            }
            if (typeof state.isAlive === 'boolean') {
                this.isAlive = state.isAlive;
            }
            if (typeof state.isInvulnerable === 'boolean') {
                this.isInvulnerable = state.isInvulnerable;
            }

            this._log('Player state restored', state);

        } catch (error) {
            this._handleError('Set state error', error);
        }
    }

    /**
     * Reset player to initial state
     * @param {number} x - Reset x position
     * @param {number} y - Reset y position
     */
    reset(x = this.position.x, y = this.position.y) {
        try {
            // Reset position and movement
            this.position = { x, y };
            this.velocity = { x: 0, y: 0 };
            this.acceleration = { x: 0, y: 0 };

            // Reset health and state
            this.health = this.maxHealth;
            this.state = Player.STATES.NORMAL;
            this.isAlive = true;
            this.isInvulnerable = false;

            // Reset shooting
            this.canShoot = true;
            this.projectiles = [];

            // Reset input
            this.inputState = {
                left: false,
                right: false,
                shoot: false,
                touch: { active: false, startX: 0, currentX: 0 }
            };

            // Reset visual effects
            Object.keys(this.visualEffects).forEach(effect => {
                this.visualEffects[effect].active = false;
                this.visualEffects[effect].timer = 0;
            });

            // Reset timers
            this.invulnerabilityTimer = 0;
            this.stateTimer = 0;
            this.frameCount = 0;

            this._emit('player:reset', { position: { x, y } });
            this._log('Player reset', { x, y });

        } catch (error) {
            this._handleError('Reset error', error);
        }
    }

    /**
     * Clean up resources and remove event listeners
     */
    destroy() {
        try {
            // Remove event listeners
            if (typeof document !== 'undefined') {
                document.removeEventListener('keydown', this.keydownHandler);
                document.removeEventListener('keyup', this.keyupHandler);
                document.removeEventListener('touchstart', this.touchstartHandler);
                document.removeEventListener('touchmove', this.touchmoveHandler);
                document.removeEventListener('touchend', this.touchendHandler);
            }

            // Clear projectiles
            this.projectiles = [];

            // Clear references
            this.eventEmitter = null;
            this.sprite = null;

            this._emit('player:destroyed');
            this._log('Player destroyed');

        } catch (error) {
            this._handleError('Destroy error', error);
        }
    }

    /**
     * Emit an event through the event emitter
     * @param {string} eventName - Name of the event
     * @param {*} data - Event data
     * @private
     */
    _emit(eventName, data = null) {
        if (this.eventEmitter && typeof this.eventEmitter.emit === 'function') {
            try {
                this.eventEmitter.emit(eventName, data);
            } catch (error) {
                console.error('Event emission error:', error);
            }
        }
    }

    /**
     * Log a message with context
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     * @private
     */
    _log(message, context = {}) {
        if (this.gameConfig.debug) {
            console.log(`[Player] ${message}`, {
                timestamp: new Date().toISOString(),
                playerId: this.id || 'unknown',
                ...context
            });
        }
    }

    /**
     * Handle errors with logging and recovery
     * @param {string} operation - Operation that failed
     * @param {Error} error - Error object
     * @private
     */
    _handleError(operation, error) {
        const errorInfo = {
            operation,
            error: error.message,
            stack: error.stack,
            playerState: this.getState(),
            timestamp: new Date().toISOString()
        };

        console.error(`[Player] ${operation}:`, errorInfo);

        // Emit error event
        this._emit('player:error', errorInfo);

        // Attempt recovery for critical errors
        if (operation.includes('Update') || operation.includes('Render')) {
            // Reset to safe state
            this.velocity = { x: 0, y: 0 };
            this.acceleration = { x: 0, y: 0 };
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.Player = Player;
}