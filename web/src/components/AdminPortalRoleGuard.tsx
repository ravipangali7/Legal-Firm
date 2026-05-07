import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useLayoutEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { normalizeAuthMeUser } from '@/lib/api';
import { roleHubRedirectTo } from '@/lib/subscriberPortalPaths';
import { hubPathForRole } from '@/lib/userHomeRoute';
import { getAdminPortalOrigin } from '@/lib/adminPortalUrl';
import { adminPortalCapability } from '@/lib/adminPortalEligibility';
import { useAdminStore } from '@/store/adminStore';

function CenteredLoading({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      {label}
    </div>
  );
}

/**
 * After `ProtectedRoute` confirms staff: keeps URL on `/admin…` inside this SPA (same pattern
 * as `/client` and `/dashboard`), sends wrong hubs away via `roleHubRedirectTo`, and checks RBAC.
 * Opt-in remote admin: set `VITE_ADMIN_PORTAL_ORIGIN` to hand off cross-origin once checks pass.
 */
export default function AdminPortalRoleGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { roles, adminSnapshotLoaded } = useAdminStore();

  const normalized = useMemo(
    () => (user ? normalizeAuthMeUser({ ...user }) : null),
    [user],
  );

  const hubRedirect = useMemo(() => {
    if (!normalized) return null;
    return roleHubRedirectTo(normalized, location.pathname, location.search);
  }, [normalized, location.pathname, location.search]);

  const hub = normalized ? hubPathForRole(normalized) : null;

  const capability = useMemo(() => {
    if (!normalized || loading || hubRedirect) return 'idle' as const;
    if (hub !== '/admin') return 'idle' as const;
    return adminPortalCapability(normalized, roles, adminSnapshotLoaded);
  }, [normalized, loading, hubRedirect, hub, roles, adminSnapshotLoaded]);

  useLayoutEffect(() => {
    if (loading || !normalized || hubRedirect || hub !== '/admin' || capability !== 'allow')
      return;
    const origin = getAdminPortalOrigin();
    if (!origin) return;
    try {
      if (window.location.origin === new URL(origin).origin) return;
    } catch {
      return;
    }
    const pathAndQuery = `${location.pathname}${location.search}`;
    window.location.replace(`${origin}${pathAndQuery}`);
  }, [
    loading,
    normalized,
    hubRedirect,
    hub,
    capability,
    location.pathname,
    location.search,
  ]);

  if (loading) {
    return <CenteredLoading label="Loading…" />;
  }

  if (!user || !normalized) {
    return null;
  }

  if (hubRedirect) {
    return <Navigate to={hubRedirect} replace />;
  }

  if (hub && hub !== '/admin') {
    return <Navigate to={hub} replace />;
  }

  if (capability === 'loading') {
    return <CenteredLoading label="Loading…" />;
  }

  if (capability === 'deny') {
    return <Navigate to="/dashboard" replace />;
  }

  const origin = getAdminPortalOrigin();
  if (origin && capability === 'allow') {
    try {
      if (window.location.origin !== new URL(origin).origin) {
        return <CenteredLoading label="Opening admin…" />;
      }
    } catch {
      /* invalid origin → in-app fallback */
    }
  }

  return <>{children}</>;
}
