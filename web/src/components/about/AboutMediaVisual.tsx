import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CmsImage } from '@/components/CmsImage';

type CornerHighlight = { value: string; label: string };

type AboutMediaVisualProps = {
  /** Raw CMS path or URL (resolved inside `CmsImage`). */
  imageSrc: string;
  alt: string;
  className?: string;
  /** Gold callout on the photo (typically the first CMS stat). */
  cornerHighlight?: CornerHighlight | null;
};

/**
 * Image column for About: framed conference-style photo, soft shadow,
 * and a gold stat callout overlapping the corner (first metric / years of practice).
 */
export function AboutMediaVisual({ imageSrc, alt, className, cornerHighlight }: AboutMediaVisualProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        className={cn(
          'aspect-[4/3] rounded-2xl sm:rounded-[1.35rem] overflow-hidden',
          'bg-gradient-to-br from-muted/70 via-background to-muted/40',
          'shadow-[0_20px_50px_-16px_rgba(15,23,42,0.14)] ring-1 ring-border/45',
        )}
      >
        <CmsImage
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover min-h-[12rem]"
          loading="lazy"
          fallbackKind="about"
        />
      </div>
      {cornerHighlight ? (
        <div
          className={cn(
            'absolute z-10 right-3 bottom-3 sm:right-4 sm:bottom-4 max-w-[min(100%,15rem)] sm:max-w-[16.5rem]',
            'rounded-xl bg-accent px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.2)]',
            'ring-[3px] ring-background',
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                'bg-slate-950/[0.08] ring-1 ring-slate-950/10',
              )}
              aria-hidden
            >
              <Award className="h-4 w-4 text-slate-950" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-3xl sm:text-4xl font-bold tabular-nums text-slate-950 leading-[0.95] tracking-tight">
                {cornerHighlight.value}
              </div>
              <div className="mt-2 text-[0.625rem] sm:text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-slate-950 leading-snug">
                {cornerHighlight.label}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
