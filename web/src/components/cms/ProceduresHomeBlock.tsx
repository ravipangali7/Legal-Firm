import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { proceduresListQueryOptions } from '@/lib/proceduresListQuery';

const PREVIEW_LIMIT = 6;

/** Homepage procedures strip: intro plus a preview grid from GET /api/procedures/. */
const ProceduresHomeBlock = () => {
  const { data = [], isLoading, isError } = useQuery(proceduresListQueryOptions);
  const preview = data.slice(0, PREVIEW_LIMIT);

  return (
    <section className="py-16 sm:py-20 bg-secondary/40 border-y border-border/60">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary-onBg mb-4">
            <ClipboardList className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-onBg">Legal & tax procedures</h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Step-by-step guides for registration, compliance, and common filings—written for clarity and kept up to date.
          </p>
        </div>

        {isLoading && (
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && preview.length > 0 && (
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {preview.map((p) => {
              const Icon = (Icons as Record<string, typeof Icons.Building2>)[p.icon] ?? Icons.FileText;
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                        <Icon className="h-5 w-5 text-primary-onBg" aria-hidden />
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {p.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3 leading-snug">{p.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.summary}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.steps_count} steps</span>
                      {p.duration_label ? <span>{p.duration_label}</span> : null}
                    </div>
                    <Link
                      to={`/procedures/${p.slug}`}
                      className="inline-flex items-center text-primary-onBg text-sm font-medium hover:underline"
                    >
                      View procedure
                      <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && !isError && preview.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground max-w-xl mx-auto">
            Procedure guides will appear here once they are published in the catalog.
          </p>
        )}

        {isError && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Could not load procedures. You can still open the full directory below.
          </p>
        )}

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link to="/procedures" className="inline-flex items-center gap-2">
              Browse procedures
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProceduresHomeBlock;
