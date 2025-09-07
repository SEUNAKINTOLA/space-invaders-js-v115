* 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Event type definitions for type safety and documentation
 */
const EVENT_TYPES = Object.freeze({
  // Score Events
  SCORE_UPDATED: 'score:updated',
  HIGH_SCORE_ACHIEVED: 'score:highScore',
  COMBO_STARTED: 'score:comboStarted',
  COMBO_ENDED: 'score:comboEnded',
  MULTIPLIER_CHANGED: 'score:multiplierChanged',
  
  // Enemy Events
  ENEMY_DESTROYED: 'enemy:destroyed',
  ENEMY_SPAWNED: 'enemy:spawned',
  ENEMY_REACHED_BOUNDARY: 'enemy:reachedBoundary',
  BOSS_DEFEATED: 'enemy:bossDefeated',
  
  // Wave Events
  WAVE_STARTED: 'wave:started',
  WAVE_COMPLETED: 'wave:completed',
  WAVE_FAILED: 'wave:failed',
  ALL_WAVES_COMPLETED: 'wave:allCompleted',
  
  // Game State Events
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_OVER: 'game:over',
  GAME_RESET: 'game:reset',
  LEVEL_UP: 'game:levelUp',
  
  // Player Events
  PLAYER_HIT: 'player:hit',
  PLAYER_DESTROYED: 'player:destroyed',
  PLAYER_RESPAWNED: 'player:respawned',
  LIVES_CHANGED: 'player:livesChanged',
  
  // System Events
  PERFORMANCE_WARNING: 'system:performanceWarning',
  ERROR_OCCURRED: 'system:error',
  SETTINGS_CHANGED: 'system:settingsChanged',
  AUDIO_STATE_CHANGED: 'system:audioStateChanged'
});

/**
 * Event data validation schemas
 */
const EVENT_SCHEMAS = Object.freeze({
  [EVENT_TYPES.SCORE_UPDATED]: {
    required: ['currentScore'],
    optional: ['previousScore', 'delta', 'reason']
  },
  [EVENT_TYPES.HIGH_SCORE_ACHIEVED]: {
    required: ['newHighScore', 'previousHighScore'],
    optional: ['playerName', 'timestamp']
  },
  [EVENT_TYPES.ENEMY_DESTROYED]: {
    required: ['enemyType', 'points'],
    optional: ['position', 'weaponUsed', 'comboMultiplier']
  },
  [EVENT_TYPES.WAVE_STARTED]: {
    required: ['waveNumber'],
    optional: ['enemyCount', 'difficulty', 'specialEnemies']
  },
  [EVENT_TYPES.GAME_OVER]: {
    required: ['finalScore'],
    optional: ['reason', 'duration', 'statistics']
  }
});

/**
 * Performance monitoring configuration
 */
const PERFORMANCE_CONFIG = Object.freeze({
  MAX_LISTENERS_PER_EVENT: 50,
  MAX_EVENT_QUEUE_SIZE: 1000,
  CLEANUP_INTERVAL: 30000, // 30 seconds
  WARNING_THRESHOLD: 100 // ms for event processing
});

/**
 * GameEvents - A high-performance, type-safe event emitter system
 */
class GameEvents {
  constructor() {
    /**
     * Event listeners storage
     * @type {Map<string, Set<Function>>}
     */
    this._listeners = new Map();
    
    /**
     * One-time event listeners
     * @type {Map<string, Set<Function>>}
     */
    this._onceListeners = new Map();
    
    /**
     * Event processing queue for async handling
     * @type {Array<{type: string, data: any, timestamp: number}>}
     */
    this._eventQueue = [];
    
    /**
     * Performance metrics
     * @type {Object}
     */
    this._metrics = {
      eventsEmitted: 0,
      eventsProcessed: 0,
      averageProcessingTime: 0,
      errors: 0,
      lastCleanup: Date.now()
    };
    
    /**
     * Debug mode flag
     * @type {boolean}
     */
    this._debugMode = false;
    
    /**
     * Maximum listeners warning flag
     * @type {boolean}
     */
    this._maxListenersWarningShown = false;
    
    // Initialize cleanup interval
    this._initializeCleanup();
    
    // Bind methods to preserve context
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.off = this.off.bind(this);
    this.emit = this.emit.bind(this);
    this.clear = this.clear.bind(this);
    
    this._log('GameEvents system initialized', 'info');
  }
  
