"""Top-level API URL includes for the core app."""

from django.urls import include, path

urlpatterns = [
    path("", include("core.urls.client_urls")),
    path("admin/", include("core.urls.admin_urls")),
]
