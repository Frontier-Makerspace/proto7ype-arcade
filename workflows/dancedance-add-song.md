---
description: "Add a new song to Dance Dance Hero — downloads music video from YouTube, imports sheet music, generates a 6-lane beatmap, and auto-patches the game."
author: "Proto7ype Arcade"
version: "1.0"
category: "Game Development"
tags: ["dancedance", "rhythm-game", "beatmap", "youtube", "musescore", "midi", "workflow", "dance", "6-lane"]
globs: ["dancedance/game.js", "assets/songs/**", "tools/**"]
---

# Dance Dance Hero — Add New Song Workflow

**Objective:** Guide the AI through the complete process of adding a new song to Dance Dance Hero (the 6-lane body-tracking dance game), from downloading assets to integrating the song into the game.

> This workflow is adapted from the Beat Protocol add-song workflow. Dance Dance Hero uses the same 6-lane beatmap format (lanes 0-5) and reuses the same pipeline tools.

---

## ⚠️ Critical Rules (Read First!)

1. **Notes MUST be inlined in game.js.** The game is opened via `file://` protocol where `fetch()` cannot load JSON files. Always inline notes directly into the SONGS object in `dancedance/game.js`.

2. **Always verify note count > 0 after beatmap conversion.** If you see `After difficulty filter: 0`, the beatmap is broken — debug before proceeding.

3. **Lane range is 0-5.** Dance Dance Hero uses 6 lanes matching Beat Protocol. The `midi-to-beatmap.js` tool already outputs lanes 0-5.

4. **The `dl-librescore` tool is unreliable.** Have a fallback plan: use `tools/generate-midi.js` to create a synthetic MIDI, or ask the user to provide a local MIDI file.

5. **Test the game after adding a song.** Open `dancedance/index.html` in a browser, select the new song, and verify notes appear and are distributed across all 6 lanes.

---

## Prerequisites Check

Before starting, verify these tools are available:

1. **yt-dlp** — for downloading YouTube videos
   - Check: `yt-dlp --version`
   - Install: `pip install yt-dlp`
2. **ffmpeg** — for video processing and duration detection
   - Check: `ffmpeg -version`
3. **Node.js 16+** — for running the pipeline scripts
   - Check: `node --version`

```bash
yt-dlp --version && ffmpeg -version && node --version
```

---

## Workflow

### Step 1: Gather Song Information

Ask the user for:

1. **Song name** — The display title (e.g., "Bad Apple!!")
2. **Artist** — The artist or source (e.g., "Touhou (Arcade Remix)")
3. **Difficulty** — Easy, Medium, or Hard
4. **YouTube URL** — Link to the music video
5. **Sheet music source** — One of:
   - A MuseScore URL
   - A local MIDI file path
   - "generate" to create a synthetic MIDI

### Step 2: Validate Inputs

- Verify the YouTube URL is valid
- Generate the song ID by slugifying the song name
- Check that the song ID doesn't already exist in `dancedance/game.js`

```bash
grep -c "'<song-id>':" dancedance/game.js
```

### Step 3: Download Music Video

```bash
node tools/download-video.js --url "<youtube-url>" --id "<song-id>"
```

This saves to `assets/songs/<song-id>/video.mp4` at 720p.

### Step 4: Download/Create Sheet Music

#### Option A: From MuseScore URL
```bash
node tools/download-musescore.js --url "<musescore-url>" --id "<song-id>"
```

#### Option B: From Local File
```bash
node tools/download-musescore.js --file "<path-to-file>" --id "<song-id>"
```

#### Option C: Generate Synthetic MIDI
```bash
node tools/generate-midi.js --id "<song-id>" --bpm <bpm> --duration <seconds>
```

### Step 5: Convert to Beatmap

**Always preview first:**
```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>" --preview
```

Check:
- Note count > 0
- Notes distributed across multiple lanes (0-5)
- Density appropriate for difficulty

Then generate:
```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>"
```

If lanes are unbalanced, try `--adaptive`:
```bash
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>" --adaptive
```

### Step 6: Patch Dance Dance Hero

Unlike Beat Protocol (single HTML file), Dance Dance Hero uses `dancedance/game.js`. Add the song to the `SONGS` object:

1. Open `dancedance/game.js`
2. Find the `SONGS` object (search for `const SONGS = {`)
3. Add a new entry **with inlined notes**:

```javascript
'<song-id>': {
    title: '<Song Name>',
    artist: '<Artist>',
    bpm: <bpm>,
    duration: <duration-in-ms>,
    difficulty: '<Easy|Medium|Hard>',
    videoPath: 'assets/songs/<song-id>/video.mp4',
    beatmapPath: 'assets/songs/<song-id>/beatmap.json',
    notes: [/* PASTE NOTES FROM beatmap.json HERE */]
},
```

