# 🎮 Arcade Game Automated Testing

This directory contains the automated testing infrastructure for proto7ype-arcade games. The testing system uses virtual gamepads to simulate 2-player gameplay and validates that both players can score points, ensuring the game mechanics work correctly.

## 📋 Overview

The testing system consists of:

1. **gamepad-simulator.js** - Virtual Gamepad API implementation
2. **arc-bundas-ai.js** - AI player controller for Arc Bundas
3. **test-runner.js** - Puppeteer-based test harness
4. **GitHub Actions** - CI/CD integration

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- npm installed

### Installation

```bash
# From the proto7ype-arcade directory
npm install
```

### Run Tests

```bash
# Run test in headless mode (default)
npm test

# Watch the test run in a visible browser window
npm run test:watch

# Generate screenshots during the test
npm run test:screenshot

# Debug mode (visible browser + slow motion + screenshots)
npm run test:debug
```

## 🧪 How It Works

### 1. Virtual Gamepad Simulation

The `GamepadSimulator` class mocks `navigator.getGamepads()` to provide programmatic control over virtual gamepads:

```javascript
// Create simulator
const simulator = new GamepadSimulator();
simulator.inject();

// Create 2 virtual gamepads
simulator.createGamepad(0, 'Player 1');
simulator.createGamepad(1, 'Player 2');

// Control buttons and axes
simulator.setButton(0, 9, true);  // P1 fires weapon
simulator.setAxis(1, 0, 0.5);      // P2 rotates right
```

### 2. AI Player Controller

The `ArcBundasAI` class implements intelligent gameplay strategies:

- **Explore Mode**: Move forward while rotating
- **Circle Mode**: Move in circular patterns
- **Zigzag Mode**: Move in zigzag patterns
- **Aggressive Mode**: Fast, erratic movement

Each AI player:
- Navigates using joystick simulation
- Fires weapons at asteroids
- Changes strategies every 3 seconds
- Operates independently on separate gamepads

### 3. Test Validation

The test passes when:
- ✅ Both Player 1 AND Player 2 score ≥ 100 points
- ✅ Game runs without crashes
- ✅ Controls respond correctly
- ✅ Collision detection works
- ✅ Scoring system functions

## 📊 Test Configuration

Edit `test-runner.js` to customize:

```javascript
const CONFIG = {
  gamePath: '../arc-bundas.html',
  testDuration: 30000,        // Test duration in ms
  minScoreRequired: 100,      // Minimum score per player
  headless: true,             // Run in headless mode
  screenshot: false           // Capture screenshots
};
```

## 🎯 Environment Variables

Control test behavior via environment variables:

```bash
# Run with visible browser
HEADLESS=false npm test

# Enable screenshots
SCREENSHOT=true npm test

# Slow down automation (ms delay between actions)
SLOWMO=50 npm test

# Combine multiple options
HEADLESS=false SCREENSHOT=true SLOWMO=100 npm test
```

## 📁 Output Files

When `SCREENSHOT=true`:
- `test-start.png` - Game state when test begins
- `test-end.png` - Game state when test completes

## 🔄 CI/CD Integration

The `.github/workflows/arcade-test.yml` workflow:

1. ✅ Runs on every push to `main` or `develop`
2. ✅ Runs on pull requests
3. ✅ Can be triggered manually
4. ✅ Uploads screenshots as artifacts
5. ✅ Blocks deployment if tests fail

### Viewing Test Results

1. Go to your GitHub repository
2. Click the "Actions" tab
3. Select a workflow run
4. View logs and download screenshot artifacts

## 🎮 Game Requirements

For a game to be testable with this system:

### Required:
- Uses Gamepad API (`navigator.getGamepads()`)
- Exposes score variables globally (`window.scoreP1`, `window.scoreP2`)
- Has a game over state (`window.gameOver`)

### Arc Bundas Controls:

**Player 1 (Gamepad[0]):**
- Axes[0] - Rotate
- Axes[1] - Move forward/backward
- Button 8 - Fire laser
- Button 9 - Fire bullets

**Player 2 (Gamepad[1]):**
- Axes[0] - Rotate
- Axes[1] - Move forward/backward
- Button 2 - Fire laser
- Button 3 - Fire bullets

## 🛠️ Troubleshooting

### Test fails immediately
- Check that `arc-bundas.html` exists in the parent directory
- Ensure Node.js 16+ is installed
- Run `npm install` to install dependencies

### Both players score 0
- Increase `testDuration` in `test-runner.js`
- Check that AI strategies are working (use `test:debug`)
- Verify game mechanics in the original HTML file

### Browser won't launch
- Install Chromium: `npx puppeteer browsers install chrome`
- Check for conflicting Chrome processes
- Try running with `HEADLESS=false` to see errors

### Screenshots not generated
- Ensure `SCREENSHOT=true` is set
- Check write permissions in the project directory
- Verify Puppeteer can capture screenshots

## 🔮 Future Enhancements

### Add More Games
Create AI controllers for other games:

```javascript
// testing/ufb-ai.js
class UFBAI {
  // Implement fighting game AI
}

// testing/blackjack-ai.js
class BlackjackAI {
  // Implement card game AI
}
```

### Advanced Strategies
- Implement pathfinding for asteroid avoidance
- Add scoring optimization algorithms
- Create difficulty levels

### Enhanced Validation
- Performance benchmarks (FPS, memory)
- Visual regression testing
- Multiplayer synchronization tests

## 📚 API Reference

### GamepadSimulator

```javascript
// Create simulator
const sim = new GamepadSimulator();

// Inject into page
sim.inject();

// Create gamepad
sim.createGamepad(index, id);

// Control inputs
sim.setButton(gamepadIndex, buttonIndex, pressed);
sim.setAxis(gamepadIndex, axisIndex, value);

// Reset
sim.resetAll();

// Restore original API
sim.restore();
```

### ArcBundasAI

```javascript
// Create AI controller
const ai = new ArcBundasAI(simulator);

// Start AI
ai.start();

// Stop AI
ai.stop();

// Get game state
const state = ai.getGameState();
```

## 📄 License

Part of the proto7ype-arcade project.

## 🤝 Contributing

To add tests for new games:

1. Create `{game-name}-ai.js` with AI logic
2. Update `test-runner.js` to support the new game
3. Add test configuration
4. Update CI/CD workflow
5. Document the controls and validation criteria

---

**Built with ❤️ for automated arcade testing**
