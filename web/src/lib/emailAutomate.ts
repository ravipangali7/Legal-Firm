/** Matches Django ``EmailTemplate.Automate`` choices. */
export const EMAIL_AUTOMATE_OPTIONS = [
  { value: 'login', label: 'Login' },
  { value: 'sign_up', label: 'Sign up' },
  { value: 'otp', label: 'OTP' },
  { value: 'payment_due', label: 'Payment due' },
  { value: 'paid', label: 'Paid' },
  { value: 'subscribed', label: 'Subscribed' },
] as const;

export type EmailAutomate = (typeof EMAIL_AUTOMATE_OPTIONS)[number]['value'];

export function emailAutomateLabel(value: string): string {
  return EMAIL_AUTOMATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Default legacy ``event_type`` when creating a template for an automate trigger. */
export function defaultEventTypeForAutomate(automate: string): string {
  const map: Record<string, string> = {
    sign_up: 'signup',
    login: 'login',
    otp: 'otp_login',
    payment_due: 'subscription_due',
    paid: 'payment_verified',
    subscribed: '',
  };
  return map[automate] ?? '';
}
