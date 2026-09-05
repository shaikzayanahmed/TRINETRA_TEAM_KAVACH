import { useState, useEffect, useRef, useCallback } from 'react';
import { visionAiService, LiveDetectionResult, DetectionFilterMode } from '../services/visionAiService';
import { useDemo } from '../context/DemoContext';

export interface UseLiveVisionOptions {
  enabled?: boolean;
  minConfidence?: number;
  detectionIntervalMs?: number;
  filterMode?: DetectionFilterMode;
}

export const useLiveVision = (
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseLiveVisionOptions = {}
) => {
  const { enabled = true, detectionIntervalMs = 80, filterMode = 'MOVING_VEHICLES', minConfidence = 0.40 } = options;
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [liveDetections, setLiveDetections] = useState<LiveDetectionResult[]>([]);
  const [lastInferenceTimeMs, setLastInferenceTimeMs] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  const { isRunning: isDemoRunning } = useDemo();
  const isRunningRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsCheckRef = useRef<number>(performance.now());

  const [activeEngine, setActiveEngine] = useState<'YOLOv8'>('YOLOv8');

  // Load the model on mount
  useEffect(() => {
    let isMounted = true;
    const initModel = async () => {
      setIsModelLoading(true);
      const ready = await visionAiService.loadModel();
      if (isMounted) {
        setIsModelReady(ready);
        setIsModelLoading(false);
      }
    };
    initModel();
    return () => {
      isMounted = false;
    };
  }, []);

  const runDetectionLoop = useCallback(() => {
    if (!enabled || !videoRef.current || !visionAiService.isModelLoaded() || isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    let isCancelled = false;
    let isInferring = false;
    let lastInferenceTimestamp = 0;
    let animFrameId: number;

    const processFrame = async () => {
      if (isCancelled) return;

      const now = performance.now();
      const video = videoRef.current;

      // Only infer if video is ready, not currently inferring, and minimum interval elapsed
      if (
        video &&
        video.readyState >= 2 &&
        !isInferring &&
        now - lastInferenceTimestamp >= detectionIntervalMs
      ) {
        isInferring = true;
        lastInferenceTimestamp = now;

        try {
          const results = await visionAiService.detect(video, { filterMode, minConfidence });
          if (!isCancelled) {
            setLiveDetections(results);

            if (results.length > 0) {
              setLastInferenceTimeMs(results[0].inferenceTimeMs);
              if (results[0].engine) {
                setActiveEngine(results[0].engine);
              }
            }

            // Calculate real-time inference FPS
            frameCountRef.current += 1;
            if (now - lastFpsCheckRef.current >= 1000) {
              setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCheckRef.current)));
              frameCountRef.current = 0;
              lastFpsCheckRef.current = now;
            }
          }
        } catch (e) {
          console.warn('Inference error in loop:', e);
        } finally {
          isInferring = false;
        }
      }

      if (!isCancelled) {
        animFrameId = requestAnimationFrame(processFrame);
      }
    };

    animFrameId = requestAnimationFrame(processFrame);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animFrameId);
      isRunningRef.current = false;
    };
  }, [enabled, videoRef, detectionIntervalMs, filterMode, minConfidence]);

  useEffect(() => {
    if (isModelReady && enabled) {
      const cleanup = runDetectionLoop();
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [isModelReady, enabled, runDetectionLoop]);

  return {
    isModelLoading,
    isModelReady,
    liveDetections,
    lastInferenceTimeMs,
    fps,
    isDemoRunning,
    activeEngine,
  };
};
