import uuid
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


def _upload_user_avatar(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"avatars/users/{instance.pk}{ext}"


def _upload_app_og_image(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"settings/og/{uuid.uuid4().hex}{ext}"


def _upload_app_site_logo(instance, filename):
    ext = Path(filename).suffix.lower() or ".png"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".png"
    return f"settings/logo/{uuid.uuid4().hex}{ext}"


def _upload_app_site_favicon(instance, filename):
    ext = Path(filename).suffix.lower() or ".png"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".ico", ".svg"):
        ext = ".png"
    return f"settings/favicon/{uuid.uuid4().hex}{ext}"


def _upload_cms_hero(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"cms/hero/{instance.pk}/{uuid.uuid4().hex}{ext}"


def _upload_cms_about(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"cms/about/{uuid.uuid4().hex}{ext}"


def _upload_cms_team_avatar(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"cms/team/{instance.pk}/{uuid.uuid4().hex}{ext}"


def _upload_cms_news(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"cms/news/{instance.pk}/{uuid.uuid4().hex}{ext}"


def _upload_cms_testimonial(instance, filename):
    ext = Path(filename).suffix.lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        ext = ".jpg"
    return f"cms/testimonials/{instance.pk}/{uuid.uuid4().hex}{ext}"


# ——— Base ———


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SingletonModel(models.Model):
    """Single-row tables (pk forced to 1)."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        if self.__class__.objects.count() > 1:
            others = self.__class__.objects.exclude(pk=1)
            others.delete()

    def delete(self, *args, **kwargs):
        return

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]


# ——— 1. Identity ———


class UserManager(BaseUserManager):
    use_in_migrations = True

    @staticmethod
    def _coerce_role_fk(extra_fields, *, default_key: str):
        """Resolve `role` string keys to `Role` rows (or keep an existing `Role` instance)."""
        from django.apps import apps

        Role = apps.get_model("core", "Role")
        if "role" in extra_fields:
            val = extra_fields["role"]
            if isinstance(val, str):
                extra_fields["role"] = Role.objects.get(key=val)
            return extra_fields
        extra_fields["role"] = Role.objects.get(key=default_key)
        return extra_fields

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", False)
        extra_fields = self._coerce_role_fk(extra_fields, default_key="user")
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        extra_fields = self._coerce_role_fk(extra_fields, default_key="super_admin")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user: email login; ``role`` is a FK to :class:`Role` (RBAC matrix + frontend ``UserRole``)."""

    username = None
    is_staff = models.BooleanField(
        _("staff status"),
        default=True,
        help_text=_("Designates whether the user can log into this admin site."),
    )
    email = models.EmailField("email address", unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=64, blank=True)

    class RoleKey(models.TextChoices):
        """Stable keys for ``core.Role`` rows — use for lookups and migrations."""

        SUPER_ADMIN = "super_admin", "Super Admin"
        ADMIN = "admin", "Admin"
        EDITOR = "editor", "Editor"
        CLIENT = "client", "Client"
        USER = "user", "User"

    role = models.ForeignKey(
        "Role",
        on_delete=models.PROTECT,
        related_name="users",
    )

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        PENDING = "pending", "Pending"

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    subscribed = models.BooleanField(default=False)

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        BASIC = "basic", "Basic"
        PREMIUM = "premium", "Premium"
        ENTERPRISE = "enterprise", "Enterprise"

    plan = models.CharField(max_length=32, choices=Plan.choices, default=Plan.FREE)
    avatar = models.ImageField(upload_to=_upload_user_avatar, blank=True, null=True)
    last_login_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    subscription_period_start = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When the current package was requested (pending transaction created_at); fixed at verification.",
    )
    subscription_period_end = models.DateTimeField(
        blank=True,
        null=True,
        help_text="End of the paid renewal window; after this, billing is inactive until renewed.",
    )
    plan_benefits_end = models.DateTimeField(
        blank=True,
        null=True,
        help_text="End of library access granted by the purchased package (may extend past the paid window).",
    )
    last_notified_plan_benefits_end = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When plan_benefits_end passed, we notify once per ended period; this stores that end datetime.",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.full_name or self.email

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return (self.full_name or "").split(maxsplit=1)[0] or self.email

    @property
    def role_key(self) -> str:
        """``Role.key`` for API / RBAC (e.g. ``super_admin``, ``client``)."""
        if getattr(self, "role_id", None):
            return self.role.key
        return self.RoleKey.USER


class OtpVerification(UUIDModel):
    """One-time 6-digit codes for phone login and password reset; expires after a short window."""

    class Purpose(models.TextChoices):
        PHONE_LOGIN = "phone_login", "Phone login"
        PASSWORD_RESET = "password_reset", "Password reset"

    purpose = models.CharField(
        max_length=32,
        choices=Purpose.choices,
        default=Purpose.PHONE_LOGIN,
        db_index=True,
    )
    phone_digits = models.CharField(max_length=16, blank=True, db_index=True)
    email = models.EmailField(blank=True, db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "OTP verification"
        verbose_name_plural = "OTP verifications"

    def __str__(self):
        target = self.email or (f"…{self.phone_digits[-4:]}" if self.phone_digits else "?")
        return f"OTP {self.purpose} {target} @ {self.created_at}"


class UserProfile(models.Model):
    class UserType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        BUSINESS = "business", "Business"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    user_type = models.CharField(max_length=16, choices=UserType.choices, default=UserType.INDIVIDUAL)
    pan = models.CharField(max_length=64, blank=True)
    vat = models.CharField(max_length=64, blank=True)
    company_name = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "User profile"
        verbose_name_plural = "User profiles"

    def __str__(self):
        return f"Profile for {self.user}"


class PermissionModule(UUIDModel):
    name = models.CharField(max_length=128, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Role(UUIDModel):
    name = models.CharField(max_length=128)
    key = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RolePermission(UUIDModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permissions")
    module = models.ForeignKey(PermissionModule, on_delete=models.CASCADE, related_name="role_permissions")
    can_view = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        unique_together = [("role", "module")]
        verbose_name = "Role permission"
        verbose_name_plural = "Role permissions"

    def __str__(self):
        return f"{self.role} → {self.module}"


# ——— 2. Admin business ———


class Transaction(UUIDModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        SIX_MONTH = "six_month", "6 months"
        YEARLY = "yearly", "Yearly"

    class Currency(models.TextChoices):
        NPR = "NPR", "NPR"
        USD = "USD", "USD"

    class Method(models.TextChoices):
        ESEWA = "esewa", "eSewa"
        KHALTI = "khalti", "Khalti"
        BANK = "bank", "Bank"
        STRIPE = "stripe", "Stripe"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        REFUNDED = "refunded", "Refunded"

    invoice = models.CharField(max_length=64)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    email = models.EmailField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, choices=Currency.choices, default=Currency.NPR)
    method = models.CharField(max_length=16, choices=Method.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    txn_code = models.CharField(max_length=128)
    plan = models.CharField(
        max_length=32,
        choices=User.Plan.choices,
        blank=True,
        help_text="Subscription tier granted when this payment is verified.",
    )
    billing_cycle = models.CharField(
        max_length=16,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
        help_text="Billing period for the purchased package (drives subscription length when verified).",
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="When rejected by Super Admin, reason text (also sent to the client by SMS).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.invoice} ({self.amount} {self.currency})"


class UserBookmark(UUIDModel):
    """Saved library links for the subscriber dashboard."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="library_bookmarks",
    )
    title = models.CharField(max_length=512)
    path = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class UserActivityLog(UUIDModel):
    """Recent activity rows shown on the subscriber dashboard."""

    class Verb(models.TextChoices):
        PAYMENT_VERIFIED = "payment_verified", "Payment verified"
        BOOKMARK = "bookmark", "Bookmark saved"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    verb = models.CharField(max_length=32, choices=Verb.choices)
    object_label = models.CharField(max_length=512)
    path = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class UserInAppNotification(UUIDModel):
    """In-app notifications for the logged-in account."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    link = models.CharField(max_length=512, blank=True, default="")
    broadcast = models.ForeignKey(
        "AdminBroadcast",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recipient_notifications",
    )

    class Meta:
        ordering = ["-created_at"]


class AdminBroadcast(UUIDModel):
    """Admin-composed announcement (delivery rules + copy); fans out to UserInAppNotification rows."""

    class NotificationType(models.TextChoices):
        INFO = "info", "Info"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        SYSTEM = "system", "System"

    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    notification_type = models.CharField(
        max_length=16,
        choices=NotificationType.choices,
        default=NotificationType.INFO,
    )
    link = models.CharField(max_length=512, blank=True, default="")
    delivery = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_broadcasts_created",
    )

    class Meta:
        ordering = ["-created_at"]


class Client(UUIDModel):
    class Type(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        BUSINESS = "business", "Business"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    company = models.CharField(max_length=255)
    contact = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=64)
    type = models.CharField(max_length=16, choices=Type.choices)
    pan_vat = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateField()

    class Meta:
        ordering = ["company"]

    def __str__(self):
        return self.company

    def active_projects_count(self):
        return self.projects.exclude(status=Project.Status.COMPLETED).count()


class Project(UUIDModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        IN_PROGRESS = "in_progress", "In progress"
        REVIEW = "review", "Review"
        COMPLETED = "completed", "Completed"

    name = models.CharField(max_length=512)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="projects")
    type = models.CharField(max_length=128)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PLANNING)
    progress = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    due_date = models.DateField()
    team = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="projects",
    )

    class Meta:
        ordering = ["-due_date"]

    def __str__(self):
        return self.name


class PricingPlan(UUIDModel):
    name = models.CharField(max_length=128)
    monthly = models.DecimalField(max_digits=12, decimal_places=2)
    yearly = models.DecimalField(max_digits=12, decimal_places=2)
    features = models.JSONField(default=list)
    cta = models.CharField(max_length=128)
    highlight = models.BooleanField(default=False)
    enabled = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class PricingPageConfig(SingletonModel):
    """Staff-editable copy for the public /pricing page (singleton row pk=1)."""

    page_title = models.CharField(max_length=255, default="Choose Your Plan")
    page_subtitle = models.TextField(
        default="Unlock Nepal's full legal & tax knowledge base. Cancel anytime."
    )
    faq_section_title = models.CharField(max_length=255, default="Frequently Asked Questions")
    popular_badge_label = models.CharField(max_length=128, default="Most Popular")
    faq_category = models.CharField(
        max_length=128,
        default="Pricing",
        help_text="Published help articles whose category matches this value exactly are shown as FAQs.",
    )

    class Meta:
        verbose_name = "Pricing page"
        verbose_name_plural = "Pricing page"

    def __str__(self):
        return "Pricing page"


class AppSettings(SingletonModel):
    site_name = models.CharField(max_length=255, default="TaxLexis")
    site_logo = models.ImageField(upload_to=_upload_app_site_logo, blank=True)
    site_favicon = models.FileField(upload_to=_upload_app_site_favicon, blank=True)
    support_email = models.EmailField(default="support@example.com")
    support_phone = models.CharField(max_length=64, blank=True)
    currency = models.CharField(max_length=8, default="NPR")
    tax_rate = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("13"))
    maintenance_mode = models.BooleanField(default=False)
    allow_signups = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    seo_keywords = models.CharField(max_length=512, blank=True)
    og_image = models.ImageField(upload_to=_upload_app_og_image, blank=True)
    canonical_url = models.URLField(max_length=500, blank=True)
    ga_id = models.CharField(max_length=64, blank=True)
    robots_txt = models.TextField(blank=True)
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.PositiveIntegerField(blank=True, null=True)
    smtp_user = models.CharField(max_length=255, blank=True)
    smtp_pass = models.CharField(max_length=255, blank=True)
    email_from_name = models.CharField(max_length=255, blank=True)
    payments_enabled = models.BooleanField(
        default=False,
        help_text="When on, users may submit subscription payments from the dashboard Wallet tab only.",
    )
    esewa_enabled = models.BooleanField(default=False)
    esewa_secret_key = models.CharField(max_length=255, blank=True)
    esewa_product_code = models.CharField(max_length=128, blank=True)
    esewa_live = models.BooleanField(default=False)
    khalti_enabled = models.BooleanField(default=False)
    khalti_live_key = models.CharField(max_length=255, blank=True)
    khalti_test_key = models.CharField(max_length=255, blank=True)
    khalti_live = models.BooleanField(default=False)
    nav_order = models.JSONField(default=list, blank=True)
    individual_monthly_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("999"),
        help_text="Base monthly subscription price for individual accounts (used for 1 / 6 / 12 month checkout).",
    )
    business_monthly_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("1999"),
        help_text="Base monthly subscription price for business accounts (used for 1 / 6 / 12 month checkout).",
    )

    class Meta:
        verbose_name = "App settings"
        verbose_name_plural = "App settings"

    def __str__(self):
        return self.site_name


# ——— 3. Homepage CMS ———


class SiteHomepageConfig(SingletonModel):
    section_hero = models.BooleanField(default=True)
    section_about = models.BooleanField(default=True)
    section_services = models.BooleanField(default=True)
    section_team = models.BooleanField(default=True)
    section_news = models.BooleanField(default=True)
    section_testimonials = models.BooleanField(default=True)
    section_footer = models.BooleanField(default=True)
    section_procedures = models.BooleanField(default=True)
    section_styles = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Site homepage config"
        verbose_name_plural = "Site homepage config"

    def __str__(self):
        return "Homepage configuration"


class SiteNavItem(UUIDModel):
    order = models.PositiveSmallIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    label = models.CharField(max_length=128)
    href = models.CharField(max_length=512)
    is_dropdown = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "label"]

    def __str__(self):
        return self.label


class SiteNavChild(UUIDModel):
    parent = models.ForeignKey(SiteNavItem, on_delete=models.CASCADE, related_name="children")
    label = models.CharField(max_length=128)
    href = models.CharField(max_length=512)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["parent", "order", "label"]

    def __str__(self):
        return self.label


class HeroSlide(UUIDModel):
    order = models.PositiveSmallIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    eyebrow = models.CharField(max_length=128, blank=True)
    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    cta = models.CharField(max_length=128)
    href = models.CharField(max_length=512)
    secondary_cta = models.CharField(max_length=128, blank=True)
    secondary_href = models.CharField(max_length=512, blank=True)
    image = models.ImageField(upload_to=_upload_cms_hero, blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class AboutSection(SingletonModel):
    enabled = models.BooleanField(default=True)
    eyebrow = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    image = models.ImageField(upload_to=_upload_cms_about, blank=True)

    class Meta:
        verbose_name = "About section"
        verbose_name_plural = "About section"

    def __str__(self):
        return "About"


class AboutStat(UUIDModel):
    section = models.ForeignKey(AboutSection, on_delete=models.CASCADE, related_name="stats")
    label = models.CharField(max_length=128)
    value = models.CharField(max_length=64)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["section", "order"]

    def __str__(self):
        return f"{self.label}: {self.value}"


class ServiceItem(UUIDModel):
    order = models.PositiveSmallIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    icon = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    href = models.CharField(max_length=512)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class TeamMember(UUIDModel):
    order = models.PositiveSmallIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to=_upload_cms_team_avatar, blank=True)
    linkedin_url = models.URLField(max_length=500, blank=True)
    facebook_url = models.URLField(max_length=500, blank=True)
    twitter_url = models.URLField(max_length=500, blank=True)
    instagram_url = models.URLField(max_length=500, blank=True)
    contact_email = models.EmailField(blank=True)
    years_experience = models.PositiveSmallIntegerField(
        default=0,
        help_text="Years in practice; summed with other enabled members for the public Professionals page stat.",
    )

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class ProfessionalsPageConfig(SingletonModel):
    """Hero copy and stat labels for the public /professionals page (values are computed from team/services)."""

    hero_title = models.CharField(max_length=255, default="Our Professionals")
    hero_subtitle = models.TextField(
        default=(
            "Experienced advocates and chartered accountants dedicated to delivering excellence "
            "in Nepalese law and taxation."
        )
    )
    stat_professionals_label = models.CharField(max_length=128, blank=True)
    stat_experience_label = models.CharField(max_length=128, blank=True)
    stat_practice_label = models.CharField(max_length=128, blank=True)

    class Meta:
        verbose_name = "Professionals page"
        verbose_name_plural = "Professionals page"

    def __str__(self):
        return "Professionals page"


class NewsItem(UUIDModel):
    order = models.PositiveSmallIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True)
    body = models.TextField(blank=True, help_text="Full article text for the public detail page (optional; excerpt is used if empty).")
    image = models.ImageField(upload_to=_upload_cms_news, blank=True)
    date = models.DateField()
    href = models.CharField(max_length=512)
    tag = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-date", "order"]

    def __str__(self):
        return self.title


class TestimonialsConfig(SingletonModel):
    title = models.CharField(max_length=255, blank=True)
    intro = models.TextField(blank=True)
    metrics = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = "Testimonials section"
        verbose_name_plural = "Testimonials section"

    def __str__(self):
        return "Testimonials"


class Testimonial(UUIDModel):
    # Integer (not small) so CMS sort order stays valid for large testimonial lists.
    order = models.PositiveIntegerField(default=0)
    enabled = models.BooleanField(default=True)
    name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(default=5)
    image = models.ImageField(upload_to=_upload_cms_testimonial, blank=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class FooterConfig(SingletonModel):
    tagline = models.CharField(max_length=512)
    copyright = models.TextField(blank=True)

    class Meta:
        verbose_name = "Footer config"
        verbose_name_plural = "Footer config"

    def __str__(self):
        return "Footer"


class FooterColumn(UUIDModel):
    config = models.ForeignKey(FooterConfig, on_delete=models.CASCADE, related_name="columns")
    title = models.CharField(max_length=255)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["config", "order"]

    def __str__(self):
        return self.title


class FooterLink(UUIDModel):
    column = models.ForeignKey(FooterColumn, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=255)
    href = models.CharField(max_length=512)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["column", "order"]

    def __str__(self):
        return self.label


class FooterSocialLink(UUIDModel):
    config = models.ForeignKey(FooterConfig, on_delete=models.CASCADE, related_name="social_links")
    label = models.CharField(max_length=128)
    href = models.URLField(max_length=500)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["config", "order"]

    def __str__(self):
        return self.label


class BlogPost(UUIDModel):
    title = models.CharField(max_length=512)
    excerpt = models.TextField(blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blog_posts",
    )
    author_name = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=128)
    date = models.DateField()
    published = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    body = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "title"]

    def __str__(self):
        return self.title


