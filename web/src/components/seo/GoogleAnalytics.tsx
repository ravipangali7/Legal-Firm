import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads GA4 when `ga_id` is set in App Settings (e.g. G-XXXXXXXX). */
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const { pathname, search } = useLocation();
  const id = measurementId.trim();

  useEffect(() => {
    if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;

    const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });
  }, [id]);

  useEffect(() => {
    if (!id || !window.gtag) return;
    window.gtag('event', 'page_view', {
      page_path: pathname + search,
      page_title: document.title,
    });
  }, [id, pathname, search]);

  return null;
}
