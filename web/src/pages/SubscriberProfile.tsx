import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { patchAuthMe, type AuthMeProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageInput from '@/components/admin/cms/ImageInput';
import { subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { evaluatePortalModuleView, evaluatePortalPerm, PORTAL_PERM_MODULES } from '@/lib/subscriberPortalPermissions';
const emptyProfile: AuthMeProfile = {
  user_type: 'individual',
  pan: '',
  vat: '',
  company_name: '',
};

const SubscriberProfile = () => {
  const { toast } = useToast();
  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<AuthMeProfile>({ ...emptyProfile });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? '');
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
    setAvatar(user.avatar ?? '');
    setPassword('');
    const p = user.profile;
    setProfile({
      ...emptyProfile,
      ...(p ?? {}),
    });
  }, [user]);

  const save = () => {
    if (!user) return;
    void (async () => {
      setSaving(true);
      try {
        const body: Parameters<typeof patchAuthMe>[0] = {
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          user_type: profile.user_type,
          pan: profile.pan,
          vat: profile.vat,
          company_name: profile.company_name,
        };
        if (password.trim()) body.password = password.trim();
        if (avatar.trim()) body.avatar = avatar.trim();
        else if (!avatar.trim() && user.avatar) body.avatar = '';
        await patchAuthMe(body);
        await refreshUser({ silent: true });
        setPassword('');
        toast({ title: 'Profile saved' });
      } catch (e) {
        toast({
          title: 'Save failed',
          description: e instanceof Error ? e.message : 'Try again.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!evaluatePortalModuleView(user, PORTAL_PERM_MODULES.profile)) {
    return <Navigate to={hubPath} replace />;
  }

  const canEditProfile = evaluatePortalPerm(user, PORTAL_PERM_MODULES.profile, 'edit');

  return (
    <div className="max-w-3xl mx-auto space-y-6 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground mt-1">Update how you appear on the site and on invoices.</p>
      </div>

      {!canEditProfile ? (
        <Alert>
          <AlertTitle>View only</AlertTitle>
          <AlertDescription className="text-sm">
            Your administrator has granted view access to account settings only. Ask a Super Admin to enable edit if you
            need changes.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-name">Full name</Label>
            <Input
              id="sub-profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-email">Email</Label>
            <Input
              id="sub-profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-phone">Phone</Label>
            <Input
              id="sub-profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
          {canEditProfile ? (
            <ImageInput label="Profile photo" value={avatar} onChange={setAvatar} />
          ) : (
            <div className="grid gap-2">
              <Label>Profile photo</Label>
              <p className="text-sm text-muted-foreground">Photo changes require edit permission.</p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-password">New password</Label>
            <PasswordInput
              id="sub-profile-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={canEditProfile ? 'Leave blank to keep current password' : '—'}
              autoComplete="new-password"
              disabled={!canEditProfile}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax &amp; billing details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="grid gap-2">
            <Label>Account type</Label>
            <Select
              value={profile.user_type}
              onValueChange={(v: 'individual' | 'business') => setProfile((p) => ({ ...p, user_type: v }))}
              disabled={!canEditProfile}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-pan">PAN</Label>
            <Input
              id="sub-profile-pan"
              value={profile.pan}
              onChange={(e) => setProfile((p) => ({ ...p, pan: e.target.value }))}
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-vat">VAT</Label>
            <Input
              id="sub-profile-vat"
              value={profile.vat}
              onChange={(e) => setProfile((p) => ({ ...p, vat: e.target.value }))}
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sub-profile-company">Company name</Label>
            <Input
              id="sub-profile-company"
              value={profile.company_name}
              onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
              readOnly={!canEditProfile}
              className={!canEditProfile ? 'bg-muted/50' : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {canEditProfile ? (
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      ) : null}
    </div>
  );
};

export default SubscriberProfile;
