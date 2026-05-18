"""Detect whether summary/notice engagement tables exist (migration 0019 / 0032+)."""

from __future__ import annotations

from functools import lru_cache

from django.db import connection


@lru_cache(maxsize=1)
def _table_names() -> frozenset[str]:
    try:
        return frozenset(connection.introspection.table_names())
    except Exception:
        return frozenset()


def invalidate_engagement_schema_cache() -> None:
    _table_names.cache_clear()


def _table_exists(table: str) -> bool:
    return table in _table_names()


def summary_audience_vote_table_applied() -> bool:
    from core.models import SummaryAudienceVote

    return _table_exists(SummaryAudienceVote._meta.db_table)


def summary_daily_view_table_applied() -> bool:
    from core.models import SummaryDailyViewerView

    return _table_exists(SummaryDailyViewerView._meta.db_table)


def notice_audience_vote_table_applied() -> bool:
    from core.models import NoticeAudienceVote

    return _table_exists(NoticeAudienceVote._meta.db_table)


def notice_daily_view_table_applied() -> bool:
    from core.models import NoticeDailyViewerView

    return _table_exists(NoticeDailyViewerView._meta.db_table)
