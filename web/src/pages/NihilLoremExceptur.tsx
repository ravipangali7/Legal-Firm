import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CmsStoreProvider } from '@/store/cmsStore';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import heroImageUrl from '@/assets/nihil-route-hero.svg?url';

const PAGE_TITLE = 'Nihil lorem exceptur';
const CANONICAL_PATH = '/Nihil lorem exceptur';
const HERO_IMAGE_ALT = 'Illustrative hero image for this page';

const NihilLoremExcepturInner = () => {
  const { config } = useSiteConfig();
  const site = config?.site_name ?? 'TaxLexis Legal';

  useEffect(() => {
    const prev = document.title;
    document.title = `${PAGE_TITLE} — ${site}`;
    return () => {
      document.title = prev;
    };
  }, [site]);

  const detailRows: { label: string; value: string }[] = [
    { label: 'Site', value: site },
    { label: 'Canonical path', value: CANONICAL_PATH },
    {
      label: 'Encoded URL',
      value: '/Nihil%20lorem%20exceptur',
    },
    { label: 'Page type', value: 'Public placeholder route' },
    {
      label: 'Purpose',
      value:
        'Resolves this URL in the app router until permanent content is published.',
    },
    {
      label: 'Disclaimer',
      value: 'Not legal or tax advice. Use site sections or contact the team for guidance.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-4xl font-bold text-primary-onBg mb-8">{PAGE_TITLE}</h1>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">
            <figure className="rounded-xl border bg-muted/40 overflow-hidden shadow-sm">
              <img
                src={heroImageUrl}
                alt={HERO_IMAGE_ALT}
                width={1200}
                height={1200}
                className="w-full h-auto object-cover aspect-[4/3] lg:aspect-[3/4] max-h-[420px] lg:max-h-none"
                loading="eager"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-sm text-muted-foreground border-t bg-card/80">
                Hero illustration bundled with the app (served from the build so it loads on every host and base path).
              </figcaption>
            </figure>

            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Page details</CardTitle>
                  <CardDescription>
                    Structured metadata for this route. Replace with real fields when content goes live.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    {detailRows.map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  This page is a dedicated placeholder for the path you requested. It is not legal or tax advice.
                  For guidance on Nepalese tax, corporate, and regulatory matters, use the main sections of the site
                  or contact our team.
                </p>
                <p>
                  Nihil excepturi ad lorem: content here exists only so this URL resolves correctly in the application
                  router and can be replaced with real material when you are ready.
                </p>
              </div>

              <Button asChild>
                <Link to="/">Return to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const NihilLoremExceptur = () => (
  <CmsStoreProvider>
    <NihilLoremExcepturInner />
  </CmsStoreProvider>
);

export default NihilLoremExceptur;
