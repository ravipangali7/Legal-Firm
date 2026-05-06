import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPricingPage, type AuthMeUser, type SubscriptionDurationTotals } from '@/lib/api';

function walletHubForUser(user: AuthMeUser | null | undefined): string {
  if (user?.role === 'client') return '/client';
  return '/dashboard';
}
import { HelpArticleProse } from '@/components/HelpArticleProse';

function numFromApi(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const PricingInner = () => {
  const [accountKind, setAccountKind] = useState<'individual' | 'business'>('individual');
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pricing-page'],
    queryFn: fetchPricingPage,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const totals: SubscriptionDurationTotals | null = useMemo(() => {
    if (!data) return null;
    return accountKind === 'business' ? data.business_totals ?? null : data.individual_totals ?? null;
  }, [data, accountKind]);

  const currency = (data?.currency || 'NPR').trim() || 'NPR';
  const faqs = data?.faqs ?? [];
  const checkoutEnabled = data?.payments_enabled === true || data?.esewa_enabled === true;
  const walletHref = (billing: 'monthly' | 'six_month' | 'yearly') => {
    const hub = walletHubForUser(user);
    return user
      ? `${hub}?tab=wallet&billing=${billing}`
      : `/login?next=${encodeURIComponent(`/dashboard?tab=wallet&billing=${billing}`)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading pricing…
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-28 pb-16 flex-1 px-4">
          <div className="container mx-auto max-w-lg text-center">
            <p className="text-muted-foreground mb-4">Could not load pricing. Check your connection and try again.</p>
            <Button type="button" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cards = totals
    ? [
        { id: 'monthly' as const, label: 'One month', sub: 'Full access for 30 days', amount: numFromApi(totals.one_month) },
        { id: 'six_month' as const, label: 'Six months', sub: 'Best for seasonal teams', amount: numFromApi(totals.six_month) },
        { id: 'yearly' as const, label: 'One year', sub: 'Maximum value', amount: numFromApi(totals.one_year), highlight: true },
      ]
    : [];

  const hasPrices = cards.length > 0 && cards.every((c) => c.amount > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-28 pb-16 flex-1">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{data.page_title}</h1>
            <p className="text-muted-foreground mt-3 whitespace-pre-line">{data.page_subtitle}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={accountKind === 'individual' ? 'default' : 'outline'}
                onClick={() => setAccountKind('individual')}
              >
                Individual
              </Button>
              <Button
                type="button"
                size="sm"
                variant={accountKind === 'business' ? 'default' : 'outline'}
                onClick={() => setAccountKind('business')}
              >
                Business
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Prices are set by the administrator under Settings → General (monthly base × duration).
            </p>
          </div>

          {!hasPrices ? (
            <div className="max-w-lg mx-auto mt-12 text-center text-muted-foreground text-sm space-y-3">
              <p>Subscription prices are not configured yet.</p>
              {data.support_email ? (
                <p>
                  Contact{' '}
                  <a className="text-primary-onBg underline underline-offset-2" href={`mailto:${data.support_email}`}>
                    {data.support_email}
                  </a>
                  .
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-6 mt-10 max-w-5xl mx-auto items-stretch grid-cols-1 md:grid-cols-3">
              {cards.map((p) => {
                const ctaHref = checkoutEnabled ? walletHref(p.id) : '/contact';
                const ctaTitle = !checkoutEnabled ? 'Online payments are not enabled yet' : undefined;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'relative rounded-2xl border bg-card p-6 flex flex-col',
                      p.highlight ? 'border-2 border-primary shadow-xl md:-translate-y-3' : 'border-border shadow-sm'
                    )}
                  >
                    {p.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 shadow">
                        <Sparkles className="h-3 w-3" /> {data.popular_badge_label}
                      </div>
                    )}
                    <h3 className="text-lg font-bold">{p.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.sub}</p>
                    <div className="mt-3">
                      <span className="text-4xl font-extrabold">
                        {currency} {p.amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">total</span>
                    </div>
                    <ul className="mt-5 space-y-2.5 text-sm flex-1">
                      {['Acts & laws library', 'Summaries & procedures', 'Practice areas & legal cases'].map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary-onBg mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      size="lg"
                      className={cn('mt-6 w-full', p.highlight ? 'btn-accent' : '')}
                      variant={p.highlight ? 'default' : 'outline'}
                    >
                      <Link to={ctaHref} title={ctaTitle}>
                        {checkoutEnabled ? 'Subscribe' : 'Contact us'}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {faqs.length > 0 ? (
            <div className="max-w-3xl mx-auto mt-16">
              <h2 className="text-2xl font-bold text-center mb-6">{data.faq_section_title}</h2>
              <Accordion type="single" collapsible className="rounded-lg border border-border bg-card">
                {faqs.map((f) => (
                  <AccordionItem key={f.id} value={`faq-${f.id}`} className="px-4">
                    <AccordionTrigger className="text-left">{f.title}</AccordionTrigger>
                    <AccordionContent>
                      <HelpArticleProse content={f.content} className="text-muted-foreground" />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Pricing = () => <PricingInner />;

export default Pricing;
