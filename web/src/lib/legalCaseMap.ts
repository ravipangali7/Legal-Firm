import type { Case } from "@/data/sampleCases";

/** Row from GET /api/legal-cases/ or detail (snake_case). */
export interface LegalCaseApi {
  id: string;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  share_image?: string;
  reference_number: string;
  date_filed: string;
  date_decided: string | null;
  court: string;
  category: string;
  category_slug?: string;
  practice_area: string;
  teaser: string;
  parties: string;
  summary: string;
  outcome: string;
  full_content?: Record<string, unknown> | null;
}

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function normalizeFullContent(raw: Record<string, unknown> | null | undefined): Case["fullContent"] {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    background: String(raw.background ?? ""),
    legalArguments: toStrArray(raw.legal_arguments ?? raw.legalArguments),
    judgment: String(raw.judgment ?? ""),
    analysis: String(raw.analysis ?? ""),
    implications: toStrArray(raw.implications),
    precedents: toStrArray(raw.precedents),
    strategicInsights: toStrArray(raw.strategic_insights ?? raw.strategicInsights),
  };
}

function extractKeyPoints(row: LegalCaseApi): string[] {
  const fc = row.full_content;
  if (fc && typeof fc === "object") {
    const kp = (fc as Record<string, unknown>).key_points ?? (fc as Record<string, unknown>).keyPoints;
    if (Array.isArray(kp)) return kp.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function mapLegalCaseApiToCase(row: LegalCaseApi): Case {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    referenceNumber: row.reference_number,
    dateFiled: row.date_filed,
    dateDecided: row.date_decided || undefined,
    court: row.court,
    category: row.category,
    practiceArea: row.practice_area,
    teaser: row.teaser,
    parties: row.parties,
    summary: row.summary,
    keyPoints: extractKeyPoints(row),
    outcome: row.outcome,
    fullContent: normalizeFullContent(row.full_content ?? undefined),
  };
}
