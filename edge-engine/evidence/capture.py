"""
ANTIGRAVITY — Edge Engine: Evidence Capture
Frame capture, video clip extraction, SHA-256 hashing, MinIO upload.
"""
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("antigravity.evidence")


def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hash of binary data."""
    return hashlib.sha256(data).hexdigest()


def capture_evidence_frame(
    frame: np.ndarray,
    anonymizer=None,
    quality: int = 90,
) -> Tuple[bytes, str]:
    """
    Capture an evidence frame.
    Applies anonymization if provided.
    Returns (jpeg_bytes, sha256_hash).
    """
    # Apply face anonymization
    if anonymizer is not None:
        frame = anonymizer.anonymize(frame)

    # Encode as JPEG
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    success, buffer = cv2.imencode(".jpg", frame, encode_params)
    if not success:
        raise RuntimeError("Failed to encode evidence frame")

    data = buffer.tobytes()
    sha256 = compute_sha256(data)

    return data, sha256


def generate_evidence_filename(camera_id: str, event_type: str) -> str:
    """Generate a timestamped evidence filename."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    return f"{camera_id}/{event_type}_{ts}.jpg"


def upload_to_minio(
    object_name: str,
    data: bytes,
    content_type: str = "image/jpeg",
) -> Optional[str]:
    """Upload evidence to MinIO. Returns object path or None on failure."""
    try:
        from minio import Minio
        import os

        endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

        client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)
        bucket = "antigravity-evidence"

        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)

        import io
        stream = io.BytesIO(data)
        client.put_object(bucket, object_name, stream, len(data), content_type=content_type)
        object_path = f"{bucket}/{object_name}"
        logger.info(f"Evidence uploaded: {object_path} ({len(data)} bytes)")
        return object_path
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        return None
