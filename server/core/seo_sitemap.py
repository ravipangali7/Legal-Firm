"""Build sitemap.xml entries for public SPA routes."""

from __future__ import annotations

from datetime import date
from xml.sax.saxutils import escape

from django.conf import settings

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


def _site_base_url() -> str:
    app = AppSettings.load()
    base = (app.canonical_url or "").strip().rstrip("/")
    if base:
        return base
    return getattr(settings, "PUBLIC_APP_BASE_URL", "http://localhost:8080").rstrip("/")


def _fmt_lastmod(value) -> str:
    if value is None:
        return date.today().isoformat()
    if hasattr(value, "date"):
        try:
            return value.date().isoformat()
        except (ValueError, AttributeError):
            pass
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()[:10]
        except ValueError:
            pass
    return date.today().isoformat()


def _static_paths() -> list[tuple[str, str]]:
    """(path, changefreq hint) — priority assigned in render."""
    return [
        ("/", "weekly"),
        ("/about", "monthly"),
        ("/contact", "monthly"),
        ("/pricing", "weekly"),
        ("/blog", "daily"),
        ("/laws", "weekly"),
        ("/summaries", "daily"),
        ("/procedures", "weekly"),
        ("/notices", "daily"),
        ("/tools", "monthly"),
        ("/resources", "weekly"),
        ("/knowledge", "weekly"),
        ("/help", "weekly"),
        ("/professionals", "weekly"),
        ("/practice-areas", "weekly"),
        ("/law-details", "weekly"),
    ]


def collect_sitemap_urls() -> list[dict]:
    base = _site_base_url()
    entries: list[dict] = []

    def add(path: str, lastmod=None, priority: str = "0.5", changefreq: str = "weekly"):
        p = path if path.startswith("/") else f"/{path}"
        entries.append(
            {
                "loc": f"{base}{p}",
                "lastmod": _fmt_lastmod(lastmod),
                "changefreq": changefreq,
                "priority": priority,
            }
        )

    for path, freq in _static_paths():
        add(path, changefreq=freq, priority="0.9" if path == "/" else "0.7")

    for path, freq in [
        ("/about/background", "monthly"),
        ("/about/our-team", "monthly"),
        ("/about/our-services", "monthly"),
    ]:
        add(path, changefreq=freq, priority="0.6")

    for row in Act.objects.only("slug", "updated"):
        add(f"/laws/{row.slug}", lastmod=row.updated, priority="0.6", changefreq="monthly")

    for row in Summary.objects.only("slug", "posted"):
        add(f"/summaries/{row.slug}", lastmod=row.posted, priority="0.7", changefreq="weekly")

    for row in Procedure.objects.select_related("category").only("slug", "category"):
        add(f"/procedures/{row.slug}", priority="0.6", changefreq="monthly")

    for row in Notice.objects.filter(published=True).only("slug", "updated_at"):
        add(f"/notices/{row.slug}", lastmod=row.updated_at, priority="0.7", changefreq="daily")

    for row in PracticeArea.objects.only("slug"):
        add(f"/practice-areas/{row.slug}", priority="0.7", changefreq="monthly")

    for row in LegalCase.objects.only("slug", "date_filed"):
        add(f"/case/{row.slug}", lastmod=row.date_filed, priority="0.5", changefreq="yearly")

    for row in BlogPost.objects.filter(published=True).only("id", "date"):
        add(f"/blog/{row.id}", lastmod=row.date, priority="0.6", changefreq="weekly")

    for row in TeamMember.objects.filter(enabled=True).only("id"):
        add(f"/professionals/{row.id}", priority="0.5", changefreq="monthly")

    for row in NewsItem.objects.filter(enabled=True).only("id", "date"):
        add(f"/news/{row.id}", lastmod=row.date, priority="0.5", changefreq="weekly")
        add(f"/events/{row.id}", lastmod=row.date, priority="0.4", changefreq="weekly")

    for row in ServiceItem.objects.filter(enabled=True).only("id"):
        add(f"/services/{row.id}", priority="0.5", changefreq="monthly")

    return entries


def render_sitemap_xml(entries: list[dict]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for e in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(e['loc'])}</loc>")
        lines.append(f"    <lastmod>{escape(e['lastmod'])}</lastmod>")
        lines.append(f"    <changefreq>{escape(e['changefreq'])}</changefreq>")
        lines.append(f"    <priority>{escape(e['priority'])}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"
