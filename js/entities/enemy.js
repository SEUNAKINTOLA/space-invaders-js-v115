/**
 * Enemy Entity System
 * 
 * Comprehensive enemy management system for Space Invaders featuring:
 * - Multiple enemy types with unique behaviors
 * - Formation movement patterns and AI
 * - Collision detection and response
 * - Progressive difficulty scaling
 * - Performance-optimized rendering
 * 
 * Architecture:
 * - Entity-Component pattern for flexibility
 * - State machine for behavior management
 * - Observer pattern for event handling
 * - Object pooling for performance
 * 
 * @module Enemy
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Enemy type definitions with unique characteristics
 */
const ENEMY_TYPES = {
    SCOUT: {
        id: 'scout',
        health: 1,
        speed: 2.0,
        points: 10,
        width: 32,
        height: 24,
        color: '#00ff00',
        fireRate: 0.02,
        movementPattern: 'zigzag'
    },
    FIGHTER: {
        id: 'fighter',
        health: 2,
        speed: 1.5,
        points: 20,
        width: 36,
        height: 28,
        color: '#ffff00',
        fireRate: 0.015,
        movementPattern: 'formation'
    },
    TANK: {
        id: 'tank',
        health: 3,
        speed: 1.0,
        points: 30,
        width: 40,
        height: 32,
        color: '#ff0000',
        fireRate: 0.01,
        movementPattern: 'steady'
    },
    BOSS: {
        id: 'boss',
        health: 10,
        speed: 0.8,
        points: 100,
        width: 64,
        height: 48,
        color: '#ff00ff',
        fireRate: 0.03,
        movementPattern: 'boss'
    }
};

/**
 * Movement pattern definitions
 */
const MOVEMENT_PATTERNS = {
    zigzag: {
        amplitude: 50,
        frequency: 0.02,
        verticalSpeed: 0.5
    },
    formation: {
        spacing: 60,
        cohesion: 0.1,
        separation: 30
    },
    steady: {
        verticalSpeed: 0.3,
        horizontalDrift: 0.1
    },
    boss: {
        phases: ['enter', 'attack', 'retreat'],
        phaseTimer: 0,
        phaseDuration: 180
    }
};

/**
 * Enemy states for behavior management
 */
const ENEMY_STATES = {
    SPAWNING: 'spawning',
    ACTIVE: 'active',
    ATTACKING: 'attacking',
    DAMAGED: 'damaged',
    DYING: 'dying',
    DEAD: 'dead'
};

/**
 * Main Enemy class implementing entity-component architecture
 */
