// HUD Manager - 2-Player Split-Screen Co-op Version
const HUD = {
    elements: {},

    init: function() {
        this.elements = {
            hud: document.getElementById('hud'),
            // P1 elements (left side)
            p1HealthFill: document.getElementById('p1-health-fill'),
            p1HealthText: document.getElementById('p1-health-text'),
            p1AmmoCurrent: document.getElementById('p1-ammo-current'),
            p1AmmoMax: document.getElementById('p1-ammo-max'),
            p1Crosshair: document.getElementById('p1-crosshair'),
            p1DamageOverlay: document.getElementById('p1-damage-overlay'),
            p1HitMarker: document.getElementById('p1-hit-marker'),
            p1HeadshotMarker: document.getElementById('p1-headshot-marker'),
            p1ReloadPrompt: document.getElementById('p1-reload-prompt'),
            p1AimIndicator: document.getElementById('p1-aim-indicator'),
            p1DeadOverlay: document.getElementById('p1-dead-overlay'),
            // P2 elements (right side)
            p2HealthFill: document.getElementById('p2-health-fill'),
            p2HealthText: document.getElementById('p2-health-text'),
            p2AmmoCurrent: document.getElementById('p2-ammo-current'),
            p2AmmoMax: document.getElementById('p2-ammo-max'),
            p2Crosshair: document.getElementById('p2-crosshair'),
            p2DamageOverlay: document.getElementById('p2-damage-overlay'),
            p2HitMarker: document.getElementById('p2-hit-marker'),
            p2HeadshotMarker: document.getElementById('p2-headshot-marker'),
            p2ReloadPrompt: document.getElementById('p2-reload-prompt'),
            p2AimIndicator: document.getElementById('p2-aim-indicator'),
            p2DeadOverlay: document.getElementById('p2-dead-overlay'),
            // Shared
            score: document.getElementById('score'),
            waveNum: document.getElementById('wave-num')
        };
    },

    show: function() {
        this.elements.hud.style.display = 'block';
    },

    hide: function() {
        this.elements.hud.style.display = 'none';
    },

    getPrefix: function(pn) { return pn === 1 ? 'p1' : 'p2'; },

    updateHealth: function(playerNum, current, max) {
        var pre = this.getPrefix(playerNum);
        var fill = this.elements[pre + 'HealthFill'];
        var text = this.elements[pre + 'HealthText'];
        if (!fill || !text) return;

        var pct = (current / max) * 100;
        fill.style.width = pct + '%';
        text.textContent = Math.ceil(current);

        if (pct > 60) {
            fill.style.background = 'linear-gradient(90deg, #8B0000, #FF0000)';
            fill.style.animation = 'none';
        } else if (pct > 30) {
            fill.style.background = 'linear-gradient(90deg, #8B4500, #FF8C00)';
            fill.style.animation = 'none';
        } else {
            fill.style.background = 'linear-gradient(90deg, #8B0000, #FF0000)';
            fill.style.animation = 'blink 0.5s infinite';
        }
    },

    updateAmmo: function(playerNum, current, max) {
        var pre = this.getPrefix(playerNum);
        var cur = this.elements[pre + 'AmmoCurrent'];
        var mx = this.elements[pre + 'AmmoMax'];
        if (cur) cur.textContent = current;
        if (mx) mx.textContent = max;
    },

    updateScore: function(score) {
        if (this.elements.score) this.elements.score.textContent = score;
    },

    updateWave: function(wave) {
        if (this.elements.waveNum) this.elements.waveNum.textContent = wave;
    },

    showReload: function(playerNum, show) {
        var pre = this.getPrefix(playerNum);
        var el = this.elements[pre + 'ReloadPrompt'];
        if (el) el.style.display = show ? 'block' : 'none';
    },

    showDamage: function(playerNum) {
        var pre = this.getPrefix(playerNum);
        var overlay = this.elements[pre + 'DamageOverlay'];
        if (!overlay) return;
        overlay.style.opacity = '0.8';
        setTimeout(function() { overlay.style.opacity = '0'; }, 200);
    },

    showHitMarker: function(playerNum) {
        var pre = this.getPrefix(playerNum || 1);
        var marker = this.elements[pre + 'HitMarker'];
        if (!marker) return;
        marker.style.display = 'block';
        marker.style.color = '#FF0000';
        marker.textContent = '✕';
        setTimeout(function() { marker.style.display = 'none'; }, 150);
    },

    showHeadshotMarker: function(playerNum) {
        var pre = this.getPrefix(playerNum || 1);
        var marker = this.elements[pre + 'HitMarker'];
        if (marker) {
            marker.style.display = 'block';
            marker.style.color = '#FFD700';
            marker.textContent = '☠';
            setTimeout(function() { marker.style.display = 'none'; }, 250);
        }
        var hs = this.elements[pre + 'HeadshotMarker'];
        if (hs) {
            hs.style.display = 'block';
            hs.style.opacity = '1';
            setTimeout(function() {
                hs.style.opacity = '0';
                setTimeout(function() { hs.style.display = 'none'; }, 300);
            }, 600);
        }
    },

    showAimLock: function(playerNum, locked) {
        var pre = this.getPrefix(playerNum);
        var indicator = this.elements[pre + 'AimIndicator'];
        if (indicator) {
            indicator.style.display = locked ? 'block' : 'none';
            indicator.style.borderColor = locked ? 'rgba(255,0,0,0.8)' : 'rgba(255,0,0,0.3)';
        }
    },

    showPlayerDead: function(playerNum, show) {
        var pre = this.getPrefix(playerNum);
        var overlay = this.elements[pre + 'DeadOverlay'];
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    },

    updateCrosshairSpread: function(spreadRatio) {
        // Update both crosshairs
        for (var pn = 1; pn <= 2; pn++) {
            var pre = this.getPrefix(pn);
            var ch = this.elements[pre + 'Crosshair'];
            if (!ch) continue;
            var baseSize = 24;
            var maxExtra = 16;
            var size = baseSize + spreadRatio * maxExtra;
            ch.style.fontSize = size + 'px';
            ch.style.opacity = 0.8 - spreadRatio * 0.2;
        }
    },

    showWaveBanner: function(waveNum) {
        var banner = document.getElementById('wave-banner');
        var bannerWave = document.getElementById('banner-wave');
        var subtitle = document.getElementById('banner-subtitle');

        bannerWave.textContent = waveNum;

        var subtitles = [
            "They're comin'...", "More outlaws!", "Hold your ground!",
            "It ain't over yet!", "Here they come again!", "Stand tall, partners!",
            "Draw!", "No mercy!", "The whole gang's here!", "Wanted: Dead or Alive!"
        ];

        if (waveNum % 5 === 0) {
            subtitle.textContent = "⚠ BOSS INCOMING ⚠";
        } else {
            subtitle.textContent = subtitles[Math.min(waveNum - 1, subtitles.length - 1)] || subtitles[subtitles.length - 1];
        }

        banner.style.display = 'block';
        banner.style.opacity = '1';

        setTimeout(function() {
            banner.style.opacity = '0';
            setTimeout(function() { banner.style.display = 'none'; }, 500);
        }, 2000);
    }
};
