import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import {
  accountTypeDisplayLine,
  firstGreetingName,
  planTierLabel,
  roleDisplayLabel,
  subscriberDashboardSubtitle,
  userDisplayName,
  userInitials,
} from '@/lib/userDisplay';
import { fetchAuthDashboard, type AuthDashboardPayload, type AuthDashboardNotification, type AuthMeUser } from '@/lib/api';
import {
  canAccessCaseSummaries,
  canAccessLawsLibrary,
  canAccessProcedures,
  canAccessTaxTools,
  hasLibraryEntitlement,
  hasPremiumBillingActive,
  shouldRecommendRenewal,
} from '@/lib/subscriptionAccess';
import { subscriberHubHeaderTitle, subscriberHubPath } from '@/lib/subscriberPortalPaths';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  FileText,
  Bell,
  LifeBuoy,
  LogOut,
  Calculator,
  Scale,
  Clock,
  Star,
  ChevronRight,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CmsAvatarImage } from '@/components/CmsImage';
import logo from '@/assets/logo-icon.png';
import { useToast } from '@/hooks/use-toast';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import DashboardWalletForm, { type WalletBillingCycle } from '@/components/dashboard/DashboardWalletForm';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';

const quickLinks: {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  canAccess: (u: AuthMeUser) => boolean;
  lockedHint: string;
}[] = [
  {
    icon: Scale,
    label: 'Laws Library',
    href: '/laws',
    color: 'text-blue-600 bg-blue-50',
    canAccess: (u) => canAccessLawsLibrary(u),
    lockedHint: 'Subscribe to unlock the laws library.',
  },
  {
    icon: FileText,
    label: 'Case Summaries',
    href: '/summaries',
    color: 'text-emerald-600 bg-emerald-50',
    canAccess: (u) => canAccessCaseSummaries(u),
    lockedHint: 'Subscribe to unlock case summaries.',
  },
  {
    icon: Calculator,
    label: 'Tax Tools',
    href: '/tools',
    color: 'text-purple-600 bg-purple-50',
    canAccess: (u) => canAccessTaxTools(u),
    lockedHint: 'Subscribe to unlock tax tools.',
  },
  {
    icon: BookOpen,
    label: 'Procedures',
    href: '/procedures',
    color: 'text-orange-600 bg-orange-50',
    canAccess: (u) => canAccessProcedures(u),
    lockedHint: 'Subscribe to unlock procedures.',
  },
];

function safeFormatDistance(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function safeFormatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return null;
  }
}

function libraryProgressValue(user: AuthMeUser): number {
  if (!hasLibraryEntitlement(user)) return 22;
  if (!user.plan_benefits_end) return 100;
  try {
    const endMs = parseISO(user.plan_benefits_end).getTime();
    const now = Date.now();
    if (now >= endMs) return 0;
    const premiumEndMs = user.subscription_period_end
      ? parseISO(user.subscription_period_end).getTime()
      : endMs - 30 * 86400000;
    if (now <= premiumEndMs) return 100;
    const span = endMs - premiumEndMs;
    if (span <= 0) return 100;
    const remaining = (endMs - now) / span;
    return Math.max(10, Math.min(100, Math.round(remaining * 100)));
  } catch {
    return hasLibraryEntitlement(user) ? 100 : 22;
  }
}

function paymentMethodLabel(method: string): string {
  const m = (method || '').toLowerCase();
  if (m === 'esewa') return 'eSewa';
  if (m === 'khalti') return 'Khalti';
  if (m === 'bank') return 'Bank';
  if (m === 'stripe') return 'Stripe';
  return method || '—';
}

