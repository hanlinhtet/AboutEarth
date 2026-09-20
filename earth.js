

import * as THREE from 'three';
import * as d3 from 'd3-geo';

export class Globe {
    constructor(scene) {
        this.scene = scene;
        this.radius = 100;
        this.countriesGroup = new THREE.Group();
        this.scene.add(this.countriesGroup);
        
        this.countryMeshes = {};
        this.countryData = [];
        this.selectedCountryId = null;
        this.geoJsonData = null;
        
        this.textures = {
            day: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
            night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
            stars: 'https://unpkg.com/three-globe/example/img/night-sky.png',
            bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png'
        };
    }

    async init() {
        this.createBackground();
        this.createEarth();
        await this.loadCountries();
        this.updateSunPosition();
    }

    createBackground() {
        const loader = new THREE.TextureLoader();
        const texture = loader.load(this.textures.stars);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);

        const geometry = new THREE.SphereGeometry(600, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        this.background = new THREE.Mesh(geometry, material);
        this.scene.add(this.background);
    }

    createEarth() {
        const loader = new THREE.TextureLoader();
        const dayTex = loader.load(this.textures.day);
        const nightTex = loader.load(this.textures.night);

        this.earthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: dayTex },
                nightTexture: { value: nightTex },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D dayTexture;
                uniform sampler2D nightTexture;
                uniform vec3 sunDirection;
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    float intensity = dot(vNormal, sunDirection);
                    float dayWeight = smoothstep(-0.2, 0.2, intensity);
                    
                    vec4 dayColor = texture2D(dayTexture, vUv);
                    vec4 nightColor = texture2D(nightTexture, vUv);
                    
                    vec3 nightLights = nightColor.rgb * 2.0;
                    