  /**
   * Add an event listener
   * @param {string} eventType - The event type to listen for
   * @param {Function} listener - The callback function
   * @param {Object} options - Optional configuration
   * @returns {GameEvents} - Returns this for method chaining
   */
  on(eventType, listener, options = {}) {
    try {
      this._validateEventType(eventType);
      this._validateListener(listener);
      
      if (!this._listeners.has(eventType)) {
        this._listeners.set(eventType, new Set());
      }
      
      const listeners = this._listeners.get(eventType);
      
      // Check for maximum listeners
      if (listeners.size >= PERFORMANCE_CONFIG.MAX_LISTENERS_PER_EVENT) {
        this._handleMaxListenersWarning(eventType);
      }
      
      // Add metadata to listener if needed
      if (options.priority || options.context) {
        listener._eventMetadata = {
          priority: options.priority || 0,
          context: options.context,
          addedAt: Date.now()
        };
      }
      
      listeners.add(listener);
      
      this._log(`Event listener added for '${eventType}'`, 'debug');
      
      return this;
    } catch (error) {
      this._handleError('Failed to add event listener', error, { eventType });
      return this;
    }
  }
  
  /**
   * Add a one-time event listener
   * @param {string} eventType - The event type to listen for
   * @param {Function} listener - The callback function
   * @returns {GameEvents} - Returns this for method chaining
   */
  once(eventType, listener) {
    try {
      this._validateEventType(eventType);
      this._validateListener(listener);
      
      if (!this._onceListeners.has(eventType)) {
        this._onceListeners.set(eventType, new Set());
      }
      
      this._onceListeners.get(eventType).add(listener);
      
      this._log(`One-time event listener added for '${eventType}'`, 'debug');
      
      return this;
    } catch (error) {
      this._handleError('Failed to add one-time event listener', error, { eventType });
      return this;
    }
  }
  
  /**
   * Remove an event listener
   * @param {string} eventType - The event type
   * @param {Function} listener - The callback function to remove
   * @returns {GameEvents} - Returns this for method chaining
   */
  off(eventType, listener) {
    try {
      this._validateEventType(eventType);
      
      // Remove from regular listeners
      if (this._listeners.has(eventType)) {
        const listeners = this._listeners.get(eventType);
        listeners.delete(listener);
        
        if (listeners.size === 0) {
          this._listeners.delete(eventType);
        }
      }
      
      // Remove from one-time listeners
      if (this._onceListeners.has(eventType)) {
        const onceListeners = this._onceListeners.get(eventType);
        onceListeners.delete(listener);
        
        if (onceListeners.size === 0) {
          this._onceListeners.delete(eventType);
        }
      }
      
      this._log(`Event listener removed for '${eventType}'`, 'debug');
      
      return this;
    } catch (error) {
      this._handleError('Failed to remove event listener', error, { eventType });
      return this;
    }
  }
  
  /**
   * Emit an event to all listeners
   * @param {string} eventType - The event type to emit
   * @param {any} data - The event data
   * @param {Object} options - Optional configuration
   * @returns {boolean} - True if event was processed successfully
   */
  emit(eventType, data = null, options = {}) {
    const startTime = performance.now();
    
    try {
      this._validateEventType(eventType);
      this._validateEventData(eventType, data);
      
      const eventObject = {
        type: eventType,
        data: data,
        timestamp: Date.now(),
        id: this._generateEventId()
      };
      
      // Add to queue if async processing is enabled
      if (options.async) {
        this._addToQueue(eventObject);
        return true;
      }
      
      let listenersNotified = 0;
      
      // Process regular listeners
      if (this._listeners.has(eventType)) {
        const listeners = Array.from(this._listeners.get(eventType));
        listenersNotified += this._processListeners(listeners, eventObject);
      }
      
      // Process one-time listeners
      if (this._onceListeners.has(eventType)) {
        const onceListeners = Array.from(this._onceListeners.get(eventType));
        listenersNotified += this._processListeners(onceListeners, eventObject);
        
        // Clear one-time listeners
        this._onceListeners.delete(eventType);
      }
      
      // Update metrics
      this._updateMetrics(startTime, listenersNotified);
      
      this._log(`Event '${eventType}' emitted to ${listenersNotified} listeners`, 'debug');
      
      return true;
    } catch (error) {
      this._handleError('Failed to emit event', error, { eventType, data });
      return false;
    }
  }
  
