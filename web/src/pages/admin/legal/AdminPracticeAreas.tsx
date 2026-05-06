import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminPracticeArea,
  fetchAdminPracticeAreas,
  patchAdminPracticeArea,
  postAdminPracticeArea,
  type PracticeAreaAdminApi,
} from '@/lib/api';
import { practiceAreasQueryKey } from '@/lib/practiceAreasQuery';
import { slugify } from '@/lib/slugify';

type ServicePreviewForm = { label: string; value: string };

type PracticeAreaServiceForm = {
  id: string;
  title: string;
  description: string;
  details: string[];
  previews: ServicePreviewForm[];
};

function emptyService(): PracticeAreaServiceForm {
  return { id: '', title: '', description: '', details: [], previews: [] };
}

function serviceFromUnknown(item: unknown, index: number): PracticeAreaServiceForm {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { ...emptyService(), id: `service-${index + 1}` };
  }
  const o = item as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.trim() ? o.id : `service-${index + 1}`;
  const title = typeof o.title === 'string' ? o.title : '';
  const description = typeof o.description === 'string' ? o.description : '';
  const details = Array.isArray(o.details) ? o.details.filter((x): x is string => typeof x === 'string') : [];
  const previews = Array.isArray(o.previews)
    ? o.previews
        .map((p): ServicePreviewForm | null => {
          if (!p || typeof p !== 'object') return null;
          const pr = p as Record<string, unknown>;
          return { label: typeof pr.label === 'string' ? pr.label : '', value: typeof pr.value === 'string' ? pr.value : '' };
        })
        .filter((p): p is ServicePreviewForm => p !== null)
    : [];
  return { id, title, description, details, previews };
}

function serviceHasContent(s: PracticeAreaServiceForm): boolean {
  return (
    s.id.trim().length > 0 ||
    s.title.trim().length > 0 ||
    s.description.trim().length > 0 ||
    s.details.some((d) => d.trim().length > 0) ||
    s.previews.some((p) => p.label.trim().length > 0 || p.value.trim().length > 0)
  );
}

function serializeServices(services: PracticeAreaServiceForm[]): unknown[] {
  return services
    .filter((s) => s.id.trim() && s.title.trim())
    .map((s) => ({
      id: s.id.trim(),
      title: s.title.trim(),
      description: s.description,
      details: s.details.map((d) => d.trim()).filter((d) => d.length > 0),
      previews: s.previews
        .map((p) => ({ label: p.label.trim(), value: p.value.trim() }))
        .filter((p) => p.label.length > 0 || p.value.length > 0),
    }));
}

