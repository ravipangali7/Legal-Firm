import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Eye, ThumbsUp, ThumbsDown, Lock, ChevronRight } from 'lucide-react';
import { fetchPublicSummaries, fetchPublicSummaryCategories, postSummaryTrackViews } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';
import { useAuth } from '@/context/AuthContext';
import { canAccessPremiumItem } from '@/lib/subscriptionAccess';
import { usePremiumSubscribeToast } from '@/hooks/usePremiumSubscribeToast';
import { useListingFacetsSeo } from '@/lib/seo/useListingFacetsSeo';

const TEAL = 'bg-emerald-600 text-white';

function formatPosted(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

/** Pill styles: hex from API or fallback muted chip. */
function categoryPillClass(color: string | undefined): string {
  if (!color) return 'bg-muted/60 text-foreground border-border';
  if (color.includes('bg-') || color.includes('text-')) return cn('border', color);
  return 'bg-muted/40 text-foreground border-border';
}

function categoryPillStyle(color: string | undefined): CSSProperties | undefined {
  if (!color || color.includes('bg-')) return undefined;
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())) return undefined;
  const c = color.trim();
  return {
    borderColor: c,
    color: c,
    backgroundColor: `${c}18`,
  };
}

const Summaries = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toastPremium = usePremiumSubscribeToast();
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const listViewsSentRef = useRef<Set<string>>(new Set());

  useListingFacetsSeo('/summaries', {
    title: 'Summaries',
    description: 'Legal summaries and commentary on key topics.',
    hasActiveFilters: Boolean(q.trim()) || activeCat != null,
    hasSearch: Boolean(q.trim()),
  });

  const {
    data: categories = [],
    isLoading: catLoading,
    isError: catError,
    refetch: refetchCat,
  } = useQuery({
    queryKey: ['summary-categories'],
    queryFn: fetchPublicSummaryCategories,
    staleTime: 60_000,
  });

  const {
    data: summaries = [],
    isLoading: sumLoading,
    isError: sumError,
    refetch: refetchSum,
  } = useQuery({
    queryKey: ['summaries'],
    queryFn: () => fetchPublicSummaries(),
    staleTime: 60_000,
  });

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories],
  );

  const countsBySlug = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of summaries) {
      const k = s.category_slug || '';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [summaries]);

  const filtered = useMemo(() => {
    let list = summaries.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
    if (activeCat) list = list.filter((s) => s.category_slug === activeCat);
    return list;
  }, [q, activeCat, summaries]);

  const filteredSlugsKey = useMemo(
    () => filtered.map((s) => s.slug).sort().join('\n'),
    [filtered],
  );

  const loading = catLoading || sumLoading;
  const error = catError || sumError;

  useEffect(() => {
    if (loading || error) return;
    const pending = filtered
      .map((s) => s.slug)
      .filter((slug) => !listViewsSentRef.current.has(slug));
    if (!pending.length) return;
    let cancelled = false;
    void (async () => {
      try {
        await postSummaryTrackViews(pending);
        if (cancelled) return;
        pending.forEach((slug) => listViewsSentRef.current.add(slug));
        await queryClient.invalidateQueries({ queryKey: ['summaries'] });
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, error, filteredSlugsKey, queryClient, filtered]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="bg-primary text-primary-foreground pt-28 pb-10">
        <div className="container mx-auto px-4">
          <nav className="text-xs opacity-80 mb-2">
            <Link to="/" className="hover:underline">Home</Link> &gt; Summaries
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold">Legal &amp; Tax Summaries</h1>
          <p className="opacity-80 mt-2">Quick reference summaries with rates, thresholds and notes.</p>
          <div className="relative max-w-xl mt-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search summaries…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 bg-white text-foreground"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3">
          <div className="sticky top-24 rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold">Categories</h3>
            </div>
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-muted-foreground space-y-2">
                <p>Could not load categories.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => { void refetchCat(); void refetchSum(); }}>
                  Retry
                </Button>
              </div>
            ) : (
              <ul className="text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveCat(null)}
                    className={cn(
                      'w-full text-left px-3 py-2 border-b border-border/60 flex justify-between items-center',
                      !activeCat ? TEAL : 'hover:bg-muted/50',
                    )}
                  >
                    <span>All Summaries</span>
                    <span className="text-xs opacity-80">{summaries.length}</span>
                  </button>
                </li>
                {sortedCategories.map((c) => {
                  const active = activeCat === c.slug;
                  const count = countsBySlug.get(c.slug) ?? 0;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCat(c.slug)}
                        className={cn(
                          'w-full text-left px-3 py-2 border-b border-border/60 flex justify-between items-center',
                          active ? TEAL : 'hover:bg-muted/50',
                        )}
                      >
                        <span>{c.name}</span>
                        <span className="text-xs opacity-80">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="col-span-12 md:col-span-9 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Summaries could not be loaded.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{filtered.length} summaries</p>
              {filtered.map((s) => {
                const unlocked = canAccessPremiumItem(user, s);
                const cat = sortedCategories.find((c) => c.slug === s.category_slug);
                const pillColor = cat?.color;
                const rowClass =
                  'group block rounded-md border border-border bg-card p-4 hover:border-l-4 hover:border-l-primary hover:bg-accent/20 transition-all text-left w-full';
                const titleRow = (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-foreground group-hover:text-primary-onBg">
                            {s.title}
                          </h2>
                          {s.premium && !unlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-500/15 border border-amber-400/50 rounded-full px-2 py-0.5">
                              <Lock className="h-3 w-3" /> Subscriber only
                            </span>
                          ) : null}
                        </div>
                );
                const rest = (
                  <>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.preview}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {(cat || s.category_name) && (
                        <span
                          className={cn('rounded-full border px-2 py-0.5', categoryPillClass(pillColor))}
                          style={categoryPillStyle(pillColor)}
                        >
                          {cat?.name ?? s.category_name}
                        </span>
                      )}
                      <span>{formatPosted(s.posted)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {s.views.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ThumbsUp className="h-3 w-3" />
                        {s.upvotes}
                      </span>
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <ThumbsDown className="h-3 w-3" />
                        {s.downvotes}
                      </span>
                    </div>
                  </>
                );
                if (!unlocked) {
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className={rowClass}
                      onClick={() => toastPremium(Boolean(user))}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          {titleRow}
                          {rest}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                }
                return (
                  <Link key={s.id} to={`/summaries/${s.slug}`} className={rowClass}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        {titleRow}
                        {rest}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-12 text-center">No summaries found.</p>
              )}
            </>
          )}
        </div>

        <div className="col-span-12 mt-10">
          <PageHelpFaqs category="Summaries" title="Summaries FAQs" />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Summaries;
