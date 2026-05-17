"""Detect EmailTemplate table shape (core migrations 0039 / 0040+)."""

from __future__ import annotations

import logging

from django.core.cache import cache
from django.db import connection

from core.models import EmailTemplate

_LOG = logging.getLogger(__name__)

_CACHE_KEY = "lf:email_tpl_schema_has_automate_v1"


def email_template_schema_has_automate() -> bool:
    """True when migration 0040+ applied (``automate`` column exists)."""
    cached = cache.get(_CACHE_KEY)
    if cached is not None:
        return bool(cached)

    table = EmailTemplate._meta.db_table
    has_automate = False
    try:
        if table not in connection.introspection.table_names():
            has_automate = False
        else:
            with connection.cursor() as cursor:
                description = connection.introspection.get_table_description(cursor, table)
            has_automate = any(col.name == "automate" for col in description)
    except Exception:
        _LOG.exception("EmailTemplate schema introspection failed")
        has_automate = False

    cache.set(_CACHE_KEY, has_automate, timeout=300)
    return has_automate


def invalidate_email_template_schema_cache() -> None:
    cache.delete(_CACHE_KEY)


def email_templates_schema_unavailable_detail() -> str | None:
    """
    Return an API-safe detail string when templates cannot be loaded, else ``None``.
    """
    table = EmailTemplate._meta.db_table
    try:
        tables = connection.introspection.table_names()
    except Exception:
        _LOG.exception("EmailTemplate table introspection failed")
        return EMAIL_TEMPLATES_SCHEMA_UNAVAILABLE_DETAIL

    if table not in tables:
        return (
            "Email templates are unavailable: the database table has not been created yet. "
            "On the server, run: python manage.py ensure_otp_migrations"
        )
    if not email_template_schema_has_automate():
        return (
            "Email templates are unavailable: a pending database migration is required "
            "(automate column). On the server, run: python manage.py ensure_otp_migrations"
        )
    return None


EMAIL_TEMPLATES_SCHEMA_UNAVAILABLE_DETAIL = (
    "Email templates are unavailable. "
    "If the site was recently updated, run on the server: "
    "python manage.py ensure_otp_migrations"
)
