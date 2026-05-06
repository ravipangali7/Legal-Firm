export const FALLBACK_SERVICE_PATH = '/about/our-services';

export type ServiceDestination =
  | { kind: 'spa'; to: string }
  | { kind: 'external'; href: string; newTab: boolean };

/**
 * CMS "Link" values are often missing a leading `/`, use `#`, or are full URLs.
 */
export function resolveServiceDestination(raw: string | undefined): ServiceDestination {
  const href = (raw ?? '').trim();
  if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) {
    return { kind: 'spa', to: FALLBACK_SERVICE_PATH };
  }
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) {
    const url = href.startsWith('//') ? `https:${href}` : href;
    return { kind: 'external', href: url, newTab: true };
  }
  if (/^(mailto:|tel:)/i.test(href)) {
    return { kind: 'external', href, newTab: false };
  }
  const firstSeg = href.split('/')[0] ?? '';
  if (!href.startsWith('/') && !href.startsWith('#') && /^[\w.-]+\.[a-z]{2,}$/i.test(firstSeg)) {
    return { kind: 'external', href: `https://${href}`, newTab: true };
  }
  if (href.startsWith('#')) {
    return { kind: 'spa', to: `/${href}` };
  }
  const path = href.startsWith('/') ? href : `/${href}`;
  return { kind: 'spa', to: path };
}
