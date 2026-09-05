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
      // Ensure TF backend (WebGL / WASM) is ready for hardware acceleration
      await tf.ready();

      // Load ultra-lightweight mobile quantized model for high FPS edge performance
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });
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

      // Update ANPR with latest OCR recognizer result
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
      // Detect up to 6 objects with balanced confidence threshold
      const predictions = await this.model.detect(videoElement, 6, 0.42);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      // Clean up stale tracks
      this.pruneInactiveTracks(now);

      return predictions.map((pred) => {
        const [x, y, width, height] = pred.bbox;

        // Normalize to percentage coordinates
        const normX = Math.max(0, Math.min(100, (x / videoWidth) * 100));
        const normY = Math.max(0, Math.min(100, (y / videoHeight) * 100));
        const normW = Math.max(2, Math.min(100, (width / videoWidth) * 100));
        const normH = Math.max(2, Math.min(100, (height / videoHeight) * 100));

        // Spatial Heuristic: Zone Alpha virtual tripwire zone is right-center (X: 35% - 85%, Y: 20% - 80%)
        const centerX = normX + normW / 2;
        const centerY = normY + normH / 2;
        const isTripwireBreach = centerX > 38 && centerX < 88 && centerY > 20 && centerY < 85;

        const score = Math.round(pred.score * 1000) / 10;
        const upperClass = pred.class.toUpperCase();

        // Assign persistent unique tracking ID for each human and vehicle with OCR
        const { id: targetId, anpr } = this.matchOrCreateTrack(
          pred.class,
          normX,
          normY,
          normW,
          normH,
          score,
          pred.bbox,
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
            raw: pred.bbox,
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
