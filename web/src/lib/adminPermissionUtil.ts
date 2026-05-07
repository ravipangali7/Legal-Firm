import { effectiveSidebarRole } from '@/lib/adminSidebarRole';
import type { AuthMeUser } from '@/lib/api';

export type AdminPerm = 'view' | 'create' | 'edit' | 'delete';

type RoleRow = {
  key: string;
  permissions: { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean }[];
};

/** Shared RBAC evaluation for hooks and memoized nav filters. */
export function evaluateAdminModulePerm(
  user: AuthMeUser | null | undefined,
  roles: RoleRow[],
  module: string,
  perm: AdminPerm
): boolean {
  if (!user?.is_staff) return false;
  if (user.is_superuser) return true;
  if (Array.isArray(user.admin_permissions)) {
    const row = user.admin_permissions.find((r) => r.module === module);
    // Some sessions can return a partial/empty admin_permissions array.
    // Fall back to role-matrix evaluation when the module row is missing.
    if (row) return Boolean(row[perm]);
  }
  if (roles.length) {
    const key = effectiveSidebarRole(user);
    const role = roles.find((r) => r.key === key);
    const p = role?.permissions.find((x) => x.module === module);
    return Boolean(p?.[perm]);
  }
  return false;
}

/**
 * Clients list + synced CRM rows from “promote user to client” are needed when staff can edit users.
 * Without this, `/admin/clients` redirects away and the snapshot never loads client rows even though
 * the API creates them.
 */
export function canViewAdminClientsList(user: AuthMeUser | null | undefined, roles: RoleRow[]): boolean {
  return (
    evaluateAdminModulePerm(user, roles, 'Clients', 'view') ||
    evaluateAdminModulePerm(user, roles, 'Users', 'edit')
  );
}
