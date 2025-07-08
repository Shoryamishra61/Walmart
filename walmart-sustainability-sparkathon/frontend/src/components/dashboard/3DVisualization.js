import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import gsap from 'gsap';
import './3DVisualization.css';

const ThreeDVisualization = ({ inventory }) => {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });

    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const productHotspotsRef = useRef(null);
    const loadedProductModels = useRef([]);
    const aislesRef = useRef([]);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const intersectedRef = useRef(null); // Using ref for INTERSECTED

    const [assetsReady, setAssetsReady] = useState(false);

    // Effect for one-time scene setup
    useEffect(() => {
        sceneRef.current = new THREE.Scene();
        productHotspotsRef.current = new THREE.Group();
        sceneRef.current.add(productHotspotsRef.current);

        const scene = sceneRef.current;
        const productHotspots = productHotspotsRef.current;

        // HDRI Loading
        new RGBELoader()
            .setPath('/textures/hdri/')
            .load('studio_small_03_1k.hdr', function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                scene.environment = texture;
            }, undefined, (error) => {
                console.error('An error occurred loading the HDRI:', error);
                if (!scene.environment) scene.background = new THREE.Color(0xf0f0f0);
            });

        // Camera setup
        const container = mountRef.current;
        const initialWidth = container.clientWidth;
        const initialHeight = Math.min(container.clientHeight || 400, 600);
        cameraRef.current = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
        cameraRef.current.position.set(0, 3, 7);
        cameraRef.current.lookAt(0, 0.5, 0);
        
        // Renderer setup
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendererRef.current.shadowMap.enabled = true;
        rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current.outputColorSpace = THREE.SRGBColorSpace;
        rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
        rendererRef.current.toneMappingExposure = 1;
        rendererRef.current.setSize(initialWidth, initialHeight);
        container.appendChild(rendererRef.current.domElement);

        // OrbitControls setup
        controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
        controlsRef.current.enableDamping = true;
        controlsRef.current.dampingFactor = 0.05;
        controlsRef.current.minDistance = 2;
        controlsRef.current.maxDistance = 20;
        controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.05;
        controlsRef.current.target.set(0, 0.5, 0);

        // Floor plane
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorAlbedo = new THREE.TextureLoader().load('/textures/floor/concrete_tiles_albedo.png', tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8,8); });
        const floorNormal = new THREE.TextureLoader().load('/textures/floor/concrete_tiles_normal.png', tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8,8); });
        const floorRoughness = new THREE.TextureLoader().load('/textures/floor/concrete_tiles_roughness.png', tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8,8); });
        const floorMaterial = new THREE.MeshStandardMaterial({ map: floorAlbedo, normalMap: floorNormal, roughnessMap: floorRoughness, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        scene.add(floor);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(10, 15, 10); directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048, 2048);
        directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15; directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15; directionalLight.shadow.camera.bottom = -15;
        scene.add(directionalLight);
        const createAisleSpotlight = (x, z) => {
            const spotLight = new THREE.SpotLight(0xffffff, 1.5, 15, Math.PI / 4, 0.3, 1.5);
            spotLight.position.set(x, 5, z); spotLight.target.position.set(x, 0, z);
            spotLight.castShadow = true; spotLight.shadow.mapSize.set(1024, 1024);
            spotLight.shadow.camera.near = 1; spotLight.shadow.camera.far = 15;
            scene.add(spotLight); scene.add(spotLight.target);
        };
        createAisleSpotlight(-1.5, 0); createAisleSpotlight(1.5, 0);

        // Asset Loading
        const loader = new GLTFLoader();
        const productModelPaths = ['/models/products/soda_can.gltf', '/models/products/cereal_box.gltf', '/models/products/milk_carton.gltf'];
        const productPromises = productModelPaths.map(path => new Promise((resolve, reject) => {
            loader.load(path, (gltf) => {
                gltf.scene.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }});
                resolve(gltf.scene);
            }, undefined, reject);
        }));
        const shelfPromise = new Promise((resolve, reject) => {
            loader.load('/models/shelf/shelf_aisle.gltf', (gltf) => {
                const shelfModelSource = gltf.scene;
                shelfModelSource.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }});
                const aisle1 = shelfModelSource.clone(); aisle1.position.set(-1.5, -0.5, 0);
                const aisle2 = shelfModelSource.clone(); aisle2.position.set(1.5, -0.5, 0);
                scene.add(aisle1); scene.add(aisle2);
                resolve([aisle1, aisle2]);
            }, undefined, reject);
        });

        Promise.all([...productPromises, shelfPromise])
            .then((results) => {
                const resolvedModels = results.slice(0, -1);
                const resolvedAisles = results[results.length - 1];
                loadedProductModels.current = resolvedModels;
                aislesRef.current = resolvedAisles;
                setAssetsReady(true); // Signal that assets are ready
                console.log("All 3D assets loaded successfully.");
            })
            .catch(error => console.error("Error loading 3D assets:", error));

        // Animation Loop
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();

            // Raycasting
            if (cameraRef.current && productHotspotsRef.current && rendererRef.current) {
                raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
                const intersects = raycasterRef.current.intersectObjects(productHotspotsRef.current.children, true);
                if (intersects.length > 0) {
                    const firstIntersected = intersects[0].object.userData.isProductRoot ? intersects[0].object : intersects[0].object.parent; // Assuming product root has this flag
                    if (intersectedRef.current !== firstIntersected) {
                        if (intersectedRef.current && intersectedRef.current.material) { // Check material exists
                           if(intersectedRef.current.originalEmissiveHex) intersectedRef.current.material.emissive.setHex(intersectedRef.current.originalEmissiveHex);
                        }
                        intersectedRef.current = firstIntersected;
                        if (intersectedRef.current && intersectedRef.current.material) { // Check material exists
                            intersectedRef.current.originalEmissiveHex = intersectedRef.current.material.emissive.getHex();
                            intersectedRef.current.material.emissive.setHex(0x555555);
                        }
                        if (firstIntersected && firstIntersected.userData.itemDetails) {
                            const { itemDetails } = firstIntersected.userData;
                            const tooltipContent = `<strong>${itemDetails.name}</strong><br/>Status: ${itemDetails.status}<br/>Expiry: ${itemDetails.expiryDate||'N/A'}<br/>Discount: ${itemDetails.discount||'N/A'}`;
                            const canvasRect = rendererRef.current.domElement.getBoundingClientRect();
                            setTooltip({ visible: true, content: tooltipContent, x: mouseRef.current.clientX - canvasRect.left + 10, y: mouseRef.current.clientY - canvasRect.top + 10 });
                        }
                    }
                } else {
                    if (intersectedRef.current && intersectedRef.current.material) {
                        if(intersectedRef.current.originalEmissiveHex) intersectedRef.current.material.emissive.setHex(intersectedRef.current.originalEmissiveHex);
                    }
                    intersectedRef.current = null;
                    setTooltip(prev => ({ ...prev, visible: false }));
                }
            }
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                 rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        // Event Listeners
        const onDocumentMouseMove = (event) => {
            event.preventDefault();
            if (!rendererRef.current || !rendererRef.current.domElement) return;
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            mouseRef.current.clientX = event.clientX;
            mouseRef.current.clientY = event.clientY;
        };
        const currentDomElement = rendererRef.current.domElement; // Capture for cleanup
        currentDomElement.addEventListener('mousemove', onDocumentMouseMove, false);

        const handleResize = () => {
            if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
            const newWidth = mountRef.current.clientWidth;
            const newHeight = Math.min(mountRef.current.clientHeight || 400, 600);
            cameraRef.current.aspect = newWidth / newHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (currentDomElement) {
                currentDomElement.removeEventListener('mousemove', onDocumentMouseMove, false);
            }
            if (controlsRef.current) controlsRef.current.dispose();

            if (productHotspotsRef.current && productHotspotsRef.current.children) {
                productHotspotsRef.current.children.forEach(child => gsap.killTweensOf(child.scale));
            }

            sceneRef.current.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
                            material.dispose();
                        });
                    } else {
                        Object.values(object.material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
                        object.material.dispose();
                    }
                }
            });
            if(sceneRef.current.environment && sceneRef.current.environment.dispose) sceneRef.current.environment.dispose();

            if (rendererRef.current) rendererRef.current.dispose();
            if (mountRef.current && rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
                 mountRef.current.removeChild(rendererRef.current.domElement);
            }
            sceneRef.current = null; // Help GC
            cameraRef.current = null;
            rendererRef.current = null;
            controlsRef.current = null;
            productHotspotsRef.current = null;
            loadedProductModels.current = [];
            aislesRef.current = [];
            setAssetsReady(false);
        };
    }, []); // Empty dependency array: runs once on mount

    // Effect for processing inventory items
    const processInventoryItems = useCallback(() => {
        if (!assetsReady || !sceneRef.current || !productHotspotsRef.current || aislesRef.current.length === 0 || loadedProductModels.current.length === 0) {
            return;
        }
        const productHotspots = productHotspotsRef.current;

        while(productHotspots.children.length > 0){
            const oldProduct = productHotspots.children[0];
            productHotspots.remove(oldProduct);
            // Cloned GLTF children share geometry/material, so no need to dispose them individually here
            // unless materials were cloned per instance and need individual disposal.
        }

        inventory.forEach((item, index) => {
            if (item.status !== 'Fresh') {
                const productModelTemplate = loadedProductModels.current[index % loadedProductModels.current.length];
                if (!productModelTemplate) return;

                const productInstance = productModelTemplate.clone(true); // Deep clone
                productInstance.userData.isProductRoot = true; // Flag for raycasting parent
                productInstance.userData.itemDetails = item;

                const aisleIndex = index % 2;
                const targetAisle = aislesRef.current[aisleIndex];
                if (!targetAisle) return;

                const itemsPerShelfLevel = 4;
                const shelfLevelIndex = Math.floor((index / 2) / itemsPerShelfLevel) % 3;
                const positionInLevel = (index / 2) % itemsPerShelfLevel;

                const shelfBaseY = 0.2; const shelfLevelHeight = 0.6;
                const shelfDepthOffset = 0.2; const itemSpacingX = 0.5;
                const shelfLength = 2.0;

                const localX = (positionInLevel * itemSpacingX) - (shelfLength / 2) + (itemSpacingX / 2);
                const localY = shelfBaseY + (shelfLevelIndex * shelfLevelHeight);
                const localZ = aisleIndex === 0 ? shelfDepthOffset : -shelfDepthOffset; // This might need adjustment based on aisle model orientation

                // Position relative to the aisle's origin, then convert to world (if aisle is not at 0,0,0)
                // Or, more simply, if aisle objects are added directly to scene and positioned, add product to aisle.
                // For now, assuming aisles are at their world positions, and product position is set relative to aisle's world pos.
                productInstance.position.set(localX, localY, localZ);
                productInstance.position.add(targetAisle.position);


                const baseScale = 0.3; // Adjust this based on your models
                productInstance.scale.set(baseScale, baseScale, baseScale);

                const statusColor = item.status === 'Donation Alert' ? 0xff0000 : 0xffc220;
                productInstance.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const originalMaterial = child.material;
                        child.material = originalMaterial.clone();
                        child.material.color.set(statusColor);
                        // For emissive:
                        // child.material.emissive = new THREE.Color(statusColor);
                        // child.material.emissiveIntensity = 0.6;
                    }
                });

                const initialAnimScale = 0.01;
                productInstance.scale.set(initialAnimScale, initialAnimScale, initialAnimScale);
                productHotspots.add(productInstance);

                gsap.to(productInstance.scale, {
                    x: baseScale, y: baseScale, z: baseScale,
                    duration: 0.5, delay: index * 0.05, ease: 'back.out(1.7)',
                });
            }
        });
    }, [inventory, assetsReady]); // assetsReady is key here

    useEffect(() => {
        if (assetsReady) {
            processInventoryItems();
        }
    }, [assetsReady, inventory, processInventoryItems]);


    return (
        <div ref={mountRef} style={{ width: '100%', height: '400px', position: 'relative', cursor: 'grab' }}>
            {tooltip.visible && (
                <div
                    className="tooltip3d"
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
        </div>
    );
};

export default ThreeDVisualization;