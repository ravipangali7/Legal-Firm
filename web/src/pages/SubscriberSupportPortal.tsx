import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { LifeBuoy, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAuthMyContactMessages, postPublicContact } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, evaluatePortalPerm, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, 'Subject is required').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1000),
});

function safeFormatWhen(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy, HH:mm');
  } catch {
    return iso;
  }
}

/** Messages stored by admins (Support); optional compose when Role grants Support → Create. */
export default function SubscriberSupportPortal() {
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canCreate = user ? evaluatePortalPerm(user, PORTAL_PERM_MODULES.support, 'create') : false;

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: user.full_name?.trim() || '',
      email: user.email?.trim() || '',
    }));
  }, [user]);

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['auth-my-contact-messages', user?.id],
    queryFn: fetchAuthMyContactMessages,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
    );
  }

  if (!evaluatePortalModuleView(user, PORTAL_PERM_MODULES.support)) {
    return <Navigate to={hubPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const data = result.data;
      await postPublicContact({
        name: data.name,
        email: data.email,
        phone: data.phone?.trim() || '',
        subject: data.subject,
        message: data.message,
      });
      toast({ title: 'Message sent', description: 'Your firm will review this in Admin → Support.' });
      setForm((f) => ({ ...f, subject: '', message: '' }));
      await qc.invalidateQueries({ queryKey: ['auth-my-contact-messages', user.id] });
    } catch (err) {
      toast({
        title: 'Could not send message',
        description: err instanceof Error ? err.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 w-full">
      <div className="flex items-start gap-3">
        <LifeBuoy className="h-10 w-10 text-primary-onBg shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Messages you have submitted are listed below. Staff manage replies from Admin → Support.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {isError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-destructive">Could not load messages.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {!isLoading && !isError && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : null}
          {!isLoading && !isError
            ? rows.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-sm">{r.subject}</p>
                    <Badge variant="secondary" className="font-normal shrink-0">
                      {safeFormatWhen(r.created_at)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.message}</p>
                </div>
              ))
            : null}
        </CardContent>
      </Card>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div className="grid gap-2">
                <Label htmlFor="portal-sup-name">Name</Label>
                <Input
                  id="portal-sup-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={errors.name ? 'border-destructive' : undefined}
                />
                {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-sup-email">Email</Label>
                <Input
                  id="portal-sup-email"
                  type="email"
                  value={form.email}
                  readOnly
                  className="bg-muted/50"
                  aria-readonly
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-sup-phone">Phone (optional)</Label>
                <Input
                  id="portal-sup-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-sup-subject">Subject</Label>
                <Input
                  id="portal-sup-subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className={errors.subject ? 'border-destructive' : undefined}
                />
                {errors.subject ? <p className="text-xs text-destructive">{errors.subject}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portal-sup-msg">Message</Label>
                <Textarea
                  id="portal-sup-msg"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className={errors.message ? 'border-destructive' : undefined}
                />
                {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : null}
              </div>
              <Button type="submit" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Sending…' : 'Send'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role can view support history only. Contact your administrator if you need sending enabled.
        </p>
      )}
    </div>
  );
}
