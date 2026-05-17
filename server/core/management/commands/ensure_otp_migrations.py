"""Apply pending core migrations required for phone OTP login."""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Run core migrations for OTP login (OtpVerification.purpose, EmailTemplate). "
        "Use on production if POST /api/auth/otp/request/ or GET /api/admin/email-templates/ "
        "returns 500/503 after deploy."
    )

    def handle(self, *args, **options):
        verbosity = options.get("verbosity", 1)
        call_command("migrate", "core", verbosity=verbosity)
        from core.email_templates import seed_default_email_templates

        seed_default_email_templates()
        self.stdout.write(
            self.style.SUCCESS(
                "Core migrations applied (0039_email_templates_otp_purpose or later). "
                "Default email templates seeded."
            )
        )
