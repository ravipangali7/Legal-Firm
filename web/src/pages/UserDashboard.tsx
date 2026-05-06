import { useState } from 'react';
import { 
  User, 
  Crown, 
  BookOpen, 
  Download, 
  CreditCard, 
  Settings, 
  Calendar,
  Eye,
  Bookmark,
  TrendingUp,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const UserDashboard = () => {
  const [user] = useState({
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@example.com',
    plan: 'Premium',
    subscriptionStatus: 'active',
    joinDate: '2023-06-15',
    nextBilling: '2024-01-15'
  });

  const recentCases = [
    { id: '1', title: 'Himalayan Bank Ltd. vs. Department of Revenue', viewedAt: '2024-01-10', category: 'Banking Tax' },
    { id: '2', title: 'Nepal Insurance Company vs. IRD', viewedAt: '2024-01-09', category: 'Insurance Tax' },
    { id: '3', title: 'Tech Ventures Pvt. Ltd. vs. Department of Revenue', viewedAt: '2024-01-08', category: 'Corporate Tax' }
  ];

  const bookmarkedCases = [
    { id: '1', title: 'Export House Nepal vs. Customs Department', category: 'International Tax', bookmarkedAt: '2024-01-05' },
    { id: '2', title: 'Manufacturing Industries Ltd. vs. IRD', category: 'VAT Cases', bookmarkedAt: '2024-01-03' }
  ];

  const downloadHistory = [
    { id: '1', title: 'Tax Case Analysis - Banking Sector 2023.pdf', downloadedAt: '2024-01-10', size: '2.3 MB' },
    { id: '2', title: 'VAT Guidelines Summary.pdf', downloadedAt: '2024-01-08', size: '1.8 MB' },
    { id: '3', title: 'International Tax Treaty Analysis.pdf', downloadedAt: '2024-01-06', size: '3.1 MB' }
  ];

  const paymentHistory = [
    { id: '1', date: '2024-01-01', amount: 1999, method: 'eSewa', status: 'Completed' },
    { id: '2', date: '2023-12-01', amount: 1999, method: 'Khalti', status: 'Completed' },
    { id: '3', date: '2023-11-01', amount: 1999, method: 'eSewa', status: 'Completed' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <User className="h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-accent" />
                  <span className="text-2xl font-bold">{user.plan}</span>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cases Viewed</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bookmarked</p>
                <p className="text-2xl font-bold">{bookmarkedCases.length}</p>
              </div>
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Downloads</p>
                <p className="text-2xl font-bold">{downloadHistory.length}</p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.plan} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      Next billing: {new Date(user.nextBilling).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Usage this month</span>
                    <span>18 / 50 cases</span>
                  </div>
                  <Progress value={36} className="h-2" />
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recently Viewed Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recently Viewed Cases
              </CardTitle>
              <CardDescription>
                Cases you've accessed in the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCases.map((case_) => (
                  <div key={case_.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{case_.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-xs">{case_.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(case_.viewedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Download History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download History
              </CardTitle>
              <CardDescription>
                Your recent PDF downloads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {downloadHistory.map((download) => (
                  <div key={download.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{download.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{download.size}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(download.downloadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Bookmarked Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Bookmarked Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookmarkedCases.map((case_) => (
                  <div key={case_.id} className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm line-clamp-2 mb-2">{case_.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{case_.category}</Badge>
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">NPR {payment.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{payment.method}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">{payment.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Member since</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;