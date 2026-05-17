import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  parseISO,
  subMonths,
  subYears,
} from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import {
  firstGreetingName,
  planTierLabel,
  roleDisplayLabel,
  subscriberDashboardSubtitle,
} from '@/lib/userDisplay';
import {
  fetchAuthDashboard,
  fetchAuthMyProjects,
  type AuthDashboardPayload,
  type AuthDashboardNotification,
  type AuthMeAdminPermission,
  type AuthMeUser,
} from '@/lib/api';
import {
  canAccessCaseSummaries,
  canAccessLawsLibrary,
  canAccessProcedures,
  canAccessTaxTools,
  hasLibraryEntitlement,
  hasPremiumBillingActive,
  shouldRecommendRenewal,
} from '@/lib/subscriptionAccess';
import {
  isPortalCustomerAccount,
  isPortalStaffShellSession,
  subscriberHubPath,
} from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';
import { useToast } from '@/hooks/use-toast';
import SubscriberHelpPortal from '@/pages/SubscriberHelpPortal';
import SubscriberProfile from '@/pages/SubscriberProfile';
import SubscriberSupportPortal from '@/pages/SubscriberSupportPortal';
import SubscriberPortalAnalytics from '@/pages/SubscriberPortalAnalytics';
import SubscriberPortalDelegatedModule from '@/pages/SubscriberPortalDelegatedModule';
import {
  type LucideIcon,
  BookOpen,
  FileText,
  Bell,
  LifeBuoy,
  Calculator,
  Scale,
  Clock,
  Star,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    lockedHint: '',
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

/** Numeric ISO-style dates for subscription copy (e.g. 2026-05-09). */
function safeFormatDateNumeric(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

function libraryProgressValue(user: AuthMeUser): number {
  if (!hasLibraryEntitlement(user)) return 0;
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
    return hasLibraryEntitlement(user) ? 100 : 0;
  }
}

function latestVerifiedSubscriptionBillingCycle(dash: AuthDashboardPayload | undefined): string | null {
  if (!dash?.billing?.length) return null;
  const verified = dash.billing.filter((r) => (r.status || '').toLowerCase() === 'verified');
  if (!verified.length) return null;
  verified.sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime());
  const row = verified[0] as { billing_cycle?: string } & Record<string, unknown>;
  const c = row.billing_cycle ?? row.billingCycle;
  return typeof c === 'string' && c.trim() ? c : null;
}

/** When `subscription_period_start` is missing, approximate window length from the last verified package. */
function inferredSubscriptionStartMsFromEnd(
  endIso: string,
  billingCycle: string | null | undefined,
): number | null {
  try {
    const end = parseISO(endIso);
    const c = (billingCycle || 'monthly').toLowerCase();
    if (c.includes('year')) return subYears(end, 1).getTime();
    if (c.includes('six')) return subMonths(end, 6).getTime();
    return subMonths(end, 1).getTime();
  } catch {
    return null;
  }
}

