import { Fragment } from 'react';
import { HtmlPreview } from '@/components/HtmlPreview';
import { looksLikeHtml, unwrapEntityEncodedHtmlIfNeeded } from '@/lib/summaryHtml';
import { cn } from '@/lib/utils';

function renderLine(line: string, lineKey: number, tone: 'default' | 'muted') {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  const pClass =
    tone === 'muted'
      ? 'mb-3 last:mb-0 leading-relaxed text-muted-foreground'
      : 'mb-3 last:mb-0 leading-relaxed text-foreground';
  return (
    <p key={lineKey} className={pClass}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </p>
  );
}

type HelpArticleProseProps = {
  content: string;
  className?: string;
  /** Muted body copy (e.g. FAQ answers under a bold question). */
  tone?: 'default' | 'muted';
};

/** Renders help body with line breaks and `**inline bold**` segments (typography via `prose`). */
export function HelpArticleProse({ content, className, tone = 'default' }: HelpArticleProseProps) {
  const body = unwrapEntityEncodedHtmlIfNeeded(content ?? '');
  if (looksLikeHtml(body)) {
    return (
      <HtmlPreview
        content={body}
        className={cn(tone === 'muted' && 'text-muted-foreground [&_strong]:text-foreground', className)}
      />
    );
  }
  const lines = body.split('\n');
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      {lines.map((line, li) =>
        line === '' ? <div key={li} className="h-2 shrink-0" aria-hidden /> : renderLine(line, li, tone)
      )}
    </div>
  );
}
