import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sun } from './sun.js';
import { planetData, Planet } from './planet.js';


// Setup Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 50);

// Add Starfield
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
const starVertices = [];
for (let i = 0; i < 5000; i++) {
    starVertices.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Enable realistic lighting
renderer.useLegacyLights = false; // Newer way to handle physicallyCorrectLights
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Add Ambient Light (like in test-earth.html)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Setup Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.screenSpacePanning = true;

// Initialize Sun and Planets
const sun = new Sun(scene);
const planets = Object.keys(planetData).map(name => {
    return new Planet(scene, name, planetData[name]);
});
// Interaction State
let focusedPlanet = null;
let isSunFocused = false;
let isTransitioning = false;
let targetCameraPos = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// UI Elements
const planetNameEl = document.getElementById('planet-name');
const planetDescEl = document.getElementById('planet-desc');
const resetBtn = document.getElementById('reset-view');
const searchInput = document.getElementById('planet-search');
const searchResults = document.getElementById('search-results');
const navArrows = document.getElementById('nav-arrows');
const prevBtn = document.getElementById('prev-planet');
const nextBtn = document.getElementById('next-planet');
const currentNavName = document.getElementById('current-nav-name');

// Combine sun and planets for navigation
const allFocusable = [{ name: 'Sun', instance: sun, isSun: true }, ...planets.map(p => ({ name: p.name, instance: p, isSun: false }))];

// Search logic
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    searchResults.innerHTML = '';

    if (term.length > 0) {
        const matches = allFocusable.filter(item => item.name.toLowerCase().includes(term));
        matches.forEach(match => {
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
    }
});

// Navigation arrows logic
function updateNavUI() {
    if (focusedPlanet || isSunFocused) {
        navArrows.classList.add('visible');
        currentNavName.innerText = isSunFocused ? 'Sun' : focusedPlanet.name;
    } else {
        navArrows.classList.remove('visible');
    }
}

function navigate(direction) {
    let currentIndex = -1;
    if (isSunFocused) currentIndex = 0;
    else if (focusedPlanet) {
        currentIndex = allFocusable.findIndex(item => !item.isSun && item.instance === focusedPlanet);
    }

    if (currentIndex === -1) return;

    let nextIndex = (currentIndex + direction + allFocusable.length) % allFocusable.length;
    const nextItem = allFocusable[nextIndex];

    if (nextItem.isSun) focusSun();
    else focusPlanet(nextItem.instance);
}

prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });

const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -10;
plane.receiveShadow = true;
scene.add(plane);

// Click listener for raycasting
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#ui-layer') || e.target.closest('#nav-arrows')) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect the entire scene or just the orbit groups
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        let planetInstance = null;

        // Traverse up the tree to find if this mesh belongs to a Planet
        object.traverseAncestors((ancestor) => {
            if (ancestor.userData.planet) {
                planetInstance = ancestor.userData.planet;
            }
        });

        if (object === sun.mesh) {
            focusSun();
        } else if (planetInstance) {
            focusPlanet(planetInstance);
        }
    }
});

// In main.js, update your focusPlanet function:
function focusPlanet(planet) {
    if (!planet.mesh) return;
    focusedPlanet = planet;
    isSunFocused = false;
    isTransitioning = true;

    planetNameEl.innerText = planet.name;
    planetDescEl.innerText = planet.desc;

    const targetPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(targetPos);

    // NEW MATH: Offset the camera to the side and slightly up
    // so you can actually see the day-side illuminated by the sun!
    const zoomDistance = planet.radius * 4;
    targetCameraPos.copy(targetPos).add(new THREE.Vector3(zoomDistance, zoomDistance * 0.5, zoomDistance));
    updateNavUI();
}

function focusSun() {
    focusedPlanet = null;
    isSunFocused = true;
    isTransitioning = true;

    planetNameEl.innerText = "The Sun";
    planetDescEl.innerText = "Center of our Solar System, provider of life.";

    targetCameraPos.set(0, 5, 15);
    updateNavUI();
}

resetBtn.addEventListener('click', () => {
    focusedPlanet = null;
    isSunFocused = false;
    isTransitioning = true;

    planetNameEl.innerText = "Solar System";
    planetDescEl.innerText = "Click a planet to focus.";

    targetCameraPos.set(0, 20, 50);
    updateNavUI();
});

function animate() {
    requestAnimationFrame(animate);
    sun.update();

    if (!focusedPlanet && !isSunFocused) {
        planets.forEach(p => p.update());
    } else {
        if (focusedPlanet) {
            focusedPlanet.update(true); // Rotate and update shaders, but stop orbit
        }
        if (isSunFocused) sun.mesh.rotation.y += 0.01;
    }

    if (isTransitioning) {
        const target = focusedPlanet ? focusedPlanet.mesh : sun.mesh;
        const currentTargetPos = new THREE.Vector3();

        if (!focusedPlanet && !isSunFocused) {
            currentTargetPos.set(0, 0, 0);
        } else if (target) {
            target.getWorldPosition(currentTargetPos);
        }

        controls.target.lerp(currentTargetPos, 0.05);
        camera.position.lerp(targetCameraPos, 0.05);

        if (camera.position.distanceTo(targetCameraPos) < 0.1) {
            isTransitioning = false;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
