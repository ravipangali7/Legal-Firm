import { LucideIcon, FileX, Users, FolderOpen, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyStateType = 'default' | 'users' | 'files' | 'data' | 'search';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const defaultIcons: Record<EmptyStateType, LucideIcon> = {
  default: Inbox,
  users: Users,
  files: FolderOpen,
  data: FileX,
  search: FileX,
};

const EmptyState = ({
  type = 'default',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const Icon = icon || defaultIcons[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

export default EmptyState;
