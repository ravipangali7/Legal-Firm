"""Phone normalization and lookup for OTP login (Nepal-style +977 / local digits)."""

from __future__ import annotations

import re

from django.contrib.auth import get_user_model


def normalize_phone_digits(raw: str) -> str:
    """Strip to digits; use last 10 digits as canonical mobile match when possible."""
    d = re.sub(r"\D", "", (raw or "").strip())
    if len(d) >= 10:
        return d[-10:]
    return d


def phone_login_email(digits: str) -> str:
    """Synthetic unique email for phone-only accounts (must stay in sync with admin create)."""
    return f"p{digits}@phone.local"


def find_user_by_phone_digits(digits: str):
    """Resolve user by canonical phone digits (profile phone or synthetic email)."""
    if len(digits) < 10:
        return None
    User = get_user_model()
    target_email = phone_login_email(digits).lower()
    u = User.objects.filter(email__iexact=target_email).first()
    if u:
        return u
    for user in User.objects.exclude(phone="").iterator():
        if normalize_phone_digits(user.phone) == digits:
            return user
    return None
