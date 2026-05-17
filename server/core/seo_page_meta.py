"""Resolve public page SEO metadata by SPA pathname (for crawlers / share previews)."""

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
from core.seo_sitemap import _site_base_url

_ABOUT_SUBPAGES = ("background", "our-team", "our-services")


def _strip_html(text: str, max_len: int = 160) -> str:
    plain = re.sub(r"<[^>]+>", " ", text or "")
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_len:
        return plain
    cut = plain[: max_len - 1]
    sp = cut.rfind(" ")
    return f"{(cut[:sp] if sp > 80 else cut).strip()}…"


def resolve_page_meta(path: str) -> dict[str, Any] | None:
    """Return title, description, image, type, canonical_path for a public route."""
    app = AppSettings.load()
    site_name = (app.site_name or "TaxLexis Legal").strip()
    base = _site_base_url()
    p = path if path.startswith("/") else f"/{path}"
    p = p.split("?")[0].split("#")[0] or "/"

    def _abs_media(url: str) -> str:
        if not url:
            return ""
        if url.startswith("http://") or url.startswith("https://"):
            return url
        return f"{base}{url if url.startswith('/') else f'/{url}'}"

    def pack(
        title: str,
        description: str = "",
        *,
        image: str = "",
        type_: str = "website",
        canonical_path: str | None = None,
    ) -> dict[str, Any]:
        og = _abs_media((app.og_image.url if app.og_image else "") or "")
        img = _abs_media(image) or og
        return {
            "title": title,
            "description": _strip_html(description or app.seo_description or ""),
            "image": img,
            "type": type_,
            "canonical": f"{base}{canonical_path or p}",
            "site_name": site_name,
        }

    if p == "/":
        return pack(
            (app.seo_title or site_name).strip() or site_name,
            app.seo_description,
            canonical_path="/",
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
        return pack(t, d)

    m = re.match(r"^/about/([^/]+)$", p)
    if m and m.group(1) in _ABOUT_SUBPAGES:
        label = m.group(1).replace("-", " ").title()
        return pack(label, f"About {site_name} — {label}.")

    m = re.match(r"^/laws/([^/]+)$", p)
    if m:
        row = Act.objects.filter(slug=m.group(1)).only("title_en").first()
        if row:
            return pack(row.title_en, "")

    m = re.match(r"^/summaries/([^/]+)$", p)
    if m:
        row = Summary.objects.filter(slug=m.group(1)).only("title", "preview").first()
        if row:
            return pack(row.title, row.preview or "")

    m = re.match(r"^/procedures/([^/]+)$", p)
    if m:
        row = Procedure.objects.filter(slug=m.group(1)).only("title", "summary").first()
        if row:
            return pack(row.title, row.summary or "")

    m = re.match(r"^/notices/([^/]+)$", p)
    if m:
        row = (
            Notice.objects.filter(slug=m.group(1), published=True)
            .only("title", "body")
            .first()
        )
        if row:
            return pack(row.title, row.excerpt or _strip_html(row.body or ""))

    m = re.match(r"^/practice-areas/([^/]+)$", p)
    if m:
        row = PracticeArea.objects.filter(slug=m.group(1)).only("name", "overview").first()
        if row:
            return pack(row.name, row.overview or "")

    m = re.match(r"^/case/([^/]+)$", p)
    if m:
        row = LegalCase.objects.filter(slug=m.group(1)).only("title", "teaser").first()
        if row:
            return pack(row.title, row.teaser or "")

    m = re.match(r"^/blog/([^/]+)$", p)
    if m:
        row = (
            BlogPost.objects.filter(id=m.group(1), published=True)
            .only("title", "excerpt", "date")
            .first()
        )
        if row:
            return pack(
                row.title,
                row.excerpt or "",
                type_="article",
                canonical_path=p,
            )

    m = re.match(r"^/professionals/([^/]+)$", p)
    if m:
        row = (
            TeamMember.objects.filter(id=m.group(1), enabled=True)
            .only("name", "role", "bio", "avatar")
            .first()
        )
        if row:
            img = row.avatar.url if row.avatar else ""
            return pack(
                row.name,
                f"{row.role} — {row.bio or ''}",
                image=img,
                type_="profile",
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
            return pack(row.title, row.excerpt or "", image=img, canonical_path=p)

    m = re.match(r"^/events/([^/]+)$", p)
    if m:
        row = (
            NewsItem.objects.filter(id=m.group(1), enabled=True)
            .only("title", "excerpt", "image")
            .first()
        )
        if row:
            img = row.image.url if row.image else ""
            return pack(row.title, row.excerpt or "", image=img, canonical_path=p)

    m = re.match(r"^/services/([^/]+)$", p)
    if m:
        row = (
            ServiceItem.objects.filter(id=m.group(1), enabled=True)
            .only("title", "description")
            .first()
        )
        if row:
            return pack(row.title, row.description or "", canonical_path=p)

    return None
