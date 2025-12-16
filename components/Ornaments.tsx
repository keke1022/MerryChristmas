import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';
import { getConePoint, getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';

interface OrnamentsProps {
  treeState: TreeState;
  type: 'ball' | 'gift';
  color: string;
  scale: number;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ treeState, type, color, scale }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = type === 'ball' ? 50 : 30;
  
  // Store data for animation
  const data = useMemo(() => {
    const chaosPos = [];
    const targetPos = [];
    const rotations = [];
    
    let i = 0;
    while(i < count) {
      // Target: Cone surface (slightly pushed out)
      const t = getConePoint(CONFIG.treeHeight, CONFIG.treeRadius * 0.9, 1);
      
      // SHIFT UP: Sync with foliage shift (+5.0)
      t.y += 5.0;

      // CLEAN TOP: Ensure ornaments don't spawn at the very tip either
      if (t.y > (CONFIG.treeHeight / 2 + 5.0 - 0.8)) {
        continue;
      }

      // Push slightly outward to sit on leaves
      const dist = Math.sqrt(t.x * t.x + t.z * t.z);
      if (dist > 0.1) {
        t.x *= 1.1; 
        t.z *= 1.1;
      }
      targetPos.push(t);

      // Chaos: Larger sphere
      chaosPos.push(getRandomSpherePoint(20));
      
      const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rotations.push(rot);
      i++;
    }
    return { chaosPos, targetPos, rotations };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    // SLOWER SPEED: Reduced from 0.06/0.03 to 0.025/0.015
    const speed = type === 'ball' ? 0.025 : 0.015;
    const time = state.clock.getElapsedTime();

    const isForming = treeState === TreeState.FORMED;
    
    for (let i = 0; i < count; i++) {
      const chaos = data.chaosPos[i];
      const target = data.targetPos[i];
      const rot = data.rotations[i];
      
      const targetVec = new THREE.Vector3().copy(target);
      const chaosVec = new THREE.Vector3().copy(chaos);
      
      // Add wobble when formed
      if (isForming) {
        targetVec.y += Math.sin(time * 2 + i) * 0.1;
      } else {
        chaosVec.x += Math.sin(time + i) * 0.05;
        chaosVec.y += Math.cos(time + i) * 0.05;
      }
      
      // HACK: Use mesh.userData to store current progress
      if (meshRef.current.userData.progress === undefined) meshRef.current.userData.progress = 0;
      
      const dest = isForming ? 1 : 0;
      meshRef.current.userData.progress += (dest - meshRef.current.userData.progress) * speed;
      
      const p = meshRef.current.userData.progress;
      
      const currentPos = new THREE.Vector3().lerpVectors(chaosVec, targetVec, p);
      
      dummy.position.copy(currentPos);
      dummy.rotation.copy(rot);
      // Rotate slowly
      dummy.rotation.y += time * 0.5;
      
      dummy.scale.setScalar(scale * (0.8 + 0.2 * Math.sin(time * 3 + i)));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      {type === 'gift' ? <boxGeometry /> : <sphereGeometry args={[1, 16, 16]} />}
      <meshStandardMaterial 
        color={color} 
        roughness={0.2} 
        metalness={0.9} 
        emissive={color}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
};