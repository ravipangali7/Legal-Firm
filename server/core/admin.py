from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.html import format_html

from . import models


# ——— Helpers (advanced list columns) ———


def _media_src(field_file) -> str:
    if not field_file:
        return ""
    try:
        return field_file.url
    except ValueError:
        return ""


def _img_cell(url: str, *, size: int = 40, radius: int = 6) -> str:
    if not url:
        return "—"
    return format_html(
        '<img src="{}" alt="" style="max-height:{}px;max-width:{}px;border-radius:{}px;object-fit:cover;'
        'vertical-align:middle;box-shadow:0 0 0 1px rgba(0,0,0,.06);" loading="lazy" />',
        url,
        size,
        int(size * 1.6),
        radius,
    )


def _pill(text: str, *, bg: str = "#e9ecef", fg: str = "#212529") -> str:
    return format_html(
        '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;'
        'background:{};color:{}">{}</span>',
        bg,
        fg,
        text,
    )


_STATUS_COLORS = {
    "active": ("#d1e7dd", "#0f5132"),
    "verified": ("#d1e7dd", "#0f5132"),
    "published": ("#cfe2ff", "#084298"),
    "draft": ("#fff3cd", "#664d03"),
    "pending": ("#fff3cd", "#664d03"),
    "planning": ("#e7f1ff", "#084298"),
    "in_progress": ("#cff4fc", "#055160"),
    "review": ("#e2d9f3", "#59359a"),
    "completed": ("#d3d3d4", "#1f2937"),
    "rejected": ("#f8d7da", "#842029"),
    "refunded": ("#fde2e4", "#9b1c1c"),
    "suspended": ("#f8d7da", "#842029"),
    "archived": ("#e2e3e5", "#41464b"),
    "inactive": ("#f8f9fa", "#495057"),
}


def status_pill(obj, field: str = "status") -> str:
    val = getattr(obj, field, None)
    if val is None:
        return "—"
    key = str(val).lower()
    bg, fg = _STATUS_COLORS.get(key, ("#e9ecef", "#212529"))
    label = getattr(obj, f"get_{field}_display", lambda: str(val))()
    return _pill(str(label), bg=bg, fg=fg)


class SingletonAdminMixin:
    """Hide “add” when the single row already exists."""

    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)


# ——— Inlines ———


class UserProfileInline(admin.StackedInline):
    model = models.UserProfile
    can_delete = False
    extra = 0
    fk_name = "user"
    classes = ("collapse",)


class RolePermissionInline(admin.StackedInline):
    model = models.RolePermission
    extra = 0
    autocomplete_fields = ("module",)
    classes = ("wide",)


class SiteNavChildInline(admin.StackedInline):
    model = models.SiteNavChild
    extra = 0
    ordering = ("order",)
    classes = ("wide",)


class AboutStatInline(admin.StackedInline):
    model = models.AboutStat
    extra = 0
    ordering = ("order",)
    fk_name = "section"


class FooterColumnInline(admin.StackedInline):
    model = models.FooterColumn
    extra = 0
    ordering = ("order",)
    show_change_link = True


class FooterSocialLinkInline(admin.StackedInline):
    model = models.FooterSocialLink
    extra = 0
    ordering = ("order",)


class FooterLinkInline(admin.StackedInline):
    model = models.FooterLink
    extra = 0
    ordering = ("order",)
    fk_name = "column"


class ProcedureStepInline(admin.StackedInline):
    model = models.ProcedureStep
    extra = 0
    ordering = ("order",)
    classes = ("wide",)


# ——— Users ———


