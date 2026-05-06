"""eSewa ePay v2 — UAT-only integration (see `esewa_integration.md` at repo root)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal
from typing import Any

_LOG = logging.getLogger(__name__)

# ——— Fixed UAT endpoints and merchant test credentials (`esewa_integration.md` §3, §5, §6) ———

ESEWA_UAT_EPAY_FORM_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
ESEWA_UAT_STATUS_URL_BASE = "https://rc.esewa.com.np/api/epay/transaction/status/"

ESEWA_UAT_PRODUCT_CODE = "EPAYTEST"
# Official eSewa Epay-V2 UAT secret (includes `&`). A typo without `&` validates locally but rc-epay returns ES104.
ESEWA_UAT_SECRET_KEY = "8gBm/:&EnhH.1/q"


def uat_product_code_and_secret() -> tuple[str, str]:
    """Always EPAYTEST + UAT secret from `esewa_integration.md` (no AppSettings overrides)."""
    return ESEWA_UAT_PRODUCT_CODE, ESEWA_UAT_SECRET_KEY


def sign_epay_request(*, total_amount: str, transaction_uuid: str, product_code: str, secret_key: str) -> str:
    """
    ePay v2 request signature (md §5): message
    total_amount=110,transaction_uuid=241028,product_code=EPAYTEST
    """
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    digest = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")


def _norm_decimal_str(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, Decimal):
        s = format(val, "f")
    elif isinstance(val, (int, float)):
        s = str(Decimal(str(val)))
    else:
        s = str(val).strip()
    s = s.replace(",", "")
    if re.fullmatch(r"-?\d+\.?\d*", s):
        q = Decimal(s).quantize(Decimal("0.01"))
        return format(q, "f")
    return s


def _response_field_string(payload: dict, field: str) -> str:
    v = payload.get(field)
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float, Decimal)):
        return _norm_decimal_str(v)
    return str(v).strip()


def verify_epay_response_signature(payload: dict, *, secret_key: str) -> bool:
    """Verify callback JSON signature (md §8); field order from signed_field_names / signedfieldnames."""
    recv = (payload.get("signature") or payload.get("Signature") or "").strip()
    if not recv:
        return False
    signed_raw = (payload.get("signed_field_names") or payload.get("signedfieldnames") or "").strip()
    if not signed_raw:
        return False
    keys = [k.strip() for k in signed_raw.split(",") if k.strip() and k.strip() != "signature"]
    parts: list[str] = []
    for k in keys:
        if k not in payload:
            _LOG.warning("eSewa verify: missing field %s in payload", k)
            return False
        parts.append(f"{k}={_response_field_string(payload, k)}")
    message = ",".join(parts)
    digest = hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, recv)


def decode_esewa_callback_data(raw_b64: str) -> dict | None:
    raw_b64 = (raw_b64 or "").strip()
    if not raw_b64:
        return None
    try:
        pad = "=" * (-len(raw_b64) % 4)
        decoded = base64.urlsafe_b64decode(raw_b64 + pad)
    except Exception:
        try:
            decoded = base64.b64decode(raw_b64 + "=" * (-len(raw_b64) % 4))
        except Exception:
            _LOG.exception("eSewa callback: base64 decode failed")
            return None
    try:
        text = decoded.decode("utf-8")
    except UnicodeDecodeError:
        _LOG.exception("eSewa callback: utf-8 decode failed")
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        _LOG.exception("eSewa callback: JSON parse failed: %s", text[:500])
        return None


def epay_transaction_status(
    *,
    product_code: str,
    total_amount: str,
    transaction_uuid: str,
    timeout_sec: float = 20.0,
) -> dict | None:
    """GET UAT transaction status (md §3, §9)."""
    q = urllib.parse.urlencode(
        {
            "product_code": product_code,
            "total_amount": total_amount,
            "transaction_uuid": transaction_uuid,
        }
    )
    url = f"{ESEWA_UAT_STATUS_URL_BASE}?{q}"
    try:
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "LegalFirm/1.0"})
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        _LOG.warning("eSewa status HTTP %s: %s", e.code, e.read()[:500] if e.fp else "")
        return None
    except Exception:
        _LOG.exception("eSewa status request failed")
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        _LOG.warning("eSewa status: invalid JSON: %s", body[:500])
        return None


def amounts_close(a: Decimal, b: Decimal) -> bool:
    return abs(a - b) <= Decimal("0.01")
