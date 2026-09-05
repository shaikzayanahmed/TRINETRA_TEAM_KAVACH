"""
ANTIGRAVITY — MinIO (S3-compatible) Object Storage Client
Stores: alert images, evidence frames, video clips, thermal evidence.
"""
import io
import logging
from typing import Optional

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger("antigravity.minio")

BUCKET_EVIDENCE = "antigravity-evidence"
BUCKET_ALERTS = "antigravity-alerts"
BUCKET_LOGS = "antigravity-logs"

_minio_client: Optional[Minio] = None


def get_minio() -> Minio:
    """Return the global MinIO client, creating it if needed."""
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _minio_client


def ensure_buckets() -> None:
    """Create required buckets if they don't exist."""
    client = get_minio()
    for bucket in [BUCKET_EVIDENCE, BUCKET_ALERTS, BUCKET_LOGS]:
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"Created MinIO bucket: {bucket}")
        except S3Error as e:
            logger.error(f"MinIO bucket error for '{bucket}': {e}")


def upload_bytes(
    bucket: str,
    object_name: str,
    data: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload bytes to MinIO. Returns the object path."""
    client = get_minio()
    stream = io.BytesIO(data)
    client.put_object(
        bucket,
        object_name,
        stream,
        length=len(data),
        content_type=content_type,
    )
    logger.info(f"Uploaded {object_name} to {bucket} ({len(data)} bytes)")
    return f"{bucket}/{object_name}"


def download_bytes(bucket: str, object_name: str) -> bytes:
    """Download an object from MinIO as bytes."""
    client = get_minio()
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def get_presigned_url(
    bucket: str, object_name: str, expires_seconds: int = 3600
) -> str:
    """Generate a presigned URL for an object."""
    from datetime import timedelta

    client = get_minio()
    return client.presigned_get_object(
        bucket, object_name, expires=timedelta(seconds=expires_seconds)
    )


def delete_object(bucket: str, object_name: str) -> None:
    """Delete an object from MinIO."""
    client = get_minio()
    client.remove_object(bucket, object_name)
    logger.info(f"Deleted {object_name} from {bucket}")