@admin.register(models.User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("-created_at",)
    list_display = (
        "avatar_thumb",
        "email",
        "full_name",
        "role_badge",
        "status_badge",
        "plan_badge",
        "subscribed_icon",
        "created_at",
        "last_login_at",
    )
    list_filter = ("role", "status", "plan", "subscribed", "is_staff", "is_superuser")
    search_fields = ("email", "full_name", "phone")
    readonly_fields = (
        "created_at",
        "last_login",
        "date_joined",
        "avatar_thumb_large",
        "subscription_period_start",
        "subscription_period_end",
        "plan_benefits_end",
    )
    filter_horizontal = ()
    inlines = (UserProfileInline,)
    autocomplete_fields = ("role",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Profile",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "avatar",
                    "avatar_thumb_large",
                    "role",
                    "status",
                    "plan",
                    "subscribed",
                )
            },
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        (
            "Important dates",
            {
                "fields": (
                    "last_login",
                    "last_login_at",
                    "date_joined",
                    "created_at",
                    "subscription_period_start",
                    "subscription_period_end",
                    "plan_benefits_end",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "password1", "password2", "role", "status"),
            },
        ),
    )

    @admin.display(description="Avatar", ordering="avatar")
    def avatar_thumb(self, obj):
        return _img_cell(_media_src(obj.avatar))

    @admin.display(description="Preview")
    def avatar_thumb_large(self, obj):
        return _img_cell(_media_src(obj.avatar), size=72)

    @admin.display(description="Role", ordering="role__key")
    def role_badge(self, obj):
        colors = {
            "super_admin": ("#fde2e4", "#9b1c1c"),
            "admin": ("#cfe2ff", "#084298"),
            "editor": ("#d1e7dd", "#0f5132"),
            "client": ("#fff3cd", "#664d03"),
            "user": ("#e2e3e5", "#41464b"),
        }
        key = obj.role_key
        bg, fg = colors.get(key, ("#e9ecef", "#212529"))
        label = obj.role.name if getattr(obj, "role_id", None) else key.replace("_", " ").title()
        return _pill(label, bg=bg, fg=fg)

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return status_pill(obj, "status")

    @admin.display(description="Plan", ordering="plan")
    def plan_badge(self, obj):
        return _pill(obj.get_plan_display())

    @admin.display(description="Sub", boolean=False, ordering="subscribed")
    def subscribed_icon(self, obj):
        return "✓" if obj.subscribed else "—"


@admin.register(models.OtpVerification)
class OtpVerificationAdmin(admin.ModelAdmin):
    list_display = ("purpose", "phone_digits", "email", "code", "created_at", "expires_at", "used_at")
    list_filter = ("purpose", "created_at")
    readonly_fields = ("id", "purpose", "phone_digits", "email", "code", "created_at", "expires_at", "used_at")
    search_fields = ("phone_digits", "email")

    def has_add_permission(self, request):
        return False


@admin.register(models.PermissionModule)
class PermissionModuleAdmin(admin.ModelAdmin):
    search_fields = ("name",)
    list_display = ("name", "id")


@admin.register(models.Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "is_system", "id")
    list_filter = ("is_system",)
    search_fields = ("name", "key", "description")
    inlines = (RolePermissionInline,)
    fieldsets = (
        (None, {"fields": ("name", "key", "description", "is_system")}),
    )


@admin.register(models.RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "module", "can_view", "can_create", "can_edit", "can_delete")
    list_filter = ("can_view", "can_create", "can_edit", "can_delete")
    autocomplete_fields = ("role", "module")


# ——— Admin business ———


@admin.register(models.Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "invoice",
        "user",
        "email",
        "plan",
        "amount_fmt",
        "currency",
        "method_badge",
        "status_badge",
        "txn_code",
        "created_at",
    )
    list_filter = ("status", "currency", "method", "created_at")
    search_fields = ("invoice", "email", "txn_code", "user__email")
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "invoice",
                    "user",
                    "email",
                    "plan",
                    "billing_cycle",
                    "amount",
                    "currency",
                    "method",
                    "status",
                    "txn_code",
                    "rejection_reason",
                )
            },
        ),
        ("Meta", {"fields": ("created_at",)}),
    )

    @admin.display(description="Amount", ordering="amount")
    def amount_fmt(self, obj):
        text = f"{obj.amount:,.2f}"
        return format_html(
            '<span style="font-variant-numeric:tabular-nums;font-weight:600;">{}</span>',
            text,
        )

    @admin.display(description="Method", ordering="method")
    def method_badge(self, obj):
        return _pill(obj.get_method_display())

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return status_pill(obj, "status")


