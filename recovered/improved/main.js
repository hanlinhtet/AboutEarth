import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sun } from './sun.js';
import { planetData, Planet, setTextureQuality } from './planet.js';
import { Starfield, makeNebulaTexture } from './stars.js';

/* ------------------------------------------------------------------ */
/* Quality                                                             */
/* ------------------------------------------------------------------ */

// Guess once, then let the user override. Bloom and the extra corona shell are
// the only genuinely expensive effects here, so they are what the toggle moves.
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const looksWeak = isMobile || (navigator.hardwareConcurrency || 4) <= 4;

const quality = {
    high: !looksWeak,
    maxPixelRatio: looksWeak ? 1.0 : 1.5,
    // Frame cap. A 144Hz display otherwise burns 2.4x the CPU to animate the
    // same orbits nobody can see move faster.
    maxFps: 60,
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 30, 72);

const renderer = new THREE.WebGLRenderer({
    antialias: quality.high,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Shadows are off on purpose. The only shadow-caster was the Sun's point light,
// which means a 2048x2048 *cube* map - six full scene renders per frame - and
// the planets light themselves in their own shader, so nothing consumed it.
renderer.shadowMap.enabled = false;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

setTextureQuality(renderer);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // inertia: the single biggest "smoothness" win
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 1.2;
controls.maxDistance = 600;
controls.target.set(0, 0, 0);

const sun = new Sun(scene, { radius: 5, highQuality: quality.high });
const planets = Object.keys(planetData).map(name => new Planet(scene, name, planetData[name]));

const starfield = new Starfield(scene, { count: quality.high ? 15000 : 7000, radius: 1500 });
starfield.setPixelScale(window.innerHeight * renderer.getPixelRatio());

// The nebula bake is ~100ms of pure JS. Defer it one frame so first paint isn't
// blocked by it; the sky simply fades in a moment after the scene appears.
requestAnimationFrame(() => {
    setTimeout(() => {
        try {
            scene.background = makeNebulaTexture(1024, 512);
        } catch (err) {
            console.warn('Nebula bake failed, keeping plain space:', err);
        }
    }, 0);
});

/* ------------------------------------------------------------------ */
/* Post-processing                                                     */
/* ------------------------------------------------------------------ */

let composer = null;
let bloomPass = null;

function buildComposer() {
    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);

    // MSAA in the composer target only when we aren't already supersampling
    // via a high device pixel ratio.
    const samples = renderer.getPixelRatio() > 1.25 ? 0 : 4;
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
        type: THREE.HalfFloatType,   // needed for the Sun's >1.0 output to bloom
        samples,
    });

    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));

    // strength, radius, threshold. A wide radius smears the Sun's glare across
    // the entire frame as a brown wash, so keep it tight and let the corona
    // shells do the wide glow instead.
    bloomPass = new UnrealBloomPass(size, 0.55, 0.22, 0.90);
    composer.addPass(bloomPass);

    composer.addPass(new OutputPass());
}

function teardownComposer() {
    if (composer) composer.dispose();
    composer = null;
    bloomPass = null;
}

function applyQuality() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
    starfield.setPixelScale(window.innerHeight * renderer.getPixelRatio());
    sun.setQualityIntensity(quality.high);
    planets.forEach(p => p.setOrbitPathVisible(true));

    teardownComposer();
    if (quality.high) buildComposer();

    if (qualityBtn) qualityBtn.innerText = quality.high ? 'Quality: High' : 'Quality: Performance';
}

/* ------------------------------------------------------------------ */
/* Focus state                                                         */
/* ------------------------------------------------------------------ */

let focusTarget = null;          // { object3D, radius, isSun }
let isTransitioning = false;
const desiredCamPos = new THREE.Vector3();
const focusWorldPos = new THREE.Vector3();
const prevFocusWorldPos = new THREE.Vector3();
const focusDelta = new THREE.Vector3();
const origin = new THREE.Vector3(0, 0, 0);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

