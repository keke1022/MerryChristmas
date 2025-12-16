import { FilesetResolver, HandLandmarker, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import { MEDIAPIPE_MODEL_ASSET_PATH } from '../constants';

export class VisionService {
  handLandmarker: HandLandmarker | null = null;
  video: HTMLVideoElement | null = null;
  lastVideoTime = -1;
  isRunning = false;

  async initialize() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    
    this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_MODEL_ASSET_PATH,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
  }

  async startCamera(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      this.video.srcObject = stream;
      
      // Wait until the video is ready to play to ensure dimensions are set
      await new Promise<void>((resolve) => {
        if (this.video) {
          this.video.onloadeddata = () => {
             resolve();
          };
          // If already loaded
          if (this.video.readyState >= 2) {
             resolve();
          }
        }
      });

      await this.video.play();
      this.isRunning = true;
    } catch (err) {
      console.error("Camera error:", err);
      throw err;
    }
  }

  detect(): { isOpen: boolean; x: number; y: number; detected: boolean } | null {
    if (!this.handLandmarker || !this.video || !this.isRunning) return null;

    // CRITICAL FIX: Ensure video has dimensions to prevent MediaPipe errors
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
      return null;
    }

    let startTimeMs = performance.now();
    
    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      
      try {
        const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; // First hand

          // Logic: Calculate average distance from Wrist (0) to Tips (4, 8, 12, 16, 20)
          const wrist = landmarks[0];
          const tips = [4, 8, 12, 16, 20];
          let totalDist = 0;
          
          tips.forEach(idx => {
            const tip = landmarks[idx];
            const dist = Math.sqrt(
              Math.pow(tip.x - wrist.x, 2) + 
              Math.pow(tip.y - wrist.y, 2)
            );
            totalDist += dist;
          });

          const avgDist = totalDist / tips.length;
          // Threshold: If fingers are far from wrist, hand is open. If close, fist.
          // Heuristic value ~0.25 is a good breakpoint for normalized coords
          const isOpen = avgDist > 0.25;

          // Centroid for position
          let sumX = 0; 
          let sumY = 0;
          landmarks.forEach(l => { sumX += l.x; sumY += l.y; });
          
          // Mirror X because it's a webcam
          const normX = -((sumX / landmarks.length) - 0.5) * 2; 
          const normY = -((sumY / landmarks.length) - 0.5) * 2;

          return { isOpen, x: normX, y: normY, detected: true };
        } else {
          return { isOpen: false, x: 0, y: 0, detected: false };
        }
      } catch (error) {
         // Suppress specific errors that might happen during initialization or frame skips
         console.debug("Detection skipped frame:", error);
         return null;
      }
    }
    return null;
  }

  stop() {
    this.isRunning = false;
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }
}

export const visionService = new VisionService();