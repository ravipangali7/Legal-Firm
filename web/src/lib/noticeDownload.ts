import type { NoticePublicDetailApi } from '@/lib/api';

function safeFilenameBase(title: string): string {
  const t = title
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return t || 'notice';
}

function pickText(
  notice: NoticePublicDetailApi,
  lang: 'en' | 'ne',
  en: 'title' | 'excerpt' | 'body',
  ne: 'title_ne' | 'excerpt_ne' | 'body_ne',
): string {
  if (lang === 'ne') {
    const v = String(notice[ne] ?? '').trim();
    if (v) return v;
    return String(notice[en] ?? '');
  }
  return String(notice[en] ?? '');
}

/** Plain-text download of a notice in the chosen language. */
export function downloadNoticeAsText(notice: NoticePublicDetailApi, lang: 'en' | 'ne'): void {
  const title = pickText(notice, lang, 'title', 'title_ne');
  const excerpt = pickText(notice, lang, 'excerpt', 'excerpt_ne');
  const body = pickText(notice, lang, 'body', 'body_ne');
  const issued =
    lang === 'ne'
      ? (notice.issued_by_ne?.trim() || notice.issued_by)
      : notice.issued_by;

  const lines: string[] = [
    title,
    '',
    `Issued by: ${issued}`,
    `Posted: ${notice.created_at}`,
    `Views: ${notice.view_count}  |  Up: ${notice.upvotes}  |  Down: ${notice.downvotes}`,
    `Language: ${lang === 'ne' ? 'Nepali' : 'English'}`,
  ];
  if (Array.isArray(notice.tags) && notice.tags.length) {
    lines.push(`Tags: ${notice.tags.join(', ')}`);
  }
  lines.push('', '— Excerpt —', excerpt || '(none)', '', '— Full text —', body || '(none)');
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilenameBase(title)}.txt`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