const planetNameEl = document.getElementById('planet-name');
const planetDescEl = document.getElementById('planet-desc');
const resetBtn = document.getElementById('reset-view');
const searchInput = document.getElementById('planet-search');
const searchResults = document.getElementById('search-results');
const navArrows = document.getElementById('nav-arrows');
const prevBtn = document.getElementById('prev-planet');
const nextBtn = document.getElementById('next-planet');
const currentNavName = document.getElementById('current-nav-name');
const qualityBtn = document.getElementById('quality-toggle');
const fpsEl = document.getElementById('fps-readout');

const allFocusable = [
    { name: 'Sun', instance: sun, isSun: true },
    ...planets.map(p => ({ name: p.name, instance: p, isSun: false })),
];

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    searchResults.innerHTML = '';
    if (!term) return;

    allFocusable
        .filter(item => item.name.toLowerCase().includes(term))
        .forEach(match => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerText = match.name;
            div.addEventListener('click', () => {
                if (match.isSun) focusSun();
                else focusPlanet(match.instance);
                searchInput.value = '';
                searchResults.innerHTML = '';
            });
            searchResults.appendChild(div);
        });
});

function updateNavUI() {
    if (focusTarget) {
        navArrows.classList.add('visible');
        currentNavName.innerText = focusTarget.name;
    } else {
        navArrows.classList.remove('visible');
    }
}

function navigate(direction) {
    if (!focusTarget) return;
    const currentIndex = allFocusable.findIndex(item => item.name === focusTarget.name);
    if (currentIndex === -1) return;

    const next = allFocusable[(currentIndex + direction + allFocusable.length) % allFocusable.length];
    if (next.isSun) focusSun();
    else focusPlanet(next.instance);
}

prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

if (qualityBtn) {
    qualityBtn.addEventListener('click', () => {
        quality.high = !quality.high;
        quality.maxPixelRatio = quality.high ? 1.5 : 1.0;
        applyQuality();
        onResize();
    });
}

/* ------------------------------------------------------------------ */
/* Picking                                                            */
/* ------------------------------------------------------------------ */

// An explicit pick list, instead of raycasting scene.children recursively -
// that walked the starfield's 15000 points and every ring instance on click.
const pickables = [sun.mesh, ...planets.map(p => p.mesh)];

let pointerDownAt = null;

renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDownAt = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDownAt) return;
    const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
    pointerDownAt = null;
    // Treat it as a click only if the pointer barely moved: a camera drag
    // should never select whatever happens to be under the cursor.
    if (moved > 5) return;

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(pickables, true);
    if (hits.length === 0) return;

    let object = hits[0].object;
    if (object.userData.sun || object === sun.mesh) {
        focusSun();
        return;
    }

    let planetInstance = object.userData.planet || null;
    object.traverseAncestors((ancestor) => {
        if (ancestor.userData.planet) planetInstance = ancestor.userData.planet;
    });
    if (planetInstance) focusPlanet(planetInstance);
});

/* ------------------------------------------------------------------ */
/* Focus transitions                                                   */
/* ------------------------------------------------------------------ */

function beginFocus(object3D, radius, name, title, desc) {
    focusTarget = { object3D, radius, name };
    isTransitioning = true;
    planetNameEl.innerText = title;
    planetDescEl.innerText = desc;

    object3D.getWorldPosition(prevFocusWorldPos);
    updateNavUI();
}

function focusPlanet(planet) {
    if (!planet.mesh) return;
    beginFocus(planet.mesh, planet.radius, planet.name, planet.name, planet.desc);
}

function focusSun() {
    beginFocus(sun.mesh, sun.radius, 'Sun', 'The Sun',
        'Center of our Solar System, provider of life.');
}

resetBtn.addEventListener('click', () => {
    focusTarget = null;
    isTransitioning = true;
    planetNameEl.innerText = 'Solar System';
    planetDescEl.innerText = 'Click a planet to focus.';
    desiredCamPos.set(0, 30, 72);
    updateNavUI();
});

window.addEventListener('keydown', (e) => {
    if (e.target === searchInput) return;
    if (e.key === 'ArrowLeft') navigate(-1);
    else if (e.key === 'ArrowRight') navigate(1);
    else if (e.key === 'Escape') resetBtn.click();
    else if (e.key === 'f' || e.key === 'F') {
        if (fpsEl) fpsEl.classList.toggle('visible');
    }
});

