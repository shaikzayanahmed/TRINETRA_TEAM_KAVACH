"""
ANTIGRAVITY — FastAPI Application
Edge-AI Surveillance & Tactical Threat Interception Backend
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis_client import get_redis, close_redis
from app.core.minio_client import ensure_buckets
from app.core.mqtt import start_mqtt, stop_mqtt, register_handler, TOPIC_ALERTS
from app.api.auth import router as auth_router
from app.api.cameras import router as cameras_router
from app.api.zones import router as zones_router
from app.api.routes import (
    alerts_router,
    detections_router,
    tracks_router,
    evidence_router,
    system_router,
    ws_router,
)

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("antigravity")


# ── MQTT event handler (runs in MQTT thread) ──
def _handle_alert_event(topic: str, payload: dict):
    """Handle incoming alert events from edge engine via MQTT."""
    import asyncio
    from app.workers.mqtt_worker import process_alert_event
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(process_alert_event(payload))
        else:
            loop.run_until_complete(process_alert_event(payload))
    except RuntimeError:
        # If no event loop, create one (thread context)
        asyncio.run(process_alert_event(payload))


# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("=" * 60)
    logger.info("  ANTIGRAVITY Backend Starting...")
    logger.info("=" * 60)

    # Initialize Redis
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("[✓] Redis connected")
    except Exception as e:
        logger.warning(f"[!] Redis connection failed: {e}")

    # Initialize MinIO buckets
    try:
        ensure_buckets()
        logger.info("[✓] MinIO buckets initialized")
    except Exception as e:
        logger.warning(f"[!] MinIO initialization failed: {e}")

    # Start MQTT
    try:
        register_handler(TOPIC_ALERTS, _handle_alert_event)
        start_mqtt()
        logger.info("[✓] MQTT client started")
    except Exception as e:
        logger.warning(f"[!] MQTT start failed: {e}")

    logger.info("[✓] ANTIGRAVITY Backend ready")
    logger.info(f"    API docs: http://localhost:{settings.BACKEND_PORT}/docs")

    yield

    # ── Shutdown ──
    logger.info("ANTIGRAVITY Backend shutting down...")
    stop_mqtt()
    await close_redis()
    logger.info("Goodbye.")


# ── App ──
app = FastAPI(
    title="ANTIGRAVITY",
    description="Edge-AI Surveillance & Tactical Threat Interception API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route registration ──
app.include_router(auth_router)
app.include_router(cameras_router)
app.include_router(zones_router)
app.include_router(alerts_router)
app.include_router(detections_router)
app.include_router(tracks_router)
app.include_router(evidence_router)
app.include_router(system_router)
app.include_router(ws_router)
