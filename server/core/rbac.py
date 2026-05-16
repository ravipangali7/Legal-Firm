"""
Admin RBAC: effective role (mirrors web `adminSidebarRole.ts`) and RolePermission checks.

Endpoint → PermissionModule mapping (enforced in `x_views` / `dashboard_views`):

- Dashboard: admin_dashboard_summary, admin_dashboard_analytics
- Users: admin_users, admin_user_detail, admin_user_revoke_subscription, admin_user_impersonate
- Roles: admin_permission_modules, admin_permission_module_detail, admin_roles, admin_role_detail,
         admin_role_permissions, admin_role_permission_detail
- Transactions: admin_transactions, admin_transaction_detail
- Clients: admin_clients (GET also allowed when user has Users edit — see ``require_clients_list_or_users_edit``),
         admin_client_detail
- Projects: admin_projects, admin_project_detail
- Pricing Plans: admin_pricing_plans, admin_pricing_plan_detail
- Settings: admin_app_settings, admin_app_settings_test_mail, admin_email_templates,
  admin_email_template_detail, admin_email_template_test
- Homepage CMS: admin_blog_posts, admin_blog_post_detail, admin_hero_slides, admin_hero_slide_detail,
                admin_cms_homepage_snapshot, admin_nav_items, admin_nav_item_detail
- Help: admin_help_articles, admin_help_article_detail
- Support: admin_contact_messages, admin_contact_message_detail
- Legal library: admin_practice_areas, admin_practice_area_detail, admin_legal_cases, admin_legal_case_detail,
                 admin_act_categories, admin_act_category_detail, admin_legal_case_categories,
                 admin_legal_case_category_detail, admin_procedure_categories, admin_procedure_category_detail,
                 admin_summary_categories, admin_summary_category_detail, admin_summaries, admin_summary_detail,
                 admin_acts, admin_act_detail, admin_procedures, admin_procedure_detail
- Notices: admin_notices, admin_notice_detail (super administrators only; not in the RBAC matrix)
- Knowledge resources: admin_knowledge_resources, admin_knowledge_resource_pdf_preview,
  admin_knowledge_resource_detail (super administrators only; not in the RBAC matrix)
- Notifications: admin_panel_notifications, admin_panel_notifications_mark_all_read, admin_panel_notification_detail
"""

from __future__ import annotations

from typing import Literal

from rest_framework import status
from rest_framework.response import Response

from core.models import PermissionModule, Role, RolePermission

KNOWN_ROLE_KEYS = frozenset({"super_admin", "admin", "editor", "client", "user"})

AdminPerm = Literal["view", "create", "edit", "delete"]


def _default_subscriber_portal_matrix(role_key: str, module_names: list[str]) -> list[dict[str, bool | str]]:
    """
    Fallback subscriber-shell matrix when ``RolePermission`` rows were never seeded for this role
    (e.g. deployments that ran migrations creating :class:`~core.Role` rows but omitted
    ``python manage.py seed_roles_permissions``).

    Mirrors ``seed_roles_permissions._matrix()`` for ``client`` and ``user``.
    Unknown module names default to deny-all.
    """
    if role_key not in ("client", "user"):
        return [
            {"module": n, "view": False, "create": False, "edit": False, "delete": False}
            for n in module_names
        ]

    if role_key == "client":
        view_ok = {
            "Dashboard",
            "Projects",
            "Notifications",
            "Transactions",
            "Pricing Plans",
            "Support",
            "Settings",
            "Help",
        }
    else:
        view_ok = {
            "Dashboard",
            "Notifications",
            "Transactions",
            "Pricing Plans",
            "Support",
            "Settings",
            "Help",
        }

    out: list[dict[str, bool | str]] = []
    for name in module_names:
        if name == "Support":
            out.append(
                {"module": name, "view": True, "create": True, "edit": False, "delete": False}
            )
        elif name in view_ok:
            out.append({"module": name, "view": True, "create": False, "edit": False, "delete": False})
        else:
            out.append({"module": name, "view": False, "create": False, "edit": False, "delete": False})
    return out


def post_auth_app_home_path(user) -> str:
    """
    Primary SPA path after login (mirrors web `userHomeHref`).

    super_admin / admin / editor (staff) -> /admin
    client -> /client
    user -> /dashboard
    Other / legacy -> staff -> /admin; else library entitlement -> /dashboard; else /account
    """
    if not getattr(user, "is_authenticated", False):
        return "/login"
    role = user.role_key
    # Django superuser or explicit super_admin role always lands in admin SPA.
    if getattr(user, "is_superuser", False):
        return "/admin"
    if role == "super_admin":
        return "/admin"
    if role in ("admin", "editor") and user.is_staff:
        return "/admin"
    if role == "client":
        return "/client"
    if role == "user":
        return "/dashboard"
    if user.is_staff:
        return "/admin"
    from core.subscription_service import library_entitlement_active

    if library_entitlement_active(user):
        return "/dashboard"
    return "/account"


def subscriber_portal_hub_prefix(user) -> str:
    """Subscriber-area base path (`/client` vs `/dashboard`) for wallet links and in-app deep links."""
    role = user.role_key
    return "/client" if role == "client" else "/dashboard"


def effective_admin_role_key(user) -> str:
    """Match `web/src/lib/adminSidebarRole.effectiveSidebarRole` (without TS types)."""
    if not getattr(user, "is_authenticated", False):
        return "user"
    if getattr(user, "is_superuser", False):
        return "super_admin"
    r = user.role_key
    if r in KNOWN_ROLE_KEYS:
        if user.is_staff and r in ("client", "user"):
            return "admin"
        return r
    if user.is_staff:
        return "admin"
    return "user"