  /**
   * Remove all listeners for a specific event type or all events
   * @param {string} [eventType] - Optional event type to clear
   * @returns {GameEvents} - Returns this for method chaining
   */
  clear(eventType = null) {
    try {
      if (eventType) {
        this._listeners.delete(eventType);
        this._onceListeners.delete(eventType);
        this._log(`Cleared all listeners for '${eventType}'`, 'debug');
      } else {
        this._listeners.clear();
        this._onceListeners.clear();
        this._eventQueue.length = 0;
        this._log('Cleared all event listeners', 'debug');
      }
      
      return this;
    } catch (error) {
      this._handleError('Failed to clear event listeners', error, { eventType });
      return this;
    }
  }
  
  /**
   * Get the number of listeners for an event type
   * @param {string} eventType - The event type
   * @returns {number} - Number of listeners
   */
  listenerCount(eventType) {
    try {
      this._validateEventType(eventType);
      
      const regularCount = this._listeners.has(eventType) 
        ? this._listeners.get(eventType).size 
        : 0;
      const onceCount = this._onceListeners.has(eventType) 
        ? this._onceListeners.get(eventType).size 
        : 0;
      
      return regularCount + onceCount;
    } catch (error) {
      this._handleError('Failed to get listener count', error, { eventType });
      return 0;
    }
  }
  
  /**
   * Get all registered event types
   * @returns {Array<string>} - Array of event types
   */
  eventTypes() {
    const types = new Set([
      ...this._listeners.keys(),
      ...this._onceListeners.keys()
    ]);
    return Array.from(types);
  }
  
