"""
ANTIGRAVITY — Object Storage Client (MinIO / Local Disk Fallback)
Stores: alert images, evidence frames, video clips, thermal evidence.
"""
import io
import logging
import os
import socket
from pathlib import Path
from typing import Optional

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger("antigravity.minio")

BUCKET_EVIDENCE = "antigravity-evidence"
BUCKET_ALERTS = "antigravity-alerts"
BUCKET_LOGS = "antigravity-logs"

_minio_client: Optional[Minio] = None
_minio_available: Optional[bool] = None

# Local fallback directory
LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"


def _ensure_local_dir(bucket: str) -> Path:
    target = LOCAL_STORAGE_DIR / bucket
    target.mkdir(parents=True, exist_ok=True)
    return target


def _is_minio_reachable() -> bool:
    try:
        endpoint = settings.MINIO_ENDPOINT
        host, port_str = endpoint.split(":") if ":" in endpoint else (endpoint, "9000")
        with socket.create_connection((host, int(port_str)), timeout=0.3):
            return True
    except Exception:
        return False


def get_minio() -> Optional[Minio]:
    """Return the global MinIO client, creating it if needed."""
    global _minio_client, _minio_available
    if _minio_available is False:
        return None

    if _minio_client is None:
        if not _is_minio_reachable():
            _minio_available = False
            _minio_client = None
            logger.info("MinIO server not available; using fast local filesystem storage fallback")
            return None
        try:
            client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
            _minio_client = client
            _minio_available = True
            logger.info("Connected to MinIO server")
        except Exception:
            _minio_available = False
            _minio_client = None
            logger.info("MinIO server error; using local filesystem storage fallback")
    return _minio_client



def ensure_buckets() -> None:
    """Create required buckets or local storage directories."""
    client = get_minio()
    for bucket in [BUCKET_EVIDENCE, BUCKET_ALERTS, BUCKET_LOGS]:
        _ensure_local_dir(bucket)
        if client:
            try:
                if not client.bucket_exists(bucket):
                    client.make_bucket(bucket)
                    logger.info(f"Created MinIO bucket: {bucket}")
            except Exception as e:
                logger.warning(f"MinIO bucket check failed for '{bucket}': {e}")


def upload_bytes(
    bucket: str,
    object_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to MinIO or local filesystem. Returns the object path."""
    client = get_minio()
    if client:
        try:
            stream = io.BytesIO(data)
            client.put_object(
                bucket,
                object_name,
                stream,
                length=len(data),
                content_type=content_type,
            )
            logger.info(f"Uploaded {object_name} to MinIO bucket {bucket} ({len(data)} bytes)")
            return f"{bucket}/{object_name}"
        except Exception as e:
            logger.warning(f"MinIO upload failed, falling back to local storage: {e}")

    # Local fallback
    folder = _ensure_local_dir(bucket)
    filepath = folder / object_name
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(data)
    logger.info(f"Stored {object_name} to local storage ({len(data)} bytes)")
    return f"{bucket}/{object_name}"


def download_bytes(bucket: str, object_name: str) -> bytes:
    """Download an object from MinIO or local filesystem as bytes."""
    client = get_minio()
    if client:
        try:
            response = client.get_object(bucket, object_name)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()
        except Exception as e:
            logger.warning(f"MinIO download failed, falling back to local: {e}")

    # Local fallback
    filepath = LOCAL_STORAGE_DIR / bucket / object_name
    if filepath.exists():
        with open(filepath, "rb") as f:
            return f.read()
    raise FileNotFoundError(f"Object {bucket}/{object_name} not found in storage")


def get_presigned_url(
    bucket: str, object_name: str, expires_seconds: int = 3600
) -> str:
    """Generate a presigned URL or direct local static URL for an object."""
    from datetime import timedelta

    client = get_minio()
    if client:
        try:
            return client.presigned_get_object(
                bucket, object_name, expires=timedelta(seconds=expires_seconds)
            )
        except Exception:
            pass
    return f"/api/storage/{bucket}/{object_name}"


def delete_object(bucket: str, object_name: str) -> None:
    """Delete an object from MinIO or local filesystem."""
    client = get_minio()
    if client:
        try:
            client.remove_object(bucket, object_name)
        except Exception:
            pass
    filepath = LOCAL_STORAGE_DIR / bucket / object_name
    if filepath.exists():
        filepath.unlink()
    logger.info(f"Deleted {object_name} from {bucket}")

