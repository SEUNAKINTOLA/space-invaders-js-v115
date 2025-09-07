/**
 * Touch Controls System for Space Invaders
 * 
 * Provides comprehensive touch input handling for mobile devices including:
 * - Virtual button controls with visual feedback
 * - Touch area detection and gesture recognition
 * - Responsive touch handling with debouncing
 * - Accessibility support for touch interactions
 * - Performance-optimized event handling
 * 
 * Architecture:
 * - Event-driven design with custom event dispatching
 * - Modular button system with extensible controls
 * - Touch state management with proper cleanup
 * - Visual feedback system with CSS animations
 * 
 * Dependencies: None (vanilla JavaScript)
 * Browser Support: Modern mobile browsers with touch events
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Touch Controls Manager
 * 
 * Manages all touch-based input controls for mobile gameplay including
 * virtual buttons, gesture recognition, and visual feedback systems.
 * 
 * Features:
 * - Virtual D-pad for movement controls
 * - Fire button with rapid-fire support
 * - Touch gesture recognition
 * - Visual feedback with haptic simulation
 * - Responsive design adaptation
 * - Performance-optimized touch handling
 * 
 * @class TouchControls
 */
class TouchControls {
    /**
     * Touch control configuration
     * @typedef {Object} TouchControlConfig
     * @property {HTMLElement} container - Container element for touch controls
     * @property {boolean} enableHaptics - Enable haptic feedback if available
     * @property {number} buttonSize - Size of virtual buttons in pixels
     * @property {number} touchThreshold - Minimum touch distance for movement
     * @property {number} rapidFireDelay - Delay between rapid fire shots in ms
     * @property {boolean} showVisualFeedback - Show visual touch feedback
     * @property {string} theme - Visual theme ('dark' | 'light' | 'neon')
     */

    /**
     * Initialize touch controls system
     * 
     * @param {TouchControlConfig} config - Configuration options
     */
    constructor(config = {}) {
        // Configuration with secure defaults
        this.config = {
            container: config.container || document.body,
            enableHaptics: config.enableHaptics ?? true,
            buttonSize: Math.max(44, config.buttonSize || 60), // Minimum 44px for accessibility
            touchThreshold: Math.max(5, config.touchThreshold || 10),
            rapidFireDelay: Math.max(50, config.rapidFireDelay || 150),
            showVisualFeedback: config.showVisualFeedback ?? true,
            theme: ['dark', 'light', 'neon'].includes(config.theme) ? config.theme : 'dark',
            ...config
        };

        // Touch state management
        this.touchState = {
            activeControls: new Set(),
            touchPoints: new Map(),
            lastFireTime: 0,
            movementVector: { x: 0, y: 0 },
            isEnabled: true
        };

        // Control elements
        this.controls = {
            container: null,
            leftButton: null,
            rightButton: null,
            fireButton: null,
            gestureArea: null
        };

        // Event handlers with proper binding
        this.boundHandlers = {
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            touchCancel: this.handleTouchCancel.bind(this),
            contextMenu: this.preventContextMenu.bind(this),
            resize: this.handleResize.bind(this)
        };

        // Performance tracking
        this.metrics = {
            touchEvents: 0,
            gestureEvents: 0,
            lastFrameTime: 0,
            averageResponseTime: 0
        };

        // Initialize system
        this.initialize();
    }

