"""Emergent object storage integration."""
import os
import uuid
import requests
import logging
from datetime import datetime, timezone
from db import db

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "logic-led"
_storage_key = None
logger = logging.getLogger("uvicorn.error")


def init_storage() -> str | None:
    global _storage_key
    if _storage_key: return _storage_key
    try:
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key: return None
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        logger.info("Storage initialized")
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key: raise RuntimeError("Storage not initialized")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    r.raise_for_status()
    return r.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key: raise RuntimeError("Storage not initialized")
    r = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


async def save_file_record(user_id: str, filename: str, storage_path: str,
                           content_type: str, size: int, kind: str = "generic") -> dict:
    rec = {
        "id": str(uuid.uuid4()),
        "user_id": user_id, "kind": kind,
        "storage_path": storage_path, "original_filename": filename,
        "content_type": content_type, "size": size,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(rec)
    rec.pop("_id", None)
    return rec
