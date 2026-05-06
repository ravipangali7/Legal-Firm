import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  deleteAdminSummaryCategory,
  fetchAdminSummaryCategories,
  patchAdminSummaryCategory,
  postAdminSummaryCategory,
  type SummaryCategoryAdminApi,
} from '@/lib/api';
import { slugify } from '@/lib/slugify';

const emptyForm = () => ({ slug: '', name: '', color: '#64748b', sort_order: 0 });

const AdminSummaryCategories = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-summary-categories'],
    queryFn: fetchAdminSummaryCategories,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<SummaryCategoryAdminApi | null>(null);
  const slugEditedManuallyRef = useRef(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-summary-categories'] });
    void qc.invalidateQueries({ queryKey: ['summary-categories'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminSummaryCategory({
        slug: form.slug.trim(),
        name: form.name.trim(),
        color: form.color.trim() || '#64748b',
        sort_order: Number(form.sort_order) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      slugEditedManuallyRef.current = false;
      setForm(emptyForm());
      toast({ title: 'Category created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminSummaryCategory(editingId, {
        slug: form.slug.trim(),
        name: form.name.trim(),
        color: form.color.trim() || '#64748b',
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
    mutationFn: deleteAdminSummaryCategory,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const sorted = useMemo(() => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [rows]);

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load categories.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Summary categories</h2>
        <Button
          onClick={() => {
            setEditingId(null);
            slugEditedManuallyRef.current = false;
            setForm(emptyForm());
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
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.sort_order}</TableCell>
                <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs font-mono">{r.color}</TableCell>
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
                        setForm({ slug: r.slug, name: r.name, color: r.color, sort_order: r.sort_order });
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label>Color (hex or CSS)</Label>
              <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.slug.trim() || !form.name.trim()) {
                  toast({ title: 'Slug and name required', variant: 'destructive' });
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
        title={viewRow ? `Summary category: ${viewRow.slug}` : 'Details'}
        value={viewRow}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>Summaries using this category may block deletion (database PROTECT).</AlertDialogDescription>
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

export default AdminSummaryCategories;
