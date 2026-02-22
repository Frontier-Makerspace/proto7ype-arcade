// World Builder - Expanded Old West Town with Cover System
const World = {
    scene: null,
    colliders: [],
    coverPoints: [],
    coverBlockers: [], // Objects that block enemy bullets (cover for player)
    spawnPoints: [],

    mat: function(color) {
        return new THREE.MeshLambertMaterial({ color: color, flatShading: true });
    },

    build: function(scene) {
        this.scene = scene;
        this.colliders = [];
        this.coverPoints = [];
        this.coverBlockers = [];
        this.spawnPoints = [];

        this.createGround();
        this.createSkybox();
        this.createMainStreet();
        this.createSaloon();
        this.createSheriffOffice();
        this.createGeneralStore();
        this.createBank();
        this.createWaterTower();
        this.createChurch();
        this.createStables();
        this.createUndertaker();
        this.createGallows();
        this.createWell();
        this.createGraveyard();
        this.createFences();
        this.createBarricades();
        this.createProps();
        this.createMountains();
    },

    createGround: function() {
        // Main dirt ground
        var groundGeo = new THREE.PlaneGeometry(200, 200);
        var groundMat = this.mat(0xC4A46C);
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Dirt road (darker strip down the middle)
        var roadGeo = new THREE.PlaneGeometry(14, 200);
        var roadMat = this.mat(0xA08050);
        var road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.01;
        road.receiveShadow = true;
        this.scene.add(road);

        // Cross street
        var crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(200, 10), this.mat(0xA08050));
        crossRoad.rotation.x = -Math.PI / 2;
        crossRoad.position.y = 0.01;
        crossRoad.position.z = 5;
        crossRoad.receiveShadow = true;
        this.scene.add(crossRoad);

        // Wooden sidewalks on both sides of main street
        for (var side = -1; side <= 1; side += 2) {
            var walkGeo = new THREE.BoxGeometry(3, 0.3, 90);
            var walkMat = this.mat(0x8B6914);
            var walk = new THREE.Mesh(walkGeo, walkMat);
            walk.position.set(side * 8.5, 0.15, 0);
            walk.receiveShadow = true;
            this.scene.add(walk);
        }

        // Sidewalks along cross street
        for (var side2 = -1; side2 <= 1; side2 += 2) {
            var cwalk = new THREE.Mesh(new THREE.BoxGeometry(40, 0.3, 2.5), this.mat(0x8B6914));
            cwalk.position.set(side2 * 28, 0.15, 5);
            cwalk.receiveShadow = true;
            this.scene.add(cwalk);
        }
    },

    createSkybox: function() {
        // Sky dome
        var skyGeo = new THREE.SphereGeometry(100, 8, 6);
        var skyMat = new THREE.MeshBasicMaterial({
            color: 0xE8A64C,
            side: THREE.BackSide
        });
        var sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // Sun
        var sunGeo = new THREE.SphereGeometry(3, 6, 6);
        var sunMat = new THREE.MeshBasicMaterial({ color: 0xFFFF88 });
        var sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(30, 50, -40);
        this.scene.add(sun);

        // Fog
        this.scene.fog = new THREE.Fog(0xDEB887, 30, 90);
        this.scene.background = new THREE.Color(0xE8A64C);
    },

    createMainStreet: function() {
        // Hitching posts along the street
        for (var i = -2; i <= 2; i++) {
            if (i === 0) continue;
            for (var side = -1; side <= 1; side += 2) {
                var postX = side * 6;
                var postZ = i * 15;
                this.addBox(0.2, 1.5, 0.2, 0x5C3A1E, postX, 0.75, postZ, false);
                this.addBox(0.1, 0.1, 3, 0x5C3A1E, postX, 1.2, postZ, false);
                this.addBox(0.2, 1.5, 0.2, 0x5C3A1E, postX, 0.75, postZ + 3, false);
            }
        }

        // Street lamps (oil lanterns on posts)
        var lampPositions = [[-6, -10], [6, -10], [-6, 20], [6, 20], [-6, -30], [6, -30]];
        for (var lp = 0; lp < lampPositions.length; lp++) {
            var lx = lampPositions[lp][0], lz = lampPositions[lp][1];
            this.addBox(0.15, 3.5, 0.15, 0x333333, lx, 1.75, lz, false);
            this.addBox(0.3, 0.3, 0.3, 0xFFDD88, lx, 3.6, lz, false);
        }

        // Spawn points for enemies
        this.spawnPoints.push(
            new THREE.Vector3(0, 0, -45),
            new THREE.Vector3(0, 0, 45),
            new THREE.Vector3(-20, 0, -35),
            new THREE.Vector3(20, 0, -35),
            new THREE.Vector3(-20, 0, 35),
            new THREE.Vector3(20, 0, 35),
            new THREE.Vector3(-40, 0, 5),
            new THREE.Vector3(40, 0, 5),
            new THREE.Vector3(-35, 0, -15),
            new THREE.Vector3(35, 0, -15)
        );
    },

    createSaloon: function() {
        var x = -16, z = -5;
        this.addBox(10, 6, 8, 0x8B6914, x, 3, z, true);
        this.addBox(10, 3, 0.5, 0x8B6914, x, 7.5, z + 4, true);
        this.addBox(11, 0.3, 9, 0x5C3A1E, x, 6, z, false);
        this.addBox(11, 0.2, 3, 0x5C3A1E, x, 4, z + 5.5, false);
        this.addBox(0.3, 4, 0.3, 0x5C3A1E, x - 4.5, 2, z + 6.5, false);
        this.addBox(0.3, 4, 0.3, 0x5C3A1E, x + 4.5, 2, z + 6.5, false);
        this.addBox(0.3, 4, 0.3, 0x5C3A1E, x, 2, z + 6.5, false);
        this.addBox(1.2, 2, 0.15, 0x6B4E1E, x - 0.7, 1.5, z + 4, false);
        this.addBox(1.2, 2, 0.15, 0x6B4E1E, x + 0.7, 1.5, z + 4, false);
        this.addBox(4, 1, 0.2, 0x3D1A00, x, 7, z + 4.3, false);
        this.addBox(1.2, 1.2, 0.2, 0x87CEEB, x - 3, 4, z + 4, false);
        this.addBox(1.2, 1.2, 0.2, 0x87CEEB, x + 3, 4, z + 4, false);
        this.addBox(10, 0.15, 0.1, 0x5C3A1E, x, 5.5, z + 4.3, false);
        // Porch railing as cover
        this.addCover(10, 1.2, 0.2, 0x5C3A1E, x, 1.0, z + 6.8);
        this.coverPoints.push(new THREE.Vector3(x, 0, z - 5));
        this.coverPoints.push(new THREE.Vector3(x - 6, 0, z));
    },

    createSheriffOffice: function() {
        var x = 16, z = -5;
        this.addBox(9, 5, 8, 0x9E8B6E, x, 2.5, z, true);
        this.addBox(10, 0.3, 9, 0x5C3A1E, x, 5, z, false);
        this.addBox(10, 0.2, 3, 0x5C3A1E, x, 3.5, z + 5.5, false);
        this.addBox(0.3, 3.5, 0.3, 0x5C3A1E, x - 4, 1.75, z + 6.5, false);
        this.addBox(0.3, 3.5, 0.3, 0x5C3A1E, x + 4, 1.75, z + 6.5, false);
        this.addBox(1.5, 2.5, 0.2, 0x4A3520, x, 1.25, z + 4, false);
        this.addBox(1, 1, 0.2, 0x87CEEB, x + 3, 3, z + 4, false);
        this.addBox(0.05, 1, 0.3, 0x333333, x + 3, 3, z + 4, false);
        this.addBox(1, 1, 0.2, 0x87CEEB, x - 3, 3, z + 4, false);
        this.addBox(3, 0.6, 0.15, 0x3D1A00, x, 4.2, z + 4.1, false);
        this.addBox(0.4, 0.4, 0.1, 0xFFD700, x + 1.5, 3.5, z + 4.1, false);
        // Sandbag wall as cover near sheriff
        this.addCover(4, 1.2, 1, 0x9E8B6E, x + 6, 0.6, z + 2);
        this.coverPoints.push(new THREE.Vector3(x + 6, 0, z));
        this.coverPoints.push(new THREE.Vector3(x, 0, z - 5));
    },

    createGeneralStore: function() {
        var x = -16, z = 15;
        this.addBox(10, 5.5, 8, 0xA0826D, x, 2.75, z, true);
        this.addBox(10, 2, 0.5, 0xA0826D, x, 6.5, z - 4, true);
        this.addBox(11, 0.3, 9, 0x5C3A1E, x, 5.5, z, false);
        this.addBox(10, 0.15, 4, 0xC4A46C, x, 3.5, z - 6, false);
        this.addBox(0.2, 2, 0.2, 0x5C3A1E, x - 4.5, 2.5, z - 7.5, false);
        this.addBox(0.2, 2, 0.2, 0x5C3A1E, x + 4.5, 2.5, z - 7.5, false);
        this.addBox(1.5, 2.5, 0.2, 0x4A3520, x, 1.25, z - 4, false);
        this.addBox(2.5, 2, 0.2, 0x87CEEB, x - 3, 2.5, z - 4, false);
        this.addBox(2.5, 2, 0.2, 0x87CEEB, x + 3, 2.5, z - 4, false);
        // Barrels in front as cover
        var barrelGeo = new THREE.CylinderGeometry(0.4, 0.45, 1, 6);
        var barrelMat = this.mat(0x6B4226);
        var b1 = new THREE.Mesh(barrelGeo, barrelMat);
        b1.position.set(x - 5.5, 0.5, z - 5);
        this.scene.add(b1);
        this.coverBlockers.push(b1);
        var b2 = new THREE.Mesh(barrelGeo, barrelMat);
        b2.position.set(x - 5.5, 0.5, z - 3.5);
        this.scene.add(b2);
        this.coverBlockers.push(b2);
        this.coverPoints.push(new THREE.Vector3(x - 6, 0, z - 5));
        this.coverPoints.push(new THREE.Vector3(x, 0, z + 5));
    },

    createBank: function() {
        var x = 16, z = 15;
        this.addBox(11, 6, 9, 0xBDB5A1, x, 3, z, true);
        this.addBox(0.6, 5, 0.6, 0xD4CFC0, x - 4, 2.5, z - 4.8, false);
        this.addBox(0.6, 5, 0.6, 0xD4CFC0, x + 4, 2.5, z - 4.8, false);
        this.addBox(0.6, 5, 0.6, 0xD4CFC0, x - 1.5, 2.5, z - 4.8, false);
        this.addBox(0.6, 5, 0.6, 0xD4CFC0, x + 1.5, 2.5, z - 4.8, false);
        this.addBox(12, 0.4, 0.5, 0xD4CFC0, x, 5.5, z - 4.5, false);
        this.addBox(8, 0.4, 0.5, 0xD4CFC0, x, 6.2, z - 4.5, false);
        this.addBox(4, 0.4, 0.5, 0xD4CFC0, x, 6.8, z - 4.5, false);
        this.addBox(12, 0.3, 10, 0x5C3A1E, x, 6, z, false);
        this.addBox(1, 2.8, 0.2, 0x4A3520, x - 0.7, 1.4, z - 4.5, false);
        this.addBox(1, 2.8, 0.2, 0x4A3520, x + 0.7, 1.4, z - 4.5, false);
        this.addBox(1.5, 2, 0.2, 0x87CEEB, x - 3.5, 3, z - 4.5, false);
        this.addBox(1.5, 2, 0.2, 0x87CEEB, x + 3.5, 3, z - 4.5, false);
        // Stone wall cover near bank
        this.addCover(1.5, 1.5, 4, 0xBDB5A1, x + 7, 0.75, z - 2);
        this.coverPoints.push(new THREE.Vector3(x + 7, 0, z));
        this.coverPoints.push(new THREE.Vector3(x, 0, z + 6));
    },

    createWaterTower: function() {
        var x = 25, z = -25;
        this.addBox(0.4, 6, 0.4, 0x5C3A1E, x - 1.5, 3, z - 1.5, false);
        this.addBox(0.4, 6, 0.4, 0x5C3A1E, x + 1.5, 3, z - 1.5, false);
        this.addBox(0.4, 6, 0.4, 0x5C3A1E, x - 1.5, 3, z + 1.5, false);
        this.addBox(0.4, 6, 0.4, 0x5C3A1E, x + 1.5, 3, z + 1.5, false);
        this.addBox(3.4, 0.2, 0.2, 0x5C3A1E, x, 2, z - 1.5, false);
        this.addBox(3.4, 0.2, 0.2, 0x5C3A1E, x, 2, z + 1.5, false);
        this.addBox(0.2, 0.2, 3.4, 0x5C3A1E, x - 1.5, 4, z, false);
        this.addBox(0.2, 0.2, 3.4, 0x5C3A1E, x + 1.5, 4, z, false);
        var tankGeo = new THREE.CylinderGeometry(2.2, 2.2, 3, 8);
        var tankMat = this.mat(0x6B4226);
        var tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(x, 7.5, z);
        this.scene.add(tank);
        var rimGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.3, 8);
        var rim = new THREE.Mesh(rimGeo, tankMat);
        rim.position.set(x, 9.1, z);
        this.scene.add(rim);
        // Trough at base as cover
        this.addCover(4, 1, 1.5, 0x6B4226, x, 0.5, z + 3);
        this.coverPoints.push(new THREE.Vector3(x, 0, z));
    },

    createChurch: function() {
        var x = -30, z = -20;
        // Main building
        this.addBox(8, 7, 12, 0xD4CFC0, x, 3.5, z, true);
        // Steeple base
        this.addBox(3, 4, 3, 0xD4CFC0, x, 9, z - 3, false);
        // Steeple top (pyramid approximation)
        this.addBox(2, 3, 2, 0xD4CFC0, x, 12, z - 3, false);
        this.addBox(1, 2, 1, 0xD4CFC0, x, 14, z - 3, false);
        // Cross on top
        this.addBox(0.15, 1.5, 0.15, 0x5C3A1E, x, 15.5, z - 3, false);
        this.addBox(0.8, 0.15, 0.15, 0x5C3A1E, x, 15.8, z - 3, false);
        // Roof
        this.addBox(9, 0.3, 13, 0x5C3A1E, x, 7, z, false);
        // Door
        this.addBox(1.8, 3, 0.2, 0x4A3520, x, 1.5, z - 6, false);
        // Windows (stained glass - colored)
        this.addBox(1, 2, 0.2, 0x4488CC, x - 4, 4, z - 2, false);
        this.addBox(1, 2, 0.2, 0x4488CC, x - 4, 4, z + 2, false);
        this.addBox(1, 2, 0.2, 0xCC4444, x + 4, 4, z - 2, false);
        this.addBox(1, 2, 0.2, 0xCC4444, x + 4, 4, z + 2, false);
        // Round window above door
        this.addBox(1.2, 1.2, 0.2, 0xFFDD44, x, 5.5, z - 6, false);
        // Stone wall near church for cover
        this.addCover(6, 1.5, 0.5, 0xBBBBAA, x + 5, 0.75, z - 7);
        this.addCover(0.5, 1.5, 6, 0xBBBBAA, x + 8, 0.75, z - 4);
        this.coverPoints.push(new THREE.Vector3(x - 5, 0, z));
    },

    createStables: function() {
        var x = 30, z = -20;
        // Main barn structure
        this.addBox(10, 5, 14, 0x8B4513, x, 2.5, z, true);
        // Roof
        this.addBox(11, 0.3, 15, 0x5C3A1E, x, 5, z, false);
        // Peaked roof top
        this.addBox(6, 0.3, 15, 0x5C3A1E, x, 6.5, z, false);
        this.addBox(2, 0.3, 15, 0x5C3A1E, x, 7.5, z, false);
        // Large barn door opening
        this.addBox(4, 4, 0.2, 0x6B4226, x, 2, z - 7, false);
        // Hay bales outside (cover!)
        this.addCover(2, 1.2, 1.2, 0xCCBB44, x - 6, 0.6, z - 5);
        this.addCover(2, 1.2, 1.2, 0xCCBB44, x - 6, 0.6, z - 3);
        this.addCover(1.2, 1.2, 2, 0xCCBB44, x + 6, 0.6, z - 4);
        // Horse trough
        this.addCover(3, 0.8, 1, 0x6B4226, x + 2, 0.4, z - 8);
        // Fence corral
        this.addBox(0.15, 1.2, 8, 0x8B6914, x + 6, 0.6, z + 3, false);
        this.addBox(8, 1.2, 0.15, 0x8B6914, x + 2, 0.6, z + 7, false);
        this.coverPoints.push(new THREE.Vector3(x, 0, z + 8));
    },

    createUndertaker: function() {
        var x = -30, z = 15;
        // Small dark building
        this.addBox(7, 4.5, 7, 0x3D2B1F, x, 2.25, z, true);
        // Roof
        this.addBox(8, 0.3, 8, 0x222222, x, 4.5, z, false);
        // Door
        this.addBox(1.2, 2.5, 0.2, 0x1a1a1a, x, 1.25, z - 3.5, false);
        // Window
        this.addBox(1, 1, 0.2, 0x87CEEB, x - 2.5, 3, z - 3.5, false);
        // Sign
        this.addBox(3, 0.8, 0.15, 0x1a1a1a, x, 4, z - 3.6, false);
        // Coffins leaning against wall
        this.addBox(0.6, 2, 0.3, 0x4A3520, x + 3.8, 1, z - 2, false);
        this.addBox(0.6, 2, 0.3, 0x3D2B1F, x + 3.8, 1, z - 1, false);
        // Wooden fence cover
        this.addCover(5, 1.5, 0.3, 0x5C3A1E, x, 0.75, z - 5);
        this.coverPoints.push(new THREE.Vector3(x + 4, 0, z));
    },

    createGallows: function() {
        var x = 0, z = -30;
        // Platform
        this.addBox(5, 1, 5, 0x8B6914, x, 0.5, z, false);
        // Steps
        this.addBox(2, 0.3, 1, 0x8B6914, x - 2, 0.15, z + 3, false);
        this.addBox(2, 0.6, 1, 0x8B6914, x - 2, 0.3, z + 2, false);
        // Vertical posts
        this.addBox(0.3, 5, 0.3, 0x5C3A1E, x - 1.5, 3.5, z - 1.5, false);
        this.addBox(0.3, 5, 0.3, 0x5C3A1E, x + 1.5, 3.5, z - 1.5, false);
        // Crossbeam
        this.addBox(4, 0.3, 0.3, 0x5C3A1E, x, 6, z - 1.5, false);
        // Noose (small box representing rope)
        this.addBox(0.05, 1.5, 0.05, 0x8B7355, x + 0.5, 4.8, z - 1.5, false);
        // Trapdoor
        this.addBox(1.5, 0.15, 1.5, 0x6B4226, x + 0.5, 1, z - 1, false);
        // Platform as cover
        this.coverBlockers.push(this.addBox(5, 1, 5, 0x8B6914, x, 0.5, z, false));
        this.coverPoints.push(new THREE.Vector3(x + 3, 0, z));
        this.coverPoints.push(new THREE.Vector3(x - 3, 0, z));
    },

    createWell: function() {
        var x = 3, z = 5;
        // Stone base (octagonal approximated with cylinder)
        var wellGeo = new THREE.CylinderGeometry(1.2, 1.4, 1.2, 8);
        var wellMat = this.mat(0x888877);
        var well = new THREE.Mesh(wellGeo, wellMat);
        well.position.set(x, 0.6, z);
        this.scene.add(well);
        this.coverBlockers.push(well);
        this.colliders.push(well);
        // Posts for roof
        this.addBox(0.2, 2.5, 0.2, 0x5C3A1E, x - 1, 2.4, z, false);
        this.addBox(0.2, 2.5, 0.2, 0x5C3A1E, x + 1, 2.4, z, false);
        // Roof beam
        this.addBox(2.5, 0.15, 1.5, 0x5C3A1E, x, 3.6, z, false);
        // Peaked roof
        this.addBox(1.5, 0.15, 1.5, 0x5C3A1E, x, 4, z, false);
        // Bucket
        this.addBox(0.3, 0.3, 0.3, 0x6B4226, x, 2, z, false);
        // Rope
        this.addBox(0.05, 1.5, 0.05, 0x8B7355, x, 2.8, z, false);
        this.coverPoints.push(new THREE.Vector3(x, 0, z));
    },

    createGraveyard: function() {
        var baseX = -35, baseZ = -35;
        // Fence around graveyard
        this.addBox(12, 1.2, 0.15, 0x5C3A1E, baseX, 0.6, baseZ - 6, false);
        this.addBox(12, 1.2, 0.15, 0x5C3A1E, baseX, 0.6, baseZ + 6, false);
        this.addBox(0.15, 1.2, 12, 0x5C3A1E, baseX - 6, 0.6, baseZ, false);
        this.addBox(0.15, 1.2, 12, 0x5C3A1E, baseX + 6, 0.6, baseZ, false);
        // Gravestones
        var graves = [
            [-3, -3], [-1, -3], [1, -3], [3, -3],
            [-3, 0], [-1, 0], [1, 0], [3, 0],
            [-2, 3], [0, 3], [2, 3]
        ];
        for (var g = 0; g < graves.length; g++) {
            var gx = baseX + graves[g][0] * 1.5;
            var gz = baseZ + graves[g][1] * 1.5;
            // Headstone
            this.addBox(0.6, 1 + Math.random() * 0.5, 0.15, 0x888877, gx, 0.6, gz, false);
            // Dirt mound
            this.addBox(0.8, 0.15, 1.5, 0x8B7355, gx, 0.08, gz + 1, false);
        }
        // Large cross monument
        this.addBox(0.2, 2.5, 0.2, 0x888877, baseX, 1.25, baseZ - 4, false);
        this.addBox(1.2, 0.2, 0.2, 0x888877, baseX, 2, baseZ - 4, false);
        // Cover behind graveyard wall
        this.addCover(12, 1.2, 0.3, 0x5C3A1E, baseX, 0.6, baseZ - 6);
        this.coverPoints.push(new THREE.Vector3(baseX + 3, 0, baseZ));
    },

    createFences: function() {
        // Wooden fences along edges of town - provide cover
        // Left side fence line
        for (var fz = -40; fz <= 40; fz += 8) {
            this.addCover(0.15, 1.5, 7, 0x8B6914, -42, 0.75, fz);
        }
        // Right side fence line
        for (var fz2 = -40; fz2 <= 40; fz2 += 8) {
            this.addCover(0.15, 1.5, 7, 0x8B6914, 42, 0.75, fz2);
        }
        // Fence posts
        for (var fp = -44; fp <= 44; fp += 4) {
            this.addBox(0.25, 1.8, 0.25, 0x5C3A1E, -42, 0.9, fp, false);
            this.addBox(0.25, 1.8, 0.25, 0x5C3A1E, 42, 0.9, fp, false);
        }
        // Short fence segments in town for cover
        this.addCover(4, 1.3, 0.2, 0x8B6914, -5, 0.65, -18);
        this.addCover(4, 1.3, 0.2, 0x8B6914, 5, 0.65, 25);
        this.addCover(0.2, 1.3, 4, 0x8B6914, 10, 0.65, -20);
        this.addCover(0.2, 1.3, 4, 0x8B6914, -10, 0.65, 28);
    },

    createBarricades: function() {
        // Scattered cover objects throughout the town
        // Overturned table
        this.addCover(2, 1, 0.3, 0x6B4226, -3, 0.5, -8);
        // Stacked crates
        this.addCover(1.5, 1.5, 1.5, 0x8B6914, 8, 0.75, -12);
        this.addCover(1.2, 1.2, 1.2, 0x8B6914, 8, 1.8, -12);
        // Barrel cluster near center
        var bGeo = new THREE.CylinderGeometry(0.4, 0.45, 1, 6);
        var bMat = this.mat(0x6B4226);
        var positions = [[5, -20], [-5, 25], [12, 5], [-12, -20], [3, 10], [-3, -10],
                         [-8, 35], [8, -35], [0, 35], [15, -30]];
        for (var bp = 0; bp < positions.length; bp++) {
            var barrel = new THREE.Mesh(bGeo, bMat);
            barrel.position.set(positions[bp][0], 0.5, positions[bp][1]);
            this.scene.add(barrel);
            this.coverBlockers.push(barrel);
            this.coverPoints.push(new THREE.Vector3(positions[bp][0], 0, positions[bp][1]));
        }
        // Stone walls / low walls
        this.addCover(3, 1.2, 0.5, 0x888877, -2, 0.6, 15);
        this.addCover(0.5, 1.2, 3, 0x888877, 7, 0.6, 30);
        this.addCover(3, 1.2, 0.5, 0x888877, -15, 0.6, -25);
        this.addCover(3, 1.0, 0.5, 0x888877, 20, 0.5, 30);
        // Wooden cart (sideways, cover)
        this.addCover(3, 1.5, 1, 0x6B4226, -8, 0.75, -30);
    },

    createProps: function() {
        var crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        var crateMat = this.mat(0x8B6914);

        // Crate stacks
        var cratePositions = [
            [-4, 0.4, -15], [-4, 1.2, -15], [4, 0.4, 20],
            [13, 0.4, -15], [13, 1.2, -15], [-13, 0.4, 25],
            [20, 0.4, 10], [-20, 0.4, -10], [25, 0.4, 15]
        ];
        for (var j = 0; j < cratePositions.length; j++) {
            var cp = cratePositions[j];
            var c = new THREE.Mesh(crateGeo, crateMat);
            c.position.set(cp[0], cp[1], cp[2]);
            this.scene.add(c);
            this.coverBlockers.push(c);
        }

        // Wagons
        this.createWagon(0, 0, -25);
        this.createWagon(-8, 0, 30);
        this.createWagon(20, 0, -10);
        this.createWagon(-25, 0, 25);

        // Tumbleweeds
        var twGeo = new THREE.IcosahedronGeometry(0.4, 0);
        var twMat = this.mat(0x8B7355);
        var twPositions = [[8, 0.4, -8], [-3, 0.4, 18], [15, 0.4, 28],
                           [-20, 0.4, -5], [30, 0.4, 10], [-15, 0.4, -35]];
        for (var k = 0; k < twPositions.length; k++) {
            var tw = new THREE.Mesh(twGeo, twMat);
            tw.position.set(twPositions[k][0], twPositions[k][1], twPositions[k][2]);
            tw.userData.tumbleweed = true;
            this.scene.add(tw);
        }

        // Signposts
        this.addBox(0.15, 2.5, 0.15, 0x5C3A1E, -7, 1.25, 0, false);
        this.addBox(2, 0.5, 0.1, 0x8B6914, -7, 2.2, 0, false);
        this.addBox(0.15, 2.5, 0.15, 0x5C3A1E, 7, 1.25, 10, false);
        this.addBox(1.5, 0.4, 0.1, 0x8B6914, 7, 2, 10, false);

        // Horse troughs
        this.addBox(2.5, 0.6, 0.8, 0x6B4226, -6, 0.3, -5, false);
        this.addBox(2.5, 0.6, 0.8, 0x6B4226, 6, 0.3, 15, false);

        // Rocking chairs on porches
        this.addBox(0.5, 0.8, 0.5, 0x6B4226, -12, 0.55, -1.5, false);
        this.addBox(0.5, 0.8, 0.5, 0x6B4226, 12, 0.55, -1.5, false);
    },

    createWagon: function(x, y, z) {
        // Wagon bed
        var bed = this.addBox(2, 0.2, 4, 0x6B4226, x, 1, z, false);
        this.coverBlockers.push(bed);
        // Sides - these block bullets
        var sideL = this.addBox(0.15, 0.8, 4, 0x6B4226, x - 1, 1.5, z, false);
        this.coverBlockers.push(sideL);
        var sideR = this.addBox(0.15, 0.8, 4, 0x6B4226, x + 1, 1.5, z, false);
        this.coverBlockers.push(sideR);
        var endF = this.addBox(2, 0.8, 0.15, 0x6B4226, x, 1.5, z - 2, false);
        this.coverBlockers.push(endF);
        var endB = this.addBox(2, 0.8, 0.15, 0x6B4226, x, 1.5, z + 2, false);
        this.coverBlockers.push(endB);
        // Wheels
        var wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 8);
        var wheelMat = this.mat(0x3D2B1F);
        for (var side = -1; side <= 1; side += 2) {
            for (var end = -1; end <= 1; end += 2) {
                var wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x + side * 1.1, 0.6, z + end * 1.5);
                this.scene.add(wheel);
            }
        }
        // Axles
        this.addBox(2.5, 0.15, 0.15, 0x3D2B1F, x, 0.6, z - 1.5, false);
        this.addBox(2.5, 0.15, 0.15, 0x3D2B1F, x, 0.6, z + 1.5, false);
        // Tongue
        this.addBox(0.1, 0.1, 2, 0x5C3A1E, x, 0.8, z - 3, false);
        this.coverPoints.push(new THREE.Vector3(x, 0, z));
    },

    createMountains: function() {
        var mountainPositions = [
            { x: -60, z: -70, s: 30, h: 20, c: 0x8B7355 },
            { x: 0, z: -80, s: 40, h: 25, c: 0x9E8B6E },
            { x: 60, z: -70, s: 35, h: 22, c: 0x8B7355 },
            { x: -70, z: -50, s: 25, h: 18, c: 0xA0826D },
            { x: 70, z: -50, s: 25, h: 18, c: 0xA0826D },
            { x: -50, z: 70, s: 30, h: 15, c: 0x8B7355 },
            { x: 50, z: 70, s: 30, h: 15, c: 0x9E8B6E },
            { x: 0, z: 80, s: 35, h: 20, c: 0x8B7355 },
            { x: -80, z: 0, s: 28, h: 16, c: 0xA0826D },
            { x: 80, z: 0, s: 28, h: 16, c: 0x9E8B6E },
            { x: -40, z: -80, s: 20, h: 14, c: 0x8B7355 },
            { x: 40, z: 80, s: 22, h: 12, c: 0x8B7355 }
        ];
        for (var i = 0; i < mountainPositions.length; i++) {
            var mp = mountainPositions[i];
            var mGeo = new THREE.ConeGeometry(mp.s, mp.h, 5);
            var mMat = this.mat(mp.c);
            var mountain = new THREE.Mesh(mGeo, mMat);
            mountain.position.set(mp.x, mp.h / 2 - 2, mp.z);
            this.scene.add(mountain);
        }

        // Cacti - more spread around
        var cactiPositions = [
            [30, 0, -35], [-30, 0, 35], [35, 0, 20],
            [-35, 0, -20], [28, 0, 40], [-28, 0, -40],
            [40, 0, -10], [-40, 0, 10], [38, 0, 30],
            [-38, 0, -30], [15, 0, -40], [-15, 0, 40]
        ];
        for (var j = 0; j < cactiPositions.length; j++) {
            this.createCactus(cactiPositions[j][0], cactiPositions[j][1], cactiPositions[j][2]);
        }

        // Rock formations
        var rockPositions = [
            [35, -35], [-35, 35], [40, 15], [-40, -15],
            [25, 35], [-25, -35]
        ];
        for (var r = 0; r < rockPositions.length; r++) {
            var rx = rockPositions[r][0], rz = rockPositions[r][1];
            var rSize = 1 + Math.random() * 1.5;
            var rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(rSize, 0),
                this.mat(0x888877)
            );
            rock.position.set(rx, rSize * 0.5, rz);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(rock);
            this.coverBlockers.push(rock);
            this.coverPoints.push(new THREE.Vector3(rx, 0, rz));
        }
    },

    createCactus: function(x, y, z) {
        var cactusColor = 0x2D5A27;
        this.addBox(0.4, 2.5, 0.4, cactusColor, x, 1.25, z, false);
        this.addBox(0.3, 0.3, 0.3, cactusColor, x - 0.5, 1.5, z, false);
        this.addBox(0.3, 1, 0.3, cactusColor, x - 0.5, 2.2, z, false);
        this.addBox(0.3, 0.3, 0.3, cactusColor, x + 0.5, 1.8, z, false);
        this.addBox(0.3, 0.8, 0.3, cactusColor, x + 0.5, 2.4, z, false);
    },

    addBox: function(w, h, d, color, x, y, z, isCollider) {
        var geo = new THREE.BoxGeometry(w, h, d);
        var mesh = new THREE.Mesh(geo, this.mat(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        if (isCollider) {
            this.colliders.push(mesh);
        }
        return mesh;
    },

    addCover: function(w, h, d, color, x, y, z) {
        var geo = new THREE.BoxGeometry(w, h, d);
        var mesh = new THREE.Mesh(geo, this.mat(color));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.coverBlockers.push(mesh);
        this.colliders.push(mesh);
        this.coverPoints.push(new THREE.Vector3(x, 0, z));
        return mesh;
    }
};
