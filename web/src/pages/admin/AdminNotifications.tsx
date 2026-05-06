import { useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, MailOpen, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminStore,
  type AdminNotification,
  type AdminNotificationDelivery,
  type NotificationBulkAudience,
} from '@/store/adminStore';

function defaultDelivery(): AdminNotificationDelivery {
  return {
    channelInApp: true,
    channelSms: false,
    channelPush: false,
    bulkAudiences: [],
    bulkPhoneNumbers: '',
    individualRecipients: '',
  };
}

function mergeDelivery(d?: AdminNotificationDelivery | null): AdminNotificationDelivery {
  const base = defaultDelivery();
  if (!d) return base;
  return {
    ...base,
    ...d,
    bulkAudiences: Array.isArray(d.bulkAudiences) ? [...d.bulkAudiences] : [],
  };
}

function countLines(s: string): number {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
}

const AUDIENCE_CONFIG: { id: NotificationBulkAudience; label: string; hint: string }[] = [
  { id: 'all_users', label: 'All platform users', hint: 'Every account role' },
  { id: 'all_clients', label: 'All clients', hint: 'Users with client access' },
  { id: 'all_subscribers', label: 'All subscribers', hint: 'Paid or active subscription' },
  { id: 'staff', label: 'Staff (admin & editors)', hint: 'super_admin, admin, editor' },
];

function formatDeliverySummary(n: AdminNotification): string {
  if (!n.delivery) return '—';
  const d = n.delivery;
  const channels: string[] = [];
  if (d.channelInApp) channels.push('In-app');
  if (d.channelSms) channels.push('SMS');
  if (d.channelPush) channels.push('Push');
  const parts: string[] = [channels.join(' · ') || '—'];
  if (d.bulkAudiences.length) parts.push(`${d.bulkAudiences.length} segment(s)`);
  const nPhones = countLines(d.bulkPhoneNumbers);
  if (nPhones) parts.push(`${nPhones} # bulk`);
  const nInd = countLines(d.individualRecipients);
  if (nInd) parts.push(`${nInd} individual`);
  return parts.join(' · ');
}

function outboundStatusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === 'sent') return 'border-emerald-500/45 bg-emerald-500/8 text-emerald-900 dark:text-emerald-100';
  if (s === 'skipped') return 'border-border bg-muted/50 text-muted-foreground';
  return 'border-destructive/45 bg-destructive/8 text-destructive';
}

function notificationPreviewTone(type: AdminNotification['type']): string {
  if (type === 'system') return 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100';
  if (type === 'warning') return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100';
  if (type === 'success')
    return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100';
  return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100';
}

