"""
Antigravity - Database Seed Script
====================================
Seeds the database with demo data for development.
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import engine, async_session_maker
from app.models import User, Camera, Zone
from app.models.user import UserRole
from app.models.camera import CameraSourceType, CameraStatus
from app.models.zone import ZoneType


async def seed():
    async with async_session_maker() as session:
        # Check if already seeded
        try:
            result = await session.execute(text("SELECT count(*) FROM users"))
            count = result.scalar()
            if count and count > 0:
                print("[i] Database already contains users - skipping seed.")
                return
        except Exception:
            pass

        print("[*] Seeding database tables with tactical initial records...")

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
        print("    [+] Created users: admin, operator, viewer")

        # Demo Camera 1 (RGB Webcam)
        cam_id = uuid.uuid4()
        demo_camera = Camera(
            id=cam_id,
            name="CAM-01 Northern Post",
            source_type=CameraSourceType.WEBCAM,
            source_url="0",
            location="SRID=4326;POINT(77.5946 34.1526)",
            status=CameraStatus.ONLINE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Demo Camera 2 (LWIR Thermal)
        cam2_id = uuid.uuid4()
        demo_camera2 = Camera(
            id=cam2_id,
            name="CAM-02 High-Altitude LWIR Thermal",
            source_type=CameraSourceType.RTSP,
            source_url="rtsp://192.168.1.102:554/thermal",
            location="SRID=4326;POINT(77.5952 34.1531)",
            status=CameraStatus.ONLINE,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        session.add_all([demo_camera, demo_camera2])
        print("    [+] Created demo cameras: CAM-01 Northern Post & CAM-02 LWIR Thermal")


        # Demo Tripwire Zone
        tripwire = Zone(
            id=uuid.uuid4(),
            camera_id=cam_id,
            name="Zone Alpha Perimeter Tripwire",
            geometry="SRID=4326;LINESTRING(77.594 34.151, 77.595 34.151)",
            zone_type=ZoneType.TRIPWIRE,
            enabled=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Demo Restricted Zone
        restricted = Zone(
            id=uuid.uuid4(),
            camera_id=cam_id,
            name="Restricted Border Buffer",
            geometry="SRID=4326;POLYGON((77.594 34.151, 77.595 34.151, 77.595 34.152, 77.594 34.152, 77.594 34.151))",
            zone_type=ZoneType.RESTRICTED_AREA,
            enabled=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        session.add_all([tripwire, restricted])
        print("    [+] Created demo zones: Zone Alpha & Buffer")

        await session.commit()
        print("\n[+] Database seeded successfully!")
        print("\n    DEVELOPMENT credentials:")
        print("       admin    / admin123")
        print("       operator / operator123")
        print("       viewer   / viewer123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
