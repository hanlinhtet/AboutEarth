import * as THREE from 'three';

/*
 * Background: a GPU-only starfield plus a one-off baked nebula sky.
 *
 * Everything that animates (twinkle) lives in the vertex shader, so the whole
 * sky costs one draw call and zero CPU per frame. The nebula is baked to an
 * equirectangular canvas once, off the critical path, and handed to
 * scene.background so it never touches the depth buffer.
 */

// Galactic plane normal - the Milky Way band lies perpendicular to this.
const GALACTIC_NORMAL = new THREE.Vector3(0.30, 0.90, 0.32).normalize();
// Direction of the galactic centre, where the band is brightest.
const GALACTIC_CENTER = new THREE.Vector3(0.94, -0.10, -0.32).normalize();

// Stellar classes: r, g, b (sRGB), spawn weight. Real skies are mostly
// orange/red dwarfs with a handful of brilliant blue-white giants.
const STAR_CLASSES = [
    [0.60, 0.71, 1.00, 0.05], // O/B  blue
    [0.78, 0.86, 1.00, 0.11], // A    blue-white
    [0.98, 0.98, 1.00, 0.18], // F    white
    [1.00, 0.94, 0.80, 0.23], // G    yellow
    [1.00, 0.83, 0.62, 0.26], // K    orange
    [1.00, 0.71, 0.53, 0.17], // M    red
];

const STAR_VERT = /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute vec2 aTw;      // x: twinkle speed, y: phase

    uniform float uTime;
    uniform float uScale;    // device pixels per unit of aSize

    varying vec3 vColor;
    varying float vSpike;

    void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Atmosphere-free space doesn't twinkle, but a touch of scintillation
        // reads as "alive" instead of "dead pixels".
        float tw = 0.80 + 0.20 * sin(uTime * aTw.x + aTw.y);

        vColor = aColor * tw;
        vSpike = smoothstep(2.8, 6.5, aSize);

        gl_PointSize = aSize * uScale * (0.93 + 0.07 * tw);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const STAR_FRAG = /* glsl */`
    varying vec3 vColor;
    varying float vSpike;

    void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d2 = dot(uv, uv);

        float core = exp(-d2 * 30.0);        // tight airy core
        float halo = exp(-d2 * 8.0) * 0.20;  // soft bloom around it
        float a = core + halo;

        // Four-point diffraction cross, bright stars only.
        if (vSpike > 0.001) {
            float cross = max(0.0, 1.0 - abs(uv.x) * 16.0)
                        + max(0.0, 1.0 - abs(uv.y) * 16.0);
            a += cross * exp(-d2 * 9.0) * vSpike * 0.45;
        }

        if (a < 0.004) discard;

        gl_FragColor = vec4(vColor * a, 1.0);
        #include <colorspace_fragment>
    }
`;

function pickStarClass(r) {
    let acc = 0;
    for (const cls of STAR_CLASSES) {
        acc += cls[3];
        if (r <= acc) return cls;
    }
    return STAR_CLASSES[STAR_CLASSES.length - 1];
}

// sRGB -> linear. Shaders here author in linear space so the direct-render and
// post-processing paths produce identical colours.
const toLinear = (c) => Math.pow(c, 2.2);

export class Starfield {
    constructor(scene, { count = 14000, radius = 1500 } = {}) {
        this.radius = radius;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const twinkle = new Float32Array(count * 2);

        const dir = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            // Uniform direction on the unit sphere.
            const u = Math.random() * 2 - 1;
            const theta = Math.random() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            dir.set(s * Math.cos(theta), u, s * Math.sin(theta));

            // 45% of stars get pulled into the galactic band, and a third of
            // those crowd toward the galactic centre.
            if (Math.random() < 0.45) {
                // Gaussian-ish offset from the plane (Box-Muller).
                const g = Math.sqrt(-2 * Math.log(Math.random() + 1e-6)) *
                          Math.cos(Math.random() * Math.PI * 2);
                const targetH = THREE.MathUtils.clamp(g * 0.10, -0.5, 0.5);
                dir.addScaledVector(GALACTIC_NORMAL, targetH - dir.dot(GALACTIC_NORMAL));
                dir.normalize();

                if (Math.random() < 0.33) {
                    dir.lerp(GALACTIC_CENTER, Math.random() * 0.45).normalize();
                }
            }

            const r = radius * (0.92 + Math.random() * 0.16);
            positions[i * 3 + 0] = dir.x * r;
            positions[i * 3 + 1] = dir.y * r;
            positions[i * 3 + 2] = dir.z * r;

            const cls = pickStarClass(Math.random());
            // Steep power law: a few blazing stars, a great many faint ones.
            const mag = Math.pow(Math.random(), 5.0);
            // Kept mostly under the bloom threshold - stars that all bloom stop
            // looking like stars and start looking like lens dirt.
            const bright = 0.20 + mag * 0.92;

            colors[i * 3 + 0] = toLinear(cls[0]) * bright;
            colors[i * 3 + 1] = toLinear(cls[1]) * bright;
            colors[i * 3 + 2] = toLinear(cls[2]) * bright;

            sizes[i] = 1.0 + mag * 5.5;
            twinkle[i * 2 + 0] = 0.4 + Math.random() * 2.2;
            twinkle[i * 2 + 1] = Math.random() * Math.PI * 2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('aTw', new THREE.BufferAttribute(twinkle, 2));
        // Fixed shell around the camera - skip the per-frame bounds test.
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.1);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uScale: { value: 1 },
            },
            vertexShader: STAR_VERT,
            fragmentShader: STAR_FRAG,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            // Deliberately NOT transparent: that keeps the points in the opaque
            // render list so they draw first and get occluded by planets,
            // instead of being sorted on top of them.
            transparent: false,
        });

        this.points = new THREE.Points(geometry, this.material);
        this.points.renderOrder = -1;
        this.points.frustumCulled = false;
        this.points.matrixAutoUpdate = false;
        scene.add(this.points);
    }

    setPixelScale(heightInDevicePixels) {
        this.material.uniforms.uScale.value = heightInDevicePixels / 900;
    }

    update(elapsed, camera) {
        this.material.uniforms.uTime.value = elapsed;
        // Keep the shell centred on the camera so panning can never reach it.
        this.points.position.copy(camera.position);
        this.points.updateMatrix();
        this.points.updateMatrixWorld(true);
    }
}

