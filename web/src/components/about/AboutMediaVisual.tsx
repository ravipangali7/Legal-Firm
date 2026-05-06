import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import aboutFallback from '@/assets/hero-3.jpg';

type AboutMediaVisualProps = {
  /** Resolved URL from `cmsMediaSrc`; empty or failed load falls back to a bundled stock photo. */
  imageSrc: string;
  alt: string;
  className?: string;
};

/**
 * Image column for About (homepage block and About page): framed photo, shadow,
 * and a small accent square overlapping the corner — matches the marketing layout.
 */
export function AboutMediaVisual({ imageSrc, alt, className }: AboutMediaVisualProps) {
  const [broken, setBroken] = useState(false);
  const primary = (imageSrc || '').trim();
  const resolved = !primary || broken ? aboutFallback : primary;

  const onImgError = useCallback(() => {
    setBroken(true);
  }, []);

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        className={cn(
          'aspect-[4/3] rounded-[1.75rem] overflow-hidden',
          'bg-gradient-to-br from-muted/70 via-background to-muted/40',
          'shadow-[0_22px_55px_-18px_rgba(15,23,42,0.16)] ring-1 ring-border/50',
        )}
      >
        <img
          src={resolved}
          alt={alt}
          className="w-full h-full object-cover min-h-[12rem]"
          loading="lazy"
          onError={onImgError}
        />
      </div>
      <div
        className="pointer-events-none absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-accent shadow-md ring-4 ring-background"
        aria-hidden
      />
    </div>
  );
}
