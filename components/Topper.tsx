import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';
import { getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';

interface TopperProps {
  treeState: TreeState;
}

export const Topper: React.FC<TopperProps> = ({ treeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate Target and Chaos positions
  const { targetPos, chaosPos } = useMemo(() => {
    // Top of the tree: Height/2 + Shift(5)
    const yTop = (CONFIG.treeHeight / 2) + 5.0; 
    const targetPos = new THREE.Vector3(0, yTop, 0);
    const chaosPos = getRandomSpherePoint(15);
    return { targetPos, chaosPos };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    // Lerp logic
    const isForming = treeState === TreeState.FORMED;
    const speed = 0.02; // Slow majestic speed
    
    if (meshRef.current.userData.progress === undefined) meshRef.current.userData.progress = 0;
    const dest = isForming ? 1 : 0;
    meshRef.current.userData.progress += (dest - meshRef.current.userData.progress) * speed;
    const p = meshRef.current.userData.progress;

    const currentPos = new THREE.Vector3().lerpVectors(chaosPos, targetPos, p);
    
    // Add hovering effect when formed
    if (isForming) {
        currentPos.y += Math.sin(time * 1.5) * 0.1;
    }

    meshRef.current.position.copy(currentPos);
    
    // Constant majestic rotation
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.z += 0.005;
  });

  return (
    <mesh ref={meshRef} scale={1.2}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        color={COLORS.gold} 
        emissive={COLORS.gold}
        emissiveIntensity={0.5}
        roughness={0.1}
        metalness={1.0}
        wireframe={false}
      />
      {/* Inner crystal for glow */}
      <mesh scale={0.6}>
         <octahedronGeometry args={[1, 0]} />
         <meshBasicMaterial color="#FFF" />
      </mesh>
    </mesh>
  );
};