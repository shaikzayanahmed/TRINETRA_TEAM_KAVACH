import { AnprRecord, Target } from '../types';
import { anprService } from './anprService';
import { yoloService } from './yoloService';
import { apiService } from './apiService';
import { soundService } from './soundService';
import { BBoxOneEuroFilter } from '../utils/oneEuroFilter';

export type DetectionFilterMode = 'MOVING_VEHICLES' | 'ALL_VEHICLES' | 'ALL_OBJECTS';

function checkTargetFenceBreach(cx: number, cy: number, streamId?: string): boolean {
  try {
    const fence = apiService.getActiveFenceSync(streamId);
    if (!fence || fence.status === 'INACTIVE' || !fence.points || fence.points.length < 2) {
      return false;
    }
    const pts = fence.points;
    const type = fence.type || 'POLYGON';

    if (type === 'TRIPWIRE') {
      const p1 = pts[0];
      const p2 = pts[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return Math.hypot(cx - p1.x, cy - p1.y) < 8;
      let t = ((cx - p1.x) * dx + (cy - p1.y) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      return Math.hypot(cx - projX, cy - projY) < 7.5;
    }

    // Polygon / 3D volumetric floor perimeter
    if (pts.length >= 3) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y;
        const xj = pts[j].x, yj = pts[j].y;
        const intersect = ((yi > cy) !== (yj > cy)) && (cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
  } catch (e) {}
  return false;
}

export interface DetectOptions {
  filterMode?: DetectionFilterMode;
  minConfidence?: number;
  streamId?: string;
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
  engine: 'YOLOv8';
  isCoasting?: boolean;
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
  missedFrames: number;
  bboxFilter: BBoxOneEuroFilter;
  lastRawBbox: [number, number, number, number];
}

const VEHICLE_CLASSES = new Set(['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE']);

class VisionAiService {
  private isLoading: boolean = false;
  private isReady: boolean = false;

  // Multi-Camera Spatial Tracker States isolated per streamId
  private streamTracks: Map<string, Map<string, ActiveTrack>> = new Map();
  private nextHumanId: number = 101;
  private nextVehicleId: number = 201;
  private nextEntityId: number = 301;
  private lastBreachReportMs: Map<string, number> = new Map();

  private triggerLiveBreachAlert(
    targetId: string,
    streamId: string,
    score: number,
    videoElement: HTMLVideoElement,
    now: number,
    classification?: string,
    rawBbox?: [number, number, number, number],
    anprRecord?: AnprRecord
  ) {
    const lastBreach = this.lastBreachReportMs.get(targetId) || 0;
    if (now - lastBreach < 8000) {
      return; // 8-second debounce per track
    }
    this.lastBreachReportMs.set(targetId, now);

    const activeFence = apiService.getActiveFenceSync(streamId);
    const zoneName = activeFence?.name || (streamId === 'CAM-STREAM-02' || streamId === 'MEDIA_FILE' ? 'Highway NH-1A Corridor' : 'Sector 07 Zone Alpha');

    // Capture real-time snapshot frame from video canvas
    let snapshotBase64: string | undefined;
    try {
      if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1280, videoElement.videoWidth);
        canvas.height = Math.min(720, videoElement.videoHeight);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          snapshotBase64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    } catch (e) {
      console.warn('[VisionAiService] Failed to capture video snapshot:', e);
    }

    const isVehicle = classification ? VEHICLE_CLASSES.has(classification.toUpperCase()) : targetId.startsWith('TGT-V');

    const resolvedCameraId = streamId === 'DEFAULT_STREAM' ? 'CAM-RGB-01' : (streamId || 'CAM-RGB-01');

    const { alert, evidence } = apiService.recordBreachEvidenceAndAlert({
      targetId,
      targetClassification: isVehicle ? 'VEHICLE' : 'PERSON',
      cameraId: resolvedCameraId,
      zoneName,
      confidence: score || 98.4,
      snapshotBase64,
      videoElement,
      rawBbox,
      anprRecord,
    });

    try {
      soundService.playBreachAlarm();
      window.dispatchEvent(
        new CustomEvent('trinetra_live_breach', {
          detail: {
            alert,
            evidence,
            targetId,
            zoneName,
            cameraId: resolvedCameraId,
            timestamp: new Date().toISOString()
          },
        })
      );
    } catch (e) {}
  }

  private getActiveTracks(streamId: string): Map<string, ActiveTrack> {
    if (!this.streamTracks.has(streamId)) {
      this.streamTracks.set(streamId, new Map());
    }
    return this.streamTracks.get(streamId)!;
  }

  async loadModel(): Promise<boolean> {
    if (this.isReady && yoloService.isModelLoaded()) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    try {
      console.log('[VisionAiService] Initializing exclusive YOLOv8 detection engine with One-Euro smoothing...');
      const ready = await yoloService.loadYoloModel();
      this.isReady = ready;
      this.isLoading = false;
      return ready;
    } catch (err) {
      console.error('[VisionAiService] YOLOv8 initialization error:', err);
      this.isLoading = false;
      return false;
    }
  }

  isModelLoaded(): boolean {
    return this.isReady && yoloService.isModelLoaded();
  }

  getProviderDescription(): string {
    return yoloService.getProviderDescription();
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
   * Deduplicate raw predictions before track assignment to remove sub-boxes (e.g. torso inside full body)
   */
  private filterRawPredictions(rawPredictions: any[], srcWidth: number, srcHeight: number): any[] {
    if (rawPredictions.length <= 1) return rawPredictions;

    const filtered: any[] = [];
    const suppressed = new Uint8Array(rawPredictions.length);

    for (let i = 0; i < rawPredictions.length; i++) {
      if (suppressed[i]) continue;
      const p1 = rawPredictions[i];
      filtered.push(p1);

      const [x1, y1, w1, h1] = p1.bbox;
      const cx1 = x1 + w1 / 2;
      const cy1 = y1 + h1 / 2;
      const area1 = w1 * h1;
      const c1 = p1.class.toUpperCase();

      for (let j = i + 1; j < rawPredictions.length; j++) {
        if (suppressed[j]) continue;
        const p2 = rawPredictions[j];
        const c2 = p2.class.toUpperCase();

        const [x2, y2, w2, h2] = p2.bbox;
        const cx2 = x2 + w2 / 2;
        const cy2 = y2 + h2 / 2;
        const area2 = w2 * h2;

        const ix1 = Math.max(x1, x2);
        const iy1 = Math.max(y1, y2);
        const ix2 = Math.min(x1 + w1, x2 + w2);
        const iy2 = Math.min(y1 + h1, y2 + h2);

        const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
        const minArea = Math.min(area1, area2);
        const union = area1 + area2 - inter;
        const iou = union > 0 ? inter / union : 0;
        const ios = minArea > 0 ? inter / minArea : 0;

        const centerDistPct = (Math.hypot(cx1 - cx2, cy1 - cy2) / Math.max(srcWidth, srcHeight)) * 100;

        // Suppress if same class or compatible person/vehicle and overlapping
        const isSameType = (c1 === c2) || (VEHICLE_CLASSES.has(c1) && VEHICLE_CLASSES.has(c2));
        if (isSameType) {
          if (iou > 0.30 || ios > 0.45 || centerDistPct < 15) {
            suppressed[j] = 1;
          }
        }
      }
    }

    return filtered;
  }

  /**
   * Merge or prune any overlapping active tracks of the same classification
   */
  private deduplicateActiveTracks(activeTracks: Map<string, ActiveTrack>) {
    const trackList = Array.from(activeTracks.entries());
    const toDelete = new Set<string>();

    for (let i = 0; i < trackList.length; i++) {
      const [id1, t1] = trackList[i];
      if (toDelete.has(id1)) continue;

      for (let j = i + 1; j < trackList.length; j++) {
        const [id2, t2] = trackList[j];
        if (toDelete.has(id2)) continue;

        const isSameClass = t1.class === t2.class || (VEHICLE_CLASSES.has(t1.class) && VEHICLE_CLASSES.has(t2.class));
        if (!isSameClass) continue;

        const dist = Math.hypot(t1.cx - t2.cx, t1.cy - t2.cy);
        if (dist < 18) {
          // Keep the established track with higher frame history, delete the duplicate
          if (t1.frameSeenCount >= t2.frameSeenCount) {
            toDelete.add(id2);
          } else {
            toDelete.add(id1);
            break;
          }
        }
      }
    }

    for (const id of toDelete) {
      activeTracks.delete(id);
    }
  }

  /**
   * Prune inactive tracks not seen in over 1.2 seconds or missed over 5 consecutive cycles
   */
  private pruneInactiveTracks(activeTracks: Map<string, ActiveTrack>, now: number) {
    for (const [id, track] of activeTracks.entries()) {
      if (now - track.lastSeenMs > 1200 || track.missedFrames > 5) {
        activeTracks.delete(id);
      }
    }
  }

  async detect(
    videoElement: HTMLVideoElement,
    options: DetectOptions = {}
  ): Promise<LiveDetectionResult[]> {
    if (!videoElement || videoElement.readyState < 2) {
      return [];
    }

    if (!yoloService.isModelLoaded()) {
      return [];
    }

    const { filterMode = 'MOVING_VEHICLES', minConfidence = 0.40, streamId = 'DEFAULT_STREAM' } = options;

    const startTime = performance.now();
    const now = startTime;

    try {
      const srcWidth = videoElement.videoWidth || 640;
      const srcHeight = videoElement.videoHeight || 480;

      // Pure YOLOv8 high-precision detection
      const rawPredictions = await yoloService.detect(videoElement, minConfidence);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      // Clean up duplicate detections in current frame
      const cleanPredictions = this.filterRawPredictions(rawPredictions, srcWidth, srcHeight);

      // Get isolated tracks for this camera/stream
      const activeTracks = this.getActiveTracks(streamId);

      // Deduplicate active tracks for this stream
      this.deduplicateActiveTracks(activeTracks);

      const matchedTrackIds = new Set<string>();
      const mappedResults: LiveDetectionResult[] = [];

      // Parse normalized candidate items
      interface CandidateItem {
        className: string;
        upperClass: string;
        isVehicle: boolean;
        normX: number;
        normY: number;
        normW: number;
        normH: number;
        cx: number;
        cy: number;
        score: number;
        rawBbox: [number, number, number, number];
      }

      const candidates: CandidateItem[] = [];

      for (const pred of cleanPredictions) {
        const [x, y, width, height] = pred.bbox;
        const upperClass = pred.class.toUpperCase();
        const isVehicle = VEHICLE_CLASSES.has(upperClass);

        if ((filterMode === 'MOVING_VEHICLES' || filterMode === 'ALL_VEHICLES') && !isVehicle) {
          continue;
        }

        const normX = Math.max(0, Math.min(100, (x / srcWidth) * 100));
        const normY = Math.max(0, Math.min(100, (y / srcHeight) * 100));
        const normW = Math.max(2, Math.min(100, (width / srcWidth) * 100));
        const normH = Math.max(2, Math.min(100, (height / srcHeight) * 100));

        candidates.push({
          className: pred.class,
          upperClass,
          isVehicle,
          normX,
          normY,
          normW,
          normH,
          cx: normX + normW / 2,
          cy: normY + normH / 2,
          score: Math.round(pred.score * 1000) / 10,
          rawBbox: [
            (normX / 100) * srcWidth,
            (normY / 100) * srcHeight,
            (normW / 100) * srcWidth,
            (normH / 100) * srcHeight,
          ],
        });
      }

      // Greedy 1-to-1 matching between candidates and active tracks
      const assignedCandidates = new Set<number>();
      const assignedTracks = new Set<string>();

      // Build distance matrix
      interface MatchPair {
        candidateIdx: number;
        trackId: string;
        distance: number;
      }

      const matchPairs: MatchPair[] = [];

      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const cand = candidates[cIdx];
        for (const [trackId, track] of activeTracks.entries()) {
          const isTrackVehicle = VEHICLE_CLASSES.has(track.class);
          const isCompatibleClass =
            track.class === cand.upperClass ||
            (cand.isVehicle && isTrackVehicle) ||
            (cand.upperClass === 'PERSON' && track.class === 'PERSON');

          if (!isCompatibleClass) continue;

          const dist = Math.hypot(track.cx - cand.cx, track.cy - cand.cy);
          if (dist <= 35) {
            matchPairs.push({ candidateIdx: cIdx, trackId, distance: dist });
          }
        }
      }

      // Sort by closest distance
      matchPairs.sort((a, b) => a.distance - b.distance);

      for (const pair of matchPairs) {
        if (assignedCandidates.has(pair.candidateIdx) || assignedTracks.has(pair.trackId)) {
          continue;
        }

        assignedCandidates.add(pair.candidateIdx);
        assignedTracks.add(pair.trackId);
        matchedTrackIds.add(pair.trackId);

        const cand = candidates[pair.candidateIdx];
        const existing = activeTracks.get(pair.trackId)!;

        existing.missedFrames = 0;
        existing.lastRawBbox = cand.rawBbox;

        const smoothed = existing.bboxFilter.filter(cand.normX, cand.normY, cand.normW, cand.normH, now);
        const smoothedCx = smoothed.x + smoothed.width / 2;
        const smoothedCy = smoothed.y + smoothed.height / 2;

        existing.history.push({ cx: smoothedCx, cy: smoothedCy, time: now });
        if (existing.history.length > 12) existing.history.shift();

        existing.frameSeenCount += 1;
        existing.cx = smoothedCx;
        existing.cy = smoothedCy;
        existing.width = smoothed.width;
        existing.height = smoothed.height;
        existing.score = cand.score;
        existing.lastSeenMs = now;

        // Calculate motion
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

          isMoving = totalDisplacement >= 0.28 || velocityPctPerSec >= 0.22;

          if (isMoving) {
            speedKmh = Math.min(110, Math.max(24, Math.round(velocityPctPerSec * 6.5 + 28)));
            bearingLabel = this.calculateHeading(dx, dy);
            existing.stationarySinceMs = null;
          } else {
            if (!existing.stationarySinceMs) existing.stationarySinceMs = now;
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

        // ANPR Trigger
        let anprRecord: AnprRecord | undefined;
        if (cand.isVehicle && isMoving) {
          anprRecord = anprService.recognizePlate(existing.id, cand.upperClass, cand.rawBbox, videoElement);
          anprRecord.speedKmh = speedKmh;
          anprRecord.motionStatus = 'MOVING';
          anprRecord.bearing = bearingLabel;
          existing.anpr = anprRecord;
        } else {
          existing.anpr = undefined;
        }

        if (filterMode === 'MOVING_VEHICLES' && (!cand.isVehicle || (!isMoving && !isSuspiciousStill))) {
          continue;
        }

        const isTripwireBreach = checkTargetFenceBreach(smoothedCx, smoothedCy, streamId);

        if (isTripwireBreach) {
          this.triggerLiveBreachAlert(
            existing.id,
            streamId,
            cand.score,
            videoElement,
            now,
            existing.class,
            cand.rawBbox,
            anprRecord
          );
        }

        mappedResults.push({
          id: existing.id,
          class: existing.class,
          score: cand.score,
          bbox: {
            x: Math.round(smoothed.x * 100) / 100,
            y: Math.round(smoothed.y * 100) / 100,
            width: Math.round(smoothed.width * 100) / 100,
            height: Math.round(smoothed.height * 100) / 100,
            raw: cand.rawBbox,
          },
          isTripwireBreach,
          inferenceTimeMs,
          anpr: anprRecord,
          isVehicle: cand.isVehicle,
          isMoving,
          isSuspiciousStill,
          stillDurationSeconds,
          speedKmh,
          bearingLabel,
          engine: 'YOLOv8',
          isCoasting: false,
        });
      }

      // Spawn new tracks only for unassigned candidates that do NOT overlap with any active track
      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        if (assignedCandidates.has(cIdx)) continue;
        const cand = candidates[cIdx];

        // Guard: Check if any active track is within proximity
        let isTooClose = false;
        for (const track of activeTracks.values()) {
          const isSameClass = track.class === cand.upperClass || (cand.isVehicle && VEHICLE_CLASSES.has(track.class));
          if (isSameClass && Math.hypot(track.cx - cand.cx, track.cy - cand.cy) < 22) {
            isTooClose = true;
            break;
          }
        }
        if (isTooClose) continue;

        // Allocate new track
        let newId: string;
        if (cand.upperClass === 'PERSON') {
          newId = `TGT-H${this.nextHumanId++}`;
        } else if (cand.isVehicle) {
          newId = `TGT-V${this.nextVehicleId++}`;
        } else {
          newId = `TGT-E${this.nextEntityId++}`;
        }

        const initialAnpr = cand.isVehicle ? anprService.recognizePlate(newId, cand.upperClass, cand.rawBbox, videoElement) : undefined;
        if (initialAnpr) {
          initialAnpr.speedKmh = 52;
          initialAnpr.motionStatus = 'MOVING';
          initialAnpr.bearing = 'EASTBOUND [E]';
        }

        const filter = new BBoxOneEuroFilter(0.7, 0.04);
        const initialSmoothed = filter.filter(cand.normX, cand.normY, cand.normW, cand.normH, now);

        const newTrack: ActiveTrack = {
          id: newId,
          class: cand.upperClass,
          cx: cand.cx,
          cy: cand.cy,
          width: cand.normW,
          height: cand.normH,
          firstSeenMs: now,
          lastSeenMs: now,
          stationarySinceMs: null,
          history: [{ cx: cand.cx, cy: cand.cy, time: now }],
          score: cand.score,
          anpr: initialAnpr,
          isMoving: true,
          isSuspiciousStill: false,
          stillDurationSeconds: 0,
          speedKmh: cand.isVehicle ? 52 : 5,
          bearingLabel: 'ACQUIRING...',
          frameSeenCount: 1,
          missedFrames: 0,
          bboxFilter: filter,
          lastRawBbox: cand.rawBbox,
        };

        activeTracks.set(newId, newTrack);
        matchedTrackIds.add(newId);

        if (filterMode === 'MOVING_VEHICLES' && !cand.isVehicle) {
          continue;
        }

        const isTripwireBreach = checkTargetFenceBreach(cand.cx, cand.cy, streamId);

        if (isTripwireBreach) {
          this.triggerLiveBreachAlert(
            newId,
            streamId,
            cand.score,
            videoElement,
            now,
            cand.upperClass,
            cand.rawBbox,
            initialAnpr
          );
        }

        mappedResults.push({
          id: newId,
          class: cand.upperClass,
          score: cand.score,
          bbox: {
            x: Math.round(initialSmoothed.x * 100) / 100,
            y: Math.round(initialSmoothed.y * 100) / 100,
            width: Math.round(initialSmoothed.width * 100) / 100,
            height: Math.round(initialSmoothed.height * 100) / 100,
            raw: cand.rawBbox,
          },
          isTripwireBreach,
          inferenceTimeMs,
          anpr: initialAnpr,
          isVehicle: cand.isVehicle,
          isMoving: true,
          isSuspiciousStill: false,
          stillDurationSeconds: 0,
          speedKmh: newTrack.speedKmh,
          bearingLabel: newTrack.bearingLabel,
          engine: 'YOLOv8',
          isCoasting: false,
        });
      }

      // Track Hysteresis / Anti-Flicker: Coast established tracks ONLY if no other track is in that spot
      for (const [trackId, track] of activeTracks.entries()) {
        if (!matchedTrackIds.has(trackId)) {
          track.missedFrames += 1;

          if (track.frameSeenCount >= 3 && track.missedFrames <= 3 && (now - track.lastSeenMs <= 380)) {
            // Guard: Do not coast if a newly matched track is near this position
            let isClashing = false;
            for (const otherId of matchedTrackIds) {
              const other = activeTracks.get(otherId);
              if (other && Math.hypot(other.cx - track.cx, other.cy - track.cy) < 20) {
                isClashing = true;
                break;
              }
            }
            if (isClashing) continue;

            const isVehicle = VEHICLE_CLASSES.has(track.class);
            if (filterMode === 'MOVING_VEHICLES' && (!isVehicle || (!track.isMoving && !track.isSuspiciousStill))) {
              continue;
            }

            const currentX = track.cx - track.width / 2;
            const currentY = track.cy - track.height / 2;
            const smoothed = track.bboxFilter.filter(currentX, currentY, track.width, track.height, now);
            const centerX = smoothed.x + smoothed.width / 2;
            const centerY = smoothed.y + smoothed.height / 2;
            const isTripwireBreach = checkTargetFenceBreach(centerX, centerY, streamId);

            mappedResults.push({
              id: track.id,
              class: track.class,
              score: Math.max(10, Math.round(track.score * 0.92)),
              bbox: {
                x: Math.round(smoothed.x * 100) / 100,
                y: Math.round(smoothed.y * 100) / 100,
                width: Math.round(smoothed.width * 100) / 100,
                height: Math.round(smoothed.height * 100) / 100,
                raw: track.lastRawBbox,
              },
              isTripwireBreach,
              inferenceTimeMs,
              anpr: track.anpr,
              isVehicle,
              isMoving: track.isMoving,
              isSuspiciousStill: track.isSuspiciousStill,
              stillDurationSeconds: track.stillDurationSeconds,
              speedKmh: track.speedKmh,
              bearingLabel: track.bearingLabel,
              engine: 'YOLOv8',
              isCoasting: true,
            });
          }
        }
      }

      // Clean up stale tracks for this stream (timeout after 900ms of non-detection)
      this.pruneInactiveTracks(activeTracks, now);

      // Synchronize live active targets with apiService and dispatch event
      const liveTargets = this.getAllActiveLiveTargets();
      apiService.setLiveTargets(liveTargets);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('trinetra_targets_updated', {
              detail: { targets: liveTargets },
            })
          );
        }
      } catch (e) {}

      return mappedResults;
    } catch (err) {
      console.warn('YOLOv8 Inference error:', err);
      return [];
    }
  }

  public getAllActiveLiveTargets(): Target[] {
    const targets: Target[] = [];
    for (const [streamId, tracks] of this.streamTracks.entries()) {
      for (const [, track] of tracks.entries()) {
        const isVehicle = VEHICLE_CLASSES.has(track.class);
        const classification = (track.class === 'PERSON' || track.class === 'HUMAN') ? 'PERSON' : (isVehicle ? 'VEHICLE' : 'UNKNOWN');

        targets.push({
          id: track.id,
          classification,
          confidence: Math.round(track.score),
          status: 'TRACKING',
          firstDetectedAt: new Date(track.firstSeenMs).toLocaleTimeString(),
          lastSeenAt: new Date(track.lastSeenMs).toLocaleTimeString(),
          cameraId: streamId === 'DEFAULT_STREAM' ? 'CAM-RGB-01' : streamId,
          sector: 'Northern Border Sector 07',
          zone: 'Zone Alpha',
          coordinates: {
            lat: 34.2911 + (track.cy - 50) * 0.0004,
            lng: 77.7533 + (track.cx - 50) * 0.0004,
          },
          trajectory: track.history.map((h) => ({
            x: h.cx,
            y: h.cy,
            lat: 34.2911 + (h.cy - 50) * 0.0004,
            lng: 77.7533 + (h.cx - 50) * 0.0004,
            width: track.width,
            height: track.height,
            timestamp: new Date(h.time).toLocaleTimeString(),
          })),
          speedKmh: track.speedKmh,
          bearing: track.bearingLabel,
          anpr: track.anpr,
        });
      }
    }
    return targets;
  }

  public clearStreamTracks(streamId?: string) {
    if (streamId) {
      this.streamTracks.delete(streamId);
    } else {
      this.streamTracks.clear();
    }
    const liveTargets = this.getAllActiveLiveTargets();
    apiService.setLiveTargets(liveTargets);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('trinetra_targets_updated', {
            detail: { targets: liveTargets },
          })
        );
      }
    } catch (e) {}
  }
}

export const visionAiService = new VisionAiService();

