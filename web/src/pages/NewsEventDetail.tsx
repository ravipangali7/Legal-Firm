import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CmsStoreProvider } from '@/store/cmsStore';
import { HtmlPreview } from '@/components/HtmlPreview';
import { blogBodyToParagraphs } from '@/lib/api';
import { looksLikeHtml } from '@/lib/summaryHtml';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { safeCmsExternalHref } from '@/lib/cmsAssetUrl';
import { CmsImage } from '@/components/CmsImage';
import { RelatedContentSidebar } from '@/components/RelatedContentSidebar';
import { usePageSeo } from '@/context/SeoContext';

const NewsEventDetail = () => {
  const { newsId } = useParams<{ newsId: string }>();
  const { data, isLoading, isError, refetch } = useQuery(siteHomepageQueryOptions);

  const item = useMemo(() => {
    if (!newsId || !data) return undefined;
    const snapshot = mapHomepageApiToSnapshot(data);
    const id = newsId.trim().toLowerCase();
    return snapshot.news.find((n) => n.id.toLowerCase() === id);
  }, [data, newsId]);

  const mainText = (item?.body || '').trim() || (item?.excerpt || '').trim();
  const paragraphs = blogBodyToParagraphs(mainText);
  const bodyIsHtml = looksLikeHtml(mainText);
  const external = item?.href ? safeCmsExternalHref(item.href, 'url') : null;

  usePageSeo(
    item && newsId
      ? {
          title: item.title,
          description: item.excerpt,
          pathname: `/news/${newsId}`,
          type: 'article',
          publishedTime: item.date,
          image: item.image,
        }
      : null
  );

  if (!newsId) {
    return (
      <CmsStoreProvider>
        <MissingShell message="This link is invalid." />
      </CmsStoreProvider>
    );
  }

  if (isLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading…
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  if (isError) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 px-4 flex-1">
            <div className="container mx-auto max-w-lg text-center">
              <p className="text-muted-foreground mb-4">Could not load this article.</p>
              <Button type="button" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  if (!item || !item.enabled) {
    return (
      <CmsStoreProvider>
        <MissingShell message="This news item does not exist or is no longer published." />
      </CmsStoreProvider>
    );
  }

  return (
    <CmsStoreProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="pt-28 pb-16 px-4 flex-1">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
              <article className="lg:col-span-8 min-w-0 max-w-3xl lg:max-w-none">
            <nav className="text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground line-clamp-1">{item.title}</span>
            </nav>

            <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Link>
            </Button>

            <div className="relative mb-8 aspect-[16/9] max-h-[420px] overflow-hidden rounded-2xl border border-border bg-muted">
              <CmsImage
                src={item.image}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
                fallbackKind="card"
              />
            </div>

            <header className="mb-10">
              {item.tag ? (
                <Badge variant="secondary" className="mb-3">
                  {item.tag}
                </Badge>
              ) : null}
              <h1 className="text-3xl md:text-4xl font-bold text-primary-onBg leading-tight mb-4">{item.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {item.date}
                </span>
                {external ? (
                  <a
                    href={external}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                  >
                    Related link
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </header>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {bodyIsHtml ? (
                <HtmlPreview
                  content={mainText}
                  className="prose-neutral max-w-none text-muted-foreground prose-p:text-muted-foreground"
                />
              ) : paragraphs.length > 0 ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-muted-foreground">
                  {paragraphs.map((paragraph, i) =>
                    looksLikeHtml(paragraph) ? (
                      <HtmlPreview key={i} content={paragraph} inheritTypography className="text-muted-foreground" />
                    ) : (
                      <p key={i}>{paragraph}</p>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No content yet for this item.</p>
              )}
            </div>
              </article>
              <div className="lg:col-span-4 min-w-0">
                <RelatedContentSidebar excludeNewsId={item.id} />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

function MissingShell({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-28 pb-16 px-4 flex-1">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Article not found</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default NewsEventDetail;
