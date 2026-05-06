import { fetchPublicLegalCases, fetchPublicPracticeAreas } from "@/lib/api";
import { mapLegalCaseApiToCase } from "@/lib/legalCaseMap";

export const practiceAreasQueryKey = ["practice-areas"] as const;

export function legalCasesForPracticeAreaQueryKey(areaSlug: string) {
  return ["legal-cases", { practice_area: areaSlug }] as const;
}

export async function loadPracticeAreas() {
  return fetchPublicPracticeAreas();
}

export async function loadLegalCasesForPracticeArea(areaSlug: string) {
  const rows = await fetchPublicLegalCases(areaSlug);
  return rows.map(mapLegalCaseApiToCase);
}
