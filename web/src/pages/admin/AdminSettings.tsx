import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminStore } from '@/store/adminStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { adminPost, settingsPatchToApi } from '@/lib/adminSnapshot';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, CreditCard, Navigation, Settings } from 'lucide-react';
import esewaLogo from '@/assets/esewa-logo.png';
import ImageInput from '@/components/admin/cms/ImageInput';
const AdminSettings = () => {
  const { settings, updateSettings } = useAdminStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(settings);
  const [testMailTo, setTestMailTo] = useState('');
  const [testMailSending, setTestMailSending] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    setTestMailTo((prev) => (prev === '' && user?.email ? user.email : prev));
  }, [user?.email]);

  const save = () => {
    updateSettings(form);
    toast({ title: 'Settings saved' });
  };

  const sendTestMail = async () => {
    const to = testMailTo.trim();
    if (!to) {
      toast({ variant: 'destructive', title: 'Enter a recipient', description: 'Add an email address to send the test to.' });
      return;
    }
    setTestMailSending(true);
    try {
      await adminPost('settings/test-mail/', {
        to,
        ...settingsPatchToApi({
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass,
          supportEmail: form.supportEmail,
          emailFromName: form.emailFromName,
          siteName: form.siteName,
        } as Record<string, unknown>),
      });
      toast({ title: 'Test mail sent', description: `Check the inbox for ${to}.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast({ variant: 'destructive', title: 'Test mail failed', description: msg });
    } finally {
      setTestMailSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform-wide preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-1" />General</TabsTrigger>
          <TabsTrigger value="seo"><Globe className="h-4 w-4 mr-1" />SEO</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" />Payments</TabsTrigger>
          <TabsTrigger value="navigation"><Navigation className="h-4 w-4 mr-1" />Navigation</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Site name and logo appear in the public header and in the footer brand area. The favicon is used for the browser tab when set.
                Footer tagline, columns, social links, and copyright are managed under Homepage CMS → Footer, not here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="settings-site-name">Site name</Label>
                  <Input
                    id="settings-site-name"
                    value={form.siteName}
                    onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                    placeholder="Your firm name"
                    className="mt-1.5"
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageInput label="Site logo" value={form.siteLogo || ''} onChange={(v) => setForm({ ...form, siteLogo: v })} />
                </div>
                <div className="md:col-span-2">
                  <ImageInput
                    label="Favicon"
                    value={form.siteFavicon || ''}
                    onChange={(v) => setForm({ ...form, siteFavicon: v })}
                    accept="image/*,.ico"
                  />
                </div>
                <div>
                  <Label>Default currency</Label>
                  <Select value={form.currency} onValueChange={(v: 'NPR' | 'USD') => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="NPR">NPR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Tax rate (%)</Label><Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></div>
                <div><Label>Support phone</Label><Input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription pricing</CardTitle>
              <CardDescription>
                Set the monthly base for individual and business accounts. Checkout and the public pricing page show
                one month, six months, and one year totals (before tax).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="settings-individual-monthly">Individual monthly price ({form.currency})</Label>
                  <Input
                    id="settings-individual-monthly"
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1.5"
                    value={form.individualMonthlyPrice ?? 0}
                    onChange={(e) => setForm({ ...form, individualMonthlyPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="settings-business-monthly">Business monthly price ({form.currency})</Label>
                  <Input
                    id="settings-business-monthly"
                    type="number"
                    min={0}
                    step={1}
                    className="mt-1.5"
                    value={form.businessMonthlyPrice ?? 0}
                    onChange={(e) => setForm({ ...form, businessMonthlyPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <p className="text-sm font-medium">Preview cards (same as public pricing)</p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Individual</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {(['1 mo', '6 mo', '12 mo'] as const).map((label, i) => {
                        const m = Number(form.individualMonthlyPrice ?? 0);
                        const mult = i === 0 ? 1 : i === 1 ? 6 : 12;
                        const total = Math.max(0, m * mult);
                        return (
                          <div key={label} className="rounded-lg border bg-card p-2">
                            <div className="text-muted-foreground">{label}</div>
                            <div className="font-semibold text-foreground mt-1">
                              {form.currency} {total.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Business</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {(['1 mo', '6 mo', '12 mo'] as const).map((label, i) => {
                        const m = Number(form.businessMonthlyPrice ?? 0);
                        const mult = i === 0 ? 1 : i === 1 ? 6 : 12;
                        const total = Math.max(0, m * mult);
                        return (
                          <div key={label} className="rounded-lg border bg-card p-2">
                            <div className="text-muted-foreground">{label}</div>
                            <div className="font-semibold text-foreground mt-1">
                              {form.currency} {total.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Toggles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><div><div className="font-medium">Maintenance mode</div><div className="text-xs text-muted-foreground">Block public access while you work on the site.</div></div><Switch checked={form.maintenanceMode} onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })} /></div>
              <div className="flex items-center justify-between"><div><div className="font-medium">Allow new signups</div><div className="text-xs text-muted-foreground">Disable to pause registrations.</div></div><Switch checked={form.allowSignups} onCheckedChange={(v) => setForm({ ...form, allowSignups: v })} /></div>
              <div className="flex items-center justify-between"><div><div className="font-medium">Email notifications</div><div className="text-xs text-muted-foreground">Send transactional emails to users.</div></div><Switch checked={form.emailNotifications} onCheckedChange={(v) => setForm({ ...form, emailNotifications: v })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>SEO Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Meta title</Label><Input value={form.seoTitle || ''} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} placeholder="TaxLexis — Nepal's Tax & Legal Advisory" /><p className="text-xs text-muted-foreground mt-1">{(form.seoTitle || '').length}/60 characters</p></div>
              <div><Label>Meta description</Label><Textarea rows={3} value={form.seoDescription || ''} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} placeholder="Expert tax, corporate, and regulatory law advisory for Nepal..." /><p className="text-xs text-muted-foreground mt-1">{(form.seoDescription || '').length}/160 characters</p></div>
              <div><Label>Meta keywords</Label><Input value={form.seoKeywords || ''} onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })} placeholder="tax law nepal, corporate law, VAT advisory" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <ImageInput label="Open Graph image" value={form.ogImage || ''} onChange={(v) => setForm({ ...form, ogImage: v })} />
                </div>
                <div><Label>Canonical URL</Label><Input value={form.canonicalUrl || ''} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} placeholder="https://taxlexis.np" /></div>
              </div>
              <div><Label>Google Analytics ID</Label><Input value={form.gaId || ''} onChange={(e) => setForm({ ...form, gaId: e.target.value })} placeholder="G-XXXXXXXXXX" /></div>
              <div><Label>Robots.txt content</Label><Textarea rows={4} value={form.robotsTxt || 'User-agent: *\nAllow: /'} onChange={(e) => setForm({ ...form, robotsTxt: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Email Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>SMTP Host</Label><Input value={form.smtpHost || ''} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.gmail.com" /></div>
                <div><Label>SMTP Port</Label><Input type="number" value={form.smtpPort || 587} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} /></div>
                <div><Label>SMTP Username</Label><Input value={form.smtpUser || ''} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} /></div>
                <div><Label>SMTP Password</Label><PasswordInput value={form.smtpPass || ''} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} autoComplete="new-password" /></div>
              </div>
              <div><Label>From email</Label><Input type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></div>
              <div><Label>From name</Label><Input value={form.emailFromName || 'TaxLexis'} onChange={(e) => setForm({ ...form, emailFromName: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactional templates</CardTitle>
              <CardDescription>
                Customize signup, login, OTP, payment, and subscription emails sent automatically by the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/admin/email-templates">Manage email templates</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test mail</CardTitle>
              <CardDescription>
                Sends one message using the SMTP settings above (including unsaved changes). If the password field is empty, the saved password from the server is used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-mail-to">Send to</Label>
                <Input
                  id="test-mail-to"
                  type="email"
                  value={testMailTo}
                  onChange={(e) => setTestMailTo(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 max-w-md"
                />
              </div>
              <Button type="button" variant="secondary" disabled={testMailSending} onClick={() => void sendTestMail()}>
                {testMailSending ? 'Sending…' : 'Send test mail'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Online payments</CardTitle>
              <CardDescription>
                When enabled, subscribers pay from the dashboard Wallet tab using eSewa hosted checkout. Pricing links
                use the wallet when this is on.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Enable online payments</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gateway settings below are shown only while this is on.
                  </p>
                </div>
                <Switch
                  checked={form.paymentsEnabled || false}
                  onCheckedChange={(v) => setForm({ ...form, paymentsEnabled: v })}
                />
              </div>
            </CardContent>
          </Card>

          {form.paymentsEnabled ? (
            <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <img src={esewaLogo} alt="eSewa" className="h-8 w-8 rounded" />
                <CardTitle>eSewa Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Enable eSewa</div>
                <Switch checked={form.esewaEnabled || false} onCheckedChange={(v) => setForm({ ...form, esewaEnabled: v })} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wallet checkout is fixed to <span className="font-medium text-foreground">eSewa UAT only</span> using the
                merchant test product code and secret from the project <span className="font-mono">esewa_integration.md</span>{' '}
                (rc-epay form, EPAYTEST). No live gateway or per-site keys are configured in this build.
              </p>
            </CardContent>
          </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground px-1">
              Turn on &quot;Enable online payments&quot; to configure eSewa and to allow subscribers to pay from the
              Wallet tab.
            </p>
          )}
        </TabsContent>

        {/* Navigation */}
        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Navigation Order</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Drag to reorder navigation items (coming with backend). Current order:</p>
              <div className="space-y-2">
                {(form.navOrder || ['Home', 'Laws', 'Summaries', 'Procedures', 'Tools', 'Pricing', 'About', 'Professionals', 'Contact']).map((item, i) => (
                  <div key={item} className="flex items-center gap-3 px-4 py-2.5 bg-muted rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                    <span className="font-medium text-sm">{item}</span>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => {
                        const arr = [...(form.navOrder || ['Home', 'Laws', 'Summaries', 'Procedures', 'Tools', 'Pricing', 'About', 'Professionals', 'Contact'])];
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        setForm({ ...form, navOrder: arr });
                      }}>↑</Button>
                      <Button variant="ghost" size="sm" disabled={i === (form.navOrder || []).length - 1 || (!form.navOrder && i === 8)} onClick={() => {
                        const arr = [...(form.navOrder || ['Home', 'Laws', 'Summaries', 'Procedures', 'Tools', 'Pricing', 'About', 'Professionals', 'Contact'])];
                        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        setForm({ ...form, navOrder: arr });
                      }}>↓</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end"><Button onClick={save}>Save settings</Button></div>
    </div>
  );
};

export default AdminSettings;
