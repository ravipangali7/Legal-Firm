import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserPlus, User, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { postSignup } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import logo from '@/assets/logo-icon.png';

const baseSchema = z.object({
  userType: z.enum(['individual', 'business'], { required_error: 'Please select user type' }),
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
  pan: z.string().optional(),
  vat: z.string().optional(),
  companyName: z.string().optional(),
});

const signupSchema = baseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.userType === 'business') {
    return data.pan && data.pan.length >= 9;
  }
  return true;
}, {
  message: 'PAN number is required for business accounts (min 9 characters)',
  path: ['pan'],
}).refine((data) => {
  if (data.userType === 'business') {
    return data.vat && data.vat.length >= 9;
  }
  return true;
}, {
  message: 'VAT number is required for business accounts (min 9 characters)',
  path: ['vat'],
}).refine((data) => {
  if (data.userType === 'business') {
    return data.companyName && data.companyName.length >= 2;
  }
  return true;
}, {
  message: 'Company name is required for business accounts',
  path: ['companyName'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

type GoogleSignupNavState = {
  googleSignup?: boolean;
  email?: string;
  fullName?: string;
};

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { config, loading: configLoading } = useSiteConfig();
  const signupsOpen = config?.allow_signups !== false;
  const googleNavState = (location.state || undefined) as GoogleSignupNavState | undefined;
  const fromGoogleSignup =
    googleNavState?.googleSignup === true || searchParams.get('google') === '1';
  const googlePrefillEmail =
    (typeof googleNavState?.email === 'string' ? googleNavState.email : '') ||
    searchParams.get('email') ||
    '';
  const googlePrefillDone = useRef(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      userType: 'individual',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      pan: '',
      vat: '',
      companyName: '',
    },
  });

  const userType = form.watch('userType');

  useEffect(() => {
    if (googlePrefillDone.current || !fromGoogleSignup) return;
    const email = googlePrefillEmail.trim();
    if (!email) return;
    googlePrefillDone.current = true;
    const fullNameFromState =
      typeof googleNavState?.fullName === 'string' ? googleNavState.fullName.trim() : '';
    const fullNameFromQuery = (searchParams.get('full_name') || '').trim();
    const fullName = fullNameFromState || fullNameFromQuery;
    form.reset({
      ...form.getValues(),
      email,
      fullName: fullName || form.getValues('fullName'),
    });
  }, [fromGoogleSignup, googlePrefillEmail, googleNavState?.fullName, searchParams, form]);

  const onSubmit = async (data: SignupFormValues) => {
    if (!signupsOpen) {
      toast({ title: 'Registration closed', description: 'New signups are disabled.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await postSignup({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        user_type: data.userType,
        pan: data.pan || undefined,
        vat: data.vat || undefined,
        company_name: data.companyName || undefined,
      });
      toast({
        title: 'Account created',
        description: 'You can sign in once your account is activated.',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Signup failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:col-span-2 flex-col justify-between bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-12">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logo} alt="Nepal Taxlexis Advisory" className="h-12 w-auto bg-white/10 rounded p-1.5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight mb-3">Join Nepal Taxlexis Advisory</h2>
          <p className="text-primary-foreground/80">
            Create your account to access the most comprehensive legal & tax knowledge base in Nepal.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-primary-foreground/90">
            <li>✓ Free access to law summaries</li>
            <li>✓ Bookmark and organize your research</li>
            <li>✓ Personalised tax updates</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Nepal Taxlexis Advisory Pvt. Ltd.
        </div>
      </div>

      <div className="lg:col-span-3 flex items-center justify-center p-4 py-8 bg-background">
        <Card className="w-full max-w-lg border-0 shadow-none lg:shadow-sm">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="inline-flex justify-center lg:hidden">
            <img src={logo} alt="Nepal Taxlexis Advisory" className="h-14 w-auto" />
          </Link>
          <div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join Nepal Taxlexis Advisory today</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {fromGoogleSignup && Boolean(googlePrefillEmail.trim()) && (
            <Alert className="mb-4">
              <AlertTitle>Complete registration</AlertTitle>
              <AlertDescription>
                No account exists for this Google email yet. Fill in the remaining fields (phone and password are
                required). Your email is fixed to match Google. For a business account, your Google name is used as
                the contact person; for an individual account, it fills full name.
              </AlertDescription>
            </Alert>
          )}
          {!configLoading && !signupsOpen && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Registration disabled</AlertTitle>
              <AlertDescription>New accounts cannot be created right now. Please try again later.</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* User Type Selection */}
              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            field.value === 'individual'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem value="individual" id="individual" />
                          <div className="flex items-center gap-2">
                            <User size={20} className="text-primary-onBg" />
                            <span className="font-medium">Individual</span>
                          </div>
                        </label>
                        <label
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            field.value === 'business'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem value="business" id="business" />
                          <div className="flex items-center gap-2">
                            <Building2 size={20} className="text-primary-onBg" />
                            <span className="font-medium">Business</span>
                          </div>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business-specific fields */}
              {userType === 'business' && (
                <>
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Pvt. Ltd." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="vat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{userType === 'business' ? 'Contact Person Name' : 'Full Name'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Ram Sharma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your@email.com"
                          type="email"
                          readOnly={fromGoogleSignup}
                          className={fromGoogleSignup ? 'bg-muted' : undefined}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="98XXXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading || configLoading || !signupsOpen}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus size={18} />
                    Create Account
                  </span>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary-onBg font-medium hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Signup;
