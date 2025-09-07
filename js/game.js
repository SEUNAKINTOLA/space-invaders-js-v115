/**
 * Main Game Class - Space Invaders JS V115
 * Manages game state, player entity, input systems, and game loop
 */
class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Initialize game systems
        this.inputManager = new InputManager();
        this.player = new Player(this.canvas.width / 2, this.canvas.height - 60);
        this.projectiles = [];
        
        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup canvas and event listeners
        this.setupCanvas();
        this.setupEventListeners();
        
        // Initialize input system
        this.inputManager.initialize(this.canvas);
    }
    
    /**
     * Setup canvas properties and responsive sizing
     */
    setupCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth - 20);
        this.canvas.height = Math.min(600, window.innerHeight - 20);
        this.ctx.imageSmoothingEnabled = false;
    }
    
    /**
     * Setup event listeners for window resize
     */
    setupEventListeners() {
        window.addEventListener('resize', this.handleResize);
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        this.setupCanvas();
        // Update player boundaries
        this.player.setBoundaries(0, this.canvas.width, 0, this.canvas.height);
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            requestAnimationFrame(this.gameLoop);
        }
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Main game loop with frame rate control
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastFrameTime;
        
        if (deltaTime >= this.frameInterval) {
            this.update(deltaTime);
            this.render();
            this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
        }
        
        requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Update game state
     */
    update(deltaTime) {
        // Update input state
        this.inputManager.update();
        
        // Handle player input
        this.handlePlayerInput();
        
        // Update player
        this.player.update(deltaTime);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Handle player shooting
        if (this.inputManager.isActionPressed('shoot') && this.player.canShoot()) {
            const projectile = this.player.shoot();
            if (projectile) {
                this.projectiles.push(projectile);
            }
        }
    }
    
    /**
     * Handle player input for movement
     */
    handlePlayerInput() {
        let moveDirection = 0;
        
        if (this.inputManager.isActionPressed('moveLeft')) {
            moveDirection -= 1;
        }
        if (this.inputManager.isActionPressed('moveRight')) {
            moveDirection += 1;
        }
        
        this.player.setMoveDirection(moveDirection);
    }
    
    /**
     * Update all projectiles
     */
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            // Remove projectiles that are off-screen
            if (projectile.y < -10 || projectile.y > this.canvas.height + 10) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render all game objects
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render player
        this.player.render(this.ctx);
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(this.ctx);
        });
        
        // Render touch controls on mobile
        if (this.inputManager.touchControls) {
            this.inputManager.touchControls.render(this.ctx);
        }
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        this.inputManager.destroy();
        window.removeEventListener('resize', this.handleResize);
    }
}

