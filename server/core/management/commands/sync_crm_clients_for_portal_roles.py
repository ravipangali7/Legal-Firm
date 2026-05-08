"""Ensure every portal account (User.role=`client`) has a CRM Client row; safe to repeat."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from core.models import User
from core.sync_user_client import sync_crm_client_for_user


class Command(BaseCommand):
    help = (
        "Sync CRM Client rows for all users whose role key is ``client``. "
        "Use after role changes if rows were missed (mirrors signup/admin save behavior)."
    )

    def handle(self, *args, **options):
        qs = User.objects.filter(role__key=User.RoleKey.CLIENT).select_related("role")
        total = qs.count()
        for user in qs.iterator():
            sync_crm_client_for_user(user)
        self.stdout.write(self.style.SUCCESS(f"Processed {total} client-role account(s)."))
