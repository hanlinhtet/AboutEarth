import * as THREE from 'three';

/*
 * The Sun: a procedural photosphere plus stacked corona shells.
 *
 * All motion happens in the fragment shader from a single time uniform, so the
 * star animates without a byte of per-frame CPU work. Nothing here casts or
 * receives shadows - a point-light shadow cube map is six full scene renders
 * per frame, and nothing in this scene needs one.
 */

// Ashima's simplex noise. Cheaper and far less grid-aligned than value noise,
// which matters when it's the entire surface of the star.
const NOISE_GLSL = /* glsl */`
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }

    float fbm(vec3 p, int octaves) {
        float sum = 0.0, amp = 0.5, freq = 1.0;
        for (int i = 0; i < 6; i++) {
            if (i >= octaves) break;
            sum += snoise(p * freq) * amp;
            amp *= 0.5;
            freq *= 2.03;
        }
        return sum;
    }
`;

const SURFACE_VERT = /* glsl */`
    varying vec3 vLocal;
    varying vec3 vNormalW;
    varying vec3 vViewDirW;

    void main() {
        vLocal = normalize(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const SURFACE_FRAG = /* glsl */`
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uDeep;   // dark granule lanes
    uniform vec3 uMid;    // photosphere
    uniform vec3 uHot;    // hot cell centres / limb flare

    varying vec3 vLocal;
    varying vec3 vNormalW;
    varying vec3 vViewDirW;

    ${NOISE_GLSL}

    void main() {
        vec3 p = vLocal * 2.4;

        // Domain warp: turns smooth noise into churning convective plasma.
        vec3 q = vec3(
            fbm(p + vec3(0.0, uTime * 0.045, 0.0), 3),
            fbm(p + vec3(3.1, uTime * 0.038, 1.7), 3),
            fbm(p + vec3(1.3, uTime * 0.052, 5.2), 3)
        );

        float macro = fbm(p + q * 1.15 + vec3(0.0, uTime * 0.03, 0.0), 4);
        // Granulation - the fine convection cells that give the Sun its texture.
        float gran = fbm(p * 7.0 + q * 1.6 + vec3(uTime * 0.10, uTime * 0.06, 0.0), 3);

        float h = macro * 0.62 + gran * 0.38;
        h = pow(clamp(h * 0.5 + 0.5, 0.0, 1.0), 1.20);

        vec3 col = mix(uDeep, uMid, smoothstep(0.12, 0.58, h));
        col = mix(col, uHot, smoothstep(0.60, 0.96, h));

        // Sunspots: cool umbrae drifting slowly across the disc.
        float spots = fbm(p * 1.05 + vec3(11.0, uTime * 0.012, 4.0), 3);
        float spot = smoothstep(0.34, 0.62, spots);
        col *= 1.0 - spot * 0.74;

        // Limb darkening. Without this a shaded sphere reads as a flat disc.
        float ndv = clamp(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0, 1.0);
        col *= mix(0.42, 1.0, pow(ndv, 0.55));

        // Chromosphere flaring past the edge of the disc.
        col += uHot * pow(1.0 - ndv, 3.5) * 0.65;

        gl_FragColor = vec4(col * uIntensity, 1.0);
        #include <colorspace_fragment>
    }
