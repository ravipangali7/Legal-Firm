import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { UserRole } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { effectiveSidebarRole } from '@/lib/adminSidebarRole';
import type { AuthMeUser } from '@/lib/api';
import {
  pullAdminSnapshot,
  adminPatch,
  adminPost,
  adminDelete,
  rolePermissionIndex,
  settingsPatchToApi,
  fetchAdminPanelNotifications,
} from '@/lib/adminSnapshot';
import {
  buildSupportTicketsList,
  initialNotificationsWithInbox,
  markSupportTicketViewedInStorage,
  removeContactSubmission,
  isInboundContactTicketId,
} from '@/lib/contactSupportInbox';
import {
  mergeNotificationReadOverrides,
  setNotificationReadOverride,
  setAllNotificationReadOverrides,
  removeNotificationReadOverride,
} from '@/lib/adminNotificationReadStorage';
import type { ActivityLogEntry } from '@/lib/adminActivityTypes';
import { loadAdminActivityLogs, saveAdminActivityLogs } from '@/lib/adminActivityLogStorage';
import { enrichAuditEntry, shallowChangeRecord } from '@/lib/adminActivityAudit';

// ============ Types ============
export interface AdminUserProfile {
  user_type: 'individual' | 'business';
  pan: string;
  vat: string;
  company_name: string;
}

export interface AdminUser {
  id: string; name: string; email: string; phone: string; role: UserRole;
  status: 'active' | 'suspended' | 'pending'; subscribed: boolean;
  plan: 'free' | 'basic' | 'premium' | 'enterprise'; createdAt: string; lastLogin: string; avatar?: string;
  profile?: AdminUserProfile | null;
  /** ISO datetimes from Django when connected to API */
  subscriptionPeriodStart?: string | null;
  subscriptionPeriodEnd?: string | null;
  planBenefitsEnd?: string | null;
}

/** Fields allowed on admin user PATCH (includes API-only keys). */
export type AdminUserPatch = Partial<AdminUser> & { password?: string; suspension_reason?: string };

export interface Permission { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean; }

export interface RoleDef {
  id: string; name: string; key: UserRole; description: string; isSystem: boolean; permissions: Permission[];
}

export type TxPlanTier = 'basic' | 'premium' | 'enterprise';

export interface Transaction {
  id: string; invoice: string; user: string; email: string; amount: number;
  currency: 'NPR' | 'USD'; method: 'esewa' | 'khalti' | 'bank' | 'stripe';
  status: 'pending' | 'verified' | 'rejected' | 'refunded'; txnCode: string; createdAt: string;
  /** Subscription tier applied when status becomes verified (matches backend Transaction.plan). */
  plan?: TxPlanTier;
  billingCycle?: 'monthly' | 'six_month' | 'yearly';
  rejectionReason?: string;
}

export interface Client {
  id: string; company: string; contact: string; email: string; phone: string;
  type: 'individual' | 'business'; panVat: string; activeProjects: number;
  status: 'active' | 'inactive'; joinedAt: string;
}

export interface Project {
  id: string; name: string; client: string; type: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  progress: number; dueDate: string; team: string[];
}

export interface PricingPlan {
  id: string; name: string; monthly: number; yearly: number;
  features: string[]; cta: string; highlight: boolean; enabled: boolean;
}

export interface AppSettings {
  siteName: string;
  siteLogo?: string;
  siteFavicon?: string;
  supportEmail: string; supportPhone: string;
  currency: 'NPR' | 'USD'; taxRate: number;
  maintenanceMode: boolean; allowSignups: boolean; emailNotifications: boolean;
  // SEO
  seoTitle?: string; seoDescription?: string; seoKeywords?: string;
  ogImage?: string; canonicalUrl?: string; gaId?: string; robotsTxt?: string;
  // Email
  smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string; emailFromName?: string;
  // Payments
  paymentsEnabled?: boolean;
  esewaEnabled?: boolean;
  khaltiEnabled?: boolean; khaltiLiveKey?: string; khaltiTestKey?: string; khaltiLive?: boolean;
  // Navigation
  navOrder?: string[];
  /** Monthly base (NPR) for individual subscribers — drives 1/6/12 month totals. */
  individualMonthlyPrice?: number;
  /** Monthly base (NPR) for business subscribers. */
  businessMonthlyPrice?: number;
}

export interface ImpersonationState { active: boolean; user: AdminUser | null; originalRole: UserRole | null; }

/** In-app / SMS / push targeting for admin-composed broadcasts (stored with the notification record). */
export type NotificationBulkAudience = 'all_users' | 'all_clients' | 'all_subscribers' | 'staff';

/** Per-channel result for server-logged transactional sends (see `outbound_panel_log`). */
export interface OutboundChannelReport {
  status: string;
  to?: string;
  detail?: string;
}

export interface AdminNotificationDelivery {
  channelInApp: boolean;
  channelSms: boolean;
  channelPush: boolean;
  /** Broadcast in-app (and phone on file when SMS/Push) to these segments at once. */
  bulkAudiences: NotificationBulkAudience[];
  /** One mobile number per line (E.164 or local); used for bulk SMS / push alongside selected channels. */
  bulkPhoneNumbers: string;
  /** One email or user ID per line; each line is a separate delivery to that account. */
  individualRecipients: string;
  /** Set when this row is an automated outbound log (no fan-out). */
  automatedOutbound?: boolean;
  outboundReport?: {
    email?: OutboundChannelReport;
    sms?: OutboundChannelReport;
    inApp?: OutboundChannelReport;
  };
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
  delivery?: AdminNotificationDelivery;
  /** When loaded from API: outbound broadcast log vs personal staff inbox row. */
  source?: 'broadcast' | 'inbox';
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  requester: string;
  email: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  assignee?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  /** Staff has opened the thread (inbound website contact tickets only use this for unread styling). */
  viewedByAdmin?: boolean;
}

export type { ActivityLogEntry } from '@/lib/adminActivityTypes';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  order: number;
  published: boolean;
}

// ============ Seed Data ============
const MODULES = [
  'Activity Logs',
  'Analytics',
  'Clients',
  'Dashboard',
  'Help',
  'Homepage CMS',
  'Legal library',
  'Notifications',
  'Pricing Plans',
  'Projects',
  'Roles',
  'Settings',
  'Support',
  'Transactions',
  'Users',
];

const seedUsers: AdminUser[] = [
  { id: 'u1', name: 'Ram Bahadur', email: 'ram@taxlexis.np', phone: '+977 9801234567', role: 'super_admin', status: 'active', subscribed: true, plan: 'enterprise', createdAt: '2025-01-12', lastLogin: '2026-04-30' },
  { id: 'u2', name: 'Sita Sharma', email: 'sita@taxlexis.np', phone: '+977 9812345678', role: 'admin', status: 'active', subscribed: true, plan: 'premium', createdAt: '2025-02-04', lastLogin: '2026-04-29' },
  { id: 'u3', name: 'Hari Thapa', email: 'hari@gmail.com', phone: '+977 9823456789', role: 'editor', status: 'active', subscribed: true, plan: 'basic', createdAt: '2025-03-15', lastLogin: '2026-04-28' },
  { id: 'u4', name: 'Gita Karki', email: 'gita@abc.com.np', phone: '+977 9834567890', role: 'client', status: 'active', subscribed: true, plan: 'premium', createdAt: '2025-05-20', lastLogin: '2026-04-30' },
  { id: 'u5', name: 'Bikash Lama', email: 'bikash@yahoo.com', phone: '+977 9845678901', role: 'user', status: 'active', subscribed: false, plan: 'free', createdAt: '2026-01-10', lastLogin: '2026-04-25' },
  { id: 'u6', name: 'Anita Rai', email: 'anita@xyz.org', phone: '+977 9856789012', role: 'user', status: 'pending', subscribed: false, plan: 'free', createdAt: '2026-04-15', lastLogin: '2026-04-15' },
  { id: 'u7', name: 'Dipesh Shrestha', email: 'dipesh@mail.com', phone: '+977 9867890123', role: 'user', status: 'suspended', subscribed: false, plan: 'free', createdAt: '2025-11-22', lastLogin: '2026-02-10' },
];

const defaultPerms = (full: boolean): Permission[] =>
  MODULES.map((m) => ({ module: m, view: full, create: full, edit: full, delete: full }));

const EDITOR_VIEW_MODULES = new Set([
  'Dashboard',
  'Homepage CMS',
  'Legal library',
  'Analytics',
  'Projects',
  'Notifications',
  'Settings',
  'Help',
  'Roles',
]);
const EDITOR_CEM_MODULES = new Set(['Homepage CMS', 'Legal library', 'Projects']);

