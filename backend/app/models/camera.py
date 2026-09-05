import uuid
from typing import List

from sqlalchemy import String, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base
import enum


class CameraSourceType(str, enum.Enum):
    RTSP = "RTSP"
    FILE = "FILE"
    WEBCAM = "WEBCAM"
    THERMAL_FILE = "THERMAL_FILE"


class CameraStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    DISABLED = "DISABLED"
    ERROR = "ERROR"


class Camera(Base):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_type: Mapped[CameraSourceType] = mapped_column(
        Enum(CameraSourceType, name="camera_source_type", create_type=True), nullable=False
    )
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Geographic location using PostGIS Point (longitude, latitude)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    status: Mapped[CameraStatus] = mapped_column(
        Enum(CameraStatus, name="camera_status", create_type=True), nullable=False, default=CameraStatus.OFFLINE
    )

    # Relationships
    zones: Mapped[List["Zone"]] = relationship("Zone", back_populates="camera", cascade="all, delete-orphan")
    detections: Mapped[List["Detection"]] = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")
    tracks: Mapped[List["Track"]] = relationship("Track", back_populates="camera", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="camera", cascade="all, delete-orphan")
