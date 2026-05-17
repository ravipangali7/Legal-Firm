import type { PageSeoInput } from '@/lib/seo';

type RouteSeoRule = {
  test: (pathname: string) => boolean;
  seo: PageSeoInput;
};

const exact = (path: string, seo: PageSeoInput): RouteSeoRule => ({
  test: (p) => p === path,
  seo: { pathname: path, ...seo },
});

const prefix = (pathPrefix: string, seo: PageSeoInput): RouteSeoRule => ({
  test: (p) => p === pathPrefix || p.startsWith(`${pathPrefix}/`),
  seo,
});

/** Static fallbacks when a page does not call `usePageSeo`. */
const RULES: RouteSeoRule[] = [
  exact('/', {
    title: 'Home',
    description:
      'Expert tax, legal, and corporate advisory for businesses and individuals in Nepal.',
  }),
  exact('/about', { title: 'About Us', description: 'Learn about our firm, mission, and team.' }),
  exact('/contact', { title: 'Contact', description: 'Get in touch with our advisory team.' }),
  exact('/pricing', { title: 'Pricing', description: 'Subscription plans and pricing for legal resources.' }),
  exact('/blog', { title: 'Blog', description: 'Insights, updates, and articles from our advisors.' }),
  exact('/laws', { title: 'Laws & Acts', description: 'Browse Nepalese acts and legislation library.' }),
  exact('/summaries', { title: 'Summaries', description: 'Legal summaries and commentary on key topics.' }),
  exact('/procedures', { title: 'Procedures', description: 'Step-by-step regulatory and compliance procedures.' }),
  exact('/notices', { title: 'Notices', description: 'Official notices, circulars, and regulatory updates.' }),
  exact('/tools', { title: 'Tools', description: 'Legal and tax tools for practitioners and businesses.' }),
  exact('/resources', { title: 'Resources', description: 'Downloadable knowledge resources and guides.' }),
  exact('/knowledge', { title: 'Knowledge Base', description: 'Searchable knowledge base articles and materials.' }),
  exact('/help', { title: 'Help Center', description: 'Help articles and support documentation.' }),
  exact('/professionals', { title: 'Professionals', description: 'Meet our tax and legal professionals.' }),
  prefix('/services', {
    title: 'Services',
    description: 'Legal and tax advisory services for businesses and individuals.',
  }),
  prefix('/news', { title: 'News', description: 'Firm news and announcements.' }),
  prefix('/events', { title: 'Events', description: 'Upcoming events and seminars.' }),
  prefix('/about', {
    title: 'About',
    description: 'Learn about our firm, mission, and team.',
  }),
  prefix('/practice-areas', {
    title: 'Practice Areas',
    description: 'Explore our practice areas and related legal cases.',
  }),
  prefix('/law-details', { title: 'Law Details', description: 'Legal practice area details and case studies.' }),
  // Private / auth — discourage indexing
  prefix('/admin', { title: 'Admin', noindex: true }),
  prefix('/dashboard', { title: 'Dashboard', noindex: true }),
  prefix('/client', { title: 'Client Portal', noindex: true }),
  prefix('/account', { title: 'Account', noindex: true }),
  prefix('/login', { title: 'Login', noindex: true }),
  prefix('/signup', { title: 'Sign Up', noindex: true }),
  prefix('/portal', { title: 'Portal', noindex: true }),
  prefix('/payment', { title: 'Payment', noindex: true }),
  prefix('/subscribe', { title: 'Subscribe', noindex: true }),
  prefix('/forgot-password', { title: 'Forgot Password', noindex: true }),
];

export function seoDefaultsForPath(pathname: string): PageSeoInput | null {
  for (const rule of RULES) {
    if (rule.test(pathname)) return { pathname, ...rule.seo };
  }
  return null;
}
