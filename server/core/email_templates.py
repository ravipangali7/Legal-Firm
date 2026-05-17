"""Render and send staff-configured transactional emails."""

from __future__ import annotations

import logging
import re
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import DatabaseError
from django.utils import formats

from core.models import AppSettings, EmailTemplate
from core.outbound_email import send_site_transactional_email_with_outcome

_LOG = logging.getLogger(__name__)

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")

# Legacy trigger keys → ``EmailTemplate.automate`` choice.
EVENT_TYPE_TO_AUTOMATE: dict[str, str] = {
    EmailTemplate.EventType.SIGNUP: EmailTemplate.Automate.SIGN_UP,
    EmailTemplate.EventType.LOGIN: EmailTemplate.Automate.LOGIN,
    EmailTemplate.EventType.OTP_LOGIN: EmailTemplate.Automate.OTP,
    EmailTemplate.EventType.PASSWORD_RESET: EmailTemplate.Automate.OTP,
    EmailTemplate.EventType.PAYMENT_VERIFIED: EmailTemplate.Automate.PAID,
    EmailTemplate.EventType.PAYMENT_PENDING: EmailTemplate.Automate.PAID,
    EmailTemplate.EventType.PAYMENT_REJECTED: EmailTemplate.Automate.PAID,
    EmailTemplate.EventType.SUBSCRIPTION_DUE: EmailTemplate.Automate.PAYMENT_DUE,
    EmailTemplate.EventType.PACKAGE_ENDED: EmailTemplate.Automate.PAYMENT_DUE,
}

DEFAULT_EMAIL_TEMPLATES: list[dict[str, str]] = [
    {
        "automate": EmailTemplate.Automate.SIGN_UP,
        "event_type": EmailTemplate.EventType.SIGNUP,
        "name": "Sign up welcome",
        "subject": "{{site_name}}: Welcome — account pending approval",
        "body": (
            "Hello {{user_name}},\n\n"
            "Thank you for registering at {{site_name}}. Your account ({{user_email}}) is pending approval. "
            "We will notify you when you can sign in.\n\n"
            "Sign in: {{login_url}}\n\n"
            "If you did not create this account, contact {{support_email}}."
        ),
        "description": "Sent after a new user completes signup.",
    },
    {
        "automate": EmailTemplate.Automate.LOGIN,
        "event_type": EmailTemplate.EventType.LOGIN,
        "name": "Login thank you",
        "subject": "{{site_name}}: Thank you for signing in",
        "body": (
            "Hello {{user_name}},\n\n"
            "Thank you for signing in to {{site_name}} on {{login_time}}.\n\n"
            "If this was not you, reset your password or contact {{support_email}} immediately."
        ),
        "description": "Sent after a successful sign-in.",
    },
    {
        "automate": EmailTemplate.Automate.OTP,
        "event_type": EmailTemplate.EventType.OTP_LOGIN,
        "name": "OTP verification",
        "subject": "{{site_name}}: Your verification code",
        "body": (
            "Hello {{user_name}},\n\n"
            "Your verification code is {{otp_code}}. It expires in {{otp_expiry_minutes}} minutes.\n\n"
            "Do not share this code. For password reset, visit: {{reset_url}}"
        ),
        "description": "Sent for phone login OTP and forgot-password OTP (email and SMS).",
    },
    {
        "automate": EmailTemplate.Automate.PAYMENT_DUE,
        "event_type": EmailTemplate.EventType.SUBSCRIPTION_DUE,
        "name": "Payment due",
        "subject": "{{site_name}}: Your subscription renewal is due",
        "body": (
            "Hello {{user_name}},\n\n"
            "Your paid subscription period ended on {{subscription_end_date}}, but your library benefits "
            "remain active until {{package_end_date}}. Renew now:\n\n"
            "{{wallet_url}}\n\n"
            "If your package has already ended{{ended_on}}, renew from your wallet to restore access."
        ),
        "description": "Sent when renewal is due or package access has ended.",
    },
    {
        "automate": EmailTemplate.Automate.PAID,
        "event_type": EmailTemplate.EventType.PAYMENT_VERIFIED,
        "name": "Payment paid",
        "subject": "{{site_name}}: Payment update — {{invoice}}",
        "body": (
            "Hello {{user_name}},\n\n"
            "Payment for invoice {{invoice}}: {{amount}} {{currency}}.\n"
            "Plan: {{plan}} ({{billing_cycle}}).\n"
            "Access until: {{package_end_date}}.\n\n"
            "{{wallet_url}}"
        ),
        "description": "Sent when a payment is verified, pending, or rejected (use placeholders as needed).",
    },
    {
        "automate": EmailTemplate.Automate.SUBSCRIBED,
        "event_type": "",
        "name": "Subscribed",
        "subject": "{{site_name}}: Your subscription is active",
        "body": (
            "Hello {{user_name}},\n\n"
            "Your {{plan}} subscription at {{site_name}} is now active. "
            "Library access runs until {{package_end_date}}.\n\n"
            "Manage your account: {{wallet_url}}"
        ),
        "description": "Sent when a subscription payment is verified and access is granted.",
    },
]


def _frontend_base() -> str:
    return (getattr(settings, "PUBLIC_APP_BASE_URL", None) or "http://localhost:5173").rstrip("/")


