import { useCallback, useEffect, useState } from 'react';
import { Mail, Send, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { adminPatch, adminPost } from '@/lib/adminSnapshot';
import { sessionFetch } from '@/lib/api';
import { emailAutomateLabel } from '@/lib/emailAutomate';

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

const PLACEHOLDER_HINT =
  '{{site_name}}, {{user_name}}, {{user_email}}, {{support_email}}, {{login_url}}, {{reset_url}}, {{wallet_url}}, {{otp_code}}, {{otp_expiry_minutes}}, {{invoice}}, {{amount}}, {{currency}}, {{plan}}, {{billing_cycle}}, {{package_end_date}}, {{subscription_end_date}}, {{rejection_reason}}, {{ended_on}}, {{login_time}}';

const AdminEmailTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', enabled: true, description: '' });
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
      toast({ variant: 'destructive', title: 'Could not load templates', description: e instanceof Error ? e.message : 'Error' });
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

  const save = async () => {
    if (!editing) return;
    if (!form.subject.trim() || !form.body.trim()) {
      toast({ variant: 'destructive', title: 'Subject and body are required' });
      return;
    }
    try {
      await adminPatch(`email-templates/${editing.id}/`, {
        name: form.name,
        subject: form.subject,
        body: form.body,
        enabled: form.enabled,
        description: form.description,
      });
      toast({ title: 'Template saved' });
      setEditing(null);
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Save failed', description: e instanceof Error ? e.message : 'Error' });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            Email templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Edit transactional emails sent on signup, login, OTP, payments, and subscription events.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System templates</CardTitle>
          <CardDescription>
            Each row maps to an automated trigger. Use placeholders like <code className="text-xs">{'{{user_name}}'}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automate</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium">{row.automate_label || emailAutomateLabel(row.automate)}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{row.automate}</span>
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{row.subject}</TableCell>
                    <TableCell>
                      <Badge variant={row.enabled ? 'default' : 'secondary'}>{row.enabled ? 'On' : 'Off'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit template — {editing ? emailAutomateLabel(editing.automate) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Display name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
              <Label>Enabled (auto-send when triggered)</Label>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <Label>Body (plain text)</Label>
              <Textarea rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-sm" />
            </div>
            <div>
              <Label>Admin notes</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Placeholders: {PLACEHOLDER_HINT}</p>
            <div className="border-t pt-4 space-y-2">
              <Label>Send test email</Label>
              <div className="flex gap-2">
                <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                <Button type="button" variant="secondary" disabled={testSending} onClick={() => void sendTest()}>
                  <Send className="h-4 w-4 mr-1" />
                  Test
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmailTemplates;