class Enemy {
    /**
     * Creates a new enemy instance
     * @param {Object} config - Enemy configuration
     * @param {string} config.type - Enemy type from ENEMY_TYPES
     * @param {number} config.x - Initial X position
     * @param {number} config.y - Initial Y position
     * @param {Object} config.waveData - Wave-specific data
     * @param {number} config.id - Unique enemy identifier
     */
    constructor(config = {}) {
        // Validate required parameters
        this._validateConfig(config);
        
        // Core properties
        this.id = config.id || this._generateId();
        this.type = config.type || 'SCOUT';
        this.typeData = ENEMY_TYPES[this.type];
        
        if (!this.typeData) {
            throw new Error(`Invalid enemy type: ${this.type}`);
        }
        
        // Position and movement
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        
        // Health and combat
        this.health = this.typeData.health;
        this.maxHealth = this.typeData.health;
        this.damage = 1;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        
        // State management
        this.state = ENEMY_STATES.SPAWNING;
        this.stateTimer = 0;
        this.age = 0;
        
        // Movement pattern data
        this.movementData = this._initializeMovementData();
        this.formationIndex = config.formationIndex || 0;
        this.waveData = config.waveData || {};
        
        // Combat properties
        this.lastFireTime = 0;
        this.fireRate = this.typeData.fireRate;
        this.canFire = true;
        
        // Visual properties
        this.width = this.typeData.width;
        this.height = this.typeData.height;
        this.color = this.typeData.color;
        this.alpha = 1.0;
        this.rotation = 0;
        this.scale = 1.0;
        
        // Animation properties
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.1;
        
        // Collision bounds (optimized for performance)
        this.bounds = {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
        
        // Event callbacks
        this.onDestroy = null;
        this.onDamage = null;
        this.onFire = null;
        
        // Performance tracking
        this.lastUpdateTime = performance.now();
        this.updateCount = 0;
        
        // Initialize spawn animation
        this._initializeSpawnAnimation();
        
        console.log(`Enemy created: ${this.type} at (${this.x}, ${this.y})`);
    }
    
    /**
     * Validates enemy configuration
     * @private
     */
    _validateConfig(config) {
        if (typeof config !== 'object') {
            throw new Error('Enemy config must be an object');
        }
        
        if (config.type && !ENEMY_TYPES[config.type]) {
            throw new Error(`Invalid enemy type: ${config.type}`);
        }
        
        if (config.x !== undefined && (typeof config.x !== 'number' || !isFinite(config.x))) {
            throw new Error('Enemy x position must be a finite number');
        }
        
        if (config.y !== undefined && (typeof config.y !== 'number' || !isFinite(config.y))) {
            throw new Error('Enemy y position must be a finite number');
        }
    }
    
    /**
     * Generates unique enemy ID
     * @private
     */
    _generateId() {
        return `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Initializes movement pattern data
     * @private
     */
    _initializeMovementData() {
        const pattern = MOVEMENT_PATTERNS[this.typeData.movementPattern];
        if (!pattern) {
            console.warn(`Unknown movement pattern: ${this.typeData.movementPattern}`);
            return {};
        }
        
        return {
            ...pattern,
            timer: 0,
            phase: 0,
            initialX: this.x,
            initialY: this.y
        };
    }
    
    /**
     * Initializes spawn animation
     * @private
     */
    _initializeSpawnAnimation() {
        this.scale = 0.1;
        this.alpha = 0.5;
        this.y -= 50; // Start above target position
    }
    
    /**
     * Updates enemy state and behavior
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Object} gameState - Current game state
     */
    update(deltaTime, gameState = {}) {
        try {
            this.age += deltaTime;
            this.stateTimer += deltaTime;
            this.updateCount++;
            
            // Update state machine
            this._updateState(deltaTime, gameState);
            
            // Update movement based on current state
            if (this.state === ENEMY_STATES.ACTIVE || this.state === ENEMY_STATES.ATTACKING) {
                this._updateMovement(deltaTime, gameState);
            }
            
            // Update combat behavior
            this._updateCombat(deltaTime, gameState);
            
            // Update visual effects
            this._updateVisuals(deltaTime);
            
            // Update collision bounds
            this._updateBounds();
            
            // Handle invulnerability
            if (this.isInvulnerable) {
                this.invulnerabilityTimer -= deltaTime;
                if (this.invulnerabilityTimer <= 0) {
                    this.isInvulnerable = false;
                }
            }
            
            this.lastUpdateTime = performance.now();
            
        } catch (error) {
            console.error(`Error updating enemy ${this.id}:`, error);
            this.state = ENEMY_STATES.DEAD;
        }
    }
    
    /**
     * Updates enemy state machine
     * @private
     */
    _updateState(deltaTime, gameState) {
        switch (this.state) {
            case ENEMY_STATES.SPAWNING:
                this._updateSpawning(deltaTime);
                break;
                
            case ENEMY_STATES.ACTIVE:
                this._updateActive(deltaTime, gameState);
                break;
                
            case ENEMY_STATES.ATTACKING:
                this._updateAttacking(deltaTime, gameState);
                break;
                
            case ENEMY_STATES.DAMAGED:
                this._updateDamaged(deltaTime);
                break;
                
            case ENEMY_STATES.DYING:
                this._updateDying(deltaTime);
                break;
        }
    }
    
    /**
     * Updates spawning state
     * @private
     */
    _updateSpawning(deltaTime) {
        const spawnDuration = 60; // frames
        const progress = Math.min(this.stateTimer / spawnDuration, 1);
        
        // Animate scale and alpha
        this.scale = 0.1 + (0.9 * progress);
        this.alpha = 0.5 + (0.5 * progress);
        
        // Move to target position
        this.y += (this.movementData.initialY - this.y) * 0.1;
        
        if (progress >= 1) {
            this.state = ENEMY_STATES.ACTIVE;
            this.stateTimer = 0;
            this.scale = 1.0;
            this.alpha = 1.0;
        }
    }
    
    /**
     * Updates active state
     * @private
     */
    _updateActive(deltaTime, gameState) {
        // Check for attack conditions
        if (this._shouldAttack(gameState)) {
            this.state = ENEMY_STATES.ATTACKING;
            this.stateTimer = 0;
        }
    }
    
    /**
     * Updates attacking state
     * @private
     */
    _updateAttacking(deltaTime, gameState) {
        const attackDuration = 120; // frames
        
        if (this.stateTimer >= attackDuration) {
            this.state = ENEMY_STATES.ACTIVE;
            this.stateTimer = 0;
        }
    }
    
    /**
     * Updates damaged state
     * @private
     */
    _updateDamaged(deltaTime) {
        const damageDuration = 30; // frames
        
        // Flash effect
        this.alpha = 0.5 + 0.5 * Math.sin(this.stateTimer * 0.5);
        
        if (this.stateTimer >= damageDuration) {
            this.state = ENEMY_STATES.ACTIVE;
            this.stateTimer = 0;
            this.alpha = 1.0;
        }
    }
    
    /**
     * Updates dying state
     * @private
     */
    _updateDying(deltaTime) {
        const deathDuration = 60; // frames
        const progress = this.stateTimer / deathDuration;
        
        // Death animation
        this.scale = 1.0 + (progress * 0.5);
        this.alpha = 1.0 - progress;
        this.rotation += 0.1;
        
        if (progress >= 1) {
            this.state = ENEMY_STATES.DEAD;
            this._triggerDestroyCallback();
        }
    }
    
    /**
     * Updates enemy movement based on pattern
     * @private
     */
    _updateMovement(deltaTime, gameState) {
        this.movementData.timer += deltaTime;
        
        switch (this.typeData.movementPattern) {
            case 'zigzag':
                this._updateZigzagMovement(deltaTime);
                break;
                
            case 'formation':
                this._updateFormationMovement(deltaTime, gameState);
                break;
                
            case 'steady':
                this._updateSteadyMovement(deltaTime);
                break;
                
            case 'boss':
                this._updateBossMovement(deltaTime, gameState);
                break;
                
            default:
                this._updateDefaultMovement(deltaTime);
        }
        
        // Apply velocity
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Clamp to screen bounds with margin
        const margin = this.width;
        this.x = Math.max(margin, Math.min(gameState.screenWidth - margin, this.x));
    }
    
    /**
     * Updates zigzag movement pattern
     * @private
     */
    _updateZigzagMovement(deltaTime) {
        const pattern = this.movementData;
        const amplitude = MOVEMENT_PATTERNS.zigzag.amplitude;
        const frequency = MOVEMENT_PATTERNS.zigzag.frequency;
        
        this.velocityX = amplitude * Math.cos(pattern.timer * frequency) * frequency;
        this.velocityY = this.typeData.speed * MOVEMENT_PATTERNS.zigzag.verticalSpeed;
    }
    
    /**
     * Updates formation movement pattern
     * @private
     */
    _updateFormationMovement(deltaTime, gameState) {
        const formation = MOVEMENT_PATTERNS.formation;
        const enemies = gameState.enemies || [];
        
        // Calculate formation center
        let centerX = 0, centerY = 0, count = 0;
        enemies.forEach(enemy => {
            if (enemy.typeData.movementPattern === 'formation' && enemy.state === ENEMY_STATES.ACTIVE) {
                centerX += enemy.x;
                centerY += enemy.y;
                count++;
            }
        });
        
        if (count > 0) {
            centerX /= count;
            centerY /= count;
            
            // Cohesion: move toward formation center
            const cohesionX = (centerX - this.x) * formation.cohesion;
            const cohesionY = (centerY - this.y) * formation.cohesion;
            
            // Separation: avoid crowding
            let separationX = 0, separationY = 0;
            enemies.forEach(enemy => {
                if (enemy !== this && enemy.typeData.movementPattern === 'formation') {
                    const dx = this.x - enemy.x;
                    const dy = this.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < formation.separation && distance > 0) {
                        separationX += dx / distance;
                        separationY += dy / distance;
                    }
                }
            });
            
            this.velocityX = cohesionX + separationX * 0.5;
            this.velocityY = cohesionY + separationY * 0.5 + this.typeData.speed * 0.3;
        } else {
            this.velocityY = this.typeData.speed;
        }
    }
    
    /**
     * Updates steady movement pattern
     * @private
     */
    _updateSteadyMovement(deltaTime) {
        const pattern = MOVEMENT_PATTERNS.steady;
        
        this.velocityX = pattern.horizontalDrift * Math.sin(this.movementData.timer * 0.01);
        this.velocityY = this.typeData.speed * pattern.verticalSpeed;
    }
    
    /**
     * Updates boss movement pattern
     * @private
     */
    _updateBossMovement(deltaTime, gameState) {
        const pattern = this.movementData;
        const bossPattern = MOVEMENT_PATTERNS.boss;
        
        // Update phase timer
        pattern.phaseTimer += deltaTime;
        
        if (pattern.phaseTimer >= bossPattern.phaseDuration) {
            pattern.phase = (pattern.phase + 1) % bossPattern.phases.length;
            pattern.phaseTimer = 0;
        }
        
        const currentPhase = bossPattern.phases[pattern.phase];
        
        switch (currentPhase) {
            case 'enter':
                this.velocityY = this.typeData.speed;
                this.velocityX = 0;
                break;
                
            case 'attack':
                // Aggressive movement toward player
                if (gameState.player) {
                    const dx = gameState.player.x - this.x;
                    this.velocityX = Math.sign(dx) * this.typeData.speed * 0.5;
                }
                this.velocityY = this.typeData.speed * 0.2;
                break;
                
            case 'retreat':
                this.velocityY = -this.typeData.speed * 0.3;
                this.velocityX *= 0.9; // Slow down horizontal movement
                break;
        }
    }
    
    /**
     * Updates default movement pattern
     * @private
     */
    _updateDefaultMovement(deltaTime) {
        this.velocityY = this.typeData.speed;
        this.velocityX = 0;
    }
    
    /**
     * Updates combat behavior
     * @private
     */
    _updateCombat(deltaTime, gameState) {
        if (!this.canFire || this.state !== ENEMY_STATES.ACTIVE) {
            return;
        }
        
        // Check if enough time has passed since last shot
        const timeSinceLastFire = this.age - this.lastFireTime;
        const fireInterval = 1 / this.fireRate;
        
        if (timeSinceLastFire >= fireInterval) {
            // Determine if enemy should fire based on game state
            if (this._shouldFire(gameState)) {
                this._fire(gameState);
                this.lastFireTime = this.age;
            }
        }
    }
    
    /**
     * Determines if enemy should attack
     * @private
     */
    _shouldAttack(gameState) {
        if (!gameState.player) return false;
        
        const distanceToPlayer = Math.sqrt(
            Math.pow(this.x - gameState.player.x, 2) + 
            Math.pow(this.y - gameState.player.y, 2)
        );
        
        return distanceToPlayer < 200 && Math.random() < 0.01;
    }
    
    /**
     * Determines if enemy should fire
     * @private
     */
    _shouldFire(gameState) {
        if (!gameState.player) return false;
        
        // Basic firing logic - can be enhanced with AI
        const playerInRange = Math.abs(this.x - gameState.player.x) < 100;
        const randomChance = Math.random() < this.fireRate;
        
        return playerInRange && randomChance;
    }
    
    /**
     * Fires a projectile
     * @private
     */
    _fire(gameState) {
        if (this.onFire) {
            this.onFire({
                x: this.x,
                y: this.y + this.height / 2,
                velocityX: 0,
                velocityY: 3,
                damage: this.damage,
                owner: this
            });
        }
    }
    
    /**
     * Updates visual effects and animations
     * @private
     */
    _updateVisuals(deltaTime) {
        this.animationTimer += deltaTime;
        
        if (this.animationTimer >= this.animationSpeed) {
            this.animationFrame = (this.animationFrame + 1) % 4;
            this.animationTimer = 0;
        }
        
        // Subtle floating animation for active enemies
        if (this.state === ENEMY_STATES.ACTIVE) {
            this.y += Math.sin(this.age * 0.02) * 0.1;
        }
    }
    
    /**
     * Updates collision bounds for optimization
     * @private
     */
    _updateBounds() {
        const halfWidth = this.width * this.scale / 2;
        const halfHeight = this.height * this.scale / 2;
        
        this.bounds.left = this.x - halfWidth;
        this.bounds.right = this.x + halfWidth;
        this.bounds.top = this.y - halfHeight;
        this.bounds.bottom = this.y + halfHeight;
    }
    
    /**
     * Handles collision with projectile
     * @param {Object} projectile - Projectile that hit this enemy
     * @returns {boolean} True if enemy was destroyed
     */
    takeDamage(projectile) {
        if (this.isInvulnerable || this.state === ENEMY_STATES.DYING || this.state === ENEMY_STATES.DEAD) {
            return false;
        }
        
        try {
            const damage = projectile.damage || 1;
            this.health -= damage;
            
            // Trigger damage callback
            if (this.onDamage) {
                this.onDamage({
                    enemy: this,
                    projectile: projectile,
                    damage: damage,
                    remainingHealth: this.health
                });
            }
            
            if (this.health <= 0) {
                this._startDeathSequence();
                return true;
            } else {
                // Enter damaged state
                this.state = ENEMY_STATES.DAMAGED;
                this.stateTimer = 0;
                this.isInvulnerable = true;
                this.invulnerabilityTimer = 30; // Brief invulnerability
                
                // Knockback effect
                const knockbackForce = 5;
                const dx = this.x - projectile.x;
                const dy = this.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    this.velocityX += (dx / distance) * knockbackForce;
                    this.velocityY += (dy / distance) * knockbackForce;
                }
                
                return false;
            }
        } catch (error) {
            console.error(`Error handling damage for enemy ${this.id}:`, error);
            this._startDeathSequence();
            return true;
        }
    }
    
    /**
     * Starts the death sequence
     * @private
     */
    _startDeathSequence() {
        this.state = ENEMY_STATES.DYING;
        this.stateTimer = 0;
        this.canFire = false;
        
        console.log(`Enemy ${this.id} destroyed`);
    }
    
    /**
     * Triggers destroy callback
     * @private
     */
    _triggerDestroyCallback() {
        if (this.onDestroy) {
            this.onDestroy({
                enemy: this,
                points: this.typeData.points,
                position: { x: this.x, y: this.y },
                type: this.type
            });
        }
    }
    
    /**
     * Checks collision with another object
     * @param {Object} other - Object to check collision with
     * @returns {boolean} True if collision detected
     */
    checkCollision(other) {
        if (!other || !other.bounds) {
            return false;
        }
        
        return !(
            this.bounds.right < other.bounds.left ||
            this.bounds.left > other.bounds.right ||
            this.bounds.bottom < other.bounds.top ||
            this.bounds.top > other.bounds.bottom
        );
    }
    
    /**
     * Renders the enemy
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} camera - Camera transform data
     */
    render(ctx, camera = {}) {
        if (this.state === ENEMY_STATES.DEAD) {
            return;
        }
        
        try {
            ctx.save();
            
            // Apply camera transform
            const screenX = this.x - (camera.x || 0);
            const screenY = this.y - (camera.y || 0);
            
            // Apply transformations
            ctx.translate(screenX, screenY);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale);
            ctx.globalAlpha = this.alpha;
            
            // Render enemy based on type
            this._renderEnemySprite(ctx);
            
            // Render health bar for damaged enemies
            if (this.health < this.maxHealth && this.state !== ENEMY_STATES.DYING) {
                this._renderHealthBar(ctx);
            }
            
            // Debug rendering
            if (window.DEBUG_RENDER) {
                this._renderDebugInfo(ctx);
            }
            
            ctx.restore();
            
        } catch (error) {
            console.error(`Error rendering enemy ${this.id}:`, error);
        }
    }
    
    /**
     * Renders the enemy sprite
     * @private
     */
    _renderEnemySprite(ctx) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Simple geometric representation (can be replaced with sprites)
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // Add some detail based on enemy type
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        switch (this.type) {
            case 'SCOUT':
                // Triangle shape for scout
                ctx.beginPath();
                ctx.moveTo(0, -halfHeight);
                ctx.lineTo(-halfWidth * 0.7, halfHeight * 0.7);
                ctx.lineTo(halfWidth * 0.7, halfHeight * 0.7);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'FIGHTER':
                // Wing details
                ctx.fillRect(-halfWidth * 0.8, -halfHeight * 0.3, this.width * 0.2, this.height * 0.6);
                ctx.fillRect(halfWidth * 0.6, -halfHeight * 0.3, this.width * 0.2, this.height * 0.6);
                break;
                
            case 'TANK':
                // Armor plating
                ctx.fillRect(-halfWidth * 0.9, -halfHeight * 0.8, this.width * 1.8, this.height * 0.3);
                ctx.fillRect(-halfWidth * 0.9, halfHeight * 0.5, this.width * 1.8, this.height * 0.3);
                break;
                
            case 'BOSS':
                // Complex boss design
                ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
                ctx.fillRect(-halfWidth * 1.2, -halfHeight * 0.5, this.width * 2.4, this.height);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(-halfWidth * 0.3, -halfHeight * 0.8, this.width * 0.6, this.height * 0.3);
                break;
        }
        
        // Animation frame indicator
        if (this.animationFrame % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        }
    }
    
    /**
     * Renders health bar
     * @private
     */
    _renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = -this.height / 2 - 10;
        
        // Background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }
    
    /**
     * Renders debug information
     * @private
     */
    _renderDebugInfo(ctx) {
        // Collision bounds
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Center point
        ctx.fillStyle = 'red';
        ctx.fillRect(-2, -2, 4, 4);
        
        // State and info text
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.type}`, 0, -this.height / 2 - 20);
        ctx.fillText(`${this.state}`, 0, -this.height / 2 - 10);
        ctx.fillText(`HP: ${this.health}/${this.maxHealth}`, 0, this.height / 2 + 15);
    }
    
