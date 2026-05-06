import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ChartType = 'line' | 'bar' | 'pie' | 'area';

interface ChartPlaceholderProps {
  title: string;
  description?: string;
  type?: ChartType;
  height?: string;
  className?: string;
}

const chartIcons: Record<ChartType, React.ComponentType<{ className?: string }>> = {
  line: LineChart,
  bar: BarChart3,
  pie: PieChart,
  area: TrendingUp,
};

const ChartPlaceholder = ({
  title,
  description,
  type = 'bar',
  height = 'h-64',
  className,
}: ChartPlaceholderProps) => {
  const Icon = chartIcons[type];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg bg-secondary/30 border border-dashed border-border',
            height
          )}
        >
          <Icon className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Chart visualization</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Data visualization placeholder</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartPlaceholder;
