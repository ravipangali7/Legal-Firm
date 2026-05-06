"""When a CRM client is assigned to a project, notify by email, SMS, and in-app (if a user matches the client email)."""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model

from core.models import AdminBroadcast, Client, Project, UserInAppNotification
from core.rbac import subscriber_portal_hub_prefix
from core.outbound_email import send_site_transactional_email_with_outcome
from core.outbound_panel_log import log_automated_admin_outbound
from core.sms import phone_to_e164, send_sms

_LOG = logging.getLogger(__name__)
User = get_user_model()


def standard_project_client_assignment_message(*, project: Project) -> str:
    """Single user-facing line used on every channel (email, SMS, in-app)."""
    return f"Your new task here [{project.name}]"


def notify_client_assigned_to_project(*, client: Client, project: Project) -> None:
    """
    - Email: Client.email via site SMTP (Gmail and others configured in App Settings).
    - SMS: Client.phone via Twilio when TWILIO_* env vars are set.
    - In-app: first active User with same email as the client (case-insensitive), if any.

    The same short message is used for subject/body/title on all channels.
    """
    message = standard_project_client_assignment_message(project=project)
    outbound_report: dict = {}
    admin_body = "\n".join(
        [
            "Automated client assignment on a project.",
            f"Project: {project.name}",
            f"Client: {client.company} — {client.contact} ({client.email})",
        ]
    )

    user = (
        User.objects.filter(email__iexact=(client.email or "").strip(), is_active=True)
        .order_by("-date_joined")
        .first()
    )
    if user:
        try:
            hub = subscriber_portal_hub_prefix(user)
            UserInAppNotification.objects.create(
                user=user,
                title=message[:255],
                body=message,
                read=False,
                link=hub,
            )
            outbound_report["inApp"] = {"status": "sent", "to": str(user.pk), "detail": user.email}
        except Exception:
            _LOG.exception("Project assignment in-app notification failed for user_id=%s", user.pk)
            outbound_report["inApp"] = {"status": "failed", "to": str(user.pk), "detail": "create row failed"}
    else:
        outbound_report["inApp"] = {"status": "skipped", "detail": "no active user with this email"}

    email_st, email_detail = send_site_transactional_email_with_outcome(
        to_email=client.email,
        subject=message,
        body=f"{message}\n",
    )
    outbound_report["email"] = {"status": email_st, "to": client.email, "detail": email_detail}
    if email_st == "failed":
        _LOG.warning("Project assignment email failed to %s: %s", client.email, email_detail)

    to = phone_to_e164(client.phone or "")
    if not to:
        _LOG.info("Project assignment SMS skipped: client_id=%s has no usable phone", client.pk)
        outbound_report["sms"] = {"status": "skipped", "detail": "no usable phone on client record"}
    else:
        sms_text = message
        if len(sms_text) > 1500:
            sms_text = sms_text[:1497] + "..."
        ok = send_sms(to, sms_text)
        st = "sent" if ok else "failed"
        outbound_report["sms"] = {"status": st, "to": to, "detail": "" if ok else "Twilio send failed or not configured"}

    try:
        log_automated_admin_outbound(
            title=f"[Outbound] {message}"[:255],
            body=admin_body,
            notification_type=AdminBroadcast.NotificationType.SYSTEM,
            link="/admin/projects",
            outbound_report=outbound_report,
        )
    except Exception:
        _LOG.exception("Failed to write admin panel outbound log for project assignment")
