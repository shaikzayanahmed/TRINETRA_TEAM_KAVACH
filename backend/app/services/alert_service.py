"""
ANTIGRAVITY — Alert Service
Alert creation, deduplication, and processing.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.evidence import Evidence
from app.core.redis_client import redis_check_alert_dedup, redis_set_json
from app.core.config import settings

logger = logging.getLogger("antigravity.alert")


async def create_alert_from_event(
    db: AsyncSession,
    event: dict,
) -> Optional[Alert]:
    """
    Create an alert from an edge engine event.
    Includes deduplication via Redis cooldown.
    """
    camera_id = event.get("camera_id")
    alert_type = event.get("event_type", event.get("alert_type", "TRIPWIRE_BREACH"))
    track_id_str = event.get("track_id")

    # ── Deduplication ──
    dedup_key = f"{camera_id}:{alert_type}:{track_id_str or 'none'}"
    is_new = await redis_check_alert_dedup(dedup_key, settings.ALERT_COOLDOWN)
    if not is_new:
        logger.debug(f"Alert deduplicated: {dedup_key}")
        return None

    # ── Parse severity ──
    severity_map = {
        "TRIPWIRE_BREACH": AlertSeverity.CRITICAL,
        "ZONE_ENTRY": AlertSeverity.HIGH,
        "ZONE_EXIT": AlertSeverity.MEDIUM,
        "SUSPICIOUS_MOVEMENT": AlertSeverity.HIGH,
        "CAMERA_OFFLINE": AlertSeverity.MEDIUM,
        "PERSON_DETECTED": AlertSeverity.LOW,
        "VEHICLE_DETECTED": AlertSeverity.LOW,
        "MULTIPLE_TARGETS": AlertSeverity.MEDIUM,
    }

    alert = Alert(
        id=uuid.uuid4(),
        camera_id=uuid.UUID(camera_id) if camera_id else uuid.uuid4(),
        track_id=uuid.UUID(track_id_str) if track_id_str else None,
        alert_type=AlertType(alert_type) if alert_type in AlertType.__members__ else AlertType.TRIPWIRE_BREACH,
        severity=severity_map.get(alert_type, AlertSeverity.MEDIUM),
        confidence=event.get("confidence"),
        timestamp=datetime.fromisoformat(event.get("timestamp", datetime.now(timezone.utc).isoformat())),
        metadata_json=event.get("metadata"),
        evidence_path=event.get("evidence_path"),
        hash=event.get("evidence_hash"),
        hash_algorithm="SHA-256",
        status=AlertStatus.NEW,
    )

    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Update Redis real-time state
    await redis_set_json(f"alert:latest:{camera_id}", {
        "alert_id": str(alert.id),
        "alert_type": alert_type,
        "timestamp": alert.timestamp.isoformat(),
    }, ttl=300)

    logger.info(f"Alert created: {alert.id} [{alert_type}] camera={camera_id}")
    return alert


async def acknowledge_alert(
    db: AsyncSession,
    alert_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Optional[Alert]:
    """Acknowledge an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        return None

    alert.status = AlertStatus.ACKNOWLEDGED
    await db.commit()
    await db.refresh(alert)
    logger.info(f"Alert acknowledged: {alert_id} by user {user_id}")
    return alert


async def get_alert_count(db: AsyncSession) -> int:
    """Get total alert count."""
    result = await db.execute(select(func.count(Alert.id)))
    return result.scalar() or 0
