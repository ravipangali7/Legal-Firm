import type {
  FooterCfg,
  HeroSlide,
  NavItem,
  NewsItem,
  SectionStyles,
  SectionToggles,
  Snapshot,
  TeamMember,
  TestimonialItem,
  TestimonialsBlock,
} from '@/store/cmsStore';
import { defaultCmsSnapshot } from '@/store/cmsStore';
import hero3 from '@/assets/hero-3.jpg';

/** Response shape from GET /api/site/homepage/ (snake_case from Django). */
export type HomepageApiResponse = {
  toggles: Record<string, boolean>;
  section_styles: SectionStyles;
  nav_items: Array<{
    id: string;
    order: number;
    enabled: boolean;
    label: string;
    href: string;
    is_dropdown: boolean;
    children: Array<{ label: string; href: string }>;
  }>;
  slides: Array<{
    id: string;
    order: number;
    enabled: boolean;
    eyebrow?: string;
    title: string;
    subtitle: string;
    cta: string;
    href: string;
    secondary_cta?: string;
    secondary_href?: string;
    image: string;
  }>;
  about: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    body: string;
    image: string;
    stats: Array<{ id?: string; label: string; value: string }>;
  };
  services: Array<{
    id: string;
    order: number;
    enabled: boolean;
    icon: string;
    title: string;
    description: string;
    href: string;
  }>;
  team: Array<{
    id: string;
    order: number;
    enabled: boolean;
    name: string;
    role: string;
    bio: string;
    avatar: string;
    linkedin_url?: string;
    facebook_url?: string;
    twitter_url?: string;
    instagram_url?: string;
    contact_email?: string;
    years_experience?: number;
  }>;
  news: Array<{
    id: string;
    order: number;
    enabled: boolean;
    title: string;
    excerpt: string;
    body?: string;
    image: string;
    date: string;
    href: string;
    tag: string;
  }>;
  testimonials?: {
    title?: string;
    intro: string;
    metrics: Array<{ value: string; label: string }>;
    items: Array<{
      id: string;
      order: number;
      enabled: boolean;
      name: string;
      role_title: string;
      content: string;
      rating: number;
      image: string;
    }>;
  };
  footer: {
    tagline: string;
    copyright: string;
    columns: Array<{
      id: string;
      title: string;
      order?: number;
      links: Array<{ label: string; href: string }>;
    }>;
    social: Array<{ label: string; href: string }>;
  };
};

const sectionStyleKeys: (keyof SectionToggles)[] = [
  'hero',
  'about',
  'services',
  'procedures',
  'team',
  'news',
  'testimonials',
  'footer',
];

function mapTeamFromApi(apiTeam: HomepageApiResponse['team']): TeamMember[] {
  return (apiTeam || []).map((tm) => {
    const rawY = tm.years_experience;
    const experienceYears = Math.max(
      0,
      Math.min(32767, Math.floor(typeof rawY === 'number' && !Number.isNaN(rawY) ? rawY : Number(rawY) || 0)),
    );
    return {
      id: tm.id,
      order: tm.order,
      enabled: tm.enabled,
      name: tm.name,
      role: tm.role,
      bio: tm.bio || '',
      avatar: tm.avatar || '',
      experienceYears,
      linkedinUrl: (tm.linkedin_url || '').trim(),
      facebookUrl: (tm.facebook_url || '').trim(),
      twitterUrl: (tm.twitter_url || '').trim(),
      instagramUrl: (tm.instagram_url || '').trim(),
      contactEmail: (tm.contact_email || '').trim(),
    };
  });
}

function mapNewsFromApi(rows: HomepageApiResponse['news']): NewsItem[] {
  return (rows || []).map((n) => ({
    id: n.id,
    order: n.order,
    enabled: n.enabled,
    title: n.title,
    excerpt: n.excerpt || '',
    body: (n.body || '').trim(),
    image: (n.image || '').trim(),
    date: typeof n.date === 'string' ? n.date.slice(0, 10) : String(n.date || '').slice(0, 10),
    href: n.href || '',
    tag: n.tag || '',
  }));
}

