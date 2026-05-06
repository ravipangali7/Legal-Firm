import type { UserRole } from '@/components/admin/AdminSidebar';
import type { AuthMeUser } from '@/lib/api';
import type { ActivityLogChannel, ActivityLogEntry } from '@/lib/adminActivityTypes';

const SENSITIVE_KEYS = new Set([
  'password',
  'smtp_pass',
  'smtppass',
  'smtpPass',
  'khalti_live_key',
  'khalti_test_key',
  'secret',
  'token',
  'authorization',
]);

export function sanitizeAuditValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower) || lower.includes('password') || lower.includes('secret')) {
    return '[redacted]';
  }
  return value;
}

export function sanitizeMetadata(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeMetadata(v as Record<string, unknown>) ?? {};
    } else {
      out[k] = sanitizeAuditValue(k, v);
    }
  }
  return out;
}

export interface AuditContext {
  authUser: AuthMeUser | null;
  currentRole: UserRole;
  impersonatingActive: boolean;
  apiConnected: boolean;
}

/** Merge automatic context onto a log row (id / createdAt added by caller). */
export function enrichAuditEntry(
  partial: Omit<ActivityLogEntry, 'id' | 'createdAt'>,
  ctx: AuditContext
): Omit<ActivityLogEntry, 'id' | 'createdAt'> {
  const channel: ActivityLogChannel = partial.channel ?? 'admin_ui';
  const actor =
    partial.actor?.trim() ||
    (channel === 'manual_entry' ? '' : ctx.authUser?.full_name?.trim() || ctx.authUser?.email?.trim() || 'Staff');

  return {
    ...partial,
    channel,
    actor,
    actorEmail: partial.actorEmail ?? ctx.authUser?.email,
    actorRole: partial.actorRole ?? ctx.currentRole,
    staffUserId: partial.staffUserId ?? ctx.authUser?.id,
    impersonating: partial.impersonating ?? ctx.impersonatingActive,
    apiConnected: partial.apiConnected ?? ctx.apiConnected,
    userAgent: partial.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    metadata: sanitizeMetadata(partial.metadata),
  };
}

export function shallowChangeRecord<T extends Record<string, unknown>>(
  before: T | undefined,
  patch: Partial<T>
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(patch)) {
    const to = patch[key as keyof T] as unknown;
    const from = before ? (before[key as keyof T] as unknown) : undefined;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from: sanitizeAuditValue(key, from), to: sanitizeAuditValue(key, to) };
    }
  }
  return changes;
}
