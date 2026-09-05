"""
Antigravity - Database Connection Test Script
==============================================
Verifies that the async PostgreSQL connection works and PostGIS is available.

Usage:
    cd backend
    python -m scripts.test_db_connection

    OR from project root:
    python scripts/test_db_connection.py
"""

import asyncio
import sys
import os

# Ensure backend/app is importable when run from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def test_connection():
    """Test raw async connection to PostgreSQL and verify PostGIS."""

    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/antigravity",
    )

    print(f"[*] Connecting to: {db_url}")
    engine = create_async_engine(db_url, echo=False)

    try:
        async with engine.connect() as conn:
            # ── 1. Basic connectivity ──
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"[✓] PostgreSQL version: {version}")

            # ── 2. PostGIS availability ──
            try:
                result = await conn.execute(text("SELECT PostGIS_Full_Version()"))
                postgis_version = result.scalar()
                print(f"[✓] PostGIS version: {postgis_version}")
            except Exception:
                print("[✗] PostGIS is NOT installed. Run: CREATE EXTENSION postgis;")

            # ── 3. List existing tables ──
            result = await conn.execute(
                text(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                )
            )
            tables = [row[0] for row in result.fetchall()]
            if tables:
                print(f"[✓] Existing tables: {', '.join(tables)}")
            else:
                print("[i] No tables yet. Run 'alembic upgrade head' to create them.")

        print("\n[✓] Database connection test PASSED")

    except Exception as e:
        print(f"\n[✗] Database connection test FAILED: {e}")
        sys.exit(1)

    finally:
        await engine.dispose()


async def test_table_creation():
    """
    Attempt to import all models and verify Base.metadata contains the
    expected tables. This does NOT write to the database.
    """
    print("\n[*] Verifying SQLAlchemy model metadata...")

    try:
        from app.models import Base  # noqa: F401
        from app.models import (
            User,
            Camera,
            Zone,
            Track,
            Detection,
            Alert,
            Evidence,
            AuditLog,
        )

        table_names = sorted(Base.metadata.tables.keys())
        expected = sorted([
            "users",
            "cameras",
            "zones",
            "tracks",
            "detections",
            "alerts",
            "evidences",
            "audit_logs",
        ])

        print(f"    Registered tables : {table_names}")
        print(f"    Expected tables   : {expected}")

        if set(expected).issubset(set(table_names)):
            print("[✓] All expected tables are registered in metadata")
        else:
            missing = set(expected) - set(table_names)
            print(f"[✗] Missing tables: {missing}")

    except ImportError as e:
        print(f"[!] Could not import models (run from backend/ dir): {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())
    asyncio.run(test_table_creation())
