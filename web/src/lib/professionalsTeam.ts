import type { ProfessionalsPageApi } from '@/lib/api';
import { mapTeamFromApi } from '@/lib/homepageMap';
import type { TeamMember } from '@/store/cmsStore';

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
