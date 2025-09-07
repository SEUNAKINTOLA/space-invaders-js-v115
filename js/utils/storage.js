/**
 * Storage Utility Module for Space Invaders Game
 * 
 * Provides comprehensive local storage management with high score persistence,
 * data validation, error handling, and graceful fallbacks for storage unavailability.
 * 
 * Key Features:
 * - High score persistence with validation
 * - Automatic data migration and versioning
 * - Fallback mechanisms for storage unavailability
 * - Comprehensive error handling and logging
 * - Data integrity checks and recovery
 * 
 * Architecture:
 * - Repository pattern for data access abstraction
 * - Strategy pattern for different storage backends
 * - Observer pattern for storage events
 * - Circuit breaker pattern for error resilience
 * 
 * @module storage
 * @version 1.0.0
 * @author Space Invaders Development Team
 */

/**
 * Storage configuration constants
 */
const STORAGE_CONFIG = {
    VERSION: '1.0.0',
    KEYS: {
        HIGH_SCORES: 'spaceInvaders_highScores',
        GAME_SETTINGS: 'spaceInvaders_settings',
        PLAYER_STATS: 'spaceInvaders_playerStats',
        VERSION: 'spaceInvaders_version'
    },
    LIMITS: {
        MAX_HIGH_SCORES: 10,
        MAX_PLAYER_NAME_LENGTH: 20,
        MAX_STORAGE_SIZE: 1024 * 1024, // 1MB
        RETRY_ATTEMPTS: 3,
        CIRCUIT_BREAKER_THRESHOLD: 5
    },
    DEFAULTS: {
        HIGH_SCORES: [],
        SETTINGS: {
            soundEnabled: true,
            musicEnabled: true,
            difficulty: 'normal',
            controls: 'keyboard'
        },
        PLAYER_STATS: {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            enemiesDestroyed: 0
        }
    }
};

/**
 * Custom error classes for storage operations
 */
class StorageError extends Error {
    constructor(message, code = 'STORAGE_ERROR', details = {}) {
        super(message);
        this.name = 'StorageError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

class StorageUnavailableError extends StorageError {
    constructor(message = 'Local storage is not available') {
        super(message, 'STORAGE_UNAVAILABLE');
    }
}

class DataValidationError extends StorageError {
    constructor(message, invalidData = null) {
        super(message, 'DATA_VALIDATION_ERROR', { invalidData });
    }
}

class StorageQuotaError extends StorageError {
    constructor(message = 'Storage quota exceeded') {
        super(message, 'STORAGE_QUOTA_EXCEEDED');
    }
}

/**
 * Circuit breaker for storage operations
 */
class StorageCircuitBreaker {
    constructor(threshold = STORAGE_CONFIG.LIMITS.CIRCUIT_BREAKER_THRESHOLD) {
        this.threshold = threshold;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Execute operation with circuit breaker protection
     * @param {Function} operation - Operation to execute
     * @returns {*} Operation result
     * @throws {StorageError} When circuit is open
     */
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new StorageError('Circuit breaker is OPEN', 'CIRCUIT_BREAKER_OPEN');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
        }
    }

    reset() {
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED';
    }
}

/**
 * Data validation utilities
 */
class DataValidator {
    /**
     * Validate high score entry
     * @param {Object} score - Score entry to validate
     * @returns {boolean} Validation result
     * @throws {DataValidationError} When validation fails
     */
    static validateHighScore(score) {
        if (!score || typeof score !== 'object') {
            throw new DataValidationError('High score must be an object', score);
        }

        const { playerName, score: points, date, level } = score;

        if (!playerName || typeof playerName !== 'string') {
            throw new DataValidationError('Player name must be a non-empty string', score);
        }

        if (playerName.length > STORAGE_CONFIG.LIMITS.MAX_PLAYER_NAME_LENGTH) {
            throw new DataValidationError('Player name too long', score);
        }

        if (typeof points !== 'number' || points < 0 || !Number.isInteger(points)) {
            throw new DataValidationError('Score must be a non-negative integer', score);
        }

        if (!date || !Date.parse(date)) {
            throw new DataValidationError('Invalid date format', score);
        }

        if (typeof level !== 'number' || level < 1 || !Number.isInteger(level)) {
            throw new DataValidationError('Level must be a positive integer', score);
        }

        return true;
    }

    /**
     * Validate game settings
     * @param {Object} settings - Settings to validate
     * @returns {boolean} Validation result
     * @throws {DataValidationError} When validation fails
     */
    static validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new DataValidationError('Settings must be an object', settings);
        }

