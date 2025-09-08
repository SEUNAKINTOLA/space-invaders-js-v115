/**
 * Space Invaders Game - Main Game Class
 * Implements enemy wave system with movement patterns, collision detection,
 * and progressive difficulty scaling
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Game state
        this.gameRunning = false;
        this.gameOver = false;
        this.score = 0;
        this.currentWave = 1;
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // Player
        this.player = {
            x: this.width / 2 - 25,
            y: this.height - 60,
            width: 50,
            height: 30,
            speed: 5,
            health: 3
        };
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        // Game systems
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.particles = [];
        
        // Enemy wave configuration
        this.waveConfig = {
            baseEnemyCount: 20,
            enemySpeedBase: 1,
            enemySpeedIncrement: 0.2,
            waveDelay: 2000,
            formationSpacing: 60
        };
        
        // Enemy movement
        this.enemyDirection = 1;
        this.enemyDropDistance = 40;
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 800;
        
        // Collision system
        this.collisionQuadTree = new QuadTree(0, 0, this.width, this.height);
        
        // Performance monitoring
        this.performanceMetrics = {
            frameTime: 0,
            updateTime: 0,
            renderTime: 0
        };
        
        this.initializeWave();
    }
    
    /**
     * Initialize input event listeners
     */
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    /**
     * Initialize a new enemy wave with formation patterns
     */
    initializeWave() {
        this.enemies = [];
        const enemyCount = this.waveConfig.baseEnemyCount + (this.currentWave - 1) * 5;
        const enemySpeed = this.waveConfig.enemySpeedBase + (this.currentWave - 1) * this.waveConfig.enemySpeedIncrement;
        
        // Create formation pattern
        const rows = Math.ceil(enemyCount / 10);
        const cols = Math.min(10, enemyCount);
        const startX = (this.width - (cols * this.waveConfig.formationSpacing)) / 2;
        const startY = 50;
        
        let enemyIndex = 0;
        for (let row = 0; row < rows && enemyIndex < enemyCount; row++) {
            for (let col = 0; col < cols && enemyIndex < enemyCount; col++) {
                const enemyType = this.getEnemyType(row);
                this.enemies.push({
                    id: `enemy_${enemyIndex}`,
                    x: startX + col * this.waveConfig.formationSpacing,
                    y: startY + row * 50,
                    width: 40,
                    height: 30,
                    speed: enemySpeed,
                    type: enemyType,
                    health: enemyType.health,
                    maxHealth: enemyType.health,
                    points: enemyType.points,
                    color: enemyType.color,
                    lastShot: 0,
                    shootInterval: enemyType.shootInterval,
                    destroyed: false
                });
                enemyIndex++;
            }
        }
        
        // Reset enemy movement
        this.enemyDirection = 1;
        this.enemyMoveTimer = 0;
    }
    
    /**
     * Get enemy type configuration based on row position
     */
    getEnemyType(row) {
        const types = [
            { health: 1, points: 30, color: '#ff4444', shootInterval: 3000 }, // Fast scouts
            { health: 2, points: 20, color: '#44ff44', shootInterval: 2500 }, // Medium fighters
            { health: 3, points: 10, color: '#4444ff', shootInterval: 2000 }  // Heavy tanks
        ];
        return types[Math.min(row, types.length - 1)];
    }
    
    /**
     * Player shooting mechanism
     */
    shoot() {
        if (!this.gameRunning || this.gameOver) return;
        
        const now = Date.now();
        if (now - (this.player.lastShot || 0) < 200) return; // Rate limiting
        
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 10,
            speed: 8,
            owner: 'player',
            damage: 1
        });
        
        this.player.lastShot = now;
    }
    
    /**
     * Enemy shooting mechanism
     */
    enemyShoot(enemy) {
        const now = Date.now();
        if (now - enemy.lastShot < enemy.shootInterval) return;
        
        // Random chance to shoot
        if (Math.random() < 0.1) {
            this.bullets.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                speed: 3,
                owner: 'enemy',
                damage: 1,
                color: '#ff6666'
            });
            enemy.lastShot = now;
        }
    }
    
    /**
     * Update game state - main game loop logic
     */
    update(deltaTime) {
        if (!this.gameRunning || this.gameOver) return;
        
        const updateStart = performance.now();
        
        this.updatePlayer(deltaTime);
        this.updateBullets(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateCollisions();
        this.updateParticles(deltaTime);
        this.checkGameState();
        
        this.performanceMetrics.updateTime = performance.now() - updateStart;
    }
    
    /**
     * Update player position and state
     */
    updatePlayer(deltaTime) {
        // Player movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x = Math.min(this.width - this.player.width, this.player.x + this.player.speed);
        }
        
        // Validate player position
        this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));
    }
    
    /**
     * Update bullet positions and lifecycle
     */
    updateBullets(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (bullet.owner === 'player') {
                bullet.y -= bullet.speed;
                if (bullet.y < -bullet.height) {
                    this.bullets.splice(i, 1);
                }
            } else {
                bullet.y += bullet.speed;
                if (bullet.y > this.height) {
                    this.bullets.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Update enemy positions and behavior with formation movement
     */
    updateEnemies(deltaTime) {
        if (this.enemies.length === 0) return;
        
        this.enemyMoveTimer += deltaTime;
        
        // Formation movement logic
        if (this.enemyMoveTimer >= this.enemyMoveInterval) {
            let shouldDrop = false;
            
            // Check if any enemy hits screen edge
            for (const enemy of this.enemies) {
                if (!enemy.destroyed) {
                    if ((this.enemyDirection > 0 && enemy.x + enemy.width >= this.width - 10) ||
                        (this.enemyDirection < 0 && enemy.x <= 10)) {
                        shouldDrop = true;
                        break;
                    }
                }
            }
            
            // Move enemies
            for (const enemy of this.enemies) {
                if (!enemy.destroyed) {
                    if (shouldDrop) {
                        enemy.y += this.enemyDropDistance;
                    } else {
                        enemy.x += this.enemyDirection * 20;
                    }
                    
                    // Enemy shooting
                    this.enemyShoot(enemy);
                }
            }
            
            if (shouldDrop) {
                this.enemyDirection *= -1;
                // Increase speed slightly after each drop
                this.enemyMoveInterval = Math.max(200, this.enemyMoveInterval - 50);
            }
            
            this.enemyMoveTimer = 0;
        }
        
        // Remove destroyed enemies
        this.enemies = this.enemies.filter(enemy => !enemy.destroyed);
    }
    
    /**
     * Comprehensive collision detection system
     */
    updateCollisions() {
        // Clear and rebuild quad tree for spatial partitioning
        this.collisionQuadTree = new QuadTree(0, 0, this.width, this.height);
        
        // Add entities to quad tree
        this.enemies.forEach(enemy => {
            if (!enemy.destroyed) {
                this.collisionQuadTree.insert(enemy);
            }
        });
        
        // Player bullet vs enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (bullet.owner === 'player') {
                const nearbyEnemies = this.collisionQuadTree.retrieve(bullet);
                
                for (const enemy of nearbyEnemies) {
                    if (this.checkCollision(bullet, enemy)) {
                        // Damage enemy
                        enemy.health -= bullet.damage;
                        
                        // Create hit effect
                        this.createHitEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        
                        if (enemy.health <= 0) {
                            // Enemy destroyed
                            enemy.destroyed = true;
                            this.score += enemy.points;
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        }
                        
                        // Remove bullet
                        this.bullets.splice(i, 1);
                        break;
                    }
                }
            } else if (bullet.owner === 'enemy') {
                // Enemy bullet vs player collision
                if (this.checkCollision(bullet, this.player)) {
                    this.player.health -= bullet.damage;
                    this.bullets.splice(i, 1);
                    this.createHitEffect(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                    
                    if (this.player.health <= 0) {
                        this.triggerGameOver();
                    }
                }
            }
        }
        
        // Enemy vs player collision (game over)
        for (const enemy of this.enemies) {
            if (!enemy.destroyed && this.checkCollision(enemy, this.player)) {
                this.triggerGameOver();
                break;
            }
        }
    }
    
    /**
     * AABB collision detection
     */
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    /**
     * Create visual hit effect
     */
    createHitEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 30,
                maxLife: 30,
                color: '#ffff00',
                size: 3
            });
        }
    }
    
    /**
     * Create explosion effect
     */
    createExplosion(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 60,
                maxLife: 60,
                color: '#ff4400',
                size: 5
            });
        }
    }
    
    /**
     * Update particle effects
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Check game state conditions
     */
    checkGameState() {
        // Check for wave completion
        const aliveEnemies = this.enemies.filter(enemy => !enemy.destroyed);
        if (aliveEnemies.length === 0) {
            this.currentWave++;
            setTimeout(() => {
                this.initializeWave();
            }, this.waveConfig.waveDelay);
        }
        
        // Check if enemies reached player level (game over condition)
        for (const enemy of this.enemies) {
            if (!enemy.destroyed && enemy.y + enemy.height >= this.player.y) {
                this.triggerGameOver();
                break;
            }
        }
    }
    
    /**
     * Trigger game over state
     */
    triggerGameOver() {
        this.gameOver = true;
        this.gameRunning = false;
    }
    
    /**
     * Render all game elements
     */
    render() {
        if (!this.ctx) return;
        
        const renderStart = performance.now();
        
        // Clear canvas
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.gameRunning && !this.gameOver) {
            this.renderPlayer();
            this.renderBullets();
            this.renderEnemies();
            this.renderParticles();
            this.renderUI();
        } else if (this.gameOver) {
            this.renderGameOver();
        } else {
            this.renderStartScreen();
        }
        
        this.performanceMetrics.renderTime = performance.now() - renderStart;
    }
    
    /**
     * Render player sprite
     */
    renderPlayer() {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Player health indicator
        for (let i = 0; i < this.player.health; i++) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(10 + i * 15, this.height - 30, 10, 10);
        }
    }
    
    /**
     * Render all bullets with smooth animation
     */
    renderBullets() {
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = bullet.color || '#ffffff';
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }
    }
    
    /**
     * Render enemies with health indicators
     */
    renderEnemies() {
        for (const enemy of this.enemies) {
            if (!enemy.destroyed) {
                // Enemy body
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                
                // Health bar for damaged enemies
                if (enemy.health < enemy.maxHealth) {
                    const healthPercent = enemy.health / enemy.maxHealth;
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercent, 4);
                }
            }
        }
    }
    
    /**
     * Render particle effects
     */
    renderParticles() {
        for (const particle of this.particles) {
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, 
                            particle.size, particle.size);
        }
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render game UI elements
     */
    renderUI() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Wave: ${this.currentWave}`, 10, 60);
        this.ctx.fillText(`Enemies: ${this.enemies.filter(e => !e.destroyed).length}`, 10, 90);
        
        // FPS counter
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`FPS: ${this.fps}`, this.width - 80, 30);
    }
    
    /**
     * Render game over screen
     */
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2);
        this.ctx.fillText(`Waves Completed: ${this.currentWave - 1}`, this.width / 2, this.height / 2 + 30);
        this.ctx.fillText('Press R to Restart', this.width / 2, this.height / 2 + 80);
        
        this.ctx.textAlign = 'left';
    }
    
    /**
     * Render start screen
     */
    renderStartScreen() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPACE INVADERS', this.width / 2, this.height / 2 - 50);
        
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press SPACE to Start', this.width / 2, this.height / 2 + 20);
        this.ctx.fillText('Arrow Keys or WASD to Move', this.width / 2, this.height / 2 + 50);
        
        this.ctx.textAlign = 'left';
    }
    
    /**
     * Start the game
     */
    start() {
        this.gameRunning = true;
        this.gameOver = false;
        this.score = 0;
        this.currentWave = 1;
        this.player.health = 3;
        this.bullets = [];
        this.particles = [];
        this.initializeWave();
    }
    
    /**
     * Restart the game
     */
    restart() {
        this.start();
    }
    
    /**
     * Main game loop with performance monitoring
     */
    gameLoop(currentTime) {
        const frameStart = performance.now();
        
        // Calculate delta time and FPS
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.frameCount++;
        
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / deltaTime);
        }
        
        // Handle restart input
        if (this.gameOver && this.keys['KeyR']) {
            this.restart();
        }
        
        // Handle start input
        if (!this.gameRunning && !this.gameOver && this.keys['Space']) {
            this.start();
        }
        
        // Update and render
        this.update(deltaTime);
        this.render();
        
        this.performanceMetrics.frameTime = performance.now() - frameStart;
        
        // Continue game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

/**
 * Simple QuadTree implementation for spatial partitioning
 * Optimizes collision detection performance with many entities
 */
class QuadTree {
    constructor(x, y, width, height, maxObjects = 10, maxLevels = 5, level = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }
    
    clear() {
        this.objects = [];
        for (const node of this.nodes) {
            node.clear();
        }
        this.nodes = [];
    }
    
    split() {
        const subWidth = this.width / 2;
        const subHeight = this.height / 2;
        const x = this.x;
        const y = this.y;
        
        this.nodes[0] = new QuadTree(x + subWidth, y, subWidth, subHeight, 
                                   this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[1] = new QuadTree(x, y, subWidth, subHeight, 
                                   this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[2] = new QuadTree(x, y + subHeight, subWidth, subHeight, 
                                   this.maxObjects, this.maxLevels, this.level + 1);
        this.nodes[3] = new QuadTree(x + subWidth, y + subHeight, subWidth, subHeight, 
                                   this.maxObjects, this.maxLevels, this.level + 1);
    }
    
    getIndex(rect) {
        let index = -1;
        const verticalMidpoint = this.x + this.width / 2;
        const horizontalMidpoint = this.y + this.height / 2;
        
        const topQuadrant = rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint;
        const bottomQuadrant = rect.y > horizontalMidpoint;
        
        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }
        
        return index;
    }
    
    insert(rect) {
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                this.nodes[index].insert(rect);
                return;
            }
        }
        
        this.objects.push(rect);
        
        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }
            
            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }
    
    retrieve(rect) {
        const returnObjects = [...this.objects];
        
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(rect));
            } else {
                for (const node of this.nodes) {
                    returnObjects.push(...node.retrieve(rect));
                }
            }
        }
        
        return returnObjects;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, QuadTree };
}