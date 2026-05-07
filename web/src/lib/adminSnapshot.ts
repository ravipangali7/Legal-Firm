/**
 * Load admin UI state from Django `/api/admin/*` and keep maps for permission PATCHes.
 */
import type { UserRole } from '@/components/admin/AdminSidebar';
import { sessionFetch, type AuthMeUser } from '@/lib/api';

export const rolePermissionIndex = {
  byRoleAndModule: new Map<string, string>(),
  moduleIdByName: new Map<string, string>(),
  userNameById: new Map<string, string>(),
  clear() {
    this.byRoleAndModule.clear();
    this.moduleIdByName.clear();
    this.userNameById.clear();
  },
};

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await sessionFetch(path, init);
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : JSON.stringify(data);
    throw new Error(detail || `HTTP ${r.status}`);
  }
  return data as T;
}

/** List GET — forbidden/unauthenticated yields [] so a partial RBAC staff user can still load other admin data. */
async function jList(path: string, init?: RequestInit): Promise<Record<string, unknown>[]> {
  const r = await sessionFetch(path, init);
  if (r.status === 403 || r.status === 401) return [];
  const data = await r.json().catch(() => []);
  if (!r.ok) {
    const detail = typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : JSON.stringify(data);
    throw new Error(detail || `HTTP ${r.status}`);
  }
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

/** Single-object GET (e.g. settings) — forbidden yields {} for graceful degradation. */
async function jRecord(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const r = await sessionFetch(path, init);
  if (r.status === 403 || r.status === 401) return {};
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = typeof (data as { detail?: string }).detail === 'string' ? (data as { detail: string }).detail : JSON.stringify(data);
    throw new Error(detail || `HTTP ${r.status}`);
  }
  return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function syntheticPermissionModulesFromMe(me: AuthMeUser | null | undefined): Record<string, unknown>[] {
  const rows = me?.admin_permissions;
  if (!Array.isArray(rows) || !rows.length) return [];
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  let i = 0;
  for (const row of rows) {
    const name = String(row.module ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ id: `__me_perm_mod__${i++}`, name });
  }
  return out;
}

const d10 = (s: string | undefined) => (s || '').slice(0, 10);

/** Loose settings bag mapped from Django AppSettings (snake_case). */
export function mapSettings(raw: Record<string, unknown>) {
  return {
    siteName: String(raw.site_name ?? ''),
    siteLogo: raw.site_logo ? String(raw.site_logo) : undefined,
    siteFavicon: raw.site_favicon ? String(raw.site_favicon) : undefined,
    supportEmail: String(raw.support_email ?? ''),
    supportPhone: String(raw.support_phone ?? ''),
    currency: (raw.currency as 'NPR' | 'USD') || 'NPR',
    taxRate: Number(raw.tax_rate ?? 0),
    maintenanceMode: !!raw.maintenance_mode,
    allowSignups: !!raw.allow_signups,
    emailNotifications: !!raw.email_notifications,
    seoTitle: raw.seo_title ? String(raw.seo_title) : undefined,
    seoDescription: raw.seo_description ? String(raw.seo_description) : undefined,
    seoKeywords: raw.seo_keywords ? String(raw.seo_keywords) : undefined,
    ogImage: raw.og_image ? String(raw.og_image) : undefined,
    canonicalUrl: raw.canonical_url ? String(raw.canonical_url) : undefined,
    gaId: raw.ga_id ? String(raw.ga_id) : undefined,
    robotsTxt: raw.robots_txt ? String(raw.robots_txt) : undefined,
    smtpHost: raw.smtp_host ? String(raw.smtp_host) : undefined,
    smtpPort: raw.smtp_port != null ? Number(raw.smtp_port) : undefined,
    smtpUser: raw.smtp_user ? String(raw.smtp_user) : undefined,
    smtpPass: raw.smtp_pass ? String(raw.smtp_pass) : undefined,
    emailFromName: raw.email_from_name ? String(raw.email_from_name) : undefined,
    paymentsEnabled: !!raw.payments_enabled,
    esewaEnabled: !!raw.esewa_enabled,
    khaltiEnabled: !!raw.khalti_enabled,
    khaltiLiveKey: raw.khalti_live_key ? String(raw.khalti_live_key) : undefined,
    khaltiTestKey: raw.khalti_test_key ? String(raw.khalti_test_key) : undefined,
    khaltiLive: !!raw.khalti_live,
    navOrder: Array.isArray(raw.nav_order) ? (raw.nav_order as string[]) : undefined,
    individualMonthlyPrice: raw.individual_monthly_price != null ? Number(raw.individual_monthly_price) : undefined,
    businessMonthlyPrice: raw.business_monthly_price != null ? Number(raw.business_monthly_price) : undefined,
  };
}

type Perm = { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean };

function mergeRoles(
  roleRows: { id: string; name: string; key: string; description: string; is_system: boolean }[],
  modRows: { id: string; name: string }[],
  rpRows: { id: string; role: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]
) {
  const sortedMods = [...modRows].sort((a, b) => a.name.localeCompare(b.name));
  for (const m of modRows) {
    rolePermissionIndex.moduleIdByName.set(m.name, m.id);
  }
  for (const rp of rpRows) {
    rolePermissionIndex.byRoleAndModule.set(`${rp.role}:${rp.module}`, rp.id);
  }
  return roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    key: role.key as UserRole,
    description: role.description,
    isSystem: role.is_system,
    permissions: sortedMods.map((mod) => {
      const rp = rpRows.find((x) => x.role === role.id && x.module === mod.id);
      const isSuper = role.key === 'super_admin';
      const p: Perm = {
        module: mod.name,
        view: isSuper || !!rp?.can_view,
        create: isSuper || !!rp?.can_create,
        edit: isSuper || !!rp?.can_edit,
        delete: isSuper || !!rp?.can_delete,
      };
      return p;
    }),
  }));
}

/** Staff merged notifications (broadcast log + personal inbox). */
export async function fetchAdminPanelNotifications(): Promise<Record<string, unknown>[]> {
  const raw = await j<{ notifications: Record<string, unknown>[] }>('/api/admin/panel-notifications/');
  return raw.notifications ?? [];
}

export async function pullAdminSnapshot(me?: AuthMeUser | null) {
  rolePermissionIndex.clear();
  const [
    rawUsers,
    rawModsApi,
    rawRoles,
    rawRp,
    rawTx,
    rawClients,
    rawProjects,
    rawPlans,
    rawSettings,
    rawHelpArticles,
    rawContactMessages,
  ] = await Promise.all([
    jList('/api/admin/users/'),
    jList('/api/admin/permission-modules/'),
    jList('/api/admin/roles/'),
    jList('/api/admin/role-permissions/'),
    jList('/api/admin/transactions/'),
    jList('/api/admin/clients/'),
    jList('/api/admin/projects/'),
    jList('/api/admin/pricing-plans/'),
    jRecord('/api/admin/settings/'),
    jList('/api/admin/help-articles/'),
    jList('/api/admin/contact-messages/'),
  ]);
  const rawMods =
    rawModsApi.length > 0 ? rawModsApi : syntheticPermissionModulesFromMe(me ?? null);

  const users = rawUsers.map((u) => {
    const rawProf = u.profile;
    const profile =
      rawProf && typeof rawProf === 'object'
        ? {
            user_type: (rawProf as { user_type?: string }).user_type === 'business' ? ('business' as const) : ('individual' as const),
            pan: String((rawProf as { pan?: string }).pan ?? ''),
            vat: String((rawProf as { vat?: string }).vat ?? ''),
            company_name: String((rawProf as { company_name?: string }).company_name ?? ''),
          }
        : null;
    return {
      id: String(u.id),
      name: String(u.full_name ?? ''),
      email: String(u.email ?? ''),
      phone: String(u.phone ?? ''),
      role: u.role as 'super_admin' | 'admin' | 'editor' | 'client' | 'user',
      status: u.status as 'active' | 'suspended' | 'pending',
      subscribed: !!u.subscribed,
      plan: u.plan as 'free' | 'basic' | 'premium' | 'enterprise',
      createdAt: d10(u.created_at as string),
      lastLogin: d10((u.last_login_at || u.created_at) as string),
      avatar: u.avatar ? String(u.avatar) : undefined,
      profile,
      subscriptionPeriodStart: u.subscription_period_start ? String(u.subscription_period_start) : null,
      subscriptionPeriodEnd: u.subscription_period_end ? String(u.subscription_period_end) : null,
      planBenefitsEnd: u.plan_benefits_end ? String(u.plan_benefits_end) : null,
    };
  });
  for (const u of users) {
    rolePermissionIndex.userNameById.set(u.id, u.name);
  }

  const modRows = rawMods.map((m) => ({ id: String(m.id), name: String(m.name ?? '') }));
  const modules = modRows.map((m) => m.name).sort((a, b) => a.localeCompare(b));

  const roleRows = rawRoles.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    key: String(r.key ?? ''),
    description: String(r.description ?? ''),
    is_system: !!r.is_system,
  }));
  const rpRows = rawRp.map((x) => ({
    id: String(x.id),
    role: String(x.role),
    module: String(x.module),
    can_view: !!x.can_view,
    can_create: !!x.can_create,
    can_edit: !!x.can_edit,
    can_delete: !!x.can_delete,
  }));
  const roles = mergeRoles(roleRows, modRows, rpRows);

  const transactions = rawTx.map((t) => ({
    id: String(t.id),
    invoice: String(t.invoice ?? ''),
    user: String(t.user_name ?? ''),
    email: String(t.email ?? ''),
    amount: Number(t.amount ?? 0),
    currency: t.currency as 'NPR' | 'USD',
    method: t.method as 'esewa' | 'khalti' | 'bank' | 'stripe',
    status: t.status as 'pending' | 'verified' | 'rejected' | 'refunded',
    txnCode: String(t.txn_code ?? ''),
    createdAt: d10((t.created_at as string) || ''),
    plan: (t.plan as 'basic' | 'premium' | 'enterprise' | undefined) || undefined,
    billingCycle: (t.billing_cycle === 'yearly'
      ? 'yearly'
      : t.billing_cycle === 'six_month'
        ? 'six_month'
        : 'monthly') as 'monthly' | 'six_month' | 'yearly',
    rejectionReason: t.rejection_reason ? String(t.rejection_reason) : undefined,
  }));

  const clients = rawClients.map((c) => ({
    id: String(c.id),
    company: String(c.company ?? ''),
    contact: String(c.contact ?? ''),
    email: String(c.email ?? ''),
    phone: String(c.phone ?? ''),
    type: c.type as 'individual' | 'business',
    panVat: String(c.pan_vat ?? ''),
    activeProjects: Number(c.active_projects_count ?? 0),
    status: c.status as 'active' | 'inactive',
    joinedAt: d10((c.joined_at as string) || ''),
  }));

  const projects = rawProjects.map((p) => {
    const teamIds = Array.isArray(p.team) ? (p.team as string[]) : [];
    const teamNames = teamIds.map((id) => rolePermissionIndex.userNameById.get(id) || id);
    return {
      id: String(p.id),
      name: String(p.name ?? ''),
      client: String(p.client_name ?? ''),
      type: String(p.type ?? ''),
      status: p.status as 'planning' | 'in_progress' | 'review' | 'completed',
      progress: Number(p.progress ?? 0),
      dueDate: String(p.due_date ?? ''),
      team: teamNames,
    };
  });

  const plans = rawPlans.map((p) => ({
    id: String(p.id),
    name: String(p.name ?? ''),
    monthly: Number(p.monthly ?? 0),
    yearly: Number(p.yearly ?? 0),
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    cta: String(p.cta ?? ''),
    highlight: !!p.highlight,
    enabled: !!p.enabled,
  }));

  const settings = mapSettings(rawSettings);

  const helpArticles = rawHelpArticles.map((h) => ({
    id: String(h.id),
    title: String(h.title ?? ''),
    category: String(h.category ?? ''),
    content: String(h.content ?? ''),
    order: Number(h.sort_order ?? 0),
    published: !!h.published,
  }));

  return {
    users,
    roles,
    modules,
    transactions,
    clients,
    projects,
    plans,
    settings,
    helpArticles,
    contactMessages: rawContactMessages,
  };
}

