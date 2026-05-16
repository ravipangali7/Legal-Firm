"""DRF serializers for public and admin JSON APIs."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .flexible_image import FlexibleImageField, pop_preserve_image
from .phone_auth import find_user_by_phone_digits, normalize_phone_digits, phone_login_email
from .models import (
    AboutSection,
    AboutStat,
    Act,
    ActCategory,
    AppSettings,
    BlogPost,
    Client,
    FooterColumn,
    FooterConfig,
    FooterLink,
    FooterSocialLink,
    HelpArticle,
    HeroSlide,
    LegalCase,
    LegalCaseCategory,
    NewsItem,
    Notice,
    NoticeAudienceVote,
    KnowledgeResource,
    KnowledgeResourceCategory,
    PracticeArea,
    PermissionModule,
    PricingPageConfig,
    PricingPlan,
    Procedure,
    ProcedureCategory,
    ProcedureStep,
    Project,
    Role,
    RolePermission,
    ServiceItem,
    SiteHomepageConfig,
    SiteNavChild,
    SiteNavItem,
    Summary,
    SummaryAudienceVote,
    SummaryCategory,
    TeamMember,
    Transaction,
    UserActivityLog,
    UserBookmark,
    UserInAppNotification,
    UserProfile,
)

from .sync_user_client import sync_crm_client_for_user

User = get_user_model()


# ——— Public read serializers ———


class AppSettingsPublicSerializer(serializers.ModelSerializer):
    google_oauth_client_id = serializers.SerializerMethodField()
    khalti_enabled = serializers.SerializerMethodField()
    esewa_test_mode = serializers.SerializerMethodField()

    class Meta:
        model = AppSettings
        fields = (
            "site_name",
            "site_logo",
            "site_favicon",
            "support_email",
            "support_phone",
            "currency",
            "tax_rate",
            "maintenance_mode",
            "allow_signups",
            "email_notifications",
            "payments_enabled",
            "esewa_enabled",
            "esewa_test_mode",
            "khalti_enabled",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "og_image",
            "canonical_url",
            "ga_id",
            "robots_txt",
            "nav_order",
            "google_oauth_client_id",
        )

    def get_google_oauth_client_id(self, obj):
        return getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""

    def get_khalti_enabled(self, obj):
        return False

    def get_esewa_test_mode(self, obj):
        """eSewa checkout is fixed to UAT only (see `esewa_integration.md` in the repo)."""
        return True


class ActSerializer(serializers.ModelSerializer):
    """Public list/detail: `category` is the display name (back-compat); `category_slug` is stable."""

    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SlugField(source="category.slug", read_only=True)

    class Meta:
        model = Act
        fields = (
            "slug",
            "title_en",
            "title_ne",
            "category",
            "category_slug",
            "year",
            "updated",
            "premium",
        )


class PremiumContentSerializerMixin:
    """Strip or encrypt protected fields on premium rows when the caller lacks library access."""

    premium_content_fields: tuple[str, ...] = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from core.premium_content import gate_premium_content

        return gate_premium_content(
            data,
            is_premium=bool(getattr(instance, "premium", False)),
            protected_keys=self.premium_content_fields,
            request=self.context.get("request"),
        )


class ActDetailSerializer(PremiumContentSerializerMixin, ActSerializer):
    """Single-act payload including optional CMS `detail_json` for the public law reader."""

    premium_content_fields = ("detail_json",)

    class Meta(ActSerializer.Meta):
        fields = ActSerializer.Meta.fields + ("detail_json",)


class SummaryCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SummaryCategory
        fields = ("id", "slug", "name", "color", "sort_order")


class ActCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActCategory
        fields = ("id", "slug", "name", "color", "sort_order")


class LegalCaseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalCaseCategory
        fields = ("id", "slug", "name", "color", "sort_order")


class ProcedureCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCategory
        fields = ("id", "slug", "name", "color", "sort_order")


class SummarySerializer(PremiumContentSerializerMixin, serializers.ModelSerializer):
    category_slug = serializers.SlugField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    my_vote = serializers.SerializerMethodField()

    premium_content_fields = ("body",)

    class Meta:
        model = Summary
        fields = (
            "id",
            "slug",
            "title",
            "category",
            "category_slug",
            "category_name",
            "posted",
            "views",
            "upvotes",
            "downvotes",
            "preview",
            "premium",
            "body",
            "my_vote",
        )

    def get_my_vote(self, obj: Summary) -> str | None:
        request = self.context.get("request")
        if not request:
            return None
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            row = (
                SummaryAudienceVote.objects.filter(summary=obj, user=user)
                .only("vote")
                .first()
            )
            return row.vote if row else None
        raw = (request.headers.get("X-Visitor-Id") or "").strip()
        if not raw:
            return None
        try:
            uuid.UUID(raw)
        except ValueError:
            return None
        row = (
            SummaryAudienceVote.objects.filter(summary=obj, visitor_key=raw[:64])
            .only("vote")
            .first()
        )
        return row.vote if row else None


class LegalCaseSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SlugField(source="category.slug", read_only=True)

    class Meta:
        model = LegalCase
        fields = (
            "id",
            "slug",
            "title",
            "reference_number",
            "date_filed",
            "date_decided",
            "court",
            "category",
            "category_slug",
            "practice_area",
            "teaser",
            "parties",
            "summary",
            "outcome",
            "full_content",
        )


class PracticeAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeArea
        fields = (
            "id",
            "slug",
            "name",
            "icon",
            "overview",
            "tags",
            "related_cases_title",
            "services",
            "sort_order",
        )


class ProcedureStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureStep
        fields = ("id", "order", "description")


class ProcedureSerializer(serializers.ModelSerializer):
    steps = ProcedureStepSerializer(many=True, read_only=True)
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SlugField(source="category.slug", read_only=True)

    class Meta:
        model = Procedure
        fields = (
            "id",
            "slug",
            "category",
            "category_slug",
            "title",
            "summary",
            "steps_count",
            "duration_label",
            "icon",
            "steps",
        )


class ProcedureListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.SlugField(source="category.slug", read_only=True)

    class Meta:
        model = Procedure
        fields = (
            "id",
            "slug",
            "category",
            "category_slug",
            "title",
            "summary",
            "steps_count",
            "duration_label",
            "icon",
        )


class PricingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingPlan
        fields = (
            "id",
            "name",
            "monthly",
            "yearly",
            "features",
            "cta",
            "highlight",
            "enabled",
            "sort_order",
        )


class PricingPageFaqSerializer(serializers.ModelSerializer):
    """Minimal FAQ row for the public pricing page."""

    class Meta:
        model = HelpArticle
        fields = ("id", "title", "content", "sort_order")


class PricingPageConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingPageConfig
        fields = (
            "page_title",
            "page_subtitle",
            "faq_section_title",
            "popular_badge_label",
            "faq_category",
        )


class BlogPostPublicListSerializer(serializers.ModelSerializer):
    """Published list payload without full body (see BlogPostSerializer for detail)."""

    author_email = serializers.EmailField(source="author.email", read_only=True, allow_null=True)

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "excerpt",
            "author",
            "author_email",
            "author_name",
            "category",
            "date",
            "published",
            "featured",
        )


class BlogPostSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True, allow_null=True)

    class Meta:
        model = BlogPost
        fields = (
            "id",
            "title",
            "excerpt",
            "author",
            "author_email",
            "author_name",
            "category",
            "date",
            "published",
            "featured",
            "body",
        )


class HelpArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpArticle
        fields = (
            "id",
            "title",
            "category",
            "content",
            "sort_order",
            "published",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class NoticePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notice
        fields = (
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


class NoticePublicDetailSerializer(NoticePublicSerializer):
    """Published notice detail (full body, Nepali fields, current visitor vote)."""

    my_vote = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = NoticePublicSerializer.Meta.fields + (
            "body",
            "body_ne",
            "issued_by_ne",
            "my_vote",
        )

    def get_my_vote(self, obj: Notice) -> str | None:
        request = self.context.get("request")
        if not request:
            return None
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            row = (
                NoticeAudienceVote.objects.filter(notice=obj, user=user)
                .only("vote")
                .first()
            )
            return row.vote if row else None
        raw = (request.headers.get("X-Visitor-Id") or "").strip()
        if not raw:
            return None
        try:
            uuid.UUID(raw)
        except ValueError:
            return None
        row = (
            NoticeAudienceVote.objects.filter(notice=obj, visitor_key=raw[:64])
            .only("vote")
            .first()
        )
        return row.vote if row else None


class NoticeAdminSerializer(serializers.ModelSerializer):
    def validate_slug(self, value: str) -> str:
        s = (value or "").strip().lower()
        if not s:
            raise serializers.ValidationError("Slug is required.")
        if len(s) > 255:
            raise serializers.ValidationError("Slug is too long.")
        for c in s:
            if not (c.isascii() and (c.isalnum() or c in "-_")):
                raise serializers.ValidationError(
                    "Use URL-safe characters: ASCII letters, digits, hyphens, or underscores."
                )
        return s

    def validate_tags(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("tags must be a list of strings.")
        out: list[str] = []
        for x in value:
            if not isinstance(x, str):
                raise serializers.ValidationError("Each tag must be a string.")
            t = x.strip()
            if t:
                out.append(t[:128])
        return out

    class Meta:
        model = Notice
        fields = (
            "id",
            "slug",
            "title",
            "excerpt",
            "body",
            "title_ne",
            "excerpt_ne",
            "body_ne",
            "tags",
            "issued_by",
            "issued_by_ne",
            "published",
            "sort_order",
            "view_count",
            "upvotes",
            "downvotes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


KNOWLEDGE_PDF_MAX_BYTES = 25 * 1024 * 1024


class KnowledgeResourceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeResourceCategory
        fields = ("id", "name", "sort_order")


class KnowledgeResourceCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeResourceCategory
        fields = ("id", "name", "sort_order")
        read_only_fields = ("id",)

    def validate_name(self, value: str) -> str:
        t = (value or "").strip()
        if not t:
            raise serializers.ValidationError("Name is required.")
        if len(t) > 64:
            raise serializers.ValidationError("Name must be 64 characters or fewer.")
        qs = KnowledgeResourceCategory.objects.filter(name__iexact=t)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return t

    def update(self, instance, validated_data):
        old_name = instance.name
        new_name = validated_data.get("name", old_name)
        if new_name != old_name:
            KnowledgeResource.objects.filter(category=old_name).update(category=new_name)
        return super().update(instance, validated_data)


def _human_file_size(num_bytes: int) -> str:
    n = max(0, int(num_bytes))
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


class KnowledgeResourcePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeResource
        fields = (
            "id",
            "title",
            "description",
            "category",
            "download_href",
            "file_type",
            "file_size_label",
            "download_count",
        )


class KnowledgeResourceAdminSerializer(serializers.ModelSerializer):
    pdf_file = serializers.FileField(write_only=True, required=False, allow_null=True)

    def validate_category(self, value: str) -> str:
        t = (value or "").strip()
        if not KnowledgeResourceCategory.objects.filter(name=t).exists():
            raise serializers.ValidationError(
                "category must match a knowledge base category managed under Legal library → Knowledge base categories."
            )
        return t

    def validate_pdf_file(self, value):
        if value is None:
            return value
        if value.size > KNOWLEDGE_PDF_MAX_BYTES:
            raise serializers.ValidationError("PDF must be 25 MB or smaller.")
        name = (getattr(value, "name", "") or "").lower()
        ct = (getattr(value, "content_type", "") or "").lower()
        if not name.endswith(".pdf") and "pdf" not in ct:
            raise serializers.ValidationError("Only PDF uploads are allowed.")
        return value

    def validate(self, attrs):
        pdf = attrs.get("pdf_file")
        if self.instance is None and not pdf:
            raise serializers.ValidationError({"pdf_file": "Upload a PDF file for this resource."})
        return attrs

    def create(self, validated_data):
        pdf = validated_data.pop("pdf_file")
        obj = KnowledgeResource.objects.create(**validated_data, download_href="")
        obj.pdf_file.save(pdf.name, pdf, save=True)
        self._sync_pdf_metadata(obj)
        return obj

    def update(self, instance, validated_data):
        pdf = validated_data.pop("pdf_file", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if pdf:
            if instance.pdf_file:
                instance.pdf_file.delete(save=False)
            instance.pdf_file.save(pdf.name, pdf, save=True)
        instance.save()
        if pdf:
            self._sync_pdf_metadata(instance)
        return instance

    def _sync_pdf_metadata(self, obj: KnowledgeResource) -> None:
        if not obj.pdf_file:
            return
        try:
            sz = obj.pdf_file.size
        except (OSError, ValueError):
            sz = 0
        KnowledgeResource.objects.filter(pk=obj.pk).update(
            download_href=obj.pdf_file.url,
            file_type="PDF",
            file_size_label=_human_file_size(sz),
        )
        obj.refresh_from_db()

    class Meta:
        model = KnowledgeResource
        fields = (
            "id",
            "title",
            "description",
            "category",
            "pdf_file",
            "download_href",
            "file_type",
            "file_size_label",
            "download_count",
            "published",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "download_href",
            "file_type",
            "file_size_label",
            "download_count",
        )


# ——— Auth / user ———


class UserMeSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(slug_field="key", read_only=True)
    profile = serializers.SerializerMethodField()
    library_entitlement_active = serializers.SerializerMethodField()
    premium_billing_active = serializers.SerializerMethodField()
    renewal_recommended = serializers.SerializerMethodField()
    unread_notifications_count = serializers.SerializerMethodField()
    admin_permissions = serializers.SerializerMethodField()
    portal_permissions = serializers.SerializerMethodField()
    app_home_path = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "subscribed",
            "plan",
            "avatar",
            "created_at",
            "last_login_at",
            "subscription_period_start",
            "subscription_period_end",
            "plan_benefits_end",
            "library_entitlement_active",
            "premium_billing_active",
            "renewal_recommended",
            "unread_notifications_count",
            "profile",
            "is_staff",
            "is_superuser",
            "admin_permissions",
            "portal_permissions",
            "app_home_path",
        )

    def get_profile(self, obj):
        try:
            p = obj.profile
            return {
                "user_type": p.user_type,
                "pan": p.pan,
                "vat": p.vat,
                "company_name": p.company_name,
            }
        except UserProfile.DoesNotExist:
            return None

    def get_library_entitlement_active(self, obj):
        from .subscription_service import library_entitlement_active

        return library_entitlement_active(obj)

    def get_premium_billing_active(self, obj):
        from .subscription_service import premium_billing_active

        return premium_billing_active(obj)

    def get_renewal_recommended(self, obj):
        from .subscription_service import renewal_recommended

        return renewal_recommended(obj)

    def get_unread_notifications_count(self, obj):
        return UserInAppNotification.objects.filter(user=obj, read=False).count()

    def get_admin_permissions(self, obj):
        from core.rbac import admin_permissions_for_user

        if not obj.is_staff:
            return None
        return admin_permissions_for_user(obj)

    def get_portal_permissions(self, obj):
        from core.rbac import portal_permissions_for_user

        return portal_permissions_for_user(obj)

    def get_app_home_path(self, obj):
        from core.rbac import post_auth_app_home_path

        return post_auth_app_home_path(obj)


class UserSelfUpdateSerializer(serializers.ModelSerializer):
    """Authenticated user may PATCH their own name, contact, avatar, password, and tax profile fields."""

    avatar = FlexibleImageField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_type = serializers.ChoiceField(
        write_only=True, required=False, choices=UserProfile.UserType.choices
    )
    pan = serializers.CharField(write_only=True, required=False, allow_blank=True)
    vat = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "full_name",
            "phone",
            "email",
            "avatar",
            "password",
            "user_type",
            "pan",
            "vat",
            "company_name",
        )

    def validate_email(self, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return value
        return str(value).strip().lower()

    def validate(self, attrs):
        inst = self.instance
        empty = serializers.empty

        email_val = attrs["email"] if "email" in attrs else empty
        phone_val = attrs["phone"] if "phone" in attrs else empty

        raw_email = email_val if email_val is not empty else inst.email
        email = (raw_email or "").strip().lower() if raw_email else ""
        raw_phone = phone_val if phone_val is not empty else inst.phone
        phone = (raw_phone or "").strip() if raw_phone else ""

        digits = normalize_phone_digits(phone)
        if not email and len(digits) < 10:
            raise serializers.ValidationError(
                {"non_field_errors": ["Keep an email address or a phone number with at least 10 digits."]}
            )

        qs = User.objects.exclude(pk=inst.pk)
        if email and qs.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})

        if len(digits) >= 10:
            other = find_user_by_phone_digits(digits)
            if other and other.pk != inst.pk:
                raise serializers.ValidationError({"phone": "A user with this phone number already exists."})

        try:
            prof = inst.profile
        except UserProfile.DoesNotExist:
            prof = None

        def pick_str(key: str) -> str:
            if key in attrs:
                return (attrs[key] or "").strip() if isinstance(attrs[key], str) else ""
            if prof:
                return (getattr(prof, key) or "").strip()
            return ""

        ut = attrs["user_type"] if "user_type" in attrs else (
            prof.user_type if prof else UserProfile.UserType.INDIVIDUAL
        )
        pan = pick_str("pan")
        vat = pick_str("vat")
        company_name = pick_str("company_name")

        if ut == UserProfile.UserType.BUSINESS:
            if len(pan) < 9:
                raise serializers.ValidationError({"pan": "PAN is required for business (min 9 characters)."})
            if len(vat) < 9:
                raise serializers.ValidationError({"vat": "VAT is required for business (min 9 characters)."})
            if len(company_name) < 2:
                raise serializers.ValidationError({"company_name": "Company name is required for business."})

        return attrs

    def update(self, instance, validated_data):
        pop_preserve_image(validated_data, "avatar")
        pw = validated_data.pop("password", None)
        ut = validated_data.pop("user_type", None)
        pan = validated_data.pop("pan", None)
        vat = validated_data.pop("vat", None)
        company_name = validated_data.pop("company_name", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if pw:
            instance.set_password(pw)
        instance.save()
        if any(x is not None for x in (ut, pan, vat, company_name)):
            defaults = {}
            if ut is not None:
                defaults["user_type"] = ut
            if pan is not None:
                defaults["pan"] = pan
            if vat is not None:
                defaults["vat"] = vat
            if company_name is not None:
                defaults["company_name"] = company_name
            prof, _ = UserProfile.objects.get_or_create(user=instance)
            for k, v in defaults.items():
                setattr(prof, k, v)
            prof.save()
        return instance


class UserBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserBookmark
        fields = ("id", "title", "path", "created_at")


class UserActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActivityLog
        fields = ("id", "verb", "object_label", "path", "created_at")


class UserInAppNotificationSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    class Meta:
        model = UserInAppNotification
        fields = ("id", "title", "body", "read", "link", "created_at", "type")

    def get_type(self, obj: UserInAppNotification) -> str:
        b = getattr(obj, "broadcast", None)
        if b and getattr(b, "notification_type", None):
            return str(b.notification_type)
        return "info"


class MyTransactionSerializer(serializers.ModelSerializer):
    """Billing rows on the subscriber dashboard (includes package validity copy for pending/verified)."""

    package_validity_summary = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            "id",
            "invoice",
            "amount",
            "currency",
            "method",
            "status",
            "plan",
            "billing_cycle",
            "rejection_reason",
            "package_validity_summary",
            "created_at",
        )

    def get_package_validity_summary(self, obj: Transaction):
        from .subscription_service import package_validity_customer_summary

        if obj.status in (Transaction.Status.REJECTED, Transaction.Status.REFUNDED):
            return ""
        cycle = getattr(obj, "billing_cycle", None) or Transaction.BillingCycle.MONTHLY
        return package_validity_customer_summary(cycle)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# ——— Admin serializers ———


class UserAdminSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(slug_field="key", queryset=Role.objects.all())
    profile = serializers.SerializerMethodField()
    avatar = FlexibleImageField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_type = serializers.ChoiceField(
        write_only=True, required=False, choices=UserProfile.UserType.choices
    )
    pan = serializers.CharField(write_only=True, required=False, allow_blank=True)
    vat = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "status",
            "subscribed",
            "plan",
            "avatar",
            "created_at",
            "last_login_at",
            "subscription_period_start",
            "subscription_period_end",
            "plan_benefits_end",
            "profile",
            "password",
            "user_type",
            "pan",
            "vat",
            "company_name",
        )
        read_only_fields = (
            "id",
            "created_at",
            "last_login_at",
        )

    def get_profile(self, obj):
        try:
            p = obj.profile
            return {
                "user_type": p.user_type,
                "pan": p.pan,
                "vat": p.vat,
                "company_name": p.company_name,
            }
        except UserProfile.DoesNotExist:
            return None

    def validate(self, attrs):
        inst = self.instance
        empty = serializers.empty

        email_val = attrs["email"] if "email" in attrs else empty
        phone_val = attrs["phone"] if "phone" in attrs else empty

        if inst is None:
            email = (email_val or "").strip().lower() if email_val not in (empty, None) else ""
            phone = (phone_val or "").strip() if phone_val not in (empty, None) else ""
        else:
            raw_email = email_val if email_val is not empty else inst.email
            email = (raw_email or "").strip().lower() if raw_email else ""
            raw_phone = phone_val if phone_val is not empty else inst.phone
            phone = (raw_phone or "").strip() if raw_phone else ""

        digits = normalize_phone_digits(phone)

        if inst is None:
            if not email and len(digits) < 10:
                raise serializers.ValidationError(
                    {"non_field_errors": ["Provide an email address or a phone number with at least 10 digits."]}
                )

        qs = User.objects.all()
        if inst:
            qs = qs.exclude(pk=inst.pk)
        if email:
            if qs.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "A user with this email already exists."})

        if len(digits) >= 10:
            other = find_user_by_phone_digits(digits)
            if other and (not inst or other.pk != inst.pk):
                raise serializers.ValidationError({"phone": "A user with this phone number already exists."})

        return attrs

    def create(self, validated_data):
        pop_preserve_image(validated_data, "avatar")
        pw = validated_data.pop("password", None)
        if not pw:
            raise serializers.ValidationError({"password": "Required for new users."})
        ut = validated_data.pop("user_type", UserProfile.UserType.INDIVIDUAL)
        pan = validated_data.pop("pan", "") or ""
        vat = validated_data.pop("vat", "") or ""
        company_name = validated_data.pop("company_name", "") or ""
        email_raw = validated_data.get("email")
        email = (email_raw or "").strip().lower() if email_raw else ""
        phone = validated_data.get("phone") or ""
        digits = normalize_phone_digits(phone)
        if not email:
            validated_data["email"] = phone_login_email(digits)
        else:
            validated_data["email"] = email
        role_obj = validated_data.get("role")
        role_key = getattr(role_obj, "key", "")
        if role_key == "super_admin":
            validated_data["is_staff"] = True
            validated_data["is_superuser"] = True
        else:
            validated_data["is_staff"] = True
            validated_data["is_superuser"] = False
        user = User.objects.create_user(password=pw, **validated_data)
        UserProfile.objects.create(
            user=user,
            user_type=ut,
            pan=pan,
            vat=vat,
            company_name=company_name,
        )
        sync_crm_client_for_user(user)
        return user

    def update(self, instance, validated_data):
        pop_preserve_image(validated_data, "avatar")
        pw = validated_data.pop("password", None)
        ut = validated_data.pop("user_type", None)
        pan = validated_data.pop("pan", None)
        vat = validated_data.pop("vat", None)
        company_name = validated_data.pop("company_name", None)
        sync_benefits_to_period_end = (
            "subscription_period_end" in validated_data and "plan_benefits_end" not in validated_data
        )
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if "role" in validated_data:
            role_key = getattr(instance.role, "key", "")
            if role_key == "super_admin":
                instance.is_staff = True
                instance.is_superuser = True
            else:
                instance.is_staff = True
                instance.is_superuser = False
        if sync_benefits_to_period_end:
            instance.plan_benefits_end = instance.subscription_period_end
        if pw:
            instance.set_password(pw)
        instance.save()
        if any(x is not None for x in (ut, pan, vat, company_name)):
            defaults = {}
            if ut is not None:
                defaults["user_type"] = ut
            if pan is not None:
                defaults["pan"] = pan
            if vat is not None:
                defaults["vat"] = vat
            if company_name is not None:
                defaults["company_name"] = company_name
            prof, _ = UserProfile.objects.get_or_create(user=instance)
            for k, v in defaults.items():
                setattr(prof, k, v)
            prof.save()
        sync_crm_client_for_user(instance)
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for k in ("password", "user_type", "pan", "vat", "company_name"):
            data.pop(k, None)
        return data


class PermissionModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionModule
        fields = ("id", "name")


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = ("id", "role", "module", "can_view", "can_create", "can_edit", "can_delete")


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "key", "description", "is_system")


class TransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "invoice",
            "user",
            "user_email",
            "user_name",
            "email",
            "amount",
            "currency",
            "method",
            "status",
            "txn_code",
            "plan",
            "billing_cycle",
            "rejection_reason",
            "created_at",
        )
        read_only_fields = ("id", "invoice", "created_at")


class ClientSerializer(serializers.ModelSerializer):
    active_projects_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = (
            "id",
            "company",
            "contact",
            "email",
            "phone",
            "type",
            "pan_vat",
            "status",
            "joined_at",
            "active_projects_count",
        )

    def get_active_projects_count(self, obj):
        return obj.active_projects_count()


class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.company", read_only=True)
    team_member_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "client",
            "client_name",
            "type",
            "status",
            "progress",
            "due_date",
            "team_member_ids",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["team"] = [str(u.id) for u in instance.team.all()]
        return data

    def create(self, validated_data):
        team_ids = validated_data.pop("team_member_ids", None)
        project = Project.objects.create(**validated_data)
        if team_ids is not None:
            project.team.set(User.objects.filter(id__in=team_ids))
        return project

    def update(self, instance, validated_data):
        team_ids = validated_data.pop("team_member_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if team_ids is not None:
            instance.team.set(User.objects.filter(id__in=team_ids))
        return instance


class AppSettingsAdminSerializer(serializers.ModelSerializer):
    og_image = FlexibleImageField(required=False, allow_null=True)
    site_logo = FlexibleImageField(required=False, allow_null=True)
    site_favicon = FlexibleImageField(required=False, allow_null=True)

    class Meta:
        model = AppSettings
        fields = "__all__"

    def update(self, instance, validated_data):
        pop_preserve_image(validated_data, "og_image")
        pop_preserve_image(validated_data, "site_logo")
        pop_preserve_image(validated_data, "site_favicon")
        validated_data["khalti_enabled"] = False
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data["khalti_enabled"] = False
        return super().create(validated_data)


class HeroSlideSerializer(serializers.ModelSerializer):
    image = FlexibleImageField(required=False, allow_null=True)

    class Meta:
        model = HeroSlide
        fields = (
            "id",
            "order",
            "enabled",
            "eyebrow",
            "title",
            "subtitle",
            "cta",
            "href",
            "secondary_cta",
            "secondary_href",
            "image",
        )

    def create(self, validated_data):
        pop_preserve_image(validated_data, "image")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        pop_preserve_image(validated_data, "image")
        return super().update(instance, validated_data)


class SiteNavChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteNavChild
        fields = ("id", "label", "href", "order")


class SiteNavItemSerializer(serializers.ModelSerializer):
    children = SiteNavChildSerializer(many=True, read_only=True)

    class Meta:
        model = SiteNavItem
        fields = ("id", "order", "enabled", "label", "href", "is_dropdown", "children")


class AboutStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutStat
        fields = ("id", "label", "value", "order")


class AboutSectionSerializer(serializers.ModelSerializer):
    stats = AboutStatSerializer(many=True, read_only=True)

    class Meta:
        model = AboutSection
        fields = ("enabled", "eyebrow", "title", "body", "image", "stats")


class ServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceItem
        fields = ("id", "order", "enabled", "icon", "title", "description", "href")


class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = (
            "id",
            "order",
            "enabled",
            "name",
            "role",
            "bio",
            "avatar",
            "linkedin_url",
            "facebook_url",
            "twitter_url",
            "instagram_url",
            "contact_email",
            "years_experience",
        )


class NewsItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsItem
        fields = ("id", "order", "enabled", "title", "excerpt", "body", "image", "date", "href", "tag")


class FooterLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = FooterLink
        fields = ("id", "label", "href", "order")


class FooterColumnSerializer(serializers.ModelSerializer):
    links = FooterLinkSerializer(many=True, read_only=True)

    class Meta:
        model = FooterColumn
        fields = ("id", "title", "order", "links")


class FooterSocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = FooterSocialLink
        fields = ("id", "label", "href", "order")


class FooterConfigSerializer(serializers.ModelSerializer):
    columns = FooterColumnSerializer(many=True, read_only=True)
    social_links = FooterSocialLinkSerializer(many=True, read_only=True)

    class Meta:
        model = FooterConfig
        fields = ("tagline", "copyright", "columns", "social_links")


# ——— Staff admin: legal / knowledge base ———


def _json_list_of_strings(value, field_name: str) -> list:
    if value is None:
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError({field_name: "Must be a JSON array of strings."})
    out: list[str] = []
    for i, item in enumerate(value):
        if not isinstance(item, str):
            raise serializers.ValidationError({field_name: f"Item {i} must be a string."})
        out.append(item)
    return out


def _json_list_of_objects(value, field_name: str) -> list:
    if value is None:
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError({field_name: "Must be a JSON array of objects."})
    for i, item in enumerate(value):
        if not isinstance(item, dict):
            raise serializers.ValidationError({field_name: f"Item {i} must be an object."})
    return value


def _json_object(value, field_name: str) -> dict:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError({field_name: "Must be a JSON object."})
    return value


class PracticeAreaAdminSerializer(serializers.ModelSerializer):
    """Staff CRUD; validates JSON list shapes used by the public practice-area page."""

    class Meta:
        model = PracticeArea
        fields = PracticeAreaSerializer.Meta.fields

    def validate_tags(self, value):
        return _json_list_of_strings(value, "tags")

    def validate_services(self, value):
        return _json_list_of_objects(value, "services")


class LegalCaseAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = LegalCase
        fields = (
            "id",
            "slug",
            "title",
            "reference_number",
            "date_filed",
            "date_decided",
            "court",
            "category",
            "category_name",
            "practice_area",
            "teaser",
            "parties",
            "summary",
            "outcome",
            "full_content",
        )

    def validate_full_content(self, value):
        return _json_object(value, "full_content")

    def validate_practice_area(self, value):
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("A practice area slug is required.")
        if not PracticeArea.objects.filter(slug=raw).exists():
            raise serializers.ValidationError(f'No practice area with slug "{raw}".')
        return raw


class SummaryCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SummaryCategory
        fields = SummaryCategorySerializer.Meta.fields


class ActCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActCategory
        fields = ActCategorySerializer.Meta.fields


class LegalCaseCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalCaseCategory
        fields = LegalCaseCategorySerializer.Meta.fields


class ProcedureCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCategory
        fields = ProcedureCategorySerializer.Meta.fields


class SummaryAdminSerializer(serializers.ModelSerializer):
    """Staff summary editor (no per-visitor vote fields)."""

    class Meta:
        model = Summary
        fields = (
            "id",
            "slug",
            "title",
            "category",
            "posted",
            "views",
            "upvotes",
            "downvotes",
            "preview",
            "premium",
            "body",
        )


class ActAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Act
        fields = (
            "slug",
            "title_en",
            "title_ne",
            "category",
            "category_name",
            "year",
            "updated",
            "premium",
            "detail_json",
        )

    def update(self, instance, validated_data):
        validated_data.pop("slug", None)
        return super().update(instance, validated_data)


class ProcedureStepAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureStep
        fields = ("id", "order", "description")


class ProcedureAdminSerializer(serializers.ModelSerializer):
    steps = ProcedureStepAdminSerializer(many=True, required=False)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Procedure
        fields = (
            "id",
            "slug",
            "category",
            "category_name",
            "title",
            "summary",
            "steps_count",
            "duration_label",
            "icon",
            "steps",
        )
        read_only_fields = ("steps_count",)

    def _sync_steps(self, procedure: Procedure, steps_data: list | None) -> None:
        if steps_data is None:
            return
        procedure.steps.all().delete()
        for row in steps_data:
            if not isinstance(row, dict):
                continue
            order = int(row.get("order", 0))
            desc = str(row.get("description", ""))
            ProcedureStep.objects.create(procedure=procedure, order=order, description=desc)
        procedure.steps_count = procedure.steps.count()
        procedure.save(update_fields=["steps_count"])

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", None)
        proc = Procedure.objects.create(**validated_data)
        if steps_data is not None:
            self._sync_steps(proc, steps_data)
        return proc

    def update(self, instance, validated_data):
        steps_data = validated_data.pop("steps", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if steps_data is not None:
            self._sync_steps(instance, steps_data)
        return instance
