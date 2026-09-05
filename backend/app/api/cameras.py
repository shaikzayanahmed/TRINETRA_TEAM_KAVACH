"""
ANTIGRAVITY — Camera API Routes
Full CRUD for camera management.
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.camera import Camera, CameraSourceType, CameraStatus
from app.models.user import User, UserRole
from app.core.security import get_current_user, require_role
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse

logger = logging.getLogger("antigravity.api.cameras")
router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


def _camera_to_response(cam: Camera) -> CameraResponse:
    return CameraResponse(
        id=str(cam.id),
        name=cam.name,
        source_type=cam.source_type.value,
        source_url=cam.source_url,
        latitude=None,  # TODO: extract from PostGIS POINT
        longitude=None,
        status=cam.status.value,
        created_at=cam.created_at.isoformat(),
        updated_at=cam.updated_at.isoformat(),
    )


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all cameras with pagination."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Camera).order_by(Camera.created_at.desc()).offset(offset).limit(page_size)
    )
    cameras = result.scalars().all()
    return [_camera_to_response(c) for c in cameras]


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    payload: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Add a new camera."""
    location = None
    if payload.latitude is not None and payload.longitude is not None:
        location = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"

    camera = Camera(
        id=uuid.uuid4(),
        name=payload.name,
        source_type=CameraSourceType(payload.source_type),
        source_url=payload.source_url,
        location=location,
        status=CameraStatus.OFFLINE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    logger.info(f"Camera created: {camera.name} ({camera.source_type.value})")
    return _camera_to_response(camera)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific camera by ID."""
    result = await db.execute(select(Camera).where(Camera.id == uuid.UUID(camera_id)))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return _camera_to_response(camera)


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    payload: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Update a camera."""
    result = await db.execute(select(Camera).where(Camera.id == uuid.UUID(camera_id)))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    if payload.name is not None:
        camera.name = payload.name
    if payload.source_type is not None:
        camera.source_type = CameraSourceType(payload.source_type)
    if payload.source_url is not None:
        camera.source_url = payload.source_url
    if payload.status is not None:
        camera.status = CameraStatus(payload.status)
    if payload.latitude is not None and payload.longitude is not None:
        camera.location = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"

    await db.commit()
    await db.refresh(camera)
    logger.info(f"Camera updated: {camera.name}")
    return _camera_to_response(camera)


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Delete a camera."""
    result = await db.execute(select(Camera).where(Camera.id == uuid.UUID(camera_id)))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()
    logger.info(f"Camera deleted: {camera_id}")
