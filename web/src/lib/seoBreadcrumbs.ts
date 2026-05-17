export interface BreadcrumbItem {
  name: string;
  path: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  about: 'About',
  blog: 'Blog',
  case: 'Cases',
  contact: 'Contact',
  events: 'Events',
  help: 'Help',
  knowledge: 'Knowledge Base',
  laws: 'Laws',
  'law-details': 'Law Details',
  login: 'Login',
  news: 'News',
  notices: 'Notices',
  pricing: 'Pricing',
  'practice-areas': 'Practice Areas',
  procedures: 'Procedures',
  professionals: 'Professionals',
  resources: 'Resources',
  services: 'Services',
  signup: 'Sign Up',
  subscribe: 'Subscribe',
  summaries: 'Summaries',
  tools: 'Tools',
};

/** Build breadcrumb trail from pathname (excludes private routes). */
export function breadcrumbsFromPathname(
  pathname: string,
  pageTitle?: string
): BreadcrumbItem[] {
  const clean = pathname.split('?')[0].split('#')[0];
  if (!clean || clean === '/') return [{ name: 'Home', path: '/' }];

  const parts = clean.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ name: 'Home', path: '/' }];
  let acc = '';

  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    acc += `/${seg}`;
    const isLast = i === parts.length - 1;
    const label =
      isLast && pageTitle
        ? pageTitle
        : SEGMENT_LABELS[seg] ||
          seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ name: label, path: acc });
  }
  return crumbs;
}
