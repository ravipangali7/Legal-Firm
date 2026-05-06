import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';
import { AboutStatCards } from '@/components/about/AboutStatCards';
import { CmsStoreProvider, useCms } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { CmsImage } from '@/components/CmsImage';
import * as Icons from 'lucide-react';
import { ArrowUpRight, Users } from 'lucide-react';
import { HtmlPreview } from '@/components/HtmlPreview';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';

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
  const stats = about.stats ?? [];

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
        <section className="px-4 mb-16 sm:mb-20 bg-muted/45 py-14 sm:py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-16 gap-10 lg:gap-y-0 lg:items-start">
              <AboutMediaVisual imageSrc={about.image || ''} alt={about.title || 'About'} className="order-1 w-full" />
              <div className="order-2 min-w-0 flex flex-col">
                {about.eyebrow ? (
                  <span className="block text-xs font-bold uppercase tracking-[0.2em] text-accent">{about.eyebrow}</span>
                ) : null}
                <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-primary-onBg leading-[1.1] tracking-tight [overflow-wrap:anywhere]">
                  {about.title || 'About'}
                </h1>
                <HtmlPreview
                  content={about.body || ''}
                  containWideBlocks
                  className="mt-6 max-w-xl text-muted-foreground prose-neutral dark:prose-invert prose-base sm:prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-headings:text-primary-onBg"
                />
                {loadError ? (
                  <p className="text-sm text-muted-foreground mt-4">
                    Live content could not be loaded; showing saved or default information.
                  </p>
                ) : null}
                <AboutStatCards stats={stats} className="mt-8 sm:mt-10 w-full" />
              </div>
            </div>
          </div>
        </section>

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
                      className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
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
                  View all professionals →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamPreview.map((p) => {
                  return (
                    <Card key={p.id} className="overflow-hidden border-border/80">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary-onBg flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                            {p.avatar?.trim() ? (
                              <CmsImage
                                src={p.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                fallbackKind="card"
                                fillEmpty
                              />
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
