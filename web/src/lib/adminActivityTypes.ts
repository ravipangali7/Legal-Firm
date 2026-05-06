export type ActivityLogChannel = 'admin_ui' | 'manual_entry';

export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail: string;
  channel?: ActivityLogChannel;
  actorEmail?: string;
  actorRole?: string;
  staffUserId?: string;
  impersonating?: boolean;
  apiConnected?: boolean;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
