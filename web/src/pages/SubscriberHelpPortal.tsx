import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpArticleProse } from '@/components/HelpArticleProse';
import { fetchAuthHelpArticles, type PublicHelpArticle } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';

/** Help articles published by admins — shown inside /client and /dashboard shells (view-only). */
export default function SubscriberHelpPortal() {
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const { user } = useAuth();
  const canViewHelp = Boolean(user) && evaluatePortalModuleView(user, PORTAL_PERM_MODULES.help);

  const { data: articles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['auth-help-articles'],
    queryFn: () => fetchAuthHelpArticles(),
    enabled: canViewHelp,
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

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  if (!evaluatePortalModuleView(user, PORTAL_PERM_MODULES.help)) {
    return <Navigate to={hubPath} replace />;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8">Loading help…</p>;
  }

  if (isError) {
    return (
      <div className="max-w-lg py-8 space-y-4">
        <p className="text-muted-foreground text-sm">Could not load help articles. Check your connection and try again.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 w-full">
      <div className="flex items-start gap-3">
        <BookOpen className="h-10 w-10 text-primary-onBg shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Help</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Guides from your team. Published articles from Admin → Help appear here (view only).
          </p>
        </div>
      </div>

      {articles.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No published help articles yet.</p>
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
  );
}
