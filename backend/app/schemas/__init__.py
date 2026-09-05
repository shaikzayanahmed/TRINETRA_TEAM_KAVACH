from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from app.schemas.common import (
    DetectionResponse,
    TrackResponse,
    AlertCreate,
    AlertResponse,
    AlertVerifyResponse,
    EvidenceResponse,
    HealthResponse,
    SystemStatusResponse,
    SystemMetricsResponse,
    PaginatedResponse,
)

__all__ = [
    "UserRegister", "UserLogin", "TokenResponse", "UserResponse",
    "CameraCreate", "CameraUpdate", "CameraResponse",
    "ZoneCreate", "ZoneUpdate", "ZoneResponse",
    "DetectionResponse", "TrackResponse",
    "AlertCreate", "AlertResponse", "AlertVerifyResponse",
    "EvidenceResponse",
    "HealthResponse", "SystemStatusResponse", "SystemMetricsResponse",
    "PaginatedResponse",
]
