"""Business rules for payments and subscriptions (see models_logic.md)."""

from __future__ import annotations

import calendar
from decimal import Decimal

from django.db import transaction as db_transaction
from django.utils import timezone

from .models import AppSettings, Transaction, User, UserProfile


def _add_calendar_months(start, months: int):
    """Add `months` calendar months to timezone-aware `start`, clamping day to last day of month."""
    total = start.year * 12 + start.month - 1 + months
    y, m0 = divmod(total, 12)
    m = m0 + 1
    last = calendar.monthrange(y, m)[1]
    d = min(start.day, last)
    return start.replace(year=y, month=m, day=d)


def add_subscription_calendar_end(start, billing_cycle: str):
    """
    End of the purchased window after `start` (timezone-aware).
    """
    if billing_cycle == Transaction.BillingCycle.YEARLY:
        return _add_calendar_months(start, 12)
    if billing_cycle == Transaction.BillingCycle.SIX_MONTH:
        return _add_calendar_months(start, 6)
    return _add_calendar_months(start, 1)


def package_validity_customer_summary(billing_cycle: str) -> str:
    """
    Human-readable description of library access after Super Admin verification
    (one calendar month or one calendar year from the day the subscription request is made).
    """
    if billing_cycle == Transaction.BillingCycle.YEARLY:
        return (
            "Yearly package: after verification, full library access runs for exactly one calendar year "
            "from the date you submitted this request."
        )
    if billing_cycle == Transaction.BillingCycle.SIX_MONTH:
        return (
            "Six-month package: after verification, full library access runs for exactly six calendar months "
            "from the date you submitted this request."
        )
    return (
        "Monthly package: after verification, full library access runs for exactly one calendar month "
        "from the date you submitted this request."
    )


def premium_billing_active(user: User) -> bool:
    """True while the paid renewal period is in effect."""
    now = timezone.now()
    if user.subscription_period_end is None:
        return bool(user.subscribed)
    return now <= user.subscription_period_end


def library_entitlement_active(user: User) -> bool:
    """
    True while the user may use premium library features (active subscription window).
    Pending package purchases do not grant library access until the payment is verified.
    """
    now = timezone.now()
    if user.plan_benefits_end is not None:
        return now <= user.plan_benefits_end
    if user.subscription_period_end is not None:
        return now <= user.subscription_period_end
    # Legacy rows may only have subscribed=True without migrated end dates; do not infer access from plan alone.
    return bool(user.subscribed)


def renewal_recommended(user: User) -> bool:
    """Paid window lapsed but package benefits still active — prompt renew."""
    return (not premium_billing_active(user)) and library_entitlement_active(user)


def clear_subscription_entitlements(user: User) -> None:
    """Remove paid plan, dates, and library access (refund, admin revoke, or automated expiry cleanup)."""
    user.subscribed = False
    user.plan = User.Plan.FREE
    user.subscription_period_start = None
    user.subscription_period_end = None
    user.plan_benefits_end = None
    user.save(
        update_fields=[
            "subscribed",
            "plan",
            "subscription_period_start",
            "subscription_period_end",
            "plan_benefits_end",
        ]
    )


def user_has_pending_subscription_payment(user: User) -> bool:
    """True when a subscription checkout is still pending (blocks parallel purchases)."""
    return Transaction.objects.filter(
        user=user,
        status=Transaction.Status.PENDING,
        method=Transaction.Method.ESEWA,
    ).exists()


def subscription_checkout_allowed(user: User) -> tuple[bool, str | None]:
    """Whether the user may start a new subscription checkout (eSewa)."""
    refresh_user_entitlements(user)
    if user_has_pending_subscription_payment(user):
        return False, (
            "You already have a subscription payment awaiting completion or verification. "
            "Finish or cancel that checkout before starting another."
        )
    return True, None


def refresh_user_entitlements(user: User) -> bool:
    """
    Sync `subscribed` with the paid window and downgrade when benefits end.
    Returns True if the user row was saved.
    """
    now = timezone.now()
    changed = False

    if user.subscription_period_end is not None:
        should_sub = now <= user.subscription_period_end
        if user.subscribed != should_sub:
            user.subscribed = should_sub
            changed = True

    if user.plan_benefits_end is not None and now > user.plan_benefits_end:
        if (
            user.plan != User.Plan.FREE
            or user.subscribed
            or user.subscription_period_start
            or user.subscription_period_end
            or user.plan_benefits_end
        ):
            ended_at = user.plan_benefits_end
            if getattr(user, "last_notified_plan_benefits_end", None) != ended_at:
                from .subscription_notifications import notify_package_benefits_ended

                notify_package_benefits_ended(user, ended_at=ended_at)
                user.last_notified_plan_benefits_end = ended_at
            user.plan = User.Plan.FREE
            user.subscribed = False
            user.subscription_period_start = None
            user.subscription_period_end = None
            user.plan_benefits_end = None
            changed = True

    if changed:
        user.save(
            update_fields=[
                "subscribed",
                "plan",
                "subscription_period_start",
                "subscription_period_end",
                "plan_benefits_end",
                "last_notified_plan_benefits_end",
            ]
        )
    return changed


