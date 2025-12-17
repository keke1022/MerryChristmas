import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/Scene';
import { visionService } from './services/vision';
import { AppState, TreeState, HandGesture } from './types';
import { COLORS } from './constants';

const App = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [treeState, setTreeState] = useState<TreeState>(TreeState.CHAOS); // Start chaotic
  const [gesture, setGesture] = useState<HandGesture | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; caption?: string } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);

  const startExperience = async () => {
    setAppState(AppState.LOADING);
    setErrorMsg('');
    try {
      // If the environment has no camera APIs, skip detection (manual mode) instead of erroring.
      const mediaDevices = navigator.mediaDevices;
      const hasGetUserMedia = typeof mediaDevices?.getUserMedia === 'function';
      if (!hasGetUserMedia) {
        setAppState(AppState.RUNNING);
        return;
      }

      await visionService.initialize();
      if (videoRef.current) {
        await visionService.startCamera(videoRef.current);
      }
      setAppState(AppState.RUNNING);
      // Start loop
      loop();
    } catch (e: any) {
      console.error(e);
      const errName = String(e?.name || '');
      const cameraRelated =
        errName === 'NotFoundError' ||
        errName === 'NotAllowedError' ||
        errName === 'NotReadableError' ||
        errName === 'OverconstrainedError' ||
        errName === 'SecurityError';

      if (cameraRelated) {
        setAppState(AppState.RUNNING);
        return;
      }

      setErrorMsg(e?.message || 'Failed to start camera or load AI models.');
      setAppState(AppState.ERROR);
    }
  };

  const loop = () => {
    if (visionService.isRunning) {
      const result = visionService.detect();
      if (result) {
        setGesture({
          isOpen: result.isOpen,
          position: { x: result.x, y: result.y },
          detected: result.detected,
        });
        if (result.detected) {
          // Logic: Open Hand = Unleash (Chaos), Closed Hand = Form Tree
          // We add a slight debounce or direct mapping? 
          // Direct mapping feels more responsive.
          if (result.isOpen) {
             setTreeState(TreeState.CHAOS);
          } else {
             setTreeState(TreeState.FORMED);
          }
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      visionService.stop();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene
            treeState={treeState}
            gesture={gesture}
            onSelectPhoto={(photo) => setSelectedPhoto(photo)}
          />
        </Suspense>
      </Canvas>
      <Loader />

      {/* Fullscreen photo zoom (click anywhere to close) */}
      {selectedPhoto && (
        <div
          className="absolute inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          onClick={() => setSelectedPhoto(null)}
          role="button"
          aria-label="Close photo"
        >
          <div
            className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-black/10"
            style={{
              padding: 14,
              paddingBottom: 40,
              borderRadius: 2,
              transform: 'rotate(-1deg)',
              maxWidth: 'min(92vw, 1200px)',
              maxHeight: 'min(92vh, 900px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.caption ?? 'photo'}
              draggable={false}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: 'min(88vw, 1160px)',
                maxHeight: 'min(78vh, 780px)',
                display: 'block',
              }}
            />
            <div className="text-black/80 mt-3 text-center luxury-serif">
              {selectedPhoto.caption ?? ''}
            </div>
            <div className="text-black/50 mt-1 text-center text-xs">
              点击任意位置关闭
            </div>
          </div>
        </div>
      )}

      {/* Hidden Video Element for MediaPipe */}
      <video 
        ref={videoRef} 
        className="absolute top-0 left-0 w-64 h-48 opacity-0 pointer-events-none" 
        playsInline 
        muted 
        autoPlay 
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
        {/* Header */}
        <header className="text-center animate-fade-in-down">
          <h1 className="luxury-text text-4xl md:text-6xl text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] border-b-2 border-[#FFD700] inline-block pb-4 px-8">
            GRAND LUXURY CHRISTMAS
          </h1>
          <p className="luxury-serif text-[#FFFACD] mt-2 text-lg tracking-widest uppercase opacity-80">
            Interactive Experience
          </p>
        </header>

        {/* Start Screen */}
        {appState === AppState.IDLE && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto backdrop-blur-sm z-50">
            <div className="text-center max-w-lg p-8 border border-[#FFD700] bg-[#004225]/90 rounded-sm shadow-[0_0_50px_rgba(0,66,37,0.8)]">
              <h2 className="luxury-text text-3xl text-[#FFD700] mb-6">Initialize Experience</h2>
              <p className="luxury-serif text-white mb-8 leading-relaxed">
                Allow camera access to control the Grand Tree with your gestures.
                <br />
                <span className="text-sm italic opacity-70 block mt-2">
                  (Open Hand: Unleash Chaos | Closed Hand: Form Tree | Move Hand: Rotate View)
                </span>
              </p>
              <button 
                onClick={startExperience}
                className="luxury-text px-8 py-3 bg-[#FFD700] text-[#004225] font-bold text-xl hover:bg-white hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-[#FFD700]"
              >
                ENTER THE HALL
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {appState === AppState.LOADING && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
             <div className="text-[#FFD700] luxury-serif text-xl animate-pulse">
               Constructing Luxury...
             </div>
          </div>
        )}

        {/* Error */}
        {appState === AppState.ERROR && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/90 pointer-events-auto z-50">
            <div className="text-center p-6 border border-red-500">
              <h3 className="text-red-500 text-2xl mb-2 luxury-text">Initialization Failed</h3>
              <p className="text-white mb-4">{errorMsg}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 border border-white text-white hover:bg-white hover:text-black transition-colors"
              >
                Retry
              </button>
            </div>
           </div>
        )}

        {/* Controls / Status */}
        {appState === AppState.RUNNING && (
          <div className="flex justify-between items-end pointer-events-auto">
            <div className="bg-black/50 border border-[#FFD700]/30 p-4 rounded backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${gesture?.detected ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-red-500'}`} />
                <span className="text-[#FFD700] text-sm uppercase tracking-wider">
                  Sensor Status: {gesture?.detected ? 'ONLINE' : 'SEARCHING...'}
                </span>
              </div>
              <div className="text-[#FFFACD] text-xs font-mono">
                STATE: <span className={treeState === TreeState.FORMED ? 'text-[#FFD700] font-bold' : 'text-red-400 font-bold'}>{treeState}</span>
                <br/>
                GESTURE: {gesture?.isOpen ? 'OPEN (CHAOS)' : 'CLOSED (FORM)'}
              </div>
            </div>

            {/* Manual Override for those without camera or debug */}
            <div className="flex gap-4">
              <button 
                onClick={() => setTreeState(TreeState.CHAOS)}
                className={`luxury-text text-sm px-6 py-2 border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#004225] transition-all ${treeState === TreeState.CHAOS ? 'bg-[#FFD700]/20' : ''}`}
              >
                UNLEASH
              </button>
              <button 
                onClick={() => setTreeState(TreeState.FORMED)}
                className={`luxury-text text-sm px-6 py-2 border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#004225] transition-all ${treeState === TreeState.FORMED ? 'bg-[#FFD700]/20' : ''}`}
              >
                FORM
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
