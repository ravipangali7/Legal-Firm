import { cmsMediaSrc } from '@/lib/cmsAssetUrl';

const DEFAULT_SITE_NAME = 'TaxLexis Legal';

/** Site origin for canonical and OG URLs (no trailing slash). */
export function siteOrigin(canonicalUrl?: string | null): string {
  const fromSettings = (canonicalUrl || '').trim().replace(/\/$/, '');
  if (fromSettings) return fromSettings;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export function absoluteUrl(path: string, origin: string): string {
  const o = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return o ? `${o}${p}` : p;
}

export function buildPageTitle(title: string | undefined, siteName: string): string {
  const t = (title || '').trim();
  const site = (siteName || DEFAULT_SITE_NAME).trim() || DEFAULT_SITE_NAME;
  if (!t) return site;
  if (t.toLowerCase() === site.toLowerCase()) return t;
  return `${t} | ${site}`;
}

/** Strip tags and collapse whitespace for meta descriptions. */
export function metaDescription(raw: string | undefined, maxLen = 160): string {
  const text = (raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function resolveOgImage(
  pageImage: string | undefined,
  siteOgImage: string | undefined,
  origin: string
): string {
  const raw = (pageImage || siteOgImage || '').trim();
  if (!raw) return '';
  const resolved = cmsMediaSrc(raw);
  if (/^https?:\/\//i.test(resolved)) return resolved;
  if (resolved.startsWith('/') && origin) return absoluteUrl(resolved, origin);
  return resolved;
}

export function parseKeywords(raw: string | undefined): string[] {
  return (raw || '')
    .split(/[,;]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export type OgType = 'website' | 'article' | 'profile';

export interface PageSeoInput {
  title?: string;
  description?: string;
  keywords?: string | string[];
  image?: string;
  /** Pathname only, e.g. `/blog/abc` — used for canonical and og:url */
  pathname?: string;
  type?: OgType;
  noindex?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
