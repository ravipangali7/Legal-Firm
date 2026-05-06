import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Bookmark, Bell, LifeBuoy, CreditCard, Calendar, FileText, Crown, ArrowRight,
  Trash2, CheckCircle2, AlertCircle, Plus, ExternalLink,
} from 'lucide-react';

const ClientDashboard = () => {
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState([
    { id: 1, title: 'Income Tax Act, 2058 — Section 11', type: 'Law', date: '2026-04-22' },
    { id: 2, title: 'CIR vs ABC Pvt. Ltd. (2024)', type: 'Case Summary', date: '2026-04-18' },
    { id: 3, title: 'VAT Act, 2052 — Schedule 1', type: 'Law', date: '2026-04-10' },
  ]);

  const notifications = [
    { id: 1, title: 'Subscription renewed', body: 'Your Premium plan was renewed for 1 year.', time: '2h ago', read: false },
    { id: 2, title: 'New case summary added', body: 'Supreme Court ruling on transfer pricing now available.', time: '1d ago', read: false },
    { id: 3, title: 'Support ticket #1042 resolved', body: 'Your query has been answered by our team.', time: '3d ago', read: true },
  ];

  const tickets = [
    { id: '#1052', subject: 'Cannot download PDF for case summary', status: 'open', date: '2026-04-28' },
    { id: '#1042', subject: 'Question about VAT calculator', status: 'resolved', date: '2026-04-20' },
    { id: '#1031', subject: 'Billing receipt request', status: 'closed', date: '2026-03-15' },
  ];

  const transactions = [
    { id: 'TXN-2026-041', date: '2026-04-15', plan: 'Premium (Yearly)', amount: 'NPR 12,000', method: 'eSewa', status: 'success' },
    { id: 'TXN-2025-117', date: '2025-04-15', plan: 'Premium (Yearly)', amount: 'NPR 12,000', method: 'Khalti', status: 'success' },
  ];

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');

  const removeBookmark = (id: number) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
    toast({ title: 'Bookmark removed' });
  };

  const submitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMsg.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    toast({ title: 'Ticket submitted', description: 'Our team will respond within 24 hours.' });
    setTicketSubject('');
    setTicketMsg('');
  };

  const statusStyle = (s: string) =>
    s === 'open' ? 'bg-amber-100 text-amber-700 border-amber-200'
      : s === 'resolved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-muted text-muted-foreground';

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, Ram</h1>
              <p className="text-muted-foreground">Here's an overview of your account.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/laws"><FileText className="h-4 w-4 mr-2" />Browse Laws</Link>
              </Button>
              <Button asChild>
                <Link to="/pricing"><Crown className="h-4 w-4 mr-2" />Upgrade</Link>
              </Button>
            </div>
          </div>

          {/* Top Cards: Subscription + Quick Stats */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="lg:col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm opacity-80">Current Plan</div>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <Crown className="h-6 w-6" /> Premium
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Renews on</span>
                    <span className="font-medium">Apr 15, 2027</span>
                  </div>
                  <Progress value={72} className="bg-white/20" />
                  <div className="text-xs opacity-80">263 days remaining</div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/dashboard?tab=wallet">Renew Now</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10" asChild>
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-primary/10 rounded-lg"><Bookmark className="h-5 w-5 text-primary-onBg" /></div>
                  <Badge variant="secondary">Saved</Badge>
                </div>
                <div className="text-3xl font-bold mt-3">{bookmarks.length}</div>
                <div className="text-sm text-muted-foreground">Bookmarks</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-amber-100 rounded-lg"><Bell className="h-5 w-5 text-amber-600" /></div>
                  <Badge variant="secondary">{notifications.filter(n => !n.read).length} new</Badge>
                </div>
                <div className="text-3xl font-bold mt-3">{notifications.length}</div>
                <div className="text-sm text-muted-foreground">Notifications</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="bookmarks" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="bookmarks"><Bookmark className="h-4 w-4 mr-2" />Bookmarks</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
              <TabsTrigger value="tickets"><LifeBuoy className="h-4 w-4 mr-2" />Support</TabsTrigger>
              <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-2" />Billing</TabsTrigger>
            </TabsList>

            {/* Bookmarks */}
            <TabsContent value="bookmarks" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Bookmarks</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookmarks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bookmark className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No bookmarks yet. Start saving laws and case summaries.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bookmarks.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 rounded">
                              <FileText className="h-4 w-4 text-primary-onBg" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{b.title}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{b.type}</Badge>
                                <Calendar className="h-3 w-3" /> {b.date}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => removeBookmark(b.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  <Button size="sm" variant="ghost">Mark all as read</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className={`flex gap-3 p-3 rounded-lg border ${!n.read ? 'bg-primary/5 border-primary/20' : ''}`}>
                      <div className={`p-2 rounded-lg h-fit ${!n.read ? 'bg-primary/15' : 'bg-muted'}`}>
                        <Bell className={`h-4 w-4 ${!n.read ? 'text-primary-onBg' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{n.title}</div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets */}
            <TabsContent value="tickets" className="mt-4">
              <div className="grid md:grid-cols-5 gap-4">
                <Card className="md:col-span-3">
                  <CardHeader>
                    <CardTitle>Your Support Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tickets.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{t.id}</span>
                            <span>•</span>
                            <span>{t.date}</span>
                          </div>
                          <div className="font-medium truncate">{t.subject}</div>
                        </div>
                        <Badge variant="outline" className={statusStyle(t.status)}>{t.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-4 w-4" /> New Ticket
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={submitTicket} className="space-y-3">
                      <div>
                        <Label>Subject</Label>
                        <Input value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="Brief description" />
                      </div>
                      <div>
                        <Label>Message</Label>
                        <Textarea value={ticketMsg} onChange={(e) => setTicketMsg(e.target.value)} rows={4} placeholder="Describe your issue…" />
                      </div>
                      <Button type="submit" className="w-full">Submit Ticket</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Billing */}
            <TabsContent value="billing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground border-b">
                        <tr>
                          <th className="py-2 pr-4">Transaction</th>
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Plan</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Method</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-mono text-xs">{t.id}</td>
                            <td className="py-3 pr-4">{t.date}</td>
                            <td className="py-3 pr-4">{t.plan}</td>
                            <td className="py-3 pr-4 font-medium">{t.amount}</td>
                            <td className="py-3 pr-4">{t.method}</td>
                            <td className="py-3 pr-4">
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> {t.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Button size="sm" variant="ghost"><FileText className="h-4 w-4 mr-1" />Receipt</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
