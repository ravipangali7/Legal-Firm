"""Transactional emails and OTP delivery for auth flows."""

from __future__ import annotations

import logging
from datetime import timedelta
from secrets import randbelow

from django.conf import settings
from django.db import DatabaseError
from django.utils import timezone

from core.email_templates import base_email_context, send_templated_email
from core.models import AppSettings, EmailTemplate, OtpVerification
from core.sms import phone_to_e164, send_sms

_LOG = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 10
OTP_MAX_PER_HOUR = 10

OTP_SCHEMA_UNAVAILABLE_DETAIL = (
    "Verification is temporarily unavailable. "
    "If the site was recently updated, run: python manage.py migrate"
)


def _is_synthetic_phone_email(email: str) -> bool:
    return (email or "").strip().lower().endswith("@phone.local")


def _otp_rate_exceeded(*, purpose: str, phone_digits: str = "", email: str = "") -> bool:
    hour_ago = timezone.now() - timedelta(hours=1)
    try:
        qs = OtpVerification.objects.filter(purpose=purpose, created_at__gte=hour_ago)
        if phone_digits:
            return qs.filter(phone_digits=phone_digits).count() >= OTP_MAX_PER_HOUR
        if email:
            return qs.filter(email__iexact=email).count() >= OTP_MAX_PER_HOUR
        return False
    except DatabaseError:
        _LOG.exception("OTP rate-limit check failed (database schema or DB error)")
        raise


def create_otp(*, purpose: str, phone_digits: str = "", email: str = "") -> tuple[OtpVerification, str]:
    code = f"{randbelow(1_000_000):06d}"
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    try:
        otp = OtpVerification.objects.create(
            purpose=purpose,
            phone_digits=phone_digits or "",
            email=(email or "").strip().lower(),
            code=code,
            expires_at=expires_at,
        )
    except DatabaseError:
        _LOG.exception("OTP create failed (database schema or DB error)")
        raise
    return otp, code


def send_signup_email(user) -> None:
    send_templated_email(
        EmailTemplate.EventType.SIGNUP,
        to_email=user.email,
        context=base_email_context(user=user),
        user=user,
    )


def send_login_email(user) -> None:
    ctx = base_email_context(user=user)
    ctx["login_time"] = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")
    send_templated_email(
        EmailTemplate.EventType.LOGIN,
        to_email=user.email,
        context=ctx,
        user=user,
    )


def send_otp_login_email(user, *, code: str) -> bool:
    ctx = base_email_context(user=user)
    ctx["otp_code"] = code
    ctx["otp_expiry_minutes"] = str(OTP_EXPIRY_MINUTES)
    st, _ = send_templated_email(
        EmailTemplate.EventType.OTP_LOGIN,
        to_email=user.email,
        context=ctx,
        user=user,
    )
    return st == "sent"


def deliver_phone_login_otp(user, *, digits: str, code: str) -> tuple[bool, str | None]:
    """Send login OTP via SMS and/or email. Returns (delivered, error_detail)."""
    site = AppSettings.load().site_name or "TaxLexis"
    sms_ok = False
    to_e164 = phone_to_e164((user.phone or "").strip()) or phone_to_e164(digits)
    if to_e164:
        sms_body = (
            f"{site}: your login code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes. "
            "Do not share this code."
        )
        sms_ok = send_sms(to_e164, sms_body)
    email_ok = (
        bool(user.email)
        and not _is_synthetic_phone_email(user.email)
        and send_otp_login_email(user, code=code)
    )
    if sms_ok or email_ok:
        return True, None
    if not to_e164 and not user.email:
        return False, "No valid phone number or email on file."
    return False, "Could not deliver verification code."


def deliver_password_reset_otp(user, *, digits: str, email: str, code: str) -> None:
    site = AppSettings.load().site_name or "TaxLexis"
    ctx = base_email_context(user=user)
    ctx["otp_code"] = code
    ctx["otp_expiry_minutes"] = str(OTP_EXPIRY_MINUTES)

    if email:
        send_templated_email(
            EmailTemplate.EventType.PASSWORD_RESET,
            to_email=email,
            context=ctx,
            user=user,
        )
    if digits:
        to_e164 = phone_to_e164((user.phone or "").strip()) or phone_to_e164(digits)
        if to_e164:
            sms_body = (
                f"{site}: your password reset code is {code}. "
                f"It expires in {OTP_EXPIRY_MINUTES} minutes. Do not share this code."
            )
            send_sms(to_e164, sms_body)
