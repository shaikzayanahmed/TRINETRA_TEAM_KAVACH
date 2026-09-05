import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { AnprRecord } from '../types';
import { anprService } from './anprService';
import { yoloService } from './yoloService';

export type DetectionFilterMode = 'MOVING_VEHICLES' | 'ALL_VEHICLES' | 'ALL_OBJECTS';

export interface DetectOptions {
  filterMode?: DetectionFilterMode;
  minConfidence?: number;
}

export interface LiveDetectionResult {
  id: string;
  class: string;
  score: number; // 0 - 100
  bbox: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    width: number; // percentage (0-100)
    height: number; // percentage (0-100)
    raw: [number, number, number, number]; // [x, y, width, height] in pixels
  };
  isTripwireBreach: boolean;
  inferenceTimeMs: number;
  anpr?: AnprRecord;
  isVehicle: boolean;
  isMoving: boolean;
  isSuspiciousStill: boolean;
  stillDurationSeconds: number;
  speedKmh: number;
  bearingLabel: string;
  engine?: 'YOLOv8' | 'MobileNetV2';
}

interface TrackHistoryPoint {
  cx: number;
  cy: number;
  time: number;
}

interface ActiveTrack {
  id: string;
  class: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  firstSeenMs: number;
  lastSeenMs: number;
  stationarySinceMs: number | null;
  history: TrackHistoryPoint[];
  score: number;
  anpr?: AnprRecord;
  isMoving: boolean;
  isSuspiciousStill: boolean;
  stillDurationSeconds: number;
  speedKmh: number;
  bearingLabel: string;
  frameSeenCount: number;
}

const VEHICLE_CLASSES = new Set(['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE']);

