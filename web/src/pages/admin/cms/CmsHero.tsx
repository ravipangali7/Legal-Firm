import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, HeroSlide } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { CmsSectionHeader, CmsThumb, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const empty: Omit<HeroSlide, 'id' | 'order'> = {
  title: '',
  subtitle: '',
  cta: 'Learn more',
  href: '/',
  image: '',
  enabled: true,
  eyebrow: '',
  secondaryCta: '',
  secondaryHref: '',
};

function slideDraftFrom(s: HeroSlide): HeroSlide {
  return { ...s };
}

const CmsHero = () => {
  const { slides, addSlide, updateSlide, deleteSlide, moveSlide } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:hero:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<HeroSlide | null>(null);

  const sorted = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const openAdd = () => {
    setEditing('add');
    setDraft({
      id: '',
      order: sorted.length + 1,
      ...empty,
    });
    setSheetOpen(true);
  };

  const openEdit = (s: HeroSlide) => {
    setEditing('edit');
    setDraft(slideDraftFrom(s));
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
      addSlide({
        eyebrow: draft.eyebrow,
        title: draft.title,
        subtitle: draft.subtitle,
        cta: draft.cta,
        href: draft.href || '/',
        secondaryCta: draft.secondaryCta,
        secondaryHref: draft.secondaryHref,
        image: draft.image,
        enabled: draft.enabled,
      });
    } else if (editing === 'edit' && draft.id) {
      updateSlide(draft.id, {
        eyebrow: draft.eyebrow,
        title: draft.title,
        subtitle: draft.subtitle,
        cta: draft.cta,
        href: draft.href,
        secondaryCta: draft.secondaryCta,
        secondaryHref: draft.secondaryHref,
        image: draft.image,
        enabled: draft.enabled,
      });
    }
    closeSheet();
  };

  const renderRow = (s: HeroSlide, layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            layout === 'grid' ? 'flex-col sm:flex-row' : 'flex-row items-start'
          )}
        >
          <CmsThumb src={s.image} alt={s.title} className={layout === 'grid' ? 'h-28 w-full sm:h-24 sm:w-36' : 'h-20 w-32'} />
          <div className="min-w-0 flex-1 space-y-1">
            {s.eyebrow ? (
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{s.eyebrow}</p>
            ) : null}
            <p className="font-semibold leading-snug line-clamp-2">{s.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{s.subtitle || 'No subtitle'}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="font-normal">
                {s.cta}
              </Badge>
              <Badge variant={s.enabled ? 'default' : 'outline'} className="text-[10px] uppercase tracking-wide">
                {s.enabled ? 'Live' : 'Hidden'}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">#{s.order}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveSlide(s.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveSlide(s.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(s)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteSlide(s.id)} aria-label="Delete slide">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card key={s.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col gap-4 p-4">{inner}</div>
        </Card>
      );
    }

    return (
      <Card key={s.id} className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="Hero Slider"
        description="Auto-rotating slides on the homepage. Switch between list and grid, then use Add or Edit to manage each slide."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={openAdd}
        addLabel="Add slide"
      />

      {sorted.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-muted-foreground text-sm">No slides yet. Add a slide to populate the hero.</Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((s) => renderRow(s, 'grid'))}</div>
      ) : (
        <div className="space-y-3">{sorted.map((s) => renderRow(s, 'list'))}</div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing === 'add' ? 'Add slide' : 'Edit slide'}</SheetTitle>
            <SheetDescription>Compose the hero content, then save to store this slide.</SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="hero-enabled" className="text-sm font-normal cursor-pointer">
                  Visible in rotation
                </Label>
                <Switch id="hero-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div>
                <Label>Eyebrow (tag above title)</Label>
                <Input
                  className="mt-1.5"
                  value={draft.eyebrow || ''}
                  onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
                  placeholder="e.g. Tax consultant"
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1.5" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Textarea className="mt-1.5" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} rows={3} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Primary button label</Label>
                  <Input className="mt-1.5" value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
                </div>
                <div>
                  <Label>Primary button link</Label>
                  <Input className="mt-1.5" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Secondary button label</Label>
                  <Input
                    className="mt-1.5"
                    value={draft.secondaryCta || ''}
                    onChange={(e) => setDraft({ ...draft, secondaryCta: e.target.value })}
                    placeholder="Talk to a lawyer"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Secondary button link</Label>
                  <Input
                    className="mt-1.5"
                    value={draft.secondaryHref || ''}
                    onChange={(e) => setDraft({ ...draft, secondaryHref: e.target.value })}
                    placeholder="/contact"
                  />
                </div>
              </div>
              <ImageInput value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Background image" />
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

export default CmsHero;
