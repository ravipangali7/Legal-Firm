import { fetchSiteHomepage } from '@/lib/api';

/** Shared React Query key + options for public homepage CMS (footer, nav, sections, etc.). */
export const siteHomepageQueryKey = ['site-homepage'] as const;

export const siteHomepageQueryOptions = {
  queryKey: siteHomepageQueryKey,
  queryFn: fetchSiteHomepage,
  retry: 1,
  staleTime: 60_000,
} as const;
