import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, type AboutSection } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import RichTextEditor from '@/components/RichTextEditor';
import { CmsSectionHeader, CmsThumb, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Plus, Trash2 } from 'lucide-react';

function bodyPreviewPlain(html: string, maxLen = 180): string {
  const t = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t || 'No body text yet.';
  return `${t.slice(0, maxLen)}…`;
}

function cloneAbout(a: AboutSection): AboutSection {
  return {
    ...a,
    stats: a.stats.map((s) => ({ ...s })),
  };
}

const CmsAbout = () => {
  const { about, updateAbout } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:about:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<AboutSection | null>(null);

  const statSummary = useMemo(
    () =>
      about.stats.length === 0
        ? 'No stats'
        : about.stats.map((s) => `${s.value} ${s.label}`).join(' · '),
    [about.stats],
  );

  const openEdit = () => {
    setDraft(cloneAbout(about));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraft(null);
  };

  const saveSheet = () => {
    if (!draft) return;
    if (!draft.title.trim()) return;
    updateAbout(draft);
    closeSheet();
  };

  const renderListing = (layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-4',
            layout === 'grid' ? 'flex-col' : 'flex-row items-start',
          )}
        >
          <CmsThumb
            src={about.image}
            alt={about.title}
            className={layout === 'grid' ? 'aspect-[4/3] w-full max-h-56' : 'h-24 w-40 sm:h-28 sm:w-44'}
          />
          <div className="min-w-0 flex-1 space-y-2">
            {about.eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{about.eyebrow}</p>
            ) : null}
            <p className="font-semibold text-lg leading-snug line-clamp-2">{about.title || 'Untitled'}</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{bodyPreviewPlain(about.body)}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{statSummary}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={about.enabled ? 'default' : 'outline'} className="text-[10px] uppercase tracking-wide">
                {about.enabled ? 'Visible on site' : 'Hidden'}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {about.stats.length} stat{about.stats.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="sm" variant="secondary" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit section
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col gap-4 p-5">{inner}</div>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="About section"
        description="Homepage intro and the About page hero: eyebrow, title, rich body, featured image, and stat chips. Use list or grid to preview layout, then Edit section to change content. Save publishes to the server."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'grid' ? (
        <div className="max-w-3xl">{renderListing('grid')}</div>
      ) : (
        <div className="space-y-3">{renderListing('list')}</div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>Edit about section</SheetTitle>
            <SheetDescription>
              This block appears on the homepage and mirrors the top of the public About page. Upload an image, then use Save in the header to push all homepage changes to the server.
            </SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="about-enabled" className="text-sm font-normal cursor-pointer">
                  Visible on homepage & About page
                </Label>
                <Switch id="about-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div>
                <Label>Eyebrow</Label>
                <Input className="mt-1.5" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} placeholder="Who we are" />
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1.5" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label>Body</Label>
                <div className="mt-1.5">
                  <RichTextEditor value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
                </div>
              </div>
              <ImageInput value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Featured image" />
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="text-sm font-medium">Stats</div>
                <p className="text-xs text-muted-foreground">Short metrics shown beside the copy (e.g. Years, Clients).</p>
                {draft.stats.map((s, i) => (
                  <div key={s.id ?? i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="mt-1"
                        value={s.label}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            stats: draft.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-5">
                      <Label className="text-xs">Value</Label>
                      <Input
                        className="mt-1"
                        value={s.value}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            stats: draft.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => setDraft({ ...draft, stats: draft.stats.filter((_, j) => j !== i) })}
                        aria-label="Remove stat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft({ ...draft, stats: [...draft.stats, { label: 'New stat', value: '0' }] })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add stat
                </Button>
              </div>
            </div>
          ) : null}
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeSheet}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSheet} disabled={!draft?.title.trim()}>
              Save section
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CmsAbout;
