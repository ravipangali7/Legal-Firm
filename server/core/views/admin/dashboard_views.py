"""Admin dashboard aggregates (function-based views)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta, time as dt_time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Client, Project, Transaction, UserActivityLog
from core.rbac import require_admin_perm

User = get_user_model()


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard_summary(request):
    """Overview counters for admin home."""

    if err := require_admin_perm(request, "Dashboard", "view"):
        return err
    return Response(
        {
            "users_count": User.objects.count(),
            "transactions_count": Transaction.objects.count(),
            "projects_count": Project.objects.count(),
            "clients_count": Client.objects.count(),
            "pending_transactions": Transaction.objects.filter(status=Transaction.Status.PENDING).count(),
        }
    )


def _local_start_of_day(d: date) -> datetime:
    return timezone.make_aware(datetime.combine(d, dt_time.min))


def _bucket_ranges(period: str) -> list[tuple[str, datetime, datetime]]:
    """Return (label, start inclusive, end exclusive) in the active timezone, oldest first."""
    today = timezone.localdate()
    out: list[tuple[str, datetime, datetime]] = []

    if period == "daily":
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            label = d.strftime("%a")
            start = _local_start_of_day(d)
            out.append((label, start, start + timedelta(days=1)))

    elif period == "weekly":
        monday = today - timedelta(days=today.weekday())
        for w in range(3, -1, -1):
            start_d = monday - timedelta(weeks=w)
            end_d = start_d + timedelta(weeks=1)
            label = f"Week of {start_d.strftime('%b %d')}"
            start = _local_start_of_day(start_d)
            end = _local_start_of_day(end_d)
            out.append((label, start, end))

    elif period == "annual":
        y0 = today.year - 4
        for yr in range(y0, today.year + 1):
            start = _local_start_of_day(date(yr, 1, 1))
            end = _local_start_of_day(date(yr + 1, 1, 1))
            out.append((str(yr), start, end))

    else:  # monthly (default)
        y, m = today.year, today.month
        for offset in range(11, -1, -1):
            yy, mm = y, m
            for _ in range(offset):
                if mm == 1:
                    yy -= 1
                    mm = 12
                else:
                    mm -= 1
            start_d = date(yy, mm, 1)
            _, last = monthrange(yy, mm)
            end_d = date(yy, mm, last) + timedelta(days=1)
            label = start_d.strftime("%b %y")
            out.append((label, _local_start_of_day(start_d), _local_start_of_day(end_d)))

    return out


def _window_metrics(start: datetime, end: datetime) -> dict[str, int | Decimal]:
    """Aggregate metrics for KPI comparison windows."""
    visitors = User.objects.filter(last_login_at__gte=start, last_login_at__lt=end).count()
    page_views = UserActivityLog.objects.filter(created_at__gte=start, created_at__lt=end).count()
    rev = (
        Transaction.objects.filter(
            status=Transaction.Status.VERIFIED,
            created_at__gte=start,
            created_at__lt=end,
        ).aggregate(s=Sum("amount"))
        .get("s")
    ) or Decimal("0")
    signups = User.objects.filter(created_at__gte=start, created_at__lt=end).count()
    new_clients = Client.objects.filter(joined_at__gte=start.date(), joined_at__lt=end.date()).count()
    return {
        "visitors": visitors,
        "page_views": page_views,
        "revenue": rev,
        "signups": signups,
        "new_clients": new_clients,
    }


def _pct_change(current: float, previous: float) -> tuple[float, bool]:
    if previous <= 0:
        return (100.0 if current > 0 else 0.0, current >= previous)
    delta = (current - previous) / previous * 100.0
    return (round(delta, 1), delta >= 0)


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard_analytics(request):
    """Time-series and breakdowns for Admin → Analytics (DB-backed)."""

    if err := require_admin_perm(request, "Analytics", "view"):
        return err

    period = (request.query_params.get("period") or "monthly").lower()
    if period not in {"daily", "weekly", "monthly", "annual"}:
        period = "monthly"

    buckets = _bucket_ranges(period)
    series: list[dict[str, object]] = []
    for label, start, end in buckets:
        m = _window_metrics(start, end)
        series.append(
            {
                "name": label,
                "visitors": m["visitors"],
                "pageViews": m["page_views"],
                "revenue": float(m["revenue"]),
                "signups": m["signups"],
            }
        )

    first_start = buckets[0][1]
    last_end = buckets[-1][2]
    window_span = last_end - first_start
    prev_end = first_start
    prev_start = prev_end - window_span
    cur_win = _window_metrics(first_start, last_end)
    prev_win = _window_metrics(prev_start, prev_end)

    total_users = User.objects.count()
    users_at_chart_start = User.objects.filter(created_at__lt=first_start).count()
    pct_users, up_users = _pct_change(float(total_users), float(max(users_at_chart_start, 1)))

    total_clients = Client.objects.count()
    nc_pct, up_nc = _pct_change(float(cur_win["new_clients"]), float(prev_win["new_clients"]))

    v_pct, v_up = _pct_change(float(cur_win["visitors"]), float(prev_win["visitors"]))
    r_pct, r_up = _pct_change(float(cur_win["revenue"]), float(prev_win["revenue"]))

    users_by_role = [
        {"name": row["role__key"].replace("_", " ").title(), "value": row["n"]}
        for row in User.objects.values("role__key").annotate(n=Count("id")).order_by("-n")
    ]

    return Response(
        {
            "period": period,
            "series": series,
            "users_by_role": users_by_role,
            "kpis": [
                {
                    "key": "visitors",
                    "label": "Returning visits",
                    "hint": "Users with a login in each period",
                    "value": f"{int(cur_win['visitors']):,}",
                    "change_percent": v_pct,
                    "up": v_up,
                },
                {
                    "key": "users",
                    "label": "Total users",
                    "hint": "All registered accounts",
                    "value": f"{total_users:,}",
                    "change_percent": pct_users,
                    "up": up_users,
                },
                {
                    "key": "revenue",
                    "label": "Revenue (NPR)",
                    "hint": "Verified payments in this range",
                    "value": f"{int(cur_win['revenue']):,}",
                    "change_percent": r_pct,
                    "up": r_up,
                },
                {
                    "key": "clients",
                    "label": "Client accounts",
                    "hint": "Total clients on file; change compares new clients in this range vs the prior range",
                    "value": f"{total_clients:,}",
                    "change_percent": nc_pct,
                    "up": up_nc,
                },
            ],
        }
    )
