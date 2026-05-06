import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CreditCard,
  FolderKanban,
  TrendingUp,
  UserCheck,
  Activity,
  Shield,
  Layout,
  Library,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminStore } from '@/store/adminStore';
import { SIDEBAR_NAV_ITEMS } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { evaluateAdminModulePerm } from '@/lib/adminPermissionUtil';
import { defaultCmsSnapshot, type Snapshot } from '@/store/cmsStore';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,72%,55%)', 'hsl(199,89%,48%)'];

function countBy<T>(items: T[], keyFn: (t: T) => string): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const t of items) {
    const k = keyFn(t);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

function logsByDay(logs: { createdAt: string }[], days = 7) {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }
  const counts = new Map(labels.map((d) => [d, 0]));
  for (const l of logs) {
    const day = l.createdAt.slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return labels.map((day) => ({ day: day.slice(5), count: counts.get(day) ?? 0 }));
}

function txnByDay(txns: { createdAt: string }[], days = 7) {
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }
  const amounts = new Map(labels.map((d) => [d, 0]));
  for (const t of txns) {
    const day = t.createdAt.slice(0, 10);
    if (amounts.has(day)) amounts.set(day, (amounts.get(day) ?? 0) + 1);
  }
  return labels.map((day) => ({ day: day.slice(5), count: amounts.get(day) ?? 0 }));
}

function MiniStat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card px-3 py-2 text-center', className)}>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ChartShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('h-[200px] w-full min-h-[160px]', className)}>{children}</div>;
}

function OverviewModuleCard({
  title,
  to,
  description,
  children,
}: {
  title: string;
  to: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-sm">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20 pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
          {description ? <CardDescription className="text-xs leading-snug">{description}</CardDescription> : null}
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1" asChild>
          <Link to={to}>
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 pt-4">{children}</CardContent>
    </Card>
  );
}

const HREF_ICONS: Record<string, typeof Users> = {
  '/admin/users': Users,
  '/admin/roles': Shield,
  '/admin/cms': Layout,
  '/admin/legal': Library,
  '/admin/transactions': CreditCard,
  '/admin/clients': UserCheck,
  '/admin/analytics': BarChart3,
  '/admin/projects': FolderKanban,
  '/admin/notifications': Bell,
  '/admin/support': MessageSquare,
  '/admin/logs': Activity,
  '/admin/settings': Settings,
  '/admin/help': HelpCircle,
};

function ModuleVisual({ href }: { href: string }) {
  const Icon = HREF_ICONS[href] ?? Layout;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-onBg">
      <Icon className="h-4 w-4" />
    </div>
  );
}

