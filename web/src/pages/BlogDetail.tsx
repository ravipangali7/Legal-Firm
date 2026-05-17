import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CmsStoreProvider } from '@/store/cmsStore';
import { HtmlPreview } from '@/components/HtmlPreview';
import { blogBodyToParagraphs, blogPostPublicAuthorLabel, fetchPublicBlogPost } from '@/lib/api';
import { looksLikeHtml } from '@/lib/summaryHtml';
import { RelatedContentSidebar } from '@/components/RelatedContentSidebar';
import { usePageSeo } from '@/context/SeoContext';

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading, isError, refetch } = useQuery({
    queryKey: ['blog-post-public', id],
    queryFn: () => fetchPublicBlogPost(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });

  usePageSeo(
    post && id
      ? {
          title: post.title,
          description: post.excerpt,
          pathname: `/blog/${id}`,
          type: 'article',
          publishedTime: post.date,
          author: blogPostPublicAuthorLabel(post),
          section: post.category || undefined,
          tags: post.category ? [post.category] : undefined,
        }
      : null
  );

  if (!id) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 px-4 flex-1">
            <div className="container mx-auto max-w-2xl text-center">
              <h1 className="text-2xl font-semibold mb-2">Article not found</h1>
              <p className="text-muted-foreground mb-6">This blog post does not exist or the link is incorrect.</p>
              <Button asChild>
                <Link to="/blog">Back to blog</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  if (isLoading) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading article…
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
              <p className="text-muted-foreground mb-4">Could not load this article.</p>
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

  if (!post) {
    return (
      <CmsStoreProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="pt-28 pb-16 px-4 flex-1">
            <div className="container mx-auto max-w-2xl text-center">
              <h1 className="text-2xl font-semibold mb-2">Article not found</h1>
              <p className="text-muted-foreground mb-6">This blog post does not exist or the link is incorrect.</p>
              <Button asChild>
                <Link to="/blog">Back to blog</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </CmsStoreProvider>
    );
  }

  const paragraphs = blogBodyToParagraphs(post.body);
  const bodyIsHtml = looksLikeHtml(post.body || '');

  return (
    <CmsStoreProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
              <article className="lg:col-span-8 min-w-0 max-w-3xl lg:max-w-none">
            <nav className="text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link to="/blog" className="hover:underline">
                Blog
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground line-clamp-1">{post.title}</span>
            </nav>

            <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All articles
              </Link>
            </Button>

            <header className="mb-10">
              <Badge variant="secondary" className="mb-3">
                {post.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-onBg leading-tight mb-4">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 shrink-0" />
                  {blogPostPublicAuthorLabel(post)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {post.date}
                </span>
              </div>
            </header>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {bodyIsHtml ? (
                <HtmlPreview
                  content={post.body}
                  className="prose-neutral max-w-none text-muted-foreground prose-p:text-muted-foreground"
                />
              ) : paragraphs.length > 0 ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-muted-foreground">
                  {paragraphs.map((paragraph, i) =>
                    looksLikeHtml(paragraph) ? (
                      <HtmlPreview key={i} content={paragraph} inheritTypography className="text-muted-foreground" />
                    ) : (
                      <p key={i}>{paragraph}</p>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No article body yet.</p>
              )}
            </div>
              </article>
              <div className="lg:col-span-4 min-w-0">
                <RelatedContentSidebar />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default BlogDetail;
