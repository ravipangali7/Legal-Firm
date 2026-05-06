import { jsPDF } from 'jspdf';
import type { NoticePublicDetailApi } from '@/lib/api';
import type { LawPdfLang, LawPdfSegment } from '@/lib/lawPdf';
import { registerNepaliFonts, renderLawPdfSegments } from '@/lib/lawPdf';

export type NoticeDisplayFields = {
  title: string;
  excerpt: string;
  body: string;
  issuedBy: string;
};

export function buildNoticePdfSegments(notice: NoticePublicDetailApi, display: NoticeDisplayFields): LawPdfSegment[] {
  const segments: LawPdfSegment[] = [
    { text: display.title, bold: true, fontSize: 16 },
    {
      text: `Issued by: ${display.issuedBy} · Posted ${notice.created_at} · ${notice.view_count.toLocaleString()} views`,
      bold: false,
      fontSize: 10,
    },
  ];
  if (Array.isArray(notice.tags) && notice.tags.length) {
    segments.push({ text: `Tags: ${notice.tags.join(', ')}`, bold: false, fontSize: 10 });
  }
  const ex = (display.excerpt || '').trim();
  if (ex) {
    segments.push({ text: 'Excerpt', bold: true, fontSize: 12 });
    segments.push({ text: ex, bold: false, fontSize: 11 });
  }
  const body = (display.body || '').trim();
  segments.push({ text: 'Full text', bold: true, fontSize: 12 });
  segments.push({ text: body || '(none)', bold: false, fontSize: 11 });
  return segments;
}

export async function downloadNoticeAsPdf(
  notice: NoticePublicDetailApi,
  display: NoticeDisplayFields,
  lang: LawPdfLang,
): Promise<void> {
  const segments = buildNoticePdfSegments(notice, display);
  const joined = segments.map((s) => s.text).join('\n');
  const useNe = lang === 'ne' || /[\u0900-\u097F]/.test(joined);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  if (useNe) {
    await registerNepaliFonts(doc);
  }
  renderLawPdfSegments(doc, segments, useNe ? 'ne' : 'en');
  const safe = notice.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'notice';
  const suffix = useNe ? '-ne' : '';
  doc.save(`${safe}${suffix}.pdf`);
}