class EmailTemplate(UUIDModel):
    """
    Staff-editable transactional email content. ``automate`` selects when the message is sent;
    subject/body support ``{{placeholder}}`` tokens documented per template.
    """

    class Automate(models.TextChoices):
        LOGIN = "login", "Login"
        SIGN_UP = "sign_up", "Sign up"
        OTP = "otp", "OTP"
        PAYMENT_DUE = "payment_due", "Payment due"
        PAID = "paid", "Paid"
        SUBSCRIBED = "subscribed", "Subscribed"

    class EventType(models.TextChoices):
        """Legacy trigger keys; mapped to :attr:`automate` for template lookup."""
        SIGNUP = "signup", "Signup welcome"
        LOGIN = "login", "Login thank you"
        OTP_LOGIN = "otp_login", "OTP login code"
        PASSWORD_RESET = "password_reset", "Password reset OTP"
        PAYMENT_VERIFIED = "payment_verified", "Payment confirmed"
        PAYMENT_PENDING = "payment_pending", "Payment pending verification"
        PAYMENT_REJECTED = "payment_rejected", "Payment rejected"
        SUBSCRIPTION_DUE = "subscription_due", "Subscription renewal due"
        PACKAGE_ENDED = "package_ended", "Package ended"

    automate = models.CharField(
        max_length=32,
        choices=Automate.choices,
        unique=True,
        help_text="System event that sends this template automatically.",
    )
    event_type = models.CharField(
        max_length=32,
        choices=EventType.choices,
        blank=True,
        help_text="Primary legacy trigger key (optional).",
    )
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    enabled = models.BooleanField(default=True)
    description = models.TextField(
        blank=True,
        help_text="Admin hint: when this email is sent and which placeholders are available.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["automate"]
        verbose_name = "Email template"
        verbose_name_plural = "Email templates"

    def __str__(self):
        return f"{self.name} ({self.get_automate_display()})"


class HelpArticle(UUIDModel):
    """Staff-editable help articles; published rows are exposed on the public `/help` API."""

    title = models.CharField(max_length=512)
    category = models.CharField(max_length=128, blank=True)
    content = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]
        verbose_name = "Help article"
        verbose_name_plural = "Help articles"

    def __str__(self):
        return self.title


