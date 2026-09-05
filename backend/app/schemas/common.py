"""
ANTIGRAVITY — Pydantic Schemas: Alert, Detection, Track, Evidence, System
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ── Detection ──

class DetectionResponse(BaseModel):
    id: str
    camera_id: str
    track_id: Optional[str] = None
    object_class: str
    confidence: float
    bounding_box: Any  # [x1, y1, x2, y2]
    timestamp: str
    created_at: str

    model_config = {"from_attributes": True}


# ── Track ──

class TrackResponse(BaseModel):
    id: str
    camera_id: str
    track_identifier: int
    object_class: str
    first_seen: str
    last_seen: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


# ── Alert ──

class AlertCreate(BaseModel):
    """Used internally by the MQTT worker to create alerts from edge events."""
    camera_id: str
    track_id: Optional[str] = None
    alert_type: str
    severity: str
    confidence: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: str
    metadata: Optional[dict] = None
    evidence_path: Optional[str] = None
    hash: Optional[str] = None


class AlertResponse(BaseModel):
    id: str
    camera_id: str
    track_id: Optional[str] = None
    alert_type: str
    severity: str
    confidence: Optional[float] = None
    timestamp: str
    metadata_json: Optional[Any] = None
    evidence_path: Optional[str] = None
    hash: Optional[str] = None
    hash_algorithm: str
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class AlertVerifyResponse(BaseModel):
    alert_id: str
    valid: bool
    algorithm: str
    stored_hash: Optional[str] = None
    computed_hash: Optional[str] = None


# ── Evidence ──

class EvidenceResponse(BaseModel):
    id: str
    alert_id: str
    object_path: str
    media_type: str
    sha256: str
    created_at: str
    retention_until: Optional[str] = None
    presigned_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ── System ──

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "antigravity-backend"
    version: str = "1.0.0"


class SystemStatusResponse(BaseModel):
    postgres: str
    redis: str
    minio: str
    mqtt: str
    edge_engine: str


class SystemMetricsResponse(BaseModel):
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    active_cameras: int = 0
    active_tracks: int = 0
    total_alerts: int = 0
    total_detections: int = 0
    inference_fps: Optional[float] = None
    raw_video_bytes: int = 0
    metadata_bytes: int = 0
    bandwidth_reduction_percent: Optional[float] = None


# ── Paginated Response ──

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
