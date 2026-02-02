/**
 * Virtual Gamepad Simulator
 * Mocks the Gamepad API to allow programmatic control of virtual gamepads
 * for automated testing of arcade games.
 */

class VirtualGamepad {
  constructor(index, id = `Virtual Gamepad ${index}`) {
    this.index = index;
    this.id = id;
    this.connected = true;
    this.timestamp = performance.now();
    this.mapping = 'standard';
    
    // Initialize 16 buttons (standard gamepad)
    this.buttons = Array.from({ length: 16 }, () => ({
      pressed: false,
      touched: false,
      value: 0
    }));
    
    // Initialize 4 axes (2 joysticks with X/Y each)
    this.axes = [0, 0, 0, 0];
  }
  
  setButton(buttonIndex, pressed) {
    if (buttonIndex >= 0 && buttonIndex < this.buttons.length) {
      this.buttons[buttonIndex] = {
        pressed: pressed,
        touched: pressed,
        value: pressed ? 1.0 : 0.0
      };
      this.timestamp = performance.now();
    }
  }
  
  setAxis(axisIndex, value) {
    if (axisIndex >= 0 && axisIndex < this.axes.length) {
      // Clamp value between -1 and 1
      this.axes[axisIndex] = Math.max(-1, Math.min(1, value));
      this.timestamp = performance.now();
    }
  }
  
  reset() {
    this.buttons.forEach(btn => {
      btn.pressed = false;
      btn.touched = false;
      btn.value = 0;
    });
    this.axes.fill(0);
    this.timestamp = performance.now();
  }
}

class GamepadSimulator {
  constructor() {
    this.gamepads = {};
    this.originalGetGamepads = null;
  }
  
  /**
   * Inject the simulator into the page's navigator.getGamepads()
   */
  inject() {
    const simulator = this;
    
    // Store original function
    this.originalGetGamepads = navigator.getGamepads.bind(navigator);
    
    // Override navigator.getGamepads()
    navigator.getGamepads = function() {
      const result = [null, null, null, null];
      
      Object.keys(simulator.gamepads).forEach(index => {
        result[index] = simulator.gamepads[index];
      });
      
      return result;
    };
  }
  
  /**
   * Create a virtual gamepad at the specified index
   */
  createGamepad(index, id) {
    if (index >= 0 && index <= 3) {
      this.gamepads[index] = new VirtualGamepad(index, id);
      return this.gamepads[index];
    }
    return null;
  }
  
  /**
   * Get a virtual gamepad by index
   */
  getGamepad(index) {
    return this.gamepads[index] || null;
  }
  
  /**
   * Remove a virtual gamepad
   */
  removeGamepad(index) {
    delete this.gamepads[index];
  }
  
  /**
   * Set button state for a gamepad
   */
  setButton(gamepadIndex, buttonIndex, pressed) {
    const gamepad = this.gamepads[gamepadIndex];
    if (gamepad) {
      gamepad.setButton(buttonIndex, pressed);
    }
  }
  
  /**
   * Set axis value for a gamepad
   */
  setAxis(gamepadIndex, axisIndex, value) {
    const gamepad = this.gamepads[gamepadIndex];
    if (gamepad) {
      gamepad.setAxis(axisIndex, value);
    }
  }
  
  /**
   * Reset all gamepads
   */
  resetAll() {
    Object.values(this.gamepads).forEach(gamepad => gamepad.reset());
  }
  
  /**
   * Restore original navigator.getGamepads()
   */
  restore() {
    if (this.originalGetGamepads) {
      navigator.getGamepads = this.originalGetGamepads;
    }
  }
}

// Export for Node.js/browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GamepadSimulator, VirtualGamepad };
} else {
  window.GamepadSimulator = GamepadSimulator;
  window.VirtualGamepad = VirtualGamepad;
}
