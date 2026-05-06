import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { mapHomepageApiToSnapshot, mapSnapshotToHomepagePayload } from '@/lib/homepageMap';
import { testimonialPortraitSrc } from '@/lib/cmsImageFallbacks';
import { patchAdminCmsHomepage } from '@/lib/api';
import hero1 from '@/assets/hero-1.jpg';
import hero2 from '@/assets/hero-2.jpg';
import hero3 from '@/assets/hero-3.jpg';

// ============ Types ============
export interface BaseItem { id: string; order: number; enabled: boolean; }

export interface NavItem extends BaseItem {
  label: string;
  href: string;
  isDropdown: boolean;
  children: { label: string; href: string }[];
}

export interface HeroSlide extends BaseItem {
  eyebrow?: string;
  title: string; subtitle: string; cta: string; href: string;
  secondaryCta?: string;
  secondaryHref?: string;
  image: string;
}
export interface AboutSection {
  enabled: boolean; eyebrow: string; title: string; body: string; image: string;
  stats: { id?: string; label: string; value: string }[];
}
export interface ServiceItem extends BaseItem { icon: string; title: string; description: string; href: string; }
export interface TeamMember extends BaseItem {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  /** Years in practice; summed for the public Professionals page when enabled. */
  experienceYears: number;
  linkedinUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  contactEmail: string;
}
export interface NewsItem extends BaseItem {
  title: string;
  excerpt: string;
  /** Full article HTML or plain text for the public `/news/:id` page; falls back to excerpt when empty. */
  body: string;
  image: string;
  date: string;
  href: string;
  tag: string;
}

export interface TestimonialItem extends BaseItem {
  name: string;
  roleTitle: string;
  content: string;
  rating: number;
  image: string;
}

export interface TestimonialsBlock {
  title: string;
  intro: string;
  metrics: { value: string; label: string }[];
  items: TestimonialItem[];
}

export interface FooterCfg {
  tagline: string;
  columns: { id: string; title: string; links: { label: string; href: string }[] }[];
  social: { label: string; href: string }[];
  copyright: string;
}
export interface SectionToggles {
  hero: boolean;
  about: boolean;
  services: boolean;
  team: boolean;
  news: boolean;
  testimonials: boolean;
  footer: boolean;
  /** Shown on homepage when enabled in backend; persisted with CMS snapshot. */
  procedures: boolean;
}
export interface SectionStyle {
  minHeight?: string; maxWidth?: string; hasBorder?: boolean; borderColor?: string;
  borderWidth?: string; borderRadius?: string; padding?: string; bgColor?: string;
}
export type SectionStyles = Partial<Record<keyof SectionToggles, SectionStyle>>;

// ============ Seed ============
const seedSlides: HeroSlide[] = [
  {
    id: 's1',
    order: 1,
    enabled: true,
    eyebrow: 'Tax consultant',
    title: 'Expert Tax Counsel',
    subtitle: 'Acts, cases and procedures in one place.',
    cta: 'Get started',
    href: '/contact',
    secondaryCta: 'Talk to a lawyer',
    secondaryHref: '/contact',
    image: hero1,
  },
  { id: 's2', order: 2, enabled: true, title: 'Stay Compliant. Stay Confident.', subtitle: 'Up-to-date Acts, Rules, Procedures and case summaries — searchable and curated by professionals.', cta: 'Browse Laws', href: '/laws', image: hero2 },
  { id: 's3', order: 3, enabled: true, title: 'A Team that Wins for You', subtitle: 'Litigation, advisory and compliance — handled end-to-end by certified practitioners.', cta: 'Meet the Team', href: '/professionals', image: hero3 },
];

const seedAbout: AboutSection = {
  enabled: true,
  eyebrow: 'Who we are',
  title: 'TaxLexis Legal',
  body: 'We combine deep expertise in tax law and compliance with practical guidance so your business stays audit-ready and strategically positioned. Acts, cases, and procedures—organized for clarity and speed.',
  image: hero3,
  stats: [
    { label: 'Years of practice', value: '12+' },
    { label: 'Clients served', value: '1,400+' },
    { label: 'Cases won', value: '320+' },
    { label: 'Practice areas', value: '11' },
  ],
};

