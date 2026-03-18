// ===== MAIN GAME MODULE =====
// 6-lane dance rhythm game with song system, video playback, and beat protocol workflow
// Supports both webcam (OBSBOT) and keyboard simulation modes

const Game = (() => {
    // DOM elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const videoEl = document.getElementById('webcam');
    const musicVideoEl = document.getElementById('music-video');

    // Screens
    const startScreen = document.getElementById('start-screen');
    const songSelectScreen = document.getElementById('song-select-screen');
    const countdownScreen = document.getElementById('countdown-screen');
    const countdownNumber = document.getElementById('countdown-number');
    const gameScreen = document.getElementById('game-screen');
    const resultsScreen = document.getElementById('results-screen');
    const cameraStatus = document.getElementById('camera-status');
    const controlsHint = document.getElementById('controls-hint');
    const cameraSelectContainer = document.getElementById('camera-select-container');
    const cameraSelect = document.getElementById('camera-select');

    // HUD elements
    const scoreValue = document.getElementById('score-value');
    const comboValue = document.getElementById('combo-value');
    const healthBar = document.getElementById('health-bar');
    const wealthText = document.getElementById('wealth-text');
    const laneIndicator = document.getElementById('lane-indicator');
    const currentLaneEl = document.getElementById('current-lane');
    const hitFeedback = document.getElementById('hit-feedback');
    const songTitle = document.getElementById('song-title-hud');

    // Results elements
    const finalScore = document.getElementById('final-score');
    const finalCombo = document.getElementById('final-combo');
    const finalPerfect = document.getElementById('final-perfect');
    const finalGood = document.getElementById('final-good');
    const finalMiss = document.getElementById('final-miss');
    const finalWealthTitle = document.getElementById('final-wealth-title');

    // Game state
    let state = 'idle'; // idle, song-select, countdown, playing, results
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let health = 100;
    let perfectCount = 0;
    let goodCount = 0;
    let missCount = 0;
    let useSimulation = false;

    // Notes / beat map
    let notes = [];
    let activeNotes = [];
    let nextNoteIndex = 0;
    let songStartTime = 0;
    let songDuration = 0;
    let currentSongId = null;

    // Timing
    let lastFrameTime = 0;

    // Game settings — tuned for dance-friendly gameplay
    const NOTE_SPEED = 300; // pixels per second (slower = more readable)
    const HIT_ZONE_Y_RATIO = 0.82; // where the hit zone is (% from top)
    const PERFECT_WINDOW = 0.25; // seconds (generous for body movement)
    const GOOD_WINDOW = 0.5; // seconds (wide window for dancing)
    const MISS_WINDOW = 0.7; // seconds (forgiving miss threshold)
    const LOOK_AHEAD = 3.0; // seconds to show notes in advance
    const MIN_NOTE_GAP = 0.45; // minimum seconds between notes (thins dense beatmaps)
    const NUM_LANES = 4;

    // 4-Lane configuration (Left / Center-Left / Center-Right / Right)
    const LANE_NAMES = ['left', 'center-left', 'center-right', 'right'];
    const LANE_COLORS = ['#cc3344', '#ff33aa', '#00e673', '#0099ff'];
    const LANE_ARROWS = ['◀', '▽', '△', '▶'];
    const LANE_KEYS = ['A', 'S', 'K', 'L'];

    // Audio context for sound effects
    let audioCtx = null;

    // Hit effect particles
    let hitParticles = [];

    // Simulated person animation
    let simPersonBob = 0;

    // Song selection state
    let selectedSongIndex = 0;

    // ===== SONGS DATABASE =====
    // Songs can be added via the dancedance-add-song workflow
    const SONGS = {
        '1000-blunts': {
            title: '1000 Blunts',
            artist: '$uicideboy$',
            bpm: 133,
            duration: 175000,
            difficulty: 'Hard',
            videoPath: 'assets/songs/1000-blunts/video.mp4',
            beatmapPath: 'assets/songs/1000-blunts/beatmap.json',
            notes: [{"time":1.81,"lane":0},{"time":2.71,"lane":0},{"time":3.61,"lane":0},{"time":4.51,"lane":0},{"time":5.41,"lane":0},{"time":6.32,"lane":0},{"time":7.22,"lane":0},{"time":8.12,"lane":0},{"time":9.02,"lane":0},{"time":9.93,"lane":0},{"time":10.83,"lane":0},{"time":11.73,"lane":0},{"time":12.63,"lane":0},{"time":13.53,"lane":0},{"time":14.44,"lane":0},{"time":15.34,"lane":0},{"time":16.24,"lane":1},{"time":16.69,"lane":2},{"time":17.14,"lane":3},{"time":17.59,"lane":3},{"time":18.05,"lane":1},{"time":18.5,"lane":2},{"time":18.95,"lane":3},{"time":19.4,"lane":3},{"time":19.85,"lane":1},{"time":20.3,"lane":2},{"time":20.75,"lane":3},{"time":21.2,"lane":3},{"time":21.65,"lane":1},{"time":22.11,"lane":2},{"time":22.56,"lane":3},{"time":23.01,"lane":3},{"time":23.46,"lane":1},{"time":23.91,"lane":2},{"time":24.36,"lane":3},{"time":24.81,"lane":3},{"time":25.26,"lane":1},{"time":25.71,"lane":2},{"time":26.17,"lane":3},{"time":26.62,"lane":3},{"time":27.07,"lane":1},{"time":27.52,"lane":2},{"time":27.97,"lane":3},{"time":28.42,"lane":3},{"time":28.87,"lane":1},{"time":29.32,"lane":2},{"time":29.77,"lane":3},{"time":30.23,"lane":3},{"time":30.68,"lane":1},{"time":31.13,"lane":2},{"time":31.58,"lane":3},{"time":32.03,"lane":3},{"time":32.48,"lane":1},{"time":32.93,"lane":2},{"time":33.38,"lane":3},{"time":33.84,"lane":3},{"time":34.29,"lane":1},{"time":34.74,"lane":2},{"time":35.19,"lane":3},{"time":35.64,"lane":3},{"time":36.09,"lane":1},{"time":36.54,"lane":2},{"time":36.99,"lane":3},{"time":37.44,"lane":3},{"time":37.9,"lane":1},{"time":38.35,"lane":2},{"time":38.8,"lane":3},{"time":39.25,"lane":3},{"time":39.7,"lane":1},{"time":40.15,"lane":2},{"time":40.6,"lane":3},{"time":41.05,"lane":3},{"time":41.5,"lane":1},{"time":41.96,"lane":2},{"time":42.41,"lane":3},{"time":42.86,"lane":3},{"time":43.31,"lane":1},{"time":43.76,"lane":2},{"time":44.21,"lane":3},{"time":44.66,"lane":3},{"time":45.11,"lane":2},{"time":45.56,"lane":3},{"time":45.79,"lane":3},{"time":46.02,"lane":4},{"time":46.47,"lane":5},{"time":46.69,"lane":3},{"time":46.92,"lane":2},{"time":47.37,"lane":3},{"time":47.59,"lane":3},{"time":47.82,"lane":4},{"time":48.27,"lane":5},{"time":48.5,"lane":3},{"time":48.72,"lane":2},{"time":49.17,"lane":3},{"time":49.4,"lane":3},{"time":49.62,"lane":4},{"time":50.08,"lane":5},{"time":50.3,"lane":3},{"time":50.53,"lane":2},{"time":50.98,"lane":3},{"time":51.2,"lane":3},{"time":51.43,"lane":4},{"time":51.88,"lane":5},{"time":52.11,"lane":3},{"time":52.33,"lane":2},{"time":52.78,"lane":3},{"time":53.01,"lane":3},{"time":53.23,"lane":4},{"time":53.68,"lane":5},{"time":53.91,"lane":3},{"time":54.14,"lane":2},{"time":54.59,"lane":3},{"time":54.81,"lane":3},{"time":55.04,"lane":4},{"time":55.49,"lane":5},{"time":55.71,"lane":3},{"time":55.94,"lane":2},{"time":56.39,"lane":3},{"time":56.62,"lane":3},{"time":56.84,"lane":4},{"time":57.29,"lane":5},{"time":57.52,"lane":3},{"time":57.74,"lane":2},{"time":58.2,"lane":3},{"time":58.42,"lane":3},{"time":58.65,"lane":4},{"time":59.1,"lane":5},{"time":59.32,"lane":3},{"time":59.55,"lane":0},{"time":59.77,"lane":3},{"time":60,"lane":4},{"time":60.23,"lane":5},{"time":60.45,"lane":1},{"time":60.68,"lane":3},{"time":60.9,"lane":5},{"time":61.13,"lane":2},{"time":61.35,"lane":0},{"time":61.58,"lane":3},{"time":61.81,"lane":4},{"time":62.03,"lane":5},{"time":62.26,"lane":1},{"time":62.48,"lane":3},{"time":62.71,"lane":5},{"time":62.93,"lane":2},{"time":63.16,"lane":0},{"time":63.38,"lane":3},{"time":63.61,"lane":4},{"time":63.84,"lane":5},{"time":64.06,"lane":1},{"time":64.29,"lane":3},{"time":64.51,"lane":5},{"time":64.74,"lane":2},{"time":64.96,"lane":0},{"time":65.19,"lane":3},{"time":65.41,"lane":4},{"time":65.64,"lane":5},{"time":65.87,"lane":1},{"time":66.09,"lane":3},{"time":66.32,"lane":5},{"time":66.54,"lane":2},{"time":66.77,"lane":0},{"time":66.99,"lane":3},{"time":67.22,"lane":4},{"time":67.44,"lane":5},{"time":67.67,"lane":1},{"time":67.9,"lane":3},{"time":68.12,"lane":5},{"time":68.35,"lane":2},{"time":68.57,"lane":0},{"time":68.8,"lane":3},{"time":69.02,"lane":4},{"time":69.25,"lane":5},{"time":69.47,"lane":1},{"time":69.7,"lane":3},{"time":69.93,"lane":5},{"time":70.15,"lane":2},{"time":70.38,"lane":0},{"time":70.6,"lane":3},{"time":70.83,"lane":4},{"time":71.05,"lane":5},{"time":71.28,"lane":1},{"time":71.5,"lane":3},{"time":71.73,"lane":5},{"time":71.96,"lane":2},{"time":72.18,"lane":0},{"time":72.41,"lane":3},{"time":72.63,"lane":4},{"time":72.86,"lane":5},{"time":73.08,"lane":1},{"time":73.31,"lane":3},{"time":73.53,"lane":5},{"time":73.76,"lane":2},{"time":73.99,"lane":0},{"time":74.21,"lane":3},{"time":74.44,"lane":4},{"time":74.66,"lane":5},{"time":74.89,"lane":1},{"time":75.11,"lane":3},{"time":75.34,"lane":5},{"time":75.56,"lane":2},{"time":75.79,"lane":0},{"time":76.02,"lane":3},{"time":76.24,"lane":4},{"time":76.47,"lane":5},{"time":76.69,"lane":1},{"time":76.92,"lane":3},{"time":77.14,"lane":5},{"time":77.37,"lane":2},{"time":77.59,"lane":0},{"time":77.82,"lane":3},{"time":78.05,"lane":4},{"time":78.27,"lane":5},{"time":78.5,"lane":1},{"time":78.72,"lane":3},{"time":78.95,"lane":5},{"time":79.17,"lane":2},{"time":79.4,"lane":0},{"time":79.62,"lane":3},{"time":79.85,"lane":4},{"time":80.08,"lane":5},{"time":80.3,"lane":1},{"time":80.53,"lane":3},{"time":80.75,"lane":5},{"time":80.98,"lane":2},{"time":81.2,"lane":0},{"time":81.43,"lane":3},{"time":81.65,"lane":4},{"time":81.88,"lane":5},{"time":82.11,"lane":1},{"time":82.33,"lane":3},{"time":82.56,"lane":5},{"time":82.78,"lane":2},{"time":83.01,"lane":0},{"time":83.23,"lane":3},{"time":83.46,"lane":4},{"time":83.68,"lane":5},{"time":83.91,"lane":1},{"time":84.14,"lane":3},{"time":84.36,"lane":5},{"time":84.59,"lane":2},{"time":84.81,"lane":0},{"time":85.04,"lane":3},{"time":85.26,"lane":4},{"time":85.49,"lane":5},{"time":85.71,"lane":1},{"time":85.94,"lane":3},{"time":86.17,"lane":5},{"time":86.39,"lane":2},{"time":86.62,"lane":0},{"time":86.84,"lane":3},{"time":87.07,"lane":4},{"time":87.29,"lane":5},{"time":87.52,"lane":1},{"time":87.74,"lane":3},{"time":87.97,"lane":5},{"time":88.2,"lane":2},{"time":88.42,"lane":1},{"time":88.87,"lane":2},{"time":89.32,"lane":3},{"time":89.77,"lane":3},{"time":90.23,"lane":1},{"time":90.68,"lane":2},{"time":91.13,"lane":3},{"time":91.58,"lane":3},{"time":92.03,"lane":1},{"time":92.48,"lane":2},{"time":92.93,"lane":3},{"time":93.38,"lane":3},{"time":93.84,"lane":1},{"time":94.29,"lane":2},{"time":94.74,"lane":3},{"time":95.19,"lane":3},{"time":95.64,"lane":1},{"time":96.09,"lane":2},{"time":96.54,"lane":3},{"time":96.99,"lane":3},{"time":97.44,"lane":1},{"time":97.9,"lane":2},{"time":98.35,"lane":3},{"time":98.8,"lane":3},{"time":99.25,"lane":1},{"time":99.7,"lane":2},{"time":100.15,"lane":3},{"time":100.6,"lane":3},{"time":101.05,"lane":1},{"time":101.5,"lane":2},{"time":101.96,"lane":3},{"time":102.41,"lane":3},{"time":102.86,"lane":2},{"time":103.31,"lane":3},{"time":103.53,"lane":3},{"time":103.76,"lane":4},{"time":104.21,"lane":5},{"time":104.44,"lane":3},{"time":104.66,"lane":2},{"time":105.11,"lane":3},{"time":105.34,"lane":3},{"time":105.56,"lane":4},{"time":106.02,"lane":5},{"time":106.24,"lane":3},{"time":106.47,"lane":2},{"time":106.92,"lane":3},{"time":107.14,"lane":3},{"time":107.37,"lane":4},{"time":107.82,"lane":5},{"time":108.05,"lane":3},{"time":108.27,"lane":2},{"time":108.72,"lane":3},{"time":108.95,"lane":3},{"time":109.17,"lane":4},{"time":109.62,"lane":5},{"time":109.85,"lane":3},{"time":110.08,"lane":2},{"time":110.53,"lane":3},{"time":110.75,"lane":3},{"time":110.98,"lane":4},{"time":111.43,"lane":5},{"time":111.65,"lane":3},{"time":111.88,"lane":2},{"time":112.33,"lane":3},{"time":112.56,"lane":3},{"time":112.78,"lane":4},{"time":113.23,"lane":5},{"time":113.46,"lane":3},{"time":113.68,"lane":2},{"time":114.14,"lane":3},{"time":114.36,"lane":3},{"time":114.59,"lane":4},{"time":115.04,"lane":5},{"time":115.26,"lane":3},{"time":115.49,"lane":2},{"time":115.94,"lane":3},{"time":116.17,"lane":3},{"time":116.39,"lane":4},{"time":116.84,"lane":5},{"time":117.07,"lane":3},{"time":117.29,"lane":2},{"time":117.74,"lane":3},{"time":117.97,"lane":3},{"time":118.2,"lane":4},{"time":118.65,"lane":5},{"time":118.87,"lane":3},{"time":119.1,"lane":0},{"time":119.32,"lane":3},{"time":119.55,"lane":4},{"time":119.77,"lane":5},{"time":120,"lane":1},{"time":120.23,"lane":3},{"time":120.45,"lane":5},{"time":120.68,"lane":2},{"time":120.9,"lane":0},{"time":121.13,"lane":3},{"time":121.35,"lane":4},{"time":121.58,"lane":5},{"time":121.81,"lane":1},{"time":122.03,"lane":3},{"time":122.26,"lane":5},{"time":122.48,"lane":2},{"time":122.71,"lane":0},{"time":122.93,"lane":3},{"time":123.16,"lane":4},{"time":123.38,"lane":5},{"time":123.61,"lane":1},{"time":123.84,"lane":3},{"time":124.06,"lane":5},{"time":124.29,"lane":2},{"time":124.51,"lane":0},{"time":124.74,"lane":3},{"time":124.96,"lane":4},{"time":125.19,"lane":5},{"time":125.41,"lane":1},{"time":125.64,"lane":3},{"time":125.87,"lane":5},{"time":126.09,"lane":2},{"time":126.32,"lane":0},{"time":126.54,"lane":3},{"time":126.77,"lane":4},{"time":126.99,"lane":5},{"time":127.22,"lane":1},{"time":127.44,"lane":3},{"time":127.67,"lane":5},{"time":127.9,"lane":2},{"time":128.12,"lane":0},{"time":128.35,"lane":3},{"time":128.57,"lane":4},{"time":128.8,"lane":5},{"time":129.02,"lane":1},{"time":129.25,"lane":3},{"time":129.47,"lane":5},{"time":129.7,"lane":2},{"time":129.93,"lane":0},{"time":130.15,"lane":3},{"time":130.38,"lane":4},{"time":130.6,"lane":5},{"time":130.83,"lane":1},{"time":131.05,"lane":3},{"time":131.28,"lane":5},{"time":131.5,"lane":2},{"time":131.73,"lane":0},{"time":131.96,"lane":3},{"time":132.18,"lane":4},{"time":132.41,"lane":5},{"time":132.63,"lane":1},{"time":132.86,"lane":3},{"time":133.08,"lane":5},{"time":133.31,"lane":2},{"time":133.53,"lane":0},{"time":133.76,"lane":3},{"time":133.99,"lane":4},{"time":134.21,"lane":5},{"time":134.44,"lane":1},{"time":134.66,"lane":3},{"time":134.89,"lane":5},{"time":135.11,"lane":2},{"time":135.34,"lane":0},{"time":135.56,"lane":3},{"time":135.79,"lane":4},{"time":136.02,"lane":5},{"time":136.24,"lane":1},{"time":136.47,"lane":3},{"time":136.69,"lane":5},{"time":136.92,"lane":2},{"time":137.14,"lane":0},{"time":137.37,"lane":3},{"time":137.59,"lane":4},{"time":137.82,"lane":5},{"time":138.05,"lane":1},{"time":138.27,"lane":3},{"time":138.5,"lane":5},{"time":138.72,"lane":2},{"time":138.95,"lane":0},{"time":139.17,"lane":3},{"time":139.4,"lane":4},{"time":139.62,"lane":5},{"time":139.85,"lane":1},{"time":140.08,"lane":3},{"time":140.3,"lane":5},{"time":140.53,"lane":2},{"time":140.75,"lane":0},{"time":140.98,"lane":3},{"time":141.2,"lane":4},{"time":141.43,"lane":5},{"time":141.65,"lane":1},{"time":141.88,"lane":3},{"time":142.11,"lane":5},{"time":142.33,"lane":2},{"time":142.56,"lane":0},{"time":142.78,"lane":3},{"time":143.01,"lane":4},{"time":143.23,"lane":5},{"time":143.46,"lane":1},{"time":143.68,"lane":3},{"time":143.91,"lane":5},{"time":144.14,"lane":2},{"time":144.36,"lane":0},{"time":144.59,"lane":3},{"time":144.81,"lane":4},{"time":145.04,"lane":5},{"time":145.26,"lane":1},{"time":145.49,"lane":3},{"time":145.71,"lane":5},{"time":145.94,"lane":2},{"time":146.17,"lane":5},{"time":146.62,"lane":4},{"time":147.07,"lane":3},{"time":147.52,"lane":1},{"time":147.97,"lane":5},{"time":148.42,"lane":4},{"time":148.87,"lane":3},{"time":149.32,"lane":1},{"time":149.77,"lane":5},{"time":150.23,"lane":4},{"time":150.68,"lane":3},{"time":151.13,"lane":1},{"time":151.58,"lane":5},{"time":152.03,"lane":4},{"time":152.48,"lane":3},{"time":152.93,"lane":1},{"time":153.38,"lane":5},{"time":153.84,"lane":4},{"time":154.29,"lane":3},{"time":154.74,"lane":1},{"time":155.19,"lane":5},{"time":155.64,"lane":4},{"time":156.09,"lane":3},{"time":156.54,"lane":1},{"time":156.99,"lane":5},{"time":157.44,"lane":4},{"time":157.9,"lane":3},{"time":158.35,"lane":1},{"time":158.8,"lane":5},{"time":159.25,"lane":4},{"time":159.7,"lane":3},{"time":160.15,"lane":1},{"time":160.6,"lane":5},{"time":161.05,"lane":4},{"time":161.5,"lane":3},{"time":161.96,"lane":1},{"time":164.21,"lane":3},{"time":165.11,"lane":1},{"time":167.82,"lane":3},{"time":168.72,"lane":1},{"time":171.43,"lane":3},{"time":172.33,"lane":1}]
        },
        'demo-dance': {
            title: 'Demo Dance',
            artist: 'Built-in',
            bpm: 128,
            duration: 45000,
            difficulty: 'Medium',
            videoPath: null,
            notes: [] // Generated procedurally
        }
    };

    // ===== BEAT MAP PROCESSING =====

    // Remap 6-lane notes to 4 lanes: 0,1→0 | 2→1 | 3→2 | 4,5→3
    function remapLaneTo4(lane) {
        if (lane <= 1) return 0;
        if (lane === 2) return 1;
        if (lane === 3) return 2;
        return 3;
    }

    // Thin out notes so there's at least MIN_NOTE_GAP seconds between them
    function thinNotes(rawNotes) {
        if (rawNotes.length === 0) return rawNotes;
        const result = [rawNotes[0]];
        for (let i = 1; i < rawNotes.length; i++) {
            const prev = result[result.length - 1];
            const curr = rawNotes[i];
            const gap = curr.time - prev.time;
            if (gap >= MIN_NOTE_GAP) {
                result.push(curr);
            } else if (gap >= MIN_NOTE_GAP * 0.5 && curr.lane !== prev.lane) {
                result.push(curr);
            }
        }
        return result;
    }

    // ===== WAVE PATTERN GENERATOR =====
    // Reassigns lanes so notes flow like a smooth wave (mostly ±1 lane steps)
    // with only a few dramatic jumps per song for excitement
    const MAX_JUMPS_PER_SONG = 5; // jumps = lane change of more than 1 step

    function waveifyNotes(notes, bpm) {
        if (notes.length === 0) return notes;

        const beatInterval = 60 / (bpm || 128);
        // Wave period: how many notes before a full left-right-left cycle
        // Slower songs get longer waves, faster songs get shorter waves
        const wavePeriod = Math.max(12, Math.round(32 * (beatInterval / 0.5)));

        // Use multiple overlapping sine waves for organic movement
        // Primary wave: slow sweep across all 4 lanes
        // Secondary wave: subtle faster oscillation for variety
        const result = [];
        let jumpsUsed = 0;

        // Determine total song sections for jump placement
        const songDurationSec = notes[notes.length - 1].time - notes[0].time;
        // Place jumps at dramatic moments — evenly spaced through the song
        const jumpTimes = [];
        if (songDurationSec > 10) {
            const jumpSpacing = songDurationSec / (MAX_JUMPS_PER_SONG + 1);
            for (let j = 1; j <= MAX_JUMPS_PER_SONG; j++) {
                jumpTimes.push(notes[0].time + jumpSpacing * j);
            }
        }

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            const t = note.time - notes[0].time; // time relative to first note

            // Primary wave: sweeps across lanes 0→3→0 smoothly
            // Using a sine wave mapped to lane range [0, 3]
            const primaryPhase = (t / (beatInterval * wavePeriod)) * Math.PI * 2;
            const primaryWave = (Math.sin(primaryPhase) + 1) / 2; // 0 to 1

            // Secondary wave: faster, smaller amplitude for organic feel
            const secondaryPhase = (t / (beatInterval * wavePeriod * 0.37)) * Math.PI * 2;
            const secondaryWave = Math.sin(secondaryPhase) * 0.15; // -0.15 to 0.15

            // Combined wave position (0 to 1 range)
            let wavePos = Math.max(0, Math.min(1, primaryWave + secondaryWave));

            // Map to lane (0 to 3)
            let lane = Math.round(wavePos * (NUM_LANES - 1));
            lane = Math.max(0, Math.min(NUM_LANES - 1, lane));

            // Check if this is near a jump point — allow a dramatic skip
            let isJumpMoment = false;
            if (jumpsUsed < MAX_JUMPS_PER_SONG) {
                for (const jt of jumpTimes) {
                    if (Math.abs(note.time - jt) < beatInterval * 2 && !jumpTimes.used) {
                        isJumpMoment = true;
                        break;
                    }
                }
            }

            // Enforce smooth movement: max ±1 lane change from previous note
            if (i > 0 && !isJumpMoment) {
                const prevLane = result[i - 1].lane;
                const diff = lane - prevLane;
                if (Math.abs(diff) > 1) {
                    // Clamp to ±1 step
                    lane = prevLane + Math.sign(diff);
                    lane = Math.max(0, Math.min(NUM_LANES - 1, lane));
                }
            } else if (i > 0 && isJumpMoment) {
                const prevLane = result[i - 1].lane;
                if (Math.abs(lane - prevLane) > 1) {
                    jumpsUsed++;
                    // Mark this jump time as used
                    for (let ji = 0; ji < jumpTimes.length; ji++) {
                        if (Math.abs(note.time - jumpTimes[ji]) < beatInterval * 2) {
                            jumpTimes[ji] = -9999; // mark used
                            break;
                        }
                    }
                }
            }

            result.push({ time: note.time, lane: lane });
        }

        return result;
    }

    // Process a raw beatmap: remap lanes to 4, thin density, then apply wave pattern
    function processBeatmap(rawNotes, bpm) {
        const remapped = rawNotes.map(n => ({ time: n.time, lane: remapLaneTo4(n.lane) }));
        const thinned = thinNotes(remapped);
        return waveifyNotes(thinned, bpm);
    }

    function generateDemoBeatMap() {
        const bpm = 128;
        const beatInterval = 60 / bpm;
        const totalBeats = 96;
        const map = [];

        // Generate notes every 2 beats (on the beat, dance-friendly spacing)
        for (let beat = 4; beat < totalBeats; beat += 2) {
            const time = beat * beatInterval;
            map.push({ time, lane: 0 }); // lane will be overwritten by waveify
        }

        // Apply wave pattern to make it flow smoothly
        return waveifyNotes(map, bpm);
    }

    // ===== AUDIO =====
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playHitSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'perfect') {
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === 'good') {
            osc.frequency.value = 660;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } else if (type === 'miss') {
            osc.frequency.value = 200;
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        }
    }

    function playBeatSound() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 440;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    }

    // ===== METRONOME =====
    let metronomeBeat = 0;
    let metronomeBPM = 128;

    function updateMetronome(currentTime) {
        const metronomeInterval = 60 / metronomeBPM;
        const elapsed = currentTime - songStartTime;
        const beatNumber = Math.floor(elapsed / metronomeInterval);
        if (beatNumber > metronomeBeat) {
            metronomeBeat = beatNumber;
            playBeatSound();
        }
    }

    // ===== SCREEN MANAGEMENT =====
    function showScreen(screenId) {
        [startScreen, songSelectScreen, countdownScreen, gameScreen, resultsScreen].forEach(s => {
            if (s) s.classList.add('hidden');
        });
        const el = document.getElementById(screenId);
        if (el) el.classList.remove('hidden');
    }

    // ===== SONG SELECTION =====
    function getSongList() {
        return Object.keys(SONGS).map(id => ({ id, ...SONGS[id] }));
    }

    function updateSongSelect() {
        const songs = getSongList();
        const songCards = document.getElementById('song-cards');
        if (!songCards) return;

        songCards.innerHTML = '';
        songs.forEach((song, i) => {
            const card = document.createElement('div');
            card.className = `song-card ${i === selectedSongIndex ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="song-card-title">${song.title}</div>
                <div class="song-card-artist">${song.artist}</div>
                <div class="song-card-info">
                    <span class="song-bpm">${song.bpm} BPM</span>
                    <span class="song-difficulty ${song.difficulty.toLowerCase()}">${song.difficulty}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                selectedSongIndex = i;
                updateSongSelect();
            });
            card.addEventListener('dblclick', () => {
                selectedSongIndex = i;
                startSong(songs[i].id);
            });
            songCards.appendChild(card);
        });
    }

    function handleSongSelectKeys(e) {
        if (state !== 'song-select') return;
        const songs = getSongList();

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            selectedSongIndex = Math.max(0, selectedSongIndex - 1);
            updateSongSelect();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            selectedSongIndex = Math.min(songs.length - 1, selectedSongIndex + 1);
            updateSongSelect();
        } else if (e.key === 'Enter' || e.key === ' ') {
            startSong(songs[selectedSongIndex].id);
        } else if (e.key === 'Escape') {
            showScreen('start-screen');
            state = 'idle';
        }
    }

    // ===== INIT =====
    async function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Button handlers
        document.getElementById('start-webcam-btn').addEventListener('click', () => startWithMode('webcam'));
        document.getElementById('start-sim-btn').addEventListener('click', () => startWithMode('simulation'));
        document.getElementById('restart-btn').addEventListener('click', () => {
            showScreen('song-select-screen');
            state = 'song-select';
            updateSongSelect();
        });
        document.getElementById('play-again-btn')?.addEventListener('click', () => {
            if (currentSongId) startSong(currentSongId);
        });

        // Song select keyboard navigation
        document.addEventListener('keydown', handleSongSelectKeys);

        // Start song button
        document.getElementById('start-song-btn')?.addEventListener('click', () => {
            const songs = getSongList();
            startSong(songs[selectedSongIndex].id);
        });

        // Start render loop
        requestAnimationFrame(renderLoop);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // ===== CAMERA SELECTOR =====
    function populateCameraSelector(cameras, selectedId) {
        if (!cameraSelect) return;
        cameraSelect.innerHTML = '';

        if (cameras.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No cameras found';
            cameraSelect.appendChild(opt);
            return;
        }

        cameras.forEach((cam, i) => {
            const opt = document.createElement('option');
            opt.value = cam.deviceId;
            // Show label, highlight OBSBOT
            const label = cam.label || `Camera ${i + 1}`;
            const isOBSBOT = label.toLowerCase().includes('obsbot');
            opt.textContent = isOBSBOT ? `⭐ ${label}` : label;
            if (cam.deviceId === selectedId) {
                opt.selected = true;
            }
            cameraSelect.appendChild(opt);
        });

        // Show the container
        cameraSelectContainer.classList.remove('hidden');
    }

    // ===== MODE SELECTION =====
    async function startWithMode(mode) {
        if (mode === 'webcam') {
            useSimulation = false;
            cameraStatus.textContent = '📷 Detecting cameras...';
            cameraStatus.className = 'camera-status';
            controlsHint.classList.add('hidden');

            try {
                // Step 1: Enumerate cameras and show selector
                const cameras = await PoseDetector.enumerateCameras();
                if (cameras.length === 0) {
                    throw new Error('No cameras detected');
                }

                // Auto-select best camera (prefers OBSBOT)
                const selectedId = PoseDetector.autoSelectCamera();
                populateCameraSelector(cameras, selectedId);

                // Log which camera was auto-selected
                const selectedCam = cameras.find(c => c.deviceId === selectedId);
                const camName = selectedCam ? selectedCam.label : 'Unknown';
                cameraStatus.textContent = `📷 Starting ${camName}...`;

                // Step 2: Initialize pose detection with selected camera
                await PoseDetector.init(videoEl);

                // Show success with camera name
                const activeCam = cameras.find(c => c.deviceId === PoseDetector.getSelectedDeviceId());
                const activeName = activeCam ? activeCam.label : 'Camera';
                const isOBSBOT = activeName.toLowerCase().includes('obsbot');
                cameraStatus.textContent = `✅ ${isOBSBOT ? '⭐ OBSBOT' : activeName} ready!`;
                cameraStatus.classList.add('ready');

                // Set up camera switch handler
                cameraSelect.onchange = async () => {
                    const newDeviceId = cameraSelect.value;
                    if (!newDeviceId) return;
                    cameraStatus.textContent = '📷 Switching camera...';
                    cameraStatus.className = 'camera-status';
                    try {
                        await PoseDetector.switchCamera(newDeviceId);
                        const newCam = cameras.find(c => c.deviceId === newDeviceId);
                        const newName = newCam ? newCam.label : 'Camera';
                        cameraStatus.textContent = `✅ ${newName} ready!`;
                        cameraStatus.classList.add('ready');
                    } catch (switchErr) {
                        cameraStatus.textContent = '❌ Switch failed: ' + switchErr.message;
                        cameraStatus.classList.add('error');
                    }
                };

                // Go to song select
                showScreen('song-select-screen');
                state = 'song-select';
                updateSongSelect();
            } catch (err) {
                cameraStatus.textContent = '❌ Camera error: ' + err.message + ' — Try Keyboard Mode instead!';
                cameraStatus.classList.add('error');
                console.error('Camera init failed:', err);
            }
        } else {
            useSimulation = true;
            cameraStatus.textContent = '🎮 Keyboard simulation mode';
            cameraStatus.className = 'camera-status ready';
            controlsHint.classList.remove('hidden');
            cameraSelectContainer.classList.add('hidden');

            await PoseDetector.initSimulation();
            // Go to song select
            showScreen('song-select-screen');
            state = 'song-select';
            updateSongSelect();
        }
    }

    // ===== SONG START =====
    function startSong(songId) {
        initAudio();
        currentSongId = songId;
        const song = SONGS[songId];
        if (!song) return;

        // Reset state
        score = 0;
        combo = 0;
        maxCombo = 0;
        health = 100;
        perfectCount = 0;
        goodCount = 0;
        missCount = 0;
        nextNoteIndex = 0;
        activeNotes = [];
        hitParticles = [];
        metronomeBeat = 0;
        metronomeBPM = song.bpm || 128;
        simPersonBob = 0;
        AROverlay.clearParticles();

        // Load or generate beat map, then process for 4-lane wave-like gameplay
        if (song.notes && song.notes.length > 0) {
            notes = processBeatmap(song.notes, song.bpm || 128);
            console.log(`[Game] Beatmap processed: ${song.notes.length} → ${notes.length} wave notes (${NUM_LANES} lanes)`);
        } else {
            notes = generateDemoBeatMap();
        }
        songDuration = song.duration ? song.duration / 1000 : (notes.length > 0 ? notes[notes.length - 1].time + 3 : 45);

        // Set up music video if available
        if (song.videoPath && musicVideoEl) {
            musicVideoEl.src = song.videoPath;
            musicVideoEl.load();
        }

        // Update HUD song title
        if (songTitle) {
            songTitle.textContent = `${song.title} — ${song.artist}`;
        }

        // Show countdown
        showScreen('countdown-screen');
        state = 'countdown';
        runCountdown();
    }

    // Legacy function for backward compatibility
    function startGame() {
        const songs = getSongList();
        if (songs.length > 0) {
            startSong(songs[0].id);
        }
    }

    function runCountdown() {
        let count = 3;
        countdownNumber.textContent = count;
        countdownNumber.style.animation = 'none';
        void countdownNumber.offsetWidth;
        countdownNumber.style.animation = 'countPulse 1s ease-in-out';

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetWidth;
                countdownNumber.style.animation = 'countPulse 1s ease-in-out';
            } else if (count === 0) {
                countdownNumber.textContent = 'DANCE!';
                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetWidth;
                countdownNumber.style.animation = 'countPulse 1s ease-in-out';
            } else {
                clearInterval(interval);
                showScreen('game-screen');
                laneIndicator.classList.remove('hidden');
                state = 'playing';
                songStartTime = performance.now() / 1000;

                // Start music video if available
                if (musicVideoEl && musicVideoEl.src && SONGS[currentSongId]?.videoPath) {
                    musicVideoEl.currentTime = 0;
                    musicVideoEl.play().catch(err => {
                        console.warn('⚠️ Music video failed to play:', err.message);
                        console.warn('   Make sure you are serving via HTTP (npx serve .)');
                    });
                }
            }
        }, 1000);
    }

    // ===== GAME LOOP =====
    function renderLoop(timestamp) {
        const currentTime = timestamp / 1000;
        const dt = lastFrameTime ? currentTime - lastFrameTime : 0.016;
        lastFrameTime = currentTime;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (state === 'playing') {
            const elapsed = currentTime - songStartTime;

            // Draw background (video, webcam, or simulated)
            const hasMusicVideo = musicVideoEl && musicVideoEl.src && SONGS[currentSongId]?.videoPath && !musicVideoEl.paused;
            if (hasMusicVideo) {
                drawMusicVideo();
            } else if (useSimulation || PoseDetector.isSimulation()) {
                drawSimulatedBackground(currentTime);
            } else {
                drawWebcam();
            }

            // Draw ghost player overlay (shows skeleton over music video for positioning)
            if (hasMusicVideo) {
                drawGhostPlayer(currentTime);
            }

            // Update metronome
            updateMetronome(currentTime);

            // Spawn notes
            while (nextNoteIndex < notes.length && notes[nextNoteIndex].time <= elapsed + LOOK_AHEAD) {
                activeNotes.push({
                    ...notes[nextNoteIndex],
                    hit: false,
                    missed: false,
                    id: nextNoteIndex
                });
                nextNoteIndex++;
            }

            // Draw lane overlays
            drawLanes();

            // Draw hit zone
            drawHitZone();

            // Update and draw notes
            updateNotes(elapsed);

            // Draw simulated person (in sim mode, when no music video)
            if (!hasMusicVideo && (useSimulation || PoseDetector.isSimulation())) {
                drawSimulatedPerson(currentTime);
            }

            // Draw AR accessories
            AROverlay.drawAccessories(ctx, combo, canvas.width, canvas.height);

            // Update hit particles
            updateHitParticles();

            // Update HUD
            updateHUD();

            // Check if song is over
            if (elapsed > songDuration) {
                endGame();
            }

            // Update lane indicator
            const lane = PoseDetector.getLane();
            const laneIdx = PoseDetector.getLaneIndex();
            currentLaneEl.textContent = `${LANE_KEYS[laneIdx]} · ${lane.toUpperCase()}`;
        } else if (state === 'idle' || state === 'countdown' || state === 'song-select') {
            // Dark background for non-playing states
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        requestAnimationFrame(renderLoop);
    }

    // ===== MUSIC VIDEO BACKGROUND =====
    function drawMusicVideo() {
        if (!musicVideoEl.videoWidth) return;

        const videoAspect = musicVideoEl.videoWidth / musicVideoEl.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawW, drawH, drawX, drawY;
        if (canvasAspect > videoAspect) {
            drawW = canvas.width;
            drawH = canvas.width / videoAspect;
            drawX = 0;
            drawY = (canvas.height - drawH) / 2;
        } else {
            drawH = canvas.height;
            drawW = canvas.height * videoAspect;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
        }

        ctx.drawImage(musicVideoEl, drawX, drawY, drawW, drawH);

        // Dark overlay so notes are visible
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ===== GHOST PLAYER OVERLAY =====
    // Draws a translucent holographic skeleton over the music video
    // so the player can see their position relative to lanes
    function drawGhostPlayer(currentTime) {
        const landmarks = PoseDetector.getLandmarks();
        if (!landmarks) return;

        const w = canvas.width;
        const h = canvas.height;

        // Get key body landmarks
        const nose = PoseDetector.getLandmarkPos(0, w, h);
        const leftShoulder = PoseDetector.getLandmarkPos(11, w, h);
        const rightShoulder = PoseDetector.getLandmarkPos(12, w, h);
        const leftElbow = PoseDetector.getLandmarkPos(13, w, h);
        const rightElbow = PoseDetector.getLandmarkPos(14, w, h);
        const leftWrist = PoseDetector.getLandmarkPos(15, w, h);
        const rightWrist = PoseDetector.getLandmarkPos(16, w, h);
        const leftHip = PoseDetector.getLandmarkPos(23, w, h);
        const rightHip = PoseDetector.getLandmarkPos(24, w, h);
        const leftKnee = PoseDetector.getLandmarkPos(25, w, h);
        const rightKnee = PoseDetector.getLandmarkPos(26, w, h);
        const leftAnkle = PoseDetector.getLandmarkPos(27, w, h);
        const rightAnkle = PoseDetector.getLandmarkPos(28, w, h);
        const leftEye = PoseDetector.getLandmarkPos(2, w, h);
        const rightEye = PoseDetector.getLandmarkPos(5, w, h);

        if (!nose || !leftShoulder || !rightShoulder) return;

        // Subtle bob animation
        const bob = Math.sin(currentTime * 3) * 2;

        // Pulse alpha with beat for extra ghostliness
        const beatPulse = 0.03 * Math.sin(currentTime * metronomeBPM / 60 * Math.PI * 2);
        const baseAlpha = 0.4 + beatPulse;

        ctx.save();
        ctx.globalAlpha = baseAlpha;

        // Body center for glow
        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2 + bob
        };

        // Soft radial glow around body center — magenta/violet
        const glowGrad = ctx.createRadialGradient(
            shoulderMid.x, shoulderMid.y, 5,
            shoulderMid.x, shoulderMid.y, 180
        );
        glowGrad.addColorStop(0, 'rgba(255, 51, 170, 0.12)');
        glowGrad.addColorStop(0.4, 'rgba(153, 68, 238, 0.04)');
        glowGrad.addColorStop(1, 'rgba(153, 68, 238, 0)');
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = baseAlpha;

        // Draw limb connections — magenta glow
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.7)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 51, 170, 0.8)';
        ctx.shadowBlur = 10;

        function drawLimb(p1, p2) {
            if (!p1 || !p2) return;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y + bob);
            ctx.lineTo(p2.x, p2.y + bob);
            ctx.stroke();
        }

        // Torso
        drawLimb(leftShoulder, rightShoulder);
        drawLimb(leftShoulder, leftHip);
        drawLimb(rightShoulder, rightHip);
        drawLimb(leftHip, rightHip);
        // Spine
        drawLimb(shoulderMid, nose);
        // Arms
        drawLimb(leftShoulder, leftElbow);
        drawLimb(leftElbow, leftWrist);
        drawLimb(rightShoulder, rightElbow);
        drawLimb(rightElbow, rightWrist);
        // Legs
        drawLimb(leftHip, leftKnee);
        drawLimb(leftKnee, leftAnkle);
        drawLimb(rightHip, rightKnee);
        drawLimb(rightKnee, rightAnkle);

        // Draw joints as glowing dots
        ctx.shadowBlur = 15;
        const joints = [nose, leftShoulder, rightShoulder, leftElbow, rightElbow,
            leftWrist, rightWrist, leftHip, rightHip, leftKnee, rightKnee,
            leftAnkle, rightAnkle];

        joints.forEach(j => {
            if (!j) return;
            ctx.beginPath();
            ctx.arc(j.x, j.y + bob, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 150, 220, 0.9)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 51, 170, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Head circle
        const headRadius = Math.abs(leftShoulder.x - rightShoulder.x) * 0.35;
        ctx.beginPath();
        ctx.arc(nose.x, nose.y + bob - headRadius * 0.3, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 68, 238, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        if (leftEye && rightEye) {
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(255, 150, 220, 0.9)';
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y + bob, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEye.x, rightEye.y + bob, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lane position indicator at feet
        ctx.shadowBlur = 0;
        const laneIdx = PoseDetector.getLaneIndex();
        const laneWidth = w / NUM_LANES;
        const laneCenterX = laneIdx * laneWidth + laneWidth / 2;
        const footY = Math.max(
            leftAnkle ? leftAnkle.y + bob : h * 0.85,
            rightAnkle ? rightAnkle.y + bob : h * 0.85
        ) + 15;

        // Vertical lane position line (subtle)
        ctx.strokeStyle = `rgba(0, 255, 255, 0.15)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(shoulderMid.x, 0);
        ctx.lineTo(shoulderMid.x, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Lane label at feet
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = LANE_COLORS[laneIdx];
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = LANE_COLORS[laneIdx];
        ctx.shadowBlur = 8;
        ctx.fillText(LANE_KEYS[laneIdx] + ' · ' + LANE_NAMES[laneIdx].toUpperCase(), shoulderMid.x, footY);

        ctx.restore();
    }

    // ===== SIMULATED BACKGROUND =====
    function drawSimulatedBackground(currentTime) {
        // Deep void gradient background
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#08040e');
        grad.addColorStop(0.3, '#0c0618');
        grad.addColorStop(0.7, '#0a0412');
        grad.addColorStop(1, '#06020a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated grid floor — magenta/violet cyber grid
        const gridSize = 60;
        const scrollOffset = (currentTime * 30) % gridSize;

        // Horizontal grid lines
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.05)';
        ctx.lineWidth = 1;
        for (let y = canvas.height * 0.3; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + scrollOffset);
            ctx.lineTo(canvas.width, y + scrollOffset);
            ctx.stroke();
        }

        // Vertical grid lines
        ctx.strokeStyle = 'rgba(153, 68, 238, 0.04)';
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, canvas.height * 0.3);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Subtle pulsing magenta fog at bottom
        const fogPulse = 0.03 + 0.015 * Math.sin(currentTime * 1.5);
        const fogGrad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
        fogGrad.addColorStop(0, 'rgba(255, 51, 170, 0)');
        fogGrad.addColorStop(1, `rgba(255, 51, 170, ${fogPulse})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

        // Deep vignette
        const vignette = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.85
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scanline effect on canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        for (let y = 0; y < canvas.height; y += 4) {
            ctx.fillRect(0, y, canvas.width, 2);
        }
    }

    // ===== SIMULATED PERSON =====
    function drawSimulatedPerson(currentTime) {
        const landmarks = PoseDetector.getLandmarks();
        if (!landmarks) return;

        simPersonBob = Math.sin(currentTime * 3) * 3;

        const nose = PoseDetector.getLandmarkPos(0, canvas.width, canvas.height);
        const leftShoulder = PoseDetector.getLandmarkPos(11, canvas.width, canvas.height);
        const rightShoulder = PoseDetector.getLandmarkPos(12, canvas.width, canvas.height);
        const leftElbow = PoseDetector.getLandmarkPos(13, canvas.width, canvas.height);
        const rightElbow = PoseDetector.getLandmarkPos(14, canvas.width, canvas.height);
        const leftWrist = PoseDetector.getLandmarkPos(15, canvas.width, canvas.height);
        const rightWrist = PoseDetector.getLandmarkPos(16, canvas.width, canvas.height);
        const leftHip = PoseDetector.getLandmarkPos(23, canvas.width, canvas.height);
        const rightHip = PoseDetector.getLandmarkPos(24, canvas.width, canvas.height);
        const leftKnee = PoseDetector.getLandmarkPos(25, canvas.width, canvas.height);
        const rightKnee = PoseDetector.getLandmarkPos(26, canvas.width, canvas.height);
        const leftAnkle = PoseDetector.getLandmarkPos(27, canvas.width, canvas.height);
        const rightAnkle = PoseDetector.getLandmarkPos(28, canvas.width, canvas.height);

        if (!nose || !leftShoulder || !rightShoulder) return;

        const bob = simPersonBob;

        ctx.save();

        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2 + bob
        };

        const glowGrad = ctx.createRadialGradient(
            shoulderMid.x, shoulderMid.y, 10,
            shoulderMid.x, shoulderMid.y, 150
        );
        glowGrad.addColorStop(0, 'rgba(153, 68, 238, 0.12)');
        glowGrad.addColorStop(1, 'rgba(153, 68, 238, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 51, 170, 0.65)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        function drawLimb(p1, p2) {
            if (!p1 || !p2) return;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y + bob);
            ctx.lineTo(p2.x, p2.y + bob);
            ctx.stroke();
        }

        drawLimb(leftShoulder, rightShoulder);
        drawLimb(leftShoulder, leftHip);
        drawLimb(rightShoulder, rightHip);
        drawLimb(leftHip, rightHip);
        drawLimb(leftShoulder, leftElbow);
        drawLimb(leftElbow, leftWrist);
        drawLimb(rightShoulder, rightElbow);
        drawLimb(rightElbow, rightWrist);
        drawLimb(leftHip, leftKnee);
        drawLimb(leftKnee, leftAnkle);
        drawLimb(rightHip, rightKnee);
        drawLimb(rightKnee, rightAnkle);
        drawLimb(shoulderMid, nose);

        const joints = [nose, leftShoulder, rightShoulder, leftElbow, rightElbow,
            leftWrist, rightWrist, leftHip, rightHip, leftKnee, rightKnee,
            leftAnkle, rightAnkle];

        joints.forEach(j => {
            if (!j) return;
            ctx.beginPath();
            ctx.arc(j.x, j.y + bob, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 150, 220, 0.9)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 51, 170, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        const headRadius = Math.abs(leftShoulder.x - rightShoulder.x) * 0.35;
        ctx.beginPath();
        ctx.arc(nose.x, nose.y + bob - headRadius * 0.3, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 68, 238, 0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();

        const leftEye = PoseDetector.getLandmarkPos(2, canvas.width, canvas.height);
        const rightEye = PoseDetector.getLandmarkPos(5, canvas.width, canvas.height);
        if (leftEye && rightEye) {
            ctx.fillStyle = 'rgba(255, 180, 230, 0.9)';
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y + bob, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEye.x, rightEye.y + bob, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(nose.x, nose.y + bob + 5, 8, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.strokeStyle = 'rgba(255, 150, 220, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (leftAnkle && rightAnkle) {
            const shadowY = Math.max(leftAnkle.y, rightAnkle.y) + 20;
            const shadowX = (leftAnkle.x + rightAnkle.x) / 2;
            ctx.beginPath();
            ctx.ellipse(shadowX, shadowY, 40, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
        }

        ctx.restore();
    }

    function drawWebcam() {
        if (!videoEl.videoWidth) return;

        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        const videoAspect = videoEl.videoWidth / videoEl.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawW, drawH, drawX, drawY;
        if (canvasAspect > videoAspect) {
            drawW = canvas.width;
            drawH = canvas.width / videoAspect;
            drawX = 0;
            drawY = (canvas.height - drawH) / 2;
        } else {
            drawH = canvas.height;
            drawW = canvas.height * videoAspect;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
        }

        ctx.drawImage(videoEl, drawX, drawY, drawW, drawH);
        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ===== 4-LANE RENDERING =====
    function drawLanes() {
        const laneWidth = canvas.width / NUM_LANES;
        const currentLane = PoseDetector.getLane();

        for (let i = 0; i < NUM_LANES; i++) {
            const x = i * laneWidth;
            const isActive = LANE_NAMES[i] === currentLane;
            const color = LANE_COLORS[i];
            const rgb = hexToRgb(color);

            // Lane dividers
            if (i > 0) {
                ctx.strokeStyle = 'rgba(255, 51, 170, 0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([8, 8]);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Active lane highlight
            if (isActive) {
                ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.1)`;
                ctx.fillRect(x, 0, laneWidth, canvas.height);

                const glowGrad = ctx.createLinearGradient(x, canvas.height - 100, x, canvas.height);
                glowGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b}, 0)`);
                glowGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.2)`);
                ctx.fillStyle = glowGrad;
                ctx.fillRect(x, canvas.height - 100, laneWidth, 100);
            }

            // Lane key label at bottom
            ctx.fillStyle = isActive ? color : 'rgba(255,255,255,0.25)';
            ctx.font = `bold ${isActive ? 16 : 12}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${LANE_KEYS[i]}`, x + laneWidth / 2, canvas.height - 8);
        }
    }

    function drawHitZone() {
        const hitY = canvas.height * HIT_ZONE_Y_RATIO;
        const laneWidth = canvas.width / NUM_LANES;

        // Hit zone line
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, hitY);
        ctx.lineTo(canvas.width, hitY);
        ctx.stroke();

        // Hit zone target circles for each lane
        for (let i = 0; i < NUM_LANES; i++) {
            const cx = i * laneWidth + laneWidth / 2;
            const rgb = hexToRgb(LANE_COLORS[i]);

            // Outer ring
            ctx.beginPath();
            ctx.arc(cx, hitY, 26, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.2)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Inner ring
            ctx.beginPath();
            ctx.arc(cx, hitY, 24, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b}, 0.4)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // ===== WAVE TRAIL =====
    // Draws a thick, glowing curved trail connecting consecutive visible notes
    // This is the primary visual — the "wave" the player follows
    function drawWaveTrail(elapsed, hitY, laneWidth) {
        // Collect visible, non-hit notes sorted by time
        const visibleNotes = activeNotes
            .filter(n => !n.hit && !n.missed)
            .sort((a, b) => a.time - b.time);

        if (visibleNotes.length < 2) return;

        // Build the path points
        const points = visibleNotes.map(note => {
            const timeDiff = note.time - elapsed;
            return {
                x: note.lane * laneWidth + laneWidth / 2,
                y: hitY - timeDiff * NOTE_SPEED,
                lane: note.lane
            };
        });

        // First note is closest to hit zone (bottom), last is furthest (top)
        const bottomY = points[0].y;
        const topY = points[points.length - 1].y;

        // Draw outer glow layer (wide, soft)
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawSmoothPath(points);
        ctx.strokeStyle = 'rgba(255, 51, 170, 0.5)';
        ctx.shadowColor = 'rgba(255, 51, 170, 0.4)';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();

        // Draw mid glow layer
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawSmoothPath(points);
        const midGrad = ctx.createLinearGradient(0, bottomY, 0, topY);
        midGrad.addColorStop(0, 'rgba(255, 51, 170, 0.9)');
        midGrad.addColorStop(0.4, 'rgba(200, 50, 200, 0.6)');
        midGrad.addColorStop(1, 'rgba(153, 68, 238, 0.15)');
        ctx.strokeStyle = midGrad;
        ctx.shadowColor = 'rgba(255, 51, 170, 0.3)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Draw core bright trail
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawSmoothPath(points);
        const coreGrad = ctx.createLinearGradient(0, bottomY, 0, topY);
        coreGrad.addColorStop(0, 'rgba(255, 200, 240, 1.0)');
        coreGrad.addColorStop(0.3, 'rgba(255, 51, 170, 0.8)');
        coreGrad.addColorStop(1, 'rgba(153, 68, 238, 0.2)');
        ctx.strokeStyle = coreGrad;
        ctx.shadowColor = 'rgba(255, 150, 220, 0.5)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
    }

    // Helper: draw a smooth bezier path through an array of {x, y} points
    function drawSmoothPath(points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            // Control point at midpoint Y, previous X for smooth S-curves
            const cpY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, cpY, curr.x, curr.y);
        }
    }

    function updateNotes(elapsed) {
        const hitY = canvas.height * HIT_ZONE_Y_RATIO;
        const laneWidth = canvas.width / NUM_LANES;

        // Draw wave trail connecting consecutive notes
        drawWaveTrail(elapsed, hitY, laneWidth);

        activeNotes = activeNotes.filter(note => {
            if (note.hit) {
                note.fadeOut = (note.fadeOut || 1) - 0.05;
                if (note.fadeOut <= 0) return false;
                drawNote(note, elapsed, hitY, laneWidth, note.fadeOut);
                return true;
            }

            const timeDiff = note.time - elapsed;

            // Check if note passed the miss window
            if (timeDiff < -MISS_WINDOW && !note.missed) {
                note.missed = true;
                onMiss();
            }

            // Remove notes that are way past
            if (timeDiff < -1.0) return false;

            // Check for hit
            if (!note.missed && Math.abs(timeDiff) <= GOOD_WINDOW) {
                const playerLaneIndex = PoseDetector.getLaneIndex();

                if (playerLaneIndex === note.lane) {
                    if (Math.abs(timeDiff) <= PERFECT_WINDOW) {
                        onHit(note, 'perfect');
                    } else {
                        onHit(note, 'good');
                    }
                }
            }

            drawNote(note, elapsed, hitY, laneWidth, 1.0);
            return true;
        });
    }

    function drawNote(note, elapsed, hitY, laneWidth, alpha) {
        const timeDiff = note.time - elapsed;
        const noteY = hitY - timeDiff * NOTE_SPEED;
        const cx = note.lane * laneWidth + laneWidth / 2;
        const color = LANE_COLORS[note.lane];
        const size = 22;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        // Arrow background circle
        ctx.beginPath();
        ctx.arc(cx, noteY, size, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, noteY, 0, cx, noteY, size);
        grad.addColorStop(0, color);
        grad.addColorStop(1, adjustAlpha(color, 0.6));
        ctx.fillStyle = grad;
        ctx.fill();

        // Arrow border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrow symbol
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(LANE_ARROWS[note.lane], cx, noteY);

        // Lane key hint on note
        ctx.font = `bold ${size * 0.45}px Arial`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(LANE_KEYS[note.lane], cx, noteY + size + 10);

        ctx.restore();
    }

    function onHit(note, type) {
        note.hit = true;
        note.fadeOut = 1.0;

        if (type === 'perfect') {
            score += 100 * (1 + Math.floor(combo / 5));
            perfectCount++;
            showHitFeedback('PERFECT ⚡', 'perfect');
        } else {
            score += 50 * (1 + Math.floor(combo / 5));
            goodCount++;
            showHitFeedback('GOOD 🦇', 'good');
        }

        combo++;
        if (combo > maxCombo) maxCombo = combo;
        health = Math.min(100, health + 5);

        playHitSound(type);
        spawnHitParticles(note);
    }

    function onMiss() {
        combo = 0;
        missCount++;
        health = Math.max(0, health - 4);
        showHitFeedback('MISS ☠️', 'miss');
        playHitSound('miss');
    }

    function showHitFeedback(text, type) {
        hitFeedback.textContent = text;
        hitFeedback.className = type;
        hitFeedback.classList.remove('hidden');

        hitFeedback.style.animation = 'none';
        void hitFeedback.offsetWidth;
        hitFeedback.style.animation = 'hitPop 0.6s ease-out forwards';

        setTimeout(() => {
            hitFeedback.classList.add('hidden');
        }, 600);
    }

    // ===== HIT PARTICLES =====
    function spawnHitParticles(note) {
        const laneWidth = canvas.width / NUM_LANES;
        const cx = note.lane * laneWidth + laneWidth / 2;
        const hitY = canvas.height * HIT_ZONE_Y_RATIO;
        const color = LANE_COLORS[note.lane];

        for (let i = 0; i < 12; i++) {
            hitParticles.push({
                x: cx,
                y: hitY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 3,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                size: 3 + Math.random() * 5,
                color: color
            });
        }
    }

    function updateHitParticles() {
        hitParticles = hitParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= p.decay;

            if (p.life <= 0) return false;

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            return true;
        });
    }

    // ===== HUD UPDATE =====
    function updateHUD() {
        scoreValue.textContent = score.toLocaleString();
        comboValue.textContent = combo + 'x';
        healthBar.style.width = health + '%';

        if (health > 60) {
            healthBar.style.background = 'linear-gradient(90deg, #00e673, #33ff99)';
        } else if (health > 30) {
            healthBar.style.background = 'linear-gradient(90deg, #ff33aa, #ff66cc)';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #cc0033, #ff3355)';
        }

        const wealthName = AROverlay.getWealthLevelName(combo);
        wealthText.textContent = wealthName;

        if (combo >= 5) {
            comboValue.style.color = '#ff33aa';
            comboValue.style.textShadow = '0 0 10px rgba(255,51,170,0.5)';
        } else {
            comboValue.style.color = '#cc3344';
            comboValue.style.textShadow = 'none';
        }
    }

    // ===== END GAME =====
    function endGame() {
        state = 'results';
        laneIndicator.classList.add('hidden');

        // Stop music video
        if (musicVideoEl) {
            musicVideoEl.pause();
        }

        finalScore.textContent = score.toLocaleString();
        finalCombo.textContent = maxCombo + 'x';
        finalPerfect.textContent = perfectCount;
        finalGood.textContent = goodCount;
        finalMiss.textContent = missCount;

        const wealthName = AROverlay.getWealthLevelName(maxCombo);
        finalWealthTitle.textContent = `Final Rank: ${wealthName}`;

        showScreen('results-screen');
    }

    // ===== HELPERS =====
    function adjustAlpha(hexColor, alpha) {
        const rgb = hexToRgb(hexColor);
        return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    // ===== INITIALIZE =====
    init();

    return {
        getState: () => state,
        getScore: () => score,
        getCombo: () => combo,
        SONGS,
        getSongList,
        startSong
    };
})();
