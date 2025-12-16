import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';
import { getConePoint, getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';

const foliageVertexShader = `
  uniform float uProgress;
  uniform float uTime;
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  
  varying vec3 vColor;
  
  void main() {
    // Cubic bezier ease-in-out for uProgress
    float t = uProgress;
    float ease = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;

    vec3 pos = mix(aChaosPos, aTargetPos, ease);
    
    // Add some wind/breathing effect when formed
    if (t > 0.8) {
      pos.x += sin(uTime * 2.0 + pos.y) * 0.05;
      pos.z += cos(uTime * 1.5 + pos.y) * 0.05;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // INCREASED SIZE: Base size increased and random factor adjusted
    gl_PointSize = (8.0 * aRandom + 5.0) * (20.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Mix colors based on height and randomness for depth
    vec3 color1 = vec3(0.0, 0.35, 0.15); // Slightly brighter Emerald
    vec3 color2 = vec3(0.0, 0.15, 0.05); // Darker Green
    vColor = mix(color1, color2, aRandom);
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft edge
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

interface FoliageProps {
  treeState: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ treeState }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const { count, chaosPositions, targetPositions, randoms } = useMemo(() => {
    const count = CONFIG.particleCount;
    const chaosPositions = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    let i = 0;
    while (i < count) {
      // Target: Cone
      const target = getConePoint(CONFIG.treeHeight, CONFIG.treeRadius, 1);
      
      // SHIFT UP: Move the entire tree up by 5 units (was 3)
      target.y += 5.0;

      // CLEAN TOP: Skip points that are too close to the very peak to reduce messiness
      // Tree goes from approx -1 to +11 (after shift). Peak is around 11.
      if (target.y > (CONFIG.treeHeight / 2 + 5.0 - 0.5)) {
        continue; // Skip this point and try again
      }

      targetPositions[i * 3] = target.x;
      targetPositions[i * 3 + 1] = target.y;
      targetPositions[i * 3 + 2] = target.z;

      // Chaos: Sphere
      const chaos = getRandomSpherePoint(15);
      chaosPositions[i * 3] = chaos.x;
      chaosPositions[i * 3 + 1] = chaos.y;
      chaosPositions[i * 3 + 2] = chaos.z;
      
      randoms[i] = Math.random();
      i++;
    }
    return { count, chaosPositions, targetPositions, randoms };
  }, []);

  useFrame((state) => {
    if (!shaderRef.current) return;
    
    // Lerp progress based on state
    const targetProgress = treeState === TreeState.FORMED ? 1.0 : 0.0;
    shaderRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
      shaderRef.current.uniforms.uProgress.value,
      targetProgress,
      0.02 // SLOWER SPEED
    );
    shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  const uniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uTime: { value: 0 }
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Use position for initial bounding box, though shader overrides
          count={count}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={count}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};