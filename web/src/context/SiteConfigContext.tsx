import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchPublicConfig, type PublicSiteConfig } from '@/lib/api';
import { cmsMediaSrc } from '@/lib/cmsAssetUrl';
import { configureSiteSeo } from '@/lib/seo/metaTags';

interface SiteConfigState {
  config: PublicSiteConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SiteConfigState | null>(null);

export const SiteConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<PublicSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await fetchPublicConfig();
      setConfig(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load site config');
      setConfig({
        maintenance_mode: false,
        allow_signups: true,
        site_name: 'TaxLexis Legal',
        email_notifications: true,
        payments_enabled: false,
        esewa_enabled: false,
        esewa_test_mode: true,
        khalti_enabled: false,
        nav_order: [
          'Home',
          'Law',
          'Summary',
          'Procedure',
          'Tax',
          'Pricing',
          'About',
          'Professional',
          'Contact',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!config) return;
    configureSiteSeo({
      siteName: config.site_name,
      siteMetaDescription: config.seo_description,
      defaultOgImage: config.og_image,
    });
    const fav = (config.site_favicon || '').trim();
    if (!fav) return;
    const href = cmsMediaSrc(fav);
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [config]);

  const value = useMemo(
    () => ({ config, loading, error, refresh }),
    [config, loading, error]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSiteConfig = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider');
  return ctx;
};