class Notice(UUIDModel):
    """Official notices and circulars; create/update/delete is restricted to super admins in the staff API."""

    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    title = models.CharField(max_length=512)
    excerpt = models.TextField(blank=True)
    body = models.TextField(blank=True)
    title_ne = models.CharField("title (Nepali)", max_length=512, blank=True)
    excerpt_ne = models.TextField("excerpt (Nepali)", blank=True)
    body_ne = models.TextField("body (Nepali)", blank=True)
    tags = models.JSONField(default=list, blank=True)
    issued_by = models.CharField(max_length=255)
    issued_by_ne = models.CharField("issued by (Nepali)", max_length=255, blank=True)
    published = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    upvotes = models.PositiveIntegerField(default=0)
    downvotes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-created_at", "title"]
        verbose_name = "Notice"
        verbose_name_plural = "Notices"

    def __str__(self):
        return self.title


class NoticeAudienceVote(UUIDModel):
    """Persistent helpful / not-helpful vote per logged-in user or anonymous visitor id."""

    class Vote(models.TextChoices):
        UP = "up", "Up"
        DOWN = "down", "Down"

    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name="audience_votes")
    user = models.ForeignKey("User", on_delete=models.CASCADE, null=True, blank=True, related_name="notice_votes")
    visitor_key = models.CharField(max_length=64, null=True, blank=True)
    vote = models.CharField(max_length=8, choices=Vote.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("notice", "user"),
                condition=models.Q(user__isnull=False),
                name="uniq_notice_audience_vote_user",
            ),
            models.UniqueConstraint(
                fields=("notice", "visitor_key"),
                condition=models.Q(visitor_key__isnull=False),
                name="uniq_notice_audience_vote_visitor",
            ),
        ]