                    gl_FragColor = mix(vec4(nightLights, 1.0), dayColor, dayWeight);
                }
            `
        });

        const geometry = new THREE.SphereGeometry(this.radius, 128, 128);
        this.earth = new THREE.Mesh(geometry, this.earthMaterial);
        this.scene.add(this.earth);

        // Atmosphere
        const atmoGeo = new THREE.SphereGeometry(this.radius * 1.15, 64, 64);
        const atmoMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
                    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        this.atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
        this.scene.add(this.atmosphere);
    }

    updateSunPosition() {
        const now = new Date();
        const hours = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        const seconds = now.getUTCSeconds();
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        const angle = (totalSeconds / 86400) * Math.PI * 2 + Math.PI;
        
        const sunX = Math.cos(angle);
        const sunZ = Math.sin(angle);
        
        if (this.earthMaterial) {
            this.earthMaterial.uniforms.sunDirection.value.set(sunX, 0.2, sunZ).normalize();
        }
    }

    async loadCountries() {
        try {
            const response = await fetch('./data/countries.geojson');
            const data = await response.json();
            this.geoJsonData = data;

            data.features.forEach((feature, index) => {
                const props = feature.properties;
                const id = props.ADM0_A3 || props.ISO_A3 || `country_${index}`;
                const name = props.NAME || props.ADMIN;
                
                const featureInfo = this.getFeatureInfo(feature);
                
                const countryInfo = {
                    id,
                    name,
                    capital: props.CAPITAL || props.NAME_CIAWF || 'N/A',
                    population: props.POP_EST,
                    continent: props.CONTINENT,
                    center: featureInfo.center,
                    size: featureInfo.size
                };
                this.countryData.push(countryInfo);
                this.createCountryMesh(feature, countryInfo);
            });
        } catch (error) {
            console.error("Error loading countries:", error);
        }
    }

    findCountryAt(lat, lng) {
        if (!this.geoJsonData) return null;
        
        // Use d3-geo's geoContains to find which feature contains the point [lng, lat]
        const feature = this.geoJsonData.features.find(f => d3.geoContains(f, [lng, lat]));
        
        if (feature) {
            const props = feature.properties;
            const id = props.ADM0_A3 || props.ISO_A3;
            return this.countryData.find(c => c.id === id) || null;
        }
        return null;
    }

    getFeatureInfo(feature) {
        let lats = [], lngs = [];
        const process = (coords) => {
            if (typeof coords[0] === 'number') {
                lngs.push(coords[0]); lats.push(coords[1]);
            } else coords.forEach(process);
        };
        process(feature.geometry.coordinates);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        // Size estimation: max diagonal of the bounding box in degrees
        const size = Math.sqrt(Math.pow(maxLat - minLat, 2) + Math.pow(maxLng - minLng, 2));
        
        return {
            center: {
                lat: (minLat + maxLat) / 2,
                lng: (minLng + maxLng) / 2
            },
            size: size
        };
    }

    latLngToVector3(lat, lng, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x, y, z);
    }

    createCountryMesh(feature, data) {
        const group = new THREE.Group();
        group.userData = data;

        const processPolygon = (coords) => {
            const exterior = coords[0];
            
            // SURFACE AREA (Invisible, for clicking)
            // We use a slightly better triangulation by splitting the ring if it's too large
            const meshGeo = this.createSurfaceGeo(exterior);
            const meshMat = new THREE.MeshBasicMaterial({ 
                color: 0x4a90e2, 
                transparent: true, 
                opacity: 0.0, 
                side: THREE.FrontSide, // Only front side to avoid clicking through the earth
                depthWrite: false 
            });
            const mesh = new THREE.Mesh(meshGeo, meshMat);
            mesh.userData = data;
            group.add(mesh);

            // BOUNDARY LINES
            const points = exterior.map(c => this.latLngToVector3(c[1], c[0], this.radius + 0.15));
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({ 
                color: 0x4a90e2, transparent: true, opacity: 0.15 
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.userData = data;
            group.add(line);
        };

        if (feature.geometry.type === 'Polygon') {
            processPolygon(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(processPolygon);
        }

        this.countriesGroup.add(group);
        this.countryMeshes[data.id] = group;
    }

    createSurfaceGeo(coords) {
        const points = coords.map(c => this.latLngToVector3(c[1], c[0], this.radius + 0.1));
        
        // Use a simple fan from the centroid of this specific ring
        let centroid = new THREE.Vector3(0, 0, 0);
        points.forEach(p => centroid.add(p));
        centroid.divideScalar(points.length).normalize().multiplyScalar(this.radius + 0.1);

        const vertices = [];
        const indices = [];

        vertices.push(centroid.x, centroid.y, centroid.z);
        points.forEach(p => {
            vertices.push(p.x, p.y, p.z);
        });

        // Loop through points and connect to centroid
        for (let i = 1; i <= points.length; i++) {
            const next = (i % points.length) + 1;
            indices.push(0, i, next);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    highlightCountry(id) {
        Object.values(this.countryMeshes).forEach(group => {
            const isSelected = group.userData.id === this.selectedCountryId;
            const isHovered = group.userData.id === id;
            
            group.children.forEach(child => {
                if (child instanceof THREE.Line) {
                    child.material.opacity = isSelected ? 1 : (isHovered ? 0.8 : 0.15);
                    child.material.color.set(isSelected ? 0xffffff : (isHovered ? 0xffffff : 0x4a90e2));
                }
                if (child instanceof THREE.Mesh) {
                    child.material.opacity = isSelected ? 0.4 : (isHovered ? 0.2 : 0.0);
                    child.material.color.set(isSelected ? 0xffffff : 0x4a90e2);
                }
            });
        });
    }

    selectCountry(id) {
        this.selectedCountryId = id;
        this.highlightCountry(id);
    }

    deselectCountry() {
        this.selectedCountryId = null;
        this.highlightCountry(null);
    }

    getCountryList() { return this.countryData; }

    update() {
        const time = Date.now() * 0.003;
        
        if (!this.selectedCountryId) {
            this.earth.rotation.y += 0.0005;
            this.countriesGroup.rotation.y += 0.0005;
        }

        if (this.selectedCountryId && this.countryMeshes[this.selectedCountryId]) {
            const pulse = Math.sin(time * 2) * 0.5 + 0.5;
            const opacity = 0.3 + pulse * 0.2;
            
            this.countryMeshes[this.selectedCountryId].children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.opacity = opacity;
                }
                if (child instanceof THREE.Line) {
                    child.material.opacity = 0.6 + pulse * 0.4;
                }
            });
        }

        this.updateSunPosition();
    }
}
