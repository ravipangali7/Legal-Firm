import {
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Server,
  Database,
  Shield,
  Globe,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import StatsCard from './StatsCard';
import ChartPlaceholder from './ChartPlaceholder';
import ActivityList from './ActivityList';
import StatusBadge from './StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import RoleBadge from './RoleBadge';

const mockActivities = [
  {
    id: 1,
    user: { name: 'Ram Kumar', initials: 'RK' },
    action: 'created new user',
    target: 'Sita Sharma',
    type: 'user' as const,
    time: '2 min ago',
  },
  {
    id: 2,
    user: { name: 'Admin System', initials: 'AS' },
    action: 'updated permissions for',
    target: 'Editor role',
    type: 'security' as const,
    time: '15 min ago',
  },
  {
    id: 3,
    user: { name: 'Gita Thapa', initials: 'GT' },
    action: 'processed payment from',
    target: 'Client ABC Ltd',
    type: 'payment' as const,
    time: '1 hour ago',
  },
  {
    id: 4,
    user: { name: 'System', initials: 'SY' },
    action: 'published content',
    target: 'Tax Law Update 2024',
    type: 'content' as const,
    time: '2 hours ago',
  },
  {
    id: 5,
    user: { name: 'Super Admin', initials: 'SA' },
    action: 'modified settings for',
    target: 'Email notifications',
    type: 'settings' as const,
    time: '3 hours ago',
  },
];

const systemStatus = [
  { name: 'API Server', status: 'active', uptime: '99.9%' },
  { name: 'Database', status: 'active', uptime: '99.8%' },
  { name: 'CDN', status: 'active', uptime: '100%' },
  { name: 'Email Service', status: 'pending', uptime: '98.5%' },
];

const recentUsers = [
  { name: 'Ram Sharma', email: 'ram@example.com', role: 'client' as const, status: 'active' },
  { name: 'Sita Devi', email: 'sita@example.com', role: 'user' as const, status: 'active' },
  { name: 'Hari Thapa', email: 'hari@example.com', role: 'editor' as const, status: 'pending' },
  { name: 'Gita Karki', email: 'gita@example.com', role: 'client' as const, status: 'active' },
];

const SuperAdminDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value="12,847"
          change={{ value: '12%', positive: true }}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
        />
        <StatsCard
          title="Active Subscriptions"
          value="8,921"
          change={{ value: '8%', positive: true }}
          icon={CreditCard}
          iconColor="text-purple-600"
          iconBg="bg-purple-500/10"
        />
        <StatsCard
          title="Monthly Revenue"
          value="NPR 2.5M"
          change={{ value: '18%', positive: true }}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-500/10"
        />
        <StatsCard
          title="Active Sessions"
          value="1,247"
          change={{ value: '5%', positive: false }}
          icon={Activity}
          iconColor="text-orange-600"
          iconBg="bg-orange-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPlaceholder
          title="User Growth"
          description="Monthly user registration trends"
          type="line"
        />
        <ChartPlaceholder
          title="Revenue Analytics"
          description="Revenue breakdown by subscription tier"
          type="bar"
        />
      </div>

      {/* System Status & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary-onBg" />
              System Status
            </CardTitle>
            <CardDescription>Infrastructure health overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemStatus.map((system) => (
              <div
                key={system.name}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      system.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm font-medium">{system.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={system.status} />
                  <span className="text-xs text-muted-foreground">{system.uptime}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <ActivityList
          activities={mockActivities}
          title="Audit Log"
          description="Recent system activities"
          className="lg:col-span-2"
        />
      </div>

      {/* Permission Matrix Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-onBg" />
            Role Permission Matrix
          </CardTitle>
          <CardDescription>Quick overview of role permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Permission</th>
                  <th className="text-center py-3 px-4">
                    <RoleBadge role="super_admin" size="sm" />
                  </th>
                  <th className="text-center py-3 px-4">
                    <RoleBadge role="admin" size="sm" />
                  </th>
                  <th className="text-center py-3 px-4">
                    <RoleBadge role="editor" size="sm" />
                  </th>
                  <th className="text-center py-3 px-4">
                    <RoleBadge role="client" size="sm" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { perm: 'Manage Users', sa: true, ad: true, ed: false, cl: false },
                  { perm: 'Manage Roles', sa: true, ad: false, ed: false, cl: false },
                  { perm: 'Edit Content', sa: true, ad: true, ed: true, cl: false },
                  { perm: 'View Analytics', sa: true, ad: true, ed: true, cl: false },
                  { perm: 'View Projects', sa: true, ad: true, ed: true, cl: true },
                ].map((row) => (
                  <tr key={row.perm} className="border-b border-border/50">
                    <td className="py-3 px-4">{row.perm}</td>
                    <td className="text-center py-3 px-4">
                      {row.sa ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.ad ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.ed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.cl ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent User Registrations</CardTitle>
          <CardDescription>Latest users across all roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-onBg font-semibold">
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={user.role} size="sm" />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