function notificationTypeBadge(type: string | null | undefined): { label: string; className: string } {
  const t = (type || 'info').toLowerCase();
  if (t === 'system') return { label: 'System', className: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100' };
  if (t === 'warning') return { label: 'Warning', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' };
  if (t === 'success') return { label: 'Success', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' };
  return { label: 'Info', className: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' };
}

function billingStatusBadge(status: string): { label: string; className: string } {
  const s = (status || '').toLowerCase();
  if (s === 'verified')
    return { label: 'Verified', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' };
  if (s === 'pending')
    return { label: 'Pending', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' };
  if (s === 'rejected')
    return { label: 'Rejected', className: 'bg-destructive/15 text-destructive' };
  if (s === 'refunded')
    return { label: 'Refunded', className: 'bg-muted text-muted-foreground' };
  return { label: status || '—', className: 'bg-muted' };
}

const emptyDash = (label: string) => (
  <p className="text-sm text-muted-foreground py-8 text-center">{label}</p>
);

const DASH_TABS = new Set(['activity', 'notifications', 'wallet', 'billing']);
/** Bell â†’ dashboard tab: notification ids queued for the Notifications tab (comma-separated in URL). */
const NOTIF_QUEUE_PARAM = 'notif_queue';

function parseNotifQueue(raw: string | null): string[] {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeDashboardTabParam(raw: string | null): string | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'billing portal') return 'billing';
  return raw.trim().toLowerCase();
}

function parseWalletBillingParam(v: string | null): WalletBillingCycle | null {
  if (v === 'yearly' || v === 'six_month' || v === 'monthly') return v;
  return null;
}

function catalogStatDisplay(count: number | undefined, isLoading: boolean, hasError: boolean): string {
  if (hasError) return '—';
  if (typeof count === 'number') return count.toLocaleString();
  return isLoading ? '—' : '0';
}

const SubscriberDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { config, loading: siteConfigLoading } = useSiteConfig();
  const { toast } = useToast();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifSigRef = useRef<string>('');
  const { user, logout, refreshUser } = useAuth();

  const tabParam = normalizeDashboardTabParam(searchParams.get('tab'));
  const activeTab = tabParam && DASH_TABS.has(tabParam) ? tabParam : 'activity';
  const walletInitialBilling = parseWalletBillingParam(searchParams.get('billing'));

  const setActiveTab = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', v);
        return p;
      },
      { replace: true }
    );
  };

  const removeQueuedNotifIds = (idsToRemove: string[]) => {
    if (!idsToRemove.length) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        const q = parseNotifQueue(p.get(NOTIF_QUEUE_PARAM)).filter((id) => !idsToRemove.includes(id));
        if (q.length) p.set(NOTIF_QUEUE_PARAM, q.join(','));
        else p.delete(NOTIF_QUEUE_PARAM);
        return p;
      },
      { replace: true }
    );
  };

  const enqueueBellNotification = (id: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'notifications');
        const q = parseNotifQueue(p.get(NOTIF_QUEUE_PARAM));
        const next = q.includes(id) ? q : [...q, id];
        if (next.length) p.set(NOTIF_QUEUE_PARAM, next.join(','));
        return p;
      },
      { replace: true }
    );
    setNotifOpen(false);
  };

  const openNotificationDetailFromTab = (n: AuthDashboardNotification) => {
    removeQueuedNotifIds([n.id]);
    navigate(`${hubPath}/notifications/${n.id}`);
  };

  const paymentsEnabled = config?.payments_enabled === true;
  const esewaEnabled = config?.esewa_enabled === true;

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth-dashboard', user?.id],
    queryFn: fetchAuthDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const es = searchParams.get('esewa');
    if (!es) return;
    if (es === 'success') {
      const inv = searchParams.get('invoice');
      toast({
        title: 'Payment received',
        description: inv ? `Invoice ${inv} was confirmed via eSewa.` : 'eSewa confirmed your payment.',
      });
    } else if (es === 'cancelled') {
      toast({ title: 'Payment cancelled', description: 'You can try again from the Wallet tab when ready.' });
    } else if (es === 'unverified' || es === 'invalid' || es === 'unknown') {
      toast({
        title: 'Payment could not be confirmed',
        description: 'If money left your eSewa wallet, contact support with your invoice number.',
        variant: 'destructive',
      });
    }
    void queryClient.invalidateQueries({ queryKey: ['auth-dashboard', user?.id] });
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('esewa');
        p.delete('invoice');
        return p;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams, toast, queryClient, user?.id]);

  const notifications = data?.notifications ?? [];
  const billing = data?.billing ?? [];
  const notifQueueRaw = searchParams.get(NOTIF_QUEUE_PARAM);
  const queuedIds = useMemo(() => parseNotifQueue(notifQueueRaw), [notifQueueRaw]);
  const queuedNotifications = useMemo(
    () =>
      queuedIds
        .map((nid) => notifications.find((n) => n.id === nid))
        .filter((n): n is AuthDashboardNotification => Boolean(n)),
    [queuedIds, notifications]
  );
  const tabQueuedIdSet = useMemo(() => new Set(queuedNotifications.map((n) => n.id)), [queuedNotifications]);
  const restNotifications = useMemo(
    () => notifications.filter((n) => !tabQueuedIdSet.has(n.id)),
    [notifications, tabQueuedIdSet]
  );

  const notifSig = useMemo(
    () => notifications.map((n) => `${n.id}:${n.read ? '1' : '0'}`).join('|'),
    [notifications]
  );
  const billingSig = useMemo(
    () =>
      billing
        .map((r) => `${r.id}:${(r.status || '').toLowerCase()}:${r.created_at}`)
        .join('|'),
    [billing]
  );

  useEffect(() => {
    if (!user || !notifSig) return;
    if (notifSigRef.current === notifSig) return;
    const prev = notifSigRef.current;
    notifSigRef.current = notifSig;
    if (prev === '') return;
    void refreshUser({ silent: true });
  }, [notifSig, user, refreshUser]);

  const billingSigRef = useRef<string>('');
  useEffect(() => {
    if (!user || !billingSig) return;
    if (billingSigRef.current === billingSig) return;
    const prev = billingSigRef.current;
    billingSigRef.current = billingSig;
    if (prev === '') return;
    // Keep auth/me entitlement fields in sync when billing rows are verified/rejected.
    void refreshUser({ silent: true });
  }, [billingSig, user, refreshUser]);

  const unreadForStats =
    user && typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;
  const statCards = useMemo(
    () => [
      {
        icon: BookOpen as LucideIcon,
        label: 'Laws Available',
        value: catalogStatDisplay(data?.laws_count, isLoading, Boolean(error)),
      },
      {
        icon: FileText as LucideIcon,
        label: 'Case Summaries',
        value: catalogStatDisplay(data?.case_summaries_count, isLoading, Boolean(error)),
      },
      {
        icon: Bell as LucideIcon,
        label: 'Unread alerts',
        value: String(unreadForStats),
      },
    ],
    [data?.laws_count, data?.case_summaries_count, isLoading, error, unreadForStats]
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const dash: AuthDashboardPayload | undefined = data;
  const planLabel = planTierLabel(user.plan);
  const hasLibraryAccess = hasLibraryEntitlement(user);
  const premiumActive = hasPremiumBillingActive(user);
  const renewRecommended = shouldRecommendRenewal(user);
  const unread = typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;
  const progressVal = libraryProgressValue(user);

  const benefitsEndLabel = safeFormatDate(user.plan_benefits_end ?? null);
  const premiumEndLabel = safeFormatDate(user.subscription_period_end ?? null);

  const pendingPackages =
    dash?.billing?.filter((r) => (r.status || '').toLowerCase() === 'pending') ?? [];
  const hasPendingVerification = pendingPackages.length > 0 && !hasLibraryAccess;
  const hasPendingSubscriptionCheckout = pendingPackages.length > 0;
  const walletCheckoutBlockedMessage = hasPendingSubscriptionCheckout
    ? 'You already have a subscription payment in progress (pending invoice). Complete eSewa checkout or wait for verification before starting another purchase.'
    : null;
  const hadVerifiedSubscription =
    (dash?.billing ?? []).some((r) => (r.status || '').toLowerCase() === 'verified') ?? false;
  const packageEndedShowRenewal =
    !user.is_staff && !hasLibraryAccess && hadVerifiedSubscription && (user.plan || 'free').toLowerCase() === 'free';

  const subscriptionBlurb = (() => {
    if (hasPendingVerification) {
      return esewaEnabled
        ? 'A payment is still marked pending. If you just paid with eSewa, refresh in a moment; otherwise contact support.'
        : 'Your package payment is awaiting Super Admin verification. Full library access starts only after approval.';
    }
    if (!hasLibraryAccess) {
      return 'Upgrade on the pricing page to unlock case summaries, tools, and more.';
    }
    if (renewRecommended && benefitsEndLabel) {
      return `Your paid period has ended. Full library access continues from your package until ${benefitsEndLabel}.`;
    }
    if (premiumActive && premiumEndLabel) {
      return `Your paid subscription is active through ${premiumEndLabel}. Manage billing or change your plan anytime.`;
    }
    if (premiumActive) {
      return 'Your subscription is active. Manage billing or change your plan anytime.';
    }
    if (hasLibraryAccess) {
      return 'You have full library access from your current plan benefits.';
    }
    return '';
  })();

  return (
    <div className="min-h-screen bg-background">
      {user.is_staff ? (
        <div className="border-b border-primary/20 bg-primary/5">
          <div className="max-w-7xl mx-auto px-4 py-2.5 text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left sm:justify-start">
            <span>
              You are signed in as <span className="font-medium text-foreground">{roleDisplayLabel(user)}</span> (staff). Site
              management and role-based tools live in the admin panel.
            </span>
            <Link to="/admin" className="font-medium text-primary-onBg underline-offset-4 hover:underline shrink-0">
              Open admin panel
            </Link>
          </div>
        </div>
      ) : null}
      <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-lg">{subscriberHubHeaderTitle(location.pathname, user)}</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {hubPath === '/client'
                  ? `${roleDisplayLabel(user.role)} · ${accountTypeDisplayLine(user)}`
                  : user.is_staff
                    ? `${roleDisplayLabel(user.role)} · ${accountTypeDisplayLine(user)}`
                    : accountTypeDisplayLine(user)}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SiteThemeToggle />
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
                    Tap an item to add it to the Notifications tab on this page. Open the full message from that tab.
                  </p>
                </div>
                <div className="max-h-[min(22rem,calc(100vh-12rem))] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
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
                          !n.read && 'bg-primary/5'
                        )}
                      >
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full mt-2 shrink-0',
                            n.read ? 'bg-muted-foreground/50' : 'bg-primary'
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
                    <Link to={`${hubPath}?tab=notifications`} onClick={() => setNotifOpen(false)}>
                      {hubPath === '/client' ? 'View on client portal' : 'View on dashboard'}
                    </Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {hasPendingVerification ? (
          <Alert className="border-amber-500/40 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50 dark:border-amber-800/60">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment pending verification</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              A Super Admin must verify your subscription payment before library access is turned on. See the Billing tab
              for invoice status and how long your package will remain valid once approved.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">Welcome back, {firstGreetingName(user)}</h1>
              <Badge variant="secondary" className="font-normal">
                {roleDisplayLabel(user.role)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{subscriberDashboardSubtitle(user)}</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            <ChevronRight className="h-4 w-4 mr-1" />
            Browse Site
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  {planLabel} plan
                </Badge>
                {renewRecommended ? (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-900 dark:text-amber-100">
                    Renew available
                  </Badge>
                ) : null}
                {user.is_staff ? (
                  <Badge variant="outline" className="text-xs">
                    Staff
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-xl font-bold">{hasLibraryAccess ? 'Full library access' : 'Free account'}</h2>
              <p className="text-sm text-muted-foreground mt-1">{subscriptionBlurb}</p>
            </div>
            <div className="w-full md:w-72">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Library access</span>
                <span className="font-medium">{hasLibraryAccess ? 'Active' : 'Limited'}</span>
              </div>
              <Progress value={progressVal} className="h-2" />
              <div className="mt-3 flex flex-col gap-2">
                {renewRecommended ? (
                  <Button size="sm" className="w-full" onClick={() => navigate('/pricing')}>
                    Renew plan
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/pricing')}>
                  {hasLibraryAccess ? (premiumActive ? 'Manage subscription' : 'Extend or change plan') : 'View plans'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((q) => {
            const allowed = user.is_staff || q.canAccess(user);
            const inner = (
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 h-full text-left w-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${q.color}`}>
                    <q.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm">{q.label}</span>
                </CardContent>
              </Card>
            );
            if (allowed) {
              return (
                <Link key={q.label} to={q.href}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={q.label}
                type="button"
                className="block w-full cursor-pointer"
                onClick={() =>
                  toast({
                    title: 'Not included in your package',
                    description: q.lockedHint,
                  })
                }
              >
                {inner}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <DashboardStatCard key={s.label} icon={s.icon} value={s.value} label={s.label} />
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">Could not load dashboard data. Refresh the page or try again later.</p>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!dash?.activity?.length
                  ? emptyDash('No recent activity yet. Payments and other actions you take will appear here.')
                  : dash.activity.map((a) => (
                      <div key={a.id} className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0">
                        <div className="p-2 rounded-lg bg-primary/5">
                          <Clock className="h-4 w-4 text-primary-onBg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{a.object_label}</p>
                          <p className="text-xs text-muted-foreground">{safeFormatDistance(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!notifications.length ? (
                  emptyDash('No notifications yet.')
                ) : (
                  <>
                    {queuedNotifications.length > 0 ? (
                      <div className="space-y-2 pb-3 border-b border-border">
                        <p className="text-xs font-medium text-muted-foreground">From bell</p>
                        {queuedNotifications.map((n) => (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openNotificationDetailFromTab(n)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openNotificationDetailFromTab(n);
                              }
                            }}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-left transition-colors hover:bg-accent/50',
                              !n.read ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/20'
                            )}
                          >
                            <div
                              className={`h-2 w-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-muted-foreground/40' : 'bg-primary'}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{n.title}</p>
                                <Badge className={cn('h-5 px-1.5 text-[10px]', notificationTypeBadge(n.type).className)}>
                                  {notificationTypeBadge(n.type).label}
                                </Badge>
                              </div>
                              {n.body ? <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p> : null}
                              <p className="text-xs text-muted-foreground mt-1">{safeFormatDistance(n.created_at)}</p>
                              <p className="text-[11px] text-primary-onBg mt-1.5">Open full message</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {queuedNotifications.length > 0 ? (
                        <p className="text-xs font-medium text-muted-foreground">All</p>
                      ) : null}
                      {restNotifications.map((n) => (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openNotificationDetailFromTab(n)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openNotificationDetailFromTab(n);
                            }
                          }}
                          className="flex items-start gap-3 border-b pb-2 last:border-0 cursor-pointer rounded-md -mx-1 px-1 hover:bg-accent/40 transition-colors text-left"
                        >
                          <div
                            className={`h-2 w-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-muted-foreground/40' : 'bg-primary'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{n.title}</p>
                              <Badge className={cn('h-5 px-1.5 text-[10px]', notificationTypeBadge(n.type).className)}>
                                {notificationTypeBadge(n.type).label}
                              </Badge>
                            </div>
                            {n.body ? <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p> : null}
                            <p className="text-xs text-muted-foreground mt-1">{safeFormatDistance(n.created_at)}</p>
                            <p className="text-[11px] text-primary-onBg mt-1">Open full message</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wallet &amp; subscription payment</CardTitle>
              </CardHeader>
              <CardContent>
                {siteConfigLoading ? (
                  <p className="text-sm text-muted-foreground py-6">Loading payment settings…</p>
                ) : paymentsEnabled ? (
                  <div className="max-w-3xl">
                    <p className="text-sm text-muted-foreground mb-6">
                      Choose 1, 6, or 12 months and pay with eSewa. This build uses fixed UAT checkout only (see{' '}
                      <span className="font-mono text-xs">esewa_integration.md</span>).
                    </p>
                    <DashboardWalletForm
                      key={esewaEnabled ? 'esewa-on' : 'esewa-off'}
                      userEmail={user.email}
                      esewaEnabled={esewaEnabled}
                      initialBilling={walletInitialBilling}
                      checkoutBlockedMessage={walletCheckoutBlockedMessage}
                      onSubmitted={() => void queryClient.invalidateQueries({ queryKey: ['auth-dashboard', user?.id] })}
                    />
                  </div>
                ) : (
                  <Alert className="border-muted">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Online payments are off</AlertTitle>
                    <AlertDescription className="text-sm mt-1">
                      An administrator has not enabled platform payments yet. You cannot submit a subscription payment
                      until this is turned on under Admin â†’ Settings â†’ Payments. For questions, use{' '}
                      <Link to="/contact" className="text-primary-onBg underline underline-offset-2">
                        Contact
                      </Link>
                      .
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {packageEndedShowRenewal ? (
                  <Alert className="border-destructive/40 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Your package has ended</AlertTitle>
                    <AlertDescription className="text-sm mt-1 space-y-2">
                      <p>
                        Your paid access has expired. Renew or purchase a package again from the Wallet tab to restore
                        library features.
                      </p>
                      <Button size="sm" className="mt-1" onClick={() => setActiveTab('wallet')}>
                        Go to Wallet
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                {!dash?.billing?.length
                  ? emptyDash('No billing history yet. After you subscribe, invoices will appear here.')
                  : dash.billing.map((row) => {
                      const amountNum = Number(row.amount);
                      const badge = billingStatusBadge(row.status);
                      const planPart = row.plan ? planTierLabel(row.plan) : '';
                      const cycle = (row.billing_cycle || 'monthly').toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';
                      const validity = row.package_validity_summary?.trim();
                      return (
                        <div key={row.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 last:border-0">
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{row.invoice}</div>
                            <div className="text-xs text-muted-foreground">
                              {safeFormatDate(row.created_at) ?? '—'} · {paymentMethodLabel(row.method)}
                              {planPart ? ` · ${planPart}` : ''} · {cycle} billing
                            </div>
                            {validity ? (
                              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{validity}</p>
                            ) : null}
                            {row.status?.toLowerCase() === 'rejected' && row.rejection_reason ? (
                              <p className="text-xs text-destructive mt-1.5 leading-relaxed">
                                Not approved: {row.rejection_reason}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-sm">
                              {row.currency} {Number.isFinite(amountNum) ? amountNum.toLocaleString() : row.amount}
                            </span>
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Need Help?</h3>
              <p className="text-sm text-muted-foreground">Our support team is here to assist you.</p>
            </div>
            <Button onClick={() => navigate('/contact')}>
              <LifeBuoy className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubscriberDashboard;