class NoticeDailyViewerView(UUIDModel):
    """At most one counted view per notice per actor per calendar day (UTC)."""

    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name="daily_viewer_views")
    actor_key = models.CharField(max_length=96, db_index=True)
    day = models.DateField(db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("notice", "actor_key", "day"),
                name="uniq_notice_daily_view_actor",
            ),
        ]


def _upload_knowledge_pdf(instance: "KnowledgeResource", filename: str) -> str:
    stem = Path(filename).stem[:120] or "document"
    return f"knowledge_resources/{instance.pk}/{stem}.pdf"


class KnowledgeResourceCategory(UUIDModel):
    """Admin-managed labels for Knowledge Base downloads; `KnowledgeResource.category` stores this row's `name`."""

    name = models.CharField(max_length=64, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Knowledge base category"
        verbose_name_plural = "Knowledge base categories"

    def __str__(self):
        return self.name


class KnowledgeResource(UUIDModel):
    """Downloadable guides and reference files for the public Knowledge Base; CRUD is super-admin only via staff API."""

    title = models.CharField(max_length=512)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=64)
    pdf_file = models.FileField(upload_to=_upload_knowledge_pdf, blank=True, null=True, max_length=512)
    download_href = models.CharField(
        max_length=1024,
        blank=True,
        default="",
        help_text="Set automatically from uploaded PDF, or legacy absolute https / site-relative path.",
    )
    file_type = models.CharField(max_length=16, default="PDF")
    file_size_label = models.CharField(max_length=32, blank=True, help_text='Display only, e.g. "2.5 MB".')
    download_count = models.PositiveIntegerField(default=0)
    published = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]
        verbose_name = "Knowledge resource"
        verbose_name_plural = "Knowledge resources"

    def __str__(self):
        return self.title


