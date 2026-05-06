import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { HtmlPreview } from '@/components/HtmlPreview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProcedureDetail, PROCEDURE_NOT_FOUND } from '@/lib/api';
import { RelatedContentSidebar } from '@/components/RelatedContentSidebar';
import { useAuth } from '@/context/AuthContext';
import PaywallGate from '@/components/PaywallGate';
import { canAccessProcedures } from '@/lib/subscriptionAccess';

const ProcedureDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();

  const {
    data: proc,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['procedure', slug],
    queryFn: () => fetchProcedureDetail(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const sortedSteps = useMemo(() => {
    if (!proc?.steps?.length) return [];
    return [...proc.steps].sort((a, b) => a.order - b.order);
  }, [proc]);

  if (!slug) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-16 px-4 container mx-auto max-w-4xl text-center text-muted-foreground text-sm">
          Missing procedure link.
        </main>
        <Footer />
      </div>
    );
  }

  const notFound = isError && error instanceof Error && error.message === PROCEDURE_NOT_FOUND;

  const proceduresUnlocked = canAccessProcedures(user);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-8 min-w-0">
          {isLoading && (
            <div className="space-y-6" aria-busy="true">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-3/4 max-w-xl" />
              <Skeleton className="h-4 w-64" />
              <div className="space-y-4 mt-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {notFound && (
            <div className="text-center py-16 space-y-4">
              <h1 className="text-2xl font-semibold text-foreground">Procedure not found</h1>
              <p className="text-sm text-muted-foreground">This guide may have been moved or removed.</p>
              <Button asChild variant="secondary">
                <Link to="/procedures">Back to procedures</Link>
              </Button>
            </div>
          )}

          {isError && !notFound && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Could not load this procedure.</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          )}

          {!isLoading && proc && (
            <>
              <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1 flex-wrap">
                <Link to="/" className="hover:underline">
                  Home
                </Link>
                <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                <Link to="/procedures" className="hover:underline">
                  Procedures
                </Link>
                <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                <span className="text-foreground line-clamp-1">{proc.title}</span>
              </nav>

              <PaywallGate
                unlocked={proceduresUnlocked}
                contentType="Procedure"
                previewHeight={480}
              >
                <div className="mb-8">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary-onBg mb-2">
                    {proc.category}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary-onBg mb-2">{proc.title}</h1>
                  {proc.summary ? (
                    <p className="text-muted-foreground text-sm md:text-base max-w-3xl mb-2">{proc.summary}</p>
                  ) : null}
                  <p className="text-muted-foreground text-sm">
                    {proc.duration_label ? <>â± Typical duration: {proc.duration_label} · </> : null}
                    {sortedSteps.length} steps
                  </p>
                </div>

                <div className="space-y-4">
                  {sortedSteps.map((s, i) => (
                    <Card key={s.id}>
                      <CardContent className="p-5 flex gap-4">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <h2 className="font-semibold text-lg mb-1">Step {i + 1}</h2>
                          <HtmlPreview
                            content={s.description}
                            className="prose prose-sm max-w-none text-sm text-muted-foreground prose-p:text-muted-foreground mt-1"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
                  <h3 className="font-bold text-lg mb-2">Need help with this procedure?</h3>
                  <p className="text-sm text-muted-foreground mb-3">Our team can assist you end-to-end.</p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    Get Free Consultation
                  </Link>
                </div>
              </PaywallGate>
            </>
          )}
            </div>
            <div className="lg:col-span-4 min-w-0">
              <RelatedContentSidebar
                excludeProcedureSlug={slug}
                procedureCategory={proc?.category}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProcedureDetail;
