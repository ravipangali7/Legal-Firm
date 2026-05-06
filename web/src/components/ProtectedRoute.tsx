import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { userHomeHref } from '@/lib/userHomeRoute';
import type { ReactNode } from 'react';

function isSafeRelativePath(p: string) {
  if (!p.startsWith('/') || p.startsWith('//')) return false;
  if (p.includes('://')) return false;
  return true;
}

export function readSafeNextParam(search: string): string | null {
  const q = new URLSearchParams(search);
  const next = q.get('next');
  if (!next) return null;
  try {
    const decoded = decodeURIComponent(next);
    return isSafeRelativePath(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

interface ProtectedRouteProps {
  children: ReactNode;
  /** If true, only `user.is_staff` may access (Django admin API). */
  requireStaff?: boolean;
}

const LoginPath = '/login';

const ProtectedRoute = ({ children, requireStaff }: ProtectedRouteProps) => {
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
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`${LoginPath}?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requireStaff && !user.is_staff) {
    return <Navigate to={userHomeHref(user)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
