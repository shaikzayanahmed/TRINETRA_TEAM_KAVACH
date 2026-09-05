import React, { useRef, useState, useEffect } from 'react';
import { useDemo } from '../../context/DemoContext';
import { useLiveVision } from '../../hooks/useLiveVision';
import { DetectionOverlay } from './DetectionOverlay';

interface WebcamFeedProps {
  showDetection?: boolean;
}

export const WebcamFeed: React.FC<WebcamFeedProps> = ({ showDetection = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [useLiveAi, setUseLiveAi] = useState<boolean>(true);

  const { isDetectionVisible, activeTarget, isFenceBreached, isRunning: isDemoRunning } = useDemo();

  // Run real-time browser-accelerated YOLOv8 object detection
  const { isModelReady, liveDetections, lastInferenceTimeMs, fps, activeEngine } = useLiveVision(videoRef, {
    enabled: showDetection && useLiveAi && !isDemoRunning,
    filterMode: 'ALL_OBJECTS',
  });

  const startWebcam = async () => {
    setIsLoading(true);
    setErrorState(null);

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorState('Webcam API is not supported in this browser environment.');
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    try {
      // Request VIDEO only, NO microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setHasPermission(true);
      setErrorState(null);
    } catch (err: any) {
      console.warn('Webcam stream request notice:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorState('Permission Denied: Camera access was blocked by user or browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorState('Camera Unavailable: No compatible RGB optical hardware detected.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorState('Camera in Use: Video hardware is currently acquired by another application.');
      } else {
        setErrorState(`Sensor Exception: ${err.message || 'Unable to start RGB video stream'}`);
      }
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startWebcam();

    return () => {
      // Clean up MediaStream tracks on unmount to prevent leaks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const hasLiveDetections = showDetection && !isDemoRunning && liveDetections.length > 0;
  const hasDemoDetection = showDetection && (isDemoRunning || !useLiveAi) && isDetectionVisible && activeTarget;

  return (
    <div className="relative w-full aspect-video bg-surface-container-lowest overflow-hidden flex items-center justify-center select-none">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover filter contrast-[1.05] brightness-95 ${
          hasPermission ? 'block' : 'hidden'
        }`}
      />

      {/* Optical Reticle / Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full border border-primary/40 grid grid-cols-3 grid-rows-3">
          <div className="border-r border-b border-primary/20" />
          <div className="border-r border-b border-primary/20" />
          <div className="border-b border-primary/20" />
          <div className="border-r border-b border-primary/20" />
          <div className="border-r border-b border-primary/20 flex items-center justify-center">
            <div className="w-6 h-6 border border-primary/40 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-primary rounded-full" />
            </div>
          </div>
          <div className="border-b border-primary/20" />
          <div className="border-r border-primary/20" />
          <div className="border-r border-primary/20" />
          <div className="" />
        </div>
      </div>

      {/* Zone Alpha Virtual Tripwire Visual Boundary on Screen (Right 50%) */}
      <div className="absolute right-0 top-0 bottom-0 w-[50%] border-l border-dashed border-primary/30 bg-primary/5 pointer-events-none flex flex-col justify-between p-2 font-mono text-[9px] text-primary/70">
        <span className="self-end">[ ZONE ALPHA TRIPWIRE BOUNDARY ]</span>
        <span className="self-end">SPATIAL HEURISTIC FILTER ACTIVE</span>
      </div>

      {/* Live AI Detections (Real Neural Network Running on Webcam) */}
      {hasPermission && hasLiveDetections && liveDetections.map((det) => (
        <DetectionOverlay
          key={det.id}
          liveDetection={det}
          isBreached={det.isTripwireBreach}
          isThermal={false}
        />
      ))}

      {/* Fallback / Scripted Demo Detection Overlay */}
      {hasPermission && !hasLiveDetections && hasDemoDetection && (
        <DetectionOverlay target={activeTarget} isBreached={isFenceBreached} isThermal={false} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-surface-container-lowest/90 flex flex-col items-center justify-center gap-2 font-mono text-xs text-primary">
          <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
          <span>INITIALIZING CAM-RGB-01 SENSOR...</span>
        </div>
      )}

      {/* Error / Fallback State */}
      {!isLoading && !hasPermission && (
        <div className="absolute inset-0 bg-surface-container-lowest/95 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-2xl text-error">videocam_off</span>
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">
              CAM-RGB-01 OFFLINE
            </span>
            <span className="font-mono text-[11px] text-outline">
              {errorState || 'Laptop RGB camera feed unavailable'}
            </span>
          </div>
          <button
            onClick={startWebcam}
            className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-xs font-semibold border border-primary/30 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>RETRY SENSOR CONNECTION</span>
          </button>
        </div>
      )}

      {/* Sensor Metadata & Real-Time AI Inference Badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="px-2 py-0.5 rounded bg-surface-container-lowest/85 font-mono text-[10px] text-outline border border-surface-container-high/70">
          SENSOR A: VISIBLE RGB | 1080P @ 30 FPS
        </div>

        {isModelReady && hasPermission && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/90 font-mono text-[10px] text-secondary border border-secondary/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-bold text-primary">{activeEngine || 'YOLOv8'}</span>
            <span className="text-outline">·</span>
            <span>{lastInferenceTimeMs || 8}ms ({fps || 15} FPS)</span>
          </div>
        )}
      </div>

      {/* Live AI Mode Switcher & Status Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 font-mono text-[10px]">
        <button
          onClick={() => setUseLiveAi((prev) => !prev)}
          title="Toggle Real-Time Neural Detection vs Scripted Demo"
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            useLiveAi
              ? 'bg-secondary-container/90 text-secondary border-secondary/50 font-bold'
              : 'bg-surface-container-lowest/85 text-outline border-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {useLiveAi ? 'psychology' : 'slideshow'}
          </span>
          <span>{useLiveAi ? 'LIVE AI' : 'SCRIPTED'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest/85 border border-surface-container-high/70">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-secondary font-bold">[OPTICAL LIVE]</span>
        </div>
      </div>
    </div>
  );
};
