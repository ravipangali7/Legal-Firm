import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminStore } from '@/store/adminStore';
import { useAuth } from '@/context/AuthContext';
import { adminModuleForPathname } from '@/lib/adminModuleMap';
import { adminLandingHref } from '@/lib/adminLandingPath';
import { evaluateAdminModulePerm } from '@/lib/adminPermissionUtil';

function AdminOutletGuard() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const { roles } = useAdminStore();

  if (loading) {
    return <div className="text-muted-foreground text-sm py-8">Loading…</div>;
  }
  const mod = adminModuleForPathname(pathname);
  if (mod === null) {
    const p = pathname.replace(/\/$/, '') || '/';
    if (p === '/admin') return <Outlet />;
    return <Navigate to="/admin" replace />;
  }
  if (!evaluateAdminModulePerm(user, roles, mod, 'view')) {
    const fallback = adminLandingHref(user, roles);
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
}

const Inner = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentRole, impersonation } = useAdminStore();

  return (
    <div className="min-h-screen bg-background">
      <div className={cn('hidden lg:block', impersonation.active && 'pt-9')}>
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      <div className={cn(impersonation.active && 'pt-9')}>
        <AdminHeader sidebarCollapsed={sidebarCollapsed} currentRole={currentRole} />
      </div>
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64',
          impersonation.active && 'pt-[100px]'
        )}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <AdminOutletGuard />
        </div>
      </main>
    </div>
  );
};

const AdminLayout = () => <Inner />;

export default AdminLayout;
