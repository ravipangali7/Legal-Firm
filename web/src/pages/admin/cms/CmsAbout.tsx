import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useCms } from '@/store/cmsStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import RichTextEditor from '@/components/RichTextEditor';
import { Plus, Trash2 } from 'lucide-react';

const CmsAbout = () => {
  const { about, updateAbout } = useCms();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">About Section</h2><p className="text-sm text-muted-foreground">The intro block on the homepage.</p></div>
        <div className="flex items-center gap-2"><Switch checked={about.enabled} onCheckedChange={(v) => updateAbout({ enabled: v })} /><span className="text-sm">{about.enabled ? 'Visible' : 'Hidden'}</span></div>
      </div>
      <Card>
        <CardContent className="p-5 grid md:grid-cols-2 gap-4">
          <div><Label>Eyebrow</Label><Input value={about.eyebrow} onChange={(e) => updateAbout({ eyebrow: e.target.value })} /></div>
          <div><Label>Title</Label><Input value={about.title} onChange={(e) => updateAbout({ title: e.target.value })} /></div>
          <div className="md:col-span-2">
            <Label>Body</Label>
            <RichTextEditor value={about.body} onChange={(v) => updateAbout({ body: v })} />
          </div>
          <div className="md:col-span-2"><ImageInput value={about.image} onChange={(v) => updateAbout({ image: v })} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {about.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5"><Label>Label</Label><Input value={s.label} onChange={(e) => updateAbout({ stats: about.stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /></div>
              <div className="col-span-5"><Label>Value</Label><Input value={s.value} onChange={(e) => updateAbout({ stats: about.stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} /></div>
              <div className="col-span-2"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => updateAbout({ stats: about.stats.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateAbout({ stats: [...about.stats, { label: 'New stat', value: '0' }] })}><Plus className="h-4 w-4 mr-1" /> Add stat</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsAbout;
