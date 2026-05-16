"""Email, SMS, and in-app notices when a subscriber's package benefits end."""

from __future__ import annotations

import logging
from datetime import datetime

from django.conf import settings
from django.utils import formats

from core.models import AdminBroadcast, AppSettings, UserInAppNotification
from core.rbac import subscriber_portal_hub_prefix
from core.email_templates import base_email_context, send_templated_email
from core.models import EmailTemplate
from core.outbound_panel_log import log_automated_admin_outbound
from core.sms import phone_to_e164, send_sms

_LOG = logging.getLogger(__name__)


def _frontend_base() -> str:
    return (getattr(settings, "PUBLIC_APP_BASE_URL", None) or "http://localhost:5173").rstrip("/")


def notify_package_benefits_ended(user, *, ended_at: datetime) -> None:
    """
    Idempotent per (user, ended_at): caller sets last_notified_plan_benefits_end after this returns.
    Sends in-app notification, site email (if configured), and SMS (Aakash SMS or Twilio when configured).
    """
    site = AppSettings.load().site_name or "TaxLexis"
    hub = subscriber_portal_hub_prefix(user)
    wallet_url = f"{_frontend_base()}{hub}?tab=wallet"
    ended_label = formats.date_format(ended_at, "DATETIME_FORMAT") if ended_at else ""
    title = "Your package has ended"
    body = (
        f"Your subscription package access ended{f' on {ended_label}' if ended_label else ''}. "
        f"Renew or purchase again from your dashboard wallet: {wallet_url}"
    )

    outbound_report: dict = {}
    log_lines: list[str] = [
        f"User: {user.full_name or user.email} (id={user.pk})",
        f"Event: package benefits ended{f' ({ended_label})' if ended_label else ''}",
    ]

    try:
        UserInAppNotification.objects.create(
            user=user,
            title=title,
            body=body,
            read=False,
            link=f"{hub}?tab=wallet",
        )
        outbound_report["inApp"] = {"status": "sent", "to": str(user.pk), "detail": user.email}
        log_lines.append(f"In-app · sent · to {user.email}")
    except Exception:
        _LOG.exception("notify_package_benefits_ended in-app failed for user_id=%s", user.pk)
        outbound_report["inApp"] = {"status": "failed", "detail": "in-app row create failed"}
        log_lines.append("In-app · failed")

    ended_on = f" on {ended_label}" if ended_label else ""
    tpl_ctx = base_email_context(user=user)
    tpl_ctx["ended_on"] = ended_on
    tpl_ctx["wallet_url"] = wallet_url
    email_st, email_detail = send_templated_email(
        EmailTemplate.EventType.PACKAGE_ENDED,
        to_email=user.email,
        context=tpl_ctx,
        user=user,
    )
    outbound_report["email"] = {"status": email_st, "to": user.email, "detail": email_detail}
    log_lines.append(f"Email · {email_st} · {user.email}" + (f" · {email_detail}" if email_detail else ""))

    to = phone_to_e164(user.phone or "")
    if not to:
        _LOG.warning("Package expiry SMS skipped: user id=%s has no usable phone", user.pk)
        outbound_report["sms"] = {"status": "skipped", "detail": "no usable phone on user"}
        log_lines.append("SMS · skipped · no usable phone")
    else:
        sms_text = (
            f"Hello {(user.full_name or user.email or 'there').strip()}, {site}: your package has ended. "
            f"Renew in your account wallet. {wallet_url}"
        )
        if len(sms_text) > 1500:
            sms_text = sms_text[:1497] + "..."
        ok = send_sms(to, sms_text)
        st = "sent" if ok else "failed"
        outbound_report["sms"] = {
            "status": st,
            "to": to,
            "detail": "" if ok else "SMS send failed or SMS provider not configured",
        }
        log_lines.append(f"SMS · {st} · {to}")

    try:
        log_automated_admin_outbound(
            title=f"[Outbound] Package ended: {user.email}",
            body="\n".join(log_lines),
            notification_type=AdminBroadcast.NotificationType.WARNING,
            link="/admin/users",
            outbound_report=outbound_report,
        )
    except Exception:
        _LOG.exception("Failed to write admin panel outbound log for package benefits ended")
