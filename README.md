# 🕹️ PROTO7YPE ARCADE

Welcome to the Proto7ype Arcade — an open-source collection of browser-based games built for a custom arcade cabinet with full gamepad support. All games run as standalone HTML files — no server required!

> **Want to add your own game?** Check out the **[Contributing Guide](CONTRIBUTING.md)** and use the **[Game Template](GAME-TEMPLATE.html)** to get started fast!

## 🛠️ TECH STACK & ARCHITECTURE

- **Pure HTML/CSS/JS** — No frameworks, no build tools, no bundlers
- **Single-file games** — Most games are self-contained `.html` files (HTML + CSS + JS in one file)
- **Modular option** — Complex games can use a subfolder with separate JS modules (see `high-noon/`)
- **Gamepad API** — All games support USB gamepad input for arcade cabinet play
- **Keyboard fallback** — Every game also works with keyboard controls
- **`localStorage`** — High scores persist in the browser

## 🎮 GAMES INCLUDED

### 1. ARC BUNDAS 🚀
**Genre:** Space Shooter | **Players:** 1-2  
**Description:** Classic arcade space shooter where you pilot a spaceship through an asteroid field. Destroy asteroids with bullets and lasers — large asteroids split into pieces! Probe enemies appear after 2 minutes.

**Controls:**
- **Joystick Left/Right:** Rotate ship
- **Joystick Up/Down OR Top/Down Buttons:** Move forward/backward
- **Left Button (BTN 5):** Strafe left
- **Right Button (BTN 6):** Strafe right
- **SE Button (Purple):** Fire LASER (big gun)
- **ST Button (Purple):** Fire bullets (small gun)

---

### 2. VIBE KNIGHTS 🗡️
**Genre:** Cyberpunk Endless Runner | **Players:** 1  
**Description:** Fast-paced cyberpunk runner! Jump over energy bars and duck under flying dragons in a neon-lit dystopian world. The game speeds up as you progress!

**Controls:**
- **Down Button (BTN 7):** Jump over bars
- **Top Button (BTN 4):** Duck under dragons
- **ST Button:** Start/Restart game

---

### 3. CYBER BLACKJACK 🃏
**Genre:** Card Game | **Players:** 1  
**Description:** Matrix-themed blackjack played with a 4-deck shoe. Neon cards and falling code effects create an immersive cyberpunk casino atmosphere.

---

### 4. CYBER DRIVE 🏎️
**Genre:** Racing / Endless Driver | **Players:** 1  
**Description:** Outrun-style sunset racing! Drive a Ferrari into the sunset, dodge obstacles, and soak in the vaporwave vibes.

---

### 5. UFB 🤖
**Genre:** Fighting Game | **Players:** 1-2  
**Description:** Ultimate Fighting Bots! Control a Unitree humanoid robot in epic robot combat with punches, kicks, and blocks.

---

### 6. NEON SERPENT 🐍
**Genre:** Snake / Arcade | **Players:** 1  
**Description:** Cyberpunk snake game! Eat data orbs, grow longer, and collect power-ups including speed boost, invincibility, and score multipliers.

---

### 7. CLINE DEFENDERS 🤖
**Genre:** Co-op Space Shooter | **Players:** 1-2  
**Description:** Defend the codebase! 1-2 players pilot adorable Cline bots and shoot npm packages at waves of bugs, errors, and viruses descending toward the code. Waves grow progressively harder with tougher enemy types appearing at higher waves. Health regenerates between waves. High scores are saved to local storage.

**Enemy Types:**
| Enemy | HP | Points | Appears |
|-------|----|--------|---------|
| 🐛 Bug | 1 | 10 | Wave 1+ |
| ⚠ Error | 2 | 20 | Wave 3+ |
| ☠ Virus | 3 | 30 | Wave 5+ |

**Keyboard Controls:**
| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move Left | ← Arrow Left | A |
| Move Right | → Arrow Right | D |
| Shoot | Space | Left Shift |

**Gamepad Controls:**
| Action | Gamepad 0 (Player 1) | Gamepad 1 (Player 2) |
|--------|---------------------|---------------------|
| Move Left/Right | Joystick (axis 0) | Joystick (axis 0) |
| Shoot | Button 7 | Button 7 |

