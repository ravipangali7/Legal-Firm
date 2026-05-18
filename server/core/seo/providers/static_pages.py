"""Indexable marketing / listing routes (no auth, no filtered search URLs)."""

from core.seo.base import site_base_url
from core.seo.sitemap import add_url


def entries():
    base = site_base_url()
    out: list[dict] = []
    static = [
        ("/", "weekly", "1.0"),
        ("/about", "monthly", "0.7"),
        ("/contact", "monthly", "0.7"),
        ("/pricing", "weekly", "0.8"),
        ("/blog", "daily", "0.8"),
        ("/laws", "weekly", "0.8"),
        ("/summaries", "daily", "0.8"),
        ("/procedures", "weekly", "0.7"),
        ("/notices", "daily", "0.8"),
        ("/tools", "monthly", "0.6"),
        ("/resources", "weekly", "0.7"),
        ("/knowledge", "weekly", "0.7"),
        ("/help", "weekly", "0.6"),
        ("/professionals", "weekly", "0.7"),
        ("/practice-areas", "weekly", "0.7"),
        ("/law-details", "weekly", "0.6"),
    ]
    for path, freq, pri in static:
        add_url(out, base, path, changefreq=freq, priority=pri)
    for path in ("/about/background", "/about/our-team", "/about/our-services"):
        add_url(out, base, path, changefreq="monthly", priority="0.6")
    return out
