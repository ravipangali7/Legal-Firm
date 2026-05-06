import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { useAdminStore } from '@/store/adminStore';
import {
  deleteAdminBlogPost,
  fetchAdminBlogPosts,
  patchAdminBlogPost,
  postAdminBlogPost,
  type BlogPostAdminApi,
} from '@/lib/api';

const NONE_AUTHOR = '__none__';

type BlogFormFields = {
  title: string;
  excerpt: string;
  body: string;
  author_name: string;
  category: string;
  date: string;
  published: boolean;
  featured: boolean;
  authorId: string | null;
};

function postToFields(post: BlogPostAdminApi): BlogFormFields {
  return {
    title: post.title,
    excerpt: post.excerpt ?? '',
    body: post.body ?? '',
    author_name: post.author_name ?? '',
    category: post.category ?? '',
    date: post.date,
    published: post.published,
    featured: post.featured,
    authorId: post.author,
  };
}

function fieldsToPatch(fields: BlogFormFields): Partial<BlogPostAdminApi> {
  return {
    title: fields.title.trim(),
    excerpt: fields.excerpt,
    body: fields.body,
    author_name: fields.author_name,
    category: fields.category.trim() || 'General',
    date: fields.date,
    published: fields.published,
    featured: fields.featured,
    author: fields.authorId,
  };
}

const emptyForm = (): BlogFormFields => ({
  title: '',
  excerpt: '',
  body: '',
  author_name: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  published: false,
  featured: false,
  authorId: null,
});

function BlogPostFormFields({
  form,
  setForm,
  authorOptions,
  disabled,
}: {
  form: BlogFormFields;
  setForm: React.Dispatch<React.SetStateAction<BlogFormFields>>;
  authorOptions: { id: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <Label>Author account</Label>
          <Select
            value={form.authorId ?? NONE_AUTHOR}
            onValueChange={(v) => setForm((f) => ({ ...f, authorId: v === NONE_AUTHOR ? null : v }))}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional — link to a user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_AUTHOR}>None (display name only)</SelectItem>
              {authorOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Author display name</Label>
          <Input
            value={form.author_name}
            onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
            placeholder="Shown when no account is linked"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="e.g. Tax Law"
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Excerpt</Label>
          <Textarea rows={3} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <Label>Body</Label>
          <Textarea
            rows={8}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Full article (Markdown or plain text)"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.published}
            onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
            disabled={disabled}
          />
          <Label>Published</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.featured}
            onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
            disabled={disabled}
          />
          <Label>Featured</Label>
        </div>
      </div>
    </div>
  );
}

const CmsBlog = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { users } = useAdminStore();

  const authorOptions = useMemo(
    () =>
      [...users]
        .filter((u) => u.status === 'active')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((u) => ({
          id: u.id,
          label: u.name?.trim() ? `${u.name} (${u.email})` : u.email,
        })),
    [users],
  );

  const { data: posts = [], isLoading, isError } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: fetchAdminBlogPosts,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormFields>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      postAdminBlogPost({
        ...fieldsToPatch(form),
        author_name: form.author_name || 'Editor',
      }),
    onSuccess: () => {
      invalidate();
      setForm(emptyForm());
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: 'Post created' });
    },
    onError: (e: Error) => toast({ title: 'Could not create', description: e.message, variant: 'destructive' }),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BlogPostAdminApi> }) => patchAdminBlogPost(id, patch),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditingId(null);
      toast({ title: 'Post updated' });
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminBlogPost,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Post removed' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPostAdminApi) => {
    setEditingId(post.id);
    setForm(postToFields(post));
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(emptyForm());
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      patchMut.mutate({ id: editingId, patch: fieldsToPatch(form) });
    } else {
      createMut.mutate();
    }
  };

  const savePending = createMut.isPending || patchMut.isPending;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6">Loading blog posts…</p>;
  }

  if (isError) {
    return <p className="text-sm text-destructive py-6">Could not load blog posts.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Blog Posts</h2>
          <p className="text-sm text-muted-foreground">
            Managed on the server; updates apply to the public blog when published.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No blog posts yet
                </TableCell>
              </TableRow>
            )}
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium max-w-[220px]">
                  <div className="truncate" title={post.title}>
                    {post.title}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-normal">
                    {(post.category || 'General').trim() || '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={post.published ? 'default' : 'secondary'} className="text-xs capitalize">
                      {post.published ? 'Published' : 'Draft'}
                    </Badge>
                    {post.featured ? (
                      <Badge className="text-xs">Featured</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm max-w-[160px] truncate" title={post.author_name || post.author_email || ''}>
                  {post.author_name || post.author_email || '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{post.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(post)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(post.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit post' : 'New post'}</DialogTitle>
          </DialogHeader>
          <BlogPostFormFields form={form} setForm={setForm} authorOptions={authorOptions} disabled={savePending} />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={savePending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={savePending || !form.title.trim()}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
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

export default CmsBlog;
