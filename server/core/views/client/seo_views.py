"""SEO endpoints: dynamic sitemap, robots.txt, page meta, and share landings."""

from __future__ import annotations

import uuid

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.models import AppSettings, NewsItem, Procedure, TeamMember
from core.models import LegalCase
from core.seo_schema import (
    act_detail_queryset,
    blog_post_detail_queryset,
    notice_detail_queryset,
    seo_meta_columns_applied,
    seo_meta_columns_applied_for_model,
    summary_api_queryset,
)
from core.seo.base import pack_page_meta, resolve_entity_description, resolve_entity_title, sitemap_absolute_url
from core.seo.page_meta import resolve_page_meta
from core.seo.share import render_share_html, share_response_from_meta
from core.seo.sitemap import collect_sitemap_urls, render_sitemap_xml

_CACHE_PUBLIC = "public, max-age=3600, s-maxage=86400"


def _entity_meta_fields(row) -> tuple[str, str]:
    if row is None:
        return "", ""
    if seo_meta_columns_applied_for_model(row.__class__):
        return (getattr(row, "meta_title", "") or "", getattr(row, "meta_description", "") or "")
    if seo_meta_columns_applied():
        return (getattr(row, "meta_title", "") or "", getattr(row, "meta_description", "") or "")
    return "", ""


def _pack_share_meta(request, row, *, display_title: str, description: str, canonical_path: str, type_: str = "article"):
    meta_title, meta_description = _entity_meta_fields(row)
    return pack_page_meta(
        title=resolve_entity_title(meta_title, display_title),
        description=resolve_entity_description(meta_description, description),
        type_=type_,
        canonical_path=canonical_path,
        entity=row,
        request=request,
    )


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
    meta = resolve_page_meta(path, request=request)
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
    meta = resolve_page_meta(path, request=request)
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
    row = get_object_or_404(blog_post_detail_queryset(), id=post_id, published=True)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.excerpt,
        canonical_path=f"/blog/{row.id}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def summary_share(request, slug: str):
    row = get_object_or_404(summary_api_queryset(), slug=slug)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.preview,
        canonical_path=f"/summaries/{row.slug}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def notice_share(request, slug: str):
    row = get_object_or_404(notice_detail_queryset(), slug=slug, published=True)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.excerpt or row.body,
        canonical_path=f"/notices/{row.slug}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def act_share(request, slug: str):
    row = get_object_or_404(act_detail_queryset(), pk=slug)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title_en,
        description="",
        canonical_path=f"/laws/{row.slug}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def procedure_share(request, slug: str):
    row = get_object_or_404(Procedure.objects.all(), slug=slug)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.summary,
        canonical_path=f"/procedures/{row.slug}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def legal_case_share(request, slug: str):
    row = get_object_or_404(LegalCase.objects.all(), slug=slug)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.teaser,
        canonical_path=f"/case/{row.slug}",
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def news_item_share(request, item_id: uuid.UUID):
    row = get_object_or_404(NewsItem.objects.filter(enabled=True), id=item_id)
    path = f"/news/{row.id}"
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.excerpt,
        canonical_path=path,
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def event_item_share(request, item_id: uuid.UUID):
    row = get_object_or_404(NewsItem.objects.filter(enabled=True), id=item_id)
    path = f"/events/{row.id}"
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.title,
        description=row.excerpt,
        canonical_path=path,
        type_="article",
    )
    return _share_html_response(meta)


@api_view(["GET"])
@permission_classes([AllowAny])
def professional_share(request, member_id: uuid.UUID):
    row = get_object_or_404(TeamMember.objects.filter(enabled=True), id=member_id)
    meta = _pack_share_meta(
        request,
        row,
        display_title=row.name,
        description=f"{row.role} — {row.bio or ''}",
        canonical_path=f"/professionals/{row.id}",
        type_="profile",
    )
    return _share_html_response(meta)
