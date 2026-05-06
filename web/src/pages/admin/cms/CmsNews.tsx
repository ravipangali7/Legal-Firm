import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, NewsItem } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { CmsSectionHeader, CmsThumb, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const empty: Omit<NewsItem, 'id' | 'order'> = {
  title: '',
  excerpt: '',
  body: '',
  image: '',
  date: new Date().toISOString().slice(0, 10),
  href: '#',
  tag: 'News',
  enabled: true,
};

function newsDraftFrom(n: NewsItem): NewsItem {
  return { ...n };
}

const CmsNews = () => {
  const { news, addNews, updateNews, deleteNews, moveNews } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:news:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<NewsItem | null>(null);

  const sorted = useMemo(() => [...news].sort((a, b) => a.order - b.order), [news]);

  const openAdd = () => {
    setEditing('add');
    setDraft({
      id: '',
      order: sorted.length + 1,
      ...empty,
    });
    setSheetOpen(true);
  };

  const openEdit = (n: NewsItem) => {
    setEditing('edit');
    setDraft(newsDraftFrom(n));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
    setDraft(null);
  };

  const saveSheet = () => {
    if (!draft) return;
    if (!draft.title.trim()) return;
    if (editing === 'add') {
      addNews({
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        image: draft.image,
        date: draft.date,
        href: draft.href || '#',
        tag: draft.tag,
        enabled: draft.enabled,
      });
    } else if (editing === 'edit' && draft.id) {
      updateNews(draft.id, {
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        image: draft.image,
        date: draft.date,
        href: draft.href,
        tag: draft.tag,
        enabled: draft.enabled,
      });
    }
    closeSheet();
  };

  const renderRow = (n: NewsItem, layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            layout === 'grid' ? 'flex-col sm:flex-row' : 'flex-row items-start'
          )}
        >
          <CmsThumb src={n.image} alt={n.title} className={layout === 'grid' ? 'h-28 w-full sm:h-24 sm:w-40' : 'h-20 w-32'} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold leading-snug line-clamp-2">{n.title}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-normal">
                {n.tag}
              </Badge>
              <span className="tabular-nums">{n.date}</span>
              <span className="tabular-nums">#{n.order}</span>
              <Badge variant={n.enabled ? 'default' : 'outline'} className="text-[10px] uppercase tracking-wide">
                {n.enabled ? 'Live' : 'Off'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{n.excerpt || 'No excerpt'}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveNews(n.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveNews(n.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(n)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteNews(n.id)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card key={n.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col gap-4 p-4">{inner}</div>
        </Card>
      );
    }

    return (
      <Card key={n.id} className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="News & Events"
        description="Articles shown in the News section. Switch layout, add a story, or edit an item—then Save to sync when connected to the server."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={openAdd}
        addLabel="Add article"
      />

      {sorted.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-muted-foreground text-sm">No news items yet.</Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((n) => renderRow(n, 'grid'))}</div>
      ) : (
        <div className="space-y-3">{sorted.map((n) => renderRow(n, 'list'))}</div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing === 'add' ? 'Add news article' : 'Edit news article'}</SheetTitle>
            <SheetDescription>Full text appears on the public article page when provided.</SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="news-enabled" className="text-sm font-normal cursor-pointer">
                  Visible in feed
                </Label>
                <Switch id="news-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1.5" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tag</Label>
                  <Input className="mt-1.5" value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input className="mt-1.5" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea className="mt-1.5" value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Article body</Label>
                <Textarea
                  className="mt-1.5"
                  rows={8}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="Full text for the public article page. Leave empty to show only the excerpt."
                />
              </div>
              <div>
                <Label>Optional external link</Label>
                <Input
                  className="mt-1.5"
                  value={draft.href}
                  onChange={(e) => setDraft({ ...draft, href: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <ImageInput value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} />
            </div>
          ) : null}
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeSheet}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSheet} disabled={!draft?.title.trim()}>
              Save entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CmsNews;
