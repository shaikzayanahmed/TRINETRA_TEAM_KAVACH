"""
ANTIGRAVITY — Edge Engine: Spatial Analysis
Tripwire crossing, zone entry/exit, geofencing using Shapely.
"""
import logging
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from shapely.geometry import Point, LineString, Polygon

logger = logging.getLogger("antigravity.spatial")


@dataclass
class ZoneDefinition:
    """A zone (tripwire or polygon area) for spatial analysis."""
    zone_id: str
    zone_type: str  # "TRIPWIRE", "RESTRICTED_AREA", "SAFE_AREA"
    name: str
    geometry: object  # Shapely geometry (LineString or Polygon)
    enabled: bool = True


@dataclass
class SpatialEvent:
    """Generated when a tracked object triggers a spatial rule."""
    event_type: str  # TRIPWIRE_BREACH, ZONE_ENTRY, ZONE_EXIT
    zone_id: str
    zone_name: str
    track_id: int
    object_class: str
    confidence: float
    centroid: Tuple[int, int]
    timestamp: float


class SpatialAnalyzer:
    """
    Analyzes tracked object positions against defined zones/tripwires.
    Implements cooldown/deduplication to prevent alert floods.
    """

    def __init__(self, cooldown_seconds: int = 30):
        self.zones: Dict[str, ZoneDefinition] = {}
        self.cooldown_seconds = cooldown_seconds
        # Track which track_id crossed which zone, with timestamp
        self._crossing_history: Dict[str, float] = {}
        # Track previous positions for line-crossing detection
        self._prev_positions: Dict[int, Tuple[int, int]] = {}

    def add_zone(
        self,
        zone_id: str,
        zone_type: str,
        name: str,
        coordinates: List[Tuple[float, float]],
    ) -> None:
        """Add a zone definition."""
        if zone_type == "TRIPWIRE":
            geometry = LineString(coordinates)
        else:
            # Polygon — auto-close
            coords = list(coordinates)
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            geometry = Polygon(coords)

        self.zones[zone_id] = ZoneDefinition(
            zone_id=zone_id,
            zone_type=zone_type,
            name=name,
            geometry=geometry,
        )
        logger.info(f"Zone added: {name} [{zone_type}] ({len(coordinates)} points)")

    def remove_zone(self, zone_id: str) -> None:
        self.zones.pop(zone_id, None)

    def analyze(
        self,
        tracks: list,
    ) -> List[SpatialEvent]:
        """
        Analyze tracked objects against all zones.
        Returns list of spatial events (with dedup).
        """
        events = []
        now = time.time()

        for track in tracks:
            tid = track.track_id
            cx, cy = track.centroid
            current_pos = (cx, cy)
            prev_pos = self._prev_positions.get(tid)

            for zone in self.zones.values():
                if not zone.enabled:
                    continue

                event = None

                if zone.zone_type == "TRIPWIRE" and prev_pos is not None:
                    # Check line crossing
                    movement = LineString([prev_pos, current_pos])
                    if movement.intersects(zone.geometry):
                        event = SpatialEvent(
                            event_type="TRIPWIRE_BREACH",
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            object_class=track.object_class,
                            confidence=track.confidence,
                            centroid=current_pos,
                            timestamp=now,
                        )

                elif zone.zone_type in ("RESTRICTED_AREA", "SAFE_AREA"):
                    point = Point(cx, cy)
                    is_inside = zone.geometry.contains(point)
                    was_inside = False
                    if prev_pos:
                        was_inside = zone.geometry.contains(Point(prev_pos[0], prev_pos[1]))

                    if is_inside and not was_inside:
                        event = SpatialEvent(
                            event_type="ZONE_ENTRY",
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            object_class=track.object_class,
                            confidence=track.confidence,
                            centroid=current_pos,
                            timestamp=now,
                        )
                    elif not is_inside and was_inside:
                        event = SpatialEvent(
                            event_type="ZONE_EXIT",
                            zone_id=zone.zone_id,
                            zone_name=zone.name,
                            track_id=tid,
                            object_class=track.object_class,
                            confidence=track.confidence,
                            centroid=current_pos,
                            timestamp=now,
                        )

                # Deduplication check
                if event:
                    dedup_key = f"{tid}:{zone.zone_id}:{event.event_type}"
                    last_time = self._crossing_history.get(dedup_key, 0)
                    if now - last_time > self.cooldown_seconds:
                        self._crossing_history[dedup_key] = now
                        events.append(event)
                        logger.info(
                            f"Spatial event: {event.event_type} | "
                            f"Track #{tid} ({track.object_class}) | "
                            f"Zone: {zone.name}"
                        )

            # Store current position for next frame
            self._prev_positions[tid] = current_pos

        return events
