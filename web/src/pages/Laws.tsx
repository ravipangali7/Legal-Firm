import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Lock, ChevronRight } from 'lucide-react';
import { lawSortOptions, type LawSortKey } from '@/data/lawsAndSummaries';
import { fetchPublicActs, type ActApi } from '@/lib/api';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { cn } from '@/lib/utils';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';
import { useAuth } from '@/context/AuthContext';
import { canAccessPremiumItem } from '@/lib/subscriptionAccess';
import { usePremiumSubscribeToast } from '@/hooks/usePremiumSubscribeToast';

function formatUpdated(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function normPath(href: string | undefined): string {
  if (!href) return '';
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return new URL(href).pathname.replace(/\/$/, '') || '/';
    }
  } catch {
    /* ignore */
  }
  return href.split('?')[0]?.replace(/\/$/, '') || '/';
}

const Laws = () => {
  const { config } = useSiteConfig();
  const { user } = useAuth();
  const toastPremium = usePremiumSubscribeToast();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const [sort, setSort] = useState<LawSortKey>('alpha');

  const {
    data: homepage,
    isLoading: homepageLoading,
  } = useQuery(siteHomepageQueryOptions);

  const {
    data: acts = [],
    isLoading: actsLoading,
    isError: actsError,
    refetch,
  } = useQuery({
    queryKey: ['public-acts'],
    queryFn: () => fetchPublicActs(),
    staleTime: 60_000,
  });

  const lawsNav = useMemo(() => {
    const items = homepage?.nav_items ?? [];
    return items.find((n) => n.enabled && normPath(n.href) === '/laws');
  }, [homepage]);

  const lawsService = useMemo(() => {
    const rows = homepage?.services ?? [];
    return rows.find((s) => s.enabled && normPath(s.href) === '/laws');
  }, [homepage]);

  const breadcrumbLabel = lawsNav?.label?.trim() || 'Laws';
  const heroTitle =
    lawsService?.title?.trim() ||
    (lawsNav?.label?.trim() ? `${lawsNav.label.trim()} library` : 'Acts & laws');
  const heroSubtitle =
    lawsService?.description?.trim() ||
    (config?.site_name
      ? `Search and filter acts published on ${config.site_name}.`
      : 'Search and filter acts from the catalog.');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of acts) {
      if (a.category?.trim()) set.add(a.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [acts]);

  const filtered = useMemo(() => {
    let list = acts.filter(
      (a) =>
        a.title_en.toLowerCase().includes(q.toLowerCase()) ||
        a.title_ne.includes(q)
    );
    if (active.length) list = list.filter((a) => active.includes(a.category.trim()));
    if (sort === 'alpha') list = [...list].sort((a, b) => a.title_en.localeCompare(b.title_en));
    if (sort === 'recent') list = [...list].sort((a, b) => b.updated.localeCompare(a.updated));
    return list;
  }, [q, active, sort, acts]);

  const toggleCat = (c: string) =>
    setActive((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const loading = actsLoading;
  const countLabel = filtered.length === 1 ? 'act' : 'acts';

  const renderRow = (a: ActApi) => {
    const unlocked = canAccessPremiumItem(user, a);
    const rowClass = cn(
      'group block rounded-md border border-border bg-card px-4 py-3 text-left w-full',
      'hover:bg-accent/30 hover:border-l-4 hover:border-l-primary transition-all',
      !unlocked && 'opacity-90 cursor-pointer',
    );
    const inner = (
      <>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground group-hover:text-primary-onBg truncate">{a.title_en}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {a.title_ne} · Updated {formatUpdated(a.updated)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{a.year}</Badge>
            {a.premium && !unlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-500/15 border border-amber-400/50 rounded-full px-2 py-0.5">
                <Lock className="h-3 w-3" /> Subscriber only
              </span>
            ) : null}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-onBg" />
          </div>
        </div>
      </>
    );
    if (!unlocked) {
      return (
        <button
          type="button"
          key={a.slug}
          className={rowClass}
          onClick={() => toastPremium(Boolean(user))}
        >
          {inner}
        </button>
      );
    }
    return (
      <Link key={a.slug} to={`/laws/${a.slug}`} className={rowClass}>
        {inner}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="page-hero-band">
        <div className="container mx-auto px-4">
          <nav className="text-xs opacity-80 mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            &gt;{' '}
            {homepageLoading ? <Skeleton className="inline-block h-3 w-16 align-middle bg-primary-foreground/20" /> : breadcrumbLabel}
          </nav>
          {homepageLoading && actsLoading ? (
            <>
              <Skeleton className="h-9 w-3/4 max-w-xl bg-primary-foreground/20" />
              <Skeleton className="h-4 w-full max-w-2xl mt-3 bg-primary-foreground/15" />
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold">{heroTitle}</h1>
              <p className="opacity-80 mt-2 max-w-2xl">{heroSubtitle}</p>
            </>
          )}
          <div className="relative max-w-xl mt-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search acts by English or Nepali title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
              className="pl-10 bg-white text-foreground"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 flex-1">
        {actsError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
            <p className="text-destructive font-medium">Could not load acts.</p>
            <p className="text-muted-foreground mt-1">Check that the API is running and try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            <aside className="col-span-12 md:col-span-3 space-y-6">
              <div className="rounded-lg border border-border p-4 bg-card">
                <h3 className="text-sm font-semibold mb-3">Category</h3>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-5 w-full" />
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No categories yet.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={active.includes(c)} onCheckedChange={() => toggleCat(c)} />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border p-4 bg-card">
                <h3 className="text-sm font-semibold mb-3">Sort by</h3>
                <div className="space-y-2 text-sm">
                  {lawSortOptions.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        checked={sort === key}
                        onChange={() => setSort(key)}
                        className="accent-primary"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            <div className="col-span-12 md:col-span-9 space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-40 mb-2" />
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-[4.25rem] w-full rounded-md" />
                  ))}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    {filtered.length} {countLabel}
                  </p>
                  {filtered.map(renderRow)}
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground py-12 text-center">No acts match your filters.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <PageHelpFaqs category="Laws" title="Acts & laws FAQs" className="mt-12" />
      </section>

      <Footer />
    </div>
  );
};

export default Laws;
