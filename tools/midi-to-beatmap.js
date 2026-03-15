#!/usr/bin/env node
/**
 * midi-to-beatmap.js — Convert MIDI files to Beat Protocol beatmap JSON
 * 
 * Parses a standard MIDI file and maps note events to 6 lanes based on pitch ranges.
 * No external dependencies required — includes a built-in MIDI parser.
 * 
 * Usage:
 *   node tools/midi-to-beatmap.js --file "assets/songs/my-song/source.mid" --id "my-song"
 *   node tools/midi-to-beatmap.js --file "source.mid" --id "my-song" --difficulty "Medium"
 * 
 * Options:
 *   --file        Path to MIDI file (required)
 *   --id          Song ID (required)
 *   --difficulty  Easy, Medium, or Hard (default: Medium)
 *   --offset      Start offset in ms (default: 0)
 *   --track       Track number to use, or "all" (default: all)
 *   --preview     Print first 20 notes without saving
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Built-in MIDI Parser (Standard MIDI File Format 0 & 1)
// ============================================================

class MidiParser {
  constructor(buffer) {
    this.buffer = buffer;
    this.pos = 0;
  }

  readUint8() {
    return this.buffer[this.pos++];
  }

  readUint16() {
    const val = (this.buffer[this.pos] << 8) | this.buffer[this.pos + 1];
    this.pos += 2;
    return val;
  }

  readUint32() {
    const val = (this.buffer[this.pos] << 24) | (this.buffer[this.pos + 1] << 16) |
                (this.buffer[this.pos + 2] << 8) | this.buffer[this.pos + 3];
    this.pos += 4;
    return val >>> 0; // unsigned
  }

  readString(length) {
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.buffer[this.pos++]);
    }
    return str;
  }

  readVarLen() {
    let value = 0;
    let byte;
    do {
      byte = this.readUint8();
      value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    return value;
  }

  parse() {
    // Read header chunk
    const headerChunkId = this.readString(4);
    if (headerChunkId !== 'MThd') {
      throw new Error('Not a valid MIDI file (missing MThd header)');
    }

    const headerLength = this.readUint32();
    const format = this.readUint16();
    const numTracks = this.readUint16();
    const timeDivision = this.readUint16();

    const ticksPerBeat = timeDivision & 0x7FFF; // Assuming ticks-per-beat (not SMPTE)

    const header = { format, numTracks, ticksPerBeat };
    const tracks = [];

    // Read track chunks
    for (let t = 0; t < numTracks; t++) {
      const trackChunkId = this.readString(4);
      if (trackChunkId !== 'MTrk') {
        throw new Error(`Expected MTrk but got ${trackChunkId} at track ${t}`);
      }

      const trackLength = this.readUint32();
      const trackEnd = this.pos + trackLength;
      const events = [];
      let runningStatus = 0;

      while (this.pos < trackEnd) {
        const deltaTime = this.readVarLen();
        let statusByte = this.buffer[this.pos];

        // Running status: if high bit is not set, reuse previous status
        if (statusByte < 0x80) {
          statusByte = runningStatus;
        } else {
          this.pos++;
          runningStatus = statusByte;
        }

        const eventType = statusByte & 0xF0;
        const channel = statusByte & 0x0F;

        if (statusByte === 0xFF) {
          // Meta event
          const metaType = this.readUint8();
          const metaLength = this.readVarLen();
          const metaData = this.buffer.slice(this.pos, this.pos + metaLength);
          this.pos += metaLength;

          events.push({
            deltaTime,
            type: 'meta',
            metaType,
            data: metaData
          });
        } else if (statusByte === 0xF0 || statusByte === 0xF7) {
          // SysEx event
          const sysexLength = this.readVarLen();
          this.pos += sysexLength;
          events.push({ deltaTime, type: 'sysex' });
        } else if (eventType === 0x90) {
          // Note On
          const note = this.readUint8();
          const velocity = this.readUint8();
          events.push({
            deltaTime,
            type: velocity > 0 ? 'noteOn' : 'noteOff',
            channel,
            note,
            velocity
          });
        } else if (eventType === 0x80) {
          // Note Off
          const note = this.readUint8();
          const velocity = this.readUint8();
          events.push({
            deltaTime,
            type: 'noteOff',
            channel,
            note,
            velocity
          });
        } else if (eventType === 0xA0) {
          // Aftertouch
          this.pos += 2;
          events.push({ deltaTime, type: 'aftertouch' });
        } else if (eventType === 0xB0) {
          // Control Change
          this.pos += 2;
          events.push({ deltaTime, type: 'controlChange' });
        } else if (eventType === 0xC0) {
          // Program Change
          this.pos += 1;
          events.push({ deltaTime, type: 'programChange' });
        } else if (eventType === 0xD0) {
          // Channel Pressure
          this.pos += 1;
          events.push({ deltaTime, type: 'channelPressure' });
        } else if (eventType === 0xE0) {
          // Pitch Bend
          this.pos += 2;
          events.push({ deltaTime, type: 'pitchBend' });
        } else {
          // Unknown — skip one byte and hope for the best
          this.pos += 1;
          events.push({ deltaTime, type: 'unknown', statusByte });
        }
      }

      // Ensure we're at the right position
      this.pos = trackEnd;
      tracks.push(events);
    }

    return { header, tracks };
  }
}

// ============================================================
// MIDI to Beatmap Conversion
// ============================================================

/**
 * Extract tempo changes from MIDI meta events.
 * Returns array of { tick, microsecondsPerBeat, bpm }
 */