@admin.register(models.Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "contact",
        "email",
        "type_badge",
        "status_badge",
        "active_projects_badge",
        "joined_at",
    )
    list_filter = ("status", "type", "joined_at")
    search_fields = ("company", "contact", "email", "phone", "pan_vat")

    @admin.display(description="Type", ordering="type")
    def type_badge(self, obj):
        return _pill(obj.get_type_display())

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return status_pill(obj, "status")

    @admin.display(description="Active projects")
    def active_projects_badge(self, obj):
        n = obj.active_projects_count()
        return format_html(
            '<span style="font-variant-numeric:tabular-nums;font-weight:600;">{}</span>',
            n,
        )


@admin.register(models.Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "client",
        "type",
        "status_badge",
        "progress_bar",
        "due_date",
        "team_count",
    )
    list_filter = ("status", "due_date", "client")
    search_fields = ("name", "type", "client__company")
    autocomplete_fields = ("client",)
    filter_horizontal = ("team",)
    date_hierarchy = "due_date"
    fieldsets = (
        (None, {"fields": ("name", "client", "type", "status", "progress", "due_date")}),
        ("Team", {"fields": ("team",), "classes": ("wide",)}),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return status_pill(obj, "status")

    @admin.display(description="Progress", ordering="progress")
    def progress_bar(self, obj):
        p = obj.progress
        color = "#198754" if p >= 80 else "#0d6efd" if p >= 40 else "#6c757d"
        return format_html(
            '<div style="width:140px;background:#f1f3f5;border-radius:6px;overflow:hidden;height:20px;">'
            '<div style="width:{}%;background:{};height:100%;text-align:center;line-height:20px;'
            'font-size:11px;color:#fff;font-weight:600;">{}%</div></div>',
            p,
            color,
            p,
        )

    @admin.display(description="Team")
    def team_count(self, obj):
        return obj.team.count()


@admin.register(models.PricingPageConfig)
class PricingPageConfigAdmin(SingletonAdminMixin, admin.ModelAdmin):
    list_display = ("page_title", "faq_category")

    fieldsets = (
        ("Hero", {"fields": ("page_title", "page_subtitle")}),
        ("Plans", {"fields": ("popular_badge_label",)}),
        ("FAQs (from Help articles)", {"fields": ("faq_section_title", "faq_category")}),
    )


@admin.register(models.PricingPlan)
class PricingPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "monthly_fmt",
        "yearly_fmt",
        "highlight_badge",
        "enabled_badge",
        "sort_order",
    )
    list_filter = ("highlight", "enabled")
    search_fields = ("name",)

    @admin.display(description="Monthly", ordering="monthly")
    def monthly_fmt(self, obj):
        text = f"{obj.monthly:,.2f}"
        return format_html('<span style="font-variant-numeric:tabular-nums;">{}</span>', text)

    @admin.display(description="Yearly", ordering="yearly")
    def yearly_fmt(self, obj):
        text = f"{obj.yearly:,.2f}"
        return format_html('<span style="font-variant-numeric:tabular-nums;">{}</span>', text)

    @admin.display(description="Highlight", boolean=True, ordering="highlight")
    def highlight_badge(self, obj):
        return obj.highlight

    @admin.display(description="Enabled", boolean=True, ordering="enabled")
    def enabled_badge(self, obj):
        return obj.enabled


@admin.register(models.AppSettings)
class AppSettingsAdmin(SingletonAdminMixin, admin.ModelAdmin):
    list_display = ("site_name", "support_email", "currency", "maintenance_mode")

    fieldsets = (
        (
            "General",
            {
                "fields": (
                    "site_name",
                    "site_logo",
                    "site_favicon",
                    "support_email",
                    "support_phone",
                    "currency",
                    "tax_rate",
                    "individual_monthly_price",
                    "business_monthly_price",
                )
            },
        ),
        ("Flags", {"fields": ("maintenance_mode", "allow_signups", "email_notifications")}),
        ("SEO", {"fields": ("seo_title", "seo_description", "seo_keywords", "og_image", "canonical_url", "ga_id", "robots_txt", "chatbot_script")}),
        ("SMTP", {"fields": ("smtp_host", "smtp_port", "smtp_user", "smtp_pass", "email_from_name")}),
        ("Payments", {"fields": ("payments_enabled",)}),
        ("Payments — eSewa (UAT only, see esewa_integration.md)", {"fields": ("esewa_enabled",)}),
        ("Payments — Khalti", {"fields": ("khalti_enabled", "khalti_live_key", "khalti_test_key", "khalti_live")}),
        ("Navigation JSON", {"fields": ("nav_order",)}),
    )


