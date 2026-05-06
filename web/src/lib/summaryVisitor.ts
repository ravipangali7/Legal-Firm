const STORAGE_KEY = 'lf_summary_visitor_id';

/** Stable anonymous id for summary views/votes (sent as X-Visitor-Id). */
export function getOrCreateSummaryVisitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const t = existing.trim();
      if (t.length >= 32 && t.length <= 64) {
        return t.slice(0, 64);
      }
    }
    const v = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, v);
    return v;
  } catch {
    return crypto.randomUUID();
  }
}