function extractTempoMap(tracks) {
  const tempoChanges = [];
  
  for (const track of tracks) {
    let tick = 0;
    for (const event of track) {
      tick += event.deltaTime;
      // Meta event type 0x51 = Set Tempo
      if (event.type === 'meta' && event.metaType === 0x51 && event.data.length === 3) {
        const microsecondsPerBeat = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
        const bpm = Math.round(60000000 / microsecondsPerBeat);
        tempoChanges.push({ tick, microsecondsPerBeat, bpm });
      }
    }
  }

  // Default tempo if none specified
  if (tempoChanges.length === 0) {
    tempoChanges.push({ tick: 0, microsecondsPerBeat: 500000, bpm: 120 });
  }

  tempoChanges.sort((a, b) => a.tick - b.tick);
  return tempoChanges;
}

/**
 * Convert tick position to milliseconds using tempo map.
 */
function tickToMs(tick, tempoMap, ticksPerBeat) {
  let ms = 0;
  let lastTick = 0;
  let currentTempo = tempoMap[0].microsecondsPerBeat;

  for (const change of tempoMap) {
    if (change.tick > tick) break;
    ms += ((change.tick - lastTick) / ticksPerBeat) * (currentTempo / 1000);
    lastTick = change.tick;
    currentTempo = change.microsecondsPerBeat;
  }

  ms += ((tick - lastTick) / ticksPerBeat) * (currentTempo / 1000);
  return Math.round(ms);
}

/**
 * Extract all note-on events from MIDI tracks.
 * Returns array of { timeMs, note, velocity, channel, track }
 */
function extractNotes(midi, trackFilter) {
  const tempoMap = extractTempoMap(midi.tracks);
  const ticksPerBeat = midi.header.ticksPerBeat;
  const allNotes = [];

  const tracksToProcess = trackFilter === 'all' 
    ? midi.tracks.map((_, i) => i)
    : [parseInt(trackFilter)];

  for (const trackIdx of tracksToProcess) {
    if (trackIdx >= midi.tracks.length) continue;
    const track = midi.tracks[trackIdx];
    let tick = 0;

    for (const event of track) {
      tick += event.deltaTime;
      if (event.type === 'noteOn') {
        const timeMs = tickToMs(tick, tempoMap, ticksPerBeat);
        allNotes.push({
          timeMs,
          note: event.note,
          velocity: event.velocity,
          channel: event.channel,
          track: trackIdx
        });
      }
    }
  }

  allNotes.sort((a, b) => a.timeMs - b.timeMs);
  return { notes: allNotes, tempoMap };
}

/**
 * Map a MIDI note number to one of 6 lanes.
 * 
 * Default mapping (configurable):
 *   Lane 0 (LEFT):  C2-B2  (36-47)  — Bass
 *   Lane 1 (DOWN):  C3-G3  (48-55)  — Low mid
 *   Lane 2 (UP):    G#3-D4 (56-62)  — Mid
 *   Lane 3 (RIGHT): D#4-B4 (63-71)  — High mid
 *   Lane 4 (ACT1):  C5-B5  (72-83)  — High
 *   Lane 5 (ACT2):  C6+    (84+)    — Very high
 * 
 * Notes below C2 (36) go to lane 0.
 * This creates a natural left-to-right flow matching pitch.
 */
function noteToLane(midiNote) {
  if (midiNote < 48) return 0;       // Bass → LEFT
  if (midiNote < 56) return 1;       // Low mid → DOWN
  if (midiNote < 63) return 2;       // Mid → UP
  if (midiNote < 72) return 3;       // High mid → RIGHT
  if (midiNote < 84) return 4;       // High → ACT1
  return 5;                           // Very high → ACT2
}

/**
 * Alternative lane mapping: distribute notes evenly across lanes
 * based on the actual pitch range in the song.
 */
