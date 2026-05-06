import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { Briefcase, FileText, Newspaper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { proceduresListQueryOptions } from '@/lib/proceduresListQuery';

export type RelatedContentSidebarProps = {
  excludeNewsId?: string;
  excludeServiceId?: string;
  excludeProcedureSlug?: string;
  /** Prefer procedures in this category (e.g. current procedure’s category). */
  procedureCategory?: string;
  maxPerSection?: number;
};

const DEFAULT_MAX = 4;

function lineClamp(s: string, maxLen: number) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function RelatedContentSidebar({
  excludeNewsId,
  excludeServiceId,
  excludeProcedureSlug,
  procedureCategory,
  maxPerSection = DEFAULT_MAX,
}: RelatedContentSidebarProps) {
  const { data: hp, isLoading: hpLoading, isError: hpError } = useQuery(siteHomepageQueryOptions);
  const { data: procedures = [], isLoading: procLoading } = useQuery(proceduresListQueryOptions);

  const snapshot = useMemo(() => (hp ? mapHomepageApiToSnapshot(hp) : null), [hp]);

  const relatedNews = useMemo(() => {
    if (!snapshot) return [];
    const ex = excludeNewsId?.trim().toLowerCase();
    return snapshot.news
      .filter((n) => n.enabled && (!ex || n.id.toLowerCase() !== ex))
      .sort((a, b) => a.order - b.order)
      .slice(0, maxPerSection);
  }, [snapshot, excludeNewsId, maxPerSection]);

  const relatedServices = useMemo(() => {
    if (!snapshot) return [];
    const ex = excludeServiceId?.trim().toLowerCase();
    return snapshot.services
      .filter((s) => s.enabled && (!ex || s.id.toLowerCase() !== ex))
      .sort((a, b) => a.order - b.order)
      .slice(0, maxPerSection);
  }, [snapshot, excludeServiceId, maxPerSection]);

  const relatedProcedures = useMemo(() => {
    let list = procedures.filter((p) => !excludeProcedureSlug || p.slug !== excludeProcedureSlug);
    if (procedureCategory) {
      const same = list.filter((p) => p.category === procedureCategory);
      const other = list.filter((p) => p.category !== procedureCategory);
      list = [...same, ...other];
    }
    return list.slice(0, maxPerSection);
  }, [procedures, excludeProcedureSlug, procedureCategory, maxPerSection]);

  const loading = hpLoading || procLoading;
  const hasAny =
    relatedNews.length > 0 || relatedServices.length > 0 || relatedProcedures.length > 0;

  if (hpError && !snapshot) return null;
  if (!loading && !hasAny) return null;

  return (
    <aside className="space-y-8 lg:sticky lg:top-28 self-start" aria-label="Related content">
      {loading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-4 w-28 mt-6" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {!loading && relatedNews.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Newspaper className="h-3.5 w-3.5" aria-hidden />
            Related news
          </h2>
          <ul className="space-y-3">
            {relatedNews.map((n) => (
              <li key={n.id}>
                <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                  <CardContent className="p-3.5">
                    {n.tag ? (
                      <Badge variant="secondary" className="mb-1.5 text-[10px] font-normal">
                        {n.tag}
                      </Badge>
                    ) : null}
                    <Link
                      to={`/news/${encodeURIComponent(n.id)}`}
                      className="font-medium text-sm text-foreground hover:text-primary-onBg line-clamp-2 leading-snug"
                    >
                      {n.title}
                    </Link>
                    {n.excerpt ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.excerpt}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && relatedServices.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5" aria-hidden />
            Related services
          </h2>
          <ul className="space-y-3">
            {relatedServices.map((s) => {
              const Icon = (Icons as Record<string, typeof Briefcase>)[s.icon] ?? Icons.Sparkles;
              return (
                <li key={s.id}>
                  <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                    <CardContent className="p-3.5 flex gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary-onBg flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/services/${encodeURIComponent(s.id)}`}
                          className="font-medium text-sm text-foreground hover:text-primary-onBg line-clamp-2 leading-snug"
                        >
                          {s.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {lineClamp(s.description, 120)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!loading && relatedProcedures.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Related procedures
          </h2>
          <ul className="space-y-3">
            {relatedProcedures.map((p) => {
              const Icon = (Icons as Record<string, typeof FileText>)[p.icon] ?? FileText;
              return (
                <li key={p.id}>
                  <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary-onBg flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        {p.category ? (
                          <Badge variant="secondary" className="text-[10px] font-normal shrink-0 max-w-[50%] truncate">
                            {p.category}
                          </Badge>
                        ) : null}
                      </div>
                      <Link
                        to={`/procedures/${encodeURIComponent(p.slug)}`}
                        className="font-medium text-sm text-foreground hover:text-primary-onBg line-clamp-2 leading-snug"
                      >
                        {p.title}
                      </Link>
                      {p.summary ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.summary}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
