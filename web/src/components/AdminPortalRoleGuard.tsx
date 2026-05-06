import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { roleHubRedirectTo } from '@/lib/subscriberPortalPaths';

/**
 * After `ProtectedRoute` confirms staff, keeps `/admin` only for users whose home hub is
 * the admin app (`userHomeHref` === `/admin`). Others (e.g. client-only staff) go to `/client` or `/dashboard`.
 */
export default function AdminPortalRoleGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const to = roleHubRedirectTo(user, location.pathname, location.search);
  if (to) {
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
