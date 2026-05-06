import { Scale } from 'lucide-react';
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
 * and either a gold stat callout overlapping the corner or a compact icon badge.
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
            'absolute z-10 right-3 bottom-3 sm:right-4 sm:bottom-4 max-w-[min(100%,14rem)] sm:max-w-[15.5rem]',
            'rounded-xl bg-accent px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.2)]',
            'ring-[3px] ring-background',
          )}
        >
          <div className="text-3xl sm:text-4xl font-bold tabular-nums text-primary-onBg leading-[0.95] tracking-tight">
            {cornerHighlight.value}
          </div>
          <div className="mt-2 text-[0.625rem] sm:text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-primary-onBg leading-snug">
            {cornerHighlight.label}
          </div>
        </div>
      ) : (
        <div
          className="pointer-events-none absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-accent shadow-md ring-4 ring-background flex items-center justify-center"
          aria-hidden
        >
          <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground opacity-95" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