function mapSlides(apiSlides: HomepageApiResponse['slides']): HeroSlide[] {
  return (apiSlides || []).map((s) => ({
    id: s.id,
    order: s.order,
    enabled: s.enabled,
    eyebrow: s.eyebrow?.trim() || undefined,
    title: s.title,
    subtitle: s.subtitle,
    cta: s.cta,
    href: s.href,
    secondaryCta: s.secondary_cta?.trim() || undefined,
    secondaryHref: s.secondary_href?.trim() || undefined,
    image: s.image,
  }));
}

function mapTestimonials(raw: HomepageApiResponse['testimonials']): TestimonialsBlock {
  const fallback = defaultCmsSnapshot.testimonials;
  if (!raw) return fallback;
  const items: TestimonialItem[] = (raw.items || []).map((t) => ({
    id: t.id,
    order: t.order,
    enabled: t.enabled,
    name: t.name,
    roleTitle: t.role_title || '',
    content: t.content || '',
    rating: typeof t.rating === 'number' && t.rating > 0 ? t.rating : 5,
    image: t.image || '',
  }));
  return {
    title: raw.title?.trim() || fallback.title,
    intro: raw.intro?.trim() || fallback.intro,
    metrics: Array.isArray(raw.metrics) && raw.metrics.length > 0 ? raw.metrics : fallback.metrics,
    items: items.length > 0 ? items : fallback.items,
  };
}

export function mapHomepageApiToSnapshot(api: HomepageApiResponse): Snapshot {
  const t = api.toggles || {};
  const toggles: SectionToggles = {
    hero: Boolean(t.hero),
    about: Boolean(t.about),
    services: Boolean(t.services),
    team: Boolean(t.team),
    news: Boolean(t.news),
    testimonials: t.testimonials !== undefined ? Boolean(t.testimonials) : true,
    footer: Boolean(t.footer),
    procedures: t.procedures !== false,
  };

  const rawStyles = api.section_styles || {};
  const sectionStyles: SectionStyles = {};
  for (const k of sectionStyleKeys) {
    const v = rawStyles[k];
    if (v && typeof v === 'object') {
      sectionStyles[k] = v as SectionStyles[typeof k];
    }
  }

  const navItems: NavItem[] = (api.nav_items || []).map((n) => ({
    id: n.id,
    order: n.order,
    enabled: n.enabled,
    label: n.label,
    href: n.href,
    isDropdown: n.is_dropdown,
    children: n.children || [],
  }));

  const mappedSlides = mapSlides(api.slides || []);
  const mappedTeam = mapTeamFromApi(api.team || []);

  const aboutBlock = api.about
    ? {
        enabled: api.about.enabled,
        eyebrow: api.about.eyebrow,
        title: api.about.title,
        body: api.about.body,
        image: (typeof api.about.image === 'string' ? api.about.image : '').trim() || hero3,
        stats: (api.about.stats || []).map((s) => ({
          id: s.id ? String(s.id) : undefined,
          label: s.label,
          value: s.value,
        })),
      }
    : defaultCmsSnapshot.about;

  return {
    toggles,
    sectionStyles,
    navItems: navItems.length > 0 ? navItems : defaultCmsSnapshot.navItems,
    slides: mappedSlides.length > 0 ? mappedSlides : defaultCmsSnapshot.slides,
    about: aboutBlock,
    services: (api.services || []).length > 0 ? api.services : defaultCmsSnapshot.services,
    team: mappedTeam.length > 0 ? mappedTeam : defaultCmsSnapshot.team,
    news: (api.news || []).length > 0 ? mapNewsFromApi(api.news) : defaultCmsSnapshot.news,
    testimonials: mapTestimonials(api.testimonials),
    footer: {
      tagline: api.footer?.tagline ?? defaultCmsSnapshot.footer.tagline,
      copyright: api.footer?.copyright ?? defaultCmsSnapshot.footer.copyright,
      columns: api.footer?.columns?.length ? api.footer.columns : defaultCmsSnapshot.footer.columns,
      social: api.footer?.social?.length ? api.footer.social : defaultCmsSnapshot.footer.social,
    },
  };
}

function strImage(v: string | (string & object)) {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'default' in (v as { default?: string })) {
    return String((v as { default: string }).default);
  }
  return String(v ?? '');
}

