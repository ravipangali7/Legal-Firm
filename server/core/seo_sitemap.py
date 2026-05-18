"""Backward-compatible re-exports — prefer `core.seo.sitemap`."""

from core.seo.base import site_base_url as _site_base_url
from core.seo.sitemap import collect_sitemap_urls, render_sitemap_xml

__all__ = ["_site_base_url", "collect_sitemap_urls", "render_sitemap_xml"]
