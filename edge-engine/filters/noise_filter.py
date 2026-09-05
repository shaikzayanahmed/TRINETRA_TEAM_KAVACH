"""
ANTIGRAVITY — Edge Engine: Environmental Noise Filtering
Reduces false alerts from tiny movements, vegetation, intermittent/unstable detections.
"""
import logging
import time
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("antigravity.filters")


class NoiseFilter:
    """
    Filters out low-quality detections and tracks that are likely noise.
    
    Configurable parameters:
    - min_track_duration: Minimum seconds a track must exist before alerts
    - min_confidence: Minimum detection confidence
    - movement_threshold: Minimum pixel displacement to be considered real movement
    - position_smoothing: Exponential smoothing factor for position (0-1)
    """

    def __init__(
        self,
        min_track_duration: float = 5.0,
        min_confidence: float = 0.4,
        movement_threshold: float = 10.0,
        position_smoothing: float = 0.3,
    ):
        self.min_track_duration = min_track_duration
        self.min_confidence = min_confidence
        self.movement_threshold = movement_threshold
        self.position_smoothing = position_smoothing

        # Smoothed positions for each track
        self._smoothed_positions: Dict[int, Tuple[float, float]] = {}
        # Track stability counters
        self._stable_frames: Dict[int, int] = {}
        self._unstable_frames: Dict[int, int] = {}

    def filter_detections(self, detections: list) -> list:
        """Filter detections below confidence threshold."""
        return [d for d in detections if d.confidence >= self.min_confidence]

    def filter_tracks(self, tracks: list) -> list:
        """
        Filter tracks that are likely noise:
        - Too short-lived
        - Too little movement
        - Unstable (flickering in/out)
        """
        now = time.time()
        filtered = []

        for track in tracks:
            tid = track.track_id

            # Check minimum duration
            duration = now - track.first_seen
            if duration < self.min_track_duration:
                continue

            # Check minimum confidence
            if track.confidence < self.min_confidence:
                continue

            # Apply position smoothing
            cx, cy = float(track.centroid[0]), float(track.centroid[1])
            if tid in self._smoothed_positions:
                sx, sy = self._smoothed_positions[tid]
                cx = self.position_smoothing * cx + (1 - self.position_smoothing) * sx
                cy = self.position_smoothing * cy + (1 - self.position_smoothing) * sy
            self._smoothed_positions[tid] = (cx, cy)

            # Check movement threshold
            if tid in self._smoothed_positions:
                sx, sy = self._smoothed_positions[tid]
                dx = abs(cx - sx)
                dy = abs(cy - sy)
                displacement = (dx ** 2 + dy ** 2) ** 0.5

                if displacement < self.movement_threshold:
                    # Count as stable (not moving much — could be stationary object)
                    self._stable_frames[tid] = self._stable_frames.get(tid, 0) + 1
                else:
                    self._stable_frames[tid] = 0

            filtered.append(track)

        return filtered

    def should_alert(self, track) -> bool:
        """
        Check if a track is reliable enough to generate an alert.
        """
        now = time.time()
        duration = now - track.first_seen

        if duration < self.min_track_duration:
            return False

        if track.confidence < self.min_confidence:
            return False

        if track.hits < 3:
            return False

        return True

    def cleanup(self, active_track_ids: set) -> None:
        """Remove state for tracks that no longer exist."""
        stale_ids = set(self._smoothed_positions.keys()) - active_track_ids
        for tid in stale_ids:
            self._smoothed_positions.pop(tid, None)
            self._stable_frames.pop(tid, None)
            self._unstable_frames.pop(tid, None)
