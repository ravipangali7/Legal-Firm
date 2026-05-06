"""Admin CRUD and settings (function-based views)."""

from __future__ import annotations

import os
import uuid

from django.conf import settings
from django.contrib.auth import login
from django.http import FileResponse
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage, get_connection
from django.core.validators import validate_email
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.api_serializers import (
    ActAdminSerializer,
    ActCategoryAdminSerializer,
    AppSettingsAdminSerializer,
    BlogPostSerializer,
    ClientSerializer,
    HelpArticleSerializer,
    NoticeAdminSerializer,
    KnowledgeResourceAdminSerializer,
    KnowledgeResourceCategoryAdminSerializer,
    HeroSlideSerializer,
    LegalCaseAdminSerializer,
    LegalCaseCategoryAdminSerializer,
    PermissionModuleSerializer,
    PracticeAreaAdminSerializer,
    PricingPlanSerializer,
    ProcedureAdminSerializer,
    ProcedureCategoryAdminSerializer,
    ProjectSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    SiteNavItemSerializer,
    SummaryAdminSerializer,
    SummaryCategoryAdminSerializer,
    TransactionSerializer,
    UserAdminSerializer,
    UserMeSerializer,
)
from core.cms_snapshot_apply import apply_homepage_snapshot
from core.impersonation import IMPERSONATOR_SESSION_KEY
from core.models import (
    Act,
    ActCategory,
    AdminBroadcast,
    AppSettings,
    BlogPost,
    Client,
    ContactMessage,
    HelpArticle,
    Notice,
    KnowledgeResource,
    KnowledgeResourceCategory,
    HeroSlide,
    LegalCase,
    LegalCaseCategory,
    PermissionModule,
    PracticeArea,
    PricingPlan,
    Procedure,
    ProcedureCategory,
    Project,
    Role,
    RolePermission,
    SiteNavItem,
    Summary,
    SummaryCategory,
    Transaction,
    UserInAppNotification,
)
from django.contrib.auth import get_user_model

from core.serializers import ContactMessageDetailSerializer
from core.sms import send_user_suspension_sms
from core.staff_notifications import fan_out_broadcast_in_app, sync_broadcast_metadata_to_recipients
from core.project_notifications import notify_client_assigned_to_project
from core.subscription_service import revoke_user_subscription_entitlements
from core.rbac import require_admin_perm

User = get_user_model()


def _ensure_role_permissions_for_module(module: PermissionModule) -> None:
    """New modules need a RolePermission row per role so the admin matrix can PATCH."""
    for role in Role.objects.all():
        if role.key == "super_admin":
            defaults = {
                "can_view": True,
                "can_create": True,
                "can_edit": True,
                "can_delete": True,
            }
        else:
            defaults = {
                "can_view": False,
                "can_create": False,
                "can_edit": False,
                "can_delete": False,
            }
        RolePermission.objects.get_or_create(role=role, module=module, defaults=defaults)


def _is_super_admin_actor(u) -> bool:
    return bool(getattr(u, "is_superuser", False)) or u.role_key == "super_admin"


