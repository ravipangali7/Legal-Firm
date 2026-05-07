import type { AuthMeUser } from '@/lib/api';

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

/**
 * Whether the subscriber shell (/client, /dashboard) should expose a module.
 * Uses `portal_permissions` from `/api/auth/me/` (staff reuse admin matrix).
 */
export function evaluatePortalModuleView(user: AuthMeUser | null | undefined, module: string): boolean {
  if (!user) return false;
  const rows = user.portal_permissions;
  if (!Array.isArray(rows)) return true;
  const row = rows.find((r) => String(r.module ?? '').trim() === module);
  return Boolean(row?.view);
}
