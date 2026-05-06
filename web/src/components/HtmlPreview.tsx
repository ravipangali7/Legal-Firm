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
};

/**
 * Renders string content: if it looks like HTML, shows a sanitized preview;
 * otherwise renders plain text with line breaks preserved.
 */
export function HtmlPreview({ content, className, inheritTypography }: HtmlPreviewProps) {
  const raw = content ?? '';
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (looksLikeHtml(trimmed)) {
    const safe = sanitizeAndHeadingIds(trimmed);
    if (inheritTypography) {
      return <div className={cn('max-w-none', className)} dangerouslySetInnerHTML={{ __html: safe }} />;
    }
    return (
      <div
        className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  if (inheritTypography) {
    return <p className={cn('mb-0 whitespace-pre-wrap break-words leading-relaxed', className)}>{raw}</p>;
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <p className="mb-0 whitespace-pre-wrap break-words leading-relaxed">{raw}</p>
    </div>
  );
}