# ——— 4. Knowledge base ———


class ActCategory(UUIDModel):
    """Taxonomy for acts / laws (admin-managed; referenced by `Act.category`)."""

    slug = models.SlugField(unique=True, max_length=128)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=64, default="#64748b")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Act category"
        verbose_name_plural = "Act categories"

    def __str__(self):
        return self.name


class LegalCaseCategory(UUIDModel):
    """Taxonomy for legal cases (`LegalCase.category`)."""

    slug = models.SlugField(unique=True, max_length=128)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=64, default="#64748b")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Legal case category"
        verbose_name_plural = "Legal case categories"

    def __str__(self):
        return self.name


class ProcedureCategory(UUIDModel):
    """Taxonomy for procedures (`Procedure.category`)."""

    slug = models.SlugField(unique=True, max_length=128)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=64, default="#64748b")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Procedure category"
        verbose_name_plural = "Procedure categories"

    def __str__(self):
        return self.name


class Act(models.Model):
    slug = models.SlugField(unique=True, primary_key=True, max_length=128)
    title_en = models.CharField(max_length=512)
    title_ne = models.CharField(max_length=512)
    category = models.ForeignKey(ActCategory, on_delete=models.PROTECT, related_name="acts")
    year = models.CharField(max_length=32)
    updated = models.DateField()
    premium = models.BooleanField(default=False)
    # Optional structured body for `/laws/:slug`; when null the SPA uses its built-in outline.
    detail_json = models.JSONField(null=True, blank=True, default=None)

    class Meta:
        ordering = ["title_en"]

    def __str__(self):
        return self.title_en


