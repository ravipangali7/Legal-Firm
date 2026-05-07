import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { fetchAuthDashboard, postAuthNotificationMarkRead } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useRef } from 'react';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';

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
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const markReadPostedForId = useRef<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auth-dashboard', user?.id],
    queryFn: fetchAuthDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const notification = data?.notifications?.find((n) => n.id === id);
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
  }, [id, user, notification, queryClient, refreshUser]);

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!evaluatePortalModuleView(user, PORTAL_PERM_MODULES.notifications)) {
    return <Navigate to={hubPath} replace />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 w-full">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link to={hubPath}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {hubPath === '/client' ? 'Back to client portal' : 'Back to dashboard'}
        </Link>
      </Button>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading notification…</p> : null}
      {error ? <p className="text-sm text-destructive">Could not load notification. Try again later.</p> : null}

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
    </div>
  );
};

export default SubscriberNotificationDetail;