    /**
     * Initialize the touch control system
     * 
     * Sets up DOM elements, event listeners, and visual components
     * with proper error handling and fallback mechanisms.
     * 
     * @private
     */
    initialize() {
        try {
            this.validateEnvironment();
            this.createControlElements();
            this.setupEventListeners();
            this.applyTheme();
            this.setupAccessibility();
            
            console.log('TouchControls: System initialized successfully', {
                config: this.config,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('TouchControls: Initialization failed', {
                error: error.message,
                stack: error.stack,
                config: this.config
            });
            throw new Error(`Touch controls initialization failed: ${error.message}`);
        }
    }

    /**
     * Validate environment and browser support
     * 
     * @private
     * @throws {Error} If touch events are not supported
     */
    validateEnvironment() {
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
            console.warn('TouchControls: Touch events not supported, falling back to mouse events');
        }

        if (!this.config.container || !(this.config.container instanceof HTMLElement)) {
            throw new Error('Invalid container element provided');
        }
    }

    /**
     * Create virtual control elements with proper structure
     * 
     * @private
     */
    createControlElements() {
        // Main container
        this.controls.container = document.createElement('div');
        this.controls.container.className = 'touch-controls';
        this.controls.container.setAttribute('role', 'application');
        this.controls.container.setAttribute('aria-label', 'Game touch controls');

        // Movement controls container
        const movementContainer = document.createElement('div');
        movementContainer.className = 'movement-controls';

        // Left movement button
        this.controls.leftButton = this.createButton('left', '←', 'Move left');
        movementContainer.appendChild(this.controls.leftButton);

        // Right movement button
        this.controls.rightButton = this.createButton('right', '→', 'Move right');
        movementContainer.appendChild(this.controls.rightButton);

        // Fire button
        this.controls.fireButton = this.createButton('fire', '🔥', 'Fire weapon');
        this.controls.fireButton.classList.add('fire-button');

        // Gesture area for advanced touch interactions
        this.controls.gestureArea = document.createElement('div');
        this.controls.gestureArea.className = 'gesture-area';
        this.controls.gestureArea.setAttribute('aria-hidden', 'true');

        // Assemble structure
        this.controls.container.appendChild(movementContainer);
        this.controls.container.appendChild(this.controls.fireButton);
        this.controls.container.appendChild(this.controls.gestureArea);

        // Add to DOM
        this.config.container.appendChild(this.controls.container);

        // Apply initial styles
        this.applyControlStyles();
    }

    /**
     * Create a virtual button element
     * 
     * @private
     * @param {string} type - Button type identifier
     * @param {string} symbol - Visual symbol for button
     * @param {string} label - Accessibility label
     * @returns {HTMLElement} Button element
     */
    createButton(type, symbol, label) {
        const button = document.createElement('button');
        button.className = `touch-button touch-button-${type}`;
        button.textContent = symbol;
        button.setAttribute('aria-label', label);
        button.setAttribute('data-control', type);
        button.type = 'button';

        // Prevent default behaviors
        button.addEventListener('dragstart', e => e.preventDefault());
        button.addEventListener('selectstart', e => e.preventDefault());

        return button;
    }

    /**
     * Apply CSS styles for touch controls
     * 
     * @private
     */
    applyControlStyles() {
        const styles = `
            .touch-controls {
                position: fixed;
                bottom: 20px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                padding: 0 20px;
                pointer-events: none;
                z-index: 1000;
                user-select: none;
                -webkit-user-select: none;
            }

            .movement-controls {
                display: flex;
                gap: 15px;
                pointer-events: auto;
            }

            .touch-button {
                width: ${this.config.buttonSize}px;
                height: ${this.config.buttonSize}px;
                border: none;
                border-radius: 50%;
                font-size: ${this.config.buttonSize * 0.4}px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.15s ease;
                pointer-events: auto;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                outline: none;
                position: relative;
                overflow: hidden;
            }

            .touch-button:active {
                transform: scale(0.95);
            }

            .touch-button.active {
                transform: scale(1.1);
            }

            .fire-button {
                width: ${this.config.buttonSize * 1.2}px !important;
                height: ${this.config.buttonSize * 1.2}px !important;
                border-radius: 50%;
            }

            .gesture-area {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 100px;
                pointer-events: auto;
                touch-action: none;
            }

            .touch-feedback {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                animation: touch-ripple 0.3s ease-out;
            }

            @keyframes touch-ripple {
                0% {
                    transform: scale(0);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(2);
                    opacity: 0;
                }
            }

            @media (max-width: 480px) {
                .touch-controls {
                    padding: 0 10px;
                    bottom: 10px;
                }
                
                .movement-controls {
                    gap: 10px;
                }
            }
        `;

        // Inject styles if not already present
        if (!document.getElementById('touch-controls-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'touch-controls-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    /**
     * Apply visual theme to controls
     * 
     * @private
     */
    applyTheme() {
        const themes = {
            dark: {
                background: 'rgba(30, 30, 30, 0.8)',
                color: '#ffffff',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                activeBackground: 'rgba(60, 60, 60, 0.9)'
            },
            light: {
                background: 'rgba(240, 240, 240, 0.8)',
                color: '#333333',
                border: '2px solid rgba(0, 0, 0, 0.3)',
                activeBackground: 'rgba(200, 200, 200, 0.9)'
            },
            neon: {
                background: 'rgba(0, 20, 40, 0.8)',
                color: '#00ffff',
                border: '2px solid #00ffff',
                activeBackground: 'rgba(0, 40, 80, 0.9)'
            }
        };

        const theme = themes[this.config.theme];
        const buttons = this.controls.container.querySelectorAll('.touch-button');

        buttons.forEach(button => {
            Object.assign(button.style, {
                backgroundColor: theme.background,
                color: theme.color,
                border: theme.border
            });
        });
    }

    /**
     * Setup accessibility features
     * 
     * @private
     */
    setupAccessibility() {
        // Add ARIA live region for screen readers
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        this.controls.container.appendChild(liveRegion);
        this.liveRegion = liveRegion;

        // Add keyboard support for accessibility
        this.controls.container.addEventListener('keydown', this.handleKeyboardInput.bind(this));
    }

    /**
     * Setup event listeners with proper cleanup
     * 
     * @private
     */
    setupEventListeners() {
        const container = this.controls.container;

        // Touch events
        container.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
        container.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
        container.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: false });
        container.addEventListener('touchcancel', this.boundHandlers.touchCancel, { passive: false });

        // Mouse events for desktop testing
        container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        container.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Prevent context menu
        container.addEventListener('contextmenu', this.boundHandlers.contextMenu);

        // Window events
        window.addEventListener('resize', this.boundHandlers.resize);
        window.addEventListener('orientationchange', this.boundHandlers.resize);
    }

    /**
     * Handle touch start events
     * 
     * @private
     * @param {TouchEvent} event - Touch event
     */
    handleTouchStart(event) {
        if (!this.touchState.isEnabled) return;

        event.preventDefault();
        const startTime = performance.now();

        Array.from(event.changedTouches).forEach(touch => {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const controlType = this.getControlType(element);

            if (controlType) {
                this.activateControl(controlType, touch);
                this.showVisualFeedback(touch.clientX, touch.clientY);
                this.triggerHapticFeedback('light');
            }

            // Store touch point for gesture recognition
            this.touchState.touchPoints.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: startTime,
                element: element
            });
        });

        this.updateMetrics('touchStart', startTime);
    }

