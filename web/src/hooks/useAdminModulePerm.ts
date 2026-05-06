import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAdminStore } from '@/store/adminStore';
import { evaluateAdminModulePerm, type AdminPerm } from '@/lib/adminPermissionUtil';

export type { AdminPerm } from '@/lib/adminPermissionUtil';

/**
 * RBAC for staff admin UI + API alignment. Uses `admin_permissions` from `/api/auth/me/`
 * when present; falls back to local `adminStore` role matrix when the API snapshot is offline.
 */
export function useAdminModulePerm(module: string, perm: AdminPerm): boolean {
  const { user } = useAuth();
  const { roles, apiConnected } = useAdminStore();

  return useMemo(() => {
    void apiConnected;
    return evaluateAdminModulePerm(user, roles, module, perm);
  }, [user, module, perm, roles, apiConnected]);
}
