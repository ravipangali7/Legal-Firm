import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type DashboardStatCardProps = {
  icon: LucideIcon;
  /** Display string for the main metric (e.g. counts, "120+"). */
  value: string;
  label: string;
};

/** Centered metric card for subscriber dashboard summary row. */
export function DashboardStatCard({ icon: Icon, value, label }: DashboardStatCardProps) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="p-5 text-center flex flex-col items-center justify-center min-h-[7.5rem]">
        <Icon className="h-5 w-5 text-foreground/55 shrink-0 mb-2" strokeWidth={1.75} aria-hidden />
        <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-snug">{label}</div>
      </CardContent>
    </Card>
  );
}

export default DashboardStatCard;
