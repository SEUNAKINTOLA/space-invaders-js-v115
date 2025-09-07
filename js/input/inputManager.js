/**
 * Input Manager System for Space Invaders
 * 
 * Handles keyboard and touch input events with state tracking and mobile virtual controls.
 * Provides a unified interface for player movement and shooting actions across all devices.
 * 
 * Key Features:
 * - Keyboard event handling (WASD, Arrow keys, Space)
 * - Touch/mobile gesture support
 * - Input state management with debouncing
 * - Virtual on-screen controls for mobile
 * - Event-driven architecture with observers
 * - Performance optimized with RAF throttling
 * 
 * Architecture:
 * - Observer pattern for input event distribution
 * - State machine for input state management
 * - Factory pattern for control creation
 * - Strategy pattern for different input types
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Input action types enumeration
 * @readonly
 * @enum {string}
 */
const INPUT_ACTIONS = Object.freeze({
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SHOOT: 'shoot',
    PAUSE: 'pause',
    MENU: 'menu'
});

/**
 * Input device types enumeration
 * @readonly
 * @enum {string}
 */
const INPUT_DEVICES = Object.freeze({
    KEYBOARD: 'keyboard',
    TOUCH: 'touch',
    GAMEPAD: 'gamepad'
});

/**
 * Input state enumeration
 * @readonly
 * @enum {string}
 */
const INPUT_STATES = Object.freeze({
    IDLE: 'idle',
    PRESSED: 'pressed',
    HELD: 'held',
    RELEASED: 'released'
});

/**
 * Default configuration for input manager
 * @readonly
 */
const DEFAULT_CONFIG = Object.freeze({
    // Keyboard mappings
    keyMappings: {
        ArrowLeft: INPUT_ACTIONS.MOVE_LEFT,
        ArrowRight: INPUT_ACTIONS.MOVE_RIGHT,
        KeyA: INPUT_ACTIONS.MOVE_LEFT,
        KeyD: INPUT_ACTIONS.MOVE_RIGHT,
        Space: INPUT_ACTIONS.SHOOT,
        Enter: INPUT_ACTIONS.SHOOT,
        Escape: INPUT_ACTIONS.PAUSE,
        KeyP: INPUT_ACTIONS.PAUSE,
        KeyM: INPUT_ACTIONS.MENU
    },
    
    // Touch settings
    touchSettings: {
        deadZone: 10,
        swipeThreshold: 50,
        tapTimeout: 200,
        holdTimeout: 500
    },
    
    // Virtual controls
    virtualControls: {
        enabled: true,
        opacity: 0.7,
        size: 60,
        margin: 20
    },
    
    // Performance settings
    performance: {
        throttleMs: 16, // ~60fps
        debounceMs: 50,
        maxEventQueue: 100
    },
    
    // Accessibility
    accessibility: {
        focusVisible: true,
        announceActions: false,
        highContrast: false
    }
});

/**
 * Input event data structure
 * @typedef {Object} InputEvent
 * @property {string} action - The input action type
 * @property {string} device - The input device type
 * @property {string} state - The input state
 * @property {number} timestamp - Event timestamp
 * @property {Object} metadata - Additional event data
 */

/**
 * Virtual control button configuration
 * @typedef {Object} VirtualButton
 * @property {string} id - Button identifier
 * @property {string} action - Associated input action
 * @property {Object} position - Button position {x, y}
 * @property {number} size - Button size
 * @property {string} icon - Button icon/text
 */

/**
 * Main Input Manager class
 * 
 * Manages all input events and provides a unified interface for game controls.
 * Supports keyboard, touch, and virtual controls with state management.
 */
class InputManager {
    /**
     * Creates a new InputManager instance
     * @param {Object} config - Configuration options
     * @param {HTMLElement} container - Container element for virtual controls
     */
    constructor(config = {}, container = document.body) {
        this.config = this._mergeConfig(DEFAULT_CONFIG, config);
        this.container = container;
        
        // State management
        this.inputStates = new Map();
        this.observers = new Map();
        this.eventQueue = [];
        this.isEnabled = true;
        this.activeDevice = null;
        
        // Performance optimization
        this.lastUpdateTime = 0;
        this.throttledUpdate = this._throttle(
            this._processEventQueue.bind(this),
            this.config.performance.throttleMs
        );
        
        // Touch tracking
        this.touchData = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isActive: false,
            startTime: 0
        };
        
