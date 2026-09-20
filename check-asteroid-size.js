import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('models/asteroids.glb', (gltf) => {
    let asteroidMesh = null;
    gltf.scene.traverse(child => {
        if (child.isMesh && !asteroidMesh) {
            asteroidMesh = child;
        }
    });

    if (asteroidMesh) {
        asteroidMesh.geometry.computeBoundingBox();
        const box = asteroidMesh.geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log(`Asteroid size: ${size.x}, ${size.y}, ${size.z}`);
        process.exit(0);
    } else {
        console.error("No mesh found in GLB");
        process.exit(1);
    }
}, undefined, (error) => {
    console.error(error);
    process.exit(1);
});
