import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

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
}

class VisionAiService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  async loadModel(): Promise<boolean> {
    if (this.isReady && this.model) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    try {
      // Load standard lightweight mobile model for real-time edge performance
      this.model = await cocoSsd.load({
        base: 'mobilenet_v2',
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

  async detect(videoElement: HTMLVideoElement): Promise<LiveDetectionResult[]> {
    if (!this.model || !videoElement || videoElement.readyState < 2) {
      return [];
    }

    const startTime = performance.now();
    try {
      const predictions = await this.model.detect(videoElement, 6, 0.45);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      return predictions.map((pred, index) => {
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

        const targetId = pred.class.toLowerCase() === 'person' ? 'TGT-2048' : `TGT-${2000 + index}`;

        return {
          id: targetId,
          class: pred.class.toUpperCase(),
          score: Math.round(pred.score * 1000) / 10,
          bbox: {
            x: normX,
            y: normY,
            width: normW,
            height: normH,
            raw: pred.bbox,
          },
          isTripwireBreach,
          inferenceTimeMs,
        };
      });
    } catch (err) {
      console.warn('Inference error:', err);
      return [];
    }
  }
}

export const visionAiService = new VisionAiService();
