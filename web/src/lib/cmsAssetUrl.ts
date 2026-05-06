import { BACKEND_BASE_URL } from '@/lib/constants';

const trimSlash = (u: string) => u.replace(/\/$/, '');

/** API origin for resolving Django `/media/...` (and similar) on a different host than the SPA. */
function mediaBaseOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv) return trimSlash(fromEnv);
  if (import.meta.env.DEV) return '';
  return trimSlash(BACKEND_BASE_URL);
}

/**
 * Resolve CMS image URLs for the SPA (port 8080): absolute URLs and data URLs pass through;
 * root-relative paths (e.g. Django `/media/...`) are prefixed with `VITE_API_URL`, or in
 * production builds without that env, `BACKEND_BASE_URL`.
 */
export function cmsMediaSrc(src: string): string {
  let s = (src || '').trim();
  // Legacy Django `MEDIA_URL = 'media/'` produced path-relative URLs; normalize for nested routes.
  if (s.startsWith('media/')) {
    s = `/${s}`;
  }
  if (!s || s.startsWith('data:')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) {
    const base = mediaBaseOrigin();
    if (base) return `${base}${s}`;
    if (import.meta.env.DEV && s.startsWith('/media/')) {
      return s;
    }
    if (import.meta.env.DEV) return `http://127.0.0.1:8000${s}`;
    return s;
  }
  return s;
}

/** Allow only http(s) or mailto: for CMS-authored links (opens in new tab where applicable). */
export function safeCmsExternalHref(raw: string, mode: 'url' | 'email'): string | null {
  const u = (raw || '').trim();
  if (!u) return null;
  if (mode === 'email') {
    if (u.startsWith('mailto:')) {
      try {
        const path = u.slice('mailto:'.length).split('?')[0];
        if (path.includes('@')) return u;
      } catch {
        return null;
      }
      return null;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return `mailto:${u}`;
    return null;
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch {
    return null;
  }
  return null;
}
