import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Edit, Trash2, LogIn, Eye, CreditCard, Users, LifeBuoy, FolderKanban, ChevronDown, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { postAdminUserImpersonate } from '@/lib/api';
import { accountTypeDisplayLine } from '@/lib/userDisplay';
import { useAdminStore, type AdminUser, type AdminUserProfile, type AdminUserPatch } from '@/store/adminStore';
import ImageInput from '@/components/admin/cms/ImageInput';
import { Textarea } from '@/components/ui/textarea';
import type { UserRole } from '@/components/admin/AdminSidebar';
import { useAdminModulePerm } from '@/hooks/useAdminModulePerm';

function formatUserEmailColumn(u: AdminUser): string {
  const e = u.email ?? '';
  if (e.endsWith('@phone.local') && u.phone?.trim()) return u.phone.trim();
  return e;
}

function formatSubscriptionIso(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(val: string): string | null {
  if (!val?.trim()) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const emptyProfile: AdminUserProfile = {
  user_type: 'individual',
  pan: '',
  vat: '',
  company_name: '',
};

const emptyUser: Omit<AdminUser, 'id' | 'createdAt' | 'lastLogin'> = {
  name: '',
  email: '',
  phone: '',
  role: 'user',
  status: 'active',
  subscribed: false,
  plan: 'free',
  avatar: '',
  profile: { ...emptyProfile },
  subscriptionPeriodStart: null,
  subscriptionPeriodEnd: null,
  planBenefitsEnd: null,
};

const USER_TABLE_ROLES: UserRole[] = ['super_admin', 'admin', 'editor', 'client', 'user'];

const AdminUsers = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    revokeUserSubscription,
    startImpersonation,
    apiConnected,
    transactions,
    clients,
    supportTickets,
    projects,
  } = useAdminStore();
  const { toast } = useToast();
  const { refreshUser, user: authUser } = useAuth();
  const navigate = useNavigate();
  const canCreateUsers = useAdminModulePerm('Users', 'create');
  const canEditUsers = useAdminModulePerm('Users', 'edit');
  const canDeleteUsers = useAdminModulePerm('Users', 'delete');
  const canRevokeSubscription = Boolean(
    (authUser?.is_superuser || authUser?.role === 'super_admin') && canEditUsers
  );

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyUser);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [statusFlow, setStatusFlow] = useState<{ user: AdminUser; next: AdminUser['status'] } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [editSuspendReason, setEditSuspendReason] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          formatUserEmailColumn(u).toLowerCase().includes(q) ||
          (u.phone && u.phone.toLowerCase().includes(q));
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
      }),
    [users, search, roleFilter]
  );

  const viewStats = useMemo(() => {
    if (!viewUser) return null;
    const emailLo = (viewUser.email || '').toLowerCase();
    const name = viewUser.name.trim();
    const matchEmail = (e: string) => (e || '').toLowerCase() === emailLo;
    const txCount = transactions.filter((t) => matchEmail(t.email) || t.user.trim() === name).length;
    const clientCount = clients.filter((c) => matchEmail(c.email) || c.contact.trim() === name).length;
    const ticketCount = supportTickets.filter((t) => matchEmail(t.email) || t.requester.trim() === name).length;
    const projectCount = projects.filter(
      (p) => p.team.some((n) => n.trim() === name) || clients.some((c) => c.company === p.client && (matchEmail(c.email) || c.contact.trim() === name))
    ).length;
    return { txCount, clientCount, ticketCount, projectCount };
  }, [viewUser, transactions, clients, supportTickets, projects]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyUser, profile: { ...emptyProfile } });
    setPassword('');
    setPasswordConfirm('');
    setEditSuspendReason('');
    setOpen(true);
  };
  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditSuspendReason('');
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      subscribed: u.subscribed,
      plan: u.plan,
      avatar: u.avatar || '',
      profile: u.profile ? { ...u.profile } : { ...emptyProfile },
      subscriptionPeriodStart: u.subscriptionPeriodStart ?? null,
      subscriptionPeriodEnd: u.subscriptionPeriodEnd ?? null,
      planBenefitsEnd: u.planBenefitsEnd ?? null,
    });
    setPassword('');
    setPasswordConfirm('');
    setOpen(true);
  };

  const applyRoleFromRow = async (u: AdminUser, role: UserRole) => {
    if (!canEditUsers || u.role === role) return;
    setRoleBusyId(u.id);
    try {
      await updateUser(u.id, { role });
      toast({
        title: 'Role updated',
        description: `${u.name} is now ${role.replace('_', ' ')}.`,
      });
    } catch (e) {
      toast({
        title: 'Could not update role',
        description: e instanceof Error ? e.message : 'Request failed',
        variant: 'destructive',
      });
    } finally {
      setRoleBusyId(null);
    }
  };

  const submit = async () => {
    if (editing && !canEditUsers) {
      toast({ title: 'No permission', description: 'You cannot edit users.', variant: 'destructive' });
      return;
    }
    if (!editing && !canCreateUsers) {
      toast({ title: 'No permission', description: 'You cannot create users.', variant: 'destructive' });
      return;
    }
    const hasEmail = Boolean(form.email?.trim());
    const phoneDigits = form.phone?.replace(/\D/g, '') ?? '';
    if (!form.name?.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (!hasEmail && phoneDigits.length < 10) {
      toast({
        title: 'Email or phone required',
        description: 'Add a valid email, or a phone number with at least 10 digits.',
        variant: 'destructive',
      });
      return;
    }
    if (!editing) {
      if (!password || password.length < 8) {
        toast({ title: 'Password required', description: 'Set a password (at least 8 characters) for the new user.', variant: 'destructive' });
        return;
      }
      if (password !== passwordConfirm) {
        toast({ title: 'Passwords do not match', variant: 'destructive' });
        return;
      }
    } else if (password && password !== passwordConfirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (
      editing &&
      apiConnected &&
      form.status === 'suspended' &&
      editing.status !== 'suspended' &&
      editSuspendReason.trim().length < 3
    ) {
      toast({
        title: 'Suspension reason required',
        description: 'Enter at least a few characters. This text is sent to the user by SMS.',
        variant: 'destructive',
      });
      return;
    }
    const patch: AdminUserPatch = { ...form, ...(password ? { password } : {}) };
    if (editing && apiConnected && form.status === 'suspended' && editing.status !== 'suspended') {
      patch.suspension_reason = editSuspendReason.trim();
    }
    try {
      if (editing) {
        await updateUser(editing.id, patch);
        toast({ title: 'User updated' });
      } else {
        addUser({ ...form, password });
        toast({ title: 'User created' });
      }
      setOpen(false);
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const openStatusFlowFromRow = (u: AdminUser, next: AdminUser['status']) => {
    if (u.status === next) return;
    setSuspendReason('');
    setStatusFlow({ user: u, next });
  };

  const confirmStatusChange = async () => {
    if (!statusFlow) return;
    if (!canEditUsers) {
      toast({ title: 'No permission', description: 'You cannot change user status.', variant: 'destructive' });
      return;
    }
    if (statusFlow.next === 'suspended' && apiConnected && suspendReason.trim().length < 3) {
      toast({
        title: 'Reason required',
        description: 'Enter at least 3 characters. It will be included in the SMS to this user.',
        variant: 'destructive',
      });
      return;
    }
    const patch: AdminUserPatch = { status: statusFlow.next };
    if (statusFlow.next === 'suspended') {
      patch.suspension_reason = suspendReason.trim();
    }
    setStatusSaving(true);
    try {
      await updateUser(statusFlow.user.id, patch);
      toast({ title: 'Status updated' });
      setStatusFlow(null);
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setStatusSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (!canDeleteUsers) {
      toast({ title: 'No permission', description: 'You cannot delete users.', variant: 'destructive' });
      setDeleteId(null);
      return;
    }
    try {
      await deleteUser(deleteId);
      toast({ title: 'User deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const impersonate = async (u: AdminUser) => {
    if (!canEditUsers) {
      toast({ title: 'No permission', description: 'You cannot impersonate users.', variant: 'destructive' });
      return;
    }
    try {
      if (apiConnected) {
        await postAdminUserImpersonate(u.id);
        await refreshUser({ silent: true });
      }
      startImpersonation(u);
      toast({ title: `Now viewing as ${u.name}` });
      if (u.subscribed) navigate('/dashboard');
      else navigate('/account');
    } catch (e) {
      toast({ title: 'Could not switch session', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const setProfile = (p: Partial<AdminUserProfile>) =>
    setForm((f) => ({ ...f, profile: { ...(f.profile ?? emptyProfile), ...p } }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            {users.length} total · {users.filter((u) => u.subscribed).length} subscribed
          </p>
        </div>
        <Button onClick={openAdd} disabled={!canCreateUsers}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Account type</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{formatUserEmailColumn(u)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[10rem]">
                  {accountTypeDisplayLine(u)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 min-w-[9rem] justify-between gap-1 capitalize font-normal"
                        aria-label={`Change role, currently ${u.role.replace('_', ' ')}`}
                        disabled={!canEditUsers || roleBusyId === u.id}
                      >
                        <span>{u.role.replace('_', ' ')}</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {USER_TABLE_ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          disabled={u.role === role}
                          className="capitalize"
                          onSelect={(e) => {
                            e.preventDefault();
                            void applyRoleFromRow(u, role);
                          }}
                        >
                          {role.replace('_', ' ')}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {u.subscriptionPeriodEnd || u.planBenefitsEnd
                      ? formatSubscriptionIso(u.planBenefitsEnd || u.subscriptionPeriodEnd)
                      : u.subscribed
                        ? 'Active (no end date)'
                        : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 min-w-[7.5rem] justify-between gap-1 capitalize font-normal"
                        aria-label={`Change status, currently ${u.status}`}
                        disabled={!canEditUsers}
                      >
                        <span
                          className={
                            u.status === 'active'
                              ? 'text-green-700 dark:text-green-400'
                              : u.status === 'pending'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-destructive'
                          }
                        >
                          {u.status}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(['active', 'pending', 'suspended'] as const).map((st) => (
                        <DropdownMenuItem
                          key={st}
                          disabled={u.status === st}
                          className="capitalize"
                          onSelect={(e) => {
                            e.preventDefault();
                            openStatusFlowFromRow(u, st);
                          }}
                        >
                          {st}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.createdAt}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setViewUser(u);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canEditUsers}
                        onSelect={(e) => {
                          e.preventDefault();
                          openEdit(u);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canEditUsers}
                        onSelect={(e) => {
                          e.preventDefault();
                          void impersonate(u);
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Login as user
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canDeleteUsers}
                        onSelect={(e) => {
                          e.preventDefault();
                          setDeleteId(u.id);
                        }}
                        className="text-destructive"
                      >
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

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit user' : 'Add new user'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <ImageInput label="Avatar" value={form.avatar || ''} onChange={(v) => setForm({ ...form, avatar: v })} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="name@gmail.com (optional if phone is set)"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="10+ digits if no email"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{editing ? 'New password' : 'Password'}</Label>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={editing ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>Confirm password</Label>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={editing ? 'Optional' : 'Repeat password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Profile & tax</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account type</Label>
                <Select value={form.profile?.user_type ?? 'individual'} onValueChange={(v) => setProfile({ user_type: v as AdminUserProfile['user_type'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company name</Label>
                <Input
                  placeholder="If business"
                  value={form.profile?.company_name ?? ''}
                  onChange={(e) => setProfile({ company_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PAN</Label>
                <Input value={form.profile?.pan ?? ''} onChange={(e) => setProfile({ pan: e.target.value })} />
              </div>
              <div>
                <Label>VAT</Label>
                <Input value={form.profile?.vat ?? ''} onChange={(e) => setProfile({ vat: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: 'active' | 'pending' | 'suspended') => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Subscription start</Label>
                  <Input
                    type="datetime-local"
                    value={isoToDatetimeLocal(form.subscriptionPeriodStart ?? null)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subscriptionPeriodStart: datetimeLocalToIso(e.target.value),
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Leave empty to clear.</p>
                </div>
                <div>
                  <Label>Subscription end</Label>
                  <Input
                    type="datetime-local"
                    value={isoToDatetimeLocal(form.subscriptionPeriodEnd ?? null)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subscriptionPeriodEnd: datetimeLocalToIso(e.target.value),
                        planBenefitsEnd: datetimeLocalToIso(e.target.value),
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Library access follows this date unless a separate benefit end is set on the server.
                  </p>
                </div>
              </div>
            ) : null}
            {editing && form.status === 'suspended' && editing.status !== 'suspended' && apiConnected ? (
              <div className="space-y-2">
                <Label htmlFor="edit-suspend-reason">Suspension reason (sent by SMS)</Label>
                <Textarea
                  id="edit-suspend-reason"
                  value={editSuspendReason}
                  onChange={(e) => setEditSuspendReason(e.target.value)}
                  placeholder="Brief reason shown to the user in a text message"
                  rows={3}
                  className="resize-y min-h-[4.5rem]"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={editing ? !canEditUsers : !canCreateUsers}
            >
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View — mini dashboard */}
      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 pr-8">
              {viewUser?.name}
              {viewUser && (
                <Badge variant="outline" className="capitalize font-normal">
                  {viewUser.role.replace('_', ' ')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewUser && viewStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{viewStats.txCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Clients
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{viewStats.clientCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <LifeBuoy className="h-3.5 w-3.5" /> Support tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{viewStats.ticketCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" /> Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{viewStats.projectCount}</CardContent>
                </Card>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Account</h4>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Sign-in email</span>
                    <span className="text-right break-all">{viewUser.email || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Display / login id</span>
                    <span className="text-right break-all">{formatUserEmailColumn(viewUser)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{viewUser.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscribed</span>
                    <span>{viewUser.subscribed ? 'Yes' : 'No'}</span>
                  </div>
                  {apiConnected ? (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Subscription start (request)</span>
                        <span className="text-right">{formatSubscriptionIso(viewUser.subscriptionPeriodStart)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Access / billing end</span>
                        <span className="text-right">{formatSubscriptionIso(viewUser.subscriptionPeriodEnd)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize">{viewUser.status}</span>
                  </div>
                  {canRevokeSubscription &&
                  apiConnected &&
                  (viewUser.subscribed ||
                    viewUser.plan !== 'free' ||
                    viewUser.subscriptionPeriodStart ||
                    viewUser.subscriptionPeriodEnd) ? (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        onClick={() => setRevokeTarget(viewUser)}
                      >
                        <UserX className="h-4 w-4" />
                        Remove subscription access
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Immediately removes library access and clears the paid plan for this user.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Activity</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joined</span>
                    <span>{viewUser.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last login</span>
                    <span>{viewUser.lastLogin}</span>
                  </div>
                  {viewUser.profile && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account type</span>
                        <span className="capitalize">{viewUser.profile.user_type}</span>
                      </div>
                      {viewUser.profile.company_name ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Company</span>
                          <span className="text-right">{viewUser.profile.company_name}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">PAN</span>
                        <span>{viewUser.profile.pan || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">VAT</span>
                        <span>{viewUser.profile.vat || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscription for this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget ? (
                <>
                  This will immediately end library access for <strong>{revokeTarget.name}</strong> and set their plan
                  to Free. The change applies as soon as they load the site or open restricted content.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!revokeTarget) return;
                setRevokeBusy(true);
                void (async () => {
                  try {
                    await revokeUserSubscription(revokeTarget.id);
                    toast({ title: 'Subscription removed', description: 'The user no longer has library access.' });
                    setViewUser((v) =>
                      v && v.id === revokeTarget.id
                        ? {
                            ...v,
                            subscribed: false,
                            plan: 'free',
                            subscriptionPeriodStart: null,
                            subscriptionPeriodEnd: null,
                            planBenefitsEnd: null,
                          }
                        : v
                    );
                    setRevokeTarget(null);
                  } catch (err) {
                    toast({
                      title: 'Could not revoke',
                      description: err instanceof Error ? err.message : 'Try again.',
                      variant: 'destructive',
                    });
                  } finally {
                    setRevokeBusy(false);
                  }
                })();
              }}
            >
              Remove access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!statusFlow}
        onOpenChange={(o) => {
          if (!o) {
            setStatusFlow(null);
            setSuspendReason('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change user status?</DialogTitle>
          </DialogHeader>
          {statusFlow ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Set <span className="font-medium text-foreground">{statusFlow.user.name}</span> from{' '}
                <span className="capitalize text-foreground">{statusFlow.user.status}</span> to{' '}
                <span className="capitalize text-foreground">{statusFlow.next}</span>.
              </p>
              {statusFlow.next === 'suspended' && apiConnected ? (
                <div className="space-y-2">
                  <Label htmlFor="row-suspend-reason">Suspension reason (sent by SMS)</Label>
                  <Textarea
                    id="row-suspend-reason"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Brief reason included in the text message to their phone number"
                    rows={3}
                    className="resize-y min-h-[4.5rem] text-foreground"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusFlow(null);
                setSuspendReason('');
              }}
              disabled={statusSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmStatusChange()} disabled={statusSaving}>
              {statusSaving ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