const seedRoles: RoleDef[] = [
  { id: 'r1', name: 'Super Admin', key: 'super_admin', description: 'Full system access', isSystem: true, permissions: defaultPerms(true) },
  {
    id: 'r2',
    name: 'Admin',
    key: 'admin',
    description: 'Manage users, content & transactions',
    isSystem: true,
    permissions: MODULES.map((m) => {
      if (m === 'Roles' || m === 'Activity Logs') {
        return { module: m, view: false, create: false, edit: false, delete: false };
      }
      if (m === 'Settings') {
        return { module: m, view: true, create: false, edit: false, delete: false };
      }
      if (m === 'Users') {
        return { module: m, view: true, create: true, edit: true, delete: false };
      }
      return { module: m, view: true, create: true, edit: true, delete: true };
    }),
  },
  {
    id: 'r3',
    name: 'Editor',
    key: 'editor',
    description: 'Create and edit content only',
    isSystem: true,
    permissions: MODULES.map((m) => ({
      module: m,
      view: EDITOR_VIEW_MODULES.has(m),
      create: EDITOR_CEM_MODULES.has(m),
      edit: EDITOR_CEM_MODULES.has(m),
      delete: false,
    })),
  },
  {
    id: 'r4',
    name: 'Client',
    key: 'client',
    description: 'Subscribed customer access',
    isSystem: true,
    permissions: MODULES.map((m) => {
      if (m === 'Support') {
        return { module: m, view: true, create: true, edit: false, delete: false };
      }
      if (['Dashboard', 'Projects', 'Notifications', 'Settings', 'Help'].includes(m)) {
        return { module: m, view: true, create: false, edit: false, delete: false };
      }
      return { module: m, view: false, create: false, edit: false, delete: false };
    }),
  },
  {
    id: 'r5',
    name: 'User',
    key: 'user',
    description: 'Free / unsubscribed visitor',
    isSystem: true,
    permissions: MODULES.map((m) => {
      if (m === 'Support') {
        return { module: m, view: true, create: true, edit: false, delete: false };
      }
      if (['Dashboard', 'Notifications', 'Settings', 'Help'].includes(m)) {
        return { module: m, view: true, create: false, edit: false, delete: false };
      }
      return { module: m, view: false, create: false, edit: false, delete: false };
    }),
  },
];

const seedTransactions: Transaction[] = [
  { id: 't1', invoice: 'INV-2026-0142', user: 'Gita Karki', email: 'gita@abc.com.np', amount: 4999, currency: 'NPR', method: 'esewa', status: 'verified', txnCode: 'ESW-2X9K1', createdAt: '2026-04-28', plan: 'premium' },
  { id: 't2', invoice: 'INV-2026-0143', user: 'Anita Rai', email: 'anita@xyz.org', amount: 1999, currency: 'NPR', method: 'khalti', status: 'pending', txnCode: 'KHL-7H4M2', createdAt: '2026-04-29', plan: 'basic' },
  { id: 't3', invoice: 'INV-2026-0144', user: 'Bikash Lama', email: 'bikash@yahoo.com', amount: 999, currency: 'NPR', method: 'bank', status: 'rejected', txnCode: 'NIBL-998812', createdAt: '2026-04-27' },
  { id: 't4', invoice: 'INV-2026-0145', user: 'Hari Thapa', email: 'hari@gmail.com', amount: 4999, currency: 'NPR', method: 'esewa', status: 'verified', txnCode: 'ESW-9L2P3', createdAt: '2026-04-26', plan: 'enterprise' },
  { id: 't5', invoice: 'INV-2026-0146', user: 'Sita Sharma', email: 'sita@taxlexis.np', amount: 19999, currency: 'NPR', method: 'stripe', status: 'verified', txnCode: 'pi_3OqXyZ', createdAt: '2026-04-25', plan: 'enterprise' },
];

const seedClients: Client[] = [
  { id: 'cl1', company: 'ABC Trading Pvt Ltd', contact: 'Gita Karki', email: 'gita@abc.com.np', phone: '+977 9834567890', type: 'business', panVat: '301234567', activeProjects: 3, status: 'active', joinedAt: '2025-05-20' },
  { id: 'cl2', company: 'Himalayan Co-op', contact: 'Suman Magar', email: 'info@himcoop.np', phone: '+977 9811223344', type: 'business', panVat: '305678912', activeProjects: 1, status: 'active', joinedAt: '2025-09-11' },
  { id: 'cl3', company: 'Individual', contact: 'Bikash Lama', email: 'bikash@yahoo.com', phone: '+977 9845678901', type: 'individual', panVat: '102345678', activeProjects: 0, status: 'inactive', joinedAt: '2026-01-10' },
];

const seedProjects: Project[] = [
  { id: 'p1', name: 'Annual Tax Filing FY 2082/83', client: 'ABC Trading Pvt Ltd', type: 'Tax Compliance', status: 'in_progress', progress: 65, dueDate: '2026-07-15', team: ['Ram Bahadur', 'Sita Sharma'] },
  { id: 'p2', name: 'Company Re-registration', client: 'Himalayan Co-op', type: 'Corporate Law', status: 'review', progress: 90, dueDate: '2026-05-20', team: ['Hari Thapa'] },
  { id: 'p3', name: 'VAT Audit Defense', client: 'ABC Trading Pvt Ltd', type: 'Litigation', status: 'planning', progress: 15, dueDate: '2026-08-30', team: ['Sita Sharma'] },
  { id: 'p4', name: 'Trademark Registration', client: 'ABC Trading Pvt Ltd', type: 'IP Law', status: 'completed', progress: 100, dueDate: '2026-03-10', team: ['Hari Thapa', 'Ram Bahadur'] },
];

const seedPlans: PricingPlan[] = [
  { id: 'pl1', name: 'Basic', monthly: 499, yearly: 4790, features: ['Access to all Acts & Laws', '20 case summaries / month', 'Basic calculators', 'Email support'], cta: 'Get Started', highlight: false, enabled: true },
  { id: 'pl2', name: 'Premium', monthly: 1999, yearly: 19190, features: ['Everything in Basic', 'Unlimited case summaries', 'All calculators', 'Priority support', 'Download resources', 'Bookmarks & history'], cta: 'Get Started', highlight: true, enabled: true },
  { id: 'pl3', name: 'Enterprise', monthly: 4999, yearly: 47990, features: ['Everything in Premium', 'Multi-user access', 'API access', 'Dedicated account manager', 'Custom reports'], cta: 'Contact Sales', highlight: false, enabled: true },
];

const seedSettings: AppSettings = {
  siteName: 'TaxLexis', supportEmail: 'support@taxlexis.np', supportPhone: '+977 1 4444555',
  currency: 'NPR', taxRate: 13, maintenanceMode: false, allowSignups: true, emailNotifications: true,
  paymentsEnabled: false,
  navOrder: ['Home', 'Laws', 'Summaries', 'Procedures', 'Tools', 'Pricing', 'About', 'Professionals', 'Contact'],
  individualMonthlyPrice: 999,
  businessMonthlyPrice: 1999,
};

const seedNotifications: AdminNotification[] = [
  { id: 'nt1', title: 'New user registration', body: 'Anita Rai completed signup and is pending approval.', type: 'info', read: false, createdAt: '2026-05-02T10:12:00', link: '/admin/users' },
  { id: 'nt2', title: 'Payment received', body: 'Invoice INV-2026-0142 was verified via eSewa.', type: 'success', read: false, createdAt: '2026-05-02T09:40:00', link: '/admin/transactions' },
  { id: 'nt3', title: 'Support ticket updated', body: 'Ticket #TK-204 awaiting your reply.', type: 'warning', read: false, createdAt: '2026-05-02T08:05:00', link: '/admin/support' },
  { id: 'nt4', title: 'System update completed', body: 'Scheduled maintenance finished successfully.', type: 'system', read: true, createdAt: '2026-05-01T22:00:00', link: '/admin/help' },
  { id: 'nt5', title: 'Blog post published', body: 'A homepage news item was marked live.', type: 'info', read: true, createdAt: '2026-05-01T15:30:00', link: '/admin/cms/news' },
];

const seedSupportTickets: SupportTicket[] = [
  { id: 'tk1', subject: 'Cannot download invoice', description: 'Premium user reports PDF invoice fails on Safari.', requester: 'Gita Karki', email: 'gita@abc.com.np', status: 'open', priority: 'high', assignee: 'Sita Sharma', messages: [{ id: 'm1', author: 'Gita Karki', body: 'Safari 17 on macOS — download spins forever.', createdAt: '2026-05-01T11:00:00' }], createdAt: '2026-05-01T11:00:00', updatedAt: '2026-05-01T11:00:00' },
  { id: 'tk2', subject: 'Plan upgrade question', description: 'Clarification on Enterprise seats.', requester: 'Bikash Lama', email: 'bikash@yahoo.com', status: 'in_progress', priority: 'medium', assignee: 'Ram Bahadur', messages: [{ id: 'm2', author: 'Bikash Lama', body: 'Do we get 5 or 10 seats on Enterprise?', createdAt: '2026-04-30T09:20:00' }, { id: 'm3', author: 'Ram Bahadur', body: 'Enterprise includes up to 10 named seats. I’ll send the matrix.', createdAt: '2026-04-30T14:00:00' }], createdAt: '2026-04-30T09:20:00', updatedAt: '2026-04-30T14:00:00' },
  { id: 'tk3', subject: 'VAT calculator bug', description: 'Rounding differs from IRD excel.', requester: 'Hari Thapa', email: 'hari@gmail.com', status: 'waiting', priority: 'urgent', assignee: 'Hari Thapa', messages: [{ id: 'm4', author: 'Hari Thapa', body: 'See attached screenshot — 1 NPR variance.', createdAt: '2026-04-29T16:45:00' }], createdAt: '2026-04-29T16:45:00', updatedAt: '2026-04-29T16:45:00' },
  { id: 'tk4', subject: 'Reset password email delay', description: '', requester: 'Anita Rai', email: 'anita@xyz.org', status: 'open', priority: 'low', messages: [], createdAt: '2026-04-28T08:00:00', updatedAt: '2026-04-28T08:00:00' },
  { id: 'tk5', subject: 'Bulk export laws', description: 'Need CSV for compliance audit.', requester: 'ABC Trading Pvt Ltd', email: 'gita@abc.com.np', status: 'in_progress', priority: 'medium', assignee: 'Sita Sharma', messages: [{ id: 'm5', author: 'Gita Karki', body: 'Export button only gives JSON — need CSV.', createdAt: '2026-04-27T10:00:00' }], createdAt: '2026-04-27T10:00:00', updatedAt: '2026-04-27T10:00:00' },
  { id: 'tk6', subject: 'Wrong PAN on receipt', description: '', requester: 'Suman Magar', email: 'info@himcoop.np', status: 'open', priority: 'high', messages: [{ id: 'm6', author: 'Suman Magar', body: 'Receipt shows old PAN after profile update.', createdAt: '2026-04-26T13:10:00' }], createdAt: '2026-04-26T13:10:00', updatedAt: '2026-04-26T13:10:00' },
  { id: 'tk7', subject: 'Feature request: dark mode', description: '', requester: 'Dipesh Shrestha', email: 'dipesh@mail.com', status: 'waiting', priority: 'low', messages: [{ id: 'm7', author: 'Dipesh Shrestha', body: 'Any ETA for admin dark mode?', createdAt: '2026-04-25T18:00:00' }], createdAt: '2026-04-25T18:00:00', updatedAt: '2026-04-25T18:00:00' },
  { id: 'tk8', subject: 'API rate limits', description: 'Enterprise API throttling', requester: 'Sita Sharma', email: 'sita@taxlexis.np', status: 'open', priority: 'medium', assignee: 'Ram Bahadur', messages: [{ id: 'm8', author: 'Sita Sharma', body: 'What are the burst limits for /api/v1/search?', createdAt: '2026-04-24T09:00:00' }], createdAt: '2026-04-24T09:00:00', updatedAt: '2026-04-24T09:00:00' },
];

