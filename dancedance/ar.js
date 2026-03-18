// ===== AR OVERLAY MODULE =====
// Draws wealthy-person accessories on tracked body landmarks

const AROverlay = (() => {
    // Wealth levels - unlock more bling as combo increases
    const WEALTH_LEVELS = [
        { name: '💼 Intern', minCombo: 0, accessories: [] },
        { name: '🕶️ Hustler', minCombo: 3, accessories: ['sunglasses'] },
        { name: '👔 Manager', minCombo: 8, accessories: ['sunglasses', 'chain'] },
        { name: '🎩 Executive', minCombo: 15, accessories: ['sunglasses', 'chain', 'tophat'] },
        { name: '👑 CEO', minCombo: 25, accessories: ['sunglasses', 'chain', 'crown'] },
        { name: '💎 Billionaire', minCombo: 40, accessories: ['sunglasses', 'chain', 'crown', 'moneyrain'] },
        { name: '🏆 GOAT', minCombo: 60, accessories: ['sunglasses', 'chain', 'crown', 'moneyrain', 'aura'] }
    ];

    let currentLevel = 0;
    let moneyParticles = [];
    let sparkleParticles = [];
    let goldAuraIntensity = 0;

    // Money rain particle
    class MoneyParticle {
        constructor(canvasWidth, canvasHeight) {
            this.x = Math.random() * canvasWidth;
            this.y = -30;
            this.speed = 2 + Math.random() * 3;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.1;
            this.size = 20 + Math.random() * 15;
            this.opacity = 0.7 + Math.random() * 0.3;
            this.symbol = Math.random() > 0.5 ? '💵' : '💰';
            this.canvasHeight = canvasHeight;
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.03;
        }

        update() {
            this.y += this.speed;
            this.rotation += this.rotSpeed;
            this.wobble += this.wobbleSpeed;
            this.x += Math.sin(this.wobble) * 0.8;
            return this.y < this.canvasHeight + 50;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.font = `${this.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.symbol, 0, 0);
            ctx.restore();
        }
    }

    // Sparkle particle for gold aura
    class SparkleParticle {
        constructor(x, y) {
            this.x = x + (Math.random() - 0.5) * 100;
            this.y = y + (Math.random() - 0.5) * 150;
            this.life = 1.0;
            this.decay = 0.02 + Math.random() * 0.03;
            this.size = 2 + Math.random() * 4;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2 - 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
            return this.life > 0;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = this.life * 0.8;
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;

            // Draw a 4-point star
            ctx.beginPath();
            const s = this.size;
            ctx.moveTo(this.x, this.y - s);
            ctx.lineTo(this.x + s * 0.3, this.y - s * 0.3);
            ctx.lineTo(this.x + s, this.y);
            ctx.lineTo(this.x + s * 0.3, this.y + s * 0.3);
            ctx.lineTo(this.x, this.y + s);
            ctx.lineTo(this.x - s * 0.3, this.y + s * 0.3);
            ctx.lineTo(this.x - s, this.y);
            ctx.lineTo(this.x - s * 0.3, this.y - s * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function getWealthLevel(combo) {
        let level = 0;
        for (let i = WEALTH_LEVELS.length - 1; i >= 0; i--) {
            if (combo >= WEALTH_LEVELS[i].minCombo) {
                level = i;
                break;
            }
        }
        currentLevel = level;
        return WEALTH_LEVELS[level];
    }

    function getWealthLevelName(combo) {
        return getWealthLevel(combo).name;
    }

    function drawAccessories(ctx, combo, canvasWidth, canvasHeight) {
        const level = getWealthLevel(combo);
        const accessories = level.accessories;

        if (accessories.length === 0) return;

        // Get key body positions
        const nose = PoseDetector.getLandmarkPos(0, canvasWidth, canvasHeight);
        const leftEye = PoseDetector.getLandmarkPos(2, canvasWidth, canvasHeight);
        const rightEye = PoseDetector.getLandmarkPos(5, canvasWidth, canvasHeight);
        const leftShoulder = PoseDetector.getLandmarkPos(11, canvasWidth, canvasHeight);
        const rightShoulder = PoseDetector.getLandmarkPos(12, canvasWidth, canvasHeight);
        const leftEar = PoseDetector.getLandmarkPos(7, canvasWidth, canvasHeight);
        const rightEar = PoseDetector.getLandmarkPos(8, canvasWidth, canvasHeight);

        if (!nose || !leftEye || !rightEye) return;

        const eyeDistance = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
        const headScale = eyeDistance / 60; // Normalize scale

        // Draw each accessory
        if (accessories.includes('sunglasses')) {
            drawSunglasses(ctx, leftEye, rightEye, eyeDistance, headScale);
        }

        if (accessories.includes('chain') && leftShoulder && rightShoulder) {
            drawGoldChain(ctx, leftShoulder, rightShoulder, nose);
        }

        if (accessories.includes('tophat')) {
            drawTopHat(ctx, nose, leftEye, rightEye, eyeDistance, headScale);
        }

        if (accessories.includes('crown')) {
            drawCrown(ctx, nose, leftEye, rightEye, eyeDistance, headScale);
        }

        if (accessories.includes('moneyrain')) {
            updateMoneyRain(ctx, canvasWidth, canvasHeight);
        }

        if (accessories.includes('aura') && leftShoulder && rightShoulder) {
            const torsoCenter = PoseDetector.getMidpoint(11, 12, canvasWidth, canvasHeight);
            if (torsoCenter) {
                updateGoldAura(ctx, torsoCenter, canvasWidth, canvasHeight);
            }
        }
    }

    function drawSunglasses(ctx, leftEye, rightEye, eyeDistance, scale) {
        const centerX = (leftEye.x + rightEye.x) / 2;
        const centerY = (leftEye.y + rightEye.y) / 2;
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        const lensW = eyeDistance * 0.6;
        const lensH = eyeDistance * 0.4;
        const gap = eyeDistance * 0.12;

        // Frame
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3 * scale;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';

        // Left lens
        ctx.beginPath();
        roundRect(ctx, -eyeDistance / 2 - lensW * 0.1, -lensH / 2, lensW, lensH, 5 * scale);
        ctx.fill();
        ctx.stroke();

        // Right lens
        ctx.beginPath();
        roundRect(ctx, gap, -lensH / 2, lensW, lensH, 5 * scale);
        ctx.fill();
        ctx.stroke();

        // Bridge
        ctx.beginPath();
        ctx.moveTo(-gap, 0);
        ctx.lineTo(gap, 0);
        ctx.stroke();

        // Gold shine on lenses
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.beginPath();
        roundRect(ctx, -eyeDistance / 2 - lensW * 0.1, -lensH / 2, lensW * 0.4, lensH * 0.5, 3 * scale);
        ctx.fill();

        ctx.restore();
    }

    function drawGoldChain(ctx, leftShoulder, rightShoulder, nose) {
        const midX = (leftShoulder.x + rightShoulder.x) / 2;
        const midY = (leftShoulder.y + rightShoulder.y) / 2;
        const shoulderDist = Math.sqrt(
            (rightShoulder.x - leftShoulder.x) ** 2 +
            (rightShoulder.y - leftShoulder.y) ** 2
        );

        ctx.save();

        // Chain links
        const chainLength = 12;
        const chainRadius = shoulderDist * 0.03;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;

        // Draw chain as a curved necklace
        for (let i = 0; i < chainLength; i++) {
            const t = i / (chainLength - 1);
            const x = leftShoulder.x + (rightShoulder.x - leftShoulder.x) * t;
            const sag = Math.sin(t * Math.PI) * shoulderDist * 0.15;
            const y = midY + sag;

            ctx.beginPath();
            ctx.arc(x, y, chainRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#ffaa00';
            ctx.fill();
            ctx.stroke();
        }

        // Dollar sign pendant
        const pendantX = midX;
        const pendantY = midY + shoulderDist * 0.2;
        const pendantSize = shoulderDist * 0.12;

        // Pendant circle
        ctx.beginPath();
        ctx.arc(pendantX, pendantY, pendantSize, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dollar sign
        ctx.fillStyle = '#000';
        ctx.font = `bold ${pendantSize * 1.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', pendantX, pendantY);

        ctx.restore();
    }

    function drawTopHat(ctx, nose, leftEye, rightEye, eyeDistance, scale) {
        const centerX = (leftEye.x + rightEye.x) / 2;
        const topY = Math.min(leftEye.y, rightEye.y) - eyeDistance * 1.2;
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        const hatWidth = eyeDistance * 1.8;
        const hatHeight = eyeDistance * 1.5;
        const brimWidth = eyeDistance * 2.4;
        const brimHeight = eyeDistance * 0.2;

        ctx.save();
        ctx.translate(centerX, topY);
        ctx.rotate(angle);

        // Hat body
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-hatWidth / 2, -hatHeight, hatWidth, hatHeight);
        ctx.fill();
        ctx.stroke();

        // Brim
        ctx.beginPath();
        ctx.ellipse(0, 0, brimWidth / 2, brimHeight, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.stroke();

        // Gold band
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-hatWidth / 2, -hatHeight * 0.25, hatWidth, hatHeight * 0.12);

        ctx.restore();
    }

    function drawCrown(ctx, nose, leftEye, rightEye, eyeDistance, scale) {
        const centerX = (leftEye.x + rightEye.x) / 2;
        const topY = Math.min(leftEye.y, rightEye.y) - eyeDistance * 1.0;
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

        const crownWidth = eyeDistance * 2.0;
        const crownHeight = eyeDistance * 0.9;

        ctx.save();
        ctx.translate(centerX, topY);
        ctx.rotate(angle);

        // Crown body
        ctx.beginPath();
        ctx.moveTo(-crownWidth / 2, 0);
        ctx.lineTo(-crownWidth / 2, -crownHeight * 0.4);
        ctx.lineTo(-crownWidth * 0.3, -crownHeight * 0.15);
        ctx.lineTo(-crownWidth * 0.15, -crownHeight);
        ctx.lineTo(0, -crownHeight * 0.4);
        ctx.lineTo(crownWidth * 0.15, -crownHeight);
        ctx.lineTo(crownWidth * 0.3, -crownHeight * 0.15);
        ctx.lineTo(crownWidth / 2, -crownHeight * 0.4);
        ctx.lineTo(crownWidth / 2, 0);
        ctx.closePath();

        // Gold gradient
        const grad = ctx.createLinearGradient(0, 0, 0, -crownHeight);
        grad.addColorStop(0, '#b8860b');
        grad.addColorStop(0.5, '#ffd700');
        grad.addColorStop(1, '#ffed4a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Jewels
        const jewelColors = ['#ff0000', '#0066ff', '#00cc00'];
        const jewelPositions = [
            [-crownWidth * 0.15, -crownHeight * 0.75],
            [0, -crownHeight * 0.25],
            [crownWidth * 0.15, -crownHeight * 0.75]
        ];

        jewelPositions.forEach((pos, i) => {
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], eyeDistance * 0.06, 0, Math.PI * 2);
            ctx.fillStyle = jewelColors[i];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Jewel shine
            ctx.beginPath();
            ctx.arc(pos[0] - 1, pos[1] - 1, eyeDistance * 0.02, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        });

        // Base band
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(-crownWidth / 2, -crownHeight * 0.08, crownWidth, crownHeight * 0.08);

        ctx.restore();
    }

    function updateMoneyRain(ctx, canvasWidth, canvasHeight) {
        // Spawn new particles
        if (Math.random() < 0.3) {
            moneyParticles.push(new MoneyParticle(canvasWidth, canvasHeight));
        }

        // Update and draw
        moneyParticles = moneyParticles.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
        });

        // Cap particles
        if (moneyParticles.length > 50) {
            moneyParticles = moneyParticles.slice(-50);
        }
    }

    function updateGoldAura(ctx, torsoCenter, canvasWidth, canvasHeight) {
        // Spawn sparkles around the body
        if (Math.random() < 0.5) {
            sparkleParticles.push(new SparkleParticle(torsoCenter.x, torsoCenter.y));
        }

        // Update and draw
        sparkleParticles = sparkleParticles.filter(p => {
            const alive = p.update();
            if (alive) p.draw(ctx);
            return alive;
        });

        // Cap particles
        if (sparkleParticles.length > 80) {
            sparkleParticles = sparkleParticles.slice(-80);
        }

        // Gold glow around body
        ctx.save();
        const gradient = ctx.createRadialGradient(
            torsoCenter.x, torsoCenter.y, 20,
            torsoCenter.x, torsoCenter.y, 200
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.05)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    }

    function clearParticles() {
        moneyParticles = [];
        sparkleParticles = [];
        currentLevel = 0;
    }

    // Helper: rounded rectangle
    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    return {
        drawAccessories,
        getWealthLevel,
        getWealthLevelName,
        clearParticles,
        WEALTH_LEVELS
    };
})();
