"""Persist automated SMS/email/in-app sends as AdminBroadcast rows for the admin Notifications panel."""

from __future__ import annotations

from core.models import AdminBroadcast


def log_automated_admin_outbound(
    *,
    title: str,
    body: str,
    notification_type: str = AdminBroadcast.NotificationType.SYSTEM,
    link: str = "",
    outbound_report: dict | None = None,
) -> AdminBroadcast:
    """
    Creates a broadcast log row with all fan-out channels off so resolve_broadcast_recipients
    returns immediately and no users receive duplicate in-app rows from this record.
    """
    delivery: dict = {
        "channelInApp": False,
        "channelSms": False,
        "channelPush": False,
        "automatedOutbound": True,
    }
    if outbound_report:
        delivery["outboundReport"] = outbound_report
    return AdminBroadcast.objects.create(
        title=title[:255],
        body=body or "",
        notification_type=notification_type,
        link=(link or "")[:512],
        delivery=delivery,
        created_by=None,
    )
