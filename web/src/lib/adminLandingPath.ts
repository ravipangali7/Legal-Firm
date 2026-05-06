import { SIDEBAR_NAV_ITEMS } from '@/components/admin/AdminSidebar';
import type { AuthMeUser } from '@/lib/api';
import { effectiveSidebarRole } from '@/lib/adminSidebarRole';
import { evaluateAdminModulePerm } from '@/lib/adminPermissionUtil';

type RoleRow = {
  key: string;
  permissions: { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean }[];
};

/**
 * When an editor may view both the generic Dashboard and content modules, prefer the
 * content workflow first (aligned with `seed_roles_permissions` editor matrix).
 */
const EDITOR_LANDING_MODULE_ORDER = [
  'Homepage CMS',
  'Legal library',
  'Projects',
  'Analytics',
  'Notifications',
  'Settings',
  'Help',
  'Roles',
  'Dashboard',
  'Activity Logs',
];

function visibleNavItems(user: AuthMeUser | null | undefined, roles: RoleRow[]): NavItem[] {
  return SIDEBAR_NAV_ITEMS.filter((item) => evaluateAdminModulePerm(user, roles, item.module, 'view'));
}

/**
 * First admin URL this user may open, in sidebar / product order — used for `/admin` index
 * and as a safe fallback when the current route's module is denied.
 */
export function adminLandingHref(user: AuthMeUser | null | undefined, roles: RoleRow[]): string {
  const items = visibleNavItems(user, roles);
  if (!items.length) return '/admin';

  const r = user ? effectiveSidebarRole(user) : 'user';
  if (r === 'editor') {
    const set = new Set(items.map((i) => i.module));
    for (const name of EDITOR_LANDING_MODULE_ORDER) {
      if (!set.has(name)) continue;
      const found = items.find((i) => i.module === name);
      if (found) return found.href;
    }
  }

  return items[0].href;
}
