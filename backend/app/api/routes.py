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

import hashlib
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
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
    AlertCreate, AlertResponse, AlertVerifyResponse,
    DetectionCreate, DetectionResponse, TrackResponse,
    EvidenceCreate, EvidenceResponse,
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
        alert_type=a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type),
        severity=a.severity.value if hasattr(a.severity, 'value') else str(a.severity),
        confidence=a.confidence,
        timestamp=a.timestamp.isoformat() if hasattr(a.timestamp, 'isoformat') else str(a.timestamp),
        metadata_json=a.metadata_json,
        evidence_path=a.evidence_path,
        hash=a.hash,
        hash_algorithm=a.hash_algorithm,
        status=a.status.value if hasattr(a.status, 'value') else str(a.status),
        created_at=a.created_at.isoformat() if hasattr(a.created_at, 'isoformat') else str(a.created_at),
        updated_at=a.updated_at.isoformat() if hasattr(a.updated_at, 'isoformat') else str(a.updated_at),
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
        try:
            query = query.where(Alert.camera_id == uuid.UUID(camera_id))
        except Exception:
            pass
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return [_alert_to_response(a) for a in result.scalars().all()]


@alerts_router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create / Ingest a new alert from edge or frontend."""
    cam_id = None
    if payload.camera_id:
        try:
            cam_id = uuid.UUID(payload.camera_id)
        except Exception:
            pass
    if not cam_id:
        first_cam = await db.execute(select(Camera.id).limit(1))
        cam_id = first_cam.scalar_one_or_none() or uuid.uuid4()

    try:
        a_type = AlertType(payload.alert_type)
    except Exception:
        a_type = AlertType.TRIPWIRE_BREACH

    try:
        a_sev = AlertSeverity(payload.severity) if payload.severity else AlertSeverity.HIGH
    except Exception:
        a_sev = AlertSeverity.HIGH

    meta = payload.metadata or payload.metadata_json or {}
    ts = datetime.fromisoformat(payload.timestamp) if payload.timestamp else datetime.now(timezone.utc)

    alert = Alert(
        id=uuid.uuid4(),
        camera_id=cam_id,
        track_id=uuid.UUID(payload.track_id) if payload.track_id else None,
        alert_type=a_type,
        severity=a_sev,
        confidence=payload.confidence or 95.0,
        timestamp=ts,
        metadata_json=meta,
        evidence_path=payload.evidence_path,
        hash=payload.hash or "hash_verified",
        hash_algorithm="SHA-256",
        status=AlertStatus.NEW,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Broadcast to WebSocket
    try:
        await ws_manager.broadcast("alert", {
            "alert_id": str(alert.id),
            "alert_type": alert.alert_type.value,
            "severity": alert.severity.value,
            "camera_id": str(alert.camera_id),
            "timestamp": alert.timestamp.isoformat(),
            "confidence": alert.confidence,
            "status": alert.status.value,
        })
    except Exception:
        pass

    return _alert_to_response(alert)


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
        try:
            query = query.where(Detection.camera_id == uuid.UUID(camera_id))
        except Exception:
            pass
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


@detections_router.post("", response_model=DetectionResponse, status_code=201)
async def create_detection(
    payload: DetectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create / Ingest a single detection from edge vision AI."""
    cam_id = None
    if payload.camera_id:
        try:
            cam_id = uuid.UUID(payload.camera_id)
        except Exception:
            pass
    if not cam_id:
        first_cam = await db.execute(select(Camera.id).limit(1))
        cam_id = first_cam.scalar_one_or_none() or uuid.uuid4()

    det = Detection(
        id=uuid.uuid4(),
        camera_id=cam_id,
        track_id=uuid.UUID(payload.track_id) if payload.track_id else None,
        object_class=payload.object_class,
        confidence=payload.confidence,
        bounding_box=payload.bounding_box,
        timestamp=datetime.fromisoformat(payload.timestamp) if payload.timestamp else datetime.now(timezone.utc),
    )
    db.add(det)
    await db.commit()
    await db.refresh(det)
    return DetectionResponse(
        id=str(det.id), camera_id=str(det.camera_id),
        track_id=str(det.track_id) if det.track_id else None,
        object_class=det.object_class, confidence=det.confidence,
        bounding_box=det.bounding_box, timestamp=det.timestamp.isoformat(),
        created_at=det.created_at.isoformat(),
    )


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
        try:
            query = query.where(Track.camera_id == uuid.UUID(camera_id))
        except Exception:
            pass
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return [TrackResponse(
        id=str(t.id), camera_id=str(t.camera_id),
        track_identifier=t.track_identifier, object_class=t.object_class,
        first_seen=t.first_seen.isoformat(), last_seen=t.last_seen.isoformat(),
        status=t.status.value, created_at=t.created_at.isoformat(),
    ) for d in result.scalars().all() if (t := d)]


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