/* ------------------------------------------------------------------ */
/* Baked nebula sky                                                    */
/* ------------------------------------------------------------------ */

function hash3(ix, iy, iz) {
    let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(iz, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Trilinear value noise. Sampled on a direction vector, so the resulting
// equirect map is seamless at the wrap and free of pole pinching.
function valueNoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);

    const c000 = hash3(xi, yi, zi),         c100 = hash3(xi + 1, yi, zi);
    const c010 = hash3(xi, yi + 1, zi),     c110 = hash3(xi + 1, yi + 1, zi);
    const c001 = hash3(xi, yi, zi + 1),     c101 = hash3(xi + 1, yi, zi + 1);
    const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);

    return lerp(
        lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
        lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
        zf
    );
}

function fbm(x, y, z, octaves) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
        sum += valueNoise(x * freq, y * freq, z * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2.07;
    }
    return sum / norm;
}

/**
 * Bakes an equirectangular deep-space sky: Milky Way band with a bright bulge,
 * dark dust lanes and a couple of cool nebulae. Runs once (~100ms), then costs
 * nothing - three renders it as a background quad with no depth writes.
 */
export function makeNebulaTexture(width = 1024, height = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(width, height);
    const data = img.data;

    const gn = GALACTIC_NORMAL, gc = GALACTIC_CENTER;

    for (let py = 0; py < height; py++) {
        const phi = (py / (height - 1)) * Math.PI;      // 0..PI, from +Y down
        const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);

        for (let px = 0; px < width; px++) {
            const lambda = (px / width) * Math.PI * 2;

            // Direction on the unit sphere, matching three's equirect mapping.
            const dx = -sinPhi * Math.sin(lambda);
            const dy = cosPhi;
            const dz = -sinPhi * Math.cos(lambda);

            // Distance from the galactic plane, and angle to the bulge.
            const h = dx * gn.x + dy * gn.y + dz * gn.z;
            const toCenter = dx * gc.x + dy * gc.y + dz * gc.z;

            const band = Math.exp(-(h * h) / (2 * 0.085 * 0.085));
            const bulge = Math.pow(Math.max(0, toCenter), 3.0);

            // Clouds along the band, plus wide cool wisps everywhere.
            const cloud = fbm(dx * 3.1 + 11.3, dy * 3.1 + 4.7, dz * 3.1 + 8.9, 4);
            const detail = fbm(dx * 8.5 - 3.2, dy * 8.5 + 9.1, dz * 8.5 - 1.4, 3);
            const wisp = fbm(dx * 1.7 + 31.0, dy * 1.7 - 17.0, dz * 1.7 + 5.0, 3);

            // Dust lanes: dark filaments that cut across the brightest part.
            const dust = Math.pow(fbm(dx * 5.5 - 21.0, dy * 5.5 + 13.0, dz * 5.5 + 2.0, 3), 1.6);
            const lane = 1.0 - band * Math.max(0, dust - 0.42) * 1.9;

            let density = band * (0.30 + 0.70 * cloud) * (0.55 + 0.45 * detail);
            density *= Math.max(0.0, lane);
            density *= 0.55 + 0.85 * bulge;

            // Warm cream in the crowded core, cool blue in the outskirts.
            const warmth = THREE.MathUtils.clamp(band * (0.35 + 0.65 * bulge), 0, 1);
            let r = density * lerp(0.52, 1.00, warmth);
            let g = density * lerp(0.62, 0.93, warmth);
            let b = density * lerp(1.00, 0.76, warmth);

            // Faint off-band nebulosity so the sky is never flat black.
            const neb = Math.max(0, wisp - 0.52) * 0.55;
            r += neb * 0.42;
            g += neb * 0.26;
            b += neb * 0.62;

            // Deep-space floor: a barely-there blue, never pure black.
            r += 0.012; g += 0.014; b += 0.026;

            // Keep it dim. A bright nebula reads as fog, not as space.
            // No per-pixel star speckle here: one texel of a 1024x512 equirect
            // covers many screen pixels, so single bright pixels magnify into
            // visible rectangles. Point stars are the Starfield's job.
            const exposure = 120;
            const ir = Math.min(255, r * exposure);
            const ig = Math.min(255, g * exposure);
            const ib = Math.min(255, b * exposure);

            const o = (py * width + px) * 4;
            data[o] = ir; data[o + 1] = ig; data[o + 2] = ib; data[o + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
}
