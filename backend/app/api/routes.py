"""
ANTIGRAVITY — Alert, Detection, Track, Evidence, System API Routes
"""
import uuid
import logging
import psutil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.alert import Alert, AlertStatus
from app.models.detection import Detection
from app.models.track import Track
from app.models.evidence import Evidence
from app.models.camera import Camera
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.core.security import get_current_user, require_role
from app.core.redis_client import redis_get_system_metrics, get_redis
from app.services.evidence_service import verify_evidence, get_evidence_url
from app.services.alert_service import acknowledge_alert
from app.services.websocket_manager import ws_manager
from app.schemas.common import (
    AlertResponse, AlertVerifyResponse,
    DetectionResponse, TrackResponse, EvidenceResponse,
    HealthResponse, SystemStatusResponse, SystemMetricsResponse,
)

logger = logging.getLogger("antigravity.api")


# ═══════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════

alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


def _alert_to_response(a: Alert) -> AlertResponse:
    return AlertResponse(
        id=str(a.id),
        camera_id=str(a.camera_id),
        track_id=str(a.track_id) if a.track_id else None,
        alert_type=a.alert_type.value,
        severity=a.severity.value,
        confidence=a.confidence,
        timestamp=a.timestamp.isoformat(),
        metadata_json=a.metadata_json,
        evidence_path=a.evidence_path,
        hash=a.hash,
        hash_algorithm=a.hash_algorithm,
        status=a.status.value,
        created_at=a.created_at.isoformat(),
        updated_at=a.updated_at.isoformat(),
    )


@alerts_router.get("", response_model=list[AlertResponse])
async def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    camera_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts with filtering and pagination."""
    query = select(Alert).order_by(desc(Alert.timestamp))
    if status:
        query = query.where(Alert.status == AlertStatus(status))
    if camera_id:
        query = query.where(Alert.camera_id == uuid.UUID(camera_id))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return [_alert_to_response(a) for a in result.scalars().all()]


@alerts_router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific alert."""
    result = await db.execute(select(Alert).where(Alert.id == uuid.UUID(alert_id)))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_to_response(alert)


@alerts_router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Acknowledge an alert."""
    alert = await acknowledge_alert(db, uuid.UUID(alert_id), current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Create audit log
    audit = AuditLog(
        id=uuid.uuid4(),
        user_id=current_user.id,
        action="ACKNOWLEDGE_ALERT",
        entity_type="Alert",
        entity_id=alert.id,
        metadata_json={"alert_type": alert.alert_type.value},
    )
    db.add(audit)
    await db.commit()

    return _alert_to_response(alert)


@alerts_router.get("/{alert_id}/verify", response_model=AlertVerifyResponse)
async def verify_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify SHA-256 integrity of alert evidence."""
    result = await db.execute(select(Alert).where(Alert.id == uuid.UUID(alert_id)))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if not alert.evidence_path or not alert.hash:
        return AlertVerifyResponse(
            alert_id=str(alert.id),
            valid=False,
            algorithm=alert.hash_algorithm,
            stored_hash=alert.hash,
            computed_hash=None,
        )

    # Extract bucket and object name from path
    parts = alert.evidence_path.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid evidence path")

    is_valid, computed = verify_evidence(parts[1], alert.hash)
    return AlertVerifyResponse(
        alert_id=str(alert.id),
        valid=is_valid,
        algorithm=alert.hash_algorithm,
        stored_hash=alert.hash,
        computed_hash=computed,
    )


# ═══════════════════════════════════════════
# DETECTIONS
# ═══════════════════════════════════════════

detections_router = APIRouter(prefix="/api/detections", tags=["Detections"])


