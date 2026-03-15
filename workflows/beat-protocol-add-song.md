---
description: "Add a new song to Beat Protocol — downloads music video from YouTube, imports sheet music from MuseScore, generates a beatmap, and auto-patches the game."
author: "Proto7ype Arcade"
version: "2.0"
category: "Game Development"
tags: ["beat-protocol", "rhythm-game", "beatmap", "youtube", "musescore", "midi", "workflow"]
globs: ["beat-protocol.html", "assets/songs/**", "tools/**"]
---

# Beat Protocol — Add New Song Workflow

**Objective:** Guide the AI through the complete process of adding a new song to Beat Protocol, from downloading assets to integrating the song into the game.

---

## ⚠️ Critical Rules (Read First!)

These rules exist because of bugs discovered during testing. **Do not skip them.**

1. **Notes MUST be inlined in the HTML.** The `add-song.js` tool now inlines beatmap notes directly into the SONGS object. This is required because the game is opened via `file://` protocol where `fetch()` cannot load JSON files. Never rely on `beatmapPath` + `loadBeatmapFromJSON()` as the sole source of notes — always inline them.

2. **Always verify note count > 0 after beatmap conversion.** The `midi-to-beatmap.js` difficulty filter can silently produce 0 notes if there's a property name mismatch or the MIDI has unusual timing. If you see `After difficulty filter: 0`, the beatmap is broken — debug before proceeding.

3. **Always run the E2E test suite after adding a song.** Run `node testing/beat-protocol-test.js` to verify the full pipeline works end-to-end, including browser gameplay.

4. **The `dl-librescore` tool is unreliable.** It frequently times out or gets stuck at interactive prompts. Have a fallback plan: use `tools/generate-midi.js` to create a synthetic MIDI, or ask the user to provide a local MIDI file.

---

## Prerequisites Check

Before starting, verify these tools are available:

1. **yt-dlp** — for downloading YouTube videos
   - Check: `yt-dlp --version`
   - Install: `pip install yt-dlp`
2. **ffmpeg** — for video processing and duration detection
   - Check: `ffmpeg -version`
   - Install: `choco install ffmpeg` (Windows) or `brew install ffmpeg` (macOS)
3. **Node.js 16+** — for running the pipeline scripts
   - Check: `node --version`
4. **Puppeteer** — for E2E testing (installed via npm)
   - Check: `npm ls puppeteer`
   - Install: `npm install`
5. **dl-librescore** (optional, for MuseScore downloads) — runs via npx, no install needed

Run prerequisite checks:
```bash
yt-dlp --version && ffmpeg -version && node --version && npm ls puppeteer
```

If any tool is missing, inform the user and provide installation instructions before proceeding.

---

## Workflow

### Step 1: Gather Song Information

Ask the user for the following information:

1. **Song name** — The display title (e.g., "Bad Apple!!")
2. **Artist** — The artist or source (e.g., "Touhou (Arcade Remix)")
3. **Difficulty** — Easy, Medium, or Hard
4. **YouTube URL** — Link to the music video on YouTube
5. **Sheet music source** — One of:
   - A MuseScore URL (e.g., `https://musescore.com/user/.../scores/...`)
   - A local MIDI file path
   - A local MusicXML file path

Example prompt to user:
> To add a new song to Beat Protocol, I need:
> 1. Song name
> 2. Artist name
> 3. Difficulty level (Easy/Medium/Hard)
> 4. YouTube URL for the music video
> 5. MuseScore URL or local MIDI/MusicXML file path

### Step 2: Validate Inputs

- Verify the YouTube URL looks valid (contains `youtube.com/watch` or `youtu.be/`)
- Verify the MuseScore URL looks valid (contains `musescore.com`) or the local file exists
- Generate the song ID by slugifying the song name (lowercase, hyphens for spaces/special chars)
- Check that the song ID doesn't already exist in `beat-protocol.html`

```bash
# Check if song already exists
grep -c "'<song-id>':" beat-protocol.html
```

### Step 3: Download Music Video

Use the video download tool to fetch the music video from YouTube at 720p:

```bash
node tools/download-video.js --url "<youtube-url>" --id "<song-id>"
```

This will:
- Download the video as MP4 at 720p resolution
- Save to `assets/songs/<song-id>/video.mp4`
- Report the video duration in milliseconds

