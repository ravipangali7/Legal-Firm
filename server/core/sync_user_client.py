"""Sync CRM :class:`~core.models.Client` rows when a user has the ``client`` role."""

from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from core.models import Client, User, UserProfile


def sync_crm_client_for_user(user: User) -> None:
    """
    When ``user.role.key`` is ``client``, ensure a matching Client exists (lookup by email,
    case-insensitive). This matches :func:`core.project_notifications.notify_client_assigned_to_project`,
    which resolves portal users by client email.

    If the user's email was changed in the same save (see ``_crm_previous_email`` from
    :func:`core.signals.user_stash_previous_email_for_crm`), the existing CRM row for the
    previous address is updated in place so projects stay attached to one Client record.

    Uses a short atomic transaction with ``select_for_update`` so concurrent saves for the
    same addresses do not create duplicate CRM rows.
    """
    if user.role_key != User.RoleKey.CLIENT:
        return

    email = (user.email or "").strip()
    if not email:
        return

    try:
        prof = user.profile
    except UserProfile.DoesNotExist:
        prof = None

    raw_type = (prof.user_type if prof else UserProfile.UserType.INDIVIDUAL) or UserProfile.UserType.INDIVIDUAL
    if raw_type == UserProfile.UserType.BUSINESS:
        crm_type = Client.Type.BUSINESS
    else:
        crm_type = Client.Type.INDIVIDUAL

    pan = (prof.pan if prof else "") or ""
    vat = (prof.vat if prof else "") or ""
    pan_vat = (pan or vat)[:64]

    company_name = ((prof.company_name if prof else "") or "").strip()
    display_name = (user.full_name or "").strip()
    company = company_name or display_name or email.split("@", 1)[0]
    contact = display_name or company

    phone = ((user.phone or "").strip())[:64]

    crm_status = Client.Status.ACTIVE if user.status == User.Status.ACTIVE else Client.Status.INACTIVE

    created = getattr(user, "created_at", None)
    joined_fallback = created.date() if created else timezone.now().date()

    prev_raw = getattr(user, "_crm_previous_email", None)
    prev_email = (prev_raw or "").strip() if prev_raw else ""
    email_changed = bool(prev_email and prev_email.lower() != email.lower())

    data = {
        "company": company[:255],
        "contact": contact[:255],
        "email": email,
        "phone": phone,
        "type": crm_type,
        "pan_vat": pan_vat,
        "status": crm_status,
    }

    with transaction.atomic():
        q = Q(email__iexact=email)
        if email_changed:
            q |= Q(email__iexact=prev_email)
        locked = list(Client.objects.select_for_update().filter(q).order_by("joined_at"))

        target: Client | None = None
        if email_changed:
            target = next((c for c in locked if c.email.strip().lower() == prev_email.lower()), None)
        if target is None:
            target = next((c for c in locked if c.email.strip().lower() == email.lower()), None)
        if target is None and locked:
            target = locked[0]

        if target is not None:
            for k, v in data.items():
                setattr(target, k, v)
            target.save(update_fields=list(data.keys()))
            return

        try:
            Client.objects.create(**data, joined_at=joined_fallback)
        except IntegrityError:
            retry = Client.objects.select_for_update().filter(email__iexact=email).order_by("joined_at").first()
            if retry is None:
                raise
            for k, v in data.items():
                setattr(retry, k, v)
            retry.save(update_fields=list(data.keys()))
