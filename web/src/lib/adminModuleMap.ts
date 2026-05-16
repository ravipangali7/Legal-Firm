/**
 * Maps admin URL prefixes to PermissionModule names (must match Django `PermissionModule.name`).
 * Longest prefix wins.
 */
const PREFIX_MODULE: [string, string][] = [
  ['/admin/roles', 'Roles'],
  ['/admin/users', 'Users'],
  ['/admin/cms', 'Homepage CMS'],
  ['/admin/legal', 'Legal library'],
  ['/admin/transactions', 'Transactions'],
  ['/admin/clients', 'Clients'],
  ['/admin/projects', 'Projects'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/support', 'Support'],
  ['/admin/logs', 'Activity Logs'],
  ['/admin/settings', 'Settings'],
  ['/admin/email-templates', 'Settings'],
  ['/admin/help', 'Help'],
  ['/admin/profile', 'Dashboard'],
  ['/admin', 'Dashboard'],
];

const SORTED = [...PREFIX_MODULE].sort((a, b) => b[0].length - a[0].length);

/** Resolve which RBAC module governs `pathname` (e.g. `/admin/legal/cases`). */
export function adminModuleForPathname(pathname: string): string | null {
  const norm = (pathname.replace(/\/$/, '') || '/').split('?')[0] || '/';
  for (const [prefix, mod] of SORTED) {
    if (norm === prefix || norm.startsWith(`${prefix}/`)) return mod;
  }
  return null;
}
