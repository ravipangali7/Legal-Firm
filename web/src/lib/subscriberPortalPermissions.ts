import type { AuthMeAdminPermission, AuthMeUser } from '@/lib/api';

/** Names match Admin Roles permission modules (`seed_roles_permissions.py` / permission-modules API). */
export const PORTAL_PERM_MODULES = {
  dashboard: 'Dashboard',
  notifications: 'Notifications',
  wallet: 'Pricing Plans',
  billing: 'Transactions',
  /** Subscriber profile page (`/client/profile`, `/dashboard/profile`) — Admin module "Settings". */
  profile: 'Settings',
  library: 'Legal library',
  support: 'Support',
  help: 'Help',
  projects: 'Projects',
} as const;

type PortalPermKey = keyof Pick<AuthMeAdminPermission, 'view' | 'create' | 'edit' | 'delete'>;

/** Effective RolePermission flag for the user's role (`portal_permissions` from `/api/auth/me/`). */
export function evaluatePortalPerm(user: AuthMeUser | null | undefined, module: string, perm: PortalPermKey): boolean {
  if (!user) return false;
  const rows = user.portal_permissions;
  if (!Array.isArray(rows)) return true;
  const row = rows.find((r) => String(r.module ?? '').trim() === module);
  return Boolean(row?.[perm]);
}

/**
 * Whether the subscriber shell (/client, /dashboard) should expose a module for navigation/view.
 * Uses `portal_permissions` from `/api/auth/me/` — aligned with Admin → Roles for ``User.role_key``.
 */
export function evaluatePortalModuleView(user: AuthMeUser | null | undefined, module: string): boolean {
  return evaluatePortalPerm(user, module, 'view');
}
