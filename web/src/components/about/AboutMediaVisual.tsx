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
    <div
      className={cn(
        'min-w-0',
        /* Reserve space so the badge can sit on the corner and extend slightly below / past the frame (matches layout reference). */
        cornerHighlight ? 'pb-[clamp(2.75rem,10vw,4.25rem)] sm:pb-[clamp(3rem,9vw,4.5rem)]' : '',
        className,
      )}
    >
      <div className="relative">
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
              'absolute z-10 max-w-[min(100%,14.5rem)] sm:max-w-[15.5rem]',
              /* Bottom-right of photo, overlapping the frame and sitting partly below / to the outside edge. */
              'right-[0.35rem] bottom-0 translate-x-1 translate-y-[36%] sm:right-1 sm:translate-x-1.5 sm:translate-y-[38%]',
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
        ) : null}
      </div>
    </div>
  );
}
