import { useQuery } from '@tanstack/react-query';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { defaultCmsSnapshot, type FooterCfg } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';

/**
 * Footer copy and link columns from GET /api/site/homepage/ (same payload as admin CMS footer).
 * Uses the global React Query cache so the footer stays identical on every route and after navigation.
 */
export function useSiteHomepageFooter(): FooterCfg {
  const { data } = useQuery(siteHomepageQueryOptions);
  if (!data) return defaultCmsSnapshot.footer;
  return mapHomepageApiToSnapshot(data).footer;
}
