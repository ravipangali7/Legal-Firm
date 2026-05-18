"""Daily view deduplication and persistent summary votes (public summaries)."""

from __future__ import annotations

import uuid
from typing import Any

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.engagement_schema import (
    summary_audience_vote_table_applied,
    summary_daily_view_table_applied,
)
from core.models import Summary, SummaryAudienceVote, SummaryDailyViewerView


def summary_actor_from_request(request) -> dict[str, Any]:
    """Resolve actor for views/votes: authenticated user or X-Visitor-Id (UUID)."""
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated:
        return {
            "kind": "user",
            "user": user,
            "actor_key": f"user:{user.pk}",
            "visitor_key": None,
        }
    raw = (request.headers.get("X-Visitor-Id") or "").strip()
    if not raw:
        return {"kind": "none", "user": None, "actor_key": None, "visitor_key": None}
    if len(raw) > 64:
        raw = raw[:64]
    try:
        uuid.UUID(raw)
    except ValueError:
        return {"kind": "invalid", "user": None, "actor_key": None, "visitor_key": None}
    return {"kind": "visitor", "user": None, "actor_key": f"visitor:{raw}", "visitor_key": raw}


@transaction.atomic
def record_summary_daily_views(actor_key: str, slugs: list[str]) -> int:
    """Increment Summary.views once per (summary, actor_key, UTC day). Returns number of new tallies."""
    if not actor_key or not summary_daily_view_table_applied():
        return 0
    day = timezone.now().date()
    created = 0
    clean = []
    for s in slugs:
        if isinstance(s, str) and s.strip():
            clean.append(s.strip()[:512])
        if len(clean) >= 500:
            break
    if not clean:
        return 0
    summaries = {s.slug: s for s in Summary.objects.filter(slug__in=clean)}
    for slug in clean:
        summary = summaries.get(slug)
        if not summary:
            continue
        _row, was_created = SummaryDailyViewerView.objects.get_or_create(
            summary_id=summary.id,
            actor_key=actor_key,
            day=day,
        )
        if was_created:
            Summary.objects.filter(pk=summary.pk).update(views=F("views") + 1)
            created += 1
    return created


def _dec_vote_field(summary_pk, field: str) -> None:
    Summary.objects.filter(pk=summary_pk, **{f"{field}__gt": 0}).update(**{field: F(field) - 1})


def _inc_vote_field(summary_pk, field: str) -> None:
    Summary.objects.filter(pk=summary_pk).update(**{field: F(field) + 1})


@transaction.atomic
def apply_summary_vote(*, actor: dict[str, Any], slug: str, vote: str | None) -> Summary | None:
    """
    vote: None clears vote; 'up' / 'down' sets or switches vote.
    """
    if actor["kind"] not in ("user", "visitor"):
        raise ValueError("bad_actor")
    if not summary_audience_vote_table_applied():
        raise ValueError("schema_unavailable")
    try:
        from core.seo_schema import summary_api_queryset

        summary = summary_api_queryset().select_for_update().get(slug=slug)
    except Summary.DoesNotExist:
        return None

    user = actor["user"] if actor["kind"] == "user" else None
    visitor_key = actor["visitor_key"] if actor["kind"] == "visitor" else None

    base_qs = SummaryAudienceVote.objects.select_for_update().filter(summary=summary)
    if user is not None:
        existing = base_qs.filter(user=user).first()
    else:
        existing = base_qs.filter(visitor_key=visitor_key).first()

    if vote is None:
        if existing:
            if existing.vote == SummaryAudienceVote.Vote.UP:
                _dec_vote_field(summary.pk, "upvotes")
            else:
                _dec_vote_field(summary.pk, "downvotes")
            existing.delete()
        summary.refresh_from_db()
        return summary

    if vote not in (SummaryAudienceVote.Vote.UP, SummaryAudienceVote.Vote.DOWN):
        raise ValueError("bad_vote")

    if existing is None:
        SummaryAudienceVote.objects.create(
            summary=summary,
            user=user,
            visitor_key=visitor_key,
            vote=vote,
        )
        if vote == SummaryAudienceVote.Vote.UP:
            _inc_vote_field(summary.pk, "upvotes")
        else:
            _inc_vote_field(summary.pk, "downvotes")
    elif existing.vote != vote:
        if existing.vote == SummaryAudienceVote.Vote.UP:
            _dec_vote_field(summary.pk, "upvotes")
            _inc_vote_field(summary.pk, "downvotes")
        else:
            _dec_vote_field(summary.pk, "downvotes")
            _inc_vote_field(summary.pk, "upvotes")
        existing.vote = vote
        existing.save(update_fields=["vote"])

    summary.refresh_from_db()
    return summary
