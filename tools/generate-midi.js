#!/usr/bin/env node
/**
 * generate-midi.js — Generate a synthetic MIDI file for testing
 * 
 * Creates a valid Standard MIDI File (Format 0) with note events
 * that simulate a real song's structure for Beat Protocol testing.
 * 
 * Usage:
 *   node tools/generate-midi.js --id "witchblades" --bpm 130 --duration 79
 */

const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i + 1]) { parsed.id = args[i + 1]; i++; }
    else if (args[i] === '--bpm' && args[i + 1]) { parsed.bpm = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--duration' && args[i + 1]) { parsed.duration = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--output' && args[i + 1]) { parsed.output = args[i + 1]; i++; }
  }
  return parsed;
}

/**
 * Write a variable-length quantity (VLQ) used in MIDI format
 */
function writeVLQ(value) {
  if (value < 0) value = 0;
  const bytes = [];
  bytes.unshift(value & 0x7F);
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7F) | 0x80);
    value >>= 7;
  }
  return Buffer.from(bytes);
}

/**
 * Build a complete MIDI file buffer
 * Strategy: collect all note-on events at absolute ticks, sort them,
 * then serialize with proper delta times. Note-off events are placed
 * a short duration after each note-on.
 */
function buildMidiFile(bpm, durationSeconds) {
  const ticksPerBeat = 480;
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  const totalBeats = Math.floor(durationSeconds * bpm / 60);
  const beatsPerBar = 4;
  const ticksPerBar = ticksPerBeat * beatsPerBar;
  const totalBars = Math.floor(totalBeats / beatsPerBar);
  const noteDurationTicks = Math.floor(ticksPerBeat * 0.25); // Short note duration
  
  // Collect all note events as absolute tick positions
  const noteEvents = []; // { tick, note, velocity }
  
  // Witchblades song structure patterns
  // Using different pitch ranges to test all 6 lanes:
  //   Lane 0 (LEFT):  < 48  (bass)
  //   Lane 1 (DOWN):  48-55
  //   Lane 2 (UP):    56-62
  //   Lane 3 (RIGHT): 63-71
  //   Lane 4 (ACT1):  72-83
  //   Lane 5 (ACT2):  84+
  
  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = ticksPerBeat * 4 + bar * ticksPerBar; // 4-beat intro offset
    const section = getSection(bar, totalBars);
    
    switch (section) {
      case 'intro':
        // Sparse bass hits on beats 1 and 3
        noteEvents.push({ tick: barStart, note: 36, velocity: 80 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 43, velocity: 75 });
        break;
        
      case 'verse':
        // Melody on every beat with some variation
        noteEvents.push({ tick: barStart, note: 48, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat, note: 55, velocity: 85 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 60, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3, note: 64, velocity: 85 });
        // Bass on beat 1
        noteEvents.push({ tick: barStart, note: 36, velocity: 70 });
        break;
        
      case 'prechorus':
        // Building intensity - notes on every beat + some off-beats
        noteEvents.push({ tick: barStart, note: 55, velocity: 95 });
        noteEvents.push({ tick: barStart + ticksPerBeat, note: 60, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 1.5, note: 67, velocity: 85 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 72, velocity: 95 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3, note: 76, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3.5, note: 60, velocity: 85 });
        break;
        
      case 'chorus':
        // Dense - all lanes active, notes on every beat and half-beat
        noteEvents.push({ tick: barStart, note: 36, velocity: 110 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 0.5, note: 60, velocity: 100 });
        noteEvents.push({ tick: barStart + ticksPerBeat, note: 72, velocity: 110 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 1.5, note: 84, velocity: 100 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 48, velocity: 110 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2.5, note: 67, velocity: 100 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3, note: 76, velocity: 110 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3.5, note: 55, velocity: 100 });
        break;
        
      case 'bridge':
        // Descending pattern
        noteEvents.push({ tick: barStart, note: 84, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat, note: 72, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 60, velocity: 90 });
        noteEvents.push({ tick: barStart + ticksPerBeat * 3, note: 48, velocity: 90 });
        break;
        
      case 'outro':
        // Sparse, fading
        if (bar % 2 === 0) {
          noteEvents.push({ tick: barStart, note: 60, velocity: 60 });
          noteEvents.push({ tick: barStart + ticksPerBeat * 2, note: 48, velocity: 50 });
        }
        break;
    }
  }
  
  // Sort by tick
  noteEvents.sort((a, b) => a.tick - b.tick);
  
  // Build MIDI events list (absolute tick -> delta conversion)
  const midiEvents = [];
  
  // Tempo meta event at tick 0
  midiEvents.push({
    absTick: 0,
    data: Buffer.from([
      0xFF, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xFF,
      (microsecondsPerBeat >> 8) & 0xFF,
      microsecondsPerBeat & 0xFF
    ])
  });
  
  // Track name meta event
  const trackName = 'Witchblades';
  midiEvents.push({
    absTick: 0,
    data: Buffer.concat([
      Buffer.from([0xFF, 0x03]),
      writeVLQ(trackName.length),
      Buffer.from(trackName, 'ascii')
    ])
  });
  
  // Add note on/off pairs
  for (const ne of noteEvents) {
    const tick = Math.round(ne.tick);
    midiEvents.push({
      absTick: tick,
      data: Buffer.from([0x90, ne.note, ne.velocity])
    });
    midiEvents.push({
      absTick: tick + noteDurationTicks,
      data: Buffer.from([0x80, ne.note, 0])
    });
  }
  
  // End of track
  const lastTick = noteEvents.length > 0 
    ? Math.round(noteEvents[noteEvents.length - 1].tick) + ticksPerBar
    : ticksPerBar;
  midiEvents.push({
    absTick: lastTick,
    data: Buffer.from([0xFF, 0x2F, 0x00])
  });
  
  // Sort all events by absolute tick (stable sort preserving order for same tick)
  midiEvents.sort((a, b) => a.absTick - b.absTick);
  
  // Convert to delta times and serialize
  const trackChunks = [];
  let prevTick = 0;
  for (const event of midiEvents) {
    const delta = Math.max(0, event.absTick - prevTick);
    trackChunks.push(writeVLQ(delta));
    trackChunks.push(event.data);
    prevTick = event.absTick;
  }
  const trackData = Buffer.concat(trackChunks);
  
  // Header chunk: MThd
  const header = Buffer.alloc(14);
  header.write('MThd', 0, 4, 'ascii');
  header.writeUInt32BE(6, 4);
  header.writeUInt16BE(0, 8);        // Format 0
  header.writeUInt16BE(1, 10);       // 1 track
  header.writeUInt16BE(ticksPerBeat, 12);
  
  // Track chunk: MTrk
  const trackHeader = Buffer.alloc(8);
  trackHeader.write('MTrk', 0, 4, 'ascii');
  trackHeader.writeUInt32BE(trackData.length, 4);
  
  return Buffer.concat([header, trackHeader, trackData]);
}

