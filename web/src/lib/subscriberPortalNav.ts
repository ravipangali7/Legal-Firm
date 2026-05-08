import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  CreditCard,
  FolderKanban,
  HelpCircle,
  Layout,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Settings,
  Shield,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { AuthMeUser } from '@/lib/api';

/** Canonical permission module names (Admin → Roles); keep aligned with `seed_roles_permissions.py` / `adminStore.tsx`. */
export const PORTAL_PERMISSION_MODULE_NAMES = [
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
] as const;

export type PortalPermissionModuleName = (typeof PORTAL_PERMISSION_MODULE_NAMES)[number];

export type PortalNavSection = 'overview' | 'site';

export type BuiltPortalNavItem = {
  /** Permission module name — same string as Admin → Roles & Permissions (used as sidebar label). */
  module: string;
  to: string;
  end?: boolean;
  icon: LucideIcon;
  section: PortalNavSection;
};

const MODULE_ORDER = new Map<string, number>(
  PORTAL_PERMISSION_MODULE_NAMES.map((n, i) => [n, i])
);

/** Stable slug for routes under `/dashboard/portal/:slug` (and `/client/...`). */
export function portalModuleSlug(moduleName: string): string {
  return moduleName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function portalModuleFromSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  for (const name of PORTAL_PERMISSION_MODULE_NAMES) {
    if (portalModuleSlug(name) === s) return name;
  }
  return null;
}

type Hub = '/dashboard' | '/client';

/** Admin SPA paths for staff viewing portal sidebar links (same modules as Roles screen). */
export const STAFF_ADMIN_PATH: Partial<Record<PortalPermissionModuleName, string>> = {
  'Activity Logs': '/admin/logs',
  Analytics: '/admin/analytics',
  Clients: '/admin/clients',
  'Homepage CMS': '/admin/cms',
  'Legal library': '/admin/legal',
  Roles: '/admin/roles',
  Users: '/admin/users',
};

function staffDestination(module: PortalPermissionModuleName): string | undefined {
  return STAFF_ADMIN_PATH[module];
}

/**
 * Resolve sidebar target for a permission module. Labels come from the caller (`module` field on each item).
 */
export function portalNavTarget(module: PortalPermissionModuleName, hub: Hub, user: AuthMeUser): { to: string; end?: boolean } {
  if (user.is_staff || user.is_superuser) {
    const jump = staffDestination(module);
    if (jump) return { to: jump };
  }

  switch (module) {
    case 'Dashboard':
      return { to: hub, end: true };
    case 'Notifications':
      return { to: `${hub}/notifications` };
    case 'Projects':
      return { to: `${hub}/projects` };
    case 'Settings':
      return { to: `${hub}/profile` };
    case 'Help':
      return { to: `${hub}/help` };
    case 'Support':
      return { to: `${hub}/support` };
    case 'Pricing Plans':
      return { to: `${hub}?tab=wallet` };
    case 'Transactions':
      return { to: `${hub}?tab=billing` };
    case 'Legal library':
      return { to: '/laws' };
    case 'Analytics':
      return { to: `${hub}/analytics` };
    default:
      return { to: `${hub}/portal/${portalModuleSlug(module)}` };
  }
}

function iconForModule(module: PortalPermissionModuleName): LucideIcon {
  switch (module) {
    case 'Dashboard':
      return LayoutDashboard;
    case 'Notifications':
      return Bell;
    case 'Projects':
      return FolderKanban;
    case 'Settings':
      return Settings;
    case 'Help':
      return HelpCircle;
    case 'Support':
      return LifeBuoy;
    case 'Pricing Plans':
      return Wallet;
    case 'Transactions':
      return CreditCard;
    case 'Legal library':
      return Library;
    case 'Analytics':
      return BarChart3;
    case 'Users':
      return Users;
    case 'Roles':
      return Shield;
    case 'Clients':
      return UserCheck;
    case 'Homepage CMS':
      return Layout;
    case 'Activity Logs':
      return Activity;
    default:
      return LayoutDashboard;
  }
}

function sectionForModule(module: PortalPermissionModuleName): PortalNavSection {
  return module === 'Support' ? 'site' : 'overview';
}

function isPortalPermissionModuleName(s: string): s is PortalPermissionModuleName {
  return MODULE_ORDER.has(s);
}

/**
 * Sidebar entries for the subscriber shell: one item per module with `view` in `portal_permissions`,
 * ordered like Admin → Roles. Labels are the module names from the API.
 */
export function buildPortalSidebarNav(user: AuthMeUser, hub: Hub): { overview: BuiltPortalNavItem[]; site: BuiltPortalNavItem[] } {
  const rows = user.portal_permissions;
  const overview: BuiltPortalNavItem[] = [];
  const site: BuiltPortalNavItem[] = [];

  if (!Array.isArray(rows)) {
    return { overview, site };
  }

  const sorted = [...rows].filter((r) => r.view).sort((a, b) => {
    const ia = MODULE_ORDER.get(String(a.module)) ?? 999;
    const ib = MODULE_ORDER.get(String(b.module)) ?? 999;
    if (ia !== ib) return ia - ib;
    return String(a.module).localeCompare(String(b.module));
  });

  for (const row of sorted) {
    const name = String(row.module ?? '').trim();
    if (!name || !isPortalPermissionModuleName(name)) continue;

    const { to, end } = portalNavTarget(name, hub, user);
    const item: BuiltPortalNavItem = {
      module: name,
      to,
      end,
      icon: iconForModule(name),
      section: sectionForModule(name),
    };
    if (item.section === 'site') site.push(item);
    else overview.push(item);
  }

  return { overview, site };
}
