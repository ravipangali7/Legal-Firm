"""Public and authenticated-client HTTP endpoints (function-based views)."""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from decimal import Decimal
from secrets import randbelow

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import DatabaseError
from django.db.models import F, Q
from django.utils import timezone
from django.utils.text import slugify
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.impersonation import IMPERSONATOR_SESSION_KEY
from core.views.knowledge_resource_pdf import resolve_knowledge_resource_pdf
from core.phone_auth import find_user_by_phone_digits, normalize_phone_digits
from core.api_serializers import (
    ActDetailSerializer,
    ActSerializer,
    AppSettingsPublicSerializer,
    BlogPostPublicListSerializer,
    BlogPostSerializer,
    HelpArticleSerializer,
    NoticePublicDetailSerializer,
    NoticePublicSerializer,
    KnowledgeResourceCategorySerializer,
    KnowledgeResourcePublicSerializer,
    LegalCaseSerializer,
    PracticeAreaSerializer,
    LoginSerializer,
    MyTransactionSerializer,
    PricingPageConfigSerializer,
    PricingPageFaqSerializer,
    PricingPlanSerializer,
    ProcedureListSerializer,
    ProcedureSerializer,
    SummaryCategorySerializer,
    SummarySerializer,
    UserActivityLogSerializer,
    UserInAppNotificationSerializer,
    UserMeSerializer,
    UserSelfUpdateSerializer,
)
from core.homepage_payload import build_homepage_snapshot
from core.professionals_page_payload import build_professionals_page_payload
from core.models import (
    Act,
    AppSettings,
    BlogPost,
    HelpArticle,
    Notice,
    KnowledgeResource,
    KnowledgeResourceCategory,
    LegalCase,
    OtpVerification,
    PracticeArea,
    PricingPageConfig,
    PricingPlan,
    Procedure,
    Summary,
    SummaryCategory,
    Transaction,
    UserActivityLog,
    UserInAppNotification,
)
from core.en_ne_machine_translate import translate_en_to_ne_many
from core.notice_engagement import apply_notice_vote, notice_actor_from_request, record_notice_daily_views
from core.summary_engagement import apply_summary_vote, record_summary_daily_views, summary_actor_from_request
from core.google_oauth import fetch_google_userinfo
from core.serializers import ContactMessageDetailSerializer, PublicContactSerializer, SignupSerializer, SubscribePendingSerializer
from core.staff_notifications import notify_super_admins_in_app
from core.subscription_service import (
    create_pending_subscription_txn,
    next_invoice_number,
    refresh_user_entitlements,
    subscription_checkout_allowed,
)

User = get_user_model()


def _user_me_response(user):
    refresh_user_entitlements(user)
    return Response(UserMeSerializer(user).data)


_LOG = logging.getLogger(__name__)
OTP_EXPIRY_MINUTES = 10
OTP_MAX_PER_HOUR = 10