def _require_super_admin_for_notices(request):
    if not getattr(request.user, "is_authenticated", False) or not request.user.is_staff:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if not _is_super_admin_actor(request.user):
        return Response(
            {"detail": "Only super administrators can manage notices."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _require_super_admin_for_knowledge_resources(request):
    if not getattr(request.user, "is_authenticated", False) or not request.user.is_staff:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    if not _is_super_admin_actor(request.user):
        return Response(
            {"detail": "Only super administrators can manage knowledge base resources."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


# ——— Users ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    if err := require_admin_perm(request, "Users", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = User.objects.all().order_by("-created_at")
        return Response(UserAdminSerializer(qs, many=True).data)
    ser = UserAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    user = ser.save()
    return Response(UserAdminSerializer(user).data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id: int):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Users", perm):
        return err
    user = get_object_or_404(User, pk=user_id)
    if request.method == "GET":
        return Response(UserAdminSerializer(user).data)
    if request.method == "PATCH":
        body = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        suspension_reason = (body.pop("suspension_reason", None) or "").strip()

        ser = UserAdminSerializer(user, data=body, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        prev_status = user.status
        new_status = ser.validated_data.get("status", prev_status)

        if new_status == User.Status.SUSPENDED and prev_status != User.Status.SUSPENDED:
            if len(suspension_reason) < 3:
                return Response(
                    {"suspension_reason": ["Enter a short suspension reason (at least 3 characters). It is sent to the user by SMS."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        ser.save()
        if new_status == User.Status.SUSPENDED and prev_status != User.Status.SUSPENDED:
            send_user_suspension_sms(user, suspension_reason)
        return Response(UserAdminSerializer(user).data)
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_user_revoke_subscription(request, user_id: int):
    """Super Admin only: clear paid plan and dates; user immediately loses library access."""
    if err := require_admin_perm(request, "Users", "edit"):
        return err
    if not _is_super_admin_actor(request.user):
        return Response(
            {"detail": "Only a Super Admin may remove or deactivate a user's subscription."},
            status=status.HTTP_403_FORBIDDEN,
        )
    target = get_object_or_404(User, pk=user_id)
    revoke_user_subscription_entitlements(target)
    return Response(UserAdminSerializer(target).data)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_user_impersonate(request, user_id: int):
    """Staff only: log the session in as the target user; original staff id is stored in the session."""
    if err := require_admin_perm(request, "Users", "edit"):
        return err
    if request.session.get(IMPERSONATOR_SESSION_KEY):
        return Response(
            {"detail": "Already in an impersonation session. Exit that session first."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    target = get_object_or_404(User, pk=user_id)
    staff = request.user
    login(request, target)
    # Set after login so a session cycle does not drop the staff reference.
    request.session[IMPERSONATOR_SESSION_KEY] = str(staff.pk)
    request.session.save()
    from core.subscription_service import refresh_user_entitlements

    refresh_user_entitlements(target)
    return Response(UserMeSerializer(target).data)


# ——— Permission modules ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_permission_modules(request):
    if err := require_admin_perm(request, "Roles", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = PermissionModule.objects.order_by("name")
        return Response(PermissionModuleSerializer(qs, many=True).data)
    ser = PermissionModuleSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    mod = ser.save()
    _ensure_role_permissions_for_module(mod)
    return Response(PermissionModuleSerializer(mod).data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_permission_module_detail(request, module_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Roles", perm):
        return err
    try:
        mid = uuid.UUID(str(module_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(PermissionModule, pk=mid)
    if request.method == "GET":
        return Response(PermissionModuleSerializer(obj).data)
    if request.method == "PATCH":
        ser = PermissionModuleSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Roles ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_roles(request):
    if err := require_admin_perm(request, "Roles", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Role.objects.order_by("name")
        return Response(RoleSerializer(qs, many=True).data)
    ser = RoleSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_role_detail(request, role_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Roles", perm):
        return err
    try:
        rid = uuid.UUID(str(role_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Role, pk=rid)
    if request.method == "GET":
        return Response(RoleSerializer(obj).data)
    if request.method == "PATCH":
        if obj.is_system and "key" in request.data:
            return Response(
                {"detail": "System role key cannot be changed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = RoleSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    if obj.is_system:
        return Response({"detail": "System roles cannot be deleted."}, status=status.HTTP_403_FORBIDDEN)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Role permissions ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_role_permissions(request):
    if err := require_admin_perm(request, "Roles", "view" if request.method == "GET" else "edit"):
        return err
    if request.method == "GET":
        qs = RolePermission.objects.select_related("role", "module").all()
        return Response(RolePermissionSerializer(qs, many=True).data)
    ser = RolePermissionSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    if ser.validated_data["role"].key == "super_admin":
        return Response(
            {"detail": "Super Admin permissions are managed automatically."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        ser.save()
    except IntegrityError:
        return Response({"detail": "Duplicate role/module pair."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_role_permission_detail(request, rp_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Roles", perm):
        return err
    try:
        pid = uuid.UUID(str(rp_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(RolePermission.objects.select_related("role"), pk=pid)
    if request.method == "GET":
        return Response(RolePermissionSerializer(obj).data)
    if obj.role.key == "super_admin":
        return Response(
            {"detail": "Super Admin always has full access; permissions cannot be changed."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == "PATCH":
        ser = RolePermissionSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Transactions ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_transactions(request):
    if err := require_admin_perm(request, "Transactions", "view"):
        return err
    if request.method == "GET":
        qs = Transaction.objects.select_related("user").order_by("-created_at")
        return Response(TransactionSerializer(qs, many=True).data)
    return Response({"detail": "Create transactions via subscriptions/pending or payment hooks."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_transaction_detail(request, txn_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Transactions", perm):
        return err
    try:
        tid = uuid.UUID(str(txn_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Transaction, pk=tid)
    if request.method == "GET":
        return Response(TransactionSerializer(obj).data)
    if request.method == "PATCH":
        allowed = {"status", "plan", "amount", "currency", "method", "txn_code", "email", "billing_cycle", "rejection_reason"}
        patch = {k: v for k, v in request.data.items() if k in allowed}
        prev_status = obj.status
        new_status = patch.get("status", prev_status)

        from_pending = prev_status == Transaction.Status.PENDING
        to_verified = new_status == Transaction.Status.VERIFIED
        to_rejected = new_status == Transaction.Status.REJECTED

        if "status" in patch and new_status != prev_status:
            if from_pending and (to_verified or to_rejected) and not _is_super_admin_actor(request.user):
                return Response(
                    {"detail": "Only a Super Admin may verify or reject pending subscription payments."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if from_pending and to_rejected:
                reason = (patch.get("rejection_reason") or "").strip()
                if len(reason) < 3:
                    return Response(
                        {
                            "rejection_reason": [
                                "Enter at least 3 characters. This text is sent to the client by SMS.",
                            ]
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                patch["rejection_reason"] = reason
            if from_pending and to_verified:
                patch["rejection_reason"] = ""

        for k, v in patch.items():
            setattr(obj, k, v)
        obj.save()

        return Response(TransactionSerializer(obj).data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Clients ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_clients(request):
    if err := require_admin_perm(request, "Clients", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Client.objects.order_by("company")
        return Response(ClientSerializer(qs, many=True).data)
    ser = ClientSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_client_detail(request, client_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Clients", perm):
        return err
    try:
        cid = uuid.UUID(str(client_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Client, pk=cid)
    if request.method == "GET":
        return Response(ClientSerializer(obj).data)
    if request.method == "PATCH":
        ser = ClientSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Projects ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_projects(request):
    if err := require_admin_perm(request, "Projects", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Project.objects.select_related("client").prefetch_related("team").order_by("-due_date")
        return Response(ProjectSerializer(qs, many=True).data)
    ser = ProjectSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    inst = ser.save()
    notify_client_assigned_to_project(client=inst.client, project=inst)
    return Response(ProjectSerializer(inst).data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_project_detail(request, project_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Projects", perm):
        return err
    try:
        pid = uuid.UUID(str(project_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Project, pk=pid)
    if request.method == "GET":
        return Response(ProjectSerializer(obj).data)
    if request.method == "PATCH":
        old_client_id = obj.client_id
        ser = ProjectSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        inst = ser.save()
        if inst.client_id != old_client_id:
            notify_client_assigned_to_project(client=inst.client, project=inst)
        return Response(ProjectSerializer(inst).data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Pricing plans ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_pricing_plans(request):
    if err := require_admin_perm(request, "Pricing Plans", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = PricingPlan.objects.order_by("sort_order", "name")
        return Response(PricingPlanSerializer(qs, many=True).data)
    ser = PricingPlanSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_pricing_plan_detail(request, plan_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Pricing Plans", perm):
        return err
    try:
        plid = uuid.UUID(str(plan_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(PricingPlan, pk=plid)
    if request.method == "GET":
        return Response(PricingPlanSerializer(obj).data)
    if request.method == "PATCH":
        ser = PricingPlanSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— App settings (singleton) ———


@csrf_exempt
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def admin_app_settings(request):
    if err := require_admin_perm(request, "Settings", "view" if request.method == "GET" else "edit"):
        return err
    obj = AppSettings.load()
    if request.method == "GET":
        return Response(AppSettingsAdminSerializer(obj).data)
    ser = AppSettingsAdminSerializer(obj, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_app_settings_test_mail(request):
    """Send a single test message using SMTP fields from the request (draft) merged with saved AppSettings."""
    if err := require_admin_perm(request, "Settings", "edit"):
        return err
    body = request.data
    to_addr = (body.get("to") or "").strip()
    if not to_addr:
        return Response({"detail": "Recipient address (to) is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(to_addr)
    except ValidationError:
        return Response({"detail": "Invalid recipient email address."}, status=status.HTTP_400_BAD_REQUEST)

    obj = AppSettings.load()

    def _str_field(key: str, model_val: str) -> str:
        if key not in body or body.get(key) is None:
            return (model_val or "").strip()
        raw = body.get(key)
        s = (str(raw) if raw is not None else "").strip()
        return s if s else (model_val or "").strip()

    host = _str_field("smtp_host", obj.smtp_host or "")
    user = _str_field("smtp_user", obj.smtp_user or "")
    if not host:
        return Response({"detail": "SMTP host is required."}, status=status.HTTP_400_BAD_REQUEST)

    port_raw = body.get("smtp_port", None)
    if port_raw is None or str(port_raw).strip() == "":
        port = int(obj.smtp_port or 587)
    else:
        try:
            port = int(port_raw)
        except (TypeError, ValueError):
            return Response({"detail": "SMTP port must be a number."}, status=status.HTTP_400_BAD_REQUEST)

    if "smtp_pass" in body and body.get("smtp_pass") is not None and str(body.get("smtp_pass")).strip() != "":
        password = str(body.get("smtp_pass")).strip()
    else:
        password = obj.smtp_pass or ""

    from_email = _str_field("support_email", obj.support_email or "")
    if not from_email:
        return Response({"detail": "From email (support_email) is required."}, status=status.HTTP_400_BAD_REQUEST)
    from_name = _str_field("email_from_name", obj.email_from_name or "").strip()
    site_name = _str_field("site_name", obj.site_name or "TaxLexis")

    use_ssl = port == 465
    use_tls = port in (587, 2525)

    try:
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=host,
            port=port,
            username=user or "",
            password=password,
            use_tls=use_tls,
            use_ssl=use_ssl,
            timeout=25,
        )
        from_header = f"{from_name} <{from_email}>" if from_name else from_email
        msg = EmailMessage(
            subject=f"Test mail from {site_name}",
            body="This is a test message from your site mail settings. If you received it, SMTP is working.",
            from_email=from_header,
            to=[to_addr],
            connection=connection,
        )
        msg.send(fail_silently=False)
    except Exception as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"ok": True, "to": to_addr})


# ——— Blog posts ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_blog_posts(request):
    if err := require_admin_perm(request, "Homepage CMS", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = BlogPost.objects.select_related("author").order_by("-date", "title")
        return Response(BlogPostSerializer(qs, many=True).data)
    ser = BlogPostSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_blog_post_detail(request, post_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Homepage CMS", perm):
        return err
    try:
        bid = uuid.UUID(str(post_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(BlogPost, pk=bid)
    if request.method == "GET":
        return Response(BlogPostSerializer(obj).data)
    if request.method == "PATCH":
        ser = BlogPostSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— CMS: hero slides (sample granular CRUD) ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_hero_slides(request):
    if err := require_admin_perm(request, "Homepage CMS", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = HeroSlide.objects.order_by("order")
        return Response(HeroSlideSerializer(qs, many=True).data)
    ser = HeroSlideSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_hero_slide_detail(request, slide_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Homepage CMS", perm):
        return err
    try:
        sid = uuid.UUID(str(slide_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(HeroSlide, pk=sid)
    if request.method == "GET":
        return Response(HeroSlideSerializer(obj).data)
    if request.method == "PATCH":
        ser = HeroSlideSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— CMS: full homepage snapshot (admin) ———


@csrf_exempt
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_cms_homepage_snapshot(request):
    """Apply homepage CMS content (same JSON shape as GET /api/site/homepage/)."""
    if err := require_admin_perm(request, "Homepage CMS", "edit"):
        return err
    try:
        snapshot = apply_homepage_snapshot(request.data if isinstance(request.data, dict) else {})
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(snapshot)


# ——— CMS: nav items ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_nav_items(request):
    if err := require_admin_perm(request, "Homepage CMS", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = SiteNavItem.objects.prefetch_related("children").order_by("order", "label")
        return Response(SiteNavItemSerializer(qs, many=True).data)
    ser = SiteNavItemSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_nav_item_detail(request, nav_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Homepage CMS", perm):
        return err
    try:
        nid = uuid.UUID(str(nav_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(SiteNavItem, pk=nid)
    if request.method == "GET":
        return Response(SiteNavItemSerializer(obj).data)
    if request.method == "PATCH":
        ser = SiteNavItemSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Help articles (admin help center) ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_help_articles(request):
    if err := require_admin_perm(request, "Help", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = HelpArticle.objects.order_by("sort_order", "title")
        return Response(HelpArticleSerializer(qs, many=True).data)
    ser = HelpArticleSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_help_article_detail(request, article_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Help", perm):
        return err
    try:
        aid = uuid.UUID(str(article_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(HelpArticle, pk=aid)
    if request.method == "GET":
        return Response(HelpArticleSerializer(obj).data)
    if request.method == "PATCH":
        ser = HelpArticleSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Contact form messages (website → admin Support) ———


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_contact_messages(request):
    if err := require_admin_perm(request, "Support", "view"):
        return err
    qs = ContactMessage.objects.all().order_by("-created_at")
    return Response(ContactMessageDetailSerializer(qs, many=True).data)


@csrf_exempt
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_contact_message_detail(request, message_id):
    if err := require_admin_perm(request, "Support", "delete"):
        return err
    try:
        mid = uuid.UUID(str(message_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(ContactMessage, pk=mid)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ——— Legal library / knowledge base ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_practice_areas(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = PracticeArea.objects.order_by("sort_order", "name")
        return Response(PracticeAreaAdminSerializer(qs, many=True).data)
    ser = PracticeAreaAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_practice_area_detail(request, area_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        aid = uuid.UUID(str(area_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(PracticeArea, pk=aid)
    if request.method == "GET":
        return Response(PracticeAreaAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = PracticeAreaAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_legal_cases(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = LegalCase.objects.select_related("category").order_by("-date_filed", "title")
        return Response(LegalCaseAdminSerializer(qs, many=True).data)
    ser = LegalCaseAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_legal_case_detail(request, case_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        cid = uuid.UUID(str(case_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(LegalCase.objects.select_related("category"), pk=cid)
    if request.method == "GET":
        return Response(LegalCaseAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = LegalCaseAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_summary_categories(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = SummaryCategory.objects.order_by("sort_order", "name")
        return Response(SummaryCategoryAdminSerializer(qs, many=True).data)
    ser = SummaryCategoryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_summary_category_detail(request, category_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        cid = uuid.UUID(str(category_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(SummaryCategory, pk=cid)
    if request.method == "GET":
        return Response(SummaryCategoryAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = SummaryCategoryAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_act_categories(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = ActCategory.objects.order_by("sort_order", "name")
        return Response(ActCategoryAdminSerializer(qs, many=True).data)
    ser = ActCategoryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_act_category_detail(request, category_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        cid = uuid.UUID(str(category_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(ActCategory, pk=cid)
    if request.method == "GET":
        return Response(ActCategoryAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = ActCategoryAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_legal_case_categories(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = LegalCaseCategory.objects.order_by("sort_order", "name")
        return Response(LegalCaseCategoryAdminSerializer(qs, many=True).data)
    ser = LegalCaseCategoryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_legal_case_category_detail(request, category_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        cid = uuid.UUID(str(category_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(LegalCaseCategory, pk=cid)
    if request.method == "GET":
        return Response(LegalCaseCategoryAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = LegalCaseCategoryAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_procedure_categories(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = ProcedureCategory.objects.order_by("sort_order", "name")
        return Response(ProcedureCategoryAdminSerializer(qs, many=True).data)
    ser = ProcedureCategoryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_procedure_category_detail(request, category_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        cid = uuid.UUID(str(category_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(ProcedureCategory, pk=cid)
    if request.method == "GET":
        return Response(ProcedureCategoryAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = ProcedureCategoryAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_summaries(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Summary.objects.select_related("category").order_by("-posted", "title")
        return Response(SummaryAdminSerializer(qs, many=True).data)
    ser = SummaryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_summary_detail(request, summary_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        sid = uuid.UUID(str(summary_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Summary, pk=sid)
    if request.method == "GET":
        return Response(SummaryAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = SummaryAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_acts(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Act.objects.select_related("category").order_by("title_en")
        return Response(ActAdminSerializer(qs, many=True).data)
    ser = ActAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_act_detail(request, slug: str):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    obj = get_object_or_404(Act.objects.select_related("category"), pk=slug)
    if request.method == "GET":
        return Response(ActAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = ActAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_procedures(request):
    if err := require_admin_perm(request, "Legal library", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        qs = Procedure.objects.select_related("category").prefetch_related("steps").order_by(
            "category__sort_order", "category__name", "title"
        )
        return Response(ProcedureAdminSerializer(qs, many=True).data)
    ser = ProcedureAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_procedure_detail(request, procedure_id):
    perm = "view" if request.method == "GET" else ("edit" if request.method == "PATCH" else "delete")
    if err := require_admin_perm(request, "Legal library", perm):
        return err
    try:
        pid = uuid.UUID(str(procedure_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
    obj = get_object_or_404(Procedure.objects.select_related("category").prefetch_related("steps"), pk=pid)
    if request.method == "GET":
        return Response(ProcedureAdminSerializer(obj).data)
    if request.method == "PATCH":
        ser = ProcedureAdminSerializer(obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


def _panel_notif_iso(dt):
    if not dt:
        return ""
    s = dt.isoformat()
    if len(s) >= 19:
        return s[:19]
    return s


def _serialize_broadcast_row(bc: AdminBroadcast) -> dict:
    return {
        "id": str(bc.id),
        "title": bc.title,
        "body": bc.body,
        "type": bc.notification_type,
        "read": True,
        "created_at": _panel_notif_iso(bc.created_at),
        "link": bc.link or None,
        "delivery": bc.delivery or {},
        "source": "broadcast",
    }


def _serialize_inbox_row(n: UserInAppNotification) -> dict:
    return {
        "id": str(n.id),
        "title": n.title,
        "body": n.body,
        "type": "info",
        "read": n.read,
        "created_at": _panel_notif_iso(n.created_at),
        "link": n.link or None,
        "delivery": None,
        "source": "inbox",
    }


class AdminPanelNotificationCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(allow_blank=True, default="")
    type = serializers.ChoiceField(
        choices=["info", "success", "warning", "system"],
        default="info",
    )
    link = serializers.CharField(max_length=512, allow_blank=True, required=False, default="")
    delivery = serializers.JSONField(default=dict)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_panel_notifications(request):
    """Merged admin notifications: outbound broadcasts + personal staff inbox rows."""
    if err := require_admin_perm(request, "Notifications", "view" if request.method == "GET" else "create"):
        return err
    if request.method == "GET":
        merged: list[dict] = []
        for bc in AdminBroadcast.objects.all().order_by("-created_at")[:400]:
            merged.append(_serialize_broadcast_row(bc))
        for n in UserInAppNotification.objects.filter(user=request.user, broadcast__isnull=True).order_by("-created_at")[
            :400
        ]:
            merged.append(_serialize_inbox_row(n))
        merged.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return Response({"notifications": merged})

    ser = AdminPanelNotificationCreateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    d = ser.validated_data
    bc = AdminBroadcast.objects.create(
        title=d["title"].strip(),
        body=(d.get("body") or "").strip(),
        notification_type=d.get("type") or AdminBroadcast.NotificationType.INFO,
        link=(d.get("link") or "").strip()[:512],
        delivery=d.get("delivery") or {},
        created_by=request.user if request.user.is_authenticated else None,
    )
    fan_out_broadcast_in_app(bc)
    return Response(_serialize_broadcast_row(bc), status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_panel_notifications_mark_all_read(request):
    if err := require_admin_perm(request, "Notifications", "edit"):
        return err
    UserInAppNotification.objects.filter(user=request.user, read=False).update(read=True)
    return Response({"ok": True})


@csrf_exempt
@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_panel_notification_detail(request, notification_id):
    if request.method == "DELETE":
        if err := require_admin_perm(request, "Notifications", "delete"):
            return err
    elif request.method == "PATCH":
        if err := require_admin_perm(request, "Notifications", "edit"):
            return err
    try:
        nid = uuid.UUID(str(notification_id))
    except ValueError:
        return Response({"detail": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        bc = AdminBroadcast.objects.filter(pk=nid).first()
        if bc:
            bc.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        n = UserInAppNotification.objects.filter(pk=nid, user=request.user).first()
        if n:
            n.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    body_keys = set(request.data.keys()) if isinstance(request.data, dict) else set()
    if body_keys <= {"read"} and "read" in body_keys:
        n = UserInAppNotification.objects.filter(pk=nid, user=request.user).first()
        if n:
            n.read = bool(request.data.get("read"))
            n.save(update_fields=["read"])
            return Response(_serialize_inbox_row(n))
        bc_read = AdminBroadcast.objects.filter(pk=nid).first()
        if bc_read:
            return Response(_serialize_broadcast_row(bc_read))
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    bc = AdminBroadcast.objects.filter(pk=nid).first()
    if not bc:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    if "title" in request.data:
        bc.title = str(request.data.get("title") or "").strip()[:255]
    if "body" in request.data:
        bc.body = str(request.data.get("body") or "").strip()
    if "type" in request.data:
        t = str(request.data.get("type") or "info")
        if t in dict(AdminBroadcast.NotificationType.choices):
            bc.notification_type = t
    if "link" in request.data:
        bc.link = str(request.data.get("link") or "").strip()[:512]
    if "delivery" in request.data and isinstance(request.data.get("delivery"), dict):
        bc.delivery = request.data.get("delivery") or {}
    bc.save()
    sync_broadcast_metadata_to_recipients(bc)
    fan_out_broadcast_in_app(bc)
    return Response(_serialize_broadcast_row(bc))


# ——— Notices (super admin only) ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_notices(request):
    if err := _require_super_admin_for_notices(request):
        return err
    if request.method == "GET":
        qs = Notice.objects.all().order_by("sort_order", "-created_at", "title")
        return Response(NoticeAdminSerializer(qs, many=True).data)
    ser = NoticeAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    obj = ser.save()
    return Response(NoticeAdminSerializer(obj).data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_notice_detail(request, notice_id: uuid.UUID):
    if err := _require_super_admin_for_notices(request):
        return err
    obj = get_object_or_404(Notice, pk=notice_id)
    if request.method == "GET":
        return Response(NoticeAdminSerializer(obj).data)
    if request.method == "DELETE":
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = NoticeAdminSerializer(obj, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data)


# ——— Knowledge base resources (super admin only) ———


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_knowledge_resource_categories(request):
    if err := _require_super_admin_for_knowledge_resources(request):
        return err
    if request.method == "GET":
        qs = KnowledgeResourceCategory.objects.order_by("sort_order", "name")
        return Response(KnowledgeResourceCategoryAdminSerializer(qs, many=True).data)
    ser = KnowledgeResourceCategoryAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_knowledge_resource_category_detail(request, category_id: uuid.UUID):
    if err := _require_super_admin_for_knowledge_resources(request):
        return err
    obj = get_object_or_404(KnowledgeResourceCategory, pk=category_id)
    if request.method == "GET":
        return Response(KnowledgeResourceCategoryAdminSerializer(obj).data)
    if request.method == "DELETE":
        if KnowledgeResource.objects.filter(category=obj.name).exists():
            return Response(
                {
                    "detail": "Cannot delete this category while knowledge resources are assigned to it. "
                    "Reassign or remove those resources first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = KnowledgeResourceCategoryAdminSerializer(obj, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_knowledge_resources(request):
    if err := _require_super_admin_for_knowledge_resources(request):
        return err
    if request.method == "GET":
        qs = KnowledgeResource.objects.all().order_by("sort_order", "title")
        return Response(KnowledgeResourceAdminSerializer(qs, many=True).data)
    ser = KnowledgeResourceAdminSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    obj = ser.save()
    return Response(KnowledgeResourceAdminSerializer(obj).data, status=status.HTTP_201_CREATED)


def _admin_knowledge_resource_pdf_response(obj: KnowledgeResource):
    """Inline PDF for flipbook preview (does not increment download_count)."""
    if obj.pdf_file:
        try:
            return FileResponse(
                obj.pdf_file.open("rb"),
                as_attachment=False,
                content_type="application/pdf",
            )
        except (OSError, ValueError):
            pass
    href = (obj.download_href or "").strip()
    if href.startswith("/media/"):
        rel = href[len("/media/") :].lstrip("/")
        abs_path = os.path.normpath(os.path.join(settings.MEDIA_ROOT, rel))
        media_root = os.path.normpath(settings.MEDIA_ROOT)
        if abs_path.startswith(media_root) and os.path.isfile(abs_path):
            return FileResponse(
                open(abs_path, "rb"),
                as_attachment=False,
                content_type="application/pdf",
            )
    return Response({"detail": "PDF is not available for this resource."}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_knowledge_resource_pdf_preview(request, resource_id: uuid.UUID):
    """Same PDF stream as GET detail with ?preview=pdf (path variant for flipbook / proxies)."""
    if err := _require_super_admin_for_knowledge_resources(request):
        return err
    obj = get_object_or_404(KnowledgeResource, pk=resource_id)
    return _admin_knowledge_resource_pdf_response(obj)


@csrf_exempt
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_knowledge_resource_detail(request, resource_id: uuid.UUID):
    if err := _require_super_admin_for_knowledge_resources(request):
        return err
    obj = get_object_or_404(KnowledgeResource, pk=resource_id)
    if request.method == "GET" and (request.GET.get("preview") or "").strip().lower() == "pdf":
        return _admin_knowledge_resource_pdf_response(obj)
    if request.method == "GET":
        return Response(KnowledgeResourceAdminSerializer(obj).data)
    if request.method == "DELETE":
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = KnowledgeResourceAdminSerializer(obj, data=request.data, partial=True)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    ser.save()
    return Response(ser.data)
