import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HelpArticleProse } from '@/components/HelpArticleProse';
import { fetchPublicHelpArticles, type PublicHelpArticle } from '@/lib/api';
import { cn } from '@/lib/utils';

type PageHelpFaqsProps = {
  /** Must match the article category string exactly (e.g. Pricing, Resources). Ignored when `allPublished` is true. */
  category?: string;
  /** Load every published help article (same content pool as the public /help page and Admin → Help). */
  allPublished?: boolean;
  title?: string;
  className?: string;
};

function sortArticles(data: PublicHelpArticle[]) {
  return [...data].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title),
  );
}

function FaqCard({ article }: { article: PublicHelpArticle }) {
  return (
    <article
      className={cn(
        'rounded-lg border border-border/70 bg-card px-5 py-5 md:px-6 md:py-6',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
      )}
    >
      <h3 className="text-left text-base font-bold text-foreground leading-snug tracking-tight">{article.title}</h3>
      <div className="mt-2.5 md:mt-3">
        <HelpArticleProse content={article.content} tone="muted" className="text-sm leading-relaxed" />
      </div>
    </article>
  );
}

/**
 * Published help articles for a single category, shown as stacked FAQ cards.
 * With `allPublished`, every published article is shown, grouped by category.
 */
export function PageHelpFaqs({
  category = '',
  allPublished = false,
  title = 'Frequently asked questions',
  className,
}: PageHelpFaqsProps) {
  const cat = category.trim();
  const enabled = allPublished || Boolean(cat);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: allPublished ? ['public-help-articles-all'] : ['public-help-articles', cat],
    queryFn: () => fetchPublicHelpArticles(allPublished ? null : cat),
    enabled,
    staleTime: 60_000,
  });

  const items = useMemo(() => sortArticles(data), [data]);

  const grouped = useMemo(() => {
    if (!allPublished) return null;
    const m = new Map<string, PublicHelpArticle[]>();
    for (const a of items) {
      const key = (a.category || 'General').trim() || 'General';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPublished, items]);

  const shell = (children: ReactNode) => (
    <div className={cn('max-w-3xl mr-auto w-full text-left', className)}>{children}</div>
  );

  if (!enabled) return null;

  if (isLoading) {
    return shell(
      <p className="text-sm text-muted-foreground py-8" aria-live="polite">
        Loading FAQs…
      </p>,
    );
  }

  if (isError) {
    return shell(<p className="text-sm text-destructive py-8">Could not load FAQs. Please try again later.</p>);
  }

  if (items.length === 0) {
    return shell(
      <p className="text-sm text-muted-foreground py-8">
        No published help articles yet. Add articles in Admin → Help to show them here.
      </p>,
    );
  }

  if (allPublished && grouped) {
    return shell(
      <div>
        <h2 className="mb-5 text-base font-semibold tracking-tight text-foreground md:mb-6">{title}</h2>
        <div className="space-y-10">
          {grouped.map(([catName, articles]) => (
            <section key={catName} aria-labelledby={`faq-cat-${catName.replace(/\s+/g, '-')}`}>
              <h3
                id={`faq-cat-${catName.replace(/\s+/g, '-')}`}
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {catName}
              </h3>
              <div className="flex flex-col gap-3 md:gap-4">
                {articles.map((f) => (
                  <FaqCard key={f.id} article={f} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>,
    );
  }

  return shell(
    <div>
      <h2 className="mb-5 text-base font-semibold tracking-tight text-foreground md:mb-6">{title}</h2>
      <div className="flex flex-col gap-3 md:gap-4">
        {items.map((f) => (
          <FaqCard key={f.id} article={f} />
        ))}
      </div>
    </div>,
  );
}
