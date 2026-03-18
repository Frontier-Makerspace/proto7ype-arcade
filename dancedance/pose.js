// ===== POSE DETECTION MODULE =====
// Handles webcam + MediaPipe Pose for body tracking and lane detection
// Supports 4-lane detection for dance game
// Also supports simulation mode with keyboard input (A/S/K/L)
// Optimized for OBSBOT and high-quality webcams
// Uses direct getUserMedia for proper camera device selection

const PoseDetector = (() => {
    let pose = null;
    let videoElement = null;
    let latestLandmarks = null;
    let currentLane = 'center-left'; // default to center-left (lane 1)
    let currentLaneIndex = 1;
    let onResultsCallback = null;
    let isReady = false;
    let simulationMode = false;
    let frameLoopRunning = false;
    let currentStream = null;

    // Camera device management
    let availableCameras = [];
    let selectedDeviceId = null;

    // Simulated landmarks for keyboard mode
    let simLandmarks = null;
    let simTargetX = 0.5; // normalized target X position (0-1)
    let simCurrentX = 0.5; // current animated X position
    const SIM_LERP_SPEED = 0.15; // smooth movement speed

    // 4 Lane configuration (wider zones = easier to hit with body movement)
    const NUM_LANES = 4;
    const LANE_NAMES = ['left', 'center-left', 'center-right', 'right'];

    // Lane thresholds (normalized x coordinates) — 4 zones with generous outer margins
    // Outer lanes are wider so you don't need to be at the camera edge
    // Zone boundaries: 0.325, 0.5, 0.675
    // Left: 0.0–0.325 | Center-L: 0.325–0.5 | Center-R: 0.5–0.675 | Right: 0.675–1.0
    const LANE_THRESHOLDS = [0.325, 0.5, 0.675];

    // Lane center positions for simulation (center of each zone)
    const LANE_POSITIONS = {
        'left':         0.16,
        'center-left':  0.41,
        'center-right': 0.59,
        'right':        0.84
    };

    // Keyboard mappings for 4 lanes
    const KEY_MAP = {
        // A/S for left 2 lanes
        'a': 'left',
        's': 'center-left',
        // K/L for right 2 lanes
        'k': 'center-right',
        'l': 'right',
        // Number keys 1-4 as alternative
        '1': 'left',
        '2': 'center-left',
        '3': 'center-right',
        '4': 'right',
        // Arrow keys for quick left/right navigation
        'arrowleft': null,  // handled specially
        'arrowright': null   // handled specially
    };

    // ===== CAMERA DEVICE ENUMERATION =====

    // Enumerate available video input devices
    async function enumerateCameras() {
        try {
            // Request a temporary stream to trigger permission prompt
            // (needed to get device labels on some browsers)
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(t => t.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            availableCameras = devices.filter(d => d.kind === 'videoinput');
            console.log('[PoseDetector] Available cameras:', availableCameras.map(c => `${c.label} (${c.deviceId.slice(0, 8)}...)`));
            return availableCameras;
        } catch (err) {
            console.warn('[PoseDetector] Could not enumerate cameras:', err.message);
            availableCameras = [];
            return [];
        }
    }

    // Auto-select the best camera (prefer OBSBOT)
    function autoSelectCamera() {
        if (availableCameras.length === 0) return null;

        // Look for OBSBOT by label
        const obsbot = availableCameras.find(c =>
            c.label.toLowerCase().includes('obsbot')
        );
        if (obsbot) {
            console.log('[PoseDetector] Auto-selected OBSBOT camera:', obsbot.label);
            selectedDeviceId = obsbot.deviceId;
            return obsbot.deviceId;
        }

        // Look for USB/external cameras (not built-in)
        const external = availableCameras.find(c => {
            const label = c.label.toLowerCase();
            return label.includes('usb') || label.includes('external') || label.includes('webcam');
        });
        if (external && availableCameras.length > 1) {
            console.log('[PoseDetector] Auto-selected external camera:', external.label);
            selectedDeviceId = external.deviceId;
            return external.deviceId;
        }

        // Fall back to first camera
        console.log('[PoseDetector] Using default camera:', availableCameras[0].label);
        selectedDeviceId = availableCameras[0].deviceId;
        return availableCameras[0].deviceId;
    }

    // Set camera by device ID (called from UI selector)
    function setCamera(deviceId) {
        selectedDeviceId = deviceId;
        console.log('[PoseDetector] Camera set to:', deviceId);
    }

    function getAvailableCameras() {
        return availableCameras;
    }

    function getSelectedDeviceId() {
        return selectedDeviceId;
    }

    // ===== CAMERA INITIALIZATION =====

    async function startCamera(videoEl, width, height) {
        // Stop any existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
            currentStream = null;
        }

        const constraints = {
            video: {
                width: { ideal: width },
                height: { ideal: height }
            },
            audio: false
        };

        // Add deviceId constraint if we have a selected camera
        if (selectedDeviceId) {
            constraints.video.deviceId = { exact: selectedDeviceId };
        }

        console.log('[PoseDetector] Requesting camera with constraints:', JSON.stringify(constraints));

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        videoEl.srcObject = stream;

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
            videoEl.onloadedmetadata = () => {
                videoEl.play().then(resolve).catch(reject);
            };
            videoEl.onerror = reject;
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Video load timeout')), 5000);
        });

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        console.log(`[PoseDetector] Camera started: ${track.label} @ ${settings.width}x${settings.height}`);
    }

    // Frame sending loop — sends video frames to MediaPipe Pose
    function startFrameLoop(videoEl) {
        if (frameLoopRunning) return;
        frameLoopRunning = true;

        async function sendFrame() {
            if (!frameLoopRunning) return;
            if (videoEl.readyState >= 2 && pose) {
                try {
                    await pose.send({ image: videoEl });
                } catch (e) {
                    // Silently handle frame errors
                }
            }
            if (frameLoopRunning) {
                requestAnimationFrame(sendFrame);
            }
        }
        requestAnimationFrame(sendFrame);
    }

    function stopFrameLoop() {
        frameLoopRunning = false;
    }

    // ===== MAIN INIT =====

    async function init(videoEl) {
        videoElement = videoEl;

        // Initialize MediaPipe Pose
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
            }
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        pose.onResults(handleResults);

        // Enumerate cameras and auto-select if not already set
        if (availableCameras.length === 0) {
            await enumerateCameras();
        }
        if (!selectedDeviceId) {
            autoSelectCamera();
        }

        // Try high resolution first (1280x720), fall back to 640x480
        try {
            await startCamera(videoEl, 1280, 720);
        } catch (err) {
            console.warn('[PoseDetector] High-res failed, trying 640x480:', err.message);
            try {
                await startCamera(videoEl, 640, 480);
            } catch (err2) {
                throw new Error(`Camera failed: ${err2.message}`);
            }
        }

        // Start sending frames to MediaPipe
        startFrameLoop(videoEl);
        isReady = true;
    }

    // Re-initialize with a different camera (for switching cameras)
    async function switchCamera(deviceId) {
        if (!videoElement) return;
        stopFrameLoop();
        selectedDeviceId = deviceId;

        try {
            await startCamera(videoElement, 1280, 720);
        } catch (err) {
            console.warn('[PoseDetector] High-res failed on switch, trying 640x480:', err.message);
            await startCamera(videoElement, 640, 480);
        }

        startFrameLoop(videoElement);
        console.log('[PoseDetector] Switched to camera:', deviceId);
    }

    // Initialize simulation mode (no webcam needed)
    function initSimulation() {
        simulationMode = true;
        isReady = true;
        currentLane = 'center-left';
        currentLaneIndex = 1;
        simTargetX = LANE_POSITIONS['center-left'];
        simCurrentX = LANE_POSITIONS['center-left'];

        // Set up keyboard listeners
        document.addEventListener('keydown', handleSimKeydown);

        // Generate initial simulated landmarks
        updateSimLandmarks();

        return Promise.resolve();
    }

    function handleSimKeydown(e) {
        const key = e.key.toLowerCase();

        // Direct lane mapping
        if (KEY_MAP[key] !== undefined && KEY_MAP[key] !== null) {
            setSimLane(KEY_MAP[key]);
            return;
        }

        // Arrow keys — move one lane left/right
        if (key === 'arrowleft') {
            const newIndex = Math.max(0, currentLaneIndex - 1);
            setSimLane(LANE_NAMES[newIndex]);
        } else if (key === 'arrowright') {
            const newIndex = Math.min(NUM_LANES - 1, currentLaneIndex + 1);
            setSimLane(LANE_NAMES[newIndex]);
        }
    }

    function setSimLane(lane) {
        currentLane = lane;
        currentLaneIndex = LANE_NAMES.indexOf(lane);
        simTargetX = LANE_POSITIONS[lane];
    }

    // Update simulated landmarks based on current position
    function updateSimLandmarks() {
        // Smoothly interpolate position
        simCurrentX += (simTargetX - simCurrentX) * SIM_LERP_SPEED;

        const cx = simCurrentX;
        const baseY = 0.45; // torso center Y

        // Generate a basic skeleton (33 landmarks like MediaPipe)
        const shoulderWidth = 0.12;
        const headOffset = -0.18;
        const eyeSpread = 0.025;

        simLandmarks = new Array(33).fill(null).map(() => ({
            x: cx, y: baseY, z: 0, visibility: 0.9
        }));

        // Nose (index 0)
        simLandmarks[0] = { x: cx, y: baseY + headOffset, z: 0, visibility: 0.99 };
        // Left eye inner (index 1)
        simLandmarks[1] = { x: cx + eyeSpread * 0.5, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Left eye (index 2)
        simLandmarks[2] = { x: cx + eyeSpread, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Left eye outer (index 3)
        simLandmarks[3] = { x: cx + eyeSpread * 1.5, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Right eye inner (index 4)
        simLandmarks[4] = { x: cx - eyeSpread * 0.5, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Right eye (index 5)
        simLandmarks[5] = { x: cx - eyeSpread, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Right eye outer (index 6)
        simLandmarks[6] = { x: cx - eyeSpread * 1.5, y: baseY + headOffset - 0.015, z: 0, visibility: 0.99 };
        // Left ear (index 7)
        simLandmarks[7] = { x: cx + shoulderWidth * 0.4, y: baseY + headOffset, z: 0, visibility: 0.9 };
        // Right ear (index 8)
        simLandmarks[8] = { x: cx - shoulderWidth * 0.4, y: baseY + headOffset, z: 0, visibility: 0.9 };
        // Mouth left (index 9)
        simLandmarks[9] = { x: cx + eyeSpread * 0.7, y: baseY + headOffset + 0.025, z: 0, visibility: 0.9 };
        // Mouth right (index 10)
        simLandmarks[10] = { x: cx - eyeSpread * 0.7, y: baseY + headOffset + 0.025, z: 0, visibility: 0.9 };
        // Left shoulder (index 11)
        simLandmarks[11] = { x: cx + shoulderWidth, y: baseY, z: 0, visibility: 0.99 };
        // Right shoulder (index 12)
        simLandmarks[12] = { x: cx - shoulderWidth, y: baseY, z: 0, visibility: 0.99 };
        // Left elbow (index 13)
        simLandmarks[13] = { x: cx + shoulderWidth * 1.3, y: baseY + 0.15, z: 0, visibility: 0.9 };
        // Right elbow (index 14)
        simLandmarks[14] = { x: cx - shoulderWidth * 1.3, y: baseY + 0.15, z: 0, visibility: 0.9 };
        // Left wrist (index 15)
        simLandmarks[15] = { x: cx + shoulderWidth * 1.2, y: baseY + 0.28, z: 0, visibility: 0.9 };
        // Right wrist (index 16)
        simLandmarks[16] = { x: cx - shoulderWidth * 1.2, y: baseY + 0.28, z: 0, visibility: 0.9 };
        // Left hip (index 23)
        simLandmarks[23] = { x: cx + shoulderWidth * 0.6, y: baseY + 0.22, z: 0, visibility: 0.9 };
        // Right hip (index 24)
        simLandmarks[24] = { x: cx - shoulderWidth * 0.6, y: baseY + 0.22, z: 0, visibility: 0.9 };
        // Left knee (index 25)
        simLandmarks[25] = { x: cx + shoulderWidth * 0.5, y: baseY + 0.42, z: 0, visibility: 0.9 };
        // Right knee (index 26)
        simLandmarks[26] = { x: cx - shoulderWidth * 0.5, y: baseY + 0.42, z: 0, visibility: 0.9 };
        // Left ankle (index 27)
        simLandmarks[27] = { x: cx + shoulderWidth * 0.5, y: baseY + 0.58, z: 0, visibility: 0.9 };
        // Right ankle (index 28)
        simLandmarks[28] = { x: cx - shoulderWidth * 0.5, y: baseY + 0.58, z: 0, visibility: 0.9 };

        latestLandmarks = simLandmarks;
    }

    function handleResults(results) {
        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            latestLandmarks = results.poseLandmarks;

            const leftShoulder = results.poseLandmarks[11];
            const rightShoulder = results.poseLandmarks[12];
            const leftHip = results.poseLandmarks[23];
            const rightHip = results.poseLandmarks[24];

            if (leftShoulder && rightShoulder) {
                // Use body center of mass (shoulders + hips) for more stable lane detection
                let centerX;
                if (leftHip && rightHip) {
                    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
                    const hipMidX = (leftHip.x + rightHip.x) / 2;
                    centerX = 1.0 - ((shoulderMidX + hipMidX) / 2); // Mirror for webcam
                } else {
                    centerX = 1.0 - ((leftShoulder.x + rightShoulder.x) / 2);
                }

                // Map to 4 lanes using thresholds
                let laneIdx = 0;
                for (let i = 0; i < LANE_THRESHOLDS.length; i++) {
                    if (centerX >= LANE_THRESHOLDS[i]) {
                        laneIdx = i + 1;
                    }
                }
                currentLane = LANE_NAMES[laneIdx];
                currentLaneIndex = laneIdx;
            }
        } else {
            latestLandmarks = null;
        }

        if (onResultsCallback) {
            onResultsCallback(results);
        }
    }

    function getLane() {
        return currentLane;
    }

    function getLaneIndex() {
        return currentLaneIndex;
    }

    function getLandmarks() {
        if (simulationMode) {
            updateSimLandmarks();
        }
        return latestLandmarks;
    }

    function getIsReady() {
        return isReady;
    }

    function isSimulationMode() {
        return simulationMode;
    }

    function setOnResults(callback) {
        onResultsCallback = callback;
    }

    // Get mirrored landmark position in pixel coordinates
    function getLandmarkPos(index, canvasWidth, canvasHeight) {
        if (simulationMode) {
            updateSimLandmarks();
        }
        if (!latestLandmarks || !latestLandmarks[index]) return null;
        const lm = latestLandmarks[index];

        if (simulationMode) {
            return {
                x: lm.x * canvasWidth,
                y: lm.y * canvasHeight,
                z: lm.z,
                visibility: lm.visibility
            };
        }

        return {
            x: (1.0 - lm.x) * canvasWidth,  // Mirror X for webcam
            y: lm.y * canvasHeight,
            z: lm.z,
            visibility: lm.visibility
        };
    }

    // Get midpoint between two landmarks
    function getMidpoint(idx1, idx2, canvasWidth, canvasHeight) {
        const p1 = getLandmarkPos(idx1, canvasWidth, canvasHeight);
        const p2 = getLandmarkPos(idx2, canvasWidth, canvasHeight);
        if (!p1 || !p2) return null;
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
    }

    // Get distance between two landmarks (for scaling)
    function getDistance(idx1, idx2, canvasWidth, canvasHeight) {
        const p1 = getLandmarkPos(idx1, canvasWidth, canvasHeight);
        const p2 = getLandmarkPos(idx2, canvasWidth, canvasHeight);
        if (!p1 || !p2) return 0;
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    return {
        init,
        initSimulation,
        enumerateCameras,
        autoSelectCamera,
        setCamera,
        switchCamera,
        getAvailableCameras,
        getSelectedDeviceId,
        getLane,
        getLaneIndex,
        getLandmarks,
        getIsReady,
        isSimulation: isSimulationMode,
        setOnResults,
        getLandmarkPos,
        getMidpoint,
        getDistance,
        setSimLane,
        NUM_LANES,
        LANE_NAMES,
        LANE_POSITIONS
    };
})();
