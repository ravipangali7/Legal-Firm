"""
Seed PermissionModule rows and Role + RolePermission matrix from the frontend
reference (`web/src/store/adminStore.tsx` MODULES + seedRoles).

Safe to run multiple times (uses get_or_create / updates flags).
"""

from django.core.management.base import BaseCommand

from core import models

# Keep names in sync with `web/src/store/adminStore.tsx` MODULES.
MODULES = [
    "Activity Logs",
    "Analytics",
    "Clients",
    "Dashboard",
    "Help",
    "Homepage CMS",
    "Legal library",
    "Notifications",
    "Pricing Plans",
    "Projects",
    "Roles",
    "Settings",
    "Support",
    "Transactions",
    "Users",
]


def _full_perms(full: bool):
    return {m: dict(view=full, create=full, edit=full, delete=full) for m in MODULES}


def _all_false():
    return {m: dict(view=False, create=False, edit=False, delete=False) for m in MODULES}


def _matrix():
    super_row = {
        "name": "Super Admin",
        "key": "super_admin",
        "description": "Full system access",
        "is_system": True,
        "perms": _full_perms(True),
    }

    admin_perms = _full_perms(True)
    for m in MODULES:
        if m in ("Roles", "Activity Logs"):
            admin_perms[m] = dict(view=False, create=False, edit=False, delete=False)
        elif m == "Settings":
            admin_perms[m] = dict(view=True, create=False, edit=False, delete=False)
        elif m == "Users":
            admin_perms[m] = dict(view=True, create=True, edit=True, delete=False)
    admin_row = {
        "name": "Admin",
        "key": "admin",
        "description": "Manage users, content & transactions",
        "is_system": True,
        "perms": admin_perms,
    }

    editor_perms = _all_false()
    ev = {"Dashboard", "Homepage CMS", "Legal library", "Analytics", "Projects", "Notifications", "Settings", "Help", "Roles"}
    ece = {"Homepage CMS", "Legal library", "Projects"}
    for m in MODULES:
        if m in ev:
            editor_perms[m] = dict(view=True, create=m in ece, edit=m in ece, delete=False)
    editor_row = {
        "name": "Editor",
        "key": "editor",
        "description": "Create and edit content only",
        "is_system": True,
        "perms": editor_perms,
    }

    client_perms = _all_false()
    for m in ("Dashboard", "Projects", "Notifications", "Support", "Settings", "Help"):
        client_perms[m] = dict(view=True, create=False, edit=False, delete=False)
    client_perms["Support"] = dict(view=True, create=True, edit=False, delete=False)
    client_row = {
        "name": "Client",
        "key": "client",
        "description": "Subscribed customer access",
        "is_system": True,
        "perms": client_perms,
    }

    user_perms = _all_false()
    for m in ("Dashboard", "Notifications", "Support", "Settings", "Help"):
        user_perms[m] = dict(view=True, create=False, edit=False, delete=False)
    user_perms["Support"] = dict(view=True, create=True, edit=False, delete=False)
    user_row = {
        "name": "User",
        "key": "user",
        "description": "Free / unsubscribed visitor",
        "is_system": True,
        "perms": user_perms,
    }

    return [super_row, admin_row, editor_row, client_row, user_row]


class Command(BaseCommand):
    help = "Seed PermissionModule + Role + RolePermission (admin RBAC)."

    def handle(self, *args, **options):
        for name in MODULES:
            models.PermissionModule.objects.get_or_create(name=name)

        for row in _matrix():
            role, _ = models.Role.objects.update_or_create(
                key=row["key"],
                defaults={
                    "name": row["name"],
                    "description": row["description"],
                    "is_system": row["is_system"],
                },
            )
            for mod_name, flags in row["perms"].items():
                mod = models.PermissionModule.objects.get(name=mod_name)
                models.RolePermission.objects.update_or_create(
                    role=role,
                    module=mod,
                    defaults={
                        "can_view": flags["view"],
                        "can_create": flags["create"],
                        "can_edit": flags["edit"],
                        "can_delete": flags["delete"],
                    },
                )

        self.stdout.write(self.style.SUCCESS("Roles & permissions seeded."))
