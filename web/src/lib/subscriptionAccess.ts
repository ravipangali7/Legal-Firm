import type { AuthMeUser } from '@/lib/api';

/** Premium library (acts, summaries, procedures, practice areas, cases) — active subscription only. */
export function canAccessPremiumContent(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  return hasLibraryEntitlement(user);
}

/** @deprecated Use canAccessPremiumContent; kept for call sites. */
export function canAccessLawsLibrary(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

export function canAccessCaseSummaries(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

/** Tax calculators and utilities — free for all visitors (no login or subscription). */
export function canAccessTaxTools(_user?: AuthMeUser | null): boolean {
  return true;
}

export function canAccessProcedures(user: AuthMeUser | null | undefined): boolean {
  return canAccessPremiumContent(user);
}

/** Whether this catalog row's full content may be read (free rows always; premium rows need subscription). */
export function canAccessPremiumItem(
  user: AuthMeUser | null | undefined,
  item: { premium?: boolean } | null | undefined,
): boolean {
  if (!item?.premium) return true;
  return hasLibraryEntitlement(user);
}

/** Full library / premium content access (includes post-paid benefits window). */
export function hasLibraryEntitlement(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
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

function readPremiumBillingFlag(user: AuthMeUser): boolean | undefined {
  const v = user.premium_billing_active as unknown;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1 || v === '1') return true;
  if (v === 'false' || v === 0 || v === '0' || v === '') return false;
  const camel = (user as AuthMeUser & { premiumBillingActive?: unknown }).premiumBillingActive;
  if (typeof camel === 'boolean') return camel;
  if (camel === 'true' || camel === 1 || camel === '1') return true;
  if (camel === 'false' || camel === 0 || camel === '0') return false;
  return undefined;
}

/** Paid renewal window (premium billing) — when false but entitlement true, show Renew. */
export function hasPremiumBillingActive(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  const explicit = readPremiumBillingFlag(user);
  if (explicit !== undefined) return explicit;
  const end = user.subscription_period_end;
  if (end) {
    try {
      return Date.now() <= new Date(end).getTime();
    } catch {
      return Boolean(user.subscribed);
    }
  }
  return Boolean(user.subscribed);
}

export function shouldRecommendRenewal(user: AuthMeUser | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.renewal_recommended === 'boolean') return user.renewal_recommended;
  return false;
}

/** Legacy wallet tiers removed — renewals use the same catalog for all subscribers. */
export function userPlanToWalletSlug(_plan: string | null | undefined): null {
  return null;
}