def base_email_context(*, user=None) -> dict[str, str]:
    app = AppSettings.load()
    site = app.site_name or "TaxLexis"
    ctx: dict[str, str] = {
        "site_name": site,
        "support_email": (app.support_email or "").strip(),
        "login_url": f"{_frontend_base()}/login",
        "reset_url": f"{_frontend_base()}/forgot-password",
        "wallet_url": f"{_frontend_base()}/dashboard?tab=wallet",
    }
    if user is not None:
        ctx["user_name"] = (getattr(user, "full_name", None) or getattr(user, "email", None) or "there").strip()
        ctx["user_email"] = (getattr(user, "email", None) or "").strip()
        try:
            from core.rbac import subscriber_portal_hub_prefix

            hub = subscriber_portal_hub_prefix(user)
            ctx["wallet_url"] = f"{_frontend_base()}{hub}?tab=wallet"
        except Exception:
            pass
    return ctx


def render_template_text(text: str, context: dict[str, Any]) -> str:
    def repl(match: re.Match) -> str:
        key = match.group(1)
        val = context.get(key)
        if val is None:
            return ""
        return str(val)

    return _PLACEHOLDER_RE.sub(repl, text)


def get_email_template_by_automate(automate: str) -> EmailTemplate | None:
    try:
        return EmailTemplate.objects.get(automate=automate)
    except EmailTemplate.DoesNotExist:
        return None
    except DatabaseError:
        _LOG.exception("EmailTemplate lookup failed for automate=%s", automate)
        return None


def get_email_template(event_type: str) -> EmailTemplate | None:
    automate = EVENT_TYPE_TO_AUTOMATE.get(event_type)
    if automate:
        return get_email_template_by_automate(automate)
    try:
        return EmailTemplate.objects.get(event_type=event_type)
    except EmailTemplate.DoesNotExist:
        return None
    except DatabaseError:
        _LOG.exception("EmailTemplate lookup failed for event_type=%s", event_type)
        return None


def send_templated_email(
    event_type: str,
    *,
    to_email: str,
    context: dict[str, Any] | None = None,
    user=None,
) -> tuple[str, str]:
    """
    Returns (status, detail) using the same outcomes as outbound_email.
    status is sent | skipped | failed; detail is empty on success.
    """
    to = (to_email or "").strip()
    if not to:
        return ("skipped", "no recipient email")

    tpl = get_email_template(event_type)
    if tpl is None or not tpl.enabled:
        if tpl is None:
            _LOG.warning("No EmailTemplate for event_type=%s", event_type)
        return ("skipped", "template disabled or missing")

    merged = {**base_email_context(user=user), **(context or {})}
    subject = render_template_text(tpl.subject, merged)
    body = render_template_text(tpl.body, merged)
    return send_site_transactional_email_with_outcome(to_email=to, subject=subject, body=body)


def send_automated_email(
    automate: str,
    *,
    to_email: str,
    context: dict[str, Any] | None = None,
    user=None,
) -> tuple[str, str]:
    """Send using the ``automate`` choice directly (login, sign_up, otp, …)."""
    to = (to_email or "").strip()
    if not to:
        return ("skipped", "no recipient email")
    tpl = get_email_template_by_automate(automate)
    if tpl is None or not tpl.enabled:
        return ("skipped", "template disabled or missing")
    merged = {**base_email_context(user=user), **(context or {})}
    subject = render_template_text(tpl.subject, merged)
    body = render_template_text(tpl.body, merged)
    return send_site_transactional_email_with_outcome(to_email=to, subject=subject, body=body)


def seed_default_email_templates() -> None:
    for row in DEFAULT_EMAIL_TEMPLATES:
        EmailTemplate.objects.update_or_create(
            automate=row["automate"],
            defaults={
                "event_type": row.get("event_type") or "",
                "name": row["name"],
                "subject": row["subject"],
                "body": row["body"],
                "description": row.get("description", ""),
                "enabled": True,
            },
        )


EMAIL_TEMPLATES_SCHEMA_UNAVAILABLE_DETAIL = (
    "Email templates are unavailable. "
    "If the site was recently updated, run: python manage.py migrate"
)


def ordered_email_templates_queryset():
    """Staff API list ordering; raises :class:`~django.db.DatabaseError` when migrations are missing."""
    return EmailTemplate.objects.order_by("automate")


def load_email_templates_for_admin() -> tuple[Any | None, str | None]:
    """
    Return (queryset, None) on success, or (None, detail) when the table is missing or the DB fails.
    Seeds default rows when the table exists but is empty.
    """
    try:
        qs = ordered_email_templates_queryset()
        if not qs.exists():
            seed_default_email_templates()
            qs = ordered_email_templates_queryset()
        return qs, None
    except DatabaseError:
        _LOG.exception("EmailTemplate load/seed failed (database schema or DB error)")
        return None, EMAIL_TEMPLATES_SCHEMA_UNAVAILABLE_DETAIL


def maybe_send_subscription_due_email(user) -> None:
    from core.subscription_service import renewal_recommended

    if not renewal_recommended(user):
        return
    end = user.subscription_period_end
    if end is None:
        return
    cache_key = f"lf:sub_due_email:{user.pk}:{end.isoformat()}"
    if cache.get(cache_key):
        return
    ctx = base_email_context(user=user)
    if user.subscription_period_end:
        ctx["subscription_end_date"] = formats.date_format(user.subscription_period_end, "DATETIME_FORMAT")
    if user.plan_benefits_end:
        ctx["package_end_date"] = formats.date_format(user.plan_benefits_end, "DATETIME_FORMAT")
    st, _ = send_automated_email(
        EmailTemplate.Automate.PAYMENT_DUE,
        to_email=user.email,
        context=ctx,
        user=user,
    )
    if st == "sent":
        cache.set(cache_key, 1, timeout=60 * 60 * 24 * 90)
