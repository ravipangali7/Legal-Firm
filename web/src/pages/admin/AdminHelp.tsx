import { useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { HelpArticleProse } from '@/components/HelpArticleProse';
import { useAdminStore, type HelpArticle } from '@/store/adminStore';
import {
  helpArticleCategoryBlurb,
  helpArticleCategorySelectItems,
  mergeHelpArticleCategoriesForFilter,
} from '@/lib/helpArticleCategories';

const empty: Omit<HelpArticle, 'id'> = {
  title: '',
  category: 'General',
  content: '',
  order: 0,
  published: true,
};

const AdminHelp = () => {
  const { user, loading: authLoading } = useAuth();
  const { helpArticles, addHelpArticle, updateHelpArticle, deleteHelpArticle, adminSnapshotLoaded, apiConnected } =
    useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HelpArticle | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<HelpArticle | null>(null);

  const categories = useMemo(() => mergeHelpArticleCategoriesForFilter(helpArticles), [helpArticles]);
  const categorySelectItems = useMemo(
    () => helpArticleCategorySelectItems(editing?.category ?? form.category),
    [editing?.category, form.category],
  );
  const categoryBlurb = helpArticleCategoryBlurb(form.category);

  const filtered = useMemo(
    () =>
      helpArticles
        .filter((a) => {
          const q =
            !search ||
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.content.toLowerCase().includes(search.toLowerCase()) ||
            a.category.toLowerCase().includes(search.toLowerCase());
          const c = catFilter === 'all' || a.category === catFilter;
          return q && c;
        })
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    [helpArticles, search, catFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...empty, order: helpArticles.length });
    setOpen(true);
  };

  const openEdit = (a: HelpArticle) => {
    setEditing(a);
    setForm({
      title: a.title,
      category: a.category,
      content: a.content,
      order: a.order,
      published: a.published,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Title and content required', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateHelpArticle(editing.id, form);
        toast({ title: 'Article updated' });
      } else {
        await addHelpArticle(form);
        toast({ title: 'Article created' });
      }
      setOpen(false);
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || (user?.is_staff && !adminSnapshotLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-[240px] text-muted-foreground text-sm">
        Loading help articles…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Help center</h1>
          <p className="text-muted-foreground mt-1">
            {apiConnected
              ? 'Articles are stored in the database. Published articles appear on /help, and page categories (Pricing, Resources, Blog, etc.) also show as FAQs on those public pages when published.'
              : 'Working offline — changes stay in this browser until the admin API is available.'}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New article
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title, category, content…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:hidden">
        {filtered.map((a) => (
          <Card key={a.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{a.title}</span>
              </div>
              <Badge variant={a.published ? 'default' : 'secondary'}>{a.published ? 'Live' : 'Draft'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{a.category}</p>
            <p className="text-sm line-clamp-3">{a.content}</p>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setView(a)}>
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No articles
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-muted-foreground">{a.order}</TableCell>
                <TableCell className="font-medium max-w-[280px]">
                  <div className="truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground truncate line-clamp-1">{a.content}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{a.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={a.published ? 'default' : 'secondary'}>{a.published ? 'Published' : 'Draft'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setView(a)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(a)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(a.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit article' : 'New article'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySelectItems.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoryBlurb ? <p className="text-xs text-muted-foreground mt-1.5">{categoryBlurb}</p> : null}
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pub" checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label htmlFor="pub">Published</Label>
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Markdown-style **bold** supported in viewers that render it." className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{view.category}</Badge>
                <Badge variant={view.published ? 'default' : 'secondary'}>{view.published ? 'Published' : 'Draft'}</Badge>
              </div>
              <HelpArticleProse content={view.content} className="text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>This removes the help article permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (!deleteId) return;
                void (async () => {
                  try {
                    await deleteHelpArticle(deleteId);
                    toast({ title: 'Deleted' });
                    setDeleteId(null);
                  } catch (e) {
                    toast({
                      title: 'Delete failed',
                      description: e instanceof Error ? e.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  }
                })();
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

export default AdminHelp;
