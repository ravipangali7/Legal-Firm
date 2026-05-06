import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useCms, ServiceItem } from '@/store/cmsStore';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const ICONS = ['Scale', 'Building2', 'Gavel', 'ShieldCheck', 'BookOpen', 'Calculator', 'Briefcase', 'Globe', 'FileText', 'Users'];
const empty: Omit<ServiceItem, 'id' | 'order'> = { icon: 'Scale', title: '', description: '', href: '/', enabled: true };

const Row = ({ s }: { s: ServiceItem }) => {
  const { updateService, deleteService, moveService } = useCms();
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Switch checked={s.enabled} onCheckedChange={(v) => updateService(s.id, { enabled: v })} /><span className="text-xs text-muted-foreground">#{s.order}</span></div>
        <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => moveService(s.id, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => moveService(s.id, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteService(s.id)}><Trash2 className="h-4 w-4" /></Button></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Title</Label><Input value={s.title} onChange={(e) => updateService(s.id, { title: e.target.value })} /></div>
        <div><Label>Icon</Label>
          <select className="w-full h-10 px-3 rounded-md border bg-background" value={s.icon} onChange={(e) => updateService(s.id, { icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
        </div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea value={s.description} onChange={(e) => updateService(s.id, { description: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Link</Label><Input value={s.href} onChange={(e) => updateService(s.id, { href: e.target.value })} /></div>
      </div>
    </CardContent></Card>
  );
};

const CmsServices = () => {
  const { services, addService } = useCms();
  const [form, setForm] = useState(empty);
  const sorted = [...services].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Services</h2><p className="text-sm text-muted-foreground">Cards shown in the Services grid.</p></div>
      <div className="grid md:grid-cols-2 gap-4">{sorted.map((s) => <Row key={s.id} s={s} />)}</div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add service</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="h-10 px-3 rounded-md border bg-background" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
            <Textarea placeholder="Description" className="md:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="Link" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
          </div>
          <Button onClick={() => { if (form.title) { addService(form); setForm(empty); } }}><Plus className="h-4 w-4 mr-1" /> Add service</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsServices;
