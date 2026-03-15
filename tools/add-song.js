#!/usr/bin/env node
/**
 * add-song.js — Orchestrator for adding new songs to Beat Protocol
 * 
 * This script runs the full pipeline:
 *   1. Download music video from YouTube (via yt-dlp)
 *   2. Download sheet music from MuseScore (via dl-librescore) or copy local file
 *   3. Convert MIDI to beatmap JSON
 *   4. Auto-patch beat-protocol.html with the new song entry
 * 
 * Usage:
 *   node tools/add-song.js \
 *     --name "Bad Apple" \
 *     --artist "Touhou" \
 *     --difficulty "Medium" \
 *     --youtube "https://youtube.com/watch?v=..." \
 *     --musescore "https://musescore.com/user/.../scores/..."
 * 
 *   node tools/add-song.js \
 *     --name "My Song" \
 *     --artist "Artist" \
 *     --difficulty "Hard" \
 *     --youtube "https://youtube.com/watch?v=..." \
 *     --midi "./local-file.mid"
 * 
 * Prerequisites:
 *   - yt-dlp (pip install yt-dlp)
 *   - ffmpeg (for video processing)
 *   - Node.js 16+
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { downloadVideo, getVideoDuration } = require('./download-video');
const { downloadFromMuseScore, copyLocalFile } = require('./download-musescore');
const { convertMidiToBeatmap } = require('./midi-to-beatmap');

// ============================================================
// Argument Parsing
// ============================================================

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--name':       parsed.name = next; i++; break;
      case '--artist':     parsed.artist = next; i++; break;
      case '--difficulty': parsed.difficulty = next; i++; break;
      case '--youtube':    parsed.youtube = next; i++; break;
      case '--musescore':  parsed.musescore = next; i++; break;
      case '--midi':       parsed.midi = next; i++; break;
      case '--musicxml':   parsed.musicxml = next; i++; break;
      case '--offset':     parsed.offset = parseInt(next); i++; break;
      case '--track':      parsed.track = next; i++; break;
      case '--adaptive':   parsed.adaptive = true; break;
      case '--skip-video': parsed.skipVideo = true; break;
      case '--skip-patch': parsed.skipPatch = true; break;
      case '--dry-run':    parsed.dryRun = true; break;
    }
  }
  return parsed;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function printUsage() {
  console.log(`
🎮 Beat Protocol — Add Song Orchestrator
═══════════════════════════════════════════

Usage:
  node tools/add-song.js --name "<name>" --artist "<artist>" --youtube "<url>" --musescore "<url>" [options]

Required:
  --name        Song name (e.g., "Bad Apple")
  --artist      Artist name (e.g., "Touhou")
  --youtube     YouTube URL for the music video
  
Sheet Music (one required):
  --musescore   MuseScore URL to download MIDI from
  --midi        Path to a local MIDI file
  --musicxml    Path to a local MusicXML file

Options:
  --difficulty  Easy, Medium, or Hard (default: Medium)
  --offset      Beatmap start offset in ms (default: 0)
  --track       MIDI track number or "all" (default: all)
  --adaptive    Use adaptive lane mapping
  --skip-video  Skip video download (if already downloaded)
  --skip-patch  Skip auto-patching beat-protocol.html
  --dry-run     Show what would be done without executing

Examples:
  node tools/add-song.js \\
    --name "Bad Apple" \\
    --artist "Touhou (Arcade Remix)" \\
    --difficulty "Medium" \\
    --youtube "https://youtube.com/watch?v=9lNZ_Rnr7Jc" \\
    --musescore "https://musescore.com/user/123/scores/456"

  node tools/add-song.js \\
    --name "Moonlight" \\
    --artist "XXXTentacion" \\
    --difficulty "Easy" \\
    --youtube "https://youtube.com/watch?v=..." \\
    --midi "./moonlight.mid"
`);
}

// ============================================================
// Auto-Patch beat-protocol.html
// ============================================================

function generateSongEntry(songId, config) {
  const { name, artist, bpm, duration, difficulty, videoPath, notes } = config;
  const durationMs = duration;
  
  // Inline notes from beatmap so the game works without a server (file:// protocol)
  let notesStr = '[]';
  if (notes && notes.length > 0) {
    const inlineNotes = notes.map(n => ({
      time: n.time, lane: n.lane,
      hitP1: false, hitP2: false, missedP1: false, missedP2: false
    }));
    notesStr = JSON.stringify(inlineNotes);
  }
  
  return `  '${songId}': {
    title: '${name.replace(/'/g, "\\'")}',
    artist: '${artist.replace(/'/g, "\\'")}',
    bpm: ${bpm},
    duration: ${durationMs},
    difficulty: '${difficulty}',
    videoPath: '${videoPath}',
    beatmapPath: 'assets/songs/${songId}/beatmap.json',
    notes: ${notesStr}
  }`;
}

function patchBeatProtocol(songId, songEntry) {
  const htmlPath = path.join(process.cwd(), 'beat-protocol.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ beat-protocol.html not found!');
    return false;
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Check if song already exists
  if (html.includes(`'${songId}':`)) {
    console.log(`⚠️  Song '${songId}' already exists in beat-protocol.html`);
    console.log('   Skipping auto-patch. Remove the existing entry first to re-add.');
    return false;
  }

  // Find the closing of the SONGS object and insert before it
  // The SONGS object ends with `};` after the last song entry
  // We look for the pattern of the last song entry's closing `}` followed by `};`
  const songsEndPattern = /(\n\s*}\n\s*};)/;
  const match = html.match(songsEndPattern);
  
  if (!match) {
    // Try alternative: find `const SONG_KEYS` which comes right after SONGS
    const altPattern = /(}\s*\n};?\s*\n\s*const SONG_KEYS)/;
    const altMatch = html.match(altPattern);
    
    if (altMatch) {
      const insertPoint = html.indexOf(altMatch[0]);
      const replacement = `},\n${songEntry}\n};\n\nconst SONG_KEYS`;
      html = html.substring(0, insertPoint) + replacement + html.substring(insertPoint + altMatch[0].length);
    } else {
      console.error('❌ Could not find insertion point in beat-protocol.html');
      console.error('   You may need to manually add the song entry.');
      console.log('\n📋 Song entry to add to SONGS object:');
      console.log(songEntry);
      return false;
    }
  } else {
    // Insert new song before the closing `};`
    const insertPoint = html.indexOf(match[0]);
    const replacement = `},\n${songEntry}\n  };`;
    // Replace the `}\n};` with `},\n<new entry>\n};`
    html = html.substring(0, insertPoint) + replacement + html.substring(insertPoint + match[0].length);
  }

  // Now add the beatmap loader function if it doesn't exist
  if (!html.includes('loadBeatmapFromJSON')) {
    // Find the line after `generateMoonlightNotes();` or similar to insert the loader
    const loaderCode = `
// ============================================================
// Beatmap JSON Loader
// ============================================================
async function loadBeatmapFromJSON(songKey) {
  const song = SONGS[songKey];
  if (!song.beatmapPath) return false;
  
  try {
    const response = await fetch(song.beatmapPath);
    if (!response.ok) return false;
    
    const beatmap = await response.json();
    song.notes = beatmap.notes.map(n => ({
      time: n.time,
      lane: n.lane,
      hitP1: false,
      hitP2: false,
      missedP1: false,
      missedP2: false
    }));
    
    // Update song metadata from beatmap if available
    if (beatmap.bpm) song.bpm = beatmap.bpm;
    if (beatmap.duration) song.duration = beatmap.duration;
    
    console.log(\`Loaded beatmap for \${song.title}: \${song.notes.length} notes\`);
    return true;
  } catch (err) {
    console.warn(\`Could not load beatmap for \${song.title}:\`, err);
    return false;
  }
}

// Load beatmaps for songs that have them
async function loadAllBeatmaps() {
  for (const key of SONG_KEYS) {
    if (SONGS[key].beatmapPath) {
      await loadBeatmapFromJSON(key);
    }
  }
}

loadAllBeatmaps();
`;

    // Insert after the last generate*Notes() call
    const generatePattern = /generate\w+Notes\(\);\s*\n/g;
    let lastMatch;
    let tempMatch;
    while ((tempMatch = generatePattern.exec(html)) !== null) {
      lastMatch = tempMatch;
    }

    if (lastMatch) {
      const insertAfter = lastMatch.index + lastMatch[0].length;
      html = html.substring(0, insertAfter) + loaderCode + html.substring(insertAfter);
    } else {
      // Fallback: insert before `let gameState`
      const fallbackPattern = /let gameState/;
      const fallbackMatch = html.match(fallbackPattern);
      if (fallbackMatch) {
        const insertPoint = html.indexOf(fallbackMatch[0]);
        html = html.substring(0, insertPoint) + loaderCode + '\n' + html.substring(insertPoint);
      }
    }
  }

  fs.writeFileSync(htmlPath, html);
  console.log('✅ beat-protocol.html patched successfully!');
  return true;
}

// ============================================================
// Main Pipeline
// ============================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name || !args.artist || !args.youtube) {
    printUsage();
    process.exit(1);
  }

  if (!args.musescore && !args.midi && !args.musicxml) {
    console.error('❌ Please provide a sheet music source: --musescore, --midi, or --musicxml');
    printUsage();
    process.exit(1);
  }

  const songId = slugify(args.name);
  const difficulty = args.difficulty || 'Medium';
  const songDir = path.join(process.cwd(), 'assets', 'songs', songId);

  console.log('🎮 Beat Protocol — Add Song Pipeline');
  console.log('═'.repeat(50));
  console.log(`\n📝 Song: ${args.name}`);
  console.log(`🎤 Artist: ${args.artist}`);
  console.log(`🎯 Difficulty: ${difficulty}`);
  console.log(`🆔 Song ID: ${songId}`);
  console.log(`📂 Directory: ${songDir}\n`);

  if (args.dryRun) {
    console.log('🔍 DRY RUN — showing what would be done:\n');
    console.log(`  1. Download video from: ${args.youtube}`);
    console.log(`     → ${songDir}/video.mp4`);
    console.log(`  2. Download sheet music from: ${args.musescore || args.midi || args.musicxml}`);
    console.log(`     → ${songDir}/source.mid`);
    console.log(`  3. Convert MIDI to beatmap`);
    console.log(`     → ${songDir}/beatmap.json`);
    console.log(`  4. Patch beat-protocol.html with new song entry`);
    return;
  }

  // ── Step 1: Download Video ──────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('STEP 1/4: Download Music Video');
  console.log('─'.repeat(50) + '\n');

  let videoDuration = null;

  if (args.skipVideo) {
    console.log('⏭️  Skipping video download (--skip-video)');
    const videoPath = path.join(songDir, 'video.mp4');
    if (fs.existsSync(videoPath)) {
      videoDuration = getVideoDuration(videoPath);
    }
  } else {
    try {
      const result = await downloadVideo(args.youtube, songId);
      videoDuration = result.duration;
    } catch (err) {
      console.error(`❌ Video download failed: ${err.message}`);
      console.error('   You can retry with --skip-video if you download manually.');
      process.exit(1);
    }
  }

  // ── Step 2: Download Sheet Music ────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('STEP 2/4: Download Sheet Music');
  console.log('─'.repeat(50) + '\n');

  let sheetResult;

  if (args.midi) {
    sheetResult = copyLocalFile(args.midi, songId);
  } else if (args.musicxml) {
    sheetResult = copyLocalFile(args.musicxml, songId);
  } else if (args.musescore) {
    try {
      sheetResult = await downloadFromMuseScore(args.musescore, songId);
    } catch (err) {
      console.error(`\n❌ MuseScore download failed: ${err.message}`);
      console.error('   Try downloading the MIDI manually and use --midi flag instead.');
      process.exit(1);
    }
  }

  // ── Step 3: Convert to Beatmap ──────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('STEP 3/4: Convert to Beatmap');
  console.log('─'.repeat(50) + '\n');

  const midiPath = path.join(songDir, 'source.mid');
  const musicxmlPath = path.join(songDir, 'source.musicxml');
  
  let sourceFile;
  if (fs.existsSync(midiPath)) {
    sourceFile = midiPath;
  } else if (fs.existsSync(musicxmlPath)) {
    console.error('❌ MusicXML conversion is not yet supported.');
    console.error('   Please convert to MIDI first using MuseScore desktop app.');
    console.error('   File → Export → MIDI');
    process.exit(1);
  } else {
    console.error('❌ No MIDI or MusicXML file found in song directory!');
    process.exit(1);
  }

  const beatmap = convertMidiToBeatmap(sourceFile, {
    difficulty,
    offset: args.offset || 0,
    trackFilter: args.track || 'all',
    adaptiveLanes: args.adaptive || false
  });

  // Save beatmap
  const beatmapPath = path.join(songDir, 'beatmap.json');
  fs.writeFileSync(beatmapPath, JSON.stringify(beatmap, null, 2));
  console.log(`\n✅ Beatmap saved to: ${beatmapPath}`);

  // ── Step 4: Patch beat-protocol.html ────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log('STEP 4/4: Patch beat-protocol.html');
  console.log('─'.repeat(50) + '\n');

  if (args.skipPatch) {
    console.log('⏭️  Skipping auto-patch (--skip-patch)');
  } else {
    const songConfig = {
      name: args.name,
      artist: args.artist,
      bpm: beatmap.bpm,
      duration: videoDuration || beatmap.duration,
      difficulty,
      videoPath: `assets/songs/${songId}/video.mp4`,
      notes: beatmap.notes
    };

    const songEntry = generateSongEntry(songId, songConfig);
    
    console.log('📋 Song entry to add:');
    console.log(songEntry);
    console.log('');

    patchBeatProtocol(songId, songEntry);
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 SONG ADDED SUCCESSFULLY!');
  console.log('═'.repeat(50));
  console.log(`\n  🎵 ${args.name} — ${args.artist}`);
  console.log(`  🆔 ID: ${songId}`);
  console.log(`  🎯 Difficulty: ${difficulty}`);
  console.log(`  🎼 Notes: ${beatmap.totalNotes}`);
  console.log(`  ⏱️  BPM: ${beatmap.bpm}`);
  console.log(`  📂 Assets: assets/songs/${songId}/`);
  console.log(`     ├── video.mp4`);
  console.log(`     ├── source.mid`);
  console.log(`     └── beatmap.json`);
  console.log(`\n  Open beat-protocol.html to test the new song!`);
}

main().catch(err => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
