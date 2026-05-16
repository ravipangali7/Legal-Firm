import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PageSeoInput } from '@/lib/seo';

interface SeoContextValue {
  pageSeo: PageSeoInput | null;
  setPageSeo: (seo: PageSeoInput | null) => void;
}

const SeoCtx = createContext<SeoContextValue | null>(null);

export function SeoProvider({ children }: { children: ReactNode }) {
  const [pageSeo, setPageSeoState] = useState<PageSeoInput | null>(null);

  const setPageSeo = useCallback((seo: PageSeoInput | null) => {
    setPageSeoState(seo);
  }, []);

  const value = useMemo(() => ({ pageSeo, setPageSeo }), [pageSeo, setPageSeo]);

  return <SeoCtx.Provider value={value}>{children}</SeoCtx.Provider>;
}

export function useSeoContext() {
  const ctx = useContext(SeoCtx);
  if (!ctx) throw new Error('useSeoContext must be used within SeoProvider');
  return ctx;
}

/** Set per-page SEO overrides; cleared on unmount. */
export function usePageSeo(seo: PageSeoInput | null) {
  const { setPageSeo } = useSeoContext();

  useEffect(() => {
    setPageSeo(seo);
    return () => setPageSeo(null);
  }, [seo, setPageSeo]);
}
