import type { ProfessionalsPageStatApi } from '@/lib/api';
import type { TeamMember } from '@/store/cmsStore';

export function sumEnabledTeamExperienceYears(team: TeamMember[]): number {
  return team
    .filter((m) => m.enabled)
    .reduce(
      (sum, m) => sum + (typeof m.experienceYears === 'number' ? Math.max(0, m.experienceYears) : 0),
      0,
    );
}

/** Match public `/professionals` hero: live-combined years for the experience stat row. */
export function heroStatsWithLiveExperience(
  raw: ProfessionalsPageStatApi[] | undefined,
  team: TeamMember[],
): ProfessionalsPageStatApi[] {
  const rows = raw ?? [];
  const combined = sumEnabledTeamExperienceYears(team);
  return rows.map((s) => {
    const isCombinedYears =
      s.icon === 'award' ||
      /combined\s+experience|years\s+.*experience|experience\s+year/i.test(s.label || '');
    if (!isCombinedYears) return s;
    const value = combined > 0 ? `${combined}+` : '—';
    return { ...s, value };
  });
}
