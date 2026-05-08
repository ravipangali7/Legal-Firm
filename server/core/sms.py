"""Outbound SMS — Aakash SMS (Nepal) or Twilio when configured; otherwise logs."""

from __future__ import annotations

import base64
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

from core.models import AdminBroadcast, AppSettings
from core.outbound_panel_log import log_automated_admin_outbound
from core.phone_auth import normalize_phone_digits

_LOG = logging.getLogger(__name__)


def phone_to_e164(raw: str) -> str | None:
    """Best-effort E.164 for SMS APIs; Nepal local numbers default to +977."""
    s = (raw or "").strip().replace(" ", "")
    if not s:
        return None
    if s.startswith("+"):
        digits = "".join(c for c in s[1:] if c.isdigit())
        if len(digits) >= 10:
            return f"+{digits}"
        return None
    d = normalize_phone_digits(s)
    if len(d) >= 10:
        return f"+977{d}"
    return None


def _e164_to_aakash_nepal_10_digit(to_e164: str) -> str | None:
    """
    Map +977… E.164 to 10-digit Nepal mobile for Aakash SMS (no +977 in the `to` field).
    See repo Aakash_sms.md.
    """
    s = (to_e164 or "").strip()
    if not s.startswith("+"):
        return None
    digits = "".join(c for c in s[1:] if c.isdigit())
    if not digits:
        return None
    if digits.startswith("977") and len(digits) >= 13:
        sub = digits[3:13]
        if len(sub) == 10 and sub.startswith("9"):
            return sub
    return None


def _send_sms_aakash(*, to_10: str, body: str, auth_token: str, api_url: str) -> bool:
    payload = urllib.parse.urlencode(
        {"auth_token": auth_token, "to": to_10, "text": body}
    ).encode()
    req = urllib.request.Request(api_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            code = getattr(resp, "status", resp.getcode())
            raw = resp.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:800]
        _LOG.error("Aakash SMS HTTP %s: %s", e.code, detail)
        return False
    except Exception:
        _LOG.exception("Aakash SMS send failed for %s", to_10)
        return False

    if not (200 <= code < 300):
        _LOG.error("Aakash SMS bad status %s: %s", code, raw[:800])
        return False
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        _LOG.error("Aakash SMS non-JSON response: %s", raw[:800])
        return False

    if payload.get("error") is True:
        _LOG.error("Aakash SMS error: %s", payload.get("message") or raw[:500])
        return False
    data = payload.get("data") or {}
    valid = data.get("valid") or []
    if not valid:
        _LOG.error(
            "Aakash SMS no valid recipients (invalid=%s msg=%s)",
            data.get("invalid"),
            payload.get("message"),
        )
        return False
    return True


def _send_sms_twilio(to_e164: str, body: str) -> bool:
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    if not (account_sid and auth_token and from_num):
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urllib.parse.urlencode({"To": to_e164, "From": from_num, "Body": body}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    token_b64 = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
    req.add_header("Authorization", f"Basic {token_b64}")
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return 200 <= getattr(resp, "status", resp.getcode()) < 300
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:800]
        _LOG.error("Twilio HTTP %s: %s", e.code, detail)
    except Exception:
        _LOG.exception("Twilio SMS send failed for %s", to_e164)
    return False


