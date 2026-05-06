import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Settings,
  ChevronDown,
  LifeBuoy,
  MessageSquare,
  Phone,
  Mail,
  Paintbrush,
  Scale,
  FileText,
  Grid3X3,
  Calculator,
  BarChart3,
  Users,
  LayoutDashboard,
  Globe,
  RotateCcw,
  Info,
  XCircle,
} from 'lucide-react';
import logo from '@/assets/logo-icon.png';

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navSections: NavSection[] = [
  {
    title: 'Support',
    icon: LifeBuoy,
    items: [
      { name: 'Support Tickets', href: '/master-admin/support-tickets', icon: MessageSquare },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { name: 'System Setup', href: '/master-admin/system-setup', icon: Settings },
      { name: 'Contact Page Settings', href: '/master-admin/contact-settings', icon: Phone },
      { name: 'Email & Branding', href: '/master-admin/branding', icon: Paintbrush },
    ],
  },
  {
    title: 'Legal Database',
    icon: Scale,
    items: [
      { name: 'Acts & Laws', href: '/master-admin/acts-laws', icon: Scale },
      { name: 'Case Summaries', href: '/master-admin/case-summaries', icon: FileText },
      { name: 'Summary Categories', href: '/master-admin/summary-categories', icon: Grid3X3 },
    ],
  },
  {
    title: 'Tools',
    icon: Calculator,
    items: [
      { name: 'Calculators', href: '/master-admin/calculators', icon: Calculator },
    ],
  },
  {
    title: 'Communications',
    icon: Mail,
    items: [
      { name: 'Contact Submissions', href: '/master-admin/contact-submissions', icon: Mail },
      { name: 'Email Templates', href: '/master-admin/email-templates', icon: Mail },
      { name: 'Newsletter Subscribers', href: '/master-admin/newsletter', icon: Users },
    ],
  },
  {
    title: 'Homepage',
    icon: LayoutDashboard,
    items: [
      { name: 'Hero Sections', href: '/master-admin/hero', icon: LayoutDashboard },
    ],
  },
];

// Build last 7 days with mock scatter events
const buildActivity = () => {
  const days: { date: string; label: string; events: number[] }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // a few mock event values normalized -1 .. 1
    const count = Math.floor(Math.random() * 4);
    const events = Array.from({ length: count }, () => +(Math.random() * 1.6 - 0.8).toFixed(2));
    days.push({ date: d.toISOString(), label, events });
  }
  return days;
};

const failedPayments = [
  {
    id: 'TXN-90213',
    email: 'rajesh.shrestha@gmail.com',
    amount: 'NPR 1,999',
    plan: 'Premium',
    reason: 'Insufficient funds',
    date: '2026-04-28',
  },
  {
    id: 'TXN-90187',
    email: 'sita.karki@outlook.com',
    amount: 'NPR 499',
    plan: 'Basic',
    reason: 'Gateway timeout (eSewa)',
    date: '2026-04-25',
  },
  {
    id: 'TXN-90142',
    email: 'binod.thapa@yahoo.com',
    amount: 'NPR 4,999',
    plan: 'Enterprise',
    reason: 'Card declined',
    date: '2026-04-19',
  },
];

const MasterAdmin = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([
    'Support',
    'Settings',
    'Legal Database',
    'Tools',
    'Communications',
    'Homepage',
  ]);

  const activity = useMemo(buildActivity, []);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  // Chart geometry
  const chartH = 260;
  const chartW = 100; // percentage based; x positions are percent
  const yToPct = (v: number) => ((1 - (v + 1) / 2) * 100); // -1..1 -> 100..0

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card fixed h-screen overflow-y-auto">
        {/* Logo - image only, no text */}
        <div className="p-4 border-b border-border flex items-center justify-center">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="TaxLexis Advisory" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navSections.map((section) => (
            <Collapsible
              key={section.title}
              open={openSections.includes(section.title)}
              onOpenChange={() => toggleSection(section.title)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary rounded-lg transition-colors">
                <span className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  {section.title}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform text-muted-foreground',
                    openSections.includes(section.title) && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-2 space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Language">
                <Globe className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  SA
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of platform activity, content, and recent failed transactions.
            </p>
          </div>

          {/* Activity Scatter Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex" style={{ height: chartH }}>
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-[11px] text-muted-foreground pr-3 select-none">
                  {['1.0', '0.8', '0.6', '0.4', '0.2', '0', '-0.2', '-0.4', '-0.6', '-0.8', '-1.0'].map((v) => (
                    <span key={v} className="leading-none">{v}</span>
                  ))}
                </div>

                {/* Plot area */}
                <div className="flex-1 relative border-l border-b border-border">
                  {/* Horizontal grid */}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'absolute left-0 right-0 border-t',
                        i === 5 ? 'border-border' : 'border-dashed border-border/50'
                      )}
                      style={{ top: `${(i / 10) * 100}%` }}
                    />
                  ))}

                  {/* Vertical day separators + dots */}
                  {activity.map((day, idx) => {
                    const xPct = ((idx + 0.5) / activity.length) * 100;
                    return (
                      <div key={day.date}>
                        {/* vertical guide */}
                        <div
                          className="absolute top-0 bottom-0 border-l border-dashed border-border/40"
                          style={{ left: `${(idx / activity.length) * 100}%` }}
                        />
                        {/* event dots */}
                        {day.events.map((v, i) => (
                          <span
                            key={i}
                            className="absolute h-2.5 w-2.5 rounded-full bg-primary -translate-x-1/2 -translate-y-1/2 ring-2 ring-background"
                            style={{ left: `${xPct}%`, top: `${yToPct(v)}%` }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="flex mt-2 pl-10">
                {activity.map((d, idx) => (
                  <span
                    key={d.date}
                    className="flex-1 text-center text-[11px] text-muted-foreground"
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Events
              </div>
            </CardContent>
          </Card>

          {/* Content Overview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Content Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">About Sections</span>
                  </div>
                  <p className="text-4xl font-bold mt-2">1</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Contact (7d)</span>
                  </div>
                  <p className="text-4xl font-bold mt-2">3</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Contact (Total)</span>
                  </div>
                  <p className="text-4xl font-bold mt-2">19</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Failed Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Recent Failed Payments (30d)
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Payments that failed within the last 30 days. Use Retry to reattempt charge.
                </p>
              </div>
              <Badge variant="secondary">{failedPayments.length} failed</Badge>
            </CardHeader>
            <CardContent>
              {failedPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p>No failed payments</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.email}</TableCell>
                          <TableCell>{p.amount}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.plan}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.reason}</TableCell>
                          <TableCell className="text-muted-foreground">{p.date}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="gap-1">
                              <RotateCcw className="h-3.5 w-3.5" />
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MasterAdmin;