  /**
   * Get performance metrics
   * @returns {Object} - Performance metrics object
   */
  getMetrics() {
    return {
      ...this._metrics,
      queueSize: this._eventQueue.length,
      activeEventTypes: this.eventTypes().length,
      totalListeners: this._getTotalListenerCount()
    };
  }
  
  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this._debugMode = Boolean(enabled);
    this._log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
  }
  
  /**
   * Process queued events (for async processing)
   * @returns {number} - Number of events processed
   */
  processQueue() {
    let processed = 0;
    const maxProcess = Math.min(this._eventQueue.length, 10); // Process max 10 at a time
    
    for (let i = 0; i < maxProcess; i++) {
      const event = this._eventQueue.shift();
      if (event) {
        this.emit(event.type, event.data);
        processed++;
      }
    }
    
    return processed;
  }
  
  // Private Methods
  
  /**
   * Initialize cleanup interval
   * @private
   */
  _initializeCleanup() {
    setInterval(() => {
      this._performCleanup();
    }, PERFORMANCE_CONFIG.CLEANUP_INTERVAL);
  }
  
  /**
   * Perform periodic cleanup
   * @private
   */
  _performCleanup() {
    const now = Date.now();
    
    // Clean up old queued events
    this._eventQueue = this._eventQueue.filter(event => 
      now - event.timestamp < 60000 // Keep events for max 1 minute
    );
    
    // Reset metrics if needed
    if (now - this._metrics.lastCleanup > 300000) { // 5 minutes
      this._metrics.eventsEmitted = 0;
      this._metrics.eventsProcessed = 0;
      this._metrics.errors = 0;
      this._metrics.lastCleanup = now;
    }
    
    this._log('Performed cleanup', 'debug');
  }
  
  /**
   * Validate event type
   * @private
   * @param {string} eventType - The event type to validate
   */
  _validateEventType(eventType) {
    if (typeof eventType !== 'string' || eventType.trim() === '') {
      throw new Error('Event type must be a non-empty string');
    }
  }
  
  /**
   * Validate listener function
   * @private
   * @param {Function} listener - The listener to validate
   */
  _validateListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Event listener must be a function');
    }
  }
  
  /**
   * Validate event data against schema
   * @private
   * @param {string} eventType - The event type
   * @param {any} data - The event data
   */
  _validateEventData(eventType, data) {
    const schema = EVENT_SCHEMAS[eventType];
    if (!schema || !data) return;
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new Error(`Missing required field '${field}' for event '${eventType}'`);
        }
      }
    }
  }
  
  /**
   * Process listeners for an event
   * @private
   * @param {Array<Function>} listeners - Array of listener functions
   * @param {Object} eventObject - The event object
   * @returns {number} - Number of listeners processed
   */
  _processListeners(listeners, eventObject) {
    let processed = 0;
    
    // Sort listeners by priority if they have metadata
    const sortedListeners = listeners.sort((a, b) => {
      const aPriority = a._eventMetadata?.priority || 0;
      const bPriority = b._eventMetadata?.priority || 0;
      return bPriority - aPriority; // Higher priority first
    });
    
    for (const listener of sortedListeners) {
      try {
        const context = listener._eventMetadata?.context || null;
        if (context) {
          listener.call(context, eventObject.data, eventObject);
        } else {
          listener(eventObject.data, eventObject);
        }
        processed++;
      } catch (error) {
        this._handleError('Listener execution failed', error, {
          eventType: eventObject.type,
          listener: listener.name || 'anonymous'
        });
      }
    }
    
    return processed;
  }
  
  /**
   * Add event to processing queue
   * @private
   * @param {Object} eventObject - The event object
   */
  _addToQueue(eventObject) {
    if (this._eventQueue.length >= PERFORMANCE_CONFIG.MAX_EVENT_QUEUE_SIZE) {
      this._eventQueue.shift(); // Remove oldest event
      this._log('Event queue full, removed oldest event', 'warn');
    }
    
    this._eventQueue.push(eventObject);
  }
  
  /**
   * Generate unique event ID
   * @private
   * @returns {string} - Unique event ID
   */
  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Update performance metrics
   * @private
   * @param {number} startTime - Processing start time
   * @param {number} listenersNotified - Number of listeners notified
   */
  _updateMetrics(startTime, listenersNotified) {
    const processingTime = performance.now() - startTime;
    
    this._metrics.eventsEmitted++;
    this._metrics.eventsProcessed += listenersNotified;
    this._metrics.averageProcessingTime = 
      (this._metrics.averageProcessingTime + processingTime) / 2;
    
    if (processingTime > PERFORMANCE_CONFIG.WARNING_THRESHOLD) {
      this._log(`Slow event processing detected: ${processingTime.toFixed(2)}ms`, 'warn');
    }
  }
  
  /**
   * Get total listener count across all events
   * @private
   * @returns {number} - Total listener count
   */
  _getTotalListenerCount() {
    let total = 0;
    
    for (const listeners of this._listeners.values()) {
      total += listeners.size;
    }
    
    for (const listeners of this._onceListeners.values()) {
      total += listeners.size;
    }
    
    return total;
  }
  
  /**
   * Handle maximum listeners warning
   * @private
   * @param {string} eventType - The event type
   */
  _handleMaxListenersWarning(eventType) {
    if (!this._maxListenersWarningShown) {
      this._log(
        `Maximum listeners (${PERFORMANCE_CONFIG.MAX_LISTENERS_PER_EVENT}) ` +
        `reached for event '${eventType}'. Consider reviewing your event architecture.`,
        'warn'
      );
      this._maxListenersWarningShown = true;
    }
  }
  
  /**
   * Handle errors with comprehensive logging
   * @private
   * @param {string} message - Error message
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  _handleError(message, error, context = {}) {
    this._metrics.errors++;
    
    const errorInfo = {
      message,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics()
    };
    
    this._log(`ERROR: ${message}`, 'error', errorInfo);
    
    // Emit error event if not already in error handling
    if (context.eventType !== EVENT_TYPES.ERROR_OCCURRED) {
      try {
        this.emit(EVENT_TYPES.ERROR_OCCURRED, errorInfo);
      } catch (nestedError) {
        console.error('Failed to emit error event:', nestedError);
      }
    }
  }
  
  /**
   * Internal logging method
   * @private
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} data - Additional data
   */
  _log(message, level = 'info', data = null) {
    if (!this._debugMode && level === 'debug') return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      component: 'GameEvents',
      message,
      ...(data && { data })
    };
    
    switch (level) {
      case 'error':
        console.error('[GameEvents]', message, data);
        break;
      case 'warn':
        console.warn('[GameEvents]', message, data);
        break;
      case 'debug':
        console.debug('[GameEvents]', message, data);
        break;
      default:
        console.log('[GameEvents]', message, data);
    }
  }
}

// Create singleton instance
const gameEvents = new GameEvents();

// Export event types for external use
export { EVENT_TYPES };

// Export the singleton instance
export { gameEvents };

// Export the class for testing purposes
export { GameEvents };

// Default export
export default gameEvents;