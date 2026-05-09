import { Navigate, useLocation } from 'react-router-dom';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';

/** Redirects legacy hub paths (`/dashboard/help`, …) to the same hub with `?tab=` so tabs stay visible. */
export default function SubscriberHubTabRedirect({ tab }: { tab: string }) {
  const { pathname } = useLocation();
  const hub = subscriberHubPath(pathname);
  return <Navigate to={{ pathname: hub, search: `?tab=${encodeURIComponent(tab)}` }} replace />;
}
