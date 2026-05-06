import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, BookOpen, Search, Bell, HelpCircle, Newspaper } from 'lucide-react';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CmsStoreProvider } from '@/store/cmsStore';
import { useKnowledgeDownloads } from '@/hooks/useKnowledgeDownloads';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import { postKnowledgeResourceTrackDownloads } from '@/lib/api';
import type { KnowledgeResourcePublicApi } from '@/lib/api';

const subcategories = [
  { icon: Bell, label: 'Notices', description: 'Government notices, circulars, and official announcements', href: '/notices', count: '50+' },
  { icon: Newspaper, label: 'Blog & Insights', description: 'Legal articles, analysis, and expert commentary', href: '/blog', count: '80+' },
  { icon: BookOpen, label: 'Knowledge Base', description: 'Guides, templates, and reference documents', href: '/knowledge', count: '200+' },
  { icon: HelpCircle, label: 'FAQs', description: 'Frequently asked questions about Nepal law & tax', href: '/knowledge#faqs', count: '120+' },
];

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const Resources = () => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Legal Acts', 'Court Forms', 'Templates', 'Guidelines'];

  const { rows: filtered, fromApi } = useKnowledgeDownloads(search, activeFilter);

  const onDownload = useCallback(
    async (r: KnowledgeResourcePublicApi) => {
      if (fromApi && isUuid(r.id)) {
        try {
          await postKnowledgeResourceTrackDownloads([r.id]);
        } catch {
          /* non-blocking */
        }
      }
      const url = cmsMediaSrc(r.download_href);
      if (url && url !== '#') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [fromApi],
  );

  return (
    <CmsStoreProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-primary-onBg mb-3">Resources</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">Access legal documents, notices, guides, templates, and FAQs — your one-stop resource center for Nepalese law.</p>
            </div>

            {/* Subcategory cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {subcategories.map((sc) => (
                <Link key={sc.label} to={sc.href}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 h-full">
                    <CardContent className="p-5 text-center">
                      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <sc.icon className="h-6 w-6 text-primary-onBg" />
                      </div>
                      <h3 className="font-bold text-sm">{sc.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{sc.description}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">{sc.count}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <Tabs defaultValue="downloads" className="space-y-6">
              <TabsList>
                <TabsTrigger value="downloads">Downloads</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
              </TabsList>

              <TabsContent value="downloads">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search resources..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filters.map((f) => (
                      <Button key={f} variant={activeFilter === f ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setActiveFilter(f)}>{f}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {filtered.map((r, i) => (
                    <Card key={`${r.id}-${i}`} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5"><FileText className="h-4 w-4 text-primary-onBg" /></div>
                            <div>
                              <h3 className="font-semibold">{r.title}</h3>
                              <p className="text-sm text-muted-foreground">{r.description}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                                <span>{r.file_type}</span>
                                <span>{r.file_size_label}</span>
                                <span>{r.download_count.toLocaleString()} downloads</span>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" type="button" onClick={() => void onDownload(r)}>
                            <Download className="h-3.5 w-3.5 mr-1" />Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="faqs" id="faqs" className="pt-2">
                <PageHelpFaqs category="Resources" title="Frequently asked questions" className="max-w-3xl" />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </CmsStoreProvider>
  );
};

export default Resources;
