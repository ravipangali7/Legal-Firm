import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pricingPlans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 999,
    period: 'month',
    popular: false,
    features: [
      'Access to case summaries',
      'Basic case details',
      'Search functionality',
      'Mobile access',
      'Email support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1999,
    period: 'month',
    popular: true,
    features: [
      'Everything in Basic',
      'Full case analysis',
      'Expert commentary',
      'PDF downloads',
      'Advanced search filters',
      'Bookmark cases',
      'Priority support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 4999,
    period: 'month',
    popular: false,
    features: [
      'Everything in Premium',
      'Bulk case access',
      'API access',
      'Custom reports',
      'Team collaboration',
      'Dedicated support',
      'Legal updates',
    ],
  },
];

const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config, loading: cfgLoading } = useSiteConfig();
  const paymentsEnabled = config?.payments_enabled === true;

  useEffect(() => {
    if (isOpen) setSelectedPlan('premium');
  }, [isOpen]);

  const walletHref = user ? '/dashboard?tab=wallet' : `/login?next=${encodeURIComponent('/dashboard?tab=wallet')}`;

  const goPay = () => {
    onClose();
    if (paymentsEnabled) {
      navigate(walletHref);
    } else {
      navigate('/contact');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">Choose Your Subscription Plan</DialogTitle>
          <p className="text-center text-muted-foreground">
            Get unlimited access to legal cases and expert analysis
          </p>
        </DialogHeader>

        <div className="mt-6">
          <div className="bg-gradient-to-r from-accent/20 to-primary/20 p-4 rounded-lg mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-accent" />
              <span className="font-semibold">7-Day Free Trial</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Start with any plan and get full access for 7 days, completely free
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`
                    relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${selectedPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                    ${plan.popular ? 'ring-2 ring-accent ring-opacity-50' : ''}
                  `}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold">NPR {plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Billed monthly • Cancel anytime</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${selectedPlan === plan.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-accent" />
              <span className="font-medium">What you get:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Immediate access to all premium features</li>
              <li>• 7 days completely free</li>
              <li>• Cancel anytime with no questions asked</li>
              <li>• Secure payment processing from your dashboard Wallet</li>
            </ul>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6 max-w-2xl mx-auto">
            By subscribing, you agree to our Terms of Service and Privacy Policy. You will be charged NPR{' '}
            {pricingPlans.find((p) => p.id === selectedPlan)?.price.toLocaleString()}
            after your free trial ends. Cancel anytime.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="button" onClick={goPay} className="btn-primary" disabled={cfgLoading}>
            {cfgLoading
              ? 'Loading…'
              : paymentsEnabled
                ? user
                  ? 'Continue to Wallet'
                  : 'Sign in & pay in Wallet'
                : 'Contact us to subscribe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
