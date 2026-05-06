import { cn } from '@/lib/utils';
import { AboutMediaVisual } from '@/components/about/AboutMediaVisual';

export type AboutStatItem = { id?: string; label: string; value: string };

type AboutMediaAndStatsProps = {
  imageSrc: string;
  alt: string;
  stats: AboutStatItem[];
  className?: string;
};

/**
 * Homepage / About hero strip: framed photo with gold corner callout (first stat)
 * and a row of white metric cards — matches the firm marketing layout.
 */
export function AboutMediaAndStats({ imageSrc, alt, stats, className }: AboutMediaAndStatsProps) {
  const first = stats[0];
  const hasStats = stats.length > 0;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-8 lg:gap-10 lg:grid-cols-2 lg:items-stretch',
        !hasStats && 'lg:grid-cols-1 max-w-3xl',
        className,
      )}
    >
      <AboutMediaVisual
        imageSrc={imageSrc}
        alt={alt}
        className="w-full min-w-0"
        cornerHighlight={first ? { value: first.value, label: first.label } : undefined}
      />
      {hasStats ? (
        <div
          className={cn(
            'grid min-h-0 min-w-0 gap-3 sm:gap-4 content-start',
            stats.length >= 4
              ? 'grid-cols-2 sm:grid-cols-4'
              : stats.length === 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : stats.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1 max-w-[14rem]',
          )}
        >
          {stats.map((s, i) => (
            <div
              key={s.id ?? `${s.label}-${i}`}
              className={cn(
                'flex min-h-[6.5rem] sm:min-h-[7.25rem] flex-col justify-center rounded-xl border border-border/80 bg-card px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
                'ring-1 ring-slate-950/[0.03]',
              )}
            >
              <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold tabular-nums tracking-tight text-primary-onBg leading-none [overflow-wrap:anywhere]">
                {s.value}
              </div>
              <div className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-3 normal-case">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
