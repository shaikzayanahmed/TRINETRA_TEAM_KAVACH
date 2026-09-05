"""
ANTIGRAVITY — Pydantic Schemas: Camera
"""
from typing import Optional
from pydantic import BaseModel, Field


class CameraCreate(BaseModel):
    name: str = Field(..., max_length=100)
    source_type: str = Field(..., pattern="^(RTSP|FILE|WEBCAM|THERMAL_FILE)$")
    source_url: str = Field(..., max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    source_type: Optional[str] = Field(None, pattern="^(RTSP|FILE|WEBCAM|THERMAL_FILE)$")
    source_url: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = Field(None, pattern="^(ONLINE|OFFLINE|DISABLED|ERROR)$")


class CameraResponse(BaseModel):
    id: str
    name: str
    source_type: str
    source_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
