"""eSewa ePay v2: initiate (auth), success/failure callbacks (browser redirect)."""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction as db_transaction
from django.http import HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.esewa_service import (
    ESEWA_UAT_EPAY_FORM_URL,
    amounts_close,
    decode_esewa_callback_data,
    epay_transaction_status,
    sign_epay_request,
    uat_product_code_and_secret,
    verify_epay_response_signature,
)
from core.models import AppSettings, Transaction, User
from core.rbac import subscriber_portal_hub_prefix
from core.serializers import EsewaInitiateSerializer
from core.subscription_service import (
    clear_esewa_subscription_checkout_session,
    create_pending_subscription_txn,
    format_esewa_money,
    get_esewa_subscription_checkout_session,
    next_invoice_number,
    put_esewa_subscription_checkout_session,
    resolve_subscription_catalog_amount_for_user,
    split_base_tax_total,
    subscription_checkout_allowed,
)

_LOG = logging.getLogger(__name__)


def _frontend_base() -> str:
    return (getattr(settings, "PUBLIC_APP_BASE_URL", None) or "http://localhost:5173").rstrip("/")


def _txn_uuid_from_payload(payload: dict) -> str | None:
    u = payload.get("transaction_uuid") or payload.get("transactionuuid")
    if u is None:
        return None
    s = str(u).strip()
    return s or None


def _total_from_payload(payload: dict) -> Decimal | None:
    raw = payload.get("total_amount")
    if raw is None:
        raw = payload.get("totalamount")
    if raw is None:
        return None
    try:
        s = str(raw).strip().replace(",", "")
        return Decimal(s).quantize(Decimal("0.01"))
    except Exception:
        return None


def _product_code_from_payload(payload: dict) -> str | None:
    c = payload.get("product_code") or payload.get("productcode")
    if c is None:
        return None
    s = str(c).strip()
    return s or None