    /**
     * Checks if enemy is off screen and should be removed
     * @param {Object} screenBounds - Screen boundary information
     * @returns {boolean} True if enemy should be removed
     */
    isOffScreen(screenBounds) {
        const margin = Math.max(this.width, this.height);
        
        return (
            this.x < -margin ||
            this.x > screenBounds.width + margin ||
            this.y > screenBounds.height + margin ||
            (this.y < -margin && this.velocityY < 0)
        );
    }
    
    /**
     * Gets enemy status for serialization
     * @returns {Object} Enemy status object
     */
    getStatus() {
        return {
            id: this.id,
            type: this.type,
            position: { x: this.x, y: this.y },
            velocity: { x: this.velocityX, y: this.velocityY },
            health: this.health,
            maxHealth: this.maxHealth,
            state: this.state,
            age: this.age,
            bounds: { ...this.bounds }
        };
    }
    
    /**
     * Destroys the enemy and cleans up resources
     */
    destroy() {
        this.state = ENEMY_STATES.DEAD;
        this.onDestroy = null;
        this.onDamage = null;
        this.onFire = null;
        
        console.log(`Enemy ${this.id} destroyed and cleaned up`);
    }
}

/**
 * Enemy factory for creating different enemy types
 */
class EnemyFactory {
    /**
     * Creates an enemy of the specified type
     * @param {string} type - Enemy type
     * @param {Object} config - Additional configuration
     * @returns {Enemy} New enemy instance
     */
    static create(type, config = {}) {
        if (!ENEMY_TYPES[type]) {
            throw new Error(`Unknown enemy type: ${type}`);
        }
        
        return new Enemy({
            type: type,
            ...config
        });
    }
    