function noteToLaneAdaptive(midiNote, minNote, maxNote) {
  const range = maxNote - minNote;
  if (range === 0) return 3; // All same note → middle lane
  const normalized = (midiNote - minNote) / range;
  return Math.min(5, Math.floor(normalized * 6));
}

/**
 * Apply difficulty-based filtering to reduce note density.
 * 
 * Easy:   Max 3 notes/sec, min 300ms gap
 * Medium: Max 6 notes/sec, min 150ms gap
 * Hard:   Max 12 notes/sec, min 80ms gap
 */
function filterByDifficulty(notes, difficulty) {
  const settings = {
    'Easy':   { minGap: 300, maxPerSecond: 3 },
    'Medium': { minGap: 150, maxPerSecond: 6 },
    'Hard':   { minGap: 80,  maxPerSecond: 12 }
  };

  const config = settings[difficulty] || settings['Medium'];
  const filtered = [];
  let lastTime = -Infinity;

  // Support both .time and .timeMs property names
  const getTime = (note) => note.time !== undefined ? note.time : note.timeMs;

  for (const note of notes) {
    if (getTime(note) - lastTime >= config.minGap) {
      filtered.push(note);
      lastTime = getTime(note);
    }
  }

  // Second pass: enforce max notes per second using sliding window
  const result = [];
  for (let i = 0; i < filtered.length; i++) {
    const windowStart = getTime(filtered[i]) - 1000;
    const notesInWindow = result.filter(n => getTime(n) > windowStart).length;
    if (notesInWindow < config.maxPerSecond) {
      result.push(filtered[i]);
    }
  }

  return result;
}

/**
 * Remove duplicate notes at the same time and lane.
 */
