import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCms, SectionToggles } from '@/store/cmsStore';

const labels: Record<keyof SectionToggles, string> = {
  hero: 'Hero slider',
  about: 'About',
  services: 'Services',
  team: 'Team',
  news: 'News & Events',
  testimonials: 'Testimonials',
  footer: 'Footer',
  procedures: 'Procedures block',
};

const CmsSections = () => {
  const { toggles, toggleSection, sectionStyles, updateSectionStyle } = useCms();
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Section Visibility & Styling</h2><p className="text-sm text-muted-foreground">Show or hide sections and customize their container styling.</p></div>
      <div className="space-y-4">
        {(Object.keys(labels) as (keyof SectionToggles)[]).map((k) => {
          const style = sectionStyles?.[k] || {};
          return (
            <Card key={k}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div><div className="font-medium text-base">{labels[k]}</div><div className="text-xs text-muted-foreground">{toggles[k] ? 'Visible on homepage' : 'Hidden'}</div></div>
                  <Switch checked={toggles[k]} onCheckedChange={(v) => toggleSection(k, v)} />
                </div>
                {toggles[k] && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                    <div><Label className="text-xs">Min Height (px)</Label><Input type="number" value={style.minHeight || ''} onChange={(e) => updateSectionStyle(k, { minHeight: e.target.value })} placeholder="auto" /></div>
                    <div><Label className="text-xs">Max Width (px)</Label><Input type="number" value={style.maxWidth || ''} onChange={(e) => updateSectionStyle(k, { maxWidth: e.target.value })} placeholder="full" /></div>
                    <div>
                      <Label className="text-xs">Border</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Switch checked={style.hasBorder || false} onCheckedChange={(v) => updateSectionStyle(k, { hasBorder: v })} />
                        <span className="text-xs text-muted-foreground">{style.hasBorder ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div><Label className="text-xs">Border Color</Label><Input type="color" value={style.borderColor || '#e5e7eb'} onChange={(e) => updateSectionStyle(k, { borderColor: e.target.value })} disabled={!style.hasBorder} /></div>
                    <div><Label className="text-xs">Padding (px)</Label><Input type="number" value={style.padding || ''} onChange={(e) => updateSectionStyle(k, { padding: e.target.value })} placeholder="0" /></div>
                    <div><Label className="text-xs">Background Color</Label><Input type="color" value={style.bgColor || '#ffffff'} onChange={(e) => updateSectionStyle(k, { bgColor: e.target.value })} /></div>
                    <div><Label className="text-xs">Border Radius (px)</Label><Input type="number" value={style.borderRadius || ''} onChange={(e) => updateSectionStyle(k, { borderRadius: e.target.value })} placeholder="0" /></div>
                    <div><Label className="text-xs">Border Width (px)</Label><Input type="number" value={style.borderWidth || '1'} onChange={(e) => updateSectionStyle(k, { borderWidth: e.target.value })} disabled={!style.hasBorder} /></div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CmsSections;
