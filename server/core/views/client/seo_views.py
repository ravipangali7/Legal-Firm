"""SEO endpoints: dynamic sitemap, robots.txt, and page meta from App Settings."""

from django.http import HttpResponse
from django.utils.html import escape
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.models import AppSettings
from core.seo_page_meta import resolve_page_meta
from core.seo_sitemap import collect_sitemap_urls, render_sitemap_xml

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
    if not body:
        base = (app.canonical_url or "").strip().rstrip("/")
        sitemap_line = f"Sitemap: {base}/sitemap.xml" if base else "Sitemap: /sitemap.xml"
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
        base = (app.canonical_url or "").strip().rstrip("/")
        if base:
            body = f"{body.rstrip()}\n\nSitemap: {base}/sitemap.xml\n"
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


_BOT_UA_FRAGMENTS = (
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "whatsapp",
    "discordbot",
    "telegrambot",
    "googlebot",
    "bingbot",
)


def _is_social_bot(request) -> bool:
    ua = (request.META.get("HTTP_USER_AGENT") or "").lower()
    return any(b in ua for b in _BOT_UA_FRAGMENTS)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_share_preview(request):
    """
  Minimal HTML with Open Graph tags for social crawlers.
  Usage: GET /api/public/share-preview/?path=/blog/uuid
  (Optionally route bot traffic to this URL at the reverse proxy.)
  """
    path = (request.query_params.get("path") or "/").strip()
    meta = resolve_page_meta(path)
    if not meta:
        return HttpResponse("Not found", status=404)

    title = escape(meta.get("title") or "")
    desc = escape(meta.get("description") or "")
    image = escape(meta.get("image") or "")
    canonical = escape(meta.get("canonical") or "")
    site = escape(meta.get("site_name") or "")
    og_type = escape(meta.get("type") or "website")

    img_tags = ""
    if image:
        img_tags = f'<meta property="og:image" content="{image}" />\n<meta name="twitter:image" content="{image}" />'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:site_name" content="{site}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:url" content="{canonical}" />
  {img_tags}
  <meta name="twitter:card" content="{'summary_large_image' if image else 'summary'}" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta http-equiv="refresh" content="0;url={canonical}" />
</head>
<body><p><a href="{canonical}">Continue</a></p></body>
</html>"""
    resp = HttpResponse(html, content_type="text/html; charset=utf-8")
    if _is_social_bot(request):
        resp["Cache-Control"] = _CACHE_PUBLIC
    return resp
