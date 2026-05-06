import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useAdminStore, type AdminUserProfile } from '@/store/adminStore';
import { useToast } from '@/hooks/use-toast';
import ImageInput from '@/components/admin/cms/ImageInput';

const emptyProfile: AdminUserProfile = {
  user_type: 'individual',
  pan: '',
  vat: '',
  company_name: '',
};

const AdminProfile = () => {
  const { user, refreshUser } = useAuth();
  const { users, updateUser, apiConnected } = useAdminStore();
  const { toast } = useToast();

  const storeRow = useMemo(() => (user ? users.find((u) => u.id === user.id) : undefined), [users, user]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<AdminUserProfile>({ ...emptyProfile });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? '');
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
    setAvatar(user.avatar ?? '');
    setPassword('');
    const p = user.profile as AdminUserProfile | null | undefined;
    const fromStore = storeRow?.profile;
    setProfile({
      ...emptyProfile,
      ...(p ?? {}),
      ...(fromStore ?? {}),
    });
  }, [user, storeRow]);

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Sign in to manage your profile.
      </div>
    );
  }

  const save = () => {
    void (async () => {
      if (!apiConnected && !storeRow) {
        toast({
          variant: 'destructive',
          title: 'Cannot save',
          description: 'Your account is not in the local demo user list. Connect the API or use a seeded staff account.',
        });
        return;
      }
      const patch: Parameters<typeof updateUser>[1] = {
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar.trim() || undefined,
        profile,
      };
      if (password.trim()) {
        (patch as { password?: string }).password = password.trim();
      }
      try {
        await updateUser(user.id, patch);
        await refreshUser({ silent: true });
        toast({ title: 'Profile saved' });
        setPassword('');
      } catch (e) {
        toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' });
      }
    })();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">My profile</h1>
        <p className="text-muted-foreground mt-1">Update how you appear in the admin and on invoices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
          <ImageInput label="Avatar image URL" value={avatar} onChange={setAvatar} />
          <div className="grid gap-2">
            <Label>New password</Label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
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
            <Label>PAN</Label>
            <Input value={profile.pan} onChange={(e) => setProfile((p) => ({ ...p, pan: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>VAT</Label>
            <Input value={profile.vat} onChange={(e) => setProfile((p) => ({ ...p, vat: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Company name</Label>
            <Input
              value={profile.company_name}
              onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan &amp; access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-w-xl">
          <p>
            <span className="text-muted-foreground">Role: </span>
            <span className="font-medium">
              {(user.is_superuser ? 'super_admin' : user.role).replace(/_/g, ' ')}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-medium">{user.status}</span>
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            Role, status, and subscription are managed by an administrator.
          </p>
        </CardContent>
      </Card>

      <Button onClick={save}>Save changes</Button>
    </div>
  );
};

export default AdminProfile;
