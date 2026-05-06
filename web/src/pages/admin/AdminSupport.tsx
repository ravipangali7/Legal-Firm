import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminStore,
  type SupportTicket,
  type SupportTicketStatus,
  type SupportPriority,
} from '@/store/adminStore';
import { isInboundContactTicketId } from '@/lib/contactSupportInbox';
import { cn } from '@/lib/utils';

const emptyTicket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'> = {
  subject: '',
  description: '',
  requester: '',
  email: '',
  status: 'open',
  priority: 'medium',
  assignee: '',
};

const AdminSupport = () => {
  const { supportTickets, addSupportTicket, updateSupportTicket, deleteSupportTicket, addTicketReply } = useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<SupportTicket | null>(null);
  const [form, setForm] = useState(emptyTicket);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTicketId, setViewTicketId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('Support Team');

  const filtered = useMemo(
    () =>
      supportTickets.filter((t) => {
        const q =
          !search ||
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.requester.toLowerCase().includes(search.toLowerCase()) ||
          t.email.toLowerCase().includes(search.toLowerCase());
        const st = statusFilter === 'all' || t.status === statusFilter;
        return q && st;
      }),
    [supportTickets, search, statusFilter]
  );

  const openCount = supportTickets.filter((t) => ['open', 'in_progress', 'waiting'].includes(t.status)).length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyTicket);
    setOpenForm(true);
  };

  const openEdit = (t: SupportTicket) => {
    setEditing(t);
    setForm({
      subject: t.subject,
      description: t.description,
      requester: t.requester,
      email: t.email,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee || '',
    });
    setOpenForm(true);
  };

  const submitTicket = () => {
    if (!form.subject.trim() || !form.requester.trim() || !form.email.trim()) {
      toast({ title: 'Subject, requester, and email are required', variant: 'destructive' });
      return;
    }
    const assignee = form.assignee?.trim() || undefined;
    if (editing) {
      updateSupportTicket(editing.id, { ...form, assignee });
      toast({ title: 'Ticket updated' });
    } else {
      const initial = form.description.trim()
        ? [
            {
              id: `msg_seed_${Date.now()}`,
              author: form.requester,
              body: form.description,
              createdAt: new Date().toISOString().slice(0, 19),
            },
          ]
        : [];
      addSupportTicket({
        subject: form.subject,
        description: form.description.trim(),
        requester: form.requester,
        email: form.email,
        status: form.status as SupportTicketStatus,
        priority: form.priority as SupportPriority,
        assignee,
        messages: initial,
      });
      toast({ title: 'Ticket created' });
    }
    setOpenForm(false);
  };

  const submitReply = () => {
    if (!viewTicketId || !replyBody.trim()) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return;
    }
    addTicketReply(viewTicketId, replyAuthor.trim() || 'Agent', replyBody.trim());
    setReplyBody('');
    toast({ title: 'Reply added' });
  };

  const ticketForDialog = viewTicketId ? supportTickets.find((x) => x.id === viewTicketId) ?? null : null;

  useEffect(() => {
    if (!viewTicketId || !isInboundContactTicketId(viewTicketId)) return;
    const ticket = supportTickets.find((x) => x.id === viewTicketId);
    if (!ticket?.viewedByAdmin) {
      updateSupportTicket(viewTicketId, { viewedByAdmin: true });
    }
  }, [viewTicketId, supportTickets, updateSupportTicket]);

  const openTicketDialog = (id: string) => {
    setViewTicketId(id);
    setReplyBody('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground mt-1">
            {supportTickets.length} tickets · {openCount} open / in progress / waiting
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          New ticket
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search subject, requester, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No tickets
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => {
              const unread = isInboundContactTicketId(t.id) && !t.viewedByAdmin;
              return (
              <TableRow
                key={t.id}
                className={cn(unread && 'bg-sky-50/90 dark:bg-sky-950/35')}
              >
                <TableCell
                  className={cn(
                    'max-w-[220px]',
                    unread ? 'font-bold' : 'font-medium'
                  )}
                >
                  <div className="truncate">{t.subject}</div>
                  <div className={cn('text-xs truncate', unread ? 'text-foreground/80 font-semibold' : 'text-muted-foreground')}>
                    {t.email}
                  </div>
                </TableCell>
                <TableCell className={cn(unread && 'font-bold')}>{t.requester}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {t.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === 'closed' || t.status === 'resolved' ? 'secondary' : 'default'} className="capitalize">
                    {t.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{t.updatedAt.replace('T', ' ')}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center justify-end gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      title="View thread"
                      aria-label={`View support ticket: ${t.subject}`}
                      onClick={() => openTicketDialog(t.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openTicketDialog(t.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View & reply
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit ticket' : 'New support ticket'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Requester</Label>
                <Input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Initial message body" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: SupportTicketStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: SupportPriority) => setForm({ ...form, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assignee</Label>
                <Input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>
              Cancel
            </Button>
            <Button onClick={submitTicket}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ticketForDialog} onOpenChange={(o) => !o && setViewTicketId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{ticketForDialog?.subject}</DialogTitle>
          </DialogHeader>
          {ticketForDialog && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="capitalize">{ticketForDialog.priority}</Badge>
                <Badge variant="secondary" className="capitalize">
                  {ticketForDialog.status.replace('_', ' ')}
                </Badge>
                <span className="text-muted-foreground">
                  {ticketForDialog.requester} · {ticketForDialog.email}
                </span>
                {ticketForDialog.assignee && <span className="text-muted-foreground">Assigned: {ticketForDialog.assignee}</span>}
              </div>
              {ticketForDialog.description && <p className="text-sm text-muted-foreground">{ticketForDialog.description}</p>}
              <div className="border rounded-md flex-1 min-h-[200px] flex flex-col">
                <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  Thread
                </div>
                <ScrollArea className="flex-1 p-3 max-h-[280px]">
                  <div className="space-y-4">
                    {ticketForDialog.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      ticketForDialog.messages.map((m) => (
                        <div key={m.id} className="border-b border-border/60 pb-3 last:border-0">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">{m.author}</span>
                            <span>{m.createdAt.replace('T', ' ')}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Reply as</Label>
                <Input value={replyAuthor} onChange={(e) => setReplyAuthor(e.target.value)} className="mb-2" />
                <Label>Message</Label>
                <Textarea rows={3} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type a reply…" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Select
              value={ticketForDialog?.status ?? 'open'}
              onValueChange={(v: SupportTicketStatus) => {
                if (ticketForDialog) updateSupportTicket(ticketForDialog.id, { status: v });
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px] mr-auto">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setViewTicketId(null)}>
              Close
            </Button>
            <Button onClick={submitReply}>Send reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>Removes the ticket and its message thread.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) {
                  deleteSupportTicket(deleteId);
                  toast({ title: 'Ticket deleted' });
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

export default AdminSupport;
