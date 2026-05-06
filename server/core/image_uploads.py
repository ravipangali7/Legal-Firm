"""Helpers for ImageField: data URLs from the CMS, snapshot apply, and optional URL downloads for seeds."""

from __future__ import annotations

import base64
import binascii
import re
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from django.core.files.base import ContentFile

if TYPE_CHECKING:
    from django.db.models import Model

_DATA_URL = re.compile(r"^data:(image/[\w+.-]+);base64,(.+)$", re.IGNORECASE | re.DOTALL)
_MAX_DATA = 25 * 1024 * 1024  # bytes (decoded rough cap)


def decode_data_url_to_content_file(data_url: str) -> ContentFile | None:
    """Return a ContentFile from a data:image/...;base64,... URL, or None if invalid."""
    if not isinstance(data_url, str):
        return None
    s = data_url.strip()
    if len(s) > _MAX_DATA + 512:
        return None
    m = _DATA_URL.match(s)
    if not m:
        return None
    b64 = m.group(2).strip()
    try:
        raw = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError):
        return None
    if len(raw) > _MAX_DATA:
        return None
    ext = ".jpg"
    mime = (m.group(1) or "").lower()
    if "png" in mime:
        ext = ".png"
    elif "gif" in mime:
        ext = ".gif"
    elif "webp" in mime:
        ext = ".webp"
    elif "jpeg" in mime or "jpg" in mime:
        ext = ".jpg"
    return ContentFile(raw, name=f"upload{ext}")


def urls_match_stored_file(fieldfile, incoming: str) -> bool:
    """True if `incoming` is the same uploaded file as `fieldfile` (round-trip from API JSON)."""
    if not fieldfile or not incoming:
        return False
    s = incoming.strip()
    if not s:
        return False
    try:
        url = fieldfile.url
    except ValueError:
        return False
    name = (fieldfile.name or "").replace("\\", "/")
    if not name:
        return False
    if s == url or s.rstrip("/") == (url or "").rstrip("/"):
        return True
    if name in s.replace("\\", "/"):
        return True
    return False


def assign_image_from_snapshot_value(instance: Model, field_name: str, raw) -> None:
    """
    Set an ImageField from CMS snapshot JSON: empty clears, data URLs save a file,
    same /media/... URL as current file is a no-op, bare http(s) URLs are ignored.
    """
    v = raw if isinstance(raw, str) else ("" if raw is None else str(raw))
    v = v.strip()
    cur = getattr(instance, field_name, None)

    if not v:
        if cur:
            cur.delete(save=False)
        setattr(instance, field_name, "")
        return

    if v.startswith("data:"):
        cf = decode_data_url_to_content_file(v)
        if cf is None:
            return
        ext = Path(cf.name).suffix.lower() or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        getattr(instance, field_name).save(fname, cf, save=False)
        return

    if cur and urls_match_stored_file(cur, v):
        return

    if v.startswith("http://") or v.startswith("https://") or v.startswith("//"):
        return


def download_url_to_imagefield(instance: Model, field_name: str, url: str, *, timeout: int = 45) -> None:
    """Fetch a remote image URL and store it on `field_name` (for management commands / seeds)."""
    import urllib.error
    import urllib.request

    u = (url or "").strip()
    if not u.startswith(("http://", "https://")):
        return
    req = urllib.request.Request(u, headers={"User-Agent": "LegalFirmSeed/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except (urllib.error.URLError, OSError, ValueError):
        return
    if not data or len(data) > _MAX_DATA:
        return
    ext = ".jpg"
    lu = u.lower()
    if ".png" in lu.split("?", 1)[0]:
        ext = ".png"
    elif ".webp" in lu.split("?", 1)[0]:
        ext = ".webp"
    elif ".gif" in lu.split("?", 1)[0]:
        ext = ".gif"
    cf = ContentFile(data, name=f"seed{ext}")
    fname = f"{uuid.uuid4().hex}{ext}"
    getattr(instance, field_name).save(fname, cf, save=False)
