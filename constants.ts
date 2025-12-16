export const COLORS = {
  emerald: '#004225',
  gold: '#FFD700',
  goldLight: '#FFFACD',
  redDeep: '#800020',
  black: '#020402',
};

export const CONFIG = {
  treeHeight: 12,
  treeRadius: 4,
  particleCount: 5000,
  ornamentCount: 150,
  cameraPos: [0, 4, 20] as [number, number, number],
  bloom: {
    threshold: 0.6,
    intensity: 1.5,
    radius: 0.8
  }
};

export const MEDIAPIPE_MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
