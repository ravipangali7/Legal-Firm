import { NavLink, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Layers, Image, Info, Sparkles, Users, Newspaper, PanelBottom, ToggleLeft, Navigation, FileText, MessageSquareQuote } from 'lucide-react';
import { siteHomepageQueryKey, siteHomepageQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { CmsStoreProvider, defaultCmsSnapshot } from '@/store/cmsStore';

const items = [
  { to: '/admin/cms', end: true, label: 'Overview', icon: Layers },
  { to: '/admin/cms/navigation', label: 'Navigation', icon: Navigation },
  { to: '/admin/cms/hero', label: 'Hero Slider', icon: Image },
  { to: '/admin/cms/about', label: 'About', icon: Info },
  { to: '/admin/cms/services', label: 'Services', icon: Sparkles },
  { to: '/admin/cms/team', label: 'Team', icon: Users },
  { to: '/admin/cms/news', label: 'News & Events', icon: Newspaper },
  { to: '/admin/cms/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { to: '/admin/cms/blog', label: 'Blog Posts', icon: FileText },
  { to: '/admin/cms/footer', label: 'Footer', icon: PanelBottom },
  { to: '/admin/cms/sections', label: 'Section Toggles', icon: ToggleLeft },
];

const CmsLayoutInner = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold">Homepage CMS</h1>
      <p className="text-muted-foreground mt-1">
        Manage every section of the public homepage. Changes sync to the server automatically.
      </p>
    </div>
    <div className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 lg:col-span-3">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-20">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="col-span-12 lg:col-span-9 min-w-0"><Outlet /></main>
    </div>
  </div>
);

const CmsLayout = () => {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery(siteHomepageQueryOptions);

  const hasRemote = Boolean(data) && !isError;
  const initialSnapshot = hasRemote ? mapHomepageApiToSnapshot(data!) : defaultCmsSnapshot;

  return (
    <CmsStoreProvider
      key={hasRemote ? 'remote' : 'local'}
      initialSnapshot={initialSnapshot}
      persistMode={hasRemote ? 'remote' : 'local'}
      onRemoteSave={hasRemote ? () => qc.invalidateQueries({ queryKey: siteHomepageQueryKey }) : undefined}
    >
      {isLoading && (
        <div className="text-sm text-muted-foreground py-3 border-b border-border mb-4">
          Loading homepage content…
        </div>
      )}
      {isError && (
        <div className="text-sm text-destructive py-3 border-b border-destructive/30 mb-4">
          Could not load CMS data{error instanceof Error ? `: ${error.message}` : ''}. You are editing local defaults until the API is available.
        </div>
      )}
      <CmsLayoutInner />
    </CmsStoreProvider>
  );
};

export default CmsLayout;
