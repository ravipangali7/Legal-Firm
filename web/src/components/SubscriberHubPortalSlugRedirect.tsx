import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { portalPermissionTabQueryValue, resolvePortalModuleFromSlug } from '@/lib/subscriberPortalNav';

/** Redirects `/dashboard/portal/:slug` (and `/client/...`) to the hub with the matching `?tab=m:…` panel. */
export default function SubscriberHubPortalSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hub = subscriberHubPath(pathname);

  if (!user) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  const mod = slug ? resolvePortalModuleFromSlug(user, slug) : null;
  if (!mod) return <Navigate to={hub} replace />;

  return (
    <Navigate
      to={{ pathname: hub, search: `?tab=${encodeURIComponent(portalPermissionTabQueryValue(mod))}` }}
      replace
    />
  );
}