def apply_verified_transaction(txn: Transaction) -> None:
    """
    When a payment is verified: start from the request time unless that window already
    lapsed (then start from now), and stack renewals after an active period without
    shortening access.
    """
    user = txn.user
    now = timezone.now()
    request_at = txn.created_at
    if timezone.is_naive(request_at):
        request_at = timezone.make_aware(request_at, timezone.get_current_timezone())

    cycle = getattr(txn, "billing_cycle", None) or Transaction.BillingCycle.MONTHLY
    cur_end = user.subscription_period_end
    # If verification happens long after checkout was created, do not backdate
    # access into an already-expired window.
    effective_start = max(request_at, now)
    proposed_from_effective_start = add_subscription_calendar_end(effective_start, cycle)

    if cur_end and cur_end > now:
        segment_start = max(request_at, cur_end)
        new_end = add_subscription_calendar_end(segment_start, cycle)
        new_start = request_at
    else:
        new_end = proposed_from_effective_start
        new_start = effective_start

    user.subscription_period_start = new_start
    user.subscription_period_end = new_end
    user.plan_benefits_end = new_end
    user.subscribed = now <= new_end
    user.plan = txn.plan or User.Plan.PREMIUM
    user.last_notified_plan_benefits_end = None
    if user.status == User.Status.PENDING:
        user.status = User.Status.ACTIVE
    user.save(
        update_fields=[
            "subscribed",
            "plan",
            "status",
            "subscription_period_start",
            "subscription_period_end",
            "plan_benefits_end",
            "last_notified_plan_benefits_end",
        ]
    )


def apply_refunded_transaction(txn: Transaction) -> None:
    """When a verified payment is refunded: revoke subscription."""
    clear_subscription_entitlements(txn.user)


def revoke_user_subscription_entitlements(user: User) -> None:
    """Super Admin: immediately remove library access and paid plan."""
    clear_subscription_entitlements(user)


def _monthly_base_for_user(user: User) -> Decimal:
    app = AppSettings.load()
    try:
        prof = user.profile
        is_business = prof.user_type == UserProfile.UserType.BUSINESS
    except UserProfile.DoesNotExist:
        is_business = False
    raw = app.business_monthly_price if is_business else app.individual_monthly_price
    return Decimal(raw or 0)


def resolve_subscription_catalog_amount_for_user(*, user: User, billing_cycle: str) -> Decimal:
    """Catalog price before tax from app settings (individual vs business profile) and billing period."""
    monthly = _monthly_base_for_user(user)
    if monthly <= 0:
        raise LookupError("subscription_prices_not_configured")
    if billing_cycle == Transaction.BillingCycle.YEARLY:
        return (monthly * Decimal("12")).quantize(Decimal("0.01"))
    if billing_cycle == Transaction.BillingCycle.SIX_MONTH:
        return (monthly * Decimal("6")).quantize(Decimal("0.01"))
    return monthly.quantize(Decimal("0.01"))


def split_base_tax_total(*, base: Decimal, tax_rate_percent: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    rate = tax_rate_percent if tax_rate_percent is not None else Decimal("0")
    tax = (base * rate / Decimal("100")).quantize(Decimal("0.01"))
    total = (base + tax).quantize(Decimal("0.01"))
    return base, tax, total


def format_esewa_money(d: Decimal) -> str:
    return format(d.quantize(Decimal("0.01")), "f")


@db_transaction.atomic
def create_pending_subscription_txn(
    *,
    user: User,
    invoice: str,
    amount,
    currency: str,
    method: str,
    txn_code: str,
    plan: str,
    email: str | None = None,
    billing_cycle: str | None = None,
) -> Transaction:
    """Create a pending transaction for staff verification (e.g. wallet / bank proof)."""
    cycle = billing_cycle or Transaction.BillingCycle.MONTHLY
    tier = plan or User.Plan.PREMIUM
    return Transaction.objects.create(
        invoice=invoice,
        user=user,
        email=email or user.email,
        amount=amount,
        currency=currency,
        method=method,
        status=Transaction.Status.PENDING,
        txn_code=txn_code,
        plan=tier,
        billing_cycle=cycle,
    )


def next_invoice_number() -> str:
    suffix = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"INV-{suffix}"
