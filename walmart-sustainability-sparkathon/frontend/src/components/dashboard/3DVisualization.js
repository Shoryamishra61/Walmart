import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ThreeDVisualization = ({ inventory }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 500 / 400, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(500, 400);
        mountRef.current.innerHTML = ''; // Clear previous renders
        mountRef.current.appendChild(renderer.domElement);

        // Simple representation of store aisles
        const geometry = new THREE.BoxGeometry(1, 0.1, 5);
        const material = new THREE.MeshStandardMaterial({ color: 0x0071ce }); // Walmart Blue
        const aisle1 = new THREE.Mesh(geometry, material);
        aisle1.position.x = -2;
        scene.add(aisle1);
        const aisle2 = new THREE.Mesh(geometry, material);
        aisle2.position.x = 2;
        scene.add(aisle2);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Dynamically add hotspots based on inventory status
        inventory.forEach((item, index) => {
            if (item.status !== 'Fresh') {
                const hotspotGeometry = new THREE.SphereGeometry(0.2, 32, 32);
                const hotspotMaterial = new THREE.MeshBasicMaterial({ 
                    color: item.status === 'Donation Alert' ? 0xff0000 : 0xffc220 // Red for donate, Yellow for discount
                });
                const hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
                // Distribute hotspots for visualization
                hotspot.position.set(index % 2 === 0 ? -2 : 2, 0.5, (index * 0.8) - 2); 
                scene.add(hotspot);
            }
        });

        camera.position.set(0, 4, 5);
        camera.lookAt(0, 0, 0);

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [inventory]); // Re-render when inventory changes

    return <div ref={mountRef}></div>;
};

export default ThreeDVisualization; 