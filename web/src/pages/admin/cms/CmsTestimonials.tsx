import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useCms, type TestimonialItem } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const empty: Omit<TestimonialItem, 'id' | 'order'> = {
  name: '',
  roleTitle: '',
  content: '',
  rating: 5,
  image: '',
  enabled: true,
};

const Row = ({ t }: { t: TestimonialItem }) => {
  const { updateTestimonial, deleteTestimonial, moveTestimonial } = useCms();
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={t.enabled} onCheckedChange={(v) => updateTestimonial(t.id, { enabled: v })} />
            <span className="text-xs text-muted-foreground">#{t.order}</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => moveTestimonial(t.id, -1)}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => moveTestimonial(t.id, 1)}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteTestimonial(t.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={t.name} onChange={(e) => updateTestimonial(t.id, { name: e.target.value })} />
          </div>
          <div>
            <Label>Role / company</Label>
            <Input value={t.roleTitle} onChange={(e) => updateTestimonial(t.id, { roleTitle: e.target.value })} />
          </div>
          <div>
            <Label>Rating (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={t.rating}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                updateTestimonial(t.id, { rating: Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5 });
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Quote</Label>
            <Textarea value={t.content} onChange={(e) => updateTestimonial(t.id, { content: e.target.value })} rows={3} />
          </div>
          <div className="md:col-span-2">
            <ImageInput value={t.image} onChange={(v) => updateTestimonial(t.id, { image: v })} label="Photo or logo" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CmsTestimonials = () => {
  const { testimonials, updateTestimonials, addTestimonial } = useCms();
  const [form, setForm] = useState(empty);
  const sorted = [...testimonials.items].sort((a, b) => a.order - b.order);
  const metrics = testimonials.metrics || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Testimonials</h2>
        <p className="text-sm text-muted-foreground">Homepage “What Our Clients Say” cards and summary stats.</p>
      </div>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Section heading</Label>
            <Input
              value={testimonials.title}
              onChange={(e) => updateTestimonials({ title: e.target.value })}
              placeholder="What Our Clients Say"
            />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea
              value={testimonials.intro}
              onChange={(e) => updateTestimonials({ intro: e.target.value })}
              rows={2}
              placeholder="Trusted by businesses…"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary stats bar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <Label>Value</Label>
                <Input
                  value={m.value}
                  onChange={(e) =>
                    updateTestimonials({
                      metrics: metrics.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    })
                  }
                />
              </div>
              <div className="col-span-5">
                <Label>Label</Label>
                <Input
                  value={m.label}
                  onChange={(e) =>
                    updateTestimonials({
                      metrics: metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    })
                  }
                />
              </div>
              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => updateTestimonials({ metrics: metrics.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateTestimonials({ metrics: [...metrics, { value: '0', label: 'New stat' }] })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add stat
          </Button>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">{sorted.map((t) => <Row key={t.id} t={t} />)}</div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add testimonial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Role, company" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} />
          <Textarea placeholder="Quote" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} />
          <Input
            type="number"
            min={1}
            max={5}
            placeholder="Rating"
            value={form.rating}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setForm({ ...form, rating: Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5 });
            }}
          />
          <ImageInput value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
          <Button
            onClick={() => {
              if (form.name.trim() && form.content.trim()) {
                addTestimonial(form);
                setForm(empty);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add testimonial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsTestimonials;