class SummaryCategory(UUIDModel):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=64)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Summary(UUIDModel):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=512)
    category = models.ForeignKey(SummaryCategory, on_delete=models.PROTECT, related_name="summaries")
    posted = models.DateField()
    views = models.PositiveIntegerField(default=0)
    upvotes = models.PositiveIntegerField(default=0)
    downvotes = models.PositiveIntegerField(default=0)
    preview = models.TextField(blank=True)
    premium = models.BooleanField(default=False)
    body = models.TextField(blank=True)

    class Meta:
        ordering = ["-posted"]
        verbose_name_plural = "Summaries"

    def __str__(self):
        return self.title


class SummaryDailyViewerView(UUIDModel):
    """At most one counted view per summary per actor per calendar day (UTC)."""

    summary = models.ForeignKey(Summary, on_delete=models.CASCADE, related_name="daily_viewer_views")
    actor_key = models.CharField(max_length=96, db_index=True)
    day = models.DateField(db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("summary", "actor_key", "day"),
                name="uniq_summary_daily_view_actor",
            ),
        ]


class SummaryAudienceVote(UUIDModel):
    """Persistent helpful / not-helpful vote per logged-in user or anonymous visitor id."""

    class Vote(models.TextChoices):
        UP = "up", "Up"
        DOWN = "down", "Down"

    summary = models.ForeignKey(Summary, on_delete=models.CASCADE, related_name="audience_votes")
    user = models.ForeignKey("User", on_delete=models.CASCADE, null=True, blank=True, related_name="summary_votes")
    visitor_key = models.CharField(max_length=64, null=True, blank=True)
    vote = models.CharField(max_length=8, choices=Vote.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("summary", "user"),
                condition=models.Q(user__isnull=False),
                name="uniq_summary_audience_vote_user",
            ),
            models.UniqueConstraint(
                fields=("summary", "visitor_key"),
                condition=models.Q(visitor_key__isnull=False),
                name="uniq_summary_audience_vote_visitor",
            ),
        ]


