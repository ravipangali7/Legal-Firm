/**
 * Client meta pipeline (SEO guide Part F).
 * Site defaults are configured from public settings; tags are applied via `SiteSeoHead` (Helmet).
 */

export type OgType = 'website' | 'article' | 'product' | 'profile';

export type MetaInput = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  robots?: string;
  ogType?: OgType;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

let siteDefaults: {
  siteName: string;
  siteMetaDescription: string;
  defaultOgImage: string;
} = {
  siteName: 'TaxLexis Legal',
  siteMetaDescription: '',
  defaultOgImage: '',
};

/** Call once when public settings load (Part D.1). */
export function configureSiteSeo(input: {
  siteName?: string;
  siteMetaDescription?: string;
  defaultOgImage?: string;
}): void {
  siteDefaults = {
    siteName: (input.siteName || siteDefaults.siteName).trim() || 'TaxLexis Legal',
    siteMetaDescription: (input.siteMetaDescription || '').trim(),
    defaultOgImage: (input.defaultOgImage || '').trim(),
  };
}

export function getSiteSeoDefaults() {
  return siteDefaults;
}

export function buildCanonicalUrl(path: string, origin?: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const o = (origin || '').replace(/\/$/, '');
  if (o) return `${o}${p}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}${p}`;
  }
  return p;
}

/** Resolve relative paths to absolute URLs for JSON-LD and OG (Part F.4). */
export function toAbsoluteUrl(pathOrUrl: string, origin?: string): string {
  const t = (pathOrUrl || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return buildCanonicalUrl(t.startsWith('/') ? t : `/${t}`, origin);
}
