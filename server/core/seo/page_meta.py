"""Resolve public page SEO metadata by SPA pathname."""

from __future__ import annotations

import re
from typing import Any

from core.models import (
    Act,
    AppSettings,
    BlogPost,
    LegalCase,
    NewsItem,
    Notice,
    PracticeArea,
    Procedure,
    ServiceItem,
    Summary,
    TeamMember,
)
from core.seo.base import (
    pack_page_meta,
    resolve_entity_description,
    resolve_entity_title,
    strip_html,
)
from core.seo_schema import only_with_optional_seo, seo_meta_columns_applied, seo_meta_columns_applied_for_model

_ABOUT_SUBPAGES = ("background", "our-team", "our-services")


def resolve_page_meta(path: str) -> dict[str, Any] | None:
    app = AppSettings.load()
    site_name = (app.site_name or "TaxLexis Legal").strip()
    p = path if path.startswith("/") else f"/{path}"
    p = p.split("?")[0].split("#")[0] or "/"

    if p == "/":
        return pack_page_meta(
            title=resolve_entity_title(app.seo_title, site_name),
            description=app.seo_description or "",
            canonical_path="/",
            site_name=site_name,
        )

    static = {
        "/about": ("About Us", "Learn about our firm, mission, and team."),
        "/contact": ("Contact", "Get in touch with our advisory team."),
        "/pricing": ("Pricing", "Subscription plans and pricing."),
        "/blog": ("Blog", "Insights and articles from our advisors."),
        "/laws": ("Laws & Acts", "Browse Nepalese acts and legislation."),
        "/summaries": ("Summaries", "Legal summaries and commentary."),
        "/procedures": ("Procedures", "Regulatory and compliance procedures."),
        "/notices": ("Notices", "Official notices and regulatory updates."),
        "/tools": ("Tools", "Legal and tax tools."),
        "/resources": ("Resources", "Downloadable knowledge resources."),
        "/knowledge": ("Knowledge Base", "Searchable knowledge base."),
        "/help": ("Help Center", "Help articles and support."),
        "/professionals": ("Professionals", "Meet our tax and legal professionals."),
        "/practice-areas": ("Practice Areas", "Explore practice areas and cases."),
    }
    if p in static:
        t, d = static[p]
        return pack_page_meta(title=t, description=d, canonical_path=p, site_name=site_name)

    m = re.match(r"^/about/([^/]+)$", p)
    if m and m.group(1) in _ABOUT_SUBPAGES:
        label = m.group(1).replace("-", " ").title()
        return pack_page_meta(
            title=label,
            description=f"About {site_name} — {label}.",
            canonical_path=p,
            site_name=site_name,
        )

    m = re.match(r"^/laws/([^/]+)$", p)
    if m:
        row = Act.objects.filter(slug=m.group(1)).only(
            *only_with_optional_seo("title_en")
        ).first()
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title_en),
                description=resolve_entity_description(meta_description),
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/summaries/([^/]+)$", p)
    if m:
        row = Summary.objects.filter(slug=m.group(1)).only(
            *only_with_optional_seo("title", "preview", model=Summary)
        ).first()
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied_for_model(Summary) else ""
            meta_description = row.meta_description if seo_meta_columns_applied_for_model(Summary) else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title),
                description=resolve_entity_description(
                    meta_description, row.preview
                ),
                type_="article",
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/procedures/([^/]+)$", p)
    if m:
        row = Procedure.objects.filter(slug=m.group(1)).only(
            *only_with_optional_seo("title", "summary")
        ).first()
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title),
                description=resolve_entity_description(
                    meta_description, row.summary
                ),
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/notices/([^/]+)$", p)
    if m:
        row = (
            Notice.objects.filter(slug=m.group(1), published=True)
            .only(*only_with_optional_seo("title", "excerpt", "body"))
            .first()
        )
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title),
                description=resolve_entity_description(
                    meta_description, row.excerpt, row.body
                ),
                type_="article",
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/practice-areas/([^/]+)$", p)
    if m:
        row = PracticeArea.objects.filter(slug=m.group(1)).only(
            *only_with_optional_seo("name", "overview")
        ).first()
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.name),
                description=resolve_entity_description(
                    meta_description, row.overview
                ),
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/case/([^/]+)$", p)
    if m:
        row = LegalCase.objects.filter(slug=m.group(1)).only(
            *only_with_optional_seo("title", "teaser")
        ).first()
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title),
                description=resolve_entity_description(
                    meta_description, row.teaser
                ),
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/blog/([^/]+)$", p)
    if m:
        row = (
            BlogPost.objects.filter(id=m.group(1), published=True)
            .only(*only_with_optional_seo("title", "excerpt", "date"))
            .first()
        )
        if row:
            meta_title = row.meta_title if seo_meta_columns_applied() else ""
            meta_description = row.meta_description if seo_meta_columns_applied() else ""
            return pack_page_meta(
                title=resolve_entity_title(meta_title, row.title),
                description=resolve_entity_description(
                    meta_description, row.excerpt
                ),
                type_="article",
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/professionals/([^/]+)$", p)
    if m:
        row = (
            TeamMember.objects.filter(id=m.group(1), enabled=True)
            .only("name", "role", "bio", "avatar", "meta_title", "meta_description")
            .first()
        )
        if row:
            img = row.avatar.url if row.avatar else ""
            return pack_page_meta(
                title=resolve_entity_title(row.meta_title, row.name),
                description=resolve_entity_description(
                    row.meta_description, f"{row.role} — {row.bio or ''}"
                ),
                image=img,
                type_="profile",
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/news/([^/]+)$", p)
    if m:
        row = (
            NewsItem.objects.filter(id=m.group(1), enabled=True)
            .only("title", "excerpt", "image")
            .first()
        )
        if row:
            img = row.image.url if row.image else ""
            return pack_page_meta(
                title=row.title,
                description=row.excerpt or "",
                image=img,
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/events/([^/]+)$", p)
    if m:
        row = (
            NewsItem.objects.filter(id=m.group(1), enabled=True)
            .only("title", "excerpt", "image")
            .first()
        )
        if row:
            img = row.image.url if row.image else ""
            return pack_page_meta(
                title=row.title,
                description=row.excerpt or "",
                image=img,
                canonical_path=p,
                site_name=site_name,
            )

    m = re.match(r"^/services/([^/]+)$", p)
    if m:
        row = (
            ServiceItem.objects.filter(id=m.group(1), enabled=True)
            .only("title", "description")
            .first()
        )
        if row:
            return pack_page_meta(
                title=row.title,
                description=row.description or "",
                canonical_path=p,
                site_name=site_name,
            )

    return None
