"""
ANTIGRAVITY — Edge Engine: Kalman Filter Multi-Object Tracker
Maintains persistent track IDs across frames using IoU-based association.
"""
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("antigravity.tracking")


@dataclass
class TrackedObject:
    """A tracked object with Kalman-filtered state."""
    track_id: int
    object_class: str
    bbox: List[int]  # [x1, y1, x2, y2]
    centroid: Tuple[int, int]
    confidence: float
    velocity: Tuple[float, float] = (0.0, 0.0)
    first_seen: float = 0.0
    last_seen: float = 0.0
    age: int = 0  # frames since creation
    hits: int = 0  # successful matches
    misses: int = 0  # consecutive missed frames
    state: str = "active"  # active, lost, finished

    # Kalman state: [cx, cy, vx, vy]
    kalman_state: Optional[np.ndarray] = None
    kalman_covariance: Optional[np.ndarray] = None


def _iou(box1: List[int], box2: List[int]) -> float:
    """Compute IoU between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


class KalmanTracker:
    """
    Multi-object tracker using Kalman filter and IoU association.
    Maintains persistent track IDs across frames.
    """

    def __init__(
        self,
        max_misses: int = 15,
        iou_threshold: float = 0.3,
        min_hits: int = 3,
    ):
        self.max_misses = max_misses
        self.iou_threshold = iou_threshold
        self.min_hits = min_hits
        self._next_id = 1
        self._tracks: Dict[int, TrackedObject] = {}

        # Kalman matrices
        self._dt = 1.0
        self._F = np.array([  # State transition
            [1, 0, self._dt, 0],
            [0, 1, 0, self._dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ], dtype=np.float64)
        self._H = np.array([  # Observation
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ], dtype=np.float64)
        self._Q = np.eye(4, dtype=np.float64) * 0.1  # Process noise
        self._R = np.eye(2, dtype=np.float64) * 1.0  # Measurement noise

    def _predict_track(self, track: TrackedObject) -> np.ndarray:
        """Kalman predict step."""
        if track.kalman_state is None:
            cx, cy = track.centroid
            track.kalman_state = np.array([cx, cy, 0.0, 0.0], dtype=np.float64)
            track.kalman_covariance = np.eye(4, dtype=np.float64) * 10.0

        # Predict
        track.kalman_state = self._F @ track.kalman_state
        track.kalman_covariance = self._F @ track.kalman_covariance @ self._F.T + self._Q

        return track.kalman_state[:2]  # predicted cx, cy

    def _update_track(self, track: TrackedObject, measurement: np.ndarray):
        """Kalman update step."""
        if track.kalman_state is None or track.kalman_covariance is None:
            return

        S = self._H @ track.kalman_covariance @ self._H.T + self._R
        K = track.kalman_covariance @ self._H.T @ np.linalg.inv(S)

        innovation = measurement - self._H @ track.kalman_state
        track.kalman_state = track.kalman_state + K @ innovation
        track.kalman_covariance = (np.eye(4) - K @ self._H) @ track.kalman_covariance

        # Extract velocity
        track.velocity = (float(track.kalman_state[2]), float(track.kalman_state[3]))

    def update(self, detections: list) -> List[TrackedObject]:
        """
        Update tracks with new detections.
        Returns list of currently active TrackedObject instances.
        """
        now = time.time()

        # Predict all existing tracks
        for track in self._tracks.values():
            if track.state == "active":
                self._predict_track(track)

        # Build cost matrix (IoU-based)
        active_tracks = {tid: t for tid, t in self._tracks.items() if t.state == "active"}
        track_ids = list(active_tracks.keys())
        det_indices = list(range(len(detections)))

        matched_tracks = set()
        matched_dets = set()

        if track_ids and det_indices:
            cost_matrix = np.zeros((len(track_ids), len(det_indices)))
            for i, tid in enumerate(track_ids):
                for j, det in enumerate(detections):
                    cost_matrix[i, j] = _iou(active_tracks[tid].bbox, det.bbox)

            # Greedy matching (highest IoU first)
            while True:
                if cost_matrix.size == 0:
                    break
                max_idx = np.unravel_index(np.argmax(cost_matrix), cost_matrix.shape)
                max_iou = cost_matrix[max_idx]
                if max_iou < self.iou_threshold:
                    break

                ti, di = max_idx
                tid = track_ids[ti]
                det = detections[di]

                # Update matched track
                track = active_tracks[tid]
                track.bbox = det.bbox
                track.centroid = det.centroid
                track.confidence = det.confidence
                track.object_class = det.class_name
                track.last_seen = now
                track.hits += 1
                track.misses = 0
                track.age += 1

                measurement = np.array([det.centroid[0], det.centroid[1]], dtype=np.float64)
                self._update_track(track, measurement)

                matched_tracks.add(tid)
                matched_dets.add(di)

                # Zero out row and column
                cost_matrix[ti, :] = 0
                cost_matrix[:, di] = 0

        # Handle unmatched tracks (increment misses)
        for tid in track_ids:
            if tid not in matched_tracks:
                track = active_tracks[tid]
                track.misses += 1
                track.age += 1
                if track.misses > self.max_misses:
                    track.state = "lost"
                    logger.debug(f"Track #{tid} lost (missed {track.misses} frames)")

        # Handle unmatched detections (create new tracks)
        for di in det_indices:
            if di not in matched_dets:
                det = detections[di]
                track = TrackedObject(
                    track_id=self._next_id,
                    object_class=det.class_name,
                    bbox=det.bbox,
                    centroid=det.centroid,
                    confidence=det.confidence,
                    first_seen=now,
                    last_seen=now,
                    hits=1,
                )
                self._tracks[self._next_id] = track
                logger.debug(f"New track #{self._next_id}: {det.class_name} ({det.confidence:.2f})")
                self._next_id += 1

        # Return active tracks
        return [t for t in self._tracks.values() if t.state == "active"]

    @property
    def active_track_count(self) -> int:
        return sum(1 for t in self._tracks.values() if t.state == "active")

    def get_track(self, track_id: int) -> Optional[TrackedObject]:
        return self._tracks.get(track_id)

    def get_all_tracks(self) -> List[TrackedObject]:
        return list(self._tracks.values())
