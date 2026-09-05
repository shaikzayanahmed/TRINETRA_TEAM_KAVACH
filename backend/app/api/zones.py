"""
ANTIGRAVITY — Zone API Routes (Tripwire / Geofence)
"""
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.zone import Zone, ZoneType
from app.models.user import User, UserRole
from app.core.security import get_current_user, require_role
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse

logger = logging.getLogger("antigravity.api.zones")
router = APIRouter(prefix="/api/zones", tags=["Zones"])


def _coords_to_wkt(zone_type: str, coordinates: list) -> str:
    """Convert coordinate list to PostGIS WKT."""
    if zone_type == "TRIPWIRE":
        # LINESTRING
        points = ", ".join(f"{c[0]} {c[1]}" for c in coordinates)
        return f"SRID=4326;LINESTRING({points})"
    else:
        # POLYGON — auto-close
        coords = list(coordinates)
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        points = ", ".join(f"{c[0]} {c[1]}" for c in coords)
        return f"SRID=4326;POLYGON(({points}))"


def _wkt_to_coords(wkt_str: str) -> list:
    if not wkt_str:
        return []
    try:
        clean = str(wkt_str).split(";")[-1]
        start = clean.find("(")
        end = clean.rfind(")")
        if start != -1 and end != -1:
            raw = clean[start+1:end].replace("(", "").replace(")", "")
            pairs = raw.split(",")
            out = []
            for p in pairs:
                pts = p.strip().split()
                if len(pts) >= 2:
                    out.append([float(pts[0]), float(pts[1])])
            return out
    except Exception:
        pass
    return []


def _zone_to_response(zone: Zone) -> ZoneResponse:
    return ZoneResponse(
        id=str(zone.id),
        camera_id=str(zone.camera_id),
        name=zone.name,
        zone_type=zone.zone_type.value,
        coordinates=_wkt_to_coords(zone.geometry),
        enabled=zone.enabled,
        created_at=zone.created_at.isoformat(),
        updated_at=zone.updated_at.isoformat(),
    )



@router.get("", response_model=list[ZoneResponse])
async def list_zones(
    camera_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List zones, optionally filtered by camera."""
    query = select(Zone).order_by(Zone.created_at.desc())
    if camera_id:
        query = query.where(Zone.camera_id == uuid.UUID(camera_id))
    result = await db.execute(query)
    zones = result.scalars().all()
    return [_zone_to_response(z) for z in zones]


@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    payload: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Create a tripwire, restricted area, or safe zone."""
    wkt = _coords_to_wkt(payload.zone_type, payload.coordinates)

    zone = Zone(
        id=uuid.uuid4(),
        camera_id=uuid.UUID(payload.camera_id),
        name=payload.name,
        geometry=wkt,
        zone_type=ZoneType(payload.zone_type),
        enabled=payload.enabled,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    logger.info(f"Zone created: {zone.name} [{zone.zone_type.value}]")
    return _zone_to_response(zone)


@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: str,
    payload: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Update a zone."""
    result = await db.execute(select(Zone).where(Zone.id == uuid.UUID(zone_id)))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if payload.name is not None:
        zone.name = payload.name
    if payload.zone_type is not None:
        zone.zone_type = ZoneType(payload.zone_type)
    if payload.coordinates is not None:
        zt = payload.zone_type or zone.zone_type.value
        zone.geometry = _coords_to_wkt(zt, payload.coordinates)
    if payload.enabled is not None:
        zone.enabled = payload.enabled

    await db.commit()
    await db.refresh(zone)
    logger.info(f"Zone updated: {zone.name}")
    return _zone_to_response(zone)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATOR)),
):
    """Delete a zone."""
    result = await db.execute(select(Zone).where(Zone.id == uuid.UUID(zone_id)))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    await db.delete(zone)
    await db.commit()
    logger.info(f"Zone deleted: {zone_id}")
