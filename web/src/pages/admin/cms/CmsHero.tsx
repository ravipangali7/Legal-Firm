import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCms, HeroSlide } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const empty: Omit<HeroSlide, 'id' | 'order'> = {
  title: '', subtitle: '', cta: 'Learn more', href: '/', image: '', enabled: true,
  eyebrow: '', secondaryCta: '', secondaryHref: '',
};

const SlideRow = ({ s }: { s: HeroSlide }) => {
  const { updateSlide, deleteSlide, moveSlide } = useCms();
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={s.enabled} onCheckedChange={(v) => updateSlide(s.id, { enabled: v })} />
            <span className="text-xs text-muted-foreground">{s.enabled ? 'Visible' : 'Hidden'} · #{s.order}</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => moveSlide(s.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => moveSlide(s.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteSlide(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Eyebrow (tag above title)</Label><Input value={s.eyebrow || ''} onChange={(e) => updateSlide(s.id, { eyebrow: e.target.value })} placeholder="e.g. Tax consultant" /></div>
          <div><Label>Title</Label><Input value={s.title} onChange={(e) => updateSlide(s.id, { title: e.target.value })} /></div>
          <div><Label>Primary button label</Label><Input value={s.cta} onChange={(e) => updateSlide(s.id, { cta: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Subtitle</Label><Textarea value={s.subtitle} onChange={(e) => updateSlide(s.id, { subtitle: e.target.value })} /></div>
          <div><Label>Primary button link</Label><Input value={s.href} onChange={(e) => updateSlide(s.id, { href: e.target.value })} /></div>
          <div><Label>Secondary button label</Label><Input value={s.secondaryCta || ''} onChange={(e) => updateSlide(s.id, { secondaryCta: e.target.value })} placeholder="Talk to a lawyer" /></div>
          <div className="md:col-span-2"><Label>Secondary button link</Label><Input value={s.secondaryHref || ''} onChange={(e) => updateSlide(s.id, { secondaryHref: e.target.value })} placeholder="/contact" /></div>
          <div className="md:col-span-2">
            <ImageInput value={s.image} onChange={(v) => updateSlide(s.id, { image: v })} label="Background image" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CmsHero = () => {
  const { slides, addSlide } = useCms();
  const [form, setForm] = useState(empty);
  const sorted = [...slides].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Hero Slider</h2>
          <p className="text-sm text-muted-foreground">Auto-rotating slides on the homepage.</p>
        </div>
      </div>
      {sorted.map((s) => <SlideRow key={s.id} s={s} />)}
      <Card>
        <CardHeader><CardTitle className="text-base">Add new slide</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Button label" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
            <Textarea placeholder="Subtitle" className="md:col-span-2" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <Input placeholder="Button link (e.g. /about)" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
          </div>
          <ImageInput value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
          <Button onClick={() => { if (form.title) { addSlide(form); setForm(empty); } }}><Plus className="h-4 w-4 mr-1" /> Add slide</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsHero;
