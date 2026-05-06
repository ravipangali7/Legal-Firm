"""Send transactional email using site SMTP settings (e.g. Gmail with app password)."""

from __future__ import annotations

import logging
from typing import Literal

from django.core.mail import EmailMessage, get_connection

from core.models import AppSettings

_LOG = logging.getLogger(__name__)

EmailOutcome = Literal["sent", "skipped", "failed"]


def send_site_transactional_email_with_outcome(*, to_email: str, subject: str, body: str) -> tuple[EmailOutcome, str]:
    """
    Returns (status, detail). detail is empty on success, human-readable on skip/fail.
    """
    app = AppSettings.load()
    if not app.email_notifications:
        _LOG.info("Transactional email skipped: email_notifications is off (to=%s).", to_email)
        return ("skipped", "Email notifications disabled in site settings")
    host = (app.smtp_host or "").strip()
    if not host:
        _LOG.warning("Transactional email skipped: SMTP host not configured (to=%s).", to_email)
        return ("skipped", "SMTP host not configured")
    from_email = (app.support_email or "").strip()
    if not from_email:
        _LOG.warning("Transactional email skipped: support_email empty (to=%s).", to_email)
        return ("skipped", "Support/from email not set")
    port = int(app.smtp_port or 587)
    user = (app.smtp_user or "").strip()
    password = (app.smtp_pass or "").strip()
    from_name = (app.email_from_name or "").strip()
    use_ssl = port == 465
    use_tls = port in (587, 2525)
    try:
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=host,
            port=port,
            username=user or "",
            password=password,
            use_tls=use_tls,
            use_ssl=use_ssl,
            timeout=25,
        )
        from_header = f"{from_name} <{from_email}>" if from_name else from_email
        msg = EmailMessage(
            subject=subject,
            body=body,
            from_email=from_header,
            to=[to_email.strip()],
            connection=connection,
        )
        msg.send(fail_silently=False)
    except Exception as e:
        _LOG.exception("Transactional email failed for %s", to_email)
        return ("failed", str(e)[:500])
    return ("sent", "")


def send_site_transactional_email(*, to_email: str, subject: str, body: str) -> None:
    """
    Uses AppSettings: email_notifications, smtp_host/port/user/pass, support_email, email_from_name.
    Returns quietly when email is disabled or SMTP is not configured; raises only on send failure.
    """
    status, detail = send_site_transactional_email_with_outcome(to_email=to_email, subject=subject, body=body)
    if status == "failed":
        raise RuntimeError(detail or "SMTP send failed")
