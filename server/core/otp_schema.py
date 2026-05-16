"""Detect OTP table shape and run legacy SQL when migration 0039 is not applied yet."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime

from django.core.cache import cache
from django.db import connection
from django.utils import timezone

from core.models import OtpVerification

_LOG = logging.getLogger(__name__)

_CACHE_KEY = "lf:otp_schema_has_purpose_v1"
_LEGACY_FIELDS = ("id", "phone_digits", "code", "created_at", "expires_at", "used_at")


@dataclass(frozen=True)
class OtpHandle:
    """Minimal OTP row handle (works for legacy SQL rows and ORM instances)."""

    pk: uuid.UUID

    def delete(self) -> None:
        if otp_schema_has_purpose():
            OtpVerification.objects.filter(pk=self.pk).delete()
        else:
            table = OtpVerification._meta.db_table
            with connection.cursor() as cursor:
                cursor.execute(f"DELETE FROM {table} WHERE id = %s", [str(self.pk)])


def otp_schema_has_purpose() -> bool:
    """True when migration 0039+ applied (purpose + email columns exist)."""
    cached = cache.get(_CACHE_KEY)
    if cached is not None:
        return bool(cached)

    table = OtpVerification._meta.db_table
    has_purpose = False
    try:
        with connection.cursor() as cursor:
            description = connection.introspection.get_table_description(cursor, table)
        has_purpose = any(col.name == "purpose" for col in description)
    except Exception:
        _LOG.exception("OTP schema introspection failed; using legacy OTP SQL")
        has_purpose = False

    cache.set(_CACHE_KEY, has_purpose, timeout=300)
    return has_purpose


def invalidate_otp_schema_cache() -> None:
    cache.delete(_CACHE_KEY)


def legacy_otp_queryset():
    return OtpVerification.objects.only(*_LEGACY_FIELDS)


def legacy_rate_count(*, phone_digits: str = "", email: str = "", since: datetime) -> int:
    table = OtpVerification._meta.db_table
    if phone_digits:
        sql = (
            f"SELECT COUNT(*) FROM {table} "
            "WHERE phone_digits = %s AND created_at >= %s"
        )
        params = [phone_digits, since]
    elif email:
        # Legacy table has no email column; cannot rate-limit by email.
        return 0
    else:
        return 0
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = cursor.fetchone()
    return int(row[0] if row else 0)


def legacy_create_otp(*, phone_digits: str, code: str, expires_at: datetime) -> OtpHandle:
    table = OtpVerification._meta.db_table
    otp_id = uuid.uuid4()
    now = timezone.now()
    with connection.cursor() as cursor:
        cursor.execute(
            f"INSERT INTO {table} (id, phone_digits, code, created_at, expires_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            [str(otp_id), phone_digits, code, now, expires_at],
        )
    return OtpHandle(pk=otp_id)


def legacy_find_valid_otp(*, phone_digits: str, code: str, now: datetime) -> OtpHandle | None:
    table = OtpVerification._meta.db_table
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT id FROM {table}
            WHERE phone_digits = %s AND code = %s
              AND used_at IS NULL AND expires_at >= %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            [phone_digits, code, now],
        )
        row = cursor.fetchone()
    if not row:
        return None
    return OtpHandle(pk=uuid.UUID(str(row[0])))


def legacy_mark_used(*, otp_id: uuid.UUID, used_at: datetime) -> None:
    table = OtpVerification._meta.db_table
    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET used_at = %s WHERE id = %s",
            [used_at, str(otp_id)],
        )
