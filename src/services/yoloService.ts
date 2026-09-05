import * as ort from 'onnxruntime-web';

export interface YoloDetection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height] in source pixels
}

const YOLO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote',
  'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book',
  'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export class YoloService {
  private session: ort.InferenceSession | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;
  private inputWidth: number = 640;
  private inputHeight: number = 640;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    // Configure ONNX WebAssembly environment to load from local public/ directory
    try {
      if (typeof window !== 'undefined') {
        ort.env.wasm.wasmPaths = window.location.origin + '/';
      } else {
        ort.env.wasm.wasmPaths = '/';
      }
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
    } catch (e) {
      console.warn('ONNX environment initialization note:', e);
    }
  }

  public async loadYoloModel(modelUrl?: string): Promise<boolean> {
    if (this.isReady && this.session) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    const defaultUrl = modelUrl || '/models/yolov8n.onnx';

    try {
      console.log(`[YOLOv8 Engine] Loading model weights from: ${defaultUrl}`);
      // Initialize ONNX InferenceSession with WebGL/WASM execution providers
      this.session = await ort.InferenceSession.create(defaultUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.inputWidth;
      this.offscreenCanvas.height = this.inputHeight;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

      this.isReady = true;
      this.isLoading = false;
      console.log('✅ [YOLOv8 Engine] Ultralytics YOLOv8 ONNX model loaded & primed successfully!');
      return true;
    } catch (err) {
      console.error('❌ [YOLOv8 Engine] Failed to load YOLOv8 model:', err);
      this.isLoading = false;
      return false;
    }
  }

  public isModelLoaded(): boolean {
    return this.isReady && this.session !== null;
  }

  /**
   * Preprocess video frame into YOLOv8 NCHW Float32 input tensor (1, 3, 640, 640)
   */
  private preprocess(video: HTMLVideoElement): ort.Tensor | null {
    if (!this.offscreenCanvas || !this.offscreenCtx) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.inputWidth;
      this.offscreenCanvas.height = this.inputHeight;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }

    const ctx = this.offscreenCtx;
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, this.inputWidth, this.inputHeight);
    const imgData = ctx.getImageData(0, 0, this.inputWidth, this.inputHeight);
    const { data } = imgData;

    const float32Data = new Float32Array(3 * this.inputWidth * this.inputHeight);
    const channelSize = this.inputWidth * this.inputHeight;

    for (let i = 0; i < channelSize; i++) {
      float32Data[i] = data[i * 4] / 255.0; // Red
      float32Data[channelSize + i] = data[i * 4 + 1] / 255.0; // Green
      float32Data[2 * channelSize + i] = data[i * 4 + 2] / 255.0; // Blue
    }

    return new ort.Tensor('float32', float32Data, [1, 3, this.inputHeight, this.inputWidth]);
  }

  /**
   * Postprocess YOLOv8 output tensor (1, 84, 8400) into bounding boxes with NMS
   */
  private postprocess(
    outputTensor: ort.Tensor,
    srcWidth: number,
    srcHeight: number,
    confThreshold: number = 0.40,
    iouThreshold: number = 0.45
  ): YoloDetection[] {
    const data = outputTensor.data as Float32Array;
    const numCandidates = 8400;
    const numClasses = 80;

    const scaleX = srcWidth / this.inputWidth;
    const scaleY = srcHeight / this.inputHeight;

    const boxes: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      classId: number;
      score: number;
    }> = [];

    for (let i = 0; i < numCandidates; i++) {
      let maxScore = 0;
      let maxClassId = -1;

      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numCandidates + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      if (maxScore >= confThreshold) {
        const cx = data[0 * numCandidates + i] * scaleX;
        const cy = data[1 * numCandidates + i] * scaleY;
        const w = data[2 * numCandidates + i] * scaleX;
        const h = data[3 * numCandidates + i] * scaleY;

        const x = Math.max(0, cx - w / 2);
        const y = Math.max(0, cy - h / 2);

        boxes.push({
          x,
          y,
          w,
          h,
          classId: maxClassId,
          score: maxScore,
        });
      }
    }

    // Sort by score descending
    boxes.sort((a, b) => b.score - a.score);

    // IoU Non-Maximum Suppression (NMS)
    const selected: YoloDetection[] = [];
    const suppressed = new Uint8Array(boxes.length);

    for (let i = 0; i < boxes.length; i++) {
      if (suppressed[i]) continue;
      const b1 = boxes[i];

      selected.push({
        class: YOLO_CLASSES[b1.classId] || 'object',
        score: Math.round(b1.score * 1000) / 1000,
        bbox: [b1.x, b1.y, b1.w, b1.h],
      });

      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed[j]) continue;
        const b2 = boxes[j];

        if (b1.classId === b2.classId) {
          const iou = this.computeIoU(b1, b2);
          if (iou > iouThreshold) {
            suppressed[j] = 1;
          }
        }
      }
    }

    return selected;
  }

  private computeIoU(
    b1: { x: number; y: number; w: number; h: number },
    b2: { x: number; y: number; w: number; h: number }
  ): number {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.w, b2.x + b2.w);
    const y2 = Math.min(b1.y + b1.h, b2.y + b2.h);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = b1.w * b1.h;
    const area2 = b2.w * b2.h;
    const union = area1 + area2 - intersection;

    return union <= 0 ? 0 : intersection / union;
  }

  public async detect(
    video: HTMLVideoElement,
    confThreshold: number = 0.40
  ): Promise<YoloDetection[]> {
    if (!this.session || video.readyState < 2) return [];

    const tensor = this.preprocess(video);
    if (!tensor) return [];

    try {
      const feeds: Record<string, ort.Tensor> = {};
      const inputName = this.session.inputNames[0] || 'images';
      feeds[inputName] = tensor;

      const output = await this.session.run(feeds);
      const outputName = this.session.outputNames[0] || 'output0';
      const outputTensor = output[outputName];

      const srcWidth = video.videoWidth || 640;
      const srcHeight = video.videoHeight || 480;

      return this.postprocess(outputTensor, srcWidth, srcHeight, confThreshold);
    } catch (err) {
      console.warn('YOLO inference error:', err);
      return [];
    }
  }
}

export const yoloService = new YoloService();
