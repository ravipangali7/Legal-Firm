"""Shared SEO helpers: site URL, text stripping, OG image resolution."""

from __future__ import annotations

import re
from typing import Any

from django.conf import settings
from django.db.models.fields.files import FieldFile

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


def absolute_media_file(file_field: FieldFile | None, request=None) -> str:
    """Turn a FileField into an absolute HTTPS-friendly URL for OG tags."""
    if not file_field:
        return ""
    try:
        raw = (file_field.url or "").strip()
    except (ValueError, AttributeError):
        return ""
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if request is not None:
        return request.build_absolute_uri(raw)
    return abs_media_url(raw)


def site_default_og_image(request=None) -> str:
    """Site Settings → SEO default OG, then logo (guide fallback chain)."""
    app = AppSettings.load()
    for field in (app.og_image, app.site_logo):
        url = absolute_media_file(field, request)
        if url:
            return url
    return ""


def resolve_og_image(
    *,
    entity: Any | None = None,
    image_path: str = "",
    request=None,
) -> str:
    """
    OG image priority: entity meta_og_image → avatar/image → explicit path → site SEO og_image → site_logo.
    """
    if entity is not None:
        meta_og = getattr(entity, "meta_og_image", None)
        url = absolute_media_file(meta_og, request)
        if url:
            return url
        for attr in ("avatar", "image", "featured_image"):
            url = absolute_media_file(getattr(entity, attr, None), request)
            if url:
                return url

    path = (image_path or "").strip()
    if path:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if request is not None and path.startswith("/"):
            return request.build_absolute_uri(path)
        return abs_media_url(path)

    return site_default_og_image(request)


def pack_page_meta(
    *,
    title: str,
    description: str = "",
    image: str = "",
    type_: str = "website",
    canonical_path: str,
    site_name: str | None = None,
    entity: Any | None = None,
    request=None,
) -> dict[str, Any]:
    app = AppSettings.load()
    site = (site_name or app.site_name or "TaxLexis Legal").strip()
    base = site_base_url()
    img = resolve_og_image(entity=entity, image_path=image, request=request)
    path = canonical_path if canonical_path.startswith("/") else f"/{canonical_path}"
    return {
        "title": title,
        "description": strip_html(description or app.seo_description or ""),
        "image": img,
        "type": type_,
        "canonical": f"{base}{path}",
        "site_name": site,
    }
