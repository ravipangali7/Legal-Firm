import { useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, Clock, User, Target, Server, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAdminStore, type ActivityLogEntry } from '@/store/adminStore';

const empty: Omit<ActivityLogEntry, 'id' | 'createdAt'> = {
  actor: '',
  action: '',
  entityType: '',
  entityId: '',
  detail: '',
};

function formatWhen(iso: string) {
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** Turn stored metadata (object or legacy JSON string) into a value we can pretty-print. */
function metadataForDisplay(meta: ActivityLogEntry['metadata']): unknown {
  if (meta == null) return null;
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta) as unknown;
    } catch {
      return meta;
    }
  }
  return meta;
}

function prettyMetadata(meta: ActivityLogEntry['metadata']): string | null {
  const value = metadataForDisplay(meta);
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return null;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function logMatchesQuery(e: ActivityLogEntry, q: string) {
  const hay = [
    e.actor,
    e.action,
    e.entityType,
    e.detail,
    e.entityId,
    e.actorEmail,
    e.actorRole,
    e.staffUserId,
    e.channel,
    e.metadata ? JSON.stringify(e.metadata) : '',
    e.userAgent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

const AdminActivityLogs = () => {
  const { activityLogs, addActivityLog, updateActivityLog, deleteActivityLog } = useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityLogEntry | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<ActivityLogEntry | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return activityLogs;
    const q = search.toLowerCase();
    return activityLogs.filter((e) => logMatchesQuery(e, q));
  }, [activityLogs, search]);

  const metadataPretty = useMemo(() => (view ? prettyMetadata(view.metadata) : null), [view]);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (e: ActivityLogEntry) => {
    setEditing(e);
    setForm({
      actor: e.actor,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId || '',
      detail: e.detail,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.actor.trim() || !form.action.trim() || !form.entityType.trim() || !form.detail.trim()) {
      toast({ title: 'Actor, action, entity type, and detail are required', variant: 'destructive' });
      return;
    }
    const entityId = form.entityId?.trim() || undefined;
    if (editing) {
      updateActivityLog(editing.id, { ...form, entityId });
      toast({ title: 'Log entry updated' });
    } else {
      addActivityLog({ actor: form.actor, action: form.action, entityType: form.entityType, entityId, detail: form.detail });
      toast({ title: 'Log entry added' });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">
            {activityLogs.length} recorded events — actions from the admin panel are captured automatically; use “Add log entry” for manual
            notes.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add log entry
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actor, action, entity, metadata, user agent…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No log entries
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id} className="align-top">
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatWhen(e.createdAt)}</TableCell>
                <TableCell className="font-medium">
                  <div>{e.actor}</div>
                  {e.actorRole && <div className="text-xs text-muted-foreground font-normal">{e.actorRole}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{e.action}</Badge>
                    {e.channel === 'manual_entry' && (
                      <Badge variant="secondary" className="text-xs">
                        manual
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {e.entityType}
                    {e.entityId && <span className="text-muted-foreground"> · {e.entityId}</span>}
                  </span>
                </TableCell>
                <TableCell className="max-w-[min(28rem,40vw)] text-sm text-muted-foreground whitespace-normal break-words">
                  {e.detail}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setView(e)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(e)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(e.id)} className="text-destructive">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit log entry' : 'New log entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Actor</Label>
              <Input value={form.actor} onChange={(ev) => setForm({ ...form, actor: ev.target.value })} placeholder="User or system name" />
            </div>
            <div>
              <Label>Action</Label>
              <Input value={form.action} onChange={(ev) => setForm({ ...form, action: ev.target.value })} placeholder="create, update, login…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entity type</Label>
                <Input value={form.entityType} onChange={(ev) => setForm({ ...form, entityType: ev.target.value })} />
              </div>
              <div>
                <Label>Entity ID (optional)</Label>
                <Input value={form.entityId} onChange={(ev) => setForm({ ...form, entityId: ev.target.value })} />
              </div>
            </div>
            <div>
              <Label>Detail</Label>
              <Textarea
                value={form.detail}
                onChange={(ev) => setForm({ ...form, detail: ev.target.value })}
                rows={5}
                placeholder="Full description of what happened"
                className="resize-y min-h-[100px]"
              />
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
        <DialogContent className="flex h-fit max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-3 p-6 pb-4 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="text-sm">
                {view?.action}
              </Badge>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">{view?.entityType}</span>
              {view?.entityId && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{view.entityId}</code>
                </>
              )}
              {view?.channel === 'manual_entry' && (
                <Badge variant="secondary" className="text-xs">
                  manual entry
                </Badge>
              )}
            </div>
            <DialogTitle className="text-left text-base font-normal text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              {view && formatWhen(view.createdAt)}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
            {view && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Who</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">Name</span>
                        <p className="font-medium">{view.actor}</p>
                      </div>
                      {view.actorEmail && (
                        <div>
                          <span className="text-muted-foreground text-xs uppercase tracking-wide">Email</span>
                          <p className="break-all">{view.actorEmail}</p>
                        </div>
                      )}
                      {view.actorRole && (
                        <div>
                          <span className="text-muted-foreground text-xs uppercase tracking-wide">Role in admin UI</span>
                          <p>{view.actorRole}</p>
                        </div>
                      )}
                      {view.staffUserId && (
                        <div>
                          <span className="text-muted-foreground text-xs uppercase tracking-wide">Staff user ID</span>
                          <p className="font-mono text-xs break-all">{view.staffUserId}</p>
                        </div>
                      )}
                      {view.impersonating && (
                        <Badge variant="outline" className="text-amber-700 border-amber-600/40">
                          Impersonation session
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">What</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">Resource</span>
                        <p>
                          {view.entityType}
                          {view.entityId && <span className="text-muted-foreground"> · {view.entityId}</span>}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">Sync</span>
                        <p>{view.apiConnected ? 'Live API (Django)' : 'Local / offline demo'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed whitespace-pre-wrap break-words">{view.detail}</CardContent>
                </Card>

                {(view.userAgent || metadataPretty) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {view.userAgent && (
                        <Card>
                          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">Client</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs font-mono text-muted-foreground break-all whitespace-pre-wrap">{view.userAgent}</p>
                          </CardContent>
                        </Card>
                      )}
                      {metadataPretty && (
                        <Card>
                          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                            <FileJson className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">Structured metadata</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="max-h-[min(50vh,28rem)] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/80 p-3 font-mono text-xs">
                              {metadataPretty}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete log entry?</AlertDialogTitle>
            <AlertDialogDescription>This removes the row from the audit list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) {
                  deleteActivityLog(deleteId);
                  toast({ title: 'Deleted' });
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

export default AdminActivityLogs;
