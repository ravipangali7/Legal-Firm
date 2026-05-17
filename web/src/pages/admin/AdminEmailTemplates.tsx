import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Send, Pencil, Search, Info, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { adminPatch, adminPost } from '@/lib/adminSnapshot';
import { sessionFetch } from '@/lib/api';
import { emailAutomateLabel } from '@/lib/emailAutomate';
import { emailEventTypeLabel } from '@/lib/emailEventType';
import { GLOBAL_EMAIL_PLACEHOLDERS, placeholderToken, placeholdersForAutomate } from '@/lib/emailTemplatePlaceholders';
import { cn } from '@/lib/utils';

export interface EmailTemplateRow {
  id: string;
  automate: string;
  automate_label?: string;
  event_type: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  description: string;
  updated_at?: string;
}

type TemplateForm = {
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  description: string;
};

const emptyForm: TemplateForm = {
  name: '',
  subject: '',
  body: '',
  enabled: true,
  description: '',
};

function formatUpdatedAt(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return (
    <span className={cn('text-xs tabular-nums', n > max ? 'text-destructive' : 'text-muted-foreground')}>
      {n}/{max}
    </span>
  );
}

const AdminEmailTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await sessionFetch('/api/admin/email-templates/');
      const data = (await r.json().catch(() => [])) as EmailTemplateRow[] | { detail?: string };
      if (!r.ok) {
        const detail = typeof data === 'object' && data && 'detail' in data ? String(data.detail) : 'Failed to load';
        throw new Error(detail);
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not load templates',
        description: e instanceof Error ? e.message : 'Error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTestTo((prev) => (prev === '' && user?.email ? user.email : prev));
  }, [user?.email]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.name,
        row.subject,
        row.body,
        row.description,
        row.automate,
        row.automate_label,
        row.event_type,
        emailAutomateLabel(row.automate),
        emailEventTypeLabel(row.event_type),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const enabledCount = useMemo(() => rows.filter((r) => r.enabled).length, [rows]);

  const openEdit = (row: EmailTemplateRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      subject: row.subject,
      body: row.body,
      enabled: row.enabled,
      description: row.description || '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!editing) return;
    const name = form.name.trim();
    const subject = form.subject.trim();
    const body = form.body.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Display name is required' });
      return;
    }
    if (!subject || !body) {
      toast({ variant: 'destructive', title: 'Subject and body are required' });
      return;
    }
    if (subject.length > 255 || name.length > 255) {
      toast({ variant: 'destructive', title: 'Name and subject must be 255 characters or fewer' });
      return;
    }
    setSaving(true);
    try {
      await adminPatch(`email-templates/${editing.id}/`, {
        name,
        subject,
        body,
        enabled: form.enabled,
        description: form.description.trim(),
      });
      toast({ title: 'Template saved' });
      closeEdit();
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Save failed', description: e instanceof Error ? e.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!editing) return;
    const to = testTo.trim();
    if (!to) {
      toast({ variant: 'destructive', title: 'Enter a test recipient email' });
      return;
    }
    setTestSending(true);
    try {
      await adminPost(`email-templates/${editing.id}/test/`, { to });
      toast({ title: 'Test email sent', description: `Check ${to}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Test failed', description: e instanceof Error ? e.message : 'Error' });
    } finally {
      setTestSending(false);
    }
  };

  const triggerPlaceholders = editing ? placeholdersForAutomate(editing.automate) : GLOBAL_EMAIL_PLACEHOLDERS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary shrink-0" />
            Email templates
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Edit transactional emails for signup, login, OTP, payments, and subscriptions. Each template is tied to one
            system trigger; placeholders are replaced when the message is sent.
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge variant="outline" className="text-sm py-1 px-2.5">
              {rows.length} templates
            </Badge>
            <Badge variant={enabledCount === rows.length ? 'default' : 'secondary'} className="text-sm py-1 px-2.5">
              {enabledCount} auto-send on
            </Badge>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>System templates</CardTitle>
          <CardDescription className="mt-1">
            Templates are created by the platform for each automate trigger. Edit content below; triggers and event keys
            cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, subject, trigger…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search email templates"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading templates…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {rows.length === 0
                ? 'No templates found. Run database migrations to seed defaults.'
                : 'No matches for your search.'}
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Display name</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                    <TableHead className="hidden lg:table-cell">Last updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[88px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(row)}
                    >
                      <TableCell>
                        <span className="font-medium">{row.automate_label || emailAutomateLabel(row.automate)}</span>
                        {row.event_type ? (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {emailEventTypeLabel(row.event_type)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{row.name}</span>
                        {row.description ? (
                          <span className="block text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-[220px]">
                            {row.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm text-muted-foreground">
                        {row.subject}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {formatUpdatedAt(row.updated_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.enabled ? 'default' : 'secondary'}>{row.enabled ? 'On' : 'Off'}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="text-xl pr-8">
              Edit email template
              {editing ? (
                <span className="font-normal text-muted-foreground"> — {emailAutomateLabel(editing.automate)}</span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Fields match the database model: name, subject, body, enabled, and staff description. Automate and event
              type are read-only system identifiers.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid lg:grid-cols-[1fr_min(300px,100%)] gap-0 min-h-0">
                <div className="px-6 py-5 space-y-6">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      System trigger
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Automate</p>
                        <p className="font-medium mt-1">{editing.automate_label || emailAutomateLabel(editing.automate)}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">{editing.automate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event type</p>
                        <p className="font-medium mt-1">
                          {editing.event_type ? emailEventTypeLabel(editing.event_type) : '—'}
                        </p>
                        {editing.event_type ? (
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{editing.event_type}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">Optional legacy key</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last updated</p>
                        <p className="mt-1">{formatUpdatedAt(editing.updated_at)}</p>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Message content
                    </h3>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="tpl-name">Display name</Label>
                        <CharCount value={form.name} max={255} />
                      </div>
                      <Input
                        id="tpl-name"
                        value={form.name}
                        maxLength={255}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Sign up welcome"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Shown in this admin list only; not sent to recipients.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="tpl-subject">Subject line</Label>
                        <CharCount value={form.subject} max={255} />
                      </div>
                      <Input
                        id="tpl-subject"
                        value={form.subject}
                        maxLength={255}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="{{site_name}}: Your subject"
                        className="mt-1.5 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tpl-body">Body (plain text)</Label>
                      <Textarea
                        id="tpl-body"
                        rows={14}
                        value={form.body}
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                        className="mt-1.5 font-mono text-sm leading-relaxed"
                        placeholder={'Hello {{user_name}},\n\n...'}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Line breaks are preserved. Use double curly braces for placeholders.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Delivery &amp; notes
                    </h3>

                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <Switch
                        id="tpl-enabled"
                        checked={form.enabled}
                        onCheckedChange={(enabled) => setForm({ ...form, enabled })}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="tpl-enabled" className="cursor-pointer">
                          Enabled
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          When on, the platform sends this template automatically when the{' '}
                          <span className="font-medium">{emailAutomateLabel(editing.automate)}</span> trigger fires.
                          When off, the send is skipped.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tpl-description">Staff description</Label>
                      <Textarea
                        id="tpl-description"
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="When this email is sent and which placeholders apply…"
                        className="mt-1.5 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Admin-only hint (model field <code className="text-[11px]">description</code>). Not included in
                        outgoing mail.
                      </p>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-3 rounded-lg border border-dashed p-4 bg-muted/10">
                    <Label htmlFor="tpl-test-to" className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send test email
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Sends the current subject and body with sample placeholder values to verify formatting and SMTP.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="tpl-test-to"
                        type="email"
                        value={testTo}
                        onChange={(e) => setTestTo(e.target.value)}
                        placeholder="you@example.com"
                        className="sm:flex-1"
                      />
                      <Button type="button" variant="secondary" disabled={testSending} onClick={() => void sendTest()}>
                        <Send className="h-4 w-4 mr-2" />
                        {testSending ? 'Sending…' : 'Send test'}
                      </Button>
                    </div>
                  </section>
                </div>

                <aside className="border-t lg:border-t-0 lg:border-l bg-muted/20 px-5 py-5">
                  <p className="text-sm font-semibold mb-1">Placeholders</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Recommended for this trigger. Click to copy into subject or body.
                  </p>
                  <ScrollArea className="h-[min(320px,40vh)] lg:h-[calc(92vh-220px)] pr-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      For {emailAutomateLabel(editing.automate)}
                    </p>
                    <ul className="space-y-1.5 mb-4">
                      {triggerPlaceholders.map((key) => (
                        <li key={key}>
                          <button
                            type="button"
                            className="w-full text-left font-mono text-xs px-2 py-1.5 rounded-md hover:bg-background border border-transparent hover:border-border transition-colors"
                            onClick={() => {
                              void navigator.clipboard.writeText(placeholderToken(key));
                              toast({ title: 'Copied', description: placeholderToken(key) });
                            }}
                          >
                            {placeholderToken(key)}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium text-muted-foreground mb-2">All common</p>
                    <ul className="space-y-1">
                      {GLOBAL_EMAIL_PLACEHOLDERS.filter((k) => !triggerPlaceholders.includes(k)).map((key) => (
                        <li key={key}>
                          <button
                            type="button"
                            className="w-full text-left font-mono text-xs px-2 py-1 rounded-md hover:bg-background text-muted-foreground"
                            onClick={() => {
                              void navigator.clipboard.writeText(placeholderToken(key));
                              toast({ title: 'Copied', description: placeholderToken(key) });
                            }}
                          >
                            {placeholderToken(key)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </aside>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;