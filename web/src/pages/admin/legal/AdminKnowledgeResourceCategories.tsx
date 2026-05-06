import { useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  deleteAdminKnowledgeResourceCategory,
  fetchAdminKnowledgeResourceCategories,
  patchAdminKnowledgeResourceCategory,
  postAdminKnowledgeResourceCategory,
  type KnowledgeResourceCategoryPublicApi,
} from '@/lib/api';

const emptyForm = () => ({ name: '', sort_order: 0 });

const AdminKnowledgeResourceCategories = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isSuper = Boolean(user?.is_superuser || user?.role === 'super_admin');

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['admin-knowledge-resource-categories'] as const,
    queryFn: fetchAdminKnowledgeResourceCategories,
    enabled: isSuper,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-knowledge-resource-categories'] });
    void qc.invalidateQueries({ queryKey: ['public-knowledge-resource-categories'] });
    void qc.invalidateQueries({ queryKey: ['public-knowledge-resources'] });
    void qc.invalidateQueries({ queryKey: ['admin-knowledge-resources'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminKnowledgeResourceCategory({
        name: form.name.trim(),
        sort_order: Number(form.sort_order) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      toast({ title: 'Category created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing id');
      return patchAdminKnowledgeResourceCategory(editingId, {
        name: form.name.trim(),
        sort_order: Number(form.sort_order) || 0,
      });
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: 'Saved' });
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminKnowledgeResourceCategory,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [rows],
  );

  if (!isSuper) {
    return (
      <Card className="p-8 max-w-lg">
        <h2 className="text-lg font-semibold">Knowledge base categories</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Only super administrators can manage knowledge base categories.
        </p>
      </Card>
    );
  }

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading…</p>;
  if (isError) return <p className="text-sm text-destructive py-6">Could not load categories.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Knowledge base categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These labels power the category filter and assignment on the public Knowledge Base and in Knowledge base
            resources. Renaming a category updates all resources that use it.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm());
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New category
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r: KnowledgeResourceCategoryPublicApi) => (
              <TableRow key={r.id}>
                <TableCell>{r.sort_order}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingId(r.id);
                        setForm({ name: r.name, sort_order: r.sort_order ?? 0 });
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(r.id)}
                    >
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
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={64}
              />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) {
                  toast({ title: 'Name required', variant: 'destructive' });
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              You can only remove a category when no knowledge base resources use it. If deletion fails, reassign those
              resources first.
            </AlertDialogDescription>
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

export default AdminKnowledgeResourceCategories;
