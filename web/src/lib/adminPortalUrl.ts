const DEFAULT_ADMIN_PORTAL_ORIGIN = 'https://legalfirm.360winx.com';

/**
 * Absolute origin for the dedicated admin SPA. In development, omit or set blank to stay in-app.
 * In production defaults to LEGALFIRM admin host when unset.
 */
export function getAdminPortalOrigin(): string | null {
  const raw = import.meta.env.VITE_ADMIN_PORTAL_ORIGIN as string | undefined;
  if (raw === '') return null;
  if (raw?.trim()) return raw.trim().replace(/\/+$/, '');
  return import.meta.env.PROD ? DEFAULT_ADMIN_PORTAL_ORIGIN.replace(/\/+$/, '') : null;
}

export function absoluteAdminPortalUrl(pathname: string, search: string): string {
  const origin = getAdminPortalOrigin();
  if (!origin) return `${pathname}${search}`;
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${p}${search}`;
}
