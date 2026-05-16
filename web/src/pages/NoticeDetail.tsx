import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, ThumbsUp, ThumbsDown, Eye, Download, Calendar } from 'lucide-react';
import {
  fetchPublicNotices,
  fetchPublicNoticeBySlug,
  fetchPublicNoticeSlugByLegacyId,
  postNoticeTrackViews,
  postNoticeVote,
  postPublicTranslateEnNe,
} from '@/lib/api';
import {
  buildNoticeEnFields,
  buildNoticeNeFields,
  collectNoticeNepaliMtParts,
  type NoticeNepaliMtMap,
} from '@/lib/noticeDisplay';
import { downloadNoticeAsPdf } from '@/lib/noticePdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePageSeo } from '@/context/SeoContext';

const TEAL = 'bg-emerald-600 text-white';

const LEGACY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatPosted(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

const NoticeDetail = () => {
  const { slug: rawSlug } = useParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [contentLang, setContentLang] = useState<'en' | 'ne'>('en');
  const [pdfBusy, setPdfBusy] = useState(false);

  const isLegacyUuid = useMemo(() => Boolean(rawSlug && LEGACY_UUID_RE.test(rawSlug)), [rawSlug]);

  const legacyResolve = useQuery({
    queryKey: ['notice-legacy-slug', rawSlug],
    queryFn: () => fetchPublicNoticeSlugByLegacyId(rawSlug!),
    enabled: Boolean(isLegacyUuid && rawSlug),
    retry: false,
  });

  const slug = rawSlug ?? '';

  const {
    data: notices = [],
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['public-notices'],
    queryFn: () => fetchPublicNotices(),
    staleTime: 60_000,
  });

  const {
    data: current,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['public-notice', slug],
    queryFn: () => fetchPublicNoticeBySlug(slug),
    enabled: Boolean(slug) && !isLegacyUuid,
    staleTime: 30_000,
  });

  usePageSeo(
    current && slug
      ? {
          title: current.title,
          description: current.excerpt,
          pathname: `/notices/${slug}`,
          type: 'article',
          publishedTime: current.created_at,
        }
      : null
  );

  const list = useMemo(
    () =>
      notices.filter((n) => {
        const t = q.trim().toLowerCase();
        if (!t) return true;
        return (
          n.title.toLowerCase().includes(t) ||
          (n.title_ne && n.title_ne.toLowerCase().includes(t)) ||
          (n.excerpt && n.excerpt.toLowerCase().includes(t)) ||
          (n.excerpt_ne && n.excerpt_ne.toLowerCase().includes(t))
        );
      }),
    [q, notices],
  );

  const mtParts = useMemo(() => {
    if (!current) return { keys: [] as (keyof NoticeNepaliMtMap)[], texts: [] as string[] };
    return collectNoticeNepaliMtParts(current);
  }, [current]);

  const nepaliMtQuery = useQuery({
    queryKey: ['notice-nepali-mt', current?.id, mtParts.texts.join('\u0001')],
    queryFn: async (): Promise<NoticeNepaliMtMap> => {
      const { keys, texts } = mtParts;
      const out = await postPublicTranslateEnNe(texts);
      const map: NoticeNepaliMtMap = {};
      keys.forEach((k, i) => {
        map[k] = out[i] ?? '';
      });
      return map;
    },
    enabled: Boolean(current && contentLang === 'ne' && mtParts.texts.length > 0),
    staleTime: Infinity,
    retry: 1,
  });

  const displayFields = useMemo(() => {
    if (!current) return null;
    return contentLang === 'en'
      ? buildNoticeEnFields(current)
      : buildNoticeNeFields(current, nepaliMtQuery.data ?? undefined);
  }, [current, contentLang, nepaliMtQuery.data]);

  useEffect(() => {
    if (!nepaliMtQuery.isError) return;
    toast.error('Nepali translation could not be loaded. Some text may stay in English.', { id: 'notice-ne-mt' });
  }, [nepaliMtQuery.isError]);

  useEffect(() => {
    if (!slug || isLegacyUuid || detailLoading || detailError || !current) return;
    let cancelled = false;
    void postNoticeTrackViews([current.id])
      .then(async () => {
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ['public-notices'] });
        await queryClient.invalidateQueries({ queryKey: ['public-notice', slug] });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [slug, isLegacyUuid, current?.id, detailLoading, detailError, queryClient, current]);

  const voteMutation = useMutation({
    mutationFn: (vote: 'up' | 'down' | null) => {
      if (!slug) throw new Error('missing slug');
      return postNoticeVote(slug, vote);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['public-notice', slug], data);
      void queryClient.invalidateQueries({ queryKey: ['public-notices'] });
    },
    onError: () => {
      toast.error('Could not save your feedback. Please try again.');
    },
  });

  const nepaliMtBlocking =
    Boolean(current && contentLang === 'ne' && mtParts.texts.length > 0 && nepaliMtQuery.isPending);

  const handlePrint = useCallback(() => {
    if (!current || !displayFields) return;
    if (nepaliMtBlocking) {
      toast.info('Please wait for the Nepali translation to finish.');
      return;
    }
    const prev = document.title;
    document.title = `${displayFields.title} — Notices`;
    const restore = () => {
      document.title = prev;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, [current, displayFields, nepaliMtBlocking]);

  const handlePdfDownload = useCallback(async () => {
    if (!current || !displayFields) return;
    if (nepaliMtBlocking) {
      toast.info('Please wait for the Nepali translation to finish.');
      return;
    }
    setPdfBusy(true);
    try {
      await downloadNoticeAsPdf(current, displayFields, contentLang === 'ne' ? 'ne' : 'en');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF. Try Print and choose Save as PDF instead.');
    } finally {
      setPdfBusy(false);
    }
  }, [current, displayFields, contentLang, nepaliMtBlocking]);

  if (!rawSlug) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 flex-1 container mx-auto px-4 text-center text-muted-foreground text-sm">
          Missing notice link.
        </main>
        <Footer />
      </div>
    );
  }

  if (isLegacyUuid) {
    if (legacyResolve.isPending) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="pt-24 flex-1 print:hidden">
            <div className="container mx-auto px-4 py-6 space-y-4">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          </div>
          <Footer />
        </div>
      );
    }
    if (legacyResolve.data?.slug) {
      return <Navigate to={`/notices/${legacyResolve.data.slug}`} replace />;
    }
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 flex-1 container mx-auto px-4 text-center space-y-4 print:hidden">
          <h1 className="text-2xl font-semibold">Notice not found</h1>
          <p className="text-muted-foreground">This link is invalid or the notice is no longer published.</p>
          <Button asChild variant="default">
            <Link to="/notices">Back to notices</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const loading = listLoading || detailLoading;
  const error = listError || detailError;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="pt-24 flex-1 print:hidden">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-12 md:col-span-3 h-96" />
              <div className="col-span-12 md:col-span-9 space-y-3">
                <Skeleton className="h-8 w-full max-w-md" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 flex-1 container mx-auto px-4 text-center space-y-4 print:hidden">
          <p className="text-muted-foreground">Could not load this notice.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refetchList();
              void refetchDetail();
            }}
          >
            Retry
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 flex-1 container mx-auto px-4 text-center space-y-4 print:hidden">
          <h1 className="text-2xl font-semibold">Notice not found</h1>
          <p className="text-muted-foreground">This notice is unavailable or no longer published.</p>
          <Button asChild variant="default">
            <Link to="/notices">Back to notices</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const d = displayFields!;
  const myVote = current.my_vote ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="pt-24 flex-1 print:pt-4">
        <div className="container mx-auto px-4">
          <nav className="text-xs text-muted-foreground py-3 print:hidden">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            &gt;{' '}
            <Link to="/notices" className="hover:underline">
              Notices
            </Link>{' '}
            &gt;{' '}
            <span className="text-foreground">{nepaliMtBlocking ? current.title : d.title}</span>
          </nav>

          <div className="grid grid-cols-12 gap-6 pb-10">
            <aside className="col-span-12 md:col-span-3 print:hidden">
              <div className="sticky top-24 rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notices"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <ul className="max-h-[70vh] overflow-y-auto text-sm">
                  {list.map((n) => {
                    const isActive = n.slug === current.slug;
                    return (
                      <li key={n.id}>
                        <Link
                          to={`/notices/${n.slug}`}
                          className={cn(
                            'block px-3 py-2 border-b border-border/60 transition-colors',
                            isActive ? TEAL : 'hover:bg-muted/50 text-foreground',
                          )}
                        >
                          {n.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <div className="col-span-12 md:col-span-9 space-y-4 print:col-span-12">
              <div className="flex items-center justify-between flex-wrap gap-3 print:mb-2">
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap print:text-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Posted {formatPosted(current.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1 print:hidden">
                    <Eye className="h-3 w-3" /> {current.view_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={pdfBusy}
                    onClick={() => void handlePdfDownload()}
                  >
                    <Download className="h-4 w-4" /> {pdfBusy ? 'PDF…' : 'PDF'}
                  </Button>
                </div>
              </div>

              <div
                className="print:hidden inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4"
                role="tablist"
                aria-label="Language"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentLang === 'en'}
                  className={cn(
                    'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                    contentLang === 'en'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground',
                  )}
                  onClick={() => setContentLang('en')}
                >
                  English
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={contentLang === 'ne'}
                  className={cn(
                    'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
                    contentLang === 'ne'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground',
                  )}
                  onClick={() => setContentLang('ne')}
                >
                  नेपाली
                </button>
              </div>

              <div>
                {nepaliMtBlocking ? (
                  <div className="space-y-4 print:hidden">
                    <p className="text-sm text-muted-foreground">Translating to Nepali…</p>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-10 w-full max-w-2xl" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-2 print:text-foreground">Issued by {d.issuedBy}</p>
                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-[#0a1628] dark:text-foreground print:text-black">
                      {d.title}
                    </h1>
                    {Array.isArray(current.tags) && current.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
                        {current.tags.map((t) => (
                          <Badge key={t} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-md">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {d.excerpt ? (
                      <p className="text-muted-foreground leading-relaxed mb-6 border-l-4 border-emerald-600 pl-4 print:text-foreground print:border-foreground">
                        {d.excerpt}
                      </p>
                    ) : null}
                    <article className="prose max-w-none dark:prose-invert notice-print-body print:prose-sm print:max-w-none whitespace-pre-wrap">
                      {d.body?.trim() ? (
                        d.body
                      ) : (
                        <span className="text-muted-foreground">No additional body.</span>
                      )}
                    </article>
                  </>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between flex-wrap gap-3 rounded-md border border-border bg-card p-4 print:hidden">
                <p className="text-sm font-medium text-primary-onBg">Was this helpful?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={voteMutation.isPending}
                    className={cn('gap-1', myVote === 'up' ? 'border-2 border-primary' : 'border border-border')}
                    onClick={() => {
                      const next = myVote === 'up' ? null : 'up';
                      voteMutation.mutate(next);
                    }}
                  >
                    <ThumbsUp className="h-4 w-4" /> {current.upvotes}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={voteMutation.isPending}
                    className={cn('gap-1', myVote === 'down' ? 'border-2 border-primary' : 'border border-border')}
                    onClick={() => {
                      const next = myVote === 'down' ? null : 'down';
                      voteMutation.mutate(next);
                    }}
                  >
                    <ThumbsDown className="h-4 w-4" /> {current.downvotes}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default NoticeDetail;
