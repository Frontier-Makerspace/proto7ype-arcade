# 🤝 Contributing a Game to Proto7ype Arcade

Thanks for your interest in adding a game to the Proto7ype Arcade! This guide walks you through everything you need to know — from creating your game to getting it on the menu.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture Overview](#-architecture-overview)
- [Game Conventions](#-game-conventions)
- [Gamepad Button Map](#-gamepad-button-map)
- [Color Palette & Visual Theme](#-color-palette--visual-theme)
- [Registering Your Game in the Menu](#-registering-your-game-in-the-menu)
- [High Scores](#-high-scores)
- [Game Template](#-game-template)
- [PR Checklist](#-pr-checklist)
- [Adding Automated Tests (Optional)](#-adding-automated-tests-optional)

---

## 🚀 Quick Start

```bash
# 1. Fork & clone the repo
git clone https://github.com/Frontier-Makerspace/proto7ype-arcade.git
cd proto7ype-arcade

# 2. Copy the starter template
cp GAME-TEMPLATE.html my-game.html

# 3. Build your game (edit my-game.html)

# 4. Register it in index.html (see instructions below)

# 5. Test locally — just open index.html in your browser
open index.html

# 6. Commit, push, and open a PR!
```

---

## 🏗️ Architecture Overview

### Single-File Games (Recommended for Most Games)

Most games in the arcade are **self-contained single HTML files** — all HTML, CSS, and JavaScript live in one file. This makes games easy to add, test, and maintain.

**Examples:** `neon-serpent.html`, `blackjack.html`, `cyber-drive.html`, `cline-defenders.html`

### Modular Games (For Complex Projects)

For larger games, you can split code into a subfolder with separate JS modules. The main HTML file loads them via `<script>` tags.

**Example:** `high-noon.html` loads scripts from `high-noon/`:
```
high-noon.html          ← Entry point
high-noon/
├── main.js             ← Game loop & initialization
├── player.js           ← Player logic
├── enemies.js          ← Enemy AI
├── weapons.js          ← Weapon systems
├── world.js            ← World/level rendering
├── hud.js              ← HUD overlay
├── audio.js            ← Sound effects
├── gamepad.js          ← Gamepad input handling
└── ps1shader.js        ← Visual post-processing
```

**When to go modular:** If your game has 1000+ lines of JavaScript or uses external libraries (like Three.js), consider the modular approach. Otherwise, single-file is simpler and preferred.

---

## 🎮 Game Conventions

Every game in the arcade should follow these conventions to ensure a consistent player experience:

### 1. Gamepad Support is Required
All games must work with the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API). The arcade cabinet uses USB gamepads — players expect joystick + button controls.

### 2. Keyboard Fallback is Required
Not everyone has a gamepad plugged in. Always support keyboard controls too (arrow keys, WASD, Space, Enter, etc.).

### 3. Return to Menu via COIN Button
Every game **must** let the player return to the main menu by pressing the COIN button (Gamepad Button 2):

```javascript
// Required: COIN button returns to menu
const gp = navigator.getGamepads()[0];
if (gp && gp.buttons[2]?.pressed && !coinPressed) {
  coinPressed = true;
  window.location.href = 'index.html';
} else if (gp && !gp.buttons[2]?.pressed) {
  coinPressed = false;
}
```

### 4. Game States
Structure your game with clear states: `'start'` → `'playing'` → `'gameOver'`. Show a title/start screen before gameplay begins.

### 5. No External Dependencies (Preferred)
Single-file games should be fully self-contained. If you need a library (e.g., Three.js), load it from a CDN.

---

## 🕹️ Gamepad Button Map

The arcade cabinet uses a standard USB gamepad layout. Here's the mapping:

| Gamepad Input | Button Index | Arcade Label | Common Use |
|---------------|-------------|--------------|------------|
| Joystick X | `axes[0]` | Joystick | Move left/right, rotate |
| Joystick Y | `axes[1]` | Joystick | Move up/down, forward/back |
| COIN | `buttons[2]` | COIN | **Return to menu** (required) |
| START | `buttons[3]` | START | Start/pause game |
| Top Button | `buttons[4]` | Top | Action (duck, jump, etc.) |
| Left Button | `buttons[5]` | Left | Strafe left, secondary action |
| Right Button | `buttons[6]` | Right | Strafe right, secondary action |
| Down Button | `buttons[7]` | Down | Action (jump, shoot, etc.) |
| 1P Select | `buttons[8]` | 1P | Select 1-player mode |
| 2P Select | `buttons[9]` | 2P | Select 2-player mode |
| SE Button | `buttons[10]` | SE (Purple) | Special weapon / ability |
| ST Button | `buttons[11]` | ST (Purple) | Secondary weapon / ability |

### Gamepad Polling Pattern

Use `requestAnimationFrame` to poll the gamepad state every frame:

```javascript
let coinPressed = false;

function handleGamepad() {
  const gp = navigator.getGamepads()[0];
  if (!gp) return;

  // Joystick (with deadzone)
  const deadzone = 0.3;
  const axisX = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
  const axisY = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;

  // Buttons (use edge detection to avoid repeat triggers)
  if (gp.buttons[2]?.pressed && !coinPressed) {
    coinPressed = true;
    window.location.href = 'index.html';
  } else if (!gp.buttons[2]?.pressed) {
    coinPressed = false;
  }
}

function mainLoop() {
  handleGamepad();
  requestAnimationFrame(mainLoop);
}
mainLoop();
```

### 2-Player Support

For 2-player games, read from two gamepads:

```javascript
const gp0 = navigator.getGamepads()[0]; // Player 1
const gp1 = navigator.getGamepads()[1]; // Player 2
```

Use `gp1.buttons[8]` for "1P Select" and `gp1.buttons[9]` for "2P Select" on the title screen.

---

## 🎨 Color Palette & Visual Theme

The arcade has a **cyberpunk / neon** aesthetic. Use these colors to keep the vibe consistent:

| Color | Hex | Use |
|-------|-----|-----|
| 🟣 Purple | `#9D4EDD` | Primary accent, borders, UI elements |
| 🟣 Light Purple | `#C77DFF` | Gradients, highlights |
| 🔵 Cyan | `#00F5FF` | Secondary accent, text glow, highlights |
| 🔴 Pink/Magenta | `#FF006E` | Danger, power-ups, emphasis |
| ⬛ Dark BG | `#0A0A0F` | Background base |
| ⬛ Dark BG 2 | `#1A1A2E` | Background gradient end |
| 🟡 Gold | `#FFD700` | Scores, rewards, special |
| ⬜ Grid Lines | `#4A148C` | Subtle background grids |

### Scanline Overlay

Add the CRT scanline effect to match the arcade aesthetic:

```css
.scanline {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1000;
}
```

```html
<div class="scanline"></div>
```

### Font

Use `'Courier New', monospace` for all text — it fits the retro terminal vibe.

### Background

```css
background: linear-gradient(to bottom, #0A0A0F, #1A1A2E);
```

> **Note:** These are guidelines, not strict rules. Games like `dread.html` (horror theme) and `high-noon.html` (western theme) have their own unique palettes. As long as the game feels like it belongs in an arcade, you're good!

---

## 📺 Registering Your Game in the Menu

After building your game, you need to add it to `index.html` in **three places**:

### Step 1: Add a Cartridge to the Stack

Find the `.cartridge-stack` div and add a new cartridge. The `data-game` number must match the index in the `games` array (Step 3).

```html
<div class="cartridge" data-game="11">
  <span class="cart-icon">🎯</span>
  <div class="cartridge-label">MY GAME</div>
  <!-- Add this badge only if your game supports 2 players: -->
  <span class="player-badge">2P</span>
</div>
```

**Custom cartridge styling (optional):** You can add a special CSS class for a unique look. See `cartridge-cline`, `cartridge-dread`, or `cartridge-highnoon` in `index.html` for examples.

### Step 2: Add a Game Preview

Find the CRT screen section and add a preview panel. The `id` must be `preview` + your game index:

```html
<div class="game-preview" id="preview11">
  <div class="preview-icon" style="color:#YOUR_COLOR">🎯</div>
  <div class="preview-title" style="color:#YOUR_COLOR">MY GAME</div>
  <div class="preview-desc">
    A brief, exciting description of your game.
    What makes it fun? What's the goal?
  </div>
  <!-- Only for 2-player games: -->
  <div class="preview-multiplayer">⚡ 2-PLAYER MODE AVAILABLE ⚡</div>
</div>
```

### Step 3: Add to the Games Array

Find the `games` array in the `<script>` section and add your HTML filename:

```javascript
const games = [
  'arc-bundas.html',
  'vibe-knights.html',
  // ... existing games ...
  'my-game.html'  // ← Add yours at the end
];
```

> ⚠️ **Important:** The index in `data-game`, the `preview` ID number, and the array position must all match!

---

## 💾 High Scores

If your game tracks scores, save them to `localStorage` using a unique key:

```javascript
// Save
const key = 'myGameHighScore'; // Use camelCase, unique to your game
localStorage.setItem(key, score);

// Load
const highScore = parseInt(localStorage.getItem(key)) || 0;
```

**Naming convention:** Use camelCase with your game name, e.g.:
- `neonSerpentHighScore`
- `clineDefendersHighScore`
- `arcBundasHighScore`

---

## 📄 Game Template

Use `GAME-TEMPLATE.html` as your starting point! It includes:

- ✅ Cyberpunk styling (colors, fonts, background, scanlines)
- ✅ Canvas setup with game loop boilerplate
- ✅ Gamepad handling with COIN-to-menu
- ✅ Keyboard fallback controls
- ✅ Start screen → Playing → Game Over state machine
- ✅ High score with `localStorage`
- ✅ Particle effects utility
- ✅ Lots of comments explaining each section

```bash
cp GAME-TEMPLATE.html my-awesome-game.html
# Now edit my-awesome-game.html and make it your own!
```

---

## ✅ PR Checklist

Before submitting your pull request, verify:

- [ ] **Game loads** — Opens in browser without errors (check console with F12)
- [ ] **Gamepad works** — Joystick and buttons control the game
- [ ] **Keyboard works** — Arrow keys / WASD / Space provide fallback controls
- [ ] **COIN returns to menu** — Pressing button 2 goes back to `index.html`
- [ ] **Menu updated** — Cartridge, preview, and `games[]` array entry added to `index.html`
- [ ] **Indexes match** — `data-game`, `preview` ID, and array position are consistent
- [ ] **No broken links** — Your game HTML file is in the root directory (or subfolder if modular)
- [ ] **Responsive** — Game works in fullscreen (F11) and doesn't overflow
- [ ] **No external files required** — Game is self-contained or uses CDN links
- [ ] **README updated** — Add your game to the games list in `README.md`

---

## 🧪 Adding Automated Tests (Optional)

You can add AI-driven tests for your game using our Puppeteer + virtual gamepad system. See `README-TESTING.md` and `testing/README.md` for details.

To add tests for your game:

1. Create `testing/my-game-ai.js` with AI player logic
2. Update `testing/test-runner.js` to support your game
3. Expose score variables globally: `window.scoreP1`, `window.scoreP2`
4. Document your test in `testing/README.md`

---

## 💡 Tips

- **Start simple** — A fun, polished small game beats a buggy complex one
- **Test with a gamepad** — Plug in a USB controller and test before submitting
- **Use the template** — `GAME-TEMPLATE.html` saves you a ton of boilerplate
- **Look at existing games** — `neon-serpent.html` is a great reference for the single-file pattern
- **Ask questions** — Open an issue if you're stuck!

---

## 🎮 Example Games for Reference

| Game | File | Pattern | Good Example Of |
|------|------|---------|-----------------|
| Neon Serpent | `neon-serpent.html` | Single-file | Clean structure, powerups, particles |
| Cline Defenders | `cline-defenders.html` | Single-file | 2-player co-op, wave system, scoring |
| Arc Bundas | `arc-bundas.html` | Single-file | 2-player, complex controls, physics |
| High Noon | `high-noon.html` | Modular | Split-screen, 3D (Three.js), multi-file |
| Dread | `dread.html` | Single-file | Custom theme (horror), atmosphere |

---

**Happy building! We can't wait to play your game. 🕹️✨**
