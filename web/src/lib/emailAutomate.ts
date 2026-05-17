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
