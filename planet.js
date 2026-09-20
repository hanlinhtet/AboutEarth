import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const planetData = {
    Mercury: {
        radius: 0.4,
        distance: 10,
        color: 0xaaaaaa,
        speed: 0.04,
        spin: 0.10,
        tilt: 0.03,
        desc: "Smallest planet.",
        isTextured: true,
        dayTex: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/i/a/1/PIA17386.jpg?w=4096&h=2048&fit=clip&crop=faces%2Cfocalpoint',
        rimColor: new THREE.Vector3(0.7, 0.7, 0.7),
        type: 'Terrestrial planet',
        about: "The smallest planet and the closest to the Sun. Mercury has almost no atmosphere to trap heat, so it swings between scorching days and freezing nights — the most extreme temperature range of any planet.",
        stats: {
            'Diameter': '4,879 km',
            'Mass': '0.055 × Earth',
            'Distance from Sun': '57.9 million km',
            'Orbital period': '88 Earth days',
            'Day length': '176 Earth days',
            'Moons': 'None',
            'Gravity': '3.7 m/s²',
            'Mean temperature': '167 °C'
        }
    },
    Venus:   {
        radius: 0.8,
        distance: 15,
        color: 0xe3bb76,
        speed: 0.03,
        spin: -0.05,
        tilt: 177.4,
        desc: "Earth's sister.",
        isTextured: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Solarsystemscope_texture_8k_venus_surface.jpg',
        rimColor: new THREE.Vector3(0.9, 0.8, 0.6),
        type: 'Terrestrial planet',
        about: "Earth's twin in size, but a runaway greenhouse effect has made it the hottest planet in the solar system - hotter even than Mercury. Its thick carbon dioxide atmosphere crushes down at 90 times Earth's pressure, and it spins backwards.",
        stats: {
            'Diameter': '12,104 km',
            'Mass': '0.815 × Earth',
            'Distance from Sun': '108.2 million km',
            'Orbital period': '225 Earth days',
            'Day length': '117 Earth days',
            'Moons': 'None',
            'Gravity': '8.9 m/s²',
            'Mean temperature': '464 °C'
        }
    },
    Earth:   {
        radius: 0.9,
        distance: 20,
        color: 0x2233ff,
        speed: 0.02,
        spin: 0.28,
        tilt: 23.4,
        desc: "Our home.",
        isEarth: true,
        dayTex: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        nightTex: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
        rimColor: new THREE.Vector3(0.3, 0.6, 1.0),
        type: 'Terrestrial planet',
        about: "The only world known to harbour life. Liquid water covers 71% of its surface, and a nitrogen-oxygen atmosphere shields it from radiation while keeping temperatures stable enough for that water to stay liquid.",
        stats: {
            'Diameter': '12,756 km',
            'Mass': '5.97 × 10²⁴ kg',
            'Distance from Sun': '149.6 million km',
            'Orbital period': '365.25 days',
            'Day length': '24 hours',
            'Moons': '1',
            'Gravity': '9.8 m/s²',
            'Mean temperature': '15 °C'
        }
    },
    Mars:    {
        radius: 0.7,
        distance: 25,
        color: 0xff4422,
        speed: 0.015,
        spin: 0.27,
        tilt: 25.2,
        desc: "The Red Planet.",
        isMars: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Mars_%284997052786%29.jpg',
        rimColor: new THREE.Vector3(1.0, 0.4, 0.2),
        type: 'Terrestrial planet',
        about: "The Red Planet owes its colour to iron oxide dust. It hosts the tallest volcano and one of the deepest canyons in the solar system, and its polar ice caps and dry riverbeds point to a far wetter past.",
        stats: {
            'Diameter': '6,792 km',
            'Mass': '0.107 × Earth',
            'Distance from Sun': '228 million km',
            'Orbital period': '687 Earth days',
            'Day length': '24.7 hours',
            'Moons': '2 — Phobos, Deimos',
            'Gravity': '3.7 m/s²',
            'Mean temperature': '−65 °C'
        }
    },
    Jupiter: {
        radius: 2.0,
        distance: 35,
        color: 0xd39c7e,
        speed: 0.01,
        spin: 0.68,
        tilt: 3.1,
        desc: "Massive gas giant, largest in our system.",
        isTextured: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Solarsystemscope_texture_2k_jupiter.jpg',
        rimColor: new THREE.Vector3(0.8, 0.7, 0.6),
        type: 'Gas giant',
        about: "More massive than every other planet combined. Jupiter has no solid surface - just deepening layers of hydrogen and helium. The Great Red Spot is a storm wider than Earth that has raged for centuries.",
        stats: {
            'Diameter': '142,984 km',
            'Mass': '317.8 × Earth',
            'Distance from Sun': '778.5 million km',
            'Orbital period': '11.9 Earth years',
            'Day length': '9.9 hours',
            'Moons': '95 confirmed',
            'Gravity': '23.1 m/s²',
            'Mean temperature': '−110 °C'
        }
    },
    Saturn:  {
        radius: 1.7,
        distance: 45,
        color: 0xc5ab6e,
        speed: 0.008,
        spin: 0.62,
        tilt: 26.7,
        desc: "Famous for its stunning ring system.",
        isTextured: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_8k_saturn.jpg',
        hasRings: true,
        rimColor: new THREE.Vector3(0.8, 0.7, 0.5),
        type: 'Gas giant',
        about: "Famous for the brightest ring system in the solar system - countless particles of ice and rock, most no bigger than a house, spread across a disc barely tens of metres thick. Saturn is less dense than water.",
        stats: {
            'Diameter': '120,536 km',
            'Mass': '95.2 × Earth',
            'Distance from Sun': '1.43 billion km',
            'Orbital period': '29.4 Earth years',
            'Day length': '10.7 hours',
            'Moons': '146 confirmed',
            'Gravity': '9.0 m/s²',
            'Mean temperature': '−140 °C'
        }
    },
    Uranus:  {
        radius: 1.2,
        distance: 55,
        color: 0xbbe1e4,
        speed: 0.006,
        spin: -0.40,
        tilt: 97.8,
        desc: "Ice giant, rotates on its side.",
        isTextured: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Solarsystemscope_texture_2k_uranus.jpg',
        rimColor: new THREE.Vector3(0.6, 0.8, 0.9),
        type: 'Ice giant',
        about: "Uranus orbits on its side, tipped 98° - most likely knocked over by an ancient collision. That extreme tilt gives each pole a 42-year day followed by a 42-year night. Methane in its atmosphere gives it a pale cyan colour.",
        stats: {
            'Diameter': '51,118 km',
            'Mass': '14.5 × Earth',
            'Distance from Sun': '2.87 billion km',
            'Orbital period': '84 Earth years',
            'Day length': '17.2 hours',
            'Moons': '28 confirmed',
            'Gravity': '8.7 m/s²',
            'Mean temperature': '−195 °C'
        }
    },
    Neptune: {
        radius: 1.1,
        distance: 65,
        color: 0x6081ff,
        speed: 0.005,
        spin: 0.42,
        tilt: 28.3,
        desc: "Cold, windy, blue ice giant.",
        isTextured: true,
        dayTex: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_2k_neptune.jpg',
        rimColor: new THREE.Vector3(0.4, 0.5, 0.9),
        type: 'Ice giant',
        about: "The most distant planet, and the windiest - supersonic gales reach 2,000 km/h. Neptune was found by mathematics before anyone saw it, predicted from irregularities in the orbit of Uranus.",
        stats: {
            'Diameter': '49,528 km',
            'Mass': '17.1 × Earth',
            'Distance from Sun': '4.5 billion km',
            'Orbital period': '164.8 Earth years',
            'Day length': '16.1 hours',
            'Moons': '16 confirmed',
            'Gravity': '11.0 m/s²',
            'Mean temperature': '−200 °C'
        }
    },
    Pluto:   {
        radius: 0.2,
        distance: 75,
        color: 0x888888,
        speed: 0.004,
        spin: 0.09,
        tilt: 122.5,
        desc: "Dwarf planet, located in the Kuiper belt.",
        isTextured: true,
        dayTex: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/7117654f-5f91-4761-bde0-727b9abb0112/di7sqt5-6e5aaf23-ba34-48aa-8c2a-31eb5d9e8615.png/v1/fill/w_1264,h_632,q_70,strp/pluto_texture_map__fixed_blur___unmaped_areas__by_4stron4omi4_di7sqt5-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjQwIiwicGF0aCI6Ii9mLzcxMTc2NTRmLTVmOTEtNDc2MS1iZGUwLTcyN2I5YWJiMDExMi9kaTdzcXQ1LTZlNWFhZjIzLWJhMzQtNDhhYS04YzJhLTMxZWI1ZDllODYxNS5wbmciLCJ3aWR0aCI6Ijw9MTI4MCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.2ZqKkITp3qZg77C-0-ff-cWuvaADPwq82nCx2Bu39mA',
        rimColor: new THREE.Vector3(0.6, 0.6, 0.6),
        type: 'Dwarf planet',
        about: "Reclassified as a dwarf planet in 2006 because it shares its orbital neighbourhood with other Kuiper Belt objects. Its orbit is so elliptical that it sometimes passes closer to the Sun than Neptune.",
        stats: {
            'Diameter': '2,376 km',
            'Mass': '0.0022 × Earth',
            'Distance from Sun': '5.9 billion km',
            'Orbital period': '248 Earth years',
            'Day length': '153 hours',
            'Moons': '5 — incl. Charon',
            'Gravity': '0.7 m/s²',
            'Mean temperature': '−225 °C'
        }
    }
};