# ——— Homepage CMS ———


@admin.register(models.SiteHomepageConfig)
class SiteHomepageConfigAdmin(SingletonAdminMixin, admin.ModelAdmin):
    list_display = (
        "section_hero",
        "section_about",
        "section_services",
        "section_team",
        "section_news",
        "section_testimonials",
        "section_footer",
        "section_procedures",
    )


@admin.register(models.ProfessionalsPageConfig)
class ProfessionalsPageConfigAdmin(SingletonAdminMixin, admin.ModelAdmin):
    fieldsets = (
        (None, {"fields": ("hero_title", "hero_subtitle")}),
        (
            "Stat labels (optional)",
            {
                "description": "Counts and combined years are computed from Team and Services; leave blank for defaults.",
                "fields": ("stat_professionals_label", "stat_experience_label", "stat_practice_label"),
            },
        ),
    )


@admin.register(models.SiteNavItem)
class SiteNavItemAdmin(admin.ModelAdmin):
    list_display = ("order", "enabled", "label", "href", "is_dropdown", "child_count")
    list_filter = ("enabled", "is_dropdown")
    search_fields = ("label", "href")
    inlines = (SiteNavChildInline,)

    @admin.display(description="Children")
    def child_count(self, obj):
        return obj.children.count()


@admin.register(models.SiteNavChild)
class SiteNavChildAdmin(admin.ModelAdmin):
    list_display = ("label", "parent", "href", "order")
    autocomplete_fields = ("parent",)


