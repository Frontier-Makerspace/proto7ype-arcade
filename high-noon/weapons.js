// Weapon System - 2-Player Co-op Version
// WeaponInstances holds per-player weapon data
var WeaponInstances = {};

function createWeaponInstance(playerNum) {
    return {
        playerNum: playerNum,
        gunGroup: null,
        ammo: 6,
        maxAmmo: 6,
        isReloading: false,
        reloadTime: 1.5,
        reloadTimer: 0,
        canShoot: true,
        shootCooldown: 0.3,
        shootTimer: 0,
        kickback: 0,
        muzzleFlash: null,
        muzzleTimer: 0,
        spread: 0.005,
        maxSpread: 0.04,
        baseSpread: 0.005,
        spreadRecovery: 0.06,
        spreadPerShot: 0.015
    };
}

const Weapons = {
    scene: null,
    bulletTrails: [],
    impactParticles: [],

    init: function(scene) {
        this.scene = scene;
        this.bulletTrails = [];
        this.impactParticles = [];
    },

    initForPlayer: function(player) {
        var pn = player.playerNum;
        var inst = createWeaponInstance(pn);
        WeaponInstances[pn] = inst;
        this.createGunModel(player, inst);
    },

    createGunModel: function(player, inst) {
        inst.gunGroup = new THREE.Group();

        var metalMat = new THREE.MeshLambertMaterial({ color: 0x444444, flatShading: true });
        var woodMat = new THREE.MeshLambertMaterial({ color: 0x6B4226, flatShading: true });
        var darkMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });

        var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), metalMat);
        barrel.position.set(0, 0, -0.2);
        inst.gunGroup.add(barrel);

        var cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6), metalMat);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0, -0.02);
        inst.gunGroup.add(cylinder);

        var frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.15), metalMat);
        frame.position.set(0, -0.01, 0.02);
        inst.gunGroup.add(frame);

        var grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.05), woodMat);
        grip.rotation.x = 0.3;
        grip.position.set(0, -0.08, 0.08);
        inst.gunGroup.add(grip);

        var guard = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.04), metalMat);
        guard.position.set(0, -0.04, 0.03);
        inst.gunGroup.add(guard);

        var hammer = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.015), darkMat);
        hammer.position.set(0, 0.035, 0.05);
        inst.gunGroup.add(hammer);

        var flashMat = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0 });
        inst.muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), flashMat);
        inst.muzzleFlash.position.set(0, 0, -0.4);
        inst.gunGroup.add(inst.muzzleFlash);

        inst.gunGroup.position.set(0.25, -0.2, -0.4);
        player.camera.add(inst.gunGroup);
    },

    shootForPlayer: function(playerNum) {
        var inst = WeaponInstances[playerNum];
        var player = Players[playerNum - 1];
        if (!inst || !player || player.isDead) return;

        if (!inst.canShoot || inst.isReloading || inst.ammo <= 0) {
            if (inst.ammo <= 0 && !inst.isReloading) {
                this.startReloadForPlayer(playerNum);
            }
            return;
        }

        inst.ammo--;
        inst.canShoot = false;
        inst.shootTimer = inst.shootCooldown;
        inst.kickback = 0.08;
        inst.spread = Math.min(inst.maxSpread, inst.spread + inst.spreadPerShot);
        inst.muzzleFlash.material.opacity = 1;
        inst.muzzleTimer = 0.05;

        var spreadX = (Math.random() - 0.5) * inst.spread;
        var spreadY = (Math.random() - 0.5) * inst.spread;
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), player.camera);

        var hits = raycaster.intersectObjects(this.scene.children, true);
        var hitPoint = null;

        for (var i = 0; i < hits.length; i++) {
            var hit = hits[i];
            if (hit.object.userData.isDust) continue;
            if (hit.object.userData.tumbleweed) continue;

            if (hit.object.userData.isEnemy) {
                var isHeadshot = hit.object.userData.isHead === true;
                Enemies.hitEnemy(hit.object.userData.enemyId, 34, isHeadshot);
                hitPoint = hit.point;
                if (isHeadshot) { HUD.showHeadshotMarker(playerNum); }
                else { HUD.showHitMarker(playerNum); }
                this.spawnImpact(hit.point, 0xFF0000, 6);
                break;
            } else {
                hitPoint = hit.point;
                this.spawnImpact(hit.point, 0xC4A46C, 4);
                this.spawnBulletHole(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0));
                break;
            }
        }

        if (hitPoint) {
            this.spawnBulletTrail(player.camera.position.clone(), hitPoint);
        }

        AudioManager.playShoot();
        HUD.updateAmmo(playerNum, inst.ammo, inst.maxAmmo);

        if (inst.ammo <= 0) {
            var self = this;
            var pn = playerNum;
            setTimeout(function() { self.startReloadForPlayer(pn); }, 500);
        }
    },

    spawnBulletTrail: function(from, to) {
        var direction = new THREE.Vector3().subVectors(to, from);
        var length = direction.length();
        direction.normalize();

        var trailGeo = new THREE.BufferGeometry();
        var positions = new Float32Array([
            from.x, from.y, from.z,
            to.x, to.y, to.z
        ]);
        trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        var trailMat = new THREE.LineBasicMaterial({
            color: 0xFFDD88,
            transparent: true,
            opacity: 0.6
        });

        var trail = new THREE.Line(trailGeo, trailMat);
        this.scene.add(trail);

        var self = this;
        this.bulletTrails.push({
            mesh: trail,
            life: 0.1
        });
    },

    spawnImpact: function(position, color, count) {
        for (var i = 0; i < count; i++) {
            var size = 0.03 + Math.random() * 0.05;
            var geo = new THREE.BoxGeometry(size, size, size);
            var mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            var particle = new THREE.Mesh(geo, mat);
            particle.position.copy(position);

            var vel = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3,
                (Math.random() - 0.5) * 3
            );

            this.scene.add(particle);
            this.impactParticles.push({
                mesh: particle,
                velocity: vel,
                life: 0.3 + Math.random() * 0.3
            });
        }
    },

    spawnBulletHole: function(position, normal) {
        var holeGeo = new THREE.PlaneGeometry(0.15, 0.15);
        var holeMat = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        var hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.copy(position);
        hole.position.add(normal.clone().multiplyScalar(0.01));
        hole.lookAt(position.clone().add(normal));
        this.scene.add(hole);

        // Remove after a while
        var scene = this.scene;
        setTimeout(function() {
            scene.remove(hole);
            holeGeo.dispose();
            holeMat.dispose();
        }, 8000);
    },

    startReloadForPlayer: function(playerNum) {
        var inst = WeaponInstances[playerNum];
        if (!inst || inst.isReloading || inst.ammo === inst.maxAmmo) return;
        inst.isReloading = true;
        inst.reloadTimer = inst.reloadTime;
        HUD.showReload(playerNum, true);
        AudioManager.playReload();
    },

    updateForPlayer: function(playerNum, delta) {
        var inst = WeaponInstances[playerNum];
        if (!inst) return;

        if (!inst.canShoot) {
            inst.shootTimer -= delta;
            if (inst.shootTimer <= 0) inst.canShoot = true;
        }

        if (inst.spread > inst.baseSpread) {
            inst.spread = Math.max(inst.baseSpread, inst.spread - inst.spreadRecovery * delta);
        }

        if (inst.isReloading) {
            inst.reloadTimer -= delta;
            if (inst.reloadTimer <= 0) {
                inst.ammo = inst.maxAmmo;
                inst.isReloading = false;
                HUD.showReload(playerNum, false);
                HUD.updateAmmo(playerNum, inst.ammo, inst.maxAmmo);
            }
        }

        if (inst.muzzleTimer > 0) {
            inst.muzzleTimer -= delta;
            if (inst.muzzleTimer <= 0) inst.muzzleFlash.material.opacity = 0;
        }

        if (inst.kickback > 0) {
            inst.kickback *= 0.85;
            if (inst.kickback < 0.001) inst.kickback = 0;
        }

        if (inst.gunGroup) {
            var sway = Math.sin(Date.now() * 0.002) * 0.003;
            var bob = Math.sin(Date.now() * 0.004) * 0.002;
            var reloadTilt = 0;
            if (inst.isReloading) {
                var rp = 1 - (inst.reloadTimer / inst.reloadTime);
                if (rp < 0.3) reloadTilt = rp / 0.3 * 0.5;
                else if (rp > 0.7) reloadTilt = (1 - rp) / 0.3 * 0.5;
                else reloadTilt = 0.5;
            }
            inst.gunGroup.position.set(0.25 + sway, -0.2 + bob - reloadTilt * 0.15, -0.4 + inst.kickback);
            inst.gunGroup.rotation.x = -inst.kickback * 2 + reloadTilt * 0.8;
            inst.gunGroup.rotation.z = reloadTilt * 0.3;
        }
    },

    update: function(delta) {
        // Update per-player weapons
        for (var pn = 1; pn <= Players.length; pn++) {
            this.updateForPlayer(pn, delta);
        }

        // Update bullet trails
        for (var i = this.bulletTrails.length - 1; i >= 0; i--) {
            var trail = this.bulletTrails[i];
            trail.life -= delta;
            trail.mesh.material.opacity = Math.max(0, trail.life / 0.1);
            if (trail.life <= 0) {
                this.scene.remove(trail.mesh);
                trail.mesh.geometry.dispose();
                trail.mesh.material.dispose();
                this.bulletTrails.splice(i, 1);
            }
        }

        // Update impact particles
        for (var j = this.impactParticles.length - 1; j >= 0; j--) {
            var p = this.impactParticles[j];
            p.life -= delta;
            p.velocity.y -= 9.8 * delta;
            p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
            p.mesh.material.opacity = Math.max(0, p.life / 0.5);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.impactParticles.splice(j, 1);
            }
        }
    },

    reset: function() {
        for (var pn in WeaponInstances) {
            var inst = WeaponInstances[pn];
            inst.ammo = inst.maxAmmo;
            inst.isReloading = false;
            inst.canShoot = true;
            inst.kickback = 0;
            inst.spread = inst.baseSpread;
        }

        for (var i = 0; i < this.bulletTrails.length; i++) {
            this.scene.remove(this.bulletTrails[i].mesh);
        }
        this.bulletTrails = [];
        for (var j = 0; j < this.impactParticles.length; j++) {
            this.scene.remove(this.impactParticles[j].mesh);
        }
        this.impactParticles = [];
    }
};
