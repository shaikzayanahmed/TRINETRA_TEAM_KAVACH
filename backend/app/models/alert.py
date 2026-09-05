import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Float, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base
import enum


class AlertType(str, enum.Enum):
    TRIPWIRE_BREACH = "TRIPWIRE_BREACH"
    ZONE_ENTRY = "ZONE_ENTRY"
    ZONE_EXIT = "ZONE_EXIT"
    SUSPICIOUS_MOVEMENT = "SUSPICIOUS_MOVEMENT"
    CAMERA_OFFLINE = "CAMERA_OFFLINE"


class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class Alert(Base):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    track_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, name="alert_type", create_type=True), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", create_type=True), nullable=False
    )
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Geospatial location of the event
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    
    metadata_json = mapped_column(JSONB, nullable=True)
    
    evidence_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    hash_algorithm: Mapped[str] = mapped_column(String(20), default="SHA-256")
    
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status", create_type=True), nullable=False, default=AlertStatus.NEW
    )

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="alerts")
    track: Mapped[Optional["Track"]] = relationship("Track", back_populates="alerts")
    evidences: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="alert", cascade="all, delete-orphan")
