/**
 * Canonical authenticated-app roots. Kept in one place so frontend matches Django
 * `post_auth_app_home_path` (no scattered string literals).
 */
export const SPA_HUB_PATHS = ['/admin', '/client', '/dashboard', '/account'] as const;

export type SpaHubPath = (typeof SPA_HUB_PATHS)[number];

const HUB_SET = new Set<string>(SPA_HUB_PATHS);

/**
 * Normalize `app_home_path` from `/api/auth/me/` (or login body): trim, optional
 * absolute URL → pathname, strip trailing slashes, allow only known hubs.
 */
export function normalizeSpaHomePath(raw: string | null | undefined): SpaHubPath | null {
  if (raw == null) return null;
  let p = String(raw).trim();
  if (!p) return null;
  if (p.includes('://')) {
    try {
      p = new URL(p).pathname;
    } catch {
      return null;
    }
  }
  if (!p.startsWith('/')) p = `/${p}`;
  const noTrail = p.replace(/\/+$/, '');
  p = noTrail.length ? noTrail : '/';
  if (!HUB_SET.has(p)) return null;
  return p as SpaHubPath;
}
