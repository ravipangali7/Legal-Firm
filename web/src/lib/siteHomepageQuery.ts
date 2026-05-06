import { fetchSiteHomepage } from '@/lib/api';

/** Shared React Query key + options for public homepage CMS (footer, nav, sections, etc.). */
export const siteHomepageQueryKey = ['site-homepage'] as const;

export const siteHomepageQueryOptions = {
  queryKey: siteHomepageQueryKey,
  queryFn: fetchSiteHomepage,
  retry: 1,
  staleTime: 60_000,
} as const;

/**
 * Public `/` only: keep testimonials and embedded professionals metadata near real time when
 * content changes in Django admin or the React CMS (shared query key with the rest of the site).
 */
export const siteHomepageIndexQueryOptions = {
  ...siteHomepageQueryOptions,
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: 12_000,
  refetchIntervalInBackground: false,
} as const;
