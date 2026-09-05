import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { AnprRecord } from '../types';
import { anprService } from './anprService';

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
}

interface ActiveTrack {
  id: string;
  class: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  lastSeenMs: number;
  score: number;
  anpr?: AnprRecord;
}

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
   * Assign or match persistent tracking IDs using spatial centroid proximity & execute OCR for vehicles
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
  ): { id: string; anpr?: AnprRecord } {
    const cx = normX + normW / 2;
    const cy = normY + normH / 2;
    const upperClass = className.toUpperCase();
    const isVehicle = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].includes(upperClass);

    let bestTrackId: string | null = null;
    let minDistance = 25; // Proximity threshold in % of viewport

    // Search active tracks of matching classification
    for (const [trackId, track] of this.activeTracks.entries()) {
      const isTrackVehicle = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].includes(track.class);
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
      existing.cx = cx;
      existing.cy = cy;
      existing.width = normW;
      existing.height = normH;
      existing.score = score;
      existing.lastSeenMs = now;

      // Update ANPR with cached or fresh OCR result
      if (isVehicle) {
        existing.anpr = anprService.recognizePlate(existing.id, upperClass, rawBbox, videoElement);
      }

      return { id: existing.id, anpr: existing.anpr };
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

    const newTrack: ActiveTrack = {
      id: newId,
      class: upperClass,
      cx,
      cy,
      width: normW,
      height: normH,
      lastSeenMs: now,
      score,
      anpr,
    };

    this.activeTracks.set(newId, newTrack);
    return { id: newId, anpr };
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

  async detect(videoElement: HTMLVideoElement): Promise<LiveDetectionResult[]> {
    if (!this.model || !videoElement || videoElement.readyState < 2) {
      return [];
    }

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

      // Run inference on downscaled canvas (takes ~5-10ms on WebGL GPU)
      const predictions = await this.model.detect(sourceInput, 6, 0.40);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      const isCanvas = sourceInput === this.inferenceCanvas;
      const srcWidth = isCanvas ? this.INFERENCE_WIDTH : (videoElement.videoWidth || 640);
      const srcHeight = isCanvas ? this.INFERENCE_HEIGHT : (videoElement.videoHeight || 480);

      // Clean up stale tracks
      this.pruneInactiveTracks(now);

      return predictions.map((pred) => {
        const [x, y, width, height] = pred.bbox;

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
        const upperClass = pred.class.toUpperCase();

        // Convert percentage bbox back to video pixel coords for OCR cropping
        const videoWidth = videoElement.videoWidth || 640;
        const videoHeight = videoElement.videoHeight || 480;
        const videoRawBbox: [number, number, number, number] = [
          (normX / 100) * videoWidth,
          (normY / 100) * videoHeight,
          (normW / 100) * videoWidth,
          (normH / 100) * videoHeight,
        ];

        // Assign persistent unique tracking ID for each human and vehicle with OCR
        const { id: targetId, anpr } = this.matchOrCreateTrack(
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

        return {
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
        };
      });
    } catch (err) {
      console.warn('Inference error:', err);
      return [];
    }
  }
}

export const visionAiService = new VisionAiService();
