from app.db.base import Base
from app.models.user import User
from app.models.camera import Camera
from app.models.zone import Zone
from app.models.track import Track
from app.models.detection import Detection
from app.models.alert import Alert
from app.models.evidence import Evidence
from app.models.audit_log import AuditLog

# Expose Base and all models for Alembic metadata
__all__ = [
    "Base",
    "User",
    "Camera",
    "Zone",
    "Track",
    "Detection",
    "Alert",
    "Evidence",
    "AuditLog",
]