def portal_permissions_for_user(user) -> list[dict[str, bool | str]]:
    """
    Effective PermissionModule matrix for subscriber-shell UI (/client, /dashboard sidebar).

    Always resolves ``RolePermission`` rows for the user's ``role_key`` (same rows edited under
    Admin → Roles), including when ``is_staff`` is True — so e.g. a Client-role staff account
    sees the Client portal matrix instead of the admin matrix. Django superusers receive full
    flags on every module. Admin SPA navigation still uses ``admin_permissions_for_user``.

    If the ``client`` or ``user`` role exists but has no ``RolePermission`` rows yet (some
    installs create roles via migrations without running ``seed_roles_permissions``), a built-in
    default portal matrix matching that seed command is returned instead of an all-deny grid.
    """
    if not getattr(user, "is_authenticated", False):
        return []
    names = list(PermissionModule.objects.order_by("name").values_list("name", flat=True))
    if getattr(user, "is_superuser", False):
        return [
            {"module": n, "view": True, "create": True, "edit": True, "delete": True}
            for n in names
        ]
    try:
        role = Role.objects.get(key=user.role_key)
    except Role.DoesNotExist:
        return [
            {"module": n, "view": False, "create": False, "edit": False, "delete": False}
            for n in names
        ]

    rp_qs = RolePermission.objects.filter(role=role).select_related("module")
    if not rp_qs.exists() and role.key in ("client", "user"):
        return _default_subscriber_portal_matrix(role.key, names)

    rp_by_mod_name = {
        rp.module.name: rp
        for rp in rp_qs
    }
    return [
        {
            "module": name,
            "view": bool(rp_by_mod_name[name].can_view) if name in rp_by_mod_name else False,
            "create": bool(rp_by_mod_name[name].can_create) if name in rp_by_mod_name else False,
            "edit": bool(rp_by_mod_name[name].can_edit) if name in rp_by_mod_name else False,
            "delete": bool(rp_by_mod_name[name].can_delete) if name in rp_by_mod_name else False,
        }
        for name in names
    ]


def portal_module_perm(user, module_name: str, perm: AdminPerm) -> bool:
    """Whether subscriber-shell RolePermission grants ``perm`` on ``module_name``."""
    if not getattr(user, "is_authenticated", False):
        return False
    for row in portal_permissions_for_user(user):
        if str(row["module"]) == module_name:
            return bool(row.get(perm, False))
    return False


def admin_permissions_for_user(user) -> list[dict[str, bool | str]]:
    """One row per PermissionModule. Empty list when not staff (e.g. impersonated client session)."""
    if not user.is_authenticated or not user.is_staff:
        return []
    if getattr(user, "is_superuser", False):
        names = list(PermissionModule.objects.order_by("name").values_list("name", flat=True))
        return [
            {"module": n, "view": True, "create": True, "edit": True, "delete": True}
            for n in names
        ]
    key = effective_admin_role_key(user)
    try:
        role = Role.objects.get(key=key)
    except Role.DoesNotExist:
        return []
    rows = (
        RolePermission.objects.filter(role=role)
        .select_related("module")
        .order_by("module__name")
    )
    return [
        {
            "module": rp.module.name,
            "view": rp.can_view,
            "create": rp.can_create,
            "edit": rp.can_edit,
            "delete": rp.can_delete,
        }
        for rp in rows
    ]


def admin_perm_map(user) -> dict[str, dict[str, bool]]:
    out: dict[str, dict[str, bool]] = {}
    for row in admin_permissions_for_user(user):
        name = str(row["module"])
        out[name] = {
            "view": bool(row["view"]),
            "create": bool(row["create"]),
            "edit": bool(row["edit"]),
            "delete": bool(row["delete"]),
        }
    return out


def user_has_admin_perm(user, module_name: str, perm: AdminPerm) -> bool:
    if not user.is_authenticated or not user.is_staff:
        return False
    if getattr(user, "is_superuser", False):
        return True
    m = admin_perm_map(user).get(module_name)
    if not m:
        return False
    return bool(m.get(perm))


def require_clients_list_or_users_edit(request):
    """
    Allow listing CRM clients when staff can view the Clients module **or** edit Users
    (user-role → client sync must be visible in the admin snapshot / Clients page).
    """
    u = request.user
    if not u.is_authenticated or not u.is_staff:
        return Response({"detail": "Staff authentication required."}, status=status.HTTP_403_FORBIDDEN)
    if user_has_admin_perm(u, "Clients", "view") or user_has_admin_perm(u, "Users", "edit"):
        return None
    return Response(
        {"detail": "Missing permission: view on Clients (or edit on Users)."},
        status=status.HTTP_403_FORBIDDEN,
    )


def require_admin_perm(request, module_name: str, perm: AdminPerm):
    """
    Staff gate + RolePermission check. Returns None if allowed, otherwise a 403 Response
    (or 403 staff required).
    """
    u = request.user
    if not u.is_authenticated or not u.is_staff:
        return Response({"detail": "Staff authentication required."}, status=status.HTTP_403_FORBIDDEN)
    if user_has_admin_perm(u, module_name, perm):
        return None
    return Response(
        {"detail": f"Missing permission: {perm} on {module_name}."},
        status=status.HTTP_403_FORBIDDEN,
    )
