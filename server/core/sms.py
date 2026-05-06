"""Outbound SMS — Twilio when configured, otherwise logs (same pattern as OTP in dev)."""

from __future__ import annotations

import base64
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


def send_sms(to_e164: str, body: str) -> bool:
    """
    Send SMS via Twilio REST if TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER are set.
    Otherwise logs the message (development / missing config).
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    if not (account_sid and auth_token and from_num):
        _LOG.warning(
            "SMS not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER). to=%s body=%s",
            to_e164,
            body[:500],
        )
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
        outbound_report["sms"] = {"status": st, "to": to, "detail": "" if ok else "Twilio send failed or not configured"}
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
        outbound_report["sms"] = {"status": st, "to": to, "detail": "" if ok else "Twilio send failed or not configured"}
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
