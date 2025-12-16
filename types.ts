import { Vector3 } from 'three';

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR'
}

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface HandGesture {
  isOpen: boolean;
  position: { x: number; y: number }; // Normalized -1 to 1
  detected: boolean;
}

export interface ParticleSystemProps {
  count: number;
  treeState: TreeState;
}
