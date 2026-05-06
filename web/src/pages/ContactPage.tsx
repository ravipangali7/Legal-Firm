import { useState } from 'react';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { postPublicContact } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';
import { buildContactAdminNotification, mapPersistedContactRowToSupportTicket } from '@/lib/contactSupportInbox';
import { PageHelpFaqs } from '@/components/PageHelpFaqs';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, 'Subject is required').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1000),
});

const ContactPage = () => {
  const { toast } = useToast();
  const { addSupportTicket, addNotification, addActivityLog, apiConnected, refreshFromApi } = useAdminStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const data = result.data;
      const created = await postPublicContact({
        name: data.name,
        email: data.email,
        phone: data.phone?.trim() || '',
        subject: data.subject,
        message: data.message,
      });
      const ticket = mapPersistedContactRowToSupportTicket(created);
      const notification = buildContactAdminNotification(ticket);
      if (apiConnected) {
        await refreshFromApi();
      } else {
        addSupportTicket({
          subject: ticket.subject,
          description: ticket.description,
          requester: ticket.requester,
          email: ticket.email,
          status: ticket.status,
          priority: ticket.priority,
          assignee: ticket.assignee || '',
          messages: ticket.messages,
          id: ticket.id,
        });
        addNotification({
          title: notification.title,
          body: notification.body,
          type: notification.type,
          link: notification.link,
          id: notification.id,
          read: notification.read,
          createdAt: notification.createdAt,
        });
      }
      addActivityLog({
        actor: 'Public contact form',
        action: 'create',
        entityType: 'SupportTicket',
        entityId: ticket.id,
        detail: `Website contact: ${ticket.subject} (${ticket.email})`,
      });
      toast({ title: 'Message Sent', description: 'We will get back to you within 24 hours.' });
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast({
        title: 'Could not send message',
        description: err instanceof Error ? err.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const info = [
    { icon: MapPin, label: 'Office', value: 'Putalisadak, Kathmandu, Nepal' },
    { icon: Phone, label: 'Phone', value: '+977-1-4234567' },
    { icon: Mail, label: 'Email', value: 'info@taxlexis.com' },
    { icon: Clock, label: 'Hours', value: 'Sun – Fri, 9:00 AM – 6:00 PM' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary-onBg mb-3">Contact Us</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Have a question or need a consultation? Reach out — our team replies within one business day.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <div className="space-y-4">
              {info.map((i) => (
                <Card key={i.label}>
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <i.icon className="h-5 w-5 text-primary-onBg" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{i.label}</div>
                      <div className="font-medium">{i.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                      {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                    {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                  </div>
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? 'Sending…' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <PageHelpFaqs category="Contact" title="Common questions" className="mt-14" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
