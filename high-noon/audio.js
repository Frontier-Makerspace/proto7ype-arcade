// Audio Manager - Procedural sound effects using Web Audio API
const AudioManager = {
    ctx: null,
    enabled: true,

    init: function() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            this.enabled = false;
            console.log('Web Audio not supported');
        }
    },

    resume: function() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playShoot: function() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        var ctx = this.ctx;
        var now = ctx.currentTime;

        // Gunshot - noise burst + low thump
        var bufferSize = ctx.sampleRate * 0.15;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
        }

        var noise = ctx.createBufferSource();
        noise.buffer = buffer;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.1);

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);

        // Low thump
        var osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        var oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    },

    playEnemyShoot: function() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        var ctx = this.ctx;
        var now = ctx.currentTime;

        var bufferSize = ctx.sampleRate * 0.1;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.03));
        }

        var noise = ctx.createBufferSource();
        noise.buffer = buffer;

        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 2;

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.1);
    },

    playReload: function() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        var ctx = this.ctx;
        var now = ctx.currentTime;

        // Click sounds for reload
        for (var i = 0; i < 3; i++) {
            var t = now + i * 0.3;
            var osc = ctx.createOscillator();
            osc.frequency.setValueAtTime(800 + i * 200, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.05);
        }

        // Final click
        var osc2 = ctx.createOscillator();
        osc2.frequency.setValueAtTime(1200, now + 1.2);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 1.25);
        var gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.2, now + 1.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 1.2);
        osc2.stop(now + 1.3);
    },

    playEnemyDeath: function() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        var ctx = this.ctx;
        var now = ctx.currentTime;

        // Thud sound
        var osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    },

    playWaveStart: function() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        var ctx = this.ctx;
        var now = ctx.currentTime;

        // Dramatic chord
        var freqs = [220, 277, 330];
        for (var i = 0; i < freqs.length; i++) {
            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freqs[i];
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.5);
        }
    }
};
