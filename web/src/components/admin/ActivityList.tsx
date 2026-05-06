import { Clock, User, FileText, CreditCard, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';

interface Activity {
  id: string | number;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  action: string;
  target: string;
  type: 'user' | 'content' | 'payment' | 'settings' | 'security';
  time: string;
}

interface ActivityListProps {
  activities: Activity[];
  title?: string;
  description?: string;
  className?: string;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  content: FileText,
  payment: CreditCard,
  settings: Settings,
  security: Shield,
};

const activityColors: Record<string, string> = {
  user: 'bg-blue-500/10 text-blue-600',
  content: 'bg-purple-500/10 text-purple-600',
  payment: 'bg-green-500/10 text-green-600',
  settings: 'bg-orange-500/10 text-orange-600',
  security: 'bg-red-500/10 text-red-600',
};

const ActivityList = ({
  activities,
  title = 'Recent Activity',
  description,
  className,
}: ActivityListProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-0">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || FileText;
              const colorClass = activityColors[activity.type] || 'bg-gray-500/10 text-gray-600';

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={activity.user.avatar ? cmsMediaSrc(activity.user.avatar) : ''} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary-onBg">
                      {activity.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn('p-1 rounded', colorClass)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityList;
