#!/usr/bin/env node

/**
 * Arc Bundas Automated Test Runner
 * Runs the game with AI-controlled players and validates scoring
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  gamePath: path.join(__dirname, '..', 'arc-bundas.html'),
  testDuration: 30000, // 30 seconds
  minScoreRequired: 100, // Minimum score for each player
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOWMO) || 0,
  screenshot: process.env.SCREENSHOT === 'true'
};

/**
 * Run the automated test
 */
async function runTest() {
  console.log('🎮 Arc Bundas Automated Test Runner');
  console.log('=====================================');
  console.log(`Game Path: ${CONFIG.gamePath}`);
  console.log(`Test Duration: ${CONFIG.testDuration}ms`);
  console.log(`Min Score Required: ${CONFIG.minScoreRequired} per player`);
  console.log(`Headless: ${CONFIG.headless}`);
  console.log('');
  
  // Verify game file exists
  if (!fs.existsSync(CONFIG.gamePath)) {
    console.error('❌ Error: Game file not found at', CONFIG.gamePath);
    process.exit(1);
  }
  
  let browser;
  let testPassed = false;
  let finalScores = { p1: 0, p2: 0 };
  
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: CONFIG.headless === true ? 'new' : CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('[AI]') || text.startsWith('[Test]')) {
        console.log(text);
      }
    });
    
    // Load the game
    console.log('📂 Loading game...');
    await page.goto(`file://${CONFIG.gamePath}`, {
      waitUntil: 'networkidle0'
    });
    
    // Inject gamepad simulator
    console.log('🎯 Injecting gamepad simulator...');
    const simulatorCode = fs.readFileSync(
      path.join(__dirname, 'gamepad-simulator.js'),
      'utf8'
    );
    await page.evaluate(simulatorCode);
    
    // Inject AI controller
    console.log('🤖 Injecting AI controller...');
    const aiCode = fs.readFileSync(
      path.join(__dirname, 'arc-bundas-ai.js'),
      'utf8'
    );
    await page.evaluate(aiCode);
    
    // Initialize and start the test
    console.log('▶️  Starting automated gameplay...');
    await page.evaluate(() => {
      // Create simulator and gamepads
      window.testSimulator = new GamepadSimulator();
      window.testSimulator.inject();
      window.testSimulator.createGamepad(0, 'Test Player 1');
      window.testSimulator.createGamepad(1, 'Test Player 2');
      
      // Create AI controller
      window.testAI = new ArcBundasAI(window.testSimulator);
      window.testAI.start();
      
      console.log('[Test] AI players started');
    });
    
    // Take initial screenshot if requested
    if (CONFIG.screenshot) {
      await page.screenshot({ path: 'test-start.png' });
      console.log('📸 Screenshot saved: test-start.png');
    }
    
    // Monitor game state
    const startTime = Date.now();
    let gameOver = false;
    let lastScores = { p1: 0, p2: 0 };
    
    console.log('⏱️  Running test...\n');
    
    while (!gameOver && (Date.now() - startTime) < CONFIG.testDuration) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get current game state
      const state = await page.evaluate(() => {
        return {
          scoreP1: window.scoreP1 || 0,
          scoreP2: window.scoreP2 || 0,
          gameOver: window.gameOver || false,
          p1Dead: window.p1Dead || false,
          p2Dead: window.p2Dead || false
        };
      });
      
      // Log score updates
      if (state.scoreP1 !== lastScores.p1 || state.scoreP2 !== lastScores.p2) {
        console.log(`  📊 Scores: P1=${state.scoreP1} | P2=${state.scoreP2}`);
        lastScores = { p1: state.scoreP1, p2: state.scoreP2 };
      }
      
      // Log death events
      if (state.p1Dead) {
        console.log('  ☠️  Player 1 destroyed!');
      }
      if (state.p2Dead) {
        console.log('  ☠️  Player 2 destroyed!');
      }
      
      // Check if game over
      if (state.gameOver) {
        console.log('\n🏁 Game Over detected');
        gameOver = true;
        finalScores = { p1: state.scoreP1, p2: state.scoreP2 };
      }
    }
    
    // If time ran out, get final scores
    if (!gameOver) {
      console.log('\n⏰ Test duration reached');
      const state = await page.evaluate(() => {
        return {
          scoreP1: window.scoreP1 || 0,
          scoreP2: window.scoreP2 || 0
        };
      });
      finalScores = { p1: state.scoreP1, p2: state.scoreP2 };
    }
    
    // Take final screenshot if requested
    if (CONFIG.screenshot) {
      await page.screenshot({ path: 'test-end.png' });
      console.log('📸 Screenshot saved: test-end.png');
    }
    
    // Stop AI
    await page.evaluate(() => {
      if (window.testAI) {
        window.testAI.stop();
      }
    });
    
    // Validate results
    console.log('\n📊 Final Results');
    console.log('=====================================');
    console.log(`Player 1 Score: ${finalScores.p1}`);
    console.log(`Player 2 Score: ${finalScores.p2}`);
    console.log(`Minimum Required: ${CONFIG.minScoreRequired} per player`);
    console.log('');
    
    const p1Pass = finalScores.p1 >= CONFIG.minScoreRequired;
    const p2Pass = finalScores.p2 >= CONFIG.minScoreRequired;
    
    if (p1Pass && p2Pass) {
      console.log('✅ TEST PASSED!');
      console.log('   Both players achieved positive scores');
      console.log('   Game mechanics are working correctly');
      testPassed = true;
    } else {
      console.log('❌ TEST FAILED!');
      if (!p1Pass) {
        console.log(`   Player 1 score too low (${finalScores.p1} < ${CONFIG.minScoreRequired})`);
      }
      if (!p2Pass) {
        console.log(`   Player 2 score too low (${finalScores.p2} < ${CONFIG.minScoreRequired})`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed');
    }
  }
  
  // Exit with appropriate code
  process.exit(testPassed ? 0 : 1);
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