        // Virtual controls
        this.virtualButtons = new Map();
        this.virtualControlsVisible = false;
        
        // Error handling
        this.errorCount = 0;
        this.maxErrors = 10;
        
        this._initialize();
    }
    
    /**
     * Initialize the input manager
     * @private
     */
    _initialize() {
        try {
            this._setupKeyboardListeners();
            this._setupTouchListeners();
            this._setupVirtualControls();
            this._detectInputCapabilities();
            this._initializeInputStates();
            
            // Start the update loop
            this._startUpdateLoop();
            
            this._log('InputManager initialized successfully', 'info');
        } catch (error) {
            this._handleError('Failed to initialize InputManager', error);
        }
    }
    
    /**
     * Setup keyboard event listeners
     * @private
     */
    _setupKeyboardListeners() {
        const keydownHandler = (event) => {
            if (!this.isEnabled) return;
            
            try {
                const action = this.config.keyMappings[event.code];
                if (action) {
                    event.preventDefault();
                    this._handleInputEvent(action, INPUT_DEVICES.KEYBOARD, INPUT_STATES.PRESSED, {
                        keyCode: event.code,
                        repeat: event.repeat
                    });
                }
            } catch (error) {
                this._handleError('Keyboard keydown error', error);
            }
        };
        
        const keyupHandler = (event) => {
            if (!this.isEnabled) return;
            
            try {
                const action = this.config.keyMappings[event.code];
                if (action) {
                    event.preventDefault();
                    this._handleInputEvent(action, INPUT_DEVICES.KEYBOARD, INPUT_STATES.RELEASED, {
                        keyCode: event.code
                    });
                }
            } catch (error) {
                this._handleError('Keyboard keyup error', error);
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);
        
        // Store references for cleanup
        this.keyboardHandlers = { keydownHandler, keyupHandler };
    }
    
    /**
     * Setup touch event listeners
     * @private
     */
    _setupTouchListeners() {
        const touchStartHandler = (event) => {
            if (!this.isEnabled) return;
            
            try {
                const touch = event.touches[0];
                this.touchData = {
                    startX: touch.clientX,
                    startY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                    isActive: true,
                    startTime: Date.now()
                };
                
                this.activeDevice = INPUT_DEVICES.TOUCH;
                event.preventDefault();
            } catch (error) {
                this._handleError('Touch start error', error);
            }
        };
        
        const touchMoveHandler = (event) => {
            if (!this.isEnabled || !this.touchData.isActive) return;
            
            try {
                const touch = event.touches[0];
                this.touchData.currentX = touch.clientX;
                this.touchData.currentY = touch.clientY;
                
                this._processTouchMovement();
                event.preventDefault();
            } catch (error) {
                this._handleError('Touch move error', error);
            }
        };
        
        const touchEndHandler = (event) => {
            if (!this.isEnabled || !this.touchData.isActive) return;
            
            try {
                this._processTouchEnd();
                this.touchData.isActive = false;
                event.preventDefault();
            } catch (error) {
                this._handleError('Touch end error', error);
            }
        };
        
        this.container.addEventListener('touchstart', touchStartHandler, { passive: false });
        this.container.addEventListener('touchmove', touchMoveHandler, { passive: false });
        this.container.addEventListener('touchend', touchEndHandler, { passive: false });
        this.container.addEventListener('touchcancel', touchEndHandler, { passive: false });
        
        // Store references for cleanup
        this.touchHandlers = { touchStartHandler, touchMoveHandler, touchEndHandler };
    }
    
    /**
     * Process touch movement for directional input
     * @private
     */
    _processTouchMovement() {
        const deltaX = this.touchData.currentX - this.touchData.startX;
        const deltaY = this.touchData.currentY - this.touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.config.touchSettings.deadZone) {
            const angle = Math.atan2(deltaY, deltaX);
            const absAngle = Math.abs(angle);
            
            // Horizontal movement detection
            if (absAngle < Math.PI / 4 || absAngle > 3 * Math.PI / 4) {
                const action = deltaX > 0 ? INPUT_ACTIONS.MOVE_RIGHT : INPUT_ACTIONS.MOVE_LEFT;
                this._handleInputEvent(action, INPUT_DEVICES.TOUCH, INPUT_STATES.HELD, {
                    deltaX,
                    deltaY,
                    distance,
                    angle
                });
            }
        }
    }
    
    /**
     * Process touch end for tap/swipe detection
     * @private
     */
    _processTouchEnd() {
        const deltaX = this.touchData.currentX - this.touchData.startX;
        const deltaY = this.touchData.currentY - this.touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - this.touchData.startTime;
        
        // Tap detection
        if (distance < this.config.touchSettings.deadZone && 
            duration < this.config.touchSettings.tapTimeout) {
            this._handleInputEvent(INPUT_ACTIONS.SHOOT, INPUT_DEVICES.TOUCH, INPUT_STATES.PRESSED, {
                tapX: this.touchData.startX,
                tapY: this.touchData.startY,
                duration
            });
        }
        
        // Swipe detection
        if (distance > this.config.touchSettings.swipeThreshold) {
            const angle = Math.atan2(deltaY, deltaX);
            const swipeData = { deltaX, deltaY, distance, angle, duration };
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                const action = deltaX > 0 ? INPUT_ACTIONS.MOVE_RIGHT : INPUT_ACTIONS.MOVE_LEFT;
                this._handleInputEvent(action, INPUT_DEVICES.TOUCH, INPUT_STATES.PRESSED, swipeData);
            }
        }
        
        // Release any held actions
        this._releaseAllTouchActions();
    }
    
    /**
     * Setup virtual on-screen controls
     * @private
     */
    _setupVirtualControls() {
        if (!this.config.virtualControls.enabled) return;
        
        try {
            this._createVirtualControlsContainer();
            this._createVirtualButtons();
            this._updateVirtualControlsVisibility();
        } catch (error) {
            this._handleError('Virtual controls setup error', error);
        }
    }
    
    /**
     * Create virtual controls container
     * @private
     */
    _createVirtualControlsContainer() {
        this.virtualContainer = document.createElement('div');
        this.virtualContainer.id = 'virtual-controls';
        this.virtualContainer.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 120px;
            pointer-events: none;
            z-index: 1000;
            opacity: ${this.config.virtualControls.opacity};
            transition: opacity 0.3s ease;
        `;
        
        this.container.appendChild(this.virtualContainer);
    }
    
    /**
     * Create virtual control buttons
     * @private
     */
    _createVirtualButtons() {
        const buttonConfigs = [
            {
                id: 'virtual-left',
                action: INPUT_ACTIONS.MOVE_LEFT,
                position: { x: 20, y: 20 },
                icon: '←'
            },
            {
                id: 'virtual-right',
                action: INPUT_ACTIONS.MOVE_RIGHT,
                position: { x: 100, y: 20 },
                icon: '→'
            },
            {
                id: 'virtual-shoot',
                action: INPUT_ACTIONS.SHOOT,
                position: { x: -80, y: 20 },
                icon: '🚀'
            }
        ];
        
        buttonConfigs.forEach(config => {
            const button = this._createVirtualButton(config);
            this.virtualButtons.set(config.id, button);
            this.virtualContainer.appendChild(button.element);
        });
    }
    
    /**
     * Create a single virtual button
     * @private
     * @param {VirtualButton} config - Button configuration
     * @returns {Object} Button object with element and handlers
     */
    _createVirtualButton(config) {
        const element = document.createElement('button');
        element.id = config.id;
        element.textContent = config.icon;
        element.style.cssText = `
            position: absolute;
            width: ${this.config.virtualControls.size}px;
            height: ${this.config.virtualControls.size}px;
            ${config.position.x >= 0 ? `left: ${config.position.x}px;` : `right: ${Math.abs(config.position.x)}px;`}
            bottom: ${config.position.y}px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            color: white;
            font-size: 24px;
            pointer-events: auto;
            user-select: none;
            touch-action: manipulation;
            transition: all 0.1s ease;
        `;
        
        // Event handlers
        const pressHandler = (event) => {
            event.preventDefault();
            element.style.background = 'rgba(255, 255, 255, 0.4)';
            element.style.transform = 'scale(0.95)';
            this._handleInputEvent(config.action, INPUT_DEVICES.TOUCH, INPUT_STATES.PRESSED, {
                virtualButton: config.id
            });
        };
        
        const releaseHandler = (event) => {
            event.preventDefault();
            element.style.background = 'rgba(255, 255, 255, 0.2)';
            element.style.transform = 'scale(1)';
            this._handleInputEvent(config.action, INPUT_DEVICES.TOUCH, INPUT_STATES.RELEASED, {
                virtualButton: config.id
            });
        };
        
        // Touch events
        element.addEventListener('touchstart', pressHandler);
        element.addEventListener('touchend', releaseHandler);
        element.addEventListener('touchcancel', releaseHandler);
        
        // Mouse events for desktop testing
        element.addEventListener('mousedown', pressHandler);
        element.addEventListener('mouseup', releaseHandler);
        element.addEventListener('mouseleave', releaseHandler);
        
        return {
            element,
            config,
            handlers: { pressHandler, releaseHandler }
        };
    }
    
    /**
     * Handle input events and manage state
     * @private
     * @param {string} action - Input action
     * @param {string} device - Input device
     * @param {string} state - Input state
     * @param {Object} metadata - Additional event data
     */
    _handleInputEvent(action, device, state, metadata = {}) {
        try {
            const timestamp = Date.now();
            const currentState = this.inputStates.get(action) || INPUT_STATES.IDLE;
            
            // State validation
            if (!this._isValidStateTransition(currentState, state)) {
                return;
            }
            
            // Update input state
            this.inputStates.set(action, state);
            
            // Create input event
            const inputEvent = {
                action,
                device,
                state,
                timestamp,
                metadata: {
                    ...metadata,
                    previousState: currentState,
                    deviceActive: this.activeDevice
                }
            };
            
            // Add to event queue
            this._enqueueEvent(inputEvent);
            
            // Immediate processing for critical actions
            if (this._isCriticalAction(action, state)) {
                this._processEventQueue();
            }
            
        } catch (error) {
            this._handleError('Input event handling error', error);
        }
    }
    
    /**
     * Validate state transitions
     * @private
     * @param {string} currentState - Current input state
     * @param {string} newState - New input state
     * @returns {boolean} Whether transition is valid
     */
    _isValidStateTransition(currentState, newState) {
        const validTransitions = {
            [INPUT_STATES.IDLE]: [INPUT_STATES.PRESSED],
            [INPUT_STATES.PRESSED]: [INPUT_STATES.HELD, INPUT_STATES.RELEASED],
            [INPUT_STATES.HELD]: [INPUT_STATES.HELD, INPUT_STATES.RELEASED],
            [INPUT_STATES.RELEASED]: [INPUT_STATES.IDLE, INPUT_STATES.PRESSED]
        };
        
        return validTransitions[currentState]?.includes(newState) || false;
    }
    
    /**
     * Check if action requires immediate processing
     * @private
     * @param {string} action - Input action
     * @param {string} state - Input state
     * @returns {boolean} Whether action is critical
     */
    _isCriticalAction(action, state) {
        return (action === INPUT_ACTIONS.SHOOT && state === INPUT_STATES.PRESSED) ||
               (action === INPUT_ACTIONS.PAUSE && state === INPUT_STATES.PRESSED);
    }
    
    /**
     * Add event to processing queue
     * @private
     * @param {InputEvent} event - Input event to queue
     */
    _enqueueEvent(event) {
        if (this.eventQueue.length >= this.config.performance.maxEventQueue) {
            this.eventQueue.shift(); // Remove oldest event
            this._log('Event queue overflow, dropping oldest event', 'warn');
        }
        
        this.eventQueue.push(event);
    }
    
    /**
     * Process queued input events
     * @private
     */
    _processEventQueue() {
        if (this.eventQueue.length === 0) return;
        
        const events = [...this.eventQueue];
        this.eventQueue.length = 0;
        
        events.forEach(event => {
            this._notifyObservers(event);
        });
        
        this.lastUpdateTime = Date.now();
    }
    
    /**
     * Notify all observers of input events
     * @private
     * @param {InputEvent} event - Input event to broadcast
     */
    _notifyObservers(event) {
        const observers = this.observers.get(event.action) || [];
        
        observers.forEach(observer => {
            try {
                if (typeof observer === 'function') {
                    observer(event);
                } else if (observer && typeof observer.handleInput === 'function') {
                    observer.handleInput(event);
                }
            } catch (error) {
                this._handleError(`Observer notification error for action ${event.action}`, error);
            }
        });
    }
    
    /**
     * Release all touch-based actions
     * @private
     */
    _releaseAllTouchActions() {
        const touchActions = [INPUT_ACTIONS.MOVE_LEFT, INPUT_ACTIONS.MOVE_RIGHT];
        
        touchActions.forEach(action => {
            if (this.inputStates.get(action) === INPUT_STATES.HELD) {
                this._handleInputEvent(action, INPUT_DEVICES.TOUCH, INPUT_STATES.RELEASED, {
                    autoRelease: true
                });
            }
        });
    }
    
    /**
     * Detect available input capabilities
     * @private
     */
    _detectInputCapabilities() {
        this.capabilities = {
            keyboard: true,
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            gamepad: 'getGamepads' in navigator,
            pointerEvents: 'onpointerdown' in window
        };
        
        // Auto-show virtual controls on touch devices
        if (this.capabilities.touch && !this.capabilities.keyboard) {
            this.virtualControlsVisible = true;
            this._updateVirtualControlsVisibility();
        }
        
        this._log(`Input capabilities detected: ${JSON.stringify(this.capabilities)}`, 'info');
    }
    
    /**
     * Initialize input states
     * @private
     */
    _initializeInputStates() {
        Object.values(INPUT_ACTIONS).forEach(action => {
            this.inputStates.set(action, INPUT_STATES.IDLE);
        });
    }
    
    /**
     * Start the update loop
     * @private
     */
    _startUpdateLoop() {
        const update = () => {
            if (this.isEnabled) {
                this.throttledUpdate();
            }
            requestAnimationFrame(update);
        };
        
        requestAnimationFrame(update);
    }
    
    /**
     * Update virtual controls visibility
     * @private
     */
    _updateVirtualControlsVisibility() {
        if (this.virtualContainer) {
            this.virtualContainer.style.display = this.virtualControlsVisible ? 'block' : 'none';
        }
    }
    
    /**
     * Subscribe to input events for a specific action
     * @param {string} action - Input action to observe
     * @param {Function|Object} observer - Observer function or object with handleInput method
     * @returns {Function} Unsubscribe function
     */
    subscribe(action, observer) {
        if (!Object.values(INPUT_ACTIONS).includes(action)) {
            throw new Error(`Invalid input action: ${action}`);
        }
        
        if (!observer || (typeof observer !== 'function' && typeof observer.handleInput !== 'function')) {
            throw new Error('Observer must be a function or object with handleInput method');
        }
        
        if (!this.observers.has(action)) {
            this.observers.set(action, []);
        }
        
        this.observers.get(action).push(observer);
        
        // Return unsubscribe function
        return () => {
            const observers = this.observers.get(action);
            if (observers) {
                const index = observers.indexOf(observer);
                if (index > -1) {
                    observers.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Get current input state for an action
     * @param {string} action - Input action to check
     * @returns {string} Current input state
     */
    getInputState(action) {
        return this.inputStates.get(action) || INPUT_STATES.IDLE;
    }
    
    /**
     * Check if an action is currently active (pressed or held)
     * @param {string} action - Input action to check
     * @returns {boolean} Whether action is active
     */
    isActionActive(action) {
        const state = this.getInputState(action);
        return state === INPUT_STATES.PRESSED || state === INPUT_STATES.HELD;
    }
    
    /**
     * Enable or disable input processing
     * @param {boolean} enabled - Whether to enable input
     */
    setEnabled(enabled) {
        this.isEnabled = Boolean(enabled);
        
        if (!enabled) {
            // Clear all active states when disabled
            this.inputStates.forEach((state, action) => {
                if (state !== INPUT_STATES.IDLE) {
                    this.inputStates.set(action, INPUT_STATES.IDLE);
                }
            });
            this.eventQueue.length = 0;
        }
        
        this._log(`InputManager ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }
    
    /**
     * Show or hide virtual controls
     * @param {boolean} visible - Whether to show virtual controls
     */
    setVirtualControlsVisible(visible) {
        this.virtualControlsVisible = Boolean(visible);
        this._updateVirtualControlsVisibility();
    }
    
    /**
     * Update input configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = this._mergeConfig(this.config, newConfig);
        this._log('InputManager configuration updated', 'info');
    }
    
    /**
     * Get input statistics
     * @returns {Object} Input statistics
     */
    getStats() {
        return {
            isEnabled: this.isEnabled,
            activeDevice: this.activeDevice,
            eventQueueSize: this.eventQueue.length,
            errorCount: this.errorCount,
            capabilities: this.capabilities,
            virtualControlsVisible: this.virtualControlsVisible,
            inputStates: Object.fromEntries(this.inputStates),
            observerCounts: Object.fromEntries(
                Array.from(this.observers.entries()).map(([action, observers]) => [action, observers.length])
            )
        };
    }
    
    /**
     * Cleanup resources and remove event listeners
     */
    destroy() {
        try {
            // Remove keyboard listeners
            if (this.keyboardHandlers) {
                document.removeEventListener('keydown', this.keyboardHandlers.keydownHandler);
                document.removeEventListener('keyup', this.keyboardHandlers.keyupHandler);
            }
            
            // Remove touch listeners
            if (this.touchHandlers) {
                this.container.removeEventListener('touchstart', this.touchHandlers.touchStartHandler);
                this.container.removeEventListener('touchmove', this.touchHandlers.touchMoveHandler);
                this.container.removeEventListener('touchend', this.touchHandlers.touchEndHandler);
                this.container.removeEventListener('touchcancel', this.touchHandlers.touchEndHandler);
            }
            
            // Remove virtual controls
            if (this.virtualContainer && this.virtualContainer.parentNode) {
                this.virtualContainer.parentNode.removeChild(this.virtualContainer);
            }
            
            // Clear state
            this.inputStates.clear();
            this.observers.clear();
            this.virtualButtons.clear();
            this.eventQueue.length = 0;
            this.isEnabled = false;
            
            this._log('InputManager destroyed successfully', 'info');
        } catch (error) {
            this._handleError('Error during InputManager destruction', error);
        }
    }
    
    /**
     * Merge configuration objects
     * @private
     * @param {Object} base - Base configuration
     * @param {Object} override - Override configuration
     * @returns {Object} Merged configuration
     */
    _mergeConfig(base, override) {
        const merged = { ...base };
        
        Object.keys(override).forEach(key => {
            if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
                merged[key] = this._mergeConfig(base[key] || {}, override[key]);
            } else {
                merged[key] = override[key];
            }
        });
        
        return merged;
    }
    
    /**
     * Throttle function execution
     * @private
     * @param {Function} func - Function to throttle
     * @param {number} limit - Throttle limit in milliseconds
     * @returns {Function} Throttled function
     */
    _throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Handle errors with logging and recovery
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _handleError(message, error) {
        this.errorCount++;
        
        const errorInfo = {
            message,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            stats: this.getStats()
        };
        
        this._log(`ERROR: ${message}`, 'error', errorInfo);
        
        // Disable input manager if too many errors
        if (this.errorCount >= this.maxErrors) {
            this.setEnabled(false);
            this._log('InputManager disabled due to excessive errors', 'error');
        }
    }
    
    /**
     * Log messages with structured format
     * @private
     * @param {string} message - Log message
     * @param {string} level - Log level
     * @param {Object} data - Additional log data
     */
    _log(message, level = 'info', data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component: 'InputManager',
            message,
            ...data
        };
        
        if (level === 'error') {
            console.error(`[${logEntry.timestamp}] ${logEntry.component}: ${message}`, data);
        } else if (level === 'warn') {
            console.warn(`[${logEntry.timestamp}] ${logEntry.component}: ${message}`, data);
        } else {
            console.log(`[${logEntry.timestamp}] ${logEntry.component}: ${message}`, data);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InputManager,
        INPUT_ACTIONS,
        INPUT_DEVICES,
        INPUT_STATES,
        DEFAULT_CONFIG
    };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.InputManager = InputManager;
    window.INPUT_ACTIONS = INPUT_ACTIONS;
    window.INPUT_DEVICES = INPUT_DEVICES;
    window.INPUT_STATES = INPUT_STATES;
}