function deduplicateNotes(beatmapNotes) {
  const seen = new Set();
  return beatmapNotes.filter(note => {
    // Round time to nearest 10ms to catch near-duplicates
    const key = `${Math.round(note.time / 10) * 10}-${note.lane}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main conversion: MIDI → Beatmap JSON
 */
function convertMidiToBeatmap(midiFilePath, options = {}) {
  const {
    difficulty = 'Medium',
    offset = 0,
    trackFilter = 'all',
    adaptiveLanes = false
  } = options;

  console.log('🎼 Beat Protocol — MIDI to Beatmap Converter');
  console.log('═'.repeat(50));
  console.log(`📁 Input: ${midiFilePath}`);
  console.log(`🎯 Difficulty: ${difficulty}`);
  console.log(`⏱️  Offset: ${offset}ms`);
  console.log(`🎹 Track: ${trackFilter}\n`);

  // Read and parse MIDI
  const buffer = fs.readFileSync(midiFilePath);
  const parser = new MidiParser(Buffer.from(buffer));
  const midi = parser.parse();

  console.log(`📊 MIDI Info:`);
  console.log(`   Format: ${midi.header.format}`);
  console.log(`   Tracks: ${midi.header.numTracks}`);
  console.log(`   Ticks/Beat: ${midi.header.ticksPerBeat}`);

  // Extract notes
  const { notes: midiNotes, tempoMap } = extractNotes(midi, trackFilter);
  const primaryBpm = tempoMap[0].bpm;

  console.log(`   BPM: ${primaryBpm}${tempoMap.length > 1 ? ` (${tempoMap.length} tempo changes)` : ''}`);
  console.log(`   Total note events: ${midiNotes.length}`);

  if (midiNotes.length === 0) {
    console.error('\n❌ No note events found in the MIDI file!');
    console.error('   Try specifying a different track with --track');
    
    // List tracks with note counts
    for (let i = 0; i < midi.tracks.length; i++) {
      const noteCount = midi.tracks[i].filter(e => e.type === 'noteOn').length;
      console.error(`   Track ${i}: ${noteCount} notes`);
    }
    process.exit(1);
  }

  // Find pitch range for adaptive mapping
  const pitches = midiNotes.map(n => n.note);
  const minNote = Math.min(...pitches);
  const maxNote = Math.max(...pitches);
  console.log(`   Pitch range: ${minNote} (${noteName(minNote)}) — ${maxNote} (${noteName(maxNote)})`);

  // Map to lanes
  const laneMapper = adaptiveLanes 
    ? (note) => noteToLaneAdaptive(note, minNote, maxNote)
    : noteToLane;

  let beatmapNotes = midiNotes.map(n => ({
    time: n.timeMs + offset,
    lane: laneMapper(n.note)
  }));

  console.log(`\n🔧 Processing:`);
  console.log(`   Notes before filtering: ${beatmapNotes.length}`);

  // Deduplicate
  beatmapNotes = deduplicateNotes(beatmapNotes);
  console.log(`   After deduplication: ${beatmapNotes.length}`);

  // Apply difficulty filter
  beatmapNotes = filterByDifficulty(beatmapNotes, difficulty);
  console.log(`   After difficulty filter (${difficulty}): ${beatmapNotes.length}`);

  // Calculate duration
  const duration = beatmapNotes.length > 0 
    ? beatmapNotes[beatmapNotes.length - 1].time + 2000 
    : 0;

  // Lane distribution stats
  const laneCounts = [0, 0, 0, 0, 0, 0];
  beatmapNotes.forEach(n => laneCounts[n.lane]++);
  const laneNames = ['LEFT', 'DOWN', 'UP', 'RIGHT', 'ACT1', 'ACT2'];
  
  console.log(`\n📊 Lane Distribution:`);
  laneCounts.forEach((count, i) => {
    const bar = '█'.repeat(Math.round(count / beatmapNotes.length * 30));
    console.log(`   ${laneNames[i].padEnd(6)} ${String(count).padStart(4)} ${bar}`);
  });

  // Build beatmap object
  const beatmap = {
    bpm: primaryBpm,
    duration,
    difficulty,
    totalNotes: beatmapNotes.length,
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(midiFilePath),
    notes: beatmapNotes
  };

  return beatmap;
}

/**
 * Convert MIDI note number to note name (e.g., 60 → "C4")
 */
function noteName(midiNote) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const name = names[midiNote % 12];
  return `${name}${octave}`;
}

// ============================================================
// CLI Entry Point
// ============================================================

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      parsed.file = args[i + 1]; i++;
    } else if (args[i] === '--id' && args[i + 1]) {
      parsed.id = args[i + 1]; i++;
    } else if (args[i] === '--difficulty' && args[i + 1]) {
      parsed.difficulty = args[i + 1]; i++;
    } else if (args[i] === '--offset' && args[i + 1]) {
      parsed.offset = parseInt(args[i + 1]); i++;
    } else if (args[i] === '--track' && args[i + 1]) {
      parsed.track = args[i + 1]; i++;
    } else if (args[i] === '--adaptive') {
      parsed.adaptive = true;
    } else if (args[i] === '--preview') {
      parsed.preview = true;
    }
  }
  return parsed;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file || !args.id) {
    console.log('Usage: node tools/midi-to-beatmap.js --file "<midi-file>" --id "<song-id>" [options]');
    console.log('');
    console.log('Options:');
    console.log('  --difficulty  Easy, Medium, or Hard (default: Medium)');
    console.log('  --offset      Start offset in ms (default: 0)');
    console.log('  --track       Track number or "all" (default: all)');
    console.log('  --adaptive    Use adaptive lane mapping based on pitch range');
    console.log('  --preview     Print first 20 notes without saving');
    console.log('');
    console.log('Examples:');
    console.log('  node tools/midi-to-beatmap.js --file "assets/songs/my-song/source.mid" --id "my-song"');
    console.log('  node tools/midi-to-beatmap.js --file "source.mid" --id "my-song" --difficulty "Hard" --offset 2000');
    process.exit(1);
  }

  const beatmap = convertMidiToBeatmap(args.file, {
    difficulty: args.difficulty || 'Medium',
    offset: args.offset || 0,
    trackFilter: args.track || 'all',
    adaptiveLanes: args.adaptive || false
  });

  if (args.preview) {
    console.log('\n🔍 Preview (first 20 notes):');
    const laneNames = ['LEFT', 'DOWN', 'UP', 'RIGHT', 'ACT1', 'ACT2'];
    beatmap.notes.slice(0, 20).forEach((note, i) => {
      const mins = Math.floor(note.time / 60000);
      const secs = ((note.time % 60000) / 1000).toFixed(1);
      console.log(`   ${String(i + 1).padStart(3)}. ${mins}:${secs.padStart(5, '0')} → ${laneNames[note.lane]} (lane ${note.lane})`);
    });
    console.log('\n   (Use without --preview to save the beatmap)');
  } else {
    // Save beatmap JSON
    const outputDir = path.join(process.cwd(), 'assets', 'songs', args.id);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'beatmap.json');
    fs.writeFileSync(outputPath, JSON.stringify(beatmap, null, 2));

    console.log(`\n✅ Beatmap saved!`);
    console.log(`   📁 Path: ${outputPath}`);
    console.log(`   🎵 Notes: ${beatmap.totalNotes}`);
    console.log(`   ⏱️  Duration: ${Math.floor(beatmap.duration / 60000)}:${String(Math.floor((beatmap.duration % 60000) / 1000)).padStart(2, '0')}`);
    console.log(`   🎯 BPM: ${beatmap.bpm}`);
  }
}

module.exports = { convertMidiToBeatmap, MidiParser };
