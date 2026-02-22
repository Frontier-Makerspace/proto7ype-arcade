// Arcade Gamepad Controller for High Noon - 2-Player Co-op
// Proto7ype Arcade Cabinet Button Mapping:
// Gamepad 0: BTN2=COIN, BTN3=START, BTN4=DOWN, BTN5=LEFT, BTN6=RIGHT, BTN7=UP, BTN8=ACTION1, BTN9=ACTION2
// Gamepad 1: BTN4=DOWN, BTN5=LEFT, BTN6=RIGHT, BTN7=UP, BTN8=ACTION1(or 1P SELECT), BTN9=ACTION2(or 2P SELECT)
// Axis 0 = Joystick X, Axis 1 = Joystick Y

var ArcadeGamepad = {
    coinPressed: false,
    startPressed: false,
    p1ShootPressed: false,
    p1ReloadPressed: false,
    p2ShootPressed: false,
    p2ReloadPressed: false,
    p1SelectPressed: false,
    p2SelectPressed: false,
    turnSpeed: 2.5,

    update: function(delta) {
        var gp0 = navigator.getGamepads()[0];
        var gp1 = navigator.getGamepads()[1];

        if (gp0) {
            this.handleMenuButtons(gp0, gp1);
            if (Game.state === 'playing' && Game.isRunning) {
                this.handlePlayerInput(gp0, 1, delta);
            }
        }

        if (gp1) {
            // 1P/2P SELECT buttons on Gamepad 1
            if (Game.state === 'title') {
                if (this.btn(gp1, 8) && !this.p1SelectPressed) {
                    this.p1SelectPressed = true;
                    selectPlayers(1);
                } else if (!this.btn(gp1, 8)) {
                    this.p1SelectPressed = false;
                }
                if (this.btn(gp1, 9) && !this.p2SelectPressed) {
                    this.p2SelectPressed = true;
                    selectPlayers(2);
                } else if (!this.btn(gp1, 9)) {
                    this.p2SelectPressed = false;
                }
            }

            // gp1 btn8 can also start game (after selecting)
            if (this.btn(gp1, 8) && !this.startPressed) {
                this.startPressed = true;
                if (Game.state === 'gameover') Game.restartGame();
            } else if (!this.btn(gp1, 8) && !(gp0 && this.btn(gp0, 3))) {
                this.startPressed = false;
            }

            // P2 gameplay controls
            if (Game.state === 'playing' && Game.isRunning && Game.playerCount === 2) {
                this.handlePlayerInput(gp1, 2, delta);
            }
        }
    },

    handleMenuButtons: function(gp0, gp1) {
        // COIN (BTN 2) - Return to arcade menu
        if (this.btn(gp0, 2) && !this.coinPressed) {
            this.coinPressed = true;
            if (Game.state === 'title' || Game.state === 'gameover') {
                window.location.href = 'index.html';
            }
        } else if (!this.btn(gp0, 2)) {
            this.coinPressed = false;
        }

        // START (BTN 3) - Start/Restart game
        if (this.btn(gp0, 3) && !this.startPressed) {
            this.startPressed = true;
            if (Game.state === 'title') Game.startGame();
            else if (Game.state === 'gameover') Game.restartGame();
        } else if (!this.btn(gp0, 3)) {
            var gp1start = gp1 && this.btn(gp1, 8);
            if (!gp1start) this.startPressed = false;
        }
    },

    handlePlayerInput: function(gp, playerNum, delta) {
        var player = Players[playerNum - 1];
        if (!player || player.isDead) return;

        // Movement
        var axisX = gp.axes[0] || 0;
        var axisY = gp.axes[1] || 0;
        var dead = 0.3;

        // Joystick X = Turn
        if (Math.abs(axisX) > dead) {
            player.rotation.y -= axisX * this.turnSpeed * delta;
        }

        // Joystick Y = Forward/Back
        if (axisY < -dead) { player.keys.w = true; player.keys.s = false; }
        else if (axisY > dead) { player.keys.s = true; player.keys.w = false; }
        else {
            if (!this.btn(gp, 7)) player.keys.w = false;
            if (!this.btn(gp, 4)) player.keys.s = false;
        }

        if (this.btn(gp, 7)) player.keys.w = true;
        if (this.btn(gp, 4)) player.keys.s = true;
        player.keys.a = this.btn(gp, 5);
        player.keys.d = this.btn(gp, 6);

        // Actions
        var shootKey = playerNum === 1 ? 'p1ShootPressed' : 'p2ShootPressed';
        var reloadKey = playerNum === 1 ? 'p1ReloadPressed' : 'p2ReloadPressed';

        if (this.btn(gp, 8) && !this[shootKey]) {
            this[shootKey] = true;
            Weapons.shootForPlayer(playerNum);
        } else if (!this.btn(gp, 8)) {
            this[shootKey] = false;
        }

        if (this.btn(gp, 9) && !this[reloadKey]) {
            this[reloadKey] = true;
            var inst = WeaponInstances[playerNum];
            if (inst && !inst.isReloading) {
                Weapons.startReloadForPlayer(playerNum);
            }
        } else if (!this.btn(gp, 9)) {
            this[reloadKey] = false;
        }

        // Auto-aim for this player
        this.handleAutoAim(player, delta);
    },

    btn: function(gp, index) {
        return gp && gp.buttons[index] && gp.buttons[index].pressed;
    },

    handleAutoAim: function(player, delta) {
        if (player.isDead || !Game.isRunning) return;

        var bestEnemy = null;
        var bestScore = Infinity;
        var playerPos = player.position;
        var playerDir = new THREE.Vector3(0, 0, -1);
        playerDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

        for (var i = 0; i < Enemies.enemies.length; i++) {
            var enemy = Enemies.enemies[i];
            if (!enemy.alive) continue;

            var enemyPos = enemy.group.position.clone();
            enemyPos.y += 1.3 * enemy.typeDef.scale;

            var toEnemy = new THREE.Vector3();
            toEnemy.subVectors(enemyPos, playerPos);
            var dist = toEnemy.length();
            if (dist > 50) continue;

            toEnemy.normalize();
            var dot = playerDir.dot(toEnemy);
            if (dot < 0.2) continue;

            var score = dist * (2 - dot);
            if (score < bestScore) {
                bestScore = score;
                bestEnemy = enemy;
            }
        }

        if (bestEnemy) {
            var targetPos = bestEnemy.group.position.clone();
            targetPos.y += 1.4 * bestEnemy.typeDef.scale;

            var toTarget = new THREE.Vector3();
            toTarget.subVectors(targetPos, playerPos);

            var targetAngleY = Math.atan2(-toTarget.x, -toTarget.z);
            var horizDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z);
            var targetAngleX = Math.atan2(toTarget.y - player.height, horizDist);

            var aimSpeed = 3.0 * delta;
            var diffY = targetAngleY - player.rotation.y;
            while (diffY > Math.PI) diffY -= Math.PI * 2;
            while (diffY < -Math.PI) diffY += Math.PI * 2;

            player.rotation.y += diffY * aimSpeed;
            player.rotation.x += (targetAngleX - player.rotation.x) * aimSpeed;
            player.rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, player.rotation.x));

            HUD.showAimLock(player.playerNum, true);
        } else {
            player.rotation.x *= (1 - 2 * delta);
            HUD.showAimLock(player.playerNum, false);
        }
    }
};