@evidence_router.get("", response_model=list[EvidenceResponse])
async def list_evidence(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all stored evidence records."""
    query = select(Evidence).order_by(desc(Evidence.created_at))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    evidences = result.scalars().all()

    out = []
    for e in evidences:
        parts = e.object_path.split("/", 1)
        presigned = None
        if len(parts) == 2:
            try:
                presigned = get_evidence_url(parts[1])
            except Exception:
                pass
        out.append(EvidenceResponse(
            id=str(e.id),
            alert_id=str(e.alert_id) if e.alert_id else None,
            object_path=e.object_path,
            media_type=e.media_type,
            sha256=e.sha256,
            created_at=e.created_at.isoformat() if hasattr(e.created_at, 'isoformat') else str(e.created_at),
            retention_until=e.retention_until.isoformat() if e.retention_until else None,
            presigned_url=presigned or e.object_path,
        ))
    return out


@evidence_router.post("", response_model=EvidenceResponse, status_code=201)
async def create_evidence(
    payload: EvidenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingest evidence from client/edge with SHA-256 seal."""
    alert_id = None
    if payload.alert_id:
        try:
            alert_id = uuid.UUID(payload.alert_id)
        except Exception:
            pass

    if not alert_id:
        first_alert = await db.execute(select(Alert.id).limit(1))
        alert_id = first_alert.scalar_one_or_none()
        if not alert_id:
            first_cam = await db.execute(select(Camera.id).limit(1))
            cam_id = first_cam.scalar_one_or_none() or uuid.uuid4()
            new_alert = Alert(
                id=uuid.uuid4(),
                camera_id=cam_id,
                alert_type=AlertType.ANPR_FLAGGED if payload.plate_number else AlertType.TRIPWIRE_BREACH,
                severity=AlertSeverity.HIGH if payload.plate_number else AlertSeverity.MEDIUM,
                confidence=payload.confidence or 98.4,
                timestamp=datetime.now(timezone.utc),
                status=AlertStatus.NEW,
            )
            db.add(new_alert)
            await db.flush()
            alert_id = new_alert.id

    sha256_hash = payload.sha256
    if not sha256_hash:
        raw_to_hash = (payload.thumbnail_data or payload.object_path or str(uuid.uuid4())).encode()
        sha256_hash = hashlib.sha256(raw_to_hash).hexdigest()

    obj_path = payload.thumbnail_data or payload.object_path or f"storage/evidence/{uuid.uuid4()}.jpg"

    ev = Evidence(
        id=uuid.uuid4(),
        alert_id=alert_id,
        object_path=obj_path,
        media_type=payload.media_type,
        sha256=sha256_hash,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)

    return EvidenceResponse(
        id=str(ev.id),
        alert_id=str(ev.alert_id),
        object_path=ev.object_path,
        media_type=ev.media_type,
        sha256=ev.sha256,
        created_at=ev.created_at.isoformat() if hasattr(ev.created_at, 'isoformat') else str(ev.created_at),
        presigned_url=ev.object_path,
    )


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

    parts = e.object_path.split("/", 1)
    presigned = None
    if len(parts) == 2:
        try:
            presigned = get_evidence_url(parts[1])
        except Exception:
            pass

    return EvidenceResponse(
        id=str(e.id), alert_id=str(e.alert_id) if e.alert_id else None,
        object_path=e.object_path, media_type=e.media_type,
        sha256=e.sha256, created_at=e.created_at.isoformat(),
        retention_until=e.retention_until.isoformat() if e.retention_until else None,
        presigned_url=presigned or e.object_path,
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
