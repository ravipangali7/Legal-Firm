import { apiUrl } from '@/lib/api';

export type SocialShareKind =
  | 'blog'
  | 'summary'
  | 'notice'
  | 'act'
  | 'procedure'
  | 'legal-case'
  | 'news'
  | 'event'
  | 'professional';

/** Social crawler URL (MOD_SHARE) — returns HTML with OG tags including site default OG image. */
export function socialShareApiUrl(kind: SocialShareKind, idOrSlug: string): string {
  const enc = encodeURIComponent(idOrSlug);
  switch (kind) {
    case 'blog':
      return apiUrl(`/api/blog-posts/${enc}/share/`);
    case 'summary':
      return apiUrl(`/api/summaries/${enc}/share/`);
    case 'notice':
      return apiUrl(`/api/notices/${enc}/share/`);
    case 'act':
      return apiUrl(`/api/acts/${enc}/share/`);
    case 'procedure':
      return apiUrl(`/api/procedures/${enc}/share/`);
    case 'legal-case':
      return apiUrl(`/api/legal-cases/${enc}/share/`);
    case 'news':
      return apiUrl(`/api/news-items/${enc}/share/`);
    case 'event':
      return apiUrl(`/api/events/${enc}/share/`);
    case 'professional':
      return apiUrl(`/api/professionals/${enc}/share/`);
    default:
      return apiUrl(`/api/public/share-preview/?path=${enc}`);
  }
}

/** Canonical SPA URL for copy-link and in-app navigation. */
export function spaCanonicalUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}${p}`;
  }
  return p;
}

export function facebookShareUrl(shareUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}

export function linkedInShareUrl(shareUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