**Menu Gamepad Controls:**
- **Gamepad 1 Button 8:** Select 1 Player & Start
- **Gamepad 1 Button 9:** Select 2 Players & Start
- **Gamepad 0 Button 2 (COIN):** Return to game selection menu

**Features:**
- Wave-based progression (each wave spawns `wave × 10` enemies)
- 20% health regeneration between waves (capped at 100%)
- Sinusoidal enemy movement patterns
- Health bars on multi-hit enemies
- Particle explosion effects on enemy destruction
- High score persistence via `localStorage`
- Animated Cline bot mascot on the title screen

---

### 8. BEAT PROTOCOL 🎵
**Genre:** Rhythm Game | **Players:** 1-2  
**Description:** Cyberpunk rhythm warfare! Hit neon notes across 6 lanes with competitive co-op mode, combo multipliers, and perfect hits.

---

### 9. DREAD 💀
**Genre:** Survival Horror | **Players:** 1  
**Description:** First-person survival horror! Navigate dark corridors with limited flashlight battery. Avoid bloodthirsty monsters that grow faster each wave. **No weapons. Only survival.**

---

## 📁 FILE STRUCTURE

```
proto7ype-arcade/
├── index.html              # Game selection menu (START HERE)
├── CONTRIBUTING.md          # 🤝 Guide for adding new games
├── GAME-TEMPLATE.html       # 📄 Starter template for new games
├── README.md               # This file
├── README-TESTING.md       # Testing documentation
├── package.json            # Project config
│
├── 🎮 GAMES
├── arc-bundas.html         # Space shooter (1-2P)
├── vibe-knights.html       # Cyberpunk runner (1P)
├── blackjack.html          # Cyber blackjack (1P)
├── cyber-drive.html        # Outrun-style racing (1P)
├── ufb.html                # Ultimate Fighting Bots (1-2P)
├── neon-serpent.html        # Cyberpunk snake (1P)
├── cline-defenders.html    # Co-op space shooter (1-2P)
├── beat-protocol.html      # Rhythm game (1-2P)
├── dread.html              # Survival horror (1P)
├── shell-game.html         # Soul Cups shell game (1P)
├── high-noon.html          # Western FPS (1-2P co-op)
│
├── high-noon/              # High Noon modular game scripts
│   ├── main.js
│   ├── player.js
│   ├── enemies.js
│   ├── weapons.js
│   ├── world.js
│   ├── hud.js
│   ├── audio.js
│   ├── gamepad.js
│   └── ps1shader.js
│
├── assets/
│   └── songs/              # Beat Protocol music videos
│       ├── bad-apple/
│       ├── echo/
│       └── moonlight/
│
├── testing/                # Automated testing system
│   ├── arc-bundas-ai.js
│   ├── gamepad-simulator.js
│   ├── manual-test.html
│   ├── README.md
│   └── test-runner.js
│
└── workflows/              # Cline workflow docs
    ├── audio-plugin-developer.md
    ├── ba.md
    ├── cline-continuous-improvement-protocol.md
    └── cline-for-research.md
```

## 🚀 HOW TO START

1. **Open the game menu:**
   - Double-click `index.html` OR
   - Open your browser and navigate to the file

2. **Select a game:**
   - Use **Joystick Up/Down** or **Arrow Keys** to navigate the cartridge stack
   - Press **START (BTN 3)** or **Enter** to launch the selected game
   - Press **COIN (BTN 2)** to cycle through games

3. **Return to menu:**
   - Press **COIN** button in-game, or use the browser back button

## 🎯 ARCADE CABINET BUTTON MAPPING

### Main Menu
| Cabinet Button | Function |
|----------------|----------|
| Joystick Up/Down | Navigate game list |
| START (BTN 3) | Launch selected game |
| COIN (BTN 2) | Cycle through games |

