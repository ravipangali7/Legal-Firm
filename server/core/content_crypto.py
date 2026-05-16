"""Symmetric encryption for premium library payloads (Fernet, key derived from SECRET_KEY)."""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_payload(value: Any) -> str:
    raw = json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return _fernet().encrypt(raw).decode("ascii")


def decrypt_payload(token: str) -> Any:
    try:
        raw = _fernet().decrypt(token.encode("ascii"))
    except InvalidToken as exc:
        raise ValueError("Invalid or tampered encrypted payload.") from exc
    return json.loads(raw.decode("utf-8"))
