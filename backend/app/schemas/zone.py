"""
ANTIGRAVITY — Pydantic Schemas: Zone (Tripwire / Geofence)
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class ZoneCreate(BaseModel):
    camera_id: str
    name: str = Field(..., max_length=100)
    zone_type: str = Field(..., pattern="^(TRIPWIRE|RESTRICTED_AREA|SAFE_AREA)$")
    # GeoJSON-style coordinates: list of [lng, lat] pairs
    # For TRIPWIRE: 2+ points (linestring)
    # For RESTRICTED_AREA/SAFE_AREA: 3+ points (polygon, auto-closed)
    coordinates: List[List[float]]
    enabled: bool = True


class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    zone_type: Optional[str] = Field(None, pattern="^(TRIPWIRE|RESTRICTED_AREA|SAFE_AREA)$")
    coordinates: Optional[List[List[float]]] = None
    enabled: Optional[bool] = None


class ZoneResponse(BaseModel):
    id: str
    camera_id: str
    name: str
    zone_type: str
    coordinates: Optional[List[List[float]]] = None
    enabled: bool
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
