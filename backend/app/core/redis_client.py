"""
ANTIGRAVITY — Redis Client
Real-time ephemeral state: active tracks, alert dedup, dashboard state.
Includes automatic in-memory fallback if Redis daemon is not running.
"""
import json
import logging
import time
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger("antigravity.redis")

_redis_client: Optional[aioredis.Redis] = None
_redis_available: Optional[bool] = None

# In-memory fallbacks
_mem_store: dict[str, tuple[str, float]] = {}  # key -> (val_json, expire_at)
_mem_tracks: dict[str, dict[str, str]] = {}
_mem_dedup: dict[str, float] = {}


async def get_redis() -> Optional[aioredis.Redis]:
    """Return the global async Redis client if available."""
    global _redis_client, _redis_available
    if _redis_available is False:
        return None

    if _redis_client is None:
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                encoding="utf-8",
                socket_connect_timeout=1.0,
            )
            await client.ping()
            _redis_client = client
            _redis_available = True
            logger.info("Connected to Redis server")
        except Exception:
            _redis_available = False
            _redis_client = None
            logger.info("Redis server not available; using fast in-memory cache fallback")
    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection on shutdown."""
    global _redis_client, _redis_available
    if _redis_client:
        try:
            await _redis_client.close()
        except Exception:
            pass
        _redis_client = None
        _redis_available = None
        logger.info("Redis connection closed")


# ── Convenience helpers ──

async def redis_set_json(key: str, value: Any, ttl: int = 300) -> None:
    """Set a JSON-serializable value with TTL (default 5 min)."""
    serialized = json.dumps(value, default=str)
    r = await get_redis()
    if r:
        try:
            await r.set(key, serialized, ex=ttl)
            return
        except Exception:
            pass
    _mem_store[key] = (serialized, time.time() + ttl)


async def redis_get_json(key: str) -> Optional[Any]:
    """Get and deserialize a JSON value."""
    r = await get_redis()
    if r:
        try:
            raw = await r.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            pass
    if key in _mem_store:
        val_json, exp = _mem_store[key]
        if time.time() < exp:
            return json.loads(val_json)
        else:
            del _mem_store[key]
    return None


async def redis_delete(key: str) -> None:
    """Delete a key."""
    r = await get_redis()
    if r:
        try:
            await r.delete(key)
            return
        except Exception:
            pass
    _mem_store.pop(key, None)


async def redis_set_active_track(camera_id: str, track_id: int, data: dict) -> None:
    """Store active track state in Redis hash or in-memory dict."""
    r = await get_redis()
    serialized = json.dumps(data, default=str)
    if r:
        try:
            hash_key = f"tracks:active:{camera_id}"
            await r.hset(hash_key, str(track_id), serialized)
            await r.expire(hash_key, 600)  # 10 min TTL
            return
        except Exception:
            pass
    if camera_id not in _mem_tracks:
        _mem_tracks[camera_id] = {}
    _mem_tracks[camera_id][str(track_id)] = serialized


async def redis_get_active_tracks(camera_id: str) -> dict:
    """Get all active tracks for a camera."""
    r = await get_redis()
    if r:
        try:
            hash_key = f"tracks:active:{camera_id}"
            raw = await r.hgetall(hash_key)
            return {k: json.loads(v) for k, v in raw.items()}
        except Exception:
            pass
    tracks = _mem_tracks.get(camera_id, {})
    return {k: json.loads(v) for k, v in tracks.items()}


async def redis_check_alert_dedup(key: str, cooldown: int) -> bool:
    """Check if an alert dedup key exists. Returns True if NOT duplicate (ok to alert)."""
    r = await get_redis()
    if r:
        try:
            result = await r.set(f"alert:dedup:{key}", "1", nx=True, ex=cooldown)
            return result is not None
        except Exception:
            pass
    now = time.time()
    last_seen = _mem_dedup.get(key, 0)
    if now - last_seen < cooldown:
        return False
    _mem_dedup[key] = now
    return True


async def redis_update_system_metrics(metrics: dict) -> None:
    """Update system metrics in Redis."""
    await redis_set_json("system:metrics", metrics, ttl=30)


async def redis_get_system_metrics() -> Optional[dict]:
    """Get system metrics."""
    return await redis_get_json("system:metrics")

