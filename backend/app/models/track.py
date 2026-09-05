import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Enum, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base
import enum


class TrackStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    LOST = "LOST"
    FINISHED = "FINISHED"


class Track(Base):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    track_identifier: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    object_class: Mapped[str] = mapped_column(String(50), nullable=False)
    
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Current spatial location for geospatial queries
    current_position = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    
    status: Mapped[TrackStatus] = mapped_column(
        Enum(TrackStatus, name="track_status", create_type=True), nullable=False, default=TrackStatus.ACTIVE
    )

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="tracks")
    detections: Mapped[List["Detection"]] = relationship("Detection", back_populates="track")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="track")
