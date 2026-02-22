// Enemy System - Improved Bandits with Types and AI
const Enemies = {
    scene: null,
    enemies: [],
    nextId: 0,
    baseShootInterval: 2.5,
    difficultyScale: 1,

    // Enemy type definitions
    types: {
        bandit: {
            name: 'Bandit',
            health: 80,
            speed: 3.5,
            damage: 8,
            accuracy: 0.4,
            shootInterval: 2.5,
            scoreValue: 100,
            shirtColors: [0x8B0000, 0x2F4F2F, 0x4A3520],
            hatColor: 0x3D2B1F,
            scale: 1.0
        },
        shotgunner: {
            name: 'Shotgunner',
            health: 120,
            speed: 2.5,
            damage: 18,
            accuracy: 0.55,
            shootInterval: 3.5,
            scoreValue: 150,
            shirtColors: [0x1a1a2e, 0x16213e, 0x0f3460],
            hatColor: 0x222222,
            scale: 1.15
        },
        rifleman: {
            name: 'Rifleman',
            health: 60,
            speed: 2.0,
            damage: 22,
            accuracy: 0.7,
            shootInterval: 3.0,
            scoreValue: 200,
            shirtColors: [0x556B2F, 0x3B5323, 0x4A5D23],
            hatColor: 0x4A3520,
            scale: 1.0
        },
        dynamiter: {
            name: 'Dynamiter',
            health: 70,
            speed: 4.0,
            damage: 30,
            accuracy: 0.35,
            shootInterval: 4.5,
            scoreValue: 250,
            shirtColors: [0x8B0000, 0xA52A2A, 0xB22222],
            hatColor: 0x8B0000,
            scale: 1.0
        },
        boss: {
            name: 'Boss',
            health: 300,
            speed: 2.0,
            damage: 15,
            accuracy: 0.6,
            shootInterval: 1.8,
            scoreValue: 500,
            shirtColors: [0x1a1a1a],
            hatColor: 0x111111,
            scale: 1.4
        }
    },

    init: function(scene) {
        this.scene = scene;
        this.enemies = [];
        this.nextId = 0;
        this.difficultyScale = 1;
    },

    getWaveComposition: function(wave, count) {
        var composition = [];
        // Boss every 5 waves
        if (wave % 5 === 0 && wave > 0) {
            composition.push('boss');
            count--;
        }
        for (var i = 0; i < count; i++) {
            if (wave <= 2) {
                composition.push('bandit');
            } else if (wave <= 4) {
                composition.push(Math.random() < 0.3 ? 'shotgunner' : 'bandit');
            } else if (wave <= 6) {
                var r = Math.random();
                if (r < 0.25) composition.push('rifleman');
                else if (r < 0.5) composition.push('shotgunner');
                else composition.push('bandit');
            } else {
                var r2 = Math.random();
                if (r2 < 0.15) composition.push('dynamiter');
                else if (r2 < 0.35) composition.push('rifleman');
                else if (r2 < 0.55) composition.push('shotgunner');
                else composition.push('bandit');
            }
        }
        return composition;
    },

    spawnWave: function(count) {
        this.difficultyScale = 1 + (Game.wave - 1) * 0.1;
        var composition = this.getWaveComposition(Game.wave, count);
        var spawns = World.spawnPoints.slice();

        for (var i = 0; i < composition.length && spawns.length > 0; i++) {
            var idx = Math.floor(Math.random() * spawns.length);
            var pos = spawns.splice(idx, 1)[0];
            this.spawnEnemy(
                pos.x + (Math.random() - 0.5) * 5,
                pos.z + (Math.random() - 0.5) * 5,
                composition[i]
            );
        }
    },

    spawnEnemy: function(x, z, typeName) {
        var id = this.nextId++;
        var type = this.types[typeName] || this.types.bandit;
        var group = new THREE.Group();

        var skinColor = 0xD2A679;
        var hatColor = type.hatColor;
        var shirtColor = type.shirtColors[Math.floor(Math.random() * type.shirtColors.length)];
        var pantsColor = 0x4A3520;
        var sc = type.scale;

        var mat = function(c) {
            return new THREE.MeshLambertMaterial({ color: c, flatShading: true });
        };

        // Head
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.5 * sc, 0.5 * sc, 0.5 * sc), mat(skinColor));
        head.position.y = 1.65 * sc;
        head.userData.isEnemy = true;
        head.userData.enemyId = id;
        head.userData.isHead = true;
        group.add(head);

        // Hat
        var hatBrim = new THREE.Mesh(new THREE.BoxGeometry(0.8 * sc, 0.06 * sc, 0.8 * sc), mat(hatColor));
        hatBrim.position.y = 1.95 * sc;
        hatBrim.userData.isEnemy = true;
        hatBrim.userData.enemyId = id;
        group.add(hatBrim);

        var hatTop = new THREE.Mesh(new THREE.BoxGeometry(0.45 * sc, 0.3 * sc, 0.45 * sc), mat(hatColor));
        hatTop.position.y = 2.1 * sc;
        hatTop.userData.isEnemy = true;
        hatTop.userData.enemyId = id;
        group.add(hatTop);

        // Body/Torso
        var torso = new THREE.Mesh(new THREE.BoxGeometry(0.6 * sc, 0.7 * sc, 0.35 * sc), mat(shirtColor));
        torso.position.y = 1.15 * sc;
        torso.userData.isEnemy = true;
        torso.userData.enemyId = id;
        group.add(torso);

        // Arms
        var armL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * sc, 0.6 * sc, 0.2 * sc), mat(shirtColor));
        armL.position.set(-0.4 * sc, 1.15 * sc, 0);
        armL.userData.isEnemy = true;
        armL.userData.enemyId = id;
        group.add(armL);

        var armR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * sc, 0.6 * sc, 0.2 * sc), mat(skinColor));
        armR.position.set(0.4 * sc, 1.15 * sc, 0);
        armR.userData.isEnemy = true;
        armR.userData.enemyId = id;
        group.add(armR);

        // Legs
        var legL = new THREE.Mesh(new THREE.BoxGeometry(0.25 * sc, 0.7 * sc, 0.25 * sc), mat(pantsColor));
        legL.position.set(-0.15 * sc, 0.35 * sc, 0);
        legL.userData.isEnemy = true;
        legL.userData.enemyId = id;
        group.add(legL);

        var legR = new THREE.Mesh(new THREE.BoxGeometry(0.25 * sc, 0.7 * sc, 0.25 * sc), mat(pantsColor));
        legR.position.set(0.15 * sc, 0.35 * sc, 0);
        legR.userData.isEnemy = true;
        legR.userData.enemyId = id;
        group.add(legR);

        // Gun in hand - different per type
        var gunColor = 0x333333;
        var gunW = 0.08, gunH = 0.08, gunD = 0.25;
        if (typeName === 'shotgunner') { gunD = 0.4; gunColor = 0x444444; }
        if (typeName === 'rifleman') { gunD = 0.5; gunW = 0.06; }
        if (typeName === 'dynamiter') { gunW = 0.12; gunH = 0.12; gunD = 0.15; gunColor = 0x8B0000; }
        if (typeName === 'boss') { gunD = 0.35; }

        var gun = new THREE.Mesh(new THREE.BoxGeometry(gunW, gunH, gunD), mat(gunColor));
        gun.position.set(0.45 * sc, 1.1 * sc, -0.15 * sc);
        group.add(gun);

        // Dynamiter gets a bandolier (belt of dynamite sticks)
        if (typeName === 'dynamiter') {
            for (var di = 0; di < 3; di++) {
                var stick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mat(0xCC3333));
                stick.position.set(-0.2 + di * 0.15, 1.35 * sc, 0.2 * sc);
                group.add(stick);
            }
        }

        // Boss gets a bandana
        if (typeName === 'boss') {
            var bandana = new THREE.Mesh(new THREE.BoxGeometry(0.55 * sc, 0.15 * sc, 0.3 * sc), mat(0x111111));
            bandana.position.y = 1.5 * sc;
            bandana.position.z = 0.1 * sc;
            group.add(bandana);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Find nearest cover point
        var targetCover = null;
        var minDist = Infinity;
        for (var i = 0; i < World.coverPoints.length; i++) {
            var cp = World.coverPoints[i];
            var d = new THREE.Vector2(cp.x - x, cp.z - z).length();
            if (d < minDist && d > 3) {
                minDist = d;
                targetCover = cp.clone();
            }
        }

        // AI state machine
        this.enemies.push({
            id: id,
            group: group,
            type: typeName,
            typeDef: type,
            health: type.health * (typeName === 'boss' ? 1 : Math.min(1.5, this.difficultyScale)),
            maxHealth: type.health * (typeName === 'boss' ? 1 : Math.min(1.5, this.difficultyScale)),
            state: 'approaching',
            shootTimer: 1.5 + Math.random() * 2,
            targetCover: targetCover,
            speed: type.speed * (0.9 + Math.random() * 0.2),
            alive: true,
            strafeDirTimer: 0,
            strafeDir: Math.random() < 0.5 ? 1 : -1,
            flankSide: Math.random() < 0.5 ? 1 : -1,
            retreatTimer: 0,
            burstCount: 0,
            maxBurst: typeName === 'boss' ? 3 : (typeName === 'shotgunner' ? 1 : 2),
            burstDelay: 0.3,
            burstTimer: 0,
            isBursting: false,
            lastSeenPlayer: null,
            coverTimer: 0,
            peekTimer: 0,
            isPeeking: false,
            dodgeTimer: 2 + Math.random() * 3,
            isDodging: false,
            dodgeDir: 0,
            dodgeDuration: 0
        });
    },

    // Find nearest alive player to an enemy
    getNearestPlayer: function(enemyPos) {
        var best = null;
        var bestDist = Infinity;
        for (var p = 0; p < Players.length; p++) {
            if (Players[p].isDead) continue;
            var d = enemyPos.distanceTo(Players[p].position);
            if (d < bestDist) { bestDist = d; best = Players[p]; }
        }
        return best;
    },

    update: function(delta) {
        for (var i = this.enemies.length - 1; i >= 0; i--) {
            var enemy = this.enemies[i];
            if (!enemy.alive) continue;

            var targetPlayer = this.getNearestPlayer(enemy.group.position);
            if (!targetPlayer) continue; // All players dead
            var playerPos = targetPlayer.position;
            var enemyPos = enemy.group.position;
            var distToPlayer = enemyPos.distanceTo(playerPos);

            // Face the player
            var angle = Math.atan2(
                playerPos.x - enemyPos.x,
                playerPos.z - enemyPos.z
            );
            enemy.group.rotation.y = angle;

            // Update strafe direction timer
            enemy.strafeDirTimer -= delta;
            if (enemy.strafeDirTimer <= 0) {
                enemy.strafeDir *= -1;
                enemy.strafeDirTimer = 1.5 + Math.random() * 2;
            }

            // Dodge timer - enemies occasionally dodge
            enemy.dodgeTimer -= delta;
            if (enemy.dodgeTimer <= 0 && !enemy.isDodging && enemy.state === 'shooting') {
                enemy.isDodging = true;
                enemy.dodgeDir = Math.random() < 0.5 ? -1 : 1;
                enemy.dodgeDuration = 0.3 + Math.random() * 0.2;
                enemy.dodgeTimer = 3 + Math.random() * 4;
            }

            if (enemy.isDodging) {
                var dodgeSpeed = enemy.speed * 3;
                enemyPos.x += Math.cos(angle) * enemy.dodgeDir * dodgeSpeed * delta;
                enemyPos.z -= Math.sin(angle) * enemy.dodgeDir * dodgeSpeed * delta;
                enemy.dodgeDuration -= delta;
                if (enemy.dodgeDuration <= 0) {
                    enemy.isDodging = false;
                }
            }

            if (enemy.state === 'approaching') {
                // Move toward cover or flanking position
                var target;
                if (enemy.targetCover && distToPlayer > 10) {
                    target = enemy.targetCover;
                } else {
                    // Flank the player
                    var flankOffset = new THREE.Vector3(
                        Math.cos(angle + Math.PI / 2) * enemy.flankSide * 8,
                        0,
                        -Math.sin(angle + Math.PI / 2) * enemy.flankSide * 8
                    );
                    target = playerPos.clone().add(flankOffset);
                }

                var dx = target.x - enemyPos.x;
                var dz = target.z - enemyPos.z;
                var dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 2) {
                    var moveX = (dx / dist) * enemy.speed * delta;
                    var moveZ = (dz / dist) * enemy.speed * delta;

                    // Check collision with world
                    var newX = enemyPos.x + moveX;
                    var newZ = enemyPos.z + moveZ;
                    if (!this.checkCollision(newX, newZ, 0.5)) {
                        enemyPos.x = newX;
                        enemyPos.z = newZ;
                    } else {
                        // Try sliding
                        if (!this.checkCollision(newX, enemyPos.z, 0.5)) {
                            enemyPos.x = newX;
                        } else if (!this.checkCollision(enemyPos.x, newZ, 0.5)) {
                            enemyPos.z = newZ;
                        }
                    }

                    // Walking animation
                    var walkBob = Math.sin(Date.now() * 0.01) * 0.05;
                    if (enemy.group.children[6]) enemy.group.children[6].position.y = 0.35 * enemy.typeDef.scale + walkBob;
                    if (enemy.group.children[7]) enemy.group.children[7].position.y = 0.35 * enemy.typeDef.scale - walkBob;
                } else {
                    enemy.state = 'shooting';
                }

                // Start shooting even while approaching if close enough
                if (distToPlayer < 25) {
                    enemy.shootTimer -= delta;
                    if (enemy.shootTimer <= 0) {
                        this.enemyShoot(enemy);
                        enemy.shootTimer = enemy.typeDef.shootInterval * (0.8 + Math.random() * 0.4) / this.difficultyScale;
                    }
                }

            } else if (enemy.state === 'shooting') {
                // Handle burst fire
                if (enemy.isBursting) {
                    enemy.burstTimer -= delta;
                    if (enemy.burstTimer <= 0 && enemy.burstCount > 0) {
                        this.fireShot(enemy);
                        enemy.burstCount--;
                        enemy.burstTimer = enemy.burstDelay;
                        if (enemy.burstCount <= 0) {
                            enemy.isBursting = false;
                        }
                    }
                }

                // Shoot at player
                enemy.shootTimer -= delta;
                if (enemy.shootTimer <= 0 && !enemy.isBursting) {
                    this.enemyShoot(enemy);
                    var interval = enemy.typeDef.shootInterval / Math.min(1.8, this.difficultyScale);
                    enemy.shootTimer = interval * (0.7 + Math.random() * 0.6);
                }

                // Strafe while shooting
                if (!enemy.isDodging) {
                    var strafeSpeed = enemy.speed * 0.4;
                    var sx = Math.cos(angle) * enemy.strafeDir * strafeSpeed * delta;
                    var sz = -Math.sin(angle) * enemy.strafeDir * strafeSpeed * delta;
                    if (!this.checkCollision(enemyPos.x + sx, enemyPos.z + sz, 0.5)) {
                        enemyPos.x += sx;
                        enemyPos.z += sz;
                    }
                }

                // If player gets too close, retreat
                if (distToPlayer < 5 && enemy.type !== 'shotgunner') {
                    enemy.state = 'retreating';
                    enemy.retreatTimer = 1.5;
                }

                // If player gets far, re-approach
                if (distToPlayer > 35) {
                    enemy.state = 'approaching';
                }

            } else if (enemy.state === 'retreating') {
                // Move away from player
                var awayX = enemyPos.x - playerPos.x;
                var awayZ = enemyPos.z - playerPos.z;
                var awayDist = Math.sqrt(awayX * awayX + awayZ * awayZ);
                if (awayDist > 0) {
                    var rx = (awayX / awayDist) * enemy.speed * 1.2 * delta;
                    var rz = (awayZ / awayDist) * enemy.speed * 1.2 * delta;
                    if (!this.checkCollision(enemyPos.x + rx, enemyPos.z + rz, 0.5)) {
                        enemyPos.x += rx;
                        enemyPos.z += rz;
                    }
                }

                // Still shoot while retreating
                enemy.shootTimer -= delta;
                if (enemy.shootTimer <= 0) {
                    this.enemyShoot(enemy);
                    enemy.shootTimer = enemy.typeDef.shootInterval * 1.5;
                }

                enemy.retreatTimer -= delta;
                if (enemy.retreatTimer <= 0 || distToPlayer > 15) {
                    enemy.state = 'shooting';
                }
            }

            // Keep in bounds
            enemyPos.x = Math.max(-44, Math.min(44, enemyPos.x));
            enemyPos.z = Math.max(-44, Math.min(44, enemyPos.z));
        }
    },

    checkCollision: function(x, z, radius) {
        for (var i = 0; i < World.colliders.length; i++) {
            var col = World.colliders[i];
            var box = new THREE.Box3().setFromObject(col);
            var expanded = box.clone().expandByScalar(radius);
            if (expanded.containsPoint(new THREE.Vector3(x, 1, z))) {
                return true;
            }
        }
        return false;
    },

    enemyShoot: function(enemy) {
        // Check if all players dead
        var allDead = true;
        for (var p = 0; p < Players.length; p++) {
            if (!Players[p].isDead) { allDead = false; break; }
        }
        if (allDead) return;

        if (enemy.maxBurst > 1) {
            enemy.isBursting = true;
            enemy.burstCount = enemy.maxBurst - 1;
            enemy.burstTimer = enemy.burstDelay;
        }

        this.fireShot(enemy);
    },

    fireShot: function(enemy) {
        var targetPlayer = this.getNearestPlayer(enemy.group.position);
        if (!targetPlayer) return;

        var enemyPos = enemy.group.position.clone();
        enemyPos.y += 1.3 * enemy.typeDef.scale;

        var dir = new THREE.Vector3();
        dir.subVectors(targetPlayer.position, enemyPos).normalize();

        var raycaster = new THREE.Raycaster(enemyPos, dir);
        var distToPlayer = enemyPos.distanceTo(targetPlayer.position);

        var coverObjects = [];
        for (var i = 0; i < World.coverBlockers.length; i++) {
            coverObjects.push(World.coverBlockers[i]);
        }
        for (var j = 0; j < World.colliders.length; j++) {
            coverObjects.push(World.colliders[j]);
        }

        var hits = raycaster.intersectObjects(coverObjects, true);
        var blocked = false;
        for (var k = 0; k < hits.length; k++) {
            if (hits[k].distance < distToPlayer - 0.5) {
                blocked = true;
                break;
            }
        }

        if (blocked) {
            AudioManager.playEnemyShoot();
            return;
        }

        var accuracy = enemy.typeDef.accuracy * Math.max(0.2, 1 - distToPlayer / 60);
        accuracy *= this.difficultyScale;
        accuracy = Math.min(0.85, accuracy);

        if (enemy.type === 'shotgunner' && distToPlayer < 12) {
            accuracy = Math.min(0.9, accuracy * 1.5);
        }
        if (enemy.type === 'rifleman' && distToPlayer > 15) {
            accuracy = Math.min(0.85, accuracy * 1.3);
        }

        if (Math.random() < accuracy) {
            var damage = enemy.typeDef.damage + Math.floor(Math.random() * 5);
            if (enemy.type === 'shotgunner' && distToPlayer < 8) {
                damage = Math.floor(damage * 1.5);
            }
            if (enemy.type === 'dynamiter') {
                damage = Math.floor(damage * (0.8 + Math.random() * 0.4));
            }
            targetPlayer.takeDamage(damage);
        }

        this.showMuzzleFlash(enemy);
        AudioManager.playEnemyShoot();
    },

    showMuzzleFlash: function(enemy) {
        var flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0.9 })
        );
        var sc = enemy.typeDef.scale;
        flash.position.set(0.45 * sc, 1.1 * sc, -0.4 * sc);
        enemy.group.add(flash);

        setTimeout(function() {
            enemy.group.remove(flash);
            flash.geometry.dispose();
            flash.material.dispose();
        }, 80);
    },

    hitEnemy: function(id, damage, isHeadshot) {
        for (var i = 0; i < this.enemies.length; i++) {
            var enemy = this.enemies[i];
            if (enemy.id === id && enemy.alive) {
                // Headshot bonus
                var finalDamage = damage;
                if (isHeadshot) {
                    finalDamage = Math.floor(damage * 2.5);
                    HUD.showHeadshotMarker();
                }

                enemy.health -= finalDamage;
                this.flashEnemy(enemy);

                // Stagger - interrupt shooting briefly
                enemy.shootTimer = Math.max(enemy.shootTimer, 0.5);
                enemy.isBursting = false;

                if (enemy.health <= 0) {
                    this.killEnemy(enemy, i);
                    return true;
                }

                // Low health enemies try to retreat
                if (enemy.health < enemy.maxHealth * 0.3 && enemy.state === 'shooting') {
                    enemy.state = 'retreating';
                    enemy.retreatTimer = 2;
                }

                return false;
            }
        }
        return false;
    },

    flashEnemy: function(enemy) {
        var children = enemy.group.children;
        for (var j = 0; j < children.length; j++) {
            if (children[j].material && children[j].userData.isEnemy) {
                var origColor = children[j].material.color.getHex();
                children[j].material.color.setHex(0xFF0000);
                (function(mesh, col) {
                    setTimeout(function() {
                        mesh.material.color.setHex(col);
                    }, 100);
                })(children[j], origColor);
            }
        }
    },

    killEnemy: function(enemy, index) {
        enemy.alive = false;

        // Death animation - fall over
        var self = this;
        var fallSpeed = 0;
        var fallInterval = setInterval(function() {
            fallSpeed += 0.05;
            enemy.group.rotation.x += fallSpeed;
            enemy.group.position.y -= fallSpeed * 0.5;
            if (enemy.group.rotation.x > Math.PI / 2) {
                clearInterval(fallInterval);
                setTimeout(function() {
                    self.scene.remove(enemy.group);
                    var idx = self.enemies.indexOf(enemy);
                    if (idx > -1) self.enemies.splice(idx, 1);
                }, 2000);
            }
        }, 16);

        // Add score based on type
        Game.addScore(enemy.typeDef.scoreValue);
        AudioManager.playEnemyDeath();
    },

    getAliveCount: function() {
        var count = 0;
        for (var i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) count++;
        }
        return count;
    },

    reset: function() {
        for (var i = 0; i < this.enemies.length; i++) {
            this.scene.remove(this.enemies[i].group);
        }
        this.enemies = [];
        this.nextId = 0;
        this.difficultyScale = 1;
    }
};
