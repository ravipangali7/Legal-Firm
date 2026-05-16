import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Icons from 'lucide-react';
import { Search, ArrowRight, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { proceduresListQueryOptions } from '@/lib/proceduresListQuery';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';
const Procedures = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { data = [], isLoading, isError, refetch, isFetching } = useQuery(proceduresListQueryOptions);

  const categories = useMemo(() => {
    const set = new Set(data.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categories, activeCategory]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data, search, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-primary-onBg mb-3">Procedures</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Clear, step-by-step guides for the most common legal, tax and compliance procedures in Nepal.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search procedures…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                disabled={isLoading || isError}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-9 w-14 rounded-md" />
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-16 rounded-md" />
                </>
              ) : (
                categories.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={activeCategory === c ? 'default' : 'outline'}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </Button>
                ))
              )}
            </div>
          </div>

          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">We could not load the procedure catalog. Check your connection and try again.</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((p) => {
                const Icon = (Icons as Record<string, typeof FileText>)[p.icon] ?? FileText;
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary-onBg" aria-hidden />
                        </div>
                        <Badge variant="secondary">{p.category}</Badge>
                      </div>
                      <CardTitle className="text-lg mt-3">{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{p.summary}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.steps_count} steps</span>
                        {p.duration_label ? <span>â± {p.duration_label}</span> : null}
                      </div>
                      <Link
                        to={`/procedures/${p.slug}`}
                        className="inline-flex items-center text-primary-onBg text-sm font-medium hover:underline"
                      >
                        View Procedure <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              {data.length === 0
                ? 'No procedures are published yet. Check back soon.'
                : 'No procedures match your search.'}
            </div>
          )}

          <PageHelpFaqs category="Procedures" title="Procedure FAQs" className="mt-14" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Procedures;
