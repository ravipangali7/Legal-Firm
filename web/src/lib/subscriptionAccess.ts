import type { AuthMeUser } from '@/lib/api';

/** Premium library (acts, summaries, procedures, practice areas, cases, tools) — active subscription only. */
export function canAccessPremiumContent(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_staff) return true;
  return hasLibraryEntitlement(user);
}

/** @deprecated Use canAccessPremiumContent; kept for call sites. */
export function canAccessLawsLibrary(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

export function canAccessCaseSummaries(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

export function canAccessTaxTools(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

export function canAccessProcedures(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

/** Full library / premium content access (includes post-paid benefits window). */
export function hasLibraryEntitlement(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_staff) return true;
  if (typeof user.library_entitlement_active === 'boolean') return user.library_entitlement_active;
  const ben = user.plan_benefits_end;
  if (ben) {
    try {
      return Date.now() <= new Date(ben).getTime();
    } catch {
      return false;
    }
  }
  const subEnd = user.subscription_period_end;
  if (subEnd) {
    try {
      return Date.now() <= new Date(subEnd).getTime();
    } catch {
      return false;
    }
  }
  return Boolean(user.subscribed);
}

/** Paid renewal window (premium billing) — when false but entitlement true, show Renew. */
export function hasPremiumBillingActive(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_staff) return true;
  if (typeof user.premium_billing_active === 'boolean') return user.premium_billing_active;
  return Boolean(user.subscribed);
}

export function shouldRecommendRenewal(user: AuthMeUser | null | undefined): boolean {
  if (!user || user.is_staff) return false;
  if (typeof user.renewal_recommended === 'boolean') return user.renewal_recommended;
  return false;
}

/** Legacy wallet tiers removed — renewals use the same catalog for all subscribers. */
export function userPlanToWalletSlug(_plan: string | null | undefined): null {
  return null;
}