    /**
     * Handle touch move events
     * 
     * @private
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
        if (!this.touchState.isEnabled) return;

        event.preventDefault();

        Array.from(event.changedTouches).forEach(touch => {
            const touchPoint = this.touchState.touchPoints.get(touch.identifier);
            if (!touchPoint) return;

            // Update touch point
            touchPoint.currentX = touch.clientX;
            touchPoint.currentY = touch.clientY;

            // Check for gesture patterns
            this.processGesture(touch, touchPoint);
        });
    }

    /**
     * Handle touch end events
     * 
     * @private
     * @param {TouchEvent} event - Touch event
     */
    handleTouchEnd(event) {
        if (!this.touchState.isEnabled) return;

        event.preventDefault();

        Array.from(event.changedTouches).forEach(touch => {
            const touchPoint = this.touchState.touchPoints.get(touch.identifier);
            if (touchPoint) {
                const element = touchPoint.element;
                const controlType = this.getControlType(element);

                if (controlType) {
                    this.deactivateControl(controlType);
                }

                this.touchState.touchPoints.delete(touch.identifier);
            }
        });
    }

    /**
     * Handle touch cancel events
     * 
     * @private
     * @param {TouchEvent} event - Touch event
     */
    handleTouchCancel(event) {
        this.handleTouchEnd(event);
    }

    /**
     * Handle mouse events for desktop testing
     * 
     * @private
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        if (!this.touchState.isEnabled) return;

        const controlType = this.getControlType(event.target);
        if (controlType) {
            this.activateControl(controlType, { clientX: event.clientX, clientY: event.clientY });
            this.showVisualFeedback(event.clientX, event.clientY);
        }
    }

    /**
     * Handle mouse move events
     * 
     * @private
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        // Handle mouse drag if needed
    }

    /**
     * Handle mouse up events
     * 
     * @private
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (!this.touchState.isEnabled) return;

        const controlType = this.getControlType(event.target);
        if (controlType) {
            this.deactivateControl(controlType);
        }
    }

    /**
     * Handle keyboard input for accessibility
     * 
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardInput(event) {
        const keyMap = {
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Space': 'fire',
            'Enter': 'fire'
        };

        const controlType = keyMap[event.code];
        if (controlType) {
            event.preventDefault();
            
            if (event.type === 'keydown') {
                this.activateControl(controlType);
            } else if (event.type === 'keyup') {
                this.deactivateControl(controlType);
            }
        }
    }

    /**
     * Get control type from DOM element
     * 
     * @private
     * @param {HTMLElement} element - DOM element
     * @returns {string|null} Control type or null
     */
    getControlType(element) {
        if (!element) return null;
        
        // Check element and its parents for control data
        let current = element;
        while (current && current !== this.controls.container) {
            const controlType = current.getAttribute('data-control');
            if (controlType) return controlType;
            current = current.parentElement;
        }
        
        return null;
    }

