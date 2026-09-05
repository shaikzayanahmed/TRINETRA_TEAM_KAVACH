"""
ANTIGRAVITY — Edge Engine: Main Processing Loop
Complete CV pipeline: Video → Detect → Track → Spatial → Event → Evidence → MQTT

Usage:
    python -m main --mode simulation
    python -m main --mode live --source webcam --device 0
    python -m main --mode live --source file --path video.mp4
    python -m main --mode live --source rtsp --url rtsp://...
"""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

import cv2
import numpy as np
import paho.mqtt.client as mqtt

from sensors.sources import create_source, SensorFrame
from detection.yolo_detector import YOLODetector
from tracking.kalman_tracker import KalmanTracker
from spatial.analyzer import SpatialAnalyzer
from privacy.anonymizer import FaceAnonymizer
from evidence.capture import capture_evidence_frame, generate_evidence_filename, upload_to_minio
from events.engine import EventEngine
from filters.noise_filter import NoiseFilter

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("antigravity.edge")


def create_mqtt_client() -> mqtt.Client:
    """Create and connect MQTT client."""
    broker = os.getenv("MQTT_BROKER", "localhost")
    port = int(os.getenv("MQTT_PORT", "1883"))

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="antigravity-edge-engine",
    )

    try:
        client.connect(broker, port, keepalive=60)
        client.loop_start()
        logger.info(f"MQTT connected: {broker}:{port}")
    except Exception as e:
        logger.warning(f"MQTT connection failed: {e} (will retry)")

    return client


def publish_event(mqtt_client: mqtt.Client, topic: str, payload: dict):
    """Publish JSON event to MQTT."""
    try:
        message = json.dumps(payload, default=str)
        mqtt_client.publish(topic, message, qos=1)
    except Exception as e:
        logger.error(f"MQTT publish error: {e}")


