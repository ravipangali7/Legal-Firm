import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CmsStoreProvider } from '@/store/cmsStore';
import { blogPostPublicAuthorLabel, fetchPublicBlogPosts, type BlogPostPublicList } from '@/lib/api';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';

const Blog = () => {
  const [active, setActive] = useState('All');
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['blog-posts-public'],
    queryFn: fetchPublicBlogPosts,
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      const c = (p.category || '').trim();
      if (c) set.add(c);
    }
    return ['All', ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p: BlogPostPublicList) => {
      if (active !== 'All' && p.category !== active) return false;
      if (q && !p.title.toLowerCase().includes(q) && !(p.excerpt || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, active, search]);

  const featured = useMemo(() => posts.find((p) => p.featured), [posts]);

  if (isLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading articles…
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
              <p className="text-muted-foreground mb-4">Could not load the blog. Check your connection and try again.</p>
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-primary-onBg mb-3">Legal Insights & Blog</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">Stay informed with expert analysis, case studies, and legal updates from Nepal's leading professionals.</p>
            </div>

            {featured && (
              <Card className="mb-10 overflow-hidden border-0 shadow-lg">
                <div className="md:flex">
                  <div className="md:w-1/3 bg-gradient-to-br from-primary to-primary/70 p-8 flex items-center justify-center text-primary-foreground">
                    <div className="text-center">
                      <Badge className="bg-white/20 text-white mb-3">Featured</Badge>
                      <h2 className="text-2xl font-bold leading-tight">{featured.title}</h2>
                    </div>
                  </div>
                  <div className="md:w-2/3 p-8">
                    <Badge variant="secondary" className="mb-3">{featured.category}</Badge>
                    <p className="text-muted-foreground mb-4 leading-relaxed">{featured.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{blogPostPublicAuthorLabel(featured)}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{featured.date}</span>
                      </div>
                      <Button asChild>
                        <Link to={`/blog/${featured.id}`}>
                          Read More <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search articles..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Button key={c} variant={active === c ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setActive(c)}>{c}</Button>
                ))}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No articles have been published yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((post) => (
                  <Card key={post.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
                      </div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary-onBg transition-colors">{post.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{blogPostPublicAuthorLabel(post)}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/blog/${post.id}`}>
                            Read <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {posts.length > 0 && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No articles found matching your criteria.</div>
            )}

            <PageHelpFaqs category="Blog" title="Blog FAQs" className="mt-16" />
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default Blog;