`;

const CORONA_VERT = /* glsl */`
    varying vec3 vLocal;
    varying vec3 vWorldPos;

    void main() {
        vLocal = normalize(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

/*
 * Rendered on BackSide so the shell never paints over the photosphere.
 *
 * Brightness comes from the ray's *impact parameter* - how close the line of
 * sight passes to the star's centre - not from a fresnel term. A fresnel shell
 * only lights up at its own silhouette, which reads as a hard-edged disc with
 * a visible circular seam. Impact parameter falls smoothly to exactly zero at
 * the shell boundary, so the halo has no edge at all.
 */
const CORONA_FRAG = /* glsl */`
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uStrength;
    uniform float uFalloff;
    uniform float uStreak;
    uniform vec3 uCenter;
    uniform float uInner;
    uniform float uOuter;

    varying vec3 vLocal;
    varying vec3 vWorldPos;

    ${NOISE_GLSL}

    void main() {
        vec3 rd = normalize(vWorldPos - cameraPosition);
        vec3 oc = uCenter - cameraPosition;
        float tca = dot(oc, rd);
        // Perpendicular distance from the star's centre to this view ray.
        float b = sqrt(max(dot(oc, oc) - tca * tca, 0.0));

        float x = clamp((b - uInner) / max(uOuter - uInner, 1e-4), 0.0, 1.0);
        float glow = pow(1.0 - x, uFalloff);

        // Radial streamers, drifting outward.
        float n = fbm(vLocal * 3.2 + vec3(0.0, uTime * 0.05, uTime * 0.02), 3);
        float streak = mix(1.0, 0.40 + 0.90 * (n * 0.5 + 0.5), uStreak);

        float a = glow * streak * uStrength;
        if (a < 0.002) discard;

        gl_FragColor = vec4(uColor * a, 1.0);
        #include <colorspace_fragment>
    }
`;

// Colours are authored in linear space (roughly sRGB^2.2) and pushed above 1.0
// so the bloom threshold has something to catch.
const linear = (r, g, b) => new THREE.Vector3(
    Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)
);

export class Sun {
    constructor(scene, { radius = 5, highQuality = true } = {}) {
        this.radius = radius;
        this.group = new THREE.Group();

        const segments = highQuality ? 64 : 32;

        this.surfaceMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                // Just above 1.0: the hottest granules clip to white and bloom,
                // while most of the disc stays below clipping so the
                // convection cells and sunspots remain readable.
                uIntensity: { value: 1.75 },
                uDeep: { value: linear(0.82, 0.20, 0.02) },
                uMid: { value: linear(1.00, 0.62, 0.12) },
                uHot: { value: linear(1.00, 0.95, 0.72) },
            },
            vertexShader: SURFACE_VERT,
            fragmentShader: SURFACE_FRAG,
        });

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, segments, segments),
            this.surfaceMaterial
        );
        this.mesh.userData.sun = this;
        this.group.add(this.mesh);

        // Stacked shells fake volumetric scattering: tight and bright at the
        // chromosphere, wide and faint out in the corona. Two cheap spheres
        // beat any volumetric raymarch on a CPU budget.
        const shells = highQuality
            ? [
                // Chromosphere: tight, bright, hugging the disc.
                { scale: 1.45, strength: 1.30, falloff: 2.4, streak: 0.30, color: linear(1.00, 0.74, 0.30) },
                // Corona: wide, faint, streaky.
                { scale: 3.40, strength: 0.34, falloff: 3.0, streak: 0.75, color: linear(1.00, 0.52, 0.18) },
              ]
            : [
                { scale: 1.50, strength: 1.20, falloff: 2.4, streak: 0.0, color: linear(1.00, 0.72, 0.28) },
                { scale: 3.00, strength: 0.30, falloff: 3.0, streak: 0.0, color: linear(1.00, 0.50, 0.16) },
              ];

        this.shells = shells.map((cfg, i) => {
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uColor: { value: cfg.color },
                    uStrength: { value: cfg.strength },
                    uFalloff: { value: cfg.falloff },
                    uStreak: { value: cfg.streak },
                    uCenter: { value: new THREE.Vector3(0, 0, 0) },
                    // Full brightness at the edge of the photosphere, zero at
                    // the shell boundary.
                    uInner: { value: radius * 0.97 },
                    uOuter: { value: radius * cfg.scale },
                },
                vertexShader: CORONA_VERT,
                fragmentShader: CORONA_FRAG,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                transparent: true,
            });

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(radius * cfg.scale, highQuality ? 32 : 20, highQuality ? 24 : 14),
                material
            );
            mesh.renderOrder = 10 + i;
            mesh.raycast = () => {}; // never intercept a click meant for the disc
            this.group.add(mesh);
            return mesh;
        });

        // decay 0 / distance 0: uniform illumination for the few standard
        // materials in the scene (the ring rocks). The planets light themselves
        // in their own shader, so this light is nearly free.
        this.light = new THREE.PointLight(0xfff2dd, 2.2, 0, 0);
        this.group.add(this.light);

        scene.add(this.group);
    }

    setQualityIntensity(highQuality) {
        // Without bloom the star needs to carry its own glare, so push it a
        // little harder in performance mode.
        this.surfaceMaterial.uniforms.uIntensity.value = highQuality ? 1.75 : 2.1;
    }

    update(elapsed) {
        this.surfaceMaterial.uniforms.uTime.value = elapsed;
        for (const shell of this.shells) {
            shell.material.uniforms.uTime.value = elapsed;
        }
        // Slow, steady axial spin - the surface churn comes from the shader.
        this.mesh.rotation.y = elapsed * 0.035;
    }
}
