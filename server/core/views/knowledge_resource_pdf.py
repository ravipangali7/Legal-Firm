"""Shared PDF resolution for KnowledgeResource (public download + admin preview)."""

from __future__ import annotations

import os
from urllib.parse import urlparse

from django.conf import settings
from django.http import FileResponse, HttpResponseRedirect

from core.models import KnowledgeResource


def _media_relative_path_from_href(href: str) -> str | None:
    """Return path relative to MEDIA_ROOT, or None if `href` does not denote local media."""
    h = (href or "").strip()
    if h.startswith("/media/"):
        return h[len("/media/") :].lstrip("/")
    # Legacy paths saved without a leading slash (nested SPA routing).
    if h.startswith("media/"):
        return h[len("media/") :].lstrip("/")
    if h.startswith(("http://", "https://")):
        path = (urlparse(h).path or "").strip()
        if path.startswith("/media/"):
            return path[len("/media/") :].lstrip("/")
        if path.startswith("media/"):
            return path[len("media/") :].lstrip("/")
    return None


def resolve_knowledge_resource_pdf(
    obj: KnowledgeResource,
    *,
    inline: bool,
    attachment_filename: str,
) -> FileResponse | HttpResponseRedirect | None:
    """
    Stream PDF from storage, or redirect to a legacy absolute URL.

    ``inline=True`` → admin flipbook preview (inline disposition).
    ``inline=False`` → public download (attachment; use ``attachment_filename``).
    Returns None when no PDF can be served.
    """
    if obj.pdf_file:
        try:
            fh = obj.pdf_file.open("rb")
            if inline:
                return FileResponse(fh, as_attachment=False, content_type="application/pdf")
            return FileResponse(
                fh,
                as_attachment=True,
                filename=attachment_filename,
                content_type="application/pdf",
            )
        except (OSError, ValueError):
            pass

    href = (obj.download_href or "").strip()
    rel = _media_relative_path_from_href(href)
    if rel:
        abs_path = os.path.normpath(os.path.join(settings.MEDIA_ROOT, rel))
        media_root = os.path.normpath(settings.MEDIA_ROOT)
        if abs_path.startswith(media_root) and os.path.isfile(abs_path):
            if inline:
                return FileResponse(open(abs_path, "rb"), as_attachment=False, content_type="application/pdf")
            base = os.path.basename(abs_path) or attachment_filename
            return FileResponse(
                open(abs_path, "rb"),
                as_attachment=True,
                filename=base,
                content_type="application/pdf",
            )

    if href.startswith(("http://", "https://")):
        return HttpResponseRedirect(href)

    return None
