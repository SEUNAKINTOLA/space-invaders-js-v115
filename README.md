space-invaders-js-v115/
├── .github/
│   └── workflows/
│       └── ci.yml              # Continuous Integration pipeline
├── css/
│   └── styles.css              # Game styling and responsive design
├── js/
│   ├── config/
│   │   └── gameConfig.js       # Game constants and configuration
│   ├── entities/
│   │   ├── enemy.js            # Enemy entity logic
│   │   ├── player.js           # Player entity logic
│   │   └── projectile.js       # Projectile entity logic
│   ├── input/
│   │   ├── inputManager.js     # Keyboard input handling
│   │   └── touchControls.js    # Touch/mobile input handling
│   ├── systems/
│   │   ├── collisionSystem.js  # Collision detection and response
│   │   ├── enemySystem.js      # Enemy behavior and AI
│   │   ├── projectileSystem.js # Projectile movement and lifecycle
│   │   └── waveManager.js      # Wave progression and difficulty
│   ├── game.js                 # Main game loop and state management
│   ├── renderer.js             # Canvas rendering engine
│   └── utils.js                # Utility functions and helpers
├── index.html                  # Main HTML entry point
├── package.json                # Dependencies and scripts
├── jest.config.js              # Test configuration
├── .eslintrc.js               # Code quality rules
└── README.md                   # This file