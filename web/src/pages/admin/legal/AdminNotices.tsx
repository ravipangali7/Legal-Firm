import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  deleteAdminNotice,
  fetchAdminNotices,
  patchAdminNotice,
  postAdminNotice,
  type NoticeAdminApi,
} from '@/lib/api';

const emptyForm = () => ({
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  title_ne: '',
  excerpt_ne: '',
  body_ne: '',
  tagsText: '',
  issued_by: '',
  issued_by_ne: '',
  published: true,
  sort_order: 0,
  view_count: 0,
  upvotes: 0,
  downvotes: 0,
});

type FormState = ReturnType<typeof emptyForm>;

function parseTags(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function tagsToText(tags: string[] | undefined): string {
  if (!Array.isArray(tags)) return '';
  return tags.join(', ');
}

/** Matches staff API: ASCII letters, digits, hyphens, underscores; max 255. */
function noticeTitleToSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s.slice(0, 255).replace(/-+$/g, '');
}

function rowToForm(row: NoticeAdminApi): FormState {
  return {
    slug: row.slug ?? '',
    title: row.title,
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    title_ne: row.title_ne ?? '',
    excerpt_ne: row.excerpt_ne ?? '',
    body_ne: row.body_ne ?? '',
    tagsText: tagsToText(row.tags),
    issued_by: row.issued_by,
    issued_by_ne: row.issued_by_ne ?? '',
    published: row.published,
    sort_order: row.sort_order ?? 0,
    view_count: row.view_count ?? 0,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
  };
}

