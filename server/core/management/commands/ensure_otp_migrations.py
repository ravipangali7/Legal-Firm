"""Apply pending core migrations required for phone OTP login."""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Run core migrations for OTP login (OtpVerification.purpose, EmailTemplate). "
        "Use on production if POST /api/auth/otp/request/ returns 500 or 503 after deploy."
    )

    def handle(self, *args, **options):
        verbosity = options.get("verbosity", 1)
        call_command("migrate", "core", verbosity=verbosity)
        self.stdout.write(
            self.style.SUCCESS(
                "Core migrations applied. OTP login needs 0039_email_templates_otp_purpose or later."
            )
        )
