"""Re-sync ``is_staff`` / ``is_superuser`` for every user from their ``role`` (see ``user_sync_staff_flags`` signal)."""

from django.core.management.base import BaseCommand

from core.models import User


class Command(BaseCommand):
    help = "Re-sync is_staff / is_superuser from each user's role (runs User pre_save)."

    def handle(self, *args, **options):
        qs = User.objects.select_related("role").all()
        n = 0
        for user in qs:
            role_key = user.role.key if user.role_id else ""
            if role_key == "super_admin":
                user.is_staff = True
                user.is_superuser = True
            elif role_key in ("admin", "editor"):
                user.is_staff = True
                user.is_superuser = False
            elif role_key in ("client", "user"):
                user.is_staff = False
                user.is_superuser = False
            user.save(update_fields=["is_staff", "is_superuser"])
            n += 1
        self.stdout.write(self.style.SUCCESS(f"Updated staff flags for {n} user(s)."))
