import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { CmsStoreProvider, useCms } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import * as Icons from 'lucide-react';
import { ArrowUpRight, Users } from 'lucide-react';
import { HtmlPreview } from '@/components/HtmlPreview';
import { cn } from '@/lib/utils';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';

function bodyParagraphs(body: string): string[] {
  const t = (body || '').trim();
  if (!t) return [];
  const parts = t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [t];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function AboutBody({ loadError }: { loadError: boolean }) {
  const { about, services, team: allTeam } = useCms();
  const imgSrc = cmsMediaSrc(about.image);
  const paragraphs = useMemo(() => bodyParagraphs(about.body), [about.body]);
  const lead = paragraphs[0] ?? '';
  const rest = paragraphs.slice(1);
  const stats = about.stats ?? [];
  const statCount = stats.length;
  const statGridClass =
    statCount <= 1
      ? 'grid-cols-1 max-w-[16rem]'
      : statCount === 2
        ? 'grid-cols-2 max-w-lg gap-5 sm:gap-6'
        : statCount === 3
          ? 'grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5'
          : 'grid-cols-2 gap-5 sm:gap-6';

  const serviceItems = useMemo(
    () => [...services].filter((s) => s.enabled).sort((a, b) => a.order - b.order),
    [services],
  );

  const teamPreview = useMemo(
    () => [...allTeam].filter((m) => m.enabled).sort((a, b) => a.order - b.order).slice(0, 6),
    [allTeam],
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="pt-32 pb-16">
        <section className="px-4 mb-12">
          <div className="container mx-auto max-w-5xl text-center">
            {about.eyebrow ? (
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
            ) : null}
            <h1 className="text-4xl md:text-5xl font-bold text-primary-onBg mt-3 mb-4">{about.title || 'About'}</h1>
            {lead ? (
              <div className="flex justify-center">
                <HtmlPreview
                  content={lead}
                  containWideBlocks
                  className="max-w-3xl w-full text-lg text-muted-foreground prose-neutral dark:prose-invert prose-p:text-muted-foreground"
                />
              </div>
            ) : null}
            {loadError ? (
              <p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
                Live content could not be loaded; showing saved or default information.
              </p>
            ) : null}
          </div>
        </section>

        {(imgSrc || rest.length > 0 || statCount > 0) && (
          <section className="px-4 mb-16">
            {imgSrc && rest.length === 0 && statCount === 0 ? (
              <div className="container mx-auto max-w-3xl">
                <div className="relative rounded-3xl overflow-hidden shadow-elegant bg-muted aspect-[4/3]">
                  <img src={imgSrc} alt={about.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
            ) : (
            <div
              className={cn(
                'container mx-auto max-w-6xl gap-12',
                imgSrc ? 'grid lg:grid-cols-2 lg:items-start lg:gap-14' : 'max-w-3xl mx-auto space-y-8',
              )}
            >
              {imgSrc ? (
                <div className="relative order-2 lg:order-1 min-w-0 lg:sticky lg:top-28 self-start">
                  <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-elegant bg-muted">
                    <img src={imgSrc} alt={about.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {statCount > 0 ? (
                    <div className="absolute -bottom-6 -right-2 sm:-right-6 bg-accent text-accent-foreground rounded-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-gold max-w-[min(100%,18rem)]">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight tabular-nums [overflow-wrap:anywhere]">
                        {stats[0].value}
                      </div>
                      <div className="text-xs uppercase tracking-wider mt-2 text-accent-foreground/90 line-clamp-2">
                        {stats[0].label}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={cn('space-y-5 min-w-0', imgSrc && 'order-1 lg:order-2')}>
                {rest.map((p, i) => (
                  <HtmlPreview
                    key={i}
                    content={p}
                    containWideBlocks
                    className="text-muted-foreground prose-neutral dark:prose-invert prose-p:text-muted-foreground max-w-none"
                  />
                ))}
                {statCount > 0 ? (
                  <div
                    className={cn(
                      'grid min-w-0 pt-2',
                      statGridClass,
                      !imgSrc && statCount > 2 && 'max-w-4xl mx-auto w-full',
                    )}
                  >
                    {stats.map((s, i) => (
                      <div
                        key={s.id ?? `${s.label}-${i}`}
                        className="bg-secondary/50 rounded-xl border border-border px-5 py-5 min-w-0 flex flex-col justify-center"
                      >
                        <div className="text-lg sm:text-xl font-bold text-primary-onBg tabular-nums tracking-tight leading-tight [overflow-wrap:anywhere]">
                          {s.value}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 leading-snug line-clamp-2">{s.label}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            )}
          </section>
        )}

        {serviceItems.length > 0 ? (
          <section className="px-4 mb-16 bg-secondary/40 py-16">
            <div className="container mx-auto max-w-6xl">
              <div className="max-w-2xl mx-auto text-center mb-10">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">What we do</span>
                <h2 className="mt-3 text-3xl font-bold text-primary-onBg">Services</h2>
                <p className="mt-2 text-muted-foreground text-sm">Areas we support — aligned with your CMS.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {serviceItems.map((s) => {
                  const Icon = (Icons as Record<string, typeof Icons.Sparkles>)[s.icon] ?? Icons.Sparkles;
                  return (
                    <Link
                      key={s.id}
                      to={s.href}
                      className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary-onBg flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-primary-onBg">{s.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                      <span className="mt-3 inline-flex items-center text-sm font-semibold text-accent">
                        Learn more <ArrowUpRight className="ml-1 h-4 w-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {teamPreview.length > 0 ? (
          <section className="px-4 mb-8">
            <div className="container mx-auto max-w-6xl">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">People</span>
                  <h2 className="mt-2 text-3xl font-bold text-primary-onBg">Team</h2>
                  <p className="mt-1 text-muted-foreground text-sm">A sample of who you will work with.</p>
                </div>
                <Link to="/professionals" className="text-sm font-semibold text-primary-onBg hover:underline shrink-0">
                  View all professionals â†’
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamPreview.map((p) => {
                  const img = cmsMediaSrc(p.avatar);
                  return (
                    <Card key={p.id} className="overflow-hidden border-border/80">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary-onBg flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              initials(p.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-tight">{p.name}</h3>
                            <p className="text-sm text-primary-onBg mt-1 flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-2">{p.role}</span>
                            </p>
                            {p.bio ? <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.bio}</p> : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <div className="px-4 mt-16">
          <PageHelpFaqs category="About" title="Questions about us" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

const About = () => {
  const { data, isLoading, isError } = useQuery(siteHomepageQueryOptions);
  const initialSnapshot = useMemo(() => (data ? mapHomepageApiToSnapshot(data) : null), [data]);

  if (isLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      </CmsStoreProvider>
    );
  }

  return (
    <CmsStoreProvider initialSnapshot={initialSnapshot}>
      <AboutBody loadError={isError} />
    </CmsStoreProvider>
  );
};

export default About;
