"""Build JSON snapshot for `GET /api/site/homepage/` (matches cmsStore shape, snake_case keys)."""

from __future__ import annotations

from .models import (
    AboutSection,
    FooterConfig,
    HeroSlide,
    NewsItem,
    ServiceItem,
    SiteHomepageConfig,
    SiteNavItem,
    TeamMember,
    Testimonial,
    TestimonialsConfig,
)


def _file_url(field_file) -> str:
    if not field_file:
        return ""
    try:
        return field_file.url
    except (ValueError, OSError):
        return ""


def _iso_date(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except ValueError:
            return ""
    return str(value)


def build_homepage_snapshot() -> dict:
    cfg = SiteHomepageConfig.load()
    about = AboutSection.load()
    footer = FooterConfig.load()

    toggles = {
        "hero": cfg.section_hero,
        "about": cfg.section_about,
        "services": cfg.section_services,
        "team": cfg.section_team,
        "news": cfg.section_news,
        "testimonials": cfg.section_testimonials,
        "footer": cfg.section_footer,
        "procedures": cfg.section_procedures,
    }

    nav_items = []
    for nav in SiteNavItem.objects.prefetch_related("children").order_by("order", "label"):
        nav_items.append(
            {
                "id": str(nav.id),
                "order": nav.order,
                "enabled": nav.enabled,
                "label": nav.label,
                "href": nav.href,
                "is_dropdown": nav.is_dropdown,
                "children": [
                    {"label": c.label, "href": c.href} for c in nav.children.order_by("order", "label")
                ],
            }
        )

    slides = []
    for s in HeroSlide.objects.order_by("order"):
        slides.append(
            {
                "id": str(s.id),
                "order": s.order,
                "enabled": s.enabled,
                "eyebrow": s.eyebrow or "",
                "title": s.title,
                "subtitle": s.subtitle,
                "cta": s.cta,
                "href": s.href,
                "secondary_cta": s.secondary_cta or "",
                "secondary_href": s.secondary_href or "",
                "image": _file_url(s.image),
            }
        )

    stats = [
        {"id": str(st.id), "label": st.label, "value": st.value}
        for st in about.stats.order_by("order")
    ]
    about_block = {
        "enabled": about.enabled,
        "eyebrow": about.eyebrow,
        "title": about.title,
        "body": about.body,
        "image": _file_url(about.image),
        "stats": stats,
    }

    services = []
    for sv in ServiceItem.objects.order_by("order"):
        services.append(
            {
                "id": str(sv.id),
                "order": sv.order,
                "enabled": sv.enabled,
                "icon": sv.icon,
                "title": sv.title,
                "description": sv.description,
                "href": sv.href,
            }
        )

    team = []
    for tm in TeamMember.objects.order_by("order", "name"):
        team.append(
            {
                "id": str(tm.id),
                "order": tm.order,
                "enabled": tm.enabled,
                "name": tm.name,
                "role": tm.role,
                "bio": tm.bio,
                "avatar": _file_url(tm.avatar),
                "linkedin_url": tm.linkedin_url or "",
                "facebook_url": tm.facebook_url or "",
                "twitter_url": tm.twitter_url or "",
                "instagram_url": tm.instagram_url or "",
                "contact_email": tm.contact_email or "",
                "years_experience": int(tm.years_experience or 0),
            }
        )

    news = []
    for n in NewsItem.objects.order_by("-date", "order"):
        news.append(
            {
                "id": str(n.id),
                "order": n.order,
                "enabled": n.enabled,
                "title": n.title,
                "excerpt": n.excerpt,
                "body": n.body or "",
                "image": _file_url(n.image),
                "date": _iso_date(n.date),
                "href": n.href,
                "tag": n.tag,
            }
        )

    columns = []
    for col in footer.columns.order_by("order"):
        columns.append(
            {
                "id": str(col.id),
                "title": col.title,
                "links": [
                    {"label": lk.label, "href": lk.href}
                    for lk in col.links.order_by("order")
                ],
            }
        )

    social = [
        {"label": s.label, "href": s.href}
        for s in footer.social_links.order_by("order")
    ]

    footer_block = {
        "tagline": footer.tagline,
        "columns": columns,
        "social": social,
        "copyright": footer.copyright,
    }

    tcfg = TestimonialsConfig.load()
    testimonials = []
    for t in Testimonial.objects.order_by("order", "name"):
        testimonials.append(
            {
                "id": str(t.id),
                "order": t.order,
                "enabled": t.enabled,
                "name": t.name,
                "role_title": t.role_title,
                "content": t.content,
                "rating": t.rating,
                "image": _file_url(t.image),
            }
        )

    testimonials_block = {
        "title": tcfg.title or "",
        "intro": tcfg.intro or "",
        "metrics": tcfg.metrics if isinstance(tcfg.metrics, list) else [],
        "items": testimonials,
    }

    styles = cfg.section_styles
    if not isinstance(styles, dict):
        styles = {}

    return {
        "toggles": toggles,
        "section_styles": styles,
        "nav_items": nav_items,
        "slides": slides,
        "about": about_block,
        "services": services,
        "team": team,
        "news": news,
        "testimonials": testimonials_block,
        "footer": footer_block,
    }