/**
 * Frame-rate independent smoothing. A raw `lerp(a, b, 0.05)` per frame moves
 * twice as fast at 120fps as at 60; this converges at the same rate either way.
 */
function smoothing(rate, dt) {
    return 1 - Math.exp(-rate * dt);
}

/**
 * Camera offset that keeps the lit hemisphere facing us: pull back along the
 * planet's sun-facing direction rather than a fixed world-space vector.
 */
function computeFocusOffset(worldPos, radius, out) {
    const dist = Math.max(radius * 4.2, 2.2);
    out.copy(worldPos);
    if (out.lengthSq() < 1e-6) out.set(0, 0, 1);   // the Sun itself
    out.normalize().multiplyScalar(dist);
    out.y += dist * 0.32;
    return out;
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

let lastTime = performance.now();
let elapsed = 0;
let frameAccumulator = 0;
let fpsFrames = 0;
let fpsElapsed = 0;

function render() {
    // renderer.info auto-resets on every render() call, which with a composer
    // means the stats only ever describe the final pass. Reset once per frame
    // instead so the readout covers the whole pipeline.
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(scene, camera);
}

function animate(now) {
    requestAnimationFrame(animate);

    const time = now !== undefined ? now : performance.now();
    // Clamp so a backgrounded tab doesn't teleport every planet on return.
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    // Nothing is visible, so don't spend anything drawing it.
    if (document.hidden) return;

    // Soft frame cap: skip the frame but keep accumulating time so motion stays
    // continuous rather than stuttering.
    frameAccumulator += dt;
    const minStep = 1 / quality.maxFps;
    if (frameAccumulator < minStep * 0.9) return;
    const step = frameAccumulator;
    frameAccumulator = 0;

    elapsed += step;

    sun.update(elapsed);
    // Planets never stop orbiting, even while focused - the camera follows
    // instead. Freezing an orbit made every unfocus snap the planet forward.
    for (const planet of planets) planet.update(step);

    starfield.update(elapsed, camera);

    if (focusTarget) {
        focusTarget.object3D.getWorldPosition(focusWorldPos);

        if (isTransitioning) {
            computeFocusOffset(focusWorldPos, focusTarget.radius, desiredCamPos);
            desiredCamPos.add(focusWorldPos);

            const t = smoothing(3.0, step);
            controls.target.lerp(focusWorldPos, t);
            camera.position.lerp(desiredCamPos, t);

            if (camera.position.distanceTo(desiredCamPos) < focusTarget.radius * 0.05 + 0.05) {
                isTransitioning = false;
            }
        } else {
            // Follow mode: carry the camera along by exactly the planet's own
            // movement, which preserves whatever orbit the user has dragged to.
            focusDelta.subVectors(focusWorldPos, prevFocusWorldPos);
            camera.position.add(focusDelta);
            controls.target.copy(focusWorldPos);
        }

        prevFocusWorldPos.copy(focusWorldPos);
    } else if (isTransitioning) {
        const t = smoothing(3.0, step);
        controls.target.lerp(origin, t);
        camera.position.lerp(desiredCamPos, t);
        if (camera.position.distanceTo(desiredCamPos) < 0.15) isTransitioning = false;
    }

    controls.update();
    render();

    if (fpsEl && fpsEl.classList.contains('visible')) {
        fpsFrames++;
        fpsElapsed += step;
        if (fpsElapsed >= 0.5) {
            const fps = Math.round(fpsFrames / fpsElapsed);
            const info = renderer.info.render;
            fpsEl.innerText = `${fps} fps · ${info.calls} draws · ${(info.triangles / 1000).toFixed(0)}k tris`;
            fpsFrames = 0;
            fpsElapsed = 0;
        }
    }
}

/* ------------------------------------------------------------------ */
/* Resize                                                              */
/* ------------------------------------------------------------------ */

let resizeTimer = null;

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    if (bloomPass) bloomPass.setSize(size.x, size.y);
    starfield.setPixelScale(window.innerHeight * renderer.getPixelRatio());
}

window.addEventListener('resize', () => {
    // Debounced: dragging a window otherwise reallocates every render target
    // dozens of times a second.
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
});

// A tab switch stops rAF; reset the clock so the first frame back is normal.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now();
});

applyQuality();
animate();