const AdminNotices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isSuper = Boolean(user?.is_superuser || user?.role === 'super_admin');

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: fetchAdminNotices,
    enabled: isSuper,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<NoticeAdminApi | null>(null);
  /** When true, changing the English title does not overwrite the slug (manual slug or editing an existing row). */
  const slugSyncPausedRef = useRef(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-notices'] });
    void qc.invalidateQueries({ queryKey: ['public-notices'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminNotice({
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body.trim(),
        title_ne: form.title_ne.trim(),
        excerpt_ne: form.excerpt_ne.trim(),
        body_ne: form.body_ne.trim(),
        tags: parseTags(form.tagsText),
        issued_by: form.issued_by.trim(),
        issued_by_ne: form.issued_by_ne.trim(),
        published: form.published,
        sort_order: form.sort_order,
        view_count: form.view_count,
        upvotes: form.upvotes,
        downvotes: form.downvotes,
      }),
    onSuccess: () => {
      toast({ title: 'Notice created' });
      setDialogOpen(false);
      setForm(emptyForm());
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: () =>
      patchAdminNotice(editingId!, {
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body.trim(),
        title_ne: form.title_ne.trim(),
        excerpt_ne: form.excerpt_ne.trim(),
        body_ne: form.body_ne.trim(),
        tags: parseTags(form.tagsText),
        issued_by: form.issued_by.trim(),
        issued_by_ne: form.issued_by_ne.trim(),
        published: form.published,
        sort_order: form.sort_order,
        view_count: form.view_count,
        upvotes: form.upvotes,
        downvotes: form.downvotes,
      }),
    onSuccess: () => {
      toast({ title: 'Notice updated' });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminNotice(id),
    onSuccess: () => {
      toast({ title: 'Notice deleted' });
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: 'Could not delete', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditingId(null);
    slugSyncPausedRef.current = false;
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: NoticeAdminApi) => {
    setEditingId(row.id);
    slugSyncPausedRef.current = true;
    setForm(rowToForm(row));
    setDialogOpen(true);
  };

  const busy = createMut.isPending || patchMut.isPending;

  const errMsg = useMemo(() => (isError && error instanceof Error ? error.message : ''), [isError, error]);

  if (!isSuper) {
    return (
      <Card className="p-8 max-w-lg">
        <h2 className="text-lg font-semibold">Notices</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Only super administrators can create and manage official notices. Contact a super admin if you need a
          notice published.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Notices</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Public circulars on <code className="text-xs">/notices</code>. Create and edit is limited to super
            administrators.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add notice
        </Button>
      </div>

      {isError && <p className="text-sm text-destructive">{errMsg}</p>}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Issued by</TableHead>
              <TableHead className="w-[90px]">Published</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-sm">
                  No notices yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[280px]">
                  <div className="font-medium truncate">{row.title}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">{row.slug}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{row.issued_by}</TableCell>
                <TableCell className="text-sm">{row.published ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewRow(row)} title="View full data">
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

      <Dialog open={Boolean(viewRow)} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Notice — full data</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <ScrollArea className="max-h-[65vh] pr-4">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">ID</dt>
                  <dd className="mt-1 font-mono text-xs break-all">{viewRow.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Slug</dt>
                  <dd className="mt-1 font-mono text-xs">{viewRow.slug}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Title</dt>
                  <dd className="mt-1">{viewRow.title}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Title (Nepali)</dt>
                  <dd className="mt-1">{viewRow.title_ne || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Issued by</dt>
                  <dd className="mt-1">{viewRow.issued_by}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Issued by (Nepali)</dt>
                  <dd className="mt-1">{viewRow.issued_by_ne || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Tags</dt>
                  <dd className="mt-1">{tagsToText(viewRow.tags) || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Published</dt>
                  <dd className="mt-1">{viewRow.published ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Sort order</dt>
                  <dd className="mt-1">{viewRow.sort_order ?? 0}</dd>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <dt className="font-medium text-muted-foreground">Views</dt>
                    <dd className="mt-1">{viewRow.view_count ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Upvotes</dt>
                    <dd className="mt-1">{viewRow.upvotes ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Downvotes</dt>
                    <dd className="mt-1">{viewRow.downvotes ?? 0}</dd>
                  </div>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Created at</dt>
                  <dd className="mt-1">{viewRow.created_at}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Updated at</dt>
                  <dd className="mt-1">{viewRow.updated_at}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Excerpt</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{viewRow.excerpt || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Excerpt (Nepali)</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{viewRow.excerpt_ne || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Body</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{viewRow.body || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Body (Nepali)</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">{viewRow.body_ne || '—'}</dd>
                </div>
              </dl>
            </ScrollArea>
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
            <DialogTitle>{editingId ? 'Edit notice' : 'New notice'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="n-title">Title</Label>
              <Input
                id="n-title"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => {
                    const next = { ...f, title };
                    if (!slugSyncPausedRef.current) {
                      next.slug = noticeTitleToSlug(title);
                    }
                    return next;
                  });
                }}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="n-slug">URL slug</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    slugSyncPausedRef.current = false;
                    setForm((f) => ({ ...f, slug: noticeTitleToSlug(f.title) }));
                  }}
                >
                  Generate from title
                </Button>
              </div>
              <Input
                id="n-slug"
                value={form.slug}
                onChange={(e) => {
                  slugSyncPausedRef.current = true;
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                className="mt-1 font-mono text-sm"
                placeholder="e.g. income-tax-circular-2026"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Filled from the English title for new notices until you edit it here. Public URL: /notices/
                {form.slug.trim() || '…'}
              </p>
            </div>
            <div>
              <Label htmlFor="n-issued">Issued by (English)</Label>
              <Input
                id="n-issued"
                value={form.issued_by}
                onChange={(e) => setForm((f) => ({ ...f, issued_by: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="n-tags">Tags (comma-separated)</Label>
              <Input
                id="n-tags"
                value={form.tagsText}
                onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                className="mt-1"
                placeholder="Income Tax, VAT, TDS"
              />
            </div>
            <div>
              <Label htmlFor="n-excerpt">Excerpt (English)</Label>
              <Textarea
                id="n-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className="mt-1 min-h-[72px]"
              />
            </div>
            <div>
              <Label htmlFor="n-body">Body (English, optional)</Label>
              <Textarea
                id="n-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="n-sort">Sort order</Label>
                <Input
                  id="n-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="n-pub"
                    checked={form.published}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, published: Boolean(v) }))}
                  />
                  <Label htmlFor="n-pub" className="cursor-pointer">
                    Published
                  </Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="n-views">Views</Label>
                <Input
                  id="n-views"
                  type="number"
                  value={form.view_count}
                  onChange={(e) => setForm((f) => ({ ...f, view_count: Number(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="n-up">Upvotes</Label>
                <Input
                  id="n-up"
                  type="number"
                  value={form.upvotes}
                  onChange={(e) => setForm((f) => ({ ...f, upvotes: Number(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="n-down">Downvotes</Label>
                <Input
                  id="n-down"
                  type="number"
                  value={form.downvotes}
                  onChange={(e) => setForm((f) => ({ ...f, downvotes: Number(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !form.slug.trim() || !form.title.trim() || !form.issued_by.trim()}
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

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notice?</AlertDialogTitle>
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

export default AdminNotices;
