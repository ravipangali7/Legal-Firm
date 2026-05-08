import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, CheckCircle2, XCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminModulePerm } from '@/hooks/useAdminModulePerm';
import { useAdminStore, type Transaction } from '@/store/adminStore';

const TX_STATUSES: Transaction['status'][] = ['pending', 'verified', 'rejected', 'refunded'];

function statusBadgeVariant(s: Transaction['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'verified') return 'default';
  if (s === 'pending') return 'secondary';
  if (s === 'refunded') return 'outline';
  return 'destructive';
}

const empty: Omit<Transaction, 'id' | 'createdAt'> = {
  invoice: '',
  user: '',
  email: '',
  amount: 0,
  currency: 'NPR',
  method: 'esewa',
  status: 'pending',
  txnCode: '',
  plan: 'premium',
  billingCycle: 'monthly',
};

const AdminTransactions = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, apiConnected } = useAdminStore();
  const canEditTransactions = useAdminModulePerm('Transactions', 'edit');
  const canDeleteTransactions = useAdminModulePerm('Transactions', 'delete');
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(empty);
  const [view, setView] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ tx: Transaction; nextStatus: Transaction['status'] } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  /** Defer opening the alert until after Select/Dropdown portals finish closing; otherwise the same pointer event can dismiss the dialog immediately (Radix dismissable-layer). */
  const openStatusConfirm = useCallback((tx: Transaction, nextStatus: Transaction['status']) => {
    window.setTimeout(() => setStatusConfirm({ tx, nextStatus }), 0);
  }, []);

  useEffect(() => {
    if (!statusConfirm) setRejectReason('');
  }, [statusConfirm]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusConfirm) return;
    if (!canEditTransactions) {
      toast({ title: 'No permission', description: 'You cannot change transactions.', variant: 'destructive' });
      setStatusConfirm(null);
      return;
    }
    if (statusConfirm.nextStatus === 'rejected') {
      const r = rejectReason.trim();
      if (r.length < 3) {
        toast({
          title: 'Reason required',
          description: 'Enter at least 3 characters. This text is sent to the client by SMS.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await updateTransaction(statusConfirm.tx.id, { status: 'rejected', rejectionReason: r });
        toast({
          title: 'Payment rejected',
          description: 'The client receives an SMS with this reason when a valid phone number is on file.',
        });
        setStatusConfirm(null);
      } catch (err) {
        toast({
          title: 'Update failed',
          description: err instanceof Error ? err.message : 'Try again.',
          variant: 'destructive',
        });
      }
      return;
    }
    try {
      await updateTransaction(statusConfirm.tx.id, { status: statusConfirm.nextStatus });
      toast({ title: 'Status updated', description: `Set to ${statusConfirm.nextStatus}.` });
      setStatusConfirm(null);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    }
  }, [rejectReason, statusConfirm, toast, updateTransaction, canEditTransactions]);

  const filtered = useMemo(() => transactions.filter((t) => {
    const ms = !search || t.invoice.toLowerCase().includes(search.toLowerCase()) || t.user.toLowerCase().includes(search.toLowerCase()) || t.txnCode.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || t.status === statusFilter;
    return ms && mst;
  }), [transactions, search, statusFilter]);

  const totals = useMemo(() => ({
    revenue: transactions.filter(t => t.status === 'verified').reduce((s, t) => s + t.amount, 0),
    pending: transactions.filter(t => t.status === 'pending').length,
    rejected: transactions.filter(t => t.status === 'rejected').length,
  }), [transactions]);

  const openAdd = () => { setEditing(null); setForm({ ...empty, invoice: `INV-2026-${String(Math.floor(Math.random()*9000)+1000)}` }); setOpen(true); };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      invoice: t.invoice,
      user: t.user,
      email: t.email,
      amount: t.amount,
      currency: t.currency,
      method: t.method,
      status: t.status,
      txnCode: t.txnCode,
      plan: t.plan ?? 'premium',
      billingCycle: t.billingCycle ?? 'monthly',
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!canEditTransactions) {
      toast({ title: 'No permission', description: 'You cannot change transactions.', variant: 'destructive' });
      return;
    }
    if (!form.invoice || !form.user || form.amount <= 0) {
      toast({ title: 'All fields required', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateTransaction(editing.id, form);
        toast({ title: 'Transaction updated' });
      } else {
        addTransaction(form);
        toast({ title: 'Transaction created' });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">All payments & verifications</p>
        </div>
        <Button onClick={openAdd} disabled={!canEditTransactions}>
          <Plus className="h-4 w-4 mr-2" />
          Manual Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Verified Revenue</div><div className="text-2xl font-bold mt-1">NPR {totals.revenue.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pending</div><div className="text-2xl font-bold mt-1">{totals.pending}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Rejected</div><div className="text-2xl font-bold mt-1">{totals.rejected}</div></Card>
      </div>

      {apiConnected && !canEditTransactions ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Transaction changes</AlertTitle>
          <AlertDescription className="text-sm">
            You do not have permission to edit transactions. Pending verification, refunds, and edits are disabled.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoice, user, txn code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Txn Code</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No transactions found</TableCell></TableRow>)}
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.invoice}</TableCell>
                <TableCell><div className="font-medium">{t.user}</div><div className="text-xs text-muted-foreground">{t.email}</div></TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{t.method}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{t.txnCode}</TableCell>
                <TableCell className="text-right font-semibold">{t.currency} {t.amount.toLocaleString()}</TableCell>
                <TableCell className="min-w-[9rem]">
                  <Select
                    value={t.status}
                    disabled={!canEditTransactions}
                    onValueChange={(v) => {
                      const next = v as Transaction['status'];
                      if (next === t.status) return;
                      if (!canEditTransactions) {
                        toast({ title: 'No permission', description: 'You cannot change transaction status.', variant: 'destructive' });
                        return;
                      }
                      openStatusConfirm(t, next);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] capitalize" aria-label={`Status for ${t.invoice}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TX_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.createdAt}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setView(t)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                      <DropdownMenuItem disabled={!canEditTransactions} onClick={() => openEdit(t)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {t.status === 'pending' && canEditTransactions ? (
                        <>
                          <DropdownMenuItem onClick={() => openStatusConfirm(t, 'verified')}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Verify
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStatusConfirm(t, 'rejected')}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {t.status === 'verified' && canEditTransactions ? (
                        <DropdownMenuItem onClick={() => openStatusConfirm(t, 'refunded')}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Refund
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canDeleteTransactions}
                        onClick={() => setDeleteId(t.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit transaction' : 'New transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={form.invoice} onChange={(e) => setForm({ ...form, invoice: e.target.value })} /></div>
              <div><Label>Txn Code</Label><Input value={form.txnCode} onChange={(e) => setForm({ ...form, txnCode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>User name</Label><Input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v: Transaction['currency']) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NPR">NPR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Method</Label>
                <Select
                  value={form.method}
                  onValueChange={(v: Transaction['method']) => setForm({ ...form, method: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="esewa">eSewa</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="stripe">Stripe</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: Transaction['status']) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Package length (on verify)</Label>
                <Select
                  value={form.billingCycle ?? 'monthly'}
                  onValueChange={(v: 'monthly' | 'six_month' | 'yearly') => setForm({ ...form, billingCycle: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">One month</SelectItem>
                    <SelectItem value="six_month">Six months</SelectItem>
                    <SelectItem value="yearly">One year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={!canEditTransactions}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaction {view?.invoice}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              {Object.entries(view).filter(([k]) => k !== 'id').map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-1 last:border-0"><span className="text-muted-foreground capitalize">{k}</span><span className="font-medium">{String(v)}</span></div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!statusConfirm} onOpenChange={(o) => !o && setStatusConfirm(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Change transaction status?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {statusConfirm && (
                  <p>
                    Invoice <span className="font-mono font-medium">{statusConfirm.tx.invoice}</span> will move from{' '}
                    <Badge variant={statusBadgeVariant(statusConfirm.tx.status)} className="mx-0.5 capitalize align-middle">
                      {statusConfirm.tx.status}
                    </Badge>{' '}
                    to{' '}
                    <Badge variant={statusBadgeVariant(statusConfirm.nextStatus)} className="mx-0.5 capitalize align-middle">
                      {statusConfirm.nextStatus}
                    </Badge>
                    .
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusConfirm?.nextStatus === 'rejected' ? (
            <div className="space-y-2 py-1">
              <Label htmlFor="reject-reason">Rejection reason (included in client SMS)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why the payment could not be approved…"
                rows={4}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void confirmStatusChange();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete transaction?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) { deleteTransaction(deleteId); toast({ title: 'Deleted' }); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTransactions;
