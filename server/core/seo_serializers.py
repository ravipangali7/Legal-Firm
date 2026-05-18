"""Serializer helpers that omit SEO fields when DB columns are not migrated yet."""

from __future__ import annotations

from rest_framework import serializers

from core.seo.base import resolve_og_image
from core.seo_schema import (
    _SEO_META_FIELD_NAMES,
    _SEO_OG_IMAGE_FIELD,
    seo_meta_columns_applied_for_model,
    seo_meta_og_column_applied_for_model,
)


class SeoMetaSerializerMixin:
    """
    SEO fields for public detail/list payloads.
    ``share_image`` is always resolved (entity OG → site Settings OG).
    """

    share_image = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        model = getattr(self.Meta, "model", None)
        if model is None or not seo_meta_columns_applied_for_model(model):
            for name in _SEO_META_FIELD_NAMES:
                self.fields.pop(name, None)
        if model is None or not seo_meta_og_column_applied_for_model(model):
            self.fields.pop(_SEO_OG_IMAGE_FIELD, None)

    def get_share_image(self, obj) -> str:
        request = self.context.get("request")
        return resolve_og_image(entity=obj, request=request)
