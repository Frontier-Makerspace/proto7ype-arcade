// FPS Player Controller - 2-Player Co-op Version
function createPlayer(playerNum, camera) {
    return {
        playerNum: playerNum,
        camera: camera,
        height: 1.7,
        speed: 8,
        sprintSpeed: 12,
        mouseSensitivity: 0.002,
        position: new THREE.Vector3(0, 1.7, 0),
        velocity: new THREE.Vector3(),
        rotation: { x: 0, y: 0 },
        isLocked: true,
        health: 100,
        maxHealth: 100,
        isDead: false,
        keys: { w: false, a: false, s: false, d: false, shift: false },

        init: function() {
            var startX = this.playerNum === 1 ? 5 : -5;
            var startZ = 20;
            var startAngle = this.playerNum === 1 ? -0.2 : 0.2;
            this.position.set(startX, this.height, startZ);
            this.camera.position.copy(this.position);
            this.rotation.y = startAngle;
            this.health = this.maxHealth;
            this.isDead = false;
            this.isLocked = true;
        },

        update: function(delta) {
            if (this.isDead || !this.isLocked) return;

            var moveSpeed = this.keys.shift ? this.sprintSpeed : this.speed;
            var forward = new THREE.Vector3(0, 0, -1);
            var right = new THREE.Vector3(1, 0, 0);

            forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
            right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

            this.velocity.set(0, 0, 0);

            if (this.keys.w) this.velocity.add(forward);
            if (this.keys.s) this.velocity.sub(forward);
            if (this.keys.d) this.velocity.add(right);
            if (this.keys.a) this.velocity.sub(right);

            if (this.velocity.length() > 0) {
                this.velocity.normalize().multiplyScalar(moveSpeed * delta);
            }

            var newPos = this.position.clone().add(this.velocity);
            newPos.y = this.height;

            var canMove = true;
            var playerRadius = 0.5;

            for (var i = 0; i < World.colliders.length; i++) {
                var col = World.colliders[i];
                var box = new THREE.Box3().setFromObject(col);
                var expanded = box.clone().expandByScalar(playerRadius);

                if (expanded.containsPoint(new THREE.Vector3(newPos.x, 1, newPos.z))) {
                    canMove = false;
                    var slideX = this.position.clone();
                    slideX.x = newPos.x;
                    slideX.y = 1;
                    if (!expanded.containsPoint(slideX)) {
                        newPos.z = this.position.z;
                        canMove = true;
                    } else {
                        var slideZ = this.position.clone();
                        slideZ.z = newPos.z;
                        slideZ.y = 1;
                        if (!expanded.containsPoint(slideZ)) {
                            newPos.x = this.position.x;
                            canMove = true;
                        }
                    }
                    break;
                }
            }

            newPos.x = Math.max(-45, Math.min(45, newPos.x));
            newPos.z = Math.max(-45, Math.min(45, newPos.z));

            if (canMove) {
                this.position.x = newPos.x;
                this.position.z = newPos.z;
            }

            this.camera.position.copy(this.position);

            if (this.velocity.length() > 0.01) {
                var bobAmount = Math.sin(Date.now() * 0.008) * 0.04;
                this.camera.position.y += bobAmount;
            }

            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.rotation.y;
            this.camera.rotation.x = this.rotation.x;
        },

        takeDamage: function(amount) {
            if (this.isDead) return;
            this.health -= amount;
            if (this.health <= 0) {
                this.health = 0;
                this.isDead = true;
            }
            HUD.showDamage(this.playerNum);
            HUD.updateHealth(this.playerNum, this.health, this.maxHealth);
        },

        reset: function() {
            var startX = this.playerNum === 1 ? 5 : -5;
            this.position.set(startX, this.height, 20);
            this.rotation.x = 0;
            this.rotation.y = this.playerNum === 1 ? -0.2 : 0.2;
            this.health = this.maxHealth;
            this.isDead = false;
            this.velocity.set(0, 0, 0);
        }
    };
}

// Backward-compatible Player reference (points to P1 by default)
var Player = null;
var Player1 = null;
var Player2 = null;
var Players = [];
