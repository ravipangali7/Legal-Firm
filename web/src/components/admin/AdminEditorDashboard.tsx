import {
  Users,
  FileText,
  TrendingUp,
  Bell,
  Eye,
  Edit,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import StatsCard from './StatsCard';
import ChartPlaceholder from './ChartPlaceholder';
import ActivityList from './ActivityList';
import StatusBadge from './StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const mockActivities = [
  {
    id: 1,
    user: { name: 'You', initials: 'YU' },
    action: 'updated content',
    target: 'Tax Law Guide 2024',
    type: 'content' as const,
    time: '5 min ago',
  },
  {
    id: 2,
    user: { name: 'Ram Kumar', initials: 'RK' },
    action: 'registered as',
    target: 'new client',
    type: 'user' as const,
    time: '30 min ago',
  },
  {
    id: 3,
    user: { name: 'System', initials: 'SY' },
    action: 'sent notification to',
    target: '125 users',
    type: 'settings' as const,
    time: '1 hour ago',
  },
];

const pendingContent = [
  { id: 1, title: 'Company Registration Guide', author: 'Sita Sharma', status: 'draft', updated: '2 hours ago' },
  { id: 2, title: 'VAT Compliance Update', author: 'Ram Thapa', status: 'pending', updated: '5 hours ago' },
  { id: 3, title: 'Insurance Law Changes', author: 'Gita Karki', status: 'draft', updated: '1 day ago' },
];

const recentReports = [
  { name: 'Monthly User Report', type: 'PDF', date: 'Jan 15, 2024' },
  { name: 'Revenue Summary Q4', type: 'Excel', date: 'Jan 10, 2024' },
  { name: 'Content Performance', type: 'PDF', date: 'Jan 5, 2024' },
];

const AdminEditorDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Content"
          value="456"
          change={{ value: '15', positive: true }}
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-500/10"
        />
        <StatsCard
          title="Users Managed"
          value="1,234"
          change={{ value: '8%', positive: true }}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
        />
        <StatsCard
          title="Total Views"
          value="45.2K"
          change={{ value: '12%', positive: true }}
          icon={Eye}
          iconColor="text-green-600"
          iconBg="bg-green-500/10"
        />
        <StatsCard
          title="Pending Reviews"
          value="12"
          change={{ value: '3', positive: false }}
          icon={Edit}
          iconColor="text-orange-600"
          iconBg="bg-orange-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPlaceholder
          title="Content Performance"
          description="Views and engagement metrics"
          type="line"
        />
        <ChartPlaceholder
          title="User Activity"
          description="Active users over time"
          type="area"
        />
      </div>

      {/* Content & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Content */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Pending Content</CardTitle>
                <CardDescription>Content awaiting review or publication</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{content.title}</p>
                      <p className="text-sm text-muted-foreground">by {content.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={content.status} />
                    <span className="text-xs text-muted-foreground">{content.updated}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <ActivityList
          activities={mockActivities}
          title="Your Activity"
          description="Recent actions"
        />
      </div>

      {/* Reports & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-onBg" />
                  Recent Reports
                </CardTitle>
                <CardDescription>Generated reports and analytics</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Generate New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentReports.map((report, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded flex items-center justify-center text-xs font-bold ${
                      report.type === 'PDF'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-green-500/10 text-green-600'
                    }`}
                  >
                    {report.type}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Download
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notification Management */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary-onBg" />
                  Notification Queue
                </CardTitle>
                <CardDescription>Scheduled and pending notifications</CardDescription>
              </div>
              <Button size="sm">
                Create New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">Weekly Newsletter</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scheduled for Tomorrow, 9:00 AM
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                  Scheduled
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Recipients: 2,450 subscribers
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">System Maintenance Notice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Draft - Not scheduled
                  </p>
                </div>
                <StatusBadge status="draft" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-onBg" />
                Recent Support Tickets
              </CardTitle>
              <CardDescription>Tickets requiring attention</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All Tickets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: '#1234', subject: 'Cannot access premium content', priority: 'high', status: 'pending', user: 'Ram Sharma' },
              { id: '#1233', subject: 'Billing inquiry', priority: 'medium', status: 'active', user: 'Sita Devi' },
              { id: '#1232', subject: 'Feature request', priority: 'low', status: 'active', user: 'Hari Thapa' },
            ].map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary-onBg text-xs">
                      {ticket.user.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.id} • {ticket.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      ticket.priority === 'high'
                        ? 'bg-red-500/10 text-red-600 border-red-200'
                        : ticket.priority === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200'
                        : 'bg-gray-500/10 text-gray-600 border-gray-200'
                    }
                  >
                    {ticket.priority}
                  </Badge>
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEditorDashboard;