const seedActivityLogs: ActivityLogEntry[] = [
  {
    id: 'al1',
    actor: 'Ram Bahadur',
    action: 'update',
    entityType: 'User',
    entityId: 'u4',
    detail: 'Changed plan to premium for Gita Karki (gita@abc.com.np).',
    createdAt: '2026-05-02T10:00:00',
    channel: 'admin_ui',
    actorRole: 'super_admin',
    metadata: {
      api: 'PATCH /api/admin/users/u4/',
      changes: { plan: { from: 'basic', to: 'premium' }, subscribed: { from: true, to: true } },
    },
  },
  {
    id: 'al2',
    actor: 'Sita Sharma',
    action: 'create',
    entityType: 'HelpArticle',
    entityId: 'hp4',
    detail: 'Drafted help article "Keyboard shortcuts".',
    createdAt: '2026-05-02T09:30:00',
    channel: 'admin_ui',
    actorRole: 'admin',
    metadata: { api: 'POST /api/admin/help-articles/', category: 'Tips' },
  },
  {
    id: 'al3',
    actor: 'System',
    action: 'verify',
    entityType: 'Transaction',
    entityId: 't1',
    detail: 'Payment INV-2026-0142 verified; subscriber benefits applied.',
    createdAt: '2026-05-02T08:15:00',
    channel: 'admin_ui',
    metadata: { invoice: 'INV-2026-0142', amount: 1999, currency: 'NPR', method: 'esewa' },
  },
  {
    id: 'al4',
    actor: 'Hari Thapa',
    action: 'login',
    entityType: 'Session',
    detail: 'Staff session activity (illustrative seed).',
    createdAt: '2026-05-01T19:22:00',
    channel: 'admin_ui',
    actorRole: 'editor',
    metadata: { clientHint: 'Chrome', locale: 'Kathmandu' },
  },
  {
    id: 'al5',
    actor: 'Ram Bahadur',
    action: 'delete',
    entityType: 'HelpArticle',
    detail: 'Removed duplicate draft help article.',
    createdAt: '2026-05-01T14:00:00',
    channel: 'admin_ui',
  },
  {
    id: 'al6',
    actor: 'Sita Sharma',
    action: 'update',
    entityType: 'Role',
    entityId: 'r2',
    detail: 'Permission matrix update on role "Admin" for module Projects.',
    createdAt: '2026-04-30T11:40:00',
    channel: 'admin_ui',
    metadata: { module: 'Projects', permission: 'delete', newValue: true },
  },
  {
    id: 'al7',
    actor: 'Gita Karki',
    action: 'create',
    entityType: 'SupportTicket',
    entityId: 'tk1',
    detail: 'Inbound support ticket: Cannot download invoice.',
    createdAt: '2026-05-01T11:00:00',
    channel: 'admin_ui',
    metadata: { priority: 'medium', ticketSource: 'website_contact' },
  },
  {
    id: 'al8',
    actor: 'Admin',
    action: 'settings',
    entityType: 'AppSettings',
    detail: 'Site settings: SEO title updated.',
    createdAt: '2026-04-29T17:00:00',
    channel: 'admin_ui',
    metadata: { changes: { seoTitle: { from: 'TaxLexis', to: 'TaxLexis — Nepal Tax & Law' } } },
  },
];

const seedHelpArticles: HelpArticle[] = [
  { id: 'hp1', title: 'Managing users and roles', category: 'Getting started', content: 'Use **Users** to invite accounts and **Roles** to restrict modules. Super Admin can edit the permission matrix per module.', order: 1, published: true },
  { id: 'hp2', title: 'Verifying transactions', category: 'Billing', content: 'Open **Transactions**, filter by Pending, then mark **Verified** when the gateway confirms funds. Refunds downgrade the user plan automatically in demo mode.', order: 2, published: true },
  { id: 'hp3', title: 'Homepage CMS sections', category: 'CMS', content: 'Edit slides, services, and footer under **Homepage CMS**. Changes apply to the marketing site immediately after save.', order: 3, published: true },
  { id: 'hp4', title: 'Keyboard shortcuts', category: 'Tips', content: 'Use the header search on wide screens; collapse the sidebar for more horizontal space on smaller laptops.', order: 4, published: false },
];

function mapMeToAdminUser(u: AuthMeUser): AdminUser {
  const created = u.created_at ? u.created_at.slice(0, 10) : '';
  const last = u.last_login_at ? u.last_login_at.slice(0, 10) : '';
  const rawProf = u.profile;
  const profile =
    rawProf && typeof rawProf === 'object'
      ? {
          user_type: rawProf.user_type === 'business' ? ('business' as const) : ('individual' as const),
          pan: rawProf.pan ?? '',
          vat: rawProf.vat ?? '',
          company_name: rawProf.company_name ?? '',
        }
      : null;
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone || '',
    role: u.role as UserRole,
    status: u.status as AdminUser['status'],
    subscribed: u.subscribed,
    plan: u.plan as AdminUser['plan'],
    createdAt: created,
    lastLogin: last,
    avatar: u.avatar || undefined,
    profile,
  };
}

/** Match project form / assign-dialog value (CRM company name, account email, or client id) to a Client row. */
function resolveClientFromProjectPicker(clients: Client[], token: string): Client | undefined {
  const t = (token || '').trim();
  if (!t) return undefined;
  const byId = clients.find((c) => c.id === t);
  if (byId) return byId;
  const byCompany = clients.find((c) => c.company === t);
  if (byCompany) return byCompany;
  const tl = t.toLowerCase();
  return clients.find((c) => c.email.trim().toLowerCase() === tl);
}

// ============ Context ============
interface AdminStore {
  currentRole: UserRole; setCurrentRole: (r: UserRole) => void;
  impersonation: ImpersonationState; startImpersonation: (user: AdminUser) => void; stopImpersonation: () => void;
  users: AdminUser[];
  addUser: (u: Omit<AdminUser, 'id' | 'createdAt' | 'lastLogin'>) => void;
  updateUser: (id: string, patch: AdminUserPatch) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  revokeUserSubscription: (userId: string) => Promise<void>;
  roles: RoleDef[]; modules: string[]; addModule: (name: string) => Promise<void>;
  updateRolePermission: (roleId: string, module: string, perm: keyof Omit<Permission, 'module'>, value: boolean) => Promise<void>;
  updateRoleMeta: (roleId: string, patch: Partial<Pick<RoleDef, 'name' | 'description'>>) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction> & { rejectionReason?: string }) => Promise<void>;
  deleteTransaction: (id: string) => void;
  clients: Client[]; addClient: (c: Omit<Client, 'id' | 'joinedAt' | 'activeProjects'>) => void; updateClient: (id: string, patch: Partial<Client>) => void; deleteClient: (id: string) => void;
  projects: Project[];
  addProject: (p: Omit<Project, 'id' | 'progress'>) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  /** PATCH project client only; awaits API when connected so the server can send notifications. */
  assignProjectClient: (projectId: string, clientPickerValue: string) => Promise<void>;
  deleteProject: (id: string) => void;
  plans: PricingPlan[]; addPlan: (p: Omit<PricingPlan, 'id'>) => void; updatePlan: (id: string, patch: Partial<PricingPlan>) => void; deletePlan: (id: string) => void;
  settings: AppSettings; updateSettings: (patch: Partial<AppSettings>) => void;
  notifications: AdminNotification[];
  addNotification: (
    n: Omit<AdminNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AdminNotification, 'read' | 'id' | 'createdAt'>>
  ) => void;
  updateNotification: (id: string, patch: Partial<AdminNotification>) => void;
  deleteNotification: (id: string) => void;
  markNotificationRead: (id: string, read?: boolean) => void;
  markAllNotificationsRead: () => void;
  supportTickets: SupportTicket[];
  addSupportTicket: (
    t: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'> & { id?: string; messages?: TicketMessage[] }
  ) => void;
  updateSupportTicket: (id: string, patch: Partial<Omit<SupportTicket, 'id' | 'messages'>> & { messages?: TicketMessage[] }) => void;
  deleteSupportTicket: (id: string) => void;
  addTicketReply: (ticketId: string, author: string, body: string) => void;
  activityLogs: ActivityLogEntry[];
  addActivityLog: (e: Omit<ActivityLogEntry, 'id' | 'createdAt'>) => void;
  updateActivityLog: (id: string, patch: Partial<ActivityLogEntry>) => void;
  deleteActivityLog: (id: string) => void;
  helpArticles: HelpArticle[];
  addHelpArticle: (h: Omit<HelpArticle, 'id'>) => Promise<void>;
  updateHelpArticle: (id: string, patch: Partial<HelpArticle>) => Promise<void>;
  deleteHelpArticle: (id: string) => Promise<void>;
  /** True when `/api/admin/*` snapshot is loaded for a staff session */
  apiConnected: boolean;
  /** First admin snapshot attempt finished (success or failure). */
  adminSnapshotLoaded: boolean;
  refreshFromApi: () => Promise<void>;
}

