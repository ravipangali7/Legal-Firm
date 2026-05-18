"""Dynamic XML sitemap via registered providers."""

from __future__ import annotations

from datetime import date
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils.module_loading import import_string

from core.seo.base import site_base_url


def fmt_lastmod(value) -> str:
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


def sitemap_entry(
    loc: str,
    lastmod: str = "",
    changefreq: str = "weekly",
    priority: str = "0.7",
) -> dict:
    return {
        "loc": loc,
        "lastmod": lastmod or date.today().isoformat(),
        "changefreq": changefreq,
        "priority": priority,
    }


def add_url(
    entries: list[dict],
    base: str,
    path: str,
    *,
    lastmod=None,
    priority: str = "0.5",
    changefreq: str = "weekly",
) -> None:
    p = path if path.startswith("/") else f"/{path}"
    entries.append(
        sitemap_entry(
            f"{base}{p}",
            lastmod=fmt_lastmod(lastmod),
            changefreq=changefreq,
            priority=priority,
        )
    )


def collect_sitemap_urls() -> list[dict]:
    entries: list[dict] = []
    for provider_path in getattr(settings, "SITEMAP_PROVIDERS", []):
        provider = import_string(provider_path)
        entries.extend(provider())
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
