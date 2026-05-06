import { Lock, Check, ShieldOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface PaywallGateProps {
  children: React.ReactNode;
  /** When true, renders full content with no overlay. */
  unlocked?: boolean;
  /** Approx height of preview area in px. Content is clipped to this. */
  previewHeight?: number;
  contentType?: 'Act' | 'Summary' | 'Procedure' | 'Resource' | 'Calculator';
  className?: string;
  /** When the user is signed in but their plan does not include this area, show this copy instead of the generic message. */
  signedInPlanRestricted?: {
    title: string;
    description: string;
    primaryHref: string;
    primaryLabel?: string;
  };
}

const PaywallGate = ({
  children,
  unlocked = false,
  previewHeight = 480,
  contentType = 'Act',
  className,
  signedInPlanRestricted,
}: PaywallGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const nextPath = `${location.pathname}${location.search}`;
  const subscribeHref = user ? '/pricing' : `/login?next=${encodeURIComponent(nextPath)}`;
  const loggedInWithoutAccess = Boolean(user && !authLoading && !unlocked);

  if (unlocked) return <div className={className}>{children}</div>;

  return (
    <div className={cn('relative', className)}>
      {/* Preview clipped */}
      <div
        className="relative overflow-hidden"
        style={{ maxHeight: previewHeight }}
        aria-hidden={false}
      >
        {children}
        {/* Gradient fade */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--background) / 0), hsl(var(--background)) 90%)',
          }}
        />
      </div>

      {/* Subscribe overlay card */}
      <div className="relative -mt-12 flex justify-center px-4">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl p-8 text-center">
          {loggedInWithoutAccess ? (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <ShieldOff className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {signedInPlanRestricted?.title ?? 'Library access is not allowed'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {signedInPlanRestricted?.description ??
                  'Your account is signed in, but you do not have an active subscription for this library content. This can happen if your plan expired or access was removed by an administrator.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="btn-accent">
                  <Link to={signedInPlanRestricted?.primaryHref ?? '/pricing'}>
                    {signedInPlanRestricted?.primaryLabel ?? 'View plans and renew'}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact">Contact support</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-7 w-7 text-primary-onBg" />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                Subscribe to Read the Full {contentType}
              </h3>
              <p className="text-muted-foreground mb-6">
                Unlock the complete {contentType.toLowerCase()}, downloadable PDFs, expert analysis,
                and bilingual content with an active subscription (1, 6, or 12 months).
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {authLoading ? (
                  <Button size="lg" className="btn-accent" disabled>
                    Subscribe Now
                  </Button>
                ) : (
                  <Button asChild size="lg" className="btn-accent">
                    <Link to={subscribeHref}>Subscribe Now</Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="ghost">
                  <Link to="/login">Already subscribed? Login</Link>
                </Button>
              </div>

              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5 justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-onBg" /> Cancel anytime
                </li>
                <li className="flex items-center gap-1.5 justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-onBg" /> Bilingual content
                </li>
                <li className="flex items-center gap-1.5 justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-onBg" /> PDF downloads
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaywallGate;
