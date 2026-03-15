/**
 * Beat Protocol AI Controller
 * Reads upcoming notes from the game state and presses the correct
 * gamepad buttons at the right time to simulate real gameplay.
 * 
 * Works with the GamepadSimulator to automate rhythm game testing.
 */

class BeatProtocolAI {
  constructor(simulator) {
    this.simulator = simulator;
    this.running = false;
    this.intervalId = null;
    this.tickRate = 16; // ~60fps check rate
    
    // Gamepad button mappings matching beat-protocol.html
    // P1 (gamepad 0): buttons 5,4,7,6,8,9 → lanes 0-5
    this.P1_LANE_TO_BUTTON = { 0: 5, 1: 4, 2: 7, 3: 6, 4: 8, 5: 9 };
    // P2 (gamepad 1): buttons 5,4,7,6,2,3 → lanes 0-5
    this.P2_LANE_TO_BUTTON = { 0: 5, 1: 4, 2: 7, 3: 6, 4: 2, 5: 3 };
    
    // Track which buttons are currently held
    this.heldButtons = { p1: new Set(), p2: new Set() };
    
    // Track which notes we've already attempted to hit
    this.attemptedNotes = new Set();
    
    // AI accuracy settings (how close to perfect timing)
    this.hitWindowMs = 50; // Try to hit within 50ms of perfect
    this.missChance = 0.05; // 5% chance to intentionally miss (realistic)
  }
  
  start() {
    if (this.running) return;
    this.running = true;
    this.attemptedNotes.clear();
    
    this.intervalId = setInterval(() => this.tick(), this.tickRate);
    console.log('[AI] Beat Protocol AI started');
  }
  
  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Release all buttons
    this.releaseAllButtons();
    console.log('[AI] Beat Protocol AI stopped');
  }
  
  releaseAllButtons() {
    for (const btn of this.heldButtons.p1) {
      this.simulator.setButton(0, btn, false);
    }
    for (const btn of this.heldButtons.p2) {
      this.simulator.setButton(1, btn, false);
    }
    this.heldButtons.p1.clear();
    this.heldButtons.p2.clear();
  }
  
  tick() {
    if (!this.running) return;
    
    // Check game state
    if (typeof gameState === 'undefined') return;
    
    if (gameState === 'menu') {
      this.handleMenu();
    } else if (gameState === 'playing') {
      this.handlePlaying();
    } else if (gameState === 'results') {
      // Do nothing - let the test runner handle results
    }
  }
  
  handleMenu() {
    // Press START button (button 3 on gamepad 0) to begin
    // But only after a short delay to let the menu render
    if (!this._menuDelay) {
      this._menuDelay = Date.now();
      return;
    }
    if (Date.now() - this._menuDelay < 1000) return;
    
    // Press start
    this.simulator.setButton(0, 3, true);
    setTimeout(() => {
      this.simulator.setButton(0, 3, false);
      this._menuDelay = null;
    }, 100);
  }
  
  handlePlaying() {
    // Release any held buttons after a short duration
    const now = Date.now();
    for (const [key, releaseTime] of (this._releaseTimers || [])) {
      if (now >= releaseTime) {
        const [gpIdx, btnIdx] = key.split('-').map(Number);
        this.simulator.setButton(gpIdx, btnIdx, false);
        this.heldButtons[gpIdx === 0 ? 'p1' : 'p2'].delete(btnIdx);
        this._releaseTimers.delete(key);
      }
    }
    
    // Get current song time and notes
    if (typeof songTime === 'undefined' || typeof currentSongKey === 'undefined') return;
    if (typeof SONGS === 'undefined') return;
    
    const song = SONGS[currentSongKey];
    if (!song || !song.notes) return;
    
    const currentTime = songTime;
    const numPlayers = typeof selectedPlayers !== 'undefined' ? selectedPlayers : 1;
    
    // Look for notes that are within our hit window
    for (let i = 0; i < song.notes.length; i++) {
      const note = song.notes[i];
      const noteKey = `${i}-${note.time}-${note.lane}`;
      
      // Skip already attempted notes
      if (this.attemptedNotes.has(noteKey)) continue;
      
      const timeDiff = note.time - currentTime;
      
      // If note is within our hit window (slightly early to perfect)
      if (timeDiff >= -this.hitWindowMs && timeDiff <= this.hitWindowMs) {
        // Random miss chance for realism
        if (Math.random() < this.missChance) {
          this.attemptedNotes.add(noteKey);
          continue;
        }
        
        // Hit the note for P1
        if (!note.hitP1 && !note.missedP1) {
          this.pressLane(0, note.lane);
        }
        
        // Hit the note for P2 if 2-player mode
        if (numPlayers === 2 && !note.hitP2 && !note.missedP2) {
          this.pressLane(1, note.lane);
        }
        
        this.attemptedNotes.add(noteKey);
      }
      
      // Skip notes too far in the future (optimization)
      if (timeDiff > 500) break;
    }
  }
  
  pressLane(gamepadIndex, lane) {
    const buttonMap = gamepadIndex === 0 ? this.P1_LANE_TO_BUTTON : this.P2_LANE_TO_BUTTON;
    const button = buttonMap[lane];
    if (button === undefined) return;
    
    // Press the button
    this.simulator.setButton(gamepadIndex, button, true);
    const playerKey = gamepadIndex === 0 ? 'p1' : 'p2';
    this.heldButtons[playerKey].add(button);
    
    // Schedule release after 80ms
    if (!this._releaseTimers) this._releaseTimers = new Map();
    const key = `${gamepadIndex}-${button}`;
    this._releaseTimers.set(key, Date.now() + 80);
  }
  
  /**
   * Navigate to a specific song in the menu by pressing UP/DOWN
   */
  async navigateToSong(targetIndex, currentIndex) {
    const diff = targetIndex - currentIndex;
    const direction = diff > 0 ? 1 : -1;
    const steps = Math.abs(diff);
    
    for (let i = 0; i < steps; i++) {
      // UP = button 7, DOWN = button 4
      const button = direction > 0 ? 4 : 7;
      this.simulator.setButton(0, button, true);
      await new Promise(r => setTimeout(r, 100));
      this.simulator.setButton(0, button, false);
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

// Export for Node.js/browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BeatProtocolAI };
} else {
  window.BeatProtocolAI = BeatProtocolAI;
}
