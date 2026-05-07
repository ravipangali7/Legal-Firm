import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useAdminStore, type Project, type Client, type AdminUser } from '@/store/adminStore';

const empty: Omit<Project, 'id' | 'progress'> = {
  name: '', client: '', type: '', status: 'planning', dueDate: '', team: [],
};

type ProjectClientOption = { key: string; value: string; label: string; disabled?: boolean };

/** CRM rows for accounts with the Client role, plus optional CRM-only row when editing/assigning an existing project. */
function buildProjectClientSelectOptions(
  users: AdminUser[],
  clients: Client[],
  hintCompany: string | null | undefined
): ProjectClientOption[] {
  const out: ProjectClientOption[] = [];
  const seen = new Set<string>();
  const push = (o: ProjectClientOption) => {
    if (seen.has(o.value)) return;
    seen.add(o.value);
    out.push(o);
  };

  if (hintCompany) {
    const cur = clients.find((c) => c.company === hintCompany);
    if (cur) {
      const linked = users.some(
        (u) =>
          u.role === 'client' &&
          (u.email || '').trim().toLowerCase() === cur.email.trim().toLowerCase()
      );
      if (!linked) {
        push({
          key: `crm-${cur.id}`,
          value: cur.company,
          label: `${cur.company} (CRM record, no Client-role login)`,
        });
      }
    }
  }

  for (const u of users) {
    if (u.role !== 'client' || !(u.email || '').trim()) continue;
    const em = u.email.trim().toLowerCase();
    const row = clients.find((c) => c.email.trim().toLowerCase() === em);
    const value = row?.company ?? u.email.trim();
    const label = row
      ? `${row.company} (${u.email})`
      : `${(u.name || '').trim() || u.email} — refresh admin data after assigning Client role`;
    push({ key: u.id, value, label, disabled: !row });
  }

  return out;
}

const AdminProjects = () => {
  const { projects, clients, users, addProject, updateProject, deleteProject, assignProjectClient, apiConnected } =
    useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(empty);
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Project | null>(null);
  const [assignClient, setAssignClient] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAssign = (p: Project) => {
    setAssignTarget(p);
    setAssignClient(p.client);
  };

  const filtered = useMemo(() => projects.filter((p) => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || p.status === statusFilter;
    return ms && mst;
  }), [projects, search, statusFilter]);

  const projectDialogClientOptions = useMemo(
    () => buildProjectClientSelectOptions(users, clients, open && editing ? editing.client : null),
    [users, clients, open, editing]
  );

  const assignDialogClientOptions = useMemo(
    () => buildProjectClientSelectOptions(users, clients, assignTarget?.client),
    [users, clients, assignTarget?.client]
  );

  const renderClientSelectItems = useCallback((opts: ProjectClientOption[]) => {
    return opts.map((o) => (
      <SelectItem key={o.key} value={o.value} disabled={o.disabled}>
        {o.label}
      </SelectItem>
    ));
  }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setProgress(0); setOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setForm({ name: p.name, client: p.client, type: p.type, status: p.status, dueDate: p.dueDate, team: p.team }); setProgress(p.progress); setOpen(true); };

  const submit = async () => {
    if (!form.name || !form.client) { toast({ title: 'Name and client required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) {
        const { team: _team, ...projectPatch } = form;
        await updateProject(editing.id, { ...projectPatch, progress });
        toast({ title: 'Project updated' });
      } else {
        await addProject(form);
        toast({ title: 'Project created' });
      }
      setOpen(false);
    } catch {
      toast({ title: 'Could not save project', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Track ongoing client engagements</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Project</Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search project or client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No projects found</TableCell></TableRow>}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.client}</TableCell>
                <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                <TableCell><Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{p.status.replace('_',' ')}</Badge></TableCell>
                <TableCell className="w-40">
                  <div className="flex items-center gap-2"><Progress value={p.progress} className="h-2" /><span className="text-xs w-9 text-right">{p.progress}%</span></div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.dueDate}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setView(p)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAssign(p)}><UserPlus className="h-4 w-4 mr-2" />Assign client</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={!!assignTarget}
        onOpenChange={(o) => {
          if (!o) {
            setAssignTarget(null);
            setAssignClient('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign client</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Project <span className="font-medium text-foreground">{assignTarget.name}</span>
                {apiConnected
                  ? '. Saving notifies the client by email, SMS (if configured), and in-app when their email matches an account.'
                  : '.'}
              </p>
              <div>
                <Label>Client</Label>
                <Select value={assignClient} onValueChange={setAssignClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>{renderClientSelectItems(assignDialogClientOptions)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignTarget(null); setAssignClient(''); }} disabled={assignSaving}>
              Cancel
            </Button>
            <Button
              disabled={assignSaving || !assignTarget || !assignClient}
              onClick={async () => {
                if (!assignTarget || !assignClient) return;
                if (assignTarget.client === assignClient) {
                  toast({ title: 'No change', description: 'Select a different client to update this project.' });
                  return;
                }
                setAssignSaving(true);
                try {
                  await assignProjectClient(assignTarget.id, assignClient);
                  toast({
                    title: 'Client assigned',
                    description: apiConnected
                      ? 'The client has been notified by email, SMS (if Twilio is configured), and in-app when their email matches a user account.'
                      : 'Project updated locally. Connect the API for live email, SMS, and in-app notifications.',
                  });
                  setAssignTarget(null);
                  setAssignClient('');
                } catch {
                  toast({ title: 'Could not assign client', variant: 'destructive' });
                } finally {
                  setAssignSaving(false);
                }
              }}
            >
              {assignSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit project' : 'New project'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Project name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client</Label>
                <Select value={form.client} onValueChange={(v) => setForm({ ...form, client: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{renderClientSelectItems(projectDialogClientOptions)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Tax / Corporate / IP..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: Project['status']) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planning">Planning</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            {editing && (
              <div>
                <Label>Progress: {progress}%</Label>
                <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} min={0} max={100} step={5} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{view?.name}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{view.client}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{view.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{view.status.replace('_',' ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Progress</span><span>{view.progress}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{view.dueDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Team</span><span>{view.team.join(', ')}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) { deleteProject(deleteId); toast({ title: 'Deleted' }); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProjects;
