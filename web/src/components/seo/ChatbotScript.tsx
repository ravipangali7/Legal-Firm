import { useEffect } from 'react';

const MARKER = 'data-site-chatbot';

/** Injects embed HTML from App Settings on every page (external + inline script tags). */
export default function ChatbotScript({ embedHtml }: { embedHtml: string }) {
  const html = embedHtml.trim();

  useEffect(() => {
    if (!html) return;

    const holder = document.createElement('motionless-div');
    holder.innerHTML = html;

    const injected: HTMLElement[] = [];
    holder.querySelectorAll('script').forEach((oldScript) => {
      const script = document.createElement('script');
      script.setAttribute(MARKER, '1');
      for (const attr of Array.from(oldScript.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }
      if (oldScript.src) {
        script.src = oldScript.src;
      }
      if (oldScript.textContent) {
        script.textContent = oldScript.textContent;
      }
      document.body.appendChild(script);
      injected.push(script);
    });

    return () => {
      injected.forEach((el) => el.remove());
    };
  }, [html]);

  return null;
}
