import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import {
  accountTypeDisplayLine,
  roleDisplayLabel,
  userDisplayName,
  userInitials,
} from '@/lib/userDisplay';
import { fetchAuthDashboard, postAuthNotificationMarkRead } from '@/lib/api';
import { ArrowLeft, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CmsAvatarImage } from '@/components/CmsImage';
import logo from '@/assets/logo-icon.png';
import { useToast } from '@/hooks/use-toast';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';
import { useEffect, useRef, useState } from 'react';
import { subscriberHubHeaderTitle, subscriberHubPath } from '@/lib/subscriberPortalPaths';

function safeFormatDistance(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function notificationTone(type: string | null | undefined): { label: string; badgeClass: string; cardClass: string } {
  const t = (type || 'info').toLowerCase();
  if (t === 'system') {
    return {
      label: 'System',
      badgeClass: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
      cardClass: 'border-slate-300/70 dark:border-slate-700',
    };
  }
  if (t === 'warning') {
    return {
      label: 'Warning',
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
      cardClass: 'border-amber-300/70 dark:border-amber-800/70',
    };
  }
  if (t === 'success') {
    return {
      label: 'Success',
      badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
      cardClass: 'border-emerald-300/70 dark:border-emerald-800/70',
    };
  }
  return {
    label: 'Info',
    badgeClass: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
    cardClass: 'border-blue-300/70 dark:border-blue-800/70',
  };
}

const SubscriberNotificationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const { toast } = useToast();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const markReadPostedForId = useRef<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth-dashboard', user?.id],
    queryFn: fetchAuthDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const notification = data?.notifications?.find((n) => n.id === id);
  const unread = typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;
  const tone = notificationTone(notification?.type);

  useEffect(() => {
    if (!id || !user || !notification || notification.read) return;
    if (markReadPostedForId.current === id) return;
    markReadPostedForId.current = id;
    let cancelled = false;
    void (async () => {
      try {
        await postAuthNotificationMarkRead(id);
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ['auth-dashboard', user.id] });
        await refreshUser({ silent: true });
      } catch {
        markReadPostedForId.current = null;
      }
    })();
    return () => {
      cancelled = true;
      markReadPostedForId.current = null;
    };
  }, [id, user, notification?.id, notification?.read, queryClient, refreshUser]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to={hubPath} className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-lg">{subscriberHubHeaderTitle(location.pathname, user)}</span>
              <span className="text-[11px] text-muted-foreground truncate">{accountTypeDisplayLine(user)}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SiteThemeToggle />
            <Button variant="ghost" size="icon" className="relative" type="button" asChild>
              <Link to={hubPath}>
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => navigate(`${hubPath}/profile`)}
              className="flex items-center gap-2 rounded-lg pr-1 py-0.5 pl-1 sm:pl-2 -mr-0.5 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open profile settings"
            >
              <div className="hidden sm:flex flex-col items-end max-w-[180px] mr-0.5">
                <span className="text-sm font-medium truncate w-full text-end">{userDisplayName(user)}</span>
                <span className="text-xs text-muted-foreground">{roleDisplayLabel(user.role)}</span>
              </div>
              <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
                {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">{userInitials(user)}</AvatarFallback>
              </Avatar>
            </button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setSignOutOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out on this device. To use your account again, you will need to sign in with your email,
              phone code, or Google account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void (async () => {
                  try {
                    await logout();
                    setSignOutOpen(false);
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
              Sign out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link to={hubPath}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {hubPath === '/client' ? 'Back to client portal' : 'Back to dashboard'}
          </Link>
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading notification…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">Could not load notification. Try again later.</p>
        ) : null}

        {!isLoading && !error && !notification ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">This alert may have been removed or the link is invalid.</p>
              <Button asChild>
                <Link to={hubPath}>{hubPath === '/client' ? 'Return to client portal' : 'Return to dashboard'}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {notification ? (
          <Card className={tone.cardClass}>
            <CardHeader className="space-y-1">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notification.read ? 'bg-muted-foreground/40' : 'bg-primary'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl leading-snug">{notification.title}</CardTitle>
                    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${tone.badgeClass}`}>
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{safeFormatDistance(notification.created_at)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notification.body ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{notification.body}</div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No additional details.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default SubscriberNotificationDetail;
