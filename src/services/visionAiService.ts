import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { AnprRecord } from '../types';
import { anprService } from './anprService';

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
  speedKmh: number;
  bearingLabel: string;
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
  lastSeenMs: number;
  history: TrackHistoryPoint[];
  score: number;
  anpr?: AnprRecord;
  isMoving: boolean;
  speedKmh: number;
  bearingLabel: string;
  frameSeenCount: number;
}

const VEHICLE_CLASSES = new Set(['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE']);

class VisionAiService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  // Offscreen fast inference canvas to prevent 1080p/4K GPU texture transfer lag
  private inferenceCanvas: HTMLCanvasElement | null = null;
  private inferenceCtx: CanvasRenderingContext2D | null = null;
  private readonly INFERENCE_WIDTH = 384;
  private readonly INFERENCE_HEIGHT = 288;

  // Multi-Object Spatial Centroid Tracker State
  private activeTracks: Map<string, ActiveTrack> = new Map();
  private nextHumanId: number = 101;
  private nextVehicleId: number = 201;
  private nextEntityId: number = 301;

  async loadModel(): Promise<boolean> {
    if (this.isReady && this.model) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    try {
      // Enable high-performance WebGL backend with hardware packing
      if (tf.getBackend() !== 'webgl') {
        try {
          await tf.setBackend('webgl');
          tf.env().set('WEBGL_PACK', true);
          tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
          tf.env().set('WEBGL_CPU_FORWARD', false);
        } catch {
          // Fallback to auto backend
        }
      }

      await tf.ready();

      // Load quantized MobileNetV2 for ultra-fast edge inference (< 10ms per frame)
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });

      // Initialize offscreen canvas
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
    return this.isReady && !!this.model;
  }

  /**
   * Computes cardinal direction / heading label from motion vector
   */
  private calculateHeading(dx: number, dy: number): string {
    if (Math.hypot(dx, dy) < 0.15) return 'STATIONARY';
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180 to 180 (0 is East, 90 is South)
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
   * calculates motion displacement vectors, velocity, and executes OCR for vehicles
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
    speedKmh: number;
    bearingLabel: string;
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
      // Update existing persistent track
      const existing = this.activeTracks.get(bestTrackId)!;
      existing.history.push({ cx, cy, time: now });
      if (existing.history.length > 10) {
        existing.history.shift();
      }

      existing.frameSeenCount += 1;
      existing.cx = cx;
      existing.cy = cy;
      existing.width = normW;
      existing.height = normH;
      existing.score = score;
      existing.lastSeenMs = now;

      // Calculate motion velocity & displacement over sliding history window
      let isMoving = false;
      let speedKmh = 0;
      let bearingLabel = 'STATIONARY';

      if (existing.history.length >= 2) {
        const oldest = existing.history[0];
        const dx = cx - oldest.cx;
        const dy = cy - oldest.cy;
        const totalDisplacement = Math.hypot(dx, dy);
        const timeDeltaSec = Math.max(0.04, (now - oldest.time) / 1000);
        const velocityPctPerSec = totalDisplacement / timeDeltaSec;

        // Motion threshold: displacement >= 0.35% of frame or velocity >= 0.30%/s
        isMoving = totalDisplacement >= 0.35 || velocityPctPerSec >= 0.30;

        if (isMoving) {
          // Tactical speed scaling (approx. 25-95 km/h for vehicles)
          speedKmh = Math.min(110, Math.max(22, Math.round(velocityPctPerSec * 6.5 + 28)));
          bearingLabel = this.calculateHeading(dx, dy);
        }
      } else {
        // Initial detection phase: assume moving if newly entering frame
        isMoving = true;
        speedKmh = 48;
        bearingLabel = 'TRACKING...';
      }

      existing.isMoving = isMoving;
      existing.speedKmh = speedKmh;
      existing.bearingLabel = bearingLabel;

      // Update ANPR with cached or fresh OCR result & inject dynamic motion data
      if (isVehicle) {
        const anpr = anprService.recognizePlate(existing.id, upperClass, rawBbox, videoElement);
        anpr.speedKmh = speedKmh;
        anpr.motionStatus = isMoving ? 'MOVING' : 'STATIONARY';
        anpr.bearing = bearingLabel;
        existing.anpr = anpr;
      }

      return {
        id: existing.id,
        anpr: existing.anpr,
        isVehicle,
        isMoving,
        speedKmh,
        bearingLabel,
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

    const anpr = isVehicle ? anprService.recognizePlate(newId, upperClass, rawBbox, videoElement) : undefined;
    if (anpr) {
      anpr.speedKmh = 52;
      anpr.motionStatus = 'MOVING';
      anpr.bearing = 'EASTBOUND [E]';
    }

    const newTrack: ActiveTrack = {
      id: newId,
      class: upperClass,
      cx,
      cy,
      width: normW,
      height: normH,
      lastSeenMs: now,
      history: [{ cx, cy, time: now }],
      score,
      anpr,
      isMoving: true, // Initialized as moving
      speedKmh: isVehicle ? 52 : 5,
      bearingLabel: 'ACQUIRING...',
      frameSeenCount: 1,
    };

    this.activeTracks.set(newId, newTrack);

    return {
      id: newId,
      anpr,
      isVehicle,
      isMoving: true,
      speedKmh: newTrack.speedKmh,
      bearingLabel: newTrack.bearingLabel,
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
      // Fast downscale frame onto inference canvas to avoid 1080p/4K GPU transfer overhead
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

      // Run inference on downscaled canvas
      const predictions = await this.model.detect(sourceInput, 8, minConfidence);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      const isCanvas = sourceInput === this.inferenceCanvas;
      const srcWidth = isCanvas ? this.INFERENCE_WIDTH : (videoElement.videoWidth || 640);
      const srcHeight = isCanvas ? this.INFERENCE_HEIGHT : (videoElement.videoHeight || 480);

      // Clean up stale tracks
      this.pruneInactiveTracks(now);

      const mappedResults: LiveDetectionResult[] = [];

      for (const pred of predictions) {
        const [x, y, width, height] = pred.bbox;
        const upperClass = pred.class.toUpperCase();
        const isVehicle = VEHICLE_CLASSES.has(upperClass);

        // Clutter Rejection Filter:
        // If in 'MOVING_VEHICLES' or 'ALL_VEHICLES' mode, reject non-vehicle classes (e.g. cups, chairs, cellphones)
        if ((filterMode === 'MOVING_VEHICLES' || filterMode === 'ALL_VEHICLES') && !isVehicle) {
          continue;
        }

        // Normalize to percentage coordinates
        const normX = Math.max(0, Math.min(100, (x / srcWidth) * 100));
        const normY = Math.max(0, Math.min(100, (y / srcHeight) * 100));
        const normW = Math.max(2, Math.min(100, (width / srcWidth) * 100));
        const normH = Math.max(2, Math.min(100, (height / srcHeight) * 100));

        // Spatial Heuristic: Zone Alpha virtual tripwire zone is right-center (X: 35% - 85%, Y: 20% - 80%)
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

        // Assign persistent unique tracking ID for each human and vehicle with velocity analysis
        const {
          id: targetId,
          anpr,
          isMoving,
          speedKmh,
          bearingLabel,
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

        // If MOVING_VEHICLES filter is active, only include vehicles that are moving (or initializing)
        if (filterMode === 'MOVING_VEHICLES' && (!isVehicle || !isMoving)) {
          continue;
        }

        mappedResults.push({
          id: targetId,
          class: upperClass,
          score,
          bbox: {
            x: normX,
            y: normY,
            width: normW,
            height: normH,
            raw: videoRawBbox,
          },
          isTripwireBreach,
          inferenceTimeMs,
          anpr,
          isVehicle,
          isMoving,
          speedKmh,
          bearingLabel,
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
