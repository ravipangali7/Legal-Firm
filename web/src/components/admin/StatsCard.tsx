import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary-onBg',
  iconBg = 'bg-primary/10',
}: StatsCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
            {change && (
              <p className="text-xs flex items-center gap-1">
                <span
                  className={cn(
                    'font-semibold',
                    change.positive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {change.positive ? '+' : ''}{change.value}
                </span>
                <span className="text-muted-foreground">from last month</span>
              </p>
            )}
          </div>
          <div
            className={cn(
              'p-3 rounded-xl transition-transform duration-300 group-hover:scale-110',
              iconBg
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
