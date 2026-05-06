import type { AuthMeUser } from '@/lib/api';
import { hasLibraryEntitlement, hasPremiumBillingActive, shouldRecommendRenewal } from '@/lib/subscriptionAccess';

export function userDisplayName(user: AuthMeUser): string {
  const name = user.full_name?.trim();
  if (name) return name;
  return user.email || 'Account';
}

export function userInitials(user: AuthMeUser): string {
  const name = user.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return (user.email?.slice(0, 2) || '?').toUpperCase();
}

/** First word of full name or email local-part for short greetings. */
export function firstGreetingName(user: AuthMeUser): string {
  const name = user.full_name?.trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  const local = user.email?.split('@')[0];
  return local || 'there';
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Member',
  client: 'Client',
  editor: 'Editor',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export function roleDisplayLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function planTierLabel(plan: string | undefined): string {
  const p = (plan || 'free').toLowerCase();
  const names: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };
  return names[p] ?? p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Label from signup profile (`UserProfile.user_type`); legacy users without a profile read as Personal. */
export function accountTypeDisplayLine(user: { profile?: { user_type?: string } | null }): string {
  const ut = user.profile?.user_type;
  if (ut === 'business') return 'Business Account';
  if (ut === 'individual') return 'Individual Account';
  return 'Personal Account';
}

/** Subtitle under the main welcome on /dashboard — varies by role and subscription. */
export function subscriberDashboardSubtitle(user: AuthMeUser): string {
  if (user.is_staff) {
    return "You're signed in with a staff account. Open Admin for site management, or keep using the library here.";
  }
  if (!hasLibraryEntitlement(user)) {
    return 'View your account and upgrade on the pricing page for full library access.';
  }
  if (shouldRecommendRenewal(user)) {
    return 'Your paid renewal period has ended, but your plan benefits still include full library access until the benefit end date. Renew to extend your billing period.';
  }
  if (!hasPremiumBillingActive(user)) {
    return 'Your library access follows the benefits included with your last package.';
  }
  switch (user.role) {
    case 'client':
      return 'Your organization account is active. The full library is unlocked.';
    case 'editor':
      return 'Your contributor access is active. The full library is unlocked.';
    case 'admin':
    case 'super_admin':
      return 'Your subscription is active. The full library is unlocked.';
    case 'user':
    default:
      return 'Your premium subscription is active. The full library is unlocked.';
  }
}
