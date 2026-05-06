import { useState } from 'react';
import { useCms, type NavItem } from '@/store/cmsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Edit2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CmsNavigation = () => {
  const { navItems, addNavItem, updateNavItem, deleteNavItem, moveNavItem } = useCms();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: '', href: '/', isDropdown: false, children: [] as { label: string; href: string }[] });

  const sorted = [...navItems].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!form.label.trim()) return;
    addNavItem({ ...form, enabled: true });
    setForm({ label: '', href: '/', isDropdown: false, children: [] });
    setShowAdd(false);
    toast({ title: 'Navigation item added' });
  };

  const addChild = (navId: string) => {
    const item = navItems.find(n => n.id === navId);
    if (!item) return;
    updateNavItem(navId, { children: [...item.children, { label: 'New Link', href: '/' }] });
  };

  const updateChild = (navId: string, idx: number, patch: Partial<{ label: string; href: string }>) => {
    const item = navItems.find(n => n.id === navId);
    if (!item) return;
    const children = item.children.map((c, i) => i === idx ? { ...c, ...patch } : c);
    updateNavItem(navId, { children });
  };

  const removeChild = (navId: string, idx: number) => {
    const item = navItems.find(n => n.id === navId);
    if (!item) return;
    updateNavItem(navId, { children: item.children.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Navigation Manager</h2>
          <p className="text-sm text-muted-foreground">Create, reorder, and manage navigation items. Changes reflect on the public site header.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. About Us" />
              </div>
              <div>
                <Label>URL Path</Label>
                <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/about" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isDropdown} onCheckedChange={(v) => setForm({ ...form, isDropdown: v })} />
              <Label>Has dropdown children</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((item, idx) => (
          <Card key={item.id} className="group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{item.label}</span>
                  <Badge variant="secondary" className="text-xs">{item.href}</Badge>
                  {item.isDropdown && <Badge variant="outline" className="text-xs">Dropdown</Badge>}
                  {!item.enabled && <Badge variant="destructive" className="text-xs">Hidden</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={item.enabled} onCheckedChange={(v) => updateNavItem(item.id, { enabled: v })} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveNavItem(item.id, -1)} disabled={idx === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveNavItem(item.id, 1)} disabled={idx === sorted.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(editingId === item.id ? null : item.id)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteNavItem(item.id); toast({ title: 'Removed' }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingId === item.id && (
                <div className="mt-4 pl-7 space-y-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Label</Label>
                      <Input value={item.label} onChange={(e) => updateNavItem(item.id, { label: e.target.value })} />
                    </div>
                    <div>
                      <Label>URL Path</Label>
                      <Input value={item.href} onChange={(e) => updateNavItem(item.id, { href: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={item.isDropdown} onCheckedChange={(v) => updateNavItem(item.id, { isDropdown: v })} />
                    <Label>Dropdown</Label>
                  </div>
                  {item.isDropdown && (
                    <div className="space-y-2">
                      <Label>Dropdown Items</Label>
                      {item.children.map((child, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <Input value={child.label} onChange={(e) => updateChild(item.id, ci, { label: e.target.value })} placeholder="Label" className="flex-1" />
                          <Input value={child.href} onChange={(e) => updateChild(item.id, ci, { href: e.target.value })} placeholder="/path" className="flex-1" />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeChild(item.id, ci)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addChild(item.id)}><Plus className="h-3 w-3 mr-1" />Add child</Button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        toast({ title: 'Saved', description: 'Navigation changes are applied.' });
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CmsNavigation;
