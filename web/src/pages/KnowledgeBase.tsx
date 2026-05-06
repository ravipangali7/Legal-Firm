import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  BookOpen,
  Scale,
  Search,
  Bell,
  HelpCircle,
  Newspaper,
} from 'lucide-react';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CmsStoreProvider } from '@/store/cmsStore';
import { cn } from '@/lib/utils';
import { useKnowledgeDownloads } from '@/hooks/useKnowledgeDownloads';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import {
  apiUrl,
  fetchPublicBlogPosts,
  fetchPublicHelpArticles,
  fetchPublicKnowledgeResourceCategories,
  fetchPublicNotices,
  publicKnowledgeResourceDownloadApiPath,
} from '@/lib/api';
import type { KnowledgeResourcePublicApi } from '@/lib/api';

type KnowledgeSectionTab = 'downloads' | 'faqs';

type HubStatLine = string;

function formatHubStat(loading: boolean, err: boolean, count: number, singular: string, plural: string): HubStatLine {
  if (loading) return '…';
  if (err) return '—';
  const label = count === 1 ? singular : plural;
  return `${count.toLocaleString()} ${label}`;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const KnowledgeBase = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [mainTab, setMainTab] = useState<KnowledgeSectionTab>(() => (location.hash === '#faqs' ? 'faqs' : 'downloads'));

  const { data: categoryRows = [] } = useQuery({
    queryKey: ['public-knowledge-resource-categories'] as const,
    queryFn: fetchPublicKnowledgeResourceCategories,
    staleTime: 60_000,
  });

  const { data: notices = [], isLoading: noticesLoading, isError: noticesError } = useQuery({
    queryKey: ['public-notices'] as const,
    queryFn: () => fetchPublicNotices(),
    staleTime: 60_000,
  });

  const { data: blogPosts = [], isLoading: blogLoading, isError: blogError } = useQuery({
    queryKey: ['blog-posts-public'] as const,
    queryFn: fetchPublicBlogPosts,
    staleTime: 60_000,
  });

  const { data: faqArticles = [], isLoading: faqArticlesLoading, isError: faqArticlesError } = useQuery({
    queryKey: ['public-help-articles-all'] as const,
    queryFn: () => fetchPublicHelpArticles(null),
    staleTime: 60_000,
  });

  const filterLabels = useMemo((): string[] => {
    const names = [...categoryRows]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((c) => c.name);
    if (names.length === 0) {
      return ['All'];
    }
    return ['All', ...names];
  }, [categoryRows]);

  useEffect(() => {
    if (!filterLabels.includes(activeFilter)) {
      setActiveFilter('All');
    }
  }, [filterLabels, activeFilter]);

  const {
    rows: filtered,
    fromApi,
    isLoading: resourcesLoading,
    isError: resourcesError,
    totalResourceCount,
  } = useKnowledgeDownloads(search, activeFilter);

  const hubCards = useMemo(
    () => [
      {
        icon: Bell,
        label: 'Notices',
        description: 'Government notices, circulars, and official announcements',
        countLine: formatHubStat(noticesLoading, noticesError, notices.length, 'notice', 'notices'),
        kind: 'link' as const,
        href: '/notices',
      },
      {
        icon: Newspaper,
        label: 'Blog & Insights',
        description: 'Legal articles, analysis, and expert commentary',
        countLine: formatHubStat(blogLoading, blogError, blogPosts.length, 'post', 'posts'),
        kind: 'link' as const,
        href: '/blog',
      },
      {
        icon: BookOpen,
        label: 'Knowledge Base',
        description: 'Guides, templates, and reference documents',
        countLine: formatHubStat(resourcesLoading, resourcesError, totalResourceCount, 'resource', 'resources'),
        kind: 'tab' as const,
        tab: 'downloads' as const,
      },
      {
        icon: HelpCircle,
        label: 'FAQs',
        description: 'Frequently asked questions about Nepal law & tax',
        countLine: formatHubStat(faqArticlesLoading, faqArticlesError, faqArticles.length, 'article', 'articles'),
        kind: 'tab' as const,
        tab: 'faqs' as const,
      },
    ],
    [
      noticesLoading,
      noticesError,
      notices.length,
      blogLoading,
      blogError,
      blogPosts.length,
      resourcesLoading,
      resourcesError,
      totalResourceCount,
      faqArticlesLoading,
      faqArticlesError,
      faqArticles.length,
    ],
  );

  useEffect(() => {
    setMainTab(location.hash === '#faqs' ? 'faqs' : 'downloads');
  }, [location.hash]);

  const setKnowledgeSectionTab = useCallback(
    (tab: KnowledgeSectionTab) => {
      setMainTab(tab);
      if (tab === 'faqs') {
        navigate('/knowledge#faqs', { replace: true });
      } else {
        navigate('/knowledge', { replace: true });
      }
    },
    [navigate],
  );

  const onDownload = useCallback(
    async (r: KnowledgeResourcePublicApi) => {
      if (fromApi && isUuid(r.id)) {
        try {
          const path = publicKnowledgeResourceDownloadApiPath(r.id);
          const res = await fetch(apiUrl(path), { method: 'GET', credentials: 'omit' });
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          const safe = (r.title || 'document')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 80);
          const name = `${safe || 'document'}.pdf`;
          const href = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = href;
          a.download = name;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(href);
          void qc.invalidateQueries({ queryKey: ['public-knowledge-resources'] });
        } catch {
          const url = cmsMediaSrc(r.download_href);
          if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      const url = cmsMediaSrc(r.download_href);
      if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
    },
    [fromApi, qc],
  );

  return (
    <CmsStoreProvider>
      <div className="min-h-screen bg-muted/25 dark:bg-background">
        <Header />
        <main className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#001F3F] dark:text-foreground mb-3">
                Knowledge Base
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
                Guides, templates, legal acts, and reference documents — your structured library for Nepalese tax and
                corporate compliance.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
              {hubCards.map((sc) => {
                const card = (
                  <Card
                    className={cn(
                      'h-full border border-border/80 shadow-sm hover:shadow-md transition-all duration-200',
                      'hover:-translate-y-0.5 rounded-xl bg-card',
                      sc.kind === 'tab' &&
                        mainTab === sc.tab &&
                        'ring-2 ring-[#001F3F]/25 dark:ring-primary/30 border-[#001F3F]/35 dark:border-primary/40',
                    )}
                  >
                    <CardContent className="p-6 text-center space-y-2">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <sc.icon className="h-7 w-7 text-[#001F3F] dark:text-primary" />
                      </div>
                      <h3 className="font-bold text-[#001F3F] dark:text-foreground text-sm">{sc.label}</h3>
                      <p className="text-xs text-muted-foreground leading-snug min-h-[2.5rem]">{sc.description}</p>
                      <p className="text-xs font-medium text-sky-700/90 dark:text-sky-400 pt-1">{sc.countLine}</p>
                    </CardContent>
                  </Card>
                );

                if (sc.kind === 'link') {
                  return (
                    <Link key={sc.label} to={sc.href}>
                      {card}
                    </Link>
                  );
                }

                return (
                  <button
                    key={sc.label}
                    type="button"
                    className="block w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => setKnowledgeSectionTab(sc.tab)}
                  >
                    {card}
                  </button>
                );
              })}
            </div>

            <Tabs value={mainTab} onValueChange={(v) => setKnowledgeSectionTab(v as KnowledgeSectionTab)} className="space-y-8">
              <TabsList className="inline-flex h-auto gap-2 rounded-lg bg-transparent p-0">
                <TabsTrigger
                  value="downloads"
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-foreground/90 shadow-none ring-offset-0 transition-colors data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:border-0 data-[state=inactive]:bg-muted/80 data-[state=inactive]:text-foreground/80"
                >
                  Downloads
                </TabsTrigger>
                <TabsTrigger
                  value="faqs"
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-foreground/90 shadow-none ring-offset-0 transition-colors data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:border-0 data-[state=inactive]:bg-muted/80 data-[state=inactive]:text-foreground/80"
                >
                  FAQs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="downloads" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      className="pl-11 h-12 rounded-xl border-border/80 bg-card shadow-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filterLabels.map((f) => (
                      <Button
                        key={f}
                        type="button"
                        variant={activeFilter === f ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'rounded-full px-4 font-medium',
                          activeFilter === f && 'bg-[#001F3F] hover:bg-[#001a36] text-primary-foreground border-[#001F3F]',
                        )}
                        onClick={() => setActiveFilter(f)}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>

                {resourcesLoading && (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    Loading resources…
                  </p>
                )}

                {resourcesError && (
                  <p className="text-sm text-destructive" role="alert">
                    Could not load resources. Please try again later.
                  </p>
                )}

                {!resourcesLoading && !resourcesError && filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {search.trim() || activeFilter !== 'All'
                      ? 'No resources match your filters.'
                      : 'No published resources yet.'}
                  </p>
                )}

                <div className="space-y-3">
                  {filtered.map((r, i) => (
                    <Card
                      key={`${r.id}-${i}`}
                      className="rounded-xl border border-border/80 shadow-sm hover:shadow-md transition-shadow bg-card"
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="p-2.5 rounded-lg bg-muted shrink-0">
                              <FileText className="h-5 w-5 text-[#001F3F] dark:text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[#001F3F] dark:text-foreground">{r.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[11px] font-normal rounded-md">
                                  {r.category}
                                </Badge>
                                <span>{r.file_type}</span>
                                <span>{r.file_size_label}</span>
                                <span>{r.download_count.toLocaleString()} downloads</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 rounded-lg border-border/90"
                            type="button"
                            onClick={() => void onDownload(r)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="faqs" id="faqs" className="pt-1">
                <PageHelpFaqs allPublished title="Frequently asked questions" className="max-w-2xl" />
              </TabsContent>
            </Tabs>

            <div className="mt-16 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <Scale className="h-10 w-10 mx-auto text-[#001F3F]/70 dark:text-primary/80 mb-3" />
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Looking for government circulars? Visit{' '}
                <Link to="/notices" className="font-medium text-[#001F3F] dark:text-primary underline-offset-4 hover:underline">
                  Notices
                </Link>{' '}
                or the full{' '}
                <Link to="/resources" className="font-medium text-[#001F3F] dark:text-primary underline-offset-4 hover:underline">
                  Resources
                </Link>{' '}
                hub.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default KnowledgeBase;
