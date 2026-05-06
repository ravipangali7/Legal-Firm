"""DRF field: multipart file, data URL, clear; preserve unchanged /media/... round-trip."""

from __future__ import annotations

from django.core.files.uploadedfile import UploadedFile
from rest_framework import serializers

from .image_uploads import decode_data_url_to_content_file, urls_match_stored_file

# Pop in serializer.update() so ModelSerializer does not assign this placeholder.
PRESERVE_EXISTING_IMAGE = object()


class FlexibleImageField(serializers.Field):
    """Write: UploadedFile, data URL, ''/None to clear. Read: storage URL or ''."""

    default_error_messages = {
        "invalid_image": "Invalid image data.",
        "remote_url": "Remote image URLs are not supported. Upload an image file.",
    }

    def __init__(self, **kwargs):
        kwargs.setdefault("allow_null", True)
        super().__init__(**kwargs)

    def to_representation(self, value):
        if not value:
            return ""
        try:
            return value.url
        except ValueError:
            return ""

    def to_internal_value(self, data):
        if data is None or data == "":
            return None
        if hasattr(data, "read"):
            if not isinstance(data, UploadedFile):
                self.fail("invalid_image")
            return data
        if not isinstance(data, str):
            self.fail("invalid_image")
        s = data.strip()
        if not s:
            return None
        if s.startswith("data:"):
            cf = decode_data_url_to_content_file(s)
            if cf is None:
                self.fail("invalid_image")
            return cf
        if s.startswith("http://") or s.startswith("https://") or s.startswith("//"):
            self.fail("remote_url")
        parent = self.parent
        inst = getattr(parent, "instance", None) if parent else None
        if inst is not None:
            cur = getattr(inst, self.source, None)
            if cur and urls_match_stored_file(cur, s):
                return PRESERVE_EXISTING_IMAGE
        self.fail("invalid_image")


def pop_preserve_image(validated_data: dict, key: str = "image") -> None:
    """Remove PRESERVE_EXISTING_IMAGE sentinel from validated_data for ModelSerializer.update."""
    if validated_data.get(key) is PRESERVE_EXISTING_IMAGE:
        validated_data.pop(key, None)
