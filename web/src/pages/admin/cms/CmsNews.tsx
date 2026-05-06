import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useCms, NewsItem } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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

const Row = ({ n }: { n: NewsItem }) => {
  const { updateNews, deleteNews, moveNews } = useCms();
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Switch checked={n.enabled} onCheckedChange={(v) => updateNews(n.id, { enabled: v })} /><span className="text-xs text-muted-foreground">#{n.order}</span></div>
        <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => moveNews(n.id, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => moveNews(n.id, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteNews(n.id)}><Trash2 className="h-4 w-4" /></Button></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><Label>Title</Label><Input value={n.title} onChange={(e) => updateNews(n.id, { title: e.target.value })} /></div>
        <div><Label>Tag</Label><Input value={n.tag} onChange={(e) => updateNews(n.id, { tag: e.target.value })} /></div>
        <div><Label>Date</Label><Input type="date" value={n.date} onChange={(e) => updateNews(n.id, { date: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Excerpt</Label><Textarea value={n.excerpt} onChange={(e) => updateNews(n.id, { excerpt: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Article body</Label><Textarea rows={8} value={n.body} onChange={(e) => updateNews(n.id, { body: e.target.value })} placeholder="Full text for the public article page. Leave empty to show only the excerpt." /></div>
        <div><Label>Optional external link</Label><Input value={n.href} onChange={(e) => updateNews(n.id, { href: e.target.value })} placeholder="https://… (shown on the article page)" /></div>
        <div className="md:col-span-2"><ImageInput value={n.image} onChange={(v) => updateNews(n.id, { image: v })} /></div>
      </div>
    </CardContent></Card>
  );
};

const CmsNews = () => {
  const { news, addNews } = useCms();
  const [form, setForm] = useState(empty);
  const sorted = [...news].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">News & Events</h2><p className="text-sm text-muted-foreground">Articles shown in the News section.</p></div>
      <div className="grid md:grid-cols-2 gap-4">{sorted.map((n) => <Row key={n.id} n={n} />)}</div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add news</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Textarea placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <Textarea placeholder="Article body (optional)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} />
          <Input placeholder="Optional external link (https://…)" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
          <ImageInput value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
          <Button onClick={() => { if (form.title) { addNews(form); setForm(empty); } }}><Plus className="h-4 w-4 mr-1" /> Add news</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsNews;
