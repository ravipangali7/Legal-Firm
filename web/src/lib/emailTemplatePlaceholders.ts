import type { EmailAutomate } from '@/lib/emailAutomate';

export const GLOBAL_EMAIL_PLACEHOLDERS = [
  'site_name',
  'user_name',
  'user_email',
  'support_email',
  'login_url',
  'reset_url',
  'wallet_url',
] as const;

/** Placeholders most relevant per ``automate`` trigger (from model defaults and send paths). */
export const PLACEHOLDERS_BY_AUTOMATE: Record<EmailAutomate | string, readonly string[]> = {
  sign_up: ['site_name', 'user_name', 'user_email', 'login_url', 'support_email'],
  login: ['site_name', 'user_name', 'login_time', 'support_email'],
  otp: ['site_name', 'user_name', 'otp_code', 'otp_expiry_minutes', 'reset_url'],
  payment_due: ['user_name', 'subscription_end_date', 'package_end_date', 'wallet_url', 'ended_on'],
  paid: [
    'user_name',
    'invoice',
    'amount',
    'currency',
    'plan',
    'billing_cycle',
    'package_end_date',
    'wallet_url',
    'rejection_reason',
  ],
  subscribed: ['site_name', 'user_name', 'plan', 'package_end_date', 'wallet_url'],
};

export function placeholdersForAutomate(automate: string): readonly string[] {
  return PLACEHOLDERS_BY_AUTOMATE[automate] ?? GLOBAL_EMAIL_PLACEHOLDERS;
}

export function placeholderToken(key: string): string {
  return `{{${key}}}`;
}
