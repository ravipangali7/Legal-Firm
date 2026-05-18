"""Gate premium act/summary bodies: subscribers get plaintext; others get encrypted blobs only."""

from __future__ import annotations

import logging
from typing import Any

_LOG = logging.getLogger(__name__)


def request_has_library_access(request) -> bool:
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_staff", False):
        return True
    try:
        from .subscription_service import library_entitlement_active

        return library_entitlement_active(user)
    except Exception:
        _LOG.exception("library entitlement check failed")
        return False


def _is_nonempty(value: Any) -> bool:
    if value is None:
        return False
    if value == "":
        return False
    if value == {}:
        return False
    return True


def _encrypt_protected_value(value: Any) -> str | None:
    try:
        from .content_crypto import encrypt_payload

        return encrypt_payload(value)
    except Exception:
        _LOG.exception("premium content encryption failed")
        return None


def gate_premium_content(
    data: dict,
    *,
    is_premium: bool,
    protected_keys: tuple[str, ...],
    request,
) -> dict:
    """Remove plaintext protected fields for premium rows; add ``*_encrypted`` when content exists."""
    if not is_premium or request_has_library_access(request):
        return _sanitize_premium_payload(data, protected_keys)
    out = dict(data)
    for key in protected_keys:
        val = out.pop(key, None)
        if _is_nonempty(val):
            token = _encrypt_protected_value(val)
            if token:
                out[f"{key}_encrypted"] = token
    return out


def _sanitize_premium_payload(data: dict, protected_keys: tuple[str, ...]) -> dict:
    """Ensure protected text/json values are JSON-serializable (strip lone surrogates, etc.)."""
    out = dict(data)
    for key in protected_keys:
        if key not in out:
            continue
        val = out[key]
        if isinstance(val, str):
            out[key] = val.encode("utf-8", errors="surrogatepass").decode("utf-8", errors="replace")
    return out
