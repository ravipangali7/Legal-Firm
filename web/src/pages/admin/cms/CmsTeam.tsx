import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCms, TeamMember } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { CmsSectionHeader, CmsThumb, type CmsViewMode } from '@/components/admin/cms/CmsSectionHeader';
import { useCmsViewMode } from '@/hooks/useCmsViewMode';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const empty: Omit<TeamMember, 'id' | 'order'> = {
  name: '',
  role: '',
  bio: '',
  avatar: '',
  experienceYears: 0,
  enabled: true,
  linkedinUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  contactEmail: '',
};

function parseExperienceYears(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(32767, n);
}

function memberDraftFrom(m: TeamMember): TeamMember {
  return { ...m };
}

const CmsTeam = () => {
  const { team, addMember, updateMember, deleteMember, moveMember } = useCms();
  const { viewMode, setViewMode } = useCmsViewMode('cms:team:view');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<TeamMember | null>(null);

  const sorted = useMemo(() => [...team].sort((a, b) => a.order - b.order), [team]);

  const openAdd = () => {
    setEditing('add');
    setDraft({
      id: '',
      order: sorted.length + 1,
      ...empty,
    });
    setSheetOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing('edit');
    setDraft(memberDraftFrom(m));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
    setDraft(null);
  };

  const saveSheet = () => {
    if (!draft) return;
    if (!draft.name.trim()) return;
    if (editing === 'add') {
      addMember({
        name: draft.name,
        role: draft.role,
        bio: draft.bio,
        avatar: draft.avatar,
        experienceYears: draft.experienceYears,
        enabled: draft.enabled,
        linkedinUrl: draft.linkedinUrl,
        facebookUrl: draft.facebookUrl,
        twitterUrl: draft.twitterUrl,
        instagramUrl: draft.instagramUrl,
        contactEmail: draft.contactEmail,
      });
    } else if (editing === 'edit' && draft.id) {
      updateMember(draft.id, {
        name: draft.name,
        role: draft.role,
        bio: draft.bio,
        avatar: draft.avatar,
        experienceYears: draft.experienceYears,
        enabled: draft.enabled,
        linkedinUrl: draft.linkedinUrl,
        facebookUrl: draft.facebookUrl,
        twitterUrl: draft.twitterUrl,
        instagramUrl: draft.instagramUrl,
        contactEmail: draft.contactEmail,
      });
    }
    closeSheet();
  };

  const renderRow = (m: TeamMember, layout: CmsViewMode) => {
    const inner = (
      <>
        <div
          className={cn(
            'flex min-w-0 flex-1 gap-3',
            layout === 'grid' ? 'flex-col sm:flex-row sm:items-start' : 'flex-row items-center'
          )}
        >
          <CmsThumb src={m.avatar} alt={m.name} className={layout === 'grid' ? 'h-28 w-full sm:h-24 sm:w-24 rounded-full sm:rounded-lg' : 'h-14 w-14 rounded-full'} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium truncate">{m.name || 'Untitled member'}</p>
              <span className="text-xs text-muted-foreground tabular-nums">#{m.order}</span>
              <Badge variant={m.enabled ? 'default' : 'outline'} className="text-[10px] uppercase tracking-wide">
                {m.enabled ? 'Live' : 'Off'}
              </Badge>
              {m.experienceYears > 0 ? (
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {m.experienceYears} yrs
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground truncate">{m.role || 'No role set'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{m.bio || '—'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveMember(m.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveMember(m.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(m)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMember(m.id)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );

    if (layout === 'grid') {
      return (
        <Card key={m.id} className="overflow-hidden border-border/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full flex-col gap-4 p-4">{inner}</div>
        </Card>
      );
    }

    return (
      <Card key={m.id} className="overflow-hidden border-border/80 shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">{inner}</div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <CmsSectionHeader
        title="Team"
        description="People shown in the Team section. Use list or grid to scan the roster, Add for a new profile, or Edit to update details."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={openAdd}
        addLabel="Add member"
      />

      {sorted.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-muted-foreground text-sm">No team members yet.</Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((m) => renderRow(m, 'grid'))}</div>
      ) : (
        <div className="space-y-3">{sorted.map((m) => renderRow(m, 'list'))}</div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editing === 'add' ? 'Add team member' : 'Edit team member'}</SheetTitle>
            <SheetDescription>Profile details appear on the homepage team section.</SheetDescription>
          </SheetHeader>
          {draft ? (
            <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Label htmlFor="team-enabled" className="text-sm font-normal cursor-pointer">
                  Published on site
                </Label>
                <Switch id="team-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input className="mt-1.5" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input className="mt-1.5" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  max={32767}
                  inputMode="numeric"
                  value={draft.experienceYears}
                  onChange={(e) => setDraft({ ...draft, experienceYears: parseExperienceYears(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">Included in the combined total on the Professionals page.</p>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea className="mt-1.5" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} rows={4} />
              </div>
              <ImageInput label="Avatar" value={draft.avatar} onChange={(v) => setDraft({ ...draft, avatar: v })} />
              <div>
                <Label>Email (contact)</Label>
                <Input
                  className="mt-1.5"
                  type="email"
                  placeholder="name@firm.com"
                  value={draft.contactEmail}
                  onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>LinkedIn URL</Label>
                  <Input className="mt-1.5" placeholder="https://linkedin.com/in/…" value={draft.linkedinUrl} onChange={(e) => setDraft({ ...draft, linkedinUrl: e.target.value })} />
                </div>
                <div>
                  <Label>Facebook URL</Label>
                  <Input className="mt-1.5" placeholder="https://facebook.com/…" value={draft.facebookUrl} onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })} />
                </div>
                <div>
                  <Label>X / Twitter URL</Label>
                  <Input className="mt-1.5" placeholder="https://x.com/…" value={draft.twitterUrl} onChange={(e) => setDraft({ ...draft, twitterUrl: e.target.value })} />
                </div>
                <div>
                  <Label>Instagram URL</Label>
                  <Input className="mt-1.5" placeholder="https://instagram.com/…" value={draft.instagramUrl} onChange={(e) => setDraft({ ...draft, instagramUrl: e.target.value })} />
                </div>
              </div>
            </div>
          ) : null}
          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeSheet}>
              Cancel
            </Button>
            <Button type="button" onClick={saveSheet} disabled={!draft?.name.trim()}>
              Save entry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CmsTeam;
