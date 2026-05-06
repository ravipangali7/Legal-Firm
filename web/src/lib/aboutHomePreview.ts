import { looksLikeHtml } from '@/lib/summaryHtml';

/** Strip tags for length / paragraph heuristics only (not for security). */
function stripTagsApprox(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countClosingPTags(html: string): number {
  return (html.toLowerCase().match(/<\/p>/g) || []).length;
}

/**
 * Whether the homepage About block should truncate with "See more" → /about.
 */
export function isAboutBodyLongForHomePreview(body: string): boolean {
  const raw = (body ?? '').trim();
  if (!raw) return false;
  const text = stripTagsApprox(raw);
  if (text.length > 360) return true;
  if (looksLikeHtml(raw) && countClosingPTags(raw) >= 4) return true;
  if (!looksLikeHtml(raw) && raw.split(/\n\s*\n/).filter(Boolean).length >= 4) return true;
  return false;
}
