import type { AdminNotification } from '@/store/adminStore';

const KEY = 'legalfirm_admin_notification_read_overrides_v1';

function load(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'boolean') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function save(next: Record<string, boolean>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Merge persisted read/unread choices onto the in-memory notification list. */
export function mergeNotificationReadOverrides(notifications: AdminNotification[]): AdminNotification[] {
  const o = load();
  return notifications.map((n) => (Object.prototype.hasOwnProperty.call(o, n.id) ? { ...n, read: o[n.id]! } : n));
}

export function setNotificationReadOverride(id: string, read: boolean): void {
  const o = load();
  o[id] = read;
  save(o);
}

export function setAllNotificationReadOverrides(ids: string[]): void {
  const o = load();
  for (const id of ids) o[id] = true;
  save(o);
}

export function removeNotificationReadOverride(id: string): void {
  const o = load();
  if (!Object.prototype.hasOwnProperty.call(o, id)) return;
  delete o[id];
  save(o);
}