def _status_from_payload(payload: dict) -> str:
    s = payload.get("status")
    return (str(s).strip().upper() if s is not None else "")


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def esewa_payment_initiate(request):
    """Create a pending transaction and return signed form fields for POST to eSewa."""
    ser = EsewaInitiateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    app = AppSettings.load()
    if not app.payments_enabled:
        return Response(
            {"detail": "Online payments are disabled for this site."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not app.esewa_enabled:
        return Response({"detail": "eSewa is not enabled for this site."}, status=status.HTTP_400_BAD_REQUEST)

    product_code, secret = uat_product_code_and_secret()

    billing_cycle = ser.validated_data.get("billing_cycle") or "monthly"
    ok_checkout, deny_reason = subscription_checkout_allowed(request.user)
    if not ok_checkout:
        return Response({"detail": deny_reason}, status=status.HTTP_403_FORBIDDEN)

    try:
        base = resolve_subscription_catalog_amount_for_user(user=request.user, billing_cycle=billing_cycle)
    except LookupError:
        return Response(
            {
                "detail": "Subscription prices are not configured. Ask an admin to set individual and business "
                "monthly prices under Settings → General."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    tax_rate = Decimal(app.tax_rate or "0")
    base_amt, tax_amt, total_amt = split_base_tax_total(base=base, tax_rate_percent=tax_rate)

    transaction_uuid = str(uuid.uuid4())
    total_str = format_esewa_money(total_amt)
    signature = sign_epay_request(
        total_amount=total_str,
        transaction_uuid=transaction_uuid,
        product_code=product_code,
        secret_key=secret,
    )

    # eSewa redirects the customer’s browser here first (SPA); those pages forward `?data=` to Django for verification.
    front = _frontend_base()
    success_path = f"{front}/payment/esewa/success"
    failure_path = f"{front}/payment/esewa/failure"

    put_esewa_subscription_checkout_session(
        transaction_uuid=transaction_uuid,
        user=request.user,
        amount=total_amt,
        currency=app.currency or "NPR",
        billing_cycle=billing_cycle,
        plan=User.Plan.PREMIUM,
        email=request.user.email or "",
    )

    # ePay v2 form POST: official parameter names use snake_case (see esewa_integration.md / developer.esewa.com.np Epay-V2).
    fields = {
        "amount": format_esewa_money(base_amt),
        "tax_amount": format_esewa_money(tax_amt),
        "total_amount": total_str,
        "transaction_uuid": transaction_uuid,
        "product_code": product_code,
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": success_path,
        "failure_url": failure_path,
        "signed_field_names": "total_amount,transaction_uuid,product_code",
        "signature": signature,
    }

    return Response(
        {
            "action": ESEWA_UAT_EPAY_FORM_URL,
            "method": "POST",
            "fields": fields,
            "transaction_id": transaction_uuid,
            "invoice": None,
            "test_mode": True,
        },
        status=status.HTTP_201_CREATED,
    )


def _verify_esewa_complete_payment(
    *,
    txn_uuid: str,
    expected_amount: Decimal,
    payload: dict | None,
) -> bool:
    """True when signed callback (if valid) and eSewa status API agree on COMPLETE and amounts."""
    if not payload:
        return False

    product_code, secret = uat_product_code_and_secret()
    payload_uuid = _txn_uuid_from_payload(payload)
    if not payload_uuid or payload_uuid != txn_uuid.strip():
        _LOG.warning("eSewa success: transaction_uuid mismatch (expected %s)", txn_uuid)
        return False

    sig_ok = verify_epay_response_signature(payload, secret_key=secret)
    if not sig_ok:
        _LOG.warning("eSewa success: callback signature did not verify (will rely on status API)")

    status_json = epay_transaction_status(
        product_code=product_code,
        total_amount=format_esewa_money(expected_amount),
        transaction_uuid=txn_uuid.strip(),
    )
    api_status = (status_json.get("status") or "").strip().upper() if status_json else ""
    api_total_raw = None
    if status_json:
        api_total_raw = status_json.get("totalamount") if "totalamount" in status_json else status_json.get("total_amount")
    api_amount_ok = False
    if api_total_raw is not None:
        try:
            api_dec = Decimal(str(api_total_raw).replace(",", "")).quantize(Decimal("0.01"))
            api_amount_ok = amounts_close(api_dec, expected_amount)
        except Exception:
            api_amount_ok = False
    api_ok = bool(status_json and api_status == "COMPLETE" and api_amount_ok)

    if sig_ok:
        if _status_from_payload(payload) != "COMPLETE":
            _LOG.warning("eSewa success: callback status not COMPLETE")
            return False
        pcode = _product_code_from_payload(payload)
        if not pcode or pcode != product_code:
            _LOG.warning("eSewa success: product_code mismatch")
            return False
        total_remote = _total_from_payload(payload)
        if total_remote is None or not amounts_close(total_remote, expected_amount):
            _LOG.warning("eSewa success: total_amount mismatch")
            return False
        if not api_ok:
            _LOG.warning("eSewa success: status API did not confirm COMPLETE")
            return False
    else:
        if not api_ok:
            _LOG.warning("eSewa success: neither signature nor status API verified payment")
            return False

    return True


def _finalize_if_complete(*, txn: Transaction, payload: dict | None) -> bool:
    """
    If callback and/or eSewa status API confirm COMPLETE with matching amounts, mark txn verified.
    Returns True when verified.
    """
    if txn.status != Transaction.Status.PENDING or txn.method != Transaction.Method.ESEWA:
        return txn.status == Transaction.Status.VERIFIED

    if not _verify_esewa_complete_payment(
        txn_uuid=txn.txn_code.strip(),
        expected_amount=Decimal(txn.amount),
        payload=payload,
    ):
        return False

    with db_transaction.atomic():
        locked = Transaction.objects.select_for_update().get(pk=txn.pk)
        if locked.status != Transaction.Status.PENDING:
            return locked.status == Transaction.Status.VERIFIED
        locked.status = Transaction.Status.VERIFIED
        locked.save(update_fields=["status"])

    return True


def _finalize_from_checkout_session(*, txn_uuid: str, payload: dict | None, session: dict) -> Transaction | None:
    """
    First successful eSewa return for a wallet checkout: create a verified Transaction and clear the cache session.
    Returns the transaction when created or already verified for this uuid; None when verification fails.
    """
    try:
        expected_amount = Decimal(str(session["amount"]).replace(",", "")).quantize(Decimal("0.01"))
    except Exception:
        _LOG.warning("eSewa success: bad amount in checkout session for uuid %s", txn_uuid)
        return None

    if not _verify_esewa_complete_payment(
        txn_uuid=txn_uuid.strip(),
        expected_amount=expected_amount,
        payload=payload,
    ):
        return None

    user_id = session.get("user_id")
    if not user_id:
        return None

    with db_transaction.atomic():
        try:
            user = User.objects.select_for_update().get(pk=user_id)
        except User.DoesNotExist:
            _LOG.warning("eSewa success: checkout session user missing for uuid %s", txn_uuid)
            clear_esewa_subscription_checkout_session(transaction_uuid=txn_uuid.strip(), user_id=user_id)
            return None

        existing = (
            Transaction.objects.select_for_update()
            .filter(txn_code__iexact=txn_uuid.strip(), method=Transaction.Method.ESEWA)
            .first()
        )
        if existing:
            if existing.status == Transaction.Status.VERIFIED:
                clear_esewa_subscription_checkout_session(transaction_uuid=txn_uuid.strip(), user_id=user_id)
                return existing
            if existing.status == Transaction.Status.PENDING:
                clear_esewa_subscription_checkout_session(transaction_uuid=txn_uuid.strip(), user_id=user_id)
                existing.status = Transaction.Status.VERIFIED
                existing.save(update_fields=["status"])
                return existing
            return None

        txn = create_pending_subscription_txn(
            user=user,
            invoice=next_invoice_number(),
            amount=expected_amount,
            currency=session.get("currency") or "NPR",
            method=Transaction.Method.ESEWA,
            txn_code=txn_uuid.strip(),
            plan=session.get("plan") or User.Plan.PREMIUM,
            email=session.get("email") or user.email,
            billing_cycle=session.get("billing_cycle"),
            status=Transaction.Status.VERIFIED,
        )
        clear_esewa_subscription_checkout_session(transaction_uuid=txn_uuid.strip(), user_id=user_id)
        return txn


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def esewa_payment_success(request):
    """Browser redirect from eSewa after success; verifies payment and redirects to SPA wallet."""
    raw_b64 = (request.GET.get("data") or request.POST.get("data") or "").strip()
    payload = decode_esewa_callback_data(raw_b64) if raw_b64 else None

    front = _frontend_base()
    if not payload:
        return HttpResponseRedirect(f"{front}/dashboard?tab=wallet&esewa=invalid")

    txn_uuid = _txn_uuid_from_payload(payload)
    if not txn_uuid:
        return HttpResponseRedirect(f"{front}/dashboard?tab=wallet&esewa=invalid")

    txn_uuid_norm = txn_uuid.strip()
    txn = (
        Transaction.objects.select_related("user")
        .filter(txn_code__iexact=txn_uuid_norm, method=Transaction.Method.ESEWA)
        .first()
    )

    if txn:
        ok = _finalize_if_complete(txn=txn, payload=payload)
        hub = subscriber_portal_hub_prefix(txn.user)
        if ok:
            return HttpResponseRedirect(f"{front}{hub}?tab=wallet&esewa=success&invoice={txn.invoice}")
        return HttpResponseRedirect(f"{front}{hub}?tab=wallet&esewa=unverified")

    session = get_esewa_subscription_checkout_session(txn_uuid_norm)
    if session:
        done = _finalize_from_checkout_session(txn_uuid=txn_uuid_norm, payload=payload, session=session)
        if done:
            hub = subscriber_portal_hub_prefix(done.user)
            return HttpResponseRedirect(f"{front}{hub}?tab=wallet&esewa=success&invoice={done.invoice}")
        try:
            u = User.objects.get(pk=session["user_id"])
            hub = subscriber_portal_hub_prefix(u)
        except (User.DoesNotExist, KeyError, ValueError):
            hub = "/dashboard"
        return HttpResponseRedirect(f"{front}{hub}?tab=wallet&esewa=unverified")

    _LOG.warning("eSewa success: no transaction or checkout session for uuid %s", txn_uuid)
    return HttpResponseRedirect(f"{front}/dashboard?tab=wallet&esewa=unknown")


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def esewa_payment_failure(request):
    front = _frontend_base()
    return HttpResponseRedirect(f"{front}/dashboard?tab=wallet&esewa=cancelled")
