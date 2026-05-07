import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Scale, Library } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Fallback route for permission modules that have no dedicated subscriber page.
 * Legal library uses this page as a launch pad to public catalog routes.
 */
export default function SubscriberPortalAccess() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hub = subscriberHubPath(location.pathname) as '/client' | '/dashboard';
  const raw = searchParams.get('module');
  const moduleName = raw != null ? decodeURIComponent(raw).trim() : '';

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-12 text-sm text-muted-foreground text-center">Loading…</div>
    );
  }

  if (!moduleName) {
    return <Navigate to={hub} replace />;
  }

  if (!evaluatePortalModuleView(user, moduleName)) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              Your role does not include viewing <span className="font-medium text-foreground">{moduleName}</span> in
              this portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to={hub}>Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLibrary = moduleName === PORTAL_PERM_MODULES.library;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{moduleName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This area is enabled for your role in Admin → Roles. Use the links below when they apply.
        </p>
      </div>

      {isLibrary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Browse the library</CardTitle>
            <CardDescription>Public catalog areas (sign-in may be required for some content).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button variant="secondary" asChild className="justify-start">
              <Link to="/laws">
                <Scale className="h-4 w-4 mr-2 shrink-0" />
                Laws
              </Link>
            </Button>
            <Button variant="secondary" asChild className="justify-start">
              <Link to="/summaries">
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                Case summaries
              </Link>
            </Button>
            <Button variant="secondary" asChild className="justify-start">
              <Link to="/procedures">
                <Library className="h-4 w-4 mr-2 shrink-0" />
                Procedures
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to={`${hub}`}>
                <BookOpen className="h-4 w-4 mr-2 shrink-0" />
                Client home (overview)
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No separate page yet</CardTitle>
            <CardDescription>
              If you expected a dedicated screen here, your administrator can still control visibility through roles.
              Staff members can open the admin panel for full tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={hub}>Back to home</Link>
            </Button>
            {user.is_staff ? (
              <Button asChild>
                <Link to="/admin">Admin panel</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
