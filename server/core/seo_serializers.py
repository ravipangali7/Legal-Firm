"""Serializer helpers that omit SEO fields when DB columns are not migrated yet."""

from __future__ import annotations

from rest_framework import serializers

from core.seo_schema import _SEO_META_FIELD_NAMES, seo_meta_columns_applied


class SeoMetaSerializerMixin:
    """Drop meta_title/meta_description from output when migration 0043 is not applied."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not seo_meta_columns_applied():
            for name in _SEO_META_FIELD_NAMES:
                self.fields.pop(name, None)
