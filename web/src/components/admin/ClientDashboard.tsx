import {
  FolderKanban,
  FileText,
  CreditCard,
  MessageSquare,
  Bell,
  Calendar,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import StatsCard from './StatsCard';
import StatusBadge from './StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const clientProjects = [
  {
    id: 1,
    name: 'Company Registration',
    status: 'active',
    progress: 75,
    deadline: 'Jan 30, 2024',
    tasks: { completed: 6, total: 8 },
  },
  {
    id: 2,
    name: 'Tax Consultation',
    status: 'pending',
    progress: 30,
    deadline: 'Feb 15, 2024',
    tasks: { completed: 2, total: 6 },
  },
  {
    id: 3,
    name: 'Legal Documentation',
    status: 'completed',
    progress: 100,
    deadline: 'Jan 10, 2024',
    tasks: { completed: 5, total: 5 },
  },
];

const recentDocuments = [
  { name: 'Contract Agreement v2.pdf', size: '2.4 MB', date: 'Jan 18, 2024', type: 'PDF' },
  { name: 'Tax Statement 2023.xlsx', size: '1.1 MB', date: 'Jan 15, 2024', type: 'Excel' },
  { name: 'Company Profile.pdf', size: '856 KB', date: 'Jan 10, 2024', type: 'PDF' },
];

const upcomingMeetings = [
  { title: 'Project Review', date: 'Jan 22, 2024', time: '10:00 AM', with: 'Legal Team' },
  { title: 'Tax Consultation', date: 'Jan 25, 2024', time: '2:00 PM', with: 'Tax Advisor' },
];

const notifications = [
  { id: 1, message: 'Your document has been approved', time: '1 hour ago', read: false },
  { id: 2, message: 'New invoice generated for January', time: '3 hours ago', read: false },
  { id: 3, message: 'Meeting scheduled for tomorrow', time: '1 day ago', read: true },
];

const ClientDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, John!</h2>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your projects and account activity.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button>
                <FolderKanban className="h-4 w-4 mr-2" />
                View Projects
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Projects"
          value="3"
          icon={FolderKanban}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
        />
        <StatsCard
          title="Documents"
          value="24"
          change={{ value: '3', positive: true }}
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-500/10"
        />
        <StatsCard
          title="Pending Invoices"
          value="2"
          icon={CreditCard}
          iconColor="text-orange-600"
          iconBg="bg-orange-500/10"
        />
        <StatsCard
          title="Support Tickets"
          value="1"
          icon={MessageSquare}
          iconColor="text-green-600"
          iconBg="bg-green-500/10"
        />
      </div>

      {/* Projects & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Projects</CardTitle>
                <CardDescription>Track progress on ongoing projects</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{project.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      Due: {project.deadline}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {project.tasks.completed}/{project.tasks.total} tasks completed
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      View Details
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary-onBg" />
                Notifications
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {notifications.filter((n) => !n.read).length} new
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg transition-colors ${
                  notification.read
                    ? 'bg-secondary/30'
                    : 'bg-primary/5 border border-primary/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${!notification.read && 'font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full mt-2">
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Documents & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Documents</CardTitle>
                <CardDescription>Your latest files and documents</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDocuments.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                      doc.type === 'PDF'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-green-500/10 text-green-600'
                    }`}
                  >
                    {doc.type}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.size} • {doc.date}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-onBg" />
                  Upcoming Meetings
                </CardTitle>
                <CardDescription>Your scheduled appointments</CardDescription>
              </div>
              <Button size="sm">
                Schedule New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.map((meeting, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-secondary/30 border border-border/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{meeting.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      with {meeting.with}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                    Upcoming
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {meeting.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {meeting.time}
                  </span>
                </div>
              </div>
            ))}
            {upcomingMeetings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming meetings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Ticket */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary-onBg" />
                Your Support Tickets
              </CardTitle>
              <CardDescription>Track your support requests</CardDescription>
            </div>
            <Button>
              Create New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border/50 bg-secondary/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">#1234</span>
                  <h4 className="font-semibold">Question about document submission</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated: Jan 20, 2024 at 3:45 PM
                </p>
              </div>
              <StatusBadge status="active" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Button variant="outline" size="sm">
                View Ticket
              </Button>
              <span className="text-xs text-muted-foreground">
                Awaiting response from support team
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
