import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CmsStoreProvider } from '@/store/cmsStore';
import { HelpArticleProse } from '@/components/HelpArticleProse';
import { fetchPublicHelpArticles, type PublicHelpArticle } from '@/lib/api';

const HelpCenter = () => {
  const { data: articles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public-help-articles'],
    queryFn: fetchPublicHelpArticles,
    staleTime: 60_000,
  });

  const byCategory = useMemo(() => {
    const m = new Map<string, PublicHelpArticle[]>();
    for (const a of articles) {
      const c = (a.category || '').trim() || 'General';
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(a);
    }
    for (const list of m.values()) {
      list.sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.title.localeCompare(y.title));
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [articles]);

  if (isLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading help…
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  if (isError) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 px-4 flex-1">
            <div className="container mx-auto max-w-lg text-center">
              <p className="text-muted-foreground mb-4">Could not load help articles. Check your connection and try again.</p>
              <Button type="button" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  return (
    <CmsStoreProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="pt-28 pb-16 px-4 flex-1">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-start gap-3 mb-10">
              <BookOpen className="h-10 w-10 text-primary-onBg shrink-0 mt-1" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Help center</h1>
                <p className="text-muted-foreground mt-2">
                  Guides and tips from your team. Published articles from the admin help center appear here automatically.
                </p>
              </div>
            </div>

            {articles.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No published help articles yet.</p>
            ) : (
              <div className="space-y-12">
                {byCategory.map(([category, items]) => (
                  <section key={category}>
                    <h2 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b">{category}</h2>
                    <div className="space-y-6">
                      {items.map((article) => (
                        <Card key={article.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-xl">{article.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <HelpArticleProse content={article.content} className="text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default HelpCenter;
