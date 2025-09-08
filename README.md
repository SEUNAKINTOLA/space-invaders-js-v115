space-invaders-js-v115/
├── css/
│   └── styles.css           # Game styling and responsive design
├── js/
│   ├── config/
│   │   └── gameConfig.js    # Game configuration constants
│   ├── entities/
│   │   ├── enemy.js         # Enemy entity logic
│   │   ├── player.js        # Player entity logic
│   │   └── projectile.js    # Projectile entity logic
│   ├── input/
│   │   ├── inputManager.js  # Keyboard input handling
│   │   └── touchControls.js # Touch input handling
│   ├── systems/
│   │   ├── collisionSystem.js  # Collision detection
│   │   ├── enemySystem.js      # Enemy behavior management
│   │   ├── projectileSystem.js # Projectile management
│   │   └── waveManager.js      # Wave progression logic
│   └── game.js              # Main game loop
├── tests/                   # Test suites
├── README.md               # This file
└── .gitignore             # Git ignore rules