const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

// Scratch vectors - reallocating these every frame for every planet was pure
// garbage-collector pressure.
const _worldPos = new THREE.Vector3();

// Orbital rates in planetData were per-frame deltas, which made every speed in
// the scene depend on the refresh rate. They are now radians/second: multiply
// by 60 to recover the old 60fps feel, then scale down to something watchable.
const ORBIT_RATE = 60 * 0.10;

// Total triangle budget for a ring system. Instance count is derived from the
// loaded rock so a dense model can't quietly cost hundreds of millions of tris.
const RING_TRIANGLE_BUDGET = 450000;
const RING_MAX_INSTANCES = 4000;

let maxAnisotropy = 1;
export function setTextureQuality(renderer) {
    maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
}

function loadTexture(url) {
    const tex = texLoader.load(url);
    tex.anisotropy = maxAnisotropy;
    // Left in raw/no-colorspace: the shader below does the sRGB decode itself
    // so it can do its lighting maths in linear space.
    return tex;
}

const PLANET_VERT = /* glsl */`
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDirW;

    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const PLANET_FRAG = /* glsl */`
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    uniform vec3 rimColor;
    uniform float hasNightTexture;

    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDirW;

    vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }

    void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDirW);
        vec3 L = normalize(sunDirection);

        float intensity = dot(N, L);
        float dayWeight = smoothstep(-0.15, 0.15, intensity);

        vec3 dayColor = srgbToLinear(texture2D(dayTexture, vUv).rgb);
        vec3 nightColor = srgbToLinear(texture2D(nightTexture, vUv).rgb);

        if (hasNightTexture < 0.5) {
            nightColor = dayColor * 0.05;
        } else {
            nightColor *= 2.2;   // city lights read as emissive
        }

        vec3 color = mix(nightColor, dayColor, dayWeight);

        // Terminator warming: sunlight grazing the limb goes gold.
        float grazing = (1.0 - abs(intensity)) * dayWeight;
        color *= 1.0 + vec3(0.22, 0.10, 0.0) * grazing;

        // Atmospheric rim, strongest on the lit crescent.
        float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
        float litRim = mix(0.12, 1.0, dayWeight);
        color += srgbToLinear(rimColor) * fresnel * litRim * 0.85;

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
    }
