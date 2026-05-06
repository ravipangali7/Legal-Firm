import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Plus, Trash2, Edit } from 'lucide-react';
import { RecordViewDialog } from '@/components/admin/RecordViewDialog';
import { useToast } from '@/hooks/use-toast';
import {
  deleteAdminProcedure,
  fetchAdminProcedureCategories,
  fetchAdminProcedures,
  patchAdminProcedure,
  postAdminProcedure,
  type ProcedureAdminApi,
} from '@/lib/api';
import { proceduresListQueryKey } from '@/lib/proceduresListQuery';
import { slugify } from '@/lib/slugify';

type StepFormRow = { description: string };

const CATEGORY_SELECT_EMPTY = '__none__';

const emptyForm = () => ({
  slug: '',
  /** ProcedureCategory id (UUID). */
  category: '',
  title: '',
  summary: '',
  duration_label: '',
  icon: '',
  steps: [] as StepFormRow[],
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: ProcedureAdminApi): FormState {
  const ordered = [...(row.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    slug: row.slug,
    category: typeof row.category === 'string' ? row.category : '',
    title: row.title,
    summary: row.summary ?? '',
    duration_label: row.duration_label ?? '',
    icon: row.icon ?? '',
    steps: ordered.map((s) => ({ description: s.description ?? '' })),
  };
}

const AdminProcedures = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-procedures'],
    queryFn: fetchAdminProcedures,
  });
  const { data: procedureCategories = [] } = useQuery({
    queryKey: ['admin-procedure-categories'],
    queryFn: fetchAdminProcedureCategories,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<ProcedureAdminApi | null>(null);
  const slugEditedManuallyRef = useRef(false);

  const sortedProcedureCategories = useMemo(
    () => [...procedureCategories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [procedureCategories],
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-procedures'] });
    void qc.invalidateQueries({ queryKey: ['admin-procedure-categories'] });
    void qc.invalidateQueries({ queryKey: proceduresListQueryKey });
  };

  const buildStepsPayload = () =>
    form.steps.map((s, index) => ({
      order: index,
      description: s.description,
    }));

  const createMut = useMutation({
    mutationFn: () =>
      postAdminProcedure({
        slug: form.slug.trim(),
        category: form.category.trim(),
        title: form.title.trim(),
        summary: form.summary,
        duration_label: form.duration_label,
        icon: form.icon,
        steps: buildStepsPayload() as ProcedureAdminApi['steps'],
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      setForm(emptyForm());
      toast({ title: 'Procedure created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminProcedure(editingId, {
        slug: form.slug.trim(),
        category: form.category.trim(),
        title: form.title.trim(),
        summary: form.summary,
        duration_label: form.duration_label,
        icon: form.icon,
        steps: buildStepsPayload() as ProcedureAdminApi['steps'],
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
    mutationFn: deleteAdminProcedure,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load procedures.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Procedures</h2>
          <p className="text-sm text-muted-foreground">Add steps in order; order is saved as the list sequence.</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            slugEditedManuallyRef.current = false;
            setForm({ ...emptyForm(), category: sortedProcedureCategories[0]?.id ?? '' });
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
              <TableHead>Slug</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.slug}</TableCell>
                <TableCell className="max-w-[180px] truncate font-medium">{r.title}</TableCell>
                <TableCell className="text-sm">{r.category_name ?? r.category}</TableCell>
                <TableCell className="text-sm">{r.steps_count}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-1 flex-wrap">
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setViewRow(r)}>
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
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit procedure' : 'New procedure'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => {
                      if (!editingId && !slugEditedManuallyRef.current) {
                        return { ...f, title, slug: slugify(title) };
                      }
                      return { ...f, title };
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
                <Label>Category</Label>
                <Select
                  value={form.category.trim() ? form.category : CATEGORY_SELECT_EMPTY}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v === CATEGORY_SELECT_EMPTY ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_SELECT_EMPTY}>Select category…</SelectItem>
                    {sortedProcedureCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sortedProcedureCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Create categories under{' '}
                    <Link className="text-primary underline" to="/admin/legal/procedure-categories">
                      Procedure categories
                    </Link>{' '}
                    first.
                  </p>
                )}
              </div>
              <div>
                <Label>Duration label</Label>
                <Input value={form.duration_label} onChange={(e) => setForm((f) => ({ ...f, duration_label: e.target.value }))} />
              </div>
              <div>
                <Label>Icon (Lucide name)</Label>
                <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { description: '' }] }))}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add step
                </Button>
              </div>
              {form.steps.length === 0 && <p className="text-xs text-muted-foreground">No steps yet.</p>}
              <div className="space-y-2">
                {form.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground w-6 shrink-0 pt-2 text-right">{i + 1}.</span>
                    <Textarea
                      rows={3}
                      className="flex-1 min-w-0 text-sm"
                      value={step.description}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.steps];
                          next[i] = { description: e.target.value };
                          return { ...f, steps: next };
                        })
                      }
                      placeholder="Step description"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive"
                      onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMut.isPending || patchMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.slug.trim() || !form.title.trim() || !form.category.trim()) {
                  toast({ title: 'Slug, title, and category required', variant: 'destructive' });
                  return;
                }
                if (editingId) patchMut.mutate();
                else createMut.mutate();
              }}
              disabled={createMut.isPending || patchMut.isPending}
            >
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordViewDialog
        open={viewRow !== null}
        onOpenChange={(open) => {
          if (!open) setViewRow(null);
        }}
        title={viewRow ? `Procedure: ${viewRow.slug}` : 'Details'}
        value={viewRow}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete procedure?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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

export default AdminProcedures;
