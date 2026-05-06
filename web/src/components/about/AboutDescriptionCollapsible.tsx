import { useLayoutEffect, useRef, useState } from 'react';
import { HtmlPreview } from '@/components/HtmlPreview';
import { cn } from '@/lib/utils';

type AboutDescriptionCollapsibleProps = {
  content: string;
  className: string;
  containWideBlocks?: boolean;
};

function collapsedMaxPx(): number {
  if (typeof window === 'undefined') return 11 * 16;
  return window.matchMedia('(min-width: 640px)').matches ? 13 * 16 : 11 * 16;
}

/**
 * Renders CMS about body HTML with optional clamp + “See more” / “See less” when text exceeds a few lines.
 */
export function AboutDescriptionCollapsible({
  content,
  className,
  containWideBlocks = true,
}: AboutDescriptionCollapsibleProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    const inner = measureRef.current;
    if (!inner) return;
    const measure = () => {
      const maxPx = collapsedMaxPx();
      const prevMax = inner.style.maxHeight;
      const prevOv = inner.style.overflow;
      inner.style.maxHeight = `${maxPx}px`;
      inner.style.overflow = 'hidden';
      const needs = inner.scrollHeight > inner.clientHeight + 2;
      inner.style.maxHeight = prevMax;
      inner.style.overflow = prevOv;
      setHasOverflow(needs);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    const mq = window.matchMedia('(min-width: 640px)');
    mq.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', measure);
    };
  }, [content]);

  const trimmed = (content ?? '').trim();
  if (!trimmed) return null;

  return (
    <div className="min-w-0">
      <div
        ref={measureRef}
        className={cn(
          'relative',
          !expanded && hasOverflow && 'max-h-[11rem] sm:max-h-[13rem] overflow-hidden',
        )}
      >
        <HtmlPreview content={content} containWideBlocks={containWideBlocks} className={className} />
        {!expanded && hasOverflow ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {hasOverflow ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          aria-expanded={expanded}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  );
}
