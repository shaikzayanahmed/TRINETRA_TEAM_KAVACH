"""
ANTIGRAVITY — Evidence Service
SHA-256 integrity, MinIO upload/download, verification.
"""
import hashlib
import logging
from typing import Optional, Tuple

from app.core.minio_client import (
    upload_bytes,
    download_bytes,
    get_presigned_url,
    BUCKET_EVIDENCE,
)

logger = logging.getLogger("antigravity.evidence")


def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hash of binary data."""
    return hashlib.sha256(data).hexdigest()


def upload_evidence(
    object_name: str,
    data: bytes,
    content_type: str = "image/jpeg",
) -> Tuple[str, str]:
    """
    Upload evidence to MinIO.
    Returns (object_path, sha256_hash).
    """
    sha256 = compute_sha256(data)
    object_path = upload_bytes(BUCKET_EVIDENCE, object_name, data, content_type)
    logger.info(f"Evidence uploaded: {object_name} | SHA-256: {sha256[:16]}...")
    return object_path, sha256


def verify_evidence(object_name: str, stored_hash: str) -> Tuple[bool, str]:
    """
    Verify evidence integrity.
    Downloads from MinIO, recomputes SHA-256, compares.
    Returns (is_valid, computed_hash).
    """
    try:
        data = download_bytes(BUCKET_EVIDENCE, object_name)
        computed_hash = compute_sha256(data)
        is_valid = computed_hash == stored_hash
        logger.info(
            f"Evidence verification: {object_name} | "
            f"{'VALID' if is_valid else 'INVALID'} | "
            f"stored={stored_hash[:16]}... computed={computed_hash[:16]}..."
        )
        return is_valid, computed_hash
    except Exception as e:
        logger.error(f"Evidence verification failed for {object_name}: {e}")
        return False, ""


def get_evidence_url(object_name: str, expires: int = 3600) -> str:
    """Get a presigned URL for evidence download."""
    return get_presigned_url(BUCKET_EVIDENCE, object_name, expires)
