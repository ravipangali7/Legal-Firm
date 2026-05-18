"""Detect whether SEO meta columns exist and build ORM/serializer payloads safely."""

from __future__ import annotations

from functools import lru_cache

from django.db import connection

from core.models import Act

_SEO_META_FIELD_NAMES = ("meta_title", "meta_description")
_SEO_OG_IMAGE_FIELD = "meta_og_image"


def invalidate_seo_meta_schema_cache() -> None:
    seo_meta_columns_applied.cache_clear()
    seo_meta_columns_applied_for_table.cache_clear()


@lru_cache(maxsize=32)
def seo_meta_columns_applied_for_table(table: str) -> bool:
    """True when ``meta_title`` exists on the given table (post-0043 for that entity)."""
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table)
        return any(col.name == "meta_title" for col in columns)
    except Exception:
        return False


def seo_meta_columns_applied_for_model(model) -> bool:
    return seo_meta_columns_applied_for_table(model._meta.db_table)


@lru_cache(maxsize=32)
def seo_meta_og_column_applied_for_table(table: str) -> bool:
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table)
        return any(col.name == _SEO_OG_IMAGE_FIELD for col in columns)
    except Exception:
        return False


def seo_meta_og_column_applied_for_model(model) -> bool:
    return seo_meta_og_column_applied_for_table(model._meta.db_table)


@lru_cache(maxsize=1)
def seo_meta_columns_applied() -> bool:
    """True after migration 0043 on ``Act``; kept for legacy callers."""
    return seo_meta_columns_applied_for_table(Act._meta.db_table)


def only_with_optional_seo(*base_fields: str, model: type | None = None) -> tuple[str, ...]:
    """Field names for QuerySet.only() — appends SEO columns when present on ``model``'s table."""
    from core.models import Act

    entity = model or Act
    extra: list[str] = []
    if seo_meta_columns_applied_for_model(entity):
        extra.extend(_SEO_META_FIELD_NAMES)
    if seo_meta_og_column_applied_for_model(entity):
        extra.append(_SEO_OG_IMAGE_FIELD)
    if extra:
        return (*base_fields, *extra)
    return base_fields


def act_api_queryset(qs=None):
    from core.models import Act

    qs = (qs if qs is not None else Act.objects).select_related("category")
    return qs.only(
        *only_with_optional_seo(
            "slug",
            "title_en",
            "title_ne",
            "year",
            "updated",
            "premium",
            "category_id",
            "category__slug",
            "category__name",
            model=Act,
        )
    )


def act_detail_queryset(qs=None):
    from core.models import Act

    qs = (qs if qs is not None else Act.objects).select_related("category")
    return qs.only(
        *only_with_optional_seo(
            "slug",
            "title_en",
            "title_ne",
            "year",
            "updated",
            "premium",
            "detail_json",
            "category_id",
            "category__slug",
            "category__name",
            model=Act,
        )
    )


def summary_api_queryset(qs=None):
    from core.models import Summary

    qs = (qs if qs is not None else Summary.objects).select_related("category")
    return qs.filter(category__slug__isnull=False).only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "posted",
            "views",
            "upvotes",
            "downvotes",
            "preview",
            "premium",
            "body",
            "category_id",
            "category__slug",
            "category__name",
            model=Summary,
        )
    )


def summary_list_api_queryset(qs=None):
    """Listing queryset: no ``body`` defer (detail endpoint loads full text)."""
    from core.models import Summary

    qs = (qs if qs is not None else Summary.objects).select_related("category")
    return qs.filter(category__slug__isnull=False).only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "posted",
            "views",
            "upvotes",
            "downvotes",
            "preview",
            "premium",
            "category_id",
            "category__slug",
            "category__name",
            model=Summary,
        )
    )


def legal_case_api_queryset(qs=None):
    from core.models import LegalCase

    qs = (qs if qs is not None else LegalCase.objects).select_related("category")
    return qs.only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "reference_number",
            "date_filed",
            "date_decided",
            "court",
            "practice_area",
            "teaser",
            "parties",
            "summary",
            "outcome",
            "full_content",
            "category_id",
            "category__slug",
            "category__name",
            model=LegalCase,
        )
    )


def procedure_api_queryset(qs=None):
    from core.models import Procedure

    qs = (qs if qs is not None else Procedure.objects).select_related("category")
    return qs.only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "summary",
            "steps_count",
            "duration_label",
            "icon",
            "category_id",
            "category__slug",
            "category__name",
            model=Procedure,
        )
    )


def procedure_detail_queryset(qs=None):
    from core.models import Procedure

    qs = (qs if qs is not None else Procedure.objects).select_related("category").prefetch_related(
        "steps"
    )
    return qs.only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "summary",
            "steps_count",
            "duration_label",
            "icon",
            "category_id",
            "category__slug",
            "category__name",
            model=Procedure,
        )
    )


def practice_area_api_queryset(qs=None):
    from core.models import PracticeArea

    qs = qs if qs is not None else PracticeArea.objects
    return qs.only(
        *only_with_optional_seo(
            "id",
            "slug",
            "name",
            "icon",
            "overview",
            "tags",
            "related_cases_title",
            "services",
            "sort_order",
            model=PracticeArea,
        )
    )


def blog_post_api_queryset(qs=None):
    from core.models import BlogPost

    qs = qs if qs is not None else BlogPost.objects
    return qs.only(
        *only_with_optional_seo(
            "id",
            "title",
            "excerpt",
            "author_id",
            "author_name",
            "category",
            "date",
            "published",
            "featured",
            model=BlogPost,
        )
    )


def blog_post_detail_queryset(qs=None):
    from core.models import BlogPost

    qs = qs if qs is not None else BlogPost.objects
    return qs.only(
        *only_with_optional_seo(
            "id",
            "title",
            "excerpt",
            "author_id",
            "author_name",
            "category",
            "date",
            "published",
            "featured",
            "body",
            model=BlogPost,
        )
    )


def notice_list_queryset(qs=None):
    from core.models import Notice

    qs = qs if qs is not None else Notice.objects
    return qs.only(
        "id",
        "slug",
        "title",
        "excerpt",
        "title_ne",
        "excerpt_ne",
        "tags",
        "issued_by",
        "published",
        "view_count",
        "upvotes",
        "downvotes",
        "created_at",
    )


def notice_detail_queryset(qs=None):
    from core.models import Notice

    qs = qs if qs is not None else Notice.objects
    return qs.only(
        *only_with_optional_seo(
            "id",
            "slug",
            "title",
            "excerpt",
            "title_ne",
            "excerpt_ne",
            "tags",
            "issued_by",
            "published",
            "view_count",
            "upvotes",
            "downvotes",
            "created_at",
            "body",
            "body_ne",
            "issued_by_ne",
            model=Notice,
        )
    )
