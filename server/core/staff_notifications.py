"""In-app notifications for staff (super admins) and admin broadcast fan-out to users."""

from __future__ import annotations

import re
import uuid
from django.contrib.auth import get_user_model
from django.db.models import Q

from core.models import AdminBroadcast, UserInAppNotification

User = get_user_model()


def super_admin_users():
    return (
        User.objects.filter(is_active=True, is_staff=True)
        .filter(Q(is_superuser=True) | Q(role__key="super_admin"))
        .distinct()
    )


def notify_super_admins_in_app(*, title: str, body: str, link: str = "") -> None:
    """Create one unread in-app row per super admin (staff inbox)."""
    admins = super_admin_users()
    if not admins:
        return
    rows = [
        UserInAppNotification(user=u, title=title[:255], body=body or "", read=False, link=(link or "")[:512], broadcast=None)
        for u in admins
    ]
    UserInAppNotification.objects.bulk_create(rows)


def _norm_phone(s: str) -> str:
    return re.sub(r"\D+", "", s or "")


def resolve_broadcast_recipients(delivery: dict) -> list[User]:
    """Resolve targeted users from admin UI delivery JSON (in-app channel)."""
    if not delivery.get("channelInApp", True):
        return []

    ids: set[uuid.UUID] = set()

    for aud in delivery.get("bulkAudiences") or []:
        if aud == "all_users":
            ids.update(User.objects.filter(is_active=True).values_list("id", flat=True))
        elif aud == "all_clients":
            ids.update(User.objects.filter(is_active=True, role__key="client").values_list("id", flat=True))
        elif aud == "all_subscribers":
            ids.update(User.objects.filter(is_active=True, subscribed=True).values_list("id", flat=True))
        elif aud == "staff":
            ids.update(User.objects.filter(is_active=True, is_staff=True).values_list("id", flat=True))

    raw_ind = (delivery.get("individualRecipients") or "").strip()
    if raw_ind:
        for line in raw_ind.splitlines():
            token = line.strip()
            if not token:
                continue
            if "@" in token:
                u = User.objects.filter(email__iexact=token).first()
                if u:
                    ids.add(u.id)
            else:
                try:
                    uid = uuid.UUID(token)
                except ValueError:
                    continue
                u = User.objects.filter(id=uid).first()
                if u:
                    ids.add(u.id)

    raw_phones = (delivery.get("bulkPhoneNumbers") or "").strip()
    if raw_phones:
        digits_set = {_norm_phone(line) for line in raw_phones.splitlines() if _norm_phone(line)}
        for u in User.objects.filter(is_active=True).only("id", "phone"):
            if _norm_phone(u.phone or "") in digits_set:
                ids.add(u.id)

    if not ids:
        # Admin UI defaults to in-app with no segments; without this, fan-out creates zero rows while
        # the broadcast still appears in the admin log — subscribers never see the message.
        has_explicit_targeting = bool(
            (delivery.get("bulkAudiences") or [])
            or (delivery.get("individualRecipients") or "").strip()
            or (delivery.get("bulkPhoneNumbers") or "").strip()
        )
        if delivery.get("channelInApp", True) and not has_explicit_targeting:
            ids.update(User.objects.filter(is_active=True).values_list("id", flat=True))
        else:
            return []
    return list(User.objects.filter(id__in=ids, is_active=True))


def fan_out_broadcast_in_app(broadcast: AdminBroadcast) -> int:
    """Create or refresh per-recipient UserInAppNotification rows for this broadcast."""
    recipients = resolve_broadcast_recipients(broadcast.delivery or {})
    if not recipients:
        return 0
    title = broadcast.title[:255]
    body = broadcast.body or ""
    link = (broadcast.link or "")[:512]
    existing = set(
        UserInAppNotification.objects.filter(broadcast=broadcast).values_list("user_id", flat=True)
    )
    desired = {u.id for u in recipients}
    to_remove = existing - desired
    if to_remove:
        UserInAppNotification.objects.filter(broadcast=broadcast, user_id__in=to_remove).delete()
    to_add = desired - existing
    if to_add:
        UserInAppNotification.objects.bulk_create(
            [
                UserInAppNotification(
                    user_id=uid,
                    title=title,
                    body=body,
                    read=False,
                    link=link,
                    broadcast=broadcast,
                )
                for uid in to_add
            ]
        )
    UserInAppNotification.objects.filter(broadcast=broadcast).update(title=title, body=body, link=link)
    return len(desired)


def sync_broadcast_metadata_to_recipients(broadcast: AdminBroadcast) -> None:
    UserInAppNotification.objects.filter(broadcast=broadcast).update(
        title=broadcast.title[:255],
        body=broadcast.body or "",
        link=(broadcast.link or "")[:512],
    )
