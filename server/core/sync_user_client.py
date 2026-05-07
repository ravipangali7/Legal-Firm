"""Sync CRM :class:`~core.models.Client` rows when a user has the ``client`` role."""

from __future__ import annotations

from django.utils import timezone

from core.models import Client, User, UserProfile


def sync_crm_client_for_user(user: User) -> None:
    """
    When ``user.role.key`` is ``client``, ensure a matching Client exists (lookup by email,
    case-insensitive). This matches :func:`core.project_notifications.notify_client_assigned_to_project`,
    which resolves portal users by client email.
    """
    pk = getattr(user, "pk", None)
    if pk is None:
        return
    # Always read role + profile from the DB so this stays correct after PATCH (in-memory
    # ``user`` from serializers/signals can lag behind ``role_id`` / profile writes).
    try:
        user = User.objects.select_related("role", "profile").get(pk=pk)
    except User.DoesNotExist:
        return

    role_key = getattr(getattr(user, "role", None), "key", "") or ""
    if role_key != "client":
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

    existing = Client.objects.filter(email__iexact=email).first()

    data = {
        "company": company[:255],
        "contact": contact[:255],
        "email": email,
        "phone": phone,
        "type": crm_type,
        "pan_vat": pan_vat,
        "status": crm_status,
    }

    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        existing.save(update_fields=list(data.keys()))
        return

    Client.objects.create(**data, joined_at=joined_fallback)
