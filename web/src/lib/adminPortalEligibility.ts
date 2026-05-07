import type { AuthMeUser } from '@/lib/api';
import { SIDEBAR_NAV_ITEMS } from '@/components/admin/AdminSidebar';
import { evaluateAdminModulePerm } from '@/lib/adminPermissionUtil';

type RoleRow = {
  key: string;
  permissions: { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean }[];
};

/**
 * Whether `/admin` RBAC permits opening the panel (mirror of layout checks).
 * Superusers always pass; otherwise require at least one sidebar module view, from
 * `/me` matrix or hydrated role snapshots.
 */
export function adminPortalCapability(
  user: AuthMeUser | null | undefined,
  roles: RoleRow[],
  adminSnapshotLoaded: boolean,
): 'allow' | 'deny' | 'loading' {
  if (!user?.is_staff) return 'deny';
  if (user.is_superuser) return 'allow';
  const perms = user.admin_permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    return perms.some((p) => p.view) ? 'allow' : 'deny';
  }
  if (!adminSnapshotLoaded) return 'loading';
  const any = SIDEBAR_NAV_ITEMS.some((item) =>
    evaluateAdminModulePerm(user, roles, item.module, 'view'),
  );
  return any ? 'allow' : 'deny';
}
