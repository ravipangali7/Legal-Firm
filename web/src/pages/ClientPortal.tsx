import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Scale,
  Briefcase,
  BookOpen,
  ChevronRight,
  Sparkles,
  Plus,
  FileText,
  Lightbulb,
  AlertTriangle,
  Settings,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ClientPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [featureSubject, setFeatureSubject] = useState('');
  const [featureDetails, setFeatureDetails] = useState('');

  const stats = [
    {
      icon: Scale,
      label: 'Practice Areas',
      value: 12,
      subtitle: 'Available areas',
      color: 'bg-blue-500',
      href: '/practice-areas',
    },
    {
      icon: Briefcase,
      label: 'Services',
      value: 6,
      subtitle: 'Available services',
      color: 'bg-purple-500',
      href: '/services',
    },
    {
      icon: BookOpen,
      label: 'Resources',
      value: 4,
      subtitle: 'Available resources',
      color: 'bg-green-500',
      href: '/resources',
    },
  ];

  const quickAccess = [
    { icon: Scale, label: 'Practice Areas', count: 12, href: '/practice-areas' },
    { icon: Briefcase, label: 'Services', count: 6, href: '/services' },
    { icon: BookOpen, label: 'Resources', count: 4, href: '/resources' },
    { icon: Settings, label: 'Manage Packages', href: '/packages' },
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Ticket Submitted',
      description: 'Your support ticket has been submitted successfully.',
    });
    setTicketSubject('');
    setTicketMessage('');
  };

  const handleSubmitFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureSubject.trim() || !featureDetails.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Feature Request Submitted',
      description: 'Thank you for your suggestion!',
    });
    setFeatureSubject('');
    setFeatureDetails('');
  };

  return (
    <div className="min-h-screen bg-[hsl(40,30%,92%)]">
      <Header />
      
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 rounded-t-2xl h-4 mb-0" />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => navigate(stat.href)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-xl ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-blue-600 font-medium mt-4">{stat.label}</p>
                    <p className="text-4xl font-bold text-blue-900 mt-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Subscription Card */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Subscription
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subscribed</span>
                    <span className="text-muted-foreground">Expires</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Nov 02, 2025</span>
                    <span>—</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                    onClick={() => navigate('/dashboard?tab=wallet')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Renew
                  </Button>
                  <Button variant="outline" size="icon" className="border-blue-200">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support & Feature Request */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Support Ticket */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                  </div>
                  Support Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <Label className="text-sm">Subject</Label>
                    <Input 
                      placeholder="Describe your issue" 
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Message</Label>
                    <Textarea 
                      placeholder="Provide details about your issue" 
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Feature Request */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                  </div>
                  Request New Feature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitFeature} className="space-y-4">
                  <div>
                    <Label className="text-sm">Subject</Label>
                    <Input 
                      placeholder="Feature name or title" 
                      value={featureSubject}
                      onChange={(e) => setFeatureSubject(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Details</Label>
                    <Textarea 
                      placeholder="Describe the feature you'd like to see" 
                      value={featureDetails}
                      onChange={(e) => setFeatureDetails(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Quick Access */}
            <Card className="border-2 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickAccess.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.label === 'Practice Areas' ? 'bg-blue-100' :
                        item.label === 'Services' ? 'bg-purple-100' :
                        item.label === 'Resources' ? 'bg-green-100' :
                        'bg-pink-100'
                      }`}>
                        <item.icon className={`h-4 w-4 ${
                          item.label === 'Practice Areas' ? 'text-blue-600' :
                          item.label === 'Services' ? 'text-purple-600' :
                          item.label === 'Resources' ? 'text-green-600' :
                          'text-pink-600'
                        }`} />
                      </div>
                      <span className="font-medium text-blue-900">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.count && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {item.count}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClientPortal;
