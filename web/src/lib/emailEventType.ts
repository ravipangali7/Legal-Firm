/** Matches Django ``EmailTemplate.EventType`` choices. */
export const EMAIL_EVENT_TYPE_OPTIONS = [
  { value: 'signup', label: 'Signup welcome' },
  { value: 'login', label: 'Login thank you' },
  { value: 'otp_login', label: 'OTP login code' },
  { value: 'password_reset', label: 'Password reset OTP' },
  { value: 'payment_verified', label: 'Payment confirmed' },
  { value: 'payment_pending', label: 'Payment pending verification' },
  { value: 'payment_rejected', label: 'Payment rejected' },
  { value: 'subscription_due', label: 'Subscription renewal due' },
  { value: 'package_ended', label: 'Package ended' },
] as const;

export function emailEventTypeLabel(value: string): string {
  if (!value) return '—';
  return EMAIL_EVENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
