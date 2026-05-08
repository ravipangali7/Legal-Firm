import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isPortalStaffShellSession, subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView } from '@/lib/subscriberPortalPermissions';
import { resolvePortalModuleFromSlug, STAFF_ADMIN_PATH } from '@/lib/subscriberPortalNav';
import type { PortalPermissionModuleName } from '@/lib/subscriberPortalNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Fallback content for permission modules that do not have a dedicated subscriber page.
 * Staff accounts jump to the admin SPA instead (see `portalNavTarget`).
 */
export default function SubscriberPortalDelegatedModule() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const hubPath = subscriberHubPath(location.pathname);

  const moduleName = slug ? resolvePortalModuleFromSlug(user, slug) : null;

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  if (!moduleName) {
    return <Navigate to={hubPath} replace />;
  }

  if (!evaluatePortalModuleView(user, moduleName)) {
    return <Navigate to={hubPath} replace />;
  }

  const staffJump =
    isPortalStaffShellSession(user) && STAFF_ADMIN_PATH[moduleName as PortalPermissionModuleName];
  if (staffJump) {
    return <Navigate to={staffJump} replace />;
  }

  const body = (() => {
    switch (moduleName) {
      case 'Activity Logs':
        return (
          <>
            <p className="text-sm text-muted-foreground">
              Your recent actions on this platform appear under{' '}
              <span className="font-medium text-foreground">Recent Activity</span> on the Dashboard.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link to={`${hubPath}?tab=activity`}>Open Dashboard activity</Link>
            </Button>
          </>
        );
      case 'Clients':
        return (
          <p className="text-sm text-muted-foreground">
            Client and matter records are maintained by your firm&apos;s administrators. If something looks wrong with
            your profile or assignments, contact them or use{' '}
            <Link to={`${hubPath}/support`} className="text-primary underline-offset-4 hover:underline">
              Support
            </Link>
            .
          </p>
        );
      case 'Homepage CMS':
        return (
          <p className="text-sm text-muted-foreground">
            Marketing pages and homepage content are edited in the admin workspace. Subscriber accounts cannot change site
            CMS data from here.
          </p>
        );
      case 'Roles':
      case 'Users':
        return (
          <p className="text-sm text-muted-foreground">
            User accounts and roles are managed by firm administrators in the secure admin panel. If you need access
            changes, ask your administrator.
          </p>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            This area is restricted to administrators. If you believe you should have access, contact your firm.
          </p>
        );
    }
  })();

  return (
    <div className="max-w-2xl mx-auto space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{moduleName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Permission module from Admin → Roles & Permissions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{moduleName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">{body}</CardContent>
      </Card>
    </div>
  );
}
