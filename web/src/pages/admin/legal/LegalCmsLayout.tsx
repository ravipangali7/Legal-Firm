import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Bell,
  BookOpen,
  Briefcase,
  FileText,
  FolderTree,
  Gavel,
  LayoutList,
  Library,
  ListOrdered,
  Scale,
  Tags,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const baseItems = [
  { to: '/admin/legal', end: true, label: 'Overview', icon: LayoutList },
  { to: '/admin/legal/practice-areas', label: 'Practice areas', icon: Scale },
  { to: '/admin/legal/legal-case-categories', label: 'Case categories', icon: FolderTree },
  { to: '/admin/legal/legal-cases', label: 'Legal cases', icon: Briefcase },
  { to: '/admin/legal/summary-categories', label: 'Summary categories', icon: FolderTree },
  { to: '/admin/legal/summaries', label: 'Summaries', icon: BookOpen },
  { to: '/admin/legal/act-categories', label: 'Act categories', icon: FolderTree },
  { to: '/admin/legal/acts', label: 'Acts', icon: Gavel },
  { to: '/admin/legal/procedure-categories', label: 'Procedure categories', icon: FolderTree },
  { to: '/admin/legal/procedures', label: 'Procedures', icon: ListOrdered },
];

const LegalCmsLayout = () => {
  const { user } = useAuth();
  const showNotices = Boolean(user?.is_superuser || user?.role === 'super_admin');
  const items = showNotices
    ? [
        ...baseItems.slice(0, 6),
        { to: '/admin/legal/notices', end: false as const, label: 'Notices', icon: Bell },
        {
          to: '/admin/legal/knowledge-resource-categories',
          end: false as const,
          label: 'Knowledge base categories',
          icon: Tags,
        },
        {
          to: '/admin/legal/knowledge-resources',
          end: false as const,
          label: 'Knowledge base',
          icon: FileText,
        },
        ...baseItems.slice(6),
      ]
    : baseItems;

  return (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
        <Library className="h-8 w-8 shrink-0" />
        Legal library
      </h1>
      <p className="text-muted-foreground mt-1">
        Manage practice areas, cases, summaries, acts, and procedures. The public site reads from the same data via
        the public API.
      </p>
    </div>
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 lg:col-span-3">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-20">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="col-span-12 lg:col-span-9 min-w-0">
        <Outlet />
      </main>
    </div>
  </div>
  );
};

export default LegalCmsLayout;
