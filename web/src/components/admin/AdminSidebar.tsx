import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, CreditCard, UserCheck, Bell,
  Settings, HelpCircle, Activity, ChevronLeft, ChevronRight, LogOut,
  BarChart3, FolderKanban, MessageSquare, Layout, Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import fallbackSidebarLogo from '@/assets/logo.png';
import { useAdminStore } from '@/store/adminStore';
import { CmsImage } from '@/components/CmsImage';
import { useAuth } from '@/context/AuthContext';
import { evaluateAdminModulePerm } from '@/lib/adminPermissionUtil';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'client' | 'user';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'users' | 'notifications' | 'support';
  /** PermissionModule name — must match Django `PermissionModule.name`. */
  module: string;
  disabled?: boolean;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    module: 'Dashboard',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    badgeKey: 'users',
    module: 'Users',
  },
  {
    title: 'Roles & Permissions',
    href: '/admin/roles',
    icon: Shield,
    module: 'Roles',
  },
  {
    title: 'Homepage CMS',
    href: '/admin/cms',
    icon: Layout,
    module: 'Homepage CMS',
  },
  {
    title: 'Legal library',
    href: '/admin/legal',
    icon: Library,
    module: 'Legal library',
  },
  {
    title: 'Transactions',
    href: '/admin/transactions',
    icon: CreditCard,
    module: 'Transactions',
  },
  {
    title: 'Clients',
    href: '/admin/clients',
    icon: UserCheck,
    module: 'Clients',
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    module: 'Analytics',
  },
  {
    title: 'Projects',
    href: '/admin/projects',
    icon: FolderKanban,
    module: 'Projects',
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    badgeKey: 'notifications',
    module: 'Notifications',
  },
  {
    title: 'Support',
    href: '/admin/support',
    icon: MessageSquare,
    badgeKey: 'support',
    module: 'Support',
  },
  {
    title: 'Activity Logs',
    href: '/admin/logs',
    icon: Activity,
    module: 'Activity Logs',
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    module: 'Settings',
  },
  {
    title: 'Help',
    href: '/admin/help',
    icon: HelpCircle,
    module: 'Help',
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const AdminSidebar = ({ collapsed, onToggleCollapse }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout, user: authUser } = useAuth();
  const { users, notifications, supportTickets, roles, settings } = useAdminStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const sidebarLogoRaw = (settings.siteLogo || '').trim();

  const sidebarLogoAlt = (settings.siteName || 'Admin').trim() || 'Site logo';

  const counts = useMemo(
    () => ({
      users: users.length,
      notifications: notifications.filter((n) => !n.read).length,
      support: supportTickets.filter((t) => ['open', 'in_progress', 'waiting'].includes(t.status)).length,
    }),
    [users, notifications, supportTickets]
  );

  const badgeFor = (item: NavItem): string | undefined => {
    if (!item.badgeKey) return undefined;
    return String(counts[item.badgeKey]);
  };

  const filteredNavItems = useMemo(
    () => SIDEBAR_NAV_ITEMS.filter((item) => evaluateAdminModulePerm(authUser, roles, item.module, 'view')),
    [authUser, roles]
  );

  const isActive = (href: string) => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const h = href.replace(/\/$/, '');
    if (h === '/admin') return path === '/admin';
    return path === h || path.startsWith(`${h}/`);
  };

  const confirmLogout = () => {
    void (async () => {
      try {
        await logout();
        setLogoutOpen(false);
        navigate('/login');
      } catch (e) {
        toast({
          title: 'Could not sign out',
          description: e instanceof Error ? e.message : 'Try again in a moment.',
          variant: 'destructive',
        });
      }
    })();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          'flex items-center h-16 px-4 border-b border-border',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <Link to="/admin" className="flex items-center gap-3">
            <CmsImage
              src={sidebarLogoRaw}
              alt={sidebarLogoAlt}
              className={cn(
                'object-contain transition-all duration-300',
                collapsed ? 'h-10 w-10' : 'h-10'
              )}
              fallbackSrc={fallbackSidebarLogo}
              fallbackKind="brand"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isDisabled = item.disabled;
              const badge = badgeFor(item);

              const linkContent = (
                <Link
                  to={isDisabled ? '#' : item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary-foreground')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.title}</span>
                      {badge !== undefined && (
                        <Badge
                          variant={active ? 'secondary' : 'default'}
                          className={cn(
                            'ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs',
                            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary-onBg'
                          )}
                        >
                          {badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.title}
                        {badge !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {badge}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full', collapsed ? 'px-2' : 'justify-start')}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* Logout Section */}
        <div className={cn('p-3 border-t border-border', collapsed && 'px-2')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setLogoutOpen(true)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </aside>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access the admin area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmLogout}
            >
              Log out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default AdminSidebar;