def draw_overlays(
    frame: np.ndarray,
    tracks: list,
    zones: dict,
    fps: float = 0.0,
) -> np.ndarray:
    """Draw bounding boxes, track IDs, tripwires, and zones on frame."""
    overlay = frame.copy()

    # Draw zones
    for zone in zones.values():
        if zone.zone_type == "TRIPWIRE":
            coords = list(zone.geometry.coords)
            for i in range(len(coords) - 1):
                pt1 = (int(coords[i][0]), int(coords[i][1]))
                pt2 = (int(coords[i+1][0]), int(coords[i+1][1]))
                cv2.line(overlay, pt1, pt2, (0, 0, 255), 2)
                cv2.putText(overlay, zone.name, pt1, cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        else:
            coords = list(zone.geometry.exterior.coords)
            pts = np.array([(int(c[0]), int(c[1])) for c in coords], np.int32)
            cv2.polylines(overlay, [pts], True, (0, 255, 255), 2)
            centroid = zone.geometry.centroid
            cv2.putText(overlay, zone.name, (int(centroid.x), int(centroid.y)),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

    # Draw tracked objects
    for track in tracks:
        x1, y1, x2, y2 = track.bbox
        color = (0, 255, 0) if track.object_class == "person" else (255, 165, 0)

        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
        label = f"{track.object_class.upper()} #{track.track_id} ({track.confidence:.0%})"
        cv2.putText(overlay, label, (x1, y1 - 8),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Draw FPS
    cv2.putText(overlay, f"FPS: {fps:.1f}", (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    return overlay


def setup_simulation_zones(spatial: SpatialAnalyzer, frame_width: int, frame_height: int):
    """Set up demo tripwire and restricted zone for simulation mode."""
    # Horizontal tripwire at 60% of frame height
    y_trip = int(frame_height * 0.6)
    spatial.add_zone(
        zone_id="sim-tripwire-1",
        zone_type="TRIPWIRE",
        name="Entrance Tripwire",
        coordinates=[(0, y_trip), (frame_width, y_trip)],
    )

    # Restricted area — bottom-right quadrant
    x_mid = frame_width // 2
    spatial.add_zone(
        zone_id="sim-restricted-1",
        zone_type="RESTRICTED_AREA",
        name="Restricted Zone Alpha",
        coordinates=[
            (x_mid, y_trip),
            (frame_width, y_trip),
            (frame_width, frame_height),
            (x_mid, frame_height),
        ],
    )


def run_engine(args):
    """Main processing loop."""
    logger.info("=" * 60)
    logger.info("  ANTIGRAVITY Edge Engine Starting...")
    logger.info(f"  Mode: {args.mode}")
    logger.info("=" * 60)

    # ── Initialize components ──
    camera_id = os.getenv("CAMERA_ID", "cam-01")

    # Video source
    if args.mode == "simulation":
        source_type = "FILE"
        source_url = os.getenv("VIDEO_SOURCE", "sample_data/videos/sample.mp4")
        if not os.path.exists(source_url):
            logger.warning(f"Sample video not found: {source_url}")
            logger.info("Falling back to webcam for simulation...")
            source_type = "WEBCAM"
            source_url = "0"
    else:
        source_type = args.source.upper()
        source_url = args.path or args.url or str(args.device)

    source = create_source(source_type, source_url, camera_id)
    if not source.open():
        logger.error("Failed to open video source. Exiting.")
        sys.exit(1)

    # YOLO detector
    model_path = os.getenv("YOLO_MODEL", "yolov8n.pt")
    confidence = float(os.getenv("DETECTION_CONFIDENCE", "0.40"))
    backend = os.getenv("INFERENCE_BACKEND", "auto")

    detector = YOLODetector(model_path, confidence, backend)
    detector.load()

    # Tracker
    tracker = KalmanTracker(max_misses=15, iou_threshold=0.3)

    # Spatial analyzer
    cooldown = int(os.getenv("ALERT_COOLDOWN", "30"))
    spatial = SpatialAnalyzer(cooldown_seconds=cooldown)

    # Privacy
    blur_enabled = os.getenv("PRIVACY_BLUR_ENABLED", "true").lower() == "true"
    anonymizer = FaceAnonymizer(enabled=blur_enabled)
    anonymizer.load()

    # Noise filter
    noise_filter = NoiseFilter(
        min_track_duration=float(os.getenv("MIN_TRACK_DURATION", "5")),
        min_confidence=float(os.getenv("MIN_CONFIDENCE", "0.4")),
        movement_threshold=float(os.getenv("MOVEMENT_THRESHOLD", "10")),
        position_smoothing=float(os.getenv("POSITION_SMOOTHING", "0.3")),
    )

    # Event engine
    event_engine = EventEngine(camera_id)

    # MQTT
    mqtt_client = create_mqtt_client()

    # Publish camera online status
    publish_event(mqtt_client, "antigravity/cameras", {
        "camera_id": camera_id,
        "status": "ONLINE",
        "source_type": source_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Set up simulation zones
    frame = source.read()
    if frame:
        if args.mode == "simulation":
            setup_simulation_zones(spatial, frame.width, frame.height)
        # Put frame back (re-read will happen in loop)
    source.release()
    source.open()

    logger.info("[✓] All components initialized")
    logger.info("    Processing frames...")

    # ── Frame processing loop ──
    frame_count = 0
    total_raw_bytes = 0
    total_meta_bytes = 0
    fps_start = time.time()
    fps = 0.0

    try:
        while True:
            sensor_frame = source.read()
            if sensor_frame is None:
                time.sleep(0.01)
                continue

            frame = sensor_frame.frame
            frame_count += 1
            total_raw_bytes += frame.nbytes

            # FPS calculation
            if frame_count % 30 == 0:
                elapsed = time.time() - fps_start
                fps = 30.0 / elapsed if elapsed > 0 else 0
                fps_start = time.time()

            # ── Step 1: Detect ──
            detections = detector.detect(frame)

            # ── Step 2: Filter noisy detections ──
            detections = noise_filter.filter_detections(detections)

            # ── Step 3: Track ──
            tracks = tracker.update(detections)

            # ── Step 4: Filter noisy tracks ──
            reliable_tracks = noise_filter.filter_tracks(tracks)

            # ── Step 5: Spatial analysis ──
            spatial_events = spatial.analyze(reliable_tracks)

            # ── Step 6: Process events ──
            for se in spatial_events:
                # Capture evidence
                evidence_data, sha256 = capture_evidence_frame(frame, anonymizer)
                filename = generate_evidence_filename(camera_id, se.event_type)
                evidence_path = upload_to_minio(filename, evidence_data)

                # Create structured event
                event = event_engine.from_spatial_event(
                    se,
                    evidence_path=evidence_path,
                    evidence_hash=sha256,
                )

                # Publish to MQTT
                event_dict = event.to_dict()
                publish_event(mqtt_client, "antigravity/alerts", event_dict)

                meta_bytes = len(json.dumps(event_dict))
                total_meta_bytes += meta_bytes

                logger.info(
                    f"🚨 ALERT: {se.event_type} | Track #{se.track_id} | "
                    f"Evidence: {sha256[:16]}... | Metadata: {meta_bytes} bytes"
                )

            # ── Step 7: Periodic detection updates via MQTT ──
            if frame_count % 10 == 0 and tracks:
                detection_update = {
                    "camera_id": camera_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "detections": [
                        {
                            "track_id": t.track_id,
                            "object_class": t.object_class,
                            "confidence": t.confidence,
                            "bbox": t.bbox,
                            "centroid": t.centroid,
                            "velocity": t.velocity,
                        }
                        for t in tracks
                    ],
                    "active_tracks": tracker.active_track_count,
                    "inference_fps": detector.inference_fps,
                }
                publish_event(mqtt_client, "antigravity/detections", detection_update)

            # ── Step 8: System metrics (every 100 frames) ──
            if frame_count % 100 == 0:
                reduction = ((total_raw_bytes - total_meta_bytes) / total_raw_bytes * 100) if total_raw_bytes > 0 else 0
                publish_event(mqtt_client, "antigravity/system", {
                    "camera_id": camera_id,
                    "frame_count": frame_count,
                    "inference_fps": detector.inference_fps,
                    "avg_inference_ms": detector.avg_inference_ms,
                    "active_tracks": tracker.active_track_count,
                    "total_events": event_engine.total_events,
                    "raw_video_bytes": total_raw_bytes,
                    "metadata_bytes": total_meta_bytes,
                    "bandwidth_reduction_percent": round(reduction, 2),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # Cleanup noise filter state
            active_ids = {t.track_id for t in tracks}
            noise_filter.cleanup(active_ids)

            # Small sleep to control processing rate
            time.sleep(0.01)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        # Cleanup
        publish_event(mqtt_client, "antigravity/cameras", {
            "camera_id": camera_id,
            "status": "OFFLINE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        source.release()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        logger.info("Edge engine stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ANTIGRAVITY Edge Engine")
    parser.add_argument("--mode", choices=["simulation", "live"], default="simulation",
                       help="Run mode: simulation (demo video) or live (real source)")
    parser.add_argument("--source", choices=["webcam", "file", "rtsp", "thermal"],
                       default="webcam", help="Video source type (live mode)")
    parser.add_argument("--device", type=int, default=0, help="Webcam device ID")
    parser.add_argument("--path", type=str, default=None, help="Video file path")
    parser.add_argument("--url", type=str, default=None, help="RTSP stream URL")

    args = parser.parse_args()
    run_engine(args)
