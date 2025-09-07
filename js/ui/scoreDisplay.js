/**
 * ScoreDisplay - Comprehensive UI component for displaying score information
 * 
 * This module provides a complete scoring display system that handles:
 * - Current score display with animations
 * - High score tracking and persistence
 * - Responsive positioning and formatting
 * - Performance-optimized rendering
 * 
 * Architecture:
 * - Event-driven updates for real-time score changes
 * - Local storage integration for persistence
 * - Animation system for visual feedback
 * - Responsive design for multiple screen sizes
 * 
 * Dependencies: None (vanilla JavaScript implementation)
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Configuration object for score display settings
 * @typedef {Object} ScoreDisplayConfig
 * @property {string} containerId - DOM container element ID
 * @property {number} animationDuration - Animation duration in milliseconds
 * @property {string} numberFormat - Number formatting locale
 * @property {boolean} enableAnimations - Whether to enable score animations
 * @property {Object} styles - Custom CSS styles
 */

/**
 * Score data structure
 * @typedef {Object} ScoreData
 * @property {number} current - Current game score
 * @property {number} high - High score
 * @property {number} session - Session high score
 * @property {string} lastUpdated - ISO timestamp of last update
 */

/**
 * ScoreDisplay class - Manages score visualization and persistence
 * 
 * Features:
 * - Real-time score updates with smooth animations
 * - High score tracking with local storage persistence
 * - Responsive design with configurable positioning
 * - Performance-optimized rendering with RAF
 * - Comprehensive error handling and logging
 * 
 * @class ScoreDisplay
 */
