import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdminStore } from '@/store/adminStore';
import { adminLandingHref } from '@/lib/adminLandingPath';
import AdminOverview from '@/pages/admin/AdminOverview';

/**
 * `/admin` — super_admin / admin see the overview; other staff land on the first module
 * they may view (e.g. editors → Homepage CMS when the matrix allows it).
 */
export default function AdminHomeEntry() {
  const { user, loading } = useAuth();
  const { roles } = useAdminStore();
  const { pathname } = useLocation();
  const p = pathname.replace(/\/$/, '') || '/';

  if (loading) {
    return <div className="text-muted-foreground text-sm py-8">Loading…</div>;
  }

  const target = adminLandingHref(user, roles);
  if (p === '/admin' && target !== '/admin') {
    return <Navigate to={target} replace />;
  }

  return <AdminOverview />;
}
