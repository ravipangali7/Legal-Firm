import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  deleteAdminSummary,
  fetchAdminSummaries,
  fetchAdminSummaryCategories,
  patchAdminSummary,
  postAdminSummary,
  type SummaryAdminApi,
} from '@/lib/api';
import { slugify } from '@/lib/slugify';

const emptyForm = () => ({
  slug: '',
  title: '',
  categoryId: '',
  posted: new Date().toISOString().slice(0, 10),
  views: 0,
  upvotes: 0,
  downvotes: 0,
  preview: '',
  premium: false,
  body: '',
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: SummaryAdminApi): FormState {
  return {
    slug: row.slug,
    title: row.title,
    categoryId: row.category,
    posted: row.posted,
    views: row.views ?? 0,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    preview: row.preview ?? '',
    premium: row.premium,
    body: row.body ?? '',
  };
}

const AdminSummaries = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-summary-categories'],
    queryFn: fetchAdminSummaryCategories,
  });
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-summaries'],
    queryFn: fetchAdminSummaries,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<SummaryAdminApi | null>(null);
  const slugEditedManuallyRef = useRef(false);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-summaries'] });
    void qc.invalidateQueries({ queryKey: ['summaries'] });
    void qc.invalidateQueries({ queryKey: ['summary'] });
  };

  const buildPayload = (): Partial<SummaryAdminApi> => ({
    slug: form.slug.trim(),
    title: form.title.trim(),
    category: form.categoryId,
    posted: form.posted,
    views: Number(form.views) || 0,
    upvotes: Number(form.upvotes) || 0,
    downvotes: Number(form.downvotes) || 0,
    preview: form.preview,
    premium: form.premium,
    body: form.body,
  });

  const createMut = useMutation({
    mutationFn: () => postAdminSummary(buildPayload()),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      setForm(emptyForm());
      toast({ title: 'Summary created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminSummary(editingId, buildPayload());
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
    mutationFn: deleteAdminSummary,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const firstCat = categories[0]?.id ?? '';

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load summaries.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Summaries</h2>
        <Button
          onClick={() => {
            setEditingId(null);
            slugEditedManuallyRef.current = false;
            setForm({ ...emptyForm(), categoryId: firstCat });
            setDialogOpen(true);
          }}
          disabled={!firstCat}
        >
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>
      {!firstCat ? <p className="text-sm text-muted-foreground">Create a summary category first.</p> : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs max-w-[100px] truncate">{r.slug}</TableCell>
                <TableCell className="max-w-[200px] truncate font-medium" title={r.title}>
                  {r.title}
                </TableCell>
                <TableCell className="text-sm">{catById.get(r.category)?.name ?? r.category}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{r.posted}</TableCell>
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
            <DialogTitle>{editingId ? 'Edit summary' : 'New summary'}</DialogTitle>
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
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posted</Label>
                <Input type="date" value={form.posted} onChange={(e) => setForm((f) => ({ ...f, posted: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.premium} onCheckedChange={(v) => setForm((f) => ({ ...f, premium: v }))} />
                <Label>Premium</Label>
              </div>
              <div>
                <Label>Views</Label>
                <Input type="number" value={form.views} onChange={(e) => setForm((f) => ({ ...f, views: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Upvotes</Label>
                <Input type="number" value={form.upvotes} onChange={(e) => setForm((f) => ({ ...f, upvotes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Downvotes</Label>
                <Input type="number" value={form.downvotes} onChange={(e) => setForm((f) => ({ ...f, downvotes: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Preview</Label>
              <Textarea rows={3} value={form.preview} onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={10} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMut.isPending || patchMut.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.slug.trim() || !form.title.trim() || !form.categoryId) {
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
        title={viewRow ? `Summary: ${viewRow.slug}` : 'Details'}
        value={viewRow}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete summary?</AlertDialogTitle>
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

export default AdminSummaries;
