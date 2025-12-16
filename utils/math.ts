import * as THREE from 'three';
import { CONFIG } from '../constants';

export const getRandomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
};

export const getConePoint = (height: number, maxRadius: number, verticalBias = 0): THREE.Vector3 => {
  const y = Math.random() * height; // 0 to height
  const rAtY = (1 - y / height) * maxRadius; // Radius decreases as Y increases
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * rAtY; // Uniform distribution on disk
  
  // Center the cone vertically around 0 roughly, but keep base at -height/2
  return new THREE.Vector3(
    r * Math.cos(angle),
    y - height / 2 + verticalBias,
    r * Math.sin(angle)
  );
};

export const normalizeRange = (val: number, min: number, max: number, newMin: number, newMax: number) => {
  return newMin + ((val - min) * (newMax - newMin)) / (max - min);
};
