import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo-icon.png';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useAuth } from '@/context/AuthContext';

const Subscribe = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config, loading } = useSiteConfig();
  const paymentsEnabled = config?.payments_enabled === true;

  const walletHub = user?.role === 'client' ? '/client' : '/dashboard';
  const walletHref = user ? `${walletHub}?tab=wallet` : `/login?next=${encodeURIComponent('/dashboard?tab=wallet')}`;

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft size={18} />
            Back
          </Button>
          <Link to="/">
            <img src={logo} alt="Nepal Taxlexis Advisory" className="h-12 w-auto" />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscribe to a plan</CardTitle>
            <CardDescription>
              {loading
                ? 'Checking payment settings…'
                : paymentsEnabled
                  ? 'Subscription payments are completed from your dashboard Wallet tab after you sign in.'
                  : 'Online payments are not available on the site right now.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && paymentsEnabled ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose a plan on the{' '}
                  <Link to="/pricing" className="text-primary-onBg underline underline-offset-2">
                    Pricing
                  </Link>{' '}
                  page, then sign in and open <span className="font-medium text-foreground">Dashboard â†’ Wallet</span> to
                  pay with eSewa. Successful payments are confirmed automatically.
                </p>
                <Button asChild className="w-full">
                  <Link to={walletHref}>{user ? 'Go to Wallet' : 'Sign in to open Wallet'}</Link>
                </Button>
              </>
            ) : null}
            {!loading && !paymentsEnabled ? (
              <>
                <p className="text-sm text-muted-foreground">
                  An administrator must enable payments under Admin â†’ Settings â†’ Payments before anyone can purchase a
                  package. You can still browse plans or reach us via{' '}
                  <Link to="/contact" className="text-primary-onBg underline underline-offset-2">
                    Contact
                  </Link>
                  .
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/pricing">View pricing</Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;
