import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Printer, ThumbsUp, ThumbsDown, Eye, FileText, Download } from 'lucide-react';
import {
  fetchPublicSummaries,
  fetchPublicSummaryBySlug,
  postSummaryTrackViews,
  postSummaryVote,
} from '@/lib/api';
import { formatSummaryBodyHtml, extractTocFromFormattedHtml } from '@/lib/summaryHtml';
import { downloadSummaryAsPdf } from '@/lib/summaryPdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import PaywallGate from '@/components/PaywallGate';
import { canAccessCaseSummaries } from '@/lib/subscriptionAccess';

const TEAL = 'bg-emerald-600 text-white';

function formatPosted(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

const SummaryDetail = () => {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  const {
    data: summaries = [],
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => fetchPublicSummaries(),
    staleTime: 60_000,
  });

  const {
    data: current,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['summary', slug],
    queryFn: () => fetchPublicSummaryBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 30_000,
  });

  const list = useMemo(
    () => summaries.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())),
    [q, summaries],
  );

  const bodyHtml = useMemo(
    () => (current ? formatSummaryBodyHtml(current.body) : ''),
    [current],
  );

  const tocSections = useMemo(() => extractTocFromFormattedHtml(bodyHtml), [bodyHtml]);

  const voteMutation = useMutation({
    mutationFn: (vote: 'up' | 'down' | null) => {
      if (!slug) throw new Error('missing slug');
      return postSummaryVote(slug, vote);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['summary', data.slug], data);
      void queryClient.invalidateQueries({ queryKey: ['summaries'] });
    },
    onError: () => {
      toast.error('Could not save your feedback. Please try again.');
    },
  });

  useEffect(() => {
    if (!slug || detailLoading || detailError || !current) return;
    let cancelled = false;
    void postSummaryTrackViews([slug])
      .then(async () => {
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ['summaries'] });
        await queryClient.invalidateQueries({ queryKey: ['summary', slug] });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [slug, current?.id, detailLoading, detailError, queryClient, current]);

  const handlePrint = useCallback(() => {
    if (!current) return;
    const prev = document.title;
    document.title = `${current.title} — Summaries`;
    const restore = () => {
      document.title = prev;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }, [current]);

  const handlePdfDownload = useCallback(async () => {
    if (!current) return;
    setPdfBusy(true);
    try {
      await downloadSummaryAsPdf(current);
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF. Try Print and choose Save as PDF instead.');
    } finally {
      setPdfBusy(false);
    }
  }, [current]);

  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 flex-1 container mx-auto px-4 text-center text-muted-foreground text-sm">
          Missing summary link.
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
          <p className="text-muted-foreground">Could not load this summary.</p>
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
          <h1 className="text-2xl font-semibold">Summary not found</h1>
          <p className="text-muted-foreground">There is no summary for “{slug}”.</p>
          <Button asChild variant="default">
            <Link to="/summaries">Back to summaries</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const myVote = current.my_vote ?? null;

  const summariesUnlocked = canAccessCaseSummaries(user);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="pt-24 flex-1 print:pt-4">
        <div className="container mx-auto px-4">
          <nav className="text-xs text-muted-foreground py-3 print:hidden">
            <Link to="/" className="hover:underline">Home</Link> &gt;{' '}
            <Link to="/summaries" className="hover:underline">Summaries</Link> &gt;{' '}
            <span className="text-foreground">{current.title}</span>
          </nav>

          <div className="grid grid-cols-12 gap-6 pb-10">
            <aside className="col-span-12 md:col-span-3 print:hidden">
              <div className="sticky top-24 rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search summaries"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <ul className="max-h-[70vh] overflow-y-auto text-sm">
                  {list.map((s) => {
                    const isActive = s.slug === current.slug;
                    return (
                      <li key={s.id}>
                        <Link
                          to={`/summaries/${s.slug}`}
                          className={cn(
                            'block px-3 py-2 border-b border-border/60 transition-colors',
                            isActive ? TEAL : 'hover:bg-muted/50 text-foreground',
                          )}
                        >
                          {s.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <div className="col-span-12 md:col-span-9 grid grid-cols-12 gap-6 print:col-span-12">
              <div className="col-span-12 lg:col-span-9">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4 print:mb-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground print:text-foreground">
                    <span>Posted {formatPosted(current.posted)}</span>
                    <span className="inline-flex items-center gap-1 print:hidden">
                      <Eye className="h-3 w-3" /> {current.views.toLocaleString()}
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

                <h1 className="text-2xl md:text-3xl font-bold mb-6 print:text-black">{current.title}</h1>

                <PaywallGate
                  unlocked={summariesUnlocked}
                  contentType="Summary"
                  previewHeight={560}
                >
                  <article
                    className="prose max-w-none summary-print-body print:prose-sm print:max-w-none"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                </PaywallGate>

                <div className="mt-8 flex items-center justify-between flex-wrap gap-3 rounded-md border border-border bg-card p-4 print:hidden">
                  <p className="text-sm font-medium text-primary-onBg">Was this helpful?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={voteMutation.isPending}
                      className={cn(
                        'gap-1',
                        myVote === 'up' ? 'border-2 border-primary' : 'border border-border',
                      )}
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
                      className={cn(
                        'gap-1',
                        myVote === 'down' ? 'border-2 border-primary' : 'border border-border',
                      )}
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

              <aside className="hidden lg:block lg:col-span-3 print:hidden">
                <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> On This Page
                  </h4>
                  {tocSections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No section headings in this summary.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {tocSections.map((s, i) => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className={cn(
                              'block py-1 border-l-2 pl-3 transition-colors',
                              i === 0
                                ? 'border-primary text-primary-onBg font-medium'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            )}
                          >
                            {s.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
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

export default SummaryDetail;