@admin.register(models.HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ("thumb", "order", "enabled", "title", "cta", "href")
    list_filter = ("enabled",)
    search_fields = ("title", "subtitle")

    @admin.display(description="Image", ordering="image")
    def thumb(self, obj):
        return _img_cell(_media_src(obj.image), size=44)


@admin.register(models.AboutSection)
class AboutSectionAdmin(SingletonAdminMixin, admin.ModelAdmin):
    list_display = ("thumb", "enabled", "title", "eyebrow", "stats_count")
    inlines = (AboutStatInline,)

    @admin.display(description="Image", ordering="image")
    def thumb(self, obj):
        return _img_cell(_media_src(obj.image), size=44)

    @admin.display(description="Stats")
    def stats_count(self, obj):
        return obj.stats.count()


@admin.register(models.AboutStat)
class AboutStatAdmin(admin.ModelAdmin):
    list_display = ("label", "value", "order", "section")


@admin.register(models.ServiceItem)
class ServiceItemAdmin(admin.ModelAdmin):
    list_display = ("order", "enabled", "icon", "title", "href")
    list_filter = ("enabled",)


@admin.register(models.TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("thumb", "order", "enabled", "name", "role", "years_experience")
    list_filter = ("enabled",)

    @admin.display(description="Photo", ordering="avatar")
    def thumb(self, obj):
        return _img_cell(_media_src(obj.avatar), size=44)


@admin.register(models.NewsItem)
class NewsItemAdmin(admin.ModelAdmin):
    list_display = ("thumb", "order", "enabled", "title", "date", "tag", "href_short")
    list_filter = ("enabled", "date")

    @admin.display(description="Image", ordering="image")
    def thumb(self, obj):
        return _img_cell(_media_src(obj.image), size=44)

    @admin.display(description="Link")
    def href_short(self, obj):
        t = obj.href
        return t if len(t) < 48 else t[:45] + "…"


@admin.register(models.Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ("order", "enabled", "name", "role_title", "rating")
    list_filter = ("enabled",)
    search_fields = ("name", "content", "role_title")


@admin.register(models.TestimonialsConfig)
class TestimonialsConfigAdmin(SingletonAdminMixin, admin.ModelAdmin):
    fields = ("title", "intro", "metrics")
    list_display = ("title", "intro_preview")

    @admin.display(description="Intro")
    def intro_preview(self, obj):
        t = obj.intro or ""
        return t if len(t) < 80 else t[:77] + "…"


@admin.register(models.FooterConfig)
class FooterConfigAdmin(SingletonAdminMixin, admin.ModelAdmin):
    search_fields = ("tagline", "copyright")
    list_display = ("tagline_short", "columns_count", "social_count")
    inlines = (FooterColumnInline, FooterSocialLinkInline)

    @admin.display(description="Tagline")
    def tagline_short(self, obj):
        t = obj.tagline
        return t if len(t) < 60 else t[:57] + "…"

    @admin.display(description="Columns")
    def columns_count(self, obj):
        return obj.columns.count()

    @admin.display(description="Social links")
    def social_count(self, obj):
        return obj.social_links.count()


@admin.register(models.FooterColumn)
class FooterColumnAdmin(admin.ModelAdmin):
    search_fields = ("title",)
    list_display = ("title", "config", "order", "link_count")
    inlines = (FooterLinkInline,)
    autocomplete_fields = ("config",)

    @admin.display(description="Links")
    def link_count(self, obj):
        return obj.links.count()


@admin.register(models.FooterLink)
class FooterLinkAdmin(admin.ModelAdmin):
    list_display = ("label", "column", "href", "order")
    autocomplete_fields = ("column",)


@admin.register(models.FooterSocialLink)
class FooterSocialLinkAdmin(admin.ModelAdmin):
    list_display = ("label", "href", "order", "config")
    autocomplete_fields = ("config",)


@admin.register(models.BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "author_display",
        "category",
        "date",
        "published_badge",
        "featured_badge",
    )
    list_filter = ("published", "featured", "category", "date")
    search_fields = ("title", "excerpt", "body", "author_name", "meta_title")
    autocomplete_fields = ("author",)
    date_hierarchy = "date"
    fieldsets = (
        (None, {"fields": ("title", "excerpt", "body", "author", "author_name", "category", "date", "published", "featured")}),
        (
            "SEO",
            {
                "fields": ("meta_title", "meta_description", "meta_keywords"),
                "description": "Optional overrides for search and social previews. Meta keywords are stored only.",
            },
        ),
    )

    @admin.display(description="Author")
    def author_display(self, obj):
        if obj.author_id:
            return obj.author.get_full_name() or obj.author.email
        return obj.author_name or "—"

    @admin.display(description="Published", boolean=True, ordering="published")
    def published_badge(self, obj):
        return obj.published

    @admin.display(description="Featured", boolean=True, ordering="featured")
    def featured_badge(self, obj):
        return obj.featured


@admin.register(models.EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "automate", "enabled", "updated_at")
    list_filter = ("enabled", "automate")
    search_fields = ("name", "automate", "subject")
    readonly_fields = ("automate", "event_type", "updated_at")
    ordering = ("automate",)


@admin.register(models.HelpArticle)
class HelpArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "sort_order", "published", "updated_at")
    list_filter = ("published", "category")
    search_fields = ("title", "category", "content")
    ordering = ("sort_order", "title")


@admin.register(models.Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "issued_by", "published", "sort_order", "view_count", "updated_at")
    list_filter = ("published", "issued_by")
    search_fields = ("title", "title_ne", "slug", "excerpt", "issued_by", "body", "meta_title")
    ordering = ("sort_order", "-created_at")
    fieldsets = (
        (None, {"fields": ("slug", "title", "excerpt", "body", "title_ne", "excerpt_ne", "body_ne", "tags", "issued_by", "issued_by_ne", "published", "sort_order")}),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )


@admin.register(models.KnowledgeResourceCategory)
class KnowledgeResourceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order")
    search_fields = ("name",)
    ordering = ("sort_order", "name")


@admin.register(models.KnowledgeResource)
class KnowledgeResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "published", "sort_order", "download_count", "updated_at")
    list_filter = ("published", "category")
    search_fields = ("title", "description", "download_href")
    ordering = ("sort_order", "title")


# ——— Knowledge base ———


@admin.register(models.ActCategory)
class ActCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(models.Act)
class ActAdmin(admin.ModelAdmin):
    list_display = ("slug", "title_en", "category", "year", "updated", "premium_badge")
    list_filter = ("category", "premium", "updated")
    search_fields = ("slug", "title_en", "title_ne", "meta_title")
    autocomplete_fields = ("category",)
    fieldsets = (
        (None, {"fields": ("slug", "title_en", "title_ne", "category", "year", "updated", "premium", "detail_json")}),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )

    @admin.display(description="Premium", boolean=True, ordering="premium")
    def premium_badge(self, obj):
        return obj.premium


@admin.register(models.SummaryCategory)
class SummaryCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color_chip", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")

    @admin.display(description="Color")
    def color_chip(self, obj):
        c = (obj.color or "").strip()
        bg = c if c.startswith("#") else "#e9ecef"
        return format_html(
            '<span style="display:inline-block;width:22px;height:22px;border-radius:6px;vertical-align:middle;'
            'background:{};border:1px solid rgba(0,0,0,.12);" title="{}"></span> <code style="font-size:11px;">{}</code>',
            bg,
            c,
            c,
        )


