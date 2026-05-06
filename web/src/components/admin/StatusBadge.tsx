import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type StatusType = 'active' | 'pending' | 'inactive' | 'blocked' | 'completed' | 'draft' | 'published';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 hover:bg-yellow-500/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-500/10 text-gray-600 border-gray-200 hover:bg-gray-500/20',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20',
  },
  draft: {
    label: 'Draft',
    className: 'bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20',
  },
  published: {
    label: 'Published',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20',
  },
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const normalizedStatus = status.toLowerCase();
  const config = statusConfig[normalizedStatus] || {
    label: status,
    className: 'bg-secondary text-secondary-foreground',
  };

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs', config.className, className)}
    >
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
