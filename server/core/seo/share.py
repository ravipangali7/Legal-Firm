"""Open Graph share landing HTML for social crawlers (MOD_SHARE)."""

from __future__ import annotations

from django.utils.html import escape

from core.seo.base import pack_page_meta


def render_share_html(meta: dict) -> str:
    title = escape(meta.get("title") or "")
    desc = escape(meta.get("description") or "")
    image = escape(meta.get("image") or "")
    canonical = escape(meta.get("canonical") or "")
    site = escape(meta.get("site_name") or "")
    og_type = escape(meta.get("type") or "website")

    img_tags = ""
    if image:
        secure = ""
        if image.startswith("https://"):
            secure = f'<meta property="og:image:secure_url" content="{image}" />\n'
        img_tags = (
            f'<meta property="og:image" content="{image}" />\n'
            f"{secure}"
            f'<meta name="twitter:image" content="{image}" />\n'
        )

    card = "summary_large_image" if image else "summary"

    return f"""<!DOCTYPE html>
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
  <meta name="twitter:card" content="{card}" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta http-equiv="refresh" content="0;url={canonical}" />
</head>
<body><p><a href="{canonical}">Continue</a></p></body>
</html>"""


def share_response_from_meta(meta: dict | None, *, status: int = 200):
    from django.http import HttpResponse

    if not meta:
        return HttpResponse("Not found", status=404)
    html = render_share_html(meta)
    return HttpResponse(html, content_type="text/html; charset=utf-8", status=status)