**If download fails:**
- Check that yt-dlp is installed and up to date (`pip install -U yt-dlp`)
- Check that the YouTube URL is valid and the video is accessible
- Try downloading manually and placing the file at `assets/songs/<song-id>/video.mp4`

### Step 4: Download/Create Sheet Music

#### Option A: From MuseScore URL

```bash
node tools/download-musescore.js --url "<musescore-url>" --id "<song-id>"
```

This uses `dl-librescore` via npx to download a MIDI file. The tool is interactive, so it may require manual intervention.

**⚠️ dl-librescore is unreliable.** It frequently times out (60s timeout) or gets stuck at interactive prompts. If it fails, use Option B or C instead.

#### Option B: From Local File

```bash
node tools/download-musescore.js --file "<path-to-file>" --id "<song-id>"
```

Supported formats: `.mid`, `.midi`, `.musicxml`, `.mxl`, `.xml`

#### Option C: Generate Synthetic MIDI (for testing or when no MIDI is available)

```bash
node tools/generate-midi.js --id "<song-id>" --bpm <bpm> --duration <seconds>
```

This creates a synthetic MIDI file with proper song structure (intro/verse/chorus/bridge/outro) across all 6 pitch ranges. Useful for:
- Testing the pipeline without a real MIDI source
- Prototyping new songs before getting real sheet music
- Fallback when MuseScore download fails

### Step 5: Convert to Beatmap

Convert the MIDI file to a Beat Protocol beatmap:

```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>"
```

**Optional flags:**
- `--offset <ms>` — Add a start offset to sync with the video (default: 0)
- `--track <number|all>` — Use a specific MIDI track or all tracks (default: all)
- `--adaptive` — Use adaptive lane mapping based on the song's pitch range
- `--preview` — Preview the first 20 notes without saving

**⚠️ ALWAYS preview first to verify notes are generated:**
```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>" --preview
```

**Check the preview output for these critical items:**
- **Note count > 0** — If `After difficulty filter: 0`, the beatmap is broken! Try a different difficulty or check the MIDI file.
- Are notes distributed across multiple lanes? (If all notes are in 1-2 lanes, try `--adaptive`)
- Is the note density appropriate for the difficulty?
- Does the timing look reasonable?

If the lane distribution is unbalanced, try:
```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>" --adaptive
```

### Step 6: Run the Full Pipeline (Recommended)

The orchestrator script handles all steps and **inlines notes directly into the HTML**:

```bash
node tools/add-song.js \
  --name "<song-name>" \
  --artist "<artist>" \
  --difficulty "<difficulty>" \
  --youtube "<youtube-url>" \
  --musescore "<musescore-url>"
```

Or with a local MIDI file:

```bash
node tools/add-song.js \
  --name "<song-name>" \
  --artist "<artist>" \
  --difficulty "<difficulty>" \
  --youtube "<youtube-url>" \
  --midi "<path-to-midi>"
```

Or with `--skip-video` if the video was already downloaded:

```bash
node tools/add-song.js \
  --name "<song-name>" \
  --artist "<artist>" \
  --difficulty "<difficulty>" \
  --youtube "<youtube-url>" \
  --midi "assets/songs/<song-id>/source.mid" \
  --skip-video
```

