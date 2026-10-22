import * as THREE from 'three';

/**
 * Automatically scales, centers, and fits a clothing mesh onto an avatar's torso.
 * 
 * @param {THREE.Object3D} clothingMesh - The clothing model (Mesh, Group, or SkinnedMesh)
 * @param {THREE.Object3D} avatarMesh - The avatar model (Mesh, Group, or SkinnedMesh)
 */
function fitClothingToAvatarTorso(clothingMesh, avatarMesh) {
    // 1. Ensure all local transformations are baked into world matrices
    clothingMesh.updateMatrixWorld(true);
    avatarMesh.updateMatrixWorld(true);

    // 2. Compute 3D bounding boxes in world space
    const avatarBox = new THREE.Box3().setFromObject(avatarMesh);
    const clothingBox = new THREE.Box3().setFromObject(clothingMesh);

    const avatarSize = new THREE.Vector3();
    const avatarCenter = new THREE.Vector3();
    avatarBox.getSize(avatarSize);
    avatarBox.getCenter(avatarCenter);

    const clothingSize = new THREE.Vector3();
    const clothingCenter = new THREE.Vector3();
    clothingBox.getSize(clothingSize);
    clothingBox.getCenter(clothingCenter);

    // 3. Estimate avatar torso dimensions
    // For standard humanoid avatars, the torso typically spans from ~50% to ~85% of total height.
    const torsoMinY = avatarBox.min.y + (avatarSize.y * 0.50);
    const torsoMaxY = avatarBox.min.y + (avatarSize.y * 0.85);
    const torsoHeight = torsoMaxY - torsoMinY;
    
    // Torso width and depth approximate the shoulder/chest span
    const torsoWidth = avatarSize.x;
    const torsoDepth = avatarSize.z;

    // Calculate the target center point for the torso
    const torsoCenter = new THREE.Vector3(
        avatarCenter.x,
        (torsoMinY + torsoMaxY) / 2,
        avatarCenter.z
    );

    // 4. Calculate scale factors for width and depth
    const scaleX = torsoWidth / clothingSize.x;
    const scaleZ = torsoDepth / clothingSize.z;

    // Use uniform scaling (minimum of X and Z) to preserve clothing proportions and avoid distortion
    const uniformScale = Math.min(scaleX, scaleZ);

    // Apply the scaling factor to the clothing mesh
    clothingMesh.scale.multiplyScalar(uniformScale);

    // 5. Re-compute clothing bounding box post-scaling to get accurate dimensions & center
    clothingMesh.updateMatrixWorld(true);
    const scaledClothingBox = new THREE.Box3().setFromObject(clothingMesh);
    const scaledClothingCenter = new THREE.Vector3();
    scaledClothingBox.getCenter(scaledClothingCenter);

    // 6. Translate (reposition) clothing so its center perfectly aligns with the torso center
    const translationOffset = new THREE.Vector3().subVectors(torsoCenter, scaledClothingCenter);
    clothingMesh.position.add(translationOffset);

    // Final matrix refresh
    clothingMesh.updateMatrixWorld(true);

    console.log("Clothing fitted successfully:", {
        torsoCenter,
        uniformScale,
        translationOffset
    });
}

// 3. Auto-Fitting Logic (Pushing Vertices Outward along Normals)
function autoFitClothes() {
    if (!avatarMesh || !clothingMesh) return alert("Models still loading...");

    clothingMesh.traverse((child) => {
        if (child.isMesh) {
            const positionAttribute = child.geometry.attributes.position;
            const normalAttribute = child.geometry.attributes.normal;

            // Simple scaling algorithm: expand the cloth slightly along its vertex normals 
            // to wrap tightly outside the avatar body without clipping inside.
            for (let i = 0; i < positionAttribute.count; i++) {
                let vx = positionAttribute.getX(i);
                let vy = positionAttribute.getY(i);
                let vz = positionAttribute.getZ(i);

                let nx = normalAttribute.getX(i);
                let ny = normalAttribute.getY(i);
                let nz = normalAttribute.getZ(i);

                // Push vertex outward by a small offset factor (e.g., 2% expansion)
                const offset = 0.02; 
                positionAttribute.setXYZ(i, vx + nx * offset, vy + ny * offset, vz + nz * nz * offset);
            }
            
            // Tell Three.js that the geometry positions changed so it updates the render
            positionAttribute.needsUpdate = true;
            child.geometry.computeVertexNormals();
        }
    });
}

document.getElementById('fit-btn').addEventListener('click', autoFitClothes);

// 4. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
