"""
ANTIGRAVITY — Redis Client
Real-time ephemeral state: active tracks, alert dedup, dashboard state.
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger("antigravity.redis")

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return the global async Redis client, creating it if needed."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            encoding="utf-8",
        )
    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection on shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


# ── Convenience helpers ──

async def redis_set_json(key: str, value: Any, ttl: int = 300) -> None:
    """Set a JSON-serializable value with TTL (default 5 min)."""
    r = await get_redis()
    await r.set(key, json.dumps(value, default=str), ex=ttl)


async def redis_get_json(key: str) -> Optional[Any]:
    """Get and deserialize a JSON value."""
    r = await get_redis()
    raw = await r.get(key)
    return json.loads(raw) if raw else None


async def redis_delete(key: str) -> None:
    """Delete a key."""
    r = await get_redis()
    await r.delete(key)


async def redis_set_active_track(camera_id: str, track_id: int, data: dict) -> None:
    """Store active track state in Redis hash."""
    r = await get_redis()
    hash_key = f"tracks:active:{camera_id}"
    await r.hset(hash_key, str(track_id), json.dumps(data, default=str))
    await r.expire(hash_key, 600)  # 10 min TTL


async def redis_get_active_tracks(camera_id: str) -> dict:
    """Get all active tracks for a camera."""
    r = await get_redis()
    hash_key = f"tracks:active:{camera_id}"
    raw = await r.hgetall(hash_key)
    return {k: json.loads(v) for k, v in raw.items()}


async def redis_check_alert_dedup(key: str, cooldown: int) -> bool:
    """Check if an alert dedup key exists. Returns True if NOT duplicate (ok to alert)."""
    r = await get_redis()
    result = await r.set(f"alert:dedup:{key}", "1", nx=True, ex=cooldown)
    return result is not None  # True = new alert, False = duplicate


async def redis_update_system_metrics(metrics: dict) -> None:
    """Update system metrics in Redis."""
    r = await get_redis()
    await r.set("system:metrics", json.dumps(metrics, default=str), ex=30)


async def redis_get_system_metrics() -> Optional[dict]:
    """Get system metrics."""
    return await redis_get_json("system:metrics")
