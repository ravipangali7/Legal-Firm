import { Link } from 'react-router-dom';
import defaultBrandLogo from '@/assets/logo-icon.png';
import { useSiteHomepageFooter } from '@/hooks/useSiteHomepageFooter';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { CmsImage } from '@/components/CmsImage';

const DynamicFooter = () => {
  const footer = useSiteHomepageFooter();
  const { config } = useSiteConfig();
  const logoRaw = (config?.site_logo || '').trim();
  const brandName = (config?.site_name || 'TaxLexis').trim() || 'TaxLexis';
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 py-14">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex flex-row items-center gap-3 min-w-0">
              <CmsImage
                src={logoRaw}
                alt={brandName}
                className="h-12 w-auto shrink-0 bg-white rounded-lg p-1.5"
                fallbackSrc={defaultBrandLogo}
                fallbackKind="brand"
              />
              <span className="text-lg font-semibold text-primary-foreground tracking-tight truncate" title={brandName}>
                {brandName}
              </span>
            </div>
            <p className="mt-4 text-primary-foreground/80 text-sm leading-relaxed max-w-sm">{footer.tagline}</p>
          </div>
          {footer.columns.map((c) => (
            <div key={c.id} className="lg:col-span-2">
              <div className="text-sm font-bold uppercase tracking-wider text-accent">{c.title}</div>
              <ul className="mt-4 space-y-2">
                {c.links.map((l, i) => (
                  <li key={i}><Link to={l.href} className="text-sm text-primary-foreground/80 hover:text-accent transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/60">
          <span>{footer.copyright}</span>
          <div className="flex gap-2">
            {footer.social.map((s) => (
              <a key={s.label} href={s.href} className="hover:text-accent transition-colors" aria-label={s.label}>{s.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;