To extract inline notes from the beatmap:
```bash
node -e "const b=require('./assets/songs/<song-id>/beatmap.json'); const n=b.notes.map(n=>({time:n.time,lane:n.lane})); console.log(JSON.stringify(n));"
```

**⚠️ IMPORTANT:** The notes array must NOT be empty. If it's `[]`, the game will fall back to the demo beatmap instead of the song's actual beatmap.

### Step 7: Verify

1. **Check file structure:**
   ```
   assets/songs/<song-id>/
   ├── video.mp4        (music video)
   ├── source.mid       (MIDI source file)
   └── beatmap.json     (generated beatmap)
   ```

2. **Test in browser:**
   - Open `dancedance/index.html` in a browser
   - Select the new song from the song selection screen
   - Verify:
     - Song card shows correct metadata
     - Video plays as background during gameplay
     - Notes appear across all 6 lanes
     - Notes sync with the music
     - Keyboard controls (A/S/D/J/K/L) work
     - Webcam/OBSBOT mode works (if available)

---

## Quick Reference: Full Pipeline

```bash
# Step 1: Download video
node tools/download-video.js --url "<youtube-url>" --id "<song-id>"

# Step 2: Get MIDI (choose one)
node tools/download-musescore.js --url "<musescore-url>" --id "<song-id>"
# OR
node tools/generate-midi.js --id "<song-id>" --bpm <bpm> --duration <seconds>

# Step 3: Preview beatmap
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>" --preview

# Step 4: Generate beatmap
node tools/midi-to-beatmap.js --file "assets/songs/<song-id>/source.mid" --id "<song-id>" --difficulty "<difficulty>"

# Step 5: Patch game.js with inlined notes (manual step — see Step 6 above)

# Step 6: Test in browser
# Open dancedance/index.html
```

---

## Differences from Beat Protocol Workflow

| Aspect | Beat Protocol | Dance Dance Hero |
|--------|--------------|-----------------|
| Game file | `beat-protocol.html` (single file) | `dancedance/game.js` (modular) |
| Input method | Keyboard/Gamepad only | Webcam (OBSBOT) + Keyboard |
| Lanes | 6 (A/S/D/J/K/L) | 6 (same keys + body tracking) |
| Beatmap format | Same `{time, lane}` | Same `{time, lane}` |
| Video playback | `<video>` in HTML | Drawn to canvas |
| Auto-patcher | `tools/add-song.js` | Manual (patch `game.js` SONGS object) |
| E2E tests | `testing/beat-protocol-test.js` | Manual browser testing |

---

## Troubleshooting

### Notes don't appear
- Check that notes are inlined in the SONGS object (not `notes: []`)
- Open browser console for errors
- Verify the song ID matches between SONGS key and the notes

### Video doesn't play
- Ensure video is MP4 with H.264 codec
- Check `videoPath` points to correct location relative to `dancedance/index.html`
- The path should be relative: `../assets/songs/<id>/video.mp4` or `assets/songs/<id>/video.mp4`

### Notes all in one lane
- Try `--adaptive` flag for lane mapping
- Try a different MIDI track with `--track <number>`

### Notes don't sync with music
- Adjust `--offset` parameter (positive = notes come later)
- Common offsets: 500-3000ms depending on video intro

### Webcam/OBSBOT not detecting lanes properly
- Ensure full body is visible in frame
- Disable OBSBOT auto-tracking
- Stand 6-8 feet from camera
- Use keyboard mode as fallback (A/S/D/J/K/L)

---

## File Reference

| File | Purpose |
|------|---------|
| `dancedance/game.js` | Main game — contains SONGS object with inlined notes |
| `dancedance/pose.js` | Pose detection — 6-lane body tracking + keyboard input |
| `dancedance/index.html` | Game HTML — song select, game screen, results |
| `dancedance/style.css` | Game styles |
| `dancedance/ar.js` | AR overlay — bling accessories |
| `tools/download-video.js` | Downloads YouTube videos via yt-dlp |
| `tools/download-musescore.js` | Downloads MIDI from MuseScore |
| `tools/midi-to-beatmap.js` | Converts MIDI to 6-lane beatmap JSON |
| `tools/generate-midi.js` | Generates synthetic MIDI files |
| `assets/songs/<id>/video.mp4` | Music video file |
| `assets/songs/<id>/source.mid` | Source MIDI file |
| `assets/songs/<id>/beatmap.json` | Generated beatmap |