        const validKeys = Object.keys(STORAGE_CONFIG.DEFAULTS.SETTINGS);
        const settingsKeys = Object.keys(settings);

        for (const key of settingsKeys) {
            if (!validKeys.includes(key)) {
                throw new DataValidationError(`Invalid settings key: ${key}`, settings);
            }
        }

        if (settings.difficulty && !['easy', 'normal', 'hard'].includes(settings.difficulty)) {
            throw new DataValidationError('Invalid difficulty level', settings);
        }

        if (settings.controls && !['keyboard', 'touch', 'gamepad'].includes(settings.controls)) {
            throw new DataValidationError('Invalid control type', settings);
        }

        return true;
    }

    /**
     * Sanitize player name
     * @param {string} name - Player name to sanitize
     * @returns {string} Sanitized name
     */
    static sanitizePlayerName(name) {
        if (typeof name !== 'string') {
            return 'Anonymous';
        }

        return name
            .trim()
            .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
            .substring(0, STORAGE_CONFIG.LIMITS.MAX_PLAYER_NAME_LENGTH) || 'Anonymous';
    }
}

/**
 * In-memory fallback storage for when localStorage is unavailable
 */
class MemoryStorage {
    constructor() {
        this.data = new Map();
        this.isAvailable = true;
    }

    getItem(key) {
        return this.data.get(key) || null;
    }

    setItem(key, value) {
        this.data.set(key, value);
    }

    removeItem(key) {
        this.data.delete(key);
    }

    clear() {
        this.data.clear();
    }

    get length() {
        return this.data.size;
    }

    key(index) {
        const keys = Array.from(this.data.keys());
        return keys[index] || null;
    }
}

/**
 * Storage event emitter for observability
 */
class StorageEventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in storage event listener for ${event}:`, error);
                }
            });
        }
    }
}

/**
 * Main storage utility class
 */
class StorageManager {
    constructor() {
        this.storage = this.initializeStorage();
        this.circuitBreaker = new StorageCircuitBreaker();
        this.eventEmitter = new StorageEventEmitter();
        this.isStorageAvailable = this.checkStorageAvailability();
        this.migrationCompleted = false;
        
        this.initializeData();
    }

    /**
     * Initialize storage backend
     * @returns {Storage|MemoryStorage} Storage instance
     */
    initializeStorage() {
        try {
            // Test localStorage availability
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return localStorage;
        } catch (error) {
            console.warn('localStorage unavailable, falling back to memory storage:', error);
            return new MemoryStorage();
        }
    }

    /**
     * Check if storage is available and functional
     * @returns {boolean} Storage availability status
     */
    checkStorageAvailability() {
        try {
            const testKey = '__availability_test__';
            this.storage.setItem(testKey, 'test');
            const retrieved = this.storage.getItem(testKey);
            this.storage.removeItem(testKey);
            return retrieved === 'test';
        } catch (error) {
            return false;
        }
    }

    /**
     * Initialize default data and perform migrations
     */
    async initializeData() {
        try {
            await this.performMigrations();
            await this.ensureDefaultData();
            this.migrationCompleted = true;
            this.eventEmitter.emit('initialized', { success: true });
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            this.eventEmitter.emit('initialized', { success: false, error });
        }
    }

    /**
     * Perform data migrations if needed
     */
    async performMigrations() {
        const currentVersion = await this.getStoredVersion();
        
        if (currentVersion !== STORAGE_CONFIG.VERSION) {
            console.log(`Migrating storage from ${currentVersion} to ${STORAGE_CONFIG.VERSION}`);
            
            // Perform version-specific migrations here
            await this.migrateData(currentVersion, STORAGE_CONFIG.VERSION);
            await this.setStoredVersion(STORAGE_CONFIG.VERSION);
            
            this.eventEmitter.emit('migrated', {
                from: currentVersion,
                to: STORAGE_CONFIG.VERSION
            });
        }
    }

    /**
     * Migrate data between versions
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     */
    async migrateData(fromVersion, toVersion) {
        // Future migration logic would go here
        // For now, we'll just ensure data integrity
        try {
            const highScores = await this.getHighScores();
            if (Array.isArray(highScores)) {
                // Validate and clean existing high scores
                const validScores = highScores.filter(score => {
                    try {
                        DataValidator.validateHighScore(score);
                        return true;
                    } catch (error) {
                        console.warn('Removing invalid high score during migration:', score, error);
                        return false;
                    }
                });
                
                if (validScores.length !== highScores.length) {
                    await this.setHighScores(validScores);
                }
            }
        } catch (error) {
            console.error('Error during data migration:', error);
        }
    }

    /**
     * Ensure default data exists
     */
    async ensureDefaultData() {
        const operations = [
            { key: STORAGE_CONFIG.KEYS.HIGH_SCORES, defaultValue: STORAGE_CONFIG.DEFAULTS.HIGH_SCORES },
            { key: STORAGE_CONFIG.KEYS.GAME_SETTINGS, defaultValue: STORAGE_CONFIG.DEFAULTS.SETTINGS },
            { key: STORAGE_CONFIG.KEYS.PLAYER_STATS, defaultValue: STORAGE_CONFIG.DEFAULTS.PLAYER_STATS }
        ];

        for (const { key, defaultValue } of operations) {
            try {
                const existing = await this.getItem(key);
                if (existing === null) {
                    await this.setItem(key, defaultValue);
                }
            } catch (error) {
                console.warn(`Failed to ensure default data for ${key}:`, error);
            }
        }
    }

    /**
     * Get stored version
     * @returns {Promise<string>} Stored version
     */
    async getStoredVersion() {
        try {
            return await this.getItem(STORAGE_CONFIG.KEYS.VERSION) || '0.0.0';
        } catch (error) {
            return '0.0.0';
        }
    }

    /**
     * Set stored version
     * @param {string} version - Version to store
     */
    async setStoredVersion(version) {
        await this.setItem(STORAGE_CONFIG.KEYS.VERSION, version);
    }

    /**
     * Generic get item with error handling and circuit breaker
     * @param {string} key - Storage key
     * @returns {Promise<*>} Retrieved value
     */
    async getItem(key) {
        return await this.circuitBreaker.execute(async () => {
            try {
                const value = this.storage.getItem(key);
                if (value === null) {
                    return null;
                }

                const parsed = JSON.parse(value);
                this.eventEmitter.emit('read', { key, success: true });
                return parsed;
            } catch (error) {
                this.eventEmitter.emit('read', { key, success: false, error });
                
                if (error instanceof SyntaxError) {
                    console.warn(`Invalid JSON in storage for key ${key}, removing:`, error);
                    this.storage.removeItem(key);
                    return null;
                }
                
                throw new StorageError(`Failed to get item ${key}`, 'GET_ITEM_ERROR', { key, error: error.message });
            }
        });
    }

    /**
     * Generic set item with error handling and circuit breaker
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
    async setItem(key, value) {
        return await this.circuitBreaker.execute(async () => {
            try {
                const serialized = JSON.stringify(value);
                
                // Check storage quota
                if (this.isStorageAvailable && serialized.length > STORAGE_CONFIG.LIMITS.MAX_STORAGE_SIZE) {
                    throw new StorageQuotaError(`Data too large for key ${key}`);
                }

                this.storage.setItem(key, serialized);
                this.eventEmitter.emit('write', { key, success: true, size: serialized.length });
            } catch (error) {
                this.eventEmitter.emit('write', { key, success: false, error });
                
                if (error.name === 'QuotaExceededError' || error.code === 22) {
                    throw new StorageQuotaError(`Storage quota exceeded for key ${key}`);
                }
                
                throw new StorageError(`Failed to set item ${key}`, 'SET_ITEM_ERROR', { key, error: error.message });
            }
        });
    }

    /**
     * Get high scores with validation
     * @returns {Promise<Array>} Array of high score objects
     */
    async getHighScores() {
        try {
            const scores = await this.getItem(STORAGE_CONFIG.KEYS.HIGH_SCORES) || [];
            
            if (!Array.isArray(scores)) {
                console.warn('High scores data is not an array, resetting to empty array');
                await this.setHighScores([]);
                return [];
            }

            // Validate each score entry
            const validScores = scores.filter(score => {
                try {
                    DataValidator.validateHighScore(score);
                    return true;
                } catch (error) {
                    console.warn('Invalid high score entry found:', score, error);
                    return false;
                }
            });

            // If we filtered out invalid scores, update storage
            if (validScores.length !== scores.length) {
                await this.setHighScores(validScores);
            }

            return validScores.sort((a, b) => b.score - a.score);
        } catch (error) {
            console.error('Failed to get high scores:', error);
            return [];
        }
    }

    /**
     * Set high scores with validation
     * @param {Array} scores - Array of high score objects
     */
    async setHighScores(scores) {
        if (!Array.isArray(scores)) {
            throw new DataValidationError('High scores must be an array');
        }

        // Validate all scores
        const validatedScores = scores.map(score => {
            DataValidator.validateHighScore(score);
            return {
                ...score,
                playerName: DataValidator.sanitizePlayerName(score.playerName)
            };
        });

        // Sort by score descending and limit to max entries
        const sortedScores = validatedScores
            .sort((a, b) => b.score - a.score)
            .slice(0, STORAGE_CONFIG.LIMITS.MAX_HIGH_SCORES);

        await this.setItem(STORAGE_CONFIG.KEYS.HIGH_SCORES, sortedScores);
        this.eventEmitter.emit('highScoresUpdated', sortedScores);
    }

    /**
     * Add a new high score
     * @param {Object} scoreEntry - New score entry
     * @returns {Promise<boolean>} True if score was added to high scores
     */
    async addHighScore(scoreEntry) {
        try {
            DataValidator.validateHighScore(scoreEntry);
            
            const currentScores = await this.getHighScores();
            const sanitizedEntry = {
                ...scoreEntry,
                playerName: DataValidator.sanitizePlayerName(scoreEntry.playerName),
                date: scoreEntry.date || new Date().toISOString()
            };

            const updatedScores = [...currentScores, sanitizedEntry];
            await this.setHighScores(updatedScores);

            // Check if this score made it into the top scores
            const finalScores = await this.getHighScores();
            const isHighScore = finalScores.some(score => 
                score.playerName === sanitizedEntry.playerName && 
                score.score === sanitizedEntry.score &&
                score.date === sanitizedEntry.date
            );

            if (isHighScore) {
                this.eventEmitter.emit('newHighScore', sanitizedEntry);
            }

            return isHighScore;
        } catch (error) {
            console.error('Failed to add high score:', error);
            throw error;
        }
    }

    /**
     * Get game settings
     * @returns {Promise<Object>} Game settings object
     */
    async getSettings() {
        try {
            const settings = await this.getItem(STORAGE_CONFIG.KEYS.GAME_SETTINGS);
            if (!settings) {
                return { ...STORAGE_CONFIG.DEFAULTS.SETTINGS };
            }

            // Merge with defaults to ensure all required properties exist
            const mergedSettings = { ...STORAGE_CONFIG.DEFAULTS.SETTINGS, ...settings };
            
            try {
                DataValidator.validateSettings(mergedSettings);
                return mergedSettings;
            } catch (error) {
                console.warn('Invalid settings found, using defaults:', error);
                await this.setSettings(STORAGE_CONFIG.DEFAULTS.SETTINGS);
                return { ...STORAGE_CONFIG.DEFAULTS.SETTINGS };
            }
        } catch (error) {
            console.error('Failed to get settings:', error);
            return { ...STORAGE_CONFIG.DEFAULTS.SETTINGS };
        }
    }

    /**
     * Set game settings
     * @param {Object} settings - Settings object
     */
    async setSettings(settings) {
        const mergedSettings = { ...STORAGE_CONFIG.DEFAULTS.SETTINGS, ...settings };
        DataValidator.validateSettings(mergedSettings);
        
        await this.setItem(STORAGE_CONFIG.KEYS.GAME_SETTINGS, mergedSettings);
        this.eventEmitter.emit('settingsUpdated', mergedSettings);
    }

    /**
     * Get player statistics
     * @returns {Promise<Object>} Player statistics object
     */
    async getPlayerStats() {
        try {
            const stats = await this.getItem(STORAGE_CONFIG.KEYS.PLAYER_STATS);
            return { ...STORAGE_CONFIG.DEFAULTS.PLAYER_STATS, ...stats };
        } catch (error) {
            console.error('Failed to get player stats:', error);
            return { ...STORAGE_CONFIG.DEFAULTS.PLAYER_STATS };
        }
    }

    /**
     * Update player statistics
     * @param {Object} statsUpdate - Statistics update object
     */
    async updatePlayerStats(statsUpdate) {
        try {
            const currentStats = await this.getPlayerStats();
            const updatedStats = { ...currentStats, ...statsUpdate };
            
            // Ensure numeric values are valid
            Object.keys(updatedStats).forEach(key => {
                if (typeof updatedStats[key] === 'number' && !Number.isFinite(updatedStats[key])) {
                    updatedStats[key] = currentStats[key] || 0;
                }
            });

            await this.setItem(STORAGE_CONFIG.KEYS.PLAYER_STATS, updatedStats);
            this.eventEmitter.emit('playerStatsUpdated', updatedStats);
        } catch (error) {
            console.error('Failed to update player stats:', error);
            throw error;
        }
    }

    /**
     * Clear all game data
     */
    async clearAllData() {
        try {
            const keys = Object.values(STORAGE_CONFIG.KEYS);
            for (const key of keys) {
                this.storage.removeItem(key);
            }
            
            await this.ensureDefaultData();
            this.eventEmitter.emit('dataCleared');
        } catch (error) {
            console.error('Failed to clear all data:', error);
            throw error;
        }
    }

    /**
     * Export all game data
     * @returns {Promise<Object>} Exported data object
     */
    async exportData() {
        try {
            const data = {};
            const keys = Object.values(STORAGE_CONFIG.KEYS);
            
            for (const key of keys) {
                data[key] = await this.getItem(key);
            }
            
            data.exportDate = new Date().toISOString();
            data.version = STORAGE_CONFIG.VERSION;
            
            return data;
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import game data
     * @param {Object} data - Data to import
     */
    async importData(data) {
        if (!data || typeof data !== 'object') {
            throw new DataValidationError('Import data must be an object');
        }

        try {
            // Validate imported data
            if (data[STORAGE_CONFIG.KEYS.HIGH_SCORES]) {
                const scores = data[STORAGE_CONFIG.KEYS.HIGH_SCORES];
                if (Array.isArray(scores)) {
                    scores.forEach(score => DataValidator.validateHighScore(score));
                }
            }

            if (data[STORAGE_CONFIG.KEYS.GAME_SETTINGS]) {
                DataValidator.validateSettings(data[STORAGE_CONFIG.KEYS.GAME_SETTINGS]);
            }

            // Import validated data
            const keys = Object.values(STORAGE_CONFIG.KEYS);
            for (const key of keys) {
                if (data[key] !== undefined) {
                    await this.setItem(key, data[key]);
                }
            }

            this.eventEmitter.emit('dataImported', data);
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    /**
     * Get storage health information
     * @returns {Object} Storage health data
     */
    getHealthInfo() {
        return {
            isAvailable: this.isStorageAvailable,
            storageType: this.storage instanceof MemoryStorage ? 'memory' : 'localStorage',
            circuitBreakerState: this.circuitBreaker.state,
            failureCount: this.circuitBreaker.failureCount,
            migrationCompleted: this.migrationCompleted,
            version: STORAGE_CONFIG.VERSION
        };
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
        this.eventEmitter.emit('circuitBreakerReset');
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }
}

// Create singleton instance
const storageManager = new StorageManager();

/**
 * Public API functions
 */

/**
 * Get high scores
 * @returns {Promise<Array>} Array of high score objects
 */
export async function getHighScores() {
    return await storageManager.getHighScores();
}

/**
 * Add a new high score
 * @param {string} playerName - Player name
 * @param {number} score - Score value
 * @param {number} level - Level reached
 * @returns {Promise<boolean>} True if score was added to high scores
 */
export async function addHighScore(playerName, score, level) {
    const scoreEntry = {
        playerName,
        score,
        level,
        date: new Date().toISOString()
    };
    
    return await storageManager.addHighScore(scoreEntry);
}

/**
 * Get game settings
 * @returns {Promise<Object>} Game settings object
 */
export async function getSettings() {
    return await storageManager.getSettings();
}

/**
 * Update game settings
 * @param {Object} settings - Settings to update
 */
export async function updateSettings(settings) {
    const currentSettings = await storageManager.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await storageManager.setSettings(updatedSettings);
}

/**
 * Get player statistics
 * @returns {Promise<Object>} Player statistics object
 */
export async function getPlayerStats() {
    return await storageManager.getPlayerStats();
}

/**
 * Update player statistics
 * @param {Object} statsUpdate - Statistics update object
 */
export async function updatePlayerStats(statsUpdate) {
    await storageManager.updatePlayerStats(statsUpdate);
}

/**
 * Clear all game data
 */
export async function clearAllData() {
    await storageManager.clearAllData();
}

/**
 * Export all game data
 * @returns {Promise<Object>} Exported data object
 */
export async function exportGameData() {
    return await storageManager.exportData();
}

/**
 * Import game data
 * @param {Object} data - Data to import
 */
export async function importGameData(data) {
    await storageManager.importData(data);
}

/**
 * Check if storage is available
 * @returns {boolean} Storage availability status
 */
export function isStorageAvailable() {
    return storageManager.isStorageAvailable;
}

/**
 * Get storage health information
 * @returns {Object} Storage health data
 */
export function getStorageHealth() {
    return storageManager.getHealthInfo();
}

/**
 * Add storage event listener
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 */
export function onStorageEvent(event, callback) {
    storageManager.on(event, callback);
}

/**
 * Remove storage event listener
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 */
export function offStorageEvent(event, callback) {
    storageManager.off(event, callback);
}

// Export error classes for external use
export {
    StorageError,
    StorageUnavailableError,
    DataValidationError,
    StorageQuotaError
};

// Export configuration for testing and debugging
export { STORAGE_CONFIG };

// Default export
export default storageManager;