@detections_router.get("", response_model=list[DetectionResponse])
async def list_detections(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    camera_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List detections with pagination."""
    query = select(Detection).order_by(desc(Detection.timestamp))
    if camera_id:
        query = query.where(Detection.camera_id == uuid.UUID(camera_id))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return [DetectionResponse(
        id=str(d.id), camera_id=str(d.camera_id),
        track_id=str(d.track_id) if d.track_id else None,
        object_class=d.object_class, confidence=d.confidence,
        bounding_box=d.bounding_box, timestamp=d.timestamp.isoformat(),
        created_at=d.created_at.isoformat(),
    ) for d in result.scalars().all()]


@detections_router.get("/{detection_id}", response_model=DetectionResponse)
async def get_detection(
    detection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Detection).where(Detection.id == uuid.UUID(detection_id)))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Detection not found")
    return DetectionResponse(
        id=str(d.id), camera_id=str(d.camera_id),
        track_id=str(d.track_id) if d.track_id else None,
        object_class=d.object_class, confidence=d.confidence,
        bounding_box=d.bounding_box, timestamp=d.timestamp.isoformat(),
        created_at=d.created_at.isoformat(),
    )


# ═══════════════════════════════════════════
# TRACKS
# ═══════════════════════════════════════════

tracks_router = APIRouter(prefix="/api/tracks", tags=["Tracks"])


@tracks_router.get("", response_model=list[TrackResponse])
async def list_tracks(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    camera_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Track).order_by(desc(Track.last_seen))
    if camera_id:
        query = query.where(Track.camera_id == uuid.UUID(camera_id))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return [TrackResponse(
        id=str(t.id), camera_id=str(t.camera_id),
        track_identifier=t.track_identifier, object_class=t.object_class,
        first_seen=t.first_seen.isoformat(), last_seen=t.last_seen.isoformat(),
        status=t.status.value, created_at=t.created_at.isoformat(),
    ) for t in result.scalars().all()]


@tracks_router.get("/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Track).where(Track.id == uuid.UUID(track_id)))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Track not found")
    return TrackResponse(
        id=str(t.id), camera_id=str(t.camera_id),
        track_identifier=t.track_identifier, object_class=t.object_class,
        first_seen=t.first_seen.isoformat(), last_seen=t.last_seen.isoformat(),
        status=t.status.value, created_at=t.created_at.isoformat(),
    )


# ═══════════════════════════════════════════
# EVIDENCE
# ═══════════════════════════════════════════

evidence_router = APIRouter(prefix="/api/evidence", tags=["Evidence"])


@evidence_router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Evidence).where(Evidence.id == uuid.UUID(evidence_id)))
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Generate presigned URL
    parts = e.object_path.split("/", 1)
    presigned = None
    if len(parts) == 2:
        try:
            presigned = get_evidence_url(parts[1])
        except Exception:
            pass

    return EvidenceResponse(
        id=str(e.id), alert_id=str(e.alert_id),
        object_path=e.object_path, media_type=e.media_type,
        sha256=e.sha256, created_at=e.created_at.isoformat(),
        retention_until=e.retention_until.isoformat() if e.retention_until else None,
        presigned_url=presigned,
    )


# ═══════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════

system_router = APIRouter(prefix="/api", tags=["System"])


@system_router.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse()


@system_router.get("/system/status", response_model=SystemStatusResponse)
async def system_status(
    db: AsyncSession = Depends(get_db),
):
    """Check status of all services."""
    # Check PostgreSQL
    pg_status = "connected"
    try:
        await db.execute(select(func.now()))
    except Exception:
        pg_status = "disconnected"

    # Check Redis
    redis_status = "connected"
    try:
        r = await get_redis()
        await r.ping()
    except Exception:
        redis_status = "disconnected"

    # MinIO and MQTT — basic check
    minio_status = "connected"
    mqtt_status = "connected"
    edge_status = "unknown"

    try:
        from app.core.minio_client import get_minio
        client = get_minio()
        client.list_buckets()
    except Exception:
        minio_status = "disconnected"

    return SystemStatusResponse(
        postgres=pg_status,
        redis=redis_status,
        minio=minio_status,
        mqtt=mqtt_status,
        edge_engine=edge_status,
    )


@system_router.get("/system/metrics", response_model=SystemMetricsResponse)
async def system_metrics(
    db: AsyncSession = Depends(get_db),
):
    """System performance metrics."""
    # CPU/Memory
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory().percent

    # Database counts
    cameras_result = await db.execute(select(func.count(Camera.id)))
    alerts_result = await db.execute(select(func.count(Alert.id)))
    detections_result = await db.execute(select(func.count(Detection.id)))
    tracks_result = await db.execute(select(func.count(Track.id)))

    # Redis metrics
    cached_metrics = await redis_get_system_metrics()
    inference_fps = cached_metrics.get("inference_fps") if cached_metrics else None

    # Bandwidth reduction estimate
    raw_bytes = cached_metrics.get("raw_video_bytes", 0) if cached_metrics else 0
    meta_bytes = cached_metrics.get("metadata_bytes", 0) if cached_metrics else 0
    reduction = ((raw_bytes - meta_bytes) / raw_bytes * 100) if raw_bytes > 0 else 0

    return SystemMetricsResponse(
        cpu_percent=cpu,
        memory_percent=mem,
        active_cameras=cameras_result.scalar() or 0,
        active_tracks=tracks_result.scalar() or 0,
        total_alerts=alerts_result.scalar() or 0,
        total_detections=detections_result.scalar() or 0,
        inference_fps=inference_fps,
        raw_video_bytes=raw_bytes,
        metadata_bytes=meta_bytes,
        bandwidth_reduction_percent=round(reduction, 2),
    )


# ═══════════════════════════════════════════
# WEBSOCKET
# ═══════════════════════════════════════════

ws_router = APIRouter(tags=["WebSocket"])


@ws_router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """Real-time event stream for dashboard."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages
            data = await websocket.receive_text()
            # Echo acknowledgement
            await ws_manager.send_personal(websocket, "ack", {"message": "received"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
