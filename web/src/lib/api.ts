/**
 * API helpers — proxied to Django in dev (`vite.config.ts` → `/api`).
 * Set `VITE_API_URL` when the SPA and API are on different origins.
 */

import type { HomepageApiResponse } from '@/lib/homepageMap';
import type { LegalCaseApi } from '@/lib/legalCaseMap';
import { getCookie } from '@/lib/csrf';
import { normalizeSpaHomePath } from '@/lib/spaHubPaths';
import { getOrCreateSummaryVisitorId } from '@/lib/summaryVisitor';

const trimSlash = (s: string) => s.replace(/\/$/, '');

export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${trimSlash(base)}${p}`;
}

/** Session-aware fetch (CSRF for unsafe methods). Warm Django cookies via public config. */
export async function sessionFetch(path: string, init?: RequestInit): Promise<Response> {
  await fetch(apiUrl('/api/public/config/'), { credentials: 'include' });
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const csrftoken = getCookie('csrftoken');
  if (csrftoken && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    headers.set('X-CSRFToken', csrftoken);
  }
  const adminPath = path.includes('/api/admin/');
  const cache: RequestCache =
    (init?.cache as RequestCache | undefined) ?? (adminPath ? 'no-store' : 'default');
  return fetch(apiUrl(path), { ...init, credentials: 'include', headers, cache });
}

export interface PublicSiteConfig {
  maintenance_mode: boolean;
  allow_signups: boolean;
  site_name: string;
  /** Header / footer logo (`/media/...`); empty uses built-in default. */
  site_logo?: string;
  /** Browser tab icon (`/media/...`); empty keeps default `/favicon.png`. */
  site_favicon?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  /** Default Open Graph / Twitter image (`/media/...`). */
  og_image?: string;
  /** Production site URL without trailing slash (canonical + sitemap base). */
  canonical_url?: string;
  /** Google Analytics 4 measurement ID (e.g. G-XXXXXXXX). */
  ga_id?: string;
  /** Custom robots.txt body; served at `/robots.txt` when set. */
  robots_txt?: string;
  /** Third-party chat widget embed (script tags); injected site-wide when set. */
  chatbot_script?: string;
  /** ISO currency code from App Settings (e.g. NPR). */
  currency?: string;
  email_notifications?: boolean;
  /** When true, users may pay for plans from the dashboard Wallet tab (and API accepts pending payments). */
  payments_enabled?: boolean;
  esewa_enabled?: boolean;
  /** Always true in this build: eSewa checkout is fixed to UAT (`esewa_integration.md`). */
  esewa_test_mode?: boolean;
  /** Khalti is not supported in this product build; always false from the API. */
  khalti_enabled?: boolean;
  /** Same ordering as Admin → Settings → Navigation; drives the public site header. */
  nav_order?: string[] | null;
  /** When set (or `VITE_GOOGLE_CLIENT_ID`), the login page can run Google token sign-in. */
  google_oauth_client_id?: string;
}

export async function fetchPublicConfig(): Promise<PublicSiteConfig> {
  const r = await fetch(apiUrl('/api/public/config/'), { credentials: 'include' });
  if (!r.ok) throw new Error(`config ${r.status}`);
  return r.json() as Promise<PublicSiteConfig>;
}

export type AdminAnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'annual';

export interface AdminAnalyticsSeriesPoint {
  name: string;
  visitors: number;
  pageViews: number;
  revenue: number;
  signups: number;
}

export interface AdminDashboardAnalyticsKpi {
  key: string;
  label: string;
  hint?: string;
  value: string;
  change_percent: number;
  up: boolean;
}

export interface AdminDashboardAnalytics {
  period: AdminAnalyticsPeriod;
  series: AdminAnalyticsSeriesPoint[];
  users_by_role: { name: string; value: number }[];
  kpis: AdminDashboardAnalyticsKpi[];
}

export async function fetchAdminDashboardAnalytics(
  period: AdminAnalyticsPeriod
): Promise<AdminDashboardAnalytics> {
  const r = await sessionFetch(
    `/api/admin/dashboard/analytics/?period=${encodeURIComponent(period)}`
  );
  if (!r.ok) throw new Error(`analytics ${r.status}`);
  return r.json() as Promise<AdminDashboardAnalytics>;
}

export interface AuthMeProfile {
  user_type: 'individual' | 'business';
  pan: string;
  vat: string;
  company_name: string;
}

/** Staff-only: effective RolePermission matrix from `/api/auth/me/`. */
export interface AuthMeAdminPermission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

function coerceAuthPermissionFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return Boolean(value);
}

/** Coerce permission rows from any auth JSON so `view` etc. are real booleans (sidebar + guards). */
function normalizeAuthPermissionRows(raw: unknown): AuthMeAdminPermission[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AuthMeAdminPermission[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const mod = o.module ?? o.Module;
    const name = typeof mod === 'string' ? mod.trim() : String(mod ?? '').trim();
    if (!name) continue;
    out.push({
      module: name,
      view: coerceAuthPermissionFlag(o.view),
      create: coerceAuthPermissionFlag(o.create),
      edit: coerceAuthPermissionFlag(o.edit),
      delete: coerceAuthPermissionFlag(o.delete),
    });
  }
  return out;
}

export interface AuthMeUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  status: string;
  subscribed: boolean;
  plan: string;
  avatar: string | null;
  /** Nested tax / billing fields when the backend attaches `UserProfile`. */
  profile?: AuthMeProfile | null;
  is_staff: boolean;
  /** Django superuser — treated as super_admin in the admin UI. */
  is_superuser?: boolean;
  /** Present for `is_staff` users: module CRUD flags for the admin area (`null` when not staff). */
  admin_permissions?: AuthMeAdminPermission[] | null;
  /** Subscriber hub (/client, /dashboard): RolePermission rows for the user's role (Admin → Roles); drives sidebar and subscriber PATCH rules. */
  portal_permissions?: AuthMeAdminPermission[] | null;
  created_at?: string;
  last_login_at?: string;
  /** When the current package was requested (ISO 8601); set when a payment is verified. */
  subscription_period_start?: string | null;
  /** End of paid renewal window (ISO 8601). Null for legacy accounts without scheduled billing. */
  subscription_period_end?: string | null;
  /** End of library access from the purchased package (ISO 8601). */
  plan_benefits_end?: string | null;
  /** From `/api/auth/me/`: whether the account may use full library features (includes post-paid benefits). */
  library_entitlement_active?: boolean;
  /** True while the paid subscription window is active. */
  premium_billing_active?: boolean;
  /** Paid window lapsed but benefits still active — show Renew. */
  renewal_recommended?: boolean;
  unread_notifications_count?: number;
  /** Present when session was switched via admin «Login as user». */
  impersonation?: { active: boolean };
  /** Server-computed default SPA path after sign-in (same rules as `userHomeHref`). */
  app_home_path?: string | null;
}

/** Normalize role + `app_home_path` from any auth endpoint (login, /me, OTP, Google). */
export function normalizeAuthMeUser(data: AuthMeUser): AuthMeUser {
  const raw = data.role as unknown;
  let normalizedRole = 'user';
  if (typeof raw === 'object' && raw !== null && 'key' in raw) {
    normalizedRole = String((raw as { key: unknown }).key).trim().toLowerCase() || 'user';
  } else if (typeof raw === 'string') {
    normalizedRole = raw.trim().toLowerCase() || 'user';
  } else if (typeof raw === 'number' || typeof raw === 'boolean') {
    normalizedRole = String(raw).trim().toLowerCase() || 'user';
  }
  data.role = normalizedRole;
  const home = normalizeSpaHomePath(data.app_home_path ?? undefined);
  if (home) data.app_home_path = home;

  const ext = data as AuthMeUser & {
    portalPermissions?: unknown;
    adminPermissions?: unknown;
  };
  const portalRaw = ext.portal_permissions ?? ext.portalPermissions;
  if (portalRaw !== undefined && portalRaw !== null) {
    const rows = normalizeAuthPermissionRows(portalRaw);
    if (rows !== null) data.portal_permissions = rows;
  }
  const adminRaw = ext.admin_permissions ?? ext.adminPermissions;
  if (adminRaw !== undefined && adminRaw !== null) {
    const rows = normalizeAuthPermissionRows(adminRaw);
    if (rows !== null) data.admin_permissions = rows;
  }

  const row = data as AuthMeUser & Record<string, unknown>;
  const copyIfMissing = (snake: keyof AuthMeUser, camel: string) => {
    const cur = row[snake as string];
    const alt = row[camel];
    if ((cur === undefined || cur === null || cur === '') && alt != null && alt !== '') {
      (data as Record<string, unknown>)[snake as string] = alt as string;
    }
  };
  copyIfMissing('subscription_period_start', 'subscriptionPeriodStart');
  copyIfMissing('subscription_period_end', 'subscriptionPeriodEnd');
  copyIfMissing('plan_benefits_end', 'planBenefitsEnd');

  const coerceAuthBool = (v: unknown): boolean | undefined => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 0 || v === '0' || v === '') return false;
    return undefined;
  };
  const lib = coerceAuthBool(data.library_entitlement_active) ?? coerceAuthBool(row.libraryEntitlementActive);
  if (lib !== undefined) data.library_entitlement_active = lib;
  const prem = coerceAuthBool(data.premium_billing_active) ?? coerceAuthBool(row.premiumBillingActive);
  if (prem !== undefined) data.premium_billing_active = prem;
  const ren = coerceAuthBool(data.renewal_recommended) ?? coerceAuthBool(row.renewalRecommended);
  if (ren !== undefined) data.renewal_recommended = ren;

  return data;
}

export interface AuthDashboardActivity {
  id: string;
  verb: string;
  object_label: string;
  path: string;
  created_at: string;
}

export interface AuthDashboardNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  type?: 'info' | 'success' | 'warning' | 'system';
  /** In-app deep link path (e.g. `/dashboard`). */
  link?: string;
}

export interface AuthDashboardBillingRow {
  id: string;
  invoice: string;
  amount: string | number;
  currency: string;
  method: string;
  status: string;
  plan: string;
  billing_cycle?: string;
  rejection_reason?: string;
  /** Plain-language validity for the purchased package (subscription + library extension). */
  package_validity_summary?: string;
  created_at: string;
}

export interface AuthDashboardPayload {
  laws_count: number;
  case_summaries_count: number;
  activity: AuthDashboardActivity[];
  notifications: AuthDashboardNotification[];
  billing: AuthDashboardBillingRow[];
}

export async function getAuthMe(): Promise<AuthMeUser | null> {
  const r = await fetch(apiUrl('/api/auth/me/'), {
    credentials: 'include',
    cache: 'no-store',
  });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error(`me ${r.status}`);
  const data = (await r.json()) as AuthMeUser | null;
  return data ? normalizeAuthMeUser(data) : null;
}

function formatAuthMePatchErrors(data: Record<string, unknown>): string {
  if (typeof data.detail === 'string') return data.detail;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'detail') continue;
    if (Array.isArray(v) && v.length) parts.push(`${k}: ${String(v[0])}`);
    else if (typeof v === 'object' && v && !Array.isArray(v)) {
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (Array.isArray(iv) && iv.length) parts.push(`${ik}: ${String(iv[0])}`);
      }
    }
  }
  return parts.length ? parts.join(' ') : 'Could not update profile';
}

export interface PatchAuthMePayload {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar?: string | null;
  user_type?: 'individual' | 'business';
  pan?: string;
  vat?: string;
  company_name?: string;
}

/** PATCH `/api/auth/me/` — update name, contact, avatar, password, and tax profile fields. */
export async function patchAuthMe(body: PatchAuthMePayload): Promise<AuthMeUser> {
  const r = await sessionFetch('/api/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(formatAuthMePatchErrors(data));
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

export async function fetchAuthDashboard(): Promise<AuthDashboardPayload> {
  const r = await sessionFetch('/api/auth/dashboard/');
  if (!r.ok) throw new Error(`dashboard ${r.status}`);
  return r.json() as Promise<AuthDashboardPayload>;
}

export interface AuthMyProjectRow {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  due_date: string | null;
  client_name: string;
}

export async function fetchAuthMyProjects(): Promise<AuthMyProjectRow[]> {
  const r = await sessionFetch('/api/auth/my-projects/');
  if (!r.ok) throw new Error(`my-projects ${r.status}`);
  return r.json() as Promise<AuthMyProjectRow[]>;
}

/** Mirror of persisted contact rows visible to the signed-in user by email match. */
export interface AuthMyContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
}

export async function fetchAuthMyContactMessages(): Promise<AuthMyContactMessage[]> {
  const r = await sessionFetch('/api/auth/my-contact-messages/');
  if (!r.ok) throw new Error(`my-contact-messages ${r.status}`);
  return r.json() as Promise<AuthMyContactMessage[]>;
}

/** POST — mark a subscriber notification as read (updates unread count on `/api/auth/me/`). */
export async function postAuthNotificationMarkRead(notificationId: string): Promise<AuthDashboardNotification> {
  const r = await sessionFetch(`/api/auth/notifications/${encodeURIComponent(notificationId)}/read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : `mark read ${r.status}`);
  }
  return data as AuthDashboardNotification;
}

