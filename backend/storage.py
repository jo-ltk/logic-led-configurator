"""MongoDB GridFS file storage."""
import logging
import os
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from gridfs import GridFS
from pymongo import MongoClient

from db import db

APP_NAME = "logic-led"
logger = logging.getLogger("uvicorn.error")

_sync_client = None


def _gridfs() -> GridFS:
    global _sync_client
    if _sync_client is None:
        _sync_client = MongoClient(os.environ["MONGO_URL"])
    return GridFS(_sync_client[os.environ["DB_NAME"]])


def put_object(path: str, data: bytes, content_type: str) -> dict:
    fs = _gridfs()
    file_id = fs.put(
        data,
        filename=path,
        metadata={"content_type": content_type, "logical_path": path},
    )
    return {"path": str(file_id), "size": len(data)}


def get_object(path: str) -> tuple[bytes, str]:
    fs = _gridfs()
    try:
        oid = ObjectId(path)
    except Exception as exc:
        raise FileNotFoundError(f"Invalid storage id: {path}") from exc

    grid_out = fs.get(oid)
    metadata = grid_out.metadata or {}
    content_type = metadata.get("content_type", "application/octet-stream")
    return grid_out.read(), content_type


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