const seedServices: ServiceItem[] = [
  { id: 'sv1', order: 1, enabled: true, icon: 'Scale', title: 'Compliance', description: 'Filings, audits, and ongoing regulatory alignment.', href: '/procedures' },
  { id: 'sv2', order: 2, enabled: true, icon: 'Gavel', title: 'Tax advisory', description: 'Planning, disputes, and audit support.', href: '/practice-areas/taxation-law' },
  { id: 'sv3', order: 3, enabled: true, icon: 'Building2', title: 'Corporate', description: 'Governance, contracts, and entity structuring.', href: '/practice-areas/company-law' },
  { id: 'sv4', order: 4, enabled: true, icon: 'BookOpen', title: 'Knowledge library', description: 'Acts, rules, and curated updates.', href: '/laws' },
];

const emptyTeamSocial = {
  linkedinUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  contactEmail: '',
} as const;

const seedTeam: TeamMember[] = [
  {
    id: 'tm1',
    order: 1,
    enabled: true,
    name: 'James Parker',
    role: 'Partner · Tax & Corporate',
    bio: 'Strategic counsel for growing businesses and complex tax matters.',
    avatar: '',
    experienceYears: 0,
    ...emptyTeamSocial,
  },
];

const seedNews: NewsItem[] = [
  {
    id: 'n1',
    order: 1,
    enabled: true,
    title: 'Budget made polished',
    excerpt: 'Key takeaways from the latest fiscal measures—and what they mean for your filings.',
    body: '',
    image: hero2,
    date: '2026-04-15',
    href: '/blog',
    tag: 'Insights',
  },
];

const seedFooter: FooterCfg = {
  tagline: 'Professional legal and tax advisory—trusted by businesses for clarity, compliance, and results.',
  columns: [
    { id: 'c1', title: 'Explore', links: [{ label: 'Laws', href: '/laws' }, { label: 'Summaries', href: '/summaries' }, { label: 'Procedures', href: '/procedures' }] },
    { id: 'c2', title: 'Contact', links: [{ label: 'Contact us', href: '/contact' }, { label: 'Pricing', href: '/pricing' }, { label: 'Professionals', href: '/professionals' }] },
  ],
  social: [{ label: 'LinkedIn', href: 'https://linkedin.com' }, { label: 'Facebook', href: 'https://facebook.com' }, { label: 'X', href: 'https://x.com' }],
  copyright: `© ${new Date().getFullYear()} TaxLexis Legal. All rights reserved.`,
};

