"""
WSGI config for legalfirm project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "legalfirm.settings")

application = get_wsgi_application()


def _maybe_apply_core_migrations_on_startup() -> None:
    """Apply pending core migrations on boot when RUN_CORE_MIGRATE_ON_STARTUP is enabled."""
    flag = os.environ.get("RUN_CORE_MIGRATE_ON_STARTUP", "").strip().lower()
    if flag not in ("1", "true", "yes", "on"):
        return
    from django.core.management import call_command

    call_command("ensure_otp_migrations", verbosity=1)


_maybe_apply_core_migrations_on_startup()