/** Result of Google sign-in: either an active session user or a redirect to complete registration. */
export type PostAuthGoogleResult =
  | AuthMeUser
  | { needs_registration: true; email: string; full_name: string };

export async function postAuthGoogle(accessToken: string): Promise<PostAuthGoogleResult> {
  const r = await sessionFetch('/api/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Google sign-in failed');
  }
  if (data.needs_registration === true && typeof data.email === 'string') {
    return {
      needs_registration: true,
      email: data.email,
      full_name: typeof data.full_name === 'string' ? data.full_name : '',
    };
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

export async function postAuthLogin(email: string, password: string): Promise<AuthMeUser> {
  const r = await sessionFetch('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string } & Partial<AuthMeUser>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Login failed');
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

export async function postAuthOtpRequest(phone: string): Promise<{ detail?: string; debug_otp?: string }> {
  const r = await fetch(apiUrl('/api/auth/otp/request/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string; debug_otp?: string };
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not send verification code');
  }
  return data;
}

export async function postPasswordResetRequest(body: {
  email?: string;
  phone?: string;
}): Promise<{ detail?: string; debug_otp?: string }> {
  const r = await fetch(apiUrl('/api/auth/password-reset/request/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string; debug_otp?: string };
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not send reset code');
  }
  return data;
}

export async function postPasswordResetConfirm(body: {
  email?: string;
  phone?: string;
  code: string;
  new_password: string;
}): Promise<{ detail?: string }> {
  const r = await fetch(apiUrl('/api/auth/password-reset/confirm/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string };
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Password reset failed');
  }
  return data;
}

export async function postAuthOtpVerify(phone: string, code: string): Promise<AuthMeUser> {
  const r = await sessionFetch('/api/auth/otp/verify/', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string } & Partial<AuthMeUser>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Verification failed');
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

export async function postAuthLogout(): Promise<void> {
  const r = await sessionFetch('/api/auth/logout/', { method: 'POST' });
  // 401: session already gone (e.g. expired) — treat as successful sign-out.
  if (r.ok || r.status === 204 || r.status === 401) return;
  throw new Error(`logout ${r.status}`);
}

/** Staff only: log the current session in as the given user (see admin users «Login as user»). */
export async function postAdminUserImpersonate(userId: string): Promise<AuthMeUser> {
  const r = await sessionFetch(`/api/admin/users/${userId}/impersonate/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const data = (await r.json().catch(() => ({}))) as { detail?: string } & Partial<AuthMeUser>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not start impersonation');
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

/** End admin impersonation and restore the staff session. */
export async function postAuthStopImpersonate(): Promise<AuthMeUser> {
  const r = await sessionFetch('/api/auth/stop-impersonate/', { method: 'POST' });
  const data = (await r.json().catch(() => ({}))) as { detail?: string } & Partial<AuthMeUser>;
  if (!r.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not exit impersonation');
  }
  return normalizeAuthMeUser(data as AuthMeUser);
}

export interface SignupPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  user_type: 'individual' | 'business';
  pan?: string;
  vat?: string;
  company_name?: string;
}

/** Response from POST /api/public/contact/ (snake_case). */
export interface ContactMessageApiRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
}

function formatPublicContactError(data: Record<string, unknown>): string {
  if (typeof data.detail === 'string') return data.detail;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'detail') continue;
    if (Array.isArray(v) && v.length) parts.push(`${k}: ${String(v[0])}`);
    else if (typeof v === 'string') parts.push(`${k}: ${v}`);
  }
  return parts.length ? parts.join(' ') : 'Request failed';
}

export async function postPublicContact(body: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<ContactMessageApiRow> {
  const r = await fetch(apiUrl('/api/public/contact/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    throw new Error(formatPublicContactError(data));
  }
  return data as unknown as ContactMessageApiRow;
}

export async function postSignup(body: SignupPayload): Promise<{ id: string; email: string; status: string }> {
  const r = await fetch(apiUrl('/api/auth/signup/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Signup failed';
    throw new Error(detail);
  }
  return data;
}

export interface SubscribePendingPayload {
  email: string;
  plan?: 'basic' | 'professional' | 'enterprise';
  billing_cycle?: 'monthly' | 'six_month' | 'yearly';
  payment_method: 'esewa';
  txn_code: string;
  amount: string;
}

export async function postSubscribePending(
  body: SubscribePendingPayload
): Promise<{ transaction_id: string; invoice: string; status: string }> {
  const r = await fetch(apiUrl('/api/subscriptions/pending/'), {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Request failed';
    throw new Error(detail);
  }
  return data;
}

export interface EsewaInitiatePayload {
  billing_cycle?: 'monthly' | 'six_month' | 'yearly';
}

export interface EsewaInitiateResponse {
  action: string;
  method: string;
  fields: Record<string, string>;
  /** eSewa transaction UUID (no DB row exists until payment completes). */
  transaction_id: string;
  invoice?: string | null;
  test_mode: boolean;
}

/** Start eSewa hosted checkout (session cookie + CSRF). */
export async function postEsewaInitiate(body: EsewaInitiatePayload): Promise<EsewaInitiateResponse> {
  const r = await sessionFetch('/api/payments/esewa/initiate/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Could not start eSewa payment';
    throw new Error(detail);
  }
  return data as unknown as EsewaInitiateResponse;
}

/** Raw pricing row from GET /api/pricing-plans/ */
export interface PricingPlanApi {
  id: string;
  name: string;
  monthly: string | number;
  yearly: string | number;
  features: string[];
  cta: string;
  highlight: boolean;
  enabled: boolean;
  sort_order?: number;
}

export async function fetchSiteHomepage(): Promise<HomepageApiResponse> {
  const r = await fetch(apiUrl('/api/site/homepage/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`homepage ${r.status}`);
  return r.json();
}

/** Row from GET /api/public/professionals/ (or dev GET /professionals with Accept: application/json). */
export interface ProfessionalsPageStatApi {
  icon: string;
  label: string;
  value: string;
}

export interface ProfessionalsPageApi {
  title: string;
  subtitle: string;
  stats: ProfessionalsPageStatApi[];
}

/**
 * Hero + stats for the Professionals page. In dev, defaults to same-origin `/professionals`
 * with `Accept: application/json` (Vite proxies to Django). Override with `VITE_PROFESSIONALS_PAGE_URL`.
 */
export async function fetchProfessionalsPage(): Promise<ProfessionalsPageApi> {
  const custom = (import.meta.env.VITE_PROFESSIONALS_PAGE_URL as string | undefined)?.trim();
  const url =
    custom ||
    (import.meta.env.DEV && typeof window !== 'undefined'
      ? new URL('/professionals', window.location.origin).toString()
      : apiUrl('/api/public/professionals/'));
  const r = await fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`professionals page ${r.status}`);
  return r.json() as Promise<ProfessionalsPageApi>;
}

/** Row from GET /api/procedures/ (matches `ProcedureListSerializer`). */
export interface ProcedureListApi {
  id: string;
  slug: string;
  category: string;
  category_slug?: string;
  title: string;
  summary: string;
  steps_count: number;
  duration_label: string;
  icon: string;
}

export async function fetchProceduresList(category?: string): Promise<ProcedureListApi[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  const r = await fetch(apiUrl(`/api/procedures/${q}`), { credentials: 'omit' });
  if (!r.ok) throw new Error(`procedures ${r.status}`);
  return r.json() as Promise<ProcedureListApi[]>;
}

/** Step row from GET /api/procedures/:slug/ (matches `ProcedureStepSerializer`). */
export interface ProcedureStepApi {
  id: string;
  order: number;
  description: string;
}

/** Detail payload from GET /api/procedures/:slug/ (matches `ProcedureSerializer`). */
export interface ProcedureDetailApi {
  id: string;
  slug: string;
  category: string;
  category_slug?: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  summary: string;
  steps_count: number;
  duration_label: string;
  icon: string;
  steps: ProcedureStepApi[];
}

export const PROCEDURE_NOT_FOUND = 'PROCEDURE_NOT_FOUND';

export async function fetchProcedureDetail(slug: string): Promise<ProcedureDetailApi> {
  const r = await fetch(apiUrl(`/api/procedures/${encodeURIComponent(slug)}/`), { credentials: 'omit' });
  if (r.status === 404) {
    throw new Error(PROCEDURE_NOT_FOUND);
  }
  if (!r.ok) throw new Error(`procedure ${r.status}`);
  return r.json() as Promise<ProcedureDetailApi>;
}

/** Staff-only: persist homepage CMS (full snapshot or partial keys, e.g. `{ footer: {...} }`). */
export async function patchAdminCmsHomepage(
  body: Partial<HomepageApiResponse>
): Promise<HomepageApiResponse> {
  const r = await sessionFetch('/api/admin/cms/homepage/', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { detail?: unknown };
    throw new Error(typeof err.detail === 'string' ? err.detail : `cms homepage ${r.status}`);
  }
  return r.json() as Promise<HomepageApiResponse>;
}

export interface BlogPostAdminApi {
  id: string;
  title: string;
  excerpt: string;
  author: string | null;
  author_email?: string | null;
  author_name: string;
  category: string;
  date: string;
  published: boolean;
  featured: boolean;
  body: string;
}

export async function fetchAdminBlogPosts(): Promise<BlogPostAdminApi[]> {
  const r = await sessionFetch('/api/admin/blog-posts/');
  if (!r.ok) throw new Error(`blog-posts ${r.status}`);
  return r.json();
}

export async function postAdminBlogPost(body: Partial<BlogPostAdminApi>): Promise<BlogPostAdminApi> {
  const r = await sessionFetch('/api/admin/blog-posts/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `blog create ${r.status}`);
  return data as BlogPostAdminApi;
}

export async function patchAdminBlogPost(id: string, body: Partial<BlogPostAdminApi>): Promise<BlogPostAdminApi> {
  const r = await sessionFetch(`/api/admin/blog-posts/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `blog patch ${r.status}`);
  return data as BlogPostAdminApi;
}

export async function deleteAdminBlogPost(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/blog-posts/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`blog delete ${r.status}`);
}

/** Staff: practice areas (JSON tags + services validated server-side). */
export interface PracticeAreaAdminApi {
  id: string;
  slug: string;
  name: string;
  icon: string;
  overview: string;
  tags: string[];
  related_cases_title: string;
  services: unknown[];
  sort_order: number;
}

export async function fetchAdminPracticeAreas(): Promise<PracticeAreaAdminApi[]> {
  const r = await sessionFetch('/api/admin/practice-areas/');
  if (!r.ok) throw new Error(`practice-areas ${r.status}`);
  return r.json();
}

export async function postAdminPracticeArea(body: Partial<PracticeAreaAdminApi>): Promise<PracticeAreaAdminApi> {
  const r = await sessionFetch('/api/admin/practice-areas/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `practice-area create ${r.status}`);
  return data as PracticeAreaAdminApi;
}

export async function patchAdminPracticeArea(id: string, body: Partial<PracticeAreaAdminApi>): Promise<PracticeAreaAdminApi> {
  const r = await sessionFetch(`/api/admin/practice-areas/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `practice-area patch ${r.status}`);
  return data as PracticeAreaAdminApi;
}

export async function deleteAdminPracticeArea(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/practice-areas/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`practice-area delete ${r.status}`);
}

export interface LegalCaseAdminApi {
  id: string;
  slug: string;
  title: string;
  reference_number: string;
  date_filed: string;
  date_decided: string | null;
  court: string;
  /** FK id (UUID) of `LegalCaseCategory`. */
  category: string;
  category_name?: string;
  practice_area: string;
  teaser: string;
  parties: string;
  summary: string;
  outcome: string;
  full_content: Record<string, unknown>;
}

export async function fetchAdminLegalCases(): Promise<LegalCaseAdminApi[]> {
  const r = await sessionFetch('/api/admin/legal-cases/');
  if (!r.ok) throw new Error(`legal-cases ${r.status}`);
  return r.json();
}

export async function postAdminLegalCase(body: Partial<LegalCaseAdminApi>): Promise<LegalCaseAdminApi> {
  const r = await sessionFetch('/api/admin/legal-cases/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `legal-case create ${r.status}`);
  return data as LegalCaseAdminApi;
}

export async function patchAdminLegalCase(id: string, body: Partial<LegalCaseAdminApi>): Promise<LegalCaseAdminApi> {
  const r = await sessionFetch(`/api/admin/legal-cases/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `legal-case patch ${r.status}`);
  return data as LegalCaseAdminApi;
}

export async function deleteAdminLegalCase(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/legal-cases/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`legal-case delete ${r.status}`);
}

export interface SummaryCategoryAdminApi {
  id: string;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
}

export async function fetchAdminSummaryCategories(): Promise<SummaryCategoryAdminApi[]> {
  const r = await sessionFetch('/api/admin/summary-categories/');
  if (!r.ok) throw new Error(`summary-categories ${r.status}`);
  return r.json();
}

export async function postAdminSummaryCategory(body: Partial<SummaryCategoryAdminApi>): Promise<SummaryCategoryAdminApi> {
  const r = await sessionFetch('/api/admin/summary-categories/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `summary-category create ${r.status}`);
  return data as SummaryCategoryAdminApi;
}

export async function patchAdminSummaryCategory(id: string, body: Partial<SummaryCategoryAdminApi>): Promise<SummaryCategoryAdminApi> {
  const r = await sessionFetch(`/api/admin/summary-categories/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `summary-category patch ${r.status}`);
  return data as SummaryCategoryAdminApi;
}

export async function deleteAdminSummaryCategory(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/summary-categories/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`summary-category delete ${r.status}`);
}

/** Same JSON shape as summary categories — used for act / case / procedure taxonomies. */
export type LegalLibraryTaxonomyCategoryApi = SummaryCategoryAdminApi;

export async function fetchAdminActCategories(): Promise<LegalLibraryTaxonomyCategoryApi[]> {
  const r = await sessionFetch('/api/admin/act-categories/');
  if (!r.ok) throw new Error(`act-categories ${r.status}`);
  return r.json();
}

export async function postAdminActCategory(body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch('/api/admin/act-categories/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `act-category create ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function patchAdminActCategory(id: string, body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch(`/api/admin/act-categories/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `act-category patch ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function deleteAdminActCategory(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/act-categories/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`act-category delete ${r.status}`);
}

export async function fetchAdminLegalCaseCategories(): Promise<LegalLibraryTaxonomyCategoryApi[]> {
  const r = await sessionFetch('/api/admin/legal-case-categories/');
  if (!r.ok) throw new Error(`legal-case-categories ${r.status}`);
  return r.json();
}

export async function postAdminLegalCaseCategory(body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch('/api/admin/legal-case-categories/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `legal-case-category create ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function patchAdminLegalCaseCategory(id: string, body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch(`/api/admin/legal-case-categories/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `legal-case-category patch ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function deleteAdminLegalCaseCategory(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/legal-case-categories/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`legal-case-category delete ${r.status}`);
}

export async function fetchAdminProcedureCategories(): Promise<LegalLibraryTaxonomyCategoryApi[]> {
  const r = await sessionFetch('/api/admin/procedure-categories/');
  if (!r.ok) throw new Error(`procedure-categories ${r.status}`);
  return r.json();
}

export async function postAdminProcedureCategory(body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch('/api/admin/procedure-categories/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `procedure-category create ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function patchAdminProcedureCategory(id: string, body: Partial<LegalLibraryTaxonomyCategoryApi>): Promise<LegalLibraryTaxonomyCategoryApi> {
  const r = await sessionFetch(`/api/admin/procedure-categories/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `procedure-category patch ${r.status}`);
  return data as LegalLibraryTaxonomyCategoryApi;
}

export async function deleteAdminProcedureCategory(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/procedure-categories/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`procedure-category delete ${r.status}`);
}

export interface SummaryAdminApi {
  id: string;
  slug: string;
  title: string;
  category: string;
  posted: string;
  views: number;
  upvotes: number;
  downvotes: number;
  preview: string;
  premium: boolean;
  body: string;
}

export async function fetchAdminSummaries(): Promise<SummaryAdminApi[]> {
  const r = await sessionFetch('/api/admin/summaries/');
  if (!r.ok) throw new Error(`summaries ${r.status}`);
  return r.json();
}

export async function postAdminSummary(body: Partial<SummaryAdminApi>): Promise<SummaryAdminApi> {
  const r = await sessionFetch('/api/admin/summaries/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `summary create ${r.status}`);
  return data as SummaryAdminApi;
}

export async function patchAdminSummary(id: string, body: Partial<SummaryAdminApi>): Promise<SummaryAdminApi> {
  const r = await sessionFetch(`/api/admin/summaries/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `summary patch ${r.status}`);
  return data as SummaryAdminApi;
}

export async function deleteAdminSummary(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/summaries/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`summary delete ${r.status}`);
}

export interface ActAdminApi {
  slug: string;
  title_en: string;
  title_ne: string;
  /** FK id (UUID) of `ActCategory`. */
  category: string;
  category_name?: string;
  year: string;
  updated: string;
  premium: boolean;
  detail_json?: unknown | null;
}

export async function fetchAdminActs(): Promise<ActAdminApi[]> {
  const r = await sessionFetch('/api/admin/acts/');
  if (!r.ok) throw new Error(`acts ${r.status}`);
  return r.json();
}

export async function postAdminAct(body: Partial<ActAdminApi>): Promise<ActAdminApi> {
  const r = await sessionFetch('/api/admin/acts/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `act create ${r.status}`);
  return data as ActAdminApi;
}

export async function patchAdminAct(slug: string, body: Partial<ActAdminApi>): Promise<ActAdminApi> {
  const r = await sessionFetch(`/api/admin/acts/${encodeURIComponent(slug)}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `act patch ${r.status}`);
  return data as ActAdminApi;
}

export async function deleteAdminAct(slug: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/acts/${encodeURIComponent(slug)}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`act delete ${r.status}`);
}

export interface ProcedureStepAdminApi {
  id: string;
  order: number;
  description: string;
}

export interface ProcedureAdminApi {
  id: string;
  slug: string;
  /** FK id (UUID) of `ProcedureCategory`. */
  category: string;
  category_name?: string;
  title: string;
  summary: string;
  steps_count: number;
  duration_label: string;
  icon: string;
  steps: ProcedureStepAdminApi[];
}

export async function fetchAdminProcedures(): Promise<ProcedureAdminApi[]> {
  const r = await sessionFetch('/api/admin/procedures/');
  if (!r.ok) throw new Error(`procedures ${r.status}`);
  return r.json();
}

export async function postAdminProcedure(body: Partial<ProcedureAdminApi>): Promise<ProcedureAdminApi> {
  const r = await sessionFetch('/api/admin/procedures/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `procedure create ${r.status}`);
  return data as ProcedureAdminApi;
}

export async function patchAdminProcedure(id: string, body: Partial<ProcedureAdminApi>): Promise<ProcedureAdminApi> {
  const r = await sessionFetch(`/api/admin/procedures/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : `procedure patch ${r.status}`);
  return data as ProcedureAdminApi;
}

export async function deleteAdminProcedure(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/procedures/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`procedure delete ${r.status}`);
}

/** Public published posts (list endpoint omits body). */
export interface BlogPostPublicList {
  id: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  excerpt: string;
  author: string | null;
  author_email?: string | null;
  author_name: string;
  category: string;
  date: string;
  published: boolean;
  featured: boolean;
}

export interface BlogPostPublicDetail extends BlogPostPublicList {
  body: string;
}

export async function fetchPublicBlogPosts(): Promise<BlogPostPublicList[]> {
  const r = await fetch(apiUrl('/api/blog-posts/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`blog-posts ${r.status}`);
  return r.json();
}

export interface PublicHelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  sort_order: number;
  published: boolean;
}

export async function fetchPublicHelpArticles(category?: string | null): Promise<PublicHelpArticle[]> {
  const q = category?.trim() ? `?category=${encodeURIComponent(category.trim())}` : '';
  const r = await fetch(apiUrl(`/api/public/help-articles/${q}`), { credentials: 'omit' });
  if (!r.ok) throw new Error(`help-articles ${r.status}`);
  return r.json();
}

/**
 * Published help for the subscriber shell (`/client/help`, `/dashboard/help`).
 * Uses `/api/public/help-articles/` — same payload as `auth_help_articles` when that route is deployed.
 * The public list avoids a failing first hop when the API build on the server has no `/api/auth/help-articles/`.
 */
export async function fetchAuthHelpArticles(category?: string | null): Promise<PublicHelpArticle[]> {
  return fetchPublicHelpArticles(category);
}

export async function fetchPublicBlogPost(id: string): Promise<BlogPostPublicDetail | null> {
  const r = await fetch(apiUrl(`/api/blog-posts/${encodeURIComponent(id)}/`), { credentials: 'omit' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`blog-post ${r.status}`);
  return r.json() as Promise<BlogPostPublicDetail>;
}

export function blogPostPublicAuthorLabel(post: Pick<BlogPostPublicList, 'author_name' | 'author_email'>): string {
  const n = (post.author_name || '').trim();
  if (n) return n;
  const e = (post.author_email || '').trim();
  if (e) return e;
  return 'Editor';
}

/** Split CMS body on blank lines; single block stays one paragraph. */
export function blogBodyToParagraphs(body: string): string[] {
  const t = (body || '').trim();
  if (!t) return [];
  const blocks = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (blocks.length > 0) return blocks;
  return [t];
}

export async function fetchPricingPlansPublic(): Promise<PricingPlanApi[]> {
  const r = await fetch(apiUrl('/api/pricing-plans/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`pricing-plans ${r.status}`);
  return r.json();
}

/** Normalize decimals from Django REST JSON (often strings). */
export function normalizePricingPlans(rows: PricingPlanApi[]) {
  return rows
    .filter((p) => p.enabled)
    .map((p) => ({
      id: p.id,
      name: p.name,
      monthly: Number(p.monthly),
      yearly: Number(p.yearly),
      features: Array.isArray(p.features) ? p.features : [],
      cta: p.cta,
      highlight: p.highlight,
      enabled: p.enabled,
    }));
}

/** FAQ row from GET /api/pricing-page/ */
export interface PricingPageFaq {
  id: string;
  title: string;
  content: string;
  sort_order: number;
}

/** Per-account-type totals for 1 / 6 / 12 month (string decimals from API). */
export interface SubscriptionDurationTotals {
  one_month: string;
  six_month: string;
  one_year: string;
}

/** Aggregated public pricing page payload (GET /api/pricing-page/). */
export interface PricingPageApi {
  page_title: string;
  page_subtitle: string;
  faq_section_title: string;
  popular_badge_label: string;
  faq_category: string;
  currency: string;
  support_email: string;
  payments_enabled?: boolean;
  esewa_enabled?: boolean;
  khalti_enabled?: boolean;
  individual_monthly_price?: string;
  business_monthly_price?: string;
  individual_totals?: SubscriptionDurationTotals;
  business_totals?: SubscriptionDurationTotals;
  plans: PricingPlanApi[];
  faqs: PricingPageFaq[];
  yearly_savings_percent: number | null;
}

export async function fetchPricingPage(): Promise<PricingPageApi> {
  const r = await fetch(apiUrl('/api/pricing-page/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`pricing-page ${r.status}`);
  return r.json() as Promise<PricingPageApi>;
}

/** Public summary category (GET /api/summary-categories/) */
export interface SummaryCategoryApi {
  id: string;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
}

/** Public summary row (GET /api/summaries/ or detail) */
export interface SummaryApi {
  id: string;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  category: string;
  category_slug: string;
  category_name: string;
  posted: string;
  views: number;
  upvotes: number;
  downvotes: number;
  preview: string;
  premium: boolean;
  body: string;
  /** Present when `premium` and the caller lacks library access (server-side ciphertext). */
  body_encrypted?: string;
  /** Current visitor / session vote when X-Visitor-Id or auth is recognized. */
  my_vote?: 'up' | 'down' | null;
}

export async function fetchPublicSummaryCategories(): Promise<SummaryCategoryApi[]> {
  const r = await fetch(apiUrl('/api/summary-categories/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`summary-categories ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as SummaryCategoryApi[]) : [];
}

function summaryVisitorHeaders(): HeadersInit {
  return { 'X-Visitor-Id': getOrCreateSummaryVisitorId() };
}

export async function fetchPublicSummaries(params?: {
  category?: string | null;
  search?: string | null;
}): Promise<SummaryApi[]> {
  const sp = new URLSearchParams();
  if (params?.category) sp.set('category', params.category);
  if (params?.search?.trim()) sp.set('search', params.search.trim());
  const q = sp.toString();
  const path = q ? `/api/summaries/?${q}` : '/api/summaries/';
  const r = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) throw new Error(`summaries ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as SummaryApi[]) : [];
}

export async function fetchPublicSummaryBySlug(slug: string): Promise<SummaryApi | null> {
  const r = await fetch(apiUrl(`/api/summaries/${encodeURIComponent(slug)}/`), {
    credentials: 'include',
    headers: summaryVisitorHeaders(),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`summary ${r.status}`);
  return r.json() as Promise<SummaryApi>;
}

/** Register listing/detail impressions (deduped server-side per actor per UTC day). */
export async function postSummaryTrackViews(slugs: string[]): Promise<void> {
  const r = await sessionFetch('/api/summaries/track-views/', {
    method: 'POST',
    body: JSON.stringify({ slugs }),
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`track-views ${r.status} ${t}`);
  }
}

/** Set helpful vote (up/down) or clear with null. Returns updated summary row. */
export async function postSummaryVote(slug: string, vote: 'up' | 'down' | null): Promise<SummaryApi> {
  const r = await sessionFetch(`/api/summaries/${encodeURIComponent(slug)}/vote/`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
    headers: summaryVisitorHeaders(),
  });
  if (r.status === 404) throw new Error('summary not found');
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`summary vote ${r.status} ${t}`);
  }
  return r.json() as Promise<SummaryApi>;
}

/** Public notice row (GET /api/public/notices/). */
export interface NoticePublicApi {
  id: string;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  excerpt: string;
  title_ne: string;
  excerpt_ne: string;
  tags: string[];
  issued_by: string;
  published: boolean;
  view_count: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

/** Single published notice including body (GET /api/public/notices/:slug/). */
export type NoticePublicDetailApi = NoticePublicApi & {
  body: string;
  body_ne: string;
  issued_by_ne: string;
  my_vote?: 'up' | 'down' | null;
};

export async function fetchPublicNotices(params?: {
  search?: string | null;
  tag?: string | null;
  issued_by?: string | null;
}): Promise<NoticePublicApi[]> {
  const sp = new URLSearchParams();
  if (params?.search?.trim()) sp.set('search', params.search.trim());
  if (params?.tag?.trim()) sp.set('tag', params.tag.trim());
  if (params?.issued_by?.trim()) sp.set('issued_by', params.issued_by.trim());
  const q = sp.toString();
  const path = q ? `/api/public/notices/?${q}` : '/api/public/notices/';
  const r = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) throw new Error(`notices ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as NoticePublicApi[]) : [];
}

export async function fetchPublicNoticeBySlug(slug: string): Promise<NoticePublicDetailApi | null> {
  const r = await fetch(apiUrl(`/api/public/notices/${encodeURIComponent(slug)}/`), {
    credentials: 'include',
    headers: summaryVisitorHeaders(),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`notice ${r.status}`);
  return r.json() as Promise<NoticePublicDetailApi>;
}

/** Old UUID URLs → current slug (GET /api/public/notices/legacy/:id/). */
export async function fetchPublicNoticeSlugByLegacyId(id: string): Promise<{ slug: string }> {
  const r = await fetch(apiUrl(`/api/public/notices/legacy/${encodeURIComponent(id)}/`), {
    credentials: 'include',
    headers: summaryVisitorHeaders(),
  });
  if (r.status === 404) throw new Error('not found');
  if (!r.ok) throw new Error(`notice legacy ${r.status}`);
  return r.json() as Promise<{ slug: string }>;
}

export async function postNoticeVote(slug: string, vote: 'up' | 'down' | null): Promise<NoticePublicDetailApi> {
  const r = await sessionFetch(`/api/public/notices/${encodeURIComponent(slug)}/vote/`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
    headers: summaryVisitorHeaders(),
  });
  if (r.status === 404) throw new Error('notice not found');
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`notice vote ${r.status} ${t}`);
  }
  return r.json() as Promise<NoticePublicDetailApi>;
}

/** Register listing impressions (deduped server-side per actor per UTC day). */
export async function postNoticeTrackViews(ids: string[]): Promise<void> {
  const r = await sessionFetch('/api/public/notices/track-views/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`notice track-views ${r.status} ${t}`);
  }
}

/** Machine-translate English → Nepali (server uses MyMemory). */
export async function postPublicTranslateEnNe(parts: string[]): Promise<string[]> {
  const r = await sessionFetch('/api/public/translate/en-ne/', {
    method: 'POST',
    body: JSON.stringify({ parts }),
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`translate ${r.status} ${t}`);
  }
  const data = (await r.json()) as { parts?: unknown };
  if (!Array.isArray(data.parts) || !data.parts.every((x) => typeof x === 'string')) {
    throw new Error('translate: invalid response');
  }
  return data.parts as string[];
}

export type NoticeAdminApi = NoticePublicApi & {
  body: string;
  body_ne: string;
  issued_by_ne: string;
  sort_order: number;
  updated_at: string;
};

export async function fetchAdminNotices(): Promise<NoticeAdminApi[]> {
  const r = await sessionFetch('/api/admin/notices/');
  if (!r.ok) throw new Error(`admin notices ${r.status}`);
  return r.json() as Promise<NoticeAdminApi[]>;
}

export async function postAdminNotice(body: Partial<NoticeAdminApi>): Promise<NoticeAdminApi> {
  const r = await sessionFetch('/api/admin/notices/', { method: 'POST', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `notice create ${r.status}`,
    );
  return data as NoticeAdminApi;
}

export async function patchAdminNotice(id: string, body: Partial<NoticeAdminApi>): Promise<NoticeAdminApi> {
  const r = await sessionFetch(`/api/admin/notices/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `notice patch ${r.status}`,
    );
  return data as NoticeAdminApi;
}

export async function deleteAdminNotice(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/notices/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`notice delete ${r.status}`);
}

/** Public knowledge base download row (GET /api/public/knowledge-resources/). */
export interface KnowledgeResourcePublicApi {
  id: string;
  title: string;
  description: string;
  category: string;
  download_href: string;
  file_type: string;
  file_size_label: string;
  download_count: number;
}

/** GET — streams the PDF and increments `download_count` once per successful request. */
export function publicKnowledgeResourceDownloadApiPath(id: string): string {
  return `/api/public/knowledge-resources/${encodeURIComponent(id)}/download/`;
}

export async function fetchPublicKnowledgeResources(): Promise<KnowledgeResourcePublicApi[]> {
  const r = await fetch(apiUrl('/api/public/knowledge-resources/'), { credentials: 'include' });
  if (!r.ok) throw new Error(`knowledge-resources ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as KnowledgeResourcePublicApi[]) : [];
}

/** Public list for Knowledge Base filter chips (GET /api/public/knowledge-resource-categories/). */
export interface KnowledgeResourceCategoryPublicApi {
  id: string;
  name: string;
  sort_order: number;
}

export async function fetchPublicKnowledgeResourceCategories(): Promise<KnowledgeResourceCategoryPublicApi[]> {
  const r = await fetch(apiUrl('/api/public/knowledge-resource-categories/'), { credentials: 'include' });
  if (!r.ok) throw new Error(`knowledge-resource-categories ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as KnowledgeResourceCategoryPublicApi[]) : [];
}

export async function postKnowledgeResourceTrackDownloads(ids: string[]): Promise<void> {
  const r = await sessionFetch('/api/public/knowledge-resources/track-downloads/', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    headers: summaryVisitorHeaders(),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`knowledge track-downloads ${r.status} ${t}`);
  }
}

export type KnowledgeResourceAdminApi = KnowledgeResourcePublicApi & {
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function fetchAdminKnowledgeResources(): Promise<KnowledgeResourceAdminApi[]> {
  const r = await sessionFetch('/api/admin/knowledge-resources/');
  if (!r.ok) throw new Error(`admin knowledge-resources ${r.status}`);
  return r.json() as Promise<KnowledgeResourceAdminApi[]>;
}

/** Super-admin PDF stream for flipbook preview (GET; no download_count bump). Matches `admin_urls` `preview-pdf/`. */
export function adminKnowledgeResourcePdfPreviewPath(id: string): string {
  return `/api/admin/knowledge-resources/${encodeURIComponent(id)}/preview-pdf/`;
}

function knowledgeResourceFormData(fields: {
  title: string;
  description: string;
  category: string;
  published: boolean;
  sort_order: number;
  pdfFile?: File | null;
}): FormData {
  const fd = new FormData();
  fd.append('title', fields.title);
  fd.append('description', fields.description);
  fd.append('category', fields.category);
  fd.append('published', fields.published ? 'true' : 'false');
  fd.append('sort_order', String(fields.sort_order));
  if (fields.pdfFile) fd.append('pdf_file', fields.pdfFile);
  return fd;
}

export async function postAdminKnowledgeResource(
  fields: {
    title: string;
    description: string;
    category: string;
    published: boolean;
    sort_order: number;
    pdfFile: File;
  },
): Promise<KnowledgeResourceAdminApi> {
  const fd = knowledgeResourceFormData(fields);
  const r = await sessionFetch('/api/admin/knowledge-resources/', { method: 'POST', body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `knowledge-resource create ${r.status}`,
    );
  return data as KnowledgeResourceAdminApi;
}

export async function patchAdminKnowledgeResource(
  id: string,
  fields: {
    title: string;
    description: string;
    category: string;
    published: boolean;
    sort_order: number;
    pdfFile?: File | null;
  },
): Promise<KnowledgeResourceAdminApi> {
  const fd = knowledgeResourceFormData(fields);
  const r = await sessionFetch(`/api/admin/knowledge-resources/${id}/`, {
    method: 'PATCH',
    body: fd,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `knowledge-resource patch ${r.status}`,
    );
  return data as KnowledgeResourceAdminApi;
}

export async function deleteAdminKnowledgeResource(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/knowledge-resources/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) throw new Error(`knowledge-resource delete ${r.status}`);
}

export async function fetchAdminKnowledgeResourceCategories(): Promise<KnowledgeResourceCategoryPublicApi[]> {
  const r = await sessionFetch('/api/admin/knowledge-resource-categories/');
  if (!r.ok) throw new Error(`admin knowledge-resource-categories ${r.status}`);
  return r.json() as Promise<KnowledgeResourceCategoryPublicApi[]>;
}

export async function postAdminKnowledgeResourceCategory(body: {
  name: string;
  sort_order: number;
}): Promise<KnowledgeResourceCategoryPublicApi> {
  const r = await sessionFetch('/api/admin/knowledge-resource-categories/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `knowledge-resource-category create ${r.status}`,
    );
  return data as KnowledgeResourceCategoryPublicApi;
}

export async function patchAdminKnowledgeResourceCategory(
  id: string,
  body: { name?: string; sort_order?: number },
): Promise<KnowledgeResourceCategoryPublicApi> {
  const r = await sessionFetch(`/api/admin/knowledge-resource-categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(
      typeof (data as { detail?: string }).detail === 'string'
        ? (data as { detail: string }).detail
        : `knowledge-resource-category patch ${r.status}`,
    );
  return data as KnowledgeResourceCategoryPublicApi;
}

export async function deleteAdminKnowledgeResourceCategory(id: string): Promise<void> {
  const r = await sessionFetch(`/api/admin/knowledge-resource-categories/${id}/`, { method: 'DELETE' });
  if (!r.ok && r.status !== 204) {
    const t = await r.text().catch(() => '');
    throw new Error(t || `knowledge-resource-category delete ${r.status}`);
  }
}

/** Row from GET /api/practice-areas/ (matches `PracticeAreaSerializer`). */
export interface PracticeAreaApi {
  id: string;
  slug: string;
  name: string;
  meta_title?: string;
  meta_description?: string;
  icon: string;
  overview: string;
  tags: string[];
  related_cases_title: string;
  services: Array<{
    id: string;
    title: string;
    description: string;
    details: string[];
    previews: Array<{ label: string; value: string }>;
  }>;
  sort_order: number;
}

export async function fetchPublicPracticeAreas(): Promise<PracticeAreaApi[]> {
  const r = await fetch(apiUrl('/api/practice-areas/'), { credentials: 'omit' });
  if (!r.ok) throw new Error(`practice-areas ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as PracticeAreaApi[]) : [];
}

export async function fetchPublicLegalCases(practiceAreaSlug?: string): Promise<LegalCaseApi[]> {
  const sp = new URLSearchParams();
  if (practiceAreaSlug) sp.set('practice_area', practiceAreaSlug);
  const q = sp.toString();
  const path = q ? `/api/legal-cases/?${q}` : '/api/legal-cases/';
  const r = await fetch(apiUrl(path), { credentials: 'omit' });
  if (!r.ok) throw new Error(`legal-cases ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as LegalCaseApi[]) : [];
}

export async function fetchPublicLegalCaseBySlug(slug: string): Promise<LegalCaseApi | null> {
  const r = await fetch(apiUrl(`/api/legal-cases/${encodeURIComponent(slug)}/`), { credentials: 'omit' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`legal-case ${r.status}`);
  return r.json() as Promise<LegalCaseApi>;
}

/** Row from GET /api/acts/ (list) or GET /api/acts/:slug/ (detail includes `detail_json` when set). */
export interface ActApi {
  slug: string;
  title_en: string;
  title_ne: string;
  meta_title?: string;
  meta_description?: string;
  category: string;
  category_slug?: string;
  year: string;
  updated: string;
  premium: boolean;
  /** CMS-driven law reader payload; absent on list rows and when not configured. */
  detail_json?: unknown;
  /** Present when `premium` and the caller lacks library access (server-side ciphertext). */
  detail_json_encrypted?: string;
}

export async function fetchPublicActs(params?: {
  search?: string | null;
  category?: string | null;
}): Promise<ActApi[]> {
  const sp = new URLSearchParams();
  if (params?.search?.trim()) sp.set('search', params.search.trim());
  if (params?.category) sp.set('category', params.category);
  const q = sp.toString();
  const path = q ? `/api/acts/?${q}` : '/api/acts/';
  const r = await fetch(apiUrl(path), { credentials: 'omit' });
  if (!r.ok) throw new Error(`acts ${r.status}`);
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? (data as ActApi[]) : [];
}

export async function fetchPublicActBySlug(slug: string): Promise<ActApi | null> {
  const r = await fetch(apiUrl(`/api/acts/${encodeURIComponent(slug)}/`), { credentials: 'include' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`act ${r.status}`);
  return r.json() as Promise<ActApi>;
}
