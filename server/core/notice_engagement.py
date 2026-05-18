"""Daily view deduplication for public notices (mirrors summary view tracking)."""

from __future__ import annotations

import uuid

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.engagement_schema import (
    notice_audience_vote_table_applied,
    notice_daily_view_table_applied,
)
from core.models import Notice, NoticeAudienceVote, NoticeDailyViewerView


def notice_actor_from_request(request) -> dict:
    """Resolve actor for notice views/votes: authenticated user or X-Visitor-Id (UUID)."""
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
    return {
        "kind": "visitor",
        "user": None,
        "actor_key": f"visitor:{raw}",
        "visitor_key": raw,
    }


@transaction.atomic
def record_notice_daily_views(actor_key: str, ids: list[str]) -> int:
    """Increment Notice.view_count once per (notice, actor_key, UTC day). Returns number of new tallies."""
    if not actor_key or not notice_daily_view_table_applied():
        return 0
    day = timezone.now().date()
    created = 0
    clean: list[uuid.UUID] = []
    for raw in ids:
        if not isinstance(raw, str) or not raw.strip():
            continue
        try:
            clean.append(uuid.UUID(raw.strip()))
        except ValueError:
            continue
        if len(clean) >= 500:
            break
    if not clean:
        return 0
    notices = {n.id: n for n in Notice.objects.filter(id__in=clean, published=True)}
    for nid in clean:
        notice = notices.get(nid)
        if not notice:
            continue
        _row, was_created = NoticeDailyViewerView.objects.get_or_create(
            notice_id=notice.id,
            actor_key=actor_key,
            day=day,
        )
        if was_created:
            Notice.objects.filter(pk=notice.pk).update(view_count=F("view_count") + 1)
            created += 1
    return created


def _dec_notice_vote_field(notice_pk, field: str) -> None:
    Notice.objects.filter(pk=notice_pk, **{f"{field}__gt": 0}).update(**{field: F(field) - 1})


def _inc_notice_vote_field(notice_pk, field: str) -> None:
    Notice.objects.filter(pk=notice_pk).update(**{field: F(field) + 1})


@transaction.atomic
def apply_notice_vote(*, actor: dict, notice_slug: str, vote: str | None) -> Notice | None:
    """
    vote: None clears vote; 'up' / 'down' sets or switches vote.
    actor: same shape as summary_actor_from_request (kind, user, actor_key, visitor_key).
    """
    if actor["kind"] not in ("user", "visitor"):
        raise ValueError("bad_actor")
    if not notice_audience_vote_table_applied():
        raise ValueError("schema_unavailable")
    try:
        from core.seo_schema import notice_detail_queryset

        notice = notice_detail_queryset().select_for_update().get(
            slug=notice_slug, published=True
        )
    except Notice.DoesNotExist:
        return None

    user = actor["user"] if actor["kind"] == "user" else None
    visitor_key = actor["visitor_key"] if actor["kind"] == "visitor" else None

    base_qs = NoticeAudienceVote.objects.select_for_update().filter(notice=notice)
    if user is not None:
        existing = base_qs.filter(user=user).first()
    else:
        existing = base_qs.filter(visitor_key=visitor_key).first()

    if vote is None:
        if existing:
            if existing.vote == NoticeAudienceVote.Vote.UP:
                _dec_notice_vote_field(notice.pk, "upvotes")
            else:
                _dec_notice_vote_field(notice.pk, "downvotes")
            existing.delete()
        notice.refresh_from_db()
        return notice

    if vote not in (NoticeAudienceVote.Vote.UP, NoticeAudienceVote.Vote.DOWN):
        raise ValueError("bad_vote")

    if existing is None:
        NoticeAudienceVote.objects.create(
            notice=notice,
            user=user,
            visitor_key=visitor_key,
            vote=vote,
        )
        if vote == NoticeAudienceVote.Vote.UP:
            _inc_notice_vote_field(notice.pk, "upvotes")
        else:
            _inc_notice_vote_field(notice.pk, "downvotes")
    elif existing.vote != vote:
        if existing.vote == NoticeAudienceVote.Vote.UP:
            _dec_notice_vote_field(notice.pk, "upvotes")
            _inc_notice_vote_field(notice.pk, "downvotes")
        else:
            _dec_notice_vote_field(notice.pk, "downvotes")
            _inc_notice_vote_field(notice.pk, "upvotes")
        existing.vote = vote
        existing.save(update_fields=["vote"])

    notice.refresh_from_db()
    return notice
