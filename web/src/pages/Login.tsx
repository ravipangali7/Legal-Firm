import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, Mail, Phone, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { postAuthGoogle, postAuthLogin, postAuthOtpRequest, postAuthOtpVerify, type AuthMeUser } from '@/lib/api';
import { hubPathForRole, userHomeHref } from '@/lib/userHomeRoute';
import { loadGoogleGsiScript, requestGoogleAccessToken } from '@/lib/googleGsi';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { readSafeNextParam } from '@/components/ProtectedRoute';
import { Separator } from '@/components/ui/separator';
import logo from '@/assets/logo-icon.png';

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});
const phoneSchema = z.object({
  phone: z.string().min(10, { message: 'Enter a valid phone number' }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

/** Respect `hubPathForRole` so ?next= cannot send clients to /dashboard or staff to /client, etc. */
function canUserAccessPath(me: AuthMeUser, path: string): boolean {
  const home = hubPathForRole(me);
  if (path.startsWith('/admin')) {
    return me.is_staff && home === '/admin';
  }
  if (path.startsWith('/client')) {
    return home === '/client';
  }
  if (path.startsWith('/dashboard')) {
    return home === '/dashboard';
  }
  if (path.startsWith('/account')) {
    return home === '/account';
  }
  return true;
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { config } = useSiteConfig();
  const { toast } = useToast();
  const nextPath = readSafeNextParam(searchParams.toString());
  const staffEntry = Boolean(nextPath?.startsWith('/admin'));
  const clientEntry = Boolean(nextPath?.startsWith('/client'));
  const googleClientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
    (config?.google_oauth_client_id || '').trim();

  const goAfterAuth = useCallback(
    (me: AuthMeUser) => {
      const next = readSafeNextParam(searchParams.toString());
      if (next && canUserAccessPath(me, next)) {
        navigate(next, { replace: true });
        return;
      }
      navigate(userHomeHref(me), { replace: true });
    },
    [navigate, searchParams]
  );

  useEffect(() => {
    if (authLoading || !user) return;
    goAfterAuth(user);
  }, [authLoading, user, goAfterAuth]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', password: '' },
  });
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      const me = await postAuthLogin(data.email, data.password);
      await refreshUser({ silent: true });
      toast({ title: 'Login Successful', description: `Welcome back${me.full_name ? ', ' + me.full_name : ''}!` });
      goAfterAuth(me);
    } catch (e) {
      toast({
        title: 'Login Failed',
        description: e instanceof Error ? e.message : 'Invalid credentials.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setIsLoading(true);
    try {
      const d = data.phone.replace(/\D/g, '');
      const national10 = d.length >= 10 ? d.slice(-10) : d;
      const fullPhone = national10.length >= 10 ? `+977${national10}` : `+977${d}`;
      const res = await postAuthOtpRequest(fullPhone);
      setSubmittedPhone(fullPhone);
      setOtpSent(true);
      toast({
        title: 'OTP sent',
        description: res.debug_otp
          ? `Dev: code is ${res.debug_otp} (only shown when API DEBUG is on)`
          : `Verification code sent to ${fullPhone}`,
      });
    } catch (e) {
      toast({
        title: 'Could not send code',
        description: e instanceof Error ? e.message : 'Try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setIsLoading(true);
    try {
      const me = await postAuthOtpVerify(submittedPhone, otp);
      await refreshUser({ silent: true });
      toast({ title: 'Login successful', description: `Welcome${me.full_name ? ', ' + me.full_name : ''}!` });
      goAfterAuth(me);
    } catch (e) {
      toast({
        title: 'Verification failed',
        description: e instanceof Error ? e.message : 'Invalid or expired code.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleContinue = () => {
    if (!googleClientId) {
      toast({
        title: 'Google sign-in unavailable',
        description:
          'Set VITE_GOOGLE_CLIENT_ID in the web app or GOOGLE_OAUTH_CLIENT_ID on the API server (see public config), and add this site origin in Google Cloud Console OAuth credentials.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    void (async () => {
      try {
        await loadGoogleGsiScript();
        requestGoogleAccessToken(
          googleClientId,
          async (resp) => {
            if (resp.error || !resp.access_token) {
              setIsLoading(false);
              const code = resp.error || '';
              const dismissed =
                code === 'popup_closed_by_user' ||
                code === 'access_denied' ||
                code === 'user_closed' ||
                code === 'cancel';
              if (!dismissed) {
                toast({
                  title: 'Google sign-in',
                  description: resp.error_description || code || 'Try again or use email.',
                  variant: 'destructive',
                });
              }
              return;
            }
            try {
              const result = await postAuthGoogle(resp.access_token);
              if ('needs_registration' in result && result.needs_registration) {
                setIsLoading(false);
                toast({
                  title: 'Create your account',
                  description: 'No account exists for this Google email yet. Complete registration to continue.',
                });
                navigate('/signup', {
                  replace: true,
                  state: {
                    googleSignup: true,
                    email: result.email,
                    fullName: result.full_name,
                  },
                });
                return;
              }
              await refreshUser({ silent: true });
              setIsLoading(false);
              toast({
                title: 'Login successful',
                description: `Welcome back${result.full_name ? ', ' + result.full_name : ''}!`,
              });
              goAfterAuth(result);
            } catch (e) {
              setIsLoading(false);
              toast({
                title: 'Google sign-in failed',
                description: e instanceof Error ? e.message : 'Try again later.',
                variant: 'destructive',
              });
            }
          },
          () => {
            setIsLoading(false);
          },
        );
      } catch (e) {
        setIsLoading(false);
        toast({
          title: 'Google Sign-In',
          description: e instanceof Error ? e.message : 'Could not load Google Sign-In.',
          variant: 'destructive',
        });
      }
    })();
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        {user ? 'Redirecting…' : 'Checking session…'}
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-12">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logo} alt="Nepal Taxlexis Advisory" className="h-12 w-auto bg-white/10 rounded p-1.5" />
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">Welcome back to Nepal Taxlexis Advisory</h2>
          <p className="text-primary-foreground/80 text-lg">
            Access Nepal's most comprehensive legal & tax knowledge base — laws, case summaries, calculators and expert guidance.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/90">
            <li>✓ Full text of Nepalese Acts in EN & NE</li>
            <li>✓ Curated Supreme Court case summaries</li>
            <li>✓ Tax calculators and procedure guides</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Nepal Taxlexis Advisory Pvt. Ltd.</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-4 sm:p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-sm">
          <CardHeader className="text-center space-y-4">
            <Link to="/" className="inline-flex justify-center lg:hidden">
              <img src={logo} alt="Nepal Taxlexis Advisory" className="h-14 w-auto" />
            </Link>
            <div>
              <CardTitle className="text-2xl">Sign In</CardTitle>
              <CardDescription>
                {staffEntry
                  ? 'Staff: sign in with your admin account. You will be taken to the admin panel after sign-in.'
                  : clientEntry
                    ? 'Client portal: after sign-in you will open your organization workspace at /client.'
                    : 'Choose your preferred sign-in method'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Social Logins */}
            <Button variant="outline" className="w-full" disabled={isLoading} onClick={onGoogleContinue}>
              <Chrome className="h-4 w-4 mr-2" /> Continue with Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">or continue with</span>
            </div>

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone OTP</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4">
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField control={emailForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input placeholder="your@email.com" type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={emailForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex items-center justify-between text-sm">
                      <Link to="/forgot-password" className="text-primary-onBg hover:underline">Forgot Password?</Link>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Signing in...</span>
                        : <span className="flex items-center gap-2"><LogIn size={18} />Sign In</span>}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="phone" className="mt-4">
                {!otpSent ? (
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                      <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <span className="flex items-center px-3 bg-muted rounded-md text-sm font-medium">+977</span>
                              <Input placeholder="98XXXXXXXX" type="tel" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send OTP'}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to your phone</p>
                    <Input placeholder="000000" maxLength={6} className="text-center text-2xl tracking-[0.5em] font-mono" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                    <Button className="w-full" disabled={otp.length < 6 || isLoading} onClick={verifyOtp}>
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setSubmittedPhone('');
                      }}
                    >
                      Change number
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary-onBg font-medium hover:underline">Sign Up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
