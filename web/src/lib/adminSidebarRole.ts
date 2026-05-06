import type { UserRole } from '@/components/admin/AdminSidebar';
import type { AuthMeUser } from '@/lib/api';
import { normalizeRoleKey } from '@/lib/userHomeRoute';

const KNOWN: UserRole[] = ['super_admin', 'admin', 'editor', 'client', 'user'];

/**
 * Maps the authenticated user to the sidebar RBAC key. Django superusers always
 * get super_admin; staff accounts stuck with a customer role still see the full staff nav.
 */
export function effectiveSidebarRole(me: AuthMeUser): UserRole {
  if (me.is_superuser) return 'super_admin';
  const r = normalizeRoleKey(me) as UserRole;
  if (KNOWN.includes(r)) {
    if (me.is_staff && (r === 'client' || r === 'user')) return 'admin';
    return r;
  }
  if (me.is_staff) return 'admin';
  return 'user';
}
