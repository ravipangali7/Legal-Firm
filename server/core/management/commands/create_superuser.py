"""
Create a superuser for the custom email-based User model (core.User).

Examples::

    python manage.py create_superuser --email admin@example.com --full-name "Site Admin"
    python manage.py create_superuser --email admin@example.com --password 'secret' --noinput

Non-interactive mode requires ``--email`` and ``--password``.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError


class Command(BaseCommand):
    help = "Creates a superuser with email + full_name (AUTH_USER_MODEL=core.User)."

    def add_arguments(self, parser):
        parser.add_argument("--email", type=str, help="Login email (unique).")
        parser.add_argument("--full-name", type=str, default="", dest="full_name", help="Display name.")
        parser.add_argument("--password", type=str, help="Password (required with --noinput).")
        parser.add_argument(
            "--noinput",
            action="store_true",
            help="Non-interactive: requires --email and --password.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        noinput = options["noinput"]
        email = (options.get("email") or "").strip()
        full_name = (options.get("full_name") or "").strip()
        password = options.get("password")

        if noinput:
            if not email or not password:
                raise CommandError("--noinput requires --email and --password.")
            if not full_name:
                full_name = email.split("@")[0]
        else:
            if not email:
                email = input("Email: ").strip()
            if not full_name:
                full_name = input("Full name: ").strip() or email.split("@")[0]
            import getpass

            p1 = getpass.getpass("Password: ")
            p2 = getpass.getpass("Password (again): ")
            if p1 != p2:
                raise CommandError("Passwords do not match.")
            password = p1

        if not email:
            raise CommandError("Email is required.")

        try:
            user = User.objects.create_superuser(
                email=email,
                password=password,
                full_name=full_name,
                status=User.Status.ACTIVE,
            )
        except IntegrityError as e:
            raise CommandError(f"Could not create superuser: {e}") from e

        self.stdout.write(self.style.SUCCESS(f"Superuser created: {user.email}"))