/** Footer slice for PATCH /api/admin/cms/homepage/ (partial body). */
export function footerCfgToApiPayload(footer: FooterCfg): HomepageApiResponse['footer'] {
  return {
    tagline: footer.tagline,
    copyright: footer.copyright,
    columns: footer.columns.map((col, ci) => ({
      id: col.id,
      title: col.title,
      order: ci + 1,
      links: col.links.map((lk) => ({ label: lk.label, href: lk.href })),
    })),
    social: footer.social.map((s) => ({ label: s.label, href: s.href })),
  };
}

/** Serialize the in-memory CMS snapshot for PATCH /api/admin/cms/homepage/ (snake_case). */
export function mapSnapshotToHomepagePayload(snapshot: Snapshot): HomepageApiResponse {
  const tog = snapshot.toggles;
  return {
    toggles: {
      hero: tog.hero,
      about: tog.about,
      services: tog.services,
      team: tog.team,
      news: tog.news,
      testimonials: tog.testimonials,
      footer: tog.footer,
      procedures: tog.procedures !== false,
    },
    section_styles: snapshot.sectionStyles || {},
    nav_items: snapshot.navItems.map((n) => ({
      id: n.id,
      order: n.order,
      enabled: n.enabled,
      label: n.label,
      href: n.href,
      is_dropdown: n.isDropdown,
      children: n.children,
    })),
    slides: snapshot.slides.map((s, i) => ({
      id: s.id,
      order: s.order ?? i + 1,
      enabled: s.enabled,
      eyebrow: s.eyebrow || '',
      title: s.title,
      subtitle: s.subtitle,
      cta: s.cta,
      href: s.href,
      secondary_cta: s.secondaryCta || '',
      secondary_href: s.secondaryHref || '',
      image: strImage(s.image),
    })),
    about: {
      enabled: snapshot.about.enabled,
      eyebrow: snapshot.about.eyebrow,
      title: snapshot.about.title,
      body: snapshot.about.body,
      image: strImage(snapshot.about.image),
      stats: snapshot.about.stats.map((st) => ({
        ...(st.id ? { id: st.id } : {}),
        label: st.label,
        value: st.value,
      })),
    },
    services: snapshot.services.map((sv, i) => ({
      id: sv.id,
      order: sv.order ?? i + 1,
      enabled: sv.enabled,
      icon: sv.icon,
      title: sv.title,
      description: sv.description,
      href: sv.href,
    })),
    team: snapshot.team.map((tm, i) => ({
      id: tm.id,
      order: tm.order ?? i + 1,
      enabled: tm.enabled,
      name: tm.name,
      role: tm.role,
      bio: tm.bio,
      avatar: strImage(tm.avatar),
      linkedin_url: (tm.linkedinUrl || '').trim(),
      facebook_url: (tm.facebookUrl || '').trim(),
      twitter_url: (tm.twitterUrl || '').trim(),
      instagram_url: (tm.instagramUrl || '').trim(),
      contact_email: (tm.contactEmail || '').trim(),
      years_experience: Math.max(0, Math.min(32767, Math.floor(tm.experienceYears ?? 0))),
    })),
    news: snapshot.news.map((n, i) => ({
      id: n.id,
      order: n.order ?? i + 1,
      enabled: n.enabled,
      title: n.title,
      excerpt: n.excerpt,
      body: (n.body || '').trim(),
      image: strImage(n.image).trim(),
      date: n.date,
      href: n.href,
      tag: n.tag,
    })),
    testimonials: {
      title: snapshot.testimonials.title,
      intro: snapshot.testimonials.intro,
      metrics: snapshot.testimonials.metrics,
      items: snapshot.testimonials.items.map((t, i) => ({
        id: t.id,
        order: t.order ?? i + 1,
        enabled: t.enabled,
        name: t.name,
        role_title: t.roleTitle,
        content: t.content,
        rating: t.rating,
        image: strImage(t.image),
      })),
    },
    footer: {
      tagline: snapshot.footer.tagline,
      copyright: snapshot.footer.copyright,
      columns: snapshot.footer.columns.map((col, ci) => ({
        id: col.id,
        title: col.title,
        order: ci + 1,
        links: col.links.map((lk) => ({ label: lk.label, href: lk.href })),
      })),
      social: snapshot.footer.social,
    },
  };
}
