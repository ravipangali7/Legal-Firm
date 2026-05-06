import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { patchAuthMe, type AuthMeProfile } from '@/lib/api';
import {
  accountTypeDisplayLine,
  roleDisplayLabel,
  userDisplayName,
  userInitials,
} from '@/lib/userDisplay';
import { Bell, ChevronLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CmsAvatarImage } from '@/components/CmsImage';
import logo from '@/assets/logo-icon.png';
import { useToast } from '@/hooks/use-toast';
import { SiteThemeToggle } from '@/components/SiteThemeToggle';
import { subscriberHubHeaderTitle, subscriberHubPath } from '@/lib/subscriberPortalPaths';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageInput from '@/components/admin/cms/ImageInput';

const emptyProfile: AuthMeProfile = {
  user_type: 'individual',
  pan: '',
  vat: '',
  company_name: '',
};

const SubscriberProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshUser, logout } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const location = useLocation();
  const hubPath = subscriberHubPath(location.pathname);
  const unread = typeof user.unread_notifications_count === 'number' ? user.unread_notifications_count : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to={hubPath} className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-lg">{subscriberHubHeaderTitle(location.pathname, user)}</span>
              <span className="text-[11px] text-muted-foreground truncate">{accountTypeDisplayLine(user)}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SiteThemeToggle />
            <Button variant="ghost" size="icon" className="relative" type="button" asChild>
              <Link to={hubPath}>
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <div className="hidden sm:flex flex-col items-end max-w-[180px] mr-0.5">
              <span className="text-sm font-medium truncate w-full text-end">{userDisplayName(user)}</span>
              <span className="text-xs text-muted-foreground">{roleDisplayLabel(user.role)}</span>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              {user.avatar ? <CmsAvatarImage src={user.avatar} alt="" /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">{userInitials(user)}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" type="button" onClick={() => setSignOutOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out on this device. To use your account again, you will need to sign in with your email,
              phone code, or Google account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void (async () => {
                  try {
                    await logout();
                    setSignOutOpen(false);
                    navigate('/login');
                  } catch (e) {
                    toast({
                      title: 'Could not sign out',
                      description: e instanceof Error ? e.message : 'Try again in a moment.',
                      variant: 'destructive',
                    });
                  }
                })();
              }}
            >
              Sign out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" type="button" onClick={() => navigate(hubPath)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {hubPath === '/client' ? 'Back to client portal' : 'Back to dashboard'}
          </Button>
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Your profile</h1>
          <p className="text-muted-foreground mt-1">Update how you appear on the site and on invoices.</p>
        </div>

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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-profile-phone">Phone</Label>
              <Input id="sub-profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>
            <ImageInput label="Profile photo" value={avatar} onChange={setAvatar} />
            <div className="grid gap-2">
              <Label htmlFor="sub-profile-password">New password</Label>
              <PasswordInput
                id="sub-profile-password"
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
              <Label htmlFor="sub-profile-pan">PAN</Label>
              <Input id="sub-profile-pan" value={profile.pan} onChange={(e) => setProfile((p) => ({ ...p, pan: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-profile-vat">VAT</Label>
              <Input id="sub-profile-vat" value={profile.vat} onChange={(e) => setProfile((p) => ({ ...p, vat: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-profile-company">Company name</Label>
              <Input
                id="sub-profile-company"
                value={profile.company_name}
                onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </main>
    </div>
  );
};

export default SubscriberProfile;
