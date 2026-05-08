import type { ActivityLogEntry } from '@/lib/adminActivityTypes';

function normalizeStoredMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { raw: parsed };
    } catch {
      return { _text: raw };
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return { value: raw as unknown };
}

const KEY = 'legalfirm_admin_activity_logs_v2';
const MAX = 500;

export function loadAdminActivityLogs(): ActivityLogEntry[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: ActivityLogEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      if (typeof o.id !== 'string' || typeof o.createdAt !== 'string' || typeof o.actor !== 'string') continue;
      if (typeof o.action !== 'string' || typeof o.entityType !== 'string' || typeof o.detail !== 'string') continue;
      out.push({
        id: o.id,
        createdAt: o.createdAt,
        actor: o.actor,
        action: o.action,
        entityType: o.entityType,
        entityId: typeof o.entityId === 'string' ? o.entityId : undefined,
        detail: o.detail,
        channel: o.channel === 'manual_entry' || o.channel === 'admin_ui' ? o.channel : undefined,
        actorEmail: typeof o.actorEmail === 'string' ? o.actorEmail : undefined,
        actorRole: typeof o.actorRole === 'string' ? o.actorRole : undefined,
        staffUserId: typeof o.staffUserId === 'string' ? o.staffUserId : undefined,
        impersonating: typeof o.impersonating === 'boolean' ? o.impersonating : undefined,
        apiConnected: typeof o.apiConnected === 'boolean' ? o.apiConnected : undefined,
        userAgent: typeof o.userAgent === 'string' ? o.userAgent : undefined,
        metadata: normalizeStoredMetadata(o.metadata),
      });
    }
    return out;
  } catch {
    return null;
  }
}

export function saveAdminActivityLogs(entries: ActivityLogEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const trimmed = entries.slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode */
  }
}
