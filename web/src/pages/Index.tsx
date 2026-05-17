import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import HeroSlider from '@/components/cms/HeroSlider';
import AboutBlock from '@/components/cms/AboutBlock';
import ServicesGrid from '@/components/cms/ServicesGrid';
import TeamGrid from '@/components/cms/TeamGrid';
import NewsGrid from '@/components/cms/NewsGrid';
import DynamicFooter from '@/components/cms/DynamicFooter';
import ProceduresHomeBlock from '@/components/cms/ProceduresHomeBlock';
import Testimonials from '@/components/Testimonials';
import ChatWidget from '@/components/ChatWidget';
import { siteHomepageIndexQueryOptions } from '@/lib/siteHomepageQuery';
import { mapHomepageApiToSnapshot } from '@/lib/homepageMap';
import { CmsStoreProvider, useCms, type SectionToggles } from '@/store/cmsStore';
import HomepageSeo from '@/components/seo/HomepageSeo';
import type { CSSProperties } from 'react';

/** CMS section dimensions may be serialized as numbers from the API JSON. */
function cssPx(v: string | number | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return `${v}px`;
  const t = String(v).trim();
  if (!t) return undefined;
  if (/^\d+(\.\d+)?$/.test(t)) return `${t}px`;
  return t;
}

const SectionWrap = ({ sectionKey, children }: { sectionKey: keyof SectionToggles; children: React.ReactNode }) => {
  const { sectionStyles } = useCms();
  const s = sectionStyles?.[sectionKey];
  if (!s) return <>{children}</>;
  const style: CSSProperties = {};
  const mh = cssPx(s.minHeight as string | number | undefined);
  const mw = cssPx(s.maxWidth as string | number | undefined);
  const pad = cssPx(s.padding as string | number | undefined);
  const br = cssPx(s.borderRadius as string | number | undefined);
  if (mh) style.minHeight = mh;
  if (mw) style.maxWidth = mw;
  if (s.hasBorder) {
    const bw = s.borderWidth != null && String(s.borderWidth).trim() !== '' ? String(s.borderWidth) : '1';
    style.border = `${bw}px solid ${s.borderColor || '#e5e7eb'}`;
  }
  if (pad) style.padding = pad;
  if (s.bgColor && String(s.bgColor).trim() !== '') style.backgroundColor = String(s.bgColor);
  if (br) style.borderRadius = br;
  if (mw) style.marginLeft = 'auto';
  if (mw) style.marginRight = 'auto';
  return <div style={style}>{children}</div>;
};

const Sections = () => {
  const { toggles } = useCms();
  return (
    <>
      {toggles.hero && <SectionWrap sectionKey="hero"><HeroSlider /></SectionWrap>}
      {toggles.about && <SectionWrap sectionKey="about"><AboutBlock /></SectionWrap>}
      {toggles.services && <SectionWrap sectionKey="services"><ServicesGrid /></SectionWrap>}
      {toggles.procedures && <SectionWrap sectionKey="procedures"><ProceduresHomeBlock /></SectionWrap>}
      {toggles.team && <SectionWrap sectionKey="team"><TeamGrid /></SectionWrap>}
      {toggles.news && <SectionWrap sectionKey="news"><NewsGrid /></SectionWrap>}
      {toggles.testimonials && <SectionWrap sectionKey="testimonials"><Testimonials /></SectionWrap>}
      {toggles.footer && <SectionWrap sectionKey="footer"><DynamicFooter /></SectionWrap>}
    </>
  );
};

const Index = () => {
  const { data, isLoading } = useQuery(siteHomepageIndexQueryOptions);

  const initialSnapshot = useMemo(() => (data ? mapHomepageApiToSnapshot(data) : null), [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <CmsStoreProvider initialSnapshot={initialSnapshot} persistMode="readonly">
      <HomepageSeo />
      <div className="min-h-screen overflow-x-hidden">
        <Header />
        <Sections />
        <ChatWidget />
      </div>
    </CmsStoreProvider>
  );
};

export default Index;
