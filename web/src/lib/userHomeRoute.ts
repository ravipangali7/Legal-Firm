import type { AuthMeUser } from '@/lib/api';
import { hasLibraryEntitlement } from '@/lib/subscriptionAccess';

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
 * Canonical SPA hub for this user (single source for redirects + header home).
 * Mirrors backend `post_auth_app_home_path` / prior `computedUserHomeHref` logic.
 */
export function hubPathForRole(user: AuthMeUser): string {
  if (user.is_superuser) return '/admin';
  const role = normalizeRoleKey(user);
  if ((role === 'super_admin' || role === 'admin' || role === 'editor') && user.is_staff) {
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
 * Primary authenticated "home" URL after login or when opening the account hub from the site header.
 * Uses `hubPathForRole` only so redirects stay consistent (no stale/wrong `app_home_path`).
 */
export function userHomeHref(user: AuthMeUser | null | undefined): string {
  if (!user) return '/login';
  return hubPathForRole(user);
}

/** Short label for header tooltips / mobile (no "portal" jargon). */
export function userHomeTitle(user: AuthMeUser | null | undefined): string {
  if (!user) return 'Sign in';
  const role = normalizeRoleKey(user);
  if ((role === 'super_admin' || role === 'admin' || role === 'editor') && user.is_staff) {
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
  if ((role === 'super_admin' || role === 'admin' || role === 'editor') && user.is_staff) return 'Admin';
  if (role === 'client') return 'Client';
  if (role === 'user' || hasLibraryEntitlement(user)) return 'Dashboard';
  return 'Account';
}
