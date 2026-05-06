import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { FooterCfg } from '@/store/cmsStore';
import { Plus, Trash2 } from 'lucide-react';

export interface FooterCmsFormProps {
  footer: FooterCfg;
  onUpdate: (patch: Partial<FooterCfg>) => void;
}

/** Footer copy and links for Homepage CMS → Footer (`/admin/cms/footer`). Site logo and name come from Settings → General. */
const FooterCmsForm = ({ footer, onUpdate }: FooterCmsFormProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Tagline</Label>
            <Textarea value={footer.tagline} onChange={(e) => onUpdate({ tagline: e.target.value })} />
          </div>
          <div>
            <Label>Copyright</Label>
            <Input value={footer.copyright} onChange={(e) => onUpdate({ copyright: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {footer.columns.map((col, ci) => (
        <Card key={col.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Column: {col.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => onUpdate({ columns: footer.columns.filter((_, i) => i !== ci) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={col.title}
                onChange={(e) =>
                  onUpdate({
                    columns: footer.columns.map((c, i) => (i === ci ? { ...c, title: e.target.value } : c)),
                  })
                }
              />
            </div>
            {col.links.map((l, li) => (
              <div key={li} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-5"
                  placeholder="Label"
                  value={l.label}
                  onChange={(e) =>
                    onUpdate({
                      columns: footer.columns.map((c, i) =>
                        i === ci
                          ? {
                              ...c,
                              links: c.links.map((x, j) => (j === li ? { ...x, label: e.target.value } : x)),
                            }
                          : c
                      ),
                    })
                  }
                />
                <Input
                  className="col-span-6"
                  placeholder="/href"
                  value={l.href}
                  onChange={(e) =>
                    onUpdate({
                      columns: footer.columns.map((c, i) =>
                        i === ci
                          ? {
                              ...c,
                              links: c.links.map((x, j) => (j === li ? { ...x, href: e.target.value } : x)),
                            }
                          : c
                      ),
                    })
                  }
                />
                <div className="col-span-1 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      onUpdate({
                        columns: footer.columns.map((c, i) =>
                          i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onUpdate({
                  columns: footer.columns.map((c, i) =>
                    i === ci ? { ...c, links: [...c.links, { label: 'New', href: '/' }] } : c
                  ),
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add link
            </Button>
          </CardContent>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          onUpdate({
            columns: [...footer.columns, { id: `c_${Date.now()}`, title: 'New column', links: [] }],
          })
        }
      >
        <Plus className="h-4 w-4 mr-1" /> Add column
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {footer.social.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-5"
                value={s.label}
                onChange={(e) =>
                  onUpdate({
                    social: footer.social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
              <Input
                className="col-span-6"
                value={s.href}
                onChange={(e) =>
                  onUpdate({
                    social: footer.social.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)),
                  })
                }
              />
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onUpdate({ social: footer.social.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onUpdate({ social: [...footer.social, { label: 'New', href: '#' }] })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FooterCmsForm;