class ScoreDisplay {
    /**
     * Default configuration for score display
     * @private
     * @static
     * @readonly
     */
    static #DEFAULT_CONFIG = {
        containerId: 'score-container',
        animationDuration: 500,
        numberFormat: 'en-US',
        enableAnimations: true,
        styles: {
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffffff',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            zIndex: '1000'
        }
    };

    /**
     * Local storage key for high score persistence
     * @private
     * @static
     * @readonly
     */
    static #STORAGE_KEY = 'space_invaders_high_score';

    /**
     * Animation frame request ID for cleanup
     * @private
     * @type {number|null}
     */
    #animationFrameId = null;

    /**
     * Current animation state
     * @private
     * @type {Object}
     */
    #animationState = {
        isAnimating: false,
        startValue: 0,
        targetValue: 0,
        startTime: 0,
        duration: 0
    };

    /**
     * Score data cache
     * @private
     * @type {ScoreData}
     */
    #scoreData = {
        current: 0,
        high: 0,
        session: 0,
        lastUpdated: new Date().toISOString()
    };

    /**
     * DOM elements cache
     * @private
     * @type {Object}
     */
    #elements = {
        container: null,
        currentScore: null,
        highScore: null,
        sessionScore: null
    };

    /**
     * Event listeners registry for cleanup
     * @private
     * @type {Array}
     */
    #eventListeners = [];

    /**
     * Configuration object
     * @private
     * @type {ScoreDisplayConfig}
     */
    #config = {};

    /**
     * Logger instance for debugging and monitoring
     * @private
     * @type {Object}
     */
    #logger = {
        info: (message, data = {}) => console.info(`[ScoreDisplay] ${message}`, data),
        warn: (message, data = {}) => console.warn(`[ScoreDisplay] ${message}`, data),
        error: (message, error = null) => console.error(`[ScoreDisplay] ${message}`, error),
        debug: (message, data = {}) => console.debug(`[ScoreDisplay] ${message}`, data)
    };

    /**
     * Initialize ScoreDisplay with configuration
     * 
     * @param {ScoreDisplayConfig} [config={}] - Configuration options
     * @throws {Error} When container element is not found
     */
    constructor(config = {}) {
        try {
            this.#config = this.#mergeConfig(config);
            this.#logger.info('Initializing ScoreDisplay', { config: this.#config });
            
            this.#initializeElements();
            this.#loadHighScore();
            this.#setupEventListeners();
            this.#render();
            
            this.#logger.info('ScoreDisplay initialized successfully');
        } catch (error) {
            this.#logger.error('Failed to initialize ScoreDisplay', error);
            throw new Error(`ScoreDisplay initialization failed: ${error.message}`);
        }
    }

    /**
     * Merge user configuration with defaults
     * 
     * @private
     * @param {ScoreDisplayConfig} userConfig - User provided configuration
     * @returns {ScoreDisplayConfig} Merged configuration
     */
    #mergeConfig(userConfig) {
        return {
            ...ScoreDisplay.#DEFAULT_CONFIG,
            ...userConfig,
            styles: {
                ...ScoreDisplay.#DEFAULT_CONFIG.styles,
                ...(userConfig.styles || {})
            }
        };
    }

    /**
     * Initialize DOM elements and create score display structure
     * 
     * @private
     * @throws {Error} When container element is not found
     */
    #initializeElements() {
        // Find or create container
        let container = document.getElementById(this.#config.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.#config.containerId;
            document.body.appendChild(container);
            this.#logger.info('Created score container element');
        }

        // Apply container styles
        Object.assign(container.style, this.#config.styles);
        
        // Create score display structure
        container.innerHTML = `
            <div class="score-display">
                <div class="current-score-container">
                    <span class="score-label">SCORE:</span>
                    <span class="current-score" data-testid="current-score">0</span>
                </div>
                <div class="high-score-container">
                    <span class="score-label">HIGH:</span>
                    <span class="high-score" data-testid="high-score">0</span>
                </div>
                <div class="session-score-container" style="display: none;">
                    <span class="score-label">SESSION:</span>
                    <span class="session-score" data-testid="session-score">0</span>
                </div>
            </div>
        `;

        // Cache DOM elements
        this.#elements.container = container;
        this.#elements.currentScore = container.querySelector('.current-score');
        this.#elements.highScore = container.querySelector('.high-score');
        this.#elements.sessionScore = container.querySelector('.session-score');

        // Add CSS styles
        this.#injectStyles();
        
        this.#logger.debug('DOM elements initialized');
    }

    /**
     * Inject CSS styles for score display
     * 
     * @private
     */
    #injectStyles() {
        const styleId = 'score-display-styles';
        
        if (document.getElementById(styleId)) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .score-display {
                user-select: none;
                pointer-events: none;
            }
            
            .score-display > div {
                margin-bottom: 5px;
                display: flex;
                justify-content: space-between;
                min-width: 200px;
            }
            
            .score-label {
                margin-right: 10px;
                opacity: 0.8;
            }
            
            .current-score, .high-score, .session-score {
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .score-animation {
                animation: scoreFlash 0.5s ease-in-out;
            }
            
            @keyframes scoreFlash {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); color: #ffff00; }
                100% { transform: scale(1); }
            }
            
            @media (max-width: 768px) {
                .score-display {
                    font-size: 14px;
                }
                .score-display > div {
                    min-width: 150px;
                }
            }
            
            @media (max-width: 480px) {
                .score-display {
                    font-size: 12px;
                }
                .score-display > div {
                    min-width: 120px;
                    margin-bottom: 3px;
                }
            }
        `;
        
        document.head.appendChild(style);
        this.#logger.debug('CSS styles injected');
    }

    /**
     * Load high score from local storage
     * 
     * @private
     */
    #loadHighScore() {
        try {
            const stored = localStorage.getItem(ScoreDisplay.#STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (this.#validateScoreData(data)) {
                    this.#scoreData.high = data.high || 0;
                    this.#scoreData.lastUpdated = data.lastUpdated || new Date().toISOString();
                    this.#logger.info('High score loaded from storage', { highScore: this.#scoreData.high });
                } else {
                    this.#logger.warn('Invalid score data in storage, using defaults');
                }
            }
        } catch (error) {
            this.#logger.error('Failed to load high score from storage', error);
        }
    }

    /**
     * Validate score data structure
     * 
     * @private
     * @param {any} data - Data to validate
     * @returns {boolean} True if valid score data
     */
    #validateScoreData(data) {
        return data && 
               typeof data === 'object' &&
               typeof data.high === 'number' &&
               data.high >= 0;
    }

    /**
     * Save high score to local storage
     * 
     * @private
     */
    #saveHighScore() {
        try {
            const dataToSave = {
                high: this.#scoreData.high,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(ScoreDisplay.#STORAGE_KEY, JSON.stringify(dataToSave));
            this.#logger.debug('High score saved to storage', dataToSave);
        } catch (error) {
            this.#logger.error('Failed to save high score to storage', error);
        }
    }

    /**
     * Setup event listeners for responsive behavior
     * 
     * @private
     */
    #setupEventListeners() {
        // Window resize handler for responsive positioning
        const resizeHandler = this.#debounce(() => {
            this.#updateResponsiveStyles();
        }, 250);

        window.addEventListener('resize', resizeHandler);
        this.#eventListeners.push({ element: window, event: 'resize', handler: resizeHandler });

        // Visibility change handler to pause animations
        const visibilityHandler = () => {
            if (document.hidden && this.#animationState.isAnimating) {
                this.#cancelAnimation();
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);
        this.#eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler });

        this.#logger.debug('Event listeners setup complete');
    }

    /**
     * Update responsive styles based on screen size
     * 
     * @private
     */
    #updateResponsiveStyles() {
        const container = this.#elements.container;
        if (!container) return;

        const screenWidth = window.innerWidth;
        
        if (screenWidth <= 480) {
            container.style.top = '10px';
            container.style.right = '10px';
            container.style.fontSize = '12px';
        } else if (screenWidth <= 768) {
            container.style.top = '15px';
            container.style.right = '15px';
            container.style.fontSize = '14px';
        } else {
            container.style.top = this.#config.styles.top;
            container.style.right = this.#config.styles.right;
            container.style.fontSize = this.#config.styles.fontSize;
        }

        this.#logger.debug('Responsive styles updated', { screenWidth });
    }

    /**
     * Debounce utility function
     * 
     * @private
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    #debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Format number for display with locale-specific formatting
     * 
     * @private
     * @param {number} number - Number to format
     * @returns {string} Formatted number string
     */
    #formatNumber(number) {
        try {
            return new Intl.NumberFormat(this.#config.numberFormat).format(Math.floor(number));
        } catch (error) {
            this.#logger.warn('Number formatting failed, using fallback', error);
            return Math.floor(number).toString();
        }
    }

    /**
     * Render current score display
     * 
     * @private
     */
    #render() {
        if (!this.#elements.currentScore || !this.#elements.highScore) {
            this.#logger.warn('Cannot render: DOM elements not available');
            return;
        }

        this.#elements.currentScore.textContent = this.#formatNumber(this.#scoreData.current);
        this.#elements.highScore.textContent = this.#formatNumber(this.#scoreData.high);
        
        if (this.#elements.sessionScore) {
            this.#elements.sessionScore.textContent = this.#formatNumber(this.#scoreData.session);
        }

        this.#logger.debug('Score display rendered', this.#scoreData);
    }

    /**
     * Animate score change with smooth transition
     * 
     * @private
     * @param {number} fromValue - Starting value
     * @param {number} toValue - Target value
     * @param {HTMLElement} element - Element to animate
     */
    #animateScore(fromValue, toValue, element) {
        if (!this.#config.enableAnimations || fromValue === toValue) {
            element.textContent = this.#formatNumber(toValue);
            return;
        }

        this.#cancelAnimation();

        this.#animationState = {
            isAnimating: true,
            startValue: fromValue,
            targetValue: toValue,
            startTime: performance.now(),
            duration: this.#config.animationDuration
        };

        const animate = (currentTime) => {
            const elapsed = currentTime - this.#animationState.startTime;
            const progress = Math.min(elapsed / this.#animationState.duration, 1);
            
            // Easing function (ease-out)
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = this.#animationState.startValue + 
                (this.#animationState.targetValue - this.#animationState.startValue) * easedProgress;
            
            element.textContent = this.#formatNumber(currentValue);
            
            if (progress < 1) {
                this.#animationFrameId = requestAnimationFrame(animate);
            } else {
                this.#animationState.isAnimating = false;
                element.textContent = this.#formatNumber(this.#animationState.targetValue);
                
                // Add flash animation for score increases
                if (toValue > fromValue) {
                    element.classList.add('score-animation');
                    setTimeout(() => element.classList.remove('score-animation'), 500);
                }
            }
        };

        this.#animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Cancel current animation
     * 
     * @private
     */
    #cancelAnimation() {
        if (this.#animationFrameId) {
            cancelAnimationFrame(this.#animationFrameId);
            this.#animationFrameId = null;
            this.#animationState.isAnimating = false;
        }
    }

    /**
     * Update current score with optional animation
     * 
     * @public
     * @param {number} newScore - New score value
     * @param {boolean} [animate=true] - Whether to animate the change
     * @throws {Error} When score is invalid
     */
    updateScore(newScore, animate = true) {
        if (typeof newScore !== 'number' || newScore < 0 || !isFinite(newScore)) {
            throw new Error(`Invalid score value: ${newScore}`);
        }

        const oldScore = this.#scoreData.current;
        this.#scoreData.current = newScore;
        this.#scoreData.lastUpdated = new Date().toISOString();

        // Update session high score
        if (newScore > this.#scoreData.session) {
            this.#scoreData.session = newScore;
        }

        // Check for new high score
        if (newScore > this.#scoreData.high) {
            this.#scoreData.high = newScore;
            this.#saveHighScore();
            this.#logger.info('New high score achieved!', { newHighScore: newScore });
            
            // Trigger high score event
            this.#dispatchEvent('highscore', { 
                score: newScore, 
                previousHigh: this.#scoreData.high 
            });
        }

        // Animate score change
        if (animate && this.#elements.currentScore) {
            this.#animateScore(oldScore, newScore, this.#elements.currentScore);
        } else {
            this.#render();
        }

        // Dispatch score update event
        this.#dispatchEvent('scoreupdate', { 
            score: newScore, 
            previousScore: oldScore 
        });

        this.#logger.debug('Score updated', { 
            oldScore, 
            newScore, 
            isHighScore: newScore > this.#scoreData.high 
        });
    }

    /**
     * Add points to current score
     * 
     * @public
     * @param {number} points - Points to add
     * @param {boolean} [animate=true] - Whether to animate the change
     */
    addScore(points, animate = true) {
        this.updateScore(this.#scoreData.current + points, animate);
    }

    /**
     * Reset current score to zero
     * 
     * @public
     * @param {boolean} [animate=false] - Whether to animate the reset
     */
    resetScore(animate = false) {
        this.updateScore(0, animate);
        this.#scoreData.session = 0;
        this.#render();
        
        this.#dispatchEvent('scorereset', { timestamp: new Date().toISOString() });
        this.#logger.info('Score reset');
    }

    /**
     * Get current score data
     * 
     * @public
     * @returns {ScoreData} Current score data
     */
    getScoreData() {
        return { ...this.#scoreData };
    }

    /**
     * Set high score manually (for testing or admin purposes)
     * 
     * @public
     * @param {number} highScore - New high score
     * @throws {Error} When high score is invalid
     */
    setHighScore(highScore) {
        if (typeof highScore !== 'number' || highScore < 0 || !isFinite(highScore)) {
            throw new Error(`Invalid high score value: ${highScore}`);
        }

        this.#scoreData.high = highScore;
        this.#saveHighScore();
        this.#render();
        
        this.#logger.info('High score set manually', { highScore });
    }

    /**
     * Clear high score (reset to zero)
     * 
     * @public
     */
    clearHighScore() {
        this.#scoreData.high = 0;
        this.#saveHighScore();
        this.#render();
        
        this.#dispatchEvent('highscorecleared', { timestamp: new Date().toISOString() });
        this.#logger.info('High score cleared');
    }

    /**
     * Show/hide session score display
     * 
     * @public
     * @param {boolean} show - Whether to show session score
     */
    showSessionScore(show = true) {
        const sessionContainer = this.#elements.container?.querySelector('.session-score-container');
        if (sessionContainer) {
            sessionContainer.style.display = show ? 'flex' : 'none';
            this.#logger.debug('Session score visibility changed', { show });
        }
    }

    /**
     * Update display configuration
     * 
     * @public
     * @param {Partial<ScoreDisplayConfig>} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        this.#config = this.#mergeConfig({ ...this.#config, ...newConfig });
        
        // Apply style updates
        if (newConfig.styles && this.#elements.container) {
            Object.assign(this.#elements.container.style, newConfig.styles);
        }
        
        this.#logger.info('Configuration updated', { newConfig });
    }

    /**
     * Dispatch custom events
     * 
     * @private
     * @param {string} eventType - Event type
     * @param {Object} detail - Event detail data
     */
    #dispatchEvent(eventType, detail) {
        try {
            const event = new CustomEvent(`scoredisplay:${eventType}`, {
                detail,
                bubbles: true,
                cancelable: false
            });
            
            if (this.#elements.container) {
                this.#elements.container.dispatchEvent(event);
            } else {
                document.dispatchEvent(event);
            }
        } catch (error) {
            this.#logger.error('Failed to dispatch event', error);
        }
    }

    /**
     * Get health status for monitoring
     * 
     * @public
     * @returns {Object} Health status information
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            initialized: !!this.#elements.container,
            animating: this.#animationState.isAnimating,
            scoreData: this.#scoreData,
            config: this.#config,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleanup resources and event listeners
     * 
     * @public
     */
    destroy() {
        this.#logger.info('Destroying ScoreDisplay instance');
        
        // Cancel any running animations
        this.#cancelAnimation();
        
        // Remove event listeners
        this.#eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.#eventListeners.length = 0;
        
        // Remove DOM elements
        if (this.#elements.container) {
            this.#elements.container.remove();
        }
        
        // Clear references
        this.#elements = {};
        this.#scoreData = { current: 0, high: 0, session: 0, lastUpdated: '' };
        
        this.#logger.info('ScoreDisplay destroyed successfully');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreDisplay;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.ScoreDisplay = ScoreDisplay;
}