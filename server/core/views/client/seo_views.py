"""SEO endpoints: dynamic sitemap and robots.txt from App Settings."""

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from core.models import AppSettings
from core.seo_sitemap import collect_sitemap_urls, render_sitemap_xml


@api_view(["GET"])
@permission_classes([AllowAny])
def public_sitemap_xml(request):
    xml = render_sitemap_xml(collect_sitemap_urls())
    return HttpResponse(xml, content_type="application/xml; charset=utf-8")


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
    return HttpResponse(body + ("\n" if not body.endswith("\n") else ""), content_type="text/plain; charset=utf-8")