**What the orchestrator does:**
1. Downloads the video from YouTube (or skips with `--skip-video`)
2. Copies/downloads the MIDI file
3. Converts MIDI to beatmap JSON
4. **Inlines the beatmap notes directly into the SONGS object in beat-protocol.html** (so the game works via file:// protocol)
5. Also saves the beatmap as `beatmap.json` for reference and the `loadBeatmapFromJSON` fallback

#### Manual Patching (if auto-patching fails)

If auto-patching fails, manually add the song to `beat-protocol.html`:

1. Find the `SONGS` object in the `<script>` section
2. Add a new entry before the closing `};`
3. **⚠️ IMPORTANT: Include the notes inline, not as an empty array!**

```javascript
'<song-id>': {
  title: '<Song Name>',
  artist: '<Artist>',
  bpm: <bpm-from-beatmap>,
  duration: <duration-in-ms>,
  difficulty: '<Easy|Medium|Hard>',
  videoPath: 'assets/songs/<song-id>/video.mp4',
  beatmapPath: 'assets/songs/<song-id>/beatmap.json',
  notes: [/* PASTE NOTES FROM beatmap.json HERE — do NOT leave as [] */]
}
```

To get the inline notes from the beatmap:
```bash
node -e "const b=require('./assets/songs/<song-id>/beatmap.json'); const n=b.notes.map(n=>({time:n.time,lane:n.lane,hitP1:false,hitP2:false,missedP1:false,missedP2:false})); console.log(JSON.stringify(n));"
```

### Step 7: Run E2E Tests

**⚠️ This step is mandatory. Do not skip it.**

```bash
node testing/beat-protocol-test.js
```

This runs 64 tests across 4 phases:
1. **File Validation** — Checks all song assets exist and are valid
2. **HTML Patching** — Verifies the song entry, notes, and existing songs
3. **MIDI Parser** — Tests beatmap conversion at all difficulty levels
4. **Browser E2E** — Loads the game in a headless browser, navigates to the song, starts gameplay, and uses an AI player to verify notes can be hit and scoring works

**Expected output:** `🎉 ALL TESTS PASSED!`

If tests fail, check the failure messages and fix before proceeding.

**Optional test flags:**
```bash
# Watch the test in a visible browser window
HEADLESS=false node testing/beat-protocol-test.js

# Save screenshots at key points
SCREENSHOT=true node testing/beat-protocol-test.js
```

### Step 8: Manual Verification

After tests pass, do a quick manual check:

1. **Check file structure:**
   ```
   assets/songs/<song-id>/
   ├── video.mp4        (music video)
   ├── source.mid       (MIDI source file)
   └── beatmap.json     (generated beatmap)
   ```

2. **Test in browser:**
   - Open `beat-protocol.html` directly in a browser (file:// protocol should work now)
   - Navigate to the new song using arrow keys or gamepad
   - Verify the song card shows correct metadata (title, artist, BPM, difficulty)
   - Start the game and verify:
     - Video plays
     - Notes appear and scroll down
     - Notes are distributed across lanes
     - Timing feels reasonable

   If notes don't appear, check:
   - Are notes inlined in the SONGS object? (not `notes: []`)
   - Open browser console — any errors?
   - If using file:// protocol, `fetch()` won't work — notes MUST be inlined

---

## Troubleshooting

### Notes don't appear / beatmap is empty
- **Most common cause:** Notes were set to `[]` and `fetch()` failed on file:// protocol
- **Fix:** Re-run `add-song.js` which now inlines notes, or manually inline them:
  ```bash
  node -e "const fs=require('fs'); let html=fs.readFileSync('beat-protocol.html','utf8'); const b=JSON.parse(fs.readFileSync('assets/songs/<id>/beatmap.json','utf8')); const n=b.notes.map(n=>({time:n.time,lane:n.lane,hitP1:false,hitP2:false,missedP1:false,missedP2:false})); html=html.replace(\"beatmapPath: 'assets/songs/<id>/beatmap.json',\\n    notes: []\", \"beatmapPath: 'assets/songs/<id>/beatmap.json',\\n    notes: \"+JSON.stringify(n)); fs.writeFileSync('beat-protocol.html',html); console.log('Patched:',n.length,'notes');"
  ```

### Difficulty filter produces 0 notes
- The `filterByDifficulty()` function uses time-based gap filtering
- If your MIDI has very sparse notes (>300ms gaps), even Easy mode should work
- If you get 0 notes, check that the MIDI has actual noteOn events:
  ```bash
  node tools/midi-to-beatmap.js --file "assets/songs/<id>/source.mid" --id "<id>" --difficulty "Hard" --preview
  ```
- Try Hard difficulty first (smallest gap filter: 80ms)

### Video won't play
- Ensure the video is in MP4 format with H.264 codec
- Check browser console for errors
- Try re-downloading with: `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]" --merge-output-format mp4`

### Notes are all in one lane
- The MIDI file may have a narrow pitch range
- Try `--adaptive` flag for adaptive lane mapping
- Try specifying a specific track with `--track <number>`

### Notes don't sync with music
- Adjust the `--offset` parameter (positive = notes come later, negative = earlier)
- Common offsets: 500-3000ms depending on the video intro
- You can also adjust `latencyOffset` in the game code

### Beatmap has too many/few notes
- Change difficulty: Easy (sparse), Medium (balanced), Hard (dense)
- For very dense MIDI files, Easy difficulty aggressively filters notes
- For sparse MIDI files, Hard difficulty keeps more notes

### MuseScore download fails / times out
- `dl-librescore` is unreliable — it frequently times out or gets stuck
- **Fallback 1:** Ask the user to manually download the MIDI from musescore.com
- **Fallback 2:** Use MuseScore desktop app to export as MIDI (File → Export → MIDI)
- **Fallback 3:** Generate a synthetic MIDI: `node tools/generate-midi.js --id "<id>" --bpm <bpm> --duration <seconds>`
- Then use the local file option: `--midi "<path-to-midi>"`

---

## File Reference

| File | Purpose |
|------|---------|
| `tools/add-song.js` | Orchestrator — runs the full pipeline, **inlines notes into HTML** |
| `tools/download-video.js` | Downloads YouTube videos via yt-dlp |
| `tools/download-musescore.js` | Downloads MIDI from MuseScore via dl-librescore |
| `tools/midi-to-beatmap.js` | Converts MIDI to beatmap JSON (with difficulty filtering) |
| `tools/generate-midi.js` | Generates synthetic MIDI files for testing |
| `testing/beat-protocol-test.js` | E2E test suite (64 tests across 4 phases) |
| `testing/beat-protocol-ai.js` | AI player for automated gameplay testing |
| `testing/gamepad-simulator.js` | Gamepad simulator for browser testing |
| `beat-protocol.html` | The game — contains SONGS object with **inlined notes** |
| `assets/songs/<id>/video.mp4` | Music video file |
| `assets/songs/<id>/source.mid` | Source MIDI file |
| `assets/songs/<id>/beatmap.json` | Generated beatmap (also used as backup for HTTP serving) |

---

## Quick Reference: Full Pipeline Command

```bash
# Full pipeline with MuseScore
node tools/add-song.js \
  --name "Song Title" \
  --artist "Artist Name" \
  --difficulty "Medium" \
  --youtube "https://youtube.com/watch?v=XXXXXXXXXXX" \
  --musescore "https://musescore.com/user/XXXXX/scores/XXXXXXX"

# Full pipeline with local MIDI
node tools/add-song.js \
  --name "Song Title" \
  --artist "Artist Name" \
  --difficulty "Medium" \
  --youtube "https://youtube.com/watch?v=XXXXXXXXXXX" \
  --midi "./path/to/file.mid"

# With synthetic MIDI (when no real MIDI available)
node tools/generate-midi.js --id "song-title" --bpm 120 --duration 180
node tools/add-song.js \
  --name "Song Title" \
  --artist "Artist Name" \
  --difficulty "Medium" \
  --youtube "https://youtube.com/watch?v=XXXXXXXXXXX" \
  --midi "assets/songs/song-title/source.mid" \
  --skip-video

# Dry run (preview without executing)
node tools/add-song.js \
  --name "Song Title" \
  --artist "Artist Name" \
  --difficulty "Medium" \
  --youtube "https://youtube.com/watch?v=XXXXXXXXXXX" \
  --midi "./path/to/file.mid" \
  --dry-run

# ALWAYS run tests after adding a song!
node testing/beat-protocol-test.js
```

---

## Known Issues & Lessons Learned

### Bug: `filterByDifficulty()` property name mismatch (Fixed v2.0)
- **Symptom:** Beatmap conversion shows `After difficulty filter: 0` — all notes silently removed
- **Root cause:** `filterByDifficulty()` accessed `note.timeMs` but received objects with `note.time`
- **Fix:** Added `getTime()` helper that supports both property names
- **Prevention:** The E2E test suite now validates note counts at each difficulty level

### Bug: Notes not visible when opening via file:// (Fixed v2.0)
- **Symptom:** Song appears in menu but no notes scroll during gameplay
- **Root cause:** `add-song.js` was inserting `notes: []` and relying on `fetch()` to load beatmap.json at runtime, which fails on `file://` protocol due to CORS
- **Fix:** `add-song.js` now inlines all notes directly into the SONGS object
- **Prevention:** The E2E test suite validates notes are present in the SONGS object

### Issue: dl-librescore frequently times out
- **Symptom:** MuseScore download hangs for 60s then fails
- **Workaround:** Use `tools/generate-midi.js` for synthetic MIDI, or ask user for local MIDI file
