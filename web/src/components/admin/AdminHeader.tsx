import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import type { UserRole } from './AdminSidebar';
import { useAdminStore } from '@/store/adminStore';
import { useAuth } from '@/context/AuthContext';
import { navigateToNotificationTarget } from '@/lib/adminNotificationNav';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle?: () => void;
  currentRole: UserRole;
}

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500/10 text-red-600 border-red-200' },
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  editor: { label: 'Editor', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  client: { label: 'Client', color: 'bg-green-500/10 text-green-600 border-green-200' },
  user: { label: 'User', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
};

const AdminHeader = ({ sidebarCollapsed, onMobileMenuToggle, currentRole }: AdminHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser, logout } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, users } = useAdminStore();

  const displayUser = useMemo(() => {
    if (authUser?.is_staff) {
      const selfRow = users.find((u) => u.id === authUser.id);
      if (selfRow) return selfRow;
    }
    return users.find((u) => u.role === currentRole) ?? users[0];
  }, [users, currentRole, authUser?.id, authUser?.is_staff]);

  /** Same as subscriber UI: media paths are API-relative; SPA on :8080 must prefix API origin. */
  const headerAvatarSrc = useMemo(() => {
    const fromRow = displayUser?.avatar?.trim();
    if (fromRow) return cmsMediaSrc(fromRow);
    if (authUser?.is_staff && displayUser && authUser.id === displayUser.id) {
      const fromMe = authUser.avatar?.trim();
      if (fromMe) return cmsMediaSrc(fromMe);
    }
    return '';
  }, [displayUser, authUser?.is_staff, authUser?.id, authUser?.avatar]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const roleInfo = roleLabels[currentRole];

  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname, location.search]);

  const badgeCountLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-lg border-b border-border transition-all duration-300',
        sidebarCollapsed ? 'left-[72px]' : 'left-64',
        'max-lg:left-0'
      )}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 lg:w-80 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <SiteThemeToggle />

          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium tabular-nums">
                    {badgeCountLabel}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] p-0 text-popover-foreground bg-popover border-border">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h4 className="text-sm font-semibold">Notifications</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary-onBg h-8"
                  disabled={unreadCount === 0}
                  onClick={() => markAllNotificationsRead()}
                >
                  Mark all read
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">No notifications</p>
                ) : (
                  notifications.slice(0, 8).map((notification) => (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        markNotificationRead(notification.id);
                        setNotifOpen(false);
                        navigateToNotificationTarget(navigate, location, notification);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          markNotificationRead(notification.id);
                          setNotifOpen(false);
                          navigateToNotificationTarget(navigate, location, notification);
                        }
                      }}
                      className={cn(
                        'flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer text-left w-full',
                        !notification.read && 'bg-primary/5'
                      )}
                    >
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full mt-2 flex-shrink-0',
                          notification.read ? 'bg-muted' : 'bg-primary'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full text-primary-onBg h-9 text-xs" asChild>
                  <Link to="/admin/notifications" onClick={() => setNotifOpen(false)}>
                    View all notifications
                  </Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-stretch rounded-lg border border-border/60 bg-background/50">
            <Link
              to="/admin/profile"
              className="flex items-center gap-2 pl-2 pr-1 h-10 rounded-l-lg hover:bg-accent/60 transition-colors max-w-[200px]"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {headerAvatarSrc ? <AvatarImage src={headerAvatarSrc} alt="" /> : null}
                <AvatarFallback className="bg-primary/10 text-primary-onBg font-semibold text-xs">
                  {(displayUser?.name ?? 'Admin')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate max-w-[9rem]">{displayUser?.name ?? 'Admin'}</span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0 h-4 font-normal shrink-0', roleInfo.color)}
                >
                  {roleInfo.label}
                </Badge>
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-9 rounded-l-none rounded-r-lg border-l border-border/60 shrink-0"
                  aria-label="Account menu"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setLogoutOpen(true);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

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
              onClick={() => {
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
              }}
            >
              Log out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default AdminHeader;
