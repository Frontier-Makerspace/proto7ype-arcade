// Player count selection
var selectedPlayerCount = 1;

function selectPlayers(count) {
    selectedPlayerCount = count;
    var opt1 = document.getElementById('opt1p');
    var opt2 = document.getElementById('opt2p');
    if (opt1) { opt1.classList.toggle('selected', count === 1); }
    if (opt2) { opt2.classList.toggle('selected', count === 2); }
}

// Main Game Controller - 2-Player Split-Screen Co-op
const Game = {
    scene: null,
    camera1: null,
    camera2: null,
    renderer: null,
    clock: null,
    score: 0,
    wave: 1,
    waveDelay: 3,
    waveTimer: 0,
    isRunning: false,
    state: 'title',
    dustParticles: [],
    playerCount: 1,

    init: function() {
        this.scene = new THREE.Scene();

        // Two cameras for split-screen
        var halfAspect = (window.innerWidth / 2) / window.innerHeight;
        this.camera1 = new THREE.PerspectiveCamera(70, halfAspect, 0.1, 200);
        this.camera2 = new THREE.PerspectiveCamera(70, halfAspect, 0.1, 200);
        this.scene.add(this.camera1);
        this.scene.add(this.camera2);

        var canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(0.5);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.setScissorTest(true);

        // Lighting
        var ambient = new THREE.AmbientLight(0xDEB887, 0.6);
        this.scene.add(ambient);

        var sun = new THREE.DirectionalLight(0xFFE4B5, 0.8);
        sun.position.set(30, 50, -40);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 512;
        sun.shadow.mapSize.height = 512;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.scene.add(sun);

        var fill = new THREE.DirectionalLight(0xFFAA66, 0.3);
        fill.position.set(-20, 20, 30);
        this.scene.add(fill);

        this.clock = new THREE.Clock();
        World.build(this.scene);
        this.createDustParticles();
        HUD.init();
        AudioManager.init();

        var self = this;
        window.addEventListener('resize', function() {
            if (self.playerCount === 1) {
                self.camera1.aspect = window.innerWidth / window.innerHeight;
            } else {
                var halfAspect = (window.innerWidth / 2) / window.innerHeight;
                self.camera1.aspect = halfAspect;
                self.camera2.aspect = halfAspect;
                self.camera2.updateProjectionMatrix();
            }
            self.camera1.updateProjectionMatrix();
            self.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.getElementById('start-btn').addEventListener('click', function() {
            self.startGame();
        });
        document.getElementById('restart-btn').addEventListener('click', function() {
            self.restartGame();
        });

        document.addEventListener('keydown', function(e) {
            if (self.state === 'title') {
                if (e.code === 'ArrowLeft') selectPlayers(1);
                if (e.code === 'ArrowRight') selectPlayers(2);
            }
            if (e.code === 'Enter' || e.code === 'Space') {
                if (self.state === 'title') { e.preventDefault(); self.startGame(); }
                else if (self.state === 'gameover') { e.preventDefault(); self.restartGame(); }
            }
            if (e.code === 'Escape' && (self.state === 'title' || self.state === 'gameover')) {
                window.location.href = 'index.html';
            }
        });

        this.animate();
    },

    createDustParticles: function() {
        var dustGeo = new THREE.BufferGeometry();
        var positions = [];
        for (var i = 0; i < 200; i++) {
            positions.push((Math.random() - 0.5) * 80, Math.random() * 3, (Math.random() - 0.5) * 80);
        }
        dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        var dustMat = new THREE.PointsMaterial({ color: 0xDEB887, size: 0.15, transparent: true, opacity: 0.4 });
        var dust = new THREE.Points(dustGeo, dustMat);
        dust.userData.isDust = true;
        this.scene.add(dust);
        this.dustParticles.push(dust);
    },

    startGame: function() {
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('game-over').style.display = 'none';

        AudioManager.resume();

        this.playerCount = selectedPlayerCount;

        // Update camera aspect ratios based on mode
        if (this.playerCount === 1) {
            this.camera1.aspect = window.innerWidth / window.innerHeight;
            this.camera1.updateProjectionMatrix();
        } else {
            var halfAspect = (window.innerWidth / 2) / window.innerHeight;
            this.camera1.aspect = halfAspect;
            this.camera1.updateProjectionMatrix();
            this.camera2.aspect = halfAspect;
            this.camera2.updateProjectionMatrix();
        }

        // Create players
        Player1 = createPlayer(1, this.camera1);
        Player = Player1;

        if (this.playerCount === 2) {
            Player2 = createPlayer(2, this.camera2);
            Players = [Player1, Player2];
            Player2.init();
        } else {
            Player2 = null;
            Players = [Player1];
        }

        Player1.init();
        // In 1P mode, spawn at center
        if (this.playerCount === 1) {
            Player1.position.set(0, Player1.height, 20);
            Player1.rotation.y = 0;
        }

        // Init weapons
        Weapons.init(this.scene);
        Weapons.initForPlayer(Player1);
        if (this.playerCount === 2) {
            Weapons.initForPlayer(Player2);
        }

        Enemies.init(this.scene);

        this.score = 0;
        this.wave = 1;
        this.isRunning = true;
        this.state = 'playing';

        HUD.show();
        HUD.updateScore(0);
        HUD.updateWave(1);
        HUD.updateHealth(1, Player1.health, Player1.maxHealth);
        HUD.updateAmmo(1, 6, 6);
        HUD.showPlayerDead(1, false);

        // Show/hide P2 HUD and split line
        var p1hud = document.querySelector('.p1-hud');
        var p2hud = document.querySelector('.p2-hud');
        var splitLine = document.getElementById('split-line');
        if (this.playerCount === 2) {
            if (p1hud) p1hud.style.width = '50%';
            if (p2hud) p2hud.style.display = 'block';
            if (splitLine) splitLine.style.display = 'block';
            HUD.updateHealth(2, Player2.health, Player2.maxHealth);
            HUD.updateAmmo(2, 6, 6);
            HUD.showPlayerDead(2, false);
        } else {
            if (p1hud) p1hud.style.width = '100%';
            if (p2hud) p2hud.style.display = 'none';
            if (splitLine) splitLine.style.display = 'none';
        }

        this.startWave();
    },

    restartGame: function() {
        Enemies.reset();
        if (Player1) Player1.reset();
        if (Player2) Player2.reset();
        Weapons.reset();
        this.startGame();
    },

    startWave: function() {
        var enemyCount = Math.min(2 + Math.floor(this.wave * 1.3), 12);
        if (this.wave % 5 === 0) enemyCount = Math.min(enemyCount + 1, 12);

        HUD.showWaveBanner(this.wave);
        HUD.updateWave(this.wave);
        AudioManager.playWaveStart();

        var self = this;
        setTimeout(function() { Enemies.spawnWave(enemyCount); }, 1500);
    },

    addScore: function(points) {
        this.score += points;
        HUD.updateScore(this.score);
    },

    gameOver: function() {
        this.isRunning = false;
        this.state = 'gameover';
        HUD.hide();

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-wave').textContent = this.wave;
        document.getElementById('game-over').style.display = 'flex';
    },

    checkAllDead: function() {
        var allDead = true;
        for (var i = 0; i < Players.length; i++) {
            if (!Players[i].isDead) { allDead = false; }
            else { HUD.showPlayerDead(Players[i].playerNum, true); }
        }
        return allDead;
    },

    updateDust: function(delta) {
        for (var i = 0; i < this.dustParticles.length; i++) {
            var dust = this.dustParticles[i];
            var positions = dust.geometry.attributes.position.array;
            for (var j = 0; j < positions.length; j += 3) {
                positions[j] += 0.5 * delta;
                positions[j + 1] += Math.sin(Date.now() * 0.001 + j) * 0.01;
                if (positions[j] > 40) positions[j] = -40;
                if (positions[j + 1] > 3) positions[j + 1] = 0;
                if (positions[j + 1] < 0) positions[j + 1] = 3;
            }
            dust.geometry.attributes.position.needsUpdate = true;
        }
    },

    updateTumbleweeds: function(delta) {
        this.scene.traverse(function(obj) {
            if (obj.userData.tumbleweed) {
                obj.position.x += 1.5 * delta;
                obj.rotation.x += 2 * delta;
                obj.rotation.z += 1 * delta;
                if (obj.position.x > 45) obj.position.x = -45;
            }
        });
    },

    animate: function() {
        var self = this;
        requestAnimationFrame(function() { self.animate(); });

        var delta = Math.min(self.clock.getDelta(), 0.05);

        if (typeof ArcadeGamepad !== 'undefined') {
            ArcadeGamepad.update(delta);
        }

        if (self.state === 'playing' && self.isRunning) {
            if (Player1 && !Player1.isDead) Player1.update(delta);
            if (Player2 && !Player2.isDead) Player2.update(delta);
            Weapons.update(delta);
            Enemies.update(delta);

            if (self.checkAllDead()) {
                self.gameOver();
            }

            if (Enemies.getAliveCount() === 0 && self.isRunning) {
                self.waveTimer += delta;
                if (self.waveTimer >= self.waveDelay) {
                    self.waveTimer = 0;
                    self.wave++;
                    self.startWave();
                }
            } else {
                self.waveTimer = 0;
            }
        }

        self.updateDust(delta);
        self.updateTumbleweeds(delta);

        // Rendering
        var w = window.innerWidth;
        var h = window.innerHeight;

        if (self.playerCount === 1) {
            // Full screen - single player
            self.renderer.setViewport(0, 0, w, h);
            self.renderer.setScissor(0, 0, w, h);
            self.renderer.render(self.scene, self.camera1);
        } else {
            // Split-screen - two players
            var halfW = Math.floor(w / 2);
            self.renderer.setViewport(0, 0, halfW, h);
            self.renderer.setScissor(0, 0, halfW, h);
            self.renderer.render(self.scene, self.camera1);

            self.renderer.setViewport(halfW, 0, w - halfW, h);
            self.renderer.setScissor(halfW, 0, w - halfW, h);
            self.renderer.render(self.scene, self.camera2);
        }
    }
};

window.addEventListener('load', function() {
    Game.init();
});
