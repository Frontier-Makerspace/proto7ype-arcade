// PS1-Style Post Processing Shader
// Creates the classic low-res, dithered, wobbly vertex look

const PS1Shader = {
    // Pixelation render target resolution
    RENDER_WIDTH: 320,
    RENDER_HEIGHT: 240,

    // Vertex snapping shader (PS1 vertex jitter)
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFog;
        
        uniform float u_snapResolution;
        uniform float u_time;
        uniform vec3 u_fogColor;
        uniform float u_fogNear;
        uniform float u_fogFar;
        
        void main() {
            vUv = uv;
            vColor = vec3(1.0);
            
            // Standard MVP
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vec4 snapPosition = projectionMatrix * mvPosition;
            
            // PS1 vertex snapping - snap to grid
            float snap = u_snapResolution;
            snapPosition.xyz = floor(snapPosition.xyz * snap + 0.5) / snap;
            
            // Fog calculation
            float fogDepth = -mvPosition.z;
            vFog = smoothstep(u_fogNear, u_fogFar, fogDepth);
            
            gl_Position = snapPosition;
        }
    `,

    // Fragment shader with dithering
    fragmentShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFog;
        
        uniform sampler2D map;
        uniform bool u_hasTexture;
        uniform vec3 u_color;
        uniform vec3 u_fogColor;
        uniform float u_opacity;
        
        // 4x4 Bayer dithering matrix
        float dither4x4(vec2 position, float brightness) {
            int x = int(mod(position.x, 4.0));
            int y = int(mod(position.y, 4.0));
            int index = x + y * 4;
            float limit = 0.0;
            
            if (index == 0) limit = 0.0625;
            else if (index == 1) limit = 0.5625;
            else if (index == 2) limit = 0.1875;
            else if (index == 3) limit = 0.6875;
            else if (index == 4) limit = 0.8125;
            else if (index == 5) limit = 0.3125;
            else if (index == 6) limit = 0.9375;
            else if (index == 7) limit = 0.4375;
            else if (index == 8) limit = 0.25;
            else if (index == 9) limit = 0.75;
            else if (index == 10) limit = 0.125;
            else if (index == 11) limit = 0.625;
            else if (index == 12) limit = 1.0;
            else if (index == 13) limit = 0.5;
            else if (index == 14) limit = 0.875;
            else if (index == 15) limit = 0.375;
            
            return brightness < limit ? 0.0 : 1.0;
        }
        
        void main() {
            vec3 color;
            if (u_hasTexture) {
                color = texture2D(map, vUv).rgb * u_color;
            } else {
                color = u_color;
            }
            
            // Mix with fog
            color = mix(color, u_fogColor, vFog);
            
            gl_FragColor = vec4(color, u_opacity);
        }
    `,

    // Create PS1-style material
    createMaterial: function(color, options = {}) {
        const uniforms = {
            u_snapResolution: { value: 120.0 },
            u_time: { value: 0 },
            u_fogColor: { value: new THREE.Color(0xDEB887) },
            u_fogNear: { value: 30 },
            u_fogFar: { value: 80 },
            u_color: { value: new THREE.Color(color) },
            u_hasTexture: { value: false },
            u_opacity: { value: options.opacity || 1.0 },
            map: { value: null }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            transparent: options.transparent || false,
            side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
        });
    },

    // Simple material for better compatibility
    createSimpleMaterial: function(color, options = {}) {
        return new THREE.MeshLambertMaterial({
            color: color,
            flatShading: true,
            transparent: options.transparent || false,
            opacity: options.opacity !== undefined ? options.opacity : 1.0,
            side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
        });
    }
};
