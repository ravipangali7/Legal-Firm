import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCms, TeamMember } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';

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

const Row = ({ m }: { m: TeamMember }) => {
  const { updateMember, deleteMember, moveMember } = useCms();
  return (
    <Collapsible className="group rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={m.name ? `Expand details for ${m.name}` : 'Expand member details'}
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
          </Button>
        </CollapsibleTrigger>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium truncate">{m.name || 'Untitled member'}</span>
            <span className="text-xs text-muted-foreground tabular-nums">#{m.order}</span>
            {m.experienceYears > 0 ? (
              <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground shrink-0">
                {m.experienceYears} yrs
              </span>
            ) : null}
          </div>
          {m.role ? (
            <p className="text-sm text-muted-foreground truncate">{m.role}</p>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">No role set</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 pr-1 border-r border-border mr-0.5">
            <Switch
              checked={m.enabled}
              onCheckedChange={(v) => updateMember(m.id, { enabled: v })}
              aria-label={m.enabled ? 'Published' : 'Hidden'}
            />
            <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
              {m.enabled ? 'Live' : 'Off'}
            </span>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveMember(m.id, -1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveMember(m.id, 1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteMember(m.id)}
            aria-label="Delete member"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="border-t border-border px-3 py-4 sm:px-4 space-y-4 bg-muted/20">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })} />
            </div>
            <div>
              <Label>Experience Year</Label>
              <Input
                type="number"
                min={0}
                max={32767}
                inputMode="numeric"
                value={m.experienceYears}
                onChange={(e) => updateMember(m.id, { experienceYears: parseExperienceYears(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">Years in practice; included in the combined total on the Professionals page.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Bio</Label>
              <Textarea value={m.bio} onChange={(e) => updateMember(m.id, { bio: e.target.value })} rows={4} />
            </div>
            <div className="sm:col-span-2">
              <ImageInput label="Avatar" value={m.avatar} onChange={(v) => updateMember(m.id, { avatar: v })} />
            </div>
            <div>
              <Label>Email (contact)</Label>
              <Input
                type="email"
                placeholder="name@firm.com"
                value={m.contactEmail}
                onChange={(e) => updateMember(m.id, { contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input
                placeholder="https://linkedin.com/in/…"
                value={m.linkedinUrl}
                onChange={(e) => updateMember(m.id, { linkedinUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Facebook URL</Label>
              <Input
                placeholder="https://facebook.com/…"
                value={m.facebookUrl}
                onChange={(e) => updateMember(m.id, { facebookUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>X / Twitter URL</Label>
              <Input
                placeholder="https://x.com/…"
                value={m.twitterUrl}
                onChange={(e) => updateMember(m.id, { twitterUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Instagram URL</Label>
              <Input
                placeholder="https://instagram.com/…"
                value={m.instagramUrl}
                onChange={(e) => updateMember(m.id, { instagramUrl: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const CmsTeam = () => {
  const { team, addMember } = useCms();
  const [form, setForm] = useState(empty);
  const sorted = [...team].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Team</h2>
        <p className="text-sm text-muted-foreground">People shown in the Team section. Expand a row to edit details.</p>
      </div>
      <div className="max-w-3xl space-y-2">
        {sorted.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Experience Year</Label>
              <Input
                type="number"
                min={0}
                max={32767}
                className="mt-1"
                inputMode="numeric"
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: parseExperienceYears(e.target.value) })}
              />
            </div>
            <Textarea placeholder="Bio" className="sm:col-span-2" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <ImageInput label="Avatar" value={form.avatar} onChange={(v) => setForm({ ...form, avatar: v })} />
          <Button
            onClick={() => {
              if (form.name) {
                addMember(form);
                setForm(empty);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add member
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsTeam;