const Ctx = createContext<AdminStore | null>(null);
const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString().slice(0, 19);
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const defaultBroadcastDelivery = (): AdminNotificationDelivery => ({
  channelInApp: true,
  channelSms: false,
  channelPush: false,
  bulkAudiences: [],
  bulkPhoneNumbers: '',
  individualRecipients: '',
});

function mapPanelApiRows(rows: Record<string, unknown>[]): AdminNotification[] {
  return rows.map((raw) => {
    const deliveryRaw = raw.delivery;
    let delivery: AdminNotificationDelivery | undefined;
    if (deliveryRaw && typeof deliveryRaw === 'object' && deliveryRaw !== null && !Array.isArray(deliveryRaw)) {
      const d = deliveryRaw as Record<string, unknown>;
      const aud = Array.isArray(d.bulkAudiences) ? d.bulkAudiences : [];
      const orRaw = d.outboundReport;
      let outboundReport: AdminNotificationDelivery['outboundReport'] = undefined;
      if (orRaw && typeof orRaw === 'object' && !Array.isArray(orRaw)) {
        const o = orRaw as Record<string, unknown>;
        const pick = (k: string): OutboundChannelReport | undefined => {
          const v = o[k];
          if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
          const r = v as Record<string, unknown>;
          return {
            status: String(r.status ?? ''),
            to: r.to !== undefined ? String(r.to) : undefined,
            detail: r.detail !== undefined ? String(r.detail) : undefined,
          };
        };
        outboundReport = {
          email: pick('email'),
          sms: pick('sms'),
          inApp: pick('inApp'),
        };
      }
      delivery = {
        channelInApp: !!d.channelInApp,
        channelSms: !!d.channelSms,
        channelPush: !!d.channelPush,
        bulkAudiences: aud.filter((x): x is NotificationBulkAudience =>
          ['all_users', 'all_clients', 'all_subscribers', 'staff'].includes(String(x))
        ),
        bulkPhoneNumbers: typeof d.bulkPhoneNumbers === 'string' ? d.bulkPhoneNumbers : '',
        individualRecipients: typeof d.individualRecipients === 'string' ? d.individualRecipients : '',
        automatedOutbound: !!d.automatedOutbound,
        outboundReport,
      };
    }
    const t = String(raw.type ?? 'info');
    const type = (['info', 'success', 'warning', 'system'].includes(t) ? t : 'info') as AdminNotification['type'];
    return {
      id: String(raw.id),
      title: String(raw.title ?? ''),
      body: String(raw.body ?? ''),
      type,
      read: !!raw.read,
      createdAt: typeof raw.created_at === 'string' ? raw.created_at.slice(0, 19) : '',
      link: raw.link ? String(raw.link) : undefined,
      delivery,
      source: raw.source === 'broadcast' ? 'broadcast' : 'inbox',
    };
  });
}

/** When admin verifies/refunds a transaction, mirror subscription effects on the demo user list. */
function applyTxnStatusToUsers(users: AdminUser[], t: Transaction, newStatus: Transaction['status']): AdminUser[] {
  const email = t.email.trim().toLowerCase();
  return users.map((u) => {
    const match = u.email.toLowerCase() === email || u.name.trim() === t.user.trim();
    if (!match) return u;
    if (newStatus === 'verified') {
      const tier: AdminUser['plan'] = t.plan ?? 'premium';
      return {
        ...u,
        subscribed: true,
        status: u.status === 'pending' ? 'active' : u.status,
        plan: tier,
      };
    }
    if (newStatus === 'refunded') {
      return { ...u, subscribed: false, plan: 'free' };
    }
    return u;
  });
}

