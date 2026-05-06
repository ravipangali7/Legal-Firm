import { cn } from '@/lib/utils';
import { CmsImage } from '@/components/CmsImage';

type AboutMediaVisualProps = {
  /** Raw CMS path or URL (resolved inside `CmsImage`). */
  imageSrc: string;
  alt: string;
  className?: string;
};

/**
 * Image column for About (homepage block and About page): framed photo, shadow,
 * and a small accent square overlapping the corner — matches the marketing layout.
 */
export function AboutMediaVisual({ imageSrc, alt, className }: AboutMediaVisualProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        className={cn(
          'aspect-[4/3] rounded-[1.75rem] overflow-hidden',
          'bg-gradient-to-br from-muted/70 via-background to-muted/40',
          'shadow-[0_22px_55px_-18px_rgba(15,23,42,0.16)] ring-1 ring-border/50',
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
      <div
        className="pointer-events-none absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-accent shadow-md ring-4 ring-background"
        aria-hidden
      />
    </div>
  );
}
