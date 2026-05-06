import type { ProfessionalsPageApi, ProfessionalsPageStatApi } from '@/lib/api';
import { mapTeamFromApi } from '@/lib/homepageMap';
import type { TeamMember } from '@/store/cmsStore';

/** When API includes `team`, derive combined years from those rows so the hero matches the cards. */
export function resolveProfessionalsHeroStats(
  page: ProfessionalsPageApi | undefined,
): ProfessionalsPageStatApi[] {
  const stats = [...(page?.stats ?? [])];
  const team = page?.team;
  if (!team?.length) return stats;

  const combinedYears = team
    .filter((m) => m.enabled !== false)
    .reduce((sum, m) => {
      const raw = m.years_experience;
      const y =
        typeof raw === 'number' && !Number.isNaN(raw)
          ? raw
          : Math.floor(Number(raw)) || 0;
      return sum + Math.max(0, Math.min(32767, y));
    }, 0);

  return stats.map((s) => {
    if (s.icon !== 'award') return s;
    const value = combinedYears > 0 ? `${combinedYears}+` : '0';
    return { ...s, value };
  });
}

/** Prefer live roster from `/api/public/professionals/`; fall back to homepage CMS snapshot. */
export function resolveProfessionalsTeam(
  page: ProfessionalsPageApi | undefined,
  cmsTeam: TeamMember[],
): TeamMember[] {
  const rows = page?.team;
  if (rows && rows.length > 0) {
    return [...mapTeamFromApi(rows)].filter((m) => m.enabled).sort((a, b) => a.order - b.order);
  }
  return [...cmsTeam].filter((m) => m.enabled).sort((a, b) => a.order - b.order);
}