function getSection(bar, totalBars) {
  const pct = bar / totalBars;
  if (pct < 0.08) return 'intro';       // ~3 bars
  if (pct < 0.25) return 'verse';       // ~7 bars
  if (pct < 0.33) return 'prechorus';   // ~3 bars
  if (pct < 0.50) return 'chorus';      // ~6 bars
  if (pct < 0.58) return 'verse';       // ~3 bars
  if (pct < 0.67) return 'prechorus';   // ~3 bars
  if (pct < 0.83) return 'chorus';      // ~6 bars
  if (pct < 0.92) return 'bridge';      // ~3 bars
  return 'outro';                        // ~3 bars
}

// Main
const args = parseArgs(process.argv.slice(2));
const id = args.id || 'test-song';
const bpm = args.bpm || 130;
const duration = args.duration || 79;

const outputDir = args.output 
  ? path.dirname(args.output)
  : path.join(process.cwd(), 'assets', 'songs', id);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = args.output || path.join(outputDir, 'source.mid');

console.log(`🎵 Generating MIDI file for "${id}"`);
console.log(`   BPM: ${bpm}`);
console.log(`   Duration: ${duration}s`);
console.log(`   Output: ${outputPath}`);

const midiBuffer = buildMidiFile(bpm, duration);
fs.writeFileSync(outputPath, midiBuffer);

console.log(`✅ MIDI file generated (${midiBuffer.length} bytes)`);
