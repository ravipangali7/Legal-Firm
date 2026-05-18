"""SEO endpoints: dynamic sitemap, robots.txt, page meta, and share landings."""

from __future__ import annotations

import uuid

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.models import Act, AppSettings, BlogPost, Notice, Summary
from core.seo.base import pack_page_meta, resolve_entity_description, resolve_entity_title, sitemap_absolute_url
from core.seo.page_meta import resolve_page_meta
from core.seo.share import render_share_html, share_response_from_meta
from core.seo.sitemap import collect_sitemap_urls, render_sitemap_xml

_CACHE_PUBLIC = "public, max-age=3600, s-maxage=86400"


@api_view(["GET"])
@permission_classes([AllowAny])
def public_sitemap_xml(request):
    xml = render_sitemap_xml(collect_sitemap_urls())
    resp = HttpResponse(xml, content_type="application/xml; charset=utf-8")
    resp["Cache-Control"] = _CACHE_PUBLIC
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def public_robots_txt(request):
    app = AppSettings.load()
    body = (app.robots_txt or "").strip()
    sitemap_line = f"Sitemap: {sitemap_absolute_url()}"
    if not body:
        body = "\n".join(
            [
                "User-agent: *",
                "Allow: /",
                "Disallow: /admin",
                "Disallow: /dashboard",
                "Disallow: /client",
                "Disallow: /account",
                "Disallow: /login",
                "Disallow: /signup",
                "Disallow: /portal",
                "Disallow: /payment/",
                "",
                sitemap_line,
            ]
        )
    elif "sitemap" not in body.lower():
        body = f"{body.rstrip()}\n\n{sitemap_line}\n"
    resp = HttpResponse(
        body + ("\n" if not body.endswith("\n") else ""),
        content_type="text/plain; charset=utf-8",
    )
    resp["Cache-Control"] = _CACHE_PUBLIC
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def public_page_meta(request):
    """JSON meta for a public SPA path — used by share crawlers and integrations."""
    path = (request.query_params.get("path") or "/").strip()
    meta = resolve_page_meta(path)
    if not meta:
        return Response({"detail": "Not found"}, status=404)
    return Response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_share_preview(request):
    """
    Minimal HTML with Open Graph tags for social crawlers.
    GET /api/public/share-preview/?path=/blog/uuid
    """
    path = (request.query_params.get("path") or "/").strip()
    meta = resolve_page_meta(path)
    return share_response_from_meta(meta)


def _share_html_response(meta: dict | None) -> HttpResponse:
    if not meta:
        return HttpResponse("Not found", status=404)
    resp = HttpResponse(render_share_html(meta), content_type="text/html; charset=utf-8")
    resp["Cache-Control"] = _CACHE_PUBLIC
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def blog_post_share(request, post_id: uuid.UUID):
    row = get_object_or_404(BlogPost, id=post_id, published=True)
    meta = pack_page_meta(
        title=resolve_entity_title(row.meta_title, row.title),
        description=resolve_entity_description(row.meta_description, row.excerpt),
        type_="article",
        canonical_path=f"/blog/{row.id}",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def summary_share(request, slug: str):
    row = get_object_or_404(Summary, slug=slug)
    meta = pack_page_meta(
        title=resolve_entity_title(row.meta_title, row.title),
        description=resolve_entity_description(row.meta_description, row.preview),
        type_="article",
        canonical_path=f"/summaries/{row.slug}",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def notice_share(request, slug: str):
    row = get_object_or_404(Notice, slug=slug, published=True)
    meta = pack_page_meta(
        title=resolve_entity_title(row.meta_title, row.title),
        description=resolve_entity_description(
            row.meta_description, row.excerpt, row.body
        ),
        type_="article",
        canonical_path=f"/notices/{row.slug}",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def act_share(request, slug: str):
    row = get_object_or_404(Act, slug=slug)
    meta = pack_page_meta(
        title=resolve_entity_title(row.meta_title, row.title_en),
        description=resolve_entity_description(row.meta_description),
        type_="article",
        canonical_path=f"/laws/{row.slug}",
    )
    return _share_html_response(meta)
