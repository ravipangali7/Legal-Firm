import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchPricingPage, postEsewaInitiate } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { accountTypeDisplayLine } from '@/lib/userDisplay';

const schema = z.object({
  billing_cycle: z.enum(['monthly', 'six_month', 'yearly']),
});

export type WalletBillingCycle = 'monthly' | 'six_month' | 'yearly';

export type DashboardWalletFormValues = {
  billing_cycle: WalletBillingCycle;
};

export interface DashboardWalletFormProps {
  userEmail: string;
  esewaEnabled: boolean;
  /** @deprecated Plan tiers removed; ignored. */
  initialPlan?: unknown;
  initialBilling?: WalletBillingCycle | null;
  onSubmitted?: () => void;
  checkoutBlockedMessage?: string | null;
  /** @deprecated Ignored; single catalog for all subscribers. */
  sameTierRenewalOnlySlug?: unknown;
}

function submitEsewaBrowserForm(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function numFromApi(s: string | undefined): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const DashboardWalletForm = ({
  userEmail,
  esewaEnabled,
  initialBilling,
  onSubmitted,
  checkoutBlockedMessage,
}: DashboardWalletFormProps) => {
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: pricingData, isLoading: pricingLoading, isError: pricingError } = useQuery({
    queryKey: ['pricing-page', 'wallet'],
    queryFn: fetchPricingPage,
    staleTime: 60_000,
  });

  const isBusiness = user?.profile?.user_type === 'business';
  const totals = useMemo(() => {
    const raw = isBusiness ? pricingData?.business_totals : pricingData?.individual_totals;
    if (!raw) return { monthly: 0, six: 0, year: 0 };
    return {
      monthly: numFromApi(raw.one_month),
      six: numFromApi(raw.six_month),
      year: numFromApi(raw.one_year),
    };
  }, [pricingData, isBusiness]);

  const form = useForm<DashboardWalletFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      billing_cycle: 'monthly',
    },
  });

  useEffect(() => {
    if (initialBilling === 'yearly' || initialBilling === 'six_month' || initialBilling === 'monthly') {
      form.setValue('billing_cycle', initialBilling);
    }
  }, [initialBilling, form]);

  const onPayEsewa = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    const values = form.getValues();
    if (!esewaEnabled) {
      toast({ title: 'eSewa unavailable', description: 'eSewa is not enabled for this site.', variant: 'destructive' });
      return;
    }
    setPaying(true);
    try {
      const res = await postEsewaInitiate({
        billing_cycle: values.billing_cycle,
      });
      toast({
        title: 'Redirecting to eSewa',
        description: res.invoice?.trim()
          ? `Invoice ${res.invoice}. Complete payment on eSewa's secure page.`
          : "Complete payment on eSewa's secure page. Your billing record is created only after eSewa confirms success.",
      });
      onSubmitted?.();
      submitEsewaBrowserForm(res.action, res.fields);
    } catch (e) {
      toast({
        title: 'Could not start payment',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
      setPaying(false);
    }
  };

  const currency = (pricingData?.currency || 'NPR').trim() || 'NPR';

  if (!esewaEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        eSewa checkout is turned off. Ask an administrator to enable eSewa under Admin → Settings → Payments.
      </p>
    );
  }

  if (pricingLoading) {
    return <p className="text-sm text-muted-foreground py-6">Loading subscription options…</p>;
  }

  if (pricingError || !pricingData) {
    return (
      <p className="text-sm text-destructive">
        Could not load pricing. Refresh the page or try again later.
      </p>
    );
  }

  if (totals.monthly <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Monthly subscription prices are not set yet. Ask an administrator to configure individual and business monthly
        prices under Admin → Settings → General.
      </p>
    );
  }

  if (checkoutBlockedMessage?.trim()) {
    return (
      <Alert className="border-amber-500/40 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50 dark:border-amber-800/60">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Checkout unavailable</AlertTitle>
        <AlertDescription className="text-sm mt-1">{checkoutBlockedMessage}</AlertDescription>
      </Alert>
    );
  }

  const durationCards: { id: WalletBillingCycle; label: string; sub: string; amount: number }[] = [
    { id: 'monthly', label: 'One month', sub: 'Billed as a single period', amount: totals.monthly },
    { id: 'six_month', label: 'Six months', sub: '6 × monthly base rate', amount: totals.six },
    { id: 'yearly', label: 'One year', sub: '12 × monthly base rate', amount: totals.year },
  ];

  return (
    <Form {...form}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            eSewa UAT (test only)
          </Badge>
          <span className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{userEmail}</span>
            {user ? (
              <span className="ml-2 text-muted-foreground">· {accountTypeDisplayLine(user)}</span>
            ) : null}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">1. Choose subscription length</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Prices follow your account type (individual or business) as set by the site administrator.
          </p>
          <FormField
            control={form.control}
            name="billing_cycle"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {durationCards.map((card) => (
                      <label
                        key={card.id}
                        className={`relative flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all ${
                          field.value === card.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={card.id} className="sr-only" />
                        <h3 className="font-bold text-lg">{card.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                        <p className="text-2xl font-bold text-primary-onBg mt-3">
                          {currency} {card.amount.toLocaleString()}
                        </p>
                        <ul className="mt-4 space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            Full library access for the period
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            Acts, summaries, procedures, cases
                          </li>
                        </ul>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">2. Pay with eSewa</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Secure checkout</CardTitle>
              <CardDescription>
                You will leave this site and pay on eSewa. After payment, you are returned here and your subscription is
                activated automatically when eSewa confirms success.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
                UAT only (see <code className="text-xs">esewa_integration.md</code>): eSewa IDs{' '}
                <span className="font-mono">9806800001</span>–<span className="font-mono">5</span>, password{' '}
                <span className="font-mono">Nepal@123</span>, MPIN <span className="font-mono">1122</span>, OTP{' '}
                <span className="font-mono">123456</span>. Start checkout only from this button (POST to eSewa); opening
                the form URL in a new tab will not work.
              </p>
              <Button type="button" className="w-full" size="lg" disabled={paying} onClick={() => void onPayEsewa()}>
                {paying ? 'Starting…' : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pay with eSewa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Form>
  );
};

export default DashboardWalletForm;
