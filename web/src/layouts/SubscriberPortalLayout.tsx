import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  accountTypeDisplayLine,
  firstGreetingName,
  roleDisplayLabel,
  userDisplayName,
  userInitials,
} from '@/lib/userDisplay';
import { fetchAuthDashboard, type AuthDashboardNotification, type AuthMeUser } from '@/lib/api';
import { subscriberHubHeaderTitle, subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CmsAvatarImage } from '@/components/CmsImage';
import logo from '@/assets/logo-icon.png';
import { useToast } from '@/hooks/use-toast';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { evaluatePortalModuleView, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';
import { buildPortalSidebarNav, type BuiltPortalNavItem } from '@/lib/subscriberPortalNav';

const NOTIF_QUEUE_PARAM = 'notif_queue';

function portalNavItemIsActive(
  pathname: string,
  search: string,
  hubPath: '/dashboard' | '/client',
  item: BuiltPortalNavItem,
): boolean {
  if (item.module === 'Dashboard') {
    if (pathname !== hubPath) return false;
    const t = new URLSearchParams(search).get('tab');
    return !t || t === 'activity';
  }
  if (item.module === 'Pricing Plans') {
    return pathname === hubPath && new URLSearchParams(search).get('tab') === 'wallet';
  }
  if (item.module === 'Transactions') {
    return pathname === hubPath && new URLSearchParams(search).get('tab') === 'billing';
  }
  try {
    const url = new URL(item.to, 'http://local');
    if (pathname !== url.pathname) return false;
    const want = new URLSearchParams(url.search);
    if ([...want].length === 0) return true;
    const have = new URLSearchParams(search);
    for (const [k, v] of want) {
      if (have.get(k) !== v) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function parseNotifQueue(raw: string | null): string[] {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeFormatDistance(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function notificationTypeBadge(type: string | null | undefined): { label: string; className: string } {
  const t = (type || 'info').toLowerCase();
  if (t === 'system') return { label: 'System', className: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100' };
  if (t === 'warning') return { label: 'Warning', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' };
  if (t === 'success') return { label: 'Success', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' };
  return { label: 'Info', className: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' };
}

function SidebarNav({
  hubPath,
  user,
  onNavigate,
  className,
}: {
  hubPath: '/dashboard' | '/client';
  user: AuthMeUser;
  onNavigate?: () => void;
  className?: string;
}) {
  const location = useLocation();
  const { overview, site } = buildPortalSidebarNav(user, hubPath);

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
      active
        ? 'bg-primary text-primary-foreground shadow-md'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    );

  const navLinkClass = (item: BuiltPortalNavItem) =>
    linkClass(portalNavItemIsActive(location.pathname, location.search, hubPath, item));

  return (
    <nav className={cn('flex flex-col gap-1 p-3', className)} aria-label="Portal navigation">
      {overview.length ? (
        <>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overview</p>
          {overview.map((item) => (
            <NavLink
              key={item.module}
              to={item.to}
              end={item.end}
              className={() => navLinkClass(item)}
              onClick={onNavigate}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.module}
            </NavLink>
          ))}
        </>
      ) : null}

      {site.length ? (
        <>
          <p
            className={cn(
              'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
              overview.length ? 'mt-4' : '',
            )}
          >
            Site
          </p>
          {site.map((item) => (
            <NavLink key={item.module} to={item.to} className={() => navLinkClass(item)} onClick={onNavigate}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.module}
            </NavLink>
          ))}
        </>
      ) : null}

      {overview.length === 0 && site.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground leading-snug">
          No portal links for your role yet. Enable <span className="font-medium text-foreground">view</span> on modules
          in Admin → Roles & Permissions, then refresh or return to this tab.
        </p>
      ) : null}
    </nav>
  );
}

/**
 * Shared shell for `/client` and `/dashboard`: persistent sidebar (desktop) + drawer (mobile),
 * unified header — sidebar routing matches the admin panel (dedicated paths per section).
 */
export default function SubscriberPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, logout, refreshUser } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hubPath = subscriberHubPath(location.pathname) as '/dashboard' | '/client';

  useEffect(() => {
    void refreshUser({ silent: true });
  }, [hubPath, refreshUser]);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        void refreshUser({ silent: true });
      }, 350);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(debounce);
    };
  }, [refreshUser]);
  const showNotifBell = evaluatePortalModuleView(user, PORTAL_PERM_MODULES.notifications);
  const showProfileShortcut = evaluatePortalModuleView(user, PORTAL_PERM_MODULES.profile);

  const { data } = useQuery({
    queryKey: ['auth-dashboard', user?.id],
    queryFn: fetchAuthDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const notifications = data?.notifications ?? [];

  const unread = user && typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;

  const enqueueBellNotification = (id: string) => {
    const nextParams = new URLSearchParams();
    const q = parseNotifQueue(new URLSearchParams(location.search).get(NOTIF_QUEUE_PARAM));
    const next = q.includes(id) ? q : [...q, id];
    if (next.length) nextParams.set(NOTIF_QUEUE_PARAM, next.join(','));
    const search = nextParams.toString() ? `?${nextParams.toString()}` : '';
    navigate({ pathname: `${hubPath}/notifications`, search }, { replace: true });
    setNotifOpen(false);
    setMobileOpen(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {user.is_staff ? (
        <div className="border-b border-primary/20 bg-primary/5">
          <div className="max-w-[1600px] mx-auto px-4 py-2.5 text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left sm:justify-start">
            <span>
              You are signed in as <span className="font-medium text-foreground">{roleDisplayLabel(user.role)}</span>{' '}
              (staff). Site management lives in the admin panel.
            </span>
            <Link to="/admin" className="font-medium text-primary underline-offset-4 hover:underline shrink-0">
              Open admin panel
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-theme(spacing.0))]">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card/40">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <img src={logo} alt="" className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{subscriberHubHeaderTitle(location.pathname, user)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{firstGreetingName(user)}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav hubPath={hubPath} user={user} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
            <div className="flex max-w-[1600px] mx-auto items-center justify-between gap-2 px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden shrink-0" type="button" aria-label="Open menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 flex flex-col">
                    <div className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
                      <img src={logo} alt="" className="h-8 w-8 shrink-0" />
                      <span className="font-semibold text-sm truncate">{subscriberHubHeaderTitle(location.pathname, user)}</span>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      <SidebarNav hubPath={hubPath} user={user} onNavigate={() => setMobileOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>

                <Link to={hubPath} className="hidden sm:flex items-center gap-2 min-w-0 lg:hidden">
                  <img src={logo} alt="" className="h-8 w-8 shrink-0" />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="font-bold text-base truncate">{subscriberHubHeaderTitle(location.pathname, user)}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {hubPath === '/client'
                        ? `${roleDisplayLabel(user.role)} · ${accountTypeDisplayLine(user)}`
                        : user.is_staff
                          ? `${roleDisplayLabel(user.role)} · ${accountTypeDisplayLine(user)}`
                          : accountTypeDisplayLine(user)}
                    </span>
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                <SiteThemeToggle />
                {showNotifBell ? (
                  <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" type="button">
                        <Bell className="h-5 w-5" />
                        {unread > 0 ? (
                          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        ) : null}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0 text-popover-foreground bg-popover border-border">
                      <div className="p-3 border-b border-border">
                        <h4 className="text-sm font-semibold">Notifications</h4>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          Tap an item to queue it on your Notifications page. Open the full message from there.
                        </p>
                      </div>
                      <div className="max-h-[min(22rem,calc(100vh-12rem))] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-muted-foreground text-center">No notifications yet.</p>
                        ) : (
                          notifications.map((n: AuthDashboardNotification) => (
                            <div
                              key={n.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => enqueueBellNotification(n.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  enqueueBellNotification(n.id);
                                }
                              }}
                              className={cn(
                                'flex items-start gap-3 p-3 mx-1 mb-1 rounded-md border border-transparent hover:bg-accent/50 transition-colors cursor-pointer text-left',
                                !n.read && 'bg-primary/5',
                              )}
                            >
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full mt-2 shrink-0',
                                  n.read ? 'bg-muted-foreground/50' : 'bg-primary',
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</p>
                                  <Badge className={cn('h-5 px-1.5 text-[10px]', notificationTypeBadge(n.type).className)}>
                                    {notificationTypeBadge(n.type).label}
                                  </Badge>
                                </div>
                                {n.body ? (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                                ) : null}
                                <p className="text-xs text-muted-foreground mt-1">{safeFormatDistance(n.created_at)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button variant="ghost" size="sm" className="w-full text-primary-onBg h-9 text-xs" asChild>
                          <Link to={`${hubPath}/notifications`} onClick={() => setNotifOpen(false)}>
                            Open notifications
                          </Link>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
                {showProfileShortcut ? (
                  <button
                    type="button"
                    onClick={() => navigate(`${hubPath}/profile`)}
                    className="flex items-center gap-2 rounded-lg pr-1 py-0.5 pl-0.5 sm:pl-2 -mr-0.5 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Open profile settings"
                  >
                    <div className="hidden sm:flex flex-col items-end max-w-[140px] md:max-w-[180px] mr-0.5">
                      <span className="text-sm font-medium truncate w-full text-end">{userDisplayName(user)}</span>
                      <span className="text-xs text-muted-foreground">{roleDisplayLabel(user.role)}</span>
                    </div>
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
                      {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">{userInitials(user)}</AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg pr-1 py-0.5 pl-0.5 sm:pl-2 -mr-0.5">
                    <div className="hidden sm:flex flex-col items-end max-w-[140px] md:max-w-[180px] mr-0.5">
                      <span className="text-sm font-medium truncate w-full text-end">{userDisplayName(user)}</span>
                      <span className="text-xs text-muted-foreground">{roleDisplayLabel(user.role)}</span>
                    </div>
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
                      {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">{userInitials(user)}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <Button variant="ghost" size="sm" type="button" onClick={() => setSignOutOpen(true)}>
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>

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
    </div>
  );
}
