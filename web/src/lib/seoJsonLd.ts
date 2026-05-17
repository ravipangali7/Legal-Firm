import type { BreadcrumbItem } from '@/lib/seoBreadcrumbs';

export function breadcrumbListJsonLd(
  items: BreadcrumbItem[],
  origin: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: origin ? `${origin.replace(/\/$/, '')}${item.path}` : item.path,
    })),
  };
}

export function webSiteJsonLd(
  siteName: string,
  origin: string,
  searchPath = '/knowledge'
): Record<string, unknown> {
  const url = origin.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}${searchPath}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function legalServiceJsonLd(
  siteName: string,
  origin: string,
  description?: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: siteName,
    url: origin || undefined,
    description: description || undefined,
    areaServed: {
      '@type': 'Country',
      name: 'Nepal',
    },
  };
}

export function personJsonLd(input: {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    jobTitle: input.jobTitle || undefined,
    description: input.description || undefined,
    image: input.image || undefined,
    url: input.url || undefined,
  };
}
