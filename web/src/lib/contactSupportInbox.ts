import type { ContactMessageApiRow } from '@/lib/api';
import type { AdminNotification, SupportTicket, TicketMessage } from '@/store/adminStore';

const STORAGE_KEY = 'legalfirm_contact_admin_submissions_v1';
const VIEWED_TICKET_IDS_KEY = 'legalfirm_support_admin_viewed_v1';
const MAX_ENTRIES = 100;

/** Website contact submissions shown in admin Support (`cm_*` from API, `ct_*` from local fallback). */
export function isInboundContactTicketId(id: string): boolean {
  return id.startsWith('cm_') || id.startsWith('ct_');
}

function readViewedTicketIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_TICKET_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

/** Persist staff “seen” state so refresh keeps read/unread styling for inbound contact tickets. */
export function markSupportTicketViewedInStorage(id: string): void {
  if (!isInboundContactTicketId(id)) return;
  const s = readViewedTicketIds();
  if (s.has(id)) return;
  s.add(id);
  localStorage.setItem(VIEWED_TICKET_IDS_KEY, JSON.stringify([...s]));
}

export function applyViewedStateToTickets(tickets: SupportTicket[]): SupportTicket[] {
  const viewed = readViewedTicketIds();
  return tickets.map((t) => {
    if (!isInboundContactTicketId(t.id)) return t;
    const viewedByAdmin = viewed.has(t.id) || t.viewedByAdmin === true;
    return { ...t, viewedByAdmin };
  });
}

export interface ContactSubmissionBundle {
  ticket: SupportTicket;
  notification: AdminNotification;
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function randomId(prefix: string) {
  const u = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${u.replace(/-/g, '').slice(0, 16)}`;
}

export function buildContactSupportTicket(form: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): SupportTicket {
  const ts = nowIso();
  const id = randomId('ct');
  const phoneLine = form.phone?.trim() ? `Phone: ${form.phone.trim()}\n\n` : '';
  const body = form.message.trim();
  const msg: TicketMessage = {
    id: randomId('msg'),
    author: form.name.trim(),
    body,
    createdAt: ts,
  };
  return {
    id,
    subject: form.subject.trim(),
    description: `${phoneLine}${body}`,
    requester: form.name.trim(),
    email: form.email.trim(),
    status: 'open',
    priority: 'medium',
    assignee: '',
    messages: [msg],
    createdAt: ts,
    updatedAt: ts,
    viewedByAdmin: false,
  };
}

function readBundles(): ContactSubmissionBundle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is ContactSubmissionBundle => {
      if (!x || typeof x !== 'object') return false;
      const b = x as Record<string, unknown>;
      const t = b.ticket as Record<string, unknown> | undefined;
      const n = b.notification as Record<string, unknown> | undefined;
      return (
        !!t &&
        typeof t.id === 'string' &&
        typeof t.subject === 'string' &&
        !!n &&
        typeof n.id === 'string' &&
        typeof n.title === 'string'
      );
    });
  } catch {
    return [];
  }
}

function writeBundles(bundles: ContactSubmissionBundle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles.slice(0, MAX_ENTRIES)));
}

export function readInboxInitialState(): { tickets: SupportTicket[]; notifications: AdminNotification[] } {
  const bundles = readBundles();
  return {
    tickets: bundles.map((b) => b.ticket),
    notifications: bundles.map((b) => b.notification),
  };
}

/** Persists ticket + matching admin notification; returns the notification to merge into UI state. */
export function appendContactSubmission(ticket: SupportTicket): AdminNotification {
  const ts = nowIso();
  const notification: AdminNotification = {
    id: randomId('cn'),
    title: 'New website contact message',
    body: `${ticket.requester} — ${ticket.subject}`,
    type: 'info',
    read: false,
    createdAt: ts,
    link: '/admin/support',
  };
  const bundles = readBundles().filter((b) => b.ticket.id !== ticket.id);
  bundles.unshift({ ticket, notification });
  writeBundles(bundles);
  return notification;
}

/** Removes persisted bundle; returns the paired notification id so UI state can stay in sync. */
export function removeContactSubmission(ticketId: string): string | null {
  if (!ticketId.startsWith('ct_')) return null;
  try {
    const bundles = readBundles();
    const victim = bundles.find((b) => b.ticket.id === ticketId);
    writeBundles(bundles.filter((b) => b.ticket.id !== ticketId));
    return victim?.notification.id ?? null;
  } catch {
    return null;
  }
}

export function initialSupportTicketsWithInbox(seed: SupportTicket[]): SupportTicket[] {
  return [...readInboxInitialState().tickets, ...seed];
}

export function initialNotificationsWithInbox(seed: AdminNotification[]): AdminNotification[] {
  return [...readInboxInitialState().notifications, ...seed];
}

/** Map persisted contact (Django) to the in-memory SupportTicket shape (id prefix `cm_`). */
export function mapPersistedContactRowToSupportTicket(row: ContactMessageApiRow): SupportTicket {
  const rawTs = row.created_at || new Date().toISOString();
  const ts = rawTs.slice(0, 19);
  const phone = (row.phone || '').trim();
  const phoneLine = phone ? `Phone: ${phone}\n\n` : '';
  const body = row.message.trim();
  const bareId = String(row.id).replace(/^cm_/, '');
  const id = `cm_${bareId}`;
  const msg: TicketMessage = {
    id: `${id}_m0`,
    author: row.name.trim(),
    body,
    createdAt: ts,
  };
  return {
    id,
    subject: row.subject.trim(),
    description: `${phoneLine}${body}`,
    requester: row.name.trim(),
    email: row.email.trim(),
    status: 'open',
    priority: 'medium',
    assignee: '',
    messages: [msg],
    createdAt: ts,
    updatedAt: ts,
    viewedByAdmin: false,
  };
}

export function buildContactAdminNotification(ticket: SupportTicket): AdminNotification {
  const ts = nowIso();
  return {
    id: randomId('cn'),
    title: 'New website contact message',
    body: `${ticket.requester} — ${ticket.subject}`,
    type: 'info',
    read: false,
    createdAt: ts,
    link: '/admin/support',
  };
}

/** Merges API-sourced contact tickets, legacy localStorage inbox (`ct_*`), then seed demo tickets. */
export function buildSupportTicketsList(apiRows: Record<string, unknown>[], seedTickets: SupportTicket[]): SupportTicket[] {
  const fromApi = apiRows.map((raw) =>
    mapPersistedContactRowToSupportTicket({
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      email: String(raw.email ?? ''),
      phone: String(raw.phone ?? ''),
      subject: String(raw.subject ?? ''),
      message: String(raw.message ?? ''),
      created_at: String(raw.created_at ?? ''),
    })
  );
  const fromLs = readInboxInitialState().tickets;
  const out: SupportTicket[] = [];
  const seen = new Set<string>();
  for (const t of fromApi) {
    if (!t.id.startsWith('cm_') || t.id.length < 8) continue;
    if (!seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  for (const t of fromLs) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  for (const t of seedTickets) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return applyViewedStateToTickets(out);
}
