#!/usr/bin/env node
/**
 * download-musescore.js — Download sheet music from MuseScore for Beat Protocol
 * 
 * Uses dl-librescore (npx) to download MIDI files from musescore.com URLs.
 * Also supports local MusicXML/MIDI file paths as input.
 * 
 * Usage:
 *   node tools/download-musescore.js --url "https://musescore.com/user/.../scores/..." --id "song-id"
 *   node tools/download-musescore.js --file "./local-file.mid" --id "song-id"
 * 
 * Prerequisites:
 *   - Node.js (for npx dl-librescore)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      parsed.url = args[i + 1];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      parsed.file = args[i + 1];
      i++;
    } else if (args[i] === '--id' && args[i + 1]) {
      parsed.id = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      parsed.format = args[i + 1].toLowerCase();
      i++;
    }
  }
  return parsed;
}

function ensureOutputDir(songId) {
  const outputDir = path.join(process.cwd(), 'assets', 'songs', songId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }
  return outputDir;
}

/**
 * Download MIDI from MuseScore using dl-librescore CLI.
 * dl-librescore is an interactive CLI, so we use spawn with stdin piping.
 */
async function downloadFromMuseScore(url, songId) {
  console.log('🎵 Beat Protocol — MuseScore Downloader');
  console.log('═'.repeat(50));
  console.log(`\n📥 Source: ${url}`);
  console.log(`🎯 Target: assets/songs/${songId}/\n`);

  const outputDir = ensureOutputDir(songId);
  const midiPath = path.join(outputDir, 'source.mid');

  // Check if MIDI already exists
  if (fs.existsSync(midiPath)) {
    console.log(`⚠️  MIDI file already exists at: ${midiPath}`);
    console.log('   Delete it first if you want to re-download.');
    return { path: midiPath, format: 'midi' };
  }

  console.log('📦 Using dl-librescore to download MIDI...');
  console.log('   (This uses npx — may take a moment on first run)\n');

  // dl-librescore is interactive. We'll try using it with the URL.
  // The CLI prompts for: URL, then format selection.
  // We'll attempt to automate this via stdin.
  
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['dl-librescore@latest'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: outputDir
    });

    let stdout = '';
    let stderr = '';
    let step = 0;
    let resolved = false;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);

      // dl-librescore prompts:
      // 1. "Please enter the URL" -> send URL
      // 2. "Select download format" -> select MIDI
      // We detect prompts and respond accordingly
      
      if (text.includes('URL') && step === 0) {
        step = 1;
        setTimeout(() => {
          proc.stdin.write(url + '\n');
        }, 500);
      }
      
      // Look for format selection - MIDI is typically option 1 or we type "midi"
      if ((text.includes('MIDI') || text.includes('midi') || text.includes('format')) && step === 1) {
        step = 2;
        setTimeout(() => {
          // Try sending "1" for MIDI selection, or "midi"
          proc.stdin.write('1\n');
        }, 500);
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data.toString());
    });

    proc.on('close', (code) => {
      if (resolved) return;
      resolved = true;

      // Check if any .mid files were downloaded in the output directory
      const midFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.mid') || f.endsWith('.midi'));
      
      if (midFiles.length > 0) {
        // Rename the first .mid file to source.mid
        const downloadedMid = path.join(outputDir, midFiles[0]);
        if (downloadedMid !== midiPath) {
          fs.renameSync(downloadedMid, midiPath);
        }
        console.log(`\n✅ MIDI downloaded successfully!`);
        console.log(`   📁 Path: ${midiPath}`);
        resolve({ path: midiPath, format: 'midi' });
      } else {
        console.error('\n⚠️  dl-librescore did not produce a MIDI file.');
        console.error('   This can happen if the score is official/protected.');
        console.error('');
        console.error('   FALLBACK OPTIONS:');
        console.error('   1. Manually download the MIDI from musescore.com');
        console.error('   2. Open the score in MuseScore desktop app and export as MIDI');
        console.error('   3. Use a local MIDI file with: --file "./path/to/file.mid"');
        console.error('');
        console.error(`   Then place it at: ${midiPath}`);
        reject(new Error('MIDI download failed'));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        console.error('\n⚠️  dl-librescore timed out after 60 seconds.');
        console.error('   Try downloading manually instead.');
        reject(new Error('Download timed out'));
      }
    }, 60000);
  });
}

/**
 * Copy a local MIDI or MusicXML file to the song directory.
 */
function copyLocalFile(filePath, songId) {
  console.log('🎵 Beat Protocol — Local Sheet Music Import');
  console.log('═'.repeat(50));

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  const outputDir = ensureOutputDir(songId);
  let destName;

  if (ext === '.mid' || ext === '.midi') {
    destName = 'source.mid';
  } else if (ext === '.musicxml' || ext === '.mxl' || ext === '.xml') {
    destName = 'source.musicxml';
  } else {
    console.error(`❌ Unsupported file format: ${ext}`);
    console.error('   Supported formats: .mid, .midi, .musicxml, .mxl, .xml');
    process.exit(1);
  }

  const destPath = path.join(outputDir, destName);
  fs.copyFileSync(filePath, destPath);
  
  const format = ext === '.mid' || ext === '.midi' ? 'midi' : 'musicxml';
  console.log(`✅ File copied successfully!`);
  console.log(`   📁 Source: ${filePath}`);
  console.log(`   📁 Destination: ${destPath}`);
  console.log(`   🎼 Format: ${format}`);

  return { path: destPath, format };
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.id) {
    console.log('Usage:');
    console.log('  node tools/download-musescore.js --url "<musescore-url>" --id "<song-id>"');
    console.log('  node tools/download-musescore.js --file "<local-file>" --id "<song-id>"');
    console.log('');
    console.log('Examples:');
    console.log('  node tools/download-musescore.js --url "https://musescore.com/user/123/scores/456" --id "bad-apple"');
    console.log('  node tools/download-musescore.js --file "./my-song.mid" --id "my-song"');
    process.exit(1);
  }

  if (args.file) {
    copyLocalFile(args.file, args.id);
  } else if (args.url) {
    downloadFromMuseScore(args.url, args.id).catch((err) => {
      console.error(`\n❌ Error: ${err.message}`);
      process.exit(1);
    });
  } else {
    console.error('❌ Please provide either --url or --file');
    process.exit(1);
  }
}

module.exports = { downloadFromMuseScore, copyLocalFile };