const emptyForm = () => ({
  slug: '',
  name: '',
  icon: 'Scale',
  overview: '',
  tags: [] as string[],
  related_cases_title: '',
  services: [] as PracticeAreaServiceForm[],
  sort_order: 0,
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: PracticeAreaAdminApi): FormState {
  const tags = Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : [];
  const servicesRaw = Array.isArray(row.services) ? row.services : [];
  return {
    slug: row.slug,
    name: row.name,
    icon: row.icon || 'Scale',
    overview: row.overview ?? '',
    tags,
    related_cases_title: row.related_cases_title ?? '',
    services: servicesRaw.map((item, i) => serviceFromUnknown(item, i)),
    sort_order: row.sort_order ?? 0,
  };
}

const AdminPracticeAreas = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-practice-areas'],
    queryFn: fetchAdminPracticeAreas,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<PracticeAreaAdminApi | null>(null);
  const [tagInput, setTagInput] = useState('');
  const slugEditedManuallyRef = useRef(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-practice-areas'] });
    void qc.invalidateQueries({ queryKey: practiceAreasQueryKey });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminPracticeArea({
        slug: form.slug.trim(),
        name: form.name.trim(),
        icon: form.icon.trim() || 'Scale',
        overview: form.overview,
        tags: form.tags.map((t) => t.trim()).filter((t) => t.length > 0),
        related_cases_title: form.related_cases_title,
        services: serializeServices(form.services),
        sort_order: Number(form.sort_order) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      setForm(emptyForm());
      setTagInput('');
      toast({ title: 'Practice area created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminPracticeArea(editingId, {
        slug: form.slug.trim(),
        name: form.name.trim(),
        icon: form.icon.trim() || 'Scale',
        overview: form.overview,
        tags: form.tags.map((t) => t.trim()).filter((t) => t.length > 0),
        related_cases_title: form.related_cases_title,
        services: serializeServices(form.services),
        sort_order: Number(form.sort_order) || 0,
      });
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      toast({ title: 'Saved' });
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminPracticeArea,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const savePending = createMut.isPending || patchMut.isPending;

  const handleSave = () => {
    if (!form.slug.trim() || !form.name.trim()) {
      toast({ title: 'Slug and name are required', variant: 'destructive' });
      return;
    }
    for (const s of form.services) {
      if (!serviceHasContent(s)) continue;
      if (!s.id.trim() || !s.title.trim()) {
        toast({
          title: 'Incomplete service',
          description: 'Each service that has content needs both an id and a title.',
          variant: 'destructive',
        });
        return;
      }
    }
    if (editingId) patchMut.mutate();
    else createMut.mutate();
  };

  const addTagFromInput = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const sorted = useMemo(() => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [rows]);

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load practice areas.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Practice areas</h2>
          <p className="text-sm text-muted-foreground">Edit tags and service cards with the fields below; data is stored as JSON on the server.</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            slugEditedManuallyRef.current = false;
            setForm(emptyForm());
            setTagInput('');
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No rows
                </TableCell>
              </TableRow>
            )}
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.sort_order}</TableCell>
                <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2"
                    onClick={() => setViewRow(r)}
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(r.id);
                      slugEditedManuallyRef.current = false;
                      setForm(rowToForm(r));
                      setTagInput('');
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Practice area details</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{viewRow.id}</dd>
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono text-xs">{viewRow.slug}</dd>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{viewRow.name}</dd>
                <dt className="text-muted-foreground">Icon</dt>
                <dd className="font-mono text-xs">{viewRow.icon || '—'}</dd>
                <dt className="text-muted-foreground">Sort order</dt>
                <dd>{viewRow.sort_order ?? 0}</dd>
                <dt className="text-muted-foreground">Related cases title</dt>
                <dd>{viewRow.related_cases_title || '—'}</dd>
              </dl>
              <div>
                <p className="text-muted-foreground mb-1">Overview</p>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{viewRow.overview || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {(viewRow.tags ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                  {(viewRow.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Services</p>
                <div className="space-y-3">
                  {(!Array.isArray(viewRow.services) || viewRow.services.length === 0) && (
                    <p className="text-muted-foreground rounded-md border bg-muted/30 p-3">—</p>
                  )}
                  {Array.isArray(viewRow.services) &&
                    viewRow.services.map((item, idx) => {
                      const s = serviceFromUnknown(item, idx);
                      return (
                        <Card key={idx}>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-base">{s.title || s.id || `Service ${idx + 1}`}</CardTitle>
                            <p className="text-xs font-mono text-muted-foreground">{s.id}</p>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm pt-0 px-4 pb-4">
                            {s.description && <p className="text-muted-foreground">{s.description}</p>}
                            {s.details.length > 0 && (
                              <ul className="list-disc pl-4 space-y-1">
                                {s.details.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            )}
                            {s.previews.length > 0 && (
                              <dl className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2 gap-y-1 text-xs border-t pt-2 mt-2">
                                {s.previews.map((p, i) => (
                                  <div key={i} className="contents">
                                    <dt className="text-muted-foreground">{p.label || '—'}</dt>
                                    <dd>{p.value || '—'}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit practice area' : 'New practice area'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => {
                      if (!editingId && !slugEditedManuallyRef.current) {
                        return { ...f, name, slug: slugify(name) };
                      }
                      return { ...f, name };
                    });
                  }}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    slugEditedManuallyRef.current = true;
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label>Icon (Lucide name)</Label>
                <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>Related cases title</Label>
              <Input value={form.related_cases_title} onChange={(e) => setForm((f) => ({ ...f, related_cases_title: e.target.value }))} />
            </div>
            <div>
              <Label>Overview</Label>
              <Textarea rows={4} value={form.overview} onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 rounded-md border bg-muted/20 p-2 min-h-[2.5rem]">
                {form.tags.map((tag, i) => (
                  <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      aria-label={`Remove ${tag}`}
                      onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTagFromInput}>
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Services</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, services: [...f.services, emptyService()] }))}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add service
                </Button>
              </div>
              {form.services.length === 0 && <p className="text-xs text-muted-foreground">No services yet.</p>}
              <div className="space-y-3">
                {form.services.map((svc, si) => (
                  <Card key={si}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
                      <CardTitle className="text-sm font-medium">Service {si + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setForm((f) => ({ ...f, services: f.services.filter((_, j) => j !== si) }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Id (URL key)</Label>
                          <Input
                            className="font-mono text-xs"
                            value={svc.id}
                            onChange={(e) =>
                              setForm((f) => {
                                const next = [...f.services];
                                next[si] = { ...next[si], id: e.target.value };
                                return { ...f, services: next };
                              })
                            }
                            placeholder="governance"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={svc.title}
                            onChange={(e) =>
                              setForm((f) => {
                                const next = [...f.services];
                                next[si] = { ...next[si], title: e.target.value };
                                return { ...f, services: next };
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          rows={2}
                          value={svc.description}
                          onChange={(e) =>
                            setForm((f) => {
                              const next = [...f.services];
                              next[si] = { ...next[si], description: e.target.value };
                              return { ...f, services: next };
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Detail bullets</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setForm((f) => {
                                const next = [...f.services];
                                next[si] = { ...next[si], details: [...next[si].details, ''] };
                                return { ...f, services: next };
                              })
                            }
                          >
                            Add line
                          </Button>
                        </div>
                        {svc.details.length === 0 && <p className="text-xs text-muted-foreground">No detail lines.</p>}
                        {svc.details.map((line, di) => (
                          <div key={di} className="flex gap-2">
                            <Textarea
                              rows={2}
                              className="text-sm"
                              value={line}
                              onChange={(e) =>
                                setForm((f) => {
                                  const next = [...f.services];
                                  const details = [...next[si].details];
                                  details[di] = e.target.value;
                                  next[si] = { ...next[si], details };
                                  return { ...f, services: next };
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-destructive"
                              onClick={() =>
                                setForm((f) => {
                                  const next = [...f.services];
                                  next[si] = { ...next[si], details: next[si].details.filter((_, j) => j !== di) };
                                  return { ...f, services: next };
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Preview pairs (label / value)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setForm((f) => {
                                const next = [...f.services];
                                next[si] = { ...next[si], previews: [...next[si].previews, { label: '', value: '' }] };
                                return { ...f, services: next };
                              })
                            }
                          >
                            Add pair
                          </Button>
                        </div>
                        {svc.previews.map((pr, pi) => (
                          <div key={pi} className="flex flex-wrap gap-2 items-end">
                            <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                              <Input
                                placeholder="Label"
                                value={pr.label}
                                onChange={(e) =>
                                  setForm((f) => {
                                    const next = [...f.services];
                                    const previews = [...next[si].previews];
                                    previews[pi] = { ...previews[pi], label: e.target.value };
                                    next[si] = { ...next[si], previews };
                                    return { ...f, services: next };
                                  })
                                }
                              />
                              <Input
                                placeholder="Value"
                                value={pr.value}
                                onChange={(e) =>
                                  setForm((f) => {
                                    const next = [...f.services];
                                    const previews = [...next[si].previews];
                                    previews[pi] = { ...previews[pi], value: e.target.value };
                                    next[si] = { ...next[si], previews };
                                    return { ...f, services: next };
                                  })
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive shrink-0"
                              onClick={() =>
                                setForm((f) => {
                                  const next = [...f.services];
                                  next[si] = { ...next[si], previews: next[si].previews.filter((_, j) => j !== pi) };
                                  return { ...f, services: next };
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={savePending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={savePending}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete practice area?</AlertDialogTitle>
            <AlertDialogDescription>Cases pointing at this slug may need updating first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteMut.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPracticeAreas;
