import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * eSewa redirects the browser here after pay (success) or cancel/fail (failure).
 * We immediately forward the same query string to Django, which verifies the payload
 * and redirects to the dashboard. (Signature secret never touches the SPA.)
 */
export default function EsewaPaymentReturnPage() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const walletHref = user?.role === 'client' ? '/client?tab=wallet' : '/dashboard?tab=wallet';
  const mode = useMemo(() => (pathname.includes('/failure') ? 'failure' : 'success'), [pathname]);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    const apiPath = mode === 'success' ? '/api/payments/esewa/success/' : '/api/payments/esewa/failure/';
    try {
      const target = `${apiUrl(apiPath)}${search}`;
      window.location.replace(target);
    } catch {
      setBlocked('Could not open the payment confirmation service.');
    }
  }, [mode, search]);

  const title = mode === 'success' ? 'Confirming payment' : 'Closing eSewa checkout';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <Card className="max-w-md w-full border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {blocked ? null : <Loader2 className="h-5 w-5 animate-spin text-primary-onBg" />}
              {title}
            </CardTitle>
            <CardDescription>
              {blocked
                ? blocked
                : 'You are being sent to our server to verify this payment with eSewa, then back to your wallet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocked ? (
              <>
                <Button asChild className="w-full">
                  <Link to={walletHref}>Open wallet</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/">Home</Link>
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                If this screen stays here, ensure the API is reachable (same host as in dev proxy, or{' '}
                <span className="font-mono">VITE_API_URL</span> in production).
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
