import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useSeoContext } from '@/context/SeoContext';
import { breadcrumbsFromPathname } from '@/lib/seoBreadcrumbs';
import {
  breadcrumbListJsonLd,
  legalServiceJsonLd,
  personJsonLd,
  webSiteJsonLd,
} from '@/lib/seoJsonLd';
import {
  absoluteUrl,
  buildPageTitle,
  metaDescription,
  ogImageMimeType,
  parseKeywords,
  resolveOgImage,
  siteOrigin,
  type PageSeoInput,
} from '@/lib/seo';
import { seoDefaultsForPath } from '@/lib/seoRouteDefaults';

const NOINDEX_PREFIXES = [
  '/admin',
  '/dashboard',
  '/client',
  '/account',
  '/login',
  '/signup',
  '/portal',
  '/payment',
  '/forgot-password',
];

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

function isNoindexPath(pathname: string, explicit?: boolean): boolean {
  if (explicit) return true;
  return NOINDEX_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
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

  const rawTitle = merged.title || config?.seo_title || siteName;
  const title = buildPageTitle(rawTitle, siteName);
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
  const ogImageType = ogImage ? ogImageMimeType(ogImage) : undefined;
  const ogType = merged.type || 'website';
  const noindex = isNoindexPath(pathname, merged.noindex);
  const isHome = canonicalPath === '/' || canonicalPath === '';

  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const jsonLdBlocks: Record<string, unknown>[] = [];
  jsonLdBlocks.push(
    legalServiceJsonLd(siteName, origin, description || config?.seo_description)
  );

  if (isHome && origin) {
    jsonLdBlocks.push(webSiteJsonLd(siteName, origin));
  }

  const crumbs =
    merged.breadcrumbs ??
    breadcrumbsFromPathname(canonicalPath, merged.title || undefined);
  if (!merged.skipBreadcrumbs && crumbs.length > 1 && origin && !noindex) {
    jsonLdBlocks.push(breadcrumbListJsonLd(crumbs, origin));
  }

  if (merged.jsonLd) {
    const extra = Array.isArray(merged.jsonLd) ? merged.jsonLd : [merged.jsonLd];
    jsonLdBlocks.push(...extra);
  } else if (ogType === 'profile' && merged.title) {
    jsonLdBlocks.push(
      personJsonLd({
        name: merged.title,
        jobTitle: merged.section,
        description: description || undefined,
        image: ogImage || undefined,
        url: canonical,
      })
    );
  } else if (ogType === 'article' && merged.title && canonical) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: merged.title,
      description: description || undefined,
      image: ogImage ? [ogImage] : undefined,
      datePublished: merged.publishedTime || undefined,
      dateModified: merged.modifiedTime || merged.publishedTime || undefined,
      author: merged.author
        ? { '@type': 'Person', name: merged.author }
        : { '@type': 'Organization', name: siteName },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        logo: ogImage ? { '@type': 'ImageObject', url: ogImage } : undefined,
      },
      articleSection: merged.section || undefined,
      keywords: merged.tags?.length ? merged.tags.join(', ') : undefined,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    });
  } else if (canonical && origin && !noindex) {
    jsonLdBlocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: description || undefined,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: siteName, url: origin },
    });
  }

  const twitterSite =
    (import.meta.env.VITE_TWITTER_SITE as string | undefined)?.trim() || '';
  const twitterCreator =
    (merged.twitterCreator ||
      (import.meta.env.VITE_TWITTER_CREATOR as string | undefined))?.trim() ||
    '';
  const fbAppId =
    (import.meta.env.VITE_FB_APP_ID as string | undefined)?.trim() || '';
  const ogLocale =
    (import.meta.env.VITE_OG_LOCALE as string | undefined)?.trim() || 'en_US';
  const themeColor =
    (import.meta.env.VITE_THEME_COLOR as string | undefined)?.trim() ||
    '#0f3d2e';

  const sitemapUrl = origin ? `${origin}/sitemap.xml` : '/sitemap.xml';

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en" />
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {keywords.length > 0 ? (
        <meta name="keywords" content={[...new Set(keywords)].join(', ')} />
      ) : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content={themeColor} />
      <link rel="canonical" href={canonical} />
      <link rel="sitemap" type="application/xml" title="Sitemap" href={sitemapUrl} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content={ogLocale} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage && ogImage.startsWith('https://') ? (
        <meta property="og:image:secure_url" content={ogImage} />
      ) : null}
      {ogImage ? <meta property="og:image:alt" content={rawTitle || title} /> : null}
      {ogImageType ? <meta property="og:image:type" content={ogImageType} /> : null}
      {fbAppId ? <meta property="fb:app_id" content={fbAppId} /> : null}

      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      {twitterSite ? <meta name="twitter:site" content={twitterSite} /> : null}
      {twitterCreator ? <meta name="twitter:creator" content={twitterCreator} /> : null}
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
      {ogImage ? <meta name="twitter:image:alt" content={rawTitle || title} /> : null}

      {merged.publishedTime ? (
        <meta property="article:published_time" content={merged.publishedTime} />
      ) : null}
      {merged.modifiedTime ? (
        <meta property="article:modified_time" content={merged.modifiedTime} />
      ) : null}
      {merged.section ? <meta property="article:section" content={merged.section} /> : null}
      {merged.author ? <meta name="author" content={merged.author} /> : null}
      {merged.tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