const AdminOverview = () => {
  const { user: authUser } = useAuth();
  const {
    users,
    roles,
    transactions,
    clients,
    projects,
    notifications,
    supportTickets,
    activityLogs,
    settings,
    helpArticles,
    apiConnected,
  } = useAdminStore();

  const { data: homepageApi } = useQuery(siteHomepageQueryOptions);
  const cmsSnap: Snapshot = useMemo(
    () => (homepageApi ? mapHomepageApiToSnapshot(homepageApi) : defaultCmsSnapshot),
    [homepageApi]
  );

  const navModules = useMemo(
    () =>
      SIDEBAR_NAV_ITEMS.filter(
        (i) => i.href !== '/admin' && evaluateAdminModulePerm(authUser, roles, i.module, 'view')
      ),
    [authUser, roles]
  );

  const totalRevenue = useMemo(
    () => transactions.filter((t) => t.status === 'verified').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const pendingPayments = useMemo(() => transactions.filter((t) => t.status === 'pending').length, [transactions]);
  const subscribed = useMemo(() => users.filter((u) => u.subscribed).length, [users]);
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const activityToday = useMemo(
    () => activityLogs.filter((l) => l.createdAt.startsWith(todayPrefix)).length,
    [activityLogs, todayPrefix]
  );
  const userRolePie = useMemo(() => countBy(users, (u) => u.role.replace('_', ' ')), [users]);
  const txnStatusPie = useMemo(() => countBy(transactions, (t) => t.status), [transactions]);
  const clientTypePie = useMemo(() => countBy(clients, (c) => c.type), [clients]);
  const projectStatusBar = useMemo(() => countBy(projects, (p) => p.status.replace('_', ' ')), [projects]);
  const notifTypePie = useMemo(() => countBy(notifications, (n) => n.type), [notifications]);
  const ticketStatusBar = useMemo(() => countBy(supportTickets, (t) => t.status.replace('_', ' ')), [supportTickets]);
  const helpPublishedPie = useMemo(
    () => [
      { name: 'Published', value: helpArticles.filter((h) => h.published).length },
      { name: 'Draft', value: helpArticles.filter((h) => !h.published).length },
    ],
    [helpArticles]
  );

  const rolePermBars = useMemo(
    () =>
      roles.map((r) => ({
        name: r.key === 'super_admin' ? 'Super' : r.key === 'admin' ? 'Admin' : r.key === 'editor' ? 'Editor' : r.key === 'client' ? 'Client' : 'User',
        view: r.permissions.filter((p) => p.view).length,
        edit: r.permissions.filter((p) => p.edit).length,
      })),
    [roles]
  );

  const cmsBlocksBar = useMemo(
    () => [
      { name: 'Slides', count: cmsSnap.slides.filter((s) => s.enabled).length },
      { name: 'Services', count: cmsSnap.services.filter((s) => s.enabled).length },
      { name: 'Team', count: cmsSnap.team.filter((s) => s.enabled).length },
      { name: 'News', count: cmsSnap.news.filter((s) => s.enabled).length },
      { name: 'Nav', count: cmsSnap.navItems.filter((s) => s.enabled).length },
    ],
    [cmsSnap]
  );

  const cmsTogglesOn = useMemo(
    () => Object.values(cmsSnap.toggles).filter(Boolean).length,
    [cmsSnap.toggles]
  );

  const activityLine = useMemo(() => logsByDay(activityLogs, 7), [activityLogs]);
  const txnLine = useMemo(() => txnByDay(transactions, 7), [transactions]);

  const topKpis = useMemo(
    () => [
      { label: 'Users', value: users.length, icon: Users, link: '/admin/users' as const },
      { label: 'Subscribed', value: subscribed, icon: UserCheck, link: '/admin/users' as const },
      { label: 'Revenue (NPR)', value: totalRevenue.toLocaleString(), icon: TrendingUp, link: '/admin/transactions' as const },
      { label: 'Pending txns', value: pendingPayments, icon: CreditCard, link: '/admin/transactions' as const },
    ],
    [users.length, subscribed, totalRevenue, pendingPayments]
  );

  const renderModuleBody = (href: string): ReactNode => {
    switch (href) {
      case '/admin/users':
        return (
          <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Total" value={users.length} />
              <MiniStat label="Active" value={users.filter((u) => u.status === 'active').length} />
              <MiniStat label="Pending" value={users.filter((u) => u.status === 'pending').length} />
              <MiniStat label="Suspended" value={users.filter((u) => u.status === 'suspended').length} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">By role</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userRolePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                      {userRolePie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Users']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="md:col-span-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-center font-medium">Role</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 4).map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{u.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2 text-center capitalize">{u.role.replace('_', ' ')}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/roles':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Permission depth by role</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rolePermBars} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="view" name="View" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="edit" name="Edit" stackId="a" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Role</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-center font-medium">System</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.slice(0, 5).map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground">{r.description}</td>
                      <td className="px-3 py-2 text-center">{r.isSystem ? 'Yes' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/cms':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Sections on" value={cmsTogglesOn} />
              <MiniStat label="Testimonials" value={cmsSnap.testimonials.items.length} />
              <MiniStat label="Footer columns" value={cmsSnap.footer.columns.length} />
              <MiniStat label="About stats" value={cmsSnap.about.stats.length} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Enabled blocks</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cmsBlocksBar} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
          </div>
        );
      case '/admin/legal':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Help articles" value={helpArticles.length} />
              <MiniStat label="Published help" value={helpArticles.filter((h) => h.published).length} />
              <MiniStat label="Active projects" value={projects.filter((p) => p.status !== 'completed').length} />
              <MiniStat label="Clients" value={clients.length} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed md:col-span-2">
              Acts, case summaries, procedures, and practice areas are maintained under <strong>Legal library</strong> in the sidebar.
            </p>
          </div>
        );
      case '/admin/transactions':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Last 7 days (count)</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={txnLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Txns" stroke={COLORS[0]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">By status</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={txnStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {txnStatusPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="md:col-span-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Invoice</th>
                    <th className="px-3 py-2 text-left font-medium">User</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 4).map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-mono text-[11px]">{t.invoice}</td>
                      <td className="px-3 py-2">{t.user}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">NPR {t.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/clients':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Clients" value={clients.length} />
              <MiniStat label="Active" value={clients.filter((c) => c.status === 'active').length} />
              <MiniStat label="Business" value={clients.filter((c) => c.type === 'business').length} />
              <MiniStat label="Individuals" value={clients.filter((c) => c.type === 'individual').length} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Client type</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clientTypePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {clientTypePie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="md:col-span-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Company</th>
                    <th className="px-3 py-2 text-center font-medium">Projects</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.slice(0, 4).map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{c.company}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{c.activeProjects}</td>
                      <td className="px-3 py-2 text-center capitalize">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/analytics':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Help articles" value={helpArticles.length} />
              <MiniStat label="Published help" value={helpArticles.filter((h) => h.published).length} />
              <MiniStat label="Verified txns" value={transactions.filter((t) => t.status === 'verified').length} />
              <MiniStat label="Activity today" value={activityToday} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Activity (7 days)</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Events" stroke={COLORS[4]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <p className="md:col-span-2 text-xs text-muted-foreground">
              Live KPIs and funnels are on the Analytics page. This card summarizes catalogue and audit activity from the current admin dataset.
            </p>
          </div>
        );
      case '/admin/projects':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">By status</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={48} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Project</th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 4).map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.progress}</td>
                      <td className="px-3 py-2 text-center capitalize">{p.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/notifications':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Total" value={notifications.length} />
              <MiniStat label="Unread" value={notifications.filter((n) => !n.read).length} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">By type</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={notifTypePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {notifTypePie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="md:col-span-2 overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-center font-medium">Type</th>
                    <th className="px-3 py-2 text-center font-medium">Read</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.slice(0, 4).map((n) => (
                    <tr key={n.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{n.title}</td>
                      <td className="px-3 py-2 text-center capitalize">{n.type}</td>
                      <td className="px-3 py-2 text-center">{n.read ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/support':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Tickets by status</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketStatusBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={52} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Subject</th>
                    <th className="px-3 py-2 text-center font-medium">Priority</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.slice(0, 4).map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="max-w-[160px] truncate px-3 py-2 font-medium">{t.subject}</td>
                      <td className="px-3 py-2 text-center capitalize">{t.priority}</td>
                      <td className="px-3 py-2 text-center capitalize">{t.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/logs':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Events per day</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Logs" stroke={COLORS[3]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                    <th className="px-3 py-2 text-left font-medium">Actor</th>
                    <th className="px-3 py-2 text-left font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.slice(0, 4).map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{l.createdAt.slice(5, 16)}</td>
                      <td className="px-3 py-2 font-medium">{l.actor}</td>
                      <td className="max-w-[200px] truncate px-3 py-2">{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case '/admin/settings':
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Site" value={settings.siteName} className="sm:col-span-2" />
            <MiniStat label="Tax rate %" value={settings.taxRate} />
            <MiniStat label="Currency" value={settings.currency} />
            <MiniStat label="Indiv. /mo" value={settings.individualMonthlyPrice ?? '—'} />
            <MiniStat label="Business /mo" value={settings.businessMonthlyPrice ?? '—'} />
            <MiniStat label="Maintenance" value={settings.maintenanceMode ? 'On' : 'Off'} />
            <MiniStat label="Signups" value={settings.allowSignups ? 'Open' : 'Closed'} />
            <MiniStat label="Email notif." value={settings.emailNotifications ? 'On' : 'Off'} />
            <MiniStat label="Payments" value={settings.paymentsEnabled ? 'On' : 'Off'} />
          </div>
        );
      case '/admin/help':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Articles</p>
              <ChartShell>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={helpPublishedPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {helpPublishedPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartShell>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-center font-medium">Pub.</th>
                  </tr>
                </thead>
                <tbody>
                  {helpArticles.slice(0, 4).map((h) => (
                    <tr key={h.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-medium">{h.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{h.category}</td>
                      <td className="px-3 py-2 text-center">{h.published ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">No preview for this section.</p>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snapshot of each area in the sidebar — charts and tables use your current admin data
            {apiConnected ? ' (API snapshot).' : ' (local seed until API loads).'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {topKpis.map((k) => {
          const I = k.icon;
          return (
            <Link key={k.label} to={k.link} className="group block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-onBg">
                    <I className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold tabular-nums leading-none">{k.value}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{k.label}</p>
                  </div>
                  <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Modules</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {navModules.map((item) => (
            <OverviewModuleCard key={item.href} title={item.title} to={item.href} description="Preview — open the module for full tools.">
              <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-3">
                <ModuleVisual href={item.href} />
                <p className="text-xs text-muted-foreground">Quick read-only snapshot of this area.</p>
              </div>
              {renderModuleBody(item.href)}
            </OverviewModuleCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
