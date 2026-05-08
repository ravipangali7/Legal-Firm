"""Create dashboard-visible rows when subscription-related events occur."""

from __future__ import annotations

from .models import Transaction, UserActivityLog, UserInAppNotification
from .rbac import subscriber_portal_hub_prefix
from .sms import send_payment_verification_sms
from .staff_notifications import notify_super_admins_in_app


def record_transaction_verified(txn: Transaction) -> None:
    """Append activity + notification for a newly verified payment (idempotent per transaction)."""
    label = txn.invoice
    plan_part = f" — {txn.get_plan_display()}" if txn.plan else ""
    hub = subscriber_portal_hub_prefix(txn.user)
    UserActivityLog.objects.create(
        user=txn.user,
        verb=UserActivityLog.Verb.PAYMENT_VERIFIED,
        object_label=f"Payment verified: {label}{plan_part}",
        path=hub,
    )
    UserInAppNotification.objects.create(
        user=txn.user,
        title="Payment verified",
        body=f"Invoice {label}{plan_part} was applied to your account.",
        read=False,
        link=hub,
    )
    who = (txn.user.full_name or txn.user.email or "A user").strip()
    notify_super_admins_in_app(
        title="Package purchase verified",
        body=f"{who} — invoice {label}{plan_part}.",
        link="/admin/transactions",
    )
    plan_display = txn.get_plan_display() if txn.plan else ""
    send_payment_verification_sms(txn.user, label, plan_display=plan_display)