const seedTestimonials: TestimonialsBlock = {
  title: 'What Our Clients Say',
  intro: 'Trusted by businesses across Texas for our professional legal and tax advisory services.',
  metrics: [
    { value: '4.8/5', label: 'Rating' },
    { value: '500+', label: 'Client Reviews' },
    { value: '100%', label: 'Client Satisfaction' },
  ],
  items: [
    { id: 't1', order: 1, enabled: true, name: 'Sarah Mitchell', roleTitle: 'CFO, Meridian Logistics', content: 'TaxLexis Legal made our multi-state compliance straightforward. Responsive, precise, and genuinely invested in outcomes.', rating: 5, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
    { id: 't2', order: 2, enabled: true, name: 'David Chen', roleTitle: 'Founder, BrightStack SaaS', content: 'From entity setup to ongoing tax strategy, the team has been a steady partner as we scaled.', rating: 5, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
    { id: 't3', order: 3, enabled: true, name: 'Elena Vasquez', roleTitle: 'Director, Rio Manufacturing', content: 'Clear communication and meticulous documentation—exactly what we needed before our audit season.', rating: 5, image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&q=80' },
    { id: 't4', order: 4, enabled: true, name: 'Marcus Webb', roleTitle: 'Owner, Webb Retail Group', content: 'Practical advice without the jargon. We trust them with our books and our growth plans.', rating: 5, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  ],
};

const seedToggles: SectionToggles = { hero: true, about: true, services: true, team: true, news: true, testimonials: true, footer: true, procedures: true };

/** Matches Admin → Settings → Navigation default order (nav_order / navOrder). */
const seedNavItems: NavItem[] = [
  { id: 'nav1', order: 1, enabled: true, label: 'Home', href: '/', isDropdown: false, children: [] },
  { id: 'nav2', order: 2, enabled: true, label: 'Law', href: '/laws', isDropdown: false, children: [] },
  { id: 'nav3', order: 3, enabled: true, label: 'Summary', href: '#', isDropdown: true, children: [
    { label: 'List of Summaries', href: '/summaries' },
  ] },
  { id: 'nav4', order: 4, enabled: true, label: 'Procedure', href: '/procedures', isDropdown: false, children: [] },
  { id: 'nav5', order: 5, enabled: true, label: 'Tax', href: '/practice-areas/taxation-law', isDropdown: false, children: [] },
  { id: 'nav5b', order: 6, enabled: true, label: 'Knowledge Base', href: '/knowledge', isDropdown: false, children: [] },
  { id: 'nav6', order: 7, enabled: true, label: 'Pricing', href: '/pricing', isDropdown: false, children: [] },
  { id: 'nav7', order: 8, enabled: true, label: 'About', href: '/about', isDropdown: false, children: [] },
  { id: 'nav8', order: 9, enabled: true, label: 'Professional', href: '/professionals', isDropdown: false, children: [] },
  { id: 'nav9', order: 10, enabled: true, label: 'Contact', href: '/contact', isDropdown: false, children: [] },
];

// ============ Persistence ============
const KEY = 'taxlexis_cms_v2';
export type Snapshot = {
  slides: HeroSlide[]; about: AboutSection; services: ServiceItem[];
  team: TeamMember[]; news: NewsItem[]; testimonials: TestimonialsBlock; footer: FooterCfg; toggles: SectionToggles;
  sectionStyles: SectionStyles; navItems: NavItem[];
};
export const defaultCmsSnapshot: Snapshot = { slides: seedSlides, about: seedAbout, services: seedServices, team: seedTeam, news: seedNews, testimonials: seedTestimonials, footer: seedFooter, toggles: seedToggles, sectionStyles: {}, navItems: seedNavItems };
const initial: Snapshot = defaultCmsSnapshot;

const normalizeTeamRow = (m: TeamMember): TeamMember => {
  const merged = { ...emptyTeamSocial, ...m } as TeamMember & { years_experience?: unknown };
  let y = merged.experienceYears;
  if (typeof y !== 'number' || Number.isNaN(y)) {
    const legacy = merged.years_experience;
    y = typeof legacy === 'number' && !Number.isNaN(legacy) ? legacy : 0;
  }
  const experienceYears = Math.max(0, Math.min(32767, Math.floor(Number(y)) || 0));
  return { ...merged, experienceYears };
};

const normalizeNewsRow = (n: NewsItem): NewsItem => ({
  ...n,
  body: typeof n.body === 'string' ? n.body : '',
});

const load = (): Snapshot => {
  if (typeof window === 'undefined') return defaultCmsSnapshot;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      const team = Array.isArray(parsed.team)
        ? parsed.team.map((row) => normalizeTeamRow(row as TeamMember))
        : defaultCmsSnapshot.team;
      const news = Array.isArray(parsed.news)
        ? parsed.news.map((row) => normalizeNewsRow(row as NewsItem))
        : defaultCmsSnapshot.news;
      const mergedTestimonials: TestimonialsBlock = parsed.testimonials
        ? {
            ...defaultCmsSnapshot.testimonials,
            ...parsed.testimonials,
            title: parsed.testimonials.title ?? defaultCmsSnapshot.testimonials.title,
            items: Array.isArray(parsed.testimonials.items)
              ? parsed.testimonials.items.map((row, i) => {
                  const t = row as TestimonialItem;
                  return { ...t, image: testimonialPortraitSrc(t.image, i) };
                })
              : defaultCmsSnapshot.testimonials.items,
            metrics: Array.isArray(parsed.testimonials.metrics) ? parsed.testimonials.metrics : defaultCmsSnapshot.testimonials.metrics,
          }
        : defaultCmsSnapshot.testimonials;
      return {
        ...defaultCmsSnapshot,
        ...parsed,
        team,
        news,
        toggles: { ...defaultCmsSnapshot.toggles, ...(parsed.toggles || {}) },
        testimonials: mergedTestimonials,
      };
    }
  } catch { /* ignore */ }
  return defaultCmsSnapshot;
};

// ============ Context ============
interface CmsStore extends Snapshot {
  // hero
  addSlide: (s: Omit<HeroSlide, 'id' | 'order'>) => void;
  updateSlide: (id: string, patch: Partial<HeroSlide>) => void;
  deleteSlide: (id: string) => void;
  moveSlide: (id: string, dir: -1 | 1) => void;
  // about
  updateAbout: (patch: Partial<AboutSection>) => void;
  // services
  addService: (s: Omit<ServiceItem, 'id' | 'order'>) => void;
  updateService: (id: string, patch: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;
  moveService: (id: string, dir: -1 | 1) => void;
  // team
  addMember: (m: Omit<TeamMember, 'id' | 'order'>) => void;
  updateMember: (id: string, patch: Partial<TeamMember>) => void;
  deleteMember: (id: string) => void;
  moveMember: (id: string, dir: -1 | 1) => void;
  // news
  addNews: (n: Omit<NewsItem, 'id' | 'order'>) => void;
  updateNews: (id: string, patch: Partial<NewsItem>) => void;
  deleteNews: (id: string) => void;
  moveNews: (id: string, dir: -1 | 1) => void;
  // footer
  updateFooter: (patch: Partial<FooterCfg>) => void;
  // testimonials
  updateTestimonials: (patch: Partial<Pick<TestimonialsBlock, 'title' | 'intro' | 'metrics'>>) => void;
  addTestimonial: (t: Omit<TestimonialItem, 'id' | 'order'>) => void;
  updateTestimonial: (id: string, patch: Partial<TestimonialItem>) => void;
  deleteTestimonial: (id: string) => void;
  moveTestimonial: (id: string, dir: -1 | 1) => void;
  // toggles
  toggleSection: (key: keyof SectionToggles, value: boolean) => void;
  // section styles
  updateSectionStyle: (key: keyof SectionToggles, patch: Partial<SectionStyle>) => void;
  // navigation
  addNavItem: (n: Omit<NavItem, 'id' | 'order'>) => void;
  updateNavItem: (id: string, patch: Partial<NavItem>) => void;
  deleteNavItem: (id: string) => void;
  moveNavItem: (id: string, dir: -1 | 1) => void;
  // misc
  resetAll: () => void;
  /** When `persistMode` is `remote`, PATCH the full homepage snapshot to the server immediately. */
  flushRemoteSave: () => Promise<void>;
  persistMode: 'local' | 'remote' | 'readonly';
}

const Ctx = createContext<CmsStore | null>(null);

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

const reorder = <T extends BaseItem>(arr: T[], id: string, dir: -1 | 1): T[] => {
  const sorted = [...arr].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((x) => x.id === id);
  const tgt = idx + dir;
  if (idx < 0 || tgt < 0 || tgt >= sorted.length) return arr;
  [sorted[idx], sorted[tgt]] = [sorted[tgt], sorted[idx]];
  return sorted.map((x, i) => ({ ...x, order: i + 1 }));
};

export const CmsStoreProvider = ({
  children,
  initialSnapshot,
  persistMode = 'local',
  onRemoteSave,
}: {
  children: ReactNode;
  /** When set (e.g. from GET /api/site/homepage/), hydrates the store instead of local seed only. */
  initialSnapshot?: Snapshot | null;
  /** `remote`: PATCH admin CMS. `readonly`: public homepage — sync from API only, no localStorage or PATCH. */
  persistMode?: 'local' | 'remote' | 'readonly';
  onRemoteSave?: () => void;
}) => {
  const [data, setData] = useState<Snapshot>(() => (initialSnapshot ? { ...initialSnapshot } : load()));
  const remoteBoot = useRef(false);
  const lastSentJson = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (persistMode !== 'readonly' || !initialSnapshot) return;
    setData({ ...initialSnapshot });
  }, [initialSnapshot, persistMode]);

  useEffect(() => {
    if (persistMode !== 'local') return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, persistMode]);

  useEffect(() => {
    if (persistMode !== 'remote') return;
    if (!remoteBoot.current) {
      remoteBoot.current = true;
      lastSentJson.current = JSON.stringify(mapSnapshotToHomepagePayload(dataRef.current));
      return;
    }
    const handle = window.setTimeout(async () => {
      const snap = dataRef.current;
      const payload = mapSnapshotToHomepagePayload(snap);
      const j = JSON.stringify(payload);
      if (lastSentJson.current === j) return;
      try {
        const res = await patchAdminCmsHomepage(payload);
        const next = mapHomepageApiToSnapshot(res);
        setData(next);
        lastSentJson.current = JSON.stringify(mapSnapshotToHomepagePayload(next));
        onRemoteSave?.();
      } catch (e) {
        console.error('CMS save failed', e);
      }
    }, 700);
    return () => window.clearTimeout(handle);
  }, [data, persistMode, onRemoteSave]);

  const set = useCallback(<K extends keyof Snapshot>(k: K, v: Snapshot[K]) => setData((d) => ({ ...d, [k]: v })), []);

  const flushRemoteSave = useCallback(async () => {
    if (persistMode !== 'remote') return;
    const snap = dataRef.current;
    const payload = mapSnapshotToHomepagePayload(snap);
    const res = await patchAdminCmsHomepage(payload);
    const next = mapHomepageApiToSnapshot(res);
    setData(next);
    lastSentJson.current = JSON.stringify(mapSnapshotToHomepagePayload(next));
    onRemoteSave?.();
  }, [persistMode, onRemoteSave]);

  const value: CmsStore = {
    ...data,
    persistMode,
    addSlide: (s) => set('slides', [...data.slides, { ...s, id: uid('s'), order: data.slides.length + 1 }]),
    updateSlide: (id, patch) => set('slides', data.slides.map((x) => x.id === id ? { ...x, ...patch } : x)),
    deleteSlide: (id) => set('slides', data.slides.filter((x) => x.id !== id)),
    moveSlide: (id, dir) => set('slides', reorder(data.slides, id, dir)),

    updateAbout: (patch) => set('about', { ...data.about, ...patch }),

    addService: (s) => set('services', [...data.services, { ...s, id: uid('sv'), order: data.services.length + 1 }]),
    updateService: (id, patch) => set('services', data.services.map((x) => x.id === id ? { ...x, ...patch } : x)),
    deleteService: (id) => set('services', data.services.filter((x) => x.id !== id)),
    moveService: (id, dir) => set('services', reorder(data.services, id, dir)),

    addMember: (m) =>
      set('team', [
        ...data.team,
        {
          ...emptyTeamSocial,
          ...m,
          experienceYears:
            typeof m.experienceYears === 'number' && !Number.isNaN(m.experienceYears)
              ? Math.max(0, Math.min(32767, Math.floor(m.experienceYears)))
              : 0,
          id: uid('tm'),
          order: data.team.length + 1,
        },
      ]),
    updateMember: (id, patch) => set('team', data.team.map((x) => x.id === id ? { ...x, ...patch } : x)),
    deleteMember: (id) => set('team', data.team.filter((x) => x.id !== id)),
    moveMember: (id, dir) => set('team', reorder(data.team, id, dir)),

    addNews: (n) => set('news', [...data.news, { ...n, id: uid('n'), order: data.news.length + 1 }]),
    updateNews: (id, patch) => set('news', data.news.map((x) => x.id === id ? { ...x, ...patch } : x)),
    deleteNews: (id) => set('news', data.news.filter((x) => x.id !== id)),
    moveNews: (id, dir) => set('news', reorder(data.news, id, dir)),

    updateFooter: (patch) => set('footer', { ...data.footer, ...patch }),

    updateTestimonials: (patch) =>
      set('testimonials', { ...data.testimonials, ...patch }),
    addTestimonial: (t) =>
      set('testimonials', {
        ...data.testimonials,
        items: [
          ...data.testimonials.items,
          { ...t, id: uid('t'), order: data.testimonials.items.length + 1 },
        ],
      }),
    updateTestimonial: (id, patch) =>
      set('testimonials', {
        ...data.testimonials,
        items: data.testimonials.items.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }),
    deleteTestimonial: (id) =>
      set('testimonials', {
        ...data.testimonials,
        items: data.testimonials.items.filter((x) => x.id !== id),
      }),
    moveTestimonial: (id, dir) =>
      set('testimonials', {
        ...data.testimonials,
        items: reorder(data.testimonials.items, id, dir),
      }),

    toggleSection: (key, val) => set('toggles', { ...data.toggles, [key]: val }),

    updateSectionStyle: (key, patch) => set('sectionStyles', { ...data.sectionStyles, [key]: { ...(data.sectionStyles[key] || {}), ...patch } }),

    addNavItem: (n) => set('navItems', [...data.navItems, { ...n, id: uid('nav'), order: data.navItems.length + 1 }]),
    updateNavItem: (id, patch) => set('navItems', data.navItems.map((x) => x.id === id ? { ...x, ...patch } : x)),
    deleteNavItem: (id) => set('navItems', data.navItems.filter((x) => x.id !== id)),
    moveNavItem: (id, dir) => set('navItems', reorder(data.navItems, id, dir)),

    resetAll: () => {
      if (persistMode === 'remote' || persistMode === 'readonly') return;
      setData({ ...defaultCmsSnapshot });
    },
    flushRemoteSave,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCms = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCms must be used inside CmsStoreProvider');
  return ctx;
};

// ============ helpers ============
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
