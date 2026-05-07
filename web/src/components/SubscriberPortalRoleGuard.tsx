import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { normalizeAuthMeUser } from '@/lib/api';
import { roleHubRedirectTo } from '@/lib/subscriberPortalPaths';

/**
 * Keeps `/dashboard`, `/client`, and `/account` aligned with `userHomeHref` via `roleHubRedirectTo`.
 */
export default function SubscriberPortalRoleGuard({ children }: { children: ReactNode }) {
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

  const to = roleHubRedirectTo(normalizeAuthMeUser({ ...user }), location.pathname, location.search);
  if (to) {
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
