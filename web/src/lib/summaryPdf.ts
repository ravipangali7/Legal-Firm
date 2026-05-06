import { jsPDF } from 'jspdf';
import type { SummaryApi } from '@/lib/api';
import type { LawPdfLang, LawPdfSegment } from '@/lib/lawPdf';
import { registerNepaliFonts, renderLawPdfSegments } from '@/lib/lawPdf';

function htmlToPlainText(html: string): string {
  if (!html.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style').forEach((el) => el.remove());
  const t = doc.body.textContent || '';
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function pickLang(text: string): LawPdfLang {
  return /[\u0900-\u097F]/.test(text) ? 'ne' : 'en';
}

export function buildSummaryPdfSegments(summary: SummaryApi): LawPdfSegment[] {
  const segments: LawPdfSegment[] = [
    { text: summary.title, bold: true, fontSize: 16 },
    {
      text: `${summary.category_name} · Posted ${summary.posted} · ${summary.views.toLocaleString()} views`,
      bold: false,
      fontSize: 10,
    },
  ];
  if (summary.preview.trim()) {
    segments.push({ text: summary.preview.trim(), bold: false, fontSize: 11 });
  }
  const bodyPlain = htmlToPlainText(summary.body);
  if (bodyPlain) {
    segments.push({ text: 'Content', bold: true, fontSize: 12 });
    segments.push({ text: bodyPlain, bold: false, fontSize: 11 });
  }
  return segments;
}

export async function downloadSummaryAsPdf(summary: SummaryApi): Promise<void> {
  const segments = buildSummaryPdfSegments(summary);
  const joined = segments.map((s) => s.text).join('\n');
  const lang = pickLang(joined);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  if (lang === 'ne') {
    await registerNepaliFonts(doc);
  }
  renderLawPdfSegments(doc, segments, lang);
  const safe = summary.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'summary';
  doc.save(`${safe}.pdf`);
}
