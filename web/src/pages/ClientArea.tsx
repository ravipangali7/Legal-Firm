import { Users, FileText, Calendar, CreditCard, Download, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ClientArea = () => {
  const clientServices = [
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Access all your legal documents, contracts, and case files in one secure location'
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Book consultations and meetings with our legal experts at your convenience'
    },
    {
      icon: CreditCard,
      title: 'Billing & Payments',
      description: 'View invoices, payment history, and manage your billing preferences'
    },
    {
      icon: Download,
      title: 'Case Updates',
      description: 'Track the progress of your cases and receive real-time updates'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Stay informed with important alerts and deadline reminders'
    },
    {
      icon: Users,
      title: 'Support Center',
      description: 'Get help and support from our dedicated client service team'
    }
  ];

  const recentActivity = [
    { date: '2024-01-15', activity: 'Case file updated for Company Registration', status: 'completed' },
    { date: '2024-01-14', activity: 'Payment received for Tax Advisory Services', status: 'completed' },
    { date: '2024-01-13', activity: 'Document uploaded: Business License Application', status: 'pending' },
    { date: '2024-01-12', activity: 'Consultation scheduled for Intellectual Property', status: 'upcoming' }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Users className="h-8 w-8 text-primary-onBg" />
          </div>
          <h1 className="section-title">Client Area</h1>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-3xl">
          Welcome to your secure client portal. Access your documents, track case progress, 
          and manage your legal services from one convenient location.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button className="h-12">
          <FileText className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
        <Button variant="outline" className="h-12">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
        <Button variant="outline" className="h-12">
          <CreditCard className="h-4 w-4 mr-2" />
          Pay Invoice
        </Button>
        <Button variant="outline" className="h-12">
          <Bell className="h-4 w-4 mr-2" />
          View Notifications
        </Button>
      </div>

      {/* Services Grid */}
      <div>
        <h2 className="subsection-title">Client Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientServices.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="card-hover">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary-onBg" />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="subsection-title">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.activity}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'completed' ? 'bg-green-100 text-green-800' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientArea;