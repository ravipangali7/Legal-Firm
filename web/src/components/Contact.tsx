import { useState } from 'react';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { postPublicContact } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';
import { buildContactAdminNotification, mapPersistedContactRowToSupportTicket } from '@/lib/contactSupportInbox';

const SERVICE_VALUES = [
  'corporate-law',
  'tax-advisory',
  'intellectual-property',
  'accounting',
  'legal-consultation',
  'other',
] as const;

const serviceLabels: Record<(typeof SERVICE_VALUES)[number], string> = {
  'corporate-law': 'Corporate Law',
  'tax-advisory': 'Tax Advisory',
  'intellectual-property': 'Intellectual Property',
  accounting: 'Accounting Services',
  'legal-consultation': 'Legal Consultation',
  other: 'Other',
};

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().max(20).optional(),
  service: z
    .string()
    .min(1, 'Please select a service')
    .refine((s): s is (typeof SERVICE_VALUES)[number] => (SERVICE_VALUES as readonly string[]).includes(s), {
      message: 'Please select a service',
    }),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1000),
  agreed: z.boolean().refine((v) => v, { message: 'Please agree to the privacy policy' }),
});

const Contact = () => {
  const { toast } = useToast();
  const { addSupportTicket, addNotification, addActivityLog, apiConnected, refreshFromApi } = useAdminStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '' as '' | (typeof SERVICE_VALUES)[number],
    message: '',
    agreed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      service: form.service,
      message: form.message,
      agreed: form.agreed,
    };
    const result = contactSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        const key = i.path[0] as string;
        fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const svc = result.data.service as (typeof SERVICE_VALUES)[number];
    const subject = `Service: ${serviceLabels[svc]}`;
    try {
      const created = await postPublicContact({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone?.trim() || '',
        subject,
        message: result.data.message,
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
      setForm({ name: '', email: '', phone: '', service: '', message: '', agreed: false });
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

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">Get In Touch</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Ready to resolve your legal and tax challenges? Contact our expert team
            for professional consultation and personalized solutions.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-card rounded-xl p-6 shadow-md border border-border/50">
              <h3 className="text-xl font-bold text-card-foreground mb-6">Contact Information</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary-onBg" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Office Address</h4>
                    <p className="text-muted-foreground text-sm">
                      Putalisadak, Kathmandu
                      <br />
                      Nepal
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-primary-onBg" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Phone Numbers</h4>
                    <p className="text-muted-foreground text-sm">
                      +977-1-4234567
                      <br />
                      +977-9851234567
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary-onBg" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Email</h4>
                    <p className="text-muted-foreground text-sm">
                      info@taxlexis.com
                      <br />
                      legal@taxlexis.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary-onBg" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Business Hours</h4>
                    <p className="text-muted-foreground text-sm">
                      Sunday - Friday: 9:00 AM - 6:00 PM
                      <br />
                      Saturday: 10:00 AM - 4:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <h3 className="text-lg font-bold text-primary-onBg mb-3">Emergency Legal Support</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Need urgent legal assistance? Our emergency hotline is available 24/7 for critical matters.
              </p>
              <Button type="button" className="btn-accent w-full">
                Call Emergency Line
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl p-8 shadow-md border border-border/50">
              <h3 className="text-2xl font-bold text-card-foreground mb-6">Send Us a Message</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-card-foreground">
                      Full Name *
                    </Label>
                    <Input
                      id="contact-name"
                      placeholder="Enter your full name"
                      className="w-full"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-card-foreground">
                      Email Address *
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-phone" className="mb-2 block text-sm font-medium text-card-foreground">
                      Phone Number
                    </Label>
                    <Input
                      id="contact-phone"
                      placeholder="Enter your phone number"
                      className="w-full"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contact-service" className="mb-2 block text-sm font-medium text-card-foreground">
                      Service Required *
                    </Label>
                    <Select
                      value={form.service || undefined}
                      onValueChange={(v) => setForm({ ...form, service: v as (typeof SERVICE_VALUES)[number] })}
                    >
                      <SelectTrigger id="contact-service" className="w-full">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {serviceLabels[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service && <p className="text-xs text-destructive mt-1">{errors.service}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-card-foreground">
                    Message *
                  </Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Describe your legal requirements or questions..."
                    rows={6}
                    className="w-full resize-none"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                  {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="contact-agree"
                    checked={form.agreed}
                    onCheckedChange={(v) => setForm({ ...form, agreed: v === true })}
                    className="mt-1"
                  />
                  <Label htmlFor="contact-agree" className="text-sm text-muted-foreground font-normal leading-snug cursor-pointer">
                    I agree to the{' '}
                    <a href="#" className="text-primary-onBg hover:underline">
                      Privacy Policy
                    </a>{' '}
                    and consent to Nepal Taxlexis Advisory contacting me regarding my inquiry.
                  </Label>
                </div>
                {errors.agreed && <p className="text-xs text-destructive -mt-4">{errors.agreed}</p>}

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={loading} onClick={() => {
                    setForm({ name: '', email: '', phone: '', service: '', message: '', agreed: false });
                    setErrors({});
                  }}>
                    Clear
                  </Button>
                  <Button type="submit" size="lg" className="btn-primary w-full sm:w-auto group" disabled={loading}>
                    {loading ? 'Sending…' : 'Submit'}
                    <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="mt-12">
          <div className="bg-muted/30 rounded-xl h-64 flex items-center justify-center border border-border/50">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="font-semibold text-muted-foreground mb-2">Office Location</h4>
              <p className="text-sm text-muted-foreground">
                Interactive map showing our office location will be displayed here
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
