import { useCallback, useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type KnowledgeResourcePdfFlipbookProps = {
  className?: string;
  /** Public PDF URL (may fail cross-origin when media is served without CORS). */
  fileUrl?: string;
  /** Admin-only: path under the API, e.g. `/api/admin/knowledge-resources/{id}/preview-pdf/`. */
  sessionPreviewPath?: string;
};

const PAGE_WIDTH = 420;
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * 1.414);

export function KnowledgeResourcePdfFlipbook({
  fileUrl,
  sessionPreviewPath,
  className,
}: KnowledgeResourcePdfFlipbookProps) {
  const [numPages, setNumPages] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const file = useMemo(() => {
    if (sessionPreviewPath) {
      return { url: apiUrl(sessionPreviewPath), withCredentials: true as const };
    }
    if (fileUrl) return fileUrl;
    return null;
  }, [sessionPreviewPath, fileUrl]);

  const docKey = sessionPreviewPath ?? fileUrl ?? '';

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setErr(null);
  }, []);

  const onLoadError = useCallback((e: Error) => {
    setErr(e.message || 'Could not load PDF');
    setNumPages(0);
  }, []);

  useEffect(() => {
    setNumPages(0);
    setErr(null);
  }, [docKey]);

  const pages = useMemo(() => {
    if (!numPages) return null;
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  if (!file) {
    return <p className="text-sm text-muted-foreground">No PDF URL.</p>;
  }

  return (
    <div className={cn('w-full flex flex-col items-center gap-3', className)}>
      <Document
        key={docKey}
        file={file}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={<p className="text-sm text-muted-foreground py-8">Loading PDF…</p>}
        error={<p className="text-sm text-destructive py-8">{err ?? 'Failed to load PDF.'}</p>}
        className="flex flex-col items-center"
      >
        {pages && (
          <HTMLFlipBook
            width={PAGE_WIDTH}
            height={PAGE_HEIGHT}
            minWidth={280}
            minHeight={396}
            maxWidth={PAGE_WIDTH}
            maxHeight={PAGE_HEIGHT}
            drawShadow
            flippingTime={600}
            usePortrait={false}
            showCover
            className="mx-auto shadow-xl rounded-sm bg-neutral-900/5"
            startPage={0}
            size="stretch"
            autoSize
          >
            {pages.map((pageNum) => (
              <div
                key={pageNum}
                className="bg-white flex items-center justify-center overflow-hidden border border-border/60"
              >
                <Page pageNumber={pageNum} width={PAGE_WIDTH} renderTextLayer renderAnnotationLayer />
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </Document>
    </div>
  );
}
