import type { NoticePublicDetailApi } from '@/lib/api';
import type { NoticeDisplayFields } from '@/lib/noticePdf';

export type NoticeNepaliMtMap = Partial<Record<'title' | 'excerpt' | 'body' | 'issued_by', string>>;

function needsNeFromEn(en: string, ne: string | undefined): boolean {
  return Boolean((en || '').trim()) && !(ne || '').trim();
}

/** Which English fields need machine Nepali because the corresponding *_ne field is empty. */
export function collectNoticeNepaliMtParts(n: NoticePublicDetailApi): {
  keys: (keyof NoticeNepaliMtMap)[];
  texts: string[];
} {
  const keys: (keyof NoticeNepaliMtMap)[] = [];
  const texts: string[] = [];
  const push = (key: keyof NoticeNepaliMtMap, en: string, ne: string | undefined) => {
    if (!needsNeFromEn(en, ne)) return;
    keys.push(key);
    texts.push(en.trim());
  };
  push('title', n.title, n.title_ne);
  push('excerpt', n.excerpt || '', n.excerpt_ne);
  push('body', n.body || '', n.body_ne);
  push('issued_by', n.issued_by, n.issued_by_ne);
  return { keys, texts };
}

export function buildNoticeEnFields(n: NoticePublicDetailApi): NoticeDisplayFields {
  return {
    title: n.title,
    excerpt: n.excerpt || '',
    body: n.body || '',
    issuedBy: n.issued_by,
  };
}

export function buildNoticeNeFields(n: NoticePublicDetailApi, mt?: NoticeNepaliMtMap | null): NoticeDisplayFields {
  return {
    title: n.title_ne?.trim() || mt?.title || n.title,
    excerpt: n.excerpt_ne?.trim() || mt?.excerpt || (n.excerpt || ''),
    body: n.body_ne?.trim() || mt?.body || (n.body || ''),
    issuedBy: n.issued_by_ne?.trim() || mt?.issued_by || n.issued_by,
  };
}
