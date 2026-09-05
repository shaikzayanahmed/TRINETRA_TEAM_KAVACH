"""
ANTIGRAVITY — MQTT Worker
Processes incoming events from edge engine, persists to DB, broadcasts via WebSocket.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone

from app.db.session import async_session_maker
from app.services.alert_service import create_alert_from_event
from app.services.websocket_manager import ws_manager
from app.core.redis_client import redis_set_json, redis_set_active_track

logger = logging.getLogger("antigravity.mqtt_worker")


async def process_alert_event(payload: dict) -> None:
    """Process an alert event received from MQTT."""
    try:
        async with async_session_maker() as db:
            alert = await create_alert_from_event(db, payload)
            if alert:
                # Broadcast to WebSocket clients
                await ws_manager.broadcast("alert", {
                    "alert_id": str(alert.id),
                    "alert_type": alert.alert_type.value,
                    "severity": alert.severity.value,
                    "camera_id": str(alert.camera_id),
                    "timestamp": alert.timestamp.isoformat(),
                    "confidence": alert.confidence,
                    "status": alert.status.value,
                })
                logger.info(f"Alert broadcast via WebSocket: {alert.id}")
    except Exception as e:
        logger.error(f"Error processing alert event: {e}", exc_info=True)


async def process_detection_event(payload: dict) -> None:
    """Process detection updates from edge engine."""
    try:
        camera_id = payload.get("camera_id", "unknown")
        detections = payload.get("detections", [])

        # Broadcast to WebSocket clients for real-time display
        await ws_manager.broadcast("detection_update", {
            "camera_id": camera_id,
            "detections": detections,
            "timestamp": payload.get("timestamp", datetime.now(timezone.utc).isoformat()),
        })

        # Update Redis with active tracks
        for det in detections:
            track_id = det.get("track_id")
            if track_id is not None:
                await redis_set_active_track(camera_id, track_id, {
                    "object_class": det.get("object_class", "unknown"),
                    "confidence": det.get("confidence", 0),
                    "bbox": det.get("bbox"),
                    "timestamp": payload.get("timestamp"),
                })
    except Exception as e:
        logger.error(f"Error processing detection event: {e}", exc_info=True)


async def process_camera_event(payload: dict) -> None:
    """Process camera status updates."""
    try:
        await ws_manager.broadcast("camera_status", payload)
    except Exception as e:
        logger.error(f"Error processing camera event: {e}", exc_info=True)


async def process_system_event(payload: dict) -> None:
    """Process system status/metrics updates."""
    try:
        await redis_set_json("system:metrics", payload, ttl=30)
        await ws_manager.broadcast("system_status", payload)
    except Exception as e:
        logger.error(f"Error processing system event: {e}", exc_info=True)