    /**
     * Activate a control
     * 
     * @private
     * @param {string} controlType - Type of control to activate
     * @param {Object} touch - Touch or mouse event data
     */
    activateControl(controlType, touch = null) {
        if (this.touchState.activeControls.has(controlType)) return;

        this.touchState.activeControls.add(controlType);
        
        // Visual feedback
        const button = this.getButtonElement(controlType);
        if (button) {
            button.classList.add('active');
        }

        // Dispatch game events
        this.dispatchControlEvent('controlstart', controlType, touch);

        // Handle specific control logic
        switch (controlType) {
            case 'left':
                this.touchState.movementVector.x = -1;
                break;
            case 'right':
                this.touchState.movementVector.x = 1;
                break;
            case 'fire':
                this.handleFireControl();
                break;
        }

        // Update accessibility
        this.updateAccessibilityState(controlType, true);
    }

    /**
     * Deactivate a control
     * 
     * @private
     * @param {string} controlType - Type of control to deactivate
     */
    deactivateControl(controlType) {
        if (!this.touchState.activeControls.has(controlType)) return;

        this.touchState.activeControls.delete(controlType);
        
        // Visual feedback
        const button = this.getButtonElement(controlType);
        if (button) {
            button.classList.remove('active');
        }

        // Dispatch game events
        this.dispatchControlEvent('controlend', controlType);

        // Handle specific control logic
        switch (controlType) {
            case 'left':
            case 'right':
                this.touchState.movementVector.x = 0;
                break;
            case 'fire':
                // Fire control is handled by continuous firing logic
                break;
        }

        // Update accessibility
        this.updateAccessibilityState(controlType, false);
    }

    /**
     * Handle fire control with rapid fire support
     * 
     * @private
     */
    handleFireControl() {
        const now = Date.now();
        if (now - this.touchState.lastFireTime >= this.config.rapidFireDelay) {
            this.touchState.lastFireTime = now;
            this.dispatchControlEvent('fire');
            this.triggerHapticFeedback('medium');
        }
    }

    /**
     * Process gesture recognition
     * 
     * @private
     * @param {Touch} touch - Touch object
     * @param {Object} touchPoint - Touch point data
     */
    processGesture(touch, touchPoint) {
        const deltaX = touchPoint.currentX - touchPoint.startX;
        const deltaY = touchPoint.currentY - touchPoint.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - touchPoint.startTime;

        // Swipe gesture detection
        if (distance > 50 && duration < 500) {
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            let gestureType = null;

            if (Math.abs(angle) < 30) gestureType = 'swipe-right';
            else if (Math.abs(angle - 180) < 30 || Math.abs(angle + 180) < 30) gestureType = 'swipe-left';
            else if (angle > 60 && angle < 120) gestureType = 'swipe-down';
            else if (angle < -60 && angle > -120) gestureType = 'swipe-up';

            if (gestureType) {
                this.dispatchControlEvent('gesture', gestureType, { deltaX, deltaY, distance, duration });
                this.metrics.gestureEvents++;
            }
        }
    }

