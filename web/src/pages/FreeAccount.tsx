import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { userHomeHref } from '@/lib/userHomeRoute';
import { accountTypeDisplayLine, firstGreetingName, userInitials } from '@/lib/userDisplay';
import { Sparkles, Lock, BookOpen, Bell, LogOut, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import logo from '@/assets/logo-icon.png';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';

const FreeAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    const next = userHomeHref(user);
    if (next !== '/account') navigate(next, { replace: true });
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold">My Account</span>
              <span className="text-[11px] text-muted-foreground truncate">{accountTypeDisplayLine(user)}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 h-9 gap-1 px-2 sm:px-3"
              onClick={() => navigate('/')}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Browse Site</span>
            </Button>
            <SiteThemeToggle />
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-semibold">{userInitials(user)}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await logout();
                    navigate('/login');
                  } catch (e) {
                    toast({
                      title: 'Could not sign out',
                      description: e instanceof Error ? e.message : 'Try again in a moment.',
                      variant: 'destructive',
                    });
                  }
                })();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {firstGreetingName(user)}</h1>
          <p className="text-muted-foreground">You're on the Free plan. Upgrade to unlock the full library.</p>
        </div>

        <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent border-amber-500/30">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center"><Sparkles className="h-6 w-6 text-amber-600" /></div>
              <div>
                <Badge variant="secondary" className="mb-2">Free Plan</Badge>
                <h2 className="text-xl font-bold">Get unlimited access</h2>
                <p className="text-sm text-muted-foreground mt-1">Full Acts, expert case analysis, downloadable PDFs and more.</p>
              </div>
            </div>
            <Button onClick={() => navigate('/pricing')}>Upgrade now <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />What you can do today</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Browse law titles & TOC</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Read short case summaries</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Use free tax calculators</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Read public articles & news</div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30">
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-amber-600" />Locked premium features</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" /> Full Act text (bilingual)</div>
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" /> Expert case analysis</div>
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" /> Download PDFs</div>
              <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-600" /> Bookmark + advanced search</div>
              <Button size="sm" className="mt-3 w-full" onClick={() => navigate('/pricing')}>See plans & pricing</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Continue exploring</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link to="/laws"><Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><BookOpen className="h-5 w-5 text-primary-onBg mb-2" /><div className="font-medium">Laws & Acts</div></CardContent></Card></Link>
            <Link to="/summaries-list"><Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><BookOpen className="h-5 w-5 text-primary-onBg mb-2" /><div className="font-medium">Case Summaries</div></CardContent></Card></Link>
            <Link to="/tools"><Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><BookOpen className="h-5 w-5 text-primary-onBg mb-2" /><div className="font-medium">Calculators</div></CardContent></Card></Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FreeAccount;