@admin.register(models.Summary)
class SummaryAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "posted", "views_cell", "votes_cell", "premium_badge")
    list_filter = ("premium", "category", "posted")
    search_fields = ("title", "slug", "preview", "meta_title")
    autocomplete_fields = ("category",)
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "posted"
    fieldsets = (
        (None, {"fields": ("slug", "title", "category", "posted", "preview", "premium", "body")}),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )

    @admin.display(description="Views", ordering="views")
    def views_cell(self, obj):
        v = obj.views
        n = "—" if v is None else f"{int(v):,}"
        return format_html('<span style="font-variant-numeric:tabular-nums;">{}</span>', n)

    @admin.display(description="Votes")
    def votes_cell(self, obj):
        return format_html(
            '<span style="font-variant-numeric:tabular-nums;font-size:12px;">↑{} · ↓{}</span>',
            obj.upvotes,
            obj.downvotes,
        )

    @admin.display(description="Premium", boolean=True, ordering="premium")
    def premium_badge(self, obj):
        return obj.premium


@admin.register(models.PracticeArea)
class PracticeAreaAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "icon", "sort_order")
    list_editable = ("sort_order",)
    search_fields = ("slug", "name", "overview", "meta_title")
    ordering = ("sort_order", "name")
    fieldsets = (
        (None, {"fields": ("slug", "name", "icon", "overview", "tags", "related_cases_title", "services", "sort_order")}),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )


@admin.register(models.LegalCaseCategory)
class LegalCaseCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(models.LegalCase)
class LegalCaseAdmin(admin.ModelAdmin):
    list_display = (
        "slug",
        "title_short",
        "court",
        "category",
        "practice_area",
        "date_filed",
        "date_decided",
    )
    list_filter = ("court", "category", "practice_area", "date_filed")
    search_fields = ("slug", "title", "reference_number", "teaser", "meta_title")
    prepopulated_fields = {"slug": ("title",)}
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "slug",
                    "title",
                    "reference_number",
                    "date_filed",
                    "date_decided",
                    "court",
                    "category",
                    "practice_area",
                    "teaser",
                    "parties",
                    "summary",
                    "outcome",
                    "full_content",
                )
            },
        ),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )
    date_hierarchy = "date_filed"
    autocomplete_fields = ("category",)

    @admin.display(description="Title")
    def title_short(self, obj):
        t = obj.title
        return t if len(t) < 56 else t[:53] + "…"


@admin.register(models.ProcedureCategory)
class ProcedureCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(models.Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "category", "steps_count", "duration_label", "icon")
    list_filter = ("category",)
    search_fields = ("title", "slug", "summary", "meta_title")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("category",)
    inlines = (ProcedureStepInline,)
    fieldsets = (
        (None, {"fields": ("slug", "category", "title", "summary", "steps_count", "duration_label", "icon")}),
        ("SEO", {"fields": ("meta_title", "meta_description", "meta_keywords")}),
    )


@admin.register(models.ProcedureStep)
class ProcedureStepAdmin(admin.ModelAdmin):
    list_display = ("procedure", "order", "description_short")
    list_filter = ("procedure",)
    search_fields = ("description",)
    autocomplete_fields = ("procedure",)

    @admin.display(description="Description")
    def description_short(self, obj):
        t = obj.description
        return t if len(t) < 80 else t[:77] + "…"
