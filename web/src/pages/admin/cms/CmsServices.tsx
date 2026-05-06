import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, ServiceItem } from '@/store/cmsStore';
import { CmsSectionHeader, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const ICONS = ['Scale', 'Building2', 'Gavel', 'ShieldCheck', 'BookOpen', 'Calculator', 'Briefcase', 'Globe', 'FileText', 'Users'];
const empty: Omit<ServiceItem, 'id' | 'order'> = { icon: 'Scale', title: '', description: '', href: '/', enabled: true };

function serviceDraftFromItem(s: ServiceItem): ServiceItem {
  return { ...s };
}

const CmsServices = () => {
  const { services, addService, updateService, deleteService, moveService } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:services:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<ServiceItem | null>(null);

  const sorted = useMemo(() => [...services].sort((a, b) => a.order - b.order), [services]);

  const openAdd = () => {
    setEditing('add');
    setDraft({
      id: '',
      order: sorted.length + 1,
      ...empty,
    });
    setSheetOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditing('edit');
    setDraft(serviceDraftFromItem(s));
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
      addService({
        icon: draft.icon,
        title: draft.title,
        description: draft.description,
        href: draft.href || '/',
        enabled: draft.enabled,
      });
    } else if (editing === 'edit' && draft.id) {
      updateService(draft.id, {
        icon: draft.icon,
        title: draft.title,
        description: draft.description,
        href: draft.href,
        enabled: draft.enabled,
      });
    }
    closeSheet();
  };

  const renderRow = (s: ServiceItem, layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            layout === 'grid' ? 'flex-col sm:flex-row sm:items-start' : 'flex-row items-center'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground font-semibold tabular-nums',
              layout === 'grid' ? 'h-14 w-full sm:h-16 sm:w-16 shrink-0 text-sm' : 'h-12 w-12 shrink-0 text-xs'
            )}
            aria-hidden
          >
            #{s.order}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium leading-tight truncate">{s.title || 'Untitled service'}</p>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {s.icon}
              </Badge>
              <Badge variant={s.enabled ? 'default' : 'outline'} className="shrink-0 text-[10px] uppercase tracking-wide">
                {s.enabled ? 'Live' : 'Off'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{s.description || 'No description'}</p>
            <p className="text-xs text-muted-foreground truncate">{s.href}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveService(s.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveService(s.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(s)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteService(s.id)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card key={s.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col p-4 gap-4">{inner}</div>
        </Card>
      );
    }

    return (
      <Card key={s.id} className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="Services"
        description="Cards shown in the Services grid on the homepage. Use list or grid to browse entries, then Add or Edit to change details."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={openAdd}
        addLabel="Add service"
      />

      {sorted.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-muted-foreground text-sm">No services yet. Add one to get started.</Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((s) => renderRow(s, 'grid'))}</div>
      ) : (
        <div className="space-y-3">{sorted.map((s) => renderRow(s, 'list'))}</div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing === 'add' ? 'Add service' : 'Edit service'}</SheetTitle>
            <SheetDescription>Update fields below, then save to apply this entry.</SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="svc-enabled" className="text-sm font-normal cursor-pointer">
                  Visible on homepage
                </Label>
                <Switch id="svc-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1.5" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Service name" />
              </div>
              <div>
                <Label>Icon</Label>
                <select
                  className="mt-1.5 w-full h-10 px-3 rounded-md border bg-background"
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                >
                  {ICONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea className="mt-1.5" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} />
              </div>
              <div>
                <Label>Link</Label>
                <Input className="mt-1.5" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} placeholder="/path" />
              </div>
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

export default CmsServices;
