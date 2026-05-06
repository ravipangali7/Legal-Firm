"""JSON for `GET /api/public/professionals/` (hero copy + computed stats)."""

from __future__ import annotations

from .homepage_payload import team_member_public_dict
from .models import ProfessionalsPageConfig, ServiceItem, TeamMember


def build_professionals_page_payload() -> dict:
    cfg = ProfessionalsPageConfig.load()
    enabled_team = TeamMember.objects.filter(enabled=True)
    n = enabled_team.count()
    years_sum = sum(int(m.years_experience or 0) for m in enabled_team.iterator())
    services_n = ServiceItem.objects.filter(enabled=True).count()

    def fmt_count(count: int) -> str:
        return str(count) if count > 0 else "—"

    def fmt_years() -> str:
        # Show a numeric value whenever there is a roster (0 means not entered in admin yet).
        if years_sum > 0:
            return f"{years_sum}+"
        if n > 0:
            return "0"
        return "—"

    stat_professionals_label = cfg.stat_professionals_label or "Professionals"
    stat_experience_label = cfg.stat_experience_label or "Years combined experience"
    stat_practice_label = cfg.stat_practice_label or "Practice areas"

    stats = [
        {"icon": "users", "label": stat_professionals_label, "value": fmt_count(n)},
        {"icon": "award", "label": stat_experience_label, "value": fmt_years()},
        {"icon": "book_open", "label": stat_practice_label, "value": fmt_count(services_n)},
    ]

    team = [
        team_member_public_dict(tm)
        for tm in TeamMember.objects.filter(enabled=True).order_by("order", "name")
    ]

    return {
        "title": cfg.hero_title or "Our Professionals",
        "subtitle": cfg.hero_subtitle or "",
        "stats": stats,
        "team": team,
    }
