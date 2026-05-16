import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { postPasswordResetConfirm, postPasswordResetRequest } from '@/lib/api';
import logo from '@/assets/logo-icon.png';

type Step = 'request' | 'confirm';

const ForgotPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    setLoading(true);
    try {
      const body = channel === 'email' ? { email: email.trim() } : { phone: phone.trim() };
      const res = await postPasswordResetRequest(body);
      toast({ title: res.detail || 'If an account exists, a reset code has been sent.' });
      if (res.debug_otp) {
        toast({ title: 'Debug OTP', description: res.debug_otp });
      }
      setStep('confirm');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    if (code.length < 6 || password.length < 8) {
      toast({ variant: 'destructive', title: 'Enter the 6-digit code and a password of at least 8 characters' });
      return;
    }
    setLoading(true);
    try {
      const body =
        channel === 'email'
          ? { email: email.trim(), code, new_password: password }
          : { phone: phone.trim(), code, new_password: password };
      const res = await postPasswordResetConfirm(body);
      toast({ title: res.detail || 'Password updated' });
      navigate('/login');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: e instanceof Error ? e.message : 'Check your code and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="" className="h-12 w-12 mx-auto mb-2" />
          <CardTitle>{step === 'request' ? 'Forgot password' : 'Set new password'}</CardTitle>
          <CardDescription>
            {step === 'request'
              ? 'We will send a verification code to your email or phone.'
              : 'Enter the code you received and choose a new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'request' ? (
            <>
              <Tabs value={channel} onValueChange={(v) => setChannel(v as 'email' | 'phone')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="phone">Phone</TabsTrigger>
                </TabsList>
                <TabsContent value="email" className="space-y-3 pt-2">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                </TabsContent>
                <TabsContent value="phone" className="space-y-3 pt-2">
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                  </div>
                </TabsContent>
              </Tabs>
              <Button className="w-full" disabled={loading} onClick={() => void requestCode()}>
                Send reset code
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>Verification code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <div>
                <Label>New password</Label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <Button className="w-full" disabled={loading} onClick={() => void confirmReset()}>
                Update password
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('request')}>
                Resend code
              </Button>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
