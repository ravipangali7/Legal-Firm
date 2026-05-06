import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/** Toast shown when a visitor without an active subscription tries to open premium library content. */
export function usePremiumSubscribeToast() {
  const { toast } = useToast();
  return useCallback(
    (signedIn: boolean) => {
      toast({
        title: 'Take a subscription',
        description: signedIn
          ? 'Subscribe from the Pricing page or the Wallet tab on your dashboard to unlock acts, summaries, procedures, practice areas, and legal cases.'
          : 'Log in and subscribe to unlock acts, summaries, procedures, practice areas, and legal cases.',
      });
    },
    [toast]
  );
}