@api_view(["GET"])
@permission_classes([AllowAny])
def public_config(request):
    settings_obj = AppSettings.load()
    return Response(AppSettingsPublicSerializer(settings_obj).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def public_translate_en_ne(request):
    """
    Machine-translate English strings to Nepali (MyMemory), for notices when *_ne fields are blank.
    Expects JSON: {"parts": ["...", ...]} — max 12 parts, combined length capped server-side.
    """
    parts = request.data.get("parts")
    if not isinstance(parts, list) or not parts:
        return Response({"detail": "parts must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)
    if not all(isinstance(x, str) for x in parts):
        return Response({"detail": "each part must be a string."}, status=status.HTTP_400_BAD_REQUEST)
    if len(parts) > 12:
        return Response({"detail": "too many parts"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        out = translate_en_to_ne_many(parts)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        _LOG.exception("public_translate_en_ne")
        return Response(
            {"detail": "Translation is temporarily unavailable. Please try again later."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({"parts": out})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_help_articles_list(request):
    qs = HelpArticle.objects.filter(published=True).order_by("sort_order", "title")
    cat = (request.query_params.get("category") or "").strip()
    if cat:
        qs = qs.filter(category=cat)
    return Response(HelpArticleSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_notices_list(request):
    qs = Notice.objects.filter(published=True).order_by("sort_order", "-created_at", "title")
    q = (request.query_params.get("search") or request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(title__icontains=q)
            | Q(excerpt__icontains=q)
            | Q(title_ne__icontains=q)
            | Q(excerpt_ne__icontains=q)
            | Q(issued_by__icontains=q)
        )
    issuer = (request.query_params.get("issued_by") or "").strip()
    if issuer and issuer.lower() != "all":
        qs = qs.filter(issued_by__iexact=issuer)
    rows = list(qs[:2000])
    tag = (request.query_params.get("tag") or "").strip()
    if tag and tag.lower() != "all":
        rows = [n for n in rows if isinstance(n.tags, list) and tag in n.tags]
    return Response(NoticePublicSerializer(rows, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_notice_legacy_slug(request, notice_id: uuid.UUID):
    """Resolve an old bookmarked UUID URL to the current public slug."""
    obj = Notice.objects.filter(pk=notice_id, published=True).only("slug").first()
    if not obj:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"slug": obj.slug})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_notice_detail(request, slug: str):
    obj = get_object_or_404(Notice, slug=slug, published=True)
    return Response(NoticePublicDetailSerializer(obj, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def public_notice_vote(request, slug: str):
    """Set, switch, or clear helpful vote for the current user or X-Visitor-Id."""
    actor = summary_actor_from_request(request)
    if actor["kind"] in ("none", "invalid"):
        return Response(
            {"detail": "Sign in or send a UUID X-Visitor-Id header to vote."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    vote = request.data.get("vote")
    if vote not in (None, "up", "down"):
        return Response({"detail": "vote must be null, up, or down."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        notice = apply_notice_vote(actor=actor, notice_slug=slug, vote=vote)
    except ValueError:
        return Response({"detail": "Invalid vote."}, status=status.HTTP_400_BAD_REQUEST)
    if notice is None:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    notice = Notice.objects.get(pk=notice.pk)
    return Response(NoticePublicDetailSerializer(notice, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_knowledge_resource_categories_list(request):
    qs = KnowledgeResourceCategory.objects.order_by("sort_order", "name")
    return Response(KnowledgeResourceCategorySerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_knowledge_resources_list(request):
    qs = KnowledgeResource.objects.filter(published=True).order_by("sort_order", "title")
    q = (request.query_params.get("search") or request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
    cat = (request.query_params.get("category") or "").strip()
    if cat and cat.lower() != "all":
        qs = qs.filter(category__iexact=cat)
    rows = list(qs[:2000])
    return Response(KnowledgeResourcePublicSerializer(rows, many=True).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def public_knowledge_resources_track_downloads(request):
    raw = request.data.get("ids")
    if not isinstance(raw, list):
        return Response({"detail": "ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    clean: list[uuid.UUID] = []
    for x in raw:
        if not isinstance(x, str):
            continue
        try:
            clean.append(uuid.UUID(x.strip()))
        except ValueError:
            continue
    clean = list(dict.fromkeys(clean))[:50]
    if not clean:
        return Response({"updated": 0})
    n = KnowledgeResource.objects.filter(id__in=clean, published=True).update(
        download_count=F("download_count") + 1
    )
    return Response({"updated": n})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_knowledge_resource_download(request, resource_id: uuid.UUID):
    """Stream the PDF (or redirect to a legacy URL) and increment `download_count` once per request."""
    obj = get_object_or_404(KnowledgeResource, pk=resource_id, published=True)
    KnowledgeResource.objects.filter(pk=obj.pk).update(download_count=F("download_count") + 1)
    obj.refresh_from_db()

    base = slugify(obj.title)[:120] or "document"
    attachment_name = f"{base}.pdf"

    resolved = resolve_knowledge_resource_pdf(obj, inline=False, attachment_filename=attachment_name)
    if resolved is not None:
        return resolved
    return Response({"detail": "Download is not available for this resource."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([AllowAny])
def public_notices_track_views(request):
    actor = notice_actor_from_request(request)
    if actor["kind"] in ("none", "invalid"):
        return Response(
            {"detail": "Sign in or send a UUID X-Visitor-Id header to record views."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    raw_ids = request.data.get("ids")
    if not isinstance(raw_ids, list):
        return Response({"detail": "ids must be a list of UUID strings."}, status=status.HTTP_400_BAD_REQUEST)
    record_notice_daily_views(actor["actor_key"], raw_ids)
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def site_homepage(request):
    try:
        return Response(build_homepage_snapshot())
    except DatabaseError:
        _LOG.exception("GET /api/site/homepage/ failed (database schema or DB error)")
        return Response(
            {
                "detail": (
                    "Could not load homepage data from the database. "
                    "If you recently updated the project, run: python manage.py migrate"
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_professionals_page(request):
    """Hero title, subtitle, and stats for the public Professionals page (computed from CMS)."""
    try:
        return Response(build_professionals_page_payload())
    except DatabaseError:
        _LOG.exception("GET /api/public/professionals/ failed (database schema or DB error)")
        return Response(
            {
                "detail": (
                    "Could not load professionals page data from the database. "
                    "If you recently updated the project, run: python manage.py migrate"
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def acts_list(request):
    qs = Act.objects.select_related("category").all()
    q = request.query_params.get("search") or request.query_params.get("q")
    if q:
        qs = qs.filter(Q(title_en__icontains=q) | Q(title_ne__icontains=q))
    cat = request.query_params.get("category")
    if cat:
        qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))
    return Response(ActSerializer(qs[:2000], many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def act_detail(request, slug: str):
    try:
        obj = Act.objects.select_related("category").get(pk=slug)
    except Act.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(ActDetailSerializer(obj).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def summary_categories_list(request):
    qs = SummaryCategory.objects.all()
    return Response(SummaryCategorySerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def summaries_list(request):
    qs = Summary.objects.select_related("category").all()
    cat = request.query_params.get("category")
    if cat:
        qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))
    q = request.query_params.get("search") or request.query_params.get("q")
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(preview__icontains=q))
    return Response(SummarySerializer(qs[:2000], many=True, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def summary_track_views(request):
    """Count at most one view per summary per actor per UTC day (listing or detail)."""
    actor = summary_actor_from_request(request)
    if actor["kind"] in ("none", "invalid"):
        return Response(
            {"detail": "Sign in or send a UUID X-Visitor-Id header to record views."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    slugs = request.data.get("slugs")
    if not isinstance(slugs, list):
        return Response({"detail": "slugs must be a list."}, status=status.HTTP_400_BAD_REQUEST)
    record_summary_daily_views(actor["actor_key"], slugs)
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def summary_vote(request, slug: str):
    """Set, switch, or clear helpful vote for the current user or X-Visitor-Id."""
    actor = summary_actor_from_request(request)
    if actor["kind"] in ("none", "invalid"):
        return Response(
            {"detail": "Sign in or send a UUID X-Visitor-Id header to vote."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    vote = request.data.get("vote")
    if vote not in (None, "up", "down"):
        return Response({"detail": "vote must be null, up, or down."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        summary = apply_summary_vote(actor=actor, slug=slug, vote=vote)
    except ValueError:
        return Response({"detail": "Invalid vote."}, status=status.HTTP_400_BAD_REQUEST)
    if summary is None:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    summary = Summary.objects.select_related("category").get(pk=summary.pk)
    return Response(SummarySerializer(summary, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def summary_detail(request, slug: str):
    try:
        obj = Summary.objects.select_related("category").get(slug=slug)
    except Summary.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(SummarySerializer(obj, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def practice_areas_list(request):
    qs = PracticeArea.objects.all().order_by("sort_order", "name")
    return Response(PracticeAreaSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def legal_cases_list(request):
    qs = LegalCase.objects.select_related("category").all()
    pa = request.query_params.get("practice_area")
    if pa:
        qs = qs.filter(practice_area=pa)
    cat = request.query_params.get("category")
    if cat:
        qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))
    return Response(LegalCaseSerializer(qs[:2000], many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def legal_case_detail(request, slug: str):
    try:
        obj = LegalCase.objects.select_related("category").get(slug=slug)
    except LegalCase.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(LegalCaseSerializer(obj).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def procedures_list(request):
    qs = Procedure.objects.select_related("category").all()
    cat = request.query_params.get("category")
    if cat:
        qs = qs.filter(Q(category__slug=cat) | Q(category__name__iexact=cat))
    return Response(ProcedureListSerializer(qs[:2000], many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def procedure_detail(request, slug: str):
    try:
        obj = Procedure.objects.select_related("category").prefetch_related("steps").get(slug=slug)
    except Procedure.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProcedureSerializer(obj).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def pricing_plans_list(request):
    qs = PricingPlan.objects.filter(enabled=True).order_by("sort_order", "name")
    return Response(PricingPlanSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def pricing_page(request):
    """Aggregated public /pricing payload: copy, subscription prices, FAQs, currency."""
    cfg = PricingPageConfig.load()
    app = AppSettings.load()
    cat = (cfg.faq_category or "").strip()
    faq_qs = HelpArticle.objects.filter(published=True).order_by("sort_order", "title")
    if cat:
        faq_qs = faq_qs.filter(category=cat)
    else:
        faq_qs = faq_qs.none()
    ind_m = Decimal(app.individual_monthly_price or 0)
    bus_m = Decimal(app.business_monthly_price or 0)

    def pack(base: Decimal) -> dict:
        b = base.quantize(Decimal("0.01"))
        return {
            "one_month": str(b),
            "six_month": str((b * Decimal("6")).quantize(Decimal("0.01"))),
            "one_year": str((b * Decimal("12")).quantize(Decimal("0.01"))),
        }

    return Response(
        {
            **PricingPageConfigSerializer(cfg).data,
            "currency": app.currency or "NPR",
            "support_email": app.support_email or "",
            "payments_enabled": bool(app.payments_enabled),
            "esewa_enabled": bool(app.esewa_enabled),
            "khalti_enabled": False,
            "individual_monthly_price": str(ind_m),
            "business_monthly_price": str(bus_m),
            "individual_totals": pack(ind_m),
            "business_totals": pack(bus_m),
            "plans": [],
            "faqs": PricingPageFaqSerializer(faq_qs, many=True).data,
            "yearly_savings_percent": None,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def blog_posts_list(request):
    qs = BlogPost.objects.filter(published=True).order_by("-date", "title")
    if request.query_params.get("featured") in ("1", "true", "yes"):
        qs = qs.filter(featured=True)
    return Response(BlogPostPublicListSerializer(qs[:500], many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def blog_post_detail(request, post_id):
    try:
        obj = BlogPost.objects.get(pk=post_id, published=True)
    except BlogPost.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(BlogPostSerializer(obj).data)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_signup(request):
    settings_obj = AppSettings.load()
    if not settings_obj.allow_signups:
        return Response({"detail": "Registration is closed."}, status=status.HTTP_403_FORBIDDEN)
    ser = SignupSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    user = ser.save()
    who = (user.full_name or user.email or "Someone").strip()
    notify_super_admins_in_app(
        title="New registration pending approval",
        body=f"{who} ({user.email}) signed up and awaits activation.",
        link="/admin/users",
    )
    return Response(
        {"id": str(user.id), "email": user.email, "status": user.status},
        status=status.HTTP_201_CREATED,
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    ser = LoginSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    email = ser.validated_data["email"].strip().lower()
    password = ser.validated_data["password"]
    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
    if user.status == User.Status.SUSPENDED:
        return Response({"detail": "This account is suspended."}, status=status.HTTP_403_FORBIDDEN)
    login(request, user)
    return _user_me_response(user)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_google(request):
    """
    Accept a Google OAuth access token from the SPA (GIS token client).
    If a user with that verified Gmail exists, start a session; otherwise
    return hints so the client can send the user to registration.
    """
    access_token = (request.data.get("access_token") or request.data.get("token") or "").strip()
    if not access_token:
        return Response({"detail": "Missing access token."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        info = fetch_google_userinfo(access_token)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

    email = (info.get("email") or "").strip().lower()
    if not email:
        return Response({"detail": "Google account has no email address."}, status=status.HTTP_400_BAD_REQUEST)
    if info.get("email_verified") is False:
        return Response({"detail": "Google email is not verified."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        full_name = (info.get("name") or "").strip() or email.split("@", 1)[0]
        return Response(
            {"needs_registration": True, "email": email, "full_name": full_name},
            status=status.HTTP_200_OK,
        )
    if user.status == User.Status.SUSPENDED:
        return Response({"detail": "This account is suspended."}, status=status.HTTP_403_FORBIDDEN)
    login(request, user)
    return _user_me_response(user)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_otp_request(request):
    phone = (request.data.get("phone") or "").strip()
    digits = normalize_phone_digits(phone)
    if len(digits) < 10:
        return Response({"detail": "Enter a valid phone number."}, status=status.HTTP_400_BAD_REQUEST)
    user = find_user_by_phone_digits(digits)
    if user is None:
        return Response({"detail": "No account found for this phone number."}, status=status.HTTP_404_NOT_FOUND)
    if user.status == User.Status.SUSPENDED:
        return Response({"detail": "This account is suspended."}, status=status.HTTP_403_FORBIDDEN)

    hour_ago = timezone.now() - timedelta(hours=1)
    recent = OtpVerification.objects.filter(phone_digits=digits, created_at__gte=hour_ago).count()
    if recent >= OTP_MAX_PER_HOUR:
        return Response(
            {"detail": "Too many verification attempts. Try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    code = f"{randbelow(1_000_000):06d}"
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    OtpVerification.objects.create(phone_digits=digits, code=code, expires_at=expires_at)
    _LOG.warning("OTP login code for …%s: %s (expires in %s min)", digits[-4:], code, OTP_EXPIRY_MINUTES)
    payload: dict = {"detail": "Verification code sent."}
    if settings.DEBUG:
        payload["debug_otp"] = code
    return Response(payload)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def auth_otp_verify(request):
    phone = (request.data.get("phone") or "").strip()
    code_raw = request.data.get("code") or ""
    code = "".join(c for c in str(code_raw) if c.isdigit())[:6]
    digits = normalize_phone_digits(phone)
    if len(digits) < 10 or len(code) != 6:
        return Response({"detail": "Invalid phone or code."}, status=status.HTTP_400_BAD_REQUEST)
    user = find_user_by_phone_digits(digits)
    if user is None:
        return Response({"detail": "Invalid phone or code."}, status=status.HTTP_400_BAD_REQUEST)
    if user.status == User.Status.SUSPENDED:
        return Response({"detail": "This account is suspended."}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()
    otp = (
        OtpVerification.objects.filter(
            phone_digits=digits,
            code=code,
            used_at__isnull=True,
            expires_at__gte=now,
        )
        .order_by("-created_at")
        .first()
    )
    if otp is None:
        return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
    otp.used_at = now
    otp.save(update_fields=["used_at"])
    login(request, user)
    return _user_me_response(user)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auth_stop_impersonate(request):
    """Return the session to the staff user after admin «login as user»."""
    imp_raw = request.session.get(IMPERSONATOR_SESSION_KEY)
    if not imp_raw:
        return Response({"detail": "Not in an impersonation session."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        staff = User.objects.get(pk=imp_raw)
    except (User.DoesNotExist, ValueError):
        request.session.pop(IMPERSONATOR_SESSION_KEY, None)
        return Response({"detail": "Impersonation state is invalid."}, status=status.HTTP_400_BAD_REQUEST)
    del request.session[IMPERSONATOR_SESSION_KEY]
    login(request, staff)
    request.session.save()
    return _user_me_response(staff)


@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])
def auth_me(request):
    """GET returns JSON `null` when anonymous (SPA boot) instead of 403 from IsAuthenticated."""
    user = request.user
    if request.method == "PATCH":
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        ser = UserSelfUpdateSerializer(user, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        user.refresh_from_db()
    elif request.method == "GET" and not user.is_authenticated:
        return Response(None)
    refresh_user_entitlements(user)
    data = UserMeSerializer(user).data
    if request.session.get(IMPERSONATOR_SESSION_KEY):
        data["impersonation"] = {"active": True}
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_dashboard(request):
    """Activity, notifications, billing, and catalog counts for the current session."""
    refresh_user_entitlements(request.user)
    u = request.user
    activity = UserActivityLog.objects.filter(user=u).order_by("-created_at")[:50]
    notifications = (
        UserInAppNotification.objects.filter(user=u)
        .select_related("broadcast")
        .order_by("-created_at")[:50]
    )
    billing = Transaction.objects.filter(user=u).order_by("-created_at")[:50]
    laws_count = Act.objects.count()
    case_summaries_count = Summary.objects.count()
    return Response(
        {
            "laws_count": laws_count,
            "case_summaries_count": case_summaries_count,
            "activity": UserActivityLogSerializer(activity, many=True).data,
            "notifications": UserInAppNotificationSerializer(notifications, many=True).data,
            "billing": MyTransactionSerializer(billing, many=True).data,
        }
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auth_notification_mark_read(request, notification_id):
    """Mark one in-app row as read (subscriber bell + detail page)."""
    refresh_user_entitlements(request.user)
    try:
        nid = uuid.UUID(str(notification_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    n = UserInAppNotification.objects.select_related("broadcast").filter(pk=nid, user=request.user).first()
    if not n:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if not n.read:
        n.read = True
        n.save(update_fields=["read"])
    return Response(UserInAppNotificationSerializer(n).data)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def subscriptions_pending(request):
    ser = SubscribePendingSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    email = ser.validated_data["email"]
    plan = ser.validated_data.get("plan") or User.Plan.PREMIUM
    amount = ser.validated_data["amount"]
    method = ser.validated_data["payment_method"]
    txn_code = ser.validated_data["txn_code"]

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "No account with this email."}, status=status.HTTP_400_BAD_REQUEST)

    settings_obj = AppSettings.load()
    if not settings_obj.payments_enabled:
        return Response(
            {"detail": "Online payments are disabled. Contact support if you need help subscribing."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if method == "esewa" and not settings_obj.esewa_enabled:
        return Response({"detail": "eSewa is not enabled for this site."}, status=status.HTTP_400_BAD_REQUEST)

    billing_cycle = ser.validated_data.get("billing_cycle") or "monthly"
    ok, deny = subscription_checkout_allowed(user)
    if not ok:
        return Response({"detail": deny}, status=status.HTTP_403_FORBIDDEN)

    txn = create_pending_subscription_txn(
        user=user,
        invoice=next_invoice_number(),
        amount=amount,
        currency=settings_obj.currency or "NPR",
        method=method,
        txn_code=txn_code,
        plan=plan,
        email=email,
        billing_cycle=billing_cycle,
    )
    return Response(
        {
            "transaction_id": str(txn.id),
            "invoice": txn.invoice,
            "status": txn.status,
        },
        status=status.HTTP_201_CREATED,
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def public_contact_submit(request):
    """Persist a marketing-site contact form message for staff (admin Support inbox)."""
    ser = PublicContactSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    obj = ser.save()
    notify_super_admins_in_app(
        title=f"New contact: {obj.subject[:200]}",
        body=f"{obj.name} ({obj.email})\n\n{(obj.message or '')[:800]}",
        link="/admin/support",
    )
    return Response(ContactMessageDetailSerializer(obj).data, status=status.HTTP_201_CREATED)