def send_sms(to_e164: str, body: str) -> bool:
    """
    Send SMS using the first available provider:
    - Aakash SMS for Nepal (+977) when AAKASHSMS_AUTH_TOKEN is set (see Aakash_sms.md).
    - Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER are set.
    Otherwise logs and returns False.
    """
    aakash_token = os.environ.get("AAKASHSMS_AUTH_TOKEN", "").strip()
    ne_10 = _e164_to_aakash_nepal_10_digit(to_e164)
    if aakash_token and ne_10:
        api_url = (
            os.environ.get("AAKASHSMS_API_URL", "").strip()
            or "https://sms.aakashsms.com/sms/v3/send"
        )
        if _send_sms_aakash(to_10=ne_10, body=body, auth_token=aakash_token, api_url=api_url):
            return True
        if _send_sms_twilio(to_e164, body):
            return True
        return False

    if aakash_token and not ne_10:
        _LOG.info(
            "Aakash SMS skipped (not a Nepal +977 mobile); trying Twilio if configured. to=%s",
            to_e164,
        )

    if _send_sms_twilio(to_e164, body):
        return True

    _LOG.warning(
        "SMS not configured or send failed. Set AAKASHSMS_AUTH_TOKEN for Nepal (Aakash), "
        "or TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER. to=%s body=%s",
        to_e164,
        body[:500],
    )
    return False


def send_user_suspension_sms(user, reason: str) -> None:
    """Notify user by SMS when their account is suspended (requires a reachable phone)."""
    site = AppSettings.load().site_name
    name = (user.full_name or user.email or "there").strip()
    text = f"Hello {name}, your {site} account has been suspended. Reason: {reason.strip()}"
    if len(text) > 1500:
        text = text[:1497] + "..."
    to = phone_to_e164(user.phone or "")
    lines = [
        f"User: {user.full_name or user.email} (id={user.pk})",
        f"Reason: {reason.strip()}",
    ]
    outbound_report: dict = {}
    if not to:
        _LOG.warning("Suspension SMS skipped: user id=%s has no usable phone", user.pk)
        outbound_report["sms"] = {"status": "skipped", "detail": "no usable phone"}
        lines.append("SMS · skipped · no usable phone")
    else:
        ok = send_sms(to, text)
        st = "sent" if ok else "failed"
        outbound_report["sms"] = {
            "status": st,
            "to": to,
            "detail": "" if ok else "SMS send failed or SMS provider not configured",
        }
        lines.append(f"SMS · {st} · {to}")
    try:
        log_automated_admin_outbound(
            title=f"[Outbound] Account suspended: {user.email}",
            body="\n".join(lines),
            notification_type=AdminBroadcast.NotificationType.WARNING,
            link="/admin/users",
            outbound_report=outbound_report,
        )
    except Exception:
        _LOG.exception("Failed to write admin panel log for suspension SMS")


def send_payment_rejection_sms(user, invoice: str, reason: str) -> None:
    """Notify client by SMS when a subscription payment is rejected (requires a reachable phone)."""
    site = AppSettings.load().site_name
    name = (user.full_name or user.email or "there").strip()
    inv = (invoice or "").strip()
    text = f"Hello {name}, {site}: payment {inv} was not approved. Reason: {reason.strip()}"
    if len(text) > 1500:
        text = text[:1497] + "..."
    to = phone_to_e164(user.phone or "")
    lines = [
        f"User: {user.full_name or user.email} (id={user.pk})",
        f"Invoice: {inv}",
        f"Reason: {reason.strip()}",
    ]
    outbound_report: dict = {}
    if not to:
        _LOG.warning("Payment rejection SMS skipped: user id=%s has no usable phone", user.pk)
        outbound_report["sms"] = {"status": "skipped", "detail": "no usable phone"}
        lines.append("SMS · skipped · no usable phone")
    else:
        ok = send_sms(to, text)
        st = "sent" if ok else "failed"
        outbound_report["sms"] = {
            "status": st,
            "to": to,
            "detail": "" if ok else "SMS send failed or SMS provider not configured",
        }
        lines.append(f"SMS · {st} · {to}")
    try:
        log_automated_admin_outbound(
            title=f"[Outbound] Payment rejected: {inv or user.email}",
            body="\n".join(lines),
            notification_type=AdminBroadcast.NotificationType.WARNING,
            link="/admin/transactions",
            outbound_report=outbound_report,
        )
    except Exception:
        _LOG.exception("Failed to write admin panel log for payment rejection SMS")
