/**
 * Game Configuration
 * Central configuration file for Space Invaders game settings
 */

const gameConfig = {
  // Canvas and display settings
  canvas: {
    width: 800,
    height: 600,
    backgroundColor: '#000000'
  },

  // Game mechanics
  game: {
    fps: 60,
    lives: 3,
    maxLevel: 10,
    difficultyScaling: 1.2
  },

  // Player configuration
  player: {
    speed: 5,
    width: 40,
    height: 30,
    color: '#00FF00',
    bulletSpeed: 8,
    bulletCooldown: 200, // milliseconds
    maxBullets: 5
  },

  // Enemy configuration
  enemies: {
    rows: 5,
    columns: 10,
    spacing: {
      horizontal: 60,
      vertical: 50
    },
    speed: {
      horizontal: 1,
      vertical: 20,
      acceleration: 1.1
    },
    types: {
      scout: {
        width: 30,
        height: 20,
        color: '#FF0000',
        health: 1,
        speed: 1.5
      },
      soldier: {
        width: 35,
        height: 25,
        color: '#FF8800',
        health: 2,
        speed: 1.0
      },
      tank: {
        width: 45,
        height: 35,
        color: '#FF00FF',
        health: 3,
        speed: 0.7
      },
      boss: {
        width: 80,
        height: 60,
        color: '#FFFF00',
        health: 10,
        speed: 0.5
      }
    }
  },

  // Scoring system configuration
  scoring: {
    // Base point values for different enemy types
    enemyPoints: {
      scout: 100,
      soldier: 200,
      tank: 300,
      boss: 1000
    },

    // Bonus multipliers
    multipliers: {
      // Consecutive hits without missing
      accuracy: {
        threshold: 5, // hits needed to activate
        multiplier: 1.5,
        maxMultiplier: 3.0,
        decayRate: 0.1 // per miss
      },
      
      // Speed bonus for quick eliminations
      speed: {
        timeThreshold: 2000, // milliseconds
        multiplier: 1.2
      },
      
      // Combo multiplier for rapid successive hits
      combo: {
        timeWindow: 1000, // milliseconds between hits
        baseMultiplier: 1.1,
        maxCombo: 10,
        multiplierIncrement: 0.1
      }
    },

    // Wave completion bonuses
    waveBonus: {
      baseBonus: 1000,
      perfectWaveMultiplier: 2.0, // no player damage taken
      speedBonusThreshold: 30000, // milliseconds
      speedBonusMultiplier: 1.5,
      accuracyBonusThreshold: 0.8, // 80% accuracy
      accuracyBonusMultiplier: 1.3
    },

    // Special achievements
    achievements: {
      noMiss: {
        points: 5000,
        description: "Perfect accuracy for entire wave"
      },
      speedDemon: {
        points: 3000,
        description: "Complete wave in under 30 seconds"
      },
      survivor: {
        points: 2000,
        description: "Complete wave without taking damage"
      },
      sharpshooter: {
        points: 1500,
        description: "Achieve 10x combo multiplier"
      }
    },

    // Score display formatting
    display: {
      animationDuration: 500, // milliseconds
      fontSize: 24,
      color: '#FFFFFF',
      shadowColor: '#000000',
      thousandsSeparator: ',',
      prefix: 'SCORE: ',
      highScorePrefix: 'HIGH: '
    },

    // Local storage configuration
    persistence: {
      storageKey: 'spaceInvaders_highScore',
      backupKey: 'spaceInvaders_highScore_backup',
      maxScoreHistory: 10,
      compressionEnabled: false,
      encryptionEnabled: false // Basic tamper detection
    },

    // Performance optimization
    performance: {
      updateInterval: 16, // milliseconds (60 FPS)
      batchUpdates: true,
      maxParticleEffects: 20,
      scoreAnimationPool: 5
    },

    // Validation and security
    validation: {
      maxReasonableScore: 999999999,
      minValidScore: 0,
      maxPointsPerSecond: 50000,
      checksumValidation: true,
      timestampValidation: true
    }
  },

  // Audio configuration
  audio: {
    enabled: true,
    masterVolume: 0.7,
    effects: {
      shoot: { volume: 0.5, file: 'shoot.wav' },
      enemyHit: { volume: 0.6, file: 'enemy-hit.wav' },
      enemyDestroy: { volume: 0.7, file: 'enemy-destroy.wav' },
      playerHit: { volume: 0.8, file: 'player-hit.wav' },
      waveComplete: { volume: 0.9, file: 'wave-complete.wav' },
      gameOver: { volume: 1.0, file: 'game-over.wav' },
      scoreBonus: { volume: 0.6, file: 'score-bonus.wav' },
      achievement: { volume: 0.8, file: 'achievement.wav' }
    },
    music: {
      background: { volume: 0.3, file: 'background-music.ogg', loop: true },
      boss: { volume: 0.4, file: 'boss-music.ogg', loop: true }
    }
  },

  // Input configuration
  input: {
    keyboard: {
      moveLeft: ['ArrowLeft', 'KeyA'],
      moveRight: ['ArrowRight', 'KeyD'],
      shoot: ['Space', 'KeyW', 'ArrowUp'],
      pause: ['KeyP', 'Escape'],
      restart: ['KeyR']
    },
    touch: {
      enabled: true,
      sensitivity: 1.0,
      deadZone: 10
    },
    gamepad: {
      enabled: true,
      deadZone: 0.2
    }
  },

  // Visual effects
  effects: {
    particles: {
      enabled: true,
      maxParticles: 100,
      explosionDuration: 1000,
      trailLength: 5
    },
    screen: {
      shake: {
        enabled: true,
        intensity: 5,
        duration: 200
      },
      flash: {
        enabled: true,
        duration: 100,
        color: '#FFFFFF'
      }
    }
  },

  // Debug settings
  debug: {
    enabled: false,
    showFPS: false,
    showHitboxes: false,
    showGrid: false,
    logScoring: false,
    godMode: false
  }
};

// Freeze the configuration to prevent accidental modifications
Object.freeze(gameConfig);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = gameConfig;
}

// Global export for browser environments
if (typeof window !== 'undefined') {
  window.gameConfig = gameConfig;
}

export default gameConfig;