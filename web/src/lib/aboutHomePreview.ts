import { looksLikeHtml } from '@/lib/summaryHtml';

/** Strip tags for length / paragraph heuristics only (not for security). */
function stripTagsApprox(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countBlockParagraphs(html: string): number {
  const lower = html.toLowerCase();
  const p = (lower.match(/<\/p>/g) || []).length;
  const brBlocks = (lower.match(/<br\s*\/?>/gi) || []).length;
  return Math.max(p, brBlocks > 3 ? Math.ceil(brBlocks / 2) : p);
}

/**
 * Whether the homepage About block should truncate with "See more" → /about.
 */
export function isAboutBodyLongForHomePreview(body: string): boolean {
  const raw = (body ?? '').trim();
  if (!raw) return false;
  const text = stripTagsApprox(raw);
  if (text.length > 360) return true;
  if (looksLikeHtml(raw) && countBlockParagraphs(raw) >= 4) return true;
  if (!looksLikeHtml(raw) && raw.split(/\n\s*\n/).filter(Boolean).length >= 4) return true;
  return false;
}
