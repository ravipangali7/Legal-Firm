import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, type TestimonialItem } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { CmsSectionHeader, CmsThumb, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

const empty: Omit<TestimonialItem, 'id' | 'order'> = {
  name: '',
  roleTitle: '',
  content: '',
  rating: 5,
  image: '',
  enabled: true,
};

function testimonialDraftFrom(t: TestimonialItem): TestimonialItem {
  return { ...t };
}

const CmsTestimonials = () => {
  const { testimonials, updateTestimonials, addTestimonial, updateTestimonial, deleteTestimonial, moveTestimonial } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:testimonials:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<TestimonialItem | null>(null);

  const sorted = useMemo(() => [...testimonials.items].sort((a, b) => a.order - b.order), [testimonials.items]);
  const metrics = testimonials.metrics || [];

  const openAdd = () => {
    setEditing('add');
    setDraft({
      id: '',
      order: sorted.length + 1,
      ...empty,
    });
    setSheetOpen(true);
  };

  const openEdit = (t: TestimonialItem) => {
    setEditing('edit');
    setDraft(testimonialDraftFrom(t));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
    setDraft(null);
  };

  const saveSheet = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.content.trim()) return;
    if (editing === 'add') {
      addTestimonial({
        name: draft.name,
        roleTitle: draft.roleTitle,
        content: draft.content,
        rating: draft.rating,
        image: draft.image,
        enabled: draft.enabled,
      });
    } else if (editing === 'edit' && draft.id) {
      updateTestimonial(draft.id, {
        name: draft.name,
        roleTitle: draft.roleTitle,
        content: draft.content,
        rating: draft.rating,
        image: draft.image,
        enabled: draft.enabled,
      });
    }
    closeSheet();
  };

  const renderRow = (t: TestimonialItem, layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            layout === 'grid' ? 'flex-col sm:flex-row sm:items-start' : 'flex-row items-start'
          )}
        >
          <CmsThumb src={t.image} alt={t.name} className={layout === 'grid' ? 'h-24 w-full sm:h-20 sm:w-20 rounded-full sm:rounded-lg' : 'h-14 w-14 rounded-full'} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium truncate">{t.name || 'Unnamed'}</p>
              <Badge variant="secondary" className="tabular-nums font-normal">
                {t.rating}/5
              </Badge>
              <Badge variant={t.enabled ? 'default' : 'outline'} className="text-[10px] uppercase tracking-wide">
                {t.enabled ? 'Live' : 'Off'}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">#{t.order}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{t.roleTitle || 'No role'}</p>
            <p className="text-sm text-muted-foreground line-clamp-3 italic">{`"${t.content}"`}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveTestimonial(t.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveTestimonial(t.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(t)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTestimonial(t.id)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card key={t.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col gap-4 p-4">{inner}</div>
        </Card>
      );
    }

    return (
      <Card key={t.id} className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="Testimonials"
        description='Homepage "What Our Clients Say" cards and summary stats. Configure the section below, manage quotes in list or grid, then Save to publish.'
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={openAdd}
        addLabel="Add testimonial"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Section heading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1.5"
                value={testimonials.title}
                onChange={(e) => updateTestimonials({ title: e.target.value })}
                placeholder="What Our Clients Say"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea
                className="mt-1.5"
                value={testimonials.intro}
                onChange={(e) => updateTestimonials({ intro: e.target.value })}
                rows={3}
                placeholder="Trusted by businesses…"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Summary stats bar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={m.value}
                    onChange={(e) =>
                      updateTestimonials({
                        metrics: metrics.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                      })
                    }
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={m.label}
                    onChange={(e) =>
                      updateTestimonials({
                        metrics: metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive sm:mb-0.5"
                  onClick={() => updateTestimonials({ metrics: metrics.filter((_, j) => j !== i) })}
                  aria-label="Remove stat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => updateTestimonials({ metrics: [...metrics, { value: '0', label: 'New stat' }] })}
            >
              <Plus className="h-4 w-4 mr-1" /> Add stat
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Client quotes</h3>
        {sorted.length === 0 ? (
          <Card className="border-dashed p-10 text-center text-muted-foreground text-sm">No testimonials yet.</Card>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((t) => renderRow(t, 'grid'))}</div>
        ) : (
          <div className="space-y-3">{sorted.map((t) => renderRow(t, 'list'))}</div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing === 'add' ? 'Add testimonial' : 'Edit testimonial'}</SheetTitle>
            <SheetDescription>Quotes appear in the rotating testimonial cards.</SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="tm-enabled" className="text-sm font-normal cursor-pointer">
                  Show on homepage
                </Label>
                <Switch id="tm-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-1.5" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label>Role / company</Label>
                <Input className="mt-1.5" value={draft.roleTitle} onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })} />
              </div>
              <div>
                <Label>Rating (1–5)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={1}
                  max={5}
                  value={draft.rating}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setDraft({ ...draft, rating: Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5 });
                  }}
                />
              </div>
              <div>
                <Label>Quote</Label>
                <Textarea className="mt-1.5" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={4} />
              </div>
              <ImageInput value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} label="Photo or logo" />
            </div>
          ) : null}
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeSheet}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSheet} disabled={!draft?.name.trim() || !draft?.content.trim()}>
              Save entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CmsTestimonials;