export const AdminStoreProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, loading: authLoading, refreshUser } = useAuth();
  const [apiConnected, setApiConnected] = useState(false);
  const [adminSnapshotLoaded, setAdminSnapshotLoaded] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [impersonation, setImpersonation] = useState<ImpersonationState>({ active: false, user: null, originalRole: null });
  /** Empty until the first successful `/api/admin/*` snapshot — avoids flashing TaxLexis seed rows on reload (production). */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [settings, setSettings] = useState<AppSettings>(seedSettings);
  const [notifications, setNotifications] = useState<AdminNotification[]>(() =>
    mergeNotificationReadOverrides(initialNotificationsWithInbox(seedNotifications))
  );
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() =>
    buildSupportTicketsList([], seedSupportTickets)
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => loadAdminActivityLogs() ?? seedActivityLogs);
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);

  useEffect(() => {
    if (apiConnected) return;
    setClients((cs) =>
      cs.map((c) => ({
        ...c,
        activeProjects: projects.filter((p) => p.client === c.company && p.status !== 'completed').length,
      }))
    );
  }, [projects, apiConnected]);

  const loadPanelNotifications = useCallback(async () => {
    try {
      const rows = await fetchAdminPanelNotifications();
      setNotifications(mergeNotificationReadOverrides(mapPanelApiRows(rows)));
    } catch {
      /* offline or unauthorized */
    }
  }, []);

  const refreshFromApi = useCallback(async () => {
    const snap = await pullAdminSnapshot(authUser ?? null);
    setUsers(snap.users);
    setRoles(snap.roles as RoleDef[]);
    setModules(snap.modules);
    setTransactions(snap.transactions as Transaction[]);
    setClients(snap.clients as Client[]);
    setProjects(snap.projects as Project[]);
    setPlans(snap.plans as PricingPlan[]);
    setSettings(snap.settings as AppSettings);
    setHelpArticles(snap.helpArticles as HelpArticle[]);
    setSupportTickets(buildSupportTicketsList(snap.contactMessages ?? [], seedSupportTickets));
    setApiConnected(true);
    await loadPanelNotifications();
  }, [loadPanelNotifications, authUser]);

  useEffect(() => {
    if (!authUser?.is_staff || impersonation.active) return;
    setCurrentRole(effectiveSidebarRole(authUser));
  }, [authUser, impersonation.active]);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!authUser?.is_staff) {
      setUsers([]);
      setRoles([]);
      setModules([]);
      setTransactions([]);
      setClients([]);
      setProjects([]);
      setPlans([]);
      setHelpArticles([]);
      setApiConnected(false);
      setAdminSnapshotLoaded(true);
      return;
    }
    setAdminSnapshotLoaded(false);
    setUsers([]);
    setRoles([]);
    setModules([]);
    setTransactions([]);
    setClients([]);
    setProjects([]);
    setPlans([]);
    setHelpArticles([]);
    setApiConnected(false);
    (async () => {
      try {
        await refreshFromApi();
      } catch {
        if (import.meta.env.DEV) {
          setUsers(seedUsers);
          setRoles(seedRoles);
          setModules(MODULES);
          setTransactions(seedTransactions);
          setClients(seedClients);
          setProjects(seedProjects);
          setPlans(seedPlans);
          setHelpArticles(seedHelpArticles);
        }
      } finally {
        if (!cancelled) setAdminSnapshotLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser?.id, authUser?.is_staff, refreshFromApi]);

  useEffect(() => {
    if (authLoading || !authUser?.is_staff || impersonation.active) return;
    const intervalMs = 10000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      void refreshFromApi();
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [authLoading, authUser?.is_staff, impersonation.active, refreshFromApi]);

  useEffect(() => {
    if (authLoading) return;
    if (authUser?.impersonation?.active) {
      setImpersonation((prev) => ({
        active: true,
        user: mapMeToAdminUser(authUser as AuthMeUser),
        originalRole: prev.originalRole,
      }));
      setCurrentRole((authUser.role || 'user') as UserRole);
    }
  }, [authLoading, authUser?.id, authUser?.impersonation?.active, authUser?.role, authUser?.email]);

  useEffect(() => {
    if (!authLoading && !authUser) {
      setImpersonation({ active: false, user: null, originalRole: null });
    }
  }, [authLoading, authUser]);

  const pushAudit = useCallback(
    (partial: Omit<ActivityLogEntry, 'id' | 'createdAt'>) => {
      const enriched = enrichAuditEntry(partial, {
        authUser,
        currentRole,
        impersonatingActive: impersonation.active,
        apiConnected,
      });
      setActivityLogs((s) => {
        const row: ActivityLogEntry = { ...enriched, id: uid('al'), createdAt: nowIso() };
        const next = [row, ...s].slice(0, 500);
        saveAdminActivityLogs(next);
        return next;
      });
    },
    [authUser, currentRole, impersonation.active, apiConnected]
  );

  const startImpersonation = useCallback(
    (user: AdminUser) => {
      setImpersonation((prev) => ({ active: true, user, originalRole: prev.originalRole ?? currentRole }));
      setCurrentRole(user.role);
      pushAudit({
        action: 'impersonation_start',
        entityType: 'Session',
        entityId: user.id,
        detail: `Started viewing the app as ${user.name} (${user.email}).`,
        metadata: { targetUserId: user.id, targetRole: user.role },
      });
    },
    [currentRole, pushAudit]
  );
  const stopImpersonation = useCallback(() => {
    let was: AdminUser | null = null;
    setImpersonation((prev) => {
      was = prev.user;
      return { active: false, user: null, originalRole: null };
    });
    if (was) {
      pushAudit({
        action: 'impersonation_end',
        entityType: 'Session',
        entityId: was.id,
        detail: `Stopped impersonating ${was.name}.`,
        metadata: { targetUserId: was.id },
      });
    }
  }, [pushAudit]);

  const value: AdminStore = {
    currentRole, setCurrentRole,
    impersonation, startImpersonation, stopImpersonation,
    users,
    addUser: (u) => {
      if (apiConnected) {
        void (async () => {
          const pwd = (u as AdminUser & { password?: string }).password;
          if (!pwd) {
            return;
          }
          const body: Record<string, unknown> = {
            password: pwd,
            full_name: u.name,
            phone: u.phone ?? '',
            role: u.role,
            status: u.status,
            subscribed: u.subscribed,
            plan: u.plan,
          };
          if (u.email?.trim()) {
            body.email = u.email.trim();
          }
          if (u.profile) {
            body.user_type = u.profile.user_type;
            body.pan = u.profile.pan ?? '';
            body.vat = u.profile.vat ?? '';
            body.company_name = u.profile.company_name ?? '';
          }
          if (u.avatar !== undefined && u.avatar !== '') {
            body.avatar = u.avatar;
          }
          await adminPost('users/', body);
          await refreshFromApi();
          pushAudit({
            action: 'create',
            entityType: 'User',
            detail: `Created account for ${u.name}${u.email ? ` (${u.email})` : ''} via API.`,
            metadata: { api: 'POST /api/admin/users/', role: u.role, status: u.status, plan: u.plan },
          });
        })();
        return;
      }
      const newId = uid('u');
      setUsers((s) => [{ ...u, id: newId, createdAt: today(), lastLogin: today() }, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'User',
        entityId: newId,
        detail: `Created user ${u.name}${u.email ? ` (${u.email})` : ''} (local demo).`,
        metadata: { mode: 'local_demo', role: u.role, plan: u.plan },
      });
    },
    updateUser: async (id, patch) => {
      const prev = users.find((x) => x.id === id);
      const patchKeys = Object.keys(patch).filter((k) => k !== 'password');
      const pwdNote = patch.password ? ' Password was reset.' : '';
      if (apiConnected) {
        const body: Record<string, unknown> = {};
        if (patch.name !== undefined) body.full_name = patch.name;
        if (patch.email !== undefined) body.email = patch.email;
        if (patch.phone !== undefined) body.phone = patch.phone;
        if (patch.role !== undefined) body.role = patch.role;
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.subscribed !== undefined) body.subscribed = patch.subscribed;
        if (patch.plan !== undefined) body.plan = patch.plan;
        if (patch.subscriptionPeriodStart !== undefined) body.subscription_period_start = patch.subscriptionPeriodStart;
        if (patch.subscriptionPeriodEnd !== undefined) body.subscription_period_end = patch.subscriptionPeriodEnd;
        if (patch.planBenefitsEnd !== undefined) body.plan_benefits_end = patch.planBenefitsEnd;
        if (patch.password) body.password = patch.password;
        if (patch.profile !== undefined && patch.profile !== null) {
          const p = patch.profile;
          if (p.user_type !== undefined) body.user_type = p.user_type;
          if (p.pan !== undefined) body.pan = p.pan;
          if (p.vat !== undefined) body.vat = p.vat;
          if (p.company_name !== undefined) body.company_name = p.company_name;
        }
        if (patch.avatar !== undefined) {
          body.avatar = patch.avatar;
        }
        if (patch.suspension_reason !== undefined && patch.suspension_reason !== '') {
          body.suspension_reason = patch.suspension_reason;
        }
        await adminPatch(`users/${id}/`, body);
        await refreshFromApi();
        // CRM Client rows are upserted when role becomes client; a second snapshot pass
        // avoids stale empty Clients after read-replica / transaction visibility lag.
        if (patch.role === 'client') {
          await new Promise((r) => setTimeout(r, 250));
          await refreshFromApi();
        }
        pushAudit({
          action: 'update',
          entityType: 'User',
          entityId: id,
          detail: `Updated ${prev?.name ?? 'user'} (${id}): ${patchKeys.join(', ')}.${pwdNote}`.trim(),
          metadata: {
            api: `PATCH /api/admin/users/${id}/`,
            changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
          },
        });
        return;
      }
      const { suspension_reason: _sr, password: _pw, ...rest } = patch;
      const merged: AdminUser | undefined = prev ? { ...prev, ...rest } : undefined;
      const effectiveRole = merged?.role;
      setUsers((s) => s.map((x) => (x.id === id ? { ...x, ...rest } : x)));
      if (effectiveRole === 'client' && merged) {
        const em = (merged.email || '').trim().toLowerCase();
        if (em) {
          const company =
            (merged.profile?.company_name || '').trim() ||
            merged.name.trim() ||
            em.split('@')[0] ||
            'Client';
          const contact = merged.name.trim() || company;
          const panVat = (merged.profile?.pan || merged.profile?.vat || '').trim();
          const typ: Client['type'] = merged.profile?.user_type === 'business' ? 'business' : 'individual';
          const st: Client['status'] = merged.status === 'active' ? 'active' : 'inactive';
          setClients((cs) => {
            const ix = cs.findIndex((c) => c.email.trim().toLowerCase() === em);
            const base = {
              company,
              contact,
              email: merged.email,
              phone: merged.phone,
              type: typ,
              panVat,
              status: st,
            };
            if (ix >= 0) {
              const row = cs[ix];
              return cs.map((c, i) =>
                i === ix ? { ...row, ...base, joinedAt: row.joinedAt, activeProjects: row.activeProjects } : c
              );
            }
            return [{ id: uid('cl'), ...base, activeProjects: 0, joinedAt: merged.createdAt || today() }, ...cs];
          });
        }
      }
      pushAudit({
        action: 'update',
        entityType: 'User',
        entityId: id,
        detail: `Updated ${prev?.name ?? 'user'} (${id}): ${patchKeys.join(', ')}.${pwdNote}`.trim(),
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, rest as unknown as Record<string, unknown>),
        },
      });
    },
    deleteUser: async (id) => {
      const victim = users.find((x) => x.id === id);
      if (apiConnected) {
        await adminDelete(`users/${id}/`);
        await refreshFromApi();
        pushAudit({
          action: 'delete',
          entityType: 'User',
          entityId: id,
          detail: `Deleted user ${victim?.name ?? id}${victim?.email ? ` (${victim.email})` : ''}.`,
          metadata: { api: `DELETE /api/admin/users/${id}/` },
        });
        return;
      }
      setUsers((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'User',
        entityId: id,
        detail: `Deleted user ${victim?.name ?? id} (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    revokeUserSubscription: async (id) => {
      const prev = users.find((x) => x.id === id);
      if (!apiConnected) {
        setUsers((s) =>
          s.map((x) =>
            x.id === id ? { ...x, subscribed: false, plan: 'free', subscriptionPeriodStart: null, subscriptionPeriodEnd: null, planBenefitsEnd: null } : x
          )
        );
        pushAudit({
          action: 'revoke_subscription',
          entityType: 'User',
          entityId: id,
          detail: `Revoked subscription for ${prev?.name ?? id} (local demo).`,
          metadata: { mode: 'local_demo', priorPlan: prev?.plan },
        });
        return;
      }
      await adminPost(`users/${id}/revoke-subscription/`, {});
      await refreshFromApi();
      pushAudit({
        action: 'revoke_subscription',
        entityType: 'User',
        entityId: id,
        detail: `Revoked subscription for ${prev?.name ?? id}.`,
        metadata: { api: `POST /api/admin/users/${id}/revoke-subscription/`, priorPlan: prev?.plan },
      });
    },
    roles, modules,
    addModule: (name) => {
      if (apiConnected) {
        return (async () => {
          await adminPost('permission-modules/', { name: name.trim() });
          await refreshFromApi();
          pushAudit({
            action: 'create',
            entityType: 'PermissionModule',
            detail: `Added permission module "${name.trim()}".`,
            metadata: { api: 'POST /api/admin/permission-modules/', name: name.trim() },
          });
        })();
      }
      if (!name.trim() || modules.includes(name)) return Promise.resolve();
      setModules((m) => [...m, name]);
      setRoles((rs) =>
        rs.map((r) => ({
          ...r,
          permissions: [
            ...r.permissions,
            {
              module: name,
              view: r.key === 'super_admin',
              create: r.key === 'super_admin',
              edit: r.key === 'super_admin',
              delete: r.key === 'super_admin',
            },
          ],
        }))
      );
      pushAudit({
        action: 'create',
        entityType: 'PermissionModule',
        detail: `Added permission module "${name.trim()}" (local demo).`,
        metadata: { mode: 'local_demo', name: name.trim() },
      });
      return Promise.resolve();
    },
    updateRolePermission: (roleId, module, perm, value) => {
      const roleName = roles.find((r) => r.id === roleId)?.name ?? roleId;
      if (apiConnected) {
        return (async () => {
          const modId = rolePermissionIndex.moduleIdByName.get(module);
          if (!modId) throw new Error('Unknown module');
          const rpId = rolePermissionIndex.byRoleAndModule.get(`${roleId}:${modId}`);
          const key =
            perm === 'view'
              ? 'can_view'
              : perm === 'create'
                ? 'can_create'
                : perm === 'edit'
                  ? 'can_edit'
                  : 'can_delete';
          if (!rpId) {
            const r = roles.find((x) => x.id === roleId);
            const row = r?.permissions.find((p) => p.module === module);
            await adminPost('role-permissions/', {
              role: roleId,
              module: modId,
              can_view: perm === 'view' ? value : !!row?.view,
              can_create: perm === 'create' ? value : !!row?.create,
              can_edit: perm === 'edit' ? value : !!row?.edit,
              can_delete: perm === 'delete' ? value : !!row?.delete,
            });
          } else {
            await adminPatch(`role-permissions/${rpId}/`, { [key]: value });
          }
          await refreshFromApi();
          void refreshUser({ silent: true });
          pushAudit({
            action: 'update',
            entityType: 'RolePermission',
            entityId: roleId,
            detail: `Role "${roleName}": set ${module} · ${perm} = ${value ? 'on' : 'off'}.`,
            metadata: { api: rpId ? `PATCH role-permissions/${rpId}/` : 'POST role-permissions/', module, perm, value },
          });
        })();
      }
      setRoles((rs) =>
        rs.map((r) =>
          r.id === roleId
            ? { ...r, permissions: r.permissions.map((p) => (p.module === module ? { ...p, [perm]: value } : p)) }
            : r
        )
      );
      pushAudit({
        action: 'update',
        entityType: 'RolePermission',
        entityId: roleId,
        detail: `Role "${roleName}": set ${module} · ${perm} = ${value ? 'on' : 'off'} (local demo).`,
        metadata: { mode: 'local_demo', module, perm, value },
      });
      return Promise.resolve();
    },
    updateRoleMeta: (roleId, patch) => {
      const prev = roles.find((r) => r.id === roleId);
      if (apiConnected) {
        return (async () => {
          await adminPatch(`roles/${roleId}/`, patch);
          await refreshFromApi();
          pushAudit({
            action: 'update',
            entityType: 'Role',
            entityId: roleId,
            detail: `Updated role metadata for "${prev?.name ?? roleId}".`,
            metadata: {
              api: `PATCH /api/admin/roles/${roleId}/`,
              changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
            },
          });
        })();
      }
      setRoles((rs) => rs.map((r) => (r.id === roleId ? { ...r, ...patch } : r)));
      pushAudit({
        action: 'update',
        entityType: 'Role',
        entityId: roleId,
        detail: `Updated role "${prev?.name ?? roleId}" (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
      return Promise.resolve();
    },
    transactions,
    addTransaction: (t) => {
      const newId = uid('t');
      setTransactions((s) => [{ ...t, id: newId, createdAt: today() }, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'Transaction',
        entityId: newId,
        detail: `Recorded transaction ${t.invoice} for ${t.user} (${t.amount} ${t.currency}, ${t.status}).`,
        metadata: {
          invoice: t.invoice,
          user: t.user,
          email: t.email,
          amount: t.amount,
          currency: t.currency,
          method: t.method,
          status: t.status,
        },
      });
    },
    updateTransaction: async (id, patch) => {
      const prev = transactions.find((x) => x.id === id);
      if (apiConnected) {
        const body: Record<string, unknown> = {};
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.plan !== undefined) body.plan = patch.plan;
        if (patch.amount !== undefined) body.amount = patch.amount;
        if (patch.currency !== undefined) body.currency = patch.currency;
        if (patch.method !== undefined) body.method = patch.method;
        if (patch.txnCode !== undefined) body.txn_code = patch.txnCode;
        if (patch.email !== undefined) body.email = patch.email;
        if (patch.billingCycle !== undefined) body.billing_cycle = patch.billingCycle;
        if (patch.rejectionReason !== undefined) body.rejection_reason = patch.rejectionReason;
        await adminPatch(`transactions/${id}/`, body);
        await refreshFromApi();
        pushAudit({
          action: 'update',
          entityType: 'Transaction',
          entityId: id,
          detail: `Updated transaction ${prev?.invoice ?? id}${patch.status ? ` → status ${patch.status}` : ''}.`,
          metadata: {
            api: `PATCH /api/admin/transactions/${id}/`,
            changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
          },
        });
        return;
      }
      setTransactions((s) => {
        const next = s.map((x) => (x.id === id ? { ...x, ...patch } : x));
        const row = next.find((x) => x.id === id);
        if (row && patch.status !== undefined) {
          setUsers((us) => applyTxnStatusToUsers(us, row, patch.status));
        }
        return next;
      });
      pushAudit({
        action: 'update',
        entityType: 'Transaction',
        entityId: id,
        detail: `Updated transaction ${prev?.invoice ?? id} (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    deleteTransaction: (id) => {
      const prev = transactions.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          await adminDelete(`transactions/${id}/`);
          await refreshFromApi();
          pushAudit({
            action: 'delete',
            entityType: 'Transaction',
            entityId: id,
            detail: `Deleted transaction ${prev?.invoice ?? id}.`,
            metadata: { api: `DELETE /api/admin/transactions/${id}/` },
          });
        })();
        return;
      }
      setTransactions((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'Transaction',
        entityId: id,
        detail: `Deleted transaction ${prev?.invoice ?? id} (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    clients,
    addClient: (c) => {
      if (apiConnected) {
        void (async () => {
          await adminPost('clients/', {
            company: c.company,
            contact: c.contact,
            email: c.email,
            phone: c.phone,
            type: c.type,
            pan_vat: c.panVat,
            status: c.status,
            joined_at: today(),
          });
          await refreshFromApi();
          pushAudit({
            action: 'create',
            entityType: 'Client',
            detail: `Registered client ${c.company} (${c.email}).`,
            metadata: { api: 'POST /api/admin/clients/', company: c.company, type: c.type, status: c.status },
          });
        })();
        return;
      }
      const newId = uid('cl');
      setClients((s) => [{ ...c, id: newId, joinedAt: today(), activeProjects: 0 }, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'Client',
        entityId: newId,
        detail: `Added client ${c.company} (local demo).`,
        metadata: { mode: 'local_demo', company: c.company },
      });
    },
    updateClient: (id, patch) => {
      const prev = clients.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          const body: Record<string, unknown> = {};
          if (patch.company !== undefined) body.company = patch.company;
          if (patch.contact !== undefined) body.contact = patch.contact;
          if (patch.email !== undefined) body.email = patch.email;
          if (patch.phone !== undefined) body.phone = patch.phone;
          if (patch.type !== undefined) body.type = patch.type;
          if (patch.panVat !== undefined) body.pan_vat = patch.panVat;
          if (patch.status !== undefined) body.status = patch.status;
          await adminPatch(`clients/${id}/`, body);
          await refreshFromApi();
          pushAudit({
            action: 'update',
            entityType: 'Client',
            entityId: id,
            detail: `Updated client ${prev?.company ?? id}.`,
            metadata: {
              api: `PATCH /api/admin/clients/${id}/`,
              changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
            },
          });
        })();
        return;
      }
      setClients((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      pushAudit({
        action: 'update',
        entityType: 'Client',
        entityId: id,
        detail: `Updated client ${prev?.company ?? id} (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    deleteClient: (id) => {
      const prev = clients.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          await adminDelete(`clients/${id}/`);
          await refreshFromApi();
          pushAudit({
            action: 'delete',
            entityType: 'Client',
            entityId: id,
            detail: `Deleted client ${prev?.company ?? id}.`,
            metadata: { api: `DELETE /api/admin/clients/${id}/` },
          });
        })();
        return;
      }
      setClients((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'Client',
        entityId: id,
        detail: `Deleted client ${prev?.company ?? id} (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    projects,
    addProject: async (p) => {
      if (apiConnected) {
        const cl = resolveClientFromProjectPicker(clients, p.client);
        if (!cl) {
          throw new Error(
            'No CRM client matches this selection. Users with the Client role need an email on file; refresh the admin panel after changing roles, then try again.'
          );
        }
        const teamIds = p.team
          .map((n) => users.find((u) => u.name === n)?.id ?? n)
          .filter((id): id is string => typeof id === 'string' && isUuid(id));
        const body: Record<string, unknown> = {
          name: p.name,
          client: cl.id,
          type: p.type,
          status: p.status,
          progress: 0,
          due_date: p.dueDate,
        };
        if (teamIds.length > 0) body.team_member_ids = teamIds;
        await adminPost('projects/', body);
        await refreshFromApi();
        pushAudit({
          action: 'create',
          entityType: 'Project',
          detail: `Created project "${p.name}" for ${cl.company}.`,
          metadata: { api: 'POST /api/admin/projects/', client: cl.company, type: p.type, status: p.status },
        });
        return;
      }
      const cl = resolveClientFromProjectPicker(clients, p.client);
      if (!cl) {
        throw new Error('Select a client that exists in the Clients list (local demo).');
      }
      const newId = uid('p');
      setProjects((s) => [{ ...p, id: newId, client: cl.company, progress: 0 }, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'Project',
        entityId: newId,
        detail: `Created project "${p.name}" (local demo).`,
        metadata: { mode: 'local_demo', client: cl.company },
      });
    },
    updateProject: async (id, patch) => {
      const prev = projects.find((x) => x.id === id);
      if (apiConnected) {
        const body: Record<string, unknown> = {};
        if (patch.name !== undefined) body.name = patch.name;
        if (patch.type !== undefined) body.type = patch.type;
        if (patch.status !== undefined) body.status = patch.status;
        if (patch.progress !== undefined) body.progress = patch.progress;
        if (patch.dueDate !== undefined) body.due_date = patch.dueDate;
        if (patch.team !== undefined) {
          const teamIds = patch.team
            .map((n) => users.find((u) => u.name === n)?.id ?? n)
            .filter((id): id is string => typeof id === 'string' && isUuid(id));
          if (teamIds.length > 0) body.team_member_ids = teamIds;
        }
        if (patch.client !== undefined) {
          const cl = resolveClientFromProjectPicker(clients, patch.client);
          if (cl) body.client = cl.id;
        }
        await adminPatch(`projects/${id}/`, body);
        await refreshFromApi();
        pushAudit({
          action: 'update',
          entityType: 'Project',
          entityId: id,
          detail: `Updated project "${prev?.name ?? id}".`,
          metadata: {
            api: `PATCH /api/admin/projects/${id}/`,
            changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
          },
        });
        return;
      }
      setProjects((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      pushAudit({
        action: 'update',
        entityType: 'Project',
        entityId: id,
        detail: `Updated project "${prev?.name ?? id}" (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
      return Promise.resolve();
    },
    assignProjectClient: async (projectId, clientPickerValue) => {
      const prev = projects.find((x) => x.id === projectId);
      if (!prev) return;
      const cl = resolveClientFromProjectPicker(clients, clientPickerValue);
      if (!cl) throw new Error('Client not found');
      const clientCompany = cl.company;
      if (prev.client === clientCompany) return;
      if (apiConnected) {
        await adminPatch(`projects/${projectId}/`, { client: cl.id });
        await refreshFromApi();
        pushAudit({
          action: 'update',
          entityType: 'Project',
          entityId: projectId,
          detail: `Assigned client "${clientCompany}" to project "${prev.name}".`,
          metadata: { api: `PATCH /api/admin/projects/${projectId}/`, field: 'client' },
        });
        return;
      }
      setProjects((s) => s.map((x) => (x.id === projectId ? { ...x, client: clientCompany } : x)));
      pushAudit({
        action: 'update',
        entityType: 'Project',
        entityId: projectId,
        detail: `Assigned client "${clientCompany}" to project "${prev.name}" (local demo).`,
        metadata: { mode: 'local_demo', field: 'client' },
      });
    },
    deleteProject: (id) => {
      const prev = projects.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          await adminDelete(`projects/${id}/`);
          await refreshFromApi();
          pushAudit({
            action: 'delete',
            entityType: 'Project',
            entityId: id,
            detail: `Deleted project "${prev?.name ?? id}".`,
            metadata: { api: `DELETE /api/admin/projects/${id}/` },
          });
        })();
        return;
      }
      setProjects((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'Project',
        entityId: id,
        detail: `Deleted project "${prev?.name ?? id}" (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    plans,
    addPlan: (p) => {
      if (apiConnected) {
        void (async () => {
          await adminPost('pricing-plans/', {
            name: p.name,
            monthly: p.monthly,
            yearly: p.yearly,
            features: p.features,
            cta: p.cta,
            highlight: p.highlight,
            enabled: p.enabled,
          });
          await refreshFromApi();
          pushAudit({
            action: 'create',
            entityType: 'PricingPlan',
            detail: `Created pricing plan "${p.name}".`,
            metadata: { api: 'POST /api/admin/pricing-plans/', monthly: p.monthly, yearly: p.yearly, enabled: p.enabled },
          });
        })();
        return;
      }
      const newId = uid('pl');
      setPlans((s) => [...s, { ...p, id: newId }]);
      pushAudit({
        action: 'create',
        entityType: 'PricingPlan',
        entityId: newId,
        detail: `Added plan "${p.name}" (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    updatePlan: (id, patch) => {
      const prev = plans.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          await adminPatch(`pricing-plans/${id}/`, patch);
          await refreshFromApi();
          pushAudit({
            action: 'update',
            entityType: 'PricingPlan',
            entityId: id,
            detail: `Updated plan "${prev?.name ?? id}".`,
            metadata: {
              api: `PATCH /api/admin/pricing-plans/${id}/`,
              changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
            },
          });
        })();
        return;
      }
      setPlans((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      pushAudit({
        action: 'update',
        entityType: 'PricingPlan',
        entityId: id,
        detail: `Updated plan "${prev?.name ?? id}" (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    deletePlan: (id) => {
      const prev = plans.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          await adminDelete(`pricing-plans/${id}/`);
          await refreshFromApi();
          pushAudit({
            action: 'delete',
            entityType: 'PricingPlan',
            entityId: id,
            detail: `Deleted plan "${prev?.name ?? id}".`,
            metadata: { api: `DELETE /api/admin/pricing-plans/${id}/` },
          });
        })();
        return;
      }
      setPlans((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'PricingPlan',
        entityId: id,
        detail: `Deleted plan "${prev?.name ?? id}" (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    settings,
    updateSettings: (patch) => {
      const prev = settings;
      setSettings((s) => ({ ...s, ...patch }));
      if (apiConnected) {
        void (async () => {
          try {
            await adminPatch('settings/', settingsPatchToApi(patch as Record<string, unknown>));
            await refreshFromApi();
            pushAudit({
              action: 'update',
              entityType: 'AppSettings',
              detail: 'Updated site / app settings via API.',
              metadata: {
                api: 'PATCH /api/admin/settings/',
                changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
              },
            });
          } catch {
            setSettings(prev);
          }
        })();
        return;
      }
      pushAudit({
        action: 'update',
        entityType: 'AppSettings',
        detail: 'Updated app settings (local demo).',
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    notifications,
    addNotification: (n) => {
      if (apiConnected) {
        void (async () => {
          try {
            await adminPost('panel-notifications/', {
              title: n.title,
              body: n.body,
              type: n.type,
              link: n.link || '',
              delivery: n.delivery ?? defaultBroadcastDelivery(),
            });
            await loadPanelNotifications();
            pushAudit({
              action: 'create',
              entityType: 'AdminNotification',
              detail: `Panel notification created: "${n.title}".`,
              metadata: { api: 'POST /api/admin/panel-notifications/', type: n.type },
            });
          } catch {
            /* caller may toast */
          }
        })();
        return;
      }
      const id = n.id ?? uid('nt');
      const read = n.read ?? false;
      const row = { ...n, id, read, createdAt: n.createdAt ?? nowIso() };
      if (read) setNotificationReadOverride(id, true);
      setNotifications((s) => [row, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'AdminNotification',
        entityId: id,
        detail: `Recorded notification "${n.title}" (local demo).`,
        metadata: { type: n.type, delivery: n.delivery },
      });
    },
    updateNotification: (id, patch) => {
      const prevN = notifications.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          try {
            const keys = Object.keys(patch);
            const readOnly = keys.length === 1 && patch.read !== undefined;
            if (readOnly) {
              await adminPatch(`panel-notifications/${id}/`, { read: patch.read });
            } else {
              await adminPatch(`panel-notifications/${id}/`, {
                title: patch.title,
                body: patch.body,
                type: patch.type,
                link: patch.link ?? '',
                delivery: patch.delivery,
              });
            }
            if (patch.read !== undefined) setNotificationReadOverride(id, patch.read);
            await loadPanelNotifications();
            pushAudit({
              action: 'update',
              entityType: 'AdminNotification',
              entityId: id,
              detail: `Updated notification "${prevN?.title ?? id}".`,
              metadata: {
                api: `PATCH /api/admin/panel-notifications/${id}/`,
                changes: shallowChangeRecord(prevN as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
              },
            });
          } catch {
            /* ignore */
          }
        })();
        return;
      }
      if (patch.read !== undefined) setNotificationReadOverride(id, patch.read);
      setNotifications((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      pushAudit({
        action: 'update',
        entityType: 'AdminNotification',
        entityId: id,
        detail: `Updated notification "${prevN?.title ?? id}" (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prevN as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    deleteNotification: (id) => {
      const prevN = notifications.find((x) => x.id === id);
      if (apiConnected) {
        void (async () => {
          try {
            await adminDelete(`panel-notifications/${id}/`);
            removeNotificationReadOverride(id);
            await loadPanelNotifications();
            pushAudit({
              action: 'delete',
              entityType: 'AdminNotification',
              entityId: id,
              detail: `Deleted notification "${prevN?.title ?? id}".`,
              metadata: { api: `DELETE /api/admin/panel-notifications/${id}/` },
            });
          } catch {
            await loadPanelNotifications();
          }
        })();
        return;
      }
      removeNotificationReadOverride(id);
      setNotifications((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'AdminNotification',
        entityId: id,
        detail: `Deleted notification "${prevN?.title ?? id}" (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    markNotificationRead: (id, read = true) => {
      if (apiConnected) {
        void (async () => {
          try {
            await adminPatch(`panel-notifications/${id}/`, { read });
            setNotificationReadOverride(id, read);
            await loadPanelNotifications();
            pushAudit({
              action: 'update',
              entityType: 'AdminNotification',
              entityId: id,
              detail: `Notification marked ${read ? 'read' : 'unread'} (API).`,
              metadata: { read },
            });
          } catch {
            setNotificationReadOverride(id, read);
            setNotifications((s) => s.map((x) => (x.id === id ? { ...x, read } : x)));
            pushAudit({
              action: 'update',
              entityType: 'AdminNotification',
              entityId: id,
              detail: `Notification marked ${read ? 'read' : 'unread'} (offline fallback).`,
              metadata: { read, mode: 'local_fallback' },
            });
          }
        })();
        return;
      }
      setNotificationReadOverride(id, read);
      setNotifications((s) => s.map((x) => (x.id === id ? { ...x, read } : x)));
      pushAudit({
        action: 'update',
        entityType: 'AdminNotification',
        entityId: id,
        detail: `Notification marked ${read ? 'read' : 'unread'} (local demo).`,
        metadata: { read },
      });
    },
    markAllNotificationsRead: () => {
      if (apiConnected) {
        void (async () => {
          try {
            await adminPost('panel-notifications/mark-all-read/', {});
            await loadPanelNotifications();
            pushAudit({
              action: 'update',
              entityType: 'AdminNotification',
              detail: 'Marked all panel notifications read (API).',
              metadata: { api: 'POST /api/admin/panel-notifications/mark-all-read/', bulk: true },
            });
          } catch {
            /* ignore */
          }
        })();
        return;
      }
      setNotifications((s) => {
        setAllNotificationReadOverrides(s.map((n) => n.id));
        return s.map((x) => ({ ...x, read: true }));
      });
      pushAudit({
        action: 'update',
        entityType: 'AdminNotification',
        detail: 'Marked all notifications read (local demo).',
        metadata: { bulk: true },
      });
    },
    supportTickets,
    addSupportTicket: (t) => {
      const ts = nowIso();
      const { messages: initialMsgs, id: presetId, ...rest } = t;
      const messages = initialMsgs && initialMsgs.length > 0 ? initialMsgs : [];
      const id = presetId ?? uid('tk');
      const viewedByAdmin =
        rest.viewedByAdmin ?? !isInboundContactTicketId(id);
      setSupportTickets((s) => [{ ...rest, id, messages, createdAt: ts, updatedAt: ts, viewedByAdmin }, ...s]);
      pushAudit({
        action: 'create',
        entityType: 'SupportTicket',
        entityId: id,
        detail: `Support ticket opened: "${rest.subject}".`,
        metadata: { requester: rest.requester, priority: rest.priority, status: rest.status },
      });
    },
    updateSupportTicket: (id, patch) => {
      const prev = supportTickets.find((x) => x.id === id);
      if (patch.viewedByAdmin === true) markSupportTicketViewedInStorage(id);
      setSupportTickets((s) =>
        s.map((x) => {
          if (x.id !== id) return x;
          const next = { ...x, ...patch, updatedAt: nowIso() };
          if (patch.messages) next.messages = patch.messages;
          return next;
        })
      );
      pushAudit({
        action: 'update',
        entityType: 'SupportTicket',
        entityId: id,
        detail: `Updated ticket "${prev?.subject ?? id}".`,
        metadata: { changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>) },
      });
    },
    deleteSupportTicket: (id) => {
      const prev = supportTickets.find((x) => x.id === id);
      const removedNotifId = removeContactSubmission(id);
      setSupportTickets((s) => s.filter((x) => x.id !== id));
      if (removedNotifId) {
        removeNotificationReadOverride(removedNotifId);
        setNotifications((s) => s.filter((x) => x.id !== removedNotifId));
      }
      pushAudit({
        action: 'delete',
        entityType: 'SupportTicket',
        entityId: id,
        detail: `Deleted ticket "${prev?.subject ?? id}".`,
        metadata: { hadLinkedNotification: !!removedNotifId },
      });
      if (id.startsWith('cm_') && apiConnected) {
        const uuid = id.slice(3);
        void (async () => {
          try {
            await adminDelete(`contact-messages/${uuid}/`);
            await refreshFromApi();
          } catch {
            await refreshFromApi();
          }
        })();
      }
    },
    addTicketReply: (ticketId, author, body) => {
      const msg: TicketMessage = { id: uid('msg'), author, body, createdAt: nowIso() };
      const ticket = supportTickets.find((x) => x.id === ticketId);
      setSupportTickets((s) =>
        s.map((x) =>
          x.id === ticketId
            ? { ...x, messages: [...x.messages, msg], updatedAt: nowIso(), status: x.status === 'open' ? 'in_progress' : x.status }
            : x
        )
      );
      pushAudit({
        action: 'create',
        entityType: 'TicketMessage',
        entityId: ticketId,
        detail: `Reply on "${ticket?.subject ?? ticketId}" by ${author}.`,
        metadata: { messageId: msg.id, excerpt: body.slice(0, 200) },
      });
    },
    activityLogs,
    addActivityLog: (e) => {
      const enriched = enrichAuditEntry(
        { ...e, channel: 'manual_entry' },
        {
          authUser,
          currentRole,
          impersonatingActive: impersonation.active,
          apiConnected,
        }
      );
      setActivityLogs((s) => {
        const row: ActivityLogEntry = { ...enriched, id: uid('al'), createdAt: nowIso() };
        const next = [row, ...s].slice(0, 500);
        saveAdminActivityLogs(next);
        return next;
      });
    },
    updateActivityLog: (id, patch) => {
      const prev = activityLogs.find((x) => x.id === id);
      setActivityLogs((s) => {
        const next = s.map((x) => (x.id === id ? { ...x, ...patch } : x));
        saveAdminActivityLogs(next);
        return next;
      });
      queueMicrotask(() =>
        pushAudit({
          action: 'update',
          entityType: 'ActivityLog',
          entityId: id,
          detail: 'Edited an activity log row (audit trail meta-edit).',
          metadata: {
            targetLogId: id,
            changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
          },
        })
      );
    },
    deleteActivityLog: (id) => {
      const prev = activityLogs.find((x) => x.id === id);
      setActivityLogs((s) => {
        const next = s.filter((x) => x.id !== id);
        saveAdminActivityLogs(next);
        return next;
      });
      queueMicrotask(() =>
        pushAudit({
          action: 'delete',
          entityType: 'ActivityLog',
          entityId: id,
          detail: `Removed log entry: ${prev?.action ?? ''} on ${prev?.entityType ?? 'record'}.`,
          metadata: { targetLogId: id, priorDetail: prev?.detail?.slice(0, 200) },
        })
      );
    },
    helpArticles,
    addHelpArticle: async (h) => {
      if (apiConnected) {
        await adminPost('help-articles/', {
          title: h.title,
          category: h.category,
          content: h.content,
          sort_order: h.order,
          published: h.published,
        });
        await refreshFromApi();
        pushAudit({
          action: 'create',
          entityType: 'HelpArticle',
          detail: `Published help article draft "${h.title}" (${h.category}).`,
          metadata: { api: 'POST /api/admin/help-articles/', published: h.published },
        });
        return;
      }
      const newId = uid('hp');
      setHelpArticles((s) => [...s, { ...h, id: newId }]);
      pushAudit({
        action: 'create',
        entityType: 'HelpArticle',
        entityId: newId,
        detail: `Added help article "${h.title}" (local demo).`,
        metadata: { mode: 'local_demo', category: h.category },
      });
    },
    updateHelpArticle: async (id, patch) => {
      const prev = helpArticles.find((x) => x.id === id);
      if (apiConnected) {
        const body: Record<string, unknown> = {};
        if (patch.title !== undefined) body.title = patch.title;
        if (patch.category !== undefined) body.category = patch.category;
        if (patch.content !== undefined) body.content = patch.content;
        if (patch.order !== undefined) body.sort_order = patch.order;
        if (patch.published !== undefined) body.published = patch.published;
        await adminPatch(`help-articles/${id}/`, body);
        await refreshFromApi();
        pushAudit({
          action: 'update',
          entityType: 'HelpArticle',
          entityId: id,
          detail: `Updated help article "${prev?.title ?? id}".`,
          metadata: {
            api: `PATCH /api/admin/help-articles/${id}/`,
            changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
          },
        });
        return;
      }
      setHelpArticles((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      pushAudit({
        action: 'update',
        entityType: 'HelpArticle',
        entityId: id,
        detail: `Updated help article "${prev?.title ?? id}" (local demo).`,
        metadata: {
          mode: 'local_demo',
          changes: shallowChangeRecord(prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>),
        },
      });
    },
    deleteHelpArticle: async (id) => {
      const prev = helpArticles.find((x) => x.id === id);
      if (apiConnected) {
        await adminDelete(`help-articles/${id}/`);
        await refreshFromApi();
        pushAudit({
          action: 'delete',
          entityType: 'HelpArticle',
          entityId: id,
          detail: `Deleted help article "${prev?.title ?? id}".`,
          metadata: { api: `DELETE /api/admin/help-articles/${id}/` },
        });
        return;
      }
      setHelpArticles((s) => s.filter((x) => x.id !== id));
      pushAudit({
        action: 'delete',
        entityType: 'HelpArticle',
        entityId: id,
        detail: `Deleted help article "${prev?.title ?? id}" (local demo).`,
        metadata: { mode: 'local_demo' },
      });
    },
    apiConnected,
    adminSnapshotLoaded,
    refreshFromApi,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAdminStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminStore must be used inside AdminStoreProvider');
  return ctx;
};

export { MODULES };
