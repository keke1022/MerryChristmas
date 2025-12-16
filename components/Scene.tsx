import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Topper } from './Topper';
import { TreeState, HandGesture } from '../types';
import { CONFIG, COLORS } from '../constants';

interface SceneProps {
  treeState: TreeState;
  gesture: HandGesture | null;
}

export const Scene: React.FC<SceneProps> = ({ treeState, gesture }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Camera animation based on hand gesture
  useFrame((state) => {
    if (cameraRef.current) {
      const { x, y } = gesture || { x: 0, y: 0 };
      
      // Smoothly interpolate camera position based on hand
      // Base pos is [0, 4, 25] (Zoomed out from 20 to 25)
      // Hand X (-1 to 1) -> Rotate around Y
      // Hand Y (-1 to 1) -> Move Up/Down
      
      // Zoom out to 25 to see the full height
      const radius = 25; 
      
      const targetX = Math.sin(x * 0.5) * radius;
      const targetZ = Math.cos(x * 0.5) * radius;
      // Adjusted camera height base to 6 to look better at the lifted tree
      const targetY = 6 + (y * 5);

      cameraRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.05
      );
      // Look at Y=5 (Center of the shifted tree) to center it on screen
      // This prevents the "too low" feel by looking lower down
      cameraRef.current.lookAt(0, 5, 0);
    }

    if (groupRef.current) {
      // Slow rotation of the tree
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 25]} ref={cameraRef} fov={45} />
      
      <Environment preset="lobby" background={false} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color={COLORS.goldLight} />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color={COLORS.gold} 
        castShadow 
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <group ref={groupRef}>
        <Foliage treeState={treeState} />
        
        <Ornaments 
          treeState={treeState} 
          type="ball" 
          color={COLORS.gold} 
          scale={0.25} // REDUCED SIZE
        />
        <Ornaments 
          treeState={treeState} 
          type="ball" 
          color={COLORS.redDeep} 
          scale={0.2} // REDUCED SIZE
        />
         <Ornaments 
          treeState={treeState} 
          type="gift" 
          color={COLORS.gold} 
          scale={0.35} // REDUCED SIZE
        />
        
        {/* ADD TOPPER */}
        <Topper treeState={treeState} />
      </group>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={CONFIG.bloom.threshold} 
          mipmapBlur 
          intensity={CONFIG.bloom.intensity} 
          radius={CONFIG.bloom.radius} 
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};