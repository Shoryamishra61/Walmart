import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import './3DVisualization.css'; // We'll create this for tooltip styling

const ThreeDVisualization = ({ inventory }) => {
    const mountRef = useRef(null); // Ref for the div where the canvas will be mounted
    const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 }); // State for tooltip visibility, content, and position
    const raycaster = new THREE.Raycaster(); // For mouse picking/hover detection
    const mouse = new THREE.Vector2(); // Stores normalized mouse coordinates
    let INTERSECTED; // To keep track of the currently hovered object to manage highlighting

    useEffect(() => {
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0); // Light grey background for better contrast

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 500 / 400, 0.1, 1000); // FOV, Aspect Ratio (temp), Near, Far
        
        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing for smoother edges
        const container = mountRef.current;
        let width = container.clientWidth;
        let height = Math.min(container.clientHeight || 400, 600); // Ensure clientHeight is available or default
        renderer.setSize(width, height);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // OrbitControls setup for camera interaction
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooths camera movement, requires controls.update() in animation loop
        controls.dampingFactor = 0.05; // Damping inertia
        controls.screenSpacePanning = false; // Restricts panning to the XY plane in the camera's view
        controls.minDistance = 2; // Minimum zoom distance
        controls.maxDistance = 20; // Maximum zoom distance
        controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevents camera from going below the ground plane
        controls.target.set(0, 0.5, 0); // Point the camera orbits around (center of the scene vertically)

        // Floor plane
        const floorGeometry = new THREE.PlaneGeometry(10, 10); // Defines the size of the floor
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide }); // Grey color, visible from both sides
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
        floor.position.y = -0.5; // Position it slightly below the origin to act as a ground
        scene.add(floor);

        // Shelf properties - constants for defining shelf dimensions and appearance
        const shelfDepth = 1;
        const shelfHeight = 2;
        const shelfLength = 5;
        const shelfThickness = 0.1;
        const shelfColor = 0xaaaaaa; // Light grey color for shelves

        // Function to create a single shelf unit
        const createShelf = (x, z) => {
            const shelfGroup = new THREE.Group(); // Use a group to manage all parts of a shelf as one object

            // Shelf uprights (vertical supports)
            const uprightGeometry = new THREE.BoxGeometry(shelfThickness, shelfHeight, shelfThickness);
            const shelfMaterial = new THREE.MeshStandardMaterial({ color: shelfColor });

            // Create four uprights for the corners of the shelf
            [-shelfLength / 2 + shelfThickness / 2, shelfLength / 2 - shelfThickness / 2].forEach(lx => {
                [-shelfDepth / 2 + shelfThickness / 2, shelfDepth / 2 - shelfThickness / 2].forEach(lz => {
                    const upright = new THREE.Mesh(uprightGeometry, shelfMaterial);
                    upright.position.set(lx, shelfHeight / 2 - 0.5, lz); // Position uprights relative to shelf group center
                    shelfGroup.add(upright);
                });
            });

            // Actual shelf planks (horizontal surfaces)
            const singleShelfGeometry = new THREE.BoxGeometry(shelfLength, shelfThickness, shelfDepth);
            for (let i = 0; i < 3; i++) { // Create 3 levels of shelves
                const shelf = new THREE.Mesh(singleShelfGeometry, shelfMaterial);
                // Position each shelf plank vertically within the unit
                shelf.position.set(0, (i * (shelfHeight / 3)) + shelfThickness / 2 - 0.5, 0);
                shelfGroup.add(shelf);
            }

            shelfGroup.position.set(x, 0, z); // Position the entire shelf unit in the scene
            scene.add(shelfGroup);
            return shelfGroup; // Return for potential future reference, though not used in this version
        };

        // Create two aisles of shelves
        createShelf(-2.5, 0); // Aisle 1, positioned to the left
        createShelf(2.5, 0);  // Aisle 2, positioned to the right

        // Lighting setup for the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Soft white ambient light, illuminates all objects equally
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Directional light, like sunlight
        directionalLight.position.set(5, 10, 7.5); // Positioned to cast some shadows and highlights
        scene.add(directionalLight);

        // Group to hold all product hotspots for easier management (e.g., raycasting, animations)
        const productHotspots = new THREE.Group();
        scene.add(productHotspots);

        // Dynamically add product hotspots to the scene based on inventory data
        inventory.forEach((item, index) => {
            if (item.status !== 'Fresh') { // Only create hotspots for items that are not 'Fresh'
                const productGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.3); // Small box to represent a product
                const hotspotMaterial = new THREE.MeshBasicMaterial({ 
                    color: item.status === 'Donation Alert' ? 0xff0000 : 0xffc220 // Red for donation, Yellow for discount
                });
                const hotspot = new THREE.Mesh(productGeometry, hotspotMaterial);
                hotspot.userData = { type: 'product', itemDetails: item }; // Store item data for displaying in tooltip

                hotspot.scale.set(0.01, 0.01, 0.01); // Initial small scale for entry animation

                // Logic to distribute hotspots on the shelves
                const aisleX = index % 2 === 0 ? -2.5 : 2.5; // Alternate between left and right aisles
                const shelfLevel = Math.floor(index / 2) % 3; // Cycle through the 3 shelf levels
                const positionOnShelf = ((index % 4) * 1) - (shelfLength / 2) + 0.5; // Distribute along the length of the shelf

                hotspot.position.set(
                    aisleX + (index % 2 === 0 ? 0.2 : -0.2), // Position on the correct aisle, slightly offset for visibility
                    (shelfLevel * (shelfHeight / 3)) + shelfThickness -0.2, // Position on the correct shelf level
                    positionOnShelf // Position along the shelf length
                );
                productHotspots.add(hotspot); // Add the hotspot to the group

                // GSAP animation for hotspot entry: scales the hotspot from small to full size
                gsap.to(hotspot.scale, {
                    x: 1, y: 1, z: 1, // Target scale
                    duration: 0.5, // Animation duration
                    delay: index * 0.05, // Stagger animations for multiple items appearing at once
                    ease: 'back.out(1.7)', // Springy ease-out effect
                });
            }
        });

        // Set initial camera position and where it looks
        camera.position.set(0, 3, 7);
        camera.lookAt(0, 0.5, 0); // Look at the center of the shelf area

        // Mouse move event listener for raycasting (detecting hovers)
        const onDocumentMouseMove = (event) => {
            event.preventDefault();
            // Calculate mouse position in normalized device coordinates (-1 to +1) for raycaster
            const rect = renderer.domElement.getBoundingClientRect(); // Get canvas bounds
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            mouse.clientX = event.clientX; // Store raw clientX for tooltip positioning
            mouse.clientY = event.clientY; // Store raw clientY for tooltip positioning
        };
        renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);

        // Render loop function: handles raycasting, object highlighting, and tooltip updates
        const renderScene = () => {
            raycaster.setFromCamera(mouse, camera); // Update the picking ray from camera and mouse position
            const intersects = raycaster.intersectObjects(productHotspots.children, true); // Check for intersections with hotspots

            if (intersects.length > 0) { // If mouse hovers over a hotspot
                if (INTERSECTED !== intersects[0].object) { // If it's a new object being hovered
                    if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex); // Restore previous hovered object's emissive color

                    INTERSECTED = intersects[0].object; // Set new hovered object
                    INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex(); // Store its original emissive color
                    INTERSECTED.material.emissive.setHex(0x555555); // Highlight with a grey emissive color

                    const { itemDetails } = INTERSECTED.userData; // Get item data for tooltip
                    const tooltipContent = `
                        <strong>${itemDetails.name}</strong><br/>
                        Status: ${itemDetails.status}<br/>
                        Expiry: ${itemDetails.expiryDate || 'N/A'}<br/>
                        Discount: ${itemDetails.discount || 'N/A'}
                    `;
                    // Calculate position for tooltip
                    const canvasRect = renderer.domElement.getBoundingClientRect();
                    setTooltip({
                        visible: true,
                        content: tooltipContent,
                        x: event.clientX - canvasRect.left + 10, // offset from mouse
                        y: event.clientY - canvasRect.top + 10  // offset from mouse
                    });
                }
            } else {
                if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                INTERSECTED = null;
                setTooltip(prev => ({ ...prev, visible: false }));
            }
            }
            renderer.render(scene, camera);
        };

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update(); // only required if controls.enableDamping or controls.autoRotate are set to true
            renderScene();
        };

        renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);

        // Handle window resize
        const handleResize = () => {
            width = container.clientWidth;
            height = Math.min(container.clientHeight || 400, 600);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('mousemove', onDocumentMouseMove, false);
            controls.dispose(); // Dispose of OrbitControls
            if (container && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            // Dispose of Three.js objects
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
        };
    }, [inventory]); // Re-render when inventory changes

    return (
        <div ref={mountRef} style={{ width: '100%', height: '400px', position: 'relative' }}>
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