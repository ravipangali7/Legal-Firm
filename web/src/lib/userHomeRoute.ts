import type { AuthMeUser } from '@/lib/api';
import { normalizeSpaHomePath, type SpaHubPath } from '@/lib/spaHubPaths';
import { hasLibraryEntitlement } from '@/lib/subscriptionAccess';

/** Set `localStorage.DEBUG_ROLE_REDIRECT=1` or run a dev build to see redirect decisions in the console. */
export function logAuthRedirectDecision(message: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const debug =
    import.meta.env.DEV || window.localStorage?.getItem('DEBUG_ROLE_REDIRECT') === '1';
  if (!debug) return;
  // eslint-disable-next-line no-console -- intentional diagnostics
  console.info(`[role-redirect] ${message}`, payload);
}

/** Normalize `role` from `/api/auth/me/` (string, or rare `{ key }` shape). */
export function normalizeRoleKey(user: AuthMeUser): string {
  const raw = user.role as unknown;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    return t || 'user';
  }
  if (raw && typeof raw === 'object' && 'key' in raw) {
    const k = String((raw as { key: string }).key).trim().toLowerCase();
    return k || 'user';
  }
  return 'user';
}

/**
 * Client-only fallback when `app_home_path` is missing or invalid.
 * Matches Django `post_auth_app_home_path` after server normalization.
 */
export function hubPathFallback(user: AuthMeUser): SpaHubPath {
  if (user.is_superuser) return '/admin';
  const role = normalizeRoleKey(user);
  if (role === 'super_admin') return '/admin';
  if ((role === 'admin' || role === 'editor') && user.is_staff) {
    return '/admin';
  }
  if (role === 'client') {
    return '/client';
  }
  if (role === 'user') {
    return '/dashboard';
  }
  if (user.is_staff) {
    return '/admin';
  }
  if (hasLibraryEntitlement(user)) {
    return '/dashboard';
  }
  return '/account';
}

/**
 * Resolved home: prefer backend `app_home_path` when it agrees with the role-derived hub.
 *
 * If the API sends a wrong `app_home_path` (e.g. `/account` for an admin), blindly trusting it
 * breaks `/account` correction — `roleHubRedirectTo` thinks the user is already home. For staff
 * portals (`/admin`) and client portal (`/client`), always enforce the canonical hub from role.
 */
export function resolveAuthHomeHref(user: AuthMeUser): {
  href: SpaHubPath;
  source: 'app_home_path' | 'fallback';
} {
  const fallback = hubPathFallback(user);
  const server = normalizeSpaHomePath(user.app_home_path ?? undefined);

  if (fallback === '/admin') {
    if (server === '/admin') return { href: '/admin', source: 'app_home_path' };
    if (server && server !== '/admin') {
      logAuthRedirectDecision('reconcile: admin hub overrides contradictory app_home_path', {
        server,
        fallback,
        role: normalizeRoleKey(user),
        is_staff: user.is_staff,
      });
    }
    return { href: '/admin', source: 'fallback' };
  }

  if (fallback === '/client') {
    if (server === '/client') return { href: '/client', source: 'app_home_path' };
    if (server && server !== '/client') {
      logAuthRedirectDecision('reconcile: client hub overrides contradictory app_home_path', {
        server,
        fallback,
        role: normalizeRoleKey(user),
      });
    }
    return { href: '/client', source: 'fallback' };
  }

  if (server) return { href: server, source: 'app_home_path' };
  return { href: fallback, source: 'fallback' };
}

/**
 * Canonical SPA hub for this user (single source for redirects + header home).
 */
export function hubPathForRole(user: AuthMeUser): SpaHubPath {
  const { href } = resolveAuthHomeHref(user);
  return href;
}

/**
 * Primary authenticated "home" URL after login or when opening the account hub from the site header.
 */
export function userHomeHref(user: AuthMeUser | null | undefined): string {
  if (!user) return '/login';
  return resolveAuthHomeHref(user).href;
}

/** Short label for header tooltips / mobile (no "portal" jargon). */
export function userHomeTitle(user: AuthMeUser | null | undefined): string {
  if (!user) return 'Sign in';
  const role = normalizeRoleKey(user);
  if (
    user.is_superuser ||
    role === 'super_admin' ||
    ((role === 'admin' || role === 'editor') && user.is_staff)
  ) {
    return 'Open admin panel';
  }
  if (role === 'client') return 'Open client portal';
  if (role === 'user' || hasLibraryEntitlement(user)) return 'Open your dashboard';
  return 'Open my account';
}

/** Compact label next to avatar where space is tight. */
export function userHomeShortLabel(user: AuthMeUser | null | undefined): string {
  if (!user) return 'Account';
  const role = normalizeRoleKey(user);
  if (
    user.is_superuser ||
    role === 'super_admin' ||
    ((role === 'admin' || role === 'editor') && user.is_staff)
  )
    return 'Admin';
  if (role === 'client') return 'Client';
  if (role === 'user' || hasLibraryEntitlement(user)) return 'Dashboard';
  return 'Account';
}
