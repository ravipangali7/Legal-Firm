import { useMemo } from 'react';
import { usePageSeo } from '@/context/SeoContext';
import type { PageSeoInput } from '@/lib/seo';

/**
 * MOD_FACETS: noindex filtered listing pages; canonical stays on unfiltered base path.
 */
export function useListingFacetsSeo(
  basePath: string,
  options: {
    title: string;
    description?: string;
    hasActiveFilters: boolean;
    hasSearch?: boolean;
  }
) {
  const seo = useMemo((): PageSeoInput => {
    const filtered = options.hasActiveFilters || Boolean(options.hasSearch);
    return {
      pathname: basePath,
      title: options.title,
      description: options.description,
      noindex: filtered,
    };
  }, [
    basePath,
    options.title,
    options.description,
    options.hasActiveFilters,
    options.hasSearch,
  ]);

  usePageSeo(seo);
}