    /**
     * Creates a formation of enemies
     * @param {string} type - Enemy type
     * @param {Object} formationConfig - Formation configuration
     * @returns {Enemy[]} Array of enemies in formation
     */
    static createFormation(type, formationConfig = {}) {
        const {
            rows = 3,
            cols = 5,
            spacing = 60,
            startX = 100,
            startY = 50
        } = formationConfig;
        
        const enemies = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const enemy = this.create(type, {
                    x: startX + col * spacing,
                    y: startY + row * spacing,
                    formationIndex: row * cols + col,
                    ...formationConfig
                });
                
                enemies.push(enemy);
            }
        }
        
        return enemies;
    }
    
    /**
     * Gets available enemy types
     * @returns {string[]} Array of enemy type names
     */
    static getAvailableTypes() {
        return Object.keys(ENEMY_TYPES);
    }
}

// Export classes and constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Enemy,
        EnemyFactory,
        ENEMY_TYPES,
        MOVEMENT_PATTERNS,
        ENEMY_STATES
    };
} else if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
    window.EnemyFactory = EnemyFactory;
    window.ENEMY_TYPES = ENEMY_TYPES;
    window.MOVEMENT_PATTERNS = MOVEMENT_PATTERNS;
    window.ENEMY_STATES = ENEMY_STATES;
}