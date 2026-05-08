import type { AuthMeUser } from '@/lib/api';
import { hubPathForRole, normalizeRoleKey } from '@/lib/userHomeRoute';

export type SubscriberHubPath = '/dashboard' | '/client';

/**
 * Member (`user`) and `client` accounts use the subscriber hub as customers only.
 * (`is_staff` may still be true in the database for every user — do not use it alone for staff UX.)
 */
export function isPortalCustomerAccount(user: AuthMeUser): boolean {
  const r = normalizeRoleKey(user);
  return r === 'user' || r === 'client';
}

/** Editorial staff in the subscriber shell: admin shortcuts + staff banner (not customer roles). */
export function isPortalStaffShellSession(user: AuthMeUser): boolean {
  if (isPortalCustomerAccount(user)) return false;
  return Boolean(user.is_superuser || user.is_staff);
}

/** Hub for subscriber-style pages (`/dashboard` vs `/client`). */
export function subscriberHubPath(pathname: string): SubscriberHubPath {
  return pathname.startsWith('/client') ? '/client' : '/dashboard';
}

export function subscriberHubHeaderTitle(pathname: string, user: AuthMeUser): string {
  if (subscriberHubPath(pathname) === '/client') return 'Client portal';
  if (isPortalStaffShellSession(user)) return 'Customer view';
  return 'Dashboard';
}

/** True when `pathname` is already under the user's canonical hub root. */
export function isUnderRoleHub(pathname: string, home: string): boolean {
  if (home === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/');
  if (home === '/client') return pathname === '/client' || pathname.startsWith('/client/');
  if (home === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  if (home === '/account') return pathname === '/account' || pathname.startsWith('/account/');
  return false;
}

function pathnameTouchesRoleHub(pathname: string): boolean {
  const hubs = ['/admin', '/dashboard', '/client', '/account'] as const;
  return hubs.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * When the current URL is a **portal** path under the wrong hub (vs `hubPathForRole`), return the
 * corrected URL; otherwise `null`. Does not touch public routes (`/laws`, `/`, …).
 */
export function roleHubRedirectTo(user: AuthMeUser, pathname: string, search: string): string | null {
  const home = hubPathForRole(user);
  if (isUnderRoleHub(pathname, home)) return null;
  if (!pathnameTouchesRoleHub(pathname)) return null;

  /** Staff hubs use /admin; keep them off subscriber URLs and vice versa. */
  if (home === '/admin' && (pathname.startsWith('/dashboard') || pathname.startsWith('/client') || pathname.startsWith('/account'))) {
    return home;
  }
  if (home !== '/admin' && user.is_staff && pathname.startsWith('/admin')) {
    return home;
  }

  if (pathname.startsWith('/dashboard') && home === '/client') {
    return `${pathname.replace(/^\/dashboard/, '/client')}${search}`;
  }
  if (pathname.startsWith('/client') && home === '/dashboard') {
    return `${pathname.replace(/^\/client/, '/dashboard')}${search}`;
  }

  if (pathname.startsWith('/dashboard') && home === '/account') {
    return `${pathname.replace(/^\/dashboard/, '/account')}${search}`;
  }
  if (pathname.startsWith('/account') && home === '/dashboard') {
    return `${pathname.replace(/^\/account/, '/dashboard')}${search}`;
  }

  return home;
}