/**
 * Player Entity Class
 * Handles player spaceship rendering, movement, and shooting
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.speed = 300; // pixels per second
        this.moveDirection = 0; // -1 left, 0 stop, 1 right
        
        // Shooting properties
        this.shootCooldown = 200; // milliseconds
        this.lastShotTime = 0;
        
        // Boundaries
        this.minX = 0;
        this.maxX = 800;
        this.minY = 0;
        this.maxY = 600;
        
        // Visual properties
        this.color = '#00ff00';
        this.thrusterColor = '#ff4400';
        this.showThrusters = false;
    }
    
    /**
     * Set movement boundaries
     */
    setBoundaries(minX, maxX, minY, maxY) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
    }
    
    /**
     * Set movement direction
     */
    setMoveDirection(direction) {
        this.moveDirection = Math.max(-1, Math.min(1, direction));
        this.showThrusters = Math.abs(direction) > 0;
    }
    
    /**
     * Update player position and state
     */
    update(deltaTime) {
        // Update position based on movement direction
        if (this.moveDirection !== 0) {
            this.x += this.moveDirection * this.speed * (deltaTime / 1000);
            
            // Keep player within boundaries
            this.x = Math.max(this.minX + this.width / 2, 
                            Math.min(this.maxX - this.width / 2, this.x));
        }
    }
    
    /**
     * Check if player can shoot
     */
    canShoot() {
        const currentTime = Date.now();
        return currentTime - this.lastShotTime >= this.shootCooldown;
    }
    
    /**
     * Create a projectile
     */
    shoot() {
        if (!this.canShoot()) return null;
        
        this.lastShotTime = Date.now();
        return new Projectile(this.x, this.y - this.height / 2, 0, -500, 'player');
    }
    
    /**
     * Render player spaceship
     */
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw main body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(-this.width / 4, this.height / 3);
        ctx.lineTo(this.width / 4, this.height / 3);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw cockpit
        ctx.fillStyle = '#0088ff';
        ctx.beginPath();
        ctx.arc(0, -this.height / 4, this.width / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw thrusters when moving
        if (this.showThrusters) {
            ctx.fillStyle = this.thrusterColor;
            ctx.beginPath();
            ctx.moveTo(-this.width / 4, this.height / 3);
            ctx.lineTo(-this.width / 6, this.height / 2 + 8);
            ctx.lineTo(-this.width / 8, this.height / 3);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(this.width / 4, this.height / 3);
            ctx.lineTo(this.width / 6, this.height / 2 + 8);
            ctx.lineTo(this.width / 8, this.height / 3);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}

/**
 * Projectile Class
 * Handles projectile movement and rendering
 */
class Projectile {
    constructor(x, y, vx, vy, type = 'player') {
        this.x = x;
        this.y = y;
        this.vx = vx; // velocity x
        this.vy = vy; // velocity y
        this.type = type;
        this.width = 4;
        this.height = 12;
        this.color = type === 'player' ? '#ffff00' : '#ff0000';
    }
    
    /**
     * Update projectile position
     */
    update(deltaTime) {
        this.x += this.vx * (deltaTime / 1000);
        this.y += this.vy * (deltaTime / 1000);
    }
    
    /**
     * Render projectile
     */
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, 
                    this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, 
                    this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

/**
 * Input Manager Class
 * Handles keyboard and touch input with action mapping
 */
class InputManager {
    constructor() {
        this.keys = {};
        this.actions = {};
        this.touchControls = null;
        
        // Action mappings
        this.keyMappings = {
            'ArrowLeft': 'moveLeft',
            'KeyA': 'moveLeft',
            'ArrowRight': 'moveRight',
            'KeyD': 'moveRight',
            'Space': 'shoot',
            'KeyW': 'shoot',
            'ArrowUp': 'shoot'
        };
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }
    
    /**
     * Initialize input system
     */
    initialize(canvas) {
        // Setup keyboard events
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Setup touch controls for mobile
        if (this.isMobileDevice()) {
            this.touchControls = new TouchControls(canvas);
        }
    }
    
    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window);
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        // Prevent default for game keys
        if (this.keyMappings[event.code]) {
            event.preventDefault();
        }
        
        this.keys[event.code] = true;
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    /**
     * Update input state
     */
    update() {
        // Update action states based on key mappings
        for (const [key, action] of Object.entries(this.keyMappings)) {
            this.actions[action] = this.keys[key] || false;
        }
        
        // Update touch controls
        if (this.touchControls) {
            this.touchControls.update();
            
            // Merge touch input with actions
            const touchActions = this.touchControls.getActions();
            for (const [action, pressed] of Object.entries(touchActions)) {
                this.actions[action] = this.actions[action] || pressed;
            }
        }
    }
    
    /**
     * Check if action is currently pressed
     */
    isActionPressed(action) {
        return this.actions[action] || false;
    }
    
    /**
     * Cleanup input system
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        if (this.touchControls) {
            this.touchControls.destroy();
        }
    }
}

/**
 * Touch Controls Class
 * Provides virtual buttons for mobile devices
 */
class TouchControls {
    constructor(canvas) {
        this.canvas = canvas;
        this.buttons = {};
        this.touches = {};
        
        // Button configurations
        this.buttonConfig = {
            moveLeft: { x: 60, y: canvas.height - 80, width: 60, height: 60, label: '←' },
            moveRight: { x: 140, y: canvas.height - 80, width: 60, height: 60, label: '→' },
            shoot: { x: canvas.width - 80, y: canvas.height - 80, width: 60, height: 60, label: '●' }
        };
        
        // Initialize buttons
        for (const [action, config] of Object.entries(this.buttonConfig)) {
            this.buttons[action] = { ...config, pressed: false };
        }
        
        // Bind touch events
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        this.setupTouchEvents();
    }
    
    /**
     * Setup touch event listeners
     */
    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
    
    /**
     * Handle touch start events
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        
        for (const touch of event.changedTouches) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Check which button was touched
            for (const [action, button] of Object.entries(this.buttons)) {
                if (this.isPointInButton(x, y, button)) {
                    button.pressed = true;
                    this.touches[touch.identifier] = action;
                    break;
                }
            }
        }
    }
    
    /**
     * Handle touch move events
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        
        for (const touch of event.changedTouches) {
            const touchAction = this.touches[touch.identifier];
            if (!touchAction) continue;
            
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const button = this.buttons[touchAction];
            
            // Update button state based on touch position
            button.pressed = this.isPointInButton(x, y, button);
        }
    }
    
    /**
     * Handle touch end events
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        for (const touch of event.changedTouches) {
            const touchAction = this.touches[touch.identifier];
            if (touchAction) {
                this.buttons[touchAction].pressed = false;
                delete this.touches[touch.identifier];
            }
        }
    }
    
    /**
     * Check if point is within button bounds
     */
    isPointInButton(x, y, button) {
        return x >= button.x && x <= button.x + button.width &&
               y >= button.y && y <= button.y + button.height;
    }
    
    /**
     * Update touch controls state
     */
    update() {
        // Touch state is updated in event handlers
    }
    
    /**
     * Get current action states
     */
    getActions() {
        const actions = {};
        for (const [action, button] of Object.entries(this.buttons)) {
            actions[action] = button.pressed;
        }
        return actions;
    }
    
    /**
     * Render touch control buttons
     */
    render(ctx) {
        ctx.save();
        
        for (const [action, button] of Object.entries(this.buttons)) {
            // Button background
            ctx.fillStyle = button.pressed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(button.x, button.y, button.width, button.height);
            
            // Button border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(button.x, button.y, button.width, button.height);
            
            // Button label
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.label, 
                        button.x + button.width / 2, 
                        button.y + button.height / 2);
        }
        
        ctx.restore();
    }
    
    /**
     * Cleanup touch controls
     */
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

// Export for module systems or make globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, Player, Projectile, InputManager, TouchControls };
} else {
    window.Game = Game;
    window.Player = Player;
    window.Projectile = Projectile;
    window.InputManager = InputManager;
    window.TouchControls = TouchControls;
}