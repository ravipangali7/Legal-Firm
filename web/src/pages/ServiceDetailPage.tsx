import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { ArrowLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CmsStoreProvider } from '@/store/cmsStore';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { resolveServiceDestination } from '@/lib/serviceLink';
import { RelatedContentSidebar } from '@/components/RelatedContentSidebar';
import { usePageSeo } from '@/context/SeoContext';

const ServiceDetailPage = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { data, isLoading, isError, refetch } = useQuery(siteHomepageQueryOptions);

  const service = useMemo(() => {
    if (!serviceId || !data) return undefined;
    const snapshot = mapHomepageApiToSnapshot(data);
    const id = serviceId.trim().toLowerCase();
    return snapshot.services.find((s) => s.id.toLowerCase() === id);
  }, [data, serviceId]);

  const cta = useMemo(() => {
    if (!service?.href?.trim()) return null;
    return resolveServiceDestination(service.href);
  }, [service?.href]);

  usePageSeo(
    service && serviceId
      ? {
          title: service.title,
          description: service.description,
          pathname: `/services/${serviceId}`,
        }
      : null
  );

  if (!serviceId) {
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
          <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</main>
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
              <p className="text-muted-foreground mb-4">Could not load this service.</p>
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

  if (!service || !service.enabled) {
    return (
      <CmsStoreProvider>
        <MissingShell message="This service does not exist or is no longer available." />
      </CmsStoreProvider>
    );
  }

  const iconKey = service.icon as keyof typeof Icons;
  const Icon = (iconKey in Icons ? Icons[iconKey] : Icons.Sparkles) as LucideIcon;

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
              <span className="text-foreground line-clamp-1">{service.title}</span>
            </nav>

            <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Link>
            </Button>

            <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10 shadow-elegant overflow-hidden mb-10">
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-accent/10 rounded-full" />
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-primary-onBg leading-tight mb-4">{service.title}</h1>
                <p className="text-lg text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {cta ? (
                cta.kind === 'external' ? (
                  <Button asChild size="lg" className="gap-2">
                    <a href={cta.href} {...(cta.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      Related resource
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="gap-2">
                    <Link to={cta.to}>
                      Continue to resource
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )
              ) : null}
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
              </article>
              <div className="lg:col-span-4 min-w-0">
                <RelatedContentSidebar excludeServiceId={service.id} />
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
          <h1 className="text-2xl font-semibold mb-2">Service not found</h1>
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

export default ServiceDetailPage;