`;

export class Planet {
    constructor(scene, name, data) {
        this.name = name;
        this.desc = data.desc;
        this.distance = data.distance;
        this.speed = data.speed;
        this.radius = data.radius;
        this.spinRate = data.spin !== undefined ? data.spin : 0.25;
        this.angle = Math.random() * Math.PI * 2;

        // orbitGroup -> mesh (pivot at orbital radius) -> tilt -> spin -> surface
        this.orbitGroup = new THREE.Group();
        scene.add(this.orbitGroup);

        this.mesh = new THREE.Group();
        this.mesh.userData.planet = this;
        this.orbitGroup.add(this.mesh);
        this.mesh.position.x = data.distance;

        this.tiltGroup = new THREE.Group();
        this.tiltGroup.rotation.z = THREE.MathUtils.degToRad(data.tilt || 0);
        this.mesh.add(this.tiltGroup);

        this.spinGroup = new THREE.Group();
        this.tiltGroup.add(this.spinGroup);

        // Materials whose sunDirection uniform needs updating. Resolved once
        // here instead of traversing the subtree on every single frame.
        this.shaderTargets = [];

        if (data.model) {
            this.loadModel(data);
        } else if (data.isEarth || data.isMars || data.isTextured) {
            this.planetMesh = this.createPlanetWithShader(data);
            this.spinGroup.add(this.planetMesh);
            this.shaderTargets.push(this.planetMesh);
        } else {
            const geo = new THREE.SphereGeometry(this.radius, 32, 24);
            const mat = new THREE.MeshStandardMaterial({ color: data.color });
            this.planetMesh = new THREE.Mesh(geo, mat);
            this.spinGroup.add(this.planetMesh);
        }

        this.createOrbitPath(scene);

        if (data.hasRings) {
            this.createRings();
        }
    }

    /**
     * A faint circle on the orbital plane. Nine extra line draws, and the whole
     * scene suddenly reads as a solar system rather than floating spheres.
     */
    createOrbitPath(scene) {
        const segments = 160;
        const points = new Float32Array((segments + 1) * 3);
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            points[i * 3 + 0] = Math.cos(a) * this.distance;
            points[i * 3 + 1] = 0;
            points[i * 3 + 2] = Math.sin(a) * this.distance;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(points, 3));

        this.orbitPath = new THREE.Line(geo, new THREE.LineBasicMaterial({
            color: 0x1d3550,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: false,
        }));
        this.orbitPath.renderOrder = -1;
        this.orbitPath.matrixAutoUpdate = false;
        scene.add(this.orbitPath);
    }

    setOrbitPathVisible(visible) {
        if (this.orbitPath) this.orbitPath.visible = visible;
    }

    createRings() {
        loader.load('models/asteroids.glb', (gltf) => {
            // Pick the lightest mesh in the file: at thousands of instances the
            // triangle count of the source rock is what decides the frame time.
            let rock = null;
            let rockTris = Infinity;
            gltf.scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return;
                const idx = child.geometry.index;
                const tris = (idx ? idx.count : child.geometry.attributes.position.count) / 3;
                if (tris < rockTris) {
                    rockTris = tris;
                    rock = child;
                }
            });

            if (!rock) {
                this.createFallbackRings();
                return;
            }

            const count = THREE.MathUtils.clamp(
                Math.floor(RING_TRIANGLE_BUDGET / Math.max(rockTris, 1)),
                600,
                RING_MAX_INSTANCES
            );

            this.ringGroup = this.buildInstancedRing(rock.geometry, rock.material, count, 0.0012, 0.0055);
            this.tiltGroup.add(this.ringGroup);
        }, undefined, (error) => {
            console.warn('Asteroid model unavailable, using procedural rings:', error);
            this.createFallbackRings();
        });
    }

    createFallbackRings() {
        const geo = new THREE.TetrahedronGeometry(1, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xb0a08c, roughness: 0.95, metalness: 0.0
        });
        this.ringGroup = this.buildInstancedRing(geo, mat, 3000, 0.015, 0.040);
        this.tiltGroup.add(this.ringGroup);
    }

    buildInstancedRing(geometry, material, count, scaleMin, scaleMax) {
        const mesh = new THREE.InstancedMesh(geometry, material, count);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            // sqrt keeps the rocks evenly spread by area rather than piling up
            // against the inner edge.
            const t = Math.sqrt(Math.random());
            const distance = THREE.MathUtils.lerp(this.radius * 1.35, this.radius * 2.4, t);

            // Cassini-division style gap.
            const gap = Math.abs(t - 0.62) < 0.035 ? 1.12 : 1.0;

            dummy.position.set(
                Math.cos(angle) * distance * gap,
                (Math.random() - 0.5) * 0.09,
                Math.sin(angle) * distance * gap
            );
            dummy.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            dummy.scale.setScalar(THREE.MathUtils.randFloat(scaleMin, scaleMax));

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        // Raycasting an InstancedMesh tests every instance. A click on Saturn
        // should hit the planet, not walk thousands of rocks.
        mesh.raycast = () => {};
        return mesh;
    }

    loadModel(data) {
        loader.load(data.model, (gltf) => {
            const model = gltf.scene;

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            model.scale.setScalar((this.radius * 2) / maxDim);

            if (data.dayTex) {
                const dayTex = loadTexture(data.dayTex);
                const nightTex = data.nightTex ? loadTexture(data.nightTex) : dayTex;
                const material = this.getShaderMaterial(dayTex, nightTex, data.rimColor, !!data.nightTex);

                model.traverse(child => {
                    if (child.isMesh) {
                        child.material = material;
                        this.shaderTargets.push(child);
                    }
                });
            }

            this.spinGroup.add(model);
            this.planetMesh = model;
        });
    }

    createPlanetWithShader(data) {
        const dayTex = loadTexture(data.dayTex);
        const nightTex = data.nightTex ? loadTexture(data.nightTex) : dayTex;
        const material = this.getShaderMaterial(dayTex, nightTex, data.rimColor, !!data.nightTex);
        // 48x36 is visually identical to 64x64 at these radii for ~40% of the verts.
        return new THREE.Mesh(new THREE.SphereGeometry(this.radius, 48, 36), material);
    }

    getShaderMaterial(dayTex, nightTex, rimColor, hasNightTex) {
        return new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: dayTex },
                nightTexture: { value: nightTex },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                rimColor: { value: rimColor || new THREE.Vector3(1, 1, 1) },
                hasNightTexture: { value: hasNightTex ? 1.0 : 0.0 }
            },
            vertexShader: PLANET_VERT,
            fragmentShader: PLANET_FRAG
        });
    }

    /** @param {number} dt seconds since the previous frame */
    update(dt) {
        this.angle += this.speed * ORBIT_RATE * dt;
        this.orbitGroup.rotation.y = this.angle;
        this.spinGroup.rotation.y += this.spinRate * dt;

        if (this.ringGroup) {
            this.ringGroup.rotation.y += 0.05 * dt;
        }

        if (this.shaderTargets.length === 0) return;

        // The Sun sits at the origin, so the direction to it is just the
        // negated world position.
        this.mesh.getWorldPosition(_worldPos);
        _worldPos.negate().normalize();
        for (const target of this.shaderTargets) {
            target.material.uniforms.sunDirection.value.copy(_worldPos);
        }
    }
}
