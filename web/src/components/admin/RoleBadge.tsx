import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Edit3, User, UserCheck } from 'lucide-react';
import type { UserRole } from './AdminSidebar';

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const roleConfig: Record<
  UserRole,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    className: 'bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-600 border-red-200 dark:border-red-800',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  },
  editor: {
    label: 'Editor',
    icon: Edit3,
    className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  },
  client: {
    label: 'Client',
    icon: UserCheck,
    className: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  },
  user: {
    label: 'User',
    icon: User,
    className: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0 h-4',
  md: 'text-xs px-2 py-0.5 h-5',
  lg: 'text-sm px-3 py-1 h-6',
};

const iconSizes = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const RoleBadge = ({ role, showIcon = true, size = 'md', className }: RoleBadgeProps) => {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium gap-1',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};

export default RoleBadge;
