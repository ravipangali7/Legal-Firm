import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Printer, Download, FileText } from 'lucide-react';
import type { ActItem, LawDetailContent } from '@/data/lawsAndSummaries';
import { getLawDetailContent, parseLawDetailFromApi } from '@/data/lawsAndSummaries';

const LOCKED_LAW_DETAIL_PLACEHOLDER: LawDetailContent = {
  tabs: [{ id: 'content', label: 'Content', labelNe: 'सामग्री' }],
  sections: [
    {
      id: 'preview',
      label: '',
      labelNe: '',
      title: '',
      titleNe: '',
      paragraphs: { en: [''], ne: [''] },
    },
  ],
  callout: { title: '', titleNe: '', body: { en: '', ne: '' } },
  amendments: [],
  relatedCases: [],
};
import { fetchPublicActs, fetchPublicActBySlug, type ActApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import PaywallGate from '@/components/PaywallGate';
import { useAuth } from '@/context/AuthContext';
import { canAccessPremiumItem } from '@/lib/subscriptionAccess';
import { jsPDF } from 'jspdf';
import { buildLawPdfSegments, registerNepaliFonts, renderLawPdfSegments } from '@/lib/lawPdf';
import { usePageSeo } from '@/context/SeoContext';
import { SocialShareButtons } from '@/components/seo/SocialShareButtons';
import { entitySeoDescription, entitySeoTitle } from '@/lib/seo';

const TEAL = 'bg-emerald-600 text-white'; // active sidebar item

type Lang = 'en' | 'ne';

function actApiToItem(a: ActApi): ActItem {
  return {
    slug: a.slug,
    titleEn: a.title_en,
    titleNe: a.title_ne,
    category: a.category as ActItem['category'],
    year: a.year,
    updated: a.updated,
    premium: a.premium,
  };
}

const LawDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [q, setQ] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [tab, setTab] = useState<'content' | 'amendments' | 'cases'>('content');
  const printableRef = useRef<HTMLDivElement | null>(null);

  const {
    data: acts = [],
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['public-acts'],
    queryFn: () => fetchPublicActs(),
    staleTime: 60_000,
  });

  const {
    data: actBySlug,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['public-act', slug],
    queryFn: () => fetchPublicActBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const currentApi = useMemo((): ActApi | undefined => {
    if (!slug) return undefined;
    if (detailLoading) return undefined;
    return actBySlug ?? acts.find((a) => a.slug === slug) ?? undefined;
  }, [slug, acts, detailLoading, actBySlug]);

  const current = useMemo(() => (currentApi ? actApiToItem(currentApi) : null), [currentApi]);

  usePageSeo(
    currentApi && slug
      ? {
          title: entitySeoTitle(currentApi.meta_title, currentApi.title_en),
          description: entitySeoDescription(
            currentApi.meta_description,
            `${currentApi.category} · ${currentApi.year}`
          ),
          pathname: `/laws/${slug}`,
          type: 'article',
          image: currentApi.share_image || undefined,
        }
      : null
  );

  const contentUnlocked = canAccessPremiumItem(user, current);

  const filtered = useMemo(
    () => acts.filter((a) => a.title_en.toLowerCase().includes(q.toLowerCase())),
    [q, acts]
  );

  const detail = useMemo(() => {
    if (!current) return null;
    const fromApi = parseLawDetailFromApi(currentApi?.detail_json);
    if (fromApi) return fromApi;
    if (!current.premium || contentUnlocked) return getLawDetailContent(current);
    return LOCKED_LAW_DETAIL_PLACEHOLDER;
  }, [current, currentApi, contentUnlocked]);
  
  const printTitle = useMemo(() => {
    if (!current || !detail) return '';
    const activeTab = detail.tabs.find((t) => t.id === tab);
    const tabLabel =
      lang === 'en'
        ? (activeTab?.label ?? tab)
        : (activeTab?.labelNe ?? activeTab?.label ?? tab);
    const actTitle = lang === 'en' ? current.titleEn : current.titleNe;
    return `${actTitle} — ${tabLabel}`;
  }, [current, detail, tab, lang]);

  const loading = listLoading || (Boolean(slug) && detailLoading);

  const notFound = !loading && Boolean(slug) && !currentApi && !listError;

  const nextPath = `${location.pathname}${location.search}`;

  const requireLogin = (): boolean => {
    if (authLoading) return false;
    if (user) return true;
    navigate(`/login?next=${encodeURIComponent(nextPath)}`);
    return false;
  };

  const handlePrint = () => {
    if (!requireLogin()) return;
    document.body.classList.add('print-law-only');
    const cleanup = () => {
      document.body.classList.remove('print-law-only');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    try {
      window.print();
    } finally {
      // Fallback in case `afterprint` does not fire in some browsers.
      window.setTimeout(cleanup, 0);
    }
  };

  const handlePdfDownload = async () => {
    if (!current || !detail) return;
    if (!requireLogin()) return;

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      if (lang === 'ne') {
        await registerNepaliFonts(doc);
      }
      const segments = buildLawPdfSegments(detail, tab, lang, current);
      renderLawPdfSegments(doc, segments, lang);

      const safeName = current.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const suffix = lang === 'ne' ? '-ne' : '';
      doc.save(`${safeName}${suffix}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  if (listError || detailError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto px-4 pt-28 pb-16 flex-1">
          <p className="text-destructive text-sm font-medium">Could not load this act.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void refetchList();
              void refetchDetail();
            }}
          >
            Retry
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto px-4 pt-28 pb-16 flex-1 space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !current || !detail) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto px-4 pt-28 pb-16 flex-1 text-center">
          <p className="text-muted-foreground text-sm">This act was not found in the catalog.</p>
          <Link to="/laws" className="text-primary-onBg text-sm font-medium inline-block mt-4 hover:underline">
            Back to laws
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="pt-24 flex-1">
        <div className="container mx-auto px-4">
          <nav className="text-xs text-muted-foreground py-3">
            <Link to="/" className="hover:underline">
              Home
            </Link>{' '}
            &gt;{' '}
            <Link to="/laws" className="hover:underline">
              Laws
            </Link>{' '}
            &gt;{' '}
            <span className="text-foreground">{current.titleEn}</span>
          </nav>

          <div className="grid grid-cols-12 gap-6 pb-10">
            <aside className="col-span-12 md:col-span-3 lg:col-span-3">
              <div className="sticky top-24 rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Act"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <ul className="max-h-[70vh] overflow-y-auto text-sm">
                  {listLoading && acts.length === 0 ? (
                    <li className="p-3 space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </li>
                  ) : (
                    filtered.map((a) => {
                      const isActive = a.slug === current.slug;
                      return (
                        <li key={a.slug}>
                          <Link
                            to={`/laws/${a.slug}`}
                            className={cn(
                              'block px-3 py-2 border-b border-border/60 transition-colors',
                              isActive ? TEAL : 'hover:bg-muted/50 text-foreground'
                            )}
                          >
                            {a.title_en}
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </aside>

            <div className="col-span-12 md:col-span-9 lg:col-span-9 grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-9">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    {detail.tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                          'px-3 py-1.5 text-sm capitalize',
                          tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                        )}
                      >
                        {lang === 'en' ? t.label : t.labelNe}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
                      <Printer className="h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={handlePdfDownload}>
                      <Download className="h-4 w-4" /> PDF Download
                    </Button>
                  </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">{current.titleEn}</h1>
                <p className="text-sm text-muted-foreground mb-4">{current.titleNe}</p>

                <div className="inline-flex rounded-md border border-border mb-6 overflow-hidden">
                  {(['en', 'ne'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={cn(
                        'px-4 py-1.5 text-sm',
                        lang === l ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                      )}
                    >
                      {l === 'en' ? 'English' : 'नेपाली'}
                    </button>
                  ))}
                </div>

                <div ref={printableRef} className="law-print-root">
                  <h1 className="hidden print:block text-xl font-bold mb-3">{printTitle}</h1>
                  <PaywallGate unlocked={contentUnlocked} contentType="Act" previewHeight={520}>
                    {tab === 'content' ? (
                      <article className="prose max-w-none">
                        {detail.sections.map((section, sectionIndex) => (
                          <div key={section.id}>
                            <h2
                              id={section.id}
                              className={cn('text-xl font-bold text-primary-onBg', sectionIndex === 0 ? 'mt-2' : 'mt-6')}
                            >
                              {lang === 'en' ? section.title : section.titleNe}
                            </h2>
                            {(lang === 'en' ? section.paragraphs.en : section.paragraphs.ne).map((line) => (
                              <p key={`${section.id}-${line}`} className="leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        ))}

                        <div className="my-5 rounded-md border-l-4 border-primary/50 bg-primary/10 p-4 text-sm text-foreground">
                          <strong className="block text-primary-onBg">
                            {lang === 'en' ? detail.callout.title : detail.callout.titleNe}
                          </strong>
                          {lang === 'en' ? detail.callout.body.en : detail.callout.body.ne}
                        </div>
                      </article>
                    ) : (
                      <article className="prose max-w-none">
                        <h2 className="text-xl font-bold text-primary-onBg mt-2">
                          {lang === 'en'
                            ? detail.tabs.find((t) => t.id === tab)?.label
                            : detail.tabs.find((t) => t.id === tab)?.labelNe}
                        </h2>
                        <ul>
                          {(tab === 'amendments' ? detail.amendments : detail.relatedCases).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </article>
                    )}
                  </PaywallGate>
                </div>
              </div>

              <aside className="hidden lg:block lg:col-span-3">
                <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> On This Page
                  </h4>
                  <ul className="space-y-1.5 text-sm">
                    {detail.sections.map((s, i) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className={cn(
                            'block py-1 border-l-2 pl-3 transition-colors',
                            i === 0
                              ? 'border-primary text-primary-onBg font-medium'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                          )}
                        >
                          {lang === 'en' ? s.label : s.labelNe}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LawDetail;
