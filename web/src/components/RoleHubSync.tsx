import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
    const to = roleHubRedirectTo(user, location.pathname, location.search);
    if (!to) return;
    const current = `${location.pathname}${location.search}`;
    if (to === current) return;
    navigate(to, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
