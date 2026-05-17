"""Django signals implementing cross-model rules."""

from __future__ import annotations

from django.db.models.signals import post_delete, post_migrate, post_save, pre_save
from django.dispatch import receiver

from .dashboard_events import record_transaction_verified
from .models import Procedure, ProcedureStep, Transaction, User
from .payment_notifications import (
    send_payment_pending_email,
    send_payment_rejected_email,
    send_payment_verified_email,
    send_subscribed_email,
)
from .sms import send_payment_rejection_sms
from .sync_user_client import sync_crm_client_for_user
from .staff_notifications import notify_super_admins_in_app
from .subscription_service import apply_refunded_transaction, apply_verified_transaction


@receiver(pre_save, sender=User)
def user_stash_previous_email_for_crm(sender, instance: User, **kwargs):
    """When the login email changes, :func:`~core.sync_user_client.sync_crm_client_for_user` can migrate the CRM row."""
    if not instance.pk:
        instance._crm_previous_email = None  # type: ignore[attr-defined]
        return
    try:
        prev = User.objects.only("email").get(pk=instance.pk)
    except User.DoesNotExist:
        instance._crm_previous_email = None  # type: ignore[attr-defined]
        return
    old = (prev.email or "").strip()
    new = (instance.email or "").strip()
    if old and new and old.lower() != new.lower():
        instance._crm_previous_email = old  # type: ignore[attr-defined]
    else:
        instance._crm_previous_email = None  # type: ignore[attr-defined]


@receiver(pre_save, sender=User)
def user_sync_staff_flags(sender, instance: User, **kwargs):
    """Keep ``is_staff`` / ``is_superuser`` aligned with ``role`` (all accounts are staff; superuser only for super_admin)."""
    if not instance.role_id:
        return
    role_key = instance.role.key
    if role_key == "super_admin":
        instance.is_staff = True
        instance.is_superuser = True
    else:
        instance.is_staff = True
        instance.is_superuser = False


@receiver(post_save, sender=User)
def user_sync_crm_client_row(sender, instance: User, **kwargs):
    """Mirror ``client``-role accounts into CRM :class:`~core.models.Client` (all save paths, not only admin serializer)."""
    sync_crm_client_for_user(instance)


@receiver(pre_save, sender=Transaction)
def transaction_cache_previous_status(sender, instance: Transaction, **kwargs):
    if instance.pk:
        try:
            prev = Transaction.objects.get(pk=instance.pk)
            instance._status_previous = prev.status  # type: ignore[attr-defined]
        except Transaction.DoesNotExist:
            instance._status_previous = None  # type: ignore[attr-defined]
    else:
        instance._status_previous = None  # type: ignore[attr-defined]


@receiver(post_save, sender=Transaction)
def transaction_subscription_effects(sender, instance: Transaction, created: bool, **kwargs):
    """Verified payments activate subscription; refunds downgrade after verification."""
    prev = getattr(instance, "_status_previous", None)

    if created:
        if instance.status == Transaction.Status.VERIFIED:
            apply_verified_transaction(instance)
            record_transaction_verified(instance)
            try:
                send_payment_verified_email(instance)
                send_subscribed_email(instance)
            except Exception:
                pass
        elif instance.status == Transaction.Status.PENDING:
            # eSewa creates a pending row at checkout initiation; notify Super Admins
            # only for flows that actually require manual verification.
            if instance.method == Transaction.Method.ESEWA:
                return
            who = (instance.user.full_name or instance.user.email or "A user").strip()
            plan_part = f" — {instance.get_plan_display()}" if instance.plan else ""
            notify_super_admins_in_app(
                title="Payment pending verification",
                body=f"{who} submitted {instance.method} payment for invoice {instance.invoice}{plan_part}.",
                link="/admin/transactions",
            )
            try:
                send_payment_pending_email(instance)
            except Exception:
                pass
        return

    if prev == instance.status:
        return

    if instance.status == Transaction.Status.VERIFIED:
        apply_verified_transaction(instance)
        record_transaction_verified(instance)
        try:
            send_payment_verified_email(instance)
            send_subscribed_email(instance)
        except Exception:
            pass
        return

    if instance.status == Transaction.Status.REJECTED and prev == Transaction.Status.PENDING:
        reason = (getattr(instance, "rejection_reason", None) or "").strip()
        if len(reason) >= 3:
            send_payment_rejection_sms(instance.user, instance.invoice, reason)
        try:
            send_payment_rejected_email(instance)
        except Exception:
            pass
        return

    if (
        instance.status == Transaction.Status.REFUNDED
        and prev == Transaction.Status.VERIFIED
    ):
        apply_refunded_transaction(instance)


def _refresh_procedure_steps_count(procedure_id):
    n = ProcedureStep.objects.filter(procedure_id=procedure_id).count()
    Procedure.objects.filter(pk=procedure_id).update(steps_count=n)


@receiver(post_save, sender=ProcedureStep)
def procedure_step_saved(sender, instance: ProcedureStep, **kwargs):
    _refresh_procedure_steps_count(instance.procedure_id)


@receiver(post_delete, sender=ProcedureStep)
def procedure_step_deleted(sender, instance: ProcedureStep, **kwargs):
    _refresh_procedure_steps_count(instance.procedure_id)


@receiver(post_migrate)
def clear_otp_schema_cache_after_migrate(sender, **kwargs):
    if getattr(sender, "name", None) != "core":
        return
    from core.email_template_schema import invalidate_email_template_schema_cache
    from core.otp_schema import invalidate_otp_schema_cache

    invalidate_otp_schema_cache()
    invalidate_email_template_schema_cache()


@receiver(post_migrate)
def seed_email_templates_after_migrate(sender, **kwargs):
    """Ensure default rows exist after 0039+ even when RunPython seed was skipped."""
    if getattr(sender, "name", None) != "core":
        return
    from django.db import connection

    from core.email_template_schema import email_template_schema_has_automate
    from core.email_templates import seed_default_email_templates
    from core.models import EmailTemplate

    table = EmailTemplate._meta.db_table
    if table not in connection.introspection.table_names():
        return
    if not email_template_schema_has_automate():
        return
    if not EmailTemplate.objects.exists():
        seed_default_email_templates()
