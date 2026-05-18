"""Gate premium act/summary bodies: subscribers get plaintext; others get encrypted blobs only."""

from __future__ import annotations

import logging
from typing import Any

from .content_crypto import encrypt_payload

_LOG = logging.getLogger(__name__)


def request_has_library_access(request) -> bool:
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_staff", False):
        return True
    from .subscription_service import library_entitlement_active

    return library_entitlement_active(user)


def _is_nonempty(value: Any) -> bool:
    if value is None:
        return False
    if value == "":
        return False
    if value == {}:
        return False
    return True


def gate_premium_content(
    data: dict,
    *,
    is_premium: bool,
    protected_keys: tuple[str, ...],
    request,
) -> dict:
    """Remove plaintext protected fields for premium rows; add ``*_encrypted`` when content exists."""
    if not is_premium or request_has_library_access(request):
        return data
    out = dict(data)
    for key in protected_keys:
        val = out.pop(key, None)
        if _is_nonempty(val):
            try:
                out[f"{key}_encrypted"] = encrypt_payload(val)
            except Exception:
                _LOG.exception("premium content encryption failed for field %s", key)
    return out