### In-Game: CLINE DEFENDERS
| Cabinet Button | Player 1 (GP0) | Player 2 (GP1) |
|----------------|-----------------|-----------------|
| Joystick Left/Right | Move ship | Move ship |
| Button 7 | Shoot | Shoot |
| COIN (BTN 2) | Return to menu | — |
| 1P Button (BTN 8) | — | Select 1P & Start |
| 2P Button (BTN 9) | — | Select 2P & Start |

## 💾 HIGH SCORES

- **ARC BUNDAS:** Scores displayed during gameplay
- **VIBE KNIGHTS:** Saved to browser `localStorage`
- **CLINE DEFENDERS:** Saved to browser `localStorage` (key: `clineDefendersHighScore`)
- **NEON SERPENT:** Saved to browser `localStorage`

## 🔧 TROUBLESHOOTING

### Gamepad not working?
1. Make sure your arcade cabinet's gamepad is connected before opening the browser
2. Press any button on the gamepad to activate it
3. Open browser console (F12) to see gamepad connection messages
4. Try refreshing the page (F5)

### Game not loading?
1. Make sure all files are in the same folder
2. Try opening in a different browser (Chrome recommended)
3. Check that JavaScript is enabled in your browser

### Performance issues?
1. Close other browser tabs
2. Try fullscreen mode (F11)
3. Make sure hardware acceleration is enabled in browser settings

## 🎨 CUSTOMIZATION

### Adding More Games

See the full **[Contributing Guide](CONTRIBUTING.md)** for step-by-step instructions, or use the **[Game Template](GAME-TEMPLATE.html)** to get started quickly.

**The short version:** Create your game as an HTML file, then register it in `index.html` by adding a cartridge, a preview panel, and an entry in the `games[]` array. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed code snippets and the PR checklist.

### Button Remapping
If your arcade cabinet's buttons are mapped differently:

1. Open the game HTML file in a text editor
2. Find the `handleGamepad()` function
3. Change button numbers (e.g., `gp.buttons[4]` to match your setup)

### Testing Button Numbers
Open browser console (F12) and run:
```javascript
setInterval(() => {
  const gp = navigator.getGamepads()[0];
  if (gp) {
    gp.buttons.forEach((btn, i) => {
      if (btn.pressed) console.log('Button', i, 'pressed');
    });
  }
}, 100);
```

## 📝 CREDITS

- **ARC BUNDAS:** Enhanced version with improved arcade controls
- **VIBE KNIGHTS:** Converted from Next.js to standalone HTML from [VibeCodingKnights](https://github.com/frontiertower/VibeCodingKnights)
- **CLINE DEFENDERS:** Co-op space shooter featuring the official Cline bot mascot
- **Game Menu:** Custom arcade cabinet interface with gamepad support

## 🎮 TIPS FOR BEST ARCADE EXPERIENCE

1. **Full Screen:** Press F11 for immersive gameplay
2. **Audio:** Make sure volume is turned up for sound effects
3. **Lighting:** Dim room lighting for that authentic arcade feel
4. **Practice:** Each game gets harder over time — practice makes perfect!

## 🤝 CONTRIBUTING

We welcome new games! Whether you're a seasoned dev or just getting started, adding a game is straightforward:

1. **Read the [Contributing Guide](CONTRIBUTING.md)** — Full walkthrough with code snippets
2. **Use the [Game Template](GAME-TEMPLATE.html)** — Pre-built starter with all the boilerplate
3. **Follow the conventions** — Gamepad support, keyboard fallback, COIN-to-menu, cyberpunk theme
4. **Open a PR** — Use the checklist in CONTRIBUTING.md to make sure everything's ready

**Key resources:**
| Resource | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Step-by-step guide for adding games |
| [GAME-TEMPLATE.html](GAME-TEMPLATE.html) | Starter template with boilerplate code |
| [README-TESTING.md](README-TESTING.md) | How to add automated tests (optional) |

## 🆘 SUPPORT

If you encounter any issues:
1. Check that all HTML files are in the same folder
2. Verify gamepad is connected before starting
3. Try different browsers (Chrome/Edge recommended)
4. Check browser console (F12) for error messages

---

**Enjoy your arcade cabinet! 🎮✨**

*Last updated: February 24, 2026*
