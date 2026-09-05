"""
Antigravity - Database Seed Script
====================================
Seeds the database with demo data for development.

Usage:
    cd backend
    python ../scripts/seed.py

IMPORTANT: These credentials are for DEVELOPMENT ONLY.
           Do NOT use them in production.
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.base import Base
from app.models import User, Camera, Zone
from app.models.user import UserRole
from app.models.camera import CameraSourceType, CameraStatus
from app.models.zone import ZoneType


DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/antigravity",
)


async def seed():
    engine = create_async_engine(DB_URL, echo=False)
    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        # ── Check if already seeded ──
        result = await session.execute(text("SELECT count(*) FROM users"))
        count = result.scalar()
        if count and count > 0:
            print("[i] Database already contains users — skipping seed.")
            await engine.dispose()
            return

        print("[*] Seeding database...")

        # ── 1. Users (DEVELOPMENT ONLY passwords) ──
        # Using passlib bcrypt hash of "admin123"
        # In production, generate these properly via passlib.
        import bcrypt

        admin = User(
            id=uuid.uuid4(),
            username="admin",
            email="admin@antigravity.local",
            password_hash=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.ADMIN,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        operator = User(
            id=uuid.uuid4(),
            username="operator",
            email="operator@antigravity.local",
            password_hash=bcrypt.hashpw("operator123".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.OPERATOR,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        viewer = User(
            id=uuid.uuid4(),
            username="viewer",
            email="viewer@antigravity.local",
            password_hash=bcrypt.hashpw("viewer123".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.VIEWER,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        session.add_all([admin, operator, viewer])
        print("    [✓] Created users: admin, operator, viewer")

        # ── 2. Demo Camera ──
        cam_id = uuid.uuid4()
        demo_camera = Camera(
            id=cam_id,
            name="CAM-01 Entrance",
            source_type=CameraSourceType.FILE,
            source_url="sample_data/videos/sample.mp4",
            location="SRID=4326;POINT(77.5946 12.9716)",   # Bangalore coords
            status=CameraStatus.OFFLINE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(demo_camera)
        print("    [✓] Created demo camera: CAM-01 Entrance")

        # ── 3. Demo Tripwire ──
        tripwire = Zone(
            id=uuid.uuid4(),
            camera_id=cam_id,
            name="Entrance Tripwire",
            geometry="SRID=4326;LINESTRING(77.594 12.971, 77.595 12.971)",
            zone_type=ZoneType.TRIPWIRE,
            enabled=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # ── 4. Demo Restricted Zone ──
        restricted = Zone(
            id=uuid.uuid4(),
            camera_id=cam_id,
            name="Server Room Perimeter",
            geometry="SRID=4326;POLYGON((77.594 12.971, 77.595 12.971, 77.595 12.972, 77.594 12.972, 77.594 12.971))",
            zone_type=ZoneType.RESTRICTED_AREA,
            enabled=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        session.add_all([tripwire, restricted])
        print("    [✓] Created demo tripwire: Entrance Tripwire")
        print("    [✓] Created demo restricted zone: Server Room Perimeter")

        await session.commit()
        print("\n[✓] Seed completed successfully!")
        print("\n    ⚠  DEVELOPMENT-ONLY credentials:")
        print("       admin    / admin123")
        print("       operator / operator123")
        print("       viewer   / viewer123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
