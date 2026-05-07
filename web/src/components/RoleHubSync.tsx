import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { normalizeAuthMeUser } from '@/lib/api';
import { logAuthRedirectDecision } from '@/lib/userHomeRoute';
import { roleHubRedirectTo } from '@/lib/subscriberPortalPaths';

/**
 * Imperative hub correction so the URL always matches the signed-in user's role hub,
 * even when `<Navigate />` inside nested routes does not run as expected.
 */
export default function RoleHubSync() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (loading || !user) return;
    const u = normalizeAuthMeUser({ ...user });
    const to = roleHubRedirectTo(u, location.pathname, location.search);
    if (!to) return;
    const current = `${location.pathname}${location.search}`;
    if (to === current) return;
    logAuthRedirectDecision('hub-sync: wrong portal path corrected', {
      from: current,
      to,
      app_home_path: u.app_home_path,
      role: u.role,
      is_staff: u.is_staff,
    });
    navigate(to, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
