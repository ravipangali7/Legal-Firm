/**
 * Absolute origin for a separate admin SPA, if you deliberately host it elsewhere.
 * When unset or empty (default): staff admin stays on this SPA at `/admin` like `/client` and `/dashboard`.
 */
export function getAdminPortalOrigin(): string | null {
  const raw = import.meta.env.VITE_ADMIN_PORTAL_ORIGIN as string | undefined;
  if (raw === '' || raw == null || !raw.trim()) return null;
  return raw.trim().replace(/\/+$/, '');
}

export function absoluteAdminPortalUrl(pathname: string, search: string): string {
  const origin = getAdminPortalOrigin();
  if (!origin) return `${pathname}${search}`;
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${p}${search}`;
}