/** Remaining fraction of the subscription / benefits window (0–100), plus bar and label color rules. */
function subscriptionWindowProgress(
  user: AuthMeUser,
  nowMs: number,
  dash?: AuthDashboardPayload,
): {
  pctRemaining: number;
  indicatorStyle?: CSSProperties;
  statusTone: 'default' | 'warn' | 'critical';
} | null {
  const endIso = user.subscription_period_end ?? user.plan_benefits_end ?? null;
  if (!endIso) return null;
  try {
    const endMs = parseISO(endIso).getTime();
    if (!Number.isFinite(endMs)) return null;
    let startMs: number | null = null;
    if (user.subscription_period_start) {
      startMs = parseISO(user.subscription_period_start).getTime();
    } else {
      const cycle = latestVerifiedSubscriptionBillingCycle(dash);
      startMs = inferredSubscriptionStartMsFromEnd(endIso, cycle);
    }
    if (startMs == null || !Number.isFinite(startMs) || endMs <= startMs) {
      startMs = inferredSubscriptionStartMsFromEnd(endIso, 'monthly');
    }
    if (startMs == null || !Number.isFinite(startMs) || endMs <= startMs) return null;
    const span = endMs - startMs;
    const remainingMs = endMs - nowMs;
    const pctRemaining = Math.max(0, Math.min(100, (remainingMs / span) * 100));
    const endDate = parseISO(endIso);
    const daysLeft = differenceInCalendarDays(endDate, new Date(nowMs));
    if (daysLeft <= 10) {
      return {
        pctRemaining,
        indicatorStyle: { backgroundColor: 'rgb(220 38 38)' },
        statusTone: 'critical',
      };
    }
    if (remainingMs <= span * 0.5) {
      return {
        pctRemaining,
        indicatorStyle: { backgroundColor: 'rgb(234 179 8)' },
        statusTone: 'warn',
      };
    }
    return { pctRemaining, indicatorStyle: undefined, statusTone: 'default' };
  } catch {
    return null;
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

function humanizePortalLabel(raw: string): string {
  const s = (raw || '').replace(/_/g, ' ').trim();
  if (!s) return '—';
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
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

/** Static `?tab=` values on the hub home page (plus `m:<module>` from portal_permissions). */
const QUERY_HOME_TABS = new Set(['activity', 'wallet', 'billing', 'notifications', 'projects']);

/** Modules shown as core hub tabs or dedicated `?tab=` rows — omit from the `m:` permission tab list. */
const PORTAL_HOME_CORE_MODULES = new Set<string>([
  PORTAL_PERM_MODULES.dashboard,
  PORTAL_PERM_MODULES.wallet,
  PORTAL_PERM_MODULES.billing,
  PORTAL_PERM_MODULES.notifications,
  PORTAL_PERM_MODULES.projects,
]);

function portalPermissionTabValue(row: AuthMeAdminPermission): string {
  return `m:${String(row.module ?? '').trim()}`;
}

/** Renders full-page portal modules inside the hub tab strip (same content as legacy routes). */
function HubModuleTabPanel({ moduleName }: { moduleName: string }) {
  const m = String(moduleName ?? '').trim();
  if (!m) return null;
  switch (m) {
    case 'Help':
      return <SubscriberHelpPortal />;
    case 'Settings':
      return <SubscriberProfile />;
    case 'Support':
      return <SubscriberSupportPortal />;
    case 'Analytics':
      return <SubscriberPortalAnalytics />;
    case 'Legal library':
      return (
        <div className="rounded-lg border bg-card overflow-hidden min-h-[70vh]">
          <iframe title="Legal library" src="/laws" className="w-full min-h-[70vh] border-0 bg-background" />
        </div>
      );
    default:
      return <SubscriberPortalDelegatedModule moduleName={m} />;
  }
}

/** Maps dashboard tab query values to Admin Roles module names (subscriber shell). */
const DASH_TAB_PERM_MODULE: Record<string, string> = {
  activity: PORTAL_PERM_MODULES.dashboard,
  notifications: PORTAL_PERM_MODULES.notifications,
  wallet: PORTAL_PERM_MODULES.wallet,
  billing: PORTAL_PERM_MODULES.billing,
  projects: PORTAL_PERM_MODULES.projects,
};

function dashTabAllowed(user: AuthMeUser | null | undefined, tab: string): boolean {
  if (!user) return false;
  const mod = DASH_TAB_PERM_MODULE[tab];
  return mod ? evaluatePortalModuleView(user, mod) : false;
}
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
  const trimmed = raw.trim();
  if (/^m:/i.test(trimmed)) {
    return `m:${trimmed.slice(2)}`;
  }
  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'billing portal') return 'billing';
  return trimmed.toLowerCase();
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
  const notifSigRef = useRef<string>('');
  const { user, refreshUser } = useAuth();
  const [walletPaymentSuccessBanner, setWalletPaymentSuccessBanner] = useState<{
    invoice: string | null;
  } | null>(null);

  const tabFromUrl = searchParams.get('tab');
  const portalPermissionRowsForTabs = useMemo(() => {
    const rows = user?.portal_permissions;
    if (!Array.isArray(rows) || !rows.length) return [] as AuthMeAdminPermission[];
    const seen = new Set<string>();
    const out: AuthMeAdminPermission[] = [];
    for (const r of rows) {
      const k = String(r.module ?? '').trim();
      if (!k || seen.has(k) || PORTAL_HOME_CORE_MODULES.has(k)) continue;
      if (!r.view) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }, [user]);

  const permissionTabValues = useMemo(
    () => portalPermissionRowsForTabs.map((r) => portalPermissionTabValue(r)),
    [portalPermissionRowsForTabs],
  );

  const tabParam = useMemo(() => {
    const n = normalizeDashboardTabParam(tabFromUrl);
    if (!n || !n.startsWith('m:')) return n;
    const tl = n.toLowerCase();
    return permissionTabValues.find((v) => v.toLowerCase() === tl) ?? n;
  }, [tabFromUrl, permissionTabValues]);

  const allowedHomeTabs = useMemo(() => {
    const activity = dashTabAllowed(user, 'activity') ? (['activity'] as const) : [];
    const wallet = dashTabAllowed(user, 'wallet') ? (['wallet'] as const) : [];
    const notifications = dashTabAllowed(user, 'notifications') ? (['notifications'] as const) : [];
    const projects = dashTabAllowed(user, 'projects') ? (['projects'] as const) : [];
    const billing = dashTabAllowed(user, 'billing') ? (['billing'] as const) : [];
    return [...activity, ...wallet, ...notifications, ...projects, ...permissionTabValues, ...billing];
  }, [user, permissionTabValues]);

  const homeTabIsAllowed = useCallback(
    (t: string | null | undefined): boolean => {
      if (t == null || !t.trim()) return false;
      if (t.startsWith('m:')) {
        const tl = t.toLowerCase();
        return permissionTabValues.some((v) => v.toLowerCase() === tl);
      }
      return QUERY_HOME_TABS.has(t) && dashTabAllowed(user, t);
    },
    [user, permissionTabValues],
  );

  const activeTab = tabParam && homeTabIsAllowed(tabParam) ? tabParam : allowedHomeTabs[0] ?? 'activity';

  const hubTabDescriptors = useMemo(
    () =>
      allowedHomeTabs.map((value) => ({
        value,
        label:
          value === 'activity'
            ? 'Recent Activity'
            : value === 'wallet'
              ? 'Wallet'
              : value === 'billing'
                ? 'Billing'
                : value === 'notifications'
                  ? 'Notifications'
                  : value === 'projects'
                    ? 'Projects'
                    : value.startsWith('m:')
                      ? value.slice(2)
                      : value,
      })),
    [allowedHomeTabs],
  );

  const walletInitialBilling = parseWalletBillingParam(searchParams.get('billing'));

  const projectsPortalOk = Boolean(user && evaluatePortalModuleView(user, PORTAL_PERM_MODULES.projects));
  const {
    data: myProjects = [],
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ['auth-my-projects', user?.id],
    queryFn: fetchAuthMyProjects,
    enabled: projectsPortalOk,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const raw = searchParams.get('tab');
    if (raw == null || !String(raw).trim()) return;
    const t = normalizeDashboardTabParam(raw);
    if (t === 'notifications' && dashTabAllowed(user, 'notifications')) return;
    if (t === 'projects' && dashTabAllowed(user, 'projects')) return;
    const desired = tabParam && homeTabIsAllowed(tabParam) ? tabParam : allowedHomeTabs[0] ?? 'activity';
    if (tabParam !== desired) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('tab', desired);
          return p;
        },
        { replace: true }
      );
    }
  }, [user, tabParam, allowedHomeTabs, setSearchParams, searchParams, homeTabIsAllowed]);

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
      setWalletPaymentSuccessBanner({ invoice: inv });
      toast({
        title: 'Payment Successful',
        description: inv
          ? `Invoice ${inv} was verified. Your wallet and subscription are updated.`
          : 'Your eSewa payment was verified successfully.',
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

  const successBannerBillingRow = useMemo(() => {
    const inv = walletPaymentSuccessBanner?.invoice;
    if (!inv?.trim()) return null;
    return billing.find((r) => String(r.invoice).trim() === inv.trim()) ?? null;
  }, [billing, walletPaymentSuccessBanner?.invoice]);
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

  const [subscriptionClock, setSubscriptionClock] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setSubscriptionClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const unreadForStats =
    user && typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;
  const statCards = useMemo(() => {
    if (!user) return [];
    const libOk = evaluatePortalModuleView(user, PORTAL_PERM_MODULES.library);
    const notifOk = evaluatePortalModuleView(user, PORTAL_PERM_MODULES.notifications);
    const cards: { icon: LucideIcon; label: string; value: string }[] = [];
    if (libOk) {
      cards.push(
        {
          icon: BookOpen as LucideIcon,
          label: 'Laws Available',
          value: catalogStatDisplay(data?.laws_count, isLoading, Boolean(error)),
        },
        {
          icon: FileText as LucideIcon,
          label: 'Case Summaries',
          value: catalogStatDisplay(data?.case_summaries_count, isLoading, Boolean(error)),
        }
      );
    }
    if (notifOk) {
      cards.push({
        icon: Bell as LucideIcon,
        label: 'Unread alerts',
        value: String(unreadForStats),
      });
    }
    return cards;
  }, [user, data?.laws_count, data?.case_summaries_count, isLoading, error, unreadForStats]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const dash: AuthDashboardPayload | undefined = data;
  const libraryPortalOk = evaluatePortalModuleView(user, PORTAL_PERM_MODULES.library);
  const planLabel = planTierLabel(user.plan);
  const hasLibraryAccess = hasLibraryEntitlement(user);
  const premiumActive = hasPremiumBillingActive(user);
  const renewRecommended = shouldRecommendRenewal(user);
  const paidWindowProgress = subscriptionWindowProgress(user, subscriptionClock, dash);
  const rawProgressVal = !hasLibraryAccess
    ? 0
    : paidWindowProgress
      ? Math.round(paidWindowProgress.pctRemaining)
      : libraryProgressValue(user);
  const progressVal = Number.isFinite(rawProgressVal)
    ? Math.min(100, Math.max(0, rawProgressVal))
    : 0;

  const packageEndIso = user.subscription_period_end ?? user.plan_benefits_end ?? null;

  const benefitsEndLabel = safeFormatDate(user.plan_benefits_end ?? null);
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
    isPortalCustomerAccount(user) &&
    !hasLibraryAccess &&
    hadVerifiedSubscription &&
    (user.plan || 'free').toLowerCase() === 'free';

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
    if (isPortalStaffShellSession(user) && hasLibraryAccess && !packageEndIso) {
      return '';
    }
    if (premiumActive) {
      return '';
    }
    if (hasLibraryAccess) {
      return '';
    }
    return '';
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full">
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">Welcome back, {firstGreetingName(user)}</h1>
              <Badge variant="secondary" className="font-normal">
                {roleDisplayLabel(user.role)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{subscriberDashboardSubtitle(user)}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1 self-start sm:self-center"
            onClick={() => navigate('/')}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
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
                {isPortalStaffShellSession(user) ? (
                  <Badge variant="outline" className="text-xs">
                    Staff
                  </Badge>
                ) : null}
              </div>
              <h2 className="text-xl font-bold">{hasLibraryAccess ? 'Full library access' : 'Free account'}</h2>
              {hasLibraryAccess ? (
                <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                  <span className="font-medium text-foreground">From</span>{' '}
                  {safeFormatDateNumeric(user.subscription_period_start ?? null) ?? '—'}{' '}
                  <span className="font-medium text-foreground">to</span>{' '}
                  {safeFormatDateNumeric(packageEndIso) ?? '—'}
                </p>
              ) : null}
              {subscriptionBlurb ? (
                <p className="text-sm text-muted-foreground mt-1.5">{subscriptionBlurb}</p>
              ) : null}
            </div>
            <div className="w-full md:w-72">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Library access</span>
                <span
                  className={cn(
                    'font-medium',
                    hasLibraryAccess &&
                      paidWindowProgress?.statusTone === 'critical' &&
                      'text-red-600 dark:text-red-400',
                    hasLibraryAccess &&
                      paidWindowProgress?.statusTone === 'warn' &&
                      'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {hasLibraryAccess ? 'Active' : 'No access'}
                </span>
              </div>
              <Progress
                value={progressVal}
                className="h-2"
                indicatorStyle={
                  hasLibraryAccess ? paidWindowProgress?.indicatorStyle : undefined
                }
              />
              {hasLibraryAccess && paidWindowProgress ? (
                <p className="text-xs text-muted-foreground mt-1.5 tabular-nums text-right">
                  <span className="font-medium text-foreground">{progressVal}%</span> of access period remaining
                </p>
              ) : null}
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
          {libraryPortalOk
            ? quickLinks.map((q) => {
                const allowed = q.canAccess(user);
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
              })
            : null}
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

        {walletPaymentSuccessBanner ? (
          <Alert className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            <AlertTitle className="text-emerald-950 dark:text-emerald-100">Payment Successful</AlertTitle>
            <AlertDescription className="text-sm mt-2 space-y-2 text-emerald-900/90 dark:text-emerald-100/90">
              <p>
                {walletPaymentSuccessBanner.invoice ? (
                  <>
                    Your eSewa payment completed successfully. Invoice{' '}
                    <span className="font-mono font-medium">{walletPaymentSuccessBanner.invoice}</span> was confirmed on
                    our servers.
                  </>
                ) : (
                  <>Your eSewa payment completed successfully and was confirmed on our servers.</>
                )}
              </p>
              {successBannerBillingRow ? (
                <p>
                  {String(successBannerBillingRow.status).toLowerCase() === 'verified' ? (
                    <>
                      This transaction is recorded as <strong>verified</strong> in your billing history.
                      {successBannerBillingRow.package_validity_summary ? (
                        <> {successBannerBillingRow.package_validity_summary}</>
                      ) : null}
                    </>
                  ) : (
                    <>
                      Billing is updating; this invoice should appear as <strong>verified</strong> in the Billing tab
                      within a few seconds.
                    </>
                  )}
                </p>
              ) : isLoading ? (
                <p>Loading your updated billing details…</p>
              ) : walletPaymentSuccessBanner.invoice ? (
                <p>
                  If invoice <span className="font-mono">{walletPaymentSuccessBanner.invoice}</span> does not show as
                  verified shortly, refresh the page or open the Billing tab.
                </p>
              ) : (
                <p>Open the Billing tab to see your latest invoice status.</p>
              )}
              {allowedHomeTabs.includes('wallet') ? (
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                  See the Wallet tab for subscription options and the Billing tab for all invoices.
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 border-emerald-300 bg-white/80 hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/50"
                onClick={() => setWalletPaymentSuccessBanner(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {hubTabDescriptors.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  value === 'wallet' && 'gap-1',
                  value.startsWith('m:') && 'max-w-[10.5rem] truncate shrink',
                )}
                title={value.startsWith('m:') ? label : undefined}
              >
                {value === 'wallet' ? (
                  <>
                    <Wallet className="h-4 w-4" />
                    {label}
                  </>
                ) : (
                  label
                )}
              </TabsTrigger>
            ))}
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

          {allowedHomeTabs.includes('notifications') ? (
            <TabsContent value="notifications" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
                <p className="text-sm text-muted-foreground mt-1">Read and manage alerts for your account.</p>
              </div>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
              {error ? <p className="text-sm text-destructive">Could not load notifications. Try again later.</p> : null}
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
                                !n.read ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/20',
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
                                {n.body ? (
                                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">{n.body}</p>
                                ) : null}
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
                              {n.body ? (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                              ) : null}
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
          ) : null}

          {allowedHomeTabs.includes('projects') ? (
            <TabsContent value="projects" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Projects</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Matters assigned to your firm contact in Admin → Clients / Projects (view only).
                </p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <p className="text-sm text-muted-foreground py-4">Loading projects…</p>
                  ) : projectsError ? (
                    <p className="text-sm text-destructive py-4">Could not load projects.</p>
                  ) : myProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No projects linked to your account email yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myProjects.map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 last:border-0"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.client_name} · {humanizePortalLabel(p.type)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Due {p.due_date ? safeFormatDate(p.due_date) ?? p.due_date : '—'} · Progress {p.progress}%
                            </div>
                          </div>
                          <Badge variant="secondary" className="w-fit shrink-0 font-normal">
                            {humanizePortalLabel(p.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ) : null}

          {portalPermissionRowsForTabs.map((row) => {
            const tv = portalPermissionTabValue(row);
            if (!allowedHomeTabs.includes(tv)) return null;
            const name = String(row.module ?? '').trim();
            return (
              <TabsContent key={tv} value={tv} className="space-y-6">
                <HubModuleTabPanel moduleName={name} />
              </TabsContent>
            );
          })}
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
    </div>
  );
};

export default SubscriberDashboard;
