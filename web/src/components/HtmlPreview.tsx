import { looksLikeHtml, sanitizeAndHeadingIds } from '@/lib/summaryHtml';
import { cn } from '@/lib/utils';

type HtmlPreviewProps = {
  content: string;
  className?: string;
  /**
   * When true, skip the inner `prose` wrapper so a parent `article.prose` (or similar)
   * controls typography — use for HTML fragments inside an existing prose block.
   */
  inheritTypography?: boolean;
  /**
   * Keeps images, tables, and pre blocks within the column so the viewport does not
   * gain horizontal scroll from CMS or pasted HTML.
   */
  containWideBlocks?: boolean;
};

/**
 * Renders string content: if it looks like HTML, shows a sanitized preview;
 * otherwise renders plain text with line breaks preserved.
 */
const wideBlockContainClasses =
  'min-w-0 max-w-full break-words [&_img]:max-w-full [&_img]:h-auto [&_video]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto';

export function HtmlPreview({ content, className, inheritTypography, containWideBlocks }: HtmlPreviewProps) {
  const raw = content ?? '';
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const wrapWide = containWideBlocks ? wideBlockContainClasses : '';

  if (looksLikeHtml(trimmed)) {
    const safe = sanitizeAndHeadingIds(trimmed);
    if (inheritTypography) {
      return <div className={cn('max-w-none', wrapWide, className)} dangerouslySetInnerHTML={{ __html: safe }} />;
    }
    return (
      <div
        className={cn('prose prose-sm dark:prose-invert max-w-none', wrapWide, className)}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  if (inheritTypography) {
    return <p className={cn('mb-0 whitespace-pre-wrap break-words leading-relaxed', wrapWide, className)}>{raw}</p>;
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', wrapWide, className)}>
      <p className="mb-0 whitespace-pre-wrap break-words leading-relaxed">{raw}</p>
    </div>
  );
}
