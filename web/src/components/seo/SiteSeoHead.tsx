import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useSeoContext } from '@/context/SeoContext';
import {
  absoluteUrl,
  buildPageTitle,
  metaDescription,
  parseKeywords,
  resolveOgImage,
  siteOrigin,
  type PageSeoInput,
} from '@/lib/seo';
import { seoDefaultsForPath } from '@/lib/seoRouteDefaults';

function mergeSeo(
  routeDefault: PageSeoInput | null,
  pageOverride: PageSeoInput | null,
  pathname: string
): PageSeoInput {
  return {
    ...routeDefault,
    ...pageOverride,
    pathname: pageOverride?.pathname ?? routeDefault?.pathname ?? pathname,
  };
}

export default function SiteSeoHead() {
  const { pathname } = useLocation();
  const { config } = useSiteConfig();
  const { pageSeo } = useSeoContext();

  const merged = mergeSeo(seoDefaultsForPath(pathname), pageSeo, pathname);

  const siteName = (config?.site_name || '').trim() || 'TaxLexis Legal';
  const origin = siteOrigin(config?.canonical_url);
  const canonicalPath = merged.pathname ?? pathname;
  const canonical = origin ? absoluteUrl(canonicalPath, origin) : canonicalPath;

  const title = buildPageTitle(
    merged.title || config?.seo_title || siteName,
    siteName
  );
  const description = metaDescription(
    merged.description || config?.seo_description || ''
  );
  const keywords = [
    ...parseKeywords(config?.seo_keywords),
    ...(Array.isArray(merged.keywords)
      ? merged.keywords
      : parseKeywords(
          typeof merged.keywords === 'string' ? merged.keywords : undefined
        )),
  ];
  const ogImage = resolveOgImage(merged.image, config?.og_image, origin);
  const ogType = merged.type || 'website';
  const noindex =
    merged.noindex ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/client') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/payment');

  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

  const jsonLdBlocks: Record<string, unknown>[] = [];
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: origin || undefined,
    logo: ogImage || undefined,
  };
  jsonLdBlocks.push(orgLd);

  if (merged.jsonLd) {
    const extra = Array.isArray(merged.jsonLd) ? merged.jsonLd : [merged.jsonLd];
    jsonLdBlocks.push(...extra);
  } else if (ogType === 'article' && merged.title && canonical) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: merged.title,
      description: description || undefined,
      image: ogImage || undefined,
      datePublished: merged.publishedTime || undefined,
      dateModified: merged.modifiedTime || merged.publishedTime || undefined,
      author: merged.author
        ? { '@type': 'Person', name: merged.author }
        : { '@type': 'Organization', name: siteName },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    });
  } else if (canonical && origin) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: description || undefined,
      url: canonical,
    });
  }

  const twitterSite =
    (import.meta.env.VITE_TWITTER_SITE as string | undefined)?.trim() || '';

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {keywords.length > 0 ? (
        <meta name="keywords" content={[...new Set(keywords)].join(', ')} />
      ) : null}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage ? <meta property="og:image:alt" content={title} /> : null}
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      {twitterSite ? <meta name="twitter:site" content={twitterSite} /> : null}
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
      {ogImage ? <meta name="twitter:image:alt" content={title} /> : null}

      {merged.publishedTime ? (
        <meta property="article:published_time" content={merged.publishedTime} />
      ) : null}
      {merged.modifiedTime ? (
        <meta property="article:modified_time" content={merged.modifiedTime} />
      ) : null}
      {merged.author ? <meta name="author" content={merged.author} /> : null}

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
