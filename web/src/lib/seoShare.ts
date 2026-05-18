import { apiUrl } from '@/lib/api';

/** Social share URL (MOD_SHARE) — crawlers fetch server HTML with OG tags. */
export function blogPostShareUrl(postId: string): string {
  return apiUrl(`/api/blog-posts/${encodeURIComponent(postId)}/share/`);
}

export function summaryShareUrl(slug: string): string {
  return apiUrl(`/api/summaries/${encodeURIComponent(slug)}/share/`);
}

export function noticeShareUrl(slug: string): string {
  return apiUrl(`/api/notices/${encodeURIComponent(slug)}/share/`);
}

export function actShareUrl(slug: string): string {
  return apiUrl(`/api/acts/${encodeURIComponent(slug)}/share/`);
}

/** User-facing canonical SPA URL for copy-link. */
export function spaCanonicalUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}${p}`;
  }
  return p;
}
