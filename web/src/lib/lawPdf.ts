import type { jsPDF } from 'jspdf';
import type { ActItem, LawDetailContent } from '@/data/lawsAndSummaries';

export type LawPdfLang = 'en' | 'ne';
export type LawPdfTabId = 'content' | 'amendments' | 'cases';

export type LawPdfSegment = { text: string; bold: boolean; fontSize: number };

const NOTO_FAMILY = 'NotoSansDevanagari';

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return binary;
}

let nepaliFontBinariesPromise: Promise<{ regular: string; bold: string }> | null = null;

export async function registerNepaliFonts(doc: jsPDF): Promise<void> {
  if (!nepaliFontBinariesPromise) {
    const base = import.meta.env.BASE_URL;
    nepaliFontBinariesPromise = (async () => {
      const [regRes, boldRes] = await Promise.all([
        fetch(`${base}fonts/NotoSansDevanagari-Regular.ttf`),
        fetch(`${base}fonts/NotoSansDevanagari-Bold.ttf`),
      ]);
      if (!regRes.ok || !boldRes.ok) {
        throw new Error('Could not load Nepali fonts for PDF export');
      }
      const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
      return { regular: arrayBufferToBinaryString(regBuf), bold: arrayBufferToBinaryString(boldBuf) };
    })();
  }
  const fonts = await nepaliFontBinariesPromise;
  doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', fonts.regular);
  doc.addFont('NotoSansDevanagari-Regular.ttf', NOTO_FAMILY, 'normal');
  doc.addFileToVFS('NotoSansDevanagari-Bold.ttf', fonts.bold);
  doc.addFont('NotoSansDevanagari-Bold.ttf', NOTO_FAMILY, 'bold');
}

export function buildLawPdfSegments(
  detail: LawDetailContent,
  tab: LawPdfTabId,
  lang: LawPdfLang,
  current: ActItem,
): LawPdfSegment[] {
  const segments: LawPdfSegment[] = [];
  const tabInfo = detail.tabs.find((t) => t.id === tab);
  const tabLabel =
    lang === 'en' ? (tabInfo?.label ?? String(tab)) : (tabInfo?.labelNe ?? tabInfo?.label ?? String(tab));
  const actTitle = lang === 'en' ? current.titleEn : current.titleNe;

  segments.push({ text: `${actTitle} — ${tabLabel}`, bold: true, fontSize: 14 });

  if (tab === 'content') {
    for (const section of detail.sections) {
      const heading = lang === 'en' ? section.title : section.titleNe;
      segments.push({ text: heading, bold: true, fontSize: 12 });
      const paras = lang === 'en' ? section.paragraphs.en : section.paragraphs.ne;
      for (const line of paras) {
        segments.push({ text: line, bold: false, fontSize: 11 });
      }
    }
    const calloutTitle = lang === 'en' ? detail.callout.title : detail.callout.titleNe;
    segments.push({ text: calloutTitle, bold: true, fontSize: 11 });
    const calloutBody = lang === 'en' ? detail.callout.body.en : detail.callout.body.ne;
    segments.push({ text: calloutBody, bold: false, fontSize: 11 });
  } else {
    const items = tab === 'amendments' ? detail.amendments : detail.relatedCases;
    for (const item of items) {
      segments.push({ text: `• ${item}`, bold: false, fontSize: 11 });
    }
  }

  return segments;
}

export function renderLawPdfSegments(doc: jsPDF, segments: LawPdfSegment[], lang: LawPdfLang): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const fontFamily = lang === 'ne' ? NOTO_FAMILY : 'helvetica';

  let y = margin + 16;

  for (const seg of segments) {
    doc.setFont(fontFamily, seg.bold ? 'bold' : 'normal');
    doc.setFontSize(seg.fontSize);
    const wrapped = doc.splitTextToSize(seg.text, usableWidth) as string[];
    const lh = Math.ceil(seg.fontSize * 1.3);

    for (const line of wrapped) {
      if (y + lh > pageHeight - margin) {
        doc.addPage();
        y = margin + lh;
      }
      doc.text(line, margin, y);
      y += lh;
    }

    y += seg.bold && seg.fontSize >= 12 ? 6 : 4;
  }
}
