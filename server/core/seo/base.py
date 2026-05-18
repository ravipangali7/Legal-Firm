"""Shared SEO helpers: site URL, text stripping, entity meta resolution."""

from __future__ import annotations

import re
from typing import Any

from django.conf import settings

from core.models import AppSettings


def site_base_url() -> str:
    app = AppSettings.load()
    base = (app.canonical_url or "").strip().rstrip("/")
    if base:
        return base
    return getattr(settings, "PUBLIC_SITE_URL", None) or getattr(
        settings, "PUBLIC_APP_BASE_URL", "http://localhost:8080"
    ).rstrip("/")


def sitemap_absolute_url() -> str:
    return f"{site_base_url()}/sitemap.xml"


def strip_html(text: str, max_len: int = 160) -> str:
    plain = re.sub(r"<[^>]+>", " ", text or "")
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_len:
        return plain
    cut = plain[: max_len - 1]
    sp = cut.rfind(" ")
    return f"{(cut[:sp] if sp > 80 else cut).strip()}…"


def resolve_entity_title(
    meta_title: str | None,
    display_title: str,
) -> str:
    t = (meta_title or "").strip()
    return t or (display_title or "").strip()


def resolve_entity_description(
    meta_description: str | None,
    *fallbacks: str | None,
    max_len: int = 160,
) -> str:
    md = (meta_description or "").strip()
    if md:
        return strip_html(md, max_len)
    for fb in fallbacks:
        text = strip_html(fb or "", max_len)
        if text:
            return text
    return ""


def abs_media_url(url: str, base: str | None = None) -> str:
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    origin = (base or site_base_url()).rstrip("/")
    return f"{origin}{url if url.startswith('/') else f'/{url}'}"


def pack_page_meta(
    *,
    title: str,
    description: str = "",
    image: str = "",
    type_: str = "website",
    canonical_path: str,
    site_name: str | None = None,
) -> dict[str, Any]:
    app = AppSettings.load()
    site = (site_name or app.site_name or "TaxLexis Legal").strip()
    base = site_base_url()
    og = abs_media_url((app.og_image.url if app.og_image else "") or "", base)
    img = abs_media_url(image, base) or og
    path = canonical_path if canonical_path.startswith("/") else f"/{canonical_path}"
    return {
        "title": title,
        "description": strip_html(description or app.seo_description or ""),
        "image": img,
        "type": type_,
        "canonical": f"{base}{path}",
        "site_name": site,
    }
