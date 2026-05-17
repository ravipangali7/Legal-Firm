"""Transactional emails for subscription payments."""

from __future__ import annotations

from django.utils import formats

from core.email_templates import base_email_context, send_automated_email, send_templated_email
from core.models import EmailTemplate, Transaction


def _txn_context(txn: Transaction) -> dict[str, str]:
    user = txn.user
    ctx = base_email_context(user=user)
    ctx["invoice"] = txn.invoice
    ctx["amount"] = str(txn.amount)
    ctx["currency"] = txn.currency or "NPR"
    ctx["plan"] = txn.get_plan_display() if txn.plan else ""
    ctx["billing_cycle"] = txn.get_billing_cycle_display()
    if user.plan_benefits_end:
        ctx["package_end_date"] = formats.date_format(user.plan_benefits_end, "DATETIME_FORMAT")
    return ctx


def send_payment_verified_email(txn: Transaction) -> None:
    send_templated_email(
        EmailTemplate.EventType.PAYMENT_VERIFIED,
        to_email=txn.email or txn.user.email,
        context=_txn_context(txn),
        user=txn.user,
    )


def send_payment_pending_email(txn: Transaction) -> None:
    send_templated_email(
        EmailTemplate.EventType.PAYMENT_PENDING,
        to_email=txn.email or txn.user.email,
        context=_txn_context(txn),
        user=txn.user,
    )


def send_payment_rejected_email(txn: Transaction) -> None:
    ctx = _txn_context(txn)
    ctx["rejection_reason"] = (txn.rejection_reason or "").strip() or "Not specified"
    send_templated_email(
        EmailTemplate.EventType.PAYMENT_REJECTED,
        to_email=txn.email or txn.user.email,
        context=ctx,
        user=txn.user,
    )


def send_subscribed_email(txn: Transaction) -> None:
    """Subscription access granted after payment verification."""
    send_automated_email(
        EmailTemplate.Automate.SUBSCRIBED,
        to_email=txn.email or txn.user.email,
        context=_txn_context(txn),
        user=txn.user,
    )
