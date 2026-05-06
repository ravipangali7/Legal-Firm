import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'stats' | 'chart';
  count?: number;
  className?: string;
}

const StatsCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 py-4 px-4 border-b border-border last:border-0">
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-8 w-8 rounded-full" />
    <Skeleton className="h-4 flex-1 max-w-[200px]" />
    <Skeleton className="h-4 flex-1 max-w-[150px]" />
    <Skeleton className="h-5 w-16 rounded-full" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-8 w-8 rounded" />
  </div>
);

const ChartSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full rounded-lg" />
    </CardContent>
  </Card>
);

const LoadingSkeleton = ({ type = 'card', count = 1, className }: LoadingSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'stats':
        return Array(count)
          .fill(0)
          .map((_, i) => <StatsCardSkeleton key={i} />);
      case 'table':
        return (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-72" />
                <Skeleton className="h-9 w-9" />
                <div className="flex-1" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div>
              {Array(count)
                .fill(0)
                .map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
            </div>
          </Card>
        );
      case 'chart':
        return Array(count)
          .fill(0)
          .map((_, i) => <ChartSkeleton key={i} />);
      default:
        return Array(count)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ));
    }
  };

  return <div className={cn('space-y-4', className)}>{renderSkeleton()}</div>;
};

export default LoadingSkeleton;
