import { useState, useEffect, useRef, useCallback } from 'react';
import { visionAiService, LiveDetectionResult } from '../services/visionAiService';
import { useDemo } from '../context/DemoContext';

export interface UseLiveVisionOptions {
  enabled?: boolean;
  minConfidence?: number;
  detectionIntervalMs?: number;
}

export const useLiveVision = (
  videoRef: React.RefObject<HTMLVideoElement>,
  options: UseLiveVisionOptions = {}
) => {
  const { enabled = true, detectionIntervalMs = 80 } = options;
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [liveDetections, setLiveDetections] = useState<LiveDetectionResult[]>([]);
  const [lastInferenceTimeMs, setLastInferenceTimeMs] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  const { isRunning: isDemoRunning } = useDemo();
  const isRunningRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsCheckRef = useRef<number>(performance.now());

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

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        return;
      }

      try {
        const results = await visionAiService.detect(videoRef.current);
        setLiveDetections(results);

        if (results.length > 0) {
          setLastInferenceTimeMs(results[0].inferenceTimeMs);
        }

        // Calculate real-time inference FPS
        frameCountRef.current += 1;
        const now = performance.now();
        if (now - lastFpsCheckRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsCheckRef.current)));
          frameCountRef.current = 0;
          lastFpsCheckRef.current = now;
        }
      } catch (e) {
        console.warn('Inference error in loop:', e);
      }
    }, detectionIntervalMs);

    return () => {
      clearInterval(interval);
      isRunningRef.current = false;
    };
  }, [enabled, videoRef, detectionIntervalMs]);

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
  };
};
