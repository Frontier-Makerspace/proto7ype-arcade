# 🕹️ ARCADE CABINET GAMES

Welcome to your arcade game collection! This setup includes two games with full gamepad support for your arcade cabinet.

## 🎮 GAMES INCLUDED

### 1. ARC BUNDAS 🚀
**Genre:** Space Shooter  
**Description:** Classic arcade space shooter where you pilot a spaceship through an asteroid field. Destroy asteroids with your weapons and survive as long as possible!

**Controls:**
- **Joystick Left/Right:** Rotate ship
- **Joystick Up/Down OR Top/Down Buttons:** Move forward/backward
- **Left Button (BTN 5):** Strafe left
- **Right Button (BTN 6):** Strafe right
- **SE Button (Purple):** Fire LASER (big gun)
- **ST Button (Purple):** Fire bullets (small gun)

### 2. VIBE KNIGHTS 🗡️
**Genre:** Cyberpunk Endless Runner  
**Description:** Fast-paced cyberpunk runner! Jump over energy bars and duck under flying dragons in a neon-lit dystopian world. The game speeds up as you progress!

**Controls:**
- **Down Button (BTN 7):** Jump over bars
- **Top Button (BTN 4):** Duck under dragons
- **ST Button:** Start/Restart game

## 📁 FILE STRUCTURE

```
ArcadeGames/
├── index.html          # Game selection menu (START HERE)
├── arc-bundas.html     # Space shooter game
├── vibe-knights.html   # Cyberpunk runner game
└── README.md           # This file
```

## 🚀 HOW TO START

1. **Open the game menu:**
   - Double-click `index.html` OR
   - Open your browser and navigate to: `C:\Users\PC\Desktop\ArcadeGames\index.html`

2. **Select a game:**
   - Use the **Joystick** (left/right) to navigate between games
   - The selected game will glow blue
   - Press **Top Button** or **K3 (Start)** to launch the game

3. **Play the game:**
   - Each game has its own controls (see above)
   - Press **ESC** on keyboard to go back to menu

4. **Returning to menu:**
   - Click the browser's back button OR
   - Press F5 to refresh to the main menu

## 🎯 ARCADE CABINET BUTTON MAPPING

Your arcade cabinet buttons are mapped as follows:

| Cabinet Button | Function in Menu | Function in ARC BUNDAS | Function in VIBE KNIGHTS |
|----------------|------------------|------------------------|--------------------------|
| **Joystick Left/Right** | Navigate games | Rotate ship | (Not used) |
| **Joystick Up/Down** | (Not used) | Move forward/back | (Not used) |
| **Top Button** | Select game | Move forward | Duck |
| **Down Button** | (Not used) | Move backward | Jump |
| **Left Button** | (Not used) | Strafe left | (Not used) |
| **Right Button** | (Not used) | Strafe right | (Not used) |
| **SE (Purple)** | (Not used) | Fire LASER (big gun) | (Not used) |
| **ST (Purple)** | Select game | Fire bullets (small gun) | Start/Restart |
| **K2 (Coin)** | (Reserved) | (Reserved) | (Reserved) |

## 💾 HIGH SCORES

- **ARC BUNDAS:** Scores are displayed during gameplay
- **VIBE KNIGHTS:** High scores are automatically saved to your browser's local storage

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
To add more games to the menu, edit `index.html`:

1. Add a new game card in the HTML
2. Add the game filename to the `games` array in JavaScript
3. Create your game HTML file in the same folder

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
- **Game Menu:** Custom arcade cabinet interface with gamepad support

## 🎮 TIPS FOR BEST ARCADE EXPERIENCE

1. **Full Screen:** Press F11 for immersive gameplay
2. **Audio:** Make sure volume is turned up for sound effects
3. **Lighting:** Dim room lighting for that authentic arcade feel
4. **Practice:** Each game gets harder over time - practice makes perfect!

## 🆘 SUPPORT

If you encounter any issues:
1. Check that all HTML files are in the same folder
2. Verify gamepad is connected before starting
3. Try different browsers (Chrome/Edge recommended)
4. Check browser console (F12) for error messages

---

**Enjoy your arcade cabinet! 🎮✨**

*Last updated: January 25, 2026*