const ap = (p: string) => `/api/admin/${p.replace(/^\//, '')}`;

export async function adminPatch(rel: string, body: unknown): Promise<void> {
  await j(ap(rel), { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminPost(rel: string, body: unknown): Promise<Record<string, unknown>> {
  return j(ap(rel), { method: 'POST', body: JSON.stringify(body) });
}

export async function adminDelete(rel: string): Promise<void> {
  await j(ap(rel), { method: 'DELETE' });
}

/** Map frontend AppSettings partial keys to Django snake_case. */
export function settingsPatchToApi(patch: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {
    siteName: 'site_name',
    siteLogo: 'site_logo',
    siteFavicon: 'site_favicon',
    supportEmail: 'support_email',
    supportPhone: 'support_phone',
    currency: 'currency',
    taxRate: 'tax_rate',
    maintenanceMode: 'maintenance_mode',
    allowSignups: 'allow_signups',
    emailNotifications: 'email_notifications',
    seoTitle: 'seo_title',
    seoDescription: 'seo_description',
    seoKeywords: 'seo_keywords',
    ogImage: 'og_image',
    canonicalUrl: 'canonical_url',
    gaId: 'ga_id',
    robotsTxt: 'robots_txt',
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    smtpUser: 'smtp_user',
    smtpPass: 'smtp_pass',
    emailFromName: 'email_from_name',
    paymentsEnabled: 'payments_enabled',
    esewaEnabled: 'esewa_enabled',
    khaltiEnabled: 'khalti_enabled',
    khaltiLiveKey: 'khalti_live_key',
    khaltiTestKey: 'khalti_test_key',
    khaltiLive: 'khalti_live',
    navOrder: 'nav_order',
    individualMonthlyPrice: 'individual_monthly_price',
    businessMonthlyPrice: 'business_monthly_price',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const apiKey = keyMap[k];
    if (apiKey && v !== undefined) out[apiKey] = v;
  }
  return out;
}