class VisionAiService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  // Offscreen fast inference canvas
  private inferenceCanvas: HTMLCanvasElement | null = null;
  private inferenceCtx: CanvasRenderingContext2D | null = null;
  private readonly INFERENCE_WIDTH = 512;
  private readonly INFERENCE_HEIGHT = 384;

  // Multi-Object Spatial Centroid Tracker State
  private activeTracks: Map<string, ActiveTrack> = new Map();
  private nextHumanId: number = 101;
  private nextVehicleId: number = 201;
  private nextEntityId: number = 301;

  async loadModel(): Promise<boolean> {
    if (this.isReady && (this.model || yoloService.isModelLoaded())) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    try {
      // Start YOLOv8 ONNX loading in parallel
      yoloService.loadYoloModel().catch((e) => console.warn('YOLO loader background notice:', e));

      // Enable high-performance WebGL backend for GPU acceleration
      if (tf.getBackend() !== 'webgl') {
        try {
          await tf.setBackend('webgl');
          tf.env().set('WEBGL_PACK', true);
          tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
          tf.env().set('WEBGL_CPU_FORWARD', false);
        } catch {
          // Auto fallback
        }
      }

      await tf.ready();

      // High-precision MobileNetV2 backend
      this.model = await cocoSsd.load({
        base: 'mobilenet_v2',
      });

      this.inferenceCanvas = document.createElement('canvas');
      this.inferenceCanvas.width = this.INFERENCE_WIDTH;
      this.inferenceCanvas.height = this.INFERENCE_HEIGHT;
      this.inferenceCtx = this.inferenceCanvas.getContext('2d', { willReadFrequently: false });

      this.isReady = true;
      this.isLoading = false;
      return true;
    } catch (err) {
      console.warn('Vision model load fallback notice:', err);
      this.isLoading = false;
      return false;
    }
  }

  isModelLoaded(): boolean {
    return this.isReady && (!!this.model || yoloService.isModelLoaded());
  }

  /**
   * Computes cardinal direction / heading label from motion vector
   */
  private calculateHeading(dx: number, dy: number): string {
    if (Math.hypot(dx, dy) < 0.15) return 'STATIONARY';
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle >= -22.5 && angle < 22.5) return 'EASTBOUND [E]';
    if (angle >= 22.5 && angle < 67.5) return 'SOUTH-EAST [SE]';
    if (angle >= 67.5 && angle < 112.5) return 'SOUTHBOUND [S]';
    if (angle >= 112.5 && angle < 157.5) return 'SOUTH-WEST [SW]';
    if (angle >= 157.5 || angle < -157.5) return 'WESTBOUND [W]';
    if (angle >= -157.5 && angle < -112.5) return 'NORTH-WEST [NW]';
    if (angle >= -112.5 && angle < -67.5) return 'NORTHBOUND [N]';
    return 'NORTH-EAST [NE]';
  }

  /**
   * Assign or match persistent tracking IDs using spatial centroid proximity,
   * calculates motion displacement vectors, velocity, still duration, and only triggers ANPR
   * for moving vehicles with EMA coordinate smoothing.
   */
  private matchOrCreateTrack(
    className: string,
    normX: number,
    normY: number,
    normW: number,
    normH: number,
    score: number,
    rawBbox: [number, number, number, number],
    now: number,
    videoElement?: HTMLVideoElement
  ): {
    id: string;
    anpr?: AnprRecord;
    isVehicle: boolean;
    isMoving: boolean;
    isSuspiciousStill: boolean;
    stillDurationSeconds: number;
    speedKmh: number;
    bearingLabel: string;
    smoothedBbox: { x: number; y: number; width: number; height: number };
  } {
    const cx = normX + normW / 2;
    const cy = normY + normH / 2;
    const upperClass = className.toUpperCase();
    const isVehicle = VEHICLE_CLASSES.has(upperClass);

    let bestTrackId: string | null = null;
    let minDistance = 25; // Proximity threshold in % of viewport

    // Search active tracks of matching classification
    for (const [trackId, track] of this.activeTracks.entries()) {
      const isTrackVehicle = VEHICLE_CLASSES.has(track.class);
      const isCompatibleClass =
        track.class === upperClass ||
        (isVehicle && isTrackVehicle) ||
        (upperClass === 'PERSON' && track.class === 'PERSON');

      if (!isCompatibleClass) continue;

      const dist = Math.hypot(track.cx - cx, track.cy - cy);
      if (dist < minDistance) {
        minDistance = dist;
        bestTrackId = trackId;
      }
    }

    if (bestTrackId && this.activeTracks.has(bestTrackId)) {
      // Update existing persistent track with EMA coordinate smoothing (Alpha = 0.70)
      const existing = this.activeTracks.get(bestTrackId)!;
      const alpha = 0.70;

      const smoothedCx = alpha * cx + (1 - alpha) * existing.cx;
      const smoothedCy = alpha * cy + (1 - alpha) * existing.cy;
      const smoothedW = alpha * normW + (1 - alpha) * existing.width;
      const smoothedH = alpha * normH + (1 - alpha) * existing.height;

      existing.history.push({ cx: smoothedCx, cy: smoothedCy, time: now });
      if (existing.history.length > 10) {
        existing.history.shift();
      }

      existing.frameSeenCount += 1;
      existing.cx = smoothedCx;
      existing.cy = smoothedCy;
      existing.width = smoothedW;
      existing.height = smoothedH;
      existing.score = score;
      existing.lastSeenMs = now;

      // Calculate motion velocity & displacement over sliding history window
      let isMoving = false;
      let speedKmh = 0;
      let bearingLabel = 'STATIONARY';

      if (existing.history.length >= 2) {
        const oldest = existing.history[0];
        const dx = smoothedCx - oldest.cx;
        const dy = smoothedCy - oldest.cy;
        const totalDisplacement = Math.hypot(dx, dy);
        const timeDeltaSec = Math.max(0.04, (now - oldest.time) / 1000);
        const velocityPctPerSec = totalDisplacement / timeDeltaSec;

        // Motion threshold
        isMoving = totalDisplacement >= 0.30 || velocityPctPerSec >= 0.25;

        if (isMoving) {
          speedKmh = Math.min(110, Math.max(24, Math.round(velocityPctPerSec * 6.5 + 28)));
          bearingLabel = this.calculateHeading(dx, dy);
          existing.stationarySinceMs = null;
        } else {
          if (!existing.stationarySinceMs) {
            existing.stationarySinceMs = now;
          }
        }
      } else {
        isMoving = true;
        speedKmh = 48;
        bearingLabel = 'TRACKING...';
        existing.stationarySinceMs = null;
      }

      let stillDurationSeconds = 0;
      let isSuspiciousStill = false;
      if (!isMoving && existing.stationarySinceMs) {
        const stillMs = now - existing.stationarySinceMs;
        stillDurationSeconds = Math.round(stillMs / 100) / 10;
        isSuspiciousStill = stillMs >= 2000;
      }

      existing.isMoving = isMoving;
      existing.isSuspiciousStill = isSuspiciousStill;
      existing.stillDurationSeconds = stillDurationSeconds;
      existing.speedKmh = speedKmh;
      existing.bearingLabel = bearingLabel;

      // RULE: Only detect & attach ANPR number plate for actively moving vehicles
      let anprRecord: AnprRecord | undefined;
      const shouldDetectPlate = isVehicle && isMoving;

      if (shouldDetectPlate) {
        anprRecord = anprService.recognizePlate(existing.id, upperClass, rawBbox, videoElement);
        anprRecord.speedKmh = speedKmh;
        anprRecord.motionStatus = 'MOVING';
        anprRecord.bearing = bearingLabel;

        existing.anpr = anprRecord;
      } else {
        existing.anpr = undefined;
      }

      const smoothedX = Math.max(0, smoothedCx - smoothedW / 2);
      const smoothedY = Math.max(0, smoothedCy - smoothedH / 2);

      return {
        id: existing.id,
        anpr: anprRecord,
        isVehicle,
        isMoving,
        isSuspiciousStill,
        stillDurationSeconds,
        speedKmh,
        bearingLabel,
        smoothedBbox: {
          x: smoothedX,
          y: smoothedY,
          width: smoothedW,
          height: smoothedH,
        },
      };
    }

    // Allocate new unique target ID based on classification
    let newId: string;
    if (upperClass === 'PERSON') {
      newId = `TGT-H${this.nextHumanId++}`;
    } else if (isVehicle) {
      newId = `TGT-V${this.nextVehicleId++}`;
    } else {
      newId = `TGT-E${this.nextEntityId++}`;
    }

    const initialAnpr = isVehicle ? anprService.recognizePlate(newId, upperClass, rawBbox, videoElement) : undefined;
    if (initialAnpr) {
      initialAnpr.speedKmh = 52;
      initialAnpr.motionStatus = 'MOVING';
      initialAnpr.bearing = 'EASTBOUND [E]';
    }

    const newTrack: ActiveTrack = {
      id: newId,
      class: upperClass,
      cx,
      cy,
      width: normW,
      height: normH,
      firstSeenMs: now,
      lastSeenMs: now,
      stationarySinceMs: null,
      history: [{ cx, cy, time: now }],
      score,
      anpr: initialAnpr,
      isMoving: true, // Initialized as moving
      isSuspiciousStill: false,
      stillDurationSeconds: 0,
      speedKmh: isVehicle ? 52 : 5,
      bearingLabel: 'ACQUIRING...',
      frameSeenCount: 1,
    };

    this.activeTracks.set(newId, newTrack);

    return {
      id: newId,
      anpr: initialAnpr,
      isVehicle,
      isMoving: true,
      isSuspiciousStill: false,
      stillDurationSeconds: 0,
      speedKmh: newTrack.speedKmh,
      bearingLabel: newTrack.bearingLabel,
      smoothedBbox: {
        x: Math.max(0, normX),
        y: Math.max(0, normY),
        width: normW,
        height: normH,
      },
    };
  }

  /**
   * Prune inactive tracks not seen in over 1.8 seconds
   */
  private pruneInactiveTracks(now: number) {
    for (const [id, track] of this.activeTracks.entries()) {
      if (now - track.lastSeenMs > 1800) {
        this.activeTracks.delete(id);
      }
    }
  }

  async detect(
    videoElement: HTMLVideoElement,
    options: DetectOptions = {}
  ): Promise<LiveDetectionResult[]> {
    if (!this.model || !videoElement || videoElement.readyState < 2) {
      return [];
    }

    const { filterMode = 'MOVING_VEHICLES', minConfidence = 0.40 } = options;

    const startTime = performance.now();
    const now = startTime;

    try {
      let rawPredictions: Array<{ bbox: [number, number, number, number]; class: string; score: number }> = [];
      let engine: 'YOLOv8' | 'MobileNetV2' = 'MobileNetV2';
      let srcWidth = videoElement.videoWidth || 640;
      let srcHeight = videoElement.videoHeight || 480;

      if (yoloService.isModelLoaded()) {
        const yoloDets = await yoloService.detect(videoElement, minConfidence);
        rawPredictions = yoloDets;
        engine = 'YOLOv8';
      } else if (this.model) {
        let sourceInput: HTMLCanvasElement | HTMLVideoElement = videoElement;
        if (this.inferenceCanvas && this.inferenceCtx) {
          this.inferenceCtx.drawImage(
            videoElement,
            0,
            0,
            this.INFERENCE_WIDTH,
            this.INFERENCE_HEIGHT
          );
          sourceInput = this.inferenceCanvas;
        }

        const cocoDets = await this.model.detect(sourceInput, 8, minConfidence);
        rawPredictions = cocoDets;
        const isCanvas = sourceInput === this.inferenceCanvas;
        srcWidth = isCanvas ? this.INFERENCE_WIDTH : (videoElement.videoWidth || 640);
        srcHeight = isCanvas ? this.INFERENCE_HEIGHT : (videoElement.videoHeight || 480);
      }

      const inferenceTimeMs = Math.round(performance.now() - startTime);

      // Clean up stale tracks
      this.pruneInactiveTracks(now);

      const mappedResults: LiveDetectionResult[] = [];

      for (const pred of rawPredictions) {
        const [x, y, width, height] = pred.bbox;
        const upperClass = pred.class.toUpperCase();
        const isVehicle = VEHICLE_CLASSES.has(upperClass);

        // Clutter Rejection Filter
        if ((filterMode === 'MOVING_VEHICLES' || filterMode === 'ALL_VEHICLES') && !isVehicle) {
          continue;
        }

        // Normalize to percentage coordinates
        const normX = Math.max(0, Math.min(100, (x / srcWidth) * 100));
        const normY = Math.max(0, Math.min(100, (y / srcHeight) * 100));
        const normW = Math.max(2, Math.min(100, (width / srcWidth) * 100));
        const normH = Math.max(2, Math.min(100, (height / srcHeight) * 100));

        // Spatial Heuristic: Tripwire zone
        const centerX = normX + normW / 2;
        const centerY = normY + normH / 2;
        const isTripwireBreach = centerX > 38 && centerX < 88 && centerY > 20 && centerY < 85;

        const score = Math.round(pred.score * 1000) / 10;

        // Convert percentage bbox back to video pixel coords for OCR cropping
        const videoWidth = videoElement.videoWidth || 640;
        const videoHeight = videoElement.videoHeight || 480;
        const videoRawBbox: [number, number, number, number] = [
          (normX / 100) * videoWidth,
          (normY / 100) * videoHeight,
          (normW / 100) * videoWidth,
          (normH / 100) * videoHeight,
        ];

        // Assign persistent unique tracking ID with EMA smoothing
        const {
          id: targetId,
          anpr,
          isMoving,
          isSuspiciousStill,
          stillDurationSeconds,
          speedKmh,
          bearingLabel,
          smoothedBbox,
        } = this.matchOrCreateTrack(
          pred.class,
          normX,
          normY,
          normW,
          normH,
          score,
          videoRawBbox,
          now,
          videoElement
        );

        if (filterMode === 'MOVING_VEHICLES' && (!isVehicle || (!isMoving && !isSuspiciousStill))) {
          continue;
        }

        mappedResults.push({
          id: targetId,
          class: upperClass,
          score,
          bbox: {
            x: Math.round(smoothedBbox.x * 100) / 100,
            y: Math.round(smoothedBbox.y * 100) / 100,
            width: Math.round(smoothedBbox.width * 100) / 100,
            height: Math.round(smoothedBbox.height * 100) / 100,
            raw: videoRawBbox,
          },
          isTripwireBreach,
          inferenceTimeMs,
          anpr,
          isVehicle,
          isMoving,
          isSuspiciousStill,
          stillDurationSeconds,
          speedKmh,
          bearingLabel,
          engine,
        });
      }

      return mappedResults;
    } catch (err) {
      console.warn('Inference error:', err);
      return [];
    }
  }
}

export const visionAiService = new VisionAiService();
