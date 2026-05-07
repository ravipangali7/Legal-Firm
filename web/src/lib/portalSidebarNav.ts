import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  CreditCard,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Settings,
  Wallet,
} from 'lucide-react';
import type { AuthMeUser } from '@/lib/api';
import { evaluatePortalModuleView } from '@/lib/subscriberPortalPermissions';

export type PortalNavSection = 'overview' | 'billing' | 'library' | 'site' | 'more';

export const PORTAL_NAV_SECTION_ORDER: PortalNavSection[] = ['overview', 'billing', 'library', 'site', 'more'];

export const PORTAL_NAV_SECTION_LABEL: Record<PortalNavSection, string> = {
  overview: 'Overview',
  billing: 'Billing & plans',
  library: 'Resources',
  site: 'Site',
  more: 'More',
};

const SECTION_RANK: Record<PortalNavSection, number> = {
  overview: 0,
  billing: 1,
  library: 2,
  site: 3,
  more: 4,
};

export type HubPath = '/dashboard' | '/client';

export type PortalSidebarNavItem = {
  key: string;
  to: string;
  label: string;
  icon: LucideIcon;
  section: PortalNavSection;
  end?: boolean;
};

type RegistryRow = {
  module: string;
  section: PortalNavSection;
  order: number;
  label: (hub: HubPath) => string;
  icon: LucideIcon;
  buildTo: (hub: HubPath) => string;
  end?: boolean;
};

const REGISTRY: RegistryRow[] = [
  {
    module: 'Dashboard',
    section: 'overview',
    order: 10,
    label: (hub) => (hub === '/client' ? 'Client home' : 'Dashboard'),
    icon: LayoutDashboard,
    buildTo: (hub) => hub,
    end: true,
  },
  {
    module: 'Notifications',
    section: 'overview',
    order: 20,
    label: () => 'Notifications',
    icon: Bell,
    buildTo: (hub) => `${hub}/notifications`,
  },
  {
    module: 'Projects',
    section: 'overview',
    order: 30,
    label: () => 'Projects',
    icon: FolderKanban,
    buildTo: (hub) => `${hub}/projects`,
  },
  {
    module: 'Settings',
    section: 'overview',
    order: 40,
    label: () => 'Settings',
    icon: Settings,
    buildTo: (hub) => `${hub}/profile`,
  },
  {
    module: 'Help',
    section: 'overview',
    order: 50,
    label: () => 'Help',
    icon: HelpCircle,
    buildTo: (hub) => `${hub}/help`,
  },
  {
    module: 'Pricing Plans',
    section: 'billing',
    order: 10,
    label: () => 'Pricing & wallet',
    icon: Wallet,
    buildTo: (hub) => `${hub}?tab=wallet`,
  },
  {
    module: 'Transactions',
    section: 'billing',
    order: 20,
    label: () => 'Billing history',
    icon: CreditCard,
    buildTo: (hub) => `${hub}?tab=billing`,
  },
  {
    module: 'Legal library',
    section: 'library',
    order: 10,
    label: () => 'Legal library',
    icon: BookOpen,
    buildTo: (hub) => `${hub}/access?module=${encodeURIComponent('Legal library')}`,
  },
  {
    module: 'Support',
    section: 'site',
    order: 10,
    label: () => 'Support',
    icon: LifeBuoy,
    buildTo: (hub) => `${hub}/support`,
  },
];

const REGISTRY_MODULES = new Set(REGISTRY.map((r) => r.module));

/**
 * Sidebar links for `/client` and `/dashboard`: one entry per `portal_permissions` row with `view`,
 * using mapped routes where we have a subscriber UI and `/access?module=` for anything else
 * (including future PermissionModule names added in Admin → Roles).
 */
type InternalItem = PortalSidebarNavItem & { sort: number };

export function buildPortalSidebarItems(user: AuthMeUser, hub: HubPath): PortalSidebarNavItem[] {
  const out: InternalItem[] = [];

  for (const r of REGISTRY) {
    if (!evaluatePortalModuleView(user, r.module)) continue;
    out.push({
      key: `reg:${r.module}`,
      to: r.buildTo(hub),
      label: r.label(hub),
      icon: r.icon,
      section: r.section,
      end: r.end,
      sort: r.order,
    });
  }

  const rows = user.portal_permissions;
  if (Array.isArray(rows)) {
    const seen = new Set<string>();
    const extras = rows
      .filter((row) => row?.view && typeof row.module === 'string' && row.module.trim())
      .map((row) => row.module.trim())
      .filter((name) => !REGISTRY_MODULES.has(name))
      .sort((a, b) => a.localeCompare(b));

    let i = 0;
    for (const mod of extras) {
      if (seen.has(mod)) continue;
      seen.add(mod);
      i += 1;
      out.push({
        key: `dyn:${mod}`,
        to: `${hub}/access?module=${encodeURIComponent(mod)}`,
        label: mod,
        icon: LayoutGrid,
        section: 'more',
        sort: 1000 + i,
      });
    }
  }

  out.sort((a, b) => {
    const s = SECTION_RANK[a.section] - SECTION_RANK[b.section];
    if (s !== 0) return s;
    return a.sort - b.sort;
  });

  return out.map(({ sort: _s, ...rest }) => rest);
}
