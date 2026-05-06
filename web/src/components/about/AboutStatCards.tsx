import { cn } from '@/lib/utils';

export type AboutStatItem = { id?: string; label: string; value: string };

type AboutStatCardsProps = {
  stats: AboutStatItem[];
  className?: string;
};

/** White metric tiles: large navy figure, muted label (homepage + About page). */
export function AboutStatCards({ stats, className }: AboutStatCardsProps) {
  if (!stats.length) return null;

  return (
    <div
      className={cn(
        'grid min-h-0 min-w-0 gap-3 sm:gap-4',
        stats.length >= 4
          ? 'grid-cols-2 sm:grid-cols-4'
          : stats.length === 3
            ? 'grid-cols-2 sm:grid-cols-3'
            : stats.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-1 max-w-[14rem]',
        className,
      )}
    >
      {stats.map((s, i) => {
        const value = (s.value ?? '').trim();
        return (
          <div
            key={s.id ?? `${s.label}-${i}`}
            className={cn(
              'flex min-h-[6.75rem] sm:min-h-[7.5rem] flex-col justify-center rounded-xl border border-border/80 bg-card px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
              'ring-1 ring-slate-950/[0.03]',
            )}
          >
            <div
              className={cn(
                'text-2xl sm:text-3xl lg:text-[2rem] font-bold tabular-nums tracking-tight text-primary-onBg',
                'leading-none [overflow-wrap:anywhere]',
              )}
              aria-label={value ? `${value} ${s.label}` : s.label}
            >
              {value || '—'}
            </div>
            <div className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-3 normal-case">
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
