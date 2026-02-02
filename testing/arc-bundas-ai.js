/**
 * AI Player Controller for Arc Bundas
 * Controls both players automatically for testing purposes
 */

class ArcBundasAI {
  constructor(simulator) {
    this.simulator = simulator;
    this.player1Strategy = new PlayerStrategy(0, 'Player 1');
    this.player2Strategy = new PlayerStrategy(1, 'Player 2');
    this.running = false;
    this.intervalId = null;
  }
  
  /**
   * Start the AI players
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    console.log('[AI] Starting automated players...');
    
    // Run AI logic at 60fps
    this.intervalId = setInterval(() => {
      this.update();
    }, 16); // ~60fps
  }
  
  /**
   * Stop the AI players
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Reset all controls
    this.simulator.resetAll();
    console.log('[AI] Stopped automated players');
  }
  
  /**
   * Update AI logic for both players
   */
  update() {
    if (!this.running) return;
    
    // Update both player strategies
    this.player1Strategy.update(this.simulator);
    this.player2Strategy.update(this.simulator);
  }
  
  /**
   * Get game state from the page
   */
  getGameState() {
    // Access game variables from the page context
    if (typeof window.scoreP1 !== 'undefined') {
      return {
        scoreP1: window.scoreP1,
        scoreP2: window.scoreP2,
        gameOver: window.gameOver,
        p1Dead: window.p1Dead,
        p2Dead: window.p2Dead
      };
    }
    return null;
  }
}

/**
 * Strategy for a single player
 */
class PlayerStrategy {
  constructor(playerIndex, name) {
    this.playerIndex = playerIndex;
    this.name = name;
    this.actionTimer = 0;
    this.rotationDirection = 1;
    this.fireTimer = 0;
    this.laserTimer = 0;
    this.moveTimer = 0;
    this.currentAction = 'explore';
  }
  
  update(simulator) {
    this.actionTimer++;
    this.fireTimer++;
    this.laserTimer++;
    this.moveTimer++;
    
    // Change action periodically
    if (this.actionTimer > 180) { // Every 3 seconds
      this.actionTimer = 0;
      this.chooseNewAction();
    }
    
    // Execute current action
    switch (this.currentAction) {
      case 'explore':
        this.explore(simulator);
        break;
      case 'circle':
        this.circle(simulator);
        break;
      case 'zigzag':
        this.zigzag(simulator);
        break;
      case 'aggressive':
        this.aggressive(simulator);
        break;
    }
    
    // Fire weapons periodically
    this.fireWeapons(simulator);
  }
  
  chooseNewAction() {
    const actions = ['explore', 'circle', 'zigzag', 'aggressive'];
    this.currentAction = actions[Math.floor(Math.random() * actions.length)];
    this.rotationDirection = Math.random() > 0.5 ? 1 : -1;
  }
  
  /**
   * Explore mode: Move forward while rotating
   */
  explore(simulator) {
    // Rotate slowly
    const rotationSpeed = 0.3 * this.rotationDirection;
    simulator.setAxis(this.playerIndex, 0, rotationSpeed);
    
    // Move forward
    simulator.setAxis(this.playerIndex, 1, -0.7);
    
    // Change direction occasionally
    if (this.moveTimer > 90) {
      this.moveTimer = 0;
      this.rotationDirection *= -1;
    }
  }
  
  /**
   * Circle mode: Move in circles
   */
  circle(simulator) {
    // Rotate continuously
    simulator.setAxis(this.playerIndex, 0, 0.6 * this.rotationDirection);
    
    // Move forward
    simulator.setAxis(this.playerIndex, 1, -0.5);
  }
  
  /**
   * Zigzag mode: Move in zigzag pattern
   */
  zigzag(simulator) {
    // Alternate rotation every second
    const direction = Math.floor(this.moveTimer / 30) % 2 === 0 ? 1 : -1;
    simulator.setAxis(this.playerIndex, 0, 0.8 * direction);
    
    // Move forward
    simulator.setAxis(this.playerIndex, 1, -0.8);
  }
  
  /**
   * Aggressive mode: Move fast and erratically
   */
  aggressive(simulator) {
    // Random rotation
    const rotation = (Math.random() - 0.5) * 2;
    simulator.setAxis(this.playerIndex, 0, rotation);
    
    // Move forward at full speed
    simulator.setAxis(this.playerIndex, 1, -1.0);
    
    // Use strafe buttons for extra movement
    if (Math.random() > 0.7) {
      simulator.setButton(this.playerIndex, 5, true); // Strafe left
      setTimeout(() => simulator.setButton(this.playerIndex, 5, false), 100);
    } else if (Math.random() > 0.7) {
      simulator.setButton(this.playerIndex, 6, true); // Strafe right
      setTimeout(() => simulator.setButton(this.playerIndex, 6, false), 100);
    }
  }
  
  /**
   * Fire weapons at asteroids
   */
  fireWeapons(simulator) {
    // Fire regular bullets frequently
    if (this.fireTimer > 15) { // Every ~250ms
      this.fireTimer = 0;
      
      // Player 1 uses button 9, Player 2 uses button 3
      const bulletButton = this.playerIndex === 0 ? 9 : 3;
      
      simulator.setButton(this.playerIndex, bulletButton, true);
      setTimeout(() => {
        simulator.setButton(this.playerIndex, bulletButton, false);
      }, 50);
    }
    
    // Fire laser occasionally
    if (this.laserTimer > 120) { // Every ~2 seconds
      this.laserTimer = 0;
      
      // Player 1 uses button 8, Player 2 uses button 2
      const laserButton = this.playerIndex === 0 ? 8 : 2;
      
      simulator.setButton(this.playerIndex, laserButton, true);
      setTimeout(() => {
        simulator.setButton(this.playerIndex, laserButton, false);
      }, 100);
    }
  }
}

// Export for Node.js/browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ArcBundasAI };
} else {
  window.ArcBundasAI = ArcBundasAI;
}
