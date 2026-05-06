import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCms } from '@/store/cmsStore';
import { Link } from 'react-router-dom';
import { Image, Info, Sparkles, Users, Newspaper, PanelBottom, RefreshCcw } from 'lucide-react';

const CmsOverview = () => {
  const cms = useCms();
  const cards = [
    { title: 'Hero slides', value: cms.slides.length, icon: Image, to: '/admin/cms/hero' },
    { title: 'About section', value: cms.about.enabled ? 'Live' : 'Off', icon: Info, to: '/admin/cms/about' },
    { title: 'Services', value: cms.services.length, icon: Sparkles, to: '/admin/cms/services' },
    { title: 'Team members', value: cms.team.length, icon: Users, to: '/admin/cms/team' },
    { title: 'News items', value: cms.news.length, icon: Newspaper, to: '/admin/cms/news' },
    { title: 'Footer columns', value: cms.footer.columns.length, icon: PanelBottom, to: '/admin/cms/footer' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{c.title}</div>
                <div className="text-3xl font-bold mt-1">{c.value}</div>
                <Button asChild variant="link" className="px-0 mt-2"><Link to={c.to}>Manage â†’</Link></Button>
              </div>
              <c.icon className="h-8 w-8 text-primary-onBg/60" />
            </CardContent>
          </Card>
        ))}
      </div>
      {cms.persistMode === 'local' && (
        <Card>
          <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => { if (confirm('Reset all CMS content to defaults?')) cms.resetAll(); }}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Reset CMS to defaults
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CmsOverview;
