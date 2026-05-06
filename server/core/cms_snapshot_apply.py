"""Apply a homepage CMS snapshot from admin (same shape as GET /api/site/homepage/)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from django.db import transaction

from .models import (
    AboutSection,
    AboutStat,
    FooterColumn,
    FooterConfig,
    FooterLink,
    FooterSocialLink,
    HeroSlide,
    NewsItem,
    ServiceItem,
    SiteHomepageConfig,
    SiteNavChild,
    SiteNavItem,
    TeamMember,
    Testimonial,
    TestimonialsConfig,
)
from .homepage_payload import build_homepage_snapshot
from .image_uploads import assign_image_from_snapshot_value


def _parse_uuid(value) -> uuid.UUID | None:
    if value is None:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _parse_date(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return date.today()
        if "T" in s:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
        return date.fromisoformat(s[:10])
    return date.today()


def _apply_toggles_and_styles(data: dict) -> None:
    t = data.get("toggles")
    has_styles = "section_styles" in data
    if t is None and not has_styles:
        return
    cfg = SiteHomepageConfig.load()
    if isinstance(t, dict):
        if "hero" in t:
            cfg.section_hero = bool(t["hero"])
        if "about" in t:
            cfg.section_about = bool(t["about"])
        if "services" in t:
            cfg.section_services = bool(t["services"])
        if "team" in t:
            cfg.section_team = bool(t["team"])
        if "news" in t:
            cfg.section_news = bool(t["news"])
        if "testimonials" in t:
            cfg.section_testimonials = bool(t["testimonials"])
        if "footer" in t:
            cfg.section_footer = bool(t["footer"])
        if "procedures" in t:
            cfg.section_procedures = bool(t["procedures"])
    if has_styles:
        styles = data.get("section_styles")
        cfg.section_styles = styles if isinstance(styles, dict) else {}
    cfg.save()


def _apply_slides(slides: list) -> None:
    keep: set[uuid.UUID] = set()
    for i, s in enumerate(slides):
        sid = _parse_uuid(s.get("id"))
        order = int(s.get("order", i + 1))
        image_val = s.get("image")
        fields = {
            "order": order,
            "enabled": bool(s.get("enabled", True)),
            "eyebrow": (s.get("eyebrow") or "")[:128],
            "title": (s.get("title") or "")[:255],
            "subtitle": s.get("subtitle") or "",
            "cta": (s.get("cta") or "")[:128],
            "href": (s.get("href") or "")[:512],
            "secondary_cta": (s.get("secondary_cta") or "")[:128],
            "secondary_href": (s.get("secondary_href") or "")[:512],
        }
        if sid and HeroSlide.objects.filter(pk=sid).exists():
            obj = HeroSlide.objects.get(pk=sid)
            for k, v in fields.items():
                setattr(obj, k, v)
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(sid)
        else:
            nid = sid or uuid.uuid4()
            obj = HeroSlide(id=nid, **fields)
            obj.save()
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(nid)
    HeroSlide.objects.exclude(id__in=keep).delete()


def _apply_nav_items(nav_items: list) -> None:
    keep: set[uuid.UUID] = set()
    for i, n in enumerate(nav_items):
        nid = _parse_uuid(n.get("id"))
        order = int(n.get("order", i + 1))
        fields = {
            "order": order,
            "enabled": bool(n.get("enabled", True)),
            "label": (n.get("label") or "")[:128],
            "href": (n.get("href") or "")[:512],
            "is_dropdown": bool(n.get("is_dropdown", False)),
        }
        if nid and SiteNavItem.objects.filter(pk=nid).exists():
            obj = SiteNavItem.objects.get(pk=nid)
            for k, v in fields.items():
                setattr(obj, k, v)
            obj.save()
            keep.add(nid)
            parent = obj
        else:
            new_id = nid or uuid.uuid4()
            parent = SiteNavItem(id=new_id, **fields)
            parent.save()
            keep.add(new_id)

        SiteNavChild.objects.filter(parent=parent).delete()
        for j, c in enumerate(n.get("children") or []):
            SiteNavChild.objects.create(
                parent=parent,
                label=(c.get("label") or "")[:128],
                href=(c.get("href") or "")[:512],
                order=j + 1,
            )
    SiteNavItem.objects.exclude(id__in=keep).delete()


def _apply_about(about: dict) -> None:
    a = AboutSection.load()
    a.enabled = bool(about.get("enabled", True))
    a.eyebrow = (about.get("eyebrow") or "")[:255]
    a.title = (about.get("title") or "")[:255]
    a.body = about.get("body") or ""
    assign_image_from_snapshot_value(a, "image", about.get("image"))
    a.save()

    if "stats" not in about or about["stats"] is None:
        return

    keep: set[uuid.UUID] = set()
    for i, st in enumerate(about["stats"]):
        stid = _parse_uuid(st.get("id"))
        order = i + 1
        label = (st.get("label") or "")[:128]
        value = (st.get("value") or "")[:64]
        if stid and AboutStat.objects.filter(pk=stid, section=a).exists():
            obj = AboutStat.objects.get(pk=stid)
            obj.label = label
            obj.value = value
            obj.order = order
            obj.save()
            keep.add(stid)
        else:
            obj = AboutStat.objects.create(section=a, label=label, value=value, order=order)
            keep.add(obj.id)
    AboutStat.objects.filter(section=a).exclude(id__in=keep).delete()


def _apply_services(items: list) -> None:
    keep: set[uuid.UUID] = set()
    for i, s in enumerate(items):
        sid = _parse_uuid(s.get("id"))
        order = int(s.get("order", i + 1))
        fields = {
            "order": order,
            "enabled": bool(s.get("enabled", True)),
            "icon": (s.get("icon") or "")[:64],
            "title": (s.get("title") or "")[:255],
            "description": s.get("description") or "",
            "href": (s.get("href") or "")[:512],
        }
        if sid and ServiceItem.objects.filter(pk=sid).exists():
            obj = ServiceItem.objects.get(pk=sid)
            for k, v in fields.items():
                setattr(obj, k, v)
            obj.save()
            keep.add(sid)
        else:
            nid = sid or uuid.uuid4()
            obj = ServiceItem(id=nid, **fields)
            obj.save()
            keep.add(nid)
    ServiceItem.objects.exclude(id__in=keep).delete()


def _coerce_years_experience(raw) -> int:
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return 0
    return max(0, min(n, 32767))


def _apply_team(items: list) -> None:
    keep: set[uuid.UUID] = set()
    for i, s in enumerate(items):
        sid = _parse_uuid(s.get("id"))
        order = int(s.get("order", i + 1))
        avatar_val = s.get("avatar")
        fields = {
            "order": order,
            "enabled": bool(s.get("enabled", True)),
            "name": (s.get("name") or "")[:255],
            "role": (s.get("role") or "")[:255],
            "bio": s.get("bio") or "",
            "linkedin_url": (s.get("linkedin_url") or "")[:500],
            "facebook_url": (s.get("facebook_url") or "")[:500],
            "twitter_url": (s.get("twitter_url") or "")[:500],
            "instagram_url": (s.get("instagram_url") or "")[:500],
            "contact_email": (s.get("contact_email") or "")[:254],
            "years_experience": _coerce_years_experience(s.get("years_experience")),
        }
        if sid and TeamMember.objects.filter(pk=sid).exists():
            obj = TeamMember.objects.get(pk=sid)
            for k, v in fields.items():
                setattr(obj, k, v)
            assign_image_from_snapshot_value(obj, "avatar", avatar_val)
            obj.save()
            keep.add(sid)
        else:
            nid = sid or uuid.uuid4()
            obj = TeamMember(id=nid, **fields)
            obj.save()
            assign_image_from_snapshot_value(obj, "avatar", avatar_val)
            obj.save()
            keep.add(nid)
    TeamMember.objects.exclude(id__in=keep).delete()


def _apply_news(items: list) -> None:
    keep: set[uuid.UUID] = set()
    for i, s in enumerate(items):
        sid = _parse_uuid(s.get("id"))
        order = int(s.get("order", i + 1))
        image_val = s.get("image")
        fields = {
            "order": order,
            "enabled": bool(s.get("enabled", True)),
            "title": (s.get("title") or "")[:255],
            "excerpt": s.get("excerpt") or "",
            "body": s.get("body") or "",
            "date": _parse_date(s.get("date")),
            "href": (s.get("href") or "")[:512],
            "tag": (s.get("tag") or "")[:64],
        }
        if sid and NewsItem.objects.filter(pk=sid).exists():
            obj = NewsItem.objects.get(pk=sid)
            for k, v in fields.items():
                setattr(obj, k, v)
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(sid)
        else:
            nid = sid or uuid.uuid4()
            obj = NewsItem(id=nid, **fields)
            obj.save()
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(nid)
    NewsItem.objects.exclude(id__in=keep).delete()


def _apply_testimonials(block: dict) -> None:
    tcfg = TestimonialsConfig.load()
    if "title" in block:
        tcfg.title = (block.get("title") or "")[:255]
    if "intro" in block:
        tcfg.intro = block.get("intro") or ""
    if "metrics" in block:
        tcfg.metrics = block["metrics"] if isinstance(block.get("metrics"), list) else []
    tcfg.save()

    if "items" not in block or block["items"] is None:
        return

    items = block["items"]
    keep: set[uuid.UUID] = set()
    for i, s in enumerate(items):
        sid = _parse_uuid(s.get("id"))
        order = int(s.get("order", i + 1))
        rating = s.get("rating", 5)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = 5
        rating = max(1, min(rating, 5))
        image_val = s.get("image")
        fields = {
            "order": order,
            "enabled": bool(s.get("enabled", True)),
            "name": (s.get("name") or "")[:255],
            "role_title": (s.get("role_title") or "")[:255],
            "content": s.get("content") or "",
            "rating": rating,
        }
        if sid and Testimonial.objects.filter(pk=sid).exists():
            obj = Testimonial.objects.get(pk=sid)
            for k, v in fields.items():
                setattr(obj, k, v)
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(sid)
        else:
            nid = sid or uuid.uuid4()
            obj = Testimonial(id=nid, **fields)
            obj.save()
            assign_image_from_snapshot_value(obj, "image", image_val)
            obj.save()
            keep.add(nid)
    Testimonial.objects.exclude(id__in=keep).delete()


def _apply_footer(footer: dict) -> None:
    fc = FooterConfig.load()
    if "tagline" in footer:
        fc.tagline = (footer.get("tagline") or "")[:512]
    if "copyright" in footer:
        fc.copyright = footer.get("copyright") or ""
    fc.save()

    if "columns" in footer and footer["columns"] is not None:
        keep_cols: set[uuid.UUID] = set()
        for i, col in enumerate(footer["columns"]):
            cid = _parse_uuid(col.get("id"))
            order = int(col.get("order", i + 1))
            title = (col.get("title") or "")[:255]
            if cid and FooterColumn.objects.filter(pk=cid, config=fc).exists():
                column = FooterColumn.objects.get(pk=cid)
                column.title = title
                column.order = order
                column.save()
                keep_cols.add(cid)
            else:
                new_id = cid or uuid.uuid4()
                column = FooterColumn(id=new_id, config=fc, title=title, order=order)
                column.save()
                keep_cols.add(new_id)

            FooterLink.objects.filter(column=column).delete()
            for j, lk in enumerate(col.get("links") or []):
                FooterLink.objects.create(
                    column=column,
                    label=(lk.get("label") or "")[:255],
                    href=(lk.get("href") or "")[:512],
                    order=j + 1,
                )
        FooterColumn.objects.filter(config=fc).exclude(id__in=keep_cols).delete()

    if "social" in footer and footer["social"] is not None:
        FooterSocialLink.objects.filter(config=fc).delete()
        for j, s in enumerate(footer["social"]):
            FooterSocialLink.objects.create(
                config=fc,
                label=(s.get("label") or "")[:128],
                href=(s.get("href") or "")[:500],
                order=j + 1,
            )


@transaction.atomic
def apply_homepage_snapshot(data: dict) -> dict:
    """Replace homepage CMS content with the given snapshot (partial keys skip sections)."""
    if not isinstance(data, dict):
        raise ValueError("Body must be a JSON object.")

    _apply_toggles_and_styles(data)

    if "slides" in data and data["slides"] is not None:
        _apply_slides(data["slides"])

    if "nav_items" in data and data["nav_items"] is not None:
        _apply_nav_items(data["nav_items"])

    if "about" in data and data["about"] is not None:
        _apply_about(data["about"])

    if "services" in data and data["services"] is not None:
        _apply_services(data["services"])

    if "team" in data and data["team"] is not None:
        _apply_team(data["team"])

    if "news" in data and data["news"] is not None:
        _apply_news(data["news"])

    if "testimonials" in data and data["testimonials"] is not None:
        _apply_testimonials(data["testimonials"])

    if "footer" in data and data["footer"] is not None:
        _apply_footer(data["footer"])

    return build_homepage_snapshot()
