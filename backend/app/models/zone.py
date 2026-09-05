import uuid
from typing import Optional

from sqlalchemy import String, Enum, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.base import Base
import enum


class ZoneType(str, enum.Enum):
    TRIPWIRE = "TRIPWIRE"
    RESTRICTED_AREA = "RESTRICTED_AREA"
    SAFE_AREA = "SAFE_AREA"


class Zone(Base):
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Geometry for the zone. Can be a polygon or linestring. 
    # GEOMETRY type without specifying POINT/POLYGON allows flexibility.
    geometry = mapped_column(Geometry("GEOMETRY", srid=4326), nullable=False)
    
    zone_type: Mapped[ZoneType] = mapped_column(
        Enum(ZoneType, name="zone_type", create_type=True), nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    camera: Mapped["Camera"] = relationship("Camera", back_populates="zones")
