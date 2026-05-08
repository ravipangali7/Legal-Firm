import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, Bell, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAuthDashboard } from '@/lib/api';
import { isPortalStaffShellSession, subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView } from '@/lib/subscriberPortalPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Lightweight subscriber-facing analytics (counts from `/api/auth/dashboard/`). */
export default function SubscriberPortalAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth-dashboard', user?.id],
    queryFn: fetchAuthDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  if (!evaluatePortalModuleView(user, 'Analytics')) {
    return <Navigate to={hubPath} replace />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary shrink-0" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Snapshot figures for your account. Names match Admin → Roles & Permissions (Analytics).
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {isError ? (
        <p className="text-sm text-destructive">Could not load analytics. Try again later.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laws catalog</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.laws_count?.toLocaleString() ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Case summaries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.case_summaries_count?.toLocaleString() ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notifications loaded</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.notifications?.length?.toLocaleString() ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Billing rows</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.billing?.length?.toLocaleString() ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {isPortalStaffShellSession(user) ? (
        <p className="text-xs text-muted-foreground">
          For full firm analytics, administrators use the{' '}
          <Link to="/admin/analytics" className="text-primary underline-offset-4 hover:underline">
            admin panel
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