function OutboundReportBadges({ rep }: { rep: AdminNotificationDelivery['outboundReport'] }) {
  if (!rep) return null;
  const items = [
    { key: 'email', label: 'Email', r: rep.email },
    { key: 'sms', label: 'SMS', r: rep.sms },
    { key: 'inApp', label: 'In-app', r: rep.inApp },
  ].filter((x) => x.r?.status);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1" role="list" aria-label="Delivery channels">
      {items.map(({ key, label, r }) => {
        const tip = [r!.to, r!.detail].filter(Boolean).join(' — ');
        return (
          <span
            key={key}
            role="listitem"
            title={tip || undefined}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight tabular-nums max-w-full',
              outboundStatusTone(r!.status)
            )}
          >
            {r!.status === 'sent' ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            ) : r!.status === 'skipped' ? (
              <MinusCircle className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            ) : (
              <XCircle className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            )}
            <span className="truncate">
              {label}
              <span className="opacity-60"> · </span>
              {r!.status}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function NotificationDeliveryColumn({ n }: { n: AdminNotification }) {
  const d = n.delivery;
  if (!d) return <span className="text-muted-foreground text-xs">—</span>;
  if (d.automatedOutbound || d.outboundReport) {
    const rep = d.outboundReport;
    if (rep && (rep.email || rep.sms || rep.inApp)) {
      return <OutboundReportBadges rep={rep} />;
    }
    return <span className="text-xs text-muted-foreground">Automated</span>;
  }
  return <span className="text-xs text-muted-foreground leading-snug">{formatDeliverySummary(n)}</span>;
}

function OutboundReportDetailList({ rep }: { rep: NonNullable<AdminNotificationDelivery['outboundReport']> }) {
  const rows = [
    { label: 'Email', r: rep.email },
    { label: 'SMS', r: rep.sms },
    { label: 'In-app', r: rep.inApp },
  ].filter((x) => x.r?.status);
  if (!rows.length) {
    return <p className="text-muted-foreground text-[11px]">No per-channel delivery record on this entry.</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map(({ label, r }) => (
        <div key={label} className="rounded-md border border-border bg-muted/15 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-medium">{label}</span>
            <span
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                outboundStatusTone(r!.status)
              )}
            >
              {r!.status}
            </span>
          </div>
          {r!.to != null && String(r!.to).trim() !== '' && (
            <p className="text-muted-foreground font-mono text-[11px] break-all">To: {r!.to}</p>
          )}
          {r!.detail ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground leading-relaxed">
              {r!.detail}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type FormState = {
  title: string;
  body: string;
  type: AdminNotification['type'];
  read: boolean;
  link: string;
  delivery: AdminNotificationDelivery;
};

const emptyForm: FormState = {
  title: '',
  body: '',
  type: 'info',
  read: false,
  link: '',
  delivery: defaultDelivery(),
};

const AdminNotifications = () => {
  const {
    notifications,
    addNotification,
    updateNotification,
    deleteNotification,
    markNotificationRead,
    markAllNotificationsRead,
    apiConnected,
  } = useAdminStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNotification | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<AdminNotification | null>(null);

  const filtered = useMemo(
    () =>
      notifications.filter((n) => {
        const q =
          !search ||
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase());
        const t = typeFilter === 'all' || n.type === typeFilter;
        const r = readFilter === 'all' || (readFilter === 'unread' ? !n.read : n.read);
        return q && t && r;
      }),
    [notifications, search, typeFilter, readFilter]
  );

  const unread = notifications.filter((n) => !n.read).length;

  const patchDelivery = (patch: Partial<AdminNotificationDelivery>) => {
    setForm((f) => ({ ...f, delivery: { ...f.delivery, ...patch } }));
  };

  const toggleBulkAudience = (id: NotificationBulkAudience, checked: boolean) => {
    setForm((f) => {
      const next = new Set(f.delivery.bulkAudiences);
      if (checked) next.add(id);
      else next.delete(id);
      return { ...f, delivery: { ...f.delivery, bulkAudiences: [...next] } };
    });
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, read: false, delivery: defaultDelivery() });
    setOpen(true);
  };
  const openEdit = (n: AdminNotification) => {
    setEditing(n);
    setForm({
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.read,
      link: n.link || '',
      delivery: mergeDelivery(n.delivery),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'Title and body required', variant: 'destructive' });
      return;
    }
    if (!form.delivery.channelInApp && !form.delivery.channelSms && !form.delivery.channelPush) {
      toast({ title: 'Select at least one channel', description: 'Choose In-app, SMS, and/or Push.', variant: 'destructive' });
      return;
    }
    const link = form.link?.trim() || undefined;
    const delivery: AdminNotificationDelivery = {
      ...form.delivery,
      bulkPhoneNumbers: form.delivery.bulkPhoneNumbers.trim(),
      individualRecipients: form.delivery.individualRecipients.trim(),
    };
    const bulkN = countLines(delivery.bulkPhoneNumbers);
    const indN = countLines(delivery.individualRecipients);
    const summaryBits: string[] = [];
    if (delivery.bulkAudiences.length) summaryBits.push(`${delivery.bulkAudiences.length} bulk segment(s)`);
    if (bulkN) summaryBits.push(`${bulkN} bulk number(s)`);
    if (indN) summaryBits.push(`${indN} individual line(s)`);
    const summary = summaryBits.length ? summaryBits.join(' · ') : 'In-app / channels only (no extra lists)';

    if (editing && apiConnected && editing.source === 'inbox') {
      if (editing.read !== form.read) {
        updateNotification(editing.id, { read: form.read });
      }
      toast({ title: 'Notification updated', description: 'Read state saved for this system alert.' });
      setOpen(false);
      return;
    }

    if (editing) {
      updateNotification(editing.id, {
        title: form.title,
        body: form.body,
        type: form.type,
        read: form.read,
        link,
        delivery,
      });
      toast({ title: 'Notification updated', description: summary });
    } else {
      addNotification({ title: form.title, body: form.body, type: form.type, read: form.read, link, delivery });
      toast({ title: 'Notification created', description: summary });
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {notifications.length} total · {unread} unread
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              markAllNotificationsRead();
              toast({ title: 'All marked read' });
            }}
            disabled={unread === 0}
          >
            <MailOpen className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New notification
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or body…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] max-w-[320px]">Title</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="min-w-[160px] w-[220px]">Delivery</TableHead>
                <TableHead className="w-[88px]">Status</TableHead>
                <TableHead className="whitespace-nowrap w-[150px]">Created</TableHead>
                <TableHead className="text-right w-[72px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No notifications
                </TableCell>
              </TableRow>
            )}
            {filtered.map((n) => (
              <TableRow key={n.id} className="align-top">
                <TableCell className="font-medium max-w-[320px] py-3">
                  <div className="line-clamp-2 text-sm leading-snug">{n.title}</div>
                  {n.body.trim() ? (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{n.body}</div>
                  ) : null}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className="capitalize">
                    {n.type}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 align-top">
                  <NotificationDeliveryColumn n={n} />
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={n.read ? 'secondary' : 'default'}>{n.read ? 'Read' : 'Unread'}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap py-3">{n.createdAt.replace('T', ' ')}</TableCell>
                <TableCell className="text-right py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setView(n);
                          if (!n.read) markNotificationRead(n.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          markNotificationRead(n.id, !n.read);
                          toast({ title: n.read ? 'Marked unread' : 'Marked read' });
                        }}
                      >
                        <MailOpen className="h-4 w-4 mr-2" />
                        Toggle read
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(n)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteId(n.id)} className="text-destructive">
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
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit notification' : 'New notification'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: AdminNotification['type']) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Read state</Label>
                <Select value={form.read ? 'read' : 'unread'} onValueChange={(v) => setForm({ ...form, read: v === 'read' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Optional link (in-app path)</Label>
              <Input placeholder="/admin/users" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-base">Channels</Label>
                <p className="text-xs text-muted-foreground mb-2">Where this message is sent when you dispatch it.</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.delivery.channelInApp}
                      onCheckedChange={(c) => patchDelivery({ channelInApp: c === true })}
                    />
                    In-app
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.delivery.channelSms} onCheckedChange={(c) => patchDelivery({ channelSms: c === true })} />
                    SMS
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.delivery.channelPush} onCheckedChange={(c) => patchDelivery({ channelPush: c === true })} />
                    Push
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-base">Bulk delivery (at once)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select segments to broadcast the same title and body to everyone in that group. Applies to the channels you checked
                  above (SMS/Push use phone numbers on file for those users).
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {AUDIENCE_CONFIG.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-start gap-2 rounded-md border border-border p-2 text-sm cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={form.delivery.bulkAudiences.includes(a.id)}
                        onCheckedChange={(c) => toggleBulkAudience(a.id, c === true)}
                      />
                      <span>
                        <span className="font-medium block">{a.label}</span>
                        <span className="text-xs text-muted-foreground">{a.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Bulk phone numbers (SMS / push)</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  One number per line (include country code when possible). Used for bulk SMS and push in addition to any segment
                  above.
                </p>
                <Textarea
                  rows={3}
                  placeholder={'+9779801234567\n+9779812345678'}
                  value={form.delivery.bulkPhoneNumbers}
                  onChange={(e) => patchDelivery({ bulkPhoneNumbers: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label>Individual recipients</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  One email or user ID per line. Each line is treated as a separate recipient so you can target specific accounts
                  without a mass broadcast.
                </p>
                <Textarea
                  rows={3}
                  placeholder={'gita@abc.com.np\nu5\nhari@gmail.com'}
                  value={form.delivery.individualRecipients}
                  onChange={(e) => patchDelivery({ individualRecipients: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.title}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {view.type}
                </Badge>
                <Badge variant={view.read ? 'secondary' : 'default'}>{view.read ? 'Read' : 'Unread'}</Badge>
              </div>
              <div className={cn('rounded-md border px-3 py-2.5 text-sm whitespace-pre-wrap', notificationPreviewTone(view.type))}>
                {view.body || 'No additional details.'}
              </div>
              <p className="text-muted-foreground text-xs">{view.createdAt.replace('T', ' ')}</p>
              {view.link && (
                <p className="text-xs">
                  Link: <span className="font-mono">{view.link}</span>
                </p>
              )}
              {view.delivery && (
                <div className="rounded-md border border-border p-3 space-y-3 text-xs">
                  <p className="font-medium text-sm">Delivery</p>
                  {(view.delivery.automatedOutbound || view.delivery.outboundReport) && view.delivery.outboundReport ? (
                    <OutboundReportDetailList rep={view.delivery.outboundReport} />
                  ) : view.delivery.automatedOutbound ? (
                    <p className="text-muted-foreground">Automated outbound (no per-channel log stored).</p>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{formatDeliverySummary(view)}</p>
                  )}
                  {view.delivery.automatedOutbound && view.delivery.outboundReport ? (
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                      Channel details above are for staff troubleshooting. Recipients only see the notification title and body.
                    </p>
                  ) : null}
                  {view.delivery.bulkAudiences.length > 0 && (
                    <p>
                      <span className="font-medium text-foreground">Bulk segments: </span>
                      {view.delivery.bulkAudiences
                        .map((id) => AUDIENCE_CONFIG.find((x) => x.id === id)?.label ?? id)
                        .join(', ')}
                    </p>
                  )}
                  {countLines(view.delivery.bulkPhoneNumbers) > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Bulk numbers</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] bg-muted/50 p-2 rounded">{view.delivery.bulkPhoneNumbers.trim()}</pre>
                    </div>
                  )}
                  {countLines(view.delivery.individualRecipients) > 0 && (
                    <div>
                      <p className="font-medium text-foreground">Individual lines</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] bg-muted/50 p-2 rounded">{view.delivery.individualRecipients.trim()}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) {
                  deleteNotification(deleteId);
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

export default AdminNotifications;
