/** Escape text for safe insertion into HTML when body is plain text. */
export function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** ASCII slug for fragment ids; non-Latin titles fall back to `section-{index}`. */
function slugifyAscii(text: string, index: number): string {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '');
  return t || `section-${index + 1}`;
}

/** Remove risky tags and ensure every heading has a stable id for TOC / anchors. */
export function sanitizeAndHeadingIds(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta').forEach((el) => el.remove());
  const used = new Set<string>();
  doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, idx) => {
    const existing = (el.id || '').trim();
    if (existing && !used.has(existing)) {
      used.add(existing);
      return;
    }
    const base = slugifyAscii(el.textContent || '', idx);
    let next = base;
    let n = 2;
    while (used.has(next)) {
      next = `${base}-${n}`;
      n += 1;
    }
    el.id = next;
    used.add(next);
  });
  return doc.body.innerHTML;
}

/** Heuristic: treat as HTML when it looks like markup. */
export function looksLikeHtml(raw: string): boolean {
  return /<[a-z][\s\S]*>/i.test(raw.trim());
}

/** Decode `&lt;p&gt;...` style bodies saved from rich text / double-escaped CMS (browser only). */
export function decodeHtmlEntitiesBrowser(s: string): string {
  if (typeof document === 'undefined') return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

/**
 * When markup was entity-encoded for storage, decode once so `HtmlPreview` can render real HTML.
 */
export function unwrapEntityEncodedHtmlIfNeeded(raw: string): string {
  const t = (raw ?? '').trim();
  if (!t || looksLikeHtml(t)) return raw ?? '';
  if (typeof document === 'undefined') return raw ?? '';
  if (!t.includes('&lt;')) return raw ?? '';
  const decoded = decodeHtmlEntitiesBrowser(t).trim();
  if (decoded !== t && looksLikeHtml(decoded)) return decoded;
  return raw ?? '';
}

/**
 * Normalize editor/API body to HTML: plain text becomes paragraphs;
 * HTML is sanitized and given heading ids.
 */
export function formatSummaryBodyHtml(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return '<p class="text-muted-foreground italic">No detailed content is available for this summary yet.</p>';
  }
  if (looksLikeHtml(t)) {
    return sanitizeAndHeadingIds(t);
  }
  const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const inner = paras.length
    ? paras.map((p) => `<p>${escapeHtmlText(p)}</p>`).join('')
    : `<p>${escapeHtmlText(t)}</p>`;
  return sanitizeAndHeadingIds(inner);
}

export function extractTocFromFormattedHtml(html: string): { id: string; label: string }[] {
  if (!html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items: { id: string; label: string }[] = [];
  doc.querySelectorAll('h2[id], h3[id]').forEach((el) => {
    const id = el.id;
    if (!id) return;
    const label = el.textContent?.trim() || id;
    items.push({ id, label });
  });
  return items;
}