class PracticeArea(UUIDModel):
    """Public practice-area pages: sidebar, overview, services JSON, and case list filter slug."""

    slug = models.SlugField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=64, default="Scale")
    overview = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    related_cases_title = models.CharField(max_length=255, blank=True)
    services = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "Practice areas"

    def __str__(self):
        return self.name


class LegalCase(UUIDModel):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=512)
    reference_number = models.CharField(max_length=128)
    date_filed = models.DateField()
    date_decided = models.DateField(blank=True, null=True)
    court = models.CharField(max_length=255)
    category = models.ForeignKey(LegalCaseCategory, on_delete=models.PROTECT, related_name="legal_cases")
    practice_area = models.SlugField()
    teaser = models.TextField(blank=True)
    parties = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    full_content = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-date_filed"]
        verbose_name = "Legal case"
        verbose_name_plural = "Legal cases"

    def __str__(self):
        return self.title


class Procedure(UUIDModel):
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(ProcedureCategory, on_delete=models.PROTECT, related_name="procedures")
    title = models.CharField(max_length=512)
    summary = models.TextField(blank=True)
    steps_count = models.PositiveSmallIntegerField(default=0)
    duration_label = models.CharField(max_length=128, blank=True)
    icon = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["category__sort_order", "category__name", "title"]

    def __str__(self):
        return self.title


class ProcedureStep(UUIDModel):
    procedure = models.ForeignKey(Procedure, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveSmallIntegerField(default=0)
    description = models.TextField()

    class Meta:
        ordering = ["procedure", "order"]

    def __str__(self):
        return f"{self.procedure.slug} step {self.order}"


class ContactMessage(UUIDModel):
    """Website contact form submissions (stored for staff review in admin Support)."""

    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=150)
    message = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contact message"
        verbose_name_plural = "Contact messages"

    def __str__(self):
        return f"{self.subject} ({self.email})"
