import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useAuth } from '@/context/AuthContext';
import {
  deleteAdminKnowledgeResource,
  fetchAdminKnowledgeResourceCategories,
  fetchAdminKnowledgeResources,
  patchAdminKnowledgeResource,
  postAdminKnowledgeResource,
  type KnowledgeResourceAdminApi,
} from '@/lib/api';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import { KnowledgeResourcePdfFlipbook } from '@/components/KnowledgeResourcePdfFlipbook';

const emptyForm = (categoryDefault: string) => ({
  title: '',
  description: '',
  category: categoryDefault,
  published: true,
  sort_order: 0,
});

type FormState = ReturnType<typeof emptyForm>;

function rowToForm(row: KnowledgeResourceAdminApi, categoryNames: string[]): FormState {
  const fallback = categoryNames[0] ?? '';
  const category = categoryNames.includes(row.category) ? row.category : fallback;
  return {
    title: row.title,
    description: row.description ?? '',
    category: category || fallback,
    published: row.published,
    sort_order: row.sort_order ?? 0,
  };
}

const AdminKnowledgeResources = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isSuper = Boolean(user?.is_superuser || user?.role === 'super_admin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-knowledge-resources'],
    queryFn: fetchAdminKnowledgeResources,
    enabled: isSuper,
  });

  const { data: categoryRows = [] } = useQuery({
    queryKey: ['admin-knowledge-resource-categories'] as const,
    queryFn: fetchAdminKnowledgeResourceCategories,
    enabled: isSuper,
  });

  const categoryNames = useMemo(
    () =>
      [...categoryRows]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((c) => c.name),
    [categoryRows],
  );

  const defaultCategoryName = categoryNames[0] ?? '';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(''));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<KnowledgeResourceAdminApi | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-knowledge-resources'] });
    void qc.invalidateQueries({ queryKey: ['public-knowledge-resources'] });
    void qc.invalidateQueries({ queryKey: ['public-knowledge-resource-categories'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminKnowledgeResource({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        published: form.published,
        sort_order: form.sort_order,
        pdfFile: pdfFile!,
      }),
    onSuccess: () => {
      toast({ title: 'Resource created' });
      setDialogOpen(false);
      setForm(emptyForm(defaultCategoryName));
      setPdfFile(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () =>
      patchAdminKnowledgeResource(editingId!, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        published: form.published,
        sort_order: form.sort_order,
        pdfFile: pdfFile ?? undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Resource updated' });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm(defaultCategoryName));
      setPdfFile(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminKnowledgeResource(id),
    onSuccess: () => {
      toast({ title: 'Resource deleted' });
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not delete', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(defaultCategoryName));
    setPdfFile(null);
    setDialogOpen(true);
  };

  const openEdit = (row: KnowledgeResourceAdminApi) => {
    setEditingId(row.id);
    setForm(rowToForm(row, categoryNames));
    setPdfFile(null);
    setDialogOpen(true);
  };

  const busy = createMut.isPending || patchMut.isPending;

  const errMsg = useMemo(() => (isError && error instanceof Error ? error.message : ''), [isError, error]);

  const previewUrl = viewRow?.download_href ? cmsMediaSrc(viewRow.download_href) : '';

  if (!isSuper) {
    return (
      <Card className="p-8 max-w-lg">
        <h2 className="text-lg font-semibold">Knowledge base</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Only super administrators can add or edit knowledge base downloads. Contact a super admin if you need a
          document published.
        </p>
      </Card>
    );
  }

  const submitDisabled =
    busy || !form.title.trim() || (!editingId && !pdfFile) || categoryNames.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Knowledge base</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Public downloads on <code className="text-xs">/knowledge</code>. Upload a PDF for each resource; the site
            serves the file and tracks download counts automatically.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add resource
        </Button>
      </div>

      {isError && <p className="text-sm text-destructive">{errMsg}</p>}

      {categoryNames.length === 0 && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 rounded-lg px-3 py-2">
          Add at least one knowledge base category (sidebar → Knowledge base categories) before visitors can be
          assigned a category on new resources.
        </p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="w-[100px] text-right hidden sm:table-cell">Downloads</TableHead>
              <TableHead className="w-[90px]">Published</TableHead>
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-sm">
                  No resources yet. When the list is empty, the public page shows sample cards until you add items.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium max-w-[240px] truncate">{row.title}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{row.category}</TableCell>
                <TableCell className="hidden sm:table-cell text-right text-sm tabular-nums">
                  {(row.download_count ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">{row.published ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewRow(row)} title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit resource' : 'New resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="kr-title">Title</Label>
              <Input
                id="kr-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="kr-desc">Description</Label>
              <Textarea
                id="kr-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 min-h-[72px]"
              />
            </div>
            <div>
              <Label>Category</Label>
              {categoryNames.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">No categories yet — create them under Knowledge base categories.</p>
              ) : (
                <Select
                  value={
                    categoryNames.includes(form.category)
                      ? form.category
                      : (defaultCategoryName || categoryNames[0] || '')
                  }
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="kr-pdf">PDF file</Label>
              <Input
                id="kr-pdf"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="mt-1 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPdfFile(f);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editingId
                  ? 'Leave unchanged to keep the current PDF, or choose a new file to replace it.'
                  : 'Upload the document visitors will download from the knowledge base.'}
              </p>
            </div>
            <div>
              <Label htmlFor="kr-sort">Sort order</Label>
              <Input
                id="kr-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="kr-pub"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: Boolean(v) }))}
              />
              <Label htmlFor="kr-pub" className="cursor-pointer">
                Published
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={submitDisabled}
              onClick={() => {
                if (editingId) patchMut.mutate();
                else createMut.mutate();
              }}
            >
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewRow)} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewRow?.title}</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-4 py-2">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">{viewRow.category}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Downloads</dt>
                  <dd className="font-medium tabular-nums">{(viewRow.download_count ?? 0).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Published</dt>
                  <dd className="font-medium">{viewRow.published ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sort order</dt>
                  <dd className="font-medium">{viewRow.sort_order}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="mt-1 text-foreground whitespace-pre-wrap">{viewRow.description || '—'}</dd>
                </div>
              </dl>
              {previewUrl ? (
                <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <KnowledgeResourcePdfFlipbook fileUrl={previewUrl} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No PDF is attached to this resource.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMut.mutate(deleteId);
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

export default AdminKnowledgeResources;
