"""
Run all reference seeders in order: RBAC → admin demo → CMS → catalog.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Runs seed_roles_permissions, seed_admin_demo, seed_cms_homepage, seed_catalog."

    def handle(self, *args, **options):
        call_command("seed_roles_permissions")
        call_command("seed_admin_demo")
        call_command("seed_cms_homepage")
        call_command("seed_catalog")
        self.stdout.write(self.style.SUCCESS("All seeds finished."))
