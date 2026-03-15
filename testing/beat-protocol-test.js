#!/usr/bin/env node

/**
 * Beat Protocol — E2E Test Suite
 * 
 * Tests the complete add-song workflow end-to-end:
 *   1. Validates tool outputs (MIDI generation, beatmap conversion, HTML patching)
 *   2. Loads the game in a headless browser
 *   3. Verifies the new song appears and is playable
 *   4. Uses AI player to simulate gameplay with gamepad controls
 *   5. Validates scoring, note hits, and game completion
 *   6. Regression tests existing songs still work
 * 
 * Usage:
 *   node testing/beat-protocol-test.js
 *   HEADLESS=false node testing/beat-protocol-test.js    # Watch the test
 *   SCREENSHOT=true node testing/beat-protocol-test.js   # Save screenshots
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  gamePath: path.join(__dirname, '..', 'beat-protocol.html'),
  assetsDir: path.join(__dirname, '..', 'assets'),
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOWMO) || 0,
  screenshot: process.env.SCREENSHOT === 'true',
  testSongId: 'witchblades',
  // How long to let the AI play before checking results (ms)
  playDuration: 15000,
  // Minimum score the AI should achieve
  minScore: 50,
  // Server port for serving files (needed for fetch() to work with beatmap JSON)
  serverPort: 8765
};

// ============================================================
// Test Results Tracking
// ============================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    testResults.push({ name: testName, passed: true });
    console.log(`  ✅ ${testName}`);
  } else {
    failedTests++;
    testResults.push({ name: testName, passed: false, details });
    console.log(`  ❌ ${testName}${details ? ': ' + details : ''}`);
  }
}

// ============================================================
// Simple HTTP Server (needed for fetch() to load beatmap.json)
// ============================================================

function startServer(rootDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(rootDir, decodeURIComponent(req.url));
      if (filePath.endsWith('/')) filePath += 'index.html';
      
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.mp4': 'video/mp4',
        '.mid': 'audio/midi',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    server.listen(port, () => {
      resolve(server);
    });
  });
}

// ============================================================
// Phase 1: File Validation Tests
// ============================================================

function runFileValidationTests() {
  console.log('\n📁 Phase 1: File Validation Tests');
  console.log('─'.repeat(50));
  
  // Test 1: Song directory exists
  const songDir = path.join(CONFIG.assetsDir, 'songs', CONFIG.testSongId);
  assert(fs.existsSync(songDir), 'Song directory exists', songDir);
  
  // Test 2: Video file exists
  const videoPath = path.join(songDir, 'video.mp4');
  assert(fs.existsSync(videoPath), 'Video file exists');
  
  // Test 3: Video file has reasonable size (> 100KB)
  if (fs.existsSync(videoPath)) {
    const videoSize = fs.statSync(videoPath).size;
    assert(videoSize > 100000, 'Video file has reasonable size', `${(videoSize/1024/1024).toFixed(1)}MB`);
  }
  
  // Test 4: MIDI source file exists
  const midiPath = path.join(songDir, 'source.mid');
  assert(fs.existsSync(midiPath), 'MIDI source file exists');
  
  // Test 5: MIDI file has valid header
  if (fs.existsSync(midiPath)) {
    const midiBuffer = fs.readFileSync(midiPath);
    const header = midiBuffer.slice(0, 4).toString('ascii');
    assert(header === 'MThd', 'MIDI file has valid MThd header', `Got: ${header}`);
  }
  
  // Test 6: Beatmap JSON exists
  const beatmapPath = path.join(songDir, 'beatmap.json');
  assert(fs.existsSync(beatmapPath), 'Beatmap JSON exists');
  
  // Test 7: Beatmap JSON is valid
  if (fs.existsSync(beatmapPath)) {
    try {
      const beatmap = JSON.parse(fs.readFileSync(beatmapPath, 'utf8'));
      assert(true, 'Beatmap JSON is valid JSON');
      
      // Test 8: Beatmap has required fields
      assert(beatmap.bpm > 0, 'Beatmap has valid BPM', `BPM: ${beatmap.bpm}`);
      assert(beatmap.duration > 0, 'Beatmap has valid duration', `Duration: ${beatmap.duration}ms`);
      assert(Array.isArray(beatmap.notes), 'Beatmap has notes array');
      assert(beatmap.notes.length > 0, 'Beatmap has notes', `Count: ${beatmap.notes.length}`);
      assert(beatmap.totalNotes === beatmap.notes.length, 'Beatmap totalNotes matches notes array length');
      
      // Test 9: Notes have correct structure
      if (beatmap.notes.length > 0) {
        const firstNote = beatmap.notes[0];
        assert(typeof firstNote.time === 'number', 'Notes have time property');
        assert(typeof firstNote.lane === 'number', 'Notes have lane property');
        assert(firstNote.lane >= 0 && firstNote.lane <= 5, 'Note lanes are 0-5', `Lane: ${firstNote.lane}`);
      }
      
      // Test 10: Notes are sorted by time
      let sorted = true;
      for (let i = 1; i < beatmap.notes.length; i++) {
        if (beatmap.notes[i].time < beatmap.notes[i-1].time) {
          sorted = false;
          break;
        }
      }
      assert(sorted, 'Notes are sorted by time');
      
      // Test 11: All 6 lanes are used
      const lanesUsed = new Set(beatmap.notes.map(n => n.lane));
      assert(lanesUsed.size >= 3, 'At least 3 lanes are used', `Lanes: ${[...lanesUsed].sort().join(', ')}`);
      
      // Test 12: Difficulty is set
      assert(beatmap.difficulty, 'Beatmap has difficulty set', `Difficulty: ${beatmap.difficulty}`);
      
    } catch (e) {
      assert(false, 'Beatmap JSON is valid JSON', e.message);
    }
  }
}

// ============================================================
// Phase 2: HTML Patching Validation Tests
// ============================================================

function runHTMLValidationTests() {
  console.log('\n📄 Phase 2: HTML Patching Validation Tests');
  console.log('─'.repeat(50));
  
  assert(fs.existsSync(CONFIG.gamePath), 'beat-protocol.html exists');
  
  const html = fs.readFileSync(CONFIG.gamePath, 'utf8');
  
  // Test: Song entry exists in SONGS object
  assert(html.includes(`'${CONFIG.testSongId}':`), 'Song entry exists in SONGS object');
  
  // Test: Song has beatmapPath
  assert(html.includes(`assets/songs/${CONFIG.testSongId}/beatmap.json`), 'Song has correct beatmapPath');
  
  // Test: Song has videoPath
  assert(html.includes(`assets/songs/${CONFIG.testSongId}/video.mp4`), 'Song has correct videoPath');
  
  // Test: loadBeatmapFromJSON function exists
  assert(html.includes('async function loadBeatmapFromJSON'), 'loadBeatmapFromJSON function exists');
  
  // Test: loadAllBeatmaps function exists
  assert(html.includes('async function loadAllBeatmaps'), 'loadAllBeatmaps function exists');
  
  // Test: loadAllBeatmaps is called
  assert(html.includes('loadAllBeatmaps()'), 'loadAllBeatmaps() is called');
  
  // Test: SONG_KEYS is defined
  assert(html.includes('const SONG_KEYS'), 'SONG_KEYS is defined');
  
  // Test: HTML is valid (has closing tags)
  assert(html.includes('</html>'), 'HTML has closing tag');
  assert(html.includes('</script>'), 'Script has closing tag');
  
  // Test: Existing songs still present
  assert(html.includes("'moonlight':"), 'Moonlight song still present');
  assert(html.includes("'bad-apple':"), 'Bad Apple song still present');
  assert(html.includes("'echo':"), 'ECHO song still present');
}

// ============================================================
// Phase 3: Browser E2E Tests
// ============================================================

async function runBrowserTests() {
  console.log('\n🌐 Phase 3: Browser E2E Tests');
  console.log('─'.repeat(50));
  
  // Start local server for serving files
  const projectRoot = path.join(__dirname, '..');
  const server = await startServer(projectRoot, CONFIG.serverPort);
  console.log(`  📡 Local server started on port ${CONFIG.serverPort}`);
  
  let browser;
  
  try {
    // Launch browser
    console.log(`  🚀 Launching browser (headless: ${CONFIG.headless})...`);
    browser = await puppeteer.launch({
      headless: CONFIG.headless === true ? 'new' : CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[AI]') || text.includes('[Test]') || text.includes('Loaded beatmap')) {
        console.log(`    [browser] ${text}`);
      }
    });
    
    // Capture errors
    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.message);
      console.log(`    [error] ${err.message}`);
    });
    
    // Load the game via HTTP server
    console.log('  📂 Loading beat-protocol.html...');
    await page.goto(`http://localhost:${CONFIG.serverPort}/beat-protocol.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for beatmaps to load (loadAllBeatmaps is async)
    await new Promise(r => setTimeout(r, 3000));
    
    // Test: Page loaded without errors
    assert(pageErrors.length === 0, 'Page loaded without JS errors', 
      pageErrors.length > 0 ? pageErrors[0] : '');
    
    // Test: Game state is 'menu'
    const initialState = await page.evaluate(() => gameState);
    assert(initialState === 'menu', 'Game starts in menu state', `State: ${initialState}`);
    
    // Test: SONGS object has the new song
    const hasSong = await page.evaluate((id) => {
      return typeof SONGS !== 'undefined' && SONGS[id] !== undefined;
    }, CONFIG.testSongId);
    assert(hasSong, 'SONGS object contains new song');
    
    // Test: SONG_KEYS includes the new song
    const songKeys = await page.evaluate(() => SONG_KEYS);
    assert(songKeys.includes(CONFIG.testSongId), 'SONG_KEYS includes new song', 
      `Keys: ${songKeys.join(', ')}`);
    
    // Test: New song has loaded beatmap notes
    const songInfo = await page.evaluate((id) => {
      const song = SONGS[id];
      return {
        title: song.title,
        artist: song.artist,
        bpm: song.bpm,
        noteCount: song.notes ? song.notes.length : 0,
        hasBeatmapPath: !!song.beatmapPath
      };
    }, CONFIG.testSongId);
    
    assert(songInfo.title === 'Witchblades', 'Song title is correct', `Title: ${songInfo.title}`);
    assert(songInfo.artist === 'Lil Peep & Lil Tracy', 'Song artist is correct', `Artist: ${songInfo.artist}`);
    assert(songInfo.bpm === 130, 'Song BPM is correct', `BPM: ${songInfo.bpm}`);
    assert(songInfo.noteCount > 0, 'Song has loaded beatmap notes', `Notes: ${songInfo.noteCount}`);
    
    // Test: Existing songs still have notes
    const existingSongsOk = await page.evaluate(() => {
      return {
        moonlight: SONGS['moonlight'].notes.length,
        badApple: SONGS['bad-apple'].notes.length,
        echo: SONGS['echo'].notes.length
      };
    });
    assert(existingSongsOk.moonlight > 0, 'Moonlight still has notes', `Count: ${existingSongsOk.moonlight}`);
    assert(existingSongsOk.badApple > 0, 'Bad Apple still has notes', `Count: ${existingSongsOk.badApple}`);
    assert(existingSongsOk.echo > 0, 'ECHO still has notes', `Count: ${existingSongsOk.echo}`);
    
    if (CONFIG.screenshot) {
      await page.screenshot({ path: 'test-bp-menu.png' });
      console.log('  📸 Screenshot: test-bp-menu.png');
    }
    
    // ── Navigate to Witchblades ──
    console.log('  🎮 Injecting gamepad simulator and AI...');
    
    // Inject gamepad simulator
    const simulatorCode = fs.readFileSync(path.join(__dirname, 'gamepad-simulator.js'), 'utf8');
    await page.evaluate(simulatorCode);
    
    // Inject AI controller
    const aiCode = fs.readFileSync(path.join(__dirname, 'beat-protocol-ai.js'), 'utf8');
    await page.evaluate(aiCode);
    
    // Initialize gamepads
    await page.evaluate(() => {
      window.testSimulator = new GamepadSimulator();
      window.testSimulator.inject();
      window.testSimulator.createGamepad(0, 'Test Player 1');
      window.testSimulator.createGamepad(1, 'Test Player 2');
      console.log('[Test] Gamepads created');
    });
    
    // Navigate to the Witchblades song
    const targetSongIndex = await page.evaluate((id) => SONG_KEYS.indexOf(id), CONFIG.testSongId);
    console.log(`  🎵 Navigating to song index ${targetSongIndex}...`);
    
    if (targetSongIndex > 0) {
      // Press DOWN to navigate to the song
      for (let i = 0; i < targetSongIndex; i++) {
        await page.evaluate(() => {
          // Use keyboard for reliable navigation
          document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
        });
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    // Verify we're on the right song
    const currentSong = await page.evaluate(() => currentSongKey);
    assert(currentSong === CONFIG.testSongId, 'Navigated to Witchblades', `Current: ${currentSong}`);
    
    if (CONFIG.screenshot) {
      await page.screenshot({ path: 'test-bp-song-selected.png' });
      console.log('  📸 Screenshot: test-bp-song-selected.png');
    }
    
    // ── Start the game ──
    console.log('  ▶️  Starting game...');
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Test: Game state changed to playing
    const playingState = await page.evaluate(() => gameState);
    assert(playingState === 'playing', 'Game state is playing', `State: ${playingState}`);
    
    // ── Start AI player ──
    console.log('  🤖 Starting AI player...');
    await page.evaluate(() => {
      window.testAI = new BeatProtocolAI(window.testSimulator);
      window.testAI.missChance = 0; // Perfect AI for testing
      window.testAI.hitWindowMs = 70; // Match PERFECT_WINDOW
      window.testAI.start();
      console.log('[Test] AI player started');
    });
    
    // ── Let the AI play ──
    console.log(`  ⏱️  Letting AI play for ${CONFIG.playDuration/1000}s...`);
    
    const startTime = Date.now();
    let lastScore = 0;
    let scoreUpdates = 0;
    
    while (Date.now() - startTime < CONFIG.playDuration) {
      await new Promise(r => setTimeout(r, 1000));
      
      const state = await page.evaluate(() => ({
        gameState,
        score: playerStats[0].score,
        combo: playerStats[0].combo,
        perfect: playerStats[0].perfect,
        good: playerStats[0].good,
        miss: playerStats[0].miss,
        songTime: Math.round(songTime)
      }));
      
      if (state.score !== lastScore) {
        console.log(`    📊 Score: ${state.score} | Combo: ${state.combo} | P:${state.perfect} G:${state.good} M:${state.miss} | Time: ${(state.songTime/1000).toFixed(1)}s`);
        lastScore = state.score;
        scoreUpdates++;
      }
      
      // If game ended early, break
      if (state.gameState === 'results') {
        console.log('    🏁 Game ended (results screen)');
        break;
      }
    }
    
    // ── Collect final results ──
    const finalState = await page.evaluate(() => ({
      gameState,
      score: playerStats[0].score,
      combo: playerStats[0].combo,
      maxCombo: playerStats[0].maxCombo,
      perfect: playerStats[0].perfect,
      good: playerStats[0].good,
      miss: playerStats[0].miss,
      songTime: Math.round(songTime),
      totalNotes: SONGS[currentSongKey].notes.length
    }));
    
    console.log(`\n  📊 Final Results:`);
    console.log(`     Score: ${finalState.score}`);
    console.log(`     Max Combo: ${finalState.maxCombo}`);
    console.log(`     Perfect: ${finalState.perfect} | Good: ${finalState.good} | Miss: ${finalState.miss}`);
    console.log(`     Song Time: ${(finalState.songTime/1000).toFixed(1)}s`);
    
    if (CONFIG.screenshot) {
      await page.screenshot({ path: 'test-bp-gameplay.png' });
      console.log('  📸 Screenshot: test-bp-gameplay.png');
    }
    
    // Test: AI achieved a score
    assert(finalState.score > 0, 'AI achieved a positive score', `Score: ${finalState.score}`);
    assert(finalState.score >= CONFIG.minScore, `AI score >= ${CONFIG.minScore}`, `Score: ${finalState.score}`);
    
    // Test: AI hit some notes
    assert(finalState.perfect + finalState.good > 0, 'AI hit some notes', 
      `Perfect: ${finalState.perfect}, Good: ${finalState.good}`);
    
    // Test: Combo system works
    assert(finalState.maxCombo > 0, 'Combo system works', `Max combo: ${finalState.maxCombo}`);
    
    // Test: Score updates happened during gameplay
    assert(scoreUpdates > 0, 'Score updated during gameplay', `Updates: ${scoreUpdates}`);
    
    // Stop AI
    await page.evaluate(() => {
      if (window.testAI) window.testAI.stop();
    });
    
    // ── Test: Song time advanced ──
    assert(finalState.songTime > 1000, 'Song time advanced', `Time: ${finalState.songTime}ms`);
    
  } catch (error) {
    console.error(`\n  ❌ Browser test error: ${error.message}`);
    assert(false, 'Browser tests completed without errors', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('  🔒 Browser closed');
    }
    server.close();
    console.log('  📡 Server stopped');
  }
}

// ============================================================
// Phase 4: MIDI Parser Unit Tests
// ============================================================

function runMidiParserTests() {
  console.log('\n🎼 Phase 4: MIDI Parser & Converter Tests');
  console.log('─'.repeat(50));
  
  const { convertMidiToBeatmap, MidiParser } = require('../tools/midi-to-beatmap');
  
  // Test: MidiParser can parse the generated MIDI
  const midiPath = path.join(CONFIG.assetsDir, 'songs', CONFIG.testSongId, 'source.mid');
  if (fs.existsSync(midiPath)) {
    const buffer = fs.readFileSync(midiPath);
    const parser = new MidiParser(Buffer.from(buffer));
    
    try {
      const midi = parser.parse();
      assert(true, 'MidiParser parses generated MIDI without errors');
      assert(midi.header.format === 0, 'MIDI format is 0', `Format: ${midi.header.format}`);
      assert(midi.header.numTracks === 1, 'MIDI has 1 track', `Tracks: ${midi.header.numTracks}`);
      assert(midi.header.ticksPerBeat === 480, 'Ticks per beat is 480', `TPB: ${midi.header.ticksPerBeat}`);
      
      // Count note events
      let noteOnCount = 0;
      for (const event of midi.tracks[0]) {
        if (event.type === 'noteOn') noteOnCount++;
      }
      assert(noteOnCount > 100, 'MIDI has sufficient note events', `Count: ${noteOnCount}`);
      
    } catch (e) {
      assert(false, 'MidiParser parses generated MIDI without errors', e.message);
    }
  }
  
  // Test: convertMidiToBeatmap produces valid output for each difficulty
  for (const difficulty of ['Easy', 'Medium', 'Hard']) {
    const beatmap = convertMidiToBeatmap(midiPath, { difficulty, offset: 0, trackFilter: 'all', adaptiveLanes: false });
    assert(beatmap.notes.length > 0, `${difficulty} difficulty produces notes`, `Count: ${beatmap.notes.length}`);
    assert(beatmap.bpm === 130, `${difficulty} BPM is correct`);
  }
  
  // Test: Easy has fewer notes than Hard
  const easyBeatmap = convertMidiToBeatmap(midiPath, { difficulty: 'Easy', offset: 0, trackFilter: 'all', adaptiveLanes: false });
  const hardBeatmap = convertMidiToBeatmap(midiPath, { difficulty: 'Hard', offset: 0, trackFilter: 'all', adaptiveLanes: false });
  assert(easyBeatmap.notes.length < hardBeatmap.notes.length, 
    'Easy has fewer notes than Hard', 
    `Easy: ${easyBeatmap.notes.length}, Hard: ${hardBeatmap.notes.length}`);
  
  // Test: Adaptive lane mapping works
  const adaptiveBeatmap = convertMidiToBeatmap(midiPath, { difficulty: 'Medium', offset: 0, trackFilter: 'all', adaptiveLanes: true });
  assert(adaptiveBeatmap.notes.length > 0, 'Adaptive lane mapping produces notes', `Count: ${adaptiveBeatmap.notes.length}`);
  
  // Test: Offset works
  const offsetBeatmap = convertMidiToBeatmap(midiPath, { difficulty: 'Medium', offset: 1000, trackFilter: 'all', adaptiveLanes: false });
  const normalBeatmap = convertMidiToBeatmap(midiPath, { difficulty: 'Medium', offset: 0, trackFilter: 'all', adaptiveLanes: false });
  if (offsetBeatmap.notes.length > 0 && normalBeatmap.notes.length > 0) {
    const timeDiff = offsetBeatmap.notes[0].time - normalBeatmap.notes[0].time;
    assert(timeDiff === 1000, 'Offset shifts notes by correct amount', `Diff: ${timeDiff}ms`);
  }
}

// ============================================================
// Main Test Runner
// ============================================================

async function main() {
  console.log('🎮 Beat Protocol — E2E Test Suite');
  console.log('═'.repeat(50));
  console.log(`Test Song: ${CONFIG.testSongId}`);
  console.log(`Headless: ${CONFIG.headless}`);
  console.log(`Screenshots: ${CONFIG.screenshot}`);
  console.log('');
  
  // Phase 1: File validation
  runFileValidationTests();
  
  // Phase 2: HTML patching validation
  runHTMLValidationTests();
  
  // Phase 3: MIDI parser unit tests
  runMidiParserTests();
  
  // Phase 4: Browser E2E tests
  await runBrowserTests();
  
  // ── Summary ──
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests} ✅`);
  console.log(`  Failed: ${failedTests} ❌`);
  console.log(`  Rate:   ${Math.round(passedTests/totalTests*100)}%`);
  
  if (failedTests > 0) {
    console.log('\n  Failed tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`    ❌ ${t.name}${t.details ? ': ' + t.details : ''}`);
    });
  }
  
  console.log('');
  
  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log(`💥 ${failedTests} TEST(S) FAILED`);
  }
  
  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
