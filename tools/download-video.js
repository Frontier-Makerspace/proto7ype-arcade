#!/usr/bin/env node
/**
 * download-video.js — Download a music video from YouTube for Beat Protocol
 * 
 * Usage:
 *   node tools/download-video.js --url "https://youtube.com/watch?v=..." --id "song-id"
 * 
 * Prerequisites:
 *   - yt-dlp: pip install yt-dlp
 *   - ffmpeg: choco install ffmpeg (Windows) or brew install ffmpeg (macOS)
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      parsed.url = args[i + 1];
      i++;
    } else if (args[i] === '--id' && args[i + 1]) {
      parsed.id = args[i + 1];
      i++;
    }
  }
  return parsed;
}

function checkYtDlp() {
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getVideoDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { stdio: 'pipe', encoding: 'utf-8' }
    );
    return Math.round(parseFloat(result.trim()) * 1000); // Convert to milliseconds
  } catch {
    console.warn('⚠️  Could not determine video duration via ffprobe');
    return null;
  }
}

async function downloadVideo(url, songId) {
  console.log('🎬 Beat Protocol — Video Downloader');
  console.log('═'.repeat(50));

  // Check prerequisites
  if (!checkYtDlp()) {
    console.error('❌ yt-dlp is not installed!');
    console.error('   Install it with: pip install yt-dlp');
    console.error('   Or download from: https://github.com/yt-dlp/yt-dlp/releases');
    process.exit(1);
  }

  if (!checkFfmpeg()) {
    console.warn('⚠️  ffmpeg not found — video merging may not work properly');
    console.warn('   Install it with: choco install ffmpeg (Windows)');
    console.warn('   Or download from: https://ffmpeg.org/download.html');
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'assets', 'songs', songId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }

  const outputPath = path.join(outputDir, 'video.mp4');

  // Check if video already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⚠️  Video already exists at: ${outputPath}`);
    console.log('   Delete it first if you want to re-download.');
    return { path: outputPath, duration: getVideoDuration(outputPath) };
  }

  console.log(`\n📥 Downloading video from: ${url}`);
  console.log(`📂 Output: ${outputPath}`);
  console.log(`🎯 Quality: 720p (optimal for 900×600 game canvas)\n`);

  // Build yt-dlp command
  // Format: best video up to 720p + best audio, merged into mp4
  const command = [
    'yt-dlp',
    '-f', '"bestvideo[height<=720]+bestaudio/best[height<=720]"',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-warnings',
    '--progress',
    '-o', `"${outputPath}"`,
    `"${url}"`
  ].join(' ');

  try {
    console.log(`🔧 Running: ${command}\n`);
    execSync(command, { stdio: 'inherit', shell: true });
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      const duration = getVideoDuration(outputPath);
      
      console.log(`\n✅ Video downloaded successfully!`);
      console.log(`   📁 Path: ${outputPath}`);
      console.log(`   📦 Size: ${sizeMB} MB`);
      if (duration) {
        const mins = Math.floor(duration / 60000);
        const secs = Math.floor((duration % 60000) / 1000);
        console.log(`   ⏱️  Duration: ${mins}:${String(secs).padStart(2, '0')} (${duration}ms)`);
      }
      
      return { path: outputPath, duration };
    } else {
      console.error('❌ Download appeared to succeed but file not found');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Download failed: ${error.message}`);
    console.error('   Check that the URL is valid and accessible.');
    process.exit(1);
  }
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.url || !args.id) {
    console.log('Usage: node tools/download-video.js --url "<youtube-url>" --id "<song-id>"');
    console.log('');
    console.log('Example:');
    console.log('  node tools/download-video.js --url "https://youtube.com/watch?v=9lNZ_Rnr7Jc" --id "bad-apple"');
    process.exit(1);
  }
  
  downloadVideo(args.url, args.id);
}

module.exports = { downloadVideo, getVideoDuration };
