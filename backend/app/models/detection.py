import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.geo_types import GeoPoint


class Detection(Base):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    track_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    object_class: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Stores [x1, y1, x2, y2]
    bounding_box = mapped_column(JSON, nullable=False)
    
    # Geospatial location in the scene
    centroid = mapped_column(GeoPoint, nullable=True)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="detections")
    track: Mapped[Optional["Track"]] = relationship("Track", back_populates="detections")