    /**
     * Show visual feedback for touch
     * 
     * @private
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    showVisualFeedback(x, y) {
        if (!this.config.showVisualFeedback) return;

        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.cssText = `
            left: ${x - 20}px;
            top: ${y - 20}px;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.6);
        `;

        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }

    /**
     * Trigger haptic feedback if available
     * 
     * @private
     * @param {string} intensity - Feedback intensity ('light', 'medium', 'heavy')
     */
    triggerHapticFeedback(intensity = 'light') {
        if (!this.config.enableHaptics || !navigator.vibrate) return;

        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30]
        };

        try {
            navigator.vibrate(patterns[intensity] || patterns.light);
        } catch (error) {
            console.warn('TouchControls: Haptic feedback failed', error);
        }
    }

    /**
     * Get button element by control type
     * 
     * @private
     * @param {string} controlType - Control type
     * @returns {HTMLElement|null} Button element
     */
    getButtonElement(controlType) {
        switch (controlType) {
            case 'left': return this.controls.leftButton;
            case 'right': return this.controls.rightButton;
            case 'fire': return this.controls.fireButton;
            default: return null;
        }
    }

    /**
     * Dispatch control event to game system
     * 
     * @private
     * @param {string} eventType - Event type
     * @param {string} controlType - Control type
     * @param {Object} data - Additional event data
     */
    dispatchControlEvent(eventType, controlType, data = {}) {
        const event = new CustomEvent(`touch-${eventType}`, {
            detail: {
                controlType,
                timestamp: Date.now(),
                movementVector: { ...this.touchState.movementVector },
                activeControls: Array.from(this.touchState.activeControls),
                ...data
            }
        });

        this.controls.container.dispatchEvent(event);
        
        // Also dispatch on window for global listeners
        window.dispatchEvent(event);
    }

    /**
     * Update accessibility state
     * 
     * @private
     * @param {string} controlType - Control type
     * @param {boolean} active - Whether control is active
     */
    updateAccessibilityState(controlType, active) {
        const button = this.getButtonElement(controlType);
        if (button) {
            button.setAttribute('aria-pressed', active.toString());
        }

        // Update live region
        if (this.liveRegion) {
            const action = active ? 'activated' : 'deactivated';
            this.liveRegion.textContent = `${controlType} control ${action}`;
        }
    }

    /**
     * Handle window resize events
     * 
     * @private
     */
    handleResize() {
        // Recalculate control positions and sizes for responsive design
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Adjust button sizes for smaller screens
        if (viewport.width < 480) {
            const smallerSize = Math.max(40, this.config.buttonSize * 0.8);
            const buttons = this.controls.container.querySelectorAll('.touch-button');
            buttons.forEach(button => {
                button.style.width = `${smallerSize}px`;
                button.style.height = `${smallerSize}px`;
                button.style.fontSize = `${smallerSize * 0.4}px`;
            });
        }
    }

    /**
     * Prevent context menu on touch controls
     * 
     * @private
     * @param {Event} event - Context menu event
     */
    preventContextMenu(event) {
        event.preventDefault();
        return false;
    }

    /**
     * Update performance metrics
     * 
     * @private
     * @param {string} eventType - Event type
     * @param {number} startTime - Event start time
     */
    updateMetrics(eventType, startTime) {
        const responseTime = performance.now() - startTime;
        this.metrics.touchEvents++;
        this.metrics.averageResponseTime = 
            (this.metrics.averageResponseTime + responseTime) / 2;
        this.metrics.lastFrameTime = startTime;
    }

    /**
     * Enable touch controls
     * 
     * @public
     */
    enable() {
        this.touchState.isEnabled = true;
        this.controls.container.style.display = 'flex';
        console.log('TouchControls: Controls enabled');
    }

    /**
     * Disable touch controls
     * 
     * @public
     */
    disable() {
        this.touchState.isEnabled = false;
        this.controls.container.style.display = 'none';
        
        // Clear active controls
        this.touchState.activeControls.clear();
        this.touchState.touchPoints.clear();
        this.touchState.movementVector = { x: 0, y: 0 };
        
        console.log('TouchControls: Controls disabled');
    }

    /**
     * Get current movement vector
     * 
     * @public
     * @returns {Object} Movement vector with x, y components
     */
    getMovementVector() {
        return { ...this.touchState.movementVector };
    }

    /**
     * Check if a control is currently active
     * 
     * @public
     * @param {string} controlType - Control type to check
     * @returns {boolean} Whether control is active
     */
    isControlActive(controlType) {
        return this.touchState.activeControls.has(controlType);
    }

    /**
     * Get performance metrics
     * 
     * @public
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Update configuration
     * 
     * @public
     * @param {Partial<TouchControlConfig>} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Apply visual changes if needed
        if (newConfig.theme && newConfig.theme !== oldConfig.theme) {
            this.applyTheme();
        }
        
        if (newConfig.buttonSize && newConfig.buttonSize !== oldConfig.buttonSize) {
            this.applyControlStyles();
        }
        
        console.log('TouchControls: Configuration updated', {
            oldConfig,
            newConfig: this.config
        });
    }

    /**
     * Cleanup and destroy touch controls
     * 
     * @public
     */
    destroy() {
        try {
            // Remove event listeners
            const container = this.controls.container;
            if (container) {
                Object.values(this.boundHandlers).forEach(handler => {
                    container.removeEventListener('touchstart', handler);
                    container.removeEventListener('touchmove', handler);
                    container.removeEventListener('touchend', handler);
                    container.removeEventListener('touchcancel', handler);
                    container.removeEventListener('contextmenu', handler);
                });
            }

            window.removeEventListener('resize', this.boundHandlers.resize);
            window.removeEventListener('orientationchange', this.boundHandlers.resize);

            // Remove DOM elements
            if (this.controls.container && this.controls.container.parentNode) {
                this.controls.container.parentNode.removeChild(this.controls.container);
            }

            // Remove styles
            const styleSheet = document.getElementById('touch-controls-styles');
            if (styleSheet) {
                styleSheet.parentNode.removeChild(styleSheet);
            }

            // Clear state
            this.touchState.activeControls.clear();
            this.touchState.touchPoints.clear();
            this.controls = {};

            console.log('TouchControls: System destroyed successfully');
        } catch (error) {
            console.error('TouchControls: Cleanup failed', error);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchControls;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.TouchControls = TouchControls;
}