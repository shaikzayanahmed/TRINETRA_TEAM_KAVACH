"""
ANTIGRAVITY — Edge Engine: YOLO Object Detection
Uses Ultralytics YOLOv8 for real object detection.
"""
import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

logger = logging.getLogger("antigravity.detection")


@dataclass
class DetectionResult:
    """Single detection from YOLO."""
    class_name: str
    confidence: float
    bbox: List[int]  # [x1, y1, x2, y2]
    centroid: tuple  # (cx, cy)


class YOLODetector:
    """
    Ultralytics YOLOv8 detector.
    Supports CPU and CUDA inference.
    """

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.40,
        inference_backend: str = "auto",
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.inference_backend = inference_backend
        self.model = None
        self.device = "cpu"
        self._inference_times: list = []

    def load(self) -> None:
        """Load the YOLO model."""
        from ultralytics import YOLO

        self.model = YOLO(self.model_path)

        # Determine device
        if self.inference_backend == "auto":
            try:
                import torch
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                self.device = "cpu"
        elif self.inference_backend in ("cuda", "gpu"):
            self.device = "cuda"
        else:
            self.device = "cpu"

        logger.info(f"YOLO model loaded: {self.model_path} on {self.device}")

    def detect(self, frame: np.ndarray) -> List[DetectionResult]:
        """
        Run detection on a frame.
        Returns list of DetectionResult.
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        start = time.time()
        results = self.model(
            frame,
            conf=self.confidence_threshold,
            device=self.device,
            verbose=False,
        )
        elapsed = time.time() - start
        self._inference_times.append(elapsed)

        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for i in range(len(boxes)):
                bbox = boxes.xyxy[i].cpu().numpy().astype(int).tolist()
                confidence = float(boxes.conf[i].cpu().numpy())
                class_id = int(boxes.cls[i].cpu().numpy())
                class_name = result.names.get(class_id, "unknown")

                cx = (bbox[0] + bbox[2]) // 2
                cy = (bbox[1] + bbox[3]) // 2

                detections.append(DetectionResult(
                    class_name=class_name,
                    confidence=confidence,
                    bbox=bbox,
                    centroid=(cx, cy),
                ))

        return detections

    @property
    def avg_inference_ms(self) -> float:
        """Average inference time in milliseconds."""
        if not self._inference_times:
            return 0.0
        recent = self._inference_times[-100:]  # Last 100 frames
        return (sum(recent) / len(recent)) * 1000

    @property
    def inference_fps(self) -> float:
        """Current inference FPS."""
        avg = self.avg_inference_ms
        return 1000.0 / avg if avg > 0 else 0.0
