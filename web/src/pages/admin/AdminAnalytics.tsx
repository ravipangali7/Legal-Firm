import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Eye, CreditCard, UserCheck, AlertCircle } from 'lucide-react';
import {
  fetchAdminDashboardAnalytics,
  type AdminAnalyticsPeriod,
  type AdminDashboardAnalyticsKpi,
} from '@/lib/api';

const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)', 'hsl(262,83%,58%)'];

const KPI_ICONS: Record<string, typeof Eye> = {
  visitors: Eye,
  users: Users,
  revenue: CreditCard,
  clients: UserCheck,
};

function formatKpiChange(pct: number, up: boolean) {
  const sign = pct > 0 ? '+' : '';
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {sign}
      {pct}%
    </span>
  );
}

const AdminAnalytics = () => {
  const [period, setPeriod] = useState<AdminAnalyticsPeriod>('monthly');
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard-analytics', period],
    queryFn: () => fetchAdminDashboardAnalytics(period),
  });

  const kpisWithIcons = useMemo(() => {
    if (!data?.kpis?.length) return [];
    return data.kpis.map((k: AdminDashboardAnalyticsKpi) => ({
      ...k,
      icon: KPI_ICONS[k.key] ?? Eye,
    }));
  }, [data?.kpis]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform performance and insights from live data</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as AdminAnalyticsPeriod)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load analytics</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error instanceof Error ? error.message : 'Unknown error'}</span>
            <button
              type="button"
              className="text-sm underline underline-offset-4 font-medium"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))
          : kpisWithIcons.map((k) => (
              <Card key={k.key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <k.icon className="h-5 w-5 text-muted-foreground" />
                    {formatKpiChange(k.change_percent, k.up)}
                  </div>
                  <div className="mt-3 text-2xl font-bold">{k.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
                  {k.hint ? <div className="text-[10px] text-muted-foreground/80 mt-1 leading-snug">{k.hint}</div> : null}
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={isFetching && !isLoading ? 'opacity-80 transition-opacity' : ''}>
          <CardHeader>
            <CardTitle>Logins and activity</CardTitle>
            <CardDescription>
              Unique accounts with a login in each bucket, and in-app activity events (bookmarks, verified payments,
              etc.).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Logins"
                    stroke="hsl(221,83%,53%)"
                    fill="hsl(221,83%,53%)"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    name="Activity events"
                    stroke="hsl(142,71%,45%)"
                    fill="hsl(142,71%,45%)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={isFetching && !isLoading ? 'opacity-80 transition-opacity' : ''}>
          <CardHeader>
            <CardTitle>Revenue (NPR)</CardTitle>
            <CardDescription>Verified transactions recorded in each period.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), 'NPR']} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={isFetching && !isLoading ? 'opacity-80 transition-opacity' : ''}>
          <CardHeader>
            <CardTitle>New signups</CardTitle>
            <CardDescription>Accounts created in each period.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="signups" name="Signups" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users by role</CardTitle>
            <CardDescription>All registered accounts by role.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-[250px] w-full max-w-[280px] rounded-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data?.users_by_role ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {(data?.users_by_role